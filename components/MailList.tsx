
import React, { useEffect, useState } from 'react';
import { Mail, MailType, UrgencyLevel, MailStatus } from '../types';
import { subscribeToMails, deleteMail, subscribeToConfig, saveMail } from '../services/storage';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Plus, Search, Trash2, Eye, Filter, Sparkles, AlertCircle, Download, Calendar, Printer, FileText, ChevronRight, Image as ImageIcon, Clock, FileBadge, X, ExternalLink, Edit, CheckCircle2, PenTool, Upload, MapPin, Wand2, FileCheck } from 'lucide-react';
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
  const [showOutboxOptions, setShowOutboxOptions] = useState(false);
  const [editData, setEditData] = useState<Mail | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Semua');
  const [filterMonth, setFilterMonth] = useState('all');
  const [selectedMail, setSelectedMail] = useState<Mail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [processingAI, setProcessingAI] = useState(false);
  const [dispositionNote, setDispositionNote] = useState('');
  const [isSavingDisposition, setIsSavingDisposition] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeMails = subscribeToMails((allMails) => {
      setMails(allMails.filter(m => m.type === type));
      if (selectedMail) {
        const updated = allMails.find(m => m.id === selectedMail.id);
        if (updated) setSelectedMail(updated);
      }
    });
    const unsubscribeConfig = subscribeToConfig(setSchoolConfig);
    return () => { unsubscribeMails(); unsubscribeConfig(); };
  }, [type, selectedMail?.id]);

  const handleSelectMail = (mail: Mail) => {
    setSelectedMail(mail);
    setDispositionNote(mail.disposition || '');
    if (window.innerWidth < 1024) setShowDetailModal(true);
  };

  const handleChainProcess = async (mail: Mail) => {
    setProcessingAI(true);
    try {
      if (mail.type === MailType.INCOMING) {
        // Step 1: Invitation -> SPT
        const sptContent = await generateSPTFromInvitation(mail);
        navigate('/create', { 
          state: { 
            templateId: 't_spt',
            subject: 'SURAT PERINTAH TUGAS',
            content: sptContent
          } 
        });
      } else {
        // Step 2: SPT -> SPPD atau Laporan
        if (mail.category === 'Tugas' || mail.subject.includes('TUGAS')) {
           const sppdContent = await generateSPPDFromSPT(mail);
           navigate('/create', { 
             state: { 
               templateId: 't_sppd',
               subject: 'SURAT PERINTAH PERJALANAN DINAS',
               content: sppdContent
             } 
           });
        }
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
    alert('Disposisi disimpan.');
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
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-slate-900 p-6 text-white relative shrink-0">
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-1">{mail.category}</p>
            <h3 className="font-black text-lg leading-tight mb-2 uppercase">{mail.subject}</h3>
            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${getUrgencyBadge(mail.urgency)}`}>{mail.urgency}</span>
          </div>
          <div className="flex gap-2">
             <button onClick={() => handleChainProcess(mail)} disabled={processingAI} className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg transition-all" title="Proses AI Berantai">
               {processingAI ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16}/>}
             </button>
             <button onClick={() => handleDelete(mail.id)} className="p-2 bg-rose-600 hover:bg-rose-700 rounded-lg shadow-lg transition-all"><Trash2 size={16}/></button>
          </div>
        </div>
      </div>
      
      <div className="p-6 overflow-y-auto flex-1 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nomor Surat</label>
            <p className="text-sm font-bold text-slate-700 truncate">{mail.referenceNumber}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
             <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tanggal</label>
             <p className="text-sm font-bold text-slate-700">{format(new Date(mail.date), 'dd MMM yyyy', { locale: id })}</p>
          </div>
        </div>

        <div>
           <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Isi Ringkas</label>
           <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 italic">"{mail.description}"</div>
        </div>

        {/* ACTIONS CHAIN */}
        <div className="pt-4 space-y-3">
           {mail.type === MailType.INCOMING && (
             <button onClick={() => handleChainProcess(mail)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-xl hover:bg-indigo-700 transition-all">
               <FileBadge size={20} /> BUAT SURAT TUGAS (SPT) ✨
             </button>
           )}
           
           {(mail.category === 'Tugas' || mail.type === MailType.OUTGOING) && (
             <div className="grid grid-cols-2 gap-3">
               <button onClick={() => handleGenerateFinalDocs(mail, 'LAPORAN')} className="py-3 bg-emerald-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-700 transition-all">
                 <FileCheck size={16} /> BUAT LAPORAN
               </button>
               <button onClick={() => handleGenerateFinalDocs(mail, 'NOTULEN')} className="py-3 bg-violet-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-violet-700 transition-all">
                 <ClipboardList size={16} /> BUAT NOTULEN
               </button>
             </div>
           )}
        </div>

        {mail.type === MailType.INCOMING && (
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 space-y-2">
            <label className="text-[10px] font-black text-amber-700 uppercase flex items-center gap-1.5"><FileText size={12} /> Disposisi Kepala Sekolah</label>
            <textarea value={dispositionNote} onChange={(e) => setDispositionNote(e.target.value)} className="w-full bg-white border border-amber-200 rounded-lg p-3 text-xs text-slate-700 min-h-[80px]" placeholder="Instruksi..." />
            <button onClick={handleSaveDisposition} className="w-full py-2 bg-amber-600 text-white rounded-lg text-xs font-bold">Simpan Disposisi</button>
          </div>
        )}
      </div>
    </div>
  );

  const filteredMails = mails.filter(mail => {
    const matchesSearch = mail.subject.toLowerCase().includes(searchTerm.toLowerCase()) || mail.sender.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'Semua' || mail.category === filterCategory;
    const matchesMonth = filterMonth === 'all' || mail.date.startsWith(filterMonth);
    return matchesSearch && matchesCategory && matchesMonth;
  });

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">{type === 'Masuk' ? 'Surat Masuk' : 'Surat Keluar'}</h2>
          <p className="text-slate-500 font-bold text-sm">Gunakan tombol berantai AI untuk memproses dokumen otomatis.</p>
        </div>
        <button onClick={() => { setEditData(null); setShowForm(true); }} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 shadow-xl font-black text-sm flex items-center gap-2">
          <Plus size={20} /> TAMBAH DATA
        </button>
      </div>

      <div className="bg-white p-3 rounded-2xl shadow-lg border border-slate-100 flex flex-col xl:flex-row gap-3 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Cari..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold" />
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden">
        <div className="lg:col-span-7 overflow-y-auto pr-2 space-y-3">
          {filteredMails.map((mail) => (
            <div key={mail.id} onClick={() => handleSelectMail(mail)} className={`p-5 rounded-3xl border-2 transition-all cursor-pointer bg-white ${selectedMail?.id === mail.id ? 'border-indigo-600 shadow-xl' : 'border-transparent hover:border-slate-100'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg uppercase">{mail.category}</span>
                <span className="text-[10px] font-black text-slate-400">{format(new Date(mail.date), 'dd/MM/yyyy')}</span>
              </div>
              <h3 className="font-black text-slate-800 text-base mb-1 uppercase line-clamp-1">{mail.subject}</h3>
              <p className="text-xs text-slate-500 font-medium">{mail.sender}</p>
            </div>
          ))}
        </div>

        <div className="lg:col-span-5 h-full hidden lg:block overflow-hidden">
          {selectedMail ? (
            <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 h-full overflow-hidden flex flex-col animate-fade-in">
              <DetailContent mail={selectedMail} />
            </div>
          ) : (
            <div className="h-full bg-slate-50 rounded-[2rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
              <Sparkles size={48} className="opacity-20 mb-4" />
              <p className="font-black text-xs uppercase tracking-widest">Pilih surat untuk proses berantai</p>
            </div>
          )}
        </div>
      </div>

      {showForm && <MailForm type={type} onClose={() => setShowForm(false)} initialData={editData} />}
    </div>
  );
};

const Loader2 = ({ className, size = 16 }: { className?: string, size?: number }) => (
  <svg className={`animate-spin ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
);

const ClipboardList = ({ size, className }: any) => <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>;

export default MailList;
