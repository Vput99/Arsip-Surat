
import React, { useState, useEffect, useRef } from 'react';
import { Printer, Users, Calendar, Loader2, UserCheck, Music, Hammer, ChevronLeft, ArrowRight, CalendarOff, Settings, Info, MousePointer2, ClipboardList, CheckSquare, ZoomIn, ZoomOut, Maximize, Save, Trash2, RotateCcw } from 'lucide-react';
import { subscribeToConfig, subscribeToStaff, StaffMember, saveMail } from '../services/storage';
import { SchoolConfig, Mail, MailType, MailStatus, UrgencyLevel } from '../types';
import { format, getDaysInMonth, isSunday, isSaturday } from 'date-fns';
// Fix: Import Indonesian locale from the specific subpath to avoid index export issues
import { id } from 'date-fns/locale/id';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

type AttendanceCategory = 'reg' | 'pppk' | 'extra' | 'tukang';
type ViewMode = 'menu' | 'editor' | 'recap';

const AttendanceCreator: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [view, setView] = useState<ViewMode>('menu');
  const [activeCategory, setActiveCategory] = useState<AttendanceCategory>('reg');
  
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [holidays, setHolidays] = useState<number[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [scale, setScale] = useState(0.85);
  const [saveLoading, setSaveLoading] = useState(false);
  const paperRef = useRef<HTMLDivElement>(null);
  
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

  useEffect(() => {
    const key = `attendance_draft_${activeCategory}_${month}_${year}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const { attendance: savedAtt, holidays: savedHols } = JSON.parse(saved);
        setAttendance(savedAtt || {});
        setHolidays(savedHols || []);
      } catch (e) { console.error("Failed to load draft"); }
    } else {
        setAttendance({});
        setHolidays([]);
    }
  }, [activeCategory, month, year]);

  useEffect(() => {
    if (Object.keys(attendance).length > 0 || holidays.length > 0) {
      const key = `attendance_draft_${activeCategory}_${month}_${year}`;
      localStorage.setItem(key, JSON.stringify({ attendance, holidays }));
    }
  }, [attendance, holidays, activeCategory, month, year]);

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

  const markAllPresent = () => {
    if (!confirm('Tandai semua personil hadir (P) untuk bulan ini?')) return;
    const newAttendance = { ...attendance };
    currentStaffList.forEach(staff => {
      dateRange.forEach(day => {
        if (!isDayOff(day)) {
          newAttendance[`${staff.id}-${day}-in`] = 'P';
          newAttendance[`${staff.id}-${day}-out`] = 'P';
        }
      });
    });
    setAttendance(newAttendance);
  };

  const handleReset = () => {
    if (!confirm('Reset semua data kehadiran bulan ini?')) return;
    setAttendance({});
    const key = `attendance_draft_${activeCategory}_${month}_${year}`;
    localStorage.removeItem(key);
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
      case 'P': return <span className="text-blue-900 font-bold">✓</span>;
      case 'S': return <span className="text-amber-600 font-bold">S</span>;
      case 'I': return <span className="text-cyan-600 font-bold">I</span>;
      case 'A': return <span className="text-red-600 font-bold">A</span>;
      case 'C': return <span className="text-emerald-600 font-bold">C</span>;
      case 'DL': return <span className="text-purple-600 font-bold">DL</span>;
      default: return null;
    }
  };

  const calculateRecap = (staffId: string) => {
    let s = 0, i = 0, a = 0, c = 0, dl = 0;
    let workingDays = 0;
    dateRange.forEach(day => {
      if (!isDayOff(day)) {
        workingDays++;
        const dailyStatus = [attendance[`${staffId}-${day}-in`], attendance[`${staffId}-${day}-out`]];
        if (dailyStatus.includes('S')) s++;
        else if (dailyStatus.includes('I')) i++;
        else if (dailyStatus.includes('A')) a++;
        else if (dailyStatus.includes('C')) c++;
        else if (dailyStatus.includes('DL')) dl++;
      }
    });
    return { s, i, a, c, dl, presence: workingDays - (s + i + a + c), workingDays };
  };

  const handleSaveToArchive = async () => {
    if (!paperRef.current) return;
    setSaveLoading(true);
    try {
      const canvas = await html2canvas(paperRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [330, 215] });
      pdf.addImage(imgData, 'JPEG', 0, 0, 330, 215);
      const pdfDataUri = pdf.output('datauristring');
      const period = format(new Date(year, month, 1), 'MMMM yyyy', { locale: id });
      const newMail: Mail = {
        id: Date.now().toString(),
        type: MailType.OUTGOING,
        referenceNumber: `ABS/${month+1}/${year}`,
        date: new Date().toISOString().split('T')[0],
        receivedDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        sender: 'Kepala Sekolah',
        subject: `Laporan Absensi ${getCategoryTitle(activeCategory)} - ${period}`,
        description: `Laporan kehadiran bulan ${period}.`,
        category: 'Absensi',
        urgency: UrgencyLevel.LOW,
        status: MailStatus.ARCHIVED,
        fileUrl: pdfDataUri,
      };
      await saveMail(newMail);
      alert('Tersimpan.');
      navigate('/outbox');
    } catch (e: any) {
      alert('Gagal: ' + e.message);
    } finally {
      setSaveLoading(false);
    }
  };

  if (!config) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;

  if (view === 'menu') {
    return (
      <div className="max-w-6xl mx-auto py-16 px-6 animate-fade-in">
        <h2 className="text-4xl font-black text-center mb-16">Presensi Kehadiran</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {(['reg', 'pppk', 'extra', 'tukang'] as const).map(m => (
            <button key={m} onClick={() => { setActiveCategory(m); setView('editor'); }} className="bg-white p-8 rounded-3xl border border-slate-200 shadow hover:shadow-xl transition-all text-left">
              <h3 className="text-xl font-bold mb-2 uppercase">{m}</h3>
              <p className="text-slate-500 text-sm">Buka Editor Absensi</p>
            </button>
          ))}
        </div>
        <button onClick={() => setView('recap')} className="w-full mt-10 bg-slate-900 text-white p-8 rounded-3xl flex items-center justify-between">
            <h3 className="text-2xl font-black">Rekapitulasi Kehadiran</h3>
            <ArrowRight size={32}/>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in h-screen overflow-hidden">
      <div className="flex justify-between items-center px-2 print:hidden">
         <button onClick={() => setView('menu')} className="p-3 bg-white border rounded-2xl"><ChevronLeft/></button>
         <div className="flex gap-2">
            <button onClick={handleReset} className="p-3 bg-rose-50 text-rose-600 rounded-xl"><RotateCcw size={18}/></button>
            <button onClick={markAllPresent} className="px-4 py-2 bg-white border rounded-xl text-xs font-bold">Hadirkan Semua</button>
            <button onClick={handleSaveToArchive} disabled={saveLoading} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs">{saveLoading ? '...' : 'Arsip'}</button>
            <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs">Cetak</button>
         </div>
      </div>
      <div className="flex-1 overflow-auto flex justify-center p-12 print:p-0">
         <div ref={paperRef} className="attendance-paper-landscape bg-white shadow-2xl relative print:shadow-none flex flex-col p-10" style={{ width: '330mm', minHeight: '215mm', transform: `scale(${scale})`, transformOrigin: 'top center' }}>
            <div className="border-b-[3px] border-double border-black pb-2 mb-4 text-center">
               <h3 className="text-[14pt] uppercase">{config.headerLine1}</h3>
               <h3 className="text-[14pt] font-bold uppercase">{config.headerLine2}</h3>
               <h1 className="text-[18pt] font-black uppercase my-1">{config.name}</h1>
            </div>
            <h2 className="text-center text-[14pt] font-bold underline uppercase mb-6">{view === 'recap' ? 'REKAPITULASI' : getCategoryTitle(activeCategory)}</h2>
            <div className="w-full overflow-x-auto">
               <table className="w-full border-collapse border-black border-[1.5pt] text-[9pt]">
                  <thead>
                    <tr>
                      <th className="border border-black p-1">NO</th>
                      <th className="border border-black p-1">NAMA / NIP</th>
                      {view === 'editor' && dateRange.map(d => <th key={d} className={`border border-black p-0.5 text-[7pt] ${isDayOff(d) ? 'bg-red-500 text-white' : ''}`}>{d}</th>)}
                      <th className="border border-black p-1">JML</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentStaffList.map((staff, idx) => {
                      const r = calculateRecap(staff.id);
                      return (
                        <tr key={staff.id}>
                          <td className="border border-black text-center">{idx + 1}</td>
                          <td className="border border-black px-2 py-1 font-bold">{staff.name}</td>
                          {view === 'editor' && dateRange.map(d => (
                            <td key={d} onClick={() => toggleAttendance(staff.id, d, 'in')} className={`border border-black text-center cursor-pointer ${isDayOff(d) ? 'bg-red-500' : ''}`}>
                              {getStatusDisplay(attendance[`${staff.id}-${d}-in`])}
                            </td>
                          ))}
                          <td className="border border-black text-center font-bold">{r.presence}</td>
                        </tr>
                      );
                    })}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .attendance-paper-landscape, .attendance-paper-landscape * { visibility: visible !important; }
          .attendance-paper-landscape { position: absolute !important; left: 0 !important; top: 0 !important; width: 330mm !important; height: 215mm !important; margin: 0 !important; transform: scale(1) !important; }
          @page { size: 330mm 215mm landscape; margin: 0; }
        }
      `}</style>
    </div>
  );
};

export default AttendanceCreator;
