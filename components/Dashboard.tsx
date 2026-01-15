import React, { useEffect, useState } from 'react';
import { Mail, Send, AlertTriangle, FileText, TrendingUp, ArrowUpRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getStats, getSchoolConfig } from '../services/storage';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState(getStats());
  const [schoolConfig, setSchoolConfig] = useState(getSchoolConfig());

  useEffect(() => {
    const handleUpdate = () => {
      setStats(getStats());
      setSchoolConfig(getSchoolConfig());
    };
    
    window.addEventListener('storage-update', handleUpdate);
    window.addEventListener('config-update', handleUpdate);
    
    return () => {
      window.removeEventListener('storage-update', handleUpdate);
      window.removeEventListener('config-update', handleUpdate);
    };
  }, []);

  const statCards = [
    { title: 'Total Surat', value: stats.total, icon: <FileText size={24} />, color: 'from-blue-500 to-blue-600', text: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Surat Masuk', value: stats.incoming, icon: <Mail size={24} />, color: 'from-emerald-500 to-emerald-600', text: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Surat Keluar', value: stats.outgoing, icon: <Send size={24} />, color: 'from-violet-500 to-violet-600', text: 'text-violet-600', bg: 'bg-violet-50' },
    { title: 'Perlu Tindakan', value: stats.urgent, icon: <AlertTriangle size={24} />, color: 'from-rose-500 to-rose-600', text: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  const data = [
    { name: 'Masuk', value: stats.incoming },
    { name: 'Keluar', value: stats.outgoing },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-700 shadow-xl shadow-indigo-900/20 text-white p-8 md:p-10">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-28 h-28 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner flex-shrink-0">
             <img 
              src={schoolConfig.logoUrl} 
              alt="Logo" 
              className="w-20 h-20 object-contain drop-shadow-md"
              onError={(e) => { e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_Tut_Wuri_Handayani.svg"; }}
             />
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-br from-white to-indigo-100">
              {schoolConfig.name}
            </h1>
            <p className="text-indigo-100 text-lg mb-1 font-medium">Sistem Informasi Manajemen Arsip Surat</p>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs text-indigo-50 mt-2">
              <SchoolConfigIcon className="w-3 h-3 mr-2" />
              {schoolConfig.address}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-6 shadow-[0_2px_20px_rgb(0,0,0,0.04)] border border-slate-100 hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 mb-1">{card.title}</p>
                <h3 className="text-3xl font-bold text-slate-800">{card.value}</h3>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-lg shadow-indigo-500/10 group-hover:scale-110 transition-transform`}>
                {card.icon}
              </div>
            </div>
            <div className={`mt-4 pt-4 border-t border-slate-50 flex items-center text-xs font-semibold ${card.text}`}>
               <div className={`px-2 py-1 rounded-md ${card.bg} mr-2`}>Update</div>
               Realtime
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-[0_2px_20px_rgb(0,0,0,0.04)] border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Statistik Surat</h3>
              <p className="text-slate-500 text-sm">Perbandingan volume surat masuk & keluar</p>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg">
              <TrendingUp className="text-indigo-600" size={24} />
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barSize={60}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    padding: '12px 16px',
                    fontFamily: 'Plus Jakarta Sans, sans-serif'
                  }}
                />
                <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                  <Cell fill="#6366f1" /> {/* Indigo */}
                  <Cell fill="#8b5cf6" /> {/* Violet */}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Promo Card */}
        <div className="bg-slate-900 rounded-3xl shadow-xl p-8 text-white relative overflow-hidden flex flex-col justify-between">
          {/* Decorative Gradients */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-[80px] opacity-40 -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500 rounded-full blur-[80px] opacity-30 -ml-20 -mb-20"></div>
          
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center mb-6 border border-white/20">
              <svg className="w-6 h-6 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <h3 className="text-2xl font-bold mb-3 leading-tight">AI Assistant Terintegrasi</h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Analisis surat otomatis, ringkasan instan, dan draf balasan cerdas untuk menghemat waktu administrasi Anda hingga 70%.
            </p>
          </div>
          
          <button className="relative z-10 w-full py-3.5 px-4 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors flex items-center justify-center group">
            Coba Sekarang
            <ArrowUpRight size={16} className="ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper for address icon
const SchoolConfigIcon = (props: any) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
);

export default Dashboard;