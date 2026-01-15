import React, { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, Send, Inbox, LayoutDashboard, Menu, X, School, Database, Download, Upload, Settings } from 'lucide-react';
import { exportDatabase, importDatabase } from '../services/storage';
import { format } from 'date-fns';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/inbox', label: 'Surat Masuk', icon: <Inbox size={20} /> },
    { path: '/outbox', label: 'Surat Keluar', icon: <Send size={20} /> },
    { path: '/settings', label: 'Pengaturan', icon: <Settings size={20} /> },
  ];

  // Handler Export (Backup)
  const handleBackup = () => {
    const dataStr = exportDatabase();
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `backup-arsip-surat-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handler Trigger Import
  const triggerImport = () => {
    if (confirm("PERINGATAN: Restore data akan menimpa/menghapus data yang ada saat ini di browser ini. Lanjutkan?")) {
      fileInputRef.current?.click();
    }
  };

  // Handler Process Import File
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importDatabase(content);
      if (success) {
        alert("Database berhasil dipulihkan!");
        window.location.reload(); // Refresh agar data tampil
      } else {
        alert("Gagal memulihkan database. File rusak atau format salah.");
      }
    };
    reader.readAsText(file);
    // Reset value agar bisa upload file yang sama jika perlu
    e.target.value = ''; 
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Hidden File Input for Import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileImport} 
        className="hidden" 
        accept=".json"
      />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-center h-20 border-b border-blue-100 bg-blue-600 text-white">
          <School className="mr-2" size={28} />
          <h1 className="text-xl font-bold">ArsipSurat SD</h1>
        </div>

        <nav className="mt-6 px-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${
                isActive(item.path)
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-gray-100 bg-gray-50">
          
          {/* Backup & Restore Menu */}
          <div className="mb-4 space-y-2">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Manajemen Data</p>
            <button 
              onClick={handleBackup}
              className="w-full flex items-center px-3 py-2 bg-white text-green-700 border border-green-200 rounded-lg hover:bg-green-50 text-xs font-semibold transition-colors"
            >
              <Download size={14} className="mr-2" />
              Backup Data
            </button>
            <button 
              onClick={triggerImport}
              className="w-full flex items-center px-3 py-2 bg-white text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-50 text-xs font-semibold transition-colors"
            >
              <Upload size={14} className="mr-2" />
              Restore Data
            </button>
          </div>

          <div className="bg-blue-100 rounded-lg p-3">
            <p className="text-xs text-blue-800 font-semibold">Status Sistem</p>
            <div className="flex items-center mt-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
              <span className="text-xs text-blue-600">Database Lokal</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar for Mobile */}
        <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 lg:hidden">
          <div className="font-bold text-gray-800 text-lg">Menu</div>
          <button onClick={toggleSidebar} className="text-gray-600 focus:outline-none">
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;