
import React, { useEffect, useState } from 'react';
import { Mail, MailType, UrgencyLevel, MailStatus } from '../types';
import { subscribeToMails, deleteMail, subscribeToConfig, saveMail } from '../services/storage';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Plus, Search, Trash2, Eye, Filter, Sparkles, AlertCircle, Download, Calendar, Printer, FileText, ChevronRight, Image as ImageIcon, Clock, FileBadge, X, ExternalLink, Edit, CheckCircle2, PenTool, Upload, MapPin, Wand2, FileCheck, ClipboardList, Loader2, Share2 } from 'lucide-react';
import MailForm from './MailForm';
import { analyzeLetter, generateSPTFromInvitation, generateSPPDFromSPT, generateLaporanDanNotulen } from '../services/geminiService';
import { SchoolConfig } from '../types';
/* Import useHistory for React Router v5 instead of useNavigate */
import { useHistory } from 'react-router-dom';

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
  
  /* Use useHistory hook for v5 */
  const history = useHistory();

  useEffect(() => {
    const unsubscribeMails = subscribeToMails((allMails) => {
      const filtered = allMails.filter(m => m.type === type);
      setMails(filtered);
      // Auto-select first mail if none selected on desktop
      if (!selectedMail && filtered.length > 0 && window.innerWidth >= 1024) {
        setSelectedMail(filtered[0]);
        setDispositionNote(filtered[0].disposition || '');
      }
    });
    const unsubscribeConfig = subscribeToConfig(setSchoolConfig);
    return () => { unsubscribeMails(); unsubscribeConfig(); };
  }, [type]);

  const handleSelectMail = (mail: Mail) => {
    setSelectedMail(mail);
    setDispositionNote(mail.disposition || '');
    if (window.innerWidth < 1024) setShowDetailModal(true);
  };

  const handlePrint = (mail: Mail) => {
    if (mail.fileUrl) {
      // Jika ada fileUrl (PDF Data URI), buka di tab baru
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`<iframe width='100%' height='100%' src='${mail.fileUrl}'></iframe>`);
      }
    } else {
      // Jika tidak ada file, cetak tampilan disposisi sederhana
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
        // Step 1: Invitation -> SPT
        const sptContent = await generateSPTFromInvitation(mail);
        /* Use history.push for v5 with location state as second argument */
        history.push('/create', { 
          templateId: 't_spt',
          subject: 'SURAT PERINTAH TUGAS',
          content: sptContent
        });
      } else {
        // Step 2: SPT -> SPPD
        const sppdContent = await generateSPPDFromSPT(mail);
        history.push('/create', { 
          templateId: 't_sppd',
          subject: 'SURAT PERINTAH PERJALANAN DINAS',
          content: sppdContent
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
      history.push('/create', {
        templateId: docType === 'LAPORAN' ? 't_laporan_sppd' : 't_notulen',
        subject: docType === 'LAPORAN' ? 'LAPORAN HASIL PERJALANAN DINAS' : 'NOTULEN RAPAT',
        content: content
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
      {/* Detail Header */}
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
             <button onClick={() => handlePrint(mail)} className="p-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg transition-all flex items-center justify-center" title="Cetak Surat">
                <Printer size={18} />
             </button>
             <button onClick={(e) => handleEdit(mail, e)} className="p-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl shadow-lg transition-all flex items-center justify-center" title="Edit Data">
                <Edit size={18} />
             </button>
             <button onClick={(e) => handleDelete(mail.id, e)} className="p-2.5 bg-rose-600 hover:bg-rose-700 rounded-xl shadow-lg transition-all flex items-center justify-center" title="Hapus Data">
                <Trash2 size={18} />
             </button>
          </div>
        </div>
      </div>
      
      {/* Detail Body */}
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

        {/* SMART AI ACTIONS SECTION */}
        <div className="space-y-4">
           <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-indigo-600" />
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Alur Kerja AI Berantai</h4>
           </div>

           {mail.type === MailType.INCOMING ? (
             <button 
              onClick={() => handleChainProcess(mail)} 
              disabled={processingAI}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-xl hover:bg-indigo-700 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50"
             >
               {processingAI ? <Loader2 size={20} className="animate-spin" /> : <Wand2 size={20} />}
               BUAT SURAT TUGAS (SPT) OTOMATIS ✨
             </button>
           ) : (
             <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => handleChainProcess(mail)} 
                  disabled={processingAI}
                  className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-3 shadow-lg hover:bg-indigo-700 transition-all"
                >
                  {processingAI ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                  PROSES JADI SPPD ✨
                </button>
                <div className="grid grid-cols-2 gap-3">
                   <button 
                    onClick={() => handleGenerateFinalDocs(mail, 'LAPORAN')} 
                    disabled={processingAI}
                    className="py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-700 transition-all"
                   >
                     <FileCheck size={16} /> LAPORAN SPPD
                   </button>
                   <button 
                    onClick={() => handleGenerateFinalDocs(mail, 'NOTULEN')} 
                    disabled={processingAI}
                    className="py-3.5 bg-violet-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-violet-700 transition-all"
                   >
                     <ClipboardList size={16} /> NOTULEN RAPAT
                   </button>
                </div>
             </div>
           )}
        </div>

        {mail.type === MailType.INCOMING && (
          <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 space-y-3 shadow-inner">
            <label className="text-[10px] font-black text-amber-700 uppercase flex items-center gap-1.5">
              <PenTool size={14} /> Lembar Disposisi Kepala Sekolah
            </label>
            <textarea 
              value={dispositionNote} 
              onChange={(e) => setDispositionNote(e.target.value)} 
              className="w-full bg-white border border-amber-200 rounded-xl p-4 text-xs text-slate-700 min-h-[100px] outline-none focus:ring-2 focus:ring-amber-500 font-medium" 
              placeholder="Tulis instruksi kepala sekolah di sini..." 
            />
            <button 
              onClick={handleSaveDisposition} 
              disabled={isSavingDisposition}
              className="w-full py-3 bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-amber-700 transition-all flex items-center justify-center gap-2"
            >
              {isSavingDisposition ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Simpan Disposisi
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const filteredMails = mails.filter(mail => {
    const matchesSearch = mail.subject.toLowerCase().includes(searchTerm.toLowerCase()) || mail.sender.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'Semua' || mail.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col relative animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">{type === MailType.INCOMING ? 'Surat Masuk' : 'Surat Keluar'}</h2>
          <p className="text-slate-500 font-bold text-sm">Kelola arsip sekolah dengan bantuan kecerdasan buatan.</p>
        </div>
        <button onClick={() => { setEditData(null); setShowForm(true); }} className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 font-black text-sm flex items-center gap-3 transition-all active:scale-95">
          <Plus size={20} /> TAMBAH ARSIP
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 shrink-0 px-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Cari berdasarkan perihal atau pengirim..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-700" 
          />
        </div>
        <div className="flex gap-3">
           <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-6 py-3 bg-slate-50 border-none rounded-2xl text-xs font-black text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
           >
             <option value="Semua">Semua Kategori</option>
             {Array.from(new Set(mails.map(m => m.category))).map(cat => (
               <option key={cat} value={cat}>{cat}</option>
             ))}
           </select>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0 overflow-hidden px-2 pb-6">
        {/* Left Side: List */}
        <div className="lg:col-span-6 xl:col-span-5 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
          {filteredMails.length > 0 ? (
            filteredMails.map((mail) => (
              <div 
                key={mail.id} 
                onClick={() => handleSelectMail(mail)} 
                className={`group p-6 rounded-[2rem] border-2 transition-all cursor-pointer bg-white relative overflow-hidden ${selectedMail?.id === mail.id ? 'border-indigo-600 shadow-2xl shadow-indigo-100 ring-4 ring-indigo-50' : 'border-slate-50 hover:border-indigo-100 hover:shadow-lg'}`}
              >
                {selectedMail?.id === mail.id && (
                  <div className="absolute top-0 right-0 p-2 text-indigo-600"><CheckCircle2 size={24} /></div>
                )}
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${selectedMail?.id === mail.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {mail.category}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{format(new Date(mail.date), 'dd/MM/yyyy')}</span>
                </div>
                <h3 className={`font-black text-lg mb-2 uppercase line-clamp-2 leading-tight transition-colors ${selectedMail?.id === mail.id ? 'text-slate-900' : 'text-slate-700 group-hover:text-indigo-600'}`}>{mail.subject}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
                  <MapPin size={12} className="text-slate-300" />
                  <span className="truncate">{mail.sender}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
               <div className="inline-flex p-6 bg-slate-50 rounded-full text-slate-300 mb-4"><Search size={40}/></div>
               <p className="font-black text-slate-400 uppercase tracking-widest">Tidak ada data ditemukan</p>
            </div>
          )}
        </div>

        {/* Right Side: Detail (Desktop Only) */}
        <div className="lg:col-span-6 xl:col-span-7 h-full hidden lg:block overflow-hidden relative">
          {selectedMail ? (
            <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 h-full overflow-hidden flex flex-col animate-fade-in-up">
              <DetailContent mail={selectedMail} />
            </div>
          ) : (
            <div className="h-full bg-slate-50/50 rounded-[3rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-12 text-center">
              <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mb-6 shadow-xl border border-slate-100">
                <Sparkles size={40} className="text-indigo-200 animate-pulse" />
              </div>
              <h4 className="font-black text-slate-800 text-xl mb-2 uppercase tracking-tight">Pilih Arsip Surat</h4>
              <p className="text-slate-500 font-medium text-sm max-w-xs">Pilih salah satu surat dari daftar di samping untuk melihat detail, mencetak, atau memproses dengan AI.</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal (Mobile Only) */}
      {showDetailModal && selectedMail && (
        <div className="fixed inset-0 z-[60] bg-slate-900/90 backdrop-blur-xl lg:hidden flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h4 className="text-white font-black uppercase tracking-widest text-sm">Detail Arsip</h4>
            <button onClick={() => setShowDetailModal(false)} className="p-2 text-white/60 bg-white/10 rounded-full">
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
             <DetailContent mail={selectedMail} />
          </div>
        </div>
      )}

      {showForm && <MailForm type={type} onClose={() => { setShowForm(false); setEditData(null); }} initialData={editData} />}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        .animate-fade-in-up { animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};

export default MailList;
