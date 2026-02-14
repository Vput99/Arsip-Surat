
import React, { useEffect, useState } from 'react';
import { Mail, MailType, UrgencyLevel, MailStatus } from '../types';
import { subscribeToMails, deleteMail, subscribeToConfig, saveMail } from '../services/storage';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Plus, Search, Trash2, Eye, Filter, Sparkles, AlertCircle, Download, Calendar, Printer, FileText, ChevronRight, Image as ImageIcon, Clock, FileBadge, X, ExternalLink, Edit, CheckCircle2 } from 'lucide-react';
import MailForm from './MailForm';
import { suggestReply, generateSPTContent } from '../services/geminiService';
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
  const [filterMonth, setFilterMonth] = useState('all');
  
  const [selectedMail, setSelectedMail] = useState<Mail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const [aiReply, setAiReply] = useState<string>('');
  const [replyLoading, setReplyLoading] = useState(false);
  
  // State Disposisi
  const [dispositionNote, setDispositionNote] = useState('');
  const [isSavingDisposition, setIsSavingDisposition] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeMails = subscribeToMails((allMails) => {
      setMails(allMails.filter(m => m.type === type));
      // Update selected mail real-time if selected
      if (selectedMail) {
        const updated = allMails.find(m => m.id === selectedMail.id);
        if (updated) setSelectedMail(updated);
      }
    });

    const unsubscribeConfig = subscribeToConfig((config) => {
      setSchoolConfig(config);
    });

    return () => {
      unsubscribeMails();
      unsubscribeConfig();
    };
  }, [type, selectedMail?.id]);

  const handleSelectMail = (mail: Mail) => {
    setSelectedMail(mail);
    setAiReply('');
    setDispositionNote(mail.disposition || ''); // Load existing disposition
    if (window.innerWidth < 1024) {
      setShowDetailModal(true);
    }
  };

  const handleEdit = (mail: Mail, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditData(mail);
    setShowForm(true);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm('Hapus arsip ini secara permanen?')) {
      try {
        await deleteMail(id);
        setSelectedMail(null);
        setShowDetailModal(false);
      } catch (e) {
        alert('Gagal menghapus surat.');
      }
    }
  };

  const handleSaveDisposition = async () => {
    if (!selectedMail) return;
    setIsSavingDisposition(true);
    try {
      const updatedMail = { ...selectedMail, disposition: dispositionNote };
      await saveMail(updatedMail);
      alert('Disposisi disimpan.');
    } catch (e) {
      alert('Gagal menyimpan disposisi.');
    } finally {
      setIsSavingDisposition(false);
    }
  };

  const handleChangeStatus = async (status: MailStatus) => {
    if (!selectedMail) return;
    try {
      await saveMail({ ...selectedMail, status });
    } catch (e) {
      alert('Gagal ubah status');
    }
  };

  const handleCreateSPT = async (mail: Mail) => {
    setReplyLoading(true);
    try {
      const content = await generateSPTContent(mail);
      navigate('/create', { 
        state: { 
          templateId: 't_spt',
          subject: `SURAT PERINTAH TUGAS - ${mail.sender}`,
          content: content,
          referenceInvitation: mail.referenceNumber
        } 
      });
    } catch (err) {
      alert("Gagal men-generate naskah SPT. Coba lagi.");
    } finally {
      setReplyLoading(false);
    }
  };

  const handlePrintDisposition = (mail: Mail) => {
    if (!schoolConfig) return;
    const config = schoolConfig;
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Lembar Disposisi - ${mail.referenceNumber}</title>
            <style>
              body { font-family: 'Times New Roman', serif; padding: 40px; }
              .header-container { display: flex; align-items: center; justify-content: center; border-bottom: 3px double black; padding-bottom: 10px; margin-bottom: 20px; }
              .logo { width: 80px; height: 80px; margin-right: 20px; object-fit: contain; }
              .header-text { text-align: center; }
              .header-text h1 { margin: 0; font-size: 18pt; text-transform: uppercase; line-height: 1.2; }
              .header-text p { margin: 0; font-size: 12pt; }
              .title { text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 20px; font-size: 14pt; }
              .content-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid black; }
              .content-table td { padding: 8px; vertical-align: top; border: 1px solid black; }
              .label { width: 160px; font-weight: bold; background-color: #f0f0f0; }
              .dispo-box { border: 1px solid black; padding: 15px; min-height: 150px; }
              .meta { font-size: 10pt; margin-bottom: 10px; }
            </style>
          </head>
          <body>
            <div class="header-container">
              <img src="${config.logoUrl}" class="logo" />
              <div class="header-text">
                <h1>${config.name}</h1>
                <p>${config.address}</p>
                <p>Email: ${config.email}</p>
              </div>
            </div>
            <div class="title">LEMBAR ARSIP / DISPOSISI</div>
            <div class="meta">Dicetak pada: ${new Date().toLocaleString('id-ID')}</div>
            <table class="content-table">
              <tr><td class="label">Nomor Surat</td><td>${mail.referenceNumber}</td></tr>
              <tr><td class="label">Tanggal Surat</td><td>${format(new Date(mail.date), 'dd MMMM yyyy', { locale: id })}</td></tr>
              <tr><td class="label">Diterima Tanggal</td><td>${format(new Date(mail.receivedDate), 'dd MMMM yyyy', { locale: id })}</td></tr>
              <tr><td class="label">Pengirim</td><td>${mail.sender}</td></tr>
              <tr><td class="label">Perihal</td><td>${mail.subject}</td></tr>
              <tr><td class="label">Isi Ringkas</td><td>${mail.description}</td></tr>
            </table>
            
            <div style="font-weight: bold; margin-bottom: 5px;">INSTRUKSI / DISPOSISI KEPALA SEKOLAH:</div>
            <div class="dispo-box">
              ${mail.disposition ? mail.disposition.replace(/\n/g, '<br/>') : '......................................................................................................'}
            </div>
            
            <table style="width: 100%; margin-top: 30px;">
              <tr>
                 <td width="50%"></td>
                 <td align="center">
                    Kepala Sekolah,<br/><br/><br/><br/>
                    <strong>${config.principalName}</strong><br/>
                    NIP. ${config.principalNip}
                 </td>
              </tr>
            </table>
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDownload = (mail: Mail, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (mail.fileUrl?.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = mail.fileUrl;
      const extension = mail.fileUrl.includes('image/png') ? 'png' : mail.fileUrl.includes('image/jpeg') ? 'jpg' : 'pdf';
      const cleanRef = mail.referenceNumber.replace(/[/\\?%*:|"<>]/g, '-');
      link.download = `Arsip-${cleanRef}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert("Tidak ada lampiran untuk surat ini.");
    }
  };

  const handleGenerateReply = async (mail: Mail) => {
    setReplyLoading(true);
    const reply = await suggestReply(`Pengirim: ${mail.sender}\nPerihal: ${mail.subject}\nIsi: ${mail.description}`);
    setAiReply(reply);
    setReplyLoading(false);
  };

  const availableMonths = Array.from(new Set(mails.map(m => m.date.substring(0, 7)))).sort().reverse();
  const filteredMails = mails.filter(mail => {
    const matchesSearch = 
      mail.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mail.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mail.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'Semua' || mail.category === filterCategory;
    const matchesMonth = filterMonth === 'all' || mail.date.startsWith(filterMonth);
    return matchesSearch && matchesCategory && matchesMonth;
  });

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
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white relative shrink-0">
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">{mail.category}</p>
            <h3 className="font-black text-lg leading-tight mb-2">{mail.subject}</h3>
            <div className="flex gap-2">
              {[MailStatus.PENDING, MailStatus.PROCESSED, MailStatus.ARCHIVED].map(s => (
                <button 
                  key={s} 
                  onClick={() => handleChangeStatus(s)}
                  className={`text-[9px] px-2 py-1 rounded-md uppercase font-black transition-all ${mail.status === s ? 'bg-white text-indigo-700' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
             <button onClick={(e) => handleEdit(mail, e)} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-colors" title="Edit Data"><Edit size={16}/></button>
             <button onClick={() => handlePrintDisposition(mail)} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-colors" title="Cetak Lembar Arsip"><Printer size={16}/></button>
             <button onClick={(e) => handleDelete(mail.id, e)} className="p-2 bg-rose-500/80 hover:bg-rose-500 rounded-lg backdrop-blur-sm transition-colors" title="Hapus Permanen"><Trash2 size={16}/></button>
          </div>
        </div>
      </div>
      
      <div className="p-6 overflow-y-auto flex-1 space-y-6">
        {/* Gambar Preview Jika Ada */}
        {mail.fileUrl && mail.fileUrl.startsWith('data:image') && (
          <div className="relative group">
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Pratinjau Lampiran</label>
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 aspect-[4/3] flex items-center justify-center">
              <img src={mail.fileUrl} alt="Pratinjau Surat" className="max-w-full max-h-full object-contain" />
              <button 
                onClick={(e) => handleDownload(mail, e)}
                className="absolute bottom-4 right-4 p-3 bg-indigo-600 text-white rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
              >
                <Download size={20} />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nomor Surat</label>
            <p className="text-sm font-bold text-slate-700 truncate" title={mail.referenceNumber}>{mail.referenceNumber}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
             <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tanggal Surat</label>
             <p className="text-sm font-bold text-slate-700">{format(new Date(mail.date), 'dd MMM yyyy', { locale: id })}</p>
          </div>
        </div>

        <div>
           <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Isi Ringkas / Deskripsi</label>
           <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
             "{mail.description}"
           </div>
        </div>

        {/* Form Disposisi */}
        {type === MailType.INCOMING && (
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-amber-700 uppercase flex items-center gap-1.5">
                <FileText size={12} /> Catatan Disposisi
              </label>
              <button onClick={handleSaveDisposition} disabled={isSavingDisposition} className="text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-100 px-2 py-1 rounded-lg">
                {isSavingDisposition ? 'Menyimpan...' : 'Simpan Disposisi'}
              </button>
            </div>
            <textarea 
              value={dispositionNote}
              onChange={(e) => setDispositionNote(e.target.value)}
              className="w-full bg-white border border-amber-200 rounded-lg p-3 text-xs text-slate-700 min-h-[80px]"
              placeholder="Tulis instruksi kepala sekolah di sini (misal: Tindak lanjuti, Arsipkan, Wakili saya)..."
            />
          </div>
        )}

        {mail.aiSummary && (
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
             <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-indigo-600" />
                <span className="text-[10px] font-black text-indigo-700 uppercase">Analisis Ringkas AI</span>
             </div>
             <p className="text-xs text-indigo-900 leading-relaxed font-medium">"{mail.aiSummary}"</p>
          </div>
        )}

        <div className="space-y-3 pt-4">
          {type === MailType.INCOMING && (mail.category === 'Undangan' || mail.category === 'Dinas') && (
            <button 
               onClick={() => handleCreateSPT(mail)}
               disabled={replyLoading}
               className="w-full py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all text-sm font-black flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/30"
            >
               {replyLoading ? <Loader2 size={18} className="animate-spin" /> : <FileBadge size={20} />}
               {replyLoading ? 'MENYUSUN SPT...' : 'BUAT SURAT TUGAS (SPT)'}
               {!replyLoading && <Sparkles size={14} className="animate-pulse" />}
            </button>
          )}

          {mail.fileUrl && (
             <button 
               onClick={(e) => handleDownload(mail, e)}
               className="w-full py-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
             >
               <Download size={18} /> UNDUH LAMPIRAN ASLI
             </button>
          )}

          {type === MailType.INCOMING && (
            <div className="space-y-2">
              <button 
                 onClick={() => handleGenerateReply(mail)}
                 disabled={replyLoading}
                 className="w-full py-3 bg-white border-2 border-indigo-100 text-indigo-700 rounded-2xl hover:bg-indigo-50 transition-colors text-xs font-black flex items-center justify-center gap-2"
              >
                 <Sparkles size={14} /> SARAN BALASAN AI
              </button>
              {aiReply && (
                <div className="p-4 bg-slate-900 text-white rounded-2xl text-[11px] leading-relaxed animate-fade-in relative">
                  <p className="text-indigo-300 font-bold mb-2 uppercase tracking-widest text-[9px]">Draft Balasan:</p>
                  {aiReply}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">
            {type === 'Masuk' ? 'Surat Masuk' : 'Surat Keluar'}
          </h2>
          <p className="text-slate-500 font-bold text-sm">Arsip digital sekolah. Klik surat untuk detail dan unduhan.</p>
        </div>
        <button
          onClick={() => { setEditData(null); setShowForm(true); }}
          className="flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 font-black text-sm"
        >
          <Plus size={20} className="mr-2" /> TAMBAH DATA
        </button>
      </div>

      <div className="bg-white p-3 rounded-2xl shadow-lg border border-slate-100 flex flex-col xl:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cari nomor surat, pengirim, atau judul..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-4 py-3 bg-slate-50 border-none rounded-xl text-slate-700 text-xs font-bold outline-none cursor-pointer"
          >
            <option value="all">Semua Bulan</option>
            {availableMonths.map(month => (
              <option key={month} value={month}>{format(new Date(month + '-01'), 'MMMM yyyy', { locale: id })}</option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-3 bg-slate-50 border-none rounded-xl text-slate-700 text-xs font-bold outline-none cursor-pointer"
          >
            <option value="Semua">Semua Kategori</option>
            <option value="Undangan">Undangan</option>
            <option value="Dinas">Dinas</option>
            <option value="Pemberitahuan">Pemberitahuan</option>
          </select>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden">
        <div className="lg:col-span-7 overflow-y-auto pr-2 space-y-3">
          {filteredMails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center opacity-40">
              <Search size={48} className="mb-4 text-slate-300" />
              <h3 className="text-slate-900 font-black uppercase text-xs tracking-widest">Data Tidak Ditemukan</h3>
            </div>
          ) : (
            filteredMails.map((mail) => (
              <div 
                key={mail.id} 
                onClick={() => handleSelectMail(mail)}
                className={`group relative bg-white p-5 rounded-3xl border-2 transition-all duration-200 cursor-pointer hover:shadow-xl ${selectedMail?.id === mail.id ? 'border-indigo-600 shadow-indigo-500/10' : 'border-white hover:border-slate-100'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${getUrgencyBadge(mail.urgency)}`}>
                      {mail.urgency}
                    </span>
                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg uppercase tracking-wider">
                      {mail.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400 font-mono">
                      {format(new Date(mail.date), 'dd/MM/yyyy')}
                    </span>
                    {mail.fileUrl && (
                      <button 
                        onClick={(e) => handleDownload(mail, e)}
                        className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"
                        title="Unduh Cepat"
                      >
                        <Download size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="font-black text-slate-800 text-base mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1 uppercase">{mail.subject}</h3>
                <p className="text-xs text-slate-500 mb-3 line-clamp-1 font-medium">{mail.description}</p>
                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                  <div className="flex items-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center mr-2 text-slate-400">
                       <FileText size={10} />
                    </div>
                    {mail.sender}
                  </div>
                  {mail.fileUrl && (
                    <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase">
                      <ImageIcon size={12} /> Tersedia
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-5 h-full hidden lg:block overflow-hidden">
          {selectedMail ? (
            <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 h-full overflow-hidden animate-fade-in flex flex-col">
              <DetailContent mail={selectedMail} />
            </div>
          ) : (
             <div className="h-full bg-slate-50 rounded-[2rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
               <Eye size={48} className="opacity-20 mb-4" />
               <p className="font-black text-xs uppercase tracking-widest">Pilih surat untuk melihat detail & unduhan</p>
             </div>
          )}
        </div>
      </div>

      {showDetailModal && selectedMail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm lg:hidden">
          <div className="bg-white rounded-[2rem] w-full max-w-lg h-[85vh] overflow-hidden relative shadow-2xl">
            <button 
              onClick={() => setShowDetailModal(false)}
              className="absolute top-4 right-4 z-[70] p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <DetailContent mail={selectedMail} />
          </div>
        </div>
      )}

      {showForm && (
        <MailForm type={type} onClose={() => { setShowForm(false); setEditData(null); }} initialData={editData} />
      )}
    </div>
  );
};

const Loader2 = ({ className, size = 16 }: { className?: string, size?: number }) => (
  <svg className={`animate-spin ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default MailList;
