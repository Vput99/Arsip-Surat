
import React, { useState, useEffect, useRef } from 'react';
import { Save, Upload, School, Loader2, Info, Building2, Database, AlertCircle, CheckCircle2, Users, Plus, Trash2, Search, ListOrdered, FileText, Layout, Type, RefreshCw, Zap, ShieldCheck, Download, History, ClipboardList, Clock } from 'lucide-react';
import { subscribeToConfig, saveSchoolConfig, subscribeToConnectionStatus, subscribeToStaff, saveStaff, deleteStaff, StaffMember, subscribeToTemplates, saveTemplate, deleteTemplate, LetterTemplate, initializeDefaultData, exportFullBackup, subscribeToLogs } from '../services/storage';
import { SchoolConfig, ActivityLog } from '../types';
import { CATEGORIES } from '../constants';
import { format } from 'date-fns';
import { id } from 'date-fns/locale/id';

type SettingsTab = 'profile' | 'staff' | 'templates' | 'maintenance';
type StaffCategory = 'reg' | 'pppk' | 'extra' | 'tukang';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [dbStatus, setDbStatus] = useState({ turso: false, firebase: false });
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // Staff State
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [staffCategory, setStaffCategory] = useState<StaffCategory>('reg');
  const [staffSearch, setStaffSearch] = useState('');
  
  // Templates State
  const [allTemplates, setAllTemplates] = useState<LetterTemplate[]>([]);
  const [templateSearch, setTemplateSearch] = useState('');
  
  const isEditingRef = useRef(false);

  useEffect(() => {
    const unsubscribeConfig = subscribeToConfig(setConfig);
    const unsubscribeDb = subscribeToConnectionStatus(setDbStatus);
    const unsubscribeStaff = subscribeToStaff((data) => {
      if (!isEditingRef.current) setAllStaff(data);
    });
    const unsubscribeTemplates = subscribeToTemplates((data) => {
      if (!isEditingRef.current) setAllTemplates(data);
    });
    const unsubscribeLogs = subscribeToLogs(setLogs);

    return () => {
      unsubscribeConfig();
      unsubscribeDb();
      unsubscribeStaff();
      unsubscribeTemplates();
      unsubscribeLogs();
    };
  }, []);

  const handleInitDb = async () => {
    if (!confirm("Inisialisasi akan mengisi database dengan data profil sekolah dan seluruh templat surat terbaru dari sistem. Data profil yang ada mungkin akan tertimpa. Lanjutkan?")) return;
    setInitLoading(true);
    setMessage({ text: '', type: '' });
    try {
      await initializeDefaultData();
      setMessage({ text: 'Database berhasil disinkronisasi dengan templat sistem terbaru.', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    } catch (err: any) {
      setMessage({ text: `Gagal inisialisasi: ${err.message}. Pastikan koneksi internet stabil.`, type: 'error' });
    } finally {
      setInitLoading(false);
    }
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      await exportFullBackup();
      setMessage({ text: 'Backup berhasil diunduh.', type: 'success' });
    } catch (e) {
      setMessage({ text: 'Gagal melakukan backup.', type: 'error' });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (config) setConfig({ ...config, [e.target.name]: e.target.value });
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

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      await saveSchoolConfig(config);
      setMessage({ text: 'Profil sekolah berhasil diperbarui.', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    } catch (err: any) {
      setMessage({ text: `Gagal menyimpan: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // --- STAFF FUNCTIONS ---
  const handleAddStaff = async () => {
    setLoading(true);
    try {
      const existingCount = allStaff.filter(s => s.category === staffCategory).length;
      const newMember: StaffMember = {
        id: `${staffCategory}-${Date.now()}`,
        category: staffCategory,
        name: '',
        nip: '',
        rank: '',
        orderIndex: existingCount + 1,
        createdAt: new Date().toISOString()
      };
      await saveStaff(newMember);
    } catch (err: any) {
      setMessage({ text: `Gagal menambah personil: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStaffChange = (id: string, field: keyof StaffMember, value: string | number) => {
    setAllStaff(allStaff.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSaveStaffRow = async (staff: StaffMember) => {
    try {
      await saveStaff(staff);
      setMessage({ text: 'Data personil tersimpan.', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 2000);
    } catch (err: any) {
      setMessage({ text: `Gagal menyimpan data personil: ${err.message}`, type: 'error' });
    }
    isEditingRef.current = false;
  };

  const handleStaffDelete = async (id: string) => {
    if (!confirm("Hapus data personil ini?")) return;
    try {
      await deleteStaff(id);
    } catch (err: any) {
      setMessage({ text: `Gagal menghapus: ${err.message}`, type: 'error' });
    }
  };

  // --- TEMPLATE FUNCTIONS ---
  const handleAddTemplate = async () => {
    setLoading(true);
    try {
      const newT: LetterTemplate = {
        id: `t_${Date.now()}`,
        name: 'Template Baru',
        subject: 'PERIHAL SURAT',
        category: 'Dinas',
        layout: 'centered',
        content: 'Tulis naskah surat di sini...',
        createdAt: new Date().toISOString()
      };
      await saveTemplate(newT);
      setActiveTab('templates');
    } catch (err: any) {
      setMessage({ text: `Gagal menambah template: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateUpdate = (id: string, field: keyof LetterTemplate, value: string) => {
    setAllTemplates(allTemplates.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleSaveTemplateRow = async (template: LetterTemplate) => {
    try {
      await saveTemplate(template);
      setMessage({ text: 'Template surat tersimpan.', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 2000);
    } catch (err: any) {
      setMessage({ text: `Gagal menyimpan template: ${err.message}`, type: 'error' });
    }
    isEditingRef.current = false;
  };

  const handleTemplateDelete = async (id: string) => {
    if (!confirm("Hapus template ini?")) return;
    try {
      await deleteTemplate(id);
    } catch (err: any) {
      setMessage({ text: `Gagal menghapus: ${err.message}`, type: 'error' });
    }
  };

  const filteredStaff = React.useMemo(() => {
    return allStaff.filter(s => {
      if (s.category !== staffCategory) return false;
      const search = staffSearch.toLowerCase();
      return s.name.toLowerCase().includes(search) || s.nip.includes(search);
    });
  }, [allStaff, staffCategory, staffSearch]);

  const filteredTemplates = React.useMemo(() => {
    return allTemplates.filter(t => {
      const search = templateSearch.toLowerCase();
      return t.name.toLowerCase().includes(search) || t.category.toLowerCase().includes(search);
    });
  }, [allTemplates, templateSearch]);

  if (!config) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-indigo-600" /></div>;

  const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1";
  const inputClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm transition-all";

  return (
    <div className="max-w-5xl mx-auto py-6 animate-fade-in pb-20 px-2">
      
      {/* Header & Tabs */}
      <div className="bg-white/80 backdrop-blur-3xl rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 overflow-hidden mb-8 relative">
        <div className="p-10 text-center relative overflow-hidden bg-slate-900 rounded-t-[3rem]">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-600/30 via-premium-600/20 to-transparent"></div>
          <div className="relative z-10 flex flex-col items-center">
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 mb-2 tracking-tight uppercase">Pengaturan Sistem</h2>
            <p className="text-slate-400 text-sm max-w-md font-bold">Kelola identitas sekolah, naskah template, dan database personil secara terpusat.</p>
          </div>
          <div className="absolute top-6 right-6 z-10">
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[1rem] border text-[10px] font-black uppercase tracking-widest shadow-lg ${dbStatus.firebase ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-500/20' : 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-rose-500/20'}`}>
              <Database size={12} className={dbStatus.firebase ? "animate-pulse-glow" : ""} />
              {dbStatus.firebase ? 'Online Sync' : 'Offline Mode'}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/20 px-4 bg-white/40">
          <button onClick={() => setActiveTab('profile')} className={`flex-1 py-5 text-sm font-black flex items-center justify-center gap-3 transition-all duration-300 uppercase tracking-widest ${activeTab === 'profile' ? 'text-premium-700 border-b-4 border-premium-600 bg-premium-50/50 scale-105' : 'text-slate-500 hover:text-premium-600 hover:bg-white/50 border-b-4 border-transparent'}`}><School size={18} /> Profil</button>
          <button onClick={() => setActiveTab('templates')} className={`flex-1 py-5 text-sm font-black flex items-center justify-center gap-3 transition-all duration-300 uppercase tracking-widest ${activeTab === 'templates' ? 'text-premium-700 border-b-4 border-premium-600 bg-premium-50/50 scale-105' : 'text-slate-500 hover:text-premium-600 hover:bg-white/50 border-b-4 border-transparent'}`}><FileText size={18} /> Template</button>
          <button onClick={() => setActiveTab('staff')} className={`flex-1 py-5 text-sm font-black flex items-center justify-center gap-3 transition-all duration-300 uppercase tracking-widest ${activeTab === 'staff' ? 'text-premium-700 border-b-4 border-premium-600 bg-premium-50/50 scale-105' : 'text-slate-500 hover:text-premium-600 hover:bg-white/50 border-b-4 border-transparent'}`}><Users size={18} /> Personil</button>
          <button onClick={() => setActiveTab('maintenance')} className={`flex-1 py-5 text-sm font-black flex items-center justify-center gap-3 transition-all duration-300 uppercase tracking-widest ${activeTab === 'maintenance' ? 'text-premium-700 border-b-4 border-premium-600 bg-premium-50/50 scale-105' : 'text-slate-500 hover:text-premium-600 hover:bg-white/50 border-b-4 border-transparent'}`}><ShieldCheck size={18} /> Sistem</button>
        </div>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-2xl flex items-start gap-3 animate-fade-in border-l-4 ${message.type === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-rose-50 border-rose-500 text-rose-700'}`}>
          {message.type === 'success' ? <CheckCircle2 size={20} className="mt-0.5 shrink-0" /> : <AlertCircle size={20} className="mt-0.5 shrink-0" />}
          <div className="flex-1">
            <span className="text-sm font-bold block">{message.text}</span>
          </div>
        </div>
      )}

      {/* CONTENT: PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="bg-white/80 backdrop-blur-2xl rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 p-10 animate-fade-in relative overflow-hidden">
             <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
             <form onSubmit={handleSubmitProfile} className="space-y-10 relative z-10">
               <section>
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3"><span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg"><Building2 size={16}/></span>Logo Kop</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logo Daerah</span>
                      <div className="relative group">
                        <div className="w-28 h-28 bg-white rounded-2xl flex items-center justify-center p-3 border border-slate-200">{config.logoDaerahUrl ? <img src={config.logoDaerahUrl} alt="Logo" className="w-full h-full object-contain" /> : <Building2 className="text-slate-200 w-12 h-12" />}</div>
                        <label className="absolute inset-0 bg-indigo-600/80 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer"><Upload size={24} /><span className="text-[10px] font-bold">Ganti</span><input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, 'logoDaerahUrl')} /></label>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logo Sekolah</span>
                      <div className="relative group">
                        <div className="w-28 h-28 bg-white rounded-2xl flex items-center justify-center p-3 border border-slate-200">{config.logoUrl ? <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <School className="text-slate-200 w-12 h-12" />}</div>
                        <label className="absolute inset-0 bg-indigo-600/80 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer"><Upload size={24} /><span className="text-[10px] font-bold">Ganti</span><input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, 'logoUrl')} /></label>
                      </div>
                    </div>
                 </div>
               </section>
               
               <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                 <div className="space-y-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Data Sekolah Utama</h3>
                    <div className="space-y-4">
                      <div><label className={labelClass}>Nama Lembaga</label><input name="name" value={config.name} onChange={handleChange} className={inputClass} placeholder="SD NEGERI ..." /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelClass}>NPSN</label><input name="npsn" value={config.npsn} onChange={handleChange} className={inputClass} placeholder="2053..." /></div>
                        <div><label className={labelClass}>NSS</label><input name="nss" value={config.nss} onChange={handleChange} className={inputClass} placeholder="1010..." /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelClass}>Email Sekolah</label><input name="email" value={config.email} onChange={handleChange} className={inputClass} placeholder="admin@sd..." /></div>
                        <div><label className={labelClass}>No. Telp / HP KS</label><input name="phone" value={config.phone} onChange={handleChange} className={inputClass} placeholder="0858..." /></div>
                      </div>
                      <div><label className={labelClass}>Alamat Sekolah</label><textarea name="address" rows={2} value={config.address} onChange={handleChange} className={`${inputClass} resize-none`} placeholder="Jl. Raya ..." /></div>
                      <div className="grid grid-cols-3 gap-4">
                        <div><label className={labelClass}>Kelurahan</label><input name="village" value={config.village} onChange={handleChange} className={inputClass} /></div>
                        <div><label className={labelClass}>Kecamatan</label><input name="district" value={config.district} onChange={handleChange} className={inputClass} /></div>
                        <div><label className={labelClass}>Kota/Kab</label><input name="city" value={config.city} onChange={handleChange} className={inputClass} /></div>
                      </div>
                    </div>
                 </div>
                 <div className="space-y-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Akreditasi & Pejabat</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                         <div className="col-span-1"><label className={labelClass}>Akreditasi</label><input name="accreditation" value={config.accreditation} onChange={handleChange} className={inputClass} placeholder="A" /></div>
                         <div className="col-span-1"><label className={labelClass}>Thn Akre</label><input name="accreditationYear" value={config.accreditationYear} onChange={handleChange} className={inputClass} placeholder="2020" /></div>
                         <div className="col-span-1"><label className={labelClass}>Gugus</label><input name="gugus" value={config.gugus} onChange={handleChange} className={inputClass} /></div>
                      </div>
                      <div><label className={labelClass}>Nama Kepala Sekolah</label><input name="principalName" value={config.principalName} onChange={handleChange} className={inputClass} placeholder="Nama Lengkap & Gelar" /></div>
                      <div><label className={labelClass}>NIP Kepala Sekolah</label><input name="principalNip" value={config.principalNip} onChange={handleChange} className={inputClass} placeholder="1986..." /></div>
                      <div className="pt-4 space-y-4 border-t border-slate-100">
                         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Header Kop Surat</h3>
                         <div><label className={labelClass}>Header Baris 1</label><input name="headerLine1" value={config.headerLine1} onChange={handleChange} className={inputClass} /></div>
                         <div><label className={labelClass}>Header Baris 2</label><input name="headerLine2" value={config.headerLine2} onChange={handleChange} className={inputClass} /></div>
                      </div>
                    </div>
                 </div>
               </section>
               <button type="submit" disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-3">{loading ? <Loader2 className="animate-spin" /> : <Save />}Simpan Profil</button>
             </form>
          </div>
        </div>
      )}

      {/* CONTENT: MAINTENANCE TAB */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6 animate-fade-in">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white/80 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6 hover:-translate-y-1 transition-transform duration-500">
                 <div className="bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-600 p-5 rounded-3xl w-fit shadow-inner"><Download size={32}/></div>
                 <h3 className="text-2xl font-black text-slate-800 tracking-tight">Ekspor Backup Data</h3>
                 <p className="text-sm font-bold text-slate-500 leading-relaxed">Unduh seluruh database (Profil, Personil, Templat, dan Arsip Surat) ke dalam file JSON tunggal untuk cadangan offline di komputer lokal.</p>
                 <button onClick={handleBackup} disabled={backupLoading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_10px_25px_-5px_rgba(79,70,229,0.4)] transition-all">
                    {backupLoading ? <Loader2 className="animate-spin" /> : <Download size={18}/>} Unduh File Cadangan
                 </button>
              </div>

              <div className="bg-white/80 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6 hover:-translate-y-1 transition-transform duration-500">
                 <div className="bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 p-5 rounded-3xl w-fit shadow-inner"><RefreshCw size={32}/></div>
                 <h3 className="text-2xl font-black text-slate-800 tracking-tight">Kalibrasi Templat</h3>
                 <p className="text-sm font-bold text-slate-500 leading-relaxed">Gunakan fitur ini untuk merefresh templat surat standar bawaan sistem (SPT, SPPD, Notulen) agar menyesuaikan dengan standar terbaru.</p>
                 <button onClick={handleInitDb} disabled={initLoading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.4)] transition-all">
                    {initLoading ? <Loader2 className="animate-spin" /> : <RefreshCw size={18}/>} Inisialisasi Ulang
                 </button>
              </div>
           </div>

           <div className="bg-white/80 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden mt-8">
              <div className="flex items-center gap-4 mb-8">
                 <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl shadow-slate-900/20"><History size={24}/></div>
                 <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Histori Sistem</h3>
                    <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest mt-1">Audit Trail & Log Aktivitas</p>
                 </div>
              </div>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                 {logs.map(log => (
                    <div key={log.id} className="p-6 bg-white rounded-2xl border border-slate-100/50 shadow-sm flex items-start gap-5 hover:bg-slate-50 transition-colors">
                       <div className="w-12 h-12 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 shrink-0"><Clock size={20}/></div>
                       <div className="flex-1">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-1">
                             <h4 className="text-[15px] font-black text-slate-800 leading-tight">{log.action}</h4>
                             <span className="text-[11px] font-bold text-slate-500 tabular-nums">{format(new Date(log.timestamp), 'dd MMM yyyy, HH:mm', { locale: id })}</span>
                          </div>
                          <div className="flex items-center gap-3">
                             <span className="text-[9px] font-black text-premium-600 bg-premium-50 px-2 py-1 rounded-lg uppercase tracking-widest">{log.module}</span>
                             <p className="text-sm font-bold text-slate-500">{log.details}</p>
                          </div>
                       </div>
                    </div>
                 ))}
                 {logs.length === 0 && <div className="text-center py-20 flex flex-col items-center">
                    <History size={48} className="text-slate-200 mb-4" />
                    <p className="text-xs text-slate-400 font-black uppercase tracking-widest">Sistem belum mencatat log apapun</p>
                 </div>}
              </div>
           </div>
        </div>
      )}

      {/* CONTENT: TEMPLATE TAB */}
      {activeTab === 'templates' && (
        <div className="bg-white/80 backdrop-blur-2xl rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 p-8 md:p-10 animate-fade-in relative overflow-hidden">
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-premium-100/40 via-transparent to-transparent rounded-bl-full pointer-events-none"></div>
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 relative z-10">
              <div>
                 <h3 className="text-3xl font-black text-slate-800 tracking-tight">Manajemen Templat</h3>
                 <p className="text-slate-500 text-sm font-bold mt-1">Konfigurasi naskah default pembentuk surat otomatis.</p>
              </div>
              <button onClick={handleAddTemplate} disabled={loading} className="flex items-center justify-center w-full md:w-auto gap-3 px-8 py-4 bg-slate-900 text-white rounded-[1.25rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:-translate-y-1 transition-all"><Plus size={18} /> Tambah Baru</button>
           </div>
           
           <div className="relative mb-8 z-10 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-within:text-premium-600 transition-colors" size={20} />
              <input type="text" placeholder="Cari template berdasarkan label..." value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-white/50 focus:bg-white rounded-[1.5rem] border border-transparent focus:border-premium-200 outline-none shadow-inner text-sm font-bold text-slate-700 transition-all focus:ring-4 focus:ring-premium-100/50" />
           </div>

           <div className="space-y-6 relative z-10">
              {filteredTemplates.map(t => (
                <div key={t.id} className="p-8 bg-white/60 rounded-[2.5rem] border border-white shadow-sm hover:shadow-lg transition-shadow duration-300 group">
                   <div className="flex flex-col md:flex-row justify-between gap-6 mb-6">
                      <div className="flex-1 space-y-4">
                         <div className="flex flex-col md:flex-row gap-4">
                            <input value={t.name} onChange={(e) => handleTemplateUpdate(t.id, 'name', e.target.value)} onFocus={() => isEditingRef.current = true} onBlur={() => handleSaveTemplateRow(t)} className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-sm text-slate-800 shadow-sm focus:ring-2 focus:ring-premium-500 focus:border-premium-500 outline-none" placeholder="Label Identifier" />
                            <select value={t.category} onChange={(e) => handleTemplateUpdate(t.id, 'category', e.target.value)} onFocus={() => isEditingRef.current = true} onBlur={() => handleSaveTemplateRow(t)} className="w-full md:w-48 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 shadow-sm outline-none cursor-pointer">
                               {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                         </div>
                         <input value={t.subject} onChange={(e) => handleTemplateUpdate(t.id, 'subject', e.target.value)} onFocus={() => isEditingRef.current = true} onBlur={() => handleSaveTemplateRow(t)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black uppercase text-indigo-700 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="PERIHAL SURAT CETAK" />
                      </div>
                      <button onClick={() => handleTemplateDelete(t.id)} className="w-12 h-12 flex items-center justify-center shrink-0 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-colors shadow-inner"><Trash2 size={20}/></button>
                   </div>
                   <textarea value={t.content} onChange={(e) => handleTemplateUpdate(t.id, 'content', e.target.value)} onFocus={() => isEditingRef.current = true} onBlur={() => handleSaveTemplateRow(t)} rows={8} className="w-full p-6 bg-slate-50/50 border border-slate-200 rounded-[2rem] text-xs font-mono leading-loose text-slate-700 focus:bg-white focus:ring-2 focus:ring-premium-500 outline-none custom-scrollbar" placeholder="Isi naskah..." />
                </div>
              ))}
              {filteredTemplates.length === 0 && (
                <div className="py-20 text-center bg-white/40 backdrop-blur-md rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center">
                  <FileText size={48} className="text-slate-300 mb-4" />
                  <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Tidak ada templat ditemukan</p>
                </div>
              )}
           </div>
        </div>
      )}

      {/* CONTENT: STAFF TAB */}
      {activeTab === 'staff' && (
        <div className="bg-white/80 backdrop-blur-2xl rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 p-8 md:p-10 animate-fade-in relative overflow-hidden">
           <div className="absolute top-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 relative z-10">
              <div>
                 <h3 className="text-3xl font-black text-slate-800 tracking-tight">Database Personil</h3>
                 <p className="text-slate-500 text-sm font-bold mt-1">Hierarki dan data referensi GTK lembaga.</p>
              </div>
              <button onClick={handleAddStaff} disabled={loading} className="flex items-center justify-center w-full md:w-auto gap-3 px-8 py-4 bg-premium-600 text-white rounded-[1.25rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-premium-600/20 hover:-translate-y-1 hover:shadow-premium-600/40 transition-all"><Plus size={18} /> Tambah Personil</button>
           </div>

           <div className="flex flex-col lg:flex-row gap-6 mb-8 relative z-10">
              <div className="flex bg-white/60 p-1.5 rounded-[1.5rem] shadow-inner shrink-0 border border-white overflow-x-auto custom-scrollbar">
                {(['reg', 'pppk', 'extra', 'tukang'] as const).map(cat => (
                  <button key={cat} onClick={() => setStaffCategory(cat)} className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 min-w-[100px] ${staffCategory === cat ? 'bg-gradient-to-b from-white to-slate-50 text-premium-700 shadow-md ring-1 ring-slate-100 scale-105 z-10' : 'text-slate-400 hover:text-slate-600 hover:bg-white/40'}`}>
                    {cat}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 group">
                <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-within:text-premium-600 transition-colors" />
                <input type="text" placeholder="Pencarian cepat nama/NIP..." value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-white/60 focus:bg-white border border-white focus:border-premium-200 rounded-[1.5rem] outline-none shadow-inner text-sm font-bold text-slate-700 transition-all focus:ring-4 focus:ring-premium-100/50" />
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative z-10">
              {filteredStaff.map((s, idx) => (
                <div key={s.id} className="p-6 bg-white/80 backdrop-blur-md rounded-[2rem] border border-white/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 group">
                  <div className="flex justify-between items-start">
                     <div className="w-10 h-10 rounded-[1.25rem] bg-premium-50 text-premium-600 flex items-center justify-center font-black text-sm shadow-inner group-hover:scale-110 transition-transform">{idx + 1}</div>
                     <button onClick={() => handleStaffDelete(s.id)} className="w-10 h-10 flex items-center justify-center bg-transparent hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-xl transition-colors"><Trash2 size={18}/></button>
                  </div>
                  <div className="space-y-3 flex-1 mt-2">
                    <input value={s.name} onChange={(e) => handleStaffChange(s.id, 'name', e.target.value)} onFocus={() => isEditingRef.current = true} onBlur={() => handleSaveStaffRow(s)} className="w-full px-4 py-3 bg-white/50 focus:bg-white border focus:border-premium-200 border-white rounded-[1.25rem] font-black text-sm text-slate-800 shadow-sm outline-none transition-all" placeholder="NAMA LENGKAP & GELAR" />
                    <div className="grid grid-cols-2 gap-3">
                       <input value={s.nip} onChange={(e) => handleStaffChange(s.id, 'nip', e.target.value)} onFocus={() => isEditingRef.current = true} onBlur={() => handleSaveStaffRow(s)} className="w-full px-4 py-2.5 bg-slate-50/50 focus:bg-white border border-transparent focus:border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none transition-all" placeholder="1980... / NIK" />
                       <input value={s.rank} onChange={(e) => handleStaffChange(s.id, 'rank', e.target.value)} onFocus={() => isEditingRef.current = true} onBlur={() => handleSaveStaffRow(s)} className="w-full px-4 py-2.5 bg-slate-50/50 focus:bg-white border border-transparent focus:border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none transition-all" placeholder="Pangkat/Golongan" />
                    </div>
                  </div>
                </div>
              ))}
              {filteredStaff.length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-400 flex flex-col items-center gap-4 bg-white/40 backdrop-blur-md rounded-[3rem] border-2 border-dashed border-slate-200">
                   <Users size={48} className="text-slate-300"/>
                   <p className="text-xs font-black uppercase tracking-widest">Tidak ada personil dalam kategori ini</p>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
