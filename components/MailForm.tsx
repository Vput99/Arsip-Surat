import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, MailType, MailStatus, UrgencyLevel } from '../types';
import { saveMail } from '../services/storage';
import { analyzeLetter } from '../services/geminiService';
import { CATEGORIES } from '../constants';
import { Save, X, Sparkles, Loader2, AlertTriangle } from 'lucide-react';

interface MailFormProps {
  type: MailType;
  onClose: () => void;
}

const MailForm: React.FC<MailFormProps> = ({ type, onClose }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [fileError, setFileError] = useState<string>('');
  
  const [formData, setFormData] = useState<Partial<Mail>>({
    type: type,
    status: MailStatus.PENDING,
    urgency: UrgencyLevel.LOW,
    category: CATEGORIES[0],
    date: new Date().toISOString().split('T')[0],
    receivedDate: new Date().toISOString().split('T')[0],
    subject: '',
    description: '',
    referenceNumber: '',
    sender: '',
    fileUrl: '', 
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // FUNGSI UTAMA: Mengubah file menjadi Base64 string agar bisa disimpan di LocalStorage
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError('');

    if (file) {
      // Validasi Ukuran: Batasi 1MB agar LocalStorage tidak penuh/crash
      if (file.size > 1024 * 1024) {
        setFileError('Ukuran file terlalu besar! Maksimal 1MB untuk penyimpanan lokal.');
        e.target.value = ''; // Reset input
        return;
      }

      // Validasi Tipe
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
        setFileError('Hanya file PDF, JPG, dan PNG yang diperbolehkan.');
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        // Simpan hasil konversi (Base64 string panjang) ke state
        setFormData(prev => ({ 
          ...prev, 
          fileUrl: reader.result as string 
        }));
      };
      reader.onerror = () => {
        setFileError('Gagal membaca file.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAIAnalysis = async () => {
    if (!formData.description && !formData.subject) {
      alert("Mohon isi perihal atau deskripsi surat terlebih dahulu untuk dianalisis.");
      return;
    }

    setAnalyzing(true);
    const textToAnalyze = `Perihal: ${formData.subject}\nIsi: ${formData.description}`;
    
    const result = await analyzeLetter(textToAnalyze);
    
    if (result) {
      setFormData(prev => ({
        ...prev,
        category: result.category || prev.category,
        urgency: result.urgency || prev.urgency,
        aiSummary: result.summary
      }));
    }
    setAnalyzing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const newMail: Mail = {
      id: Date.now().toString(),
      type: type,
      referenceNumber: formData.referenceNumber || '-',
      date: formData.date!,
      receivedDate: formData.receivedDate!,
      sender: formData.sender!,
      subject: formData.subject!,
      description: formData.description!,
      category: formData.category!,
      urgency: formData.urgency!,
      status: formData.status!,
      aiSummary: formData.aiSummary,
      fileUrl: formData.fileUrl // Berisi data file asli (Base64)
    };

    try {
      saveMail(newMail);
      setLoading(false);
      onClose();
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan. Kemungkinan ukuran file total melebihi kapasitas browser.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl animate-fade-in-up my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            {type === MailType.INCOMING ? '📥 Tambah Surat Masuk' : '📤 Tambah Surat Keluar'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Surat</label>
              <input
                type="text"
                name="referenceNumber"
                required
                value={formData.referenceNumber}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Contoh: 001/SD-01/2024"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {type === MailType.INCOMING ? 'Pengirim' : 'Tujuan / Penerima'}
              </label>
              <input
                type="text"
                name="sender"
                required
                value={formData.sender}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder={type === MailType.INCOMING ? "Nama Instansi / Perseorangan" : "Nama Tujuan"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Surat</label>
              <input
                type="date"
                name="date"
                required
                value={formData.date}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {type === MailType.INCOMING ? 'Tanggal Diterima' : 'Tanggal Dikirim'}
              </label>
              <input
                type="date"
                name="receivedDate"
                required
                value={formData.receivedDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Perihal</label>
            <input
              type="text"
              name="subject"
              required
              value={formData.subject}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Contoh: Undangan Rapat Wali Murid"
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
             <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-blue-800">
                  Isi Ringkas / Keterangan
                </label>
                <button
                  type="button"
                  onClick={handleAIAnalysis}
                  disabled={analyzing}
                  className="flex items-center text-xs bg-white text-blue-600 px-3 py-1 rounded-full border border-blue-200 shadow-sm hover:bg-blue-50 transition-all"
                >
                  {analyzing ? <Loader2 size={12} className="animate-spin mr-1"/> : <Sparkles size={12} className="mr-1 text-yellow-500"/>}
                  {analyzing ? 'Menganalisis...' : 'Analisis dengan AI'}
                </button>
             </div>
             <textarea
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                placeholder="Tuliskan isi surat secara ringkas, atau tempel teks dari surat di sini untuk dianalisis oleh AI."
             />
             {formData.aiSummary && (
               <div className="mt-3 bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                 <p className="text-xs font-bold text-blue-600 mb-1 flex items-center"><Sparkles size={10} className="mr-1"/> Ringkasan AI:</p>
                 <p className="text-sm text-gray-700 italic">"{formData.aiSummary}"</p>
               </div>
             )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Urgensi</label>
              <select
                name="urgency"
                value={formData.urgency}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
              >
                {Object.values(UrgencyLevel).map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload File (Max 1MB)</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors cursor-pointer"
              />
              {fileError ? (
                <p className="text-xs text-red-500 mt-1 flex items-center"><AlertTriangle size={10} className="mr-1"/>{fileError}</p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">
                  {formData.fileUrl ? `File berhasil dimuat` : 'Format: PDF, JPG, PNG'}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !!fileError}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={18} className="animate-spin mr-2"/> : <Save size={18} className="mr-2"/>}
              Simpan Surat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MailForm;