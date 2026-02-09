import React, { useState, useEffect } from 'react';
import { Save, Upload, School, Loader2, Info, Building2, UserCircle, Database, AlertCircle, CheckCircle2 } from 'lucide-react';
import { subscribeToConfig, saveSchoolConfig, subscribeToConnectionStatus } from '../services/storage';
import { SchoolConfig } from '../types';

const Settings: React.FC = () => {
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [dbConnected, setDbConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    const unsubscribeConfig = subscribeToConfig((newConfig) => {
      setConfig(newConfig);
    });
    const unsubscribeDb = subscribeToConnectionStatus((isConnected) => {
      setDbConnected(isConnected);
    });
    return () => {
      unsubscribeConfig();
      unsubscribeDb();
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (config) {
      setConfig({ ...config, [e.target.name]: e.target.value });
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'logoDaerahUrl') => {
    const file = e.target.files?.[0];
    if (file && config) {
      if (file.size > 500 * 1024) {
        setMessage({ text: 'Ukuran maksimal 500KB', type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig(prev => prev ? ({ ...prev, [field]: reader.result as string }) : null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setLoading(true);
    setMessage({ text: '', type: '' });
    
    try {
      await saveSchoolConfig(config);
      setMessage({ text: 'Pengaturan berhasil diperbarui di Cloud & Lokal.', type: 'success' });
      // Clear message after 4 seconds
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    } catch (err: any) {
      console.error(err);
      setMessage({ 
        text: `Gagal Sinkron Cloud: ${err.message || 'Cek Token/URL Database'}. Data tetap tersimpan secara Lokal.`, 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!config) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-slate-500 font-medium">Memuat konfigurasi...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 animate-fade-in pb-20">
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {/* Header Section */}
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-600/20 to-violet-600/20"></div>
          <div className="relative z-10 flex flex-col items-center">
            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Identitas & Kop Surat</h2>
            <p className="text-slate-400 text-sm max-w-md">Informasi ini akan digunakan secara otomatis pada setiap surat yang Anda buat.</p>
          </div>
          
          {/* Connection Status Badge */}
          <div className="absolute top-6 right-6 z-10">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${dbConnected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
              <Database size={12} />
              {dbConnected ? 'Database: Online' : 'Database: Offline'}
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
        {message.text && (
          <div className={`mx-8 mt-6 p-4 rounded-2xl flex items-center gap-3 animate-fade-in ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' : 'bg-rose-50 border border-rose-100 text-rose-700'}`}>
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="text-sm font-bold">{message.text}</span>
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-8 space-y-10">
           
           {/* 1. Logo Section */}
           <section>
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
               <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg"><Building2 size={16}/></span>
               Logo Header (Kop)
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Logo Daerah */}
                <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logo Daerah (Sisi Kiri)</span>
                  <div className="relative group">
                    <div className="w-28 h-28 bg-white rounded-2xl flex items-center justify-center p-3 shadow-sm border border-slate-200 overflow-hidden">
                      {config.logoDaerahUrl ? (
                        <img src={config.logoDaerahUrl} alt="Logo Daerah" className="w-full h-full object-contain" />
                      ) : (
                        <Building2 className="text-slate-200 w-12 h-12" />
                      )}
                    </div>
                    <label className="absolute inset-0 bg-indigo-600/80 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-[2px]">
                      <Upload size={24} className="mb-1" />
                      <span className="text-[10px] font-bold">Ganti Logo</span>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, 'logoDaerahUrl')} />
                    </label>
                  </div>
                </div>

                {/* Logo Sekolah */}
                <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logo Sekolah (Sisi Kanan)</span>
                  <div className="relative group">
                    <div className="w-28 h-28 bg-white rounded-2xl flex items-center justify-center p-3 shadow-sm border border-slate-200 overflow-hidden">
                      {config.logoUrl ? (
                        <img src={config.logoUrl} alt="Logo Sekolah" className="w-full h-full object-contain" />
                      ) : (
                        <School className="text-slate-200 w-12 h-12" />
                      )}
                    </div>
                    <label className="absolute inset-0 bg-indigo-600/80 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-[2px]">
                      <Upload size={24} className="mb-1" />
                      <span className="text-[10px] font-bold">Ganti Logo</span>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, 'logoUrl')} />
                    </label>
                  </div>
                </div>
             </div>
           </section>

           <div className="h-px bg-slate-100 w-full"></div>

           {/* 2. Principal Info Section */}
           <section>
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
               <span className="bg-amber-100 text-amber-600 p-1.5 rounded-lg"><UserCircle size={16}/></span>
               Pejabat Penanda Tangan
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nama Kepala Sekolah (Lengkap & Gelar)</label>
                  <input 
                    name="principalName" 
                    value={config.principalName} 
                    onChange={handleChange} 
                    placeholder="Contoh: Nita Ekaningkarti Adji, S.Pd"
                    className="w-full px-5 py-4 bg-slate-50 border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 border outline-none font-bold text-slate-800 transition-all text-sm shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nomor Induk Pegawai (NIP)</label>
                  <input 
                    name="principalNip" 
                    value={config.principalNip} 
                    onChange={handleChange} 
                    placeholder="Contoh: 19860213 201409 2 002"
                    className="w-full px-5 py-4 bg-slate-50 border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 border outline-none font-bold text-slate-800 transition-all text-sm shadow-sm"
                  />
                </div>
             </div>
           </section>

           <div className="h-px bg-slate-100 w-full"></div>

           {/* 3. Text Header & Address */}
           <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
             <div className="space-y-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Teks Kop Surat</h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Baris 1 (Pemerintah)</label>
                    <input 
                      name="headerLine1" 
                      value={config.headerLine1} 
                      onChange={handleChange} 
                      className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 border outline-none font-semibold text-slate-700 transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Baris 2 (Instansi Dinas)</label>
                    <input 
                      name="headerLine2" 
                      value={config.headerLine2} 
                      onChange={handleChange} 
                      className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 border outline-none font-semibold text-slate-700 transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nama Sekolah (Baris 3)</label>
                    <input 
                      name="name" 
                      value={config.name} 
                      onChange={handleChange} 
                      className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 border outline-none font-black text-indigo-700 transition-all text-base"
                    />
                  </div>
                </div>
             </div>

             <div className="space-y-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Kontak & Alamat</h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Alamat Lengkap</label>
                    <textarea 
                      name="address" 
                      rows={3}
                      value={config.address} 
                      onChange={handleChange} 
                      className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 border outline-none font-medium text-slate-700 transition-all text-sm resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Sekolah</label>
                    <input 
                      name="email" 
                      value={config.email} 
                      onChange={handleChange} 
                      className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 border outline-none font-medium text-slate-700 transition-all text-sm"
                    />
                  </div>
                </div>
             </div>
           </section>

           <div className="pt-4">
             <button
               type="submit"
               disabled={loading}
               className="w-full py-4.5 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-3 active:scale-[0.98] group"
             >
               {loading ? <Loader2 className="animate-spin" /> : <Save className="group-hover:scale-110 transition-transform"/>}
               {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
             </button>
             {!dbConnected && (
               <p className="text-center mt-3 text-xs text-rose-500 font-bold animate-pulse">
                 Database Offline: Perubahan hanya akan tersimpan di browser ini.
               </p>
             )}
           </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;