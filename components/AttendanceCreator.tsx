
import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Calendar, Loader2, Music, Hammer, ChevronLeft, 
  ArrowRight, Save, ZoomIn, ZoomOut, CheckCircle, 
  BarChart3, CalendarDays, UserCheck, CalendarOff, 
  ShieldCheck, List, Eye, Trash2, Plus, CalendarSearch
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

  if (!config) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-indigo-600" /></div>;

  // Render Pemilih Periode (Month/Year)
  const PeriodSelector = () => (
    <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 items-center ring-1 ring-slate-200/50">
      <div className="flex items-center px-3 text-slate-400">
        <CalendarSearch size={16} />
      </div>
      <select 
        value={month} 
        onChange={(e) => setMonth(parseInt(e.target.value))} 
        className="bg-transparent text-[11px] font-black px-2 py-1.5 outline-none text-slate-700 cursor-pointer"
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <option key={i} value={i}>{format(new Date(2022, i, 1), 'MMMM', { locale: id })}</option>
        ))}
      </select>
      <div className="h-4 w-px bg-slate-300 mx-1"></div>
      <input 
        type="number" 
        value={year} 
        onChange={(e) => setYear(parseInt(e.target.value))} 
        className="bg-transparent text-[11px] font-black w-16 text-center outline-none text-indigo-600 px-2"
      />
    </div>
  );

  // --- RENDERING CATEGORY MENU ---
  if (view === 'category_menu') {
    return (
      <div className="max-w-6xl mx-auto py-12 px-6 animate-fade-in">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Manajemen Presensi</h2>
          <p className="text-slate-500 font-bold mt-2 italic uppercase">Silakan pilih kategori pegawai</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {(['reg', 'pppk', 'extra', 'tukang'] as const).map(m => (
            <button 
              key={m} 
              onClick={() => { setActiveCategory(m); setView('sub_menu'); }} 
              className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all text-left group overflow-hidden relative"
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-50 rounded-full group-hover:bg-indigo-50 transition-colors"></div>
              <div className={`w-14 h-14 rounded-2xl mb-6 flex items-center justify-center relative z-10 ${
                m === 'reg' ? 'bg-blue-100 text-blue-600' : 
                m === 'pppk' ? 'bg-violet-100 text-violet-600' : 
                m === 'extra' ? 'bg-emerald-100 text-emerald-600' : 
                'bg-amber-100 text-amber-600'
              }`}>
                {m === 'extra' ? <Music size={28}/> : m === 'tukang' ? <Hammer size={28}/> : <Users size={28}/>}
              </div>
              <h3 className="text-xl font-black mb-2 uppercase tracking-tight relative z-10">
                {m === 'reg' ? 'ASN' : m === 'pppk' ? 'PPPK' : m === 'extra' ? 'EKSTRAKURIKULER' : 'TUKANG'}
              </h3>
              <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest relative z-10">
                Pilih Menu <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
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
      <div className="max-w-4xl mx-auto py-12 px-6 animate-fade-in">
        <div className="flex justify-between items-start mb-8">
          <button onClick={() => setView('category_menu')} className="flex items-center gap-2 text-indigo-600 font-black uppercase text-xs hover:gap-3 transition-all">
            <ChevronLeft size={16}/> Kembali ke Kategori
          </button>
          <PeriodSelector />
        </div>
        <div className="mb-10">
          <h2 className="text-3xl font-black text-slate-900 uppercase">Menu Absensi {catLabel}</h2>
          <p className="text-slate-400 font-bold text-sm">Kelola data, kalender libur, dan preview laporan.</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <button onClick={() => setView('staff_data')} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center gap-6 group">
            <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><List size={28}/></div>
            <div className="text-left">
              <h3 className="text-lg font-black uppercase tracking-tight">1. Data Nama Pegawai</h3>
              <p className="text-slate-400 text-xs font-bold italic">Lihat daftar pegawai kategori {catLabel}.</p>
            </div>
            <ChevronLeft size={20} className="ml-auto rotate-180 text-slate-300"/>
          </button>

          <button onClick={() => setView('calendar_settings')} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center gap-6 group">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><CalendarDays size={28}/></div>
            <div className="text-left">
              <h3 className="text-lg font-black uppercase tracking-tight">2. Kalender Aktif</h3>
              <p className="text-slate-400 text-xs font-bold italic">Atur hari libur bulan berjalan.</p>
            </div>
            <ChevronLeft size={20} className="ml-auto rotate-180 text-slate-300"/>
          </button>

          <button onClick={() => setView('preview_editor')} className="bg-white p-6 rounded-3xl border border-indigo-200 shadow-sm hover:shadow-md transition-all flex items-center gap-6 group border-l-8 border-l-indigo-600">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><Eye size={28}/></div>
            <div className="text-left">
              <h3 className="text-lg font-black uppercase tracking-tight">3. Preview & Isi Absensi</h3>
              <p className="text-slate-400 text-xs font-bold italic">Lihat dan isi daftar hadir harian.</p>
            </div>
            <ChevronLeft size={20} className="ml-auto rotate-180 text-slate-300"/>
          </button>
        </div>
      </div>
    );
  }

  // --- RENDERING STAFF DATA ---
  if (view === 'staff_data') {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6 animate-fade-in">
        <button onClick={() => setView('sub_menu')} className="mb-8 flex items-center gap-2 text-indigo-600 font-black uppercase text-xs">
          <ChevronLeft size={16}/> Kembali ke Menu
        </button>
        <div className="flex justify-between items-center mb-8">
           <h2 className="text-2xl font-black text-slate-900 uppercase">Data Pegawai {activeCategory === 'reg' ? 'ASN' : activeCategory.toUpperCase()}</h2>
           <span className="bg-slate-100 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{currentStaffList.length} Personil</span>
        </div>
        <div className="space-y-3">
          {currentStaffList.map((s, i) => (
            <div key={s.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center font-black text-xs">{i+1}</div>
              <div className="flex-1">
                <p className="font-black text-slate-800 uppercase tracking-tight">{s.name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.nip || 'TANPA NIP'} • {s.rank || 'TANPA JABATAN'}</p>
              </div>
            </div>
          ))}
          {currentStaffList.length === 0 && (
            <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
               <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Belum ada data di kategori ini. Atur di menu Konfigurasi.</p>
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
      <div className="max-w-4xl mx-auto py-12 px-6 animate-fade-in">
        <div className="flex justify-between items-center mb-8">
          <button onClick={() => setView('sub_menu')} className="flex items-center gap-2 text-indigo-600 font-black uppercase text-xs">
            <ChevronLeft size={16}/> Kembali ke Menu
          </button>
          <PeriodSelector />
        </div>
        <div className="mb-8 text-center">
           <h2 className="text-2xl font-black text-slate-900 uppercase">Atur Hari Libur</h2>
           <p className="text-slate-400 font-bold text-sm uppercase">{format(new Date(year, month, 1), 'MMMM yyyy', { locale: id })}</p>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
           <div className="grid grid-cols-7 gap-2 mb-4">
              {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(d => (
                <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase py-2">{d}</div>
              ))}
              {blanks.map(b => <div key={`b-${b}`} className="aspect-square bg-slate-50/50 rounded-2xl opacity-20"></div>)}
              {days.map(d => {
                const off = isDayOff(d);
                return (
                  <button 
                    key={d} 
                    onClick={() => toggleHoliday(d)}
                    className={`aspect-square rounded-2xl text-sm font-black flex flex-col items-center justify-center transition-all ${off ? 'bg-rose-600 text-white shadow-lg' : 'bg-slate-50 text-slate-800 hover:bg-indigo-50'}`}
                  >
                    {d}
                    {off && <span className="text-[7px] font-black opacity-60 uppercase mt-0.5 tracking-tighter">Libur</span>}
                  </button>
                );
              })}
           </div>
           <div className="mt-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-3">
              <ShieldCheck className="text-indigo-600" size={20}/>
              <p className="text-[10px] font-bold text-indigo-900 leading-relaxed uppercase">Klik tanggal untuk menandai libur nasional atau sekolah. Tanggal berwarna merah tidak akan dihitung dalam akumulasi kehadiran.</p>
           </div>
        </div>
      </div>
    );
  }

  // --- RENDERING PREVIEW EDITOR ---
  return (
    <div className="flex flex-col h-[calc(100vh-100px)] animate-fade-in overflow-hidden bg-slate-100">
      <div className="bg-white border-b border-slate-200 p-4 px-6 flex justify-between items-center z-40 print:hidden shrink-0">
         <div className="flex items-center gap-4">
           <button onClick={() => setView('sub_menu')} className="p-3 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors text-slate-600"><ChevronLeft size={20}/></button>
           <div>
             <h2 className="text-lg font-black uppercase tracking-tight">
               Preview {activeCategory === 'reg' ? 'ASN' : activeCategory.toUpperCase()}
             </h2>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{format(new Date(year, month, 1), 'MMMM yyyy', { locale: id })}</p>
           </div>
         </div>
         
         <div className="flex items-center gap-4">
            <PeriodSelector />
            <div className="hidden md:flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 gap-1 mx-2">
               {['P', 'S', 'I', 'A', 'C', 'DL'].map(st => (
                 <button 
                  key={st} 
                  onClick={() => setActiveStatus(st)}
                  className={`w-10 h-10 rounded-xl text-xs font-black transition-all flex items-center justify-center ${activeStatus === st ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'text-slate-400 hover:bg-white'}`}
                 >
                   {st}
                 </button>
               ))}
            </div>
            <button onClick={handleSaveToArchive} disabled={saveLoading} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2">
              {saveLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Arsipkan
            </button>
         </div>
      </div>
      
      <div className="flex-1 overflow-auto p-12 print:p-0 flex flex-col items-center">
         {syncing && (
           <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur px-6 py-3 rounded-full border shadow-xl flex items-center gap-3 z-50 animate-bounce">
              <Loader2 className="animate-spin text-indigo-600" size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Sinkronisasi Data Realtime...</span>
           </div>
         )}
         <div 
           ref={paperRef} 
           className="attendance-paper-landscape bg-white shadow-2xl relative print:shadow-none flex flex-col p-[10mm] text-black font-serif transition-transform" 
           style={{ width: '330mm', minHeight: '215mm', transform: `scale(${scale})`, transformOrigin: 'top center' }}
         >
            {/* Kop Surat Persis Contoh */}
            <div className="border-b-[3px] border-double border-black pb-2 mb-4 grid grid-cols-[30mm_1fr_30mm] items-center text-center">
               <img src={config.logoDaerahUrl} className="w-[20mm] h-auto object-contain mx-auto" />
               <div className="px-2">
                  <h3 className="text-[12pt] uppercase font-bold leading-tight">{config.headerLine1}</h3>
                  <h3 className="text-[12pt] font-bold uppercase leading-tight">{config.headerLine2}</h3>
                  <h1 className="text-[15pt] font-black uppercase my-0.5 tracking-tight">{config.name}</h1>
                  <p className="text-[8pt] font-bold leading-tight">{config.address}</p>
                  <div className="flex justify-center items-center gap-3 text-[8pt] font-bold italic leading-tight">
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
               <table className="w-full border-collapse border-black border-[1.2pt] text-[7pt]">
                  <thead>
                    <tr className="bg-transparent">
                      <th className="border border-black p-1 w-[8mm] text-center align-middle" rowSpan={2}>NO</th>
                      <th className="border border-black p-1 text-center align-middle w-[45mm]" rowSpan={2}>NAMA LENGKAP / NIP</th>
                      <th className="border border-black p-1 text-center align-middle w-[30mm]" rowSpan={2}>JABATAN</th>
                      <th className="border border-black p-0.5 text-center uppercase tracking-tighter" colSpan={dateRange.length}>
                        TANGGAL ABSENSI (A: MASUK, B: PULANG)
                      </th>
                      <th className="border border-black p-0.5 text-center uppercase" colSpan={6}>REKAP</th>
                    </tr>
                    <tr className="bg-transparent">
                      {dateRange.map(d => (
                        <th 
                          key={d} 
                          className={`border border-black p-0 w-[5.5mm] text-[6.5pt] text-center ${isDayOff(d) ? 'bg-red-500 text-white font-bold' : ''}`}
                        >
                          {d}
                        </th>
                      ))}
                      <th className="border border-black p-0 w-[5mm] text-[6pt] text-center">S</th>
                      <th className="border border-black p-0 w-[5mm] text-[6pt] text-center">I</th>
                      <th className="border border-black p-0 w-[5mm] text-[6pt] text-center">A</th>
                      <th className="border border-black p-0 w-[5mm] text-[6pt] text-center">C</th>
                      <th className="border border-black p-0 w-[5mm] text-[6pt] text-center">DL</th>
                      <th className="border border-black p-0 w-[6.5mm] text-[6pt] text-center font-bold">JML</th>
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
          body * { visibility: hidden; }
          .attendance-paper-landscape, .attendance-paper-landscape * { visibility: visible !important; }
          .attendance-paper-landscape { 
            position: fixed !important; left: 0 !important; top: 0 !important; 
            width: 330mm !important; height: 215mm !important; 
            margin: 0 !important; transform: none !important; padding: 10mm !important;
          }
          @page { size: 330mm 215mm landscape; margin: 0; }
        }
      `}</style>
    </div>
  );
};

export default AttendanceCreator;
