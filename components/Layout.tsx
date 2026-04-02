
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
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans text-slate-900 print:h-auto print:overflow-visible">
      {/* Overlay Mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] lg:hidden" onClick={() => setIsSidebarOpen(false)}/>
      )}

      {/* Sidebar Navigasi */}
      <aside className={`fixed inset-y-0 left-0 z-[70] w-72 lg:w-80 bg-[#09090b]/90 backdrop-blur-2xl text-white shadow-[10px_0_40px_-15px_rgba(0,0,0,0.5)] transform transition-transform duration-500 rounded-r-[2.5rem] lg:rounded-none lg:translate-x-0 lg:static lg:inset-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col border-r border-white/10 print:hidden overflow-hidden`}>
        {/* Glow effect at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-premium-600/20 to-transparent pointer-events-none"></div>
        
        <div className="flex items-center h-32 px-10 shrink-0 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-premium-700/30 via-indigo-900/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-700"></div>
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-premium-500/20 blur-[40px] rounded-full group-hover:bg-premium-400/30 transition-all duration-700"></div>
          <div className="relative z-10 flex items-center">
            <div className="bg-gradient-to-br from-premium-500 to-indigo-600 p-3 rounded-[1.25rem] mr-5 shadow-[0_0_20px_rgba(148,64,255,0.4)] ring-1 ring-white/20 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
              <School className="text-white drop-shadow-md" size={26} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 uppercase leading-none drop-shadow-sm">Arsip Sekolah</h1>
              <p className="text-[10px] text-premium-300 font-bold uppercase tracking-[0.35em] mt-2 opacity-90 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-premium-400 animate-pulse-glow"></span> V2 Pro
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-5 py-6 space-y-2 overflow-y-auto custom-scrollbar relative z-10">
          <p className="px-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-6 mt-2">Menu Utama</p>
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                onClick={() => setIsSidebarOpen(false)} 
                className={`group flex items-center justify-between px-5 py-4 rounded-[1.25rem] transition-all duration-300 relative overflow-hidden ${active ? 'bg-white/10 text-white shadow-lg shadow-black/20 ring-1 ring-white/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-premium-400 rounded-r-md shadow-[0_0_10px_rgba(148,64,255,0.8)]"></div>}
                {active && <div className="absolute inset-0 bg-gradient-to-r from-premium-600/20 to-transparent pointer-events-none"></div>}
                
                <div className="flex items-center relative z-10">
                  <span className={`${active ? 'text-premium-300 scale-110' : 'text-slate-500 group-hover:text-premium-200'} mr-4 transition-all duration-300 group-hover:animate-float`}>
                    {item.icon}
                  </span>
                  <span className={`font-bold text-[14px] tracking-wide ${active ? 'font-black drop-shadow-md' : ''}`}>{item.label}</span>
                </div>
                {active && <ChevronRight size={16} className="text-premium-300 animate-pulse relative z-10" />}
              </Link>
            );
          })}
        </nav>

        {/* Status Koneksi */}
        <div className="px-6 py-6 m-4 mt-0 space-y-3 bg-white/5 rounded-3xl border border-white/5 shrink-0 backdrop-blur-sm">
           <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Service Sync</span>
              <button onClick={handleRefreshConnection} disabled={isChecking} className={`${isChecking ? 'animate-spin' : 'hover:rotate-180'} transition-all duration-500 text-slate-500 hover:text-white`}>
                <RefreshCw size={12} />
              </button>
           </div>
           <div className="flex items-center justify-between bg-black/20 p-2.5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                 <div className={`p-1.5 rounded-lg ${status.turso ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                    <Server size={12} className={status.turso ? 'text-emerald-400' : 'text-rose-400'} />
                 </div>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SQL Node</span>
              </div>
              <div className={`w-2 h-2 rounded-full ${status.turso ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)]' : 'bg-rose-400'}`}></div>
           </div>
           <div className="flex items-center justify-between bg-black/20 p-2.5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                 <div className={`p-1.5 rounded-lg ${status.firebase ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                    <Cloud size={12} className={status.firebase ? 'text-emerald-400' : 'text-rose-400'} />
                 </div>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Firebase</span>
              </div>
              <div className={`w-2 h-2 rounded-full ${status.firebase ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)]' : 'bg-rose-400'}`}></div>
           </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header Mobile */}
        <header className="flex items-center justify-between h-20 px-6 lg:hidden bg-white border-b border-slate-200 sticky top-0 z-[50] shrink-0 shadow-sm print:hidden">
          <div className="font-black text-slate-900 text-lg flex items-center">
            <div className="bg-indigo-600 p-1.5 rounded-lg mr-2.5 shadow-lg shadow-indigo-200">
               <School className="text-white" size={18} />
            </div>
            ArsipSekolah
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-3 text-indigo-600 bg-indigo-50 rounded-2xl hover:bg-indigo-100 transition-all active:scale-95 shadow-sm border border-indigo-100">
            <Menu size={22} />
          </button>
        </header>

        {/* Konten Utama */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#F8FAFC] relative print:h-auto print:overflow-visible">
          <div className="p-4 md:p-8 lg:p-10 max-w-[1600px] mx-auto min-h-full print:p-0 print:m-0 print:max-w-none">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
