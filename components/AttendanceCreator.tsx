import React, { useState, useEffect } from 'react';
import { Printer, Users, Calendar, Loader2, UserCheck, Music, Hammer, ChevronLeft, ArrowRight, CalendarOff, Settings, AlertCircle } from 'lucide-react';
import { subscribeToConfig, subscribeToStaff, StaffMember } from '../services/storage';
import { SchoolConfig } from '../types';
import { format, getDaysInMonth, isSunday, isSaturday } from 'date-fns';
import { id } from 'date-fns/locale';
import { Link } from 'react-router-dom';

type AttendanceCategory = 'reg' | 'pppk' | 'extra' | 'tukang';

const AttendanceCreator: React.FC = () => {
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [view, setView] = useState<'menu' | 'editor'>('menu');
  const [activeCategory, setActiveCategory] = useState<AttendanceCategory>('reg');
  
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [holidays, setHolidays] = useState<number[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  
  // Tidak perlu lagi isEditingRef karena halaman ini read-only untuk data personil

  useEffect(() => {
    const unsubscribeConfig = subscribeToConfig(setConfig);
    
    // Subscribe selalu aktif karena tidak ada mode edit personil di sini
    const unsubscribeStaff = subscribeToStaff((data) => {
      setAllStaff(data);
    });
    
    return () => {
      unsubscribeConfig();
      unsubscribeStaff();
    };
  }, []);

  // Filter staff berdasarkan kategori aktif
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
      case 'P': return <span className="text-indigo-600 font-bold text-[8.5pt] italic print:text-black leading-none">✓</span>;
      case 'S': return <span className="text-amber-600 font-bold text-[7.5pt] leading-none">S</span>;
      case 'I': return <span className="text-blue-600 font-bold text-[7.5pt] leading-none">I</span>;
      case 'A': return <span className="text-rose-600 font-bold text-[7.5pt] leading-none">A</span>;
      case 'C': return <span className="text-emerald-600 font-bold text-[7.5pt] leading-none">C</span>;
      case 'DL': return <span className="text-violet-600 font-bold text-[7.5pt] leading-none">DL</span>;
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
        if (statusIn === 'S' || statusOut === 'S') s++;
        else if (statusIn === 'I' || statusOut === 'I') i++;
        else if (statusIn === 'A' || statusOut === 'A') a++;
        else if (statusIn === 'C' || statusOut === 'C') c++;
        else if (statusIn === 'DL' || statusOut === 'DL') dl++;
      }
    });
    return { s, i, a, c, dl, total: workingDays - (s + i + a + c + dl) };
  };

  const openEditor = (cat: AttendanceCategory) => {
    setActiveCategory(cat);
    setView('editor');
  };

  if (!config) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-indigo-600"/></div>;

  if (view === 'menu') {
    const menus = [
      { id: 'reg' as const, title: 'Guru & Pegawai', desc: 'Laporan rutin bulanan staf reguler/PNS.', icon: <Users size={32} />, color: 'emerald' },
      { id: 'pppk' as const, title: 'Pegawai PPPK', desc: 'Laporan khusus untuk guru dan pegawai PPPK.', icon: <UserCheck size={32} />, color: 'blue' },
      { id: 'extra' as const, title: 'Pengajar Ekstra', desc: 'Absensi pelatih ekstrakurikuler sekolah.', icon: <Music size={32} />, color: 'violet' },
      { id: 'tukang' as const, title: 'Tukang / Pekerja', desc: 'Daftar hadir harian tukang perbaikan sarpras.', icon: <Hammer size={32} />, color: 'amber' },
    ];

    return (
      <div className="max-w-5xl mx-auto py-10 animate-fade-in">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-slate-800 mb-2">Buat Absensi Sekolah</h2>
          <p className="text-slate-500 font-medium">Data personil tersimpan otomatis di database cloud.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {menus.map((m) => (
            <button key={m.id} onClick={() => openEditor(m.id)} className={`group relative bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-${m.color}-500 transition-all duration-300 text-left overflow-hidden`}>
              <div className={`absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-${m.color}-500/5 rounded-full group-hover:scale-150 transition-transform duration-500`}></div>
              <div className={`w-16 h-16 bg-${m.color}-50 text-${m.color}-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-${m.color}-500 group-hover:text-white transition-all duration-300`}>
                {m.icon}
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">{m.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">{m.desc}</p>
              <div className={`flex items-center text-xs font-black uppercase tracking-widest text-${m.color}-600`}>
                Buka Absensi <ArrowRight size={14} className="ml-2 group-hover:translate-x-2 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-20">
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
              <Printer size={18} /> Cetak Absensi
            </button>
          </div>
        </div>

        <div className="xl:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 text-slate-600 rounded-lg"><Users size={20} /></div>
              <h3 className="font-bold text-slate-800">Daftar Personil ({currentStaffList.length})</h3>
            </div>
            <Link to="/settings" className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
              <Settings size={14} /> Kelola Personil
            </Link>
          </div>
          
          <div className="mb-4 p-3 bg-blue-50 text-blue-700 text-xs font-medium rounded-xl flex items-center gap-2 border border-blue-100">
             <AlertCircle size={16} />
             <span>Untuk menambah, mengedit, atau menghapus personil, silakan buka menu <b>Pengaturan</b>.</span>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {currentStaffList.length === 0 ? (
              <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 italic text-sm">
                Belum ada data personil.
              </div>
            ) : (
              currentStaffList.map((staff, idx) => (
                <div key={staff.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="md:col-span-1 text-xs font-bold text-slate-400 text-center">#{idx + 1}</div>
                  <div className="md:col-span-4">
                    <div className="text-sm font-bold text-slate-700">{staff.name || 'Tanpa Nama'}</div>
                  </div>
                  <div className="md:col-span-3">
                    <div className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 inline-block">
                       NIP: {staff.nip || '-'}
                    </div>
                  </div>
                  <div className="md:col-span-4">
                    <div className="text-xs font-medium text-slate-600">{staff.rank || '-'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Preview Paper */}
      <div className="flex justify-center overflow-x-auto p-4 bg-slate-200/30 rounded-3xl border border-slate-200 print:p-0 print:bg-white print:block">
        <div className="attendance-paper bg-white w-[330mm] min-h-[215mm] p-[10mm] shadow-2xl print:shadow-none print:p-0 print:w-full print:min-h-0 text-black">
          {/* Header Kop */}
          <div className="border-b-[3px] border-double border-black pb-2 mb-3 grid grid-cols-[80px_1fr_80px] items-center text-black">
             <div className="flex justify-center">
               {config.logoDaerahUrl && <img src={config.logoDaerahUrl} className="w-[18mm] h-auto" alt="Logo Daerah"/>}
             </div>
             <div className="text-center">
                <h3 className="text-[12pt] font-bold uppercase leading-tight font-serif text-black">{config.headerLine1}</h3>
                <h3 className="text-[12pt] font-bold uppercase leading-tight font-serif text-black">{config.headerLine2}</h3>
                <h1 className="text-[14pt] font-extrabold uppercase my-0.5 leading-none font-serif text-black">{config.name}</h1>
                <p className="text-[8pt] font-serif leading-tight text-black">{config.address}</p>
             </div>
             <div className="flex justify-center">
               {config.logoUrl && <img src={config.logoUrl} className="w-[18mm] h-auto" alt="Logo Sekolah"/>}
             </div>
          </div>

          <div className="text-center mb-3 text-black">
            <h2 className="text-[11pt] font-bold underline uppercase text-black">{getCategoryTitle(activeCategory)}</h2>
            <p className="text-[9pt] font-serif uppercase text-black">BULAN : {format(new Date(year, month, 1), 'MMMM yyyy', { locale: id })}</p>
          </div>

          <table className="w-full border-collapse border border-black text-[8pt] font-serif table-fixed text-black">
            <colgroup>
              <col className="w-8" /> {/* No */}
              <col className="w-[180px]" /> {/* Nama/NIP */}
              <col className="w-[100px]" /> {/* Jabatan */}
              {dateRange.map(d => <col key={d} className="w-auto" />)} {/* Dates - Auto width */}
              <col className="w-7" /> {/* S */}
              <col className="w-7" /> {/* I */}
              <col className="w-7" /> {/* A */}
              <col className="w-7" /> {/* C */}
              <col className="w-7" /> {/* DL */}
              <col className="w-9" /> {/* Total */}
            </colgroup>
            <thead>
              <tr className="bg-slate-50 print:bg-transparent">
                <th rowSpan={2} className="border border-black p-0.5 text-black">NO</th>
                <th rowSpan={2} className="border border-black p-0.5 text-black">NAMA / NIP</th>
                <th rowSpan={2} className="border border-black p-0.5 text-black">JABATAN</th>
                <th colSpan={daysInMonth} className="border border-black p-0.5 text-black">TANGGAL (Atas=Masuk, Bawah=Pulang)</th>
                <th colSpan={6} className="border border-black p-0.5 text-black">REKAP</th>
              </tr>
              <tr className="bg-slate-50 print:bg-transparent">
                {dateRange.map(d => (
                  <th key={d} className={`border border-black p-0.5 text-[7pt] h-6 ${isDayOff(d) ? 'bg-rose-100 text-rose-600 print:bg-rose-200' : 'text-black'}`}>
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
                  <tr key={staff.id} className="h-10">
                    <td className="border border-black text-center text-black">{sIdx + 1}</td>
                    <td className="border border-black px-1 leading-tight overflow-hidden">
                      <div className="font-bold truncate text-black">{staff.name || '...'}</div>
                      <div className="text-[7pt] text-slate-500 print:text-black truncate">NIP. {staff.nip || '...'}</div>
                    </td>
                    <td className="border border-black text-center text-[7pt] leading-tight truncate px-0.5 text-black">{staff.rank || '-'}</td>
                    {dateRange.map(d => (
                      <td key={`cell-${d}`} className={`border border-black p-0 relative ${isDayOff(d) ? 'bg-rose-100 print:bg-rose-200' : ''}`}>
                         <div className="flex flex-col h-full min-h-[32px]">
                            <div onClick={() => toggleAttendance(staff.id, d, 'in')} className={`flex-1 flex items-center justify-center border-b border-black/10 transition-colors ${isDayOff(d) ? 'cursor-not-allowed border-none' : 'cursor-pointer hover:bg-slate-50'}`}>
                              {getStatusDisplay(attendance[`${staff.id}-${d}-in`])}
                            </div>
                            <div onClick={() => toggleAttendance(staff.id, d, 'out')} className={`flex-1 flex items-center justify-center transition-colors ${isDayOff(d) ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}`}>
                              {getStatusDisplay(attendance[`${staff.id}-${d}-out`])}
                            </div>
                         </div>
                      </td>
                    ))}
                    <td className="border border-black text-center font-bold text-black">{recap.s || ''}</td>
                    <td className="border border-black text-center font-bold text-black">{recap.i || ''}</td>
                    <td className="border border-black text-center font-bold text-black">{recap.a || ''}</td>
                    <td className="border border-black text-center font-bold text-black">{recap.c || ''}</td>
                    <td className="border border-black text-center font-bold text-black">{recap.dl || ''}</td>
                    <td className="border border-black text-center font-bold bg-slate-50 print:bg-transparent text-black">{recap.total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-4 grid grid-cols-3 gap-4 text-center font-serif text-[9pt] break-inside-avoid text-black">
            <div></div>
            <div></div>
            <div className="flex flex-col">
              <p>Kediri, {format(new Date(year, month + 1, 0), 'dd MMMM yyyy', { locale: id })}</p>
              <p>Kepala Sekolah,</p>
              <div className="h-16"></div>
              <p className="font-bold underline text-[10pt]">{config.principalName}</p>
              <p>NIP. {config.principalNip}</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { 
            size: 330mm 215mm; /* F4 Landscape */
            margin: 5mm 10mm; /* Atas-Bawah 5mm, Kiri-Kanan 10mm */
          }
          body * { visibility: hidden; }
          .attendance-paper, .attendance-paper * { visibility: visible !important; }
          .attendance-paper { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            margin: 0 !important;
            padding: 0 !important; 
            border: none !important;
            box-shadow: none !important;
          }
          .bg-rose-100 { background-color: #fee2e2 !important; -webkit-print-color-adjust: exact; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 0.5pt solid black !important; }
          .border-b { border-bottom: 0.2pt solid #eee !important; }
          .break-inside-avoid { break-inside: avoid !important; }
        }
      `}</style>
    </div>
  );
};

export default AttendanceCreator;