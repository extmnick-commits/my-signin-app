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
  Database,
  Users
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 antialiased">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-indigo-200/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-100/40 rounded-full blur-[100px]" />
      </div>

      <nav className="relative z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4 flex justify-between items-center sticky top-0 print:hidden">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-200 transition-transform hover:scale-105">
            <ClipboardCheck size={22} className="text-white" />
          </div>
          <span className="font-bold text-slate-900 text-xl tracking-tight">VirtualSign</span>
        </div>
        <div className="flex items-center gap-4">
          {view === 'SIGNIN' ? (
            <button 
              onClick={() => setView('ADMIN_LOGIN')} 
              className="group flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-all bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-full shadow-sm"
            >
              <Lock size={15} className="group-hover:rotate-12 transition-transform" /> 
              <span>Admin</span>
            </button>
          ) : (
            <button 
              onClick={() => setView('SIGNIN')} 
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-all bg-white hover:bg-indigo-50 border border-slate-200 rounded-full shadow-sm"
            >
              <ChevronLeft size={16} /> 
              <span>Guest Mode</span>
            </button>
          )}
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto p-6 md:p-12">
        
        {/* VIEW: SIGN IN FORM */}
        {view === 'SIGNIN' && (
          <div className="max-w-xl mx-auto mt-4">
            <div className="bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] border border-slate-200/50 overflow-hidden">
              <div className="h-2.5 bg-gradient-to-r from-indigo-600 via-violet-500 to-blue-500" />
              
              <div className="p-10 md:p-14">
                <div className="text-center mb-12">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 text-[11px] font-bold tracking-[0.2em] text-indigo-700 uppercase bg-indigo-50 rounded-full border border-indigo-100">
                    <CheckCircle2 size={12} /> Secure Portal
                  </div>
                  <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Welcome</h1>
                  <p className="text-slate-500 text-lg leading-relaxed">Please check in to get started with today's event.</p>
                </div>

                {showSuccess ? (
                  <div className="text-center py-10 animate-in fade-in zoom-in duration-500">
                    <div className="relative inline-block mb-8">
                      <div className="absolute inset-0 bg-emerald-200 rounded-full blur-3xl opacity-30 animate-pulse" />
                      <div className="relative bg-emerald-500 text-white w-28 h-28 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-100">
                        <CheckCircle2 size={56} strokeWidth={2.5} />
                      </div>
                    </div>
                    <h2 className="text-3xl font-black mb-4 text-slate-900">You're Checked In!</h2>
                    <p className="text-slate-500 mb-10 max-w-[300px] mx-auto text-lg">Your response has been successfully recorded in our secure system.</p>
                    <button 
                      onClick={() => setShowSuccess(false)} 
                      className="px-10 py-4 rounded-2xl text-indigo-700 font-bold bg-indigo-50 hover:bg-indigo-100 transition-all border border-indigo-200/50"
                    >
                      New Sign In
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-7">
                    <div className="space-y-3">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
                        <input 
                          required 
                          type="text" 
                          placeholder="John Doe" 
                          className="w-full pl-12 pr-6 py-4.5 bg-slate-50 border-2 border-transparent rounded-[1.25rem] focus:bg-white focus:border-indigo-500/20 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none text-slate-800 font-semibold placeholder:text-slate-300" 
                          value={formData.name} 
                          onChange={(e) => setFormData({...formData, name: e.target.value})} 
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
                        <input 
                          required 
                          type="email" 
                          placeholder="john@example.com" 
                          className="w-full pl-12 pr-6 py-4.5 bg-slate-50 border-2 border-transparent rounded-[1.25rem] focus:bg-white focus:border-indigo-500/20 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none text-slate-800 font-semibold placeholder:text-slate-300" 
                          value={formData.email} 
                          onChange={(e) => setFormData({...formData, email: e.target.value})} 
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
                        <input 
                          required 
                          type="tel" 
                          placeholder="(555) 000-0000" 
                          className="w-full pl-12 pr-6 py-4.5 bg-slate-50 border-2 border-transparent rounded-[1.25rem] focus:bg-white focus:border-indigo-500/20 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none text-slate-800 font-semibold placeholder:text-slate-300" 
                          value={formData.phone} 
                          onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                        />
                      </div>
                    </div>

                    <button 
                      disabled={isSubmitting} 
                      type="submit" 
                      className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold py-5 rounded-2xl active:scale-[0.98] transition-all shadow-xl shadow-slate-200 hover:shadow-indigo-200 flex items-center justify-center gap-3 text-lg disabled:opacity-50 mt-4"
                    >
                      {isSubmitting ? "Syncing..." : "Submit Sign-In"}
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
            <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200/50 p-12 text-center">
              <div className="bg-slate-100 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                <Lock size={36} className="text-slate-800" />
              </div>
              <h2 className="text-3xl font-black mb-3 text-slate-900 tracking-tight">Admin Access</h2>
              <p className="text-slate-500 mb-10 text-base">Authorized personnel only. Please enter the secure password.</p>
              
              <form onSubmit={handleAdminLogin} className="space-y-5">
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-0 transition-all text-center font-bold tracking-[0.3em] text-2xl placeholder:tracking-normal placeholder:text-slate-200" 
                  value={adminPassword} 
                  onChange={(e) => setAdminPassword(e.target.value)} 
                />
                <button 
                  type="submit" 
                  className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 text-lg"
                >
                  Enter Dashboard
                </button>
              </form>
              <div className="mt-10 pt-8 border-t border-slate-100 flex items-center justify-center gap-2.5">
                <Database size={14} className="text-indigo-400" />
                <span className="text-[10px] text-slate-400 uppercase tracking-[0.15em] font-bold">Encrypted Node Session</span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: ADMIN DASHBOARD */}
        {view === 'ADMIN_DASHBOARD' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 print:hidden">
              <div>
                <div className="flex items-center gap-3 mb-4">
                   <div className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live Syncing</span>
                   </div>
                </div>
                <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-2">Sign-In Roster</h1>
                <p className="text-slate-500 text-lg font-medium">Monitoring <span className="text-indigo-600 font-black">{submissions.length}</span> active registrations</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={exportToCSV} 
                  className="px-7 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold flex items-center gap-2.5 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                >
                  <Download size={18} /> 
                  Export CSV
                </button>
                <button 
                  onClick={() => window.print()} 
                  className="px-7 py-4 bg-slate-900 text-white rounded-2xl text-sm font-bold flex items-center gap-2.5 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                >
                  <Printer size={18} /> 
                  Print Roster
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-10">
              {/* Sidebar: QR Controller */}
              <div className="xl:col-span-1 space-y-6 print:hidden">
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/40 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between mb-8">
                    <h3 className="font-black text-slate-900 text-lg tracking-tight flex items-center gap-2.5">
                      <QrCode size={22} className="text-indigo-600" /> 
                      Portal Key
                    </h3>
                    <button 
                      onClick={() => setShowUrlSettings(!showUrlSettings)} 
                      className={`p-2.5 rounded-xl transition-all ${showUrlSettings ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-300 hover:text-indigo-600 bg-slate-50'}`}
                    >
                      <Settings size={20}/>
                    </button>
                  </div>
                  
                  {showUrlSettings && (
                    <div className="w-full mb-8 bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 animate-in slide-in-from-top-4 duration-500">
                      <label className="block mb-2 font-black text-indigo-900/40 text-[10px] uppercase tracking-widest">Base Deployment URL</label>
                      <input 
                        type="text" 
                        value={publicUrl} 
                        onChange={(e) => setPublicUrl(e.target.value)}
                        className="w-full p-3.5 border-2 border-indigo-100 rounded-xl bg-white outline-none focus:border-indigo-500 text-xs font-mono font-bold text-indigo-600"
                        placeholder="https://..."
                      />
                    </div>
                  )}

                  <div className="relative p-8 border-[16px] border-slate-50 rounded-[3rem] bg-white mb-8 group transition-all hover:border-indigo-50/50 shadow-inner">
                    <img src={qrCodeUrl} alt="QR Code" className="w-full h-auto rounded-2xl mix-blend-multiply" />
                  </div>
                  
                  <p className="text-xs text-slate-400 leading-relaxed text-center px-4 mb-8 font-medium">
                    Direct your participants to this digital sign-in page by presenting this unique QR code.
                  </p>

                  <button 
                    onClick={() => {
                      const win = window.open("", "_blank");
                      win.document.write(`
                        <div style="text-align:center; padding: 120px 60px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; min-height: 100vh;">
                          <div style="max-width: 650px; margin: 0 auto; background: white; padding: 80px; border-radius: 80px; box-shadow: 0 50px 100px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                            <div style="background: #4f46e5; width: 80px; height: 80px; border-radius: 28px; margin: 0 auto 40px; display: flex; align-items: center; justify-content: center;">
                              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="m9 14 2 2 4-4"></path></svg>
                            </div>
                            <h1 style="font-size: 4rem; margin-bottom: 0; font-weight: 900; letter-spacing: -0.05em; color: #0f172a;">Sign-In Here</h1>
                            <p style="font-size: 1.6rem; color: #64748b; margin-top: 20px; font-weight: 500;">Scan the code below to register.</p>
                            <div style="margin: 60px auto; width: 400px; padding: 40px; border: 24px solid #f1f5f9; border-radius: 80px; background: white;">
                              <img src="${qrCodeUrl}" style="width: 100%; height: auto;" />
                            </div>
                            <p style="color: #cbd5e1; font-size: 0.9rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;">Portal: VirtualSign System</p>
                          </div>
                        </div>
                      `);
                      win.print();
                    }} 
                    className="w-full py-5 bg-indigo-50 text-indigo-700 font-black rounded-2xl hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100 active:scale-95"
                  >
                    Generate Sign Poster
                  </button>
                </div>
              </div>

              {/* Data Table Container */}
              <div className="xl:col-span-3 bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/40 overflow-hidden self-start">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Participant Details</th>
                        <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact Node</th>
                        <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {submissions.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="px-10 py-40 text-center">
                            <div className="flex flex-col items-center">
                              <div className="bg-slate-50 p-6 rounded-[2rem] mb-6 shadow-inner">
                                <Users size={48} className="text-slate-200" />
                              </div>
                              <p className="text-slate-400 font-bold text-lg">Waiting for your first guest...</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        submissions.map((item) => (
                          <tr key={item.id} className="hover:bg-indigo-50/20 transition-colors group">
                            <td className="px-10 py-8">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-lg shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all group-hover:-rotate-3">
                                  {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                                </div>
                                <span className="font-bold text-slate-900 text-xl tracking-tight leading-none">{item.name}</span>
                              </div>
                            </td>
                            <td className="px-10 py-8">
                              <div className="flex flex-col gap-1">
                                <span className="text-slate-600 font-bold text-sm tracking-tight">{item.email}</span>
                                <span className="text-indigo-400 text-xs font-black tracking-widest uppercase">{item.phone}</span>
                              </div>
                            </td>
                            <td className="px-10 py-8 whitespace-nowrap">
                              <div className="flex flex-col items-start gap-1.5">
                                <span className="px-3 py-1 bg-slate-100 rounded-lg text-slate-500 font-mono text-[11px] font-black tracking-tight">{item.dateString}</span>
                                <span className="text-slate-900 text-[10px] font-black uppercase tracking-widest pl-1">{item.timeString}</span>
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

      {/* Global CSS for Animations and Print */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        
        body { font-family: 'Plus Jakarta Sans', sans-serif; }

        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          nav { position: static !important; background: white !important; border: none !important; }
          main { max-width: 100% !important; margin: 0 !important; padding: 20px !important; }
          .bg-white { box-shadow: none !important; border: none !important; }
          .rounded-[2.5rem], .rounded-[2rem] { border-radius: 12px !important; }
          table { width: 100% !important; border-collapse: collapse !important; border: 1px solid #e2e8f0 !important; }
          th { background: #f8fafc !important; color: #000 !important; padding: 15px !important; border: 1px solid #e2e8f0 !important; text-transform: uppercase; font-size: 10px; }
          td { border: 1px solid #e2e8f0 !important; padding: 15px !important; color: #000 !important; }
          tr { page-break-inside: avoid !important; }
        }
        
        .animate-in {
          animation: fadeInSlide 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeInSlide {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        input::placeholder { font-weight: 500; color: #cbd5e1; }
      `}} />
    </div>
  );
};

export default App;