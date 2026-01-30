import React, { useRef, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, Send, Inbox, LayoutDashboard, Menu, X, School, Database, Download, Upload, Settings, ChevronRight, PenTool, Wifi, WifiOff } from 'lucide-react';
import { exportDatabase, importDatabase } from '../services/storage';
import { format } from 'date-fns';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const isActive = (path: string) => location.pathname === path;

  // Monitor Online/Offline Status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
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
      alert("Gagal melakukan backup database.");
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
      } else {
        alert("Gagal memulihkan database.");
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
            <p className="text-xs text-slate-400 font-medium">SD Pintar v1.0</p>
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
          {/* Connection Status Badge */}
          <div className={`flex items-center justify-center mb-3 px-3 py-1.5 rounded-lg border ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
            {isOnline ? <Wifi size={14} className="mr-2"/> : <WifiOff size={14} className="mr-2"/>}
            <span className="text-xs font-bold uppercase tracking-wider">{isOnline ? 'Online (Firebase)' : 'Offline (Lokal)'}</span>
          </div>

          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Data & System</p>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={handleBackup}
              className="flex flex-col items-center justify-center p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/30 group"
            >
              <Download size={18} className="mb-1 group-hover:-translate-y-0.5 transition-transform" />
              <span className="text-[10px] font-semibold">Backup</span>
            </button>
            <button 
              onClick={triggerImport}
              className="flex flex-col items-center justify-center p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all text-amber-400 hover:text-amber-300 hover:border-amber-500/30 group"
            >
              <Upload size={18} className="mb-1 group-hover:-translate-y-0.5 transition-transform" />
              <span className="text-[10px] font-semibold">Restore</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-50 to-slate-50 -z-10"></div>

        {/* Mobile Header */}
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
    </div>
  );
};

export default Layout;