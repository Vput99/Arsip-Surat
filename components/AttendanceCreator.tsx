import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Calendar, Loader2, Music, Hammer, ChevronLeft, 
  ArrowRight, Save, ZoomIn, ZoomOut, CheckCircle, 
  BarChart3, CalendarDays, UserCheck, CalendarOff, 
  ShieldCheck, List, Eye, Trash2, Plus, CalendarSearch, Printer,
  ChevronRight
} from 'lucide-react';
import { 
  subscribeToConfig, subscribeToStaff, StaffMember, 
  saveMail, subscribeToAttendance, saveAttendance 
} from '../services/storage';
import { SchoolConfig, Mail, MailType, MailStatus, UrgencyLevel } from '../types';
import { format, getDaysInMonth, isSunday, isSaturday, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { id } from 'date-fns/locale/id';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const months = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

type AttendanceCategory = 'reg' | 'pppk' | 'extra' | 'tukang';
type ViewMode = 'category_menu' | 'sub_menu' | 'staff_data' | 'calendar_settings' | 'preview_editor';

const AttendanceCreator: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [view, setView] = useState<ViewMode>('category_menu');
  const [activeCategory, setActiveCategory] = useState<AttendanceCategory>('reg');
  
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [holidays, setHolidays] = useState<number[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [activeStatus, setActiveStatus] = useState<string>('P');
  
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [scale, setScale] = useState(0.7);
  const [saveLoading, setSaveLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const paperRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const unsubscribeConfig = subscribeToConfig(setConfig);
    const unsubscribeStaff = subscribeToStaff(setAllStaff);
    return () => { unsubscribeConfig(); unsubscribeStaff(); };
  }, []);

  useEffect(() => {
    if (view === 'preview_editor' || view === 'calendar_settings' || view === 'sub_menu') {
      setSyncing(true);
      const unsubscribe = subscribeToAttendance(year, month, activeCategory, (data) => {
        if (data) {
          setAttendance(data.attendance || {});
          setHolidays(data.holidays || []);
        } else {
          setAttendance({});
          setHolidays([]);
        }
        setSyncing(false);
      });
      return () => unsubscribe();
    }
  }, [activeCategory, month, year, view]);

  const currentStaffList = allStaff.filter(s => s.category === activeCategory);
  const daysInMonth = getDaysInMonth(new Date(year, month));
  const dateRange = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const isDayOff = (day: number) => {
    const date = new Date(year, month, day);
    return isSunday(date) || isSaturday(date) || holidays.includes(day);
  };

  const toggleHoliday = (day: number) => {
    let newHolidays = [...holidays];
    if (newHolidays.includes(day)) {
      newHolidays = newHolidays.filter(h => h !== day);
    } else {
      newHolidays.push(day);
    }
    setHolidays(newHolidays);
    saveAttendance(year, month, activeCategory, { attendance, holidays: newHolidays });
  };

  const handleCellClick = (staffId: string, day: number) => {
    if (isDayOff(day)) return;
    const key = `${staffId}-${day}`;
    const newAttendance = { ...attendance };
    if (newAttendance[key] === activeStatus) {
      delete newAttendance[key];
    } else {
      newAttendance[key] = activeStatus;
    }
    setAttendance(newAttendance);
    saveAttendance(year, month, activeCategory, { attendance: newAttendance, holidays });
  };

  const calculateRecap = (staffId: string) => {
    let p = 0, s = 0, i = 0, a = 0, c = 0, dl = 0;
    dateRange.forEach(day => {
      if (!isDayOff(day)) {
        const status = attendance[`${staffId}-${day}`];
        if (!status || status === 'P') p++;
        else if (status === 'S') s++;
        else if (status === 'I') i++;
        else if (status === 'A') a++;
        else if (status === 'C') c++;
        else if (status === 'DL') dl++;
      }
    });
    return { p, s, i, a, c, dl };
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
      const catLabel = activeCategory === 'reg' ? 'ASN' : activeCategory.toUpperCase();
      
      const newMail: Mail = {
        id: Date.now().toString(),
        type: MailType.OUTGOING,
        referenceNumber: `ABS/${catLabel}/${month+1}/${year}`,
        date: new Date().toISOString().split('T')[0],
        receivedDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        sender: 'Kepala Sekolah',
        subject: `Daftar Hadir ${catLabel} - ${period}`,
        description: `Rekapitulasi kehadiran personil ${catLabel} bulan ${period}.`,
        category: 'Absensi',
        urgency: UrgencyLevel.LOW,
        status: MailStatus.ARCHIVED,
        fileUrl: pdfDataUri,
      };
      await saveMail(newMail);
      alert('Laporan absensi berhasil diarsipkan.');
      navigate('/outbox');
    } catch (e: any) {
      alert('Gagal: ' + e.message);
    } finally {
      setSaveLoading(false);
    }
  };

  if (!config) return <div className="p-20 text-center glass-panel m-10 rounded-[3rem]"><Loader2 className="animate-spin inline-block mr-3 text-premium-600" /> <span className="font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Data Presensi...</span></div>;

  // Render Pemilih Periode (Month/Year) - Glass Style
  const PeriodSelector = () => (
    <div className="flex glass-panel p-1.5 rounded-2xl border border-white/20 items-center shadow-inner">
      <div className="flex items-center px-4 text-slate-400">
        <CalendarSearch size={18} />
      </div>
      <select 
        value={month} 
        onChange={(e) => setMonth(parseInt(e.target.value))} 
        className="bg-transparent text-xs font-black px-3 py-2 outline-none text-slate-700 cursor-pointer appearance-none uppercase tracking-wider"
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <option key={i} value={i}>{months[i]}</option>
        ))}
      </select>
      <div className="h-6 w-px bg-slate-200/50 mx-2"></div>
      <input 
        type="number" 
        value={year} 
        onChange={(e) => setYear(parseInt(e.target.value))} 
        className="bg-transparent text-xs font-black w-20 text-center outline-none text-premium-600 px-3"
      />
    </div>
  );

  // --- RENDERING CATEGORY MENU ---
  if (view === 'category_menu') {
    return (
      <div className="max-w-6xl mx-auto py-20 px-8 animate-fade-in relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-black text-slate-800 tracking-tighter uppercase">Manajemen Presensi</h2>
          <p className="text-slate-400 font-black mt-3 uppercase tracking-[0.4em] text-[10px] opacity-70">Pilih Kategori Personil Untuk Rekapitulasi</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {(['reg', 'pppk', 'extra', 'tukang'] as const).map(m => (
            <button 
              key={m} 
              onClick={() => { setActiveCategory(m); setView('sub_menu'); }} 
              className="glass-card p-10 rounded-[3.5rem] border border-white/40 shadow-xl hover:shadow-3xl hover:-translate-y-3 transition-all text-left group overflow-hidden relative"
            >
              <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-10 group-hover:opacity-20 transition-all blur-2xl ${
                m === 'reg' ? 'bg-blue-600' : 
                m === 'pppk' ? 'bg-violet-600' : 
                m === 'extra' ? 'bg-emerald-600' : 
                'bg-amber-600'
              }`}></div>
              <div className={`w-16 h-16 rounded-[1.5rem] mb-8 flex items-center justify-center relative z-10 shadow-inner border border-white/20 ${
                m === 'reg' ? 'bg-blue-50 text-blue-600' : 
                m === 'pppk' ? 'bg-violet-50 text-violet-600' : 
                m === 'extra' ? 'bg-emerald-50 text-emerald-600' : 
                'bg-amber-50 text-amber-600'
              }`}>
                {m === 'extra' ? <Music size={32}/> : m === 'tukang' ? <Hammer size={32}/> : <Users size={32}/>}
              </div>
              <h3 className="text-2xl font-black mb-3 uppercase tracking-tight relative z-10 text-slate-800">
                {m === 'reg' ? 'ASN (PNS)' : m === 'pppk' ? 'PPPK' : m === 'extra' ? 'EKSTRA' : 'TUKANG'}
              </h3>
              <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] relative z-10 group-hover:text-premium-600 transition-colors">
                KELOLA ABSENSI <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- RENDERING SUB MENU ---
  if (view === 'sub_menu') {
    const catLabel = activeCategory === 'reg' ? 'ASN' : activeCategory.toUpperCase();
    return (
      <div className="max-w-4xl mx-auto py-20 px-8 animate-fade-in relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6">
          <button onClick={() => setView('category_menu')} className="flex items-center gap-3 text-premium-600 font-black uppercase text-[10px] tracking-widest hover:gap-5 transition-all p-4 glass-panel rounded-2xl">
            <ChevronLeft size={18}/> KEMBALI KE KATEGORI
          </button>
          <PeriodSelector />
        </div>
        <div className="mb-12">
          <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">Menu Absensi {catLabel}</h2>
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] mt-2 opacity-70">Periode: {months[month]} {year}</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {[
            { id: 'staff_data', icon: List, color: 'blue', title: '1. Daftar Personil', desc: `Sinkronisasi data pegawai ${catLabel}.` },
            { id: 'calendar_settings', icon: CalendarDays, color: 'rose', title: '2. Kalender Libur', desc: 'Suaikan hari efektif & libur sekolah.' },
            { id: 'preview_editor', icon: Eye, color: 'emerald', title: '3. Preview & Isi Absensi', desc: 'Isi data harian & export laporan.' }
          ].map((item, idx) => (
            <button key={item.id} onClick={() => setView(item.id as ViewMode)} className={`glass-card p-8 rounded-[2.5rem] border border-white/40 shadow-lg hover:shadow-2xl transition-all flex items-center gap-8 group hover:-translate-y-1 ${idx === 2 ? 'border-l-8 border-l-premium-600' : ''}`}>
              <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner border border-white/10 ${
                item.color === 'blue' ? 'bg-blue-50 text-blue-600' : 
                item.color === 'rose' ? 'bg-rose-50 text-rose-600' : 
                'bg-emerald-50 text-emerald-600'
              }`}>
                <item.icon size={32}/>
              </div>
              <div className="text-left flex-1">
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-800">{item.title}</h3>
                <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mt-1 opacity-60 italic">{item.desc}</p>
              </div>
              <ChevronRight size={24} className="text-slate-300 group-hover:text-premium-600 group-hover:translate-x-2 transition-all"/>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- RENDERING STAFF DATA ---
  if (view === 'staff_data') {
    return (
      <div className="max-w-4xl mx-auto py-20 px-8 animate-fade-in relative z-10">
        <button onClick={() => setView('sub_menu')} className="mb-12 flex items-center gap-3 text-premium-600 font-black uppercase text-[10px] tracking-widest p-4 glass-panel rounded-2xl">
          <ChevronLeft size={18}/> KEMBALI KE MENU
        </button>
        <div className="flex justify-between items-center mb-10">
           <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Data Pegawai {activeCategory === 'reg' ? 'ASN' : activeCategory.toUpperCase()}</h2>
           <div className="glass-panel px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.35rem] text-premium-600 shadow-inner">
             {currentStaffList.length} PERSONIL
           </div>
        </div>
        <div className="space-y-4">
          {currentStaffList.map((s, i) => (
            <div key={s.id} className="glass-card p-6 rounded-[2rem] border border-white/40 flex items-center gap-6 shadow-md hover:shadow-xl transition-all">
              <div className="w-12 h-12 glass-panel text-slate-400 rounded-2xl flex items-center justify-center font-black text-sm border border-white/20">{i+1}</div>
              <div className="flex-1">
                <p className="font-black text-slate-800 text-lg uppercase tracking-tight">{s.name}</p>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] mt-1 opactiy-70">{s.nip || 'TANPA NIP'} • {s.rank || 'STAFF'}</p>
              </div>
              <div className="p-3 bg-premium-50 text-premium-600 rounded-xl"><UserCheck size={20} /></div>
            </div>
          ))}
          {currentStaffList.length === 0 && (
            <div className="text-center py-32 glass-card rounded-[3rem] border-2 border-dashed border-slate-300">
               <Users size={48} className="mx-auto text-slate-200 mb-6" />
               <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">Belum Ada Data Personil Di Kategori Ini</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- RENDERING CALENDAR SETTINGS ---
  if (view === 'calendar_settings') {
    const start = startOfMonth(new Date(year, month));
    const firstDay = getDay(start);
    const blanks = Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }, (_, i) => i);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="max-w-4xl mx-auto py-20 px-8 animate-fade-in relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6">
          <button onClick={() => setView('sub_menu')} className="flex items-center gap-3 text-premium-600 font-black uppercase text-[10px] tracking-widest p-4 glass-panel rounded-2xl">
            <ChevronLeft size={18}/> KEMBALI KE MENU
          </button>
          <PeriodSelector />
        </div>
        <div className="mb-12 text-center">
           <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">Manajemen Libur</h2>
           <p className="text-premium-600 font-black text-[11px] uppercase tracking-[0.5em] mt-2 opacity-80">{months[month]} {year}</p>
        </div>

        <div className="glass-card p-12 rounded-[4rem] border border-white/40 shadow-2xl relative overflow-hidden">
           <div className="grid grid-cols-7 gap-4 mb-8">
              {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(d => (
                <div key={d} className="text-center text-[11px] font-black text-slate-400 uppercase py-2 tracking-widest">{d}</div>
              ))}
              {blanks.map(b => <div key={`b-${b}`} className="aspect-square glass-panel opacity-20 rounded-2xl border-none"></div>)}
              {days.map(d => {
                const off = isDayOff(d);
                return (
                  <button 
                    key={d} 
                    onClick={() => toggleHoliday(d)}
                    className={`aspect-square rounded-[1.5rem] text-sm font-black flex flex-col items-center justify-center transition-all border-2 ${off ? 'bg-rose-600 text-white shadow-[0_10px_25px_-5px_rgba(225,29,72,0.4)] border-white/20' : 'glass-panel text-slate-800 hover:bg-white/80 border-white/10 hover:border-premium-200'}`}
                  >
                    {d}
                    {off && <span className="text-[8px] font-black uppercase mt-1 tracking-tighter opacity-70">Libur</span>}
                  </button>
                );
              })}
           </div>
           <div className="mt-10 p-6 glass-panel rounded-[2rem] border border-premium-100/50 flex items-center gap-6 shadow-inner">
              <div className="p-3 bg-premium-50 text-premium-600 rounded-2xl"><ShieldCheck size={24}/></div>
              <p className="text-[10px] font-black text-slate-500 leading-relaxed uppercase tracking-widest opacity-80 italic">Klik tanggal untuk menandai libur nasional atau sekolah. Tanggal berwarna merah tidak akan dihitung dalam akumulasi kehadiran.</p>
           </div>
        </div>
      </div>
    );
  }

  // --- RENDERING PREVIEW EDITOR ---
  return (
    <div className="flex flex-col h-[calc(100vh-100px)] animate-fade-in overflow-hidden relative z-10 print:h-auto print:overflow-visible">
      {/* Dynamic Toolbar - Glass UI */}
      <div className="glass-card m-6 mb-0 p-5 px-8 flex flex-col md:flex-row justify-between items-center z-40 print:hidden shrink-0 border border-white/40 shadow-xl rounded-[2.5rem] gap-6">
         <div className="flex items-center gap-6">
           <button onClick={() => setView('sub_menu')} className="p-4 glass-panel rounded-2xl hover:bg-white/80 transition-all text-slate-500 border border-white/20"><ChevronLeft size={24}/></button>
           <div>
             <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800">
               Preview {activeCategory === 'reg' ? 'ASN' : activeCategory.toUpperCase()}
             </h2>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1 opacity-70">{months[month]} {year} • Presensi Digital</p>
           </div>
         </div>
         
         <div className="flex items-center gap-5">
            <PeriodSelector />
            <div className="hidden lg:flex items-center glass-panel p-1.5 rounded-[1.75rem] border border-white/20 gap-1.5 shadow-inner">
               {['P', 'S', 'I', 'A', 'C', 'DL'].map(st => (
                 <button 
                  key={st} 
                  onClick={() => setActiveStatus(st)}
                  className={`w-11 h-11 rounded-2xl text-[11px] font-black transition-all flex items-center justify-center tracking-tighter ${activeStatus === st ? 'bg-premium-600 text-white shadow-xl scale-110 ring-2 ring-white/20' : 'text-slate-400 hover:bg-white/50 hover:text-slate-600'}`}
                 >
                   {st}
                 </button>
               ))}
            </div>
            <div className="h-10 w-px bg-slate-200/50 mx-1"></div>
            <button onClick={() => window.print()} className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3rem] shadow-xl flex items-center gap-3 hover:bg-black transition-all active:scale-95 border border-white/10">
              <Printer size={18} /> CETAK
            </button>
            <button onClick={handleSaveToArchive} disabled={saveLoading} className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3rem] shadow-[0_15px_35px_-5px_rgba(79,70,229,0.4)] flex items-center gap-3 hover:bg-indigo-700 transition-all active:scale-95 ring-1 ring-white/20">
              {saveLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} ARSIPKAN
            </button>
         </div>
      </div>
      
      {/* Preview Area - Pro Glass Container */}
      <div className="flex-1 overflow-auto p-16 print:p-0 flex flex-col items-center print:h-auto print:overflow-visible print:block custom-scrollbar">
         {syncing && (
           <div className="fixed top-32 left-1/2 -translate-x-1/2 glass-premium px-8 py-4 rounded-full border border-premium-200/50 shadow-2xl flex items-center gap-4 z-50 animate-bounce print:hidden">
              <Loader2 className="animate-spin text-premium-600" size={20} />
              <span className="text-[11px] font-black uppercase tracking-[0.4em] text-premium-700">Sinkronisasi Realtime...</span>
           </div>
         )}
         <div 
           ref={paperRef} 
           className="attendance-paper-landscape bg-white shadow-2xl relative print:shadow-none flex flex-col p-[10mm] text-black font-serif transition-transform origin-top print:transform-none" 
           style={{ width: '330mm', minHeight: '215mm', transform: `scale(${scale})` }}
         >
            {/* Kop Surat Persis Contoh */}
            <div className="border-b-[3px] border-double border-black pb-2 mb-4 grid grid-cols-[30mm_1fr_30mm] items-center text-center">
               <img src={config.logoDaerahUrl} className="w-[20mm] h-auto object-contain mx-auto" />
               <div className="px-2">
                  <h3 className="text-[12pt] uppercase font-bold leading-tight">{config.headerLine1}</h3>
                  <h3 className="text-[12pt] font-bold uppercase leading-tight">{config.headerLine2}</h3>
                  <h1 className="text-[15pt] font-black uppercase my-0.5 tracking-tight">{config.name}</h1>
                  <p className="text-[8pt] font-bold leading-tight">{config.address}</p>
                  <div className="flex justify-center items-center gap-2 text-[7pt] font-bold italic leading-tight whitespace-nowrap">
                     <span>NPSN: {config.npsn}</span>
                     <span className="text-slate-400">|</span>
                     <span>Email: {config.email}</span>
                  </div>
               </div>
               <img src={config.logoUrl} className="w-[20mm] h-auto object-contain mx-auto" />
            </div>

            <div className="text-center mb-4">
               <h2 className="text-[12pt] font-bold underline uppercase tracking-wider">DAFTAR HADIR GURU DAN PEGAWAI</h2>
               <p className="text-[10pt] font-bold uppercase mt-0.5">BULAN : {format(new Date(year, month, 1), 'MMMM yyyy', { locale: id })}</p>
            </div>
            
            <div className="w-full flex-1 overflow-hidden">
               <table className="w-full border-collapse border-black border-[1.2pt] text-[7pt] table-fixed">
                  <colgroup>
                    <col className="w-[8mm]" />
                    <col className="w-[45mm]" />
                    <col className="w-[30mm]" />
                    {dateRange.map(d => <col key={`c-${d}`} className="w-[5.5mm]" />)}
                    <col className="w-[5mm]" />
                    <col className="w-[5mm]" />
                    <col className="w-[5mm]" />
                    <col className="w-[5mm]" />
                    <col className="w-[5mm]" />
                    <col className="w-[6.5mm]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-transparent">
                      <th className="border border-black p-1 text-center align-middle" rowSpan={2}>NO</th>
                      <th className="border border-black p-1 text-center align-middle" rowSpan={2}>NAMA LENGKAP / NIP</th>
                      <th className="border border-black p-1 text-center align-middle" rowSpan={2}>JABATAN</th>
                      <th className="border border-black p-0.5 text-center uppercase tracking-tighter" colSpan={dateRange.length}>
                        TANGGAL ABSENSI (A: MASUK, B: PULANG)
                      </th>
                      <th className="border border-black p-0.5 text-center uppercase" colSpan={6}>REKAP</th>
                    </tr>
                    <tr className="bg-transparent">
                      {dateRange.map(d => (
                        <th 
                          key={d} 
                          className={`border border-black p-0 text-[6.5pt] text-center ${isDayOff(d) ? 'bg-red-500 text-white font-bold' : ''}`}
                        >
                          {d}
                        </th>
                      ))}
                      <th className="border border-black p-0 text-[6pt] text-center">S</th>
                      <th className="border border-black p-0 text-[6pt] text-center">I</th>
                      <th className="border border-black p-0 text-[6pt] text-center">A</th>
                      <th className="border border-black p-0 text-[6pt] text-center">C</th>
                      <th className="border border-black p-0 text-[6pt] text-center">DL</th>
                      <th className="border border-black p-0 text-[6pt] text-center font-bold">JML</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentStaffList.map((staff, idx) => {
                      const r = calculateRecap(staff.id);
                      return (
                        <tr key={staff.id} className="h-[8mm]">
                          <td className="border border-black text-center font-bold">{idx + 1}</td>
                          <td className="border border-black px-1 py-0.5 font-bold leading-[1.1] text-left">
                            {staff.name.toUpperCase()}<br/>
                            <span className="text-[6.5pt] font-normal tracking-tight">NIP. {staff.nip || '-'}</span>
                          </td>
                          <td className="border border-black text-center text-[6.5pt] leading-tight px-0.5">
                            {staff.rank || '-'}
                          </td>
                          {dateRange.map(d => {
                            const status = attendance[`${staff.id}-${d}`];
                            const dayOff = isDayOff(d);
                            return (
                              <td 
                                key={d} 
                                onClick={() => handleCellClick(staff.id, d)} 
                                className={`border border-black text-center cursor-pointer transition-all ${dayOff ? 'bg-red-500' : ''}`}
                              >
                                {status && status !== 'P' ? (
                                  <span className="text-[7pt] font-black">{status}</span>
                                ) : (!dayOff && (
                                  <span className="text-[7pt] text-slate-100 opacity-0">.</span>
                                ))}
                              </td>
                            );
                          })}
                          <td className="border border-black text-center text-[7pt]">{r.s || ''}</td>
                          <td className="border border-black text-center text-[7pt]">{r.i || ''}</td>
                          <td className="border border-black text-center text-[7pt] font-bold">{r.a || ''}</td>
                          <td className="border border-black text-center text-[7pt]">{r.c || ''}</td>
                          <td className="border border-black text-center text-[7pt]">{r.dl || ''}</td>
                          <td className="border border-black text-center text-[7pt] font-bold">{r.p}</td>
                        </tr>
                      );
                    })}
                  </tbody>
               </table>
            </div>

            {/* Tanda Tangan */}
            <div className="mt-6 flex justify-end px-4 text-[9pt] leading-[1.2] font-serif">
               <div className="text-center w-[250px] flex flex-col items-center">
                  <p className="mb-0.5">Kediri, {format(new Date(year, month + 1, 0), 'dd MMMM yyyy', { locale: id })}</p>
                  <p className="font-bold">Kepala Sekolah,</p>
                  <div className="h-[25mm] flex items-center justify-center my-1">
                     {/* QR Code Dihilangkan Sesuai Kode Asal */}
                  </div>
                  <p className="font-bold underline uppercase leading-none">{config.principalName}</p>
                  <p className="text-[8.5pt]">NIP. {config.principalNip}</p>
               </div>
            </div>
         </div>
      </div>
      
      <div className="fixed bottom-6 right-6 flex gap-2 z-50 print:hidden">
        <button onClick={() => setScale(Math.max(0.4, scale - 0.1))} className="p-3 bg-white border shadow-xl rounded-2xl"><ZoomOut size={20}/></button>
        <button onClick={() => setScale(0.7)} className="px-5 bg-white border shadow-xl rounded-2xl font-black text-xs uppercase tracking-widest">Reset</button>
        <button onClick={() => setScale(Math.min(1.2, scale + 0.1))} className="p-3 bg-white border shadow-xl rounded-2xl"><ZoomIn size={20}/></button>
      </div>

      <style>{`
        .attendance-paper-landscape { box-sizing: border-box; }
        
        @media print {
          @page { size: 330mm 215mm landscape; margin: 0; }
          
          html, body {
            width: 330mm;
            height: 100%;
            margin: 0 !important;
            padding: 0 !important;
            background: white;
          }

          /* Reset visibility for all elements, rely on print:hidden utility classes */
          body * { visibility: visible; }
          
          .attendance-paper-landscape { 
            width: 330mm !important; 
            min-height: 215mm !important;
            height: auto !important; 
            margin: 0 !important; 
            padding: 10mm !important;
            position: relative !important;
            left: auto !important;
            top: auto !important;
            transform: none !important;
            box-shadow: none !important;
            border: none !important;
            display: block !important;
          }
          
          /* Ensure table headers repeat on new pages if supported */
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }

          /* Force background colors to print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AttendanceCreator;
