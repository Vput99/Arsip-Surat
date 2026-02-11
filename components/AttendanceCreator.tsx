import React, { useState, useEffect } from 'react';
import { Printer, Users, Calendar, Loader2, UserCheck, Music, Hammer, ChevronLeft, ArrowRight, CalendarOff, Settings, AlertCircle, ClipboardList } from 'lucide-react';
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
      case 'P': return <span className="text-indigo-600 font-bold text-[9pt] italic print:text-black leading-none">✓</span>;
      case 'S': return <span className="text-amber-600 font-bold text-[8pt] leading-none">S</span>;
      case 'I': return <span className="text-blue-600 font-bold text-[8pt] leading-none">I</span>;
      case 'A': return <span className="text-rose-600 font-bold text-[8pt] leading-none">A</span>;
      case 'C': return <span className="text-emerald-600 font-bold text-[8pt] leading-none">C</span>;
      case 'DL': return <span className="text-violet-600 font-bold text-[8pt] leading-none">DL</span>;
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

  if (!config) return <div className="flex justify-center items-center h-64 text-slate-900"><Loader2 className="animate-spin text-indigo-600"/></div>;

  if (view === 'menu') {
    const menus = [
      { id: 'reg' as const, title: 'Guru & Pegawai', desc: 'Laporan rutin bulanan staf reguler/PNS.', icon: <Users size={32} />, color: 'emerald' },
      { id: 'pppk' as const, title: 'Pegawai PPPK', desc: 'Laporan khusus untuk guru dan pegawai PPPK.', icon: <UserCheck size={32} />, color: 'blue' },
      { id: 'extra' as const, title: 'Pengajar Ekstra', desc: 'Absensi pelatih ekstrakurikuler sekolah.', icon: <Music size={32} />, color: 'violet' },
      { id: 'tukang' as const, title: 'Tukang / Pekerja', desc: 'Daftar hadir harian tukang perbaikan sarpras.', icon: <Hammer size={32} />, color: 'amber' },
    ];

    return (
      <div className="max-w-5xl mx-auto py-10 animate-fade-in text-slate-900">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-slate-800 mb-2">Buat Absensi Sekolah</h2>
          <p className="text-slate-500 font-medium">Data personil tersimpan otomatis di database cloud.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {menus.map((m) => (
            <button key={m.id} onClick={() => { setActiveCategory(m.id); setView('editor'); }} className="group relative bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all text-left overflow-hidden">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {m.icon}
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">{m.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">{m.desc}</p>
              <div className="flex items-center text-xs font-black uppercase tracking-widest text-indigo-600">
                Buka Absensi <ArrowRight size={14} className="ml-2 group-hover:translate-x-2 transition-transform" />
              </div>
            </button>
          ))}
        </div>

        <button onClick={() => setView('recap')} className="w-full group relative bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-xl hover:shadow-2xl transition-all text-left overflow-hidden flex items-center justify-between">
            <div className="relative z-10 flex items-center gap-6">
               <div className="w-16 h-16 bg-white/10 text-white rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <ClipboardList size={32} />
               </div>
               <div>
                 <h3 className="text-xl font-black text-white mb-1">Rekapitulasi Kehadiran</h3>
                 <p className="text-slate-400 text-sm">Cetak rekap total hari kerja, ijin, cuti, dan kehadiran per personil.</p>
               </div>
            </div>
            <div className="relative z-10 bg-white text-slate-900 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
              Buka Rekap <ArrowRight size={14}/>
            </div>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-20 text-slate-900">
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 print:hidden">
        <div className="xl:col-span-1 space-y-4">
          <button onClick={() => setView('menu')} className="flex items-center gap-2 text-slate-500 font-bold text-sm hover:text-indigo-600 transition-colors mb-2">
            <ChevronLeft size={18} /> Kembali ke Menu
          </button>
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Calendar size={18} /></div>
              <h3 className="font-bold text-slate-800 text-sm">Periode & Hari Libur</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <select value={month} onChange={(e) => { setMonth(parseInt(e.target.value)); setHolidays([]); }} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none">
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>{format(new Date(2024, i, 1), 'MMMM', { locale: id })}</option>
                ))}
              </select>
              <input type="number" value={year} onChange={(e) => { setYear(parseInt(e.target.value)); setHolidays([]); }} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" />
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <CalendarOff size={12} className="text-rose-500" /> Hari Libur Khusus
               </label>
               <div className="grid grid-cols-7 gap-1">
                 {dateRange.map(d => {
                   const date = new Date(year, month, d);
                   const isSun = isSunday(date);
                   const isSat = isSaturday(date);
                   const isSelected = holidays.includes(d);
                   return (
                     <button 
                       key={d} 
                       onClick={() => toggleHoliday(d)}
                       className={`h-7 rounded-lg text-[10px] font-bold transition-all ${
                         isSelected ? 'bg-rose-500 text-white shadow-md' : 
                         (isSun || isSat) ? 'bg-rose-50 text-rose-400 opacity-50 cursor-not-allowed' : 'bg-slate-50 text-slate-600 hover:bg-slate-200'
                       }`}
                       disabled={isSun || isSat}
                     >
                       {d}
                     </button>
                   );
                 })}
               </div>
            </div>

            <button onClick={() => window.print()} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2">
              <Printer size={18} /> Cetak (Landscape F4)
            </button>
          </div>
        </div>

        <div className="xl:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Users size={18} className="text-slate-400" />
              {view === 'recap' ? 'Rekap Kehadiran' : 'Daftar Personil'}
            </h3>
            <Link to="/settings" className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
              <Settings size={14} /> Kelola Personil
            </Link>
          </div>
          {view === 'recap' && (
             <div className="flex gap-2 overflow-x-auto pb-2">
                {['reg', 'pppk', 'extra', 'tukang'].map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat as AttendanceCategory)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                    {cat.toUpperCase()}
                  </button>
                ))}
             </div>
          )}
        </div>
      </div>

      {/* Preview Landscape */}
      <div className="flex justify-center overflow-x-auto p-8 bg-slate-200/50 rounded-3xl border border-slate-200 print:p-0 print:bg-white print:block">
        <div className="attendance-paper bg-white w-[330mm] shadow-2xl relative print:shadow-none print:w-full print:min-h-0 flex flex-col text-black font-serif print:p-0">
          
          <div className="p-[15mm]">
            <div className="border-b-[4px] border-double border-black pb-3 mb-4 pt-2 grid grid-cols-[80px_1fr_80px] items-center text-black">
               <div className="flex justify-center">
                 {config.logoDaerahUrl && <img src={config.logoDaerahUrl} className="w-[18mm] h-auto" alt="Logo Daerah"/>}
               </div>
               <div className="text-center w-full px-4">
                  <h3 className="text-[12pt] font-bold uppercase leading-tight tracking-wide text-black">{config.headerLine1}</h3>
                  <h3 className="text-[12pt] font-bold uppercase leading-tight tracking-wide text-black">{config.headerLine2}</h3>
                  <h1 className="text-[16pt] font-extrabold uppercase my-1 leading-none tracking-wider text-black">{config.name}</h1>
                  <p className="text-[9pt] leading-tight italic text-black">{config.address}</p>
               </div>
               <div className="flex justify-center">
                 {config.logoUrl && <img src={config.logoUrl} className="w-[18mm] h-auto" alt="Logo Sekolah"/>}
               </div>
            </div>

            <div className="text-center mb-6 text-black">
              <h2 className="text-[12pt] font-bold underline uppercase text-black">{view === 'recap' ? 'REKAPITULASI KEHADIRAN GURU DAN PEGAWAI' : getCategoryTitle(activeCategory)}</h2>
              <p className="text-[10pt] font-serif uppercase text-black">BULAN : {format(new Date(year, month, 1), 'MMMM yyyy', { locale: id })}</p>
            </div>

            {view === 'recap' ? (
               <table className="w-full border-collapse text-[9pt] font-serif text-black border-black">
                 <thead>
                   <tr className="bg-slate-50 print:bg-transparent">
                     <th rowSpan={2} className="border border-black p-1 w-12">NO</th>
                     <th rowSpan={2} className="border border-black p-1">NAMA / NIP</th>
                     <th rowSpan={2} className="border border-black p-1">PANGKAT / GOL</th>
                     <th rowSpan={2} className="border border-black p-1 w-24">JML HARI KERJA</th>
                     <th colSpan={5} className="border border-black p-1">KETERANGAN</th>
                     <th rowSpan={2} className="border border-black p-1 w-24">JML KEHADIRAN</th>
                   </tr>
                   <tr className="bg-slate-50 print:bg-transparent">
                     <th className="border border-black p-1 w-12">S</th>
                     <th className="border border-black p-1 w-12">I</th>
                     <th className="border border-black p-1 w-12">C</th>
                     <th className="border border-black p-1 w-12">DL</th>
                     <th className="border border-black p-1 w-12">A</th>
                   </tr>
                 </thead>
                 <tbody>
                   {currentStaffList.map((staff, idx) => {
                     const r = calculateRecap(staff.id);
                     return (
                       <tr key={staff.id}>
                         <td className="border border-black text-center">{idx + 1}</td>
                         <td className="border border-black px-2 py-1.5 align-middle">
                           <div className="font-bold text-[10pt] leading-tight text-black">{staff.name || '...'}</div>
                           <div className="text-[9pt] text-slate-600 print:text-black mt-0.5">NIP. {staff.nip || '-'}</div>
                         </td>
                         <td className="border border-black text-center">{staff.rank || '-'}</td>
                         <td className="border border-black text-center font-bold">{r.workingDays}</td>
                         <td className="border border-black text-center">{r.s || '-'}</td>
                         <td className="border border-black text-center">{r.i || '-'}</td>
                         <td className="border border-black text-center">{r.c || '-'}</td>
                         <td className="border border-black text-center">{r.dl || '-'}</td>
                         <td className="border border-black text-center">{r.a || '-'}</td>
                         <td className="border border-black text-center font-bold bg-slate-50 print:bg-transparent">{r.presence}</td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
            ) : (
               <table className="w-full border-collapse text-[8.5pt] font-serif table-fixed text-black border-black">
                <colgroup>
                  <col className="w-8" />
                  <col className="w-[180px]" />
                  <col className="w-[110px]" />
                  {dateRange.map(d => <col key={d} className="w-auto" />)}
                  <col className="w-8" /> <col className="w-8" /> <col className="w-8" /> <col className="w-8" /> <col className="w-8" /> <col className="w-10" />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50 print:bg-transparent">
                    <th rowSpan={2} className="border border-black p-1 text-black">NO</th>
                    <th rowSpan={2} className="border border-black p-1 text-black">NAMA / NIP</th>
                    <th rowSpan={2} className="border border-black p-1 text-black">JABATAN</th>
                    <th colSpan={daysInMonth} className="border border-black p-1 text-black">TANGGAL (Atas=Masuk, Bawah=Pulang)</th>
                    <th colSpan={6} className="border border-black p-1 text-black">REKAP</th>
                  </tr>
                  <tr className="bg-slate-50 print:bg-transparent">
                    {dateRange.map(d => (
                      <th key={d} className={`border border-black p-0.5 text-[7.5pt] h-7 ${isDayOff(d) ? 'bg-rose-100 text-rose-600 print:bg-rose-200' : 'text-black'}`}>
                        {d}
                      </th>
                    ))}
                    <th className="border border-black text-black">S</th>
                    <th className="border border-black text-black">I</th>
                    <th className="border border-black text-black">A</th>
                    <th className="border border-black text-black">C</th>
                    <th className="border border-black text-black">DL</th>
                    <th className="border border-black text-black">JML</th>
                  </tr>
                </thead>
                <tbody>
                  {currentStaffList.map((staff, sIdx) => {
                    const recap = calculateRecap(staff.id);
                    return (
                      <tr key={staff.id} style={{height: '36px'}}>
                        <td className="border border-black text-center text-black align-middle">{sIdx + 1}</td>
                        <td className="border border-black px-1.5 py-1 leading-tight align-middle">
                          <div className="font-bold text-black text-[9pt] leading-tight mb-0.5">{staff.name || '...'}</div>
                          <div className="text-[8pt] text-slate-500 print:text-black">NIP. {staff.nip || '...'}</div>
                        </td>
                        <td className="border border-black text-center text-[8pt] leading-tight px-0.5 text-black align-middle whitespace-normal">{staff.rank || '-'}</td>
                        {dateRange.map(d => (
                          <td key={`cell-${d}`} style={{height: '1px'}} className={`border border-black p-0 ${isDayOff(d) ? 'bg-rose-100 print:bg-rose-200' : ''}`}>
                             <div className="flex flex-col h-full w-full">
                                <div onClick={() => toggleAttendance(staff.id, d, 'in')} className={`flex-1 flex items-center justify-center border-b border-black min-h-[16px] transition-colors ${isDayOff(d) ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}`}>
                                  {getStatusDisplay(attendance[`${staff.id}-${d}-in`])}
                                </div>
                                <div onClick={() => toggleAttendance(staff.id, d, 'out')} className={`flex-1 flex items-center justify-center min-h-[16px] transition-colors ${isDayOff(d) ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}`}>
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
                        <td className="border border-black text-center font-bold bg-slate-50 print:bg-transparent text-black align-middle">{recap.presence}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <div className="mt-8 grid grid-cols-3 gap-12 text-center font-serif text-[11pt] break-inside-avoid text-black">
              <div className="flex flex-col">
                <p>&nbsp;</p>
                <p>Bendahara,</p>
                <div className="h-20"></div>
                <p className="font-bold underline text-[11pt]">( ........................................ )</p>
                <p>&nbsp;</p>
              </div>
              <div></div>
              <div className="flex flex-col">
                <p>Kediri, {format(new Date(year, month + 1, 0), 'dd MMMM yyyy', { locale: id })}</p>
                <p>Kepala Sekolah,</p>
                <div className="h-20"></div>
                <p className="font-bold underline text-[11pt]">{config.principalName}</p>
                <p>NIP. {config.principalNip}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .attendance-paper {
           min-height: 215mm;
           background: white;
        }

        @media print {
          @page { 
            size: 330mm 215mm landscape; /* Paksa F4 Landscape */
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
            height: 215mm !important; 
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            display: block !important;
          }

          table { width: 100% !important; border-collapse: collapse !important; border: 1.5px solid black !important; }
          th, td { border: 1px solid black !important; }
          .bg-rose-100 { background-color: #fee2e2 !important; }
          .bg-slate-50 { background-color: #f8fafc !important; }
          
          * { color: black !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};

export default AttendanceCreator;