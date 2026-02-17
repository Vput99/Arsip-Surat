
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

  const filteredStaff = allStaff.filter(s => 
    s.category === staffCategory && 
    (s.name.toLowerCase().includes(staffSearch.toLowerCase()) || s.nip.includes(staffSearch))
  );

  const filteredTemplates = allTemplates.filter(t => 
    t.name.toLowerCase().includes(templateSearch.toLowerCase()) || 
    t.category.toLowerCase().includes(templateSearch.toLowerCase())
  );

  if (!config) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-indigo-600" /></div>;

  const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1";
  const inputClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm transition-all";

  return (
    <div className="max-w-5xl mx-auto py-6 animate-fade-in pb-20">
      
      {/* Header & Tabs */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden mb-6">
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-600/20 to-violet-600/20"></div>
          <div className="relative z-10 flex flex-col items-center">
            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Pengaturan Sistem</h2>
            <p className="text-slate-400 text-sm max-w-md">Kelola identitas sekolah, naskah template, dan database personil.</p>
          </div>
          <div className="absolute top-6 right-6 z-10">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${dbStatus.firebase ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
              <Database size={12} />
              {dbStatus.firebase ? 'Realtime Online' : 'Realtime Offline'}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100">
          <button onClick={() => setActiveTab('profile')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'profile' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-500 hover:text-indigo-500 hover:bg-slate-50'}`}><School size={18} /> Profil</button>
          <button onClick={() => setActiveTab('templates')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'templates' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-500 hover:text-indigo-500 hover:bg-slate-50'}`}><FileText size={18} /> Template</button>
          <button onClick={() => setActiveTab('staff')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'staff' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-500 hover:text-indigo-500 hover:bg-slate-50'}`}><Users size={18} /> Personil</button>
          <button onClick={() => setActiveTab('maintenance')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'maintenance' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-500 hover:text-indigo-500 hover:bg-slate-50'}`}><ShieldCheck size={18} /> Pemeliharaan</button>
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
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 animate-fade-in">
             <form onSubmit={handleSubmitProfile} className="space-y-10">
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
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                 <div className="bg-indigo-100 text-indigo-600 p-4 rounded-2xl w-fit"><Download size={28}/></div>
                 <h3 className="text-xl font-black text-slate-800">Ekspor Backup Utama</h3>
                 <p className="text-sm text-slate-500 leading-relaxed">Unduh seluruh database (Profil, Personil, Templat, dan Arsip Surat) ke dalam file JSON tunggal untuk cadangan offline di komputer sekolah.</p>
                 <button onClick={handleBackup} disabled={backupLoading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-indigo-100">
                    {backupLoading ? <Loader2 className="animate-spin" /> : <Download size={18}/>} Unduh Backup (.json)
                 </button>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                 <div className="bg-emerald-100 text-emerald-600 p-4 rounded-2xl w-fit"><RefreshCw size={28}/></div>
                 <h3 className="text-xl font-black text-slate-800">Kalibrasi Templat</h3>
                 <p className="text-sm text-slate-500 leading-relaxed">Gunakan fitur ini jika templat surat standar (SPT, SPPD, Notulen) hilang atau rusak. Sistem akan mengunduh ulang versi terbaru dari cloud.</p>
                 <button onClick={handleInitDb} disabled={initLoading} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-emerald-100">
                    {initLoading ? <Loader2 className="animate-spin" /> : <RefreshCw size={18}/>} Sinkron Ulang Templat
                 </button>
              </div>
           </div>

           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                 <div className="bg-slate-900 text-white p-2 rounded-xl"><History size={20}/></div>
                 <h3 className="text-xl font-black text-slate-800">Histori Audit Sistem</h3>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                 {logs.map(log => (
                    <div key={log.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                       <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 shrink-0"><Clock size={20}/></div>
                       <div className="flex-1">
                          <div className="flex justify-between items-start">
                             <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">{log.module}</span>
                             <span className="text-[10px] font-bold text-slate-400">{format(new Date(log.timestamp), 'dd MMM yyyy, HH:mm', { locale: id })}</span>
                          </div>
                          <p className="text-sm font-black text-slate-800 mt-1">{log.action}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{log.details}</p>
                       </div>
                    </div>
                 ))}
                 {logs.length === 0 && <p className="text-center py-10 text-slate-400 font-bold uppercase text-xs">Belum ada catatan aktivitas.</p>}
              </div>
           </div>
        </div>
      )}

      {/* CONTENT: TEMPLATE TAB */}
      {activeTab === 'templates' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8 animate-fade-in">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div><h3 className="text-lg font-black text-slate-800">Manajemen Template</h3><p className="text-slate-500 text-sm">Sesuaikan naskah template surat yang muncul di editor.</p></div>
              <button onClick={handleAddTemplate} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20"><Plus size={18} /> Tambah Template</button>
           </div>
           
           <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Cari template..." value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
           </div>

           <div className="space-y-4">
              {filteredTemplates.map(t => (
                <div key={t.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group">
                   <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                      <div className="flex-1 space-y-3">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input value={t.name} onChange={(e) => handleTemplateUpdate(t.id, 'name', e.target.value)} onFocus={() => isEditingRef.current = true} onBlur={() => handleSaveTemplateRow(t)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-sm" placeholder="Nama Template" />
                            <select value={t.category} onChange={(e) => handleTemplateUpdate(t.id, 'category', e.target.value)} onFocus={() => isEditingRef.current = true} onBlur={() => handleSaveTemplateRow(t)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm">
                               {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                         </div>
                         <input value={t.subject} onChange={(e) => handleTemplateUpdate(t.id, 'subject', e.target.value)} onFocus={() => isEditingRef.current = true} onBlur={() => handleSaveTemplateRow(t)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-black uppercase" placeholder="Judul Surat / Perihal" />
                      </div>
                      <button onClick={() => handleTemplateDelete(t.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={18}/></button>
                   </div>
                   <textarea value={t.content} onChange={(e) => handleTemplateUpdate(t.id, 'content', e.target.value)} onFocus={() => isEditingRef.current = true} onBlur={() => handleSaveTemplateRow(t)} rows={6} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-mono leading-relaxed" placeholder="Isi naskah..." />
                </div>
              ))}
           </div>
        </div>
      )}

      {/* CONTENT: STAFF TAB */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8 animate-fade-in">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div><h3 className="text-lg font-black text-slate-800">Manajemen Personil</h3><p className="text-slate-500 text-sm">Atur urutan dan data Guru & Pegawai.</p></div>
              <button onClick={handleAddStaff} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm"><Plus size={18} /> Tambah Personil</button>
           </div>

           <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                {(['reg', 'pppk', 'extra', 'tukang'] as const).map(cat => (
                  <button key={cat} onClick={() => setStaffCategory(cat)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${staffCategory === cat ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                    {cat}
                  </button>
                ))}
              </div>
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Cari nama atau NIP..." value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStaff.map((s, idx) => (
                <div key={s.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex gap-4 group">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0">{idx + 1}</div>
                  <div className="flex-1 space-y-3">
                    <input value={s.name} onChange={(e) => handleStaffChange(s.id, 'name', e.target.value)} onFocus={() => isEditingRef.current = true} onBlur={() => handleSaveStaffRow(s)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-sm" placeholder="Nama Lengkap" />
                    <div className="grid grid-cols-2 gap-2">
                       <input value={s.nip} onChange={(e) => handleStaffChange(s.id, 'nip', e.target.value)} onFocus={() => isEditingRef.current = true} onBlur={() => handleSaveStaffRow(s)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs" placeholder="NIP" />
                       <input value={s.rank} onChange={(e) => handleStaffChange(s.id, 'rank', e.target.value)} onFocus={() => isEditingRef.current = true} onBlur={() => handleSaveStaffRow(s)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs" placeholder="Jabatan/Pangkat" />
                    </div>
                  </div>
                  <button onClick={() => handleStaffDelete(s.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors shrink-0"><Trash2 size={16}/></button>
                </div>
              ))}
              {filteredStaff.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 flex flex-col items-center gap-3">
                   <Users size={32} className="opacity-20"/>
                   <p className="text-xs font-bold uppercase tracking-widest">Belum ada data personil di kategori ini</p>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
