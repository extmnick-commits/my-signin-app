import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { User, Mail, Phone, ClipboardCheck, Printer, ChevronLeft, Lock, CheckCircle2, ArrowRight, RefreshCw, Folder, Briefcase } from 'lucide-react';

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

const App = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('SIGNIN');
  const [adminPin, setAdminPin] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // New Features State
  const [isAgent, setIsAgent] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', repId: '' });
  const [selectedFolder, setSelectedFolder] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize Anonymous Auth
  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("Auth failed:", err));
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // REAL-TIME SYNC: Fetching Data for Admin Panel
  useEffect(() => {
    if (!user || view !== 'ADMIN_DASHBOARD') return;
    
    const q = query(
      collection(db, 'artifacts', 'virtual-sign-sheet', 'public', 'data', 'signins'), 
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Snapshot error:", error));

    return () => unsubscribe();
  }, [user, view]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', 'virtual-sign-sheet', 'public', 'data', 'signins'), {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
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
    } catch (err) { 
      console.error("Submission error:", err);
      alert("Error saving sign-in. Please check your internet.");
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPin === '2501') {
      setView('ADMIN_DASHBOARD');
      setAdminPin('');
    } else {
      alert("Incorrect PIN");
      setAdminPin('');
    }
  };

  // Admin Features Logic
  const handleRefresh = () => {
    setIsRefreshing(true);
    // Fake delay for UI feedback since onSnapshot is already instant
    setTimeout(() => setIsRefreshing(false), 800); 
  };

  const uniqueDates = [...new Set(submissions.map(s => s.dateString))];
  const displayedSubmissions = selectedFolder === 'All' 
    ? submissions 
    : submissions.filter(s => s.dateString === selectedFolder);

  return (
    <div className="app-shell">
      <nav className="navbar print:hidden">
        <div className="logo-section" onClick={() => setView('SIGNIN')} style={{cursor: 'pointer'}}>
          <div style={{background: '#4f46e5', padding: '8px', borderRadius: '12px'}}>
            <ClipboardCheck size={20} color="white" />
          </div>
          <span className="logo-text">VirtualSign</span>
        </div>
        {view === 'SIGNIN' ? (
          <button onClick={() => setView('ADMIN_LOGIN')} className="admin-toggle">
            <Lock size={14} /> Admin
          </button>
        ) : (
          <button onClick={() => setView('SIGNIN')} className="admin-toggle">
            <ChevronLeft size={14} /> Back
          </button>
        )}
      </nav>

      <main className="main-container">
        {/* VIEW: GUEST SIGN IN */}
        {view === 'SIGNIN' && (
          <div className="modern-card">
            <header className="card-header">
              <h1>Welcome!</h1>
              <p>Please sign in for today's session.</p>
            </header>

            {showSuccess ? (
              <div className="success-state">
                <CheckCircle2 size={64} color="#22c55e" />
                <h2>Verified</h2>
                <button onClick={() => setShowSuccess(false)} className="primary-button">New Entry</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="signin-form">
                
                {/* Guest / Agent Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <input 
                    type="checkbox" 
                    id="agent-check" 
                    checked={isAgent} 
                    onChange={(e) => setIsAgent(e.target.checked)} 
                    style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }} 
                  />
                  <label htmlFor="agent-check" style={{ fontWeight: 'bold', color: '#0f172a', cursor: 'pointer' }}>
                    I am an Agent
                  </label>
                </div>

                <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <div className="input-wrapper">
                    <User size={18} className="input-icon" />
                    <input className="modern-input" required placeholder="Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Email Address</label>
                  <div className="input-wrapper">
                    <Mail size={18} className="input-icon" />
                    <input className="modern-input" type="email" required placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Phone Number</label>
                  <div className="input-wrapper">
                    <Phone size={18} className="input-icon" />
                    <input className="modern-input" type="tel" required placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                  </div>
                </div>

                {/* Conditional REP ID Input */}
                {isAgent && (
                  <div className="input-group" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                    <label className="input-label">REP ID</label>
                    <div className="input-wrapper">
                      <Briefcase size={18} className="input-icon" />
                      <input className="modern-input" required placeholder="Ex: ABC12" value={formData.repId} onChange={(e) => setFormData({...formData, repId: e.target.value})} />
                    </div>
                  </div>
                )}

                <button disabled={isSubmitting} type="submit" className="primary-button" style={{marginTop: '1rem'}}>
                  {isSubmitting ? "Processing..." : "Sign"} <ArrowRight size={20} />
                </button>
              </form>
            )}
          </div>
        )}

        {/* VIEW: ADMIN LOGIN */}
        {view === 'ADMIN_LOGIN' && (
          <div className="modern-card login-card">
             <Lock size={48} color="#4f46e5" className="lock-icon" style={{margin: '0 auto 1rem'}} />
             <h2>Admin PIN</h2>
             <form onSubmit={handleAdminLogin}>
                <input 
                  type="password" 
                  className="modern-input pin-input" 
                  placeholder="0000"
                  maxLength={4}
                  autoFocus
                  style={{textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em', marginBottom: '1.5rem'}}
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                />
                <button type="submit" className="primary-button">Unlock</button>
             </form>
          </div>
        )}

        {/* VIEW: ADMIN DASHBOARD */}
        {view === 'ADMIN_DASHBOARD' && (
          <div className="admin-dashboard">
            <header className="dashboard-header print:hidden" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
              <div>
                <h1 style={{margin: 0}}>Roster ({displayedSubmissions.length})</h1>
                <p style={{color: '#64748b', margin: '0.25rem 0 0'}}>Real-time sync active</p>
              </div>
              <div style={{display: 'flex', gap: '1rem'}}>
                <button onClick={handleRefresh} className="admin-toggle" style={{ border: '1px solid #e2e8f0', background: 'white' }}>
                  <RefreshCw size={18} className={isRefreshing ? "spin-animation" : ""} color="#4f46e5" /> 
                  {isRefreshing ? "Syncing..." : "Refresh"}
                </button>
                <button onClick={() => window.print()} className="primary-button print-btn" style={{width: 'auto', padding: '0.6rem 1.2rem', borderRadius: '20px', fontSize: '1rem'}}>
                  <Printer size={18} /> Print to PDF
                </button>
              </div>
            </header>

            {/* Folder & Table Layout */}
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              
              {/* Folders Sidebar */}
              <div className="print:hidden" style={{ flex: '1 1 200px', background: 'white', borderRadius: '1.5rem', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0, color: '#0f172a' }}>
                  <Folder size={18} color="#4f46e5" /> Sheets
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button 
                    onClick={() => setSelectedFolder('All')} 
                    style={{ textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: 'none', background: selectedFolder === 'All' ? '#eff6ff' : 'transparent', color: selectedFolder === 'All' ? '#4f46e5' : '#64748b', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
                  >
                    All Records
                  </button>
                  {uniqueDates.map(date => (
                    <button 
                      key={date}
                      onClick={() => setSelectedFolder(date)} 
                      style={{ textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: 'none', background: selectedFolder === date ? '#eff6ff' : 'transparent', color: selectedFolder === date ? '#4f46e5' : '#64748b', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
                    >
                      {date}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Table */}
              <div className="table-container" style={{ flex: '3 1 600px', background: 'white', borderRadius: '1.5rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                <table className="roster-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '1rem', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase' }}>Name</th>
                      <th style={{ padding: '1rem', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase' }}>Contact</th>
                      <th style={{ padding: '1rem', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase' }}>Role / ID</th>
                      <th style={{ padding: '1rem', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase' }}>Date/Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedSubmissions.length === 0 ? (
                      <tr><td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No sign-ins found for this selection.</td></tr>
                    ) : (
                      displayedSubmissions.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '1rem', fontWeight: 'bold', color: '#0f172a' }}>{item.name}</td>
                          <td style={{ padding: '1rem', color: '#475569' }}>
                            <div>{item.email}</div>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>{item.phone}</div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ fontWeight: 'bold', color: item.role === 'Agent' ? '#4f46e5' : '#64748b' }}>{item.role || 'Guest'}</span>
                            {item.role === 'Agent' && <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>ID: {item.repId}</div>}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#64748b' }}>{item.dateString} <br/> <span style={{color: '#94a3b8'}}>{item.timeString}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
            </div>
          </div>
        )}
      </main>

      {/* Tiny bit of inline CSS to handle the refresh spinning icon */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin-animation { animation: spin 0.8s linear infinite; }
      `}} />
    </div>
  );
};

export default App;