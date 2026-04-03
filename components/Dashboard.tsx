
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
    { title: 'Total Arsip', value: stats.total, icon: <FileText size={28} />, color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-200' },
    { title: 'Arsip Masuk', value: stats.incoming, icon: <Mail size={28} />, color: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-200' },
    { title: 'Arsip Keluar', value: stats.outgoing, icon: <Send size={28} />, color: 'from-violet-500 to-violet-600', shadow: 'shadow-violet-200' },
    { title: 'Perlu Tindakan', value: stats.urgent, icon: <AlertTriangle size={28} />, color: 'from-rose-500 to-rose-600', shadow: 'shadow-rose-200' },
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
    <div className="space-y-12 animate-fade-in pb-16 relative z-10">
      {/* Banner Utama - Glass Pro */}
      <div className="relative overflow-hidden rounded-[3.5rem] glass-dark shadow-2xl text-white p-12 md:p-16 border border-white/10 group transform transition-all duration-700 hover:shadow-[0_40px_80px_-15px_rgba(148,64,255,0.4)]">
        <div className="absolute top-0 right-0 -mt-24 -mr-24 w-[40rem] h-[40rem] bg-gradient-to-bl from-premium-500/30 to-transparent rounded-full blur-[100px] group-hover:scale-110 transition-transform duration-1000 ease-out"></div>
        <div className="absolute bottom-0 left-0 -mb-24 -ml-24 w-[30rem] h-[30rem] bg-emerald-500/10 rounded-full blur-[120px] group-hover:bg-emerald-400/20 transition-colors duration-1000"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-14">
          <div className="w-48 h-48 glass-panel rounded-[3rem] flex items-center justify-center border border-white/20 shadow-[0_0_50px_rgba(255,255,255,0.1)] flex-shrink-0 ring-1 ring-white/30 transform group-hover:scale-105 group-hover:rotate-6 transition-all duration-700">
             <img src={schoolConfig.logoUrl} alt="Logo" className="w-32 h-32 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.6)] group-hover:animate-float" />
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 uppercase leading-none drop-shadow-2xl bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-premium-300">
              {schoolConfig.name}
            </h1>
            <p className="text-premium-100 text-xl md:text-2xl font-medium opacity-80 mb-10 tracking-wide max-w-3xl mx-auto md:mx-0 drop-shadow-md">
              Intelligent School Archive Management & Realtime Intelligence System.
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-5">
              <span className="px-8 py-4 rounded-2xl glass-panel text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-3 shadow-lg transition-all hover:bg-white/20 cursor-default ring-1 ring-white/10">
                <MapPin size={16} className="text-premium-300" /> {schoolConfig.address}
              </span>
              <span className="px-8 py-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300 flex items-center gap-3 backdrop-blur-md shadow-[0_0_25px_rgba(52,211,153,0.2)] transition-all hover:scale-105 cursor-default">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse-glow"></div> Realtime Sync Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Cepat & Statistik */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
         <div className="lg:col-span-8 space-y-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
               {quickActions.map((action, i) => (
                  <Link key={i} to={action.path} className="glass-card p-8 rounded-[2.5rem] hover:bg-white/90 hover:-translate-y-2 transition-all duration-500 flex flex-col items-center justify-center gap-5 group relative overflow-hidden">
                     <div className="absolute inset-0 bg-gradient-to-b from-transparent to-premium-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <div className={`w-16 h-16 ${action.bg} ${action.color} rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-xl z-10 ring-1 ring-white/20`}>
                        {action.icon}
                     </div>
                     <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-premium-700 z-10 transition-colors">{action.label}</span>
                  </Link>
               ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {statCards.map((card, idx) => (
                  <div key={idx} className="glass-card rounded-[3rem] p-10 hover:shadow-[0_40px_70px_-15px_rgba(0,0,0,0.12)] hover:border-premium-200 transition-all duration-700 group relative overflow-hidden hover:-translate-y-2">
                     <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${card.color} opacity-5 rounded-full blur-3xl group-hover:opacity-15 transition-opacity duration-700`}></div>
                     <div className="flex items-start justify-between relative z-10">
                        <div>
                           <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.25em] mb-4">{card.title}</p>
                           <h3 className="text-5xl font-black text-slate-800 tracking-tighter drop-shadow-sm">{card.value}</h3>
                        </div>
                        <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-2xl ${card.shadow} group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 border border-white/20`}>
                           {card.icon}
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>

         <div className="lg:col-span-4 glass-card p-10 rounded-[3.5rem] flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-premium-400 to-indigo-500 opacity-60"></div>
            <div className="flex items-center gap-5 mb-10 mt-2">
               <div className="glass-panel p-3.5 rounded-2xl text-premium-600 shadow-inner border border-premium-100/50 group-hover:rotate-12 transition-transform duration-500"><LayoutGrid size={26}/></div>
               <div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Eksplorasi</h3>
                  <p className="text-[10px] uppercase font-black text-slate-400 tracking-[0.3em] mt-1">Modular Hub</p>
               </div>
            </div>
            <div className="space-y-5 flex-1">
               <Link to="/attendance" className="flex items-center gap-6 p-6 glass-panel border-emerald-100/30 rounded-[2.5rem] group/item hover:bg-emerald-500/10 hover:-translate-y-1.5 transition-all duration-500 relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 w-20 h-20 bg-emerald-100/30 rounded-full blur-xl group-hover/item:scale-150 transition-transform duration-700"></div>
                  <div className="bg-emerald-100 p-4 rounded-2xl text-emerald-600 group-hover/item:bg-emerald-500 group-hover/item:text-white transition-colors duration-500 z-10"><CalendarCheck size={28}/></div>
                  <div className="z-10">
                     <p className="text-sm font-black text-emerald-950 uppercase tracking-wide">Rekap Kehadiran</p>
                     <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1.5 tracking-widest opacity-70">Guru & Pegawai Presensi</p>
                  </div>
               </Link>
               <Link to="/honor" className="flex items-center gap-6 p-6 glass-panel border-premium-100/30 rounded-[2.5rem] group/item hover:bg-premium-500/10 hover:-translate-y-1.5 transition-all duration-500 relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 w-20 h-20 bg-premium-100/30 rounded-full blur-xl group-hover/item:scale-150 transition-transform duration-700"></div>
                  <div className="bg-premium-100 p-4 rounded-2xl text-premium-600 group-hover/item:bg-premium-600 group-hover/item:text-white transition-colors duration-500 z-10"><HandCoins size={28}/></div>
                  <div className="z-10">
                     <p className="text-sm font-black text-premium-950 uppercase tracking-wide">Penerimaan Honor</p>
                     <p className="text-[10px] text-premium-600 font-bold uppercase mt-1.5 tracking-widest opacity-70">Dana BOS & Penggajian</p>
                  </div>
               </Link>
            </div>
            <Link to="/settings" className="mt-8 flex items-center justify-center p-4 rounded-2xl border border-dashed border-slate-200 text-slate-400 hover:text-premium-500 hover:border-premium-300 transition-all text-[10px] font-black uppercase tracking-widest">
               LIHAT SEMUA MODUL <ArrowUpRight size={14} className="ml-2" />
            </Link>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 glass-card p-12 rounded-[3.5rem] relative overflow-hidden group">
          <div className="flex items-center justify-between mb-14 relative z-10">
            <div>
               <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Analisis Statistik</h3>
               <p className="text-slate-400 text-sm font-black uppercase tracking-[0.3em] mt-2">Volume Arsip Tahunan</p>
            </div>
            <div className="glass-panel p-5 rounded-2xl text-indigo-600 shadow-inner border border-indigo-100/50 group-hover:scale-110 transition-transform duration-500"><TrendingUp size={32} /></div>
          </div>
          <div className="h-80 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={80}>
                <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 13, fontWeight: 900}} dy={15} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} />
                <Tooltip cursor={{fill: 'rgba(99, 102, 241, 0.05)'}} contentStyle={{ borderRadius: '28px', border: 'none', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '20px', fontWeight: '900', fontSize: '12px' }} />
                <Bar dataKey="value" radius={[24, 24, 0, 0]} animationDuration={1500}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#6366f1' : '#a855f7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 glass-dark p-10 rounded-[3.5rem] shadow-2xl border border-white/5 flex flex-col group min-h-[500px]">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-black text-white flex items-center gap-4 uppercase tracking-tighter">
              <div className="bg-premium-600 p-2.5 rounded-xl shadow-[0_0_20px_rgba(148,64,255,0.5)]"><Activity size={24} className="text-white animate-pulse" /></div>
              Audi Trail
            </h3>
            <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full animate-pulse-glow">LIVE</span>
          </div>
          <div className="space-y-5 flex-1 overflow-y-auto pr-3 custom-scrollbar">
            {logs.length > 0 ? logs.map((log) => (
              <div key={log.id} className="p-6 bg-white/5 hover:bg-white/10 rounded-[2.5rem] border border-white/5 hover:border-white/20 transition-all duration-300 group/item">
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-[9px] font-black px-4 py-1.5 rounded-xl uppercase tracking-[0.25em] bg-white/10 text-white/80`}>{log.module}</span>
                  <span className="text-[9px] font-bold text-slate-500 flex items-center gap-2"><Clock size={12} /> {format(new Date(log.timestamp), 'HH:mm')}</span>
                </div>
                <h4 className="text-[13px] font-black text-slate-100 uppercase leading-snug group-hover/item:text-premium-400 transition-colors">{log.action}</h4>
                <p className="text-[11px] text-slate-500 mt-2 line-clamp-1 italic tracking-wide group-hover/item:text-slate-400 transition-colors">{log.details}</p>
              </div>
            )) : (
              <div className="py-24 text-center opacity-30 flex flex-col items-center">
                 <Zap size={48} className="text-slate-500 mb-6" />
                 <p className="text-xs font-black uppercase tracking-[0.3em] animate-pulse">Scanning Cloud Activity...</p>
              </div>
            )}
          </div>
          <Link to="/create" className="mt-10 w-full py-5 bg-premium-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.35em] shadow-2xl shadow-premium-900/50 flex items-center justify-center gap-4 hover:bg-white hover:text-premium-700 transition-all duration-500 transform active:scale-95 border border-white/20">
            NASKAH BARU <ArrowUpRight size={20} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
