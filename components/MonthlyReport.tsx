
import React, { useState, useEffect, useRef } from 'react';
import { ClipboardCheck, Printer, Save, Loader2, Users, Building2, ZoomIn, ZoomOut, Plus, Trash2, UserCog, Home, Calendar, Activity, Info, PenTool, Hash, School } from 'lucide-react';
import { subscribeToConfig, subscribeToStaff, saveMonthlyReport, subscribeToMonthlyReport, StaffMember, subscribeToAttendance, saveStaff, saveSchoolConfig } from '../services/storage';
import { SchoolConfig, MonthlyReport as IMonthlyReport, StudentRow } from '../types';
import { format, getDaysInMonth } from 'date-fns';
import { id } from 'date-fns/locale/id';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const createEmptyRow = (): StudentRow => ({ l: [0, 0, 0, 0, 0, 0], p: [0, 0, 0, 0, 0, 0] });

const MonthlyReport: React.FC = () => {
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'siswa' | 'pegawai' | 'sarpras' | 'umum' | 'lembaga'>('siswa');
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [scale, setScale] = useState(0.55);
  
  const reportRef = useRef<HTMLDivElement>(null);
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);

  const [reportData, setReportData] = useState<IMonthlyReport>({
    id: '', month, year,
    studentMatrix: {
      wniAsli: createEmptyRow(), wniTionghoa: createEmptyRow(), wniArab: createEmptyRow(), wniLain: createEmptyRow(),
      agamaIslam: createEmptyRow(), agamaKatolik: createEmptyRow(), agamaProtestan: createEmptyRow(), agamaHindu: createEmptyRow(), agamaBudha: createEmptyRow()
    },
    classCondition: { baik: 0, rusakRingan: 0, rusakBerat: 0 },
    studentAge: { under7: 0, age7_12: 0, over12: 0 },
    staffData: {
      '1. Kepala Sekolah': { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0 },
      '2. Guru Kelas': { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0 },
      '3. Guru Agama Islam': { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0 },
      '4. Guru Agama Kristen': { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0 },
      '5. Guru Penjasorkes': { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0 },
      '6. TU / Operator': { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0 },
      '7. Penjaga': { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0 },
      '8. Satpam': { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0 }
    },
    effectiveDays: 25, absentSakit: 0, absentIjin: 0, absentAlfa: 0,
    graduates: { l: 0, p: 0 },
    facilities: [
      { name: 'Bangku Siswa', count: 121 }, { name: 'Lemari', count: 11 }, { name: 'Kursi', count: 280 }, { name: 'Televisi', count: 3 }, { name: 'Papan Tulis', count: 9 }, { name: 'Rak Perpustakaan', count: 3 }
    ],
    infrastructureNote: '',
    summaryNarrative: '',
    createdAt: new Date().toISOString()
  });

  useEffect(() => {
    const unsubscribeConfig = subscribeToConfig(setConfig);
    const unsubscribeStaff = subscribeToStaff(setAllStaff);
    const unsubscribeReport = subscribeToMonthlyReport(year, month, (data) => {
      if (data) setReportData(data);
    });
    return () => { unsubscribeConfig(); unsubscribeStaff(); unsubscribeReport(); };
  }, [month, year]);

  if (!config) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-6">
        <div className="relative">
           <Activity className="animate-spin text-indigo-600 w-16 h-16 opacity-20"/> 
           <Activity className="absolute inset-0 animate-pulse text-indigo-600 w-16 h-16"/> 
        </div>
        <span className="font-black text-slate-400 uppercase tracking-[0.3em] text-xs">Menghubungkan Server Realtime...</span>
      </div>
    );
  }

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

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (config) setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      await saveMonthlyReport(reportData);
      if (config) await saveSchoolConfig(config);
      alert('Laporan Bulanan Berhasil Disimpan.');
    } catch (err) { alert('Gagal menyimpan.'); }
    finally { setSaveLoading(false); }
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [330, 215] });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 330, 215);
      pdf.save(`LaporBulan_${year}_${month + 1}.pdf`);
    } catch (err) { alert('Ekspor gagal.'); }
    finally { setLoading(false); }
  };

  const calculateTotalSiswa = (gender: 'l' | 'p', classIdx: number) => {
    const keys: (keyof IMonthlyReport['studentMatrix'])[] = ['wniAsli', 'wniTionghoa', 'wniArab', 'wniLain'];
    return keys.reduce((acc, key) => acc + reportData.studentMatrix[key][gender][classIdx], 0);
  };

  const calculateTotalAgama = (gender: 'l' | 'p', classIdx: number) => {
    const keys: (keyof IMonthlyReport['studentMatrix'])[] = ['agamaIslam', 'agamaKatolik', 'agamaProtestan', 'agamaHindu', 'agamaBudha'];
    return keys.reduce((acc, key) => acc + reportData.studentMatrix[key][gender][classIdx], 0);
  };

  const getRowSum = (key: keyof IMonthlyReport['studentMatrix'], idx: number) => reportData.studentMatrix[key].l[idx] + reportData.studentMatrix[key].p[idx];
  const getTotalL = (key: keyof IMonthlyReport['studentMatrix']) => reportData.studentMatrix[key].l.reduce((a,b)=>a+b, 0);
  const getTotalP = (key: keyof IMonthlyReport['studentMatrix']) => reportData.studentMatrix[key].p.reduce((a,b)=>a+b, 0);
  const getTotalAll = (key: keyof IMonthlyReport['studentMatrix']) => getTotalL(key) + getTotalP(key);

  const inputClass = "w-full p-2 text-[11px] font-bold border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white";
  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1";
  const matrixKeys = Object.keys(reportData.studentMatrix) as Array<keyof IMonthlyReport['studentMatrix']>;

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-5 rounded-3xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg"><ClipboardCheck size={24} /></div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Format Laporan Bulanan (F-SEK)</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Operator Sekolah Dasar - Sinkronisasi Realtime</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saveLoading} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center gap-2 transition-all hover:bg-emerald-700 active:scale-95">
            {saveLoading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Simpan Data
          </button>
          <button onClick={exportPDF} disabled={loading} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center gap-2 transition-all hover:bg-indigo-700 active:scale-95">
            {loading ? <Loader2 size={16} className="animate-spin"/> : <Printer size={16}/>} Cetak Dokumen
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        <div className="w-full xl:w-[420px] shrink-0 space-y-4 print:hidden">
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden h-[750px] flex flex-col">
             <div className="flex bg-slate-50 p-1 border-b overflow-x-auto">
               {(['lembaga', 'siswa', 'pegawai', 'sarpras', 'umum'] as const).map(t => (
                 <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 min-w-[80px] py-3 text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                   {t}
                 </button>
               ))}
             </div>
             <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                {activeTab === 'lembaga' && (
                  <div className="space-y-4">
                     <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                        <p className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-2"><School size={14}/> Header Laporan Bulanan</p>
                        <div className="space-y-4">
                           <div><label className={labelClass}>Nama Lembaga</label><input name="name" value={config.name} onChange={handleConfigChange} className={inputClass} /></div>
                           <div className="grid grid-cols-2 gap-3">
                              <div><label className={labelClass}>NSS</label><input name="nss" value={config.nss} onChange={handleConfigChange} className={inputClass} /></div>
                              <div><label className={labelClass}>NPSN</label><input name="npsn" value={config.npsn} onChange={handleConfigChange} className={inputClass} /></div>
                           </div>
                           <div className="grid grid-cols-2 gap-3">
                              <div><label className={labelClass}>Telp/HP KS</label><input name="phone" value={config.phone} onChange={handleConfigChange} className={inputClass} /></div>
                              <div><label className={labelClass}>Email Sekolah</label><input name="email" value={config.email} onChange={handleConfigChange} className={inputClass} /></div>
                           </div>
                           <div><label className={labelClass}>Kelurahan</label><input name="village" value={config.village} onChange={handleConfigChange} className={inputClass} /></div>
                           <div className="grid grid-cols-3 gap-3">
                              <div><label className={labelClass}>Status Akre</label><input name="accreditation" value={config.accreditation} onChange={handleConfigChange} className={inputClass} /></div>
                              <div><label className={labelClass}>Th Akre</label><input name="accreditationYear" value={config.accreditationYear} onChange={handleConfigChange} className={inputClass} /></div>
                              <div><label className={labelClass}>Gugus</label><input name="gugus" value={config.gugus} onChange={handleConfigChange} className={inputClass} /></div>
                           </div>
                        </div>
                     </div>
                  </div>
                )}
                {activeTab === 'siswa' && (
                   <div className="space-y-6">
                      {matrixKeys.map(key => (
                         <div key={key} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <label className="text-[9px] font-black text-slate-500 uppercase block mb-3">{key.replace(/([A-Z])/g, ' $1')}</label>
                            <div className="grid grid-cols-6 gap-2">
                               {reportData.studentMatrix[key].l.map((val, i) => (
                                  <div key={`l-${i}`}>
                                     <span className="text-[7px] font-bold block text-center">K{i+1}L</span>
                                     <input type="number" value={val} onChange={(e) => updateMatrix(key, 'l', i, e.target.value)} className="w-full p-1 text-[10px] border rounded-md text-center" />
                                  </div>
                               ))}
                               {reportData.studentMatrix[key].p.map((val, i) => (
                                  <div key={`p-${i}`}>
                                     <span className="text-[7px] font-bold block text-center text-rose-500">K{i+1}P</span>
                                     <input type="number" value={val} onChange={(e) => updateMatrix(key, 'p', i, e.target.value)} className="w-full p-1 text-[10px] border rounded-md text-center bg-rose-50/30" />
                                  </div>
                               ))}
                            </div>
                         </div>
                      ))}
                   </div>
                )}
                {activeTab === 'pegawai' && (
                  <div className="space-y-4">
                    {(Object.entries(reportData.staffData) as [string, { pnsL: number, pnsP: number, nonPnsL: number, nonPnsP: number }][]).map(([job, d]) => (
                      <div key={job} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                         <p className="text-[9px] font-black uppercase text-indigo-600">{job}</p>
                         <div className="grid grid-cols-2 gap-3">
                            <div>
                               <label className="text-[8px] font-bold text-slate-400 block uppercase">PNS L/P</label>
                               <div className="flex gap-1">
                                  <input type="number" value={d.pnsL} onChange={e => setReportData({...reportData, staffData: {...reportData.staffData, [job]: {...d, pnsL: parseInt(e.target.value)||0}}})} className="w-full p-1.5 text-xs border rounded text-center" />
                                  <input type="number" value={d.pnsP} onChange={e => setReportData({...reportData, staffData: {...reportData.staffData, [job]: {...d, pnsP: parseInt(e.target.value)||0}}})} className="w-full p-1.5 text-xs border rounded text-center bg-rose-50" />
                               </div>
                            </div>
                            <div>
                               <label className="text-[8px] font-bold text-slate-400 block uppercase">Non-PNS L/P</label>
                               <div className="flex gap-1">
                                  <input type="number" value={d.nonPnsL} onChange={e => setReportData({...reportData, staffData: {...reportData.staffData, [job]: {...d, nonPnsL: parseInt(e.target.value)||0}}})} className="w-full p-1.5 text-xs border rounded text-center" />
                                  <input type="number" value={d.nonPnsP} onChange={e => setReportData({...reportData, staffData: {...reportData.staffData, [job]: {...d, nonPnsP: parseInt(e.target.value)||0}}})} className="w-full p-1.5 text-xs border rounded text-center bg-rose-50" />
                               </div>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'sarpras' && (
                  <div className="space-y-4">
                     <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                        <p className="text-[10px] font-black uppercase">Kondisi Ruang Kelas</p>
                        <div className="grid grid-cols-3 gap-2">
                           <input placeholder="Baik" type="number" value={reportData.classCondition.baik} onChange={e => setReportData({...reportData, classCondition: {...reportData.classCondition, baik: parseInt(e.target.value)||0}})} className={inputClass} />
                           <input placeholder="R. Ringan" type="number" value={reportData.classCondition.rusakRingan} onChange={e => setReportData({...reportData, classCondition: {...reportData.classCondition, rusakRingan: parseInt(e.target.value)||0}})} className={inputClass} />
                           <input placeholder="R. Berat" type="number" value={reportData.classCondition.rusakBerat} onChange={e => setReportData({...reportData, classCondition: {...reportData.classCondition, rusakBerat: parseInt(e.target.value)||0}})} className={inputClass} />
                        </div>
                     </div>
                     <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                        <div className="flex justify-between">
                           <p className="text-[10px] font-black uppercase">Fasilitas Pendidikan</p>
                           <button onClick={() => setReportData({...reportData, facilities: [...reportData.facilities, {name: '', count: 0}]})} className="text-indigo-600"><Plus size={14}/></button>
                        </div>
                        {reportData.facilities.map((f, i) => (
                           <div key={i} className="flex gap-2 group">
                              <input value={f.name} onChange={e => {
                                 const newList = [...reportData.facilities]; newList[i].name = e.target.value;
                                 setReportData({...reportData, facilities: newList});
                              }} className="flex-1 p-1.5 text-[10px] border rounded-md" />
                              <input type="number" value={f.count} onChange={e => {
                                 const newList = [...reportData.facilities]; newList[i].count = parseInt(e.target.value)||0;
                                 setReportData({...reportData, facilities: newList});
                              }} className="w-12 p-1.5 text-[10px] border rounded-md text-center" />
                              <button onClick={() => setReportData({...reportData, facilities: reportData.facilities.filter((_, idx) => idx !== i)})} className="text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                           </div>
                        ))}
                     </div>
                  </div>
                )}
                {activeTab === 'umum' && (
                  <div className="space-y-4">
                     <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                        <p className="text-[10px] font-black uppercase">Data Kelulusan</p>
                        <div className="grid grid-cols-2 gap-3">
                           <div><label className="text-[8px] font-black uppercase">Lulus L</label><input type="number" value={reportData.graduates.l} onChange={e=>setReportData({...reportData, graduates: {...reportData.graduates, l: parseInt(e.target.value)||0}})} className={inputClass} /></div>
                           <div><label className="text-[8px] font-black uppercase">Lulus P</label><input type="number" value={reportData.graduates.p} onChange={e=>setReportData({...reportData, graduates: {...reportData.graduates, p: parseInt(e.target.value)||0}})} className={inputClass} /></div>
                        </div>
                     </div>
                     <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                        <p className="text-[10px] font-black uppercase">Absensi Siswa</p>
                        <div className="space-y-2">
                           <div className="flex justify-between items-center text-[10px] font-bold"><span>Hari Efektif</span><input type="number" value={reportData.effectiveDays} onChange={e=>setReportData({...reportData, effectiveDays: parseInt(e.target.value)||0})} className="w-16 border rounded p-1 text-right" /></div>
                           <div className="flex justify-between items-center text-[10px] font-bold"><span>Sakit</span><input type="number" value={reportData.absentSakit} onChange={e=>setReportData({...reportData, absentSakit: parseInt(e.target.value)||0})} className="w-16 border rounded p-1 text-right" /></div>
                           <div className="flex justify-between items-center text-[10px] font-bold"><span>Ijin</span><input type="number" value={reportData.absentIjin} onChange={e=>setReportData({...reportData, absentIjin: parseInt(e.target.value)||0})} className="w-16 border rounded p-1 text-right" /></div>
                           <div className="flex justify-between items-center text-[10px] font-bold"><span>Alfa</span><input type="number" value={reportData.absentAlfa} onChange={e=>setReportData({...reportData, absentAlfa: parseInt(e.target.value)||0})} className="w-16 border rounded p-1 text-right" /></div>
                        </div>
                     </div>
                     <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                        <p className="text-[10px] font-black uppercase">Usia Peserta Didik</p>
                        <div className="grid grid-cols-1 gap-2">
                           <div className="flex justify-between text-[10px] font-bold"><span>{'<'} 7 Thn</span><input type="number" value={reportData.studentAge.under7} onChange={e=>setReportData({...reportData, studentAge: {...reportData.studentAge, under7: parseInt(e.target.value)||0}})} className="w-16 border rounded p-1 text-right"/></div>
                           <div className="flex justify-between text-[10px] font-bold"><span>7-12 Thn</span><input type="number" value={reportData.studentAge.age7_12} onChange={e=>setReportData({...reportData, studentAge: {...reportData.studentAge, age7_12: parseInt(e.target.value)||0}})} className="w-16 border rounded p-1 text-right"/></div>
                           <div className="flex justify-between text-[10px] font-bold"><span>{'>'} 12 Thn</span><input type="number" value={reportData.studentAge.over12} onChange={e=>setReportData({...reportData, studentAge: {...reportData.studentAge, over12: parseInt(e.target.value)||0}})} className="w-16 border rounded p-1 text-right"/></div>
                        </div>
                     </div>
                  </div>
                )}
             </div>
          </div>
        </div>

        <div className="flex-1 bg-slate-100 rounded-[3rem] p-6 overflow-x-auto flex flex-col items-center min-h-[900px]">
           <div className="flex gap-2 mb-4 print:hidden sticky top-0 z-20">
             <button onClick={() => setScale(s => Math.max(0.3, s - 0.05))} className="p-2 bg-white rounded-lg border shadow-sm transition-colors hover:text-indigo-600"><ZoomIn size={16}/></button>
             <button onClick={() => setScale(0.55)} className="px-4 bg-white rounded-lg border shadow-sm text-[10px] font-black uppercase tracking-widest">Normal</button>
             <button onClick={() => setScale(s => Math.min(1.2, s + 0.05))} className="p-2 bg-white rounded-lg border shadow-sm transition-colors hover:text-indigo-600"><ZoomOut size={16}/></button>
           </div>

           <div 
             ref={reportRef}
             className="report-baku bg-white shadow-2xl origin-top print:shadow-none p-[10mm] text-black font-serif"
             style={{ width: '330mm', minHeight: '215mm', transform: `scale(${scale})` }}
           >
              <div className="text-center font-bold text-[12pt] border-b-2 border-black pb-1 mb-3 uppercase tracking-[0.2em]">LAPOR BULAN {format(new Date(year, month, 1), 'MMMM yyyy', { locale: id })}</div>
              
              <div className="grid grid-cols-[1.1fr_1.1fr_1.3fr] gap-x-10 text-[8.5pt] mb-4 leading-tight">
                 <div className="space-y-0.5">
                    <div className="grid grid-cols-[110px_5px_1fr]"><span>NAMA LEMBAGA</span><span>:</span><span className="font-bold">{config.name}</span></div>
                    <div className="grid grid-cols-[110px_5px_1fr]"><span>NSS</span><span>:</span><span>{config.nss}</span></div>
                    <div className="grid grid-cols-[110px_5px_1fr]"><span>NO. TELEPON/HP. KS</span><span>:</span><span>{config.phone}</span></div>
                    <div className="grid grid-cols-[110px_5px_1fr]"><span>KELURAHAN</span><span>:</span><span>{config.village}</span></div>
                 </div>
                 <div className="space-y-0.5">
                    <div className="grid grid-cols-[100px_5px_1fr]"><span>NPSN</span><span>:</span><span className="font-bold">{config.npsn}</span></div>
                    <div className="grid grid-cols-[100px_5px_1fr]"><span>ALAMAT SEKOLAH</span><span>:</span><span>{config.address}</span></div>
                    <div className="grid grid-cols-[100px_5px_1fr]"><span>KECAMATAN</span><span>:</span><span>{config.district}</span></div>
                    <div className="grid grid-cols-[100px_5px_1fr]"><span>KOTA</span><span>:</span><span>{config.city}</span></div>
                    <div className="grid grid-cols-[100px_5px_1fr]"><span>PROVINSI</span><span>:</span><span>{config.province}</span></div>
                 </div>
                 <div className="space-y-0.5">
                    <div className="grid grid-cols-[120px_5px_1fr]"><span>STATUS AKREDITASI</span><span>:</span><span>{config.accreditation}</span></div>
                    <div className="grid grid-cols-[120px_5px_1fr]"><span>TAHUN AKREDITASI</span><span>:</span><span>{config.accreditationYear}</span></div>
                    <div className="grid grid-cols-[120px_5px_1fr]"><span>GUGUS</span><span>:</span><span>{config.gugus}</span></div>
                    <div className="grid grid-cols-[120px_5px_1fr]"><span>E-MAIL SEKOLAH</span><span>:</span><span className="lowercase">{config.email}</span></div>
                 </div>
              </div>

              {/* Tabel Utama: Banyaknya Peserta Didik */}
              <div className="mb-5 grid grid-cols-[1fr_300px] gap-6 items-start">
                <div className="overflow-hidden">
                  <table className="w-full border-collapse border-[1pt] border-black text-[7.5pt] text-center table-fixed">
                    <thead className="bg-slate-50 uppercase font-bold text-[7pt]">
                      <tr>
                        <th className="border border-black w-[18%]" rowSpan={3}>KEWARGANEGARAAN</th>
                        {[1,2,3,4,5,6].map(k => <th key={k} className="border border-black">Kelas {['I','II','III','IV','V','VI'][k-1]}</th>)}
                        <th className="border border-black" colSpan={3}>JUMLAH TOTAL</th>
                      </tr>
                      <tr className="text-[6pt]">
                        {[1,2,3,4,5,6].map(k => (
                          <th key={`h-${k}`} className="border border-black">
                             <div className="grid grid-cols-3 h-full"><span className="border-r border-black">L</span><span className="border-r border-black">P</span><span className="bg-slate-100">Jml</span></div>
                          </th>
                        ))}
                        <th className="border border-black">L</th><th className="border border-black">P</th><th className="border border-black bg-slate-100">Jml</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'WNI Asli', key: 'wniAsli' },
                        { label: 'WNI Ketrn. Tiong Hoa', key: 'wniTionghoa' },
                        { label: 'WNI Ketrn. Arab', key: 'wniArab' },
                        { label: 'WNI Ketrn. Lain-lain', key: 'wniLain' }
                      ].map(row => (
                        <tr key={row.key} className="h-5">
                          <td className="border border-black text-left px-1 font-bold uppercase">{row.label}</td>
                          {[0,1,2,3,4,5].map(i => (
                            <td key={i} className="border border-black">
                               <div className="grid grid-cols-3 h-full"><span className="border-r border-black">{reportData.studentMatrix[row.key as any].l[i]}</span><span className="border-r border-black">{reportData.studentMatrix[row.key as any].p[i]}</span><span className="bg-slate-50">{getRowSum(row.key as any, i)}</span></div>
                            </td>
                          ))}
                          <td className="border border-black font-bold">{getTotalL(row.key as any)}</td>
                          <td className="border border-black font-bold">{getTotalP(row.key as any)}</td>
                          <td className="border border-black bg-slate-100 font-bold">{getTotalAll(row.key as any)}</td>
                        </tr>
                      ))}
                      <tr className="bg-yellow-100 h-5 font-bold uppercase text-[7pt]">
                        <td className="border border-black">JUMLAH</td>
                        {[0,1,2,3,4,5].map(i => (
                          <td key={`jt-${i}`} className="border border-black">
                            <div className="grid grid-cols-3 h-full">
                               <span className="border-r border-black">{calculateTotalSiswa('l', i)}</span>
                               <span className="border-r border-black">{calculateTotalSiswa('p', i)}</span>
                               <span className="bg-yellow-50">{calculateTotalSiswa('l', i) + calculateTotalSiswa('p', i)}</span>
                            </div>
                          </td>
                        ))}
                        <td className="border border-black">{(['wniAsli', 'wniTionghoa', 'wniArab', 'wniLain'] as const).reduce((a,k)=>a+getTotalL(k),0)}</td>
                        <td className="border border-black">{(['wniAsli', 'wniTionghoa', 'wniArab', 'wniLain'] as const).reduce((a,k)=>a+getTotalP(k),0)}</td>
                        <td className="border border-black bg-yellow-200">{(['wniAsli', 'wniTionghoa', 'wniArab', 'wniLain'] as const).reduce((a,k)=>a+getTotalAll(k),0)}</td>
                      </tr>
                      <tr className="h-1"></tr>
                      <tr className="bg-slate-50 font-bold uppercase h-5"><td className="border border-black text-left px-1" colSpan={10}>AGAMA</td></tr>
                      {['Islam', 'Katolik', 'Protestan', 'Hindu', 'Budha'].map(agm => {
                        const k = `agama${agm}` as keyof IMonthlyReport['studentMatrix'];
                        return (
                          <tr key={agm} className="h-5">
                            <td className="border border-black text-left px-1 uppercase">{agm}</td>
                            {[0,1,2,3,4,5].map(i => (
                              <td key={`agm-${i}`} className="border border-black">
                                 <div className="grid grid-cols-3 h-full"><span className="border-r border-black">{reportData.studentMatrix[k].l[i]}</span><span className="border-r border-black">{reportData.studentMatrix[k].p[i]}</span><span className="bg-slate-50">{getRowSum(k, i)}</span></div>
                              </td>
                            ))}
                            <td className="border border-black font-bold">{getTotalL(k)}</td>
                            <td className="border border-black font-bold">{getTotalP(k)}</td>
                            <td className="border border-black bg-slate-100 font-bold">{getTotalAll(k)}</td>
                          </tr>
                        )
                      })}
                      <tr className="bg-yellow-100 h-5 font-bold uppercase text-[7pt]">
                        <td className="border border-black">JUMLAH</td>
                        {[0,1,2,3,4,5].map(i => (
                          <td key={`jagm-${i}`} className="border border-black">
                            <div className="grid grid-cols-3 h-full">
                               <span className="border-r border-black">{calculateTotalAgama('l', i)}</span>
                               <span className="border-r border-black">{calculateTotalAgama('p', i)}</span>
                               <span className="bg-yellow-50">{calculateTotalAgama('l', i) + calculateTotalAgama('p', i)}</span>
                            </div>
                          </td>
                        ))}
                        <td className="border border-black">{(['agamaIslam', 'agamaKatolik', 'agamaProtestan', 'agamaHindu', 'agamaBudha'] as const).reduce((a,k)=>a+getTotalL(k),0)}</td>
                        <td className="border border-black">{(['agamaIslam', 'agamaKatolik', 'agamaProtestan', 'agamaHindu', 'agamaBudha'] as const).reduce((a,k)=>a+getTotalP(k),0)}</td>
                        <td className="border border-black bg-yellow-200">{(['agamaIslam', 'agamaKatolik', 'agamaProtestan', 'agamaHindu', 'agamaBudha'] as const).reduce((a,k)=>a+getTotalAll(k),0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="space-y-4">
                  {/* A. Kondisi Ruang Kelas */}
                  <div>
                    <div className="bg-blue-100 border border-black px-1 font-bold text-[7.5pt] uppercase tracking-wide">A. Kondisi Ruang Kelas</div>
                    <table className="w-full border-collapse border border-black text-[7pt] text-center">
                      <thead className="bg-slate-50"><tr><th className="border border-black">Ruang</th><th className="border border-black">Baik</th><th className="border border-black">Rsk Rgn</th><th className="border border-black">Rsk Brt</th><th className="border border-black">Total</th></tr></thead>
                      <tbody>
                        <tr className="h-5">
                          <td className="border border-black text-left px-1">Hak Milik</td>
                          <td className="border border-black">{reportData.classCondition.baik}</td>
                          <td className="border border-black">{reportData.classCondition.rusakRingan}</td>
                          <td className="border border-black">{reportData.classCondition.rusakBerat}</td>
                          <td className="border border-black">{reportData.classCondition.baik + reportData.classCondition.rusakRingan + reportData.classCondition.rusakBerat}</td>
                        </tr>
                        <tr className="h-5">
                          <td className="border border-black text-left px-1">Pinjam</td>
                          <td className="border border-black">0</td><td className="border border-black">0</td><td className="border border-black">0</td><td className="border border-black">0</td>
                        </tr>
                        <tr className="bg-blue-50 font-bold h-5"><td className="border border-black uppercase">Jumlah</td><td className="border border-black">{reportData.classCondition.baik}</td><td className="border border-black">{reportData.classCondition.rusakRingan}</td><td className="border border-black">{reportData.classCondition.rusakBerat}</td><td className="border border-black">{reportData.classCondition.baik + reportData.classCondition.rusakRingan + reportData.classCondition.rusakBerat}</td></tr>
                      </tbody>
                    </table>
                  </div>

                  {/* B. Jumlah Rombel */}
                  <div>
                    <div className="bg-blue-100 border border-black px-1 font-bold text-[7.5pt] uppercase tracking-wide">B. Rombongan Belajar & Siswa Miskin</div>
                    <table className="w-full border-collapse border border-black text-[6.5pt] text-center table-fixed">
                      <thead className="bg-slate-50"><tr><th className="border border-black">Kelas</th><th className="border border-black w-12">Rombel</th><th className="border border-black w-14">Sw. Miskin</th><th className="border border-black" colSpan={2}>Total Siswa Usia</th></tr></thead>
                      <tbody>
                        {[1,2,3,4,5,6].map((k, idx) => (
                          <tr key={k} className="h-5">
                            <td className="border border-black text-left px-1 font-bold">Kelas {k}</td>
                            <td className="border border-black">1</td><td className="border border-black">0</td>
                            <td className="border border-black text-left px-1 text-[6pt]">{['< 7 Thn', '7-12 Thn', '>12 Thn', 'Total', 'Mengulang', 'Putus Skh'][idx]}</td>
                            <td className="border border-black w-8 font-bold">{[reportData.studentAge.under7, reportData.studentAge.age7_12, reportData.studentAge.over12, (reportData.studentAge.under7+reportData.studentAge.age7_12+reportData.studentAge.over12), 0, 0][idx]}</td>
                          </tr>
                        ))}
                        <tr className="bg-blue-50 font-bold h-5"><td className="border border-black uppercase">Jumlah</td><td className="border border-black">6</td><td className="border border-black">0</td><td className="border border-black" colSpan={2}>* Rombel = Rombongan Belajar</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Bagian Bawah: Absensi, Kelulusan, Sarana, Personil */}
              <div className="grid grid-cols-[320px_240px_1fr] gap-6 items-start">
                 {/* Kolom 1: Status Kepegawaian (Tabel Detail Bottom Left) */}
                 <div>
                    <div className="bg-blue-100 border border-black px-1 font-bold text-[7.5pt] uppercase tracking-wide mb-1 flex items-center gap-1.5"><UserCog size={12}/> Status Kepegawaian</div>
                    <table className="w-full border-collapse border border-black text-[6.2pt] text-center table-fixed">
                       <thead className="bg-slate-50 uppercase font-bold leading-tight">
                          <tr>
                             <th className="border border-black w-[30%]" rowSpan={2}>Jabatan di Sekolah</th>
                             <th className="border border-black" colSpan={2}>PNS</th>
                             <th className="border border-black" colSpan={2}>Non PNS</th>
                             <th className="border border-black w-[10%]" rowSpan={2}>Jml PNS</th>
                             <th className="border border-black w-[10%]" rowSpan={2}>Jml Non</th>
                             <th className="border border-black" rowSpan={2}>Total</th>
                          </tr>
                          <tr>
                             <th className="border border-black">L</th><th className="border border-black">P</th>
                             <th className="border border-black">L</th><th className="border border-black">P</th>
                          </tr>
                       </thead>
                       <tbody>
                          {(Object.entries(reportData.staffData) as [string, { pnsL: number, pnsP: number, nonPnsL: number, nonPnsP: number }][]).map(([job, d], idx) => (
                             <tr key={job} className="h-5">
                                <td className="border border-black text-left px-1 font-bold truncate">{job.substring(3)}</td>
                                <td className="border border-black">{d.pnsL}</td><td className="border border-black">{d.pnsP}</td>
                                <td className="border border-black">{d.nonPnsL}</td><td className="border border-black">{d.nonPnsP}</td>
                                <td className="border border-black font-bold">{d.pnsL+d.pnsP}</td>
                                <td className="border border-black font-bold">{d.nonPnsL+d.nonPnsP}</td>
                                <td className="border border-black font-bold bg-slate-50">{d.pnsL+d.pnsP+d.nonPnsL+d.nonPnsP}</td>
                             </tr>
                          ))}
                          <tr className="bg-yellow-100 font-bold h-5 uppercase">
                             <td className="border border-black">JUMLAH</td>
                             <td className="border border-black">0</td><td className="border border-black">0</td><td className="border border-black">0</td><td className="border border-black">0</td>
                             <td className="border border-black">0</td><td className="border border-black">0</td><td className="border border-black">12</td>
                          </tr>
                       </tbody>
                    </table>
                 </div>

                 {/* Kolom 2: Hari Efektif & Kelulusan */}
                 <div className="space-y-4">
                    <div>
                       <div className="bg-blue-100 border border-black px-1 font-bold text-[7.5pt] uppercase tracking-wide">D. Hari Efektif & Absensi</div>
                       <table className="w-full border-collapse border border-black text-[7pt] text-center">
                          <tbody>
                             <tr className="h-5"><td className="border border-black text-left px-1 font-bold">Hari Efektif *)</td><td className="border border-black w-10 font-black">{reportData.effectiveDays}</td><td className="border border-black">Hari</td></tr>
                             <tr className="h-5"><td className="border border-black text-left px-1 italic">a. Sakit</td><td className="border border-black">{reportData.absentSakit}</td><td className="border border-black">Siswa</td></tr>
                             <tr className="h-5"><td className="border border-black text-left px-1 italic">b. Ijin</td><td className="border border-black">{reportData.absentIjin}</td><td className="border border-black">Siswa</td></tr>
                             <tr className="h-5"><td className="border border-black text-left px-1 italic">c. Alfa</td><td className="border border-black">{reportData.absentAlfa}</td><td className="border border-black">Siswa</td></tr>
                             <tr className="bg-blue-50 font-bold h-5"><td className="border border-black uppercase">Total</td><td className="border border-black">{reportData.absentSakit+reportData.absentIjin+reportData.absentAlfa}</td><td className="border border-black">0,31</td></tr>
                          </tbody>
                       </table>
                    </div>
                    <div>
                       <div className="bg-blue-100 border border-black px-1 font-bold text-[7.5pt] uppercase tracking-wide">E. Data Kelulusan T.A. 2022/2023</div>
                       <div className="grid grid-cols-2 gap-2 border border-black p-1.5">
                          <table className="w-full border border-black text-[6pt] text-center">
                             <thead><tr className="bg-slate-50 border-b border-black"><th colSpan={3}>Peserta</th></tr><tr><th>L</th><th>P</th><th>Jml</th></tr></thead>
                             <tbody><tr className="h-4 border-t border-black"><td>12</td><td>26</td><td className="font-bold">38</td></tr></tbody>
                          </table>
                          <table className="w-full border border-black text-[6pt] text-center">
                             <thead><tr className="bg-slate-50 border-b border-black"><th colSpan={3}>Lulusan</th></tr><tr><th>L</th><th>P</th><th>Jml</th></tr></thead>
                             <tbody><tr className="h-4 border-t border-black"><td>12</td><td>26</td><td className="font-bold">38</td></tr></tbody>
                          </table>
                       </div>
                       <div className="grid grid-cols-2 gap-2 border-x border-b border-black p-1.5 pt-0">
                          <table className="w-full border border-black text-[5.5pt] text-center">
                             <thead><tr className="bg-slate-50 border-b border-black"><th colSpan={2}>Melanjutkan</th></tr><tr><th>L</th><th>P</th></tr></thead>
                             <tbody><tr className="h-3.5 border-t border-black"><td>12</td><td>26</td></tr></tbody>
                          </table>
                          <table className="w-full border border-black text-[5.5pt] text-center">
                             <thead><tr className="bg-slate-50 border-b border-black"><th colSpan={2}>Tdk Melanjutkan</th></tr><tr><th>L</th><th>P</th></tr></thead>
                             <tbody><tr className="h-3.5 border-t border-black"><td>0</td><td>0</td></tr></tbody>
                          </table>
                       </div>
                    </div>
                    <div className="pt-2 text-[6pt] italic leading-tight text-slate-500">
                      *) Bila kolom kurang, bisa ditambah di tab Sarpras.<br/>
                      Data tersebut kami isi sesuai dengan keadaan sebenarnya.<br/>
                      Kediri, {format(new Date(), 'dd MMMM yyyy', { locale: id })}
                    </div>
                 </div>

                 {/* Kolom 3: Sarana Pendidikan & Tanda Tangan */}
                 <div className="flex flex-col h-full">
                    <div className="flex-1">
                      <div className="bg-blue-100 border border-black px-1 font-bold text-[7.5pt] uppercase tracking-wide mb-1 flex items-center gap-1.5"><Home size={12}/> F. Sarana Pendidikan</div>
                      <table className="w-full border-collapse border border-black text-[6.5pt] table-fixed">
                         <thead className="bg-slate-50 text-center font-bold"><tr><th className="border border-black w-8">No</th><th className="border border-black">Nama Barang</th><th className="border border-black w-12">Jumlah</th></tr></thead>
                         <tbody>
                            {reportData.facilities.map((f, i) => (
                               <tr key={i} className="h-4">
                                  <td className="border border-black text-center">{i+1}</td>
                                  <td className="border border-black px-1 uppercase truncate">{f.name}</td>
                                  <td className="border border-black text-center font-bold">{f.count}</td>
                               </tr>
                            ))}
                            {[...Array(Math.max(0, 24 - reportData.facilities.length))].map((_, i) => (
                               <tr key={`empty-${i}`} className="h-4"><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td></tr>
                            ))}
                         </tbody>
                      </table>
                    </div>
                    <div className="pt-10 flex flex-col items-center ml-auto w-[250px] text-center">
                       <p className="text-[9pt] font-bold">Kepala Sekolah,</p>
                       <div className="h-[25mm] flex items-center justify-center my-2">
                          <img src={config.logoDaerahUrl} className="h-full w-auto opacity-10 grayscale" />
                       </div>
                       <p className="text-[10pt] font-bold underline uppercase decoration-[1.5pt] tracking-tight">{config.principalName}</p>
                       <p className="text-[8.5pt] font-bold tracking-widest mt-1">NIP. {config.principalNip}</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
      
      <style>{`
        .report-baku { box-sizing: border-box; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        @media print {
          body * { visibility: hidden; }
          .report-baku, .report-baku * { visibility: visible !important; }
          .report-baku { 
            position: fixed !important; left: 0 !important; top: 0 !important; 
            width: 330mm !important; height: 215mm !important; 
            transform: none !important; margin: 0 !important; 
          }
          @page { size: 330mm 215mm landscape; margin: 0; }
        }
      `}</style>
    </div>
  );
};

export default MonthlyReport;
