import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  serverTimestamp
} from 'firebase/firestore';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously, 
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  User, 
  Mail, 
  Phone, 
  ClipboardCheck, 
  QrCode, 
  Printer, 
  ChevronLeft, 
  Download,
  Lock,
  CheckCircle2,
  ExternalLink,
  Settings
} from 'lucide-react';

// --- Firebase Configuration ---
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCkCWbqf6M2OLQxpGJkLkf92k-eW8pIPnM",
  authDomain: "virtual-sign-21884.firebaseapp.com",
  projectId: "virtual-sign-21884",
  storageBucket: "virtual-sign-21884.firebasestorage.app",
  messagingSenderId: "1025000851049",
  appId: "1:1025000851049:web:99c907c759ec784837c4f8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const App = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('SIGNIN'); // SIGNIN, ADMIN_LOGIN, ADMIN_DASHBOARD
  const [adminPassword, setAdminPassword] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // NEW: Deployment URL state for QR Code
  // Set this to your public URL (e.g., https://my-event.vercel.app)
  const [publicUrl, setPublicUrl] = useState(window.location.href);
  const [showUrlSettings, setShowUrlSettings] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // --- Auth Logic (Rule 3) ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        // Silent fail
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- Firestore Data Fetching ---
  useEffect(() => {
    if (!user || view !== 'ADMIN_DASHBOARD') return;

    const q = collection(db, 'artifacts', appId, 'public', 'data', 'signins');
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const sorted = docs.sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      });
      setSubmissions(sorted);
    }, (error) => {
      console.error("Firestore error:", error);
    });

    return () => unsubscribe();
  }, [user, view]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'signins'), {
        ...formData,
        timestamp: serverTimestamp(),
        dateString: new Date().toLocaleDateString(),
        timeString: new Date().toLocaleTimeString()
      });
      
      setFormData({ name: '', email: '', phone: '' });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err) {
      console.error("Error saving document: ", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPassword === 'admin123') {
      setView('ADMIN_DASHBOARD');
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Date', 'Time'];
    const rows = submissions.map(s => [
      `"${s.name}"`, 
      `"${s.email}"`, 
      `"${s.phone}"`, 
      `"${s.dateString}"`, 
      `"${s.timeString}"`
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `signin_sheet_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(publicUrl)}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10 print:hidden">
        <div className="flex items-center gap-2 font-bold text-indigo-600 text-xl">
          <ClipboardCheck size={28} />
          <span>VirtualSign</span>
        </div>
        <div className="flex gap-4">
          {view === 'SIGNIN' ? (
            <button onClick={() => setView('ADMIN_LOGIN')} className="text-sm font-medium text-slate-600 hover:text-indigo-600 flex items-center gap-1"><Lock size={16} /> Admin</button>
          ) : (
            <button onClick={() => setView('SIGNIN')} className="text-sm font-medium text-slate-600 hover:text-indigo-600 flex items-center gap-1"><ChevronLeft size={16} /> Back to Sign-In</button>
          )}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6">
        {view === 'SIGNIN' && (
          <div className="max-w-md mx-auto mt-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">Welcome!</h1>
                <p className="text-slate-500">Please sign in to join us today.</p>
              </div>

              {showSuccess ? (
                <div className="text-center py-12 animate-in fade-in zoom-in duration-300">
                  <div className="bg-green-100 text-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={32} /></div>
                  <h2 className="text-xl font-semibold mb-2">All Set!</h2>
                  <p className="text-slate-500 mb-6">Thank you for signing in.</p>
                  <button onClick={() => setShowSuccess(false)} className="text-indigo-600 font-medium">Sign in another person</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-slate-700">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input required type="text" placeholder="John Doe" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-slate-700">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input required type="email" placeholder="john@example.com" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-slate-700">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input required type="tel" placeholder="(555) 000-0000" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                    </div>
                  </div>
                  <button disabled={isSubmitting} type="submit" className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex items-center justify-center">
                    {isSubmitting ? "Signing in..." : "Sign In"}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {view === 'ADMIN_LOGIN' && (
          <div className="max-w-md mx-auto mt-20">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <h2 className="text-xl font-bold mb-6 text-center">Admin Access</h2>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <input type="password" placeholder="Password" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
                <button type="submit" className="w-full bg-slate-900 text-white font-semibold py-3 rounded-xl">Access Dashboard</button>
              </form>
              <p className="text-[10px] text-slate-400 mt-4 text-center">Password: admin123</p>
            </div>
          </div>
        )}

        {view === 'ADMIN_DASHBOARD' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
              <div>
                <h1 className="text-2xl font-bold">Sign-In History</h1>
                <p className="text-slate-500">{submissions.length} participants</p>
              </div>
              <div className="flex gap-2">
                <button onClick={exportToCSV} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-50"><Download size={16} /> Export</button>
                <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700"><Printer size={16} /> Print</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center print:hidden">
                <h3 className="font-bold mb-4 flex items-center gap-2 w-full justify-between">
                  <span className="flex items-center gap-2"><QrCode size={18} className="text-indigo-600" /> QR Poster</span>
                  <button onClick={() => setShowUrlSettings(!showUrlSettings)} className="text-slate-400 hover:text-indigo-600"><Settings size={16}/></button>
                </h3>
                
                {showUrlSettings && (
                  <div className="w-full mb-4 bg-slate-50 p-3 rounded-lg border text-xs">
                    <label className="block mb-1 font-bold text-slate-600 uppercase tracking-tight">Public App URL</label>
                    <input 
                      type="text" 
                      value={publicUrl} 
                      onChange={(e) => setPublicUrl(e.target.value)}
                      className="w-full p-2 border rounded bg-white"
                      placeholder="https://your-site.vercel.app"
                    />
                    <p className="mt-2 text-slate-400 italic">Enter your final website URL here to update the QR code below.</p>
                  </div>
                )}

                <div className="p-3 border-4 border-indigo-50 rounded-2xl bg-white mb-4">
                  <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40" />
                </div>
                <button onClick={() => {
                  const win = window.open("", "_blank");
                  win.document.write(`
                    <div style="text-align:center; padding: 60px; font-family: sans-serif;">
                      <h1 style="font-size: 3rem; margin-bottom: 0;">Welcome!</h1>
                      <p style="font-size: 1.5rem; color: #666; margin-top: 10px;">Scan to Sign In</p>
                      <img src="${qrCodeUrl}" style="width: 400px; height: 400px; margin: 40px 0;" />
                      <p style="color: #999;">Visit: ${publicUrl}</p>
                    </div>
                  `);
                  win.print();
                }} className="text-sm text-indigo-600 font-bold hover:underline">Print Entrance Sign</button>
              </div>

              <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[10px] tracking-widest font-bold">
                    <tr><th className="px-6 py-4">Participant</th><th className="px-6 py-4">Contact</th><th className="px-6 py-4">Time</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submissions.length === 0 ? (
                      <tr><td colSpan="3" className="px-6 py-16 text-center text-slate-400">No entries yet.</td></tr>
                    ) : (
                      submissions.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 font-semibold">{item.name}</td>
                          <td className="px-6 py-4 text-slate-600">{item.email}<br/><span className="text-slate-400 text-xs">{item.phone}</span></td>
                          <td className="px-6 py-4 whitespace-nowrap"><span className="text-slate-700 font-mono text-xs">{item.dateString}</span><br/><span className="text-indigo-400 text-[10px] font-bold uppercase">{item.timeString}</span></td>
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
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .print\\:hidden { display: none !important; }
          main { max-width: 100% !important; margin: 0 !important; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border-bottom: 1px solid #eee; padding: 10px; }
        }
      `}} />
    </div>
  );
};

export default App;