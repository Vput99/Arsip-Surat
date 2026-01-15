import React, { useState } from 'react';
import { Save, Upload, School, Loader2, Info } from 'lucide-react';
import { getSchoolConfig, saveSchoolConfig } from '../services/storage';
import { SchoolConfig } from '../types';

const Settings: React.FC = () => {
  const [config, setConfig] = useState<SchoolConfig>(getSchoolConfig());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        setMessage({ text: 'Ukuran maksimal 500KB', type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      saveSchoolConfig(config);
      setMessage({ text: 'Pengaturan tersimpan', type: 'success' });
    } catch {
      setMessage({ text: 'Gagal menyimpan', type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-600/20 to-violet-600/20"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="relative group cursor-pointer mb-4">
              <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center p-2 shadow-2xl overflow-hidden border-4 border-white/10 backdrop-blur-sm">
                {config.logoUrl ? (
                   <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                   <School className="text-slate-300 w-10 h-10" />
                )}
              </div>
              <label className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Upload size={20} />
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </label>
            </div>
            <h2 className="text-xl font-bold text-white">Identitas Sekolah</h2>
            <p className="text-slate-400 text-sm">Informasi ini akan muncul pada kop surat.</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
           {message.text && (
             <div className={`p-3 rounded-xl text-sm font-semibold text-center ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
               {message.text}
             </div>
           )}

           <div className="space-y-4">
             <div>
               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Nama Instansi</label>
               <input 
                 name="name" 
                 value={config.name} 
                 onChange={handleChange} 
                 className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 border outline-none font-semibold text-slate-700 transition-all"
               />
             </div>
             <div>
               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Alamat Lengkap</label>
               <input 
                 name="address" 
                 value={config.address} 
                 onChange={handleChange} 
                 className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 border outline-none font-medium text-slate-700 transition-all"
               />
             </div>
             <div>
               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Email Resmi</label>
               <input 
                 name="email" 
                 value={config.email} 
                 onChange={handleChange} 
                 className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 border outline-none font-medium text-slate-700 transition-all"
               />
             </div>
           </div>

           <button
             type="submit"
             disabled={loading}
             className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-base hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
           >
             {loading ? <Loader2 className="animate-spin" /> : <Save />}
             Simpan Perubahan
           </button>
        </form>
      </div>
    </div>
  );
};

export default Settings;