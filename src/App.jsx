import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { User, Mail, Phone, ClipboardCheck, Printer, ChevronLeft, Lock, CheckCircle2, ArrowRight, RefreshCw, Folder, Briefcase, Settings, Plus, ImageIcon, X, Trash2, Smartphone, Save, Search, Download, Calendar } from 'lucide-react';

// --- FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyCkCWbqf6M2OLQxpGJkLkf92k-eW8pIPnM",
  authDomain: "virtual-sign-21884.firebaseapp.com",
  projectId: "virtual-sign-21884",
  storageBucket: "virtual-sign-21884.firebasestorage.app",
  messagingSenderId: "1025000851049",
  appId: "1:1025000851049:web:99c907c759ec784837c4f8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const defaultSession = { 
  title: 'Welcome!', 
  subtitle: 'Please sign in for today\'s session.', 
  logo: '', 
  logoHeight: 80,
  reqEmail: true,
  reqPhone: true,
  allowAgent: true
};

const App = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('SIGNIN'); 
  const [adminTab, setAdminTab] = useState('BUILDER'); 
  const [adminPin, setAdminPin] = useState('');
  
  // Data States
  const [submissions, setSubmissions] = useState([]);
  const [presets, setPresets] = useState([]);
  const [logoLibrary, setLogoLibrary] = useState([]);
  
  // Session States
  const [liveSession, setLiveSession] = useState(defaultSession);
  const [builderSession, setBuilderSession] = useState(defaultSession);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);

  // Form & Filter States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', repId: '' });
  const [rememberMe, setRememberMe] = useState(false); // NEW: Remember state
  const [selectedFolder, setSelectedFolder] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fileInputRef = useRef(null);

  // 1. Auth Init
  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // NEW: Auto-fill logic for Agents
  useEffect(() => {
    if (isAgent) {
      const savedAgent = localStorage.getItem('saved_agent_info');
      if (savedAgent) {
        const parsed = JSON.parse(savedAgent);
        setFormData(parsed);
        setRememberMe(true);
      }
    }
  }, [isAgent]);

  // 2. Fetch Data
  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'artifacts', 'virtual-sign-sheet', 'config', 'currentSession'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const fullData = {
          title: data.title || 'Welcome!',
          subtitle: data.subtitle || '',
          logo: data.logo || '',
          logoHeight: data.logoHeight || 80,
          reqEmail: data.reqEmail !== false,
          reqPhone: data.reqPhone !== false,
          allowAgent: data.allowAgent !== false
        };
        setLiveSession(fullData);
        if (!hasUnpublishedChanges) setBuilderSession(fullData); 
      }
    });

    const qSignins = query(collection(db, 'artifacts', 'virtual-sign-sheet', 'public', 'data', 'signins'), orderBy('timestamp', 'desc'));
    const unsubSignins = onSnapshot(qSignins, (snap) => setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    const unsubPresets = onSnapshot(collection(db, 'artifacts', 'virtual-sign-sheet', 'presets'), (snap) => {
      setPresets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    fetchLogoLibrary();
    return () => { unsubSignins(); unsubSettings(); unsubPresets(); };
  }, []);

  const fetchLogoLibrary = async () => {
    try {
      const listRef = ref(storage, 'logos');
      const res = await listAll(listRef);
      const items = await Promise.all(res.items.map(async (itemRef) => ({
        name: itemRef.name,
        url: await getDownloadURL(itemRef),
        ref: itemRef
      })));
      setLogoLibrary(items);
    } catch (error) { console.error("Error fetching logos"); }
  };

  // --- DERIVED DATA ---
  const { uniqueDates, displayedSubmissions } = useMemo(() => {
    const dates = [...new Set(submissions.map(s => s.dateString))].filter(Boolean);
    let filtered = submissions;
    if (selectedFolder !== 'All') {
      filtered = filtered.filter(s => s.dateString === selectedFolder);
    }
    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return { uniqueDates: dates, displayedSubmissions: filtered };
  }, [submissions, selectedFolder, searchTerm]);

  // --- ACTIONS ---
  const handleGuestSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // NEW: Save info if rememberMe is checked
      if (isAgent && rememberMe) {
        localStorage.setItem('saved_agent_info', JSON.stringify(formData));
      } else if (isAgent && !rememberMe) {
        localStorage.removeItem('saved_agent_info');
      }

      await addDoc(collection(db, 'artifacts', 'virtual-sign-sheet', 'public', 'data', 'signins'), {
        name: formData.name,
        email: liveSession.reqEmail ? formData.email : 'N/A',
        phone: liveSession.reqPhone ? formData.phone : 'N/A',
        sessionTitle: liveSession.title,
        role: (liveSession.allowAgent && isAgent) ? 'Agent' : 'Guest',
        repId: (liveSession.allowAgent && isAgent) ? formData.repId : 'N/A',
        timestamp: serverTimestamp(),
        dateString: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
        timeString: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      
      // Reset only if not remembering
      if (!rememberMe) {
        setFormData({ name: '', email: '', phone: '', repId: '' });
        setIsAgent(false);
      }
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err) { alert("Submission failed."); } 
    finally { setIsSubmitting(false); }
  };

  const deleteLogo = async (logoItem) => {
    if (window.confirm("Delete this logo from the cloud library?")) {
      try {
        await deleteObject(logoItem.ref);
        if (builderSession.logo === logoItem.url) updateBuilder({ logo: '' });
        fetchLogoLibrary();
      } catch (err) { alert("Delete failed."); }
    }
  };

  const downloadCSV = () => {
    const headers = ["Name", "Email", "Phone", "Role", "RepID", "Date", "Time"];
    const rows = displayedSubmissions.map(s => [s.name, s.email, s.phone, s.role, s.repId, s.dateString, s.timeString]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Roster_${selectedFolder}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPin === '2501') { setView('ADMIN_DASHBOARD'); setAdminPin(''); } 
    else { alert("Incorrect PIN"); setAdminPin(''); }
  };

  const updateBuilder = (newData) => {
    setBuilderSession(prev => ({ ...prev, ...newData }));
    setHasUnpublishedChanges(true);
  };

  const publishChanges = async () => {
    try {
      await setDoc(doc(db, 'artifacts', 'virtual-sign-sheet', 'config', 'currentSession'), builderSession, { merge: true });
      setHasUnpublishedChanges(false);
      alert("Success! Published to Live.");
    } catch (e) { alert("Publish failed."); }
  };

  const savePreset = async () => {
    const name = prompt("Name this preset layout:");
    if (name) {
      await addDoc(collection(db, 'artifacts', 'virtual-sign-sheet', 'presets'), { ...builderSession, presetName: name });
    }
  };

  const loadPreset = (p) => {
    updateBuilder({
      title: p.title || '', subtitle: p.subtitle || '', logo: p.logo || '', logoHeight: p.logoHeight || 80,
      reqEmail: p.reqEmail !== false, reqPhone: p.reqPhone !== false, allowAgent: p.allowAgent !== false
    });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const storageRef = ref(storage, `logos/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      updateBuilder({ logo: url });
      fetchLogoLibrary();
    } catch (err) { alert("Upload failed."); }
  };

  const deleteItem = async (path, id) => {
    if (window.confirm("Permanently delete?")) {
      await deleteDoc(doc(doc(db, 'artifacts', 'virtual-sign-sheet'), path, id));
    }
  };

  // --- RENDER FORM ---
  const renderSignInForm = (isPreview = false) => {
    const s = isPreview ? builderSession : liveSession;
    return (
      <div className={`modern-card ${isPreview ? 'preview-mode' : ''}`} style={isPreview ? { transform: 'scale(0.85)', transformOrigin: 'top center', margin: '0 auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '8px solid #0f172a' } : {}}>
        <header style={{marginBottom: '2rem', textAlign: 'center'}}>
          {s.logo && <img src={s.logo} alt="Logo" style={{height: `${s.logoHeight}px`, objectFit: 'contain', marginBottom: '1.5rem'}} />}
          <h1 style={{fontSize: '2.2rem', margin: 0}}>{s.title}</h1>
          <p style={{marginTop: '0.5rem', color: '#64748b'}}>{s.subtitle}</p>
        </header>

        {showSuccess && !isPreview ? (
          <div style={{textAlign: 'center', padding: '2rem'}}>
            <CheckCircle2 size={64} color="#22c55e" style={{margin: '0 auto 1rem'}} />
            <h2>Sign-in Verified</h2>
            <button onClick={() => setShowSuccess(false)} className="primary-button">Back to Form</button>
          </div>
        ) : (
          <form onSubmit={isPreview ? (e)=>e.preventDefault() : handleGuestSubmit} className="signin-form">
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <div className="input-wrapper"><User size={18} className="input-icon" /><input className="modern-input" required placeholder="Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} disabled={isPreview}/></div>
            </div>
            {s.reqEmail && (
              <div className="input-group">
                <label className="input-label">Email Address</label>
                <div className="input-wrapper"><Mail size={18} className="input-icon" /><input className="modern-input" type="email" required placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} disabled={isPreview}/></div>
              </div>
            )}
            {s.reqPhone && (
              <div className="input-group">
                <label className="input-label">Phone Number</label>
                <div className="input-wrapper"><Phone size={18} className="input-icon" /><input className="modern-input" type="tel" required placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} disabled={isPreview}/></div>
              </div>
            )}
            {s.allowAgent && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <input type="checkbox" id="agent-check" checked={isAgent} onChange={(e) => setIsAgent(e.target.checked)} style={{ width: '1.2rem', height: '1.2rem' }} disabled={isPreview} />
                  <label htmlFor="agent-check" style={{ fontWeight: 'bold', color: '#0f172a' }}>I am an Agent</label>
                </div>
                {isAgent && (
                  <>
                    <div className="input-group">
                      <label className="input-label">REP ID</label>
                      <div className="input-wrapper"><Briefcase size={18} className="input-icon" /><input className="modern-input" required placeholder="Ex: ABC12" value={formData.repId} onChange={(e) => setFormData({...formData, repId: e.target.value})} disabled={isPreview}/></div>
                    </div>
                    {/* NEW: Remember Me Checkbox */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', marginLeft: '0.5rem' }}>
                      <input type="checkbox" id="remember-me" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ width: '1rem', height: '1rem' }} disabled={isPreview} />
                      <label htmlFor="remember-me" style={{ fontSize: '0.9rem', color: '#64748b' }}>Remember my information</label>
                    </div>
                  </>
                )}
              </>
            )}
            <button disabled={isSubmitting || isPreview} type="submit" className="primary-button" style={{marginTop: '1rem'}}>{isSubmitting ? "Processing..." : "Sign In"} <ArrowRight size={20} /></button>
          </form>
        )}
      </div>
    );
  };

  return (
    <div className="app-shell">
      <nav className="navbar print:hidden">
        <div className="logo-section" onClick={() => setView('SIGNIN')} style={{cursor: 'pointer'}}>
          <div style={{background: '#4f46e5', padding: '8px', borderRadius: '12px'}}><ClipboardCheck size={20} color="white" /></div>
          <span className="logo-text">VirtualSign</span>
        </div>
        <button onClick={() => setView(view === 'SIGNIN' ? 'ADMIN_LOGIN' : 'SIGNIN')} className="admin-toggle">
          {view === 'SIGNIN' ? <><Lock size={14} /> Admin</> : <><ChevronLeft size={14} /> Back</>}
        </button>
      </nav>

      <main className="main-container">
        {view === 'SIGNIN' && renderSignInForm(false)}

        {view === 'ADMIN_LOGIN' && (
          <div className="modern-card login-card" style={{maxWidth: '400px', margin: '5rem auto'}}>
             <Lock size={48} color="#4f46e5" style={{margin: '0 auto 1rem'}} />
             <h2>Admin Access</h2>
             <form onSubmit={handleAdminLogin}>
                <input type="password" className="modern-input" placeholder="0000" maxLength={4} style={{textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em', marginBottom: '1.5rem'}} value={adminPin} onChange={(e) => setAdminPin(e.target.value)} />
                <button type="submit" className="primary-button">Unlock Dashboard</button>
             </form>
          </div>
        )}

        {view === 'ADMIN_DASHBOARD' && (
          <div className="admin-dashboard">
            <div className="admin-tabs print:hidden" style={{display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem'}}>
               <button onClick={() => setAdminTab('BUILDER')} className={`tab-btn ${adminTab === 'BUILDER' ? 'active' : ''}`}><Settings size={18}/> Page Builder</button>
               <button onClick={() => setAdminTab('ROSTER')} className={`tab-btn ${adminTab === 'ROSTER' ? 'active' : ''}`}><Folder size={18}/> Data Roster</button>
               <button onClick={() => setAdminTab('LOGOS')} className={`tab-btn ${adminTab === 'LOGOS' ? 'active' : ''}`}><ImageIcon size={18}/> Logo Gallery</button>
            </div>

            {adminTab === 'BUILDER' && (
               <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '3rem', alignItems: 'start'}}>
                 <div style={{ background: 'white', padding: '2rem', borderRadius: '1.5rem', border: '1px solid #e2e8f0' }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem'}}>
                      <h2 style={{margin:0}}>Configure Page</h2>
                      <button onClick={publishChanges} className="primary-button" style={{width:'auto', padding:'0.5rem 1rem', background: hasUnpublishedChanges ? '#22c55e' : '#94a3b8'}}><Save size={16}/> {hasUnpublishedChanges ? "Publish Changes" : "Up to Date"}</button>
                    </div>

                    <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                      <div><label className="input-label">Title</label><input className="modern-input" value={builderSession.title} onChange={(e) => updateBuilder({ title: e.target.value })} /></div>
                      <div><label className="input-label">Subtitle</label><input className="modern-input" value={builderSession.subtitle} onChange={(e) => updateBuilder({ subtitle: e.target.value })} /></div>
                      
                      <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px' }}>
                        <label className="input-label">Visibility Options</label>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem'}}>
                          <label style={{display:'flex', gap:'0.5rem'}}><input type="checkbox" checked={builderSession.reqEmail} onChange={(e)=>updateBuilder({reqEmail: e.target.checked})}/> Email Field</label>
                          <label style={{display:'flex', gap:'0.5rem'}}><input type="checkbox" checked={builderSession.reqPhone} onChange={(e)=>updateBuilder({reqPhone: e.target.checked})}/> Phone Field</label>
                          <label style={{display:'flex', gap:'0.5rem'}}><input type="checkbox" checked={builderSession.allowAgent} onChange={(e)=>updateBuilder({allowAgent: e.target.checked})}/> Agent Login</label>
                        </div>
                      </div>

                      <div>
                        <label className="input-label">Page Logo</label>
                        <div style={{display: 'flex', gap: '1rem', marginTop: '0.5rem'}}>
                          <button onClick={() => fileInputRef.current.click()} className="admin-toggle"><Plus size={14} /> Upload New</button>
                          <input type="file" ref={fileInputRef} hidden onChange={handleLogoUpload} accept="image/*" />
                        </div>
                      </div>

                      <div style={{borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
                          <label className="input-label">Cloud Presets</label>
                          <button onClick={savePreset} className="admin-toggle"><Plus size={14}/> Save Current</button>
                        </div>
                        <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                          {presets.map(p => (
                            <div key={p.id} style={{position: 'relative'}}>
                              <button onClick={() => loadPreset(p)} className="admin-toggle" style={{paddingRight:'2rem'}}>{p.presetName}</button>
                              <Trash2 size={12} onClick={() => deleteItem('presets', p.id)} style={{position:'absolute', right:'8px', top:'10px', color:'#ef4444', cursor:'pointer'}} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                 </div>
                 <div style={{position: 'sticky', top: '100px'}}><div style={{textAlign:'center', color:'#64748b', fontWeight:'bold', marginBottom:'1rem'}}><Smartphone size={18}/> Mobile Preview</div>{renderSignInForm(true)}</div>
               </div>
            )}

            {adminTab === 'ROSTER' && (
              <div className="fade-in">
                <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
                   <h1 style={{margin: 0}}>Data Roster ({displayedSubmissions.length})</h1>
                   <div style={{display: 'flex', gap: '1rem'}}>
                     <div className="input-wrapper" style={{width: '250px'}}>
                        <Search size={18} className="input-icon" />
                        <input className="modern-input" placeholder="Search names..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                     </div>
                     <button onClick={downloadCSV} className="admin-toggle"><Download size={18} /> Export</button>
                     <button onClick={() => window.print()} className="primary-button" style={{width: 'auto'}}><Printer size={18} /> Print PDF</button>
                   </div>
                </header>

                <div style={{ display: 'flex', gap: '2rem' }}>
                  <div className="print:hidden" style={{ width: '220px' }}>
                    <h3 style={{display:'flex', alignItems:'center', gap:'0.5rem'}}><Calendar size={18} /> Folders</h3>
                    <button onClick={() => setSelectedFolder('All')} style={{ width: '100%', textAlign: 'left', padding: '0.75rem', borderRadius: '8px', border: 'none', background: selectedFolder === 'All' ? '#eff6ff' : 'transparent', color: selectedFolder === 'All' ? '#4f46e5' : '#64748b', fontWeight: 'bold' }}>All Records</button>
                    {uniqueDates.map(date => (
                      <button key={date} onClick={() => setSelectedFolder(date)} style={{ width: '100%', textAlign: 'left', padding: '0.75rem', borderRadius: '8px', border: 'none', background: selectedFolder === date ? '#eff6ff' : 'transparent', color: selectedFolder === date ? '#4f46e5' : '#64748b', fontWeight: 'bold' }}>{date}</button>
                    ))}
                  </div>

                  <div style={{ flex: 1, background: 'white', borderRadius: '1.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                      <thead style={{background: '#f8fafc'}}><tr><th style={{padding: '1rem', textAlign:'left'}}>Name</th><th style={{padding: '1rem', textAlign:'left'}}>Contact</th><th style={{padding: '1rem', textAlign:'left'}}>Role</th><th style={{padding: '1rem', textAlign:'left'}}>Time</th><th className="print:hidden"></th></tr></thead>
                      <tbody>
                        {displayedSubmissions.map(item => (
                          <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{padding: '1rem', fontWeight: 'bold'}}>{item.name}</td>
                            <td style={{padding: '1rem'}}>{item.email}<br/><small style={{color:'#64748b'}}>{item.phone}</small></td>
                            <td style={{padding: '1rem'}}>{item.role} {item.role === 'Agent' && `(${item.repId})`}</td>
                            <td style={{padding: '1rem', fontSize: '0.8rem'}}>{item.dateString}<br/>{item.timeString}</td>
                            <td className="print:hidden" style={{padding: '1rem', textAlign: 'right'}}><Trash2 size={16} color="#ef4444" style={{cursor: 'pointer'}} onClick={() => deleteItem('public/data/signins', item.id)} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {adminTab === 'LOGOS' && (
              <div className="fade-in" style={{ background: 'white', padding: '2rem', borderRadius: '1.5rem', border: '1px solid #e2e8f0' }}>
                <h2>Cloud Logo Library</h2>
                <p>Logos are synced in your cloud storage. Click to use, or use the trash icon to delete.</p>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem', marginTop: '2rem'}}>
                  {logoLibrary.map((item, i) => (
                    <div key={i} style={{position:'relative', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', background: '#f8fafc'}}>
                      <div onClick={() => {updateBuilder({logo: item.url}); setAdminTab('BUILDER');}} style={{height:'100px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>
                        <img src={item.url} style={{maxHeight: '100%', maxWidth: '100%', objectFit: 'contain'}} />
                      </div>
                      <button onClick={() => deleteLogo(item)} style={{position:'absolute', top:'8px', right:'8px', background:'white', border:'1px solid #fee2e2', color:'#ef4444', borderRadius:'50%', padding:'5px', cursor:'pointer'}}><Trash2 size={14}/></button>
                    </div>
                  ))}
                  {logoLibrary.length === 0 && <p style={{color:'#94a3b8'}}>Library is empty.</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @media print { .print\:hidden { display: none !important; } }
        .tab-btn { background: none; border: none; padding: 0.5rem 1rem; font-size: 1rem; color: #64748b; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; border-bottom: 3px solid transparent; transition: 0.2s;}
        .tab-btn.active { color: #4f46e5; border-bottom-color: #4f46e5; }
      `}} />
    </div>
  );
};

export default App;