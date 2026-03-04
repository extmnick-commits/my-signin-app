import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { User, Mail, Phone, ClipboardCheck, Printer, ChevronLeft, Lock, CheckCircle2, ArrowRight, RefreshCw, Folder, Briefcase, Settings, Plus, Image as ImageIcon, X, Trash2 } from 'lucide-react';

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

const App = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('SIGNIN');
  const [adminPin, setAdminPin] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [sessionSettings, setSessionSettings] = useState({ 
    title: 'Welcome!', 
    subtitle: 'Please sign in for today\'s session.', 
    logo: '', 
    logoHeight: 80 
  });
  const [presets, setPresets] = useState([]);
  const [isAgent, setIsAgent] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', repId: '' });
  const [selectedFolder, setSelectedFolder] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    signInAnonymously(auth);
    onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const qSignins = query(collection(db, 'artifacts', 'virtual-sign-sheet', 'public', 'data', 'signins'), orderBy('timestamp', 'desc'));
    const unsubSignins = onSnapshot(qSignins, (snap) => setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unsubSettings = onSnapshot(doc(db, 'settings', 'currentSession'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSessionSettings({
          title: data.title || 'Welcome!',
          subtitle: data.subtitle || 'Please sign in for today\'s session.',
          logo: data.logo || '',
          logoHeight: data.logoHeight || 80
        });
      }
    });

    const unsubPresets = onSnapshot(collection(db, 'presets'), (snap) => {
      setPresets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubSignins(); unsubSettings(); unsubPresets(); };
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', 'virtual-sign-sheet', 'public', 'data', 'signins'), {
        ...formData,
        sessionTitle: sessionSettings.title,
        role: isAgent ? 'Agent' : 'Guest',
        repId: isAgent ? formData.repId : 'N/A',
        timestamp: serverTimestamp(),
        dateString: new Date().toLocaleDateString(),
        timeString: new Date().toLocaleTimeString()
      });
      setFormData({ name: '', email: '', phone: '', repId: '' });
      setIsAgent(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err) { alert("Error saving sign-in."); } 
    finally { setIsSubmitting(false); }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPin === '2501') { setView('ADMIN_DASHBOARD'); setAdminPin(''); } 
    else { alert("Incorrect PIN"); setAdminPin(''); }
  };

  const updateSession = async (newData) => {
    // Update local state instantly so the UI feels fast
    setSessionSettings(prev => ({...prev, ...newData}));
    // Save to Firebase
    try {
      await setDoc(doc(db, 'settings', 'currentSession'), newData, { merge: true });
    } catch (e) {
      console.error("Save error: ", e);
    }
  };

  // --- DELETE FUNCTIONS ---
  const deleteSubmission = async (id) => {
    if (window.confirm("Delete this sign-in entry?")) {
      await deleteDoc(doc(db, 'artifacts', 'virtual-sign-sheet', 'public', 'data', 'signins', id));
    }
  };

  const deletePreset = async (id, e) => {
    e.stopPropagation();
    if (window.confirm("Permanently remove this preset?")) {
      await deleteDoc(doc(db, 'presets', id));
    }
  };

  const saveAsPreset = async () => {
    const name = prompt("Enter a name for this preset (e.g. Saturday Training):");
    if (name) {
      await addDoc(collection(db, 'presets'), { 
        ...sessionSettings, 
        presetName: name 
      });
      alert("Preset saved!");
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // 1. Fallback Local Preview (guarantees you see the logo instantly)
    const reader = new FileReader();
    reader.onload = (e) => {
      updateSession({ logo: e.target.result });
    };
    reader.readAsDataURL(file);

    // 2. Background Upload to Storage
    try {
      const storageRef = ref(storage, `logos/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      updateSession({ logo: url }); // Update with real public URL
    } catch (err) {
      console.error("Storage upload failed. Check your Firebase Storage Rules.", err);
      // Even if upload fails, the local preview (base64 string) will still work for this session.
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800); 
  };

  const uniqueDates = [...new Set(submissions.map(s => s.dateString))];
  const displayedSubmissions = selectedFolder === 'All' ? submissions : submissions.filter(s => s.dateString === selectedFolder);

  return (
    <div className="app-shell">
      <nav className="navbar print:hidden">
        <div className="logo-section" onClick={() => setView('SIGNIN')} style={{cursor: 'pointer'}}>
          <div style={{background: '#4f46e5', padding: '8px', borderRadius: '12px'}}>
            <ClipboardCheck size={20} color="white" />
          </div>
          <span className="logo-text">VirtualSign</span>
        </div>
        <button onClick={() => setView(view === 'SIGNIN' ? 'ADMIN_LOGIN' : 'SIGNIN')} className="admin-toggle">
          {view === 'SIGNIN' ? <><Lock size={14} /> Admin</> : <><ChevronLeft size={14} /> Back</>}
        </button>
      </nav>

      <main className="main-container">
        {/* VIEW: SIGN IN */}
        {view === 'SIGNIN' && (
          <div className="modern-card">
            <header className="card-header" style={{marginBottom: '2rem', textAlign: 'center'}}>
              {sessionSettings.logo && (
                <img 
                  src={sessionSettings.logo} 
                  alt="Event Logo" 
                  style={{height: `${sessionSettings.logoHeight}px`, objectFit: 'contain', marginBottom: '1.5rem', borderRadius: '8px'}} 
                />
              )}
              <h1 style={{fontSize: '2.2rem', margin: 0}}>{sessionSettings.title}</h1>
              <p style={{marginTop: '0.5rem', color: '#64748b', fontSize: '1.1rem'}}>{sessionSettings.subtitle}</p>
            </header>

            {showSuccess ? (
              <div className="success-state">
                <CheckCircle2 size={64} color="#22c55e" />
                <h2>Verified</h2>
                <button onClick={() => setShowSuccess(false)} className="primary-button">New Entry</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="signin-form">
                <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <div className="input-wrapper"><User size={18} className="input-icon" /><input className="modern-input" required placeholder="Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
                </div>
                <div className="input-group">
                  <label className="input-label">Email Address</label>
                  <div className="input-wrapper"><Mail size={18} className="input-icon" /><input className="modern-input" type="email" required placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
                </div>
                <div className="input-group">
                  <label className="input-label">Phone Number</label>
                  <div className="input-wrapper"><Phone size={18} className="input-icon" /><input className="modern-input" type="tel" required placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} /></div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <input type="checkbox" id="agent-check" checked={isAgent} onChange={(e) => setIsAgent(e.target.checked)} style={{ width: '1.2rem', height: '1.2rem' }} />
                  <label htmlFor="agent-check" style={{ fontWeight: 'bold', color: '#0f172a' }}>I am an Agent</label>
                </div>

                {isAgent && (
                  <div className="input-group" style={{ animation: 'fadeIn 0.3s' }}>
                    <label className="input-label">REP ID</label>
                    <div className="input-wrapper"><Briefcase size={18} className="input-icon" /><input className="modern-input" required placeholder="Ex: ABC12" value={formData.repId} onChange={(e) => setFormData({...formData, repId: e.target.value})} /></div>
                  </div>
                )}

                <button disabled={isSubmitting} type="submit" className="primary-button" style={{marginTop: '1rem'}}>{isSubmitting ? "Processing..." : "Sign"} <ArrowRight size={20} /></button>
              </form>
            )}
          </div>
        )}

        {/* VIEW: ADMIN DASHBOARD */}
        {view === 'ADMIN_DASHBOARD' && (
          <div className="admin-dashboard">
            <div style={{ background: 'white', padding: '2rem', borderRadius: '1.5rem', border: '1px solid #e2e8f0', marginBottom: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}><Settings size={22} color="#4f46e5" /> Session Config</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', zIndex: 10 }}>
                  <div>
                    <label className="input-label">Main Title</label>
                    <input className="modern-input" style={{padding: '0.6rem 1rem'}} value={sessionSettings.title} onChange={(e) => updateSession({ title: e.target.value })} placeholder="Ex: Tuesday Opportunity Night" />
                  </div>
                  <div>
                    <label className="input-label">Subtitle</label>
                    <input className="modern-input" style={{padding: '0.6rem 1rem'}} value={sessionSettings.subtitle} onChange={(e) => updateSession({ subtitle: e.target.value })} placeholder="Ex: Hosted by the Leadership Team" />
                  </div>
                  
                  <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <label className="input-label">Event Logo</label>
                    {sessionSettings.logo ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem', background: 'white', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                          <img src={sessionSettings.logo} alt="Preview" style={{ height: `${sessionSettings.logoHeight}px`, objectFit: 'contain' }} />
                        </div>
                        <div>
                          <label className="input-label" style={{ fontSize: '0.65rem' }}>Logo Size: {sessionSettings.logoHeight}px</label>
                          <input type="range" min="40" max="200" value={sessionSettings.logoHeight} onChange={(e) => updateSession({ logoHeight: Number(e.target.value) })} style={{ width: '100%' }} />
                        </div>
                        <button onClick={() => updateSession({ logo: '' })} className="admin-toggle" style={{ color: '#ef4444', borderColor: '#fca5a5', alignSelf: 'flex-start' }}><X size={14} /> Remove Logo</button>
                      </div>
                    ) : (
                      <div style={{ marginTop: '0.5rem' }}>
                        <button onClick={() => fileInputRef.current.click()} className="admin-toggle"><ImageIcon size={14} /> Upload Image</button>
                        <input type="file" ref={fileInputRef} hidden onChange={handleLogoUpload} accept="image/*" />
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ position: 'relative', zIndex: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="input-label" style={{ margin: 0 }}>Saved Presets</label>
                    <button onClick={saveAsPreset} className="admin-toggle" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}><Plus size={14} /> Save Current</button>
                  </div>
                  <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '100px'}}>
                    {presets.length === 0 ? (
                      <p style={{color: '#94a3b8', fontSize: '0.85rem', margin: 0}}>No presets saved yet.</p>
                    ) : (
                      presets.map(p => (
                        <div key={p.id} style={{position: 'relative', display: 'inline-block'}}>
                          <button 
                            onClick={() => updateSession({ title: p.title, subtitle: p.subtitle || '', logo: p.logo || '', logoHeight: p.logoHeight || 80 })} 
                            className="admin-toggle" 
                            style={{background: sessionSettings.title === p.title ? '#4f46e5' : 'white', color: sessionSettings.title === p.title ? 'white' : '#475569', paddingRight: '2.5rem', cursor: 'pointer'}}
                          >
                            {p.presetName}
                          </button>
                          <Trash2 
                            size={14} 
                            onClick={(e) => deletePreset(p.id, e)} 
                            style={{position: 'absolute', right: '10px', top: '10px', cursor: 'pointer', color: sessionSettings.title === p.title ? 'white' : '#ef4444', zIndex: 30}} 
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <header className="dashboard-header print:hidden" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
              <div>
                <h1 style={{margin: 0}}>{sessionSettings.title} Roster ({displayedSubmissions.length})</h1>
                <p style={{color: '#64748b', margin: '0.25rem 0 0'}}>Real-time sync active</p>
              </div>
              <div style={{display: 'flex', gap: '1rem'}}>
                <button onClick={handleRefresh} className="admin-toggle" style={{ border: '1px solid #e2e8f0', background: 'white' }}>
                  <RefreshCw size={18} className={isRefreshing ? "spin-animation" : ""} color="#4f46e5" /> {isRefreshing ? "Syncing..." : "Refresh"}
                </button>
                <button onClick={() => window.print()} className="primary-button print-btn" style={{width: 'auto', padding: '0.6rem 1.2rem', borderRadius: '20px', fontSize: '1rem'}}>
                  <Printer size={18} /> Print PDF
                </button>
              </div>
            </header>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div className="print:hidden" style={{ flex: '1 1 200px', background: 'white', borderRadius: '1.5rem', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0}}><Folder size={18} /> Folders</h3>
                <button onClick={() => setSelectedFolder('All')} style={{ width: '100%', textAlign: 'left', padding: '0.75rem', borderRadius: '8px', border: 'none', background: selectedFolder === 'All' ? '#eff6ff' : 'transparent', color: selectedFolder === 'All' ? '#4f46e5' : '#64748b', fontWeight: 'bold' }}>All Records</button>
                {uniqueDates.map(date => (
                  <button key={date} onClick={() => setSelectedFolder(date)} style={{ width: '100%', textAlign: 'left', padding: '0.75rem', borderRadius: '8px', border: 'none', background: selectedFolder === date ? '#eff6ff' : 'transparent', color: selectedFolder === date ? '#4f46e5' : '#64748b', fontWeight: 'bold' }}>{date}</button>
                ))}
              </div>

              <div className="table-container" style={{ flex: '3 1 600px', background: 'white', borderRadius: '1.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div className="print-only" style={{ display: 'none', textAlign: 'center', padding: '2rem' }}>
                   {sessionSettings.logo && <img src={sessionSettings.logo} style={{height: `${sessionSettings.logoHeight}px`, objectFit: 'contain', marginBottom: '1rem'}} />}
                   <h1 style={{margin: '0 0 0.5rem 0'}}>{sessionSettings.title}</h1>
                   <p style={{margin: 0, color: '#64748b', fontSize: '1.1rem'}}>{sessionSettings.subtitle}</p>
                   <p style={{marginTop: '1rem', fontWeight: 'bold'}}>{selectedFolder === 'All' ? 'Complete Records' : `Date: ${selectedFolder}`}</p>
                </div>

                <table className="roster-table" style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
                  <thead><tr style={{background: '#f8fafc', borderBottom: '1px solid #e2e8f0'}}><th style={{padding: '1rem'}}>Name</th><th style={{padding: '1rem'}}>Contact</th><th style={{padding: '1rem'}}>Role / ID</th><th style={{padding: '1rem'}}>Time</th><th className="print:hidden" style={{padding: '1rem'}}></th></tr></thead>
                  <tbody>
                    {displayedSubmissions.length === 0 ? (
                      <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No sign-ins found for this selection.</td></tr>
                    ) : (
                      displayedSubmissions.map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{padding: '1rem', fontWeight: 'bold'}}>{item.name}</td>
                          <td style={{padding: '1rem'}}>{item.email}<br/><small style={{color: '#94a3b8'}}>{item.phone}</small></td>
                          <td style={{padding: '1rem'}}>
                            <span style={{ fontWeight: 'bold', color: item.role === 'Agent' ? '#4f46e5' : '#64748b' }}>{item.role || 'Guest'}</span>
                            {item.role === 'Agent' && <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>ID: {item.repId}</div>}
                          </td>
                          <td style={{padding: '1rem', fontSize: '0.85rem', color: '#64748b'}}>{item.dateString} <br/> <span style={{color: '#94a3b8'}}>{item.timeString}</span></td>
                          <td className="print:hidden" style={{padding: '1rem', textAlign: 'right'}}>
                            <button onClick={() => deleteSubmission(item.id)} style={{background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem'}}><Trash2 size={16} color="#ef4444" /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: ADMIN LOGIN */}
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
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @media print { .print-only { display: block !important; } .print\:hidden { display: none !important; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin-animation { animation: spin 0.8s linear infinite; }
      `}} />
    </div>
  );
};

export default App;