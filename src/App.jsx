import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { User, Mail, Phone, ClipboardCheck, Printer, ChevronLeft, Lock, CheckCircle2, ArrowRight } from 'lucide-react';

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
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Initialize Anonymous Auth
  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("Auth failed:", err));
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // REAL-TIME SYNC: Fetching Data for Admin Panel
  useEffect(() => {
    if (!user || view !== 'ADMIN_DASHBOARD') return;
    
    // Path matches your Firebase Firestore structure
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
        ...formData,
        timestamp: serverTimestamp(),
        dateString: new Date().toLocaleDateString(),
        timeString: new Date().toLocaleTimeString()
      });
      setFormData({ name: '', email: '', phone: '' });
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
                <button disabled={isSubmitting} type="submit" className="primary-button">
                  {isSubmitting ? "Processing..." : "Sign"} <ArrowRight size={20} />
                </button>
              </form>
            )}
          </div>
        )}

        {/* VIEW: ADMIN LOGIN */}
        {view === 'ADMIN_LOGIN' && (
          <div className="modern-card login-card">
             <Lock size={48} color="#4f46e5" className="lock-icon" />
             <h2>Admin PIN</h2>
             <form onSubmit={handleAdminLogin}>
                <input 
                  type="password" 
                  className="modern-input pin-input" 
                  placeholder="0000"
                  maxLength={4}
                  autoFocus
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
            <header className="dashboard-header print:hidden">
              <h1>Roster ({submissions.length})</h1>
              <button onClick={() => window.print()} className="primary-button print-btn">
                <Printer size={18} /> Print to PDF
              </button>
            </header>

            <div className="table-container">
              <table className="roster-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Date/Time</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.length === 0 ? (
                    <tr><td colSpan="4" className="empty-msg">No sign-ins yet...</td></tr>
                  ) : (
                    submissions.map((item) => (
                      <tr key={item.id}>
                        <td className="name-cell">{item.name}</td>
                        <td>{item.email}</td>
                        <td>{item.phone}</td>
                        <td className="time-cell">{item.dateString} {item.timeString}</td>
                      </tr>
                    ))
                  )}
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