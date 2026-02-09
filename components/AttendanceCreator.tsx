import React, { useState, useEffect } from 'react';
import { Printer, Users, Plus, Trash2, Calendar, Settings2, Loader2, Check, Info } from 'lucide-react';
import { subscribeToConfig } from '../services/storage';
import { SchoolConfig } from '../types';
import { format, getDaysInMonth, isSunday, isSaturday } from 'date-fns';
import { id } from 'date-fns/locale';

interface StaffMember {
  id: string;
  name: string;
  nip: string;
  rank: string;
}

const AttendanceCreator: React.FC = () => {
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [holidays, setHolidays] = useState<number[]>([]);
  // State untuk menyimpan data kehadiran { "staffId-day-type": "status" }
  // type: 'in' atau 'out'
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  
  const [staffList, setStaffList] = useState<StaffMember[]>([
    { id: '1', name: 'Nita Ekaningkarti Adji, S.Pd', nip: '19860213 201409 2 002', rank: 'Penata - III/c' },
    { id: '2', name: 'Budi Santoso, M.Pd', nip: '19750412 200501 1 003', rank: 'Pembina - IV/a' }
  ]);

  useEffect(() => {
    const unsubscribe = subscribeToConfig(setConfig);
    return () => unsubscribe();
  }, []);

  const daysInMonth = getDaysInMonth(new Date(year, month));
  const dateRange = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const isDayOff = (day: number) => {
    const date = new Date(year, month, day);
    return isSunday(date) || isSaturday(date) || holidays.includes(day);
  };

  const handleAddStaff = () => {
    const newStaff: StaffMember = {
      id: Date.now().toString(),
      name: '',
      nip: '',
      rank: ''
    };
    setStaffList([...staffList, newStaff]);
  };

  const handleStaffChange = (id: string, field: keyof StaffMember, value: string) => {
    setStaffList(staffList.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleRemoveStaff = (id: string) => {
    setStaffList(staffList.filter(s => s.id !== id));
  };

  const toggleHoliday = (day: number) => {
    if (holidays.includes(day)) {
      setHolidays(holidays.filter(d => d !== day));
    } else {
      setHolidays([...holidays, day]);
    }
  };

  const toggleAttendance = (staffId: string, day: number, type: 'in' | 'out') => {
    if (isDayOff(day)) return;

    const key = `${staffId}-${day}-${type}`;
    const currentStatus = attendance[key];
    
    let nextStatus = '';
    if (!currentStatus) nextStatus = 'P'; // Paraf
    else if (currentStatus === 'P') nextStatus = 'S'; // Sakit
    else if (currentStatus === 'S') nextStatus = 'I'; // Izin
    else if (currentStatus === 'I') nextStatus = 'A'; // Alpa
    else if (currentStatus === 'A') nextStatus = 'C'; // Cuti
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
      default: return null;
    }
  };

  const calculateRecap = (staffId: string) => {
    let s = 0, i = 0, a = 0, c = 0;
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
      }
    });

    return { s, i, a, c, total: workingDays - (s + i + a + c) };
  };

  if (!config) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-indigo-600"/></div>;

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-20">
      {/* Configuration Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 print:hidden">
        <div className="xl:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Calendar size={20} />
            </div>
            <h3 className="font-bold text-slate-800">Periode Absensi</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Bulan</label>
              <select 
                value={month} 
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>{format(new Date(2024, i, 1), 'MMMM', { locale: id })}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tahun</label>
              <input 
                type="number" 
                value={year} 
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex gap-2 text-blue-700">
              <Info size={16} className="shrink-0" />
              <p className="text-[10px] font-bold leading-tight">Klik sel tanggal: <b>Atas</b> untuk Masuk, <b>Bawah</b> untuk Pulang.</p>
            </div>
          </div>

          <button 
            onClick={() => window.print()}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
          >
            <Printer size={18} /> Cetak Folio Landscape
          </button>
        </div>

        <div className="xl:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Users size={20} />
              </div>
              <h3 className="font-bold text-slate-800">Daftar Guru / Staf</h3>
            </div>
            <button 
              onClick={handleAddStaff}
              className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-emerald-100 transition-colors"
            >
              <Plus size={16} /> Tambah Nama
            </button>
          </div>

          <div className="space-y-3">
            {staffList.map((staff, idx) => (
              <div key={staff.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="md:col-span-1 text-xs font-bold text-slate-400 text-center">#{idx + 1}</div>
                <div className="md:col-span-4">
                  <input placeholder="Nama & Gelar" value={staff.name} onChange={(e) => handleStaffChange(staff.id, 'name', e.target.value)} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold outline-none" />
                </div>
                <div className="md:col-span-3">
                  <input placeholder="NIP" value={staff.nip} onChange={(e) => handleStaffChange(staff.id, 'nip', e.target.value)} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
                </div>
                <div className="md:col-span-3">
                  <input placeholder="Pangkat/Gol" value={staff.rank} onChange={(e) => handleStaffChange(staff.id, 'rank', e.target.value)} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
                </div>
                <div className="md:col-span-1 flex justify-center">
                  <button onClick={() => handleRemoveStaff(staff.id)} className="p-2 text-rose-400 hover:text-rose-600 rounded-lg"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Attendance Paper Preview */}
      <div className="flex justify-center overflow-x-auto p-4 bg-slate-200/30 rounded-3xl border border-slate-200 print:p-0 print:bg-white print:block">
        <div className="attendance-paper bg-white min-w-[330mm] p-[10mm] shadow-2xl print:shadow-none print:p-0 print:w-full">
          {/* Header Kop */}
          <div className="border-b-[3px] border-double border-black pb-4 mb-4 grid grid-cols-[80px_1fr_80px] items-center">
             <div className="flex justify-center">
               {config.logoDaerahUrl && <img src={config.logoDaerahUrl} className="w-[15mm] h-auto" alt="Logo Daerah"/>}
             </div>
             <div className="text-center">
                <h3 className="text-[10pt] font-bold uppercase leading-tight font-serif text-black">{config.headerLine1}</h3>
                <h3 className="text-[10pt] font-bold uppercase leading-tight font-serif text-black">{config.headerLine2}</h3>
                <h1 className="text-[12pt] font-extrabold uppercase my-0.5 leading-none font-serif text-black">{config.name}</h1>
                <p className="text-[7pt] font-serif leading-tight text-black">{config.address}</p>
             </div>
             <div className="flex justify-center">
               {config.logoUrl && <img src={config.logoUrl} className="w-[15mm] h-auto" alt="Logo Sekolah"/>}
             </div>
          </div>

          <div className="text-center mb-4">
            <h2 className="text-[11pt] font-bold underline uppercase">DAFTAR HADIR GURU DAN PEGAWAI</h2>
            <p className="text-[9pt] font-serif uppercase">BULAN : {format(new Date(year, month, 1), 'MMMM yyyy', { locale: id })}</p>
          </div>

          <table className="w-full border-collapse border border-black text-[7pt] font-serif">
            <thead>
              <tr className="bg-slate-50 print:bg-transparent">
                <th rowSpan={2} className="border border-black p-0.5 w-6">NO</th>
                <th rowSpan={2} className="border border-black p-0.5 w-48">NAMA / NIP</th>
                <th rowSpan={2} className="border border-black p-0.5 w-24">PANGKAT / GOL</th>
                <th colSpan={daysInMonth} className="border border-black p-0.5">TANGGAL (M=Atas, P=Bawah)</th>
                <th colSpan={5} className="border border-black p-0.5">REKAP</th>
              </tr>
              <tr className="bg-slate-50 print:bg-transparent">
                {dateRange.map(d => (
                  <th key={d} className={`border border-black p-0.5 text-[7pt] w-7 h-8 ${isDayOff(d) ? 'bg-rose-100 text-rose-600 print:bg-rose-200' : ''}`}>
                    {d}
                  </th>
                ))}
                <th className="border border-black w-7">S</th>
                <th className="border border-black w-7">I</th>
                <th className="border border-black w-7">A</th>
                <th className="border border-black w-7">C</th>
                <th className="border border-black w-10">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff, sIdx) => {
                const recap = calculateRecap(staff.id);
                return (
                  <tr key={staff.id} className="h-12">
                    <td className="border border-black text-center">{sIdx + 1}</td>
                    <td className="border border-black px-1 leading-tight">
                      <div className="font-bold text-[8pt]">{staff.name || '...'}</div>
                      <div className="text-[6pt] text-slate-500 print:text-black">NIP. {staff.nip || '...'}</div>
                    </td>
                    <td className="border border-black text-center text-[7.5pt]">{staff.rank || '-'}</td>
                    {dateRange.map(d => (
                      <td key={`cell-${d}`} className={`border border-black p-0 relative ${isDayOff(d) ? 'bg-rose-100 print:bg-rose-200' : ''}`}>
                         <div className="flex flex-col h-full min-h-[48px]">
                            {/* Area Absen Masuk (Atas) */}
                            <div 
                              onClick={() => toggleAttendance(staff.id, d, 'in')}
                              className={`flex-1 flex items-center justify-center border-b border-black/10 cursor-pointer hover:bg-slate-50 transition-colors ${isDayOff(d) ? 'cursor-not-allowed border-none' : ''}`}
                            >
                              {getStatusDisplay(attendance[`${staff.id}-${d}-in`])}
                            </div>
                            {/* Area Absen Pulang (Bawah) */}
                            <div 
                              onClick={() => toggleAttendance(staff.id, d, 'out')}
                              className={`flex-1 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors ${isDayOff(d) ? 'cursor-not-allowed' : ''}`}
                            >
                              {getStatusDisplay(attendance[`${staff.id}-${d}-out`])}
                            </div>
                         </div>
                      </td>
                    ))}
                    <td className="border border-black text-center font-bold">{recap.s || ''}</td>
                    <td className="border border-black text-center font-bold">{recap.i || ''}</td>
                    <td className="border border-black text-center font-bold">{recap.a || ''}</td>
                    <td className="border border-black text-center font-bold">{recap.c || ''}</td>
                    <td className="border border-black text-center font-bold bg-slate-50 print:bg-transparent">{recap.total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-6 grid grid-cols-2 gap-20 text-center font-serif text-[9.5pt]">
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
          @page { size: 330mm 215mm; margin: 5mm; }
          body * { visibility: hidden; }
          .attendance-paper, .attendance-paper * { visibility: visible !important; }
          .attendance-paper { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; border: none !important; padding: 0 !important; }
          .bg-rose-100 { background-color: #fee2e2 !important; -webkit-print-color-adjust: exact; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 0.5pt solid black !important; }
          .border-b { border-bottom: 0.2pt solid #eee !important; }
        }
      `}</style>
    </div>
  );
};

export default AttendanceCreator;