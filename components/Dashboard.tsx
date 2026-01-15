import React, { useEffect, useState } from 'react';
import { Mail, Send, AlertTriangle, FileText, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getStats } from '../services/storage';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState(getStats());

  useEffect(() => {
    // Listen for mock realtime updates
    const handleUpdate = () => setStats(getStats());
    window.addEventListener('storage-update', handleUpdate);
    return () => window.removeEventListener('storage-update', handleUpdate);
  }, []);

  const statCards = [
    { title: 'Total Surat', value: stats.total, icon: <FileText size={24} />, color: 'bg-blue-500' },
    { title: 'Surat Masuk', value: stats.incoming, icon: <Mail size={24} />, color: 'bg-green-500' },
    { title: 'Surat Keluar', value: stats.outgoing, icon: <Send size={24} />, color: 'bg-purple-500' },
    { title: 'Perlu Tindakan', value: stats.urgent, icon: <AlertTriangle size={24} />, color: 'bg-red-500' },
  ];

  const data = [
    { name: 'Masuk', value: stats.incoming },
    { name: 'Keluar', value: stats.outgoing },
  ];

  const COLORS = ['#10B981', '#8B5CF6'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header dengan Logo Sekolah */}
      <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-6">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center border-4 border-white shadow-lg flex-shrink-0 overflow-hidden relative">
           <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Logo_Kota_Kediri.png/900px-Logo_Kota_Kediri.png" 
            alt="Logo Sekolah" 
            className="w-full h-full object-contain p-1"
            onError={(e) => {
              // Fallback jika gambar gagal dimuat, menggunakan placeholder sekolah umum
              e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_Tut_Wuri_Handayani.svg";
            }}
           />
        </div>
        <div className="text-center md:text-left">
          <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">SD NEGERI TEMPUREJO 1</h2>
          <div className="h-1.5 w-24 bg-blue-600 rounded-full my-2 mx-auto md:mx-0"></div>
          <p className="text-gray-600 text-lg font-medium">Sistem Informasi Manajemen Arsip Surat</p>
          <p className="text-gray-400 text-sm">Jl. Raya Tempurejo No. 12 Kec. Pesantren Kota Kediri</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{card.title}</p>
                <h3 className="text-3xl font-bold text-gray-800">{card.value}</h3>
              </div>
              <div className={`${card.color} p-3 rounded-lg text-white shadow-lg shadow-opacity-30`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <TrendingUp className="mr-2 text-blue-500" size={20} />
            Statistik Surat Bulan Ini
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  cursor={{fill: '#F3F4F6'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="value" barSize={50} radius={[8, 8, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white opacity-10 rounded-full"></div>
          <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 bg-white opacity-10 rounded-full"></div>
          
          <h3 className="text-xl font-bold mb-2 relative z-10">Asisten Pintar (AI)</h3>
          <p className="text-blue-100 mb-6 relative z-10">
            Gunakan fitur AI untuk menganalisis isi surat masuk secara otomatis, mendapatkan ringkasan instan, dan saran balasan yang sesuai dengan format kedinasan.
          </p>
          <button className="relative z-10 bg-white text-blue-700 px-6 py-2 rounded-lg font-semibold shadow hover:bg-blue-50 transition-colors">
            Coba di Menu Surat
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;