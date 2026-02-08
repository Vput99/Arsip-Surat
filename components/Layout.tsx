import React, { useRef, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, Send, Inbox, LayoutDashboard, Menu, X, School, Download, Upload, Settings, ChevronRight, PenTool, WifiOff, Cloud, CloudOff, CheckCircle2, RefreshCw, Database, Activity } from 'lucide-react';
import { exportDatabase, importDatabase, subscribeToConnectionStatus } from '../services/storage';
import { format } from 'date-fns';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const unsubscribeDb = subscribeToConnectionStatus((isConnected) => {
      setDbConnected(isConnected);
      if (isConnected) setLastSync(new Date());
    });

    return () => {
      unsubscribeDb();
    };
  }, []);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/inbox', label: 'Surat Masuk', icon: <Inbox size={20} /> },
    { path: '/outbox', label: 'Surat Keluar', icon: <Send size={20} /> },
    { path: '/create', label: 'Buat Surat', icon: <PenTool size={20} /> },
    { path: '/settings', label: 'Pengaturan', icon: <Settings size={20} /> },
  ];

  const handleBackup = async () => {
    try {
      const dataStr = await exportDatabase();
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup-arsip-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Backup failed", error);
    }
  };

  const triggerImport = () => {
    if (confirm("Restore data akan menimpa/memperbarui data yang ada. Lanjutkan?")) {
      fileInputRef.current?.click();
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const success = await importDatabase(content);
      if (success) {
        alert("Database berhasil dipulihkan!");
        window.location.reload();
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".json"/>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col
      `}>
        {/* Logo Section */}
        <div className="flex items-center h-24 px-8 border-b border-white/5 bg-gradient-to-b from-slate-800 to-slate-900">
          <div className="bg-indigo-600 p-2 rounded-xl mr-3 shadow-lg shadow-indigo-500/20">
            <School className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">ArsipSurat</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">SD Pintar Cloud</p>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto">
          <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Menu Utama</p>
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`group flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40 translate-x-1'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white hover:translate-x-1'
                }`}
              >
                <div className="flex items-center">
                  <span className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'} mr-3`}>
                    {item.icon}
                  </span>
                  <span className="font-bold text-sm">{item.label}</span>
                </div>
                {active && <ChevronRight size={14} className="text-indigo-200" />}
              </Link>
            );
          })}
        </nav>

        {/* CONNECTION & SYSTEM BOX (Paling bawah sidebar) */}
        <div className="p-4 mx-4 mb-8 bg-slate-800/40 rounded-2xl border border-white/5 backdrop-blur-md">
          {/* Status Badge in Sidebar */}
          <div className={`flex flex-col gap-1.5 mb-4 p-3 rounded-xl border transition-all duration-500 ${dbConnected ? 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]' : 'bg-rose-500/10 border-rose-500/20'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {dbConnected ? <Cloud size={14} className="text-emerald-400" /> : <CloudOff size={14} className="text-rose-400" />}
                <span className={`text-[10px] font-black uppercase tracking-widest ${dbConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {dbConnected ? 'Database Online' : 'Mode Offline'}
                </span>
              </div>
              {dbConnected && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>}
            </div>
            <p className="text-[9px] text-slate-500 font-bold">
              {dbConnected ? `Sinkron: ${format(lastSync, 'HH:mm:ss')}` : 'Cek koneksi internet Anda'}
            </p>
          </div>

          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] mb-3 px-1">Manajemen Data</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleBackup} className="flex flex-col items-center p-2.5 bg-slate-800 hover:bg-slate-700 border border-white/5 rounded-xl transition-all text-emerald-400 group">
              <Download size={16} className="mb-1 group-hover:-translate-y-0.5 transition-transform" />
              <span className="text-[9px] font-bold">Backup</span>
            </button>
            <button onClick={triggerImport} className="flex flex-col items-center p-2.5 bg-slate-800 hover:bg-slate-700 border border-white/5 rounded-xl transition-all text-amber-400 group">
              <Upload size={16} className="mb-1 group-hover:-translate-y-0.5 transition-transform" />
              <span className="text-[9px] font-bold">Restore</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* 1. FLOATING INDICATOR (DESKTOP ONLY) */}
        <div className="absolute top-8 right-10 z-20 hidden lg:flex items-center gap-4">
           <div className={`flex items-center gap-4 px-6 py-3 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all duration-1000 ${dbConnected ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 ring-4 ring-emerald-500/5' : 'bg-white/90 border-slate-200 text-slate-400'}`}>
              <div className="relative">
                 {dbConnected ? (
                   <div className="flex items-center justify-center">
                     <div className="absolute w-10 h-10 bg-emerald-400 rounded-full animate-ping opacity-10"></div>
                     <Activity size={20} className="relative z-10 text-emerald-500" />
                   </div>
                 ) : (
                   <WifiOff size={20} className="text-rose-400" />
                 )}
              </div>
              <div className="flex flex-col">
                 <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.1em]">
                      {dbConnected ? 'Sistem Terhubung' : 'Database Offline'}
                    </span>
                    {dbConnected && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>}
                 </div>
                 <span className={`text-[9px] font-bold mt-0.5 flex items-center gap-1 ${dbConnected ? 'text-emerald-600' : 'text-rose-400'}`}>
                   {dbConnected ? <><RefreshCw size={10} className="animate-spin-slow" /> CLOUD SYNC AKTIF</> : 'MENUNGGU AUTENTIKASI...'}
                 </span>
              </div>
           </div>
        </div>

        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-80 bg-gradient-to-b from-indigo-100/50 to-transparent -z-10"></div>

        {/* 2. MOBILE HEADER (With Connection Sign) */}
        <header className="flex items-center justify-between h-20 px-6 lg:hidden bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-30">
          <div className="flex flex-col">
            <div className="font-black text-slate-900 text-lg flex items-center">
              <School className="mr-2 text-indigo-600" size={22} />
              ArsipSurat
            </div>
            {/* Connection Sign for Mobile Header */}
            <div className="flex items-center mt-0.5 gap-1.5">
               <div className={`w-2 h-2 rounded-full ${dbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`}></div>
               <span className={`text-[10px] font-black uppercase tracking-tighter ${dbConnected ? 'text-emerald-600' : 'text-rose-500'}`}>
                 {dbConnected ? 'Cloud Connected' : 'Offline Mode'}
               </span>
            </div>
          </div>
          
          <button 
            onClick={toggleSidebar} 
            className="p-3 text-indigo-600 bg-indigo-50 rounded-2xl shadow-sm border border-indigo-100 active:scale-95 transition-transform"
          >
            {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 5s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Layout;