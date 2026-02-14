
import React, { useState, useEffect, useRef } from 'react';
import { Printer, Users, Calendar, Loader2, UserCheck, Music, Hammer, ChevronLeft, ArrowRight, CalendarOff, Settings, Info, MousePointer2, ClipboardList, CheckSquare, ZoomIn, ZoomOut, Maximize, Save, Trash2, RotateCcw } from 'lucide-react';
import { subscribeToConfig, subscribeToStaff, StaffMember, saveMail } from '../services/storage';
import { SchoolConfig, Mail, MailType, MailStatus, UrgencyLevel } from '../types';
import { format, getDaysInMonth, isSunday, isSaturday } from 'date-fns';
import { id } from 'date-fns/locale';
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
    if (!confirm('Tandai semua personil hadir (P) untuk bulan ini? (Hari libur akan dilewati)')) return;
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
    if (!confirm('Reset semua data kehadiran bulan ini? Draft akan dihapus.')) return;
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
      case 'P': return <span className="text-blue-900 font-bold text-[10pt] print:text-black leading-none">✓</span>;
      case 'S': return <span className="text-amber-600 font-bold text-[9pt] leading-none">S</span>;
      case 'I': return <span className="text-cyan-600 font-bold text-[9pt] leading-none">I</span>;
      case 'A': return <span className="text-red-600 font-bold text-[10pt] print:text-red-600 leading-none">A</span>;
      case 'C': return <span className="text-emerald-600 font-bold text-[9pt] leading-none">C</span>;
      case 'DL': return <span className="text-purple-600 font-bold text-[9pt] leading-none">DL</span>;
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

  const handleSaveToArchive = async () => {
    if (!paperRef.current) return;
    if (!confirm('Generate PDF dan simpan ke Arsip Surat Keluar?')) return;
    
    setSaveLoading(true);
    try {
      const canvas = await html2canvas(paperRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
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
        subject: `Laporan Absensi ${activeCategory === 'reg' ? 'Guru/Pegawai' : activeCategory.toUpperCase()} - ${period}`,
        description: `Laporan kehadiran otomatis bulan ${period}. Generated by System.`,
        category: 'Absensi',
        urgency: UrgencyLevel.LOW,
        status: MailStatus.ARCHIVED,
        fileUrl: pdfDataUri,
        aiSummary: 'Dokumen absensi bulanan digital.'
      };

      await saveMail(newMail);
      alert('Laporan berhasil disimpan ke Arsip Surat Keluar.');
      navigate('/outbox');
    } catch (e: any) {
      alert('Gagal menyimpan: ' + e.message);
    } finally {
      setSaveLoading(false);
    }
  };

  if (!config) return <div className="flex justify-center items-center h-screen bg-white"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>;

  if (view === 'menu') {
    const menus = [
      { id: 'reg' as const, title: 'Guru & Pegawai', desc: 'Presensi bulanan PNS & Honorer.', icon: <Users size={28} />, color: 'bg-blue-600' },
      { id: 'pppk' as const, title: 'Pegawai PPPK', desc: 'Presensi khusus untuk staf PPPK.', icon: <UserCheck size={28} />, color: 'bg-indigo-600' },
      { id: 'extra' as const, title: 'Ekstrakurikuler', desc: 'Presensi pelatih ekskul sekolah.', icon: <Music size={28} />, color: 'bg-emerald-600' },
      { id: 'tukang' as const, title: 'Tukang / Sarpras', desc: 'Daftar hadir harian tukang/pekerja.', icon: <Hammer size={28} />, color: 'bg-amber-600' },
    ];

    return (
      <div className="max-w-6xl mx-auto py-16 px-6 animate-fade-in">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Presensi Kehadiran</h2>
          <p className="text-slate-500 font-medium text-lg">Format Landscape F4 otomatis untuk pelaporan resmi sekolah.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {menus.map((m) => (
            <button key={m.id} onClick={() => { setActiveCategory(m.id); setView('editor'); }} className="group bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left">
              <div className={`w-14 h-14 ${m.color} text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-slate-200`}>
                {m.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{m.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">{m.desc}</p>
              <div className="flex items-center text-xs font-black uppercase tracking-widest text-indigo-600">
                Buka Editor <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>

        <button onClick={() => setView('recap')} className="w-full mt-10 bg-slate-900 text-white p-8 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
            <div className="flex items-center gap-6 text-center md:text-left">
               <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                  <ClipboardList size={32} />
               </div>
               <div>
                 <h3 className="text-2xl font-black mb-1">Rekapitulasi Kehadiran</h3>
                 <p className="text-slate-400 font-medium">Lihat total kehadiran, sakit, ijin, dan alfa dalam satu lembar otomatis.</p>
               </div>
            </div>
            <div className="bg-white text-slate-900 px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center gap-2">
              Tampilkan Rekap <ArrowRight size={16}/>
            </div>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-20 h-screen overflow-hidden attendance-main-container">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 print:hidden shrink-0">
         <div className="flex items-center gap-4">
            <button onClick={() => setView('menu')} className="w-11 h-11 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm">
              <ChevronLeft size={22} />
            </button>
            <div>
              <h2 className="text-xl font-black text-slate-900 leading-tight">{view === 'recap' ? 'Rekap Kehadiran' : 'Editor Presensi'}</h2>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">{activeCategory}</p>
            </div>
         </div>
         <div className="flex gap-2">
            <button onClick={handleReset} className="px-3 py-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-black hover:bg-rose-100 transition-all shadow-sm" title="Reset Draft">
              <RotateCcw size={16} />
            </button>
            <button onClick={markAllPresent} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
              <CheckSquare size={16} /> Hadirkan Semua
            </button>
            <button 
              onClick={handleSaveToArchive} 
              disabled={saveLoading}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 hover:bg-emerald-700 transition-all"
            >
              {saveLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
              Simpan ke Arsip
            </button>
            <button onClick={() => window.print()} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-500/20 flex items-center gap-2 hover:bg-indigo-700 transition-all">
              <Printer size={18} /> Cetak
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 print:hidden px-2 flex-1 min-h-0">
        {/* Settings Card */}
        <div className="xl:col-span-1 space-y-4 overflow-y-auto pr-2">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Calendar size={12} className="text-indigo-500" /> Periode Laporan
              </div>
              <div className="grid grid-cols-1 gap-2">
                <select value={month} onChange={(e) => { setMonth(parseInt(e.target.value)); setHolidays([]); }} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>{format(new Date(2024, i, 1), 'MMMM', { locale: id })}</option>
                  ))}
                </select>
                <input type="number" value={year} onChange={(e) => { setYear(parseInt(e.target.value)); setHolidays([]); }} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
              </div>
            </div>

            <div className="h-px bg-slate-100"></div>

            <div className="space-y-4">
               <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 <CalendarOff size={12} className="text-red-500" /> Libur Khusus
               </div>
               <div className="grid grid-cols-7 gap-1 p-1.5 bg-slate-50 rounded-xl">
                 {dateRange.map(d => {
                   const date = new Date(year, month, d);
                   const isSun = isSunday(date);
                   const isSat = isSaturday(date);
                   const isSelected = holidays.includes(d);
                   return (
                     <button 
                       key={d} 
                       onClick={() => toggleHoliday(d)}
                       className={`h-7 rounded-lg text-[9px] font-black transition-all flex items-center justify-center ${
                         isSelected ? 'bg-red-500 text-white shadow-md' : 
                         (isSun || isSat) ? 'bg-red-100 text-red-500 opacity-60 cursor-not-allowed' : 'bg-white text-slate-600 hover:bg-slate-200 shadow-sm'
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

          <div className="bg-slate-900 p-5 rounded-3xl text-white space-y-4 shadow-xl">
             <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                <Info size={12} /> Panduan Absensi
             </div>
             <div className="grid grid-cols-2 gap-2">
                {[
                  { code: '✓ (P)', label: 'Hadir', text: 'text-blue-400' },
                  { code: 'S', label: 'Sakit', text: 'text-amber-400' },
                  { code: 'I', label: 'Ijin', text: 'text-cyan-400' },
                  { code: 'A', label: 'Alfa', text: 'text-red-400' },
                  { code: 'C', label: 'Cuti', text: 'text-emerald-400' },
                  { code: 'DL', label: 'Dinas', text: 'text-purple-400' },
                ].map(item => (
                  <div key={item.code} className="flex items-center gap-1.5 p-1.5 bg-white/5 rounded-lg border border-white/5">
                    <span className={`w-5 font-black text-[9px] text-center ${item.text}`}>{item.code.split(' ')[0]}</span>
                    <span className="text-[8px] font-bold text-white/60">{item.label}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Preview Area Container */}
        <div className="xl:col-span-3 flex flex-col h-full bg-slate-200/50 rounded-[2.5rem] border border-slate-300 relative overflow-hidden group">
           <div className="absolute top-6 left-6 z-20 flex gap-2">
              {(['reg', 'pppk', 'extra', 'tukang'] as const).map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setActiveCategory(cat)} 
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${activeCategory === cat ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                >
                  {cat}
                </button>
              ))}
           </div>
           
           <div className="absolute bottom-6 right-6 z-20 flex gap-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-xl shadow-xl border border-slate-200">
              <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"><ZoomOut size={16}/></button>
              <div className="w-12 flex items-center justify-center font-black text-xs text-slate-700">{Math.round(scale * 100)}%</div>
              <button onClick={() => setScale(s => Math.min(1.5, s + 0.1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"><ZoomIn size={16}/></button>
              <button onClick={() => setScale(0.85)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-colors border-l border-slate-200 ml-1"><Maximize size={14}/></button>
           </div>

           <div className="flex-1 overflow-auto flex items-start justify-center p-12 print:p-0 print:block attendance-scroll-area">
             <div 
                ref={paperRef}
                className="attendance-paper-landscape bg-white shadow-2xl relative print:shadow-none flex flex-col text-black font-['Times_New_Roman'] transition-transform duration-200 origin-top"
                style={{ transform: `scale(${scale})` }}
             >
               <div className="paper-padding flex flex-col items-center">
                 <div className="w-full border-b-[3px] border-double border-black pb-2 mb-4 grid grid-cols-[90px_1fr_90px] items-center text-black font-['Times_New_Roman']">
                    <div className="flex justify-center">{config.logoDaerahUrl && <img src={config.logoDaerahUrl} className="w-[24mm] h-auto" />}</div>
                    <div className="text-center w-full px-2">
                       <h3 className="text-[14pt] font-['Times_New_Roman'] uppercase leading-tight">{config.headerLine1}</h3>
                       <h3 className="text-[14pt] font-bold font-['Times_New_Roman'] uppercase leading-tight">{config.headerLine2}</h3>
                       <h1 className="text-[18pt] font-black font-['Times_New_Roman'] uppercase my-1 leading-none tracking-tight">{config.name}</h1>
                       <p className="text-[10pt] font-['Times_New_Roman']">{config.address}</p>
                       <p className="text-[10pt] font-['Times_New_Roman']">Email: {config.email}</p>
                    </div>
                    <div className="flex justify-center">{config.logoUrl && <img src={config.logoUrl} className="w-[24mm] h-auto" />}</div>
                 </div>

                 <div className="judul-laporan text-center mb-6 text-black w-full">
                   <h2 className="text-[14pt] font-bold underline underline-offset-4 decoration-2 uppercase text-black mb-1">{view === 'recap' ? 'REKAPITULASI KEHADIRAN GURU DAN PEGAWAI' : getCategoryTitle(activeCategory)}</h2>
                   <p className="text-[11pt] uppercase text-black font-bold tracking-[0.2em]">BULAN : {format(new Date(year, month, 1), 'MMMM yyyy', { locale: id })}</p>
                 </div>

                 <div className="w-full">
                   {view === 'recap' ? (
                      <table className="recap-table w-full border-collapse text-[10pt] text-black border-black font-['Times_New_Roman']">
                        <thead>
                          <tr className="bg-slate-50/50 print:bg-transparent">
                            <th rowSpan={2} className="border-[1.5pt] border-black p-2 w-10 text-center font-bold">NO</th>
                            <th rowSpan={2} className="border-[1.5pt] border-black p-2 text-center font-bold">NAMA LENGKAP / NIP</th>
                            <th rowSpan={2} className="border-[1.5pt] border-black p-2 text-center font-bold">PANGKAT / GOL</th>
                            <th rowSpan={2} className="border-[1.5pt] border-black p-2 w-28 text-center font-bold">HARI KERJA</th>
                            <th colSpan={5} className="border-[1.5pt] border-black p-2 text-center font-bold text-[9pt]">KETERANGAN ALASAN</th>
                            <th rowSpan={2} className="border-[1.5pt] border-black p-2 w-28 text-center font-bold">KEHADIRAN</th>
                          </tr>
                          <tr className="bg-slate-50/50 print:bg-transparent">
                            <th className="border-[1.5pt] border-black p-2 w-14 text-center font-bold text-[9pt]">S</th>
                            <th className="border-[1.5pt] border-black p-2 w-14 text-center font-bold text-[9pt]">I</th>
                            <th className="border-[1.5pt] border-black p-2 w-14 text-center font-bold text-[9pt]">C</th>
                            <th className="border-[1.5pt] border-black p-2 w-14 text-center font-bold text-[9pt]">DL</th>
                            <th className="border-[1.5pt] border-black p-2 w-14 text-center font-bold text-[9pt]">A</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentStaffList.map((staff, idx) => {
                            const r = calculateRecap(staff.id);
                            return (
                              <tr key={staff.id}>
                                <td className="border border-black text-center py-3">{idx + 1}</td>
                                <td className="border border-black px-4 py-3 align-middle">
                                  <div className="font-bold text-[11pt] leading-tight mb-1">{staff.name || '...'}</div>
                                  <div className="text-[9pt] font-medium italic opacity-70 print:opacity-100">NIP. {staff.nip || '-'}</div>
                                </td>
                                <td className="border border-black text-center py-3">{staff.rank || '-'}</td>
                                <td className="border border-black text-center font-bold py-3 text-[11pt]">{r.workingDays}</td>
                                <td className="border border-black text-center py-3">{r.s || '-'}</td>
                                <td className="border border-black text-center py-3">{r.i || '-'}</td>
                                <td className="border border-black text-center py-3">{r.c || '-'}</td>
                                <td className="border border-black text-center py-3">{r.dl || '-'}</td>
                                <td className="border border-black text-center py-3">{r.a || '-'}</td>
                                <td className="border border-black text-center font-bold bg-slate-50/50 print:bg-transparent py-3 text-[11pt]">{r.presence}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                   ) : (
                      <table className="attendance-table w-full border-collapse text-[8.5pt] table-fixed text-black border-black border-[1.5pt] font-['Times_New_Roman']">
                       <thead>
                         <tr className="bg-slate-50/50 print:bg-transparent">
                           <th rowSpan={2} className="border border-black p-1 text-black font-bold text-center w-8">NO</th>
                           <th rowSpan={2} className="border border-black p-1 text-black font-bold text-center w-[250px]">NAMA LENGKAP / NIP</th>
                           <th rowSpan={2} className="border border-black p-1 text-black font-bold text-center w-[110px]">JABATAN</th>
                           <th colSpan={daysInMonth} className="border border-black p-1 text-black font-bold text-center uppercase tracking-widest text-[8.5pt]">TANGGAL ABSENSI (A: Masuk, B: Pulang)</th>
                           <th colSpan={6} className="border border-black p-1 text-black font-bold text-center uppercase tracking-wider text-[7.5pt]">REKAP</th>
                         </tr>
                         <tr className="bg-slate-50/50 print:bg-transparent">
                           {dateRange.map(d => (
                             <th key={d} className={`border border-black p-0.5 text-[7pt] font-black h-8 text-center min-w-[22px] transition-colors ${isDayOff(d) ? 'bg-red-600 text-white print:bg-red-600' : 'text-black'}`}>
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
                             <tr key={staff.id} style={{height: '44px'}}>
                               <td className="border border-black text-center text-black align-middle font-medium">{sIdx + 1}</td>
                               <td className="border border-black px-2 py-1 leading-tight align-middle">
                                 <div className="font-bold text-black text-[10pt] leading-tight mb-0.5 whitespace-normal">{staff.name || '...'}</div>
                                 <div className="text-[8pt] text-slate-500 print:text-black italic font-medium">NIP. {staff.nip || '...'}</div>
                               </td>
                               <td className="border border-black text-center text-[8pt] leading-tight px-1 text-black align-middle whitespace-normal font-medium">{staff.rank || '-'}</td>
                               {dateRange.map(d => (
                                 <td key={`cell-${d}`} className={`border border-black p-0 group/cell transition-colors relative ${isDayOff(d) ? 'bg-red-500 print:bg-red-500' : 'hover:bg-slate-50'}`}>
                                    <div className="flex flex-col h-full w-full">
                                       <div onClick={() => toggleAttendance(staff.id, d, 'in')} className={`flex-1 flex items-center justify-center border-b border-black/10 min-h-[22px] transition-all ${isDayOff(d) ? 'cursor-not-allowed opacity-0' : 'cursor-pointer hover:bg-white active:bg-blue-50'}`}>
                                         {getStatusDisplay(attendance[`${staff.id}-${d}-in`])}
                                       </div>
                                       <div onClick={() => toggleAttendance(staff.id, d, 'out')} className={`flex-1 flex items-center justify-center min-h-[22px] transition-all ${isDayOff(d) ? 'cursor-not-allowed opacity-0' : 'cursor-pointer hover:bg-white active:bg-blue-50'}`}>
                                         {getStatusDisplay(attendance[`${staff.id}-${d}-out`])}
                                       </div>
                                    </div>
                                 </td>
                               ))}
                               <td className="border border-black text-center font-bold text-black align-middle text-[9pt]">{recap.s || ''}</td>
                               <td className="border border-black text-center font-bold text-black align-middle text-[9pt]">{recap.i || ''}</td>
                               <td className="border border-black text-center font-bold text-black align-middle text-[9pt]">{recap.a || ''}</td>
                               <td className="border border-black text-center font-bold text-black align-middle text-[9pt]">{recap.c || ''}</td>
                               <td className="border border-black text-center font-bold text-black align-middle text-[9pt]">{recap.dl || ''}</td>
                               <td className="border border-black text-center font-black bg-slate-50/50 print:bg-transparent text-black align-middle text-[10pt]">{recap.presence}</td>
                             </tr>
                           );
                         })}
                       </tbody>
                     </table>
                   )}
                 </div>

                 <div className="mt-8 flex justify-end font-['Times_New_Roman'] text-[11pt] break-inside-avoid text-black w-full pr-[15mm]">
                   <div className="flex flex-col text-center w-[350px]">
                     <p className="mb-1">Kediri, {format(new Date(year, month + 1, 0), 'dd MMMM yyyy', { locale: id })}</p>
                     <p className="font-bold leading-tight">Kepala Sekolah,</p>
                     <div className="h-24"></div>
                     <p className="font-bold underline underline-offset-4 decoration-1 uppercase tracking-wide">{config.principalName}</p>
                     <p className="font-bold">NIP. {config.principalNip}</p>
                   </div>
                 </div>
               </div>
               
               <div className="absolute top-4 right-6 text-[9px] font-black text-slate-200 tracking-[0.5em] uppercase pointer-events-none print:hidden">Pratinjau F4 Landscape 330x215mm</div>
             </div>
           </div>
        </div>
      </div>

      <style>{`
        .attendance-paper-landscape {
           width: 330mm;
           min-width: 330mm;
           min-height: 215mm;
           background: white;
           margin: 0 auto;
           display: flex;
           flex-direction: column;
           border: 1px solid #e2e8f0;
           transform-origin: top center;
        }

        .paper-padding {
           width: 100%;
           padding: 10mm 15mm; 
        }

        @media print {
          /* 1. Sembunyikan SEMUA elemen secara default */
          body * {
            visibility: hidden !important;
          }

          /* 2. Hanya tampilkan naskah absensi dan semua isinya */
          .attendance-paper-landscape, 
          .attendance-paper-landscape * {
            visibility: visible !important;
          }

          /* 3. Atur posisi naskah agar menempati seluruh layar cetak */
          .attendance-paper-landscape {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 330mm !important;
            height: 215mm !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            transform: scale(1) !important; /* Reset skala pratinjau ke 1:1 */
            background: white !important;
            z-index: 9999 !important;
          }

          @page { 
            size: 330mm 215mm landscape; 
            margin: 0; 
          }
          
          /* Hilangkan elemen layout luar */
          body {
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: white !important;
          }

          /* Pastikan warna tetap muncul saat cetak */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .bg-red-600 { background-color: #dc2626 !important; color: white !important; }
          .bg-red-500 { background-color: #ef4444 !important; color: white !important; }
          table { border: 1.5pt solid black !important; border-collapse: collapse !important; }
          th, td { border: 1pt solid black !important; }
        }
      `}</style>
    </div>
  );
};

export default AttendanceCreator;
