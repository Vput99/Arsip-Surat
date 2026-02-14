
import React, { useEffect, useState } from 'react';
import { Mail, Send, AlertTriangle, FileText, TrendingUp, ArrowUpRight, Clock, MapPin, ChevronRight, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { subscribeToMails, subscribeToConfig } from '../services/storage';
import { SchoolConfig, Mail as MailType, MailType as MType } from '../types';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
// Fix: Import Indonesian locale from the specific subpath to avoid index export issues
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
      // Ambil 5 naskah terbaru dari database
      setLatestMails(mails.slice(0, 5));
    });

    const unsubscribeConfig = subscribeToConfig((config) => {
      setSchoolConfig(config);
    });
    
    return () => {
      unsubscribeMails();
      unsubscribeConfig();
    };
  }, []);

  if (!schoolConfig) {
    return <div className="flex justify-center items-center h-screen"><Activity className="animate-spin text-indigo-600 mr-2"/> <span className="font-bold text-slate-500">Sinkronisasi Database...</span></div>;
  }

  const statCards = [
    { title: 'Total Arsip', value: stats.total, icon: <FileText size={24} />, color: 'from-blue-500 to-blue-600', text: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Arsip Masuk', value: stats.incoming, icon: <Mail size={24} />, color: 'from-emerald-500 to-emerald-600', text: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Arsip Keluar', value: stats.outgoing, icon: <Send size={24} />, color: 'from-violet-500 to-violet-600', text: 'text-violet-600', bg: 'bg-violet-50' },
    { title: 'Perlu Tindakan', value: stats.urgent, icon: <AlertTriangle size={24} />, color: 'from-rose-500 to-rose-600', text: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  const chartData = [
    { name: 'Masuk', value: stats.incoming },
    { name: 'Keluar', value: stats.outgoing },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 shadow-2xl shadow-slate-900/30 text-white p-8 md:p-12">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-indigo-500 opacity-10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-violet-500 opacity-10 rounded-full blur-[80px]"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="w-32 h-32 bg-white/5 backdrop-blur-xl rounded-[2rem] flex items-center justify-center border border-white/10 shadow-2xl flex-shrink-0 group overflow-hidden">
             <img 
              src={schoolConfig.logoUrl} 
              alt="Logo" 
              className="w-24 h-24 object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-500"
              onError={(e) => { e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_Tut_Wuri_Handayani.svg"; }}
             />
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3 text-white">
              {schoolConfig.name}
            </h1>
            <p className="text-indigo-200 text-xl mb-4 font-semibold opacity-90">Sistem Arsip & Basis Data Digital Realtime</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-indigo-100 backdrop-blur-sm">
                <MapPin className="w-3.5 h-3.5 mr-2 text-indigo-400" />
                {schoolConfig.address}
              </div>
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-black text-emerald-400 backdrop-blur-sm uppercase tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse"></div>
                Realtime Database Active
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <div key={idx} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.title}</p>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{card.value}</h3>
              </div>
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-lg shadow-indigo-500/10 group-hover:scale-110 transition-transform duration-300`}>
                {card.icon}
              </div>
            </div>
            <div className={`mt-5 pt-5 border-t border-slate-50 flex items-center text-[10px] font-black uppercase tracking-widest ${card.text}`}>
               <div className={`w-2 h-2 rounded-full ${card.bg.replace('bg-', 'bg-').replace('50', '500')} mr-2 animate-pulse`}></div>
               Sync via Hybrid Cloud
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Statistics Chart */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 h-full">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Perbandingan Data</h3>
                <p className="text-slate-500 font-bold text-sm">Distribusi volume arsip masuk dan keluar sekolah</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-2xl">
                <TrendingUp className="text-indigo-600" size={28} />
              </div>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={80}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 13, fontWeight: 800}} 
                    dy={15}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 12}} 
                  />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ 
                      borderRadius: '24px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                      padding: '16px 20px',
                      fontFamily: 'Plus Jakarta Sans, sans-serif',
                      fontWeight: 'bold'
                    }}
                  />
                  <Bar dataKey="value" radius={[24, 24, 0, 0]}>
                    <Cell fill="#6366f1" />
                    <Cell fill="#8b5cf6" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Activities / Database Peek */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Activity size={20} className="text-indigo-600" /> Arsip Terbaru
                </h3>
                <Link to="/inbox" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Semua Data</Link>
              </div>
              
              <div className="space-y-3 flex-1">
                {latestMails.length > 0 ? (
                  latestMails.map((mail) => (
                    <Link to={mail.type === MType.INCOMING ? '/inbox' : '/outbox'} key={mail.id} className="block group p-4 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-lg border border-transparent hover:border-slate-100 transition-all">
                       <div className="flex justify-between items-start mb-1.5">
                         <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${mail.type === MType.INCOMING ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                           {mail.type}
                         </span>
                         <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                           <Clock size={10} /> {format(new Date(mail.createdAt), 'dd/MM HH:mm')}
                         </span>
                       </div>
                       <h4 className="text-xs font-black text-slate-800 uppercase line-clamp-1 group-hover:text-indigo-600 transition-colors">{mail.subject}</h4>
                       <p className="text-[10px] text-slate-500 font-medium mt-1 truncate">{mail.sender}</p>
                    </Link>
                  ))
                ) : (
                  <div className="h-40 flex flex-col items-center justify-center text-slate-300 gap-2">
                    <FileText size={40} className="opacity-20" />
                    <p className="text-xs font-black uppercase tracking-widest opacity-40">Belum ada data</p>
                  </div>
                )}
              </div>

              <Link to="/create" className="mt-6 w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-95">
                Buat Arsip Baru <ArrowUpRight size={16} />
              </Link>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
