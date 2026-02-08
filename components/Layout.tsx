import React, { useRef, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, Send, Inbox, LayoutDashboard, Menu, X, School, Download, Upload, Settings, ChevronRight, PenTool, WifiOff, Cloud, CloudOff, CheckCircle2, RefreshCw, Database } from 'lucide-react';
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
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".json"/>

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Modern Dark Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-72 bg-slate-900 text-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col
      `}>
        {/* Logo Area */}
        <div className="flex items-center h-24 px-8 border-b border-slate-800/50 bg-gradient-to-r from-slate-900 to-slate-800">
          <div className="bg-indigo-600 p-2 rounded-xl mr-3 shadow-lg shadow-indigo-500/20">
            <School className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">ArsipSurat</h1>
            <p className="text-xs text-slate-400 font-medium">SD Pintar v1.2</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Menu Utama</p>
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`group flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20 translate-x-1'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1'
                }`}
              >
                <div className="flex items-center">
                  <span className={`${active ? 'text-indigo-200' : 'text-slate-500 group-hover:text-slate-300'} mr-3`}>
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.label}</span>
                </div>
                {active && <ChevronRight size={16} className="text-indigo-300" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 m-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
          {/* Connection Status Badge Sidebar */}
          <div className={`flex flex-col gap-1 mb-4 p-3 rounded-xl border transition-all ${dbConnected ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {dbConnected ? <Cloud size={14} className="text-indigo-400" /> : <CloudOff size={14} className="text-rose-400" />}
                <span className={`text-[10px] font-bold uppercase tracking-wider ${dbConnected ? 'text-indigo-300' : 'text-rose-300'}`}>
                  {dbConnected ? 'Database Cloud' : 'Koneksi Terputus'}
                </span>
              </div>
              {dbConnected && (
                <div className="flex items-center">
                   <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                </div>
              )}
            </div>
            <p className="text-[9px] text-slate-500 font-medium">
              {dbConnected ? `Sinkron: ${format(lastSync, 'HH:mm:ss')}` : 'Gunakan Restore Manual'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleBackup} className="flex flex-col items-center p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all text-emerald-400">
              <Download size={18} className="mb-1" />
              <span className="text-[10px] font-semibold">Backup</span>
            </button>
            <button onClick={triggerImport} className="flex flex-col items-center p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all text-amber-400">
              <Upload size={18} className="mb-1" />
              <span className="text-[10px] font-semibold">Restore</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* BIG CONNECTION INDICATOR (TOP RIGHT) */}
        <div className="absolute top-6 right-8 z-20 flex items-center gap-3">
           <div className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all duration-700 ${dbConnected ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-700 ring-4 ring-indigo-500/5' : 'bg-white/90 border-slate-200 text-slate-500'}`}>
              <div className="relative">
                 {dbConnected ? (
                   <div className="flex items-center justify-center">
                     <div className="absolute w-8 h-8 bg-emerald-400 rounded-full animate-ping opacity-20"></div>
                     <Database size={18} className="relative z-10 text-emerald-600 drop-shadow-sm" />
                   </div>
                 ) : (
                   <CloudOff size={18} className="text-rose-500" />
                 )}
              </div>
              <div className="flex flex-col">
                 <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold uppercase tracking-widest">
                      {dbConnected ? 'DATABASE TERHUBUNG' : 'MODE OFFLINE'}
                    </span>
                    {dbConnected && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>}
                 </div>
                 {dbConnected ? (
                   <span className="text-[9px] font-bold text-indigo-500 mt-0.5 flex items-center gap-1">
                     <RefreshCw size={10} className="animate-spin-slow" />
                     SINKRONISASI AKTIF (REALTIME)
                   </span>
                 ) : (
                   <span className="text-[9px] font-bold text-rose-400 mt-0.5">MENUNGGU KONFIGURASI TOKEN...</span>
                 )}
              </div>
           </div>
        </div>

        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-50 to-slate-50 -z-10"></div>

        <header className="flex items-center justify-between h-16 px-6 lg:hidden bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10">
          <div className="font-bold text-slate-800 text-lg flex items-center">
            <School className="mr-2 text-indigo-600" size={20} />
            ArsipSurat
          </div>
          <button onClick={toggleSidebar} className="p-2 text-slate-600 bg-slate-100 rounded-lg">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">
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
          animation: spin-slow 4s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Layout;