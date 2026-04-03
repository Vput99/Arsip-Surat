
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Send, Inbox, LayoutDashboard, Menu, X, School, Settings, ChevronRight, PenTool, Database, Activity, RefreshCw, CalendarCheck, Cloud, Server, HandCoins, ClipboardCheck } from 'lucide-react';
import { subscribeToConnectionStatus, forceCheckConnections } from '../services/storage';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [status, setStatus] = useState({ turso: false, firebase: false });
  const [isChecking, setIsChecking] = useState(false);
  
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = subscribeToConnectionStatus(setStatus);
    return () => unsubscribe();
  }, []);

  const handleRefreshConnection = async () => {
    setIsChecking(true);
    await forceCheckConnections();
    setTimeout(() => setIsChecking(false), 1000);
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/inbox', label: 'Arsip Masuk', icon: <Inbox size={20} /> },
    { path: '/outbox', label: 'Arsip Keluar', icon: <Send size={20} /> },
    { path: '/create', label: 'Input Naskah', icon: <PenTool size={20} /> },
    { path: '/attendance', label: 'Input Absensi', icon: <CalendarCheck size={20} /> },
    { path: '/monthly-report', label: 'Lapor Bulan', icon: <ClipboardCheck size={20} /> },
    { path: '/honor', label: 'Penerimaan Honor', icon: <HandCoins size={20} /> },
    { path: '/settings', label: 'Konfigurasi', icon: <Settings size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans text-slate-900 print:h-auto print:overflow-visible selection:bg-premium-100 selection:text-premium-900">
      {/* Animated Mesh Background Layers */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden print:hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-premium-400/20 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] rounded-full bg-indigo-400/20 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-[20%] right-[15%] w-[25%] h-[25%] rounded-full bg-emerald-300/10 blur-[80px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* Overlay Mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] lg:hidden" onClick={() => setIsSidebarOpen(false)}/>
      )}

      {/* Sidebar Navigasi - Pro Glassmorphism */}
      <aside className={`fixed inset-y-0 left-0 z-[70] w-72 lg:w-80 glass-dark text-white shadow-[20px_0_60px_-15px_rgba(0,0,0,0.3)] transform transition-all duration-700 ease-in-out rounded-r-[3rem] lg:rounded-none lg:translate-x-0 lg:static lg:inset-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col border-r border-white/5 print:hidden overflow-hidden`}>
        {/* Glow effect at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-premium-600/30 to-transparent pointer-events-none"></div>
        
        <div className="flex items-center h-32 px-10 shrink-0 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-premium-700/40 via-indigo-900/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-700"></div>
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-premium-500/20 blur-[40px] rounded-full group-hover:bg-premium-400/30 transition-all duration-700"></div>
          <div className="relative z-10 flex items-center">
            <div className="glass-panel p-3.5 rounded-[1.5rem] mr-5 shadow-[0_0_30px_rgba(148,64,255,0.4)] ring-1 ring-white/30 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-700">
              <School className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" size={28} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 uppercase leading-none drop-shadow-sm">Arsip Sekolah</h1>
              <p className="text-[10px] text-premium-300 font-bold uppercase tracking-[0.35em] mt-2 opacity-90 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-premium-400 animate-pulse-glow"></span> V2 Pro
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-5 py-6 space-y-2 overflow-y-auto custom-scrollbar relative z-10">
          <p className="px-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 mt-2 opacity-60">Menu Navigasi</p>
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                onClick={() => setIsSidebarOpen(false)} 
                className={`group flex items-center justify-between px-6 py-4.5 rounded-[1.5rem] transition-all duration-500 relative overflow-hidden ${active ? 'bg-white/15 text-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.2)] ring-1 ring-white/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-premium-400 rounded-r-full shadow-[0_0_20px_rgba(148,64,255,1)] animate-pulse"></div>}
                {active && <div className="absolute inset-0 bg-gradient-to-r from-premium-600/30 to-transparent pointer-events-none"></div>}
                
                <div className="flex items-center relative z-10">
                  <span className={`${active ? 'text-premium-300 scale-110 shadow-premium-400/50' : 'text-slate-500 group-hover:text-premium-200'} mr-5 transition-all duration-500 group-hover:animate-float`}>
                    {item.icon}
                  </span>
                  <span className={`font-bold text-[14px] tracking-wide ${active ? 'font-black drop-shadow-md' : 'group-hover:translate-x-1 transition-transform'}`}>{item.label}</span>
                </div>
                {active && <ChevronRight size={16} className="text-premium-300 animate-pulse relative z-10" />}
              </Link>
            );
          })}
        </nav>

        {/* Status Koneksi Glassy */}
        <div className="px-6 py-6 m-6 mt-0 space-y-3 glass-panel rounded-[2rem] border border-white/10 shrink-0 shadow-inner">
           <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em]">Cloud Connectivity</span>
              <button onClick={handleRefreshConnection} disabled={isChecking} className={`${isChecking ? 'animate-spin' : 'hover:rotate-180'} transition-all duration-700 text-slate-500 hover:text-premium-400`}>
                <RefreshCw size={12} />
              </button>
           </div>
           <div className="flex items-center justify-between bg-black/30 p-3 rounded-2xl border border-white/5 transition-colors hover:bg-black/40">
              <div className="flex items-center gap-3">
                 <div className={`p-2 rounded-xl ${status.turso ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                    <Server size={12} className={status.turso ? 'text-emerald-400' : 'text-rose-400'} />
                 </div>
                 <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Database Node</span>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${status.turso ? 'bg-emerald-400 animate-pulse-glow' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`}></div>
           </div>
           <div className="flex items-center justify-between bg-black/30 p-3 rounded-2xl border border-white/5 transition-colors hover:bg-black/40">
              <div className="flex items-center gap-3">
                 <div className={`p-2 rounded-xl ${status.firebase ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                    <Cloud size={12} className={status.firebase ? 'text-emerald-400' : 'text-rose-400'} />
                 </div>
                 <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Firebase Storage</span>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${status.firebase ? 'bg-emerald-400 animate-pulse-glow' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`}></div>
           </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header Mobile Glass */}
        <header className="flex items-center justify-between h-20 px-8 lg:hidden glass-panel border-b border-white/20 sticky top-0 z-[50] shrink-0 shadow-lg print:hidden">
          <div className="font-black text-slate-900 text-xl flex items-center tracking-tighter">
            <div className="bg-indigo-600 p-2 rounded-xl mr-3 shadow-lg shadow-indigo-200 ring-1 ring-white/20">
               <School className="text-white" size={20} />
            </div>
            ArsipSekolah
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-3.5 text-indigo-600 bg-white/50 backdrop-blur-md rounded-2xl hover:bg-indigo-50 transition-all active:scale-90 shadow-sm border border-indigo-100">
            <Menu size={24} />
          </button>
        </header>

        {/* Konten Utama */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent relative print:h-auto print:overflow-visible z-10">
          <div className="p-6 md:p-10 lg:p-14 max-w-[1600px] mx-auto min-h-full print:p-0 print:m-0 print:max-w-none">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
