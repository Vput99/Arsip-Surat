import React, { useEffect, useState } from 'react';
import { Mail, MailType, UrgencyLevel, MailStatus } from '../types';
import { getMails, deleteMail } from '../services/storage';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Plus, Search, Trash2, Eye, Filter, Sparkles, AlertCircle, Download, Calendar } from 'lucide-react';
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
    if (window.confirm('Apakah Anda yakin ingin menghapus surat ini?')) {
      deleteMail(id);
      if (selectedMail?.id === id) setSelectedMail(null);
    }
  };

  const handleDownload = (mail: Mail) => {
    // Simulasi download konten surat
    const content = `ARSIP SURAT - SD PINTAR
============================================
Nomor Surat : ${mail.referenceNumber}
Tanggal     : ${format(new Date(mail.date), 'dd MMMM yyyy', { locale: id })}
Kategori    : ${mail.category}
Urgensi     : ${mail.urgency}
--------------------------------------------
${mail.type === MailType.INCOMING ? 'PENGIRIM' : 'PENERIMA'} : ${mail.sender}
--------------------------------------------
PERIHAL :
${mail.subject}

ISI RINGKAS :
${mail.description}
============================================
${mail.aiSummary ? `RINGKASAN AI :\n${mail.aiSummary}\n============================================` : ''}
Dicetak pada : ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Arsip-${mail.referenceNumber.replace(/[^a-zA-Z0-9]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerateReply = async (mail: Mail) => {
    setReplyLoading(true);
    const reply = await suggestReply(`Pengirim: ${mail.sender}\nPerihal: ${mail.subject}\nIsi: ${mail.description}`);
    setAiReply(reply);
    setReplyLoading(false);
  };

  // Extract unique months from mails for the filter dropdown
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

  const getUrgencyColor = (u: UrgencyLevel) => {
    switch (u) {
      case UrgencyLevel.HIGH: return 'bg-red-100 text-red-700 border-red-200';
      case UrgencyLevel.MEDIUM: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            {type === MailType.INCOMING ? 'Surat Masuk' : 'Surat Keluar'}
          </h2>
          <p className="text-gray-500 text-sm">Kelola arsip surat {type === MailType.INCOMING ? 'yang diterima' : 'yang dikirim'} sekolah.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
        >
          <Plus size={20} className="mr-2" />
          Tambah Baru
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col xl:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Cari nomor surat, perihal, atau pengirim..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
           {/* Month Filter */}
          <div className="flex items-center gap-2 bg-gray-50 px-3 rounded-lg border border-gray-200">
            <Calendar className="text-gray-400" size={20} />
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-2 py-2 bg-transparent focus:outline-none text-gray-600 text-sm min-w-[140px]"
            >
              <option value="all">Semua Bulan</option>
              {availableMonths.map(month => (
                <option key={month} value={month}>
                  {format(new Date(month + '-01'), 'MMMM yyyy', { locale: id })}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 bg-gray-50 px-3 rounded-lg border border-gray-200">
            <Filter className="text-gray-400" size={20} />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2 py-2 bg-transparent focus:outline-none text-gray-600 text-sm min-w-[140px]"
            >
              <option value="Semua">Semua Kategori</option>
              <option value="Undangan">Undangan</option>
              <option value="Dinas">Dinas</option>
              <option value="Pemberitahuan">Pemberitahuan</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List Column */}
        <div className="lg:col-span-2 space-y-4">
          {filteredMails.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="text-gray-400" size={32} />
              </div>
              <h3 className="text-lg font-medium text-gray-800">Tidak ada data ditemukan</h3>
              <p className="text-gray-500">Coba ubah filter bulan, kategori, atau kata kunci pencarian.</p>
            </div>
          ) : (
            filteredMails.map((mail) => (
              <div 
                key={mail.id} 
                onClick={() => setSelectedMail(mail)}
                className={`group bg-white p-5 rounded-xl border transition-all cursor-pointer hover:shadow-md ${selectedMail?.id === mail.id ? 'border-blue-500 ring-1 ring-blue-500 shadow-md' : 'border-gray-100 hover:border-blue-200'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold border ${getUrgencyColor(mail.urgency)}`}>
                      {mail.urgency}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {mail.category}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">
                    {format(new Date(mail.date), 'dd MMM yyyy', { locale: id })}
                  </span>
                </div>
                <h3 className="font-bold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">{mail.subject}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{mail.description}</p>
                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                  <div className="flex items-center text-xs text-gray-500">
                    <span className="font-semibold mr-1">{type === MailType.INCOMING ? 'Dari:' : 'Kepada:'}</span>
                    {mail.sender}
                  </div>
                  <span className="text-xs text-gray-400">{mail.referenceNumber}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail Column (Sticky) */}
        <div className="lg:col-span-1">
          {selectedMail ? (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden sticky top-6">
              <div className="bg-blue-600 p-4 text-white flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">Detail Surat</h3>
                  <p className="text-blue-100 text-xs opacity-90">{selectedMail.referenceNumber}</p>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleDownload(selectedMail)} 
                    className="text-white hover:bg-white/20 p-2 rounded transition-colors"
                    title="Unduh Arsip"
                  >
                    <Download size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(selectedMail.id)} 
                    className="text-white hover:bg-white/20 p-2 rounded transition-colors"
                    title="Hapus Surat"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Perihal</label>
                  <p className="text-gray-800 font-semibold">{selectedMail.subject}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tanggal</label>
                    <p className="text-sm text-gray-700">{format(new Date(selectedMail.date), 'dd MMM yyyy', { locale: id })}</p>
                  </div>
                   <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kategori</label>
                    <p className="text-sm text-gray-700">{selectedMail.category}</p>
                  </div>
                </div>

                <div>
                   <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                     {type === MailType.INCOMING ? 'Pengirim' : 'Penerima'}
                   </label>
                   <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{selectedMail.sender}</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Isi Ringkas</label>
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg leading-relaxed">
                    {selectedMail.description}
                  </div>
                </div>

                {selectedMail.aiSummary && (
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                     <div className="flex items-center text-blue-700 mb-1">
                       <Sparkles size={14} className="mr-1 text-yellow-500" />
                       <span className="text-xs font-bold">Ringkasan AI</span>
                     </div>
                     <p className="text-xs text-blue-900 italic">"{selectedMail.aiSummary}"</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
                   {type === MailType.INCOMING && (
                     <>
                        <button 
                          onClick={() => handleGenerateReply(selectedMail)}
                          disabled={replyLoading}
                          className="w-full flex items-center justify-center px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-semibold"
                        >
                          {replyLoading ? 'Sedang membuat...' : 'Buat Draf Balasan (AI)'}
                          <Sparkles size={16} className="ml-2" />
                        </button>
                        {aiReply && (
                          <div className="mt-2 p-3 bg-purple-50 rounded text-xs text-gray-700 border border-purple-100 whitespace-pre-wrap">
                            <h5 className="font-bold mb-1 text-purple-800">Saran Balasan:</h5>
                            {aiReply}
                          </div>
                        )}
                     </>
                   )}
                   <div className="flex gap-2">
                     <button className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-semibold">
                        <Eye size={16} className="mr-2" />
                        Lihat File
                     </button>
                     <button 
                       onClick={() => handleDownload(selectedMail)}
                       className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm font-semibold"
                     >
                        <Download size={16} className="mr-2" />
                        Unduh
                     </button>
                   </div>
                </div>
              </div>
            </div>
          ) : (
             <div className="hidden lg:flex flex-col items-center justify-center h-64 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-center p-6">
               <AlertCircle size={48} className="mb-2 opacity-50" />
               <p className="font-medium">Pilih surat untuk melihat detail</p>
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