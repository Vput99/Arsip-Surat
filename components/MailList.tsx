import React, { useEffect, useState } from 'react';
import { Mail, MailType, UrgencyLevel } from '../types';
import { getMails, deleteMail, getSchoolConfig } from '../services/storage';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Plus, Search, Trash2, Eye, Filter, Sparkles, AlertCircle, Download, Calendar, Printer, FileText, ChevronRight } from 'lucide-react';
import MailForm from './MailForm';
import { suggestReply } from '../services/geminiService';

interface MailListProps {
  type: MailType;
}

const MailList: React.FC<MailListProps> = ({ type }) => {
  const [mails, setMails] = useState<Mail[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Semua');
  const [filterMonth, setFilterMonth] = useState('all');
  const [selectedMail, setSelectedMail] = useState<Mail | null>(null);
  const [aiReply, setAiReply] = useState<string>('');
  const [replyLoading, setReplyLoading] = useState(false);

  useEffect(() => {
    const loadData = () => {
      const allMails = getMails();
      setMails(allMails.filter(m => m.type === type));
    };
    loadData();
    window.addEventListener('storage-update', loadData);
    return () => window.removeEventListener('storage-update', loadData);
  }, [type]);

  const handleDelete = (id: string) => {
    if (window.confirm('Hapus arsip ini secara permanen?')) {
      deleteMail(id);
      if (selectedMail?.id === id) setSelectedMail(null);
    }
  };

  const handlePrintDisposition = (mail: Mail) => {
    const config = getSchoolConfig();
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Arsip - ${mail.referenceNumber}</title>
            <style>
              body { font-family: 'Times New Roman', serif; padding: 40px; }
              .header-container { display: flex; align-items: center; justify-content: center; border-bottom: 3px double black; padding-bottom: 10px; margin-bottom: 20px; }
              .logo { width: 80px; height: 80px; margin-right: 20px; object-fit: contain; }
              .header-text { text-align: center; }
              .header-text h1 { margin: 0; font-size: 18pt; text-transform: uppercase; line-height: 1.2; }
              .header-text p { margin: 0; font-size: 12pt; }
              .title { text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 20px; font-size: 14pt; }
              .content-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .content-table td { padding: 8px; vertical-align: top; }
              .label { width: 160px; font-weight: bold; }
              .box { border: 1px solid black; padding: 15px; margin-top: 20px; min-height: 100px; }
              .footer { margin-top: 50px; text-align: right; }
            </style>
          </head>
          <body>
            <div class="header-container">
              <img src="${config.logoUrl}" class="logo" alt="Logo" />
              <div class="header-text">
                <h1>${config.name}</h1>
                <p>${config.address}</p>
                <p>Email: ${config.email}</p>
              </div>
            </div>
            <div class="title">LEMBAR ARSIP / DISPOSISI DIGITAL</div>
            <table class="content-table">
              <tr><td class="label">Nomor Surat</td><td>: ${mail.referenceNumber}</td></tr>
              <tr><td class="label">Tanggal Surat</td><td>: ${format(new Date(mail.date), 'dd MMMM yyyy', { locale: id })}</td></tr>
              <tr><td class="label">${type === 'Masuk' ? 'Pengirim' : 'Penerima'}</td><td>: ${mail.sender}</td></tr>
              <tr><td class="label">Perihal</td><td>: ${mail.subject}</td></tr>
              <tr><td class="label">Kategori</td><td>: ${mail.category}</td></tr>
              <tr><td class="label">Sifat</td><td>: ${mail.urgency}</td></tr>
            </table>
            <div style="border: 1px solid #000; padding: 10px;">
              <strong>Isi Ringkas:</strong><br/><p>${mail.description}</p>
            </div>
            <div class="box"><strong>Catatan:</strong></div>
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDownload = (mail: Mail) => {
    if (mail.fileUrl?.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = mail.fileUrl;
      link.download = `Dokumen-${mail.referenceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert("Tidak ada file lampiran.");
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

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            {type === 'Masuk' ? 'Surat Masuk' : 'Surat Keluar'}
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Kelola database arsip {type.toLowerCase()} sekolah.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5 font-bold text-sm"
        >
          <Plus size={18} className="mr-2" />
          Tambah Data
        </button>
      </div>

      {/* Floating Filter Bar */}
      <div className="bg-white p-2 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 flex flex-col xl:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cari surat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm font-medium"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 xl:pb-0">
          <div className="relative group">
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="appearance-none pl-10 pr-8 py-3 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-700 text-sm font-semibold cursor-pointer min-w-[160px] hover:border-indigo-300 transition-colors"
            >
              <option value="all">Semua Bulan</option>
              {availableMonths.map(month => (
                <option key={month} value={month}>{format(new Date(month + '-01'), 'MMMM yyyy', { locale: id })}</option>
              ))}
            </select>
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>

          <div className="relative group">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="appearance-none pl-10 pr-8 py-3 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-700 text-sm font-semibold cursor-pointer min-w-[160px] hover:border-indigo-300 transition-colors"
            >
              <option value="Semua">Semua Kategori</option>
              <option value="Undangan">Undangan</option>
              <option value="Dinas">Dinas</option>
              <option value="Pemberitahuan">Pemberitahuan</option>
              <option value="Lainnya">Lainnya</option>
            </select>
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* List Column (Scrollable) */}
        <div className="lg:col-span-7 overflow-y-auto pr-2 space-y-3">
          {filteredMails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="bg-slate-100 p-4 rounded-full mb-3">
                <Search className="text-slate-400" size={32} />
              </div>
              <h3 className="text-slate-900 font-bold">Tidak ditemukan</h3>
              <p className="text-slate-500 text-sm">Coba kata kunci lain.</p>
            </div>
          ) : (
            filteredMails.map((mail) => (
              <div 
                key={mail.id} 
                onClick={() => setSelectedMail(mail)}
                className={`group relative bg-white p-5 rounded-2xl border transition-all duration-200 cursor-pointer hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5 ${selectedMail?.id === mail.id ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md z-10' : 'border-slate-100 hover:border-indigo-200'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${getUrgencyBadge(mail.urgency)}`}>
                      {mail.urgency}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {mail.category}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-400 font-mono">
                    {format(new Date(mail.date), 'dd MMM yyyy', { locale: id })}
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 text-base mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">{mail.subject}</h3>
                <p className="text-sm text-slate-500 mb-3 line-clamp-2 leading-relaxed">{mail.description}</p>
                
                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                  <div className="flex items-center text-xs font-medium text-slate-500">
                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center mr-2 text-slate-400">
                       {type === 'Masuk' ? 'D' : 'K'}
                    </div>
                    {mail.sender}
                  </div>
                  {mail.fileUrl && <FileText size={14} className="text-indigo-400" />}
                </div>
                {selectedMail?.id === mail.id && (
                  <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-12 bg-indigo-500 rounded-r-lg lg:block hidden"></div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Detail Column (Sticky/Fixed) */}
        <div className="lg:col-span-5 h-full hidden lg:block">
          {selectedMail ? (
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 h-full flex flex-col overflow-hidden animate-fade-in">
              {/* Detail Header */}
              <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white relative overflow-hidden shrink-0">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                 <div className="flex justify-between items-start relative z-10">
                    <div>
                      <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">{selectedMail.category}</p>
                      <h3 className="font-bold text-lg leading-tight">{selectedMail.subject}</h3>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => handlePrintDisposition(selectedMail)} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-colors"><Printer size={16}/></button>
                       <button onClick={() => handleDelete(selectedMail.id)} className="p-2 bg-rose-500/80 hover:bg-rose-500 rounded-lg backdrop-blur-sm transition-colors"><Trash2 size={16}/></button>
                    </div>
                 </div>
              </div>
              
              {/* Detail Content (Scrollable) */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nomor Surat</label>
                    <p className="text-sm font-semibold text-slate-700 truncate" title={selectedMail.referenceNumber}>{selectedMail.referenceNumber}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tanggal</label>
                     <p className="text-sm font-semibold text-slate-700">{format(new Date(selectedMail.date), 'dd MMM yyyy', { locale: id })}</p>
                  </div>
                </div>

                <div>
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Isi Ringkas</label>
                   <div className="text-sm text-slate-600 leading-relaxed">
                     {selectedMail.description}
                   </div>
                </div>

                {selectedMail.aiSummary && (
                  <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 relative overflow-hidden">
                     <div className="absolute -left-2 -top-2 w-16 h-16 bg-indigo-200 rounded-full blur-xl opacity-50"></div>
                     <div className="flex items-center gap-2 mb-2 relative z-10">
                        <Sparkles size={14} className="text-indigo-600" />
                        <span className="text-xs font-bold text-indigo-700">Analisis AI</span>
                     </div>
                     <p className="text-xs text-indigo-900 leading-relaxed italic relative z-10">"{selectedMail.aiSummary}"</p>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-3 pt-2">
                  {type === 'Masuk' && (
                    <div className="p-1">
                      <button 
                         onClick={() => handleGenerateReply(selectedMail)}
                         disabled={replyLoading}
                         className="w-full py-2.5 bg-gradient-to-r from-violet-100 to-indigo-100 text-indigo-700 rounded-xl hover:from-violet-200 hover:to-indigo-200 transition-colors text-sm font-bold flex items-center justify-center gap-2"
                      >
                         {replyLoading ? 'Memproses...' : 'Buat Balasan Otomatis'}
                         <Sparkles size={16} className={replyLoading ? "animate-spin" : ""} />
                      </button>
                      {aiReply && (
                        <div className="mt-3 p-3 bg-white border border-indigo-100 rounded-xl text-xs text-slate-600 shadow-sm animate-fade-in">
                          <p className="font-bold text-indigo-600 mb-1">Saran Balasan:</p>
                          {aiReply}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {selectedMail.fileUrl && (
                     <button 
                       onClick={() => handleDownload(selectedMail)}
                       className="w-full py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold flex items-center justify-center gap-2 group"
                     >
                       <Download size={16} className="text-slate-400 group-hover:text-slate-600" />
                       Unduh Lampiran Asli
                     </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
             <div className="h-full bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
               <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                 <Eye size={24} className="opacity-50" />
               </div>
               <p className="font-medium">Pilih surat dari daftar<br/>untuk melihat detail lengkap.</p>
             </div>
          )}
        </div>
      </div>

      {showForm && (
        <MailForm type={type} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
};

export default MailList;