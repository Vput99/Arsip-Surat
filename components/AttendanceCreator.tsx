
import React, { useState, useEffect, useRef } from 'react';
import { Printer, Users, Calendar, Loader2, UserCheck, Music, Hammer, ChevronLeft, ArrowRight, CalendarOff, Settings, Info, MousePointer2, ClipboardList, CheckSquare, ZoomIn, ZoomOut, Maximize, Save, Trash2, RotateCcw } from 'lucide-react';
import { subscribeToConfig, subscribeToStaff, StaffMember, saveMail } from '../services/storage';
import { SchoolConfig, Mail, MailType, MailStatus, UrgencyLevel } from '../types';
import { format, getDaysInMonth, isSunday, isSaturday } from 'date-fns';
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
      alert('Berhasil diarsipkan.');
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
            <button key={m} onClick={() => { setActiveCategory(m); setView('editor'); }} className="bg-white p-8 rounded-3xl border border-slate-200 shadow hover:shadow-xl transition-all text-left group">
              <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${m === 'reg' ? 'bg-blue-100 text-blue-600' : m === 'pppk' ? 'bg-violet-100 text-violet-600' : m === 'extra' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                {m === 'extra' ? <Music size={24}/> : m === 'tukang' ? <Hammer size={24}/> : <Users size={24}/>}
              </div>
              <h3 className="text-lg font-black mb-1 uppercase tracking-tight">{m}</h3>
              <p className="text-slate-500 text-xs font-bold">Kelola Daftar Hadir</p>
            </button>
          ))}
        </div>
        <button onClick={() => setView('recap')} className="w-full mt-10 bg-slate-900 text-white p-8 rounded-[2.5rem] flex items-center justify-between hover:bg-slate-800 transition-all group">
            <div>
              <h3 className="text-2xl font-black mb-1">Rekapitulasi Kehadiran</h3>
              <p className="text-slate-400 font-bold text-sm">Lihat ringkasan kehadiran seluruh personil</p>
            </div>
            <ArrowRight size={32} className="group-hover:translate-x-2 transition-transform" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in h-[calc(100vh-100px)] overflow-hidden">
      <div className="flex justify-between items-center px-2 print:hidden">
         <div className="flex items-center gap-4">
           <button onClick={() => setView('menu')} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50"><ChevronLeft size={20}/></button>
           <h2 className="text-xl font-black uppercase tracking-tight">{getCategoryTitle(activeCategory)}</h2>
         </div>
         <div className="flex gap-2">
            <button onClick={handleReset} title="Reset Data" className="p-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl hover:bg-rose-100"><RotateCcw size={18}/></button>
            <button onClick={markAllPresent} className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50">Hadirkan Semua</button>
            <button onClick={handleSaveToArchive} disabled={saveLoading} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700">{saveLoading ? <Loader2 size={16} className="animate-spin" /> : 'Arsip Digital'}</button>
            <button onClick={() => window.print()} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700">Cetak</button>
         </div>
      </div>
      
      <div className="flex-1 overflow-auto bg-slate-100/50 rounded-[3rem] p-12 print:p-0 print:bg-white">
         <div ref={paperRef} className="attendance-paper-landscape bg-white shadow-2xl relative print:shadow-none flex flex-col p-[15mm] text-black font-serif mx-auto" style={{ width: '330mm', minHeight: '215mm', transform: `scale(${scale})`, transformOrigin: 'top center' }}>
            {/* Kop Surat */}
            <div className="border-b-[3px] border-double border-black pb-4 mb-6 grid grid-cols-[80px_1fr_80px] items-center text-center">
               <img src={config.logoDaerahUrl} className="w-full h-auto" />
               <div className="px-4">
                  <h3 className="text-[12pt] uppercase font-bold">{config.headerLine1}</h3>
                  <h3 className="text-[12pt] font-bold uppercase">{config.headerLine2}</h3>
                  <h1 className="text-[16pt] font-black uppercase my-1 tracking-tight">{config.name}</h1>
                  <p className="text-[9pt] font-bold italic">{config.address}</p>
               </div>
               <img src={config.logoUrl} className="w-full h-auto" />
            </div>

            <h2 className="text-center text-[13pt] font-bold underline uppercase mb-6">{getCategoryTitle(activeCategory)} BULAN {format(new Date(year, month, 1), 'MMMM yyyy', { locale: id })}</h2>
            
            <div className="w-full overflow-hidden">
               <table className="w-full border-collapse border-black border-[1.5pt] text-[8pt]">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border border-black p-1 w-8">NO</th>
                      <th className="border border-black p-1 text-left">NAMA / NIP</th>
                      {dateRange.map(d => (
                        <th key={d} className={`border border-black p-0.5 w-6 text-[7pt] ${isDayOff(d) ? 'bg-red-500 text-white' : ''}`}>
                          {d}
                        </th>
                      ))}
                      <th className="border border-black p-1 w-10">JML</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentStaffList.map((staff, idx) => {
                      const r = calculateRecap(staff.id);
                      return (
                        <tr key={staff.id}>
                          <td className="border border-black text-center">{idx + 1}</td>
                          <td className="border border-black px-2 py-1 font-bold leading-tight">
                            {staff.name}<br/>
                            <span className="text-[7pt] font-normal">{staff.nip || '-'}</span>
                          </td>
                          {dateRange.map(d => (
                            <td 
                              key={d} 
                              onClick={() => toggleAttendance(staff.id, d, 'in')} 
                              className={`border border-black text-center cursor-pointer h-8 transition-colors ${isDayOff(d) ? 'bg-red-500' : 'hover:bg-slate-50'}`}
                            >
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

            <div className="mt-8 flex justify-between px-10 text-[10pt]">
               <div className="text-center w-[200px]">
                  <p className="mb-20">Mengetahui,<br/>Kepala Sekolah</p>
                  <p className="font-bold underline uppercase">{config.principalName}</p>
                  <p>NIP. {config.principalNip}</p>
               </div>
               <div className="text-center w-[200px]">
                  <p className="mb-20">Kediri, {format(new Date(), 'dd MMMM yyyy', { locale: id })}<br/>Petugas Absensi,</p>
                  <p className="font-bold underline uppercase">....................................</p>
                  <p>NIP. ............................</p>
               </div>
            </div>
         </div>
      </div>
      
      {/* Zoom Controls print:hidden */}
      <div className="fixed bottom-6 right-6 flex gap-2 print:hidden">
        <button onClick={() => setScale(Math.max(0.5, scale - 0.1))} className="p-3 bg-white border shadow-lg rounded-2xl"><ZoomOut size={20}/></button>
        <button onClick={() => setScale(1)} className="px-4 bg-white border shadow-lg rounded-2xl font-bold text-xs">{Math.round(scale * 100)}%</button>
        <button onClick={() => setScale(Math.min(1.5, scale + 0.1))} className="p-3 bg-white border shadow-lg rounded-2xl"><ZoomIn size={20}/></button>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .attendance-paper-landscape, .attendance-paper-landscape * { visibility: visible !important; }
          .attendance-paper-landscape { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 330mm !important; 
            height: 215mm !important; 
            margin: 0 !important; 
            transform: none !important; 
            padding: 15mm !important;
          }
          @page { size: 330mm 215mm landscape; margin: 0; }
        }
      `}</style>
    </div>
  );
};

export default AttendanceCreator;
