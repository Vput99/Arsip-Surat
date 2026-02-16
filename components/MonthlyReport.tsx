
import React, { useState, useEffect, useRef } from 'react';
import { ClipboardCheck, Printer, Save, Loader2, Users, Building2, ZoomIn, ZoomOut, Plus, Trash2, UserCog, Home, Calendar, Activity, Info, PenTool, Hash, School, RefreshCw, Layers, GraduationCap, Box, FileSpreadsheet, UserMinus, UserCheck, ChevronRight, LayoutGrid, Sparkles } from 'lucide-react';
import { subscribeToConfig, saveMonthlyReport, subscribeToMonthlyReport, subscribeToStaff, StaffMember } from '../services/storage';
import { SchoolConfig, MonthlyReport as IMonthlyReport, StudentRow } from '../types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale/id';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const createEmptyArray = () => [0, 0, 0, 0, 0, 0];
const createEmptyRow = (): StudentRow => ({ l: createEmptyArray(), p: createEmptyArray() });

const FACILITY_LIST = [
  "Bangku Siswa", "Lemari", "Kursi", "Televisi", "Papan Tulis", "Rak Perpustakaan",
  "DVD Player", "Laptop", "Alat IPA", "Kerangka Jaring", "Alat IPS", "Atlas",
  "Globe", "Rak Buku", "Bola Voli", "Bola Sepak", "Bola Basket", "Tape Recorder",
  "Gitar", "Pianika", "Printer", "LCD Proyektor", "HDD Eksternal", "Genset"
];

const STAFF_ROWS = [
  "1. Kepala Sekolah", "2. Guru Kelas", "3. Guru Agama Islam", "4. Guru Agama Kristen",
  "5. Guru Penjaskes", "6. Tenaga Adm (TU)", "7. Penjaga Sekolah", "8. Satpam", "9. Operator"
];

const MonthlyReport: React.FC = () => {
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'siswa' | 'pegawai' | 'sarpras' | 'kondisi'>('siswa');
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [scale, setScale] = useState(0.5);
  
  const reportRef = useRef<HTMLDivElement>(null);

  const [reportData, setReportData] = useState<IMonthlyReport>({
    id: '', month, year,
    studentMatrix: {
      wniAsli: createEmptyRow(), wniTionghoa: createEmptyRow(), wniArab: createEmptyRow(), wniLain: createEmptyRow(),
      agamaIslam: createEmptyRow(), agamaKatolik: createEmptyRow(), agamaProtestan: createEmptyRow(), agamaHindu: createEmptyRow(), agamaBudha: createEmptyRow(), agamaLain: createEmptyRow()
    },
    staffData: STAFF_ROWS.reduce((acc, row) => ({
      ...acc, [row]: { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0, s1L: 0, s1P: 0, d3L: 0, d3P: 0 }
    }), {}),
    roomCondition: { baik: [7, 0], rusakRingan: [3, 0], rusakBerat: [0, 0] },
    rombelData: { jumlah: [6], miskin: [78] },
    ageData: { under7: [8], age7_12: [143], over12: [6] },
    effectiveDays: 25,
    absentData: { sakit: 7, ijin: 3, alfa: 2 },
    graduationData: { pesertaL: 12, pesertaP: 26, lulusL: 12, lulusP: 26 },
    facilities: FACILITY_LIST.map(name => ({ name, count: 0 })),
    mutasi: { awalL: createEmptyArray(), awalP: createEmptyArray(), masukL: createEmptyArray(), masukP: createEmptyArray(), keluarL: createEmptyArray(), keluarP: createEmptyArray() },
    createdAt: new Date().toISOString()
  });

  useEffect(() => {
    const unsubscribeConfig = subscribeToConfig(setConfig);
    const unsubscribeReport = subscribeToMonthlyReport(year, month, (data) => {
      if (data) setReportData(data);
    });
    return () => { unsubscribeConfig(); unsubscribeReport(); };
  }, [month, year]);

  const updateMatrix = (key: keyof IMonthlyReport['studentMatrix'], gender: 'l' | 'p', classIdx: number, val: string) => {
    const num = parseInt(val) || 0;
    setReportData(prev => {
      const newMatrix = { ...prev.studentMatrix };
      const newRow = { ...newMatrix[key] };
      const newList = [...newRow[gender]];
      newList[classIdx] = num;
      newRow[gender] = newList;
      newMatrix[key] = newRow;
      return { ...prev, studentMatrix: newMatrix };
    });
  };

  const updateStaffData = (job: string, field: keyof IMonthlyReport['staffData'][string], val: string) => {
    const num = parseInt(val) || 0;
    setReportData(prev => ({
      ...prev,
      staffData: { ...prev.staffData, [job]: { ...prev.staffData[job], [field]: num } }
    }));
  };

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      await saveMonthlyReport(reportData);
      alert('Laporan Bulanan Berhasil Disimpan.');
    } catch (e) { alert('Gagal menyimpan.'); }
    finally { setSaveLoading(false); }
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setLoading(true);
    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [330, 215] });
      const canvas = await html2canvas(reportRef.current, { 
        scale: 3, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1500
      });
      pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, 330, 215);
      pdf.save(`LAPORAN_BULANAN_${config?.name}_${month + 1}_${year}.pdf`);
    } catch (e) { alert('Gagal ekspor PDF.'); }
    finally { setLoading(false); }
  };

  const sumArr = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  
  const getSubTotalSiswa = (keys: string[]) => {
      let lTotal = Array(6).fill(0);
      let pTotal = Array(6).fill(0);
      let grandTotal = 0;

      keys.forEach(k => {
          const row = (reportData.studentMatrix as any)[k];
          if (row) {
              row.l.forEach((val: number, i: number) => lTotal[i] += val);
              row.p.forEach((val: number, i: number) => pTotal[i] += val);
              grandTotal += (sumArr(row.l) + sumArr(row.p));
          }
      });

      return { lTotal, pTotal, grandTotal };
  };

  const nationalityKeys = ['wniAsli', 'wniTionghoa', 'wniArab', 'wniLain'];
  const religionKeys = ['agamaIslam', 'agamaKatolik', 'agamaProtestan', 'agamaHindu', 'agamaBudha', 'agamaLain'];

  const nationalityStats = getSubTotalSiswa(nationalityKeys);
  const religionStats = getSubTotalSiswa(religionKeys);

  const getStaffTotals = () => {
      let pns = 0, non = 0, l = 0, p = 0;
      Object.values(reportData.staffData).forEach((d: any) => {
          pns += (d.pnsL + d.pnsP);
          non += (d.nonPnsL + d.nonPnsP);
          l += (d.pnsL + d.nonPnsL);
          p += (d.pnsP + d.nonPnsP);
      });
      return { pns, non, l, p, total: pns + non };
  };

  const staffStats = getStaffTotals();

  const TableSiswa = ({ keys, label, stats, colorHeader = "#FFF2CC" }: { keys: string[], label: string, stats: any, colorHeader?: string }) => (
    <div className="mb-4">
      <div style={{ backgroundColor: colorHeader }} className="border border-black text-center font-black text-[7.5pt] py-1 tracking-widest uppercase">{label}</div>
      <table className="w-full border-collapse border border-black text-[6pt] text-center table-fixed">
        <thead>
          <tr className="bg-[#F8F9FA] h-[25px] font-black">
            <th className="border border-black w-[32mm] text-[6.5pt]" rowSpan={2}>JENIS DATA</th>
            {[1,2,3,4,5,6].map(k => <th key={k} className="border border-black" colSpan={3}>Kelas {k}</th>)}
            <th className="border border-black bg-slate-100" colSpan={3}>JUMLAH TOTAL</th>
          </tr>
          <tr className="bg-[#F8F9FA] h-[18px] font-bold">
            {[...Array(7)].map((_, i) => <React.Fragment key={i}><th className="border border-black w-[5.5mm]">L</th><th className="border border-black w-[5.5mm]">P</th><th className="border border-black w-[8.5mm] bg-slate-50">Jml</th></React.Fragment>)}
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const row = (reportData.studentMatrix as any)[key];
            if (!row) return null;
            return (
              <tr key={key} className={`h-[18px] ${key.includes('Islam') ? "bg-indigo-50/10" : ""}`}>
                <td className="border border-black text-left px-2 uppercase font-bold truncate tracking-tight">{key.replace(/([A-Z])/g, ' $1')}</td>
                {[0,1,2,3,4,5].map(i => (<React.Fragment key={i}><td className="border border-black">{row.l[i] || ''}</td><td className="border border-black">{row.p[i] || ''}</td><td className="border border-black bg-slate-50 font-bold">{row.l[i] + row.p[i] || ''}</td></React.Fragment>))}
                <td className="border border-black font-black">{sumArr(row.l)}</td><td className="border border-black font-black">{sumArr(row.p)}</td><td className="border border-black bg-slate-100 font-black">{sumArr(row.l) + sumArr(row.p)}</td>
              </tr>
            );
          })}
          <tr className="bg-slate-200/50 font-black h-[20px] uppercase">
            <td className="border border-black text-right pr-2">JUMLAH {label.split('.')[1]}</td>
            {[0,1,2,3,4,5].map(i => (<React.Fragment key={i}><td className="border border-black">{stats.lTotal[i]}</td><td className="border border-black">{stats.pTotal[i]}</td><td className="border border-black bg-white/50">{stats.lTotal[i] + stats.pTotal[i]}</td></React.Fragment>))}
            <td className="border border-black">{sumArr(stats.lTotal)}</td><td className="border border-black">{sumArr(stats.pTotal)}</td><td className="border border-black bg-slate-300">{stats.grandTotal}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6 pb-20 animate-fade-in text-slate-900">
      {/* Premium Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white/90 backdrop-blur-xl p-5 rounded-[2.5rem] border border-slate-200 shadow-xl sticky top-4 z-[50] print:hidden gap-4 ring-1 ring-slate-100">
        <div className="flex items-center gap-5">
          <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-4 rounded-3xl text-white shadow-2xl shadow-indigo-200 flex items-center justify-center">
            <FileSpreadsheet size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
               Laporan Bulanan
               <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg border border-indigo-100">F-SEK</span>
            </h2>
            <div className="flex items-center gap-2 mt-1">
               <Sparkles size={12} className="text-amber-500 animate-pulse" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Presisi Cetak F4 Landscape • Smart Layout</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex bg-slate-100/80 p-1.5 rounded-2xl items-center border border-slate-200/50 backdrop-blur-sm">
             <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="bg-transparent text-[11px] font-black px-4 outline-none text-slate-600">
                {Array.from({length: 12}).map((_, i) => <option key={i} value={i}>{format(new Date(2022, i, 1), 'MMMM', {locale: id})}</option>)}
             </select>
             <div className="h-4 w-px bg-slate-200 mx-1"></div>
             <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="bg-transparent text-[11px] font-black w-20 text-center outline-none text-indigo-600" />
          </div>
          <button onClick={handleSave} disabled={saveLoading} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95 border-b-4 border-emerald-800">
            {saveLoading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Simpan
          </button>
          <button onClick={exportPDF} disabled={loading} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-slate-200 active:scale-95 border-b-4 border-slate-700">
            {loading ? <Loader2 size={16} className="animate-spin"/> : <Printer size={16}/>} Cetak PDF
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Modern Sidebar Editor */}
        <div className="w-full xl:w-[460px] shrink-0 space-y-4 print:hidden">
           <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden h-[850px] flex flex-col ring-1 ring-slate-100">
              <div className="flex bg-slate-50/50 p-2 border-b">
                 {(['siswa', 'pegawai', 'sarpras', 'kondisi'] as const).map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-4 text-[10px] font-black uppercase rounded-2xl transition-all flex items-center justify-center gap-2 ${activeTab === t ? 'bg-white text-indigo-600 shadow-xl border border-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}>
                       {t === 'siswa' && <Users size={14}/>}
                       {t === 'pegawai' && <UserCog size={14}/>}
                       {t === 'sarpras' && <Box size={14}/>}
                       {t === 'kondisi' && <LayoutGrid size={14}/>}
                       {t.replace('_', ' ')}
                    </button>
                 ))}
              </div>
              <div className="p-8 overflow-y-auto flex-1 custom-scrollbar space-y-10">
                 {activeTab === 'siswa' && (
                    <div className="space-y-8">
                       <p className="text-[11px] font-black uppercase text-indigo-600 border-b-2 border-indigo-100 pb-3 flex items-center gap-2 tracking-widest">
                          Banyaknya Peserta Didik
                       </p>
                       {(['wniAsli', 'wniTionghoa', 'wniArab', 'wniLain', 'agamaIslam', 'agamaKatolik', 'agamaProtestan', 'agamaHindu', 'agamaBudha'] as const).map(key => (
                          <div key={key} className="p-6 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 hover:border-indigo-200 transition-all hover:bg-white shadow-sm hover:shadow-md">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4 flex justify-between items-center">
                                {key.replace(/([A-Z])/g, ' $1')}
                                <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-lg text-[8px]">T: {sumArr((reportData.studentMatrix as any)[key].l) + sumArr((reportData.studentMatrix as any)[key].p)}</span>
                             </label>
                             <div className="grid grid-cols-6 gap-3">
                                {(reportData.studentMatrix as any)[key].l.map((v: number, i: number) => (
                                   <div key={`l-${i}`} className="space-y-1"><span className="text-[8px] font-black block text-center opacity-40">K{i+1}L</span><input type="number" value={v} onChange={(e) => updateMatrix(key as any, 'l', i, e.target.value)} className="w-full p-2.5 text-[11px] font-black border border-slate-200 rounded-xl text-center bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" /></div>
                                ))}
                                {(reportData.studentMatrix as any)[key].p.map((v: number, i: number) => (
                                   <div key={`p-${i}`} className="space-y-1"><span className="text-[8px] font-black block text-center text-rose-400 opacity-60">K{i+1}P</span><input type="number" value={v} onChange={(e) => updateMatrix(key as any, 'p', i, e.target.value)} className="w-full p-2.5 text-[11px] font-black border border-rose-100 rounded-xl text-center bg-rose-50/30 focus:ring-2 focus:ring-rose-500 outline-none transition-all" /></div>
                                ))}
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
                 {activeTab === 'pegawai' && (
                    <div className="space-y-8">
                       <p className="text-[11px] font-black uppercase text-indigo-600 border-b-2 border-indigo-100 pb-3 flex items-center gap-2 tracking-widest">
                          Status Kepegawaian & Pendidikan
                       </p>
                       {STAFF_ROWS.map(job => (
                          <div key={job} className="p-6 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 hover:border-indigo-200 transition-all hover:bg-white shadow-sm hover:shadow-md">
                             <label className="text-[10px] font-black text-slate-700 uppercase tracking-tight block mb-4 border-l-4 border-indigo-500 pl-3">{job}</label>
                             <div className="grid grid-cols-4 gap-3">
                                <div className="space-y-1"><span className="text-[8px] font-black block text-center opacity-40">PNS L</span><input type="number" value={reportData.staffData[job]?.pnsL || 0} onChange={(e) => updateStaffData(job, 'pnsL', e.target.value)} className="w-full p-2.5 text-[11px] font-black border rounded-xl text-center bg-white focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                                <div className="space-y-1"><span className="text-[8px] font-black block text-center opacity-40">PNS P</span><input type="number" value={reportData.staffData[job]?.pnsP || 0} onChange={(e) => updateStaffData(job, 'pnsP', e.target.value)} className="w-full p-2.5 text-[11px] font-black border rounded-xl text-center bg-white focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                                <div className="space-y-1"><span className="text-[8px] font-black block text-center opacity-40">NON L</span><input type="number" value={reportData.staffData[job]?.nonPnsL || 0} onChange={(e) => updateStaffData(job, 'nonPnsL', e.target.value)} className="w-full p-2.5 text-[11px] font-black border rounded-xl text-center bg-white focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                                <div className="space-y-1"><span className="text-[8px] font-black block text-center opacity-40">NON P</span><input type="number" value={reportData.staffData[job]?.nonPnsP || 0} onChange={(e) => updateStaffData(job, 'nonPnsP', e.target.value)} className="w-full p-2.5 text-[11px] font-black border rounded-xl text-center bg-white focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
                 {activeTab === 'sarpras' && (
                    <div className="space-y-8">
                       <p className="text-[11px] font-black uppercase text-indigo-600 border-b-2 border-indigo-100 pb-3 flex items-center gap-2 tracking-widest">
                          F. Sarana Pendidikan (Inventaris)
                       </p>
                       <div className="grid grid-cols-1 gap-3">
                          {reportData.facilities.map((f, i) => (
                             <div key={i} className="flex items-center gap-4 bg-slate-50/50 p-3 rounded-2xl border border-slate-100 hover:bg-white hover:border-indigo-100 transition-all group">
                                <span className="text-[10px] font-black w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">{i+1}</span>
                                <span className="flex-1 text-[11px] font-bold text-slate-700 truncate uppercase tracking-tight">{f.name}</span>
                                <input type="number" value={f.count} onChange={(e) => {
                                   const newFac = [...reportData.facilities];
                                   newFac[i].count = parseInt(e.target.value) || 0;
                                   setReportData({...reportData, facilities: newFac});
                                }} className="w-20 p-2 text-[11px] font-black border border-slate-200 rounded-xl text-center bg-white outline-none focus:ring-2 focus:ring-indigo-500" />
                             </div>
                          ))}
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>

        {/* Paper Preview Area (Presisi Landscape F4) */}
        <div className="flex-1 bg-slate-200/50 rounded-[4rem] p-10 overflow-auto flex flex-col items-center custom-scrollbar shadow-inner relative group ring-1 ring-slate-300/50">
           <div className="flex gap-4 print:hidden sticky top-0 z-40 mb-10 bg-white/90 backdrop-blur-md p-3 rounded-[2rem] border shadow-2xl ring-1 ring-slate-100">
             <button onClick={() => setScale(s => Math.max(0.3, s - 0.05))} className="p-3 bg-white rounded-2xl border hover:bg-slate-50 transition-colors shadow-sm"><ZoomOut size={20}/></button>
             <button onClick={() => setScale(0.5)} className="px-8 bg-white rounded-2xl border text-[11px] font-black uppercase tracking-widest shadow-sm">Fit Screen</button>
             <button onClick={() => setScale(s => Math.min(1.2, s + 0.1))} className="p-3 bg-white rounded-2xl border hover:bg-slate-50 transition-colors shadow-sm"><ZoomIn size={20}/></button>
           </div>

           <div ref={reportRef} className="bg-white p-[10mm] text-black font-sans origin-top overflow-hidden border border-slate-300 shadow-[0_40px_100px_rgba(0,0,0,0.15)]" style={{ width: '330mm', height: '215mm', transform: `scale(${scale})` }}>
              {/* Kop Identitas */}
              <div className="text-center font-bold text-[12pt] border-b-[2pt] border-black pb-1 mb-2 uppercase tracking-wide">LAPOR BULAN {format(new Date(year, month, 1), 'MMMM yyyy', { locale: id })}</div>
              <div className="grid grid-cols-[1.2fr_1.8fr_1fr_0.8fr] gap-4 text-[7pt] leading-tight mb-2 uppercase font-bold text-slate-800">
                 <div className="space-y-0.5">
                    <p className="flex justify-between"><span>NAMA LEMBAGA</span><span className="font-black">: {config?.name}</span></p>
                    <p className="flex justify-between"><span>NSS</span><span>: {config?.nss}</span></p>
                    <p className="flex justify-between"><span>NO. TELP/HP KS</span><span>: {config?.phone}</span></p>
                    <p className="flex justify-between"><span>KELURAHAN</span><span>: {config?.village}</span></p>
                 </div>
                 <div className="space-y-0.5">
                    <p className="flex justify-between"><span>ALAMAT SEKOLAH</span><span>: {config?.address}</span></p>
                    <p className="flex justify-between"><span>KECAMATAN</span><span>: {config?.district}</span></p>
                    <p className="flex justify-between"><span>KOTA / PROVINSI</span><span>: {config?.city} / {config?.province}</span></p>
                 </div>
                 <div className="space-y-0.5">
                    <p className="flex justify-between"><span>STATUS AKRE</span><span>: {config?.accreditation}</span></p>
                    <p className="flex justify-between"><span>TAHUN AKRE</span><span>: {config?.accreditationYear}</span></p>
                    <p className="flex justify-between"><span>GUGUS</span><span>: {config?.gugus}</span></p>
                    <p className="flex justify-between"><span>E-MAIL</span><span className="lowercase">: {config?.email}</span></p>
                 </div>
                 <div className="text-right flex flex-col justify-start">
                    <p className="font-black text-[10pt] tracking-tight">NPSN : {config?.npsn}</p>
                 </div>
              </div>

              <div className="flex gap-3">
                 {/* Kolom Kiri: Tabel Peserta & PTK */}
                 <div className="w-[195mm] shrink-0">
                    {/* Pemisahan Tabel Kewarganegaraan dan Agama */}
                    <TableSiswa keys={nationalityKeys} label="A. DATA KEWARGANEGARAAN" stats={nationalityStats} colorHeader="#E2F0D9" />
                    <TableSiswa keys={religionKeys} label="B. DATA AGAMA" stats={religionStats} colorHeader="#FFF2CC" />

                    <div className="grid grid-cols-[1.5fr_1fr] gap-4">
                       <table className="w-full border-collapse border border-black text-[6.5pt] text-center table-fixed">
                          <thead className="bg-[#DEEBF7] font-black h-[35px]">
                             <tr>
                                <th className="border border-black w-[35mm] text-[7pt]" rowSpan={2}>Jabatan di Sekolah</th>
                                <th className="border border-black" colSpan={2}>Status Pegawai</th><th className="border border-black" colSpan={4}>Status Pendidikan</th><th className="border border-black" colSpan={2}>Jumlah</th><th className="border border-black w-[10mm] bg-blue-100" rowSpan={2}>Total</th>
                             </tr>
                             <tr>
                                <th className="border border-black w-[6.5mm]">PNS</th><th className="border border-black w-[6.5mm]">Non</th>
                                <th className="border border-black w-[6.5mm]">&lt;S1</th><th className="border border-black w-[6.5mm]">S1</th><th className="border border-black w-[6.5mm]">S2</th><th className="border border-black w-[6.5mm]">Lain</th>
                                <th className="border border-black w-[7.5mm]">L</th><th className="border border-black w-[7.5mm]">P</th>
                             </tr>
                          </thead>
                          <tbody>
                             {STAFF_ROWS.map((job) => {
                                const d = reportData.staffData[job] || { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0, s1L: 0, s1P: 0, d3L: 0, d3P: 0 };
                                return (
                                <tr key={job} className="h-[20px]">
                                   <td className="border border-black text-left px-2 font-bold truncate leading-tight uppercase tracking-tighter text-[6pt]">{job}</td>
                                   <td className="border border-black">{d.pnsL + d.pnsP || ''}</td><td className="border border-black">{d.nonPnsL + d.nonPnsP || ''}</td>
                                   <td className="border border-black">{d.d3L + d.d3P || ''}</td><td className="border border-black">{d.s1L + d.s1P || ''}</td>
                                   <td className="border border-black"></td><td className="border border-black"></td>
                                   <td className="border border-black font-bold">{d.pnsL + d.nonPnsL || ''}</td><td className="border border-black font-bold">{d.pnsP + d.nonPnsP || ''}</td>
                                   <td className="border border-black bg-blue-50 font-black">{d.pnsL + d.pnsP + d.nonPnsL + d.nonPnsP || '0'}</td>
                                </tr>
                             )})}
                             <tr className="bg-blue-100 font-black h-[22px] uppercase">
                                <td className="border border-black text-right pr-2">JUMLAH PTK</td>
                                <td className="border border-black">{staffStats.pns}</td><td className="border border-black">{staffStats.non}</td>
                                <td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td>
                                <td className="border border-black">{staffStats.l}</td><td className="border border-black">{staffStats.p}</td>
                                <td className="border border-black bg-blue-300">{staffStats.total}</td>
                             </tr>
                          </tbody>
                       </table>
                       
                       <div className="space-y-4">
                          <div className="bg-[#FCE4D6] border border-black p-1 text-center font-black text-[7.5pt] uppercase tracking-widest">D. Hari Efektif dan Absensi</div>
                          <table className="w-full border-collapse border border-black text-[7pt] text-center table-fixed">
                             <tbody>
                                <tr className="h-7"><td className="border border-black text-left px-2 font-bold uppercase tracking-tighter text-[6.5pt]">Hari Efektif Belajar *)</td><td className="border border-black font-black w-[15mm] text-[9pt] bg-orange-50">{reportData.effectiveDays}</td><td className="border border-black w-12 font-bold">Hari</td></tr>
                                <tr className="h-7"><td className="border border-black text-left px-2">a. Sakit</td><td className="border border-black font-bold">{reportData.absentData.sakit}</td><td className="border border-black">Siswa</td></tr>
                                <tr className="h-7"><td className="border border-black text-left px-2">b. Ijin</td><td className="border border-black font-bold">{reportData.absentData.ijin}</td><td className="border border-black">Siswa</td></tr>
                                <tr className="h-7"><td className="border border-black text-left px-2">c. Alfa</td><td className="border border-black font-bold">{reportData.absentData.alfa}</td><td className="border border-black">Siswa</td></tr>
                                <tr className="bg-slate-900 text-white font-black h-7 uppercase tracking-widest"><td className="border border-black text-[6pt]">TOTAL ABSENSI</td><td className="border border-black" colSpan={2}>{reportData.absentData.sakit + reportData.absentData.ijin + reportData.absentData.alfa}</td></tr>
                             </tbody>
                          </table>
                          <div className="bg-[#D9EAD3] border border-black p-1 text-center font-black text-[7.5pt] uppercase tracking-widest">E. Data Kelulusan TA. 2021/2022</div>
                          <table className="w-full border-collapse border border-black text-[6pt] text-center table-fixed">
                             <thead><tr className="bg-emerald-50 h-6 font-black uppercase tracking-tight"><th className="border border-black" colSpan={3}>Calon Peserta</th><th className="border border-black" colSpan={3}>Lulusan</th></tr></thead>
                             <tbody>
                                <tr className="h-6 font-black"><td className="border border-black bg-white">12</td><td className="border border-black bg-white">26</td><td className="border border-black bg-emerald-100">38</td><td className="border border-black bg-white">12</td><td className="border border-black bg-white">26</td><td className="border border-black bg-emerald-100">38</td></tr>
                                <tr className="font-bold h-6 uppercase tracking-tighter bg-slate-50"><td className="border border-black text-[5.5pt]" colSpan={3}>Melanjutkan Ke SMP/MTs</td><td className="border border-black text-[5.5pt]" colSpan={3}>Tidak Melanjutkan</td></tr>
                                <tr className="h-6 font-black"><td className="border border-black bg-white">12</td><td className="border border-black bg-white">26</td><td className="border border-black bg-emerald-100">38</td><td className="border border-black bg-white">0</td><td className="border border-black bg-white">0</td><td className="border border-black bg-emerald-100">0</td></tr>
                             </tbody>
                          </table>
                       </div>
                    </div>
                 </div>

                 {/* Kolom Tengah: A, B, C */}
                 <div className="w-[60mm] shrink-0 space-y-4">
                    <div>
                       <div className="bg-[#D9EAD3] border border-black p-1 text-center font-black text-[7.5pt] uppercase tracking-widest">C. Kondisi Ruang Kelas</div>
                       <table className="w-full border-collapse border border-black text-[7pt] text-center table-fixed">
                          <thead className="bg-emerald-50 font-black h-7 uppercase">
                             <tr><th className="border border-black">Status</th><th className="border border-black">Baik</th><th className="border border-black">Ringan</th><th className="border border-black">Berat</th><th className="border border-black bg-emerald-100">Jml</th></tr>
                          </thead>
                          <tbody>
                             <tr className="h-7"><td className="border border-black text-left px-2 font-bold uppercase tracking-tighter">Hak Milik</td><td className="border border-black font-black bg-white">{reportData.roomCondition.baik[0]}</td><td className="border border-black bg-white">{reportData.roomCondition.rusakRingan[0]}</td><td className="border border-black bg-white">{reportData.roomCondition.rusakBerat[0]}</td><td className="border border-black font-black bg-emerald-50">10</td></tr>
                             <tr className="h-7"><td className="border border-black text-left px-2">Pinjam</td><td className="border border-black bg-white">0</td><td className="border border-black bg-white">0</td><td className="border border-black bg-white">0</td><td className="border border-black bg-emerald-50">0</td></tr>
                             <tr className="bg-slate-900 text-white font-black h-7 uppercase tracking-widest"><td className="border border-black">TOTAL</td><td className="border border-black">7</td><td className="border border-black">3</td><td className="border border-black">0</td><td className="border border-black">10</td></tr>
                          </tbody>
                       </table>
                    </div>
                    <div>
                       <div className="bg-[#FFF2CC] border border-black p-1 text-center font-black text-[7.5pt] uppercase tracking-widest">D. Rombel & Usia Siswa</div>
                       <table className="w-full border-collapse border border-black text-[6.5pt] text-center table-fixed">
                          <thead className="bg-yellow-50 font-black h-7 uppercase tracking-tight">
                             <tr><th className="border border-black">Rombel</th><th className="border border-black">Miskin</th><th className="border border-black" colSpan={2}>Data Usia Siswa</th></tr>
                          </thead>
                          <tbody>
                             <tr className="h-[22px]"><td className="border border-black font-black bg-white">1</td><td className="border border-black font-black bg-white">10</td><td className="border border-black text-left px-2 uppercase tracking-tighter">&lt; 7 Tahun</td><td className="border border-black font-black bg-yellow-50">8</td></tr>
                             <tr className="h-[22px]"><td className="border border-black font-black bg-white">1</td><td className="border border-black font-black bg-white">12</td><td className="border border-black text-left px-2 uppercase tracking-tighter">7-12 Tahun</td><td className="border border-black font-black bg-yellow-50">143</td></tr>
                             <tr className="h-[22px]"><td className="border border-black font-black bg-white">1</td><td className="border border-black font-black bg-white">16</td><td className="border border-black text-left px-2 uppercase tracking-tighter">&gt; 12 Tahun</td><td className="border border-black font-black bg-yellow-50">6</td></tr>
                             <tr className="bg-yellow-400 font-black h-[22px] uppercase tracking-widest">
                                <td className="border border-black">6</td><td className="border border-black">78</td><td className="border border-black text-left px-2">JUMLAH</td><td className="border border-black">157</td>
                             </tr>
                          </tbody>
                       </table>
                    </div>

                    {/* Signature Area with fixed small font size for name to prevent truncation */}
                    <div className="pt-8 text-center font-serif leading-tight">
                       <p className="text-[9pt] mb-14 font-bold">Kediri, {format(new Date(year, month + 1, 0), 'dd MMMM yyyy', { locale: id })}</p>
                       <div className="min-h-[1.5em] mb-1">
                          <p className="text-[8pt] font-black underline uppercase decoration-1 leading-tight break-words">{config?.principalName}</p>
                       </div>
                       <p className="text-[7.5pt] font-bold">NIP. {config?.principalNip}</p>
                    </div>
                 </div>

                 {/* Kolom Kanan: F (Sarana) */}
                 <div className="w-[60mm] shrink-0">
                    <div className="bg-[#D9EAD3] border border-black p-1 text-center font-black text-[7.5pt] uppercase tracking-widest">F. Sarana Pendidikan / Inventaris</div>
                    <table className="w-full border-collapse border border-black text-[6.5pt] leading-tight table-fixed">
                       <thead className="bg-[#DEEBF7] font-black text-center h-[25px] uppercase">
                          <tr><th className="border border-black w-[10mm]">No</th><th className="border border-black">Jenis Barang</th><th className="border border-black w-[15mm] bg-blue-100">Jml</th></tr>
                       </thead>
                       <tbody>
                          {reportData.facilities.map((f, i) => (
                             <tr key={i} className="h-[4.4mm]">
                                <td className="border border-black text-center font-bold bg-slate-50">{i+1}</td>
                                <td className="border border-black px-2 uppercase truncate tracking-tighter text-slate-700">{f.name}</td>
                                <td className="border border-black text-center font-black bg-blue-50/30">{f.count || ''}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
        </div>
      </div>
      
      <style>{`
        .report-paper { box-sizing: border-box; background-color: white; page-break-after: always; color: black; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        @media print {
          body * { visibility: hidden; }
          .report-paper, .report-paper * { visibility: visible !important; }
        }
      `}</style>
    </div>
  );
};

export default MonthlyReport;
