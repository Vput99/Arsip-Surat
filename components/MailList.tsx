
import React, { useEffect, useState } from 'react';
import { Mail, MailType, UrgencyLevel, MailStatus } from '../types';
import { subscribeToMails, deleteMail, subscribeToConfig, saveMail } from '../services/storage';
import { format } from 'date-fns';
import { id } from 'date-fns/locale/id';
import { Plus, Search, Trash2, Eye, Filter, Sparkles, AlertCircle, Download, Calendar, Printer, FileText, ChevronRight, Image as ImageIcon, Clock, FileBadge, X, ExternalLink, Edit, CheckCircle2, PenTool, Upload, MapPin, Wand2, FileCheck, ClipboardList, Loader2, Share2, FileSpreadsheet, Mail as MailIcon } from 'lucide-react';
import MailForm from './MailForm';
import { analyzeLetter, generateSPTFromInvitation, generateSPPDFromSPT, generateLaporanDanNotulen } from '../services/geminiService';
import { SchoolConfig } from '../types';
import { useNavigate } from 'react-router-dom';

interface MailListProps {
  type: MailType;
}

const MailList: React.FC<MailListProps> = ({ type }) => {
  const [mails, setMails] = useState<Mail[]>([]);
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<Mail | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Semua');
  const [selectedMail, setSelectedMail] = useState<Mail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [processingAI, setProcessingAI] = useState(false);
  const [dispositionNote, setDispositionNote] = useState('');
  const [isSavingDisposition, setIsSavingDisposition] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeMails = subscribeToMails((allMails) => {
      const filtered = allMails.filter(m => m.type === type);
      setMails(filtered);
      if (!selectedMail && filtered.length > 0 && window.innerWidth >= 1024) {
        setSelectedMail(filtered[0]);
        setDispositionNote(filtered[0].disposition || '');
      }
    });
    const unsubscribeConfig = subscribeToConfig(setSchoolConfig);
    return () => { unsubscribeMails(); unsubscribeConfig(); };
  }, [type]);

  const filteredMails = React.useMemo(() => {
    return mails.filter(mail => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = mail.subject.toLowerCase().includes(searchLower) || mail.sender.toLowerCase().includes(searchLower);
      const matchesCategory = filterCategory === 'Semua' || mail.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [mails, searchTerm, filterCategory]);

  const exportToCSV = () => {
    const headers = ["Tanggal", "Nomor Surat", "Pengirim/Tujuan", "Perihal", "Kategori", "Urgensi", "Status"];
    const rows = filteredMails.map(m => [
      m.date,
      `"${m.referenceNumber}"`,
      `"${m.sender}"`,
      `"${m.subject}"`,
      m.category,
      m.urgency,
      m.status
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `REKAP_ARSIP_${type.toUpperCase()}_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSelectMail = (mail: Mail) => {
    setSelectedMail(mail);
    setDispositionNote(mail.disposition || '');
    if (window.innerWidth < 1024) setShowDetailModal(true);
  };

  const handlePrint = (mail: Mail) => {
    if (mail.fileUrl) {
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`<iframe width='100%' height='100%' src='${mail.fileUrl}'></iframe>`);
      }
    } else {
      window.print();
    }
  };

  const handleEdit = (mail: Mail, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditData(mail);
    setShowForm(true);
  };

  const handleChainProcess = async (mail: Mail) => {
    setProcessingAI(true);
    try {
      if (mail.type === MailType.INCOMING) {
        const sptContent = await generateSPTFromInvitation(mail);
        navigate('/create', { 
          state: {
            templateId: 't_spt',
            subject: 'SURAT PERINTAH TUGAS',
            content: sptContent
          }
        });
      } else {
        const sppdContent = await generateSPPDFromSPT(mail);
        navigate('/create', { 
          state: {
            templateId: 't_sppd',
            subject: 'SURAT PERINTAH PERJALANAN DINAS',
            content: sppdContent
          }
        });
      }
    } catch (e) {
      alert("Terjadi kesalahan pada pemrosesan berantai AI.");
    } finally {
      setProcessingAI(false);
    }
  };

  const handleGenerateFinalDocs = async (mail: Mail, docType: 'LAPORAN' | 'NOTULEN') => {
    setProcessingAI(true);
    try {
      const content = await generateLaporanDanNotulen(mail, docType);
      navigate('/create', {
        state: {
          templateId: docType === 'LAPORAN' ? 't_laporan_sppd' : 't_notulen',
          subject: docType === 'LAPORAN' ? 'LAPORAN HASIL PERJALANAN DINAS' : 'NOTULEN RAPAT',
          content: content
        }
      });
    } catch (e) {
      alert("Gagal membuat dokumen akhir.");
    } finally {
      setProcessingAI(false);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm('Hapus arsip ini secara permanen?')) {
      await deleteMail(id);
      setSelectedMail(null);
      setShowDetailModal(false);
    }
  };

  const handleSaveDisposition = async () => {
    if (!selectedMail) return;
    setIsSavingDisposition(true);
    await saveMail({ ...selectedMail, disposition: dispositionNote });
    setIsSavingDisposition(false);
    alert('Disposisi berhasil disimpan.');
  };

  const getUrgencyBadge = (u: UrgencyLevel) => {
    const styles = {
      'Biasa': 'bg-slate-100 text-slate-600 border-slate-200',
      'Penting': 'bg-amber-50 text-amber-600 border-amber-200',
      'Segera': 'bg-rose-50 text-rose-600 border-rose-200'
    };
    return styles[u] || styles['Biasa'];
  };

  const DetailContent = ({ mail }: { mail: Mail }) => (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <div className="bg-slate-900 p-6 text-white shrink-0">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-1">{mail.category}</p>
            <h3 className="font-black text-xl leading-tight mb-3 uppercase break-words">{mail.subject}</h3>
            <div className="flex gap-2">
               <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase border ${getUrgencyBadge(mail.urgency)}`}>{mail.urgency}</span>
               <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase border border-white/20 text-white/60">{mail.status}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
             <button onClick={() => handlePrint(mail)} className="p-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg transition-all flex items-center justify-center">
                <Printer size={18} />
             </button>
             <button onClick={(e) => handleEdit(mail, e)} className="p-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl shadow-lg transition-all flex items-center justify-center">
                <Edit size={18} />
             </button>
             <button onClick={(e) => handleDelete(mail.id, e)} className="p-2.5 bg-rose-600 hover:bg-rose-700 rounded-xl shadow-lg transition-all flex items-center justify-center">
                <Trash2 size={18} />
             </button>
          </div>
        </div>
      </div>
      <div className="p-6 overflow-y-auto flex-1 space-y-8 pb-24">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nomor Surat</label>
            <p className="text-sm font-black text-slate-700 break-all">{mail.referenceNumber}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
             <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tanggal Surat</label>
             <p className="text-sm font-black text-slate-700">{format(new Date(mail.date), 'dd MMMM yyyy', { locale: id })}</p>
          </div>
        </div>
        <div className="space-y-2">
           <label className="text-[10px] font-bold text-slate-400 uppercase block">Ringkasan / Isi</label>
           <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-100 italic relative">
             <div className="absolute top-4 left-4 text-slate-200"><FileText size={40} /></div>
             <p className="relative z-10">"{mail.description}"</p>
           </div>
        </div>
        <div className="space-y-4">
           <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-indigo-600" />
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Alur Kerja AI Berantai</h4>
           </div>
           {mail.type === MailType.INCOMING ? (
             <button onClick={() => handleChainProcess(mail)} disabled={processingAI} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-xl">
               {processingAI ? <Loader2 size={20} className="animate-spin" /> : <Wand2 size={20} />}
               BUAT SURAT TUGAS (SPT) OTOMATIS ✨
             </button>
           ) : (
             <div className="grid grid-cols-1 gap-3">
                <button onClick={() => handleChainProcess(mail)} disabled={processingAI} className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-3">
                  {processingAI ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                  PROSES JADI SPPD ✨
                </button>
                <div className="grid grid-cols-2 gap-3">
                   <button onClick={() => handleGenerateFinalDocs(mail, 'LAPORAN')} disabled={processingAI} className="py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2">
                     <FileCheck size={16} /> LAPORAN SPPD
                   </button>
                   <button onClick={() => handleGenerateFinalDocs(mail, 'NOTULEN')} disabled={processingAI} className="py-3.5 bg-violet-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2">
                     <ClipboardList size={16} /> NOTULEN RAPAT
                   </button>
                </div>
             </div>
           )}
        </div>
        {mail.type === MailType.INCOMING && (
          <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 space-y-3">
            <label className="text-[10px] font-black text-amber-700 uppercase flex items-center gap-1.5">
              <PenTool size={14} /> Lembar Disposisi Kepala Sekolah
            </label>
            <textarea value={dispositionNote} onChange={(e) => setDispositionNote(e.target.value)} className="w-full bg-white border border-amber-200 rounded-xl p-4 text-xs" placeholder="Tulis instruksi kepala sekolah di sini..." />
            <button onClick={handleSaveDisposition} disabled={isSavingDisposition} className="w-full py-3 bg-amber-600 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2">
              {isSavingDisposition ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Simpan Disposisi
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 h-[calc(100vh-100px)] flex flex-col relative animate-fade-in pl-4 pr-1 z-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-4 relative z-10">
        <div>
          <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-premium-700 via-indigo-600 to-indigo-400 tracking-tighter drop-shadow-sm uppercase">
            {type === MailType.INCOMING ? 'Arsip Masuk' : 'Arsip Keluar'}
          </h2>
          <p className="text-slate-500 font-bold text-sm tracking-widest mt-2 uppercase opacity-70">
            Intelligent Document Archive & Management System
          </p>
        </div>
        <div className="flex gap-4">
           <button onClick={exportToCSV} className="px-8 py-4 glass-panel text-slate-600 rounded-[1.5rem] shadow-lg font-black text-[11px] flex items-center gap-3 hover:bg-white/90 hover:-translate-y-1 transition-all duration-300 uppercase tracking-[0.2em] border border-white/40">
             <FileSpreadsheet size={20} className="text-emerald-500" /> EXCEL
           </button>
           <button onClick={() => { setEditData(null); setShowForm(true); }} className="px-10 py-4 bg-gradient-to-tr from-premium-600 to-indigo-500 hover:from-premium-500 hover:to-indigo-400 text-white rounded-[1.5rem] shadow-[0_15px_35px_-5px_rgba(148,64,255,0.4)] font-black text-[11px] flex items-center gap-3 hover:-translate-y-1 transition-all duration-300 uppercase tracking-[0.25em] ring-1 ring-white/30">
             <Plus size={20} /> TAMBAH ARSIP
           </button>
        </div>
      </div>

      <div className="glass-panel p-5 rounded-[2.5rem] shadow-xl border border-white/40 flex flex-col md:flex-row gap-5 px-8 relative z-10 mx-1">
        <div className="relative flex-1 group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-premium-400 group-within:text-premium-600 transition-colors" size={22} />
          <input type="text" placeholder="Cari naskah, pengirim, atau perihal..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-16 pr-6 py-4 glass-input focus:bg-white/80 rounded-[1.5rem] outline-none text-sm font-bold text-slate-700 transition-all shadow-inner border border-white/20" />
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-8 py-4 glass-input focus:bg-white/80 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest text-slate-600 outline-none cursor-pointer transition-all shadow-inner border border-white/20">
          <option value="Semua">Semua Kategori</option>
          {Array.from(new Set(mails.map(m => m.category))).map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0 overflow-hidden pb-10">
        <div className="lg:col-span-5 xl:col-span-4 overflow-y-auto pr-3 space-y-5 custom-scrollbar">
          {filteredMails.length > 0 ? filteredMails.map((mail) => (
            <div key={mail.id} onClick={() => handleSelectMail(mail)} className={`group p-8 rounded-[2.5rem] border-2 transition-all duration-500 cursor-pointer backdrop-blur-2xl relative overflow-hidden ${selectedMail?.id === mail.id ? 'bg-white/90 border-premium-400 shadow-[0_20px_50px_-15px_rgba(148,64,255,0.3)] ring-4 ring-premium-100/50 scale-[1.03]' : 'glass-card border-white/40 hover:bg-white/80 hover:border-premium-200 hover:shadow-2xl hover:-translate-y-1.5'}`}>
              <div className="flex justify-between items-start mb-5 relative z-10">
                <span className={`text-[9px] font-black px-4 py-2 rounded-xl uppercase tracking-[0.25em] shadow-sm ${selectedMail?.id === mail.id ? 'bg-premium-600 text-white' : 'glass-panel text-slate-500 group-hover:text-premium-700 transition-colors'}`}>{mail.category}</span>
                <span className={`text-[10px] font-black uppercase tracking-widest flex items-center ${selectedMail?.id === mail.id ? 'text-premium-500' : 'text-slate-400'}`}><Clock size={14} className="mr-2" /> {format(new Date(mail.date), 'dd MMM')}</span>
              </div>
              <h3 className={`font-black text-xl mb-4 uppercase leading-tight line-clamp-2 tracking-tight ${selectedMail?.id === mail.id ? 'text-slate-900 drop-shadow-sm' : 'text-slate-700 group-hover:text-premium-900'}`}>{mail.subject}</h3>
              <div className={`flex items-center gap-3 text-[11px] font-bold ${selectedMail?.id === mail.id ? 'text-premium-700' : 'text-slate-400'} pt-4 border-t ${selectedMail?.id === mail.id ? 'border-premium-200/50' : 'border-slate-100/30'}`}>
                <MapPin size={16} className={selectedMail?.id === mail.id ? 'text-premium-500' : 'text-slate-300'} /> 
                <span className="truncate uppercase tracking-wider">{mail.sender}</span>
              </div>
            </div>
          )) : <div className="py-32 text-center glass-card rounded-[3.5rem] border-2 border-dashed border-slate-300/30 shadow-inner flex flex-col items-center justify-center space-y-6">
            <div className="p-6 glass-panel rounded-full text-slate-300"><MailIcon size={48} /></div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Arsip Kosong</p>
          </div>}
        </div>
        <div className="lg:col-span-7 xl:col-span-8 h-full hidden lg:block overflow-hidden relative">
          {selectedMail ? (
            <div className="glass-card rounded-[3.5rem] shadow-2xl border border-white/40 h-full overflow-hidden flex flex-col animate-fade-in">
              <DetailContent mail={selectedMail} />
            </div>
          ) : (
            <div className="h-full glass-panel rounded-[3.5rem] border-4 border-dashed border-white/20 flex flex-col items-center justify-center text-slate-400 gap-4">
              <Eye size={48} className="opacity-20 translate-y-2" />
              <p className="font-black text-xs uppercase tracking-[0.4em] opacity-40">Pilih berkas untuk pratinjau</p>
            </div>
          )}
        </div>
      </div>
      {showDetailModal && selectedMail && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-xl flex flex-col animate-fade-in">
          <div className="flex items-center justify-between p-8 border-b border-white/10 glass-dark">
            <h4 className="text-white font-black uppercase tracking-[0.3em] text-sm">Pratinjau Arsip Digital</h4>
            <button onClick={() => setShowDetailModal(false)} className="p-3 text-white/60 bg-white/10 hover:bg-rose-500 hover:text-white rounded-2xl transition-all"><X size={28} /></button>
          </div>
          <div className="flex-1 overflow-y-auto glass-panel"><DetailContent mail={selectedMail} /></div>
        </div>
      )}
      {showForm && <MailForm type={type} onClose={() => { setShowForm(false); setEditData(null); }} initialData={editData} />}
    </div>
  );
};

export default MailList;
