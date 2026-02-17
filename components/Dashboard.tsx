
import React, { useEffect, useState } from 'react';
import { Mail, Send, AlertTriangle, FileText, TrendingUp, ArrowUpRight, Clock, MapPin, Activity, CalendarCheck, HandCoins, PenTool, ClipboardCheck, Settings, LayoutGrid } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { subscribeToMails, subscribeToConfig } from '../services/storage';
import { SchoolConfig, Mail as MailType, MailType as MType } from '../types';
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
      <div className="flex flex-col justify-center items-center h-[60vh] gap-6">
        <div className="relative">
           <Activity className="animate-spin text-indigo-600 w-16 h-16 opacity-20"/> 
           <Activity className="absolute inset-0 animate-pulse text-indigo-600 w-16 h-16"/> 
        </div>
        <span className="font-black text-slate-400 uppercase tracking-[0.3em] text-xs">Menghubungkan Server Realtime...</span>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Arsip', value: stats.total, icon: <FileText size={22} />, color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-200' },
    { title: 'Arsip Masuk', value: stats.incoming, icon: <Mail size={22} />, color: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-200' },
    { title: 'Arsip Keluar', value: stats.outgoing, icon: <Send size={22} />, color: 'from-violet-500 to-violet-600', shadow: 'shadow-violet-200' },
    { title: 'Perlu Tindakan', value: stats.urgent, icon: <AlertTriangle size={22} />, color: 'from-rose-500 to-rose-600', shadow: 'shadow-rose-200' },
  ];

  const quickActions = [
    { path: '/create', label: 'Input Naskah', icon: <PenTool size={20} />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { path: '/attendance', label: 'Absensi', icon: <CalendarCheck size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { path: '/monthly-report', label: 'Lapor Bulan', icon: <ClipboardCheck size={20} />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { path: '/settings', label: 'Pengaturan', icon: <Settings size={20} />, color: 'text-slate-600', bg: 'bg-slate-100' },
  ];

  const chartData = [
    { name: 'Masuk', value: stats.incoming },
    { name: 'Keluar', value: stats.outgoing },
  ];

  return (
    <div className="space-y-10 animate-fade-in pb-16">
      {/* Banner Utama */}
      <div className="relative overflow-hidden rounded-[3rem] bg-slate-900 shadow-2xl text-white p-10 md:p-14 border border-white/5 group">
        <div className="absolute top-0 right-0 -mt-24 -mr-24 w-96 h-96 bg-indigo-600 opacity-20 rounded-full blur-[120px] group-hover:opacity-30 transition-opacity duration-700"></div>
        <div className="absolute bottom-0 left-0 -mb-24 -ml-24 w-96 h-96 bg-emerald-600 opacity-10 rounded-full blur-[100px]"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
          <div className="w-40 h-40 bg-white/10 backdrop-blur-2xl rounded-[2.5rem] flex items-center justify-center border border-white/20 shadow-2xl flex-shrink-0 ring-4 ring-white/5 hover:scale-105 transition-transform duration-500">
             <img src={schoolConfig.logoUrl} alt="Logo" className="w-28 h-28 object-contain" />
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 uppercase leading-tight drop-shadow-lg">{schoolConfig.name}</h1>
            <p className="text-indigo-200 text-lg md:text-xl font-bold opacity-80 mb-8 tracking-wide max-w-2xl mx-auto md:mx-0">Sistem Informasi Manajemen Arsip Sekolah Berbasis Realtime & Intelligence.</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <span className="px-5 py-2.5 rounded-2xl bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2.5 backdrop-blur-md">
                <MapPin size={14} className="text-indigo-400" /> {schoolConfig.address}
              </span>
              <span className="px-5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-2.5 backdrop-blur-md">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div> Realtime Sync
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Cepat & Statistik */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {quickActions.map((action, i) => (
                  <Link key={i} to={action.path} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-3 group">
                     <div className={`w-12 h-12 ${action.bg} ${action.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        {action.icon}
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-indigo-600">{action.label}</span>
                  </Link>
               ))}
            </div>

            <div className="grid grid-cols-2 gap-6">
               {statCards.map((card, idx) => (
                  <div key={idx} className="bg-white rounded-[2.5rem] p-7 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-500 group relative overflow-hidden">
                     <div className="flex items-start justify-between relative z-10">
                        <div>
                           <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{card.title}</p>
                           <h3 className="text-3xl font-black text-slate-900 tracking-tight">{card.value}</h3>
                        </div>
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-xl ${card.shadow} group-hover:scale-110 transition-transform duration-500`}>
                           {card.icon}
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>

         <div className="lg:col-span-4 bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col">
            <div className="flex items-center gap-3 mb-8">
               <div className="bg-indigo-600 p-2 rounded-xl text-white"><LayoutGrid size={20}/></div>
               <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Navigasi Utama</h3>
            </div>
            <div className="space-y-3 flex-1">
               <Link to="/attendance" className="flex items-center gap-4 p-5 bg-emerald-50 border border-emerald-100 rounded-[2rem] group hover:bg-emerald-600 transition-all">
                  <div className="bg-white p-3 rounded-2xl text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white"><CalendarCheck size={24}/></div>
                  <div>
                     <p className="text-sm font-black text-emerald-900 group-hover:text-white uppercase">Absensi Realtime</p>
                     <p className="text-[10px] text-emerald-600 group-hover:text-emerald-100 font-bold uppercase">Guru & Pegawai</p>
                  </div>
               </Link>
               <Link to="/honor" className="flex items-center gap-4 p-5 bg-amber-50 border border-amber-100 rounded-[2rem] group hover:bg-amber-600 transition-all">
                  <div className="bg-white p-3 rounded-2xl text-amber-600 group-hover:bg-amber-500 group-hover:text-white"><HandCoins size={24}/></div>
                  <div>
                     <p className="text-sm font-black text-amber-900 group-hover:text-white uppercase">Penerimaan Honor</p>
                     <p className="text-[10px] text-amber-600 group-hover:text-amber-100 font-bold uppercase">Dana BOS & Pajak</p>
                  </div>
               </Link>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="flex items-center justify-between mb-12 relative z-10">
            <div>
               <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Analisis Volume Arsip</h3>
               <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Perbandingan Masuk vs Keluar</p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 shadow-inner"><TrendingUp size={28} /></div>
          </div>
          <div className="h-80 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={70}>
                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 13, fontWeight: 800}} dy={15} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 500}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '16px', fontWeight: 'bold' }} />
                <Bar dataKey="value" radius={[20, 20, 0, 0]} animationDuration={1500}>
                  <Cell fill="#6366f1" />
                  <Cell fill="#8b5cf6" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-[#0F172A] p-8 rounded-[3rem] shadow-2xl border border-white/5 flex flex-col group">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
              <div className="bg-indigo-600 p-2 rounded-xl"><Activity size={20} className="text-white animate-pulse" /></div>
              Aktivitas Terkini
            </h3>
            <Link to="/inbox" className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] hover:text-white transition-colors">View All</Link>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto max-h-[380px] pr-2 custom-scrollbar">
            {latestMails.length > 0 ? latestMails.map((mail) => (
              <div key={mail.id} className="p-5 bg-white/5 hover:bg-white/10 rounded-[2rem] border border-white/5 hover:border-white/10 transition-all duration-300 group/item">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${mail.type === MType.INCOMING ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>{mail.type}</span>
                  <span className="text-[9px] font-bold text-slate-500 flex items-center gap-2"><Clock size={12} /> {format(new Date(mail.createdAt), 'dd/MM HH:mm')}</span>
                </div>
                <h4 className="text-[13px] font-black text-slate-200 uppercase line-clamp-2 leading-relaxed group-hover/item:text-white transition-colors">{mail.subject}</h4>
              </div>
            )) : (
              <div className="py-20 text-center opacity-30 flex flex-col items-center">
                 <FileText size={40} className="text-slate-500 mb-4" />
                 <p className="text-xs font-black uppercase tracking-widest">Belum ada arsip</p>
              </div>
            )}
          </div>
          <Link to="/create" className="mt-8 w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-indigo-900/40 flex items-center justify-center gap-4 hover:bg-white hover:text-indigo-600 transition-all duration-500 transform active:scale-95">
            NEW ARCHIVE <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
