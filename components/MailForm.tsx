import React, { useState } from 'react';
import { MailType, MailStatus, UrgencyLevel, Mail } from '../types';
import { saveMail } from '../services/storage';
import { analyzeLetter } from '../services/geminiService';
import { CATEGORIES } from '../constants';
import { Save, X, Sparkles, Loader2, UploadCloud, FileType, FileImage, AlertTriangle, ScanLine } from 'lucide-react';

interface MailFormProps {
  type: MailType;
  onClose: () => void;
}

const MailForm: React.FC<MailFormProps> = ({ type, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeHighlights, setActiveHighlights] = useState<string[]>([]);
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
    if (error) setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { 
        setError("Ukuran file terlalu besar! Maksimal 2MB untuk analisis AI.");
        e.target.value = '';
        return; 
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, fileUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAIAnalysis = async () => {
    setAnalyzing(true);
    setError(null);
    setActiveHighlights([]);
    
    // Analisis berdasarkan teks atau gambar lampiran
    const result = await analyzeLetter(
      formData.description || '', 
      formData.fileUrl || undefined
    );

    if (result) {
      const highlights: string[] = [];
      
      setFormData(prev => {
        const newData = { ...prev };
        
        if (result.referenceNumber && (!prev.referenceNumber || prev.referenceNumber.includes('...'))) {
          newData.referenceNumber = result.referenceNumber;
          highlights.push('referenceNumber');
        }
        
        if (result.sender && !prev.sender) {
          newData.sender = result.sender;
          highlights.push('sender');
        }
        
        if (result.subject && (!prev.subject || prev.subject.length < 5)) {
          newData.subject = result.subject;
          highlights.push('subject');
        }

        if (result.date) {
          newData.date = result.date;
          highlights.push('date');
        }
        
        if (result.summary) {
          newData.aiSummary = result.summary;
          if (!prev.description) {
            newData.description = result.summary;
            highlights.push('description');
          }
        }
        
        if (result.category) newData.category = result.category;
        if (result.urgency) newData.urgency = result.urgency;
        
        return newData;
      });
      
      setActiveHighlights(highlights);
      setTimeout(() => setActiveHighlights([]), 3000);
    } else {
      setError("Gagal melakukan analisis AI. Periksa koneksi internet atau kualitas gambar.");
    }
    setAnalyzing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const mailData: Mail = {
      ...formData,
      createdAt: new Date().toISOString()
    } as Mail;

    try {
      await saveMail(mailData);
      setLoading(false);
      onClose();
    } catch (e: any) {
      setLoading(false);
      setError("Gagal menyimpan data ke database.");
    }
  };

  const inputClass = (name: string) => `w-full px-4 py-2.5 bg-slate-50 border ${activeHighlights.includes(name) ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200'} rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm font-medium text-slate-700 placeholder-slate-400`;
  const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5";

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
          {error && (
            <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm font-bold flex items-start animate-pulse-soft">
              <AlertTriangle className="mr-2 shrink-0 mt-0.5" size={16} />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Nomor Surat</label>
              <input name="referenceNumber" required value={formData.referenceNumber} onChange={handleChange} className={inputClass('referenceNumber')} placeholder="Ekstrak otomatis..." />
            </div>
            <div>
              <label className={labelClass}>{type === MailType.INCOMING ? 'Pengirim (Instansi)' : 'Tujuan'}</label>
              <input name="sender" required value={formData.sender} onChange={handleChange} className={inputClass('sender')} placeholder="Ekstrak otomatis..." />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-5">
             <div><label className={labelClass}>Tanggal Surat</label><input type="date" name="date" required value={formData.date} onChange={handleChange} className={inputClass('date')} /></div>
             <div><label className={labelClass}>Tanggal Proses</label><input type="date" name="receivedDate" required value={formData.receivedDate} onChange={handleChange} className={inputClass('receivedDate')} /></div>
          </div>
          
          <div>
            <label className={labelClass}>Perihal</label>
            <input name="subject" required value={formData.subject} onChange={handleChange} className={inputClass('subject')} placeholder="Judul atau perihal surat..." />
          </div>

          <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 relative">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-indigo-800 uppercase tracking-wide flex items-center gap-2">
                Isi / Keterangan Ringkas
                {analyzing && <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-ping"></span>}
              </label>
              <button type="button" onClick={handleAIAnalysis} disabled={analyzing} className={`flex items-center text-xs ${analyzing ? 'bg-slate-200 text-slate-400' : 'bg-white text-indigo-600'} px-3 py-1.5 rounded-full border border-indigo-200 shadow-sm hover:shadow-md transition-all font-black uppercase tracking-wider`}>
                {analyzing ? <Loader2 size={12} className="animate-spin mr-1.5"/> : <ScanLine size={12} className="mr-1.5 text-indigo-600"/>}
                {analyzing ? 'Membaca...' : 'Scan dengan AI'}
              </button>
            </div>
            <textarea name="description" rows={3} value={formData.description} onChange={handleChange} className={`${inputClass('description')} bg-white`} placeholder="Masukkan teks atau biarkan AI scan lampiran..." />
            {formData.aiSummary && (
              <div className="mt-2 p-3 bg-white/80 rounded-xl border border-indigo-100 text-[11px] text-indigo-800 italic flex items-start gap-2 animate-fade-in">
                <Sparkles size={12} className="shrink-0 mt-0.5 text-amber-500" />
                <span>AI: {formData.aiSummary}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
             <div>
               <label className={labelClass}>Kategori</label>
               <select name="category" value={formData.category} onChange={handleChange} className={inputClass('category')}>
                 {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
             </div>
             <div>
               <label className={labelClass}>Urgensi</label>
               <select name="urgency" value={formData.urgency} onChange={handleChange} className={inputClass('urgency')}>
                 {Object.values(UrgencyLevel).map(u => <option key={u} value={u}>{u}</option>)}
               </select>
             </div>
             <div>
               <label className={labelClass}>Lampiran Surat</label>
               <label className={`flex items-center justify-center w-full px-4 py-2.5 bg-slate-50 border border-dashed rounded-xl cursor-pointer transition-all hover:bg-slate-100 border-slate-300 ${formData.fileUrl ? 'bg-emerald-50 border-emerald-200' : ''}`}>
                 <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} />
                 {formData.fileUrl ? <FileImage size={16} className="mr-2 text-emerald-500" /> : <UploadCloud size={16} className="mr-2 text-slate-400" />}
                 <span className={`text-[11px] font-bold truncate ${formData.fileUrl ? 'text-emerald-600' : 'text-slate-500'}`}>
                   {formData.fileUrl ? "Gambar Siap Scan" : "Pilih Dokumen"}
                 </span>
               </label>
             </div>
          </div>

          <div className="pt-4 flex gap-3">
             <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors">Batal</button>
             <button type="submit" disabled={loading} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all flex justify-center items-center gap-2">
               {loading ? <Loader2 className="animate-spin"/> : <Save size={18} />}
               Simpan Data
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MailForm;