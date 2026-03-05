import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { User, Mail, Phone, ClipboardCheck, Printer, ChevronLeft, Lock, CheckCircle2, ArrowRight, RefreshCw, Folder, Briefcase, Settings, Plus, Image as ImageIcon, X, Trash2, Smartphone, Save, Copy, Download } from 'lucide-react';

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
  
  // Session States
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

  // 2. Fetch Data (Direct paths fix index errors)
  useEffect(() => {
    if (!user) return;

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

    const unsubSignins = onSnapshot(collection(db, 'artifacts', 'virtual-sign-sheet', 'public', 'data', 'signins'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort manually to bypass the index crash
      setSubmissions(data.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    });
    
    const unsubPresets = onSnapshot(collection(db, 'artifacts', 'virtual-sign-sheet', 'presets'), (snap) => {
      setPresets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    fetchLogoLibrary();

    return () => { unsubSignins(); unsubSettings(); unsubPresets(); };
  }, [user]);

  const fetchLogoLibrary = async () => {
    try {
      const listRef = ref(storage, 'logos');
      const res = await listAll(listRef);
      const urls = await Promise.all(res.items.map(i => getDownloadURL(i)));
      setLogoLibrary(urls);
    } catch (e) { console.error("Logo fetch error"); }
  };

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
        monthString: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
        timeString: now.toLocaleTimeString()
      });
      setFormData({ name: '', email: '', phone: '', repId: '' });
      setIsAgent(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err) { alert("Submission failed."); } 
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
      alert("Changes Published!");
    } catch (e) { alert("Publish failed."); }
  };

  const saveAsPreset = async () => {
    const name = prompt("Name this event preset:");
    if (name) await addDoc(collection(db, 'artifacts', 'virtual-sign-sheet', 'presets'), { ...builderSession, presetName: name });
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

  const deleteItem = async (col, id) => {
    if (window.confirm("Permanently delete?")) await deleteDoc(doc(db, 'artifacts', 'virtual-sign-sheet', col, id));
  };

  const exportToCSV = (data) => {
    const headers = ['Name', 'Email', 'Phone', 'Role', 'Rep ID', 'Date', 'Time', 'Event Title'];
    const rows = data.map(s => [ `"${s.name}"`, `"${s.email}"`, `"${s.phone}"`, `"${s.role}"`, `"${s.repId}"`, `"${s.dateString}"`, `"${s.timeString}"`, `"${s.sessionTitle}"` ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `VirtualSign_Roster_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Organize by Months and Days
  const uniqueMonths = [...new Set(submissions.map(s => s.monthString || 'Older'))];
  const displayedSubmissions = selectedFolder === 'All' ? submissions : submissions.filter(s => s.dateString === selectedFolder || s.monthString === selectedFolder);

  // --- UI RENDERER ---
  const GuestForm = (isPreview = false) => {
    const s = isPreview ? builderSession : liveSession;
    return (
      <div className={`modern-card ${isPreview ? 'preview-mode' : ''}`} style={isPreview ? { transform: 'scale(0.85)', transformOrigin: 'top center', margin: '0 auto', border: '8px solid #0f172a', borderRadius: '3rem' } : {}}>
        <header style={{marginBottom: '2rem', textAlign: 'center'}}>
          {s.logo && <img src={s.logo} style={{height: `${s.logoHeight}px`, marginBottom: '1rem', objectFit: 'contain'}} />}
          <h1 style={{margin: 0, fontSize: '2rem'}}>{s.title}</h1>
          <p style={{color: '#64748b'}}>{s.subtitle}</p>
        </header>
        <form onSubmit={isPreview ? (e)=>e.preventDefault() : handleGuestSubmit}>
          <div className="input-group"><label className="input-label">Full Name</label><div className="input-wrapper"><User size={18} className="input-icon"/><input className="modern-input" required placeholder="Name" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} disabled={isPreview}/></div></div>
          {s.reqEmail && <div className="input-group"><label className="input-label">Email</label><div className="input-wrapper"><Mail size={18} className="input-icon"/><input className="modern-input" type="email" placeholder="Email" value={formData.email} onChange={e=>setFormData({...formData, email:e.target.value})} disabled={isPreview}/></div></div>}
          {s.reqPhone && <div className="input-group"><label className="input-label">Phone</label><div className="input-wrapper"><Phone size={18} className="input-icon"/><input className="modern-input" type="tel" placeholder="Phone" value={formData.phone} onChange={e=>setFormData({...formData, phone:e.target.value})} disabled={isPreview}/></div></div>}
          {s.allowAgent && <div style={{display:'flex', alignItems:'center', gap:'0.5rem', marginTop:'1rem', padding:'1rem', background:'#f8fafc', borderRadius:'12px'}}><input type="checkbox" id="ag" checked={isAgent} onChange={e=>setIsAgent(e.target.checked)} disabled={isPreview}/><label htmlFor="ag" style={{fontWeight:'bold'}}>I am an Agent</label></div>}
          {isAgent && s.allowAgent && <div className="input-group" style={{marginTop:'1rem'}}><label className="input-label">REP ID</label><div className="input-wrapper"><Briefcase size={18} className="input-icon"/><input className="modern-input" required placeholder="ABC12" value={formData.repId} onChange={e=>setFormData({...formData, repId:e.target.value})} disabled={isPreview}/></div></div>}
          <button className="primary-button" style={{marginTop:'1.5rem'}} disabled={isSubmitting || isPreview}>{isSubmitting ? "Processing..." : "Sign"} <ArrowRight size={18}/></button>
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
        {view === 'SIGNIN' && (showSuccess ? <div className="modern-card" style={{textAlign:'center'}}><CheckCircle2 size={80} color="#22c55e" style={{margin:'0 auto 1rem'}}/><h2>Signed In!</h2><button className="primary-button" onClick={()=>setShowSuccess(false)}>New Sign In</button></div> : GuestForm())}

        {view === 'ADMIN_LOGIN' && (
          <div className="modern-card" style={{maxWidth: '400px', margin: '5rem auto'}}>
             <Lock size={48} color="#4f46e5" style={{margin: '0 auto 1rem'}} />
             <input type="password" className="modern-input" placeholder="0000" maxLength={4} style={{textAlign: 'center', fontSize: '1.5rem'}} value={adminPin} onChange={e=>setAdminPin(e.target.value)} />
             <button className="primary-button" style={{marginTop: '1.5rem'}} onClick={handleAdminLogin}>Unlock</button>
          </div>
        )}

        {view === 'ADMIN_DASHBOARD' && (
          <div className="admin-dashboard">
            <div className="admin-tabs print:hidden" style={{display:'flex', gap:'1rem', marginBottom:'2rem', borderBottom:'2px solid #e2e8f0', paddingBottom:'1rem'}}>
              <button onClick={()=>setAdminTab('BUILDER')} className={`tab-btn ${adminTab==='BUILDER'?'active':''}`}><Settings size={18}/> Builder</button>
              <button onClick={()=>setAdminTab('ROSTER')} className={`tab-btn ${adminTab==='ROSTER'?'active':''}`}><Folder size={18}/> Roster ({submissions.length})</button>
              <button onClick={()=>setAdminTab('LOGOS')} className={`tab-btn ${adminTab==='LOGOS'?'active':''}`}><ImageIcon size={18}/> Library</button>
            </div>

            {adminTab === 'BUILDER' && (
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(350px, 1fr))', gap:'2rem'}}>
                <div style={{background:'white', padding:'2rem', borderRadius:'20px', border:'1px solid #e2e8f0'}}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1.5rem'}}><h2 style={{margin:0}}>Setup</h2><button onClick={publishChanges} disabled={!hasUnpublishedChanges} style={{padding:'0.5rem 1rem', borderRadius:'10px', border:'none', fontWeight:'bold', background:hasUnpublishedChanges?'#22c55e':'#f1f5f9', color:hasUnpublishedChanges?'white':'#94a3b8', cursor:hasUnpublishedChanges?'pointer':''}}><Save size={16}/> {hasUnpublishedChanges?"Publish":"Published"}</button></div>
                  <label className="input-label">Title</label><input className="modern-input" value={builderSession.title} onChange={e=>updateBuilder({title:e.target.value})} style={{marginBottom:'1rem'}}/>
                  <label className="input-label">Subtitle</label><input className="modern-input" value={builderSession.subtitle} onChange={e=>updateBuilder({subtitle:e.target.value})} />
                  
                  <div style={{marginTop:'1.5rem', background:'#f8fafc', padding:'1rem', borderRadius:'12px'}}>
                    <label className="input-label">Input Toggles</label>
                    <label style={{display:'flex', alignItems:'center', gap:'0.5rem', marginTop:'0.5rem', fontWeight:'bold'}}><input type="checkbox" checked={builderSession.reqEmail} onChange={e=>updateBuilder({reqEmail:e.target.checked})}/> Request Email</label>
                    <label style={{display:'flex', alignItems:'center', gap:'0.5rem', marginTop:'0.5rem', fontWeight:'bold'}}><input type="checkbox" checked={builderSession.reqPhone} onChange={e=>updateBuilder({reqPhone:e.target.checked})}/> Request Phone</label>
                    <label style={{display:'flex', alignItems:'center', gap:'0.5rem', marginTop:'0.5rem', fontWeight:'bold'}}><input type="checkbox" checked={builderSession.allowAgent} onChange={e=>updateBuilder({allowAgent:e.target.checked})}/> Agent Toggle</label>
                  </div>

                  <div style={{marginTop:'1.5rem'}}><label className="input-label">Logo</label><button className="admin-toggle" onClick={()=>fileInputRef.current.click()}><ImageIcon size={14}/> Upload Logo</button><input type="file" ref={fileInputRef} hidden onChange={handleLogoUpload} accept="image/*" /></div>
                  {builderSession.logo && <div style={{marginTop:'1rem'}}><label className="input-label">Size</label><input type="range" min="40" max="250" value={builderSession.logoHeight} onChange={e=>updateBuilder({logoHeight:Number(e.target.value)})} style={{width:'100%'}}/></div>}

                  <div style={{marginTop:'2rem', paddingTop:'1rem', borderTop:'1px solid #eee'}}>
                    <div style={{display:'flex', justifyContent:'space-between'}}><label className="input-label">Presets</label><button className="admin-toggle" onClick={saveAsPreset}><Plus size={12}/> Save</button></div>
                    <div style={{display:'flex', gap:'0.5rem', flexWrap:'wrap', marginTop:'1rem'}}>
                      {presets.map(p=>(
                        <div key={p.id} style={{position:'relative'}}><button className="admin-toggle" onClick={()=>loadPreset(p)} style={{paddingRight:'2.5rem', background:'white'}}>{p.presetName}</button><Trash2 size={14} onClick={()=>deleteItem('presets', p.id)} style={{position:'absolute', right:'5px', top:'7px', cursor:'pointer', color:'#ef4444', zIndex:30}}/></div>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{position:'sticky', top:'100px'}}><h3 style={{textAlign:'center', color:'#64748b'}}><Smartphone size={16}/> Live Preview</h3>{GuestForm(true)}</div>
              </div>
            )}

            {adminTab === 'ROSTER' && (
              <div className="fade-in">
                <header className="dashboard-header print:hidden" style={{display:'flex', justifyContent:'space-between', marginBottom:'1.5rem'}}>
                  <h2>{liveSession.title} ({displayedSubmissions.length})</h2>
                  <div style={{display:'flex', gap:'1rem'}}>
                    <button className="admin-toggle" onClick={()=>exportToCSV(displayedSubmissions)}><Download size={16}/> Excel / CSV</button>
                    <button className="primary-button" style={{width:'auto', padding:'0.5rem 1rem'}} onClick={()=>window.print()}><Printer size={16}/> Print PDF</button>
                  </div>
                </header>

                <div style={{display:'flex', gap:'2rem', flexWrap:'wrap'}}>
                  <div className="print:hidden" style={{flex:'1 1 200px'}}>
                    <h3>Months</h3>
                    <button onClick={()=>setSelectedFolder('All')} className="admin-toggle" style={{width:'100%', marginBottom:'0.5rem', background:selectedFolder==='All'?'#eff6ff':''}}>All Records</button>
                    {uniqueMonths.map(m=><button key={m} onClick={()=>setSelectedFolder(m)} className="admin-toggle" style={{width:'100%', marginBottom:'0.5rem', background:selectedFolder===m?'#eff6ff':''}}>{m}</button>)}
                    
                    <h3 style={{marginTop:'2rem'}}>Specific Days</h3>
                    {[...new Set(submissions.map(s => s.dateString))].map(d=><button key={d} onClick={()=>setSelectedFolder(d)} className="admin-toggle" style={{width:'100%', marginBottom:'0.5rem', background:selectedFolder===d?'#f8fafc':''}}>{d}</button>)}
                  </div>
                  
                  <div className="table-container" style={{flex:'3 1 600px', background:'white', borderRadius:'20px', border:'1px solid #e2e8f0', overflow:'hidden'}}>
                    <table style={{width:'100%', textAlign:'left', borderCollapse:'collapse'}}>
                      <thead style={{background:'#f8fafc'}}><tr><th style={{padding:'1rem'}}>Name</th><th style={{padding:'1rem'}}>Contact</th><th style={{padding:'1rem'}}>Role</th><th style={{padding:'1rem'}}>Time</th><th className="print:hidden"></th></tr></thead>
                      <tbody>
                        {displayedSubmissions.map(item=>(
                          <tr key={item.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                            <td style={{padding:'1rem', fontWeight:'bold'}}>{item.name}</td>
                            <td style={{padding:'1rem'}}>{item.email!=='N/A'&&<div>{item.email}</div>}{item.phone!=='N/A'&&<small style={{color:'#94a3b8'}}>{item.phone}</small>}</td>
                            <td style={{padding:'1rem'}}>{item.role} {item.role==='Agent'&&`(${item.repId})`}</td>
                            <td style={{padding:'1rem', fontSize:'0.8rem'}}>{item.dateString}<br/>{item.timeString}</td>
                            <td className="print:hidden" style={{padding:'1rem'}}><Trash2 size={16} color="#ef4444" onClick={()=>deleteItem('public/data/signins', item.id)} style={{cursor:'pointer'}}/></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {adminTab === 'LOGOS' && (
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:'1rem', padding:'2rem', background:'white', borderRadius:'20px'}}>
                {logoLibrary.map((url, i)=>(
                  <div key={i} onClick={()=>{updateBuilder({logo:url}); setAdminTab('BUILDER');}} style={{border:'1px solid #eee', borderRadius:'12px', padding:'1rem', cursor:'pointer', textAlign:'center', background:'#f8fafc'}}><img src={url} style={{maxHeight:'80px', maxWidth:'100%', objectFit:'contain'}} /></div>
                ))}
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