import React, { useState, useEffect, useRef } from 'react';
import { Save, Upload, School, Loader2, Info, Building2, UserCircle, Database, AlertCircle, CheckCircle2, Users, Plus, Trash2, Search, Filter, UserCheck, Briefcase, ListOrdered, Mail } from 'lucide-react';
import { subscribeToConfig, saveSchoolConfig, subscribeToConnectionStatus, subscribeToStaff, saveStaff, deleteStaff, StaffMember } from '../services/storage';
import { SchoolConfig } from '../types';

type SettingsTab = 'profile' | 'staff';
type StaffCategory = 'reg' | 'pppk' | 'extra' | 'tukang';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [dbConnected, setDbConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Staff State
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [staffCategory, setStaffCategory] = useState<StaffCategory>('reg');
  const [staffSearch, setStaffSearch] = useState('');
  const isEditingRef = useRef(false);

  useEffect(() => {
    const unsubscribeConfig = subscribeToConfig((newConfig) => {
      setConfig(newConfig);
    });
    const unsubscribeDb = subscribeToConnectionStatus((isConnected) => {
      setDbConnected(isConnected);
    });
    
    // Subscribe Staff Data
    const unsubscribeStaff = subscribeToStaff((data) => {
      if (!isEditingRef.current) {
        setAllStaff(data);
      }
    });

    return () => {
      unsubscribeConfig();
      unsubscribeDb();
      unsubscribeStaff();
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
      console.error(err);
      setMessage({ 
        text: `Gagal menyimpan: ${err.message}.`, 
        type: 'error' 
      });
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
      orderIndex: existingCount + 1, // Auto increment order
      createdAt: new Date().toISOString()
    };
    await saveStaff(newMember);
    setLoading(false);
  };

  const handleStaffChange = async (id: string, field: keyof StaffMember, value: string | number) => {
    const member = allStaff.find(s => s.id === id);
    if (member) {
      const updatedMember = { ...member, [field]: value };
      setAllStaff(allStaff.map(s => s.id === id ? updatedMember : s)); 
    }
  };

  const handleSaveStaffRow = async (staff: StaffMember) => {
    setLoading(true);
    try {
      await saveStaff(staff);
      setMessage({ text: 'Data personil tersimpan.', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 2000);
    } catch (e) {
      setMessage({ text: 'Gagal menyimpan personil.', type: 'error' });
    }
    setLoading(false);
    isEditingRef.current = false;
  };

  const handleRemoveStaff = async (id: string) => {
    if (window.confirm("Hapus personil ini dari database?")) {
      setLoading(true);
      await deleteStaff(id);
      setLoading(false);
    }
  };

  const filteredStaff = allStaff.filter(s => 
    s.category === staffCategory && 
    (s.name.toLowerCase().includes(staffSearch.toLowerCase()) || s.nip.includes(staffSearch))
  );

  if (!config) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-slate-500 font-medium">Memuat konfigurasi...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 animate-fade-in pb-20">
      
      {/* Header & Tabs */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden mb-6">
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-600/20 to-violet-600/20"></div>
          <div className="relative z-10 flex flex-col items-center">
            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Pengaturan Sistem</h2>
            <p className="text-slate-400 text-sm max-w-md">Kelola identitas sekolah dan database personil guru/pegawai.</p>
          </div>
          <div className="absolute top-6 right-6 z-10">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${dbConnected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
              <Database size={12} />
              {dbConnected ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'profile' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-500 hover:text-indigo-500 hover:bg-slate-50'}`}
          >
            <School size={18} /> Profil Sekolah
          </button>
          <button 
            onClick={() => setActiveTab('staff')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'staff' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-500 hover:text-indigo-500 hover:bg-slate-50'}`}
          >
            <Users size={18} /> Database Personil
          </button>
        </div>
      </div>

      {/* Feedback Messages */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-fade-in ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' : 'bg-rose-50 border border-rose-100 text-rose-700'}`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-bold">{message.text}</span>
        </div>
      )}

      {/* CONTENT: PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
           <form onSubmit={handleSubmitProfile} className="space-y-10">
             {/* 1. Logo Section */}
             <section>
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                 <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg"><Building2 size={16}/></span>
                 Logo Header (Kop)
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Logo Daerah */}
                  <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logo Daerah (Kiri)</span>
                    <div className="relative group">
                      <div className="w-28 h-28 bg-white rounded-2xl flex items-center justify-center p-3 shadow-sm border border-slate-200 overflow-hidden">
                        {config.logoDaerahUrl ? <img src={config.logoDaerahUrl} alt="Logo" className="w-full h-full object-contain" /> : <Building2 className="text-slate-200 w-12 h-12" />}
                      </div>
                      <label className="absolute inset-0 bg-indigo-600/80 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-[2px]">
                        <Upload size={24} className="mb-1" />
                        <span className="text-[10px] font-bold">Ganti</span>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, 'logoDaerahUrl')} />
                      </label>
                    </div>
                  </div>
                  {/* Logo Sekolah */}
                  <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logo Sekolah (Kanan)</span>
                    <div className="relative group">
                      <div className="w-28 h-28 bg-white rounded-2xl flex items-center justify-center p-3 shadow-sm border border-slate-200 overflow-hidden">
                        {config.logoUrl ? <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <School className="text-slate-200 w-12 h-12" />}
                      </div>
                      <label className="absolute inset-0 bg-indigo-600/80 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-[2px]">
                        <Upload size={24} className="mb-1" />
                        <span className="text-[10px] font-bold">Ganti</span>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, 'logoUrl')} />
                      </label>
                    </div>
                  </div>
               </div>
             </section>

             <div className="h-px bg-slate-100 w-full"></div>

             {/* 2. Text Config */}
             <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
               <div className="space-y-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Informasi Utama</h3>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nama Sekolah</label>
                      <input name="name" value={config.name} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">NPSN</label>
                        <input name="npsn" value={config.npsn} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 text-sm" placeholder="20xxxxxx" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Sekolah</label>
                        <input name="email" value={config.email} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 text-sm" placeholder="sekolah@mail.com" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Kop Baris 1</label>
                      <input name="headerLine1" value={config.headerLine1} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Kop Baris 2</label>
                      <input name="headerLine2" value={config.headerLine2} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 text-sm" />
                    </div>
                  </div>
               </div>
               <div className="space-y-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Pejabat & Kontak</h3>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Kepala Sekolah</label>
                      <input name="principalName" value={config.principalName} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">NIP Kepsek</label>
                      <input name="principalNip" value={config.principalNip} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Alamat</label>
                      <textarea name="address" rows={2} value={config.address} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 text-sm resize-none" />
                    </div>
                  </div>
               </div>
             </section>

             <button type="submit" disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-3 group">
               {loading ? <Loader2 className="animate-spin" /> : <Save className="group-hover:scale-110 transition-transform"/>}
               Simpan Profil
             </button>
           </form>
        </div>
      )}

      {/* CONTENT: STAFF TAB */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h3 className="text-lg font-black text-slate-800">Manajemen Personil</h3>
                <p className="text-slate-500 text-sm">Atur urutan dan data Guru & Pegawai.</p>
              </div>
              <button onClick={handleAddStaff} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all">
                {loading ? <Loader2 className="animate-spin" size={18}/> : <Plus size={18} />} Tambah Personil
              </button>
           </div>

           {/* Filters */}
           <div className="flex flex-col md:flex-row gap-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Cari nama atau NIP..." 
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                 {[
                   { id: 'reg', label: 'Guru/PNS' }, 
                   { id: 'pppk', label: 'PPPK' }, 
                   { id: 'extra', label: 'Ekstrakurikuler' }, 
                   { id: 'tukang', label: 'Tukang' }
                 ].map(cat => (
                   <button 
                     key={cat.id}
                     onClick={() => setStaffCategory(cat.id as StaffCategory)}
                     className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${staffCategory === cat.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                   >
                     {cat.label}
                   </button>
                 ))}
              </div>
           </div>

           {/* Staff List */}
           <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
             {filteredStaff.length === 0 ? (
               <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                 <Users className="mx-auto text-slate-300 mb-2" size={32} />
                 <p className="text-slate-400 font-medium text-sm">Belum ada data personil di kategori ini.</p>
               </div>
             ) : (
               filteredStaff.map((staff, idx) => (
                 <div key={staff.id} className="group bg-white border border-slate-200 rounded-xl p-4 transition-all hover:shadow-lg hover:border-indigo-200">
                   <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      
                      {/* No Urut Field */}
                      <div className="md:col-span-1 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                          <ListOrdered size={10} /> No
                        </label>
                        <input 
                          type="number"
                          value={staff.orderIndex || 99} 
                          onFocus={() => isEditingRef.current = true}
                          onBlur={(e) => handleStaffChange(staff.id, 'orderIndex', parseInt(e.target.value))}
                          onChange={(e) => setAllStaff(allStaff.map(s => s.id === staff.id ? {...s, orderIndex: parseInt(e.target.value)} : s))}
                          className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-center focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                        <input 
                          value={staff.name} 
                          onFocus={() => isEditingRef.current = true}
                          onBlur={(e) => handleStaffChange(staff.id, 'name', e.target.value)} 
                          onChange={(e) => setAllStaff(allStaff.map(s => s.id === staff.id ? {...s, name: e.target.value} : s))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="Nama Personil"
                        />
                      </div>
                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">NIP / ID</label>
                        <input 
                          value={staff.nip} 
                          onFocus={() => isEditingRef.current = true}
                          onBlur={(e) => handleStaffChange(staff.id, 'nip', e.target.value)}
                          onChange={(e) => setAllStaff(allStaff.map(s => s.id === staff.id ? {...s, nip: e.target.value} : s))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="-"
                        />
                      </div>
                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Jabatan</label>
                        <input 
                          value={staff.rank} 
                          onFocus={() => isEditingRef.current = true}
                          onBlur={(e) => handleStaffChange(staff.id, 'rank', e.target.value)}
                          onChange={(e) => setAllStaff(allStaff.map(s => s.id === staff.id ? {...s, rank: e.target.value} : s))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="Guru Kelas / Staff"
                        />
                      </div>
                      <div className="md:col-span-2 flex gap-2">
                        <button 
                          onClick={() => handleSaveStaffRow(staff)} 
                          className="flex-1 py-2 bg-emerald-50 text-emerald-600 rounded-lg font-bold text-xs hover:bg-emerald-100 flex items-center justify-center gap-1"
                          title="Simpan Perubahan"
                        >
                          <Save size={14} /> Simpan
                        </button>
                        <button 
                          onClick={() => handleRemoveStaff(staff.id)} 
                          className="px-3 py-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 hover:text-rose-600 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                   </div>
                 </div>
               ))
             )}
           </div>
        </div>
      )}

    </div>
  );
};

export default Settings;