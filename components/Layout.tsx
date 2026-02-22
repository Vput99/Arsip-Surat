
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
      <aside className={`fixed inset-y-0 left-0 z-[70] w-72 bg-[#0F172A] text-white shadow-2xl transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) lg:translate-x-0 lg:static lg:inset-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col border-r border-white/5 print:hidden`}>
        <div className="flex items-center h-24 px-8 shrink-0 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-600/10 to-transparent"></div>
          <div className="relative z-10 flex items-center">
            <div className="bg-indigo-600 p-2.5 rounded-2xl mr-4 shadow-xl shadow-indigo-500/20 ring-4 ring-indigo-500/10">
              <School className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white uppercase leading-none">Arsip Digital</h1>
              <p className="text-[9px] text-indigo-400 font-black uppercase tracking-[0.3em] mt-1.5 opacity-80">SD PINTAR V2</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto custom-scrollbar">
          <p className="px-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-4">Navigation</p>
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                onClick={() => setIsSidebarOpen(false)} 
                className={`group flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all duration-300 ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/30 ring-1 ring-white/10' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                <div className="flex items-center">
                  <span className={`${active ? 'text-white scale-110' : 'text-slate-500 group-hover:text-slate-300'} mr-4 transition-transform duration-300`}>{item.icon}</span>
                  <span className="font-bold text-[13px] tracking-wide">{item.label}</span>
                </div>
                {active && <ChevronRight size={14} className="text-indigo-200 animate-pulse" />}
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
