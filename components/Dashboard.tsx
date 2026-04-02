
import React, { useEffect, useState } from 'react';
import { Mail, Send, AlertTriangle, FileText, TrendingUp, ArrowUpRight, Clock, MapPin, Activity, CalendarCheck, HandCoins, PenTool, ClipboardCheck, Settings, LayoutGrid, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { subscribeToMails, subscribeToConfig, subscribeToLogs } from '../services/storage';
import { SchoolConfig, Mail as MailType, MailType as MType, ActivityLog } from '../types';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { id } from 'date-fns/locale/id';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({ total: 0, incoming: 0, outgoing: 0, urgent: 0 });
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig | null>(null);

  useEffect(() => {
    const unsubscribeMails = subscribeToMails((mails) => {
      setStats({
        total: mails.length,
        incoming: mails.filter(m => m.type === MType.INCOMING).length,
        outgoing: mails.filter(m => m.type === MType.OUTGOING).length,
        urgent: mails.filter(m => m.urgency === 'Segera').length
      });
    });

    const unsubscribeConfig = subscribeToConfig(setSchoolConfig);
    const unsubscribeLogs = subscribeToLogs(setLogs);
    
    return () => {
      unsubscribeMails();
      unsubscribeConfig();
      unsubscribeLogs();
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
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-premium-900 via-premium-800 to-indigo-900 shadow-2xl text-white p-10 md:p-14 border border-white/10 group transform transition-all duration-700 hover:shadow-[0_20px_60px_-15px_rgba(148,64,255,0.4)]">
        <div className="absolute top-0 right-0 -mt-24 -mr-24 w-[35rem] h-[35rem] bg-gradient-to-bl from-premium-400/40 to-transparent rounded-full blur-[80px] group-hover:scale-110 transition-transform duration-1000 ease-out"></div>
        <div className="absolute bottom-0 left-0 -mb-24 -ml-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px] group-hover:bg-emerald-400/30 transition-colors duration-1000"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
          <div className="w-40 h-40 bg-white/5 backdrop-blur-3xl rounded-[2.5rem] flex items-center justify-center border border-white/20 shadow-[0_0_40px_rgba(255,255,255,0.1)] flex-shrink-0 ring-1 ring-white/30 transform group-hover:scale-105 group-hover:rotate-6 transition-all duration-700">
             <img src={schoolConfig.logoUrl} alt="Logo" className="w-28 h-28 object-contain drop-shadow-2xl group-hover:animate-float" />
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 uppercase leading-tight drop-shadow-lg bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-premium-200">{schoolConfig.name}</h1>
            <p className="text-premium-100 text-lg md:text-xl font-medium opacity-90 mb-8 tracking-wide max-w-2xl mx-auto md:mx-0 drop-shadow-md">Sistem Informasi Manajemen Arsip Sekolah Berbasis Realtime & Intelligence.</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <span className="px-6 py-3 rounded-2xl bg-white/10 border border-white/20 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2.5 backdrop-blur-md shadow-lg transition-transform hover:scale-105 cursor-default">
                <MapPin size={14} className="text-premium-300" /> {schoolConfig.address}
              </span>
              <span className="px-6 py-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300 flex items-center gap-2.5 backdrop-blur-md shadow-[0_0_15px_rgba(52,211,153,0.2)] transition-transform hover:scale-105 cursor-default">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-glow shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div> Realtime Sync
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Cepat & Statistik */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
               {quickActions.map((action, i) => (
                  <Link key={i} to={action.path} className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1.5 hover:bg-white transition-all duration-500 flex flex-col items-center justify-center gap-4 group relative overflow-hidden">
                     <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <div className={`w-14 h-14 ${action.bg} ${action.color} rounded-[1.25rem] flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-inner z-10`}>
                        {action.icon}
                     </div>
                     <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 group-hover:text-premium-600 z-10 transition-colors">{action.label}</span>
                  </Link>
               ))}
            </div>

            <div className="grid grid-cols-2 gap-6">
               {statCards.map((card, idx) => (
                  <div key={idx} className="bg-white/90 backdrop-blur-3xl rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] hover:border-premium-100 transition-all duration-700 group relative overflow-hidden group-hover:-translate-y-2">
                     <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${card.color} opacity-5 rounded-full blur-2xl group-hover:opacity-20 transition-opacity duration-700`}></div>
                     <div className="flex items-start justify-between relative z-10">
                        <div>
                           <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{card.title}</p>
                           <h3 className="text-4xl font-black text-slate-800 tracking-tighter drop-shadow-sm">{card.value}</h3>
                        </div>
                        <div className={`w-16 h-16 rounded-[1.5rem] bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-xl ${card.shadow} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-700`}>
                           {card.icon}
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>

         <div className="lg:col-span-4 bg-white/80 backdrop-blur-xl p-8 rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-amber-400 to-indigo-400"></div>
            <div className="flex items-center gap-4 mb-8 mt-2">
               <div className="bg-gradient-to-br from-indigo-50 to-premium-50 p-2.5 rounded-2xl text-premium-600 shadow-inner border border-premium-100/50"><LayoutGrid size={22}/></div>
               <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Pintasan Fitur</h3>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-0.5">Modular Access</p>
               </div>
            </div>
            <div className="space-y-4 flex-1">
               <Link to="/attendance" className="flex items-center gap-5 p-5 bg-gradient-to-br from-emerald-50 to-white border border-emerald-100/50 rounded-[2rem] group hover:shadow-[0_10px_30px_-10px_rgba(16,185,129,0.3)] hover:-translate-y-1 transition-all duration-500 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-100/50 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="bg-emerald-100 p-3.5 rounded-2xl text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-500 z-10"><CalendarCheck size={24}/></div>
                  <div className="z-10">
                     <p className="text-sm font-black text-emerald-950 uppercase tracking-wide">Rekap Kehadiran</p>
                     <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1 tracking-wider">Guru & Pegawai</p>
                  </div>
               </Link>
               <Link to="/honor" className="flex items-center gap-5 p-5 bg-gradient-to-br from-amber-50 to-white border border-amber-100/50 rounded-[2rem] group hover:shadow-[0_10px_30px_-10px_rgba(245,158,11,0.3)] hover:-translate-y-1 transition-all duration-500 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-100/50 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="bg-amber-100 p-3.5 rounded-2xl text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-500 z-10"><HandCoins size={24}/></div>
                  <div className="z-10">
                     <p className="text-sm font-black text-amber-950 uppercase tracking-wide">Penerimaan Honor</p>
                     <p className="text-[10px] text-amber-600 font-bold uppercase mt-1 tracking-wider">Dana BOS & Pajak</p>
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
              Aktivitas Sistem
            </h3>
            <Link to="/settings" className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] hover:text-white transition-colors">Audit Trail</Link>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto max-h-[380px] pr-2 custom-scrollbar">
            {logs.length > 0 ? logs.map((log) => (
              <div key={log.id} className="p-5 bg-white/5 hover:bg-white/10 rounded-[2rem] border border-white/5 hover:border-white/10 transition-all duration-300 group/item">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest bg-white/10 text-white/70`}>{log.module}</span>
                  <span className="text-[9px] font-bold text-slate-500 flex items-center gap-2"><Clock size={12} /> {format(new Date(log.timestamp), 'dd/MM HH:mm')}</span>
                </div>
                <h4 className="text-[12px] font-black text-slate-200 uppercase leading-snug group-hover/item:text-indigo-400 transition-colors">{log.action}</h4>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 italic">{log.details}</p>
              </div>
            )) : (
              <div className="py-20 text-center opacity-30 flex flex-col items-center">
                 <FileText size={40} className="text-slate-500 mb-4" />
                 <p className="text-xs font-black uppercase tracking-widest">Belum ada aktivitas</p>
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
