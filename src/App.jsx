import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { User, Mail, Phone, ClipboardCheck, QrCode, Printer, ChevronLeft, Download, Lock, CheckCircle2, ArrowRight } from 'lucide-react';

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
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    signInAnonymously(auth);
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

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

  return (
    <div className="app-shell">
      <nav className="navbar">
        <div className="logo-section">
          <div style={{background: '#4f46e5', padding: '8px', borderRadius: '12px'}}>
            <ClipboardCheck size={20} color="white" />
          </div>
          <span>VirtualSign</span>
        </div>
        <button onClick={() => setView('ADMIN_LOGIN')} className="admin-toggle">
          <Lock size={14} /> Admin Access
        </button>
      </nav>

      <main className="main-container">
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
                    <input className="modern-input" required placeholder="Ex: Alexander Hamilton" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Email Address</label>
                  <div style={{position: 'relative'}}>
                    <Mail size={18} style={{position: 'absolute', left: '1rem', top: '1.1rem', color: '#94a3b8'}} />
                    <input className="modern-input" type="email" required placeholder="name@company.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Phone Number</label>
                  <div style={{position: 'relative'}}>
                    <Phone size={18} style={{position: 'absolute', left: '1rem', top: '1.1rem', color: '#94a3b8'}} />
                    <input className="modern-input" type="tel" required placeholder="(555) 000-0000" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                  </div>
                </div>

                <button disabled={isSubmitting} type="submit" className="primary-button">
                  {isSubmitting ? "Processing..." : "Secure Sign-In"} <ArrowRight size={20} />
                </button>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;