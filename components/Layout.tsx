
import React, { useRef, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, Send, Inbox, LayoutDashboard, Menu, X, School, Settings, ChevronRight, PenTool, Database, Activity, AlertCircle, RefreshCw, CalendarCheck, Cloud, Server } from 'lucide-react';
import { subscribeToConnectionStatus } from '../services/storage';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [status, setStatus] = useState({ turso: false, firebase: false });
  
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = subscribeToConnectionStatus(setStatus);
    return () => unsubscribe();
  }, []);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/inbox', label: 'Surat Masuk', icon: <Inbox size={20} /> },
    { path: '/outbox', label: 'Surat Keluar', icon: <Send size={20} /> },
    { path: '/create', label: 'Buat Surat', icon: <PenTool size={20} /> },
    { path: '/attendance', label: 'Buat Absensi', icon: <CalendarCheck size={20} /> },
    { path: '/settings', label: 'Pengaturan', icon: <Settings size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}/>
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        <div className="flex items-center h-24 px-8 border-b border-white/5 bg-gradient-to-b from-slate-800 to-slate-900">
          <div className="bg-indigo-600 p-2 rounded-xl mr-3 shadow-lg shadow-indigo-500/20">
            <School className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">ArsipSurat</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Hybrid Cloud SD</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto">
          <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Menu Utama</p>
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} onClick={() => setIsSidebarOpen(false)} className={`group flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40 translate-x-1' : 'text-slate-400 hover:bg-white/5 hover:text-white hover:translate-x-1'}`}>
                <div className="flex items-center">
                  <span className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'} mr-3`}>{item.icon}</span>
                  <span className="font-bold text-sm">{item.label}</span>
                </div>
                {active && <ChevronRight size={14} className="text-indigo-200" />}
              </Link>
            );
          })}
        </nav>

        {/* Status Indicators (Hybrid Display) */}
        <div className="px-6 py-6 space-y-3 bg-slate-800/20 border-t border-white/5">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <Server size={12} className={status.turso ? 'text-emerald-400' : 'text-rose-400'} />
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Archive (SQL)</span>
              </div>
              <div className={`w-1.5 h-1.5 rounded-full ${status.turso ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-rose-400'}`}></div>
           </div>
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <Cloud size={12} className={status.firebase ? 'text-emerald-400' : 'text-rose-400'} />
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time (Sync)</span>
              </div>
              <div className={`w-1.5 h-1.5 rounded-full ${status.firebase ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-rose-400'}`}></div>
           </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="flex items-center justify-between h-20 px-6 lg:hidden bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-30">
          <div className="font-black text-slate-900 text-lg flex items-center">
            <School className="mr-2 text-indigo-600" size={22} />
            ArsipSurat
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-3 text-indigo-600 bg-indigo-50 rounded-2xl">
            <Menu size={22} />
          </button>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
