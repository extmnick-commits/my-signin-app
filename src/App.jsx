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
  signInAnonymously 
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
  Settings,
  ArrowRight,
  Database
} from 'lucide-react';

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
const appId = 'virtual-sign-sheet';

const App = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('SIGNIN'); 
  const [adminPassword, setAdminPassword] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [publicUrl, setPublicUrl] = useState(window.location.origin);
  const [showUrlSettings, setShowUrlSettings] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth initialization failed:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

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
      console.error("Error saving sign-in: ", err);
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
      `"${s.name}"`, `"${s.email}"`, `"${s.phone}"`, `"${s.dateString}"`, `"${s.timeString}"`
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
    <div className="min-h-screen bg-[#fcfdff] text-slate-900 font-sans selection:bg-indigo-100">
      {/* Dynamic Background Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.4]">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px]" />
      </div>

      <nav className="relative z-10 bg-white/70 backdrop-blur-md border-b border-slate-200/50 px-6 py-4 flex justify-between items-center sticky top-0 print:hidden">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
            <ClipboardCheck size={24} className="text-white" />
          </div>
          <span className="font-bold text-slate-800 text-xl tracking-tight">VirtualSign</span>
        </div>
        <div className="flex items-center gap-4">
          {view === 'SIGNIN' ? (
            <button 
              onClick={() => setView('ADMIN_LOGIN')} 
              className="group flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-all bg-slate-100/50 hover:bg-indigo-50 rounded-full"
            >
              <Lock size={16} className="group-hover:scale-110 transition-transform" /> 
              <span>Admin Access</span>
            </button>
          ) : (
            <button 
              onClick={() => setView('SIGNIN')} 
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-all bg-slate-100/50 hover:bg-indigo-50 rounded-full"
            >
              <ChevronLeft size={16} /> 
              <span>Back to Guest View</span>
            </button>
          )}
        </div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto p-6 md:p-10">
        
        {/* VIEW: SIGN IN FORM */}
        {view === 'SIGNIN' && (
          <div className="max-w-xl mx-auto mt-6">
            <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500" />
              
              <div className="p-8 md:p-12">
                <div className="text-center mb-10">
                  <div className="inline-block px-4 py-1.5 mb-4 text-[10px] font-bold tracking-[0.2em] text-indigo-600 uppercase bg-indigo-50 rounded-full">
                    Digital Check-In
                  </div>
                  <h1 className="text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">Welcome!</h1>
                  <p className="text-slate-500 text-lg">Please take a moment to sign in for today's session.</p>
                </div>

                {showSuccess ? (
                  <div className="text-center py-8 animate-in fade-in zoom-in duration-500">
                    <div className="relative inline-block mb-6">
                      <div className="absolute inset-0 bg-green-200 rounded-full blur-2xl opacity-40 animate-pulse" />
                      <div className="relative bg-green-500 text-white w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-100">
                        <CheckCircle2 size={48} />
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold mb-3 text-slate-800">Verified!</h2>
                    <p className="text-slate-500 mb-8 max-w-[280px] mx-auto text-lg leading-relaxed">Thank you for joining us. Your information has been securely saved.</p>
                    <button 
                      onClick={() => setShowSuccess(false)} 
                      className="px-8 py-3 rounded-2xl text-indigo-600 font-bold bg-indigo-50 hover:bg-indigo-100 transition-colors"
                    >
                      New Sign In
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Full Name</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                        <input 
                          required 
                          type="text" 
                          placeholder="Ex: Alexander Hamilton" 
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-[1.25rem] focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none text-slate-700 font-medium placeholder:text-slate-300" 
                          value={formData.name} 
                          onChange={(e) => setFormData({...formData, name: e.target.value})} 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Email Address</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                        <input 
                          required 
                          type="email" 
                          placeholder="name@company.com" 
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-[1.25rem] focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none text-slate-700 font-medium placeholder:text-slate-300" 
                          value={formData.email} 
                          onChange={(e) => setFormData({...formData, email: e.target.value})} 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Phone Number</label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                        <input 
                          required 
                          type="tel" 
                          placeholder="(555) 000-0000" 
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-[1.25rem] focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none text-slate-700 font-medium placeholder:text-slate-300" 
                          value={formData.phone} 
                          onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                        />
                      </div>
                    </div>

                    <button 
                      disabled={isSubmitting} 
                      type="submit" 
                      className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold py-5 rounded-[1.25rem] active:scale-[0.98] transition-all shadow-xl shadow-slate-200 hover:shadow-indigo-200 flex items-center justify-center gap-3 text-lg disabled:opacity-50"
                    >
                      {isSubmitting ? "Processing..." : "Secure Sign-In"}
                      <ArrowRight size={20} />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW: ADMIN LOGIN */}
        {view === 'ADMIN_LOGIN' && (
          <div className="max-w-md mx-auto mt-20">
            <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-10">
              <div className="bg-slate-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Lock size={32} className="text-slate-600" />
              </div>
              <h2 className="text-2xl font-black mb-2 text-center text-slate-800">Admin Authentication</h2>
              <p className="text-slate-500 text-center mb-8 text-sm px-4">Enter the administrative password to access the dashboard and participant data.</p>
              
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <input 
                  type="password" 
                  placeholder="Password" 
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-0 transition-all text-center font-bold tracking-widest text-lg" 
                  value={adminPassword} 
                  onChange={(e) => setAdminPassword(e.target.value)} 
                />
                <button 
                  type="submit" 
                  className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-lg"
                >
                  Confirm & Enter
                </button>
              </form>
              <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-center gap-2">
                <Database size={12} className="text-slate-300" />
                <span className="text-[10px] text-slate-300 uppercase tracking-tighter font-bold">Encrypted Database Tunnel</span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: ADMIN DASHBOARD */}
        {view === 'ADMIN_DASHBOARD' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 print:hidden">
              <div>
                <div className="flex items-center gap-2 mb-2">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Operational</span>
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Participant Roster</h1>
                <p className="text-slate-500 text-lg mt-1 font-medium">Real-time sync: <span className="text-indigo-600 font-bold">{submissions.length}</span> sign-ins found</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={exportToCSV} 
                  className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                >
                  <Download size={18} /> 
                  Export CSV
                </button>
                <button 
                  onClick={() => window.print()} 
                  className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  <Printer size={18} /> 
                  Print List
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* QR Sidebar Card */}
              <div className="lg:col-span-1 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50 flex flex-col items-center print:hidden self-start">
                <div className="w-full flex items-center justify-between mb-6">
                  <h3 className="font-black text-slate-800 flex items-center gap-2">
                    <QrCode size={20} className="text-indigo-600" /> 
                    Digital Key
                  </h3>
                  <button 
                    onClick={() => setShowUrlSettings(!showUrlSettings)} 
                    className={`p-2 rounded-lg transition-all ${showUrlSettings ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-indigo-600'}`}
                  >
                    <Settings size={20}/>
                  </button>
                </div>
                
                {showUrlSettings && (
                  <div className="w-full mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 animate-in slide-in-from-top-2 duration-300">
                    <label className="block mb-2 font-bold text-slate-500 text-[10px] uppercase tracking-widest">Deployment Origin</label>
                    <input 
                      type="text" 
                      value={publicUrl} 
                      onChange={(e) => setPublicUrl(e.target.value)}
                      className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white outline-none focus:border-indigo-500 text-xs font-mono"
                      placeholder="https://your-site.vercel.app"
                    />
                  </div>
                )}

                <div className="relative p-6 border-[12px] border-slate-50 rounded-[2.5rem] bg-white mb-6 group transition-all hover:border-indigo-50">
                  <img src={qrCodeUrl} alt="QR Code" className="w-full h-auto rounded-xl mix-blend-multiply" />
                </div>
                
                <p className="text-xs text-slate-400 leading-relaxed text-center px-2 mb-6">
                  Guests scan this unique identifier to be redirected to your secure sign-in interface.
                </p>

                <button 
                  onClick={() => {
                    const win = window.open("", "_blank");
                    win.document.write(`
                      <div style="text-align:center; padding: 100px 60px; font-family: -apple-system, system-ui, sans-serif; background: #fafafa; min-height: 100vh;">
                        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 60px; border-radius: 60px; box-shadow: 0 40px 100px rgba(0,0,0,0.05);">
                          <div style="background: #4f46e5; width: 60px; height: 60px; border-radius: 20px; margin: 0 auto 30px; display: flex; align-items: center; justify-content: center;">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="m9 14 2 2 4-4"></path></svg>
                          </div>
                          <h1 style="font-size: 3.5rem; margin-bottom: 0; font-weight: 900; letter-spacing: -0.05em; color: #0f172a;">Welcome!</h1>
                          <p style="font-size: 1.5rem; color: #64748b; margin-top: 15px; font-weight: 500;">Scan the code below to check in.</p>
                          <div style="margin: 50px auto; width: 400px; padding: 30px; border: 20px solid #f8fafc; border-radius: 60px;">
                            <img src="${qrCodeUrl}" style="width: 100%; height: auto;" />
                          </div>
                          <p style="color: #94a3b8; font-size: 0.9rem; font-weight: 600;">System: ${publicUrl}</p>
                        </div>
                      </div>
                    `);
                    win.print();
                  }} 
                  className="w-full py-4 bg-slate-50 text-indigo-600 font-black rounded-2xl hover:bg-indigo-50 transition-all border border-indigo-100/50"
                >
                  Download Sign Poster
                </button>
              </div>

              {/* Data Table Container */}
              <div className="lg:col-span-3 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-50">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Participant Details</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact Information</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Arrival Log</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {submissions.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="px-8 py-32 text-center">
                            <div className="flex flex-col items-center">
                              <div className="bg-slate-50 p-4 rounded-full mb-4">
                                <Database size={40} className="text-slate-200" />
                              </div>
                              <p className="text-slate-300 font-bold italic">Awaiting first participant sign-in...</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        submissions.map((item) => (
                          <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold group-hover:bg-white group-hover:text-indigo-600 transition-all">
                                  {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                                </div>
                                <span className="font-bold text-slate-800 text-lg tracking-tight">{item.name}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex flex-col">
                                <span className="text-slate-600 font-medium">{item.email}</span>
                                <span className="text-slate-400 text-xs font-bold mt-0.5 tracking-tight">{item.phone}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6 whitespace-nowrap">
                              <div className="flex flex-col items-end md:items-start">
                                <span className="px-2.5 py-1 bg-slate-100 rounded-md text-slate-500 font-mono text-[10px] font-bold group-hover:bg-white transition-colors">{item.dateString}</span>
                                <span className="text-indigo-500 text-xs font-black uppercase mt-1.5 tracking-tighter">{item.timeString}</span>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Global Aesthetics & Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          nav { position: static !important; background: white !important; border: none !important; }
          main { max-width: 100% !important; margin: 0 !important; padding: 20px !important; }
          .bg-white { box-shadow: none !important; border: none !important; }
          .rounded-[2.5rem], .rounded-[2rem] { border-radius: 0 !important; }
          table { width: 100% !important; border-collapse: collapse !important; margin-top: 30px !important; }
          th { background: #f8fafc !important; color: #64748b !important; padding: 12px 15px !important; text-align: left !important; border-bottom: 2px solid #e2e8f0 !important; }
          td { border-bottom: 1px solid #f1f5f9 !important; padding: 15px !important; }
          tr { page-break-inside: avoid !important; }
        }
        
        /* Smooth Fade In Transitions */
        .animate-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
};

export default App;