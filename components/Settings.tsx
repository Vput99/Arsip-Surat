
import React, { useState, useEffect, useRef } from 'react';
import { Save, Upload, School, Loader2, Info, Building2, Database, AlertCircle, CheckCircle2, Users, Plus, Trash2, Search, ListOrdered, FileText, Layout, Type } from 'lucide-react';
import { subscribeToConfig, saveSchoolConfig, subscribeToConnectionStatus, subscribeToStaff, saveStaff, deleteStaff, StaffMember, subscribeToTemplates, saveTemplate, deleteTemplate, LetterTemplate } from '../services/storage';
import { SchoolConfig } from '../types';
import { CATEGORIES } from '../constants';

type SettingsTab = 'profile' | 'staff' | 'templates';
type StaffCategory = 'reg' | 'pppk' | 'extra' | 'tukang';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  // Fix: updated state from boolean to object to match subscribeToConnectionStatus signature
  const [dbStatus, setDbStatus] = useState({ turso: false, firebase: false });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

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
    // Fix: passing setDbStatus directly as its signature matches (status: { turso: boolean; firebase: boolean; }) => void
    const unsubscribeDb = subscribeToConnectionStatus(setDbStatus);
    const unsubscribeStaff = subscribeToStaff((data) => {
      if (!isEditingRef.current) setAllStaff(data);
    });
    const unsubscribeTemplates = subscribeToTemplates((data) => {
      if (!isEditingRef.current) setAllTemplates(data);
    });

    return () => {
      unsubscribeConfig();
      unsubscribeDb();
      unsubscribeStaff();
      unsubscribeTemplates();
    };
  }, []);

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
      setMessage({ text: `Gagal menyimpan: ${err.message}.`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // --- STAFF FUNCTIONS ---
  const handleAddStaff = async () => {
    setLoading(true);
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
    setLoading(false);
  };

  const handleStaffChange = (id: string, field: keyof StaffMember, value: string | number) => {
    setAllStaff(allStaff.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSaveStaffRow = async (staff: StaffMember) => {
    setLoading(true);
    await saveStaff(staff);
    setMessage({ text: 'Data personil tersimpan.', type: 'success' });
    setTimeout(() => setMessage({ text: '', type: '' }), 2000);
    setLoading(false);
    isEditingRef.current = false;
  };

  // --- TEMPLATE FUNCTIONS ---
  const handleAddTemplate = async () => {
    setLoading(true);
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
    setLoading(false);
    setActiveTab('templates');
  };

  const handleTemplateUpdate = (id: string, field: keyof LetterTemplate, value: string) => {
    setAllTemplates(allTemplates.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleSaveTemplateRow = async (template: LetterTemplate) => {
    setLoading(true);
    await saveTemplate(template);
    setMessage({ text: 'Template surat tersimpan.', type: 'success' });
    setTimeout(() => setMessage({ text: '', type: '' }), 2000);
    setLoading(false);
    isEditingRef.current = false;
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
            {/* Fix: utilizing dbStatus.turso for the archive database status display */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${dbStatus.turso ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
              <Database size={12} />
              {dbStatus.turso ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100">
          <button onClick={() => setActiveTab('profile')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'profile' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-500 hover:text-indigo-500 hover:bg-slate-50'}`}><School size={18} /> Profil</button>
          <button onClick={() => setActiveTab('templates')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'templates' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-500 hover:text-indigo-500 hover:bg-slate-50'}`}><FileText size={18} /> Template</button>
          <button onClick={() => setActiveTab('staff')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'staff' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-500 hover:text-indigo-500 hover:bg-slate-50'}`}><Users size={18} /> Personil</button>
        </div>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-fade-in ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' : 'bg-rose-50 border border-rose-100 text-rose-700'}`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-bold">{message.text}</span>
        </div>
      )}

      {/* CONTENT: PROFILE TAB */}
      {activeTab === 'profile' && (
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
               <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Data Sekolah</h3>
                  <div className="space-y-4">
                    <input name="name" value={config.name} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" placeholder="Nama Sekolah" />
                    <div className="grid grid-cols-2 gap-4">
                      <input name="npsn" value={config.npsn} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl outline-none font-bold text-sm" placeholder="NPSN" />
                      <input name="email" value={config.email} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl outline-none font-bold text-sm" placeholder="Email" />
                    </div>
                    <input name="headerLine1" value={config.headerLine1} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl outline-none text-sm" placeholder="Header Baris 1" />
                    <input name="headerLine2" value={config.headerLine2} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl outline-none text-sm" placeholder="Header Baris 2" />
                  </div>
               </div>
               <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Pejabat</h3>
                  <div className="space-y-4">
                    <input name="principalName" value={config.principalName} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl outline-none font-bold text-sm" placeholder="Nama Kepala Sekolah" />
                    <input name="principalNip" value={config.principalNip} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl outline-none text-sm" placeholder="NIP Kepala Sekolah" />
                    <textarea name="address" rows={2} value={config.address} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl outline-none text-sm resize-none" placeholder="Alamat Lengkap" />
                  </div>
               </div>
             </section>
             <button type="submit" disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-3">{loading ? <Loader2 className="animate-spin" /> : <Save />}Simpan Profil</button>
           </form>
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
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Cari naskah template..." value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none" />
           </div>
           <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
             {filteredTemplates.map((t) => (
               <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-indigo-300 transition-all">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
                    <div className="lg:col-span-2 space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Template</label>
                      <input value={t.name} onFocus={() => isEditingRef.current = true} onBlur={() => handleSaveTemplateRow(t)} onChange={(e) => handleTemplateUpdate(t.id, 'name', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border-slate-200 rounded-lg text-sm font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori</label>
                      <select value={t.category} onFocus={() => isEditingRef.current = true} onBlur={() => handleSaveTemplateRow(t)} onChange={(e) => handleTemplateUpdate(t.id, 'category', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border-slate-200 rounded-lg text-sm font-bold">
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Layout</label>
                      <select value={t.layout} onFocus={() => isEditingRef.current = true} onBlur={() => handleSaveTemplateRow(t)} onChange={(e) => handleTemplateUpdate(t.id, 'layout', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border-slate-200 rounded-lg text-sm font-bold">
                        <option value="centered">Centered (SK/SPT)</option>
                        <option value="standard">Standard (Biasa)</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1 mb-4">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Judul Default</label>
                     <input value={t.subject} onFocus={() => isEditingRef.current = true} onBlur={() => handleSaveTemplateRow(t)} onChange={(e) => handleTemplateUpdate(t.id, 'subject', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border-slate-200 rounded-lg text-sm font-bold" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Isi Naskah (Mendukung [PAGE_BREAK])</label>
                     <textarea rows={6} value={t.content} onFocus={() => isEditingRef.current = true} onBlur={() => handleSaveTemplateRow(t)} onChange={(e) => handleTemplateUpdate(t.id, 'content', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border-slate-200 rounded-lg text-xs font-mono leading-relaxed resize-y" />
                  </div>
                  <div className="flex justify-end mt-4 pt-4 border-t border-slate-100 gap-3">
                    <button onClick={async () => { if(confirm('Hapus template?')){ await deleteTemplate(t.id); } }} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-lg font-bold text-xs flex items-center gap-1 hover:bg-rose-100 transition-colors"><Trash2 size={14} /> Hapus</button>
                    <button onClick={() => handleSaveTemplateRow(t)} className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs flex items-center gap-1 hover:bg-indigo-700 transition-all shadow-md"><Save size={14} /> Simpan Perubahan</button>
                  </div>
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
           <div className="flex flex-col md:flex-row gap-4 mb-6 bg-slate-50 p-4 rounded-2xl">
              <div className="flex-1 relative"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Cari nama atau NIP..." value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none" /></div>
              <div className="flex gap-2">
                 {['reg', 'pppk', 'extra', 'tukang'].map(cat => <button key={cat} onClick={() => setStaffCategory(cat as StaffCategory)} className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${staffCategory === cat ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>{cat.toUpperCase()}</button>)}
              </div>
           </div>
           <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
             {filteredStaff.map((staff) => (
               <div key={staff.id} className="group bg-white border border-slate-200 rounded-xl p-4 hover:shadow-lg transition-all">
                 <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-1 space-y-1"><label className="text-[10px] font-bold text-slate-400">No</label><input type="number" value={staff.orderIndex} onFocus={() => isEditingRef.current = true} onBlur={() => handleSaveStaffRow(staff)} onChange={(e) => handleStaffChange(staff.id, 'orderIndex', parseInt(e.target.value))} className="w-full px-2 py-2 bg-slate-50 border-slate-200 rounded-lg text-sm text-center font-bold" /></div>
                    <div className="md:col-span-3 space-y-1"><label className="text-[10px] font-bold text-slate-400">Nama</label><input value={staff.name} onFocus={() => isEditingRef.current = true} onBlur={() => handleSaveStaffRow(staff)} onChange={(e) => handleStaffChange(staff.id, 'name', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border-slate-200 rounded-lg text-sm font-bold" /></div>
                    <div className="md:col-span-3 space-y-1"><label className="text-[10px] font-bold text-slate-400">NIP</label><input value={staff.nip} onFocus={() => isEditingRef.current = true} onBlur={() => handleSaveStaffRow(staff)} onChange={(e) => handleStaffChange(staff.id, 'nip', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border-slate-200 rounded-lg text-sm" /></div>
                    <div className="md:col-span-3 space-y-1"><label className="text-[10px] font-bold text-slate-400">Jabatan</label><input value={staff.rank} onFocus={() => isEditingRef.current = true} onBlur={() => handleSaveStaffRow(staff)} onChange={(e) => handleStaffChange(staff.id, 'rank', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border-slate-200 rounded-lg text-sm" /></div>
                    <div className="md:col-span-2 flex gap-2"><button onClick={() => handleSaveStaffRow(staff)} className="flex-1 py-2 bg-emerald-50 text-emerald-600 rounded-lg font-bold text-xs"><Save size={14} /></button><button onClick={async () => { if(confirm('Hapus personil?')){ await deleteStaff(staff.id); } }} className="px-3 py-2 bg-rose-50 text-rose-500 rounded-lg"><Trash2 size={16} /></button></div>
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
