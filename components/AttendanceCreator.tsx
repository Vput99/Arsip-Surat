import React, { useState, useEffect } from 'react';
import { Printer, Users, Calendar, Loader2, UserCheck, Music, Hammer, ChevronLeft, ArrowRight, CalendarOff, Settings, AlertCircle, ClipboardList, Info, MousePointer2 } from 'lucide-react';
import { subscribeToConfig, subscribeToStaff, StaffMember } from '../services/storage';
import { SchoolConfig } from '../types';
import { format, getDaysInMonth, isSunday, isSaturday } from 'date-fns';
import { id } from 'date-fns/locale';
import { Link } from 'react-router-dom';

type AttendanceCategory = 'reg' | 'pppk' | 'extra' | 'tukang';
type ViewMode = 'menu' | 'editor' | 'recap';

const AttendanceCreator: React.FC = () => {
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [view, setView] = useState<ViewMode>('menu');
  const [activeCategory, setActiveCategory] = useState<AttendanceCategory>('reg');
  
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [holidays, setHolidays] = useState<number[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  
  useEffect(() => {
    const unsubscribeConfig = subscribeToConfig(setConfig);
    const unsubscribeStaff = subscribeToStaff((data) => {
      setAllStaff(data);
    });
    return () => {
      unsubscribeConfig();
      unsubscribeStaff();
    };
  }, []);

  const currentStaffList = allStaff.filter(s => s.category === activeCategory);
  const daysInMonth = getDaysInMonth(new Date(year, month));
  const dateRange = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const isDayOff = (day: number) => {
    const date = new Date(year, month, day);
    return isSunday(date) || isSaturday(date) || holidays.includes(day);
  };

  const toggleHoliday = (day: number) => {
    if (holidays.includes(day)) {
      setHolidays(holidays.filter(d => d !== day));
    } else {
      setHolidays([...holidays, day].sort((a, b) => a - b));
    }
  };

  const getCategoryTitle = (cat: AttendanceCategory) => {
    switch (cat) {
      case 'reg': return 'DAFTAR HADIR GURU DAN PEGAWAI';
      case 'pppk': return 'DAFTAR HADIR GURU DAN PEGAWAI PPPK';
      case 'extra': return 'DAFTAR HADIR PENGAJAR EKSTRAKURIKULER';
      case 'tukang': return 'DAFTAR HADIR TUKANG / PEKERJA';
    }
  };

  const toggleAttendance = (staffId: string, day: number, type: 'in' | 'out') => {
    if (isDayOff(day)) return;
    const key = `${staffId}-${day}-${type}`;
    const currentStatus = attendance[key];
    
    let nextStatus = '';
    if (!currentStatus) nextStatus = 'P';
    else if (currentStatus === 'P') nextStatus = 'S';
    else if (currentStatus === 'S') nextStatus = 'I';
    else if (currentStatus === 'I') nextStatus = 'A';
    else if (currentStatus === 'A') nextStatus = 'C';
    else if (currentStatus === 'C') nextStatus = 'DL';
    else nextStatus = ''; 

    setAttendance({ ...attendance, [key]: nextStatus });
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'P': return <span className="text-indigo-600 font-black text-[10pt] italic print:text-black leading-none">✓</span>;
      case 'S': return <span className="text-amber-600 font-black text-[8pt] leading-none">S</span>;
      case 'I': return <span className="text-blue-600 font-black text-[8pt] leading-none">I</span>;
      case 'A': return <span className="text-rose-600 font-black text-[8pt] leading-none">A</span>;
      case 'C': return <span className="text-emerald-600 font-black text-[8pt] leading-none">C</span>;
      case 'DL': return <span className="text-violet-600 font-black text-[8pt] leading-none">DL</span>;
      default: return null;
    }
  };

  const calculateRecap = (staffId: string) => {
    let s = 0, i = 0, a = 0, c = 0, dl = 0;
    let workingDays = 0;
    dateRange.forEach(day => {
      if (!isDayOff(day)) {
        workingDays++;
        const statusIn = attendance[`${staffId}-${day}-in`];
        const statusOut = attendance[`${staffId}-${day}-out`];
        const dailyStatus = [statusIn, statusOut];
        
        if (dailyStatus.includes('S')) s++;
        else if (dailyStatus.includes('I')) i++;
        else if (dailyStatus.includes('A')) a++;
        else if (dailyStatus.includes('C')) c++;
        else if (dailyStatus.includes('DL')) dl++;
      }
    });
    const presence = workingDays - (s + i + a + c); 
    return { s, i, a, c, dl, presence, workingDays };
  };

  if (!config) return <div className="flex justify-center items-center h-screen bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={48}/></div>;

  if (view === 'menu') {
    const menus = [
      { id: 'reg' as const, title: 'Guru & Pegawai', desc: 'Laporan bulanan staf reguler/PNS.', icon: <Users size={32} />, color: 'emerald' },
      { id: 'pppk' as const, title: 'Pegawai PPPK', desc: 'Laporan khusus pegawai PPPK.', icon: <UserCheck size={32} />, color: 'blue' },
      { id: 'extra' as const, title: 'Pengajar Ekstra', desc: 'Absensi pelatih ekstrakurikuler.', icon: <Music size={32} />, color: 'violet' },
      { id: 'tukang' as const, title: 'Tukang / Pekerja', desc: 'Daftar hadir tukang sarpras.', icon: <Hammer size={32} />, color: 'amber' },
    ];

    return (
      <div className="max-w-6xl mx-auto py-12 px-4 animate-fade-in text-slate-900">
        <div className="flex flex-col items-center text-center mb-16">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-200 mb-6 text-white">
            <ClipboardList size={40} />
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Presensi Kehadiran</h2>
          <p className="text-slate-500 font-medium text-lg max-w-xl">Seluruh format laporan otomatis menyesuaikan standar F4 Landscape (330mm x 215mm).</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {menus.map((m) => (
            <button key={m.id} onClick={() => { setActiveCategory(m.id); setView('editor'); }} className="group relative bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all text-left overflow-hidden flex flex-col items-start border-b-4 border-b-transparent hover:border-b-indigo-500">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                {m.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{m.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-8 flex-1">{m.desc}</p>
              <div className="flex items-center text-xs font-black uppercase tracking-widest text-indigo-600">
                Buka Editor <ArrowRight size={14} className="ml-2 group-hover:translate-x-2 transition-transform" />
              </div>
            </button>
          ))}
        </div>

        <button onClick={() => setView('recap')} className="w-full bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 group cursor-pointer">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
               <div className="w-20 h-20 bg-white/10 text-white rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform">
                  <ClipboardList size={36} />
               </div>
               <div className="text-center md:text-left">
                 <h3 className="text-2xl font-black text-white mb-2">Rekapitulasi Kehadiran</h3>
                 <p className="text-slate-400 font-medium">Laporan total hari kerja dan persentase kehadiran bulanan.</p>
               </div>
            </div>
            <div className="relative z-10 bg-white text-slate-900 px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center gap-3 group-hover:bg-indigo-50 transition-colors shadow-lg shadow-white/5">
              Tampilkan Rekap <ArrowRight size={16}/>
            </div>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-20 text-slate-900">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
         <div className="flex items-center gap-4">
            <button onClick={() => setView('menu')} className="w-11 h-11 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm">
              <ChevronLeft size={22} />
            </button>
            <div>
              <h2 className="text-xl font-black text-slate-900">{view === 'recap' ? 'Rekap Kehadiran' : 'Editor Absensi'}</h2>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{activeCategory}</p>
            </div>
         </div>
         <div className="flex gap-2">
            <Link to="/settings" className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
              <Settings size={16} /> Data Personil
            </Link>
            <button onClick={() => window.print()} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-500/20 flex items-center gap-2 hover:bg-indigo-700 transition-all">
              <Printer size={18} /> Cetak F4 Landscape
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 print:hidden">
        {/* Sidebar Controls */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Calendar size={12} className="text-indigo-500" /> Periode Laporan
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={month} onChange={(e) => { setMonth(parseInt(e.target.value)); setHolidays([]); }} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>{format(new Date(2024, i, 1), 'MMMM', { locale: id })}</option>
                  ))}
                </select>
                <input type="number" value={year} onChange={(e) => { setYear(parseInt(e.target.value)); setHolidays([]); }} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
              </div>
            </div>

            <div className="h-px bg-slate-100"></div>

            <div className="space-y-4">
               <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 <CalendarOff size={12} className="text-rose-500" /> Hari Libur Khusus
               </div>
               <div className="grid grid-cols-7 gap-1 bg-slate-50 p-1.5 rounded-xl">
                 {dateRange.map(d => {
                   const date = new Date(year, month, d);
                   const isSun = isSunday(date);
                   const isSat = isSaturday(date);
                   const isSelected = holidays.includes(d);
                   return (
                     <button 
                       key={d} 
                       onClick={() => toggleHoliday(d)}
                       className={`h-7 rounded-lg text-[10px] font-black transition-all flex items-center justify-center ${
                         isSelected ? 'bg-rose-500 text-white shadow-md' : 
                         (isSun || isSat) ? 'bg-rose-100 text-rose-500 opacity-60 cursor-not-allowed' : 'bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 shadow-sm'
                       }`}
                       disabled={isSun || isSat}
                     >
                       {d}
                     </button>
                   );
                 })}
               </div>
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-3xl text-white space-y-4">
             <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                <Info size={12} /> Panduan Absensi
             </div>
             <div className="grid grid-cols-2 gap-2">
                {[
                  { code: '✓ (P)', label: 'Hadir', text: 'text-indigo-300' },
                  { code: 'S', label: 'Sakit', text: 'text-amber-300' },
                  { code: 'I', label: 'Ijin', text: 'text-blue-300' },
                  { code: 'A', label: 'Alfa', text: 'text-rose-300' },
                  { code: 'C', label: 'Cuti', text: 'text-emerald-300' },
                  { code: 'DL', label: 'Dinas', text: 'text-violet-300' },
                ].map(item => (
                  <div key={item.code} className="flex items-center gap-2 p-1.5 bg-white/5 rounded-lg">
                    <span className={`font-black text-[10px] w-6 text-center ${item.text}`}>{item.code.split(' ')[0]}</span>
                    <span className="text-[9px] font-bold opacity-70">{item.label}</span>
                  </div>
                ))}
             </div>
             <p className="text-[9px] text-white/40 italic leading-relaxed">Klik sel pada pratinjau kertas untuk mengisi data kehadiran personil.</p>
          </div>
        </div>

        {/* Preview Area */}
        <div className="xl:col-span-3 space-y-4 overflow-hidden">
           <div className="bg-white p-2 rounded-2xl border border-slate-200 flex gap-1 shadow-sm">
              {(['reg', 'pppk', 'extra', 'tukang'] as const).map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setActiveCategory(cat)} 
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  {cat}
                </button>
              ))}
           </div>

           <div className="flex justify-center overflow-x-auto p-4 bg-slate-100 rounded-[2.5rem] border border-slate-200 group relative shadow-inner print:p-0 print:bg-white print:block print:rounded-none print:border-none print:shadow-none">
             {/* Container Utama Kertas F4 */}
             <div className="attendance-paper bg-white w-[330mm] shadow-2xl relative print:shadow-none print:w-full print:min-h-0 flex flex-col text-black font-serif print:p-0">
               
               <div className="paper-inner flex flex-col items-center">
                 {/* KOP SURAT PROFESIONAL */}
                 <div className="kop-surat border-b-[3pt] border-double border-black pb-3 mb-6 pt-2 grid grid-cols-[100px_1fr_100px] items-center text-black w-full">
                    <div className="flex justify-center">
                      {config.logoDaerahUrl && <img src={config.logoDaerahUrl} className="w-[18mm] h-auto" alt="Logo Daerah"/>}
                    </div>
                    <div className="text-center w-full px-4">
                       <h3 className="text-[12pt] font-bold uppercase leading-tight tracking-wide">{config.headerLine1}</h3>
                       <h3 className="text-[12pt] font-bold uppercase leading-tight tracking-wide">{config.headerLine2}</h3>
                       <h1 className="text-[18pt] font-black uppercase my-1 leading-none tracking-tight">{config.name}</h1>
                       <p className="text-[10pt] leading-tight italic font-medium">{config.address}</p>
                    </div>
                    <div className="flex justify-center">
                      {config.logoUrl && <img src={config.logoUrl} className="w-[18mm] h-auto" alt="Logo Sekolah"/>}
                    </div>
                 </div>

                 <div className="judul-laporan text-center mb-6 text-black w-full">
                   <h2 className="text-[13pt] font-bold underline uppercase text-black mb-1">{view === 'recap' ? 'REKAPITULASI KEHADIRAN GURU DAN PEGAWAI' : getCategoryTitle(activeCategory)}</h2>
                   <p className="text-[11pt] font-serif uppercase text-black font-bold tracking-widest">BULAN : {format(new Date(year, month, 1), 'MMMM yyyy', { locale: id })}</p>
                 </div>

                 <div className="tabel-container w-full overflow-hidden">
                   {view === 'recap' ? (
                      <table className="w-full border-collapse text-[10pt] font-serif text-black border-black">
                        <thead>
                          <tr className="bg-slate-50 print:bg-transparent">
                            <th rowSpan={2} className="border border-black p-2 w-10 text-center font-bold">NO</th>
                            <th rowSpan={2} className="border border-black p-2 text-center font-bold">NAMA LENGKAP / NIP</th>
                            <th rowSpan={2} className="border border-black p-2 text-center font-bold">PANGKAT / GOL</th>
                            <th rowSpan={2} className="border border-black p-2 w-28 text-center font-bold">HARI KERJA</th>
                            <th colSpan={5} className="border border-black p-2 text-center font-bold">KETERANGAN ALASAN</th>
                            <th rowSpan={2} className="border border-black p-2 w-28 text-center font-bold">KEHADIRAN</th>
                          </tr>
                          <tr className="bg-slate-50 print:bg-transparent">
                            <th className="border border-black p-2 w-12 text-center font-bold">S</th>
                            <th className="border border-black p-2 w-12 text-center font-bold">I</th>
                            <th className="border border-black p-2 w-12 text-center font-bold">C</th>
                            <th className="border border-black p-2 w-12 text-center font-bold">DL</th>
                            <th className="border border-black p-2 w-12 text-center font-bold">A</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentStaffList.map((staff, idx) => {
                            const r = calculateRecap(staff.id);
                            return (
                              <tr key={staff.id}>
                                <td className="border border-black text-center py-2.5">{idx + 1}</td>
                                <td className="border border-black px-3 py-2.5 align-middle">
                                  <div className="font-bold text-[11pt] leading-tight">{staff.name || '...'}</div>
                                  <div className="text-[10pt] mt-1">NIP. {staff.nip || '-'}</div>
                                </td>
                                <td className="border border-black text-center py-2.5">{staff.rank || '-'}</td>
                                <td className="border border-black text-center font-bold py-2.5">{r.workingDays}</td>
                                <td className="border border-black text-center py-2.5">{r.s || '-'}</td>
                                <td className="border border-black text-center py-2.5">{r.i || '-'}</td>
                                <td className="border border-black text-center py-2.5">{r.c || '-'}</td>
                                <td className="border border-black text-center py-2.5">{r.dl || '-'}</td>
                                <td className="border border-black text-center py-2.5">{r.a || '-'}</td>
                                <td className="border border-black text-center font-bold bg-slate-50 print:bg-transparent py-2.5 text-[11pt]">{r.presence}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                   ) : (
                      <table className="w-full border-collapse text-[8.5pt] font-serif table-auto text-black border-black">
                       <thead>
                         <tr className="bg-slate-50 print:bg-transparent">
                           <th rowSpan={2} className="border border-black p-1 text-black font-bold text-center w-8">NO</th>
                           <th rowSpan={2} className="border border-black p-1 text-black font-bold text-center w-[180px]">NAMA LENGKAP / NIP</th>
                           <th rowSpan={2} className="border border-black p-1 text-black font-bold text-center w-[110px]">JABATAN</th>
                           <th colSpan={daysInMonth} className="border border-black p-1 text-black font-bold text-center uppercase tracking-widest text-[9pt]">TANGGAL (Atas: Masuk, Bawah: Pulang)</th>
                           <th colSpan={6} className="border border-black p-1 text-black font-bold text-center uppercase text-[8pt]">REKAP</th>
                         </tr>
                         <tr className="bg-slate-50 print:bg-transparent">
                           {dateRange.map(d => (
                             <th key={d} className={`border border-black p-0.5 text-[7.5pt] font-black h-8 text-center min-w-[22px] ${isDayOff(d) ? 'bg-rose-100 text-rose-600 print:bg-rose-200' : 'text-black'}`}>
                               {d}
                             </th>
                           ))}
                           <th className="border border-black text-black font-bold text-center w-8">S</th>
                           <th className="border border-black text-black font-bold text-center w-8">I</th>
                           <th className="border border-black text-black font-bold text-center w-8">A</th>
                           <th className="border border-black text-black font-bold text-center w-8">C</th>
                           <th className="border border-black text-black font-bold text-center w-8">DL</th>
                           <th className="border border-black text-black font-bold text-center w-10">JML</th>
                         </tr>
                       </thead>
                       <tbody>
                         {currentStaffList.map((staff, sIdx) => {
                           const recap = calculateRecap(staff.id);
                           return (
                             <tr key={staff.id} style={{height: '42px'}}>
                               <td className="border border-black text-center text-black align-middle">{sIdx + 1}</td>
                               <td className="border border-black px-2 py-1 leading-tight align-middle">
                                 <div className="font-bold text-black text-[10pt] leading-tight mb-1">{staff.name || '...'}</div>
                                 <div className="text-[9pt] text-slate-500 print:text-black italic">NIP. {staff.nip || '...'}</div>
                               </td>
                               <td className="border border-black text-center text-[9pt] leading-tight px-1 text-black align-middle whitespace-normal">{staff.rank || '-'}</td>
                               {dateRange.map(d => (
                                 <td key={`cell-${d}`} className={`border border-black p-0 group/cell transition-colors ${isDayOff(d) ? 'bg-rose-100 print:bg-rose-200' : 'hover:bg-indigo-50/50'}`}>
                                    <div className="flex flex-col h-full w-full">
                                       <div onClick={() => toggleAttendance(staff.id, d, 'in')} className={`flex-1 flex items-center justify-center border-b border-black/20 min-h-[18px] transition-all ${isDayOff(d) ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-white hover:shadow-inner'}`}>
                                         {getStatusDisplay(attendance[`${staff.id}-${d}-in`])}
                                       </div>
                                       <div onClick={() => toggleAttendance(staff.id, d, 'out')} className={`flex-1 flex items-center justify-center min-h-[18px] transition-all ${isDayOff(d) ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-white hover:shadow-inner'}`}>
                                         {getStatusDisplay(attendance[`${staff.id}-${d}-out`])}
                                       </div>
                                    </div>
                                 </td>
                               ))}
                               <td className="border border-black text-center font-bold text-black align-middle">{recap.s || ''}</td>
                               <td className="border border-black text-center font-bold text-black align-middle">{recap.i || ''}</td>
                               <td className="border border-black text-center font-bold text-black align-middle">{recap.a || ''}</td>
                               <td className="border border-black text-center font-bold text-black align-middle">{recap.c || ''}</td>
                               <td className="border border-black text-center font-bold text-black align-middle">{recap.dl || ''}</td>
                               <td className="border border-black text-center font-black bg-slate-50 print:bg-transparent text-black align-middle text-[10pt]">{recap.presence}</td>
                             </tr>
                           );
                         })}
                       </tbody>
                     </table>
                   )}
                 </div>

                 {/* TANDA TANGAN HANYA KEPALA SEKOLAH - RAPAT KANAN */}
                 <div className="tanda-tangan-section mt-12 flex justify-end font-serif text-[11pt] break-inside-avoid text-black w-full pr-[10mm]">
                   <div className="flex flex-col text-center w-[350px]">
                     <p className="mb-1">Kediri, {format(new Date(year, month + 1, 0), 'dd MMMM yyyy', { locale: id })}</p>
                     <p className="font-bold leading-tight">Kepala Sekolah Dasar Negeri {config.name.replace('SD NEGERI ', '')},</p>
                     <div className="h-28"></div>
                     <p className="font-bold underline text-[12pt] uppercase tracking-wider">{config.principalName}</p>
                     <p className="font-bold">NIP. {config.principalNip}</p>
                   </div>
                 </div>
               </div>
               
               {/* Label Khusus Preview */}
               <div className="absolute top-2 right-4 text-[8px] font-black text-slate-300 tracking-[0.3em] uppercase print:hidden">Format F4 Landscape 330x215mm</div>
             </div>
           </div>
        </div>
      </div>

      <style>{`
        /* Kontainer Utama Preview di Layar */
        .attendance-paper {
           min-height: 215mm;
           background: white;
           margin: 0 auto;
           box-sizing: border-box;
           border: 1px solid #e2e8f0;
        }

        .paper-inner {
           width: 100%;
           padding: 10mm 15mm; /* Margin aman agar tidak terpotong printer */
           box-sizing: border-box;
        }

        @media print {
          @page { 
            size: 330mm 215mm landscape; /* Paksa ukuran F4/Folio */
            margin: 0; 
          }
          
          html, body, #root {
            height: auto !important;
            overflow: visible !important;
            position: static !important;
            background: white !important;
          }
          
          body * { visibility: hidden; }
          .attendance-paper, .attendance-paper * { visibility: visible !important; }
          
          .attendance-paper { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 330mm !important; 
            min-height: 215mm !important; 
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
          }

          .paper-inner {
             width: 100% !important;
             padding: 10mm 15mm !important; /* Pastikan konten tidak mepet ke tepi kertas */
          }

          table { 
             width: 100% !important; 
             border-collapse: collapse !important; 
             border: 2px solid black !important; 
          }
          
          th {
             border: 1px solid black !important;
             background-color: #f8fafc !important;
             -webkit-print-color-adjust: exact !important;
          }
          
          td { 
             border: 1px solid black !important; 
             -webkit-print-color-adjust: exact !important;
          }
          
          .bg-rose-100 { background-color: #fee2e2 !important; }
          .bg-slate-50 { background-color: #f8fafc !important; }
          
          * { color: black !important; -webkit-print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
};

export default AttendanceCreator;