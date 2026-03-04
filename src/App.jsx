import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { User, Mail, Phone, ClipboardCheck, Printer, ChevronLeft, Lock, CheckCircle2, ArrowRight, RefreshCw, Folder, Briefcase, Settings, Plus, Image as ImageIcon, X, Trash2, Smartphone, Save } from 'lucide-react';

// --- FIREBASE CONFIG (virtual-sign-21884) ---
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
  
  // Session States (Separated for Builder vs Live)
  const [liveSession, setLiveSession] = useState(defaultSession);
  const [builderSession, setBuilderSession] = useState(defaultSession);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);

  // Form States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', repId: '' });
  const [selectedFolder, setSelectedFolder] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fileInputRef = useRef(null);

  // 1. Auth Init
  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Fetch Data (Instantly, independent of auth to prevent refresh bugs)
  useEffect(() => {
    // Live Settings (Always fetches instantly so guests see the page immediately)
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
        // Sync builder to match live on first load
        if (!hasUnpublishedChanges) setBuilderSession(fullData); 
      }
    });

    // Roster & Presets
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
      const urls = await Promise.all(res.items.map((itemRef) => getDownloadURL(itemRef)));
      setLogoLibrary(urls);
    } catch (error) { console.error("Error fetching logos"); }
  };

  // --- ACTIONS ---
  const handleGuestSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', 'virtual-sign-sheet', 'public', 'data', 'signins'), {
        name: formData.name,
        email: liveSession.reqEmail ? formData.email : 'N/A',
        phone: liveSession.reqPhone ? formData.phone : 'N/A',
        sessionTitle: liveSession.title,
        role: (liveSession.allowAgent && isAgent) ? 'Agent' : 'Guest',
        repId: (liveSession.allowAgent && isAgent) ? formData.repId : 'N/A',
        timestamp: serverTimestamp(),
        dateString: new Date().toLocaleDateString(),
        timeString: new Date().toLocaleTimeString()
      });
      setFormData({ name: '', email: '', phone: '', repId: '' });
      setIsAgent(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err) { alert("Submission failed. Check your connection."); } 
    finally { setIsSubmitting(false); }
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
      alert("Success! The live sign-in page has been updated everywhere.");
    } catch (e) { alert("Failed to publish. Check Firebase permissions."); }
  };

  const savePreset = async () => {
    const name = prompt("Name this preset layout (e.g. Quick Training):");
    if (name) {
      await addDoc(collection(db, 'artifacts', 'virtual-sign-sheet', 'presets'), { ...builderSession, presetName: name });
      alert("Preset Saved! You can load it anytime from the list below.");
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
    
    // Quick preview
    const reader = new FileReader();
    reader.onload = (e) => updateBuilder({ logo: e.target.result });
    reader.readAsDataURL(file);

    try {
      const storageRef = ref(storage, `logos/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      updateBuilder({ logo: url });
      fetchLogoLibrary();
    } catch (err) { alert("Upload failed. Ensure Storage rules allow writes."); }
  };

  const deleteItem = async (path, id) => {
    if (window.confirm("Permanently delete?")) {
      await deleteDoc(doc(db, 'artifacts', 'virtual-sign-sheet', path, id));
    }
  };

  // --- RENDER COMPONENT ---
  const renderSignInForm = (isPreview = false) => {
    // If previewing, show the builder session. Otherwise, show the live session.
    const s = isPreview ? builderSession : liveSession;

    return (
      <div className={`modern-card ${isPreview ? 'preview-mode' : ''}`} style={isPreview ? { transform: 'scale(0.85)', transformOrigin: 'top center', margin: '0 auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '8px solid #0f172a' } : {}}>
        <header className="card-header" style={{marginBottom: '2rem', textAlign: 'center'}}>
          {s.logo && <img src={s.logo} alt="Logo" style={{height: `${s.logoHeight}px`, objectFit: 'contain', marginBottom: '1.5rem'}} />}
          <h1 style={{fontSize: '2.2rem', margin: 0}}>{s.title}</h1>
          <p style={{marginTop: '0.5rem', color: '#64748b'}}>{s.subtitle}</p>
        </header>

        {showSuccess && !isPreview ? (
          <div className="success-state" style={{textAlign: 'center'}}>
            <CheckCircle2 size={64} color="#22c55e" />
            <h2>Verified</h2>
            <button onClick={() => setShowSuccess(false)} className="primary-button">New Entry</button>
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
                  <div className="input-group" style={{ animation: 'fadeIn 0.3s' }}>
                    <label className="input-label">REP ID</label>
                    <div className="input-wrapper"><Briefcase size={18} className="input-icon" /><input className="modern-input" required placeholder="Ex: ABC12" value={formData.repId} onChange={(e) => setFormData({...formData, repId: e.target.value})} disabled={isPreview}/></div>
                  </div>
                )}
              </>
            )}

            <button disabled={isSubmitting || isPreview} type="submit" className="primary-button" style={{marginTop: '1rem'}}>{isSubmitting ? "Processing..." : "Sign"} <ArrowRight size={20} /></button>
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
             <h2>Admin PIN</h2>
             <form onSubmit={handleAdminLogin}>
                <input type="password" className="modern-input" placeholder="0000" maxLength={4} style={{textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em', marginBottom: '1.5rem'}} value={adminPin} onChange={(e) => setAdminPin(e.target.value)} />
                <button type="submit" className="primary-button">Unlock</button>
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

            {/* TAB 1: PAGE BUILDER */}
            {adminTab === 'BUILDER' && (
               <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '3rem', alignItems: 'start'}}>
                 {/* Left Column: Controls */}
                 <div style={{ background: 'white', padding: '2rem', borderRadius: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                      <h2 style={{ margin: 0 }}>Configure Layout</h2>
                      <button 
                        onClick={publishChanges} 
                        disabled={!hasUnpublishedChanges}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: hasUnpublishedChanges ? 'pointer' : 'default', transition: '0.2s', background: hasUnpublishedChanges ? '#22c55e' : '#f1f5f9', color: hasUnpublishedChanges ? 'white' : '#94a3b8' }}
                      >
                        <Save size={16} /> {hasUnpublishedChanges ? "Publish to Live" : "Published"}
                      </button>
                    </div>

                    <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                      <div>
                        <label className="input-label">Main Title</label>
                        <input className="modern-input" style={{paddingLeft: '1rem'}} value={builderSession.title} onChange={(e) => updateBuilder({ title: e.target.value })} />
                      </div>
                      <div>
                        <label className="input-label">Subtitle</label>
                        <input className="modern-input" style={{paddingLeft: '1rem'}} value={builderSession.subtitle} onChange={(e) => updateBuilder({ subtitle: e.target.value })} />
                      </div>
                      
                      <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <label className="input-label">Inputs to Require</label>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem'}}>
                          <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8'}}><input type="checkbox" checked disabled /> Full Name (Always Required)</label>
                          <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold'}}><input type="checkbox" checked={builderSession.reqEmail} onChange={(e)=>updateBuilder({reqEmail: e.target.checked})} style={{width: '1rem', height: '1rem'}}/> Ask for Email Address</label>
                          <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold'}}><input type="checkbox" checked={builderSession.reqPhone} onChange={(e)=>updateBuilder({reqPhone: e.target.checked})} style={{width: '1rem', height: '1rem'}}/> Ask for Phone Number</label>
                          <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold'}}><input type="checkbox" checked={builderSession.allowAgent} onChange={(e)=>updateBuilder({allowAgent: e.target.checked})} style={{width: '1rem', height: '1rem'}}/> Show 'I am an Agent' Option</label>
                        </div>
                      </div>

                      <div>
                        <label className="input-label">Active Logo</label>
                        <div style={{display: 'flex', gap: '1rem', marginTop: '0.5rem'}}>
                          <button onClick={() => fileInputRef.current.click()} className="admin-toggle"><ImageIcon size={14} /> Upload New</button>
                          {builderSession.logo && <button onClick={() => updateBuilder({ logo: '' })} className="admin-toggle" style={{color: '#ef4444'}}><X size={14}/> Remove</button>}
                          <input type="file" ref={fileInputRef} hidden onChange={handleLogoUpload} accept="image/*" />
                        </div>
                        {builderSession.logo && (
                          <div style={{marginTop: '1rem'}}>
                             <label className="input-label" style={{fontSize: '0.65rem'}}>Logo Size</label>
                             <input type="range" min="40" max="250" value={builderSession.logoHeight} onChange={(e) => updateBuilder({ logoHeight: Number(e.target.value) })} style={{width: '100%'}} />
                          </div>
                        )}
                      </div>
                      
                      <div style={{marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0'}}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <label className="input-label" style={{margin: 0}}>Saved Presets</label>
                          <button onClick={savePreset} className="admin-toggle" style={{padding: '0.3rem 0.8rem'}}><Plus size={14} /> Clone Current</button>
                        </div>
                        <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                          {presets.length === 0 ? <span style={{color: '#94a3b8', fontSize: '0.85rem'}}>No presets saved yet.</span> : presets.map(p => (
                            <div key={p.id} style={{position: 'relative'}}>
                              <button onClick={() => loadPreset(p)} className="admin-toggle" style={{paddingRight: '2.5rem', background: 'white'}}>{p.presetName}</button>
                              <Trash2 size={14} onClick={(e) => deleteItem('presets', p.id, e)} style={{position: 'absolute', right: '10px', top: '10px', cursor: 'pointer', color: '#ef4444', zIndex: 30}} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                 </div>

                 {/* Right Column: Live Phone Preview */}
                 <div style={{position: 'sticky', top: '100px'}}>
                   <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#64748b', justifyContent: 'center', fontWeight: 'bold'}}>
                     <Smartphone size={18}/> <span>Live Phone Preview</span>
                   </div>
                   {renderSignInForm(true)}
                 </div>
               </div>
            )}

            {/* TAB 2: ROSTER */}
            {adminTab === 'ROSTER' && (
              <div className="fade-in">
                <header className="dashboard-header print:hidden" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
                   <div>
                     <h1 style={{margin: 0}}>{liveSession.title} Roster ({displayedSubmissions.length})</h1>
                   </div>
                   <div style={{display: 'flex', gap: '1rem'}}>
                     <button onClick={() => { setIsRefreshing(true); setTimeout(() => setIsRefreshing(false), 800); }} className="admin-toggle"><RefreshCw size={18} className={isRefreshing ? "spin-animation" : ""} /> Refresh</button>
                     <button onClick={() => window.print()} className="primary-button" style={{width: 'auto', padding: '0.6rem 1.2rem'}}><Printer size={18} /> Print PDF</button>
                   </div>
                </header>

                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                  <div className="print:hidden" style={{ flex: '1 1 200px' }}>
                    <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Folder size={18} /> History</h3>
                    <button onClick={() => setSelectedFolder('All')} style={{ width: '100%', textAlign: 'left', padding: '0.75rem', borderRadius: '8px', border: 'none', background: selectedFolder === 'All' ? '#eff6ff' : 'transparent', color: selectedFolder === 'All' ? '#4f46e5' : '#64748b', fontWeight: 'bold' }}>All Records</button>
                    {uniqueDates.map(date => (
                      <button key={date} onClick={() => setSelectedFolder(date)} style={{ width: '100%', textAlign: 'left', padding: '0.75rem', borderRadius: '8px', border: 'none', background: selectedFolder === date ? '#eff6ff' : 'transparent', color: selectedFolder === date ? '#4f46e5' : '#64748b', fontWeight: 'bold' }}>{date}</button>
                    ))}
                  </div>

                  <div className="table-container" style={{ flex: '3 1 600px', background: 'white', borderRadius: '1.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div className="print-only" style={{ display: 'none', textAlign: 'center', padding: '2rem' }}>
                       {liveSession.logo && <img src={liveSession.logo} style={{height: `${liveSession.logoHeight}px`, objectFit: 'contain', marginBottom: '1rem'}} />}
                       <h1 style={{margin: '0 0 0.5rem 0'}}>{liveSession.title}</h1>
                       <p style={{margin: 0, color: '#64748b', fontSize: '1.1rem'}}>{liveSession.subtitle}</p>
                       <p style={{marginTop: '1rem', fontWeight: 'bold'}}>{selectedFolder === 'All' ? 'Complete Records' : `Date: ${selectedFolder}`}</p>
                    </div>

                    <table className="roster-table" style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
                      <thead><tr style={{background: '#f8fafc'}}><th style={{padding: '1rem'}}>Name</th><th style={{padding: '1rem'}}>Contact</th><th style={{padding: '1rem'}}>Role</th><th style={{padding: '1rem'}}>Time</th><th className="print:hidden"></th></tr></thead>
                      <tbody>
                        {displayedSubmissions.length === 0 ? (
                          <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No sign-ins found for this selection.</td></tr>
                        ) : (
                          displayedSubmissions.map(item => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{padding: '1rem', fontWeight: 'bold'}}>{item.name}</td>
                              <td style={{padding: '1rem'}}>
                                {item.email !== 'N/A' && <div>{item.email}</div>}
                                {item.phone !== 'N/A' && <small style={{color: '#94a3b8'}}>{item.phone}</small>}
                                {item.email === 'N/A' && item.phone === 'N/A' && <small style={{color: '#cbd5e1'}}>No contact info</small>}
                              </td>
                              <td style={{padding: '1rem'}}>{item.role} {item.role === 'Agent' && `(${item.repId})`}</td>
                              <td style={{padding: '1rem', fontSize: '0.8rem'}}>{item.dateString} {item.timeString}</td>
                              <td className="print:hidden" style={{padding: '1rem', textAlign: 'right'}}><Trash2 size={16} color="#ef4444" style={{cursor: 'pointer'}} onClick={() => deleteItem('public/data/signins', item.id)} /></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: LOGO GALLERY */}
            {adminTab === 'LOGOS' && (
              <div className="fade-in" style={{ background: 'white', padding: '2rem', borderRadius: '1.5rem', border: '1px solid #e2e8f0' }}>
                <h2 style={{marginTop: 0}}>Cloud Logo Library</h2>
                <p style={{color: '#64748b'}}>Click an image to set it as the active logo in your builder.</p>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem', marginTop: '2rem'}}>
                  {logoLibrary.map((url, i) => (
                    <div key={i} onClick={() => {updateBuilder({logo: url}); setAdminTab('BUILDER');}} style={{border: builderSession.logo === url ? '3px solid #4f46e5' : '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', background: '#f8fafc', transition: '0.2s'}}>
                      <img src={url} style={{maxHeight: '100%', maxWidth: '100%', objectFit: 'contain'}} />
                    </div>
                  ))}
                  {logoLibrary.length === 0 && <p style={{gridColumn: '1/-1', color: '#94a3b8'}}>No logos found in storage. Go to the Page Builder to upload one.</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @media print { .print-only { display: block !important; } .print\:hidden { display: none !important; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .tab-btn { background: none; border: none; padding: 0.5rem 1rem; font-size: 1rem; color: #64748b; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; border-bottom: 3px solid transparent; transition: 0.2s;}
        .tab-btn:hover { color: #0f172a; }
        .tab-btn.active { color: #4f46e5; border-bottom-color: #4f46e5; }
        .spin-animation { animation: spin 0.8s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
};

export default App;