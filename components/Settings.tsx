import React, { useState, useEffect } from 'react';
import { Save, Upload, School, Loader2, Info, Building2, UserCircle } from 'lucide-react';
import { subscribeToConfig, saveSchoolConfig } from '../services/storage';
import { SchoolConfig } from '../types';

const Settings: React.FC = () => {
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    const unsubscribe = subscribeToConfig((newConfig) => {
      setConfig(newConfig);
    });
    return () => unsubscribe();
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
    try {
      await saveSchoolConfig(config);
      setMessage({ text: 'Pengaturan tersimpan ke Database', type: 'success' });
    } catch {
      setMessage({ text: 'Gagal menyimpan. Periksa config database.', type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  if (!config) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-600/20 to-violet-600/20"></div>
          <div className="relative z-10 flex flex-col items-center">
            <h2 className="text-xl font-bold text-white">Identitas & Kop Surat</h2>
            <p className="text-slate-400 text-sm">Sesuaikan informasi instansi untuk keperluan kop surat.</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
           {message.text && (
             <div className={`p-3 rounded-xl text-sm font-semibold text-center ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
               {message.text}
             </div>
           )}

           {/* Logo Section */}
           <div>
             <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
               <Building2 size={18} className="text-indigo-600"/>
               Logo Kop Surat
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Logo Daerah */}
                <div className="flex flex-col items-center gap-3 p-4 border border-slate-100 rounded-2xl bg-slate-50">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Logo Daerah (Kiri)</span>
                  <div className="relative group cursor-pointer">
                    <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center p-2 shadow-sm border border-slate-200 overflow-hidden">
                      {config.logoDaerahUrl ? (
                        <img src={config.logoDaerahUrl} alt="Logo Daerah" className="w-full h-full object-contain" />
                      ) : (
                        <Building2 className="text-slate-300 w-10 h-10" />
                      )}
                    </div>
                    <label className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Upload size={20} />
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, 'logoDaerahUrl')} />
                    </label>
                  </div>
                  <span className="text-[10px] text-slate-400">Klik untuk ubah</span>
                </div>

                {/* Logo Sekolah */}
                <div className="flex flex-col items-center gap-3 p-4 border border-slate-100 rounded-2xl bg-slate-50">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Logo Sekolah (Kanan)</span>
                  <div className="relative group cursor-pointer">
                    <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center p-2 shadow-sm border border-slate-200 overflow-hidden">
                      {config.logoUrl ? (
                        <img src={config.logoUrl} alt="Logo Sekolah" className="w-full h-full object-contain" />
                      ) : (
                        <School className="text-slate-300 w-10 h-10" />
                      )}
                    </div>
                    <label className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Upload size={20} />
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, 'logoUrl')} />
                    </label>
                  </div>
                  <span className="text-[10px] text-slate-400">Klik untuk ubah</span>
                </div>
             </div>
           </div>

           <div className="h-px bg-slate-100 w-full my-6"></div>

           {/* Principal Info Section */}
           <div>
             <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
               <UserCircle size={18} className="text-indigo-600"/>
               Pejabat Penanda Tangan (Default)
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Nama Lengkap (Gelar)</label>
                  <input 
                    name="principalName" 
                    value={config.principalName} 
                    onChange={handleChange} 
                    placeholder="Contoh: Nita Ekaningkarti Adji, S.Pd"
                    className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 border outline-none font-semibold text-slate-800 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">NIP</label>
                  <input 
                    name="principalNip" 
                    value={config.principalNip} 
                    onChange={handleChange} 
                    placeholder="Contoh: 19860213 201409 2 002"
                    className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 border outline-none font-semibold text-slate-800 transition-all text-sm"
                  />
                </div>
             </div>
           </div>

           <div className="h-px bg-slate-100 w-full my-6"></div>

           {/* Text Info */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 mb-2">Teks Header Kop Surat</h3>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Header Baris 1</label>
                  <input 
                    name="headerLine1" 
                    value={config.headerLine1} 
                    onChange={handleChange} 
                    placeholder="Contoh: PEMERINTAH KOTA KEDIRI"
                    className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 border outline-none font-semibold text-slate-700 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Header Baris 2</label>
                  <input 
                    name="headerLine2" 
                    value={config.headerLine2} 
                    onChange={handleChange} 
                    placeholder="Contoh: DINAS PENDIDIKAN"
                    className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 border outline-none font-semibold text-slate-700 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Nama Instansi / Sekolah (Baris 3)</label>
                  <input 
                    name="name" 
                    value={config.name} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 border outline-none font-bold text-slate-800 transition-all"
                  />
                </div>
             </div>

             <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 mb-2">Kontak & Alamat</h3>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Alamat Lengkap</label>
                  <textarea 
                    name="address" 
                    rows={3}
                    value={config.address} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 border outline-none font-medium text-slate-700 transition-all text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Email Resmi</label>
                  <input 
                    name="email" 
                    value={config.email} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 border outline-none font-medium text-slate-700 transition-all text-sm"
                  />
                </div>
             </div>
           </div>

           <button
             type="submit"
             disabled={loading}
             className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-base hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 mt-4"
           >
             {loading ? <Loader2 className="animate-spin" /> : <Save />}
             Simpan Pengaturan
           </button>
        </form>
      </div>
    </div>
  );
};

export default Settings;