import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, doc, setDoc, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { User, Mail, Phone, ClipboardCheck, Printer, ChevronLeft, Lock, CheckCircle2, ArrowRight, RefreshCw, Folder, Briefcase, Settings, Plus, Trash2, Image as ImageIcon } from 'lucide-react';

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
  
  // Session & Branding State
  const [sessionSettings, setSessionSettings] = useState({ title: 'Welcome!', logo: '' });
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

  // Sync Settings and Sign-ins
  useEffect(() => {
    if (!user) return;
    
    // Sync Sign-ins
    const qSignins = query(collection(db, 'artifacts', 'virtual-sign-sheet', 'public', 'data', 'signins'), orderBy('timestamp', 'desc'));
    const unsubSignins = onSnapshot(qSignins, (snap) => setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    // Sync Session Settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'currentSession'), (snap) => {
      if (snap.exists()) setSessionSettings(snap.data());
    });

    // Sync Presets
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
    await setDoc(doc(db, 'settings', 'currentSession'), newData, { merge: true });
  };

  const saveAsPreset = async () => {
    const name = prompt("Enter a name for this preset (e.g. Training Day):");
    if (name) await addDoc(collection(db, 'presets'), { ...sessionSettings, presetName: name });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const storageRef = ref(storage, `logos/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    updateSession({ logo: url });
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
            <header className="card-header" style={{marginBottom: '2rem'}}>
              {sessionSettings.logo && <img src={sessionSettings.logo} alt="Event Logo" style={{maxHeight: '80px', marginBottom: '1.5rem', borderRadius: '8px'}} />}
              <h1 style={{fontSize: '2.2rem', margin: 0}}>{sessionSettings.title}</h1>
              <p style={{marginTop: '0.5rem', color: '#64748b'}}>Please check in below</p>
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

                {/* Agent Checkbox - MOVED TO BOTTOM */}
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

                <button disabled={isSubmitting} type="submit" className="primary-button">{isSubmitting ? "Processing..." : "Sign"} <ArrowRight size={20} /></button>
              </form>
            )}
          </div>
        )}

        {/* VIEW: ADMIN DASHBOARD */}
        {view === 'ADMIN_DASHBOARD' && (
          <div className="admin-dashboard">
            {/* Session Config Section */}
            <div style={{ background: 'white', padding: '2rem', borderRadius: '1.5rem', border: '1px solid #e2e8f0', marginBottom: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}><Settings size={22} color="#4f46e5" /> Session Config</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                <div>
                  <label className="input-label">Page Title</label>
                  <input className="modern-input" style={{paddingLeft: '1rem'}} value={sessionSettings.title} onChange={(e) => updateSession({ title: e.target.value })} placeholder="Ex: Tuesday Training" />
                  <div style={{marginTop: '1rem', display: 'flex', gap: '0.5rem'}}>
                    <button onClick={() => fileInputRef.current.click()} className="admin-toggle"><ImageIcon size={14} /> Upload Logo</button>
                    <button onClick={saveAsPreset} className="admin-toggle"><Plus size={14} /> Save Preset</button>
                    <input type="file" ref={fileInputRef} hidden onChange={handleLogoUpload} accept="image/*" />
                  </div>
                </div>
                <div>
                  <label className="input-label">Saved Presets</label>
                  <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                    {presets.map(p => (
                      <button key={p.id} onClick={() => updateSession({ title: p.title, logo: p.logo })} className="admin-toggle" style={{background: sessionSettings.title === p.title ? '#4f46e5' : '#f1f5f9', color: sessionSettings.title === p.title ? 'white' : '#475569'}}>
                        {p.presetName}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Existing Roster Logic */}
            <header className="dashboard-header print:hidden" style={{display: 'flex', justifyContent: 'space-between', marginBottom: '2rem'}}>
               <h1>{sessionSettings.title} Roster ({displayedSubmissions.length})</h1>
               <button onClick={() => window.print()} className="primary-button" style={{width: 'auto', padding: '0.6rem 1.2rem'}}><Printer size={18} /> Print PDF</button>
            </header>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div className="print:hidden" style={{ flex: '1 1 200px', background: 'white', borderRadius: '1.5rem', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Folder size={18} /> Folders</h3>
                <button onClick={() => setSelectedFolder('All')} style={{ width: '100%', textAlign: 'left', padding: '0.75rem', borderRadius: '8px', border: 'none', background: selectedFolder === 'All' ? '#eff6ff' : 'transparent', color: selectedFolder === 'All' ? '#4f46e5' : '#64748b' }}>All Records</button>
                {uniqueDates.map(date => (
                  <button key={date} onClick={() => setSelectedFolder(date)} style={{ width: '100%', textAlign: 'left', padding: '0.75rem', borderRadius: '8px', border: 'none', background: selectedFolder === date ? '#eff6ff' : 'transparent' }}>{date}</button>
                ))}
              </div>

              <div className="table-container" style={{ flex: '3 1 600px', background: 'white', borderRadius: '1.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                {/* Print Header */}
                <div className="print-only" style={{ display: 'none', textAlign: 'center', padding: '2rem' }}>
                   {sessionSettings.logo && <img src={sessionSettings.logo} height="60" style={{marginBottom: '1rem'}} />}
                   <h1>{sessionSettings.title}</h1>
                   <p>{selectedFolder === 'All' ? 'Complete Records' : `Date: ${selectedFolder}`}</p>
                </div>

                <table className="roster-table" style={{width: '100%'}}>
                  <thead><tr style={{background: '#f8fafc'}}><th>Name</th><th>Contact</th><th>Role / ID</th><th>Time</th></tr></thead>
                  <tbody>
                    {displayedSubmissions.map(item => (
                      <tr key={item.id}>
                        <td style={{fontWeight: 'bold'}}>{item.name}</td>
                        <td>{item.email}<br/><small>{item.phone}</small></td>
                        <td>{item.role} {item.role === 'Agent' && `(${item.repId})`}</td>
                        <td style={{fontSize: '0.8rem'}}>{item.dateString} {item.timeString}</td>
                      </tr>
                    ))}
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
                <input type="password" className="modern-input" placeholder="0000" maxLength={4} style={{textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em'}} value={adminPin} onChange={(e) => setAdminPin(e.target.value)} />
                <button type="submit" className="primary-button" style={{marginTop: '1.5rem'}}>Unlock</button>
             </form>
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @media print { .print-only { display: block !important; } .print\:hidden { display: none !important; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
};

export default App;