import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardCheck, Printer, Save, Loader2, Users, Building2, 
  ZoomIn, ZoomOut, Plus, Trash2, UserCog, Home, Calendar, 
  Activity, Info, PenTool, Hash, School, RefreshCw, Layers, 
  GraduationCap, Box, FileSpreadsheet, UserMinus, UserCheck, 
  ChevronRight, LayoutGrid, Sparkles, ArrowLeftRight, History, 
  Phone, MapPin, Mail as MailIcon, ClipboardList, BookOpen, 
  FileText, Search, Download, ChevronLeft, X, TrendingUp
} from 'lucide-react';
import { subscribeToConfig, saveMonthlyReport, subscribeToMonthlyReport, subscribeToStaff, StaffMember } from '../services/storage';
import { SchoolConfig, MonthlyReport as IMonthlyReport, StudentRow } from '../types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale/id';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { exportMonthlyReportToDocx } from '../services/docxExport';

const createEmptyArray = () => [0, 0, 0, 0, 0, 0];
const createEmptyRow = (): StudentRow => ({ l: createEmptyArray(), p: createEmptyArray() });

const sumArr = (arr: number[]) => arr.reduce((a, b) => a + (b || 0), 0);
const sumMatrix = (matrix: Record<string, StudentRow>, gender: 'l' | 'p', colIndex: number) => {
  return Object.values(matrix).reduce((acc, row) => acc + (row[gender][colIndex] || 0), 0);
};
const totalAll = (matrix: Record<string, StudentRow>, gender: 'l' | 'p') => {
  return Object.values(matrix).reduce((acc, row) => acc + sumArr(row[gender]), 0);
};

const MonthlyReport: React.FC = () => {
  const [reportData, setReportData] = useState<IMonthlyReport | null>(null);
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState('siswa');
  const [scale, setScale] = useState(0.55);
  const [previewPage, setPreviewPage] = useState(1);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [history, setHistory] = useState<IMonthlyReport[]>([]);
  const [page, setPage] = useState(0);
  
  const reportRef = useRef<HTMLDivElement>(null);
  const ptkRef = useRef<HTMLDivElement>(null);

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  useEffect(() => {
    const unsubConfig = subscribeToConfig(setConfig);
    const unsubStaff = subscribeToStaff(setStaff);
    // Note: In a real app we'd subscribe to all reports for history, but here we just use the current one
    return () => { unsubConfig(); unsubStaff(); };
  }, []);

  useEffect(() => {
    const unsubReport = subscribeToMonthlyReport(month, year, (data) => {
      if (data) {
        setReportData(data);
      } else {
        setReportData({
          id: `${year}-${month}`,
          month, year,
          studentMatrix: {
            wniAsli: createEmptyRow(),
            wniTionghoa: createEmptyRow(),
            wniArab: createEmptyRow(),
            wniLain: createEmptyRow()
          },
          staffData: {
            'Kepala Sekolah': { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0 },
            'Guru Kelas': { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0 },
            'Guru Agama': { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0 },
            'Guru PJOK': { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0 },
            'Tenaga Kependidikan': { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0 }
          },
          facilities: [
             { name: 'Meja Siswa', count: 0 },
             { name: 'Kursi Siswa', count: 0 },
             { name: 'Meja Guru', count: 0 },
             { name: 'Kursi Guru', count: 0 },
             { name: 'Papan Tulis', count: 0 },
             { name: 'Almari', count: 0 }
          ],
          roomCondition: {
            baik: [0], rusakRingan: [0], rusakBerat: [0]
          },
          rombelData: {
            jumlah: [0], miskin: [0]
          },
          absentData: { sakit: 0, ijin: 0, alfa: 0 },
          effectiveDays: 0,
          graduationData: { pesertaL: 0, pesertaP: 0, lulusL: 0, lulusP: 0 },
          mutasi: {
            masukL: createEmptyArray(),
            masukP: createEmptyArray(),
            keluarL: createEmptyArray(),
            keluarP: createEmptyArray()
          },
          kasekName: config?.principalName || '',
          kasekNip: config?.principalNip || '',
          pengawasName: '',
          pengawasNip: '',
          timestamp: Date.now()
        });
      }
    });
    return () => unsubReport();
  }, [month, year, config]);

  const saveCurrentReport = async () => {
    if (!reportData) return;
    setSaveLoading(true);
    try {
      await saveMonthlyReport({ ...reportData, timestamp: Date.now() });
    } finally {
      setSaveLoading(false);
    }
  };

  const exportPDF = async () => {
    setLoading(true);
    try {
      const element = previewPage === 1 ? reportRef.current : ptkRef.current;
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', [330, 215]);
      pdf.addImage(imgData, 'PNG', 0, 0, 330, 215);
      pdf.save(`LAPORAN_BULANAN_${config?.name || 'SEKOLAH'}_${month + 1}_${year}.pdf`);
    } finally {
      setLoading(false);
    }
  };

  const exportToWord = () => {
     if (reportData && config) {
        exportMonthlyReportToDocx(reportData, config);
     }
  };

  const updateReportData = (section: string, value: any) => {
    if (!reportData) return;
    setReportData({ ...reportData, [section]: value });
  };

  if (!reportData || !config) return <div className="p-20 text-center glass-panel m-10 rounded-[3rem]"><Loader2 className="animate-spin inline-block mr-3 text-premium-600" /> <span className="font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Data Laporan...</span></div>;

  const ptkStaff = staff.sort((a, b) => (a.category === 'reg' ? -1 : 1));
  const filteredHistory = history.filter(r => r.kasekName.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalPages = Math.ceil(filteredHistory.length / 5);
  const paginatedHistory = filteredHistory.slice(page * 5, (page + 1) * 5);

  return (
    <div className="space-y-10 animate-fade-in pb-20 relative z-10">
      {/* Header Laporan - Glass Style */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 glass-card p-8 rounded-[3rem] border border-white/40 shadow-xl">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 glass-panel rounded-[1.5rem] flex items-center justify-center text-premium-600 shadow-inner border border-premium-100/50">
             <FileText size={32} />
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">Laporan Bulanan</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1.5 opacity-70">Sistem Pelaporan Bulanan SD Terpadu • Realtime Sync</p>
          </div>
        </div>
        <div className="flex gap-4">
           {showSearch ? (
              <div className="relative group animate-fade-in w-72">
                 <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-within:text-premium-500" />
                 <input autoFocus type="text" placeholder="Cari laporan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onBlur={() => !searchTerm && setShowSearch(false)} className="w-full pl-14 pr-6 py-4 glass-input border-white/20 rounded-2xl outline-none text-sm font-bold shadow-inner focus:bg-white/80" />
              </div>
           ) : (
              <button onClick={() => setShowSearch(true)} className="p-4 glass-panel text-slate-500 hover:text-premium-600 rounded-2xl transition-all border border-white/20 shadow-md">
                 <Search size={24} />
              </button>
           )}
           <button onClick={exportToWord} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.25rem] flex items-center gap-3 shadow-[0_15px_35px_-5px_rgba(79,70,229,0.4)] hover:bg-indigo-700 transition-all active:scale-95 ring-1 ring-white/20">
              <Download size={20} /> CETAK WORD
           </button>
           <button onClick={saveCurrentReport} disabled={saveLoading} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.25rem] flex items-center gap-3 shadow-[0_15px_35px_-5px_rgba(16,185,129,0.4)] hover:bg-emerald-700 transition-all active:scale-95 ring-1 ring-white/20">
              {saveLoading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} SIMPAN PROGRES
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Kolom Kiri: Navigasi Laporan - Glass Sidebar */}
        <div className="lg:col-span-3 space-y-8">
           <div className="glass-card p-8 rounded-[3rem] border border-white/40 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-premium-400 to-indigo-500"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                 <Calendar className="text-premium-400" size={14} /> Periode Laporan
              </p>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Bulan</label>
                    <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="w-full px-4 py-3 glass-input border-white/10 rounded-xl font-bold text-xs outline-none">
                       {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Tahun</label>
                    <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-full px-4 py-3 glass-input border-white/10 rounded-xl font-bold text-xs outline-none">
                       {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                 </div>
              </div>
           </div>

           <div className="glass-card p-6 rounded-[3rem] border border-white/40 shadow-lg flex-1 min-h-[400px] flex flex-col">
              <p className="px-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                 <History className="text-premium-400" size={14} /> Riwayat Arsip
              </p>
              <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                 {paginatedHistory.map((report) => (
                    <button key={report.id} className="w-full p-5 rounded-2xl glass-panel text-left hover:bg-premium-600 hover:text-white transition-all group border border-white/10 hover:border-premium-300">
                       <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-white/70 block mb-1">{months[report.month]} {report.year}</span>
                       <p className="text-xs font-bold text-slate-600 group-hover:text-white uppercase line-clamp-1">{report.kasekName}</p>
                    </button>
                 ))}
                 {paginatedHistory.length === 0 && (
                    <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                       <History size={32} className="text-slate-300" />
                       <p className="text-[10px] font-black uppercase tracking-widest">Belum Ada Riwayat Laporan</p>
                    </div>
                 )}
              </div>
              
              <div className="pt-6 mt-4 border-t border-white/10 flex justify-center gap-3">
                 <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-3 glass-panel rounded-xl text-slate-400 hover:text-premium-600 disabled:opacity-30"><ChevronLeft size={18}/></button>
                 <span className="text-[10px] font-black text-slate-400 self-center uppercase tracking-widest">{page + 1} / {totalPages || 1}</span>
                 <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-3 glass-panel rounded-xl text-slate-400 hover:text-premium-600 disabled:opacity-30"><ChevronRight size={18}/></button>
              </div>
           </div>
        </div>

        {/* Kolom Tengah: Editor Utama - Glass Panels */}
        <div className="lg:col-span-9 space-y-10">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* KETENAGAAN */}
              <div className="glass-card p-10 rounded-[3.5rem] border border-white/40 shadow-lg space-y-8">
                 <div className="flex items-center gap-5 border-b border-white/10 pb-6 mb-2">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-inner"><Users size={22}/></div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Ketenagaan (PTK)</h3>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    {Object.entries(reportData.staffData).slice(0, 4).map(([job, data], sIdx) => (
                      <label key={sIdx} className="block">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block px-1 truncate">{job}</span>
                         <div className="flex gap-2">
                            <input type="number" value={data.pnsL + data.pnsP + data.nonPnsL + data.nonPnsP} readOnly className="w-full px-5 py-4 glass-input border-white/10 rounded-2xl font-black text-emerald-700 bg-white/50 text-center" />
                         </div>
                      </label>
                    ))}
                 </div>
                 <p className="text-[9px] text-slate-400 font-bold uppercase text-center italic tracking-widest">Dihitung otomatis dari data personil aktif</p>
              </div>

              {/* DATA SISWA */}
              <div className="glass-card p-10 rounded-[3.5rem] border border-white/40 shadow-lg space-y-8">
                 <div className="flex items-center gap-5 border-b border-white/10 pb-6 mb-2">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shadow-inner"><TrendingUp size={22}/></div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Pergerakan Siswa</h3>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <label className="block">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block px-1">Siswa Masuk (+)</span>
                       <input type="number" value={sumArr(reportData.mutasi.masukL) + sumArr(reportData.mutasi.masukP)} readOnly className="w-full px-5 py-4 glass-input border-white/10 rounded-2xl font-black text-emerald-600 bg-white/50 text-center" />
                    </label>
                    <label className="block">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block px-1">Siswa Keluar (-)</span>
                       <input type="number" value={sumArr(reportData.mutasi.keluarL) + sumArr(reportData.mutasi.keluarP)} readOnly className="w-full px-5 py-4 glass-input border-white/10 rounded-2xl font-black text-rose-500 bg-white/50 text-center" />
                    </label>
                    <label className="block col-span-2">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block px-1 text-center">Total Siswa Akhir</span>
                       <input type="number" value={totalAll(reportData.studentMatrix, 'l') + totalAll(reportData.studentMatrix, 'p')} readOnly className="w-full px-5 py-6 glass-card border-premium-100 rounded-[2rem] font-black text-2xl text-premium-700 text-center shadow-inner" />
                    </label>
                 </div>
              </div>
           </div>

           {/* PENGESAHAN */}
           <div className="glass-card p-12 rounded-[4rem] border border-white/40 shadow-xl space-y-10 relative overflow-hidden">
              <div className="absolute top-[-5rem] right-[-5rem] w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px]"></div>
              <div className="flex items-center gap-6 border-b border-white/10 pb-8 relative z-10">
                 <div className="p-4 bg-indigo-50 text-indigo-600 rounded-[1.5rem] shadow-inner"><School size={28}/></div>
                 <div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Pejabat Pengesahan</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1.5 opacity-70">Pengaturan Identitas Laporan</p>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                 <div className="space-y-6">
                    <label className="block group">
                       <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 block px-1 group-hover:text-premium-500 transition-colors">Nama Kepala Sekolah</span>
                       <input type="text" value={reportData.kasekName} onChange={(e) => updateReportData('kasekName', e.target.value)} className="w-full px-8 py-5 glass-input border-white/20 rounded-[1.75rem] font-black text-slate-800 focus:bg-white/90 focus:ring-4 focus:ring-premium-100/50 outline-none transition-all uppercase shadow-inner" placeholder="PIMPINAN SEKOLAH" />
                    </label>
                    <label className="block group">
                       <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 block px-1 group-hover:text-premium-500 transition-colors">NIP Kepala Sekolah</span>
                       <input type="text" value={reportData.kasekNip} onChange={(e) => updateReportData('kasekNip', e.target.value)} className="w-full px-8 py-5 glass-input border-white/20 rounded-[1.75rem] font-bold text-slate-700 focus:bg-white/90 outline-none transition-all shadow-inner" placeholder="NIP. 1928..." />
                    </label>
                 </div>
                 <div className="space-y-6">
                    <label className="block group">
                       <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 block px-1 group-hover:text-amber-500 transition-colors">Nama Pengawas</span>
                       <input type="text" value={reportData.pengawasName} onChange={(e) => updateReportData('pengawasName', e.target.value)} className="w-full px-8 py-5 glass-input border-white/20 rounded-[1.75rem] font-black text-slate-800 focus:bg-white/90 outline-none transition-all uppercase shadow-inner" placeholder="PENGAWAS SEKOLAH" />
                    </label>
                    <label className="block group">
                       <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 block px-1 group-hover:text-amber-500 transition-colors">NIP Pengawas</span>
                       <input type="text" value={reportData.pengawasNip} onChange={(e) => updateReportData('pengawasNip', e.target.value)} className="w-full px-8 py-5 glass-input border-white/20 rounded-[1.75rem] font-bold text-slate-700 focus:bg-white/90 outline-none transition-all shadow-inner" placeholder="NIP. 1970..." />
                    </label>
                 </div>
              </div>
           </div>

           {/* PREVIEW CONTAINER */}
           <div className="glass-panel rounded-[4rem] p-10 flex flex-col items-center border border-white/20 shadow-inner relative group min-h-[600px]">
              <div className="flex gap-4 mb-10 glass-panel p-2.5 rounded-[2rem] shadow-lg border border-white/40 sticky top-4 z-20">
                 <button onClick={() => setPreviewPage(1)} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${previewPage === 1 ? 'bg-premium-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/50'}`}>Halaman 1</button>
                 <button onClick={() => setPreviewPage(2)} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${previewPage === 2 ? 'bg-premium-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/50'}`}>Halaman 2</button>
                 <div className="w-px bg-slate-200/50 mx-2" />
                 <button onClick={() => setScale(s => Math.max(0.3, s - 0.05))} className="p-3 hover:bg-white/50 rounded-xl transition-all text-slate-500"><ZoomOut size={18}/></button>
                 <span className="flex items-center text-[11px] font-black text-slate-500 w-16 justify-center bg-white/40 rounded-xl">{Math.round(scale * 100)}%</span>
                 <button onClick={() => setScale(s => Math.min(1.5, s + 0.05))} className="p-3 hover:bg-white/50 rounded-xl transition-all text-slate-500"><ZoomIn size={18}/></button>
              </div>

              <div className="w-full flex justify-center pb-20">
                 {previewPage === 1 && reportRef.current && <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] mb-4">Rendering Preview F4...</div>}
                 <div className="print:block" style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
                    {/* Simplified Preview Placeholder for context - actual renders via Ref in PDF/Docx services */}
                    <div ref={reportRef} className="bg-white p-20 shadow-2xl border border-slate-200" style={{ width: '330mm', height: '215mm' }}>
                       {/* This is the PDF render target */}
                       <div className="h-full border-[3pt] border-double border-black p-10 flex flex-col">
                          <h1 className="text-[24pt] font-black text-center uppercase mb-10">Laporan Bulanan Sekolah</h1>
                          <div className="flex-1 grid grid-cols-2 gap-20">
                             <div className="space-y-10">
                                <h3 className="text-[16pt] font-bold border-b-2 border-black pb-2">I. DATA PESERTA DIDIK</h3>
                                <table className="w-full border-collapse border border-black text-[12pt]">
                                   <thead><tr className="bg-slate-100">
                                      <th className="border border-black p-2">KATEGORI</th>
                                      <th className="border border-black p-2">L</th>
                                      <th className="border border-black p-2">P</th>
                                      <th className="border border-black p-2">TOTAL</th>
                                   </tr></thead>
                                   <tbody>
                                      {Object.entries(reportData.studentMatrix).map(([k, v]) => (
                                         <tr key={k}>
                                            <td className="border border-black p-2 font-bold uppercase">{k.replace('wni', 'WNI ')}</td>
                                            <td className="border border-black p-2 text-center">{sumArr(v.l)}</td>
                                            <td className="border border-black p-2 text-center">{sumArr(v.p)}</td>
                                            <td className="border border-black p-2 text-center font-bold">{sumArr(v.l) + sumArr(v.p)}</td>
                                         </tr>
                                      ))}
                                   </tbody>
                                </table>
                             </div>
                             <div className="space-y-10">
                                <h3 className="text-[16pt] font-bold border-b-2 border-black pb-2">II. PENGESAHAN</h3>
                                <div className="mt-20 text-right space-y-24">
                                   <p className="text-[14pt]">Kediri, {months[month]} {year}</p>
                                   <div className="space-y-2">
                                      <p className="text-[14pt] font-black underline uppercase">{reportData.kasekName}</p>
                                      <p className="text-[12pt] font-bold">NIP. {reportData.kasekNip}</p>
                                   </div>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyReport;
