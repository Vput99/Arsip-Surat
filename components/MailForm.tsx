import React, { useState } from 'react';
import { MailType, MailStatus, UrgencyLevel, Mail } from '../types';
import { saveMail } from '../services/storage';
import { analyzeLetter } from '../services/geminiService';
import { CATEGORIES } from '../constants';
import { Save, X, Sparkles, Loader2, UploadCloud, FileType, FileImage } from 'lucide-react';

interface MailFormProps {
  type: MailType;
  onClose: () => void;
}

const MailForm: React.FC<MailFormProps> = ({ type, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [formData, setFormData] = useState<Partial<Mail>>({
    type: type,
    status: MailStatus.PENDING,
    urgency: UrgencyLevel.LOW,
    category: CATEGORIES[0],
    date: new Date().toISOString().split('T')[0],
    receivedDate: new Date().toISOString().split('T')[0],
    subject: '', description: '', referenceNumber: '', sender: '', fileUrl: '', 
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { 
        alert("Ukuran file maksimal 2MB"); 
        return; 
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        // Simpan file asli sebagai Base64 string (termasuk mime-type header)
        setFormData(prev => ({ ...prev, fileUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAIAnalysis = async () => {
    if (!formData.description) return alert("Isi deskripsi dulu!");
    setAnalyzing(true);
    const result = await analyzeLetter(`Perihal: ${formData.subject}\nIsi: ${formData.description}`);
    if (result) {
      setFormData(prev => ({
        ...prev, category: result.category || prev.category, urgency: result.urgency || prev.urgency, aiSummary: result.summary
      }));
    }
    setAnalyzing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simpan dengan timestamp realtime saat ini
    const mailData: Mail = {
      ...formData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString() // Waktu Realtime saat tombol simpan ditekan
    } as Mail;

    saveMail(mailData);
    setLoading(false);
    onClose();
  };

  const inputClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm font-medium text-slate-700 placeholder-slate-400";
  const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5";

  // Helper untuk menampilkan icon tipe file
  const getFileIcon = () => {
    if (!formData.fileUrl) return <UploadCloud size={16} className="mr-2 text-slate-400" />;
    if (formData.fileUrl.startsWith('data:image')) return <FileImage size={16} className="mr-2 text-emerald-500" />;
    return <FileType size={16} className="mr-2 text-rose-500" />;
  };

  const getFileName = () => {
    if (!formData.fileUrl) return "Upload File";
    if (formData.fileUrl.startsWith('data:image')) return "Gambar Terlampir";
    if (formData.fileUrl.startsWith('data:application/pdf')) return "Dokumen PDF";
    return "File Terlampir";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
          <h2 className="text-xl font-extrabold text-slate-800">
            {type === MailType.INCOMING ? '📥 Catatan Masuk' : '📤 Catatan Keluar'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500"/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div><label className={labelClass}>Nomor Surat</label><input name="referenceNumber" required value={formData.referenceNumber} onChange={handleChange} className={inputClass} placeholder="No. Agenda" /></div>
            <div><label className={labelClass}>{type === MailType.INCOMING ? 'Pengirim' : 'Tujuan'}</label><input name="sender" required value={formData.sender} onChange={handleChange} className={inputClass} placeholder="Nama Instansi" /></div>
          </div>
          <div className="grid grid-cols-2 gap-5">
             <div><label className={labelClass}>Tanggal Surat</label><input type="date" name="date" required value={formData.date} onChange={handleChange} className={inputClass} /></div>
             <div><label className={labelClass}>Tanggal Proses</label><input type="date" name="receivedDate" required value={formData.receivedDate} onChange={handleChange} className={inputClass} /></div>
          </div>
          
          <div><label className={labelClass}>Perihal</label><input name="subject" required value={formData.subject} onChange={handleChange} className={inputClass} placeholder="Judul Surat" /></div>

          <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-indigo-800 uppercase tracking-wide">Isi / Keterangan</label>
              <button type="button" onClick={handleAIAnalysis} disabled={analyzing} className="flex items-center text-xs bg-white text-indigo-600 px-3 py-1 rounded-full border border-indigo-200 shadow-sm hover:shadow-md transition-all font-bold">
                {analyzing ? <Loader2 size={12} className="animate-spin mr-1"/> : <Sparkles size={12} className="mr-1 text-amber-500"/>}
                Auto-Analyze
              </button>
            </div>
            <textarea name="description" rows={4} value={formData.description} onChange={handleChange} className={`${inputClass} bg-white`} placeholder="Ringkasan isi..." />
            {formData.aiSummary && <div className="mt-2 p-3 bg-white rounded-xl border border-indigo-100 text-xs text-indigo-800 italic">"{formData.aiSummary}"</div>}
          </div>

          <div className="grid grid-cols-3 gap-4">
             <div>
               <label className={labelClass}>Kategori</label>
               <select name="category" value={formData.category} onChange={handleChange} className={inputClass}>
                 {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
             </div>
             <div>
               <label className={labelClass}>Urgensi</label>
               <select name="urgency" value={formData.urgency} onChange={handleChange} className={inputClass}>
                 {Object.values(UrgencyLevel).map(u => <option key={u} value={u}>{u}</option>)}
               </select>
             </div>
             <div>
               <label className={labelClass}>Lampiran (Asli)</label>
               <label className={`flex items-center justify-center w-full px-4 py-2.5 bg-slate-50 border border-dashed rounded-xl cursor-pointer transition-colors hover:bg-slate-100 border-slate-300`}>
                 <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} />
                 
                 {getFileIcon()}
                 <span className={`text-xs font-bold ${formData.fileUrl ? 'text-emerald-600' : 'text-slate-500'}`}>
                   {getFileName()}
                 </span>
               </label>
             </div>
          </div>

          <div className="pt-4 flex gap-3">
             <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors">Batal</button>
             <button type="submit" disabled={loading} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all flex justify-center items-center">
               {loading ? <Loader2 className="animate-spin"/> : 'Simpan Data'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MailForm;