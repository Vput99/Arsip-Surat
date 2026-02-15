
import React, { useEffect, useState } from 'react';
import { Mail, Send, AlertTriangle, FileText, TrendingUp, ArrowUpRight, Clock, MapPin, Activity, CalendarCheck, HandCoins } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { subscribeToMails, subscribeToConfig } from '../services/storage';
import { SchoolConfig, Mail as MailType, MailType as MType } from '../types';
// Re-verified named import for Link from react-router-dom
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { id } from 'date-fns/locale/id';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({ total: 0, incoming: 0, outgoing: 0, urgent: 0 });
  const [latestMails, setLatestMails] = useState<MailType[]>([]);
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig | null>(null);

  useEffect(() => {
    const unsubscribeMails = subscribeToMails((mails) => {
      setStats({
        total: mails.length,
        incoming: mails.filter(m => m.type === MType.INCOMING).length,
        outgoing: mails.filter(m => m.type === MType.OUTGOING).length,
        urgent: mails.filter(m => m.urgency === 'Segera').length
      });
      setLatestMails(mails.slice(0, 5));
    });

    const unsubscribeConfig = subscribeToConfig(setSchoolConfig);
    
    return () => {
      unsubscribeMails();
      unsubscribeConfig();
    };
  }, []);

  if (!schoolConfig) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
        <Activity className="animate-spin text-indigo-600 w-12 h-12"/> 
        <span className="font-black text-slate-400 uppercase tracking-widest text-sm">Sinkronisasi Basis Data...</span>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Arsip', value: stats.total, icon: <FileText size={24} />, color: 'from-blue-500 to-blue-600' },
    { title: 'Arsip Masuk', value: stats.incoming, icon: <Mail size={24} />, color: 'from-emerald-500 to-emerald-600' },
    { title: 'Arsip Keluar', value: stats.outgoing, icon: <Send size={24} />, color: 'from-violet-500 to-violet-600' },
    { title: 'Perlu Tindakan', value: stats.urgent, icon: <AlertTriangle size={24} />, color: 'from-rose-500 to-rose-600' },
  ];

  const chartData = [
    { name: 'Masuk', value: stats.incoming },
    { name: 'Keluar', value: stats.outgoing },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Banner Utama */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 shadow-2xl text-white p-8 md:p-12">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-indigo-500 opacity-10 rounded-full blur-[100px]"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="w-32 h-32 bg-white/5 backdrop-blur-xl rounded-[2rem] flex items-center justify-center border border-white/10 shadow-2xl flex-shrink-0">
             <img src={schoolConfig.logoUrl} alt="Logo" className="w-24 h-24 object-contain" />
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2 uppercase">{schoolConfig.name}</h1>
            <p className="text-indigo-200 text-lg font-bold opacity-80 mb-4 tracking-wide">Sistem Arsip & Administrasi Digital Realtime</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <span className="px-4 py-1.5 rounded-full bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <MapPin size={12} /> {schoolConfig.address}
              </span>
              <span className="px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div> Database Online
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Cepat (Fitur Baru) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/attendance" className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all flex items-center gap-6 group">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <CalendarCheck size={32} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Input Absensi</h3>
            <p className="text-slate-500 font-medium text-sm italic">Kelola daftar hadir Guru, Pegawai, & Tukang.</p>
          </div>
          <ArrowUpRight className="ml-auto text-slate-300 group-hover:text-emerald-600 transition-colors" />
        </Link>
        <Link to="/honor" className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all flex items-center gap-6 group">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <HandCoins size={32} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Penerimaan Honor</h3>
            <p className="text-slate-500 font-medium text-sm italic">Format Juknis BOS 2026 + Pajak Otomatis.</p>
          </div>
          <ArrowUpRight className="ml-auto text-slate-300 group-hover:text-amber-600 transition-colors" />
        </Link>
      </div>

      {/* Statistik Utama */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <div key={idx} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:-translate-y-1 transition-all group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.title}</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{card.value}</h3>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-lg`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Volume Arsip</h3>
            <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600"><TrendingUp size={24} /></div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={60}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 800}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                <Bar dataKey="value" radius={[15, 15, 0, 0]}>
                  <Cell fill="#6366f1" />
                  <Cell fill="#8b5cf6" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
              <Activity size={18} className="text-indigo-600" /> Terbaru
            </h3>
            <Link to="/inbox" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Semua</Link>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[350px] pr-2">
            {latestMails.map((mail) => (
              <div key={mail.id} className="p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-indigo-100 transition-all">
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${mail.type === MType.INCOMING ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>{mail.type}</span>
                  <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1"><Clock size={10} /> {format(new Date(mail.createdAt), 'dd/MM HH:mm')}</span>
                </div>
                <h4 className="text-xs font-black text-slate-800 uppercase line-clamp-1">{mail.subject}</h4>
              </div>
            ))}
          </div>
          <Link to="/create" className="mt-6 w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-indigo-600 transition-all">
            Buat Naskah Baru <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
