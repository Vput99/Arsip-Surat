import React, { useState, useEffect } from 'react';
import { Save, Upload, School, Loader2 } from 'lucide-react';
import { getSchoolConfig, saveSchoolConfig } from '../services/storage';
import { SchoolConfig } from '../types';

const Settings: React.FC = () => {
  const [config, setConfig] = useState<SchoolConfig>(getSchoolConfig());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { // Limit 500KB for logo
        setMessage({ text: 'Ukuran logo terlalu besar (Maks 500KB)', type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      saveSchoolConfig(config);
      setMessage({ text: 'Pengaturan berhasil disimpan!', type: 'success' });
    } catch (err) {
      setMessage({ text: 'Gagal menyimpan pengaturan.', type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <School className="mr-3 text-blue-600" />
          Identitas Sekolah
        </h2>

        {message.text && (
          <div className={`p-4 mb-6 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Logo Section */}
            <div className="w-full md:w-1/3 flex flex-col items-center space-y-4">
              <div className="w-48 h-48 bg-gray-50 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center relative group">
                {config.logoUrl ? (
                  <img src={config.logoUrl} alt="Logo Sekolah" className="w-full h-full object-contain p-2" />
                ) : (
                  <School size={64} className="text-gray-300" />
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                  {/* Overlay for hover effect */}
                </div>
              </div>
              
              <label className="cursor-pointer">
                <span className="flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-semibold border border-blue-200">
                  <Upload size={16} className="mr-2" />
                  Ganti Logo
                </span>
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </label>
              <p className="text-xs text-gray-400 text-center">Format: PNG, JPG (Transparan disarankan). Maks 500KB.</p>
            </div>

            {/* Form Section */}
            <div className="w-full md:w-2/3 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Sekolah</label>
                <input
                  type="text"
                  name="name"
                  value={config.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Contoh: SD NEGERI 01 PAGI"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Lengkap</label>
                <input
                  type="text"
                  name="address"
                  value={config.address}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Jl. Merdeka No. 45, Jakarta Pusat"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Sekolah (Untuk Kop Surat)</label>
                <input
                  type="email"
                  name="email"
                  value={config.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="admin@sekolah.sch.id"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 font-medium"
            >
              {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;