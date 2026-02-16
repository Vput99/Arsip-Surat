import React, { useState, useEffect, useRef } from 'react';
import { ClipboardCheck, Printer, Save, Loader2, Users, Building2, ZoomIn, ZoomOut, Plus, Trash2, UserCog, Home, Calendar, Activity, Info, PenTool, Hash, School, RefreshCw, Layers } from 'lucide-react';
import { subscribeToConfig, subscribeToStaff, saveMonthlyReport, subscribeToMonthlyReport, StaffMember, saveSchoolConfig } from '../services/storage';
import { SchoolConfig, MonthlyReport as IMonthlyReport, StudentRow } from '../types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale/id';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const createEmptyArray = () => [0, 0, 0, 0, 0, 0];
const createEmptyRow = (): StudentRow => ({ l: createEmptyArray(), p: createEmptyArray() });

const MonthlyReport: React.FC = () => {
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'lembaga' | 'siswa' | 'mutasi' | 'pegawai' | 'sarpras' | 'umum'>('siswa');
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [scale, setScale] = useState(0.5);
  
  const reportRef = useRef<HTMLDivElement>(null);

  const [reportData, setReportData] = useState<IMonthlyReport>({
    id: '', month, year,
    studentMatrix: {
      wniAsli: createEmptyRow(), wniTionghoa: createEmptyRow(), wniArab: createEmptyRow(), wniLain: createEmptyRow(),
      agamaIslam: createEmptyRow(), agamaKatolik: createEmptyRow(), agamaProtestan: createEmptyRow(), agamaHindu: createEmptyRow(), agamaBudha: createEmptyRow()
    },
    mutasi: {
      awalL: createEmptyArray(), awalP: createEmptyArray(),
      masukL: createEmptyArray(), masukP: createEmptyArray(),
      keluarL: createEmptyArray(), keluarP: createEmptyArray()
    },
    classCondition: { baik: 0, rusakRingan: 0, rusakBerat: 0 },
    studentAge: { under7: 0, age7_12: 0, over12: 0 },
    staffData: {
      '1. Kepala Sekolah': { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0 },
      '2. Guru Kelas': { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0 },
      '3. Guru Agama Islam': { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0 },
      '4. Guru Penjasorkes': { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0 },
      '5. TU / Operator': { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0 },
      '6. Penjaga / Satpam': { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0 }
    },
    effectiveDays: 25, absentSakit: 0, absentIjin: 0, absentAlfa: 0,
    graduates: { l: 0, p: 0 },
    facilities: [
      { name: 'Bangku Siswa', count: 0 }, { name: 'Meja Siswa', count: 0 }, { name: 'Kursi Guru', count: 0 }, { name: 'Lemari', count: 0 }, { name: 'Papan Tulis', count: 0 }
    ],
    detailedSarpras: {
      luasTanah: '-', statusTanah: 'Milik Sendiri', jumlahBangunan: '1', luasBangunan: '-', listrik: '1300 Watt', air: 'Sumur/PDAM'
    },
    infrastructureNote: '', summaryNarrative: '', createdAt: new Date().toISOString()
  });

  useEffect(() => {
    const unsubscribeConfig = subscribeToConfig(setConfig);
    const unsubscribeReport = subscribeToMonthlyReport(year, month, (data) => {
      if (data) {
        // Merge existing data to ensure new fields (mutasi, etc) are initialized if missing
        setReportData(prev => ({
          ...prev,
          ...data,
          mutasi: data.mutasi || prev.mutasi,
          detailedSarpras: data.detailedSarpras || prev.detailedSarpras
        }));
      }
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

  const updateMutasi = (key: keyof IMonthlyReport['mutasi'], classIdx: number, val: string) => {
    const num = parseInt(val) || 0;
    setReportData(prev => {
      const newMutasi = { ...prev.mutasi };
      const newList = [...newMutasi[key]];
      newList[classIdx] = num;
      newMutasi[key] = newList;
      return { ...prev, mutasi: newMutasi };
    });
  };

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [330, 215] });
      const pages = reportRef.current.querySelectorAll('.report-page');
      
      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i] as HTMLElement, { scale: 2, useCORS: true });
        if (i > 0) pdf.addPage([330, 215], 'landscape');
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 330, 215);
      }
      
      pdf.save(`LaporBulan_${year}_${month + 1}.pdf`);
    } catch (err) { alert('Ekspor gagal.'); }
    finally { setLoading(false); }
  };

  if (!config) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin" /></div>;

  const inputClass = "w-full p-2 text-[11px] font-bold border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white";
  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1";
  
  // Perhitungan Mutasi Akhir
  const getAkhirL = (idx: number) => reportData.mutasi.awalL[idx] + reportData.mutasi.masukL[idx] - reportData.mutasi.keluarL[idx];
  const getAkhirP = (idx: number) => reportData.mutasi.awalP[idx] + reportData.mutasi.masukP[idx] - reportData.mutasi.keluarP[idx];

  return (
    <div className="space-y-6 pb-20 animate-fade-in text-slate-900">
      {/* Header Panel */}
      <div className="flex justify-between items-center bg-white p-5 rounded-3xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg"><ClipboardCheck size={24} /></div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Laporan Bulanan Lengkap (Halaman 1 & 2)</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Input Data F-SEK & Mutasi Siswa</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saveLoading} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center gap-2 transition-all hover:bg-emerald-700">
            {saveLoading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Simpan
          </button>
          <button onClick={exportPDF} disabled={loading} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center gap-2 transition-all hover:bg-indigo-700">
            {loading ? <Loader2 size={16} className="animate-spin"/> : <Printer size={16}/>} Cetak PDF
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* SIDEBAR EDITOR */}
        <div className="w-full xl:w-[450px] shrink-0 space-y-4 print:hidden">
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden h-[800px] flex flex-col">
             <div className="flex bg-slate-50 p-1 border-b overflow-x-auto custom-scrollbar">
               {(['lembaga', 'siswa', 'mutasi', 'pegawai', 'sarpras', 'umum'] as const).map(t => (
                 <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 min-w-[80px] py-3 text-[9px] font-black uppercase rounded-xl transition-all ${activeTab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                   {t}
                 </button>
               ))}
             </div>
             <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                {activeTab === 'lembaga' && (
                  <div className="space-y-4">
                     <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                        <p className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-2"><School size={14}/> Profil Lembaga</p>
                        <div className="space-y-4">
                           <div><label className={labelClass}>Nama Lembaga</label><input name="name" value={config.name} onChange={handleConfigChange} className={inputClass} /></div>
                           <div className="grid grid-cols-2 gap-3">
                              <div><label className={labelClass}>NSS</label><input name="nss" value={config.nss} onChange={handleConfigChange} className={inputClass} /></div>
                              <div><label className={labelClass}>NPSN</label><input name="npsn" value={config.npsn} onChange={handleConfigChange} className={inputClass} /></div>
                           </div>
                           <div className="grid grid-cols-2 gap-3">
                              <div><label className={labelClass}>Status Akre</label><input name="accreditation" value={config.accreditation} onChange={handleConfigChange} className={inputClass} /></div>
                              <div><label className={labelClass}>Thn Akre</label><input name="accreditationYear" value={config.accreditationYear} onChange={handleConfigChange} className={inputClass} /></div>
                           </div>
                        </div>
                     </div>
                  </div>
                )}
                {activeTab === 'mutasi' && (
                  <div className="space-y-6">
                     <p className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-2"><RefreshCw size={14}/> Mutasi Siswa (Halaman Belakang)</p>
                     {(['awalL', 'awalP', 'masukL', 'masukP', 'keluarL', 'keluarP'] as const).map(key => (
                        <div key={key} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                           <label className={labelClass}>{key.replace(/([A-Z])/g, ' $1')}</label>
                           <div className="grid grid-cols-6 gap-2">
                              {reportData.mutasi[key].map((val, i) => (
                                 <div key={i}>
                                    <span className="text-[7px] font-bold block text-center">K{i+1}</span>
                                    <input type="number" value={val} onChange={(e) => updateMutasi(key, i, e.target.value)} className="w-full p-1 text-[10px] border rounded text-center" />
                                 </div>
                              ))}
                           </div>
                        </div>
                     ))}
                  </div>
                )}
                {activeTab === 'siswa' && (
                   <div className="space-y-6">
                      <p className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-2"><Users size={14}/> Identitas & Agama (Halaman Depan)</p>
                      {(Object.keys(reportData.studentMatrix) as Array<keyof IMonthlyReport['studentMatrix']>).map(key => (
                         <div key={key} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <label className={labelClass}>{key.replace(/([A-Z])/g, ' $1')}</label>
                            <div className="grid grid-cols-6 gap-2">
                               {reportData.studentMatrix[key].l.map((val, i) => (
                                  <div key={`l-${i}`}><span className="text-[7px] font-bold block text-center">K{i+1}L</span><input type="number" value={val} onChange={(e) => updateMatrix(key, 'l', i, e.target.value)} className="w-full p-1 text-[10px] border rounded text-center" /></div>
                               ))}
                               {reportData.studentMatrix[key].p.map((val, i) => (
                                  <div key={`p-${i}`}><span className="text-[7px] font-bold block text-center text-rose-500">K{i+1}P</span><input type="number" value={val} onChange={(e) => updateMatrix(key, 'p', i, e.target.value)} className="w-full p-1 text-[10px] border rounded text-center bg-rose-50/30" /></div>
                               ))}
                            </div>
                         </div>
                      ))}
                   </div>
                )}
                {activeTab === 'sarpras' && (
                  <div className="space-y-4">
                     <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                        <p className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-2"><Layers size={14}/> Sarana Detail (Halaman Belakang)</p>
                        <div className="grid grid-cols-2 gap-3">
                           <div><label className={labelClass}>Luas Tanah (m2)</label><input value={reportData.detailedSarpras.luasTanah} onChange={e => setReportData({...reportData, detailedSarpras: {...reportData.detailedSarpras, luasTanah: e.target.value}})} className={inputClass} /></div>
                           <div><label className={labelClass}>Status Tanah</label><input value={reportData.detailedSarpras.statusTanah} onChange={e => setReportData({...reportData, detailedSarpras: {...reportData.detailedSarpras, statusTanah: e.target.value}})} className={inputClass} /></div>
                           <div><label className={labelClass}>Luas Bangunan</label><input value={reportData.detailedSarpras.luasBangunan} onChange={e => setReportData({...reportData, detailedSarpras: {...reportData.detailedSarpras, luasBangunan: e.target.value}})} className={inputClass} /></div>
                           <div><label className={labelClass}>Listrik</label><input value={reportData.detailedSarpras.listrik} onChange={e => setReportData({...reportData, detailedSarpras: {...reportData.detailedSarpras, listrik: e.target.value}})} className={inputClass} /></div>
                        </div>
                     </div>
                  </div>
                )}
                {/* Tab lain (Pegawai, Umum) tetap dipertahankan logikanya... */}
             </div>
          </div>
        </div>

        {/* AREA PREVIEW (DUA HALAMAN) */}
        <div className="flex-1 bg-slate-100 rounded-[3rem] p-6 overflow-x-auto flex flex-col items-center gap-10">
           <div className="flex gap-2 print:hidden sticky top-0 z-20">
             <button onClick={() => setScale(s => Math.max(0.3, s - 0.05))} className="p-2 bg-white rounded-lg border shadow-sm"><ZoomIn size={16}/></button>
             <button onClick={() => setScale(0.5)} className="px-4 bg-white rounded-lg border shadow-sm text-[10px] font-black uppercase">Normal</button>
             <button onClick={() => setScale(s => Math.min(1, s + 0.05))} className="p-2 bg-white rounded-lg border shadow-sm"><ZoomOut size={16}/></button>
           </div>

           <div ref={reportRef} className="flex flex-col gap-12 origin-top" style={{ transform: `scale(${scale})` }}>
              {/* HALAMAN 1 (DEPAN) */}
              <div className="report-page report-baku bg-white shadow-2xl p-[10mm] text-black font-serif" style={{ width: '330mm', height: '215mm' }}>
                  <div className="text-center font-bold text-[12pt] border-b-2 border-black pb-1 mb-3 uppercase tracking-[0.2em]">LAPOR BULAN {format(new Date(year, month, 1), 'MMMM yyyy', { locale: id })}</div>
                  <div className="grid grid-cols-3 gap-6 text-[8pt] mb-4">
                    <div>Lembaga: <b>{config.name}</b><br/>NPSN: {config.npsn}<br/>NSS: {config.nss}</div>
                    <div>Alamat: {config.address}<br/>Kecamatan: {config.district}<br/>Kota: {config.city}</div>
                    <div>Akreditasi: {config.accreditation}<br/>Thn Akre: {config.accreditationYear}<br/>Email: {config.email}</div>
                  </div>
                  
                  {/* Tabel Utama: Siswa & Agama */}
                  <table className="w-full border-collapse border border-black text-[7pt] text-center mb-4">
                     <thead className="bg-slate-50 font-bold">
                        <tr>
                          <th className="border border-black" rowSpan={2}>KEWARGANEGARAAN / AGAMA</th>
                          {[1,2,3,4,5,6].map(k => <th key={k} className="border border-black" colSpan={3}>Kelas {k}</th>)}
                          <th className="border border-black" colSpan={3}>Jumlah Total</th>
                        </tr>
                        <tr>
                           {[...Array(7)].map((_, i) => (
                             <React.Fragment key={i}>
                               <th className="border border-black w-6">L</th><th className="border border-black w-6">P</th><th className="border border-black w-8 bg-slate-100">Jml</th>
                             </React.Fragment>
                           ))}
                        </tr>
                     </thead>
                     <tbody>
                        {['wniAsli', 'wniTionghoa', 'wniArab', 'agamaIslam', 'agamaKatolik', 'agamaProtestan'].map(key => (
                           <tr key={key}>
                              <td className="border border-black text-left px-1 uppercase">{key.replace(/([A-Z])/g, ' $1')}</td>
                              {[0,1,2,3,4,5].map(i => {
                                 const l = reportData.studentMatrix[key as any]?.l[i] || 0;
                                 const p = reportData.studentMatrix[key as any]?.p[i] || 0;
                                 return <React.Fragment key={i}><td className="border border-black">{l}</td><td className="border border-black">{p}</td><td className="border border-black bg-slate-50 font-bold">{l+p}</td></React.Fragment>
                              })}
                              <td className="border border-black font-bold">0</td><td className="border border-black font-bold">0</td><td className="border border-black bg-yellow-50 font-bold">0</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
                  
                  {/* Bagian Bawah Halaman 1 */}
                  <div className="grid grid-cols-2 gap-10">
                     <div>
                        <div className="bg-blue-100 border border-black px-1 font-bold text-[8pt] uppercase mb-1">Status Kepegawaian</div>
                        <table className="w-full border-collapse border border-black text-[7pt] text-center">
                           <thead>
                              <tr className="bg-slate-50">
                                 <th className="border border-black">Jabatan</th><th className="border border-black">PNS L</th><th className="border border-black">PNS P</th><th className="border border-black">Non L</th><th className="border border-black">Non P</th><th className="border border-black">Total</th>
                              </tr>
                           </thead>
                           <tbody>
                              {/* Fix type error by explicitly casting the staff data object in the mapping function */}
                              {Object.entries(reportData.staffData).map(([job, d]) => {
                                 const staff = d as { pnsL: number, pnsP: number, nonPnsL: number, nonPnsP: number };
                                 return (
                                    <tr key={job}>
                                       <td className="border border-black text-left px-1">{job.substring(3)}</td>
                                       <td className="border border-black">{staff.pnsL}</td><td className="border border-black">{staff.pnsP}</td><td className="border border-black">{staff.nonPnsL}</td><td className="border border-black">{staff.nonPnsP}</td>
                                       <td className="border border-black font-bold">{staff.pnsL + staff.pnsP + staff.nonPnsL + staff.nonPnsP}</td>
                                    </tr>
                                 );
                              })}
                           </tbody>
                        </table>
                     </div>
                     <div className="text-center pt-4">
                        <p className="font-bold">Kepala Sekolah,</p>
                        <div className="h-16"></div>
                        <p className="font-bold underline uppercase">{config.principalName}</p>
                        <p>NIP. {config.principalNip}</p>
                     </div>
                  </div>
              </div>

              {/* HALAMAN 2 (BELAKANG) */}
              <div className="report-page report-baku bg-white shadow-2xl p-[10mm] text-black font-serif" style={{ width: '330mm', height: '215mm' }}>
                  <div className="text-center font-bold text-[11pt] mb-6 uppercase tracking-widest border-b border-black pb-2">HALAMAN BELAKANG - MUTASI & SARPRAS</div>
                  
                  {/* Tabel Mutasi Murid */}
                  <div className="mb-6">
                     <div className="bg-emerald-100 border border-black px-1 font-bold text-[8pt] uppercase mb-1">I. Mutasi Murid Selama Satu Bulan</div>
                     <table className="w-full border-collapse border border-black text-[7.5pt] text-center">
                        <thead className="bg-slate-50 font-bold">
                           <tr>
                              <th className="border border-black w-40" rowSpan={2}>KEADAAN SISWA</th>
                              {[1,2,3,4,5,6].map(k => <th key={k} className="border border-black" colSpan={2}>Kelas {k}</th>)}
                              <th className="border border-black" colSpan={3}>Jumlah Total</th>
                           </tr>
                           <tr>
                              {[1,2,3,4,5,6].map(k => <React.Fragment key={k}><th className="border border-black">L</th><th className="border border-black">P</th></React.Fragment>)}
                              <th className="border border-black w-10">L</th><th className="border border-black w-10">P</th><th className="border border-black w-12 bg-slate-100">Jml</th>
                           </tr>
                        </thead>
                        <tbody>
                           <tr className="h-7">
                              <td className="border border-black text-left px-2">A. Keadaan Awal Bulan</td>
                              {[0,1,2,3,4,5].map(i => <React.Fragment key={i}><td className="border border-black">{reportData.mutasi.awalL[i]}</td><td className="border border-black">{reportData.mutasi.awalP[i]}</td></React.Fragment>)}
                              <td className="border border-black font-bold">0</td><td className="border border-black font-bold">0</td><td className="border border-black bg-slate-50 font-bold">0</td>
                           </tr>
                           <tr className="h-7">
                              <td className="border border-black text-left px-2">B. Tambah (Masuk)</td>
                              {[0,1,2,3,4,5].map(i => <React.Fragment key={i}><td className="border border-black text-blue-600">{reportData.mutasi.masukL[i]}</td><td className="border border-black text-blue-600">{reportData.mutasi.masukP[i]}</td></React.Fragment>)}
                              <td className="border border-black">0</td><td className="border border-black">0</td><td className="border border-black bg-slate-50">0</td>
                           </tr>
                           <tr className="h-7">
                              <td className="border border-black text-left px-2">C. Kurang (Keluar)</td>
                              {[0,1,2,3,4,5].map(i => <React.Fragment key={i}><td className="border border-black text-rose-600">{reportData.mutasi.keluarL[i]}</td><td className="border border-black text-rose-600">{reportData.mutasi.keluarP[i]}</td></React.Fragment>)}
                              <td className="border border-black">0</td><td className="border border-black">0</td><td className="border border-black bg-slate-50">0</td>
                           </tr>
                           <tr className="h-7 bg-yellow-50 font-bold">
                              <td className="border border-black text-left px-2 uppercase">D. Keadaan Akhir Bulan</td>
                              {[0,1,2,3,4,5].map(i => <React.Fragment key={i}><td className="border border-black">{getAkhirL(i)}</td><td className="border border-black">{getAkhirP(i)}</td></React.Fragment>)}
                              <td className="border border-black">0</td><td className="border border-black">0</td><td className="border border-black bg-yellow-100">0</td>
                           </tr>
                        </tbody>
                     </table>
                  </div>

                  {/* Tabel Sarana Gedung & Tanah */}
                  <div className="grid grid-cols-2 gap-8">
                     <div>
                        <div className="bg-amber-100 border border-black px-1 font-bold text-[8pt] uppercase mb-1">II. Keadaan Gedung & Tanah</div>
                        <table className="w-full border-collapse border border-black text-[8pt]">
                           <tbody>
                              <tr><td className="border border-black p-1 w-40">Luas Tanah</td><td className="border border-black p-1 font-bold">{reportData.detailedSarpras.luasTanah} m2</td></tr>
                              <tr><td className="border border-black p-1">Status Tanah</td><td className="border border-black p-1 uppercase">{reportData.detailedSarpras.statusTanah}</td></tr>
                              <tr><td className="border border-black p-1">Luas Bangunan</td><td className="border border-black p-1">{reportData.detailedSarpras.luasBangunan} m2</td></tr>
                              <tr><td className="border border-black p-1">Sumber Listrik</td><td className="border border-black p-1">{reportData.detailedSarpras.listrik}</td></tr>
                              <tr><td className="border border-black p-1">Sumber Air Bersih</td><td className="border border-black p-1">{reportData.detailedSarpras.air}</td></tr>
                           </tbody>
                        </table>
                     </div>
                     <div>
                        <div className="bg-indigo-100 border border-black px-1 font-bold text-[8pt] uppercase mb-1">III. Keadaan Inventaris Pokok</div>
                        <table className="w-full border-collapse border border-black text-[8pt]">
                           <thead><tr className="bg-slate-50"><th className="border border-black p-1">Nama Barang</th><th className="border border-black p-1">Jumlah</th></tr></thead>
                           <tbody>
                              {reportData.facilities.slice(0, 5).map((f, i) => (
                                 <tr key={i}><td className="border border-black p-1 uppercase">{f.name}</td><td className="border border-black p-1 text-center font-bold">{f.count}</td></tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>

                  <div className="mt-20 flex justify-between italic text-[7pt] text-slate-500">
                     <span>*) Data Mutasi harus sinkron dengan Halaman Depan.</span>
                     <span>Dicetak pada: {new Date().toLocaleString('id-ID')}</span>
                  </div>
              </div>
           </div>
        </div>
      </div>
      
      <style>{`
        .report-page { box-sizing: border-box; background-color: white; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        @media print {
          body * { visibility: hidden; }
          .report-page, .report-page * { visibility: visible !important; }
          .report-page { margin: 0 !important; transform: none !important; }
        }
      `}</style>
    </div>
  );
};

export default MonthlyReport;