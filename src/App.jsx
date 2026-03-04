import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { User, Mail, Phone, ClipboardCheck, Printer, ChevronLeft, Lock, CheckCircle2, ArrowRight, Database } from 'lucide-react';

// Firebase Config
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
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    signInAnonymously(auth);
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Fetching Data for Admin Panel
  useEffect(() => {
    if (!user || view !== 'ADMIN_DASHBOARD') return;
    const q = query(collection(db, 'artifacts', 'virtual-sign-sheet', 'public', 'data', 'signins'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user, view]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', 'virtual-sign-sheet', 'public', 'data', 'signins'), {
        ...formData,
        timestamp: serverTimestamp(),
        dateString: new Date().toLocaleDateString(),
        timeString: new Date().toLocaleTimeString()
      });
      setFormData({ name: '', email: '', phone: '' });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err) { console.error(err); } 
    finally { setIsSubmitting(false); }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPin === '2501') {
      setView('ADMIN_DASHBOARD');
      setAdminPin('');
    } else {
      alert("Incorrect PIN");
    }
  };

  return (
    <div className="app-shell">
      <nav className="navbar print:hidden">
        <div className="logo-section" onClick={() => setView('SIGNIN')} style={{cursor: 'pointer'}}>
          <div style={{background: '#4f46e5', padding: '8px', borderRadius: '12px'}}>
            <ClipboardCheck size={20} color="white" />
          </div>
          <span>VirtualSign</span>
        </div>
        {view === 'SIGNIN' ? (
          <button onClick={() => setView('ADMIN_LOGIN')} className="admin-toggle">
            <Lock size={14} /> Admin Access
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
            <div style={{textAlign: 'center', marginBottom: '2.5rem'}}>
              <h1 style={{fontSize: '2.5rem', margin: '0 0 0.5rem 0', letterSpacing: '-0.04em'}}>Welcome!</h1>
              <p style={{color: '#64748b', fontSize: '1.1rem'}}>Please sign in for today's session.</p>
            </div>

            {showSuccess ? (
              <div style={{textAlign: 'center', padding: '2rem 0'}}>
                <CheckCircle2 size={64} color="#22c55e" style={{marginBottom: '1rem'}} />
                <h2 style={{fontSize: '1.5rem'}}>Sign-In Verified</h2>
                <button onClick={() => setShowSuccess(false)} className="primary-button" style={{marginTop: '2rem'}}>New Entry</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <div style={{position: 'relative'}}>
                    <User size={18} style={{position: 'absolute', left: '1rem', top: '1.1rem', color: '#94a3b8'}} />
                    <input className="modern-input" required placeholder="Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Email Address</label>
                  <div style={{position: 'relative'}}>
                    <Mail size={18} style={{position: 'absolute', left: '1rem', top: '1.1rem', color: '#94a3b8'}} />
                    <input className="modern-input" type="email" required placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Phone Number</label>
                  <div style={{position: 'relative'}}>
                    <Phone size={18} style={{position: 'absolute', left: '1rem', top: '1.1rem', color: '#94a3b8'}} />
                    <input className="modern-input" type="tel" required placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                  </div>
                </div>
                <button disabled={isSubmitting} type="submit" className="primary-button">
                  {isSubmitting ? "Processing..." : "Sign"} <ArrowRight size={20} />
                </button>
              </form>
            )}
          </div>
        )}

        {/* VIEW: ADMIN LOGIN */}
        {view === 'ADMIN_LOGIN' && (
          <div className="modern-card" style={{maxWidth: '400px'}}>
             <div style={{textAlign: 'center', marginBottom: '2rem'}}>
                <Lock size={48} color="#4f46e5" style={{marginBottom: '1rem'}} />
                <h2>Admin PIN</h2>
             </div>
             <form onSubmit={handleAdminLogin}>
                <input 
                  type="password" 
                  className="modern-input" 
                  style={{textAlign: 'center', paddingLeft: '1rem', fontSize: '1.5rem', letterSpacing: '0.5em'}}
                  placeholder="0000"
                  maxLength={4}
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                />
                <button type="submit" className="primary-button" style={{marginTop: '1.5rem'}}>Unlock Dashboard</button>
             </form>
          </div>
        )}

        {/* VIEW: ADMIN DASHBOARD */}
        {view === 'ADMIN_DASHBOARD' && (
          <div className="admin-dashboard">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}} className="print:hidden">
              <h1>Sign-In Roster ({submissions.length})</h1>
              <button onClick={() => window.print()} className="primary-button" style={{width: 'auto', padding: '0.75rem 1.5rem'}}>
                <Printer size={18} /> Print to PDF
              </button>
            </div>

            <div className="table-container">
              <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{background: '#f8fafc', textAlign: 'left'}}>
                    <th style={{padding: '1rem'}}>Name</th>
                    <th style={{padding: '1rem'}}>Email</th>
                    <th style={{padding: '1rem'}}>Phone</th>
                    <th style={{padding: '1rem'}}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((item) => (
                    <tr key={item.id} style={{borderBottom: '1px solid #f1f5f9'}}>
                      <td style={{padding: '1rem', fontWeight: 'bold'}}>{item.name}</td>
                      <td style={{padding: '1rem'}}>{item.email}</td>
                      <td style={{padding: '1rem'}}>{item.phone}</td>
                      <td style={{padding: '1rem', color: '#64748b'}}>{item.timeString}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;