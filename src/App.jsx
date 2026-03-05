import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { User, Mail, Phone, ClipboardCheck, Printer, ChevronLeft, Lock, CheckCircle2, ArrowRight, RefreshCw, Folder, Briefcase, Settings, Plus, Image as ImageIcon, X, Trash2, Smartphone, Save, Calendar } from 'lucide-react';

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

  // 2. Fetch Data (FIXED: Removing orderBy to fix the blank roster issue)
  useEffect(() => {
    // Live Settings
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

    // Roster & Presets (FIX: Removed orderBy to bypass the index crash)
    const qSignins = collection(db, 'artifacts', 'virtual-sign-sheet', 'public', 'data', 'signins');
    const unsubSignins = onSnapshot(qSignins, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort manually in JS to avoid Firebase Index requirements that crash the UI
      setSubmissions(data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    });
    
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
    const now = new Date();
    try {
      await addDoc(collection(db, 'artifacts', 'virtual-sign-sheet', 'public', 'data', 'signins'), {
        name: formData.name,
        email: liveSession.reqEmail ? formData.email : 'N/A',
        phone: liveSession.reqPhone ? formData.phone : 'N/A',
        sessionTitle: liveSession.title,
        role: (liveSession.allowAgent && isAgent) ? 'Agent' : 'Guest',
        repId: (liveSession.allowAgent && isAgent) ? formData.repId : 'N/A',
        timestamp: serverTimestamp(),
        dateString: now.toLocaleDateString(),
        // NEW: Organization Data
        monthString: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
        timeString: now.toLocaleTimeString()
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
      alert("Success! The live sign-in page has been updated.");
    } catch (e) { alert("Failed to publish."); }
  };

  const savePreset = async () => {
    const name = prompt("Name this preset layout (e.g. Workshop):");
    if (name) {
      await addDoc(collection(db, 'artifacts', 'virtual-sign-sheet', 'presets'), { ...builderSession, presetName: name });
      alert("Preset Saved!");
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
    const reader = new FileReader();
    reader.onload = (e) => updateBuilder({ logo: e.target.result });
    reader.readAsDataURL(file);
    try {
      const storageRef = ref(storage, `logos/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      updateBuilder({ logo: url });
      fetchLogoLibrary();
    } catch (err) { alert("Upload failed."); }
  };

  // --- NEW: DELETE LOGO FEATURE ---
  const handleLogoDelete = async (url) => {
    if (window.confirm("Permanently delete this logo from the cloud?")) {
      try {
        const storageRef = ref(storage, url);
        await deleteObject(storageRef);
        alert("Logo deleted.");
        fetchLogoLibrary();
        if (session.logo === url) syncSessionToDB({ logo: '' });
      } catch (e) { alert("Could not delete cloud file."); }
    }
  };

  const deleteItem = async (path, id) => {
    if (window.confirm("Permanently delete?")) {
      await deleteDoc(doc(db, 'artifacts', 'virtual-sign-sheet', path, id));
    }
  };

  // --- ORGANIZATION LOGIC ---
  const uniqueMonths = [...new Set(submissions.map(s => s.monthString || 'Older Records'))];
  const uniqueDates = [...new Set(submissions.map(s => s.dateString))];
  const displayedSubmissions = selectedFolder === 'All' ? submissions : submissions.filter(s => s.dateString === selectedFolder || s.monthString === selectedFolder);

  // --- RENDER COMPONENT ---
  const renderSignInForm = (isPreview = false) => {
    const s = isPreview ? builderSession : liveSession;
    return (
      <div className={`modern-card ${isPreview ? 'preview-mode' : ''}`} style={isPreview ? { transform: 'scale(0.85)', transformOrigin: 'top center', margin: '0 auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '8px solid #0f172a' } : {}}>
        <header className="card-header" style={{marginBottom: '2rem', textAlign: 'center'}}>
          {s.logo && <img src={s.logo} alt="Logo" style={{height: `${s.logoHeight}px`, objectFit: 'contain', marginBottom: '1.5rem'}} />}
          <h1 style={{fontSize: '2.2rem', margin: 0}}>{s.title}</h1>
          <p style={{marginTop: '0.5rem', color: '#64748b'}}>{s.subtitle}</p>
        </header>
        <form onSubmit={isPreview ? (e)=>e.preventDefault() : handleGuestSubmit} className="signin-form">
          <div className="input-group"><label className="input-label">Full Name</label><div className="input-wrapper"><User size={18} className="input-icon" /><input className="modern-input" required placeholder="Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} disabled={isPreview}/></div></div>
          {s.reqEmail && <div className="input-group"><label className="input-label">Email</label><div className="input-wrapper"><Mail size={18} className="input-icon" /><input className="modern-input" type="email" required placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} disabled={isPreview}/></div></div>}
          {s.reqPhone && <div className="input-group"><label className="input-label">Phone</label><div className="input-wrapper"><Phone size={18} className="input-icon" /><input className="modern-input" type="tel" required placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} disabled={isPreview}/></div></div>}
          {s.allowAgent && (<><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}><input type="checkbox" id="agent-check" checked={isAgent} onChange={(e) => setIsAgent(e.target.checked)} style={{ width: '1.2rem', height: '1.2rem' }} disabled={isPreview} /><label htmlFor="agent-check" style={{ fontWeight: 'bold', color: '#0f172a' }}>I am an Agent</label></div>{isAgent && <div className="input-group" style={{ animation: 'fadeIn 0.3s' }}><label className="input-label">REP ID</label><div className="input-wrapper"><Briefcase size={18} className="input-icon" /><input className="modern-input" required placeholder="Ex: ABC12" value={formData.repId} onChange={(e) => setFormData({...formData, repId: e.target.value})} disabled={isPreview}/></div></div>}</>)}
          <button disabled={isSubmitting || isPreview} type="submit" className="primary-button" style={{marginTop: '1rem'}}>{isSubmitting ? "Processing..." : "Sign"} <ArrowRight size={20} /></button>
        </form>
      </div>
    );
  };

  return (
    <div className="app-shell">
      <nav className="navbar print:hidden">
        <div className="logo-section" onClick={() => setView('SIGNIN')} style={{cursor: 'pointer'}}><div style={{background: '#4f46e5', padding: '8px', borderRadius: '12px'}}><ClipboardCheck size={20} color="white" /></div><span className="logo-text">VirtualSign</span></div>
        <button onClick={() => setView(view === 'SIGNIN' ? 'ADMIN_LOGIN' : 'SIGNIN')} className="admin-toggle">{view === 'SIGNIN' ? <><Lock size={14} /> Admin</> : <><ChevronLeft size={14} /> Back</>}</button>
      </nav>

      <main className="main-container">
        {view === 'SIGNIN' && renderSignInForm(false)}

        {view === 'ADMIN_LOGIN' && (
          <div className="modern-card login-card" style={{maxWidth: '400px', margin: '5rem auto'}}>
             <Lock size={48} color="#4f46e5" style={{margin: '0 auto 1rem'}} />
             <input type="password" className="modern-input" placeholder="0000" maxLength={4} style={{textAlign: 'center', fontSize: '1.5rem'}} value={adminPin} onChange={(e) => setAdminPin(e.target.value)} />
             <button type="submit" className="primary-button" style={{marginTop: '1.5rem'}} onClick={handleAdminLogin}>Unlock</button>
          </div>
        )}

        {view === 'ADMIN_DASHBOARD' && (
          <div className="admin-dashboard">
            <div className="admin-tabs print:hidden" style={{display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem'}}>
               <button onClick={() => setAdminTab('BUILDER')} className={`tab-btn ${adminTab === 'BUILDER' ? 'active' : ''}`}><Settings size={18}/> Builder</button>
               <button onClick={() => setAdminTab('ROSTER')} className={`tab-btn ${adminTab === 'ROSTER' ? 'active' : ''}`}><Folder size={18}/> Roster ({submissions.length})</button>
               <button onClick={() => setAdminTab('LOGOS')} className={`tab-btn ${adminTab === 'LOGOS' ? 'active' : ''}`}><ImageIcon size={18}/> Library</button>
            </div>

            {adminTab === 'BUILDER' && (
               <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '3rem', alignItems: 'start'}}>
                 <div style={{ background: 'white', padding: '2rem', borderRadius: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem'}}><h2>Configure</h2><button onClick={publishChanges} disabled={!hasUnpublishedChanges} style={{ padding: '0.6rem 1rem', borderRadius: '12px', border: 'none', fontWeight: 'bold', background: hasUnpublishedChanges ? '#22c55e' : '#f1f5f9', color: hasUnpublishedChanges ? 'white' : '#94a3b8', cursor: 'pointer' }}><Save size={16} /> Publish</button></div>
                    <label className="input-label">Title</label><input className="modern-input" value={builderSession.title} onChange={(e) => updateBuilder({ title: e.target.value })} style={{marginBottom: '1rem'}}/>
                    <label className="input-label">Subtitle</label><input className="modern-input" value={builderSession.subtitle} onChange={(e) => updateBuilder({ subtitle: e.target.value })} />
                    <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '1.5rem' }}><label className="input-label">Require Fields</label><label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem'}}><input type="checkbox" checked={builderSession.reqEmail} onChange={(e)=>updateBuilder({reqEmail: e.target.checked})}/> Email</label><label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem'}}><input type="checkbox" checked={builderSession.reqPhone} onChange={(e)=>updateBuilder({reqPhone: e.target.checked})}/> Phone</label><label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem'}}><input type="checkbox" checked={builderSession.allowAgent} onChange={(e)=>updateBuilder({allowAgent: e.target.checked})}/> Agent Toggle</label></div>
                    <div style={{marginTop: '1rem'}}><label className="input-label">Presets</label><div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}><button onClick={saveAsPreset} className="admin-toggle"><Plus size={14} /> Save New</button>{presets.map(p => (<div key={p.id} style={{position: 'relative'}}><button onClick={() => loadPreset(p)} className="admin-toggle" style={{paddingRight: '2.5rem'}}>{p.presetName}</button><Trash2 size={14} onClick={(e) => deleteItem('presets', p.id, e)} style={{position: 'absolute', right: '10px', top: '7px', cursor: 'pointer', color: '#ef4444'}} /></div>))}</div></div>
                 </div>
                 <div style={{position: 'sticky', top: '100px'}}><div style={{textAlign: 'center', color: '#64748b', fontWeight: 'bold'}}><Smartphone size={16}/> Phone Preview</div>{renderSignInForm(true)}</div>
               </div>
            )}

            {adminTab === 'ROSTER' && (
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div className="print:hidden" style={{ flex: '1 1 200px' }}>
                  <h3 style={{display:'flex', alignItems:'center', gap:'0.5rem'}}><Calendar size={18}/> History</h3>
                  <button onClick={() => setSelectedFolder('All')} className="admin-toggle" style={{ width: '100%', marginBottom: '0.5rem', background: selectedFolder === 'All' ? '#eff6ff' : '' }}>All Records</button>
                  {uniqueMonths.map(month => (<><div style={{fontSize:'0.6rem', color:'#94a3b8', fontWeight:'bold', margin:'1rem 0 0.5rem'}}>{month.toUpperCase()}</div>{uniqueDates.filter(d => submissions.find(s => s.dateString === d && s.monthString === month)).map(date => (<button key={date} onClick={() => setSelectedFolder(date)} className="admin-toggle" style={{ width: '100%', marginBottom: '0.3rem', background: selectedFolder === date ? '#eff6ff' : '' }}>{date}</button>))}</>))}
                </div>
                <div className="table-container" style={{ flex: '3 1 600px', background: 'white', borderRadius: '1.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{padding:'1rem', background:'#f8fafc', display:'flex', justifyContent:'space-between'}} className="print:hidden"><span>Total: {displayedSubmissions.length}</span><button onClick={()=>window.print()} className="admin-toggle"><Printer size={16}/> Print PDF</button></div>
                  <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
                    <thead><tr style={{background: '#f8fafc', borderBottom: '1px solid #eee'}}><th style={{padding: '1rem'}}>Name</th><th style={{padding: '1rem'}}>Contact</th><th style={{padding: '1rem'}}>Role</th><th style={{padding: '1rem'}}>Time</th><th className="print:hidden"></th></tr></thead>
                    <tbody>{displayedSubmissions.map(item => (<tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{padding: '1rem', fontWeight: 'bold'}}>{item.name}</td><td style={{padding: '1rem'}}>{item.email}<br/><small>{item.phone}</small></td><td style={{padding: '1rem'}}>{item.role}</td><td style={{padding: '1rem', fontSize: '0.8rem'}}>{item.dateString}<br/>{item.timeString}</td><td className="print:hidden" style={{padding: '1rem'}}><Trash2 size={16} color="#ef4444" onClick={() => deleteItem('public/data/signins', item.id)} style={{cursor: 'pointer'}} /></td></tr>))}</tbody>
                  </table>
                </div>
              </div>
            )}

            {adminTab === 'LOGOS' && (
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem', padding: '2rem', background: 'white', borderRadius: '20px'}}>
                {logoLibrary.map((url, i) => (<div key={i} style={{position: 'relative', border: '1px solid #eee', borderRadius: '12px', padding: '1rem', background: '#f8fafc', textAlign: 'center'}}><img src={url} onClick={() => {updateBuilder({logo: url}); setAdminTab('BUILDER');}} style={{maxHeight: '100px', maxWidth: '100%', cursor: 'pointer', objectFit: 'contain'}} /><button onClick={() => handleLogoDelete(url)} style={{position: 'absolute', top: '-10px', right: '-10px', background: '#ef4444', color: 'white', borderRadius: '50%', padding: '5px', border: 'none', cursor: 'pointer'}}><X size={12}/></button></div>))}
              </div>
            )}
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @media print { .print-only { display: block !important; } .print\:hidden { display: none !important; } }
        .tab-btn { background: none; border: none; padding: 0.5rem 1rem; font-weight: bold; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; }
        .tab-btn.active { color: #4f46e5; border-bottom-color: #4f46e5; }
        .primary-button { width: 100%; background: #4f46e5; color: white; padding: 1rem; border-radius: 12px; border: none; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
        .modern-input { width: 100%; padding: 0.8rem 1rem; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 1rem; box-sizing: border-box; }
        .input-label { display: block; font-size: 0.75rem; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 0.4rem; }
        .input-wrapper { position: relative; }
        .input-icon { position: absolute; left: 0.8rem; top: 0.8rem; color: #94a3b8; }
        .modern-input { padding-left: 2.5rem; }
        .admin-toggle { background: #f8fafc; border: 1px solid #e2e8f0; padding: 0.5rem 0.8rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; font-weight: bold; color: #475569; }
      `}} />
    </div>
  );
};

export default App;