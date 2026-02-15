
import React, { useState, useEffect, useRef } from 'react';
import { ClipboardCheck, Printer, Save, Sparkles, Loader2, ChevronLeft, ChevronRight, Activity, Users, Building2, Package, GraduationCap, ClipboardList, Info, ZoomIn, ZoomOut, Plus, Trash2, FileText, Layout, UserCog, ListChecks, Calendar, Home, History } from 'lucide-react';
import { subscribeToConfig, subscribeToStaff, saveMonthlyReport, subscribeToMonthlyReport, StaffMember, subscribeToAttendance, saveStaff } from '../services/storage';
import { SchoolConfig, MonthlyReport as IMonthlyReport, Mail, MailType, StudentRow } from '../types';
import { format, getDaysInMonth } from 'date-fns';
import { id } from 'date-fns/locale/id';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const createEmptyRow = (): StudentRow => ({ l: [0, 0, 0, 0, 0, 0], p: [0, 0, 0, 0, 0, 0] });

const MonthlyReport: React.FC = () => {
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'siswa' | 'pegawai' | 'sarpras' | 'umum'>('siswa');
  const [pegawaiSubTab, setPegawaiSubTab] = useState<'ringkasan' | 'detail'>('ringkasan');
  const [currentPage, setCurrentPage] = useState<1 | 2>(1);
  
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [scale, setScale] = useState(0.65);
  
  const reportRef1 = useRef<HTMLDivElement>(null);
  const reportRef2 = useRef<HTMLDivElement>(null);

  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, any>>({});

  const [reportData, setReportData] = useState<IMonthlyReport>({
    id: '', month, year,
    studentMatrix: {
      wniAsli: createEmptyRow(), wniTionghoa: createEmptyRow(), wniArab: createEmptyRow(), wniLain: createEmptyRow(),
      agamaIslam: createEmptyRow(), agamaKatolik: createEmptyRow(), agamaProtestan: createEmptyRow(), agamaHindu: createEmptyRow(), agamaBudha: createEmptyRow()
    },
    classCondition: { baik: 0, rusakRingan: 0, rusakBerat: 0 },
    studentAge: { under7: 0, age7_12: 0, over12: 0 },
    staffData: {
      'Kepala Sekolah': { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0 },
      'Guru Kelas': { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0 },
      'Guru Agama': { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0 },
      'Guru Penjas': { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0 },
      'TU / Operator': { pnsL: 0, pnsP: 0, nonPnsL: 0, nonPnsP: 0 }
    },
    effectiveDays: 25, absentSakit: 0, absentIjin: 0, absentAlfa: 0,
    graduates: { l: 0, p: 0 },
    facilities: [
      { name: 'Bangku Siswa', count: 120 }, { name: 'Meja Siswa', count: 60 }, { name: 'Papan Tulis', count: 6 }
    ],
    infrastructureNote: 'Kondisi sarpras layak.',
    summaryNarrative: '',
    createdAt: new Date().toISOString()
  });

  useEffect(() => {
    const unsubscribeConfig = subscribeToConfig(setConfig);
    const unsubscribeStaff = subscribeToStaff(setAllStaff);
    const unsubscribeReport = subscribeToMonthlyReport(year, month, (data) => {
      if (data) setReportData(data);
    });
    const unsubscribeAttendance = subscribeToAttendance(year, month, 'reg', (data) => {
        if (data) setAttendanceData(prev => ({ ...prev, ...data.attendance }));
    });
    return () => { 
      unsubscribeConfig(); 
      unsubscribeStaff(); 
      unsubscribeReport(); 
      unsubscribeAttendance(); 
    };
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

  const handleStaffDetailChange = async (staffId: string, field: string, value: string) => {
    const staff = allStaff.find(s => s.id === staffId);
    if (staff) {
      const updatedStaff = { ...staff, [field]: value };
      await saveStaff(updatedStaff);
    }
  };

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      await saveMonthlyReport(reportData);
      alert('Laporan Bulanan Berhasil Disimpan.');
    } catch (err) {
      alert('Gagal menyimpan laporan.');
    } finally { setSaveLoading(false); }
  };

  const exportPDF = async () => {
    if (!reportRef1.current || !reportRef2.current) return;
    setLoading(true);
    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [330, 215] });
      const canvas1 = await html2canvas(reportRef1.current, { scale: 2, useCORS: true });
      pdf.addImage(canvas1.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 330, 215);
      pdf.addPage();
      const canvas2 = await html2canvas(reportRef2.current, { scale: 2, useCORS: true });
      pdf.addImage(canvas2.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 330, 215);
      pdf.save(`LaporBulan_${year}_${month + 1}.pdf`);
    } catch (err) {
      alert('Gagal mengekspor PDF.');
    } finally { setLoading(false); }
  };

  const calculateSum = (row: StudentRow, type: 'total_l' | 'total_p' | 'total_row' | 'total_class', classIdx?: number) => {
    if (type === 'total_l') return row.l.reduce((a, b) => a + b, 0);
    if (type === 'total_p') return row.p.reduce((a, b) => a + b, 0);
    if (type === 'total_row') return row.l.reduce((a, b) => a + b, 0) + row.p.reduce((a, b) => a + b, 0);
    if (type === 'total_class' && classIdx !== undefined) return row.l[classIdx] + row.p[classIdx];
    return 0;
  };

  const getStaffAttendance = (staffId: string, status: string) => {
      let count = 0;
      const days = getDaysInMonth(new Date(year, month));
      for(let d = 1; d <= days; d++) {
          if (attendanceData[`${staffId}-${d}`] === status) count++;
      }
      return count || '';
  };

  const filteredStaff = allStaff.filter(s => s.category === 'reg' || s.category === 'pppk');

  const inputClass = "w-full p-2 text-[11px] font-bold border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white";
  const sectionLabel = "text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3";

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-5 rounded-3xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg"><ClipboardCheck size={24} /></div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Laporan Bulanan</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase">F-Sek: Siswa, Ruang Kelas, & Personil ASN/PPPK</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
             <button onClick={() => setCurrentPage(1)} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${currentPage === 1 ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Halaman 1</button>
             <button onClick={() => setCurrentPage(2)} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${currentPage === 2 ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Halaman 2</button>
          </div>
          <button onClick={handleSave} disabled={saveLoading} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-emerald-100 flex items-center gap-2 active:scale-95 transition-transform">
            {saveLoading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Simpan Data
          </button>
          <button onClick={exportPDF} disabled={loading} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-indigo-100 flex items-center gap-2 active:scale-95 transition-transform">
            {loading ? <Loader2 size={16} className="animate-spin"/> : <Printer size={16}/>} Export PDF
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        <div className="w-full xl:w-[450px] shrink-0 space-y-4 print:hidden">
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[750px]">
            <div className="flex bg-slate-50 p-1">
              {(['siswa', 'pegawai', 'sarpras', 'umum'] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                    {t === 'siswa' && <Users size={14} className="mx-auto mb-1"/>}
                    {t === 'pegawai' && <UserCog size={14} className="mx-auto mb-1"/>}
                    {t === 'sarpras' && <Home size={14} className="mx-auto mb-1"/>}
                    {t === 'umum' && <Calendar size={14} className="mx-auto mb-1"/>}
                    {t}
                </button>
              ))}
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-8">
              {activeTab === 'siswa' && (
                <div className="space-y-6">
                  {(Object.entries(reportData.studentMatrix) as [string, StudentRow][]).map(([key, row]) => (
                    <div key={key} className="space-y-3 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{key.replace(/([A-Z])/g, ' $1')}</label>
                      <div className="grid grid-cols-6 gap-2">
                        {row.l.map((val, idx) => (
                          <div key={`l-${idx}`} className="space-y-1 text-center">
                            <span className="text-[8px] font-black text-slate-400">K{idx+1} L</span>
                            <input type="number" value={val} onChange={(e) => updateMatrix(key as any, 'l', idx, e.target.value)} className="w-full p-2 text-xs font-bold border rounded-lg text-center focus:ring-1 focus:ring-indigo-300" />
                          </div>
                        ))}
                        {row.p.map((val, idx) => (
                          <div key={`p-${idx}`} className="space-y-1 text-center">
                            <span className="text-[8px] font-black text-rose-400">K{idx+1} P</span>
                            <input type="number" value={val} onChange={(e) => updateMatrix(key as any, 'p', idx, e.target.value)} className="w-full p-2 text-xs font-bold border rounded-lg text-center bg-rose-50/50 focus:ring-1 focus:ring-rose-300" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {activeTab === 'pegawai' && (
                <div className="space-y-6">
                  <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
                    <button onClick={() => setPegawaiSubTab('ringkasan')} className={`flex-1 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${pegawaiSubTab === 'ringkasan' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Halaman 1 (Total)</button>
                    <button onClick={() => setPegawaiSubTab('detail')} className={`flex-1 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${pegawaiSubTab === 'detail' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Halaman 2 (ASN/PPPK)</button>
                  </div>

                  {pegawaiSubTab === 'ringkasan' ? (
                    <div className="space-y-4">
                      {(Object.entries(reportData.staffData) as [string, { pnsL: number, pnsP: number, nonPnsL: number, nonPnsP: number }][]).map(([job, data]) => (
                        <div key={job} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                          <p className="text-[10px] font-black text-slate-700 uppercase">{job}</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <span className="text-[9px] font-black text-slate-400 uppercase">PNS/PPPK</span>
                              <div className="flex gap-2">
                                <input type="number" value={data.pnsL} onChange={(e) => setReportData(prev => ({ ...prev, staffData: { ...prev.staffData, [job]: { ...data, pnsL: parseInt(e.target.value)||0 }}}))} className="w-full p-2 text-xs border rounded-lg" placeholder="L"/>
                                <input type="number" value={data.pnsP} onChange={(e) => setReportData(prev => ({ ...prev, staffData: { ...prev.staffData, [job]: { ...data, pnsP: parseInt(e.target.value)||0 }}})} className="w-full p-2 text-xs border rounded-lg bg-rose-50" placeholder="P"/>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <span className="text-[9px] font-black text-slate-400 uppercase">HONORER</span>
                              <div className="flex gap-2">
                                <input type="number" value={data.nonPnsL} onChange={(e) => setReportData(prev => ({ ...prev, staffData: { ...prev.staffData, [job]: { ...data, nonPnsL: parseInt(e.target.value)||0 }}})} className="w-full p-2 text-xs border rounded-lg" placeholder="L"/>
                                <input type="number" value={data.nonPnsP} onChange={(e) => setReportData(prev => ({ ...prev, staffData: { ...prev.staffData, [job]: { ...data, nonPnsP: parseInt(e.target.value)||0 }}})} className="w-full p-2 text-xs border rounded-lg bg-rose-50" placeholder="P"/>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {filteredStaff.map((staff) => (
                        <div key={staff.id} className="p-5 bg-slate-50 rounded-3xl border border-indigo-100 space-y-4">
                          <p className="text-[11px] font-black text-indigo-700 uppercase tracking-tight leading-tight">{staff.name}</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                               <label className="text-[8px] font-black text-slate-400 uppercase">TTL</label>
                               <input value={(staff as any).birthPlaceDate || ''} onChange={(e) => handleStaffDetailChange(staff.id, 'birthPlaceDate', e.target.value)} className={inputClass} placeholder="Cth: Kediri, 01-01-1980" />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[8px] font-black text-slate-400 uppercase">Pangkat/Gol</label>
                               <input value={(staff as any).pangkat || ''} onChange={(e) => handleStaffDetailChange(staff.id, 'pangkat', e.target.value)} className={inputClass} placeholder="Cth: Pembina IV/a" />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[8px] font-black text-slate-400 uppercase">TMT CPNS</label>
                               <input value={(staff as any).tmtCpns || ''} onChange={(e) => handleStaffDetailChange(staff.id, 'tmtCpns', e.target.value)} className={inputClass} placeholder="01/01/2000" />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[8px] font-black text-slate-400 uppercase">TMT Golongan</label>
                               <input value={(staff as any).tmtGol || ''} onChange={(e) => handleStaffDetailChange(staff.id, 'tmtGol', e.target.value)} className={inputClass} placeholder="01/01/2020" />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[8px] font-black text-slate-400 uppercase">Masa Kerja</label>
                               <input value={(staff as any).masaKerja || ''} onChange={(e) => handleStaffDetailChange(staff.id, 'masaKerja', e.target.value)} className={inputClass} placeholder="15 Th 2 Bl" />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[8px] font-black text-slate-400 uppercase">Pendidikan</label>
                               <input value={(staff as any).pendidikan || ''} onChange={(e) => handleStaffDetailChange(staff.id, 'pendidikan', e.target.value)} className={inputClass} placeholder="S1/2005" />
                            </div>
                            <div className="space-y-1 col-span-2">
                               <label className="text-[8px] font-black text-slate-400 uppercase">Nomor HP Aktif</label>
                               <input value={(staff as any).hp || ''} onChange={(e) => handleStaffDetailChange(staff.id, 'hp', e.target.value)} className={inputClass} placeholder="08xxxxxxxx" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'sarpras' && (
                <div className="space-y-6">
                   <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                      <p className={sectionLabel}>B. Kondisi Ruang Kelas</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold uppercase">Baik</label>
                          <input type="number" value={reportData.classCondition.baik} onChange={(e) => setReportData(prev => ({ ...prev, classCondition: { ...prev.classCondition, baik: parseInt(e.target.value)||0 } }))} className={inputClass} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold uppercase">Rsk. Ringan</label>
                          <input type="number" value={reportData.classCondition.rusakRingan} onChange={(e) => setReportData(prev => ({ ...prev, classCondition: { ...prev.classCondition, rusakRingan: parseInt(e.target.value)||0 } }))} className={inputClass} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold uppercase">Rsk. Berat</label>
                          <input type="number" value={reportData.classCondition.rusakBerat} onChange={(e) => setReportData(prev => ({ ...prev, classCondition: { ...prev.classCondition, rusakBerat: parseInt(e.target.value)||0 } }))} className={inputClass} />
                        </div>
                      </div>
                   </div>

                   <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <p className={sectionLabel}>G. Inventaris Sarpras</p>
                        <button onClick={() => setReportData(prev => ({ ...prev, facilities: [...prev.facilities, { name: 'Barang Baru', count: 0 }] }))} className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"><Plus size={14}/></button>
                      </div>
                      {reportData.facilities.map((f, i) => (
                        <div key={i} className="flex gap-2 items-center group">
                          <input value={f.name} onChange={(e) => {
                            const newF = [...reportData.facilities]; 
                            newF[i] = { ...newF[i], name: e.target.value };
                            setReportData(prev => ({ ...prev, facilities: newF }));
                          }} className="flex-1 p-2 text-xs border rounded-lg bg-white" />
                          <input type="number" value={f.count} onChange={(e) => {
                            const newF = [...reportData.facilities]; 
                            newF[i] = { ...newF[i], count: parseInt(e.target.value)||0 };
                            setReportData(prev => ({ ...prev, facilities: newF }));
                          }} className="w-16 p-2 text-xs border rounded-lg text-center bg-white font-bold" />
                          <button onClick={() => setReportData(prev => ({ ...prev, facilities: reportData.facilities.filter((_, idx) => idx !== i) }))} className="opacity-0 group-hover:opacity-100 text-rose-500 p-1"><Trash2 size={14}/></button>
                        </div>
                      ))}
                   </div>
                </div>
              )}

              {activeTab === 'umum' && (
                <div className="space-y-6">
                   <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                      <p className={sectionLabel}>C. Usia Peserta Didik</p>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] font-bold flex-1 uppercase tracking-tight">{'<'} 7 Tahun</span>
                           <input type="number" value={reportData.studentAge.under7} onChange={(e) => setReportData(prev => ({ ...prev, studentAge: { ...prev.studentAge, under7: parseInt(e.target.value)||0 } }))} className="w-24 p-2 text-xs border rounded-lg bg-white text-center" />
                        </div>
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] font-bold flex-1 uppercase tracking-tight">7 - 12 Tahun</span>
                           <input type="number" value={reportData.studentAge.age7_12} onChange={(e) => setReportData(prev => ({ ...prev, studentAge: { ...prev.studentAge, age7_12: parseInt(e.target.value)||0 } }))} className="w-24 p-2 text-xs border rounded-lg bg-white text-center" />
                        </div>
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] font-bold flex-1 uppercase tracking-tight">{'>'} 12 Tahun</span>
                           <input type="number" value={reportData.studentAge.over12} onChange={(e) => setReportData(prev => ({ ...prev, studentAge: { ...prev.studentAge, over12: parseInt(e.target.value)||0 } }))} className="w-24 p-2 text-xs border rounded-lg bg-white text-center" />
                        </div>
                      </div>
                   </div>

                   <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                      <p className={sectionLabel}>E. Absensi Siswa & Efektifitas</p>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] font-bold flex-1 uppercase">Hari Efektif</span>
                           <input type="number" value={reportData.effectiveDays} onChange={(e) => setReportData(prev => ({ ...prev, effectiveDays: parseInt(e.target.value)||0 }))} className="w-24 p-2 text-xs border rounded-lg bg-white text-center font-bold text-indigo-600" />
                        </div>
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] font-bold flex-1 uppercase">Sakit</span>
                           <input type="number" value={reportData.absentSakit} onChange={(e) => setReportData(prev => ({ ...prev, absentSakit: parseInt(e.target.value)||0 }))} className="w-24 p-2 text-xs border rounded-lg bg-white text-center" />
                        </div>
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] font-bold flex-1 uppercase">Ijin</span>
                           <input type="number" value={reportData.absentIjin} onChange={(e) => setReportData(prev => ({ ...prev, absentIjin: parseInt(e.target.value)||0 }))} className="w-24 p-2 text-xs border rounded-lg bg-white text-center" />
                        </div>
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] font-bold flex-1 uppercase">Alfa</span>
                           <input type="number" value={reportData.absentAlfa} onChange={(e) => setReportData(prev => ({ ...prev, absentAlfa: parseInt(e.target.value)||0 }))} className="w-24 p-2 text-xs border rounded-lg bg-white text-center" />
                        </div>
                      </div>
                   </div>

                   <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                      <p className={sectionLabel}>F. Data Kelulusan</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                           <label className="text-[8px] font-bold uppercase">Lulus L</label>
                           <input type="number" value={reportData.graduates.l} onChange={(e) => setReportData(prev => ({ ...prev, graduates: { ...prev.graduates, l: parseInt(e.target.value)||0 } }))} className={inputClass} />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[8px] font-bold uppercase">Lulus P</label>
                           <input type="number" value={reportData.graduates.p} onChange={(e) => setReportData(prev => ({ ...prev, graduates: { ...prev.graduates, p: parseInt(e.target.value)||0 } }))} className={inputClass} />
                        </div>
                      </div>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 bg-slate-100 rounded-[3rem] p-10 overflow-x-auto flex flex-col items-center min-h-[900px]">
          <div className="flex gap-2 mb-6 print:hidden sticky top-0 z-20 bg-slate-100/50 p-2 rounded-2xl backdrop-blur-sm shadow-sm border border-slate-200">
            <button onClick={() => setScale(s => Math.max(0.3, s - 0.05))} className="p-2 bg-white rounded-lg border shadow-sm text-slate-400 hover:text-indigo-600 transition-colors"><ZoomIn size={18}/></button>
            <button onClick={() => setScale(0.65)} className="px-5 bg-white rounded-lg border shadow-sm text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition-colors">Normal</button>
            <button onClick={() => setScale(s => Math.min(1.2, s + 0.05))} className="p-2 bg-white rounded-lg border shadow-sm text-slate-400 hover:text-indigo-600 transition-colors"><ZoomOut size={18}/></button>
          </div>

          <div className="relative flex flex-col gap-10">
            <div 
                ref={reportRef1}
                className={`monthly-report-paper bg-white text-black font-sans flex flex-col origin-top shadow-2xl print:shadow-none ${currentPage === 1 ? 'block' : 'hidden lg:block opacity-40 grayscale pointer-events-none'}`}
                style={{ width: '330mm', minHeight: '215mm', padding: '10mm 15mm', transform: `scale(${scale})` }}
            >
                <div className="grid grid-cols-[1fr_1fr] gap-10 mb-2 text-[8pt] border-b-[1.5pt] border-black pb-2 items-center">
                    <div className="grid grid-cols-[120px_1fr] gap-x-2">
                      <span>NAMA LEMBAGA</span> <span className="font-bold uppercase tracking-tight">: {config.name}</span>
                      <span>ALAMAT</span> <span className="uppercase tracking-tight text-[7pt]">: {config.address}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-x-2 text-right">
                      <span>NPSN</span> <span className="font-bold">: {config.npsn}</span>
                      <span>BULAN / TAHUN</span> <span className="font-bold uppercase">: {format(new Date(year, month, 1), 'MMMM yyyy', { locale: id })}</span>
                    </div>
                </div>

                <div className="text-center bg-slate-900 text-white border border-black py-1 font-bold text-[9pt] uppercase mb-4 tracking-[0.3em]">LAPORAN BULANAN SEKOLAH DASAR (HALAMAN 1)</div>

                <div className="mb-4">
                <div className="bg-slate-100 border-x border-t border-black px-2 py-0.5 font-bold text-[8pt] uppercase">A. DATA PESERTA DIDIK (KEWARGANEGARAAN & AGAMA)</div>
                <table className="w-full border-collapse border-[1pt] border-black text-[7pt] text-center table-fixed">
                    <thead>
                        <tr className="bg-slate-50">
                          <th className="border border-black w-28" rowSpan={2}>KEWARGANEGARAAN</th>
                          {[1,2,3,4,5,6].map(k => <th key={k} className="border border-black" colSpan={3}>KLS {k}</th>)}
                          <th className="border border-black" colSpan={3}>JUMLAH TOTAL</th>
                        </tr>
                        <tr className="bg-slate-50 text-[6pt]">
                          {[...Array(7)].map((_, i) => (
                              <React.Fragment key={i}>
                                  <th className="border border-black">L</th>
                                  <th className="border border-black">P</th>
                                  <th className="border border-black bg-slate-100">JML</th>
                              </React.Fragment>
                          ))}
                        </tr>
                    </thead>
                    <tbody>
                        {[
                          { label: 'WNI Asli', key: 'wniAsli' },
                          { label: 'WNI Tionghoa', key: 'wniTionghoa' },
                          { label: 'WNI Arab', key: 'wniArab' },
                          { label: 'WNI Lain-lain', key: 'wniLain' }
                        ].map((row, idx) => (
                        <tr key={idx} className="h-6">
                            <td className="border border-black text-left px-2 font-bold uppercase">{row.label}</td>
                            {[0,1,2,3,4,5].map(c => (
                                <React.Fragment key={c}>
                                  <td className="border border-black">{(reportData.studentMatrix[row.key as keyof IMonthlyReport['studentMatrix']] as StudentRow).l[c]}</td>
                                  <td className="border border-black">{(reportData.studentMatrix[row.key as keyof IMonthlyReport['studentMatrix']] as StudentRow).p[c]}</td>
                                  <td className="border border-black bg-slate-50 font-bold">{calculateSum(reportData.studentMatrix[row.key as keyof IMonthlyReport['studentMatrix']] as StudentRow, 'total_class', c)}</td>
                                </React.Fragment>
                            ))}
                            <td className="border border-black bg-slate-100 font-bold">{calculateSum(reportData.studentMatrix[row.key as keyof IMonthlyReport['studentMatrix']] as StudentRow, 'total_l')}</td>
                            <td className="border border-black bg-slate-100 font-bold">{calculateSum(reportData.studentMatrix[row.key as keyof IMonthlyReport['studentMatrix']] as StudentRow, 'total_p')}</td>
                            <td className="border border-black bg-slate-200 font-bold">{calculateSum(reportData.studentMatrix[row.key as keyof IMonthlyReport['studentMatrix']] as StudentRow, 'total_row')}</td>
                        </tr>
                        ))}
                    </tbody>
                </table>
                </div>

                <div className="grid grid-cols-[300px_300px_1fr] gap-4 items-start">
                    <div className="space-y-3">
                      <div>
                        <div className="bg-slate-900 text-white border border-black px-2 py-0.5 text-[7pt] font-black uppercase">D. STATUS KEPEGAWAIAN (TOTAL)</div>
                        <table className="w-full border-collapse border border-black text-[6pt] text-center table-fixed">
                            <thead className="bg-slate-50">
                                <tr>
                                  <th className="border border-black" rowSpan={2}>JABATAN</th>
                                  <th className="border border-black" colSpan={2}>ASN/PPPK</th>
                                  <th className="border border-black" colSpan={2}>HONORER</th>
                                  <th className="border border-black" rowSpan={2}>JML</th>
                                </tr>
                                <tr className="text-[5pt]">
                                  <th className="border border-black">L</th><th className="border border-black">P</th>
                                  <th className="border border-black">L</th><th className="border border-black">P</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(Object.entries(reportData.staffData) as [string, { pnsL: number, pnsP: number, nonPnsL: number, nonPnsP: number }][]).map(([job, d]) => (
                                <tr key={job} className="h-5">
                                    <td className="border border-black px-1 uppercase font-bold text-left truncate">{job}</td>
                                    <td className="border border-black">{d.pnsL}</td><td className="border border-black">{d.pnsP}</td>
                                    <td className="border border-black">{d.nonPnsL}</td><td className="border border-black">{d.nonPnsP}</td>
                                    <td className="border border-black font-bold bg-slate-100">{d.pnsL + d.pnsP + d.nonPnsL + d.nonPnsP}</td>
                                </tr>
                                ))}
                            </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="bg-slate-900 text-white border border-black px-2 py-0.5 text-[7pt] font-black uppercase">B. KONDISI RUANG KELAS</div>
                        <table className="w-full border-collapse border border-black text-[7pt] text-center table-fixed">
                            <thead className="bg-slate-50"><tr><th className="border border-black">BAIK</th><th className="border border-black">RSK RGN</th><th className="border border-black">RSK BRT</th><th className="border border-black font-bold">TOTAL</th></tr></thead>
                            <tbody>
                                <tr className="h-6 font-bold">
                                  <td className="border border-black">{reportData.classCondition.baik}</td>
                                  <td className="border border-black">{reportData.classCondition.rusakRingan}</td>
                                  <td className="border border-black">{reportData.classCondition.rusakBerat}</td>
                                  <td className="border border-black bg-slate-100">{reportData.classCondition.baik + reportData.classCondition.rusakRingan + reportData.classCondition.rusakBerat}</td>
                                </tr>
                            </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex flex-col h-full border border-black p-4">
                       <div className="mt-4 text-[8.5pt] text-center font-serif leading-tight ml-auto w-[250px]">
                          <p>Kediri, {format(new Date(), 'dd MMMM yyyy', { locale: id })}</p>
                          <p className="mt-1 font-bold">Kepala Sekolah</p>
                          <div className="h-16"></div>
                          <p className="font-bold underline uppercase tracking-tight">{config.principalName}</p>
                          <p className="text-[7.5pt]">NIP. {config.principalNip}</p>
                       </div>
                    </div>
                </div>
            </div>

            <div 
                ref={reportRef2}
                className={`monthly-report-paper bg-white text-black font-sans flex flex-col origin-top shadow-2xl print:shadow-none ${currentPage === 2 ? 'block' : 'hidden lg:block opacity-40 grayscale pointer-events-none'}`}
                style={{ width: '330mm', minHeight: '215mm', padding: '10mm 15mm', transform: `scale(${scale})` }}
            >
                <div className="grid grid-cols-[1fr_1fr] gap-10 mb-2 text-[8pt] border-b-[1.5pt] border-black pb-2 items-center">
                    <div className="grid grid-cols-[120px_1fr] gap-x-2">
                        <span>NAMA LEMBAGA</span> <span className="font-bold uppercase tracking-tight">: {config.name}</span>
                        <span>BULAN / TAHUN</span> <span className="font-bold uppercase">: {format(new Date(year, month, 1), 'MMMM yyyy', { locale: id })}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-x-2 text-right">
                        <span>KECAMATAN</span> <span className="font-bold uppercase">: PESANTREN</span>
                        <span>KOTA / PROV</span> <span className="font-bold uppercase">: KEDIRI / JAWA TIMUR</span>
                    </div>
                </div>

                <div className="text-center bg-black text-white border border-black py-1.5 font-bold text-[10pt] uppercase mb-4 tracking-[0.4em]">DATA PENDIDIK DAN TENAGA KEPENDIDIKAN (ASN & PPPK)</div>

                <div className="flex-1 overflow-hidden">
                    <table className="w-full border-collapse border-[1.2pt] border-black text-[6pt] text-center table-fixed">
                        <thead>
                            <tr className="bg-slate-100 font-bold uppercase h-10">
                                <th className="border border-black w-7" rowSpan={2}>NO</th>
                                <th className="border border-black w-44" rowSpan={2}>NAMA LENGKAP</th>
                                <th className="border border-black w-36" rowSpan={2}>TEMPAT, TGL. LAHIR</th>
                                <th className="border border-black w-36" rowSpan={2}>NIP / NI PPPK</th>
                                <th className="border border-black w-32" rowSpan={2}>PANGKAT / GOLONGAN</th>
                                <th className="border border-black w-24" rowSpan={2}>TMT CPNS</th>
                                <th className="border border-black w-24" rowSpan={2}>TMT GOL</th>
                                <th className="border border-black w-24" rowSpan={2}>MASA KERJA</th>
                                <th className="border border-black w-32" rowSpan={2}>JABATAN</th>
                                <th className="border border-black w-32" rowSpan={2}>PENDIDIKAN / TAHUN</th>
                                <th className="border border-black w-32" rowSpan={2}>NOMOR HP</th>
                                <th className="border border-black" colSpan={6}>KETIDAKHADIRAN (HARI)</th>
                            </tr>
                            <tr className="bg-slate-100 font-bold text-[5pt] uppercase h-6">
                                <th className="border border-black w-6 text-rose-600">S</th>
                                <th className="border border-black w-6 text-amber-600">I</th>
                                <th className="border border-black w-6 text-red-700">A</th>
                                <th className="border border-black w-6">CH</th>
                                <th className="border border-black w-6">CD</th>
                                <th className="border border-black w-6 text-indigo-600">DL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStaff.map((staff, idx) => (
                                <tr key={staff.id} className="h-10">
                                    <td className="border border-black font-bold">{idx + 1}</td>
                                    <td className="border border-black text-left px-1.5 font-bold uppercase leading-tight truncate">{staff.name}</td>
                                    <td className="border border-black uppercase text-[5.5pt]">{(staff as any).birthPlaceDate || '-'}</td>
                                    <td className="border border-black font-mono text-[6.5pt]">{staff.nip || '-'}</td>
                                    <td className="border border-black uppercase leading-tight">{(staff as any).pangkat || '-'}</td>
                                    <td className="border border-black">{(staff as any).tmtCpns || '-'}</td>
                                    <td className="border border-black">{(staff as any).tmtGol || '-'}</td>
                                    <td className="border border-black uppercase">{(staff as any).masaKerja || '-'}</td>
                                    <td className="border border-black uppercase leading-tight truncate">{staff.rank || '-'}</td>
                                    <td className="border border-black uppercase text-[5.5pt]">{(staff as any).pendidikan || '-'}</td>
                                    <td className="border border-black font-mono text-[5.5pt]">{(staff as any).hp || '-'}</td>
                                    <td className="border border-black font-bold text-rose-600 bg-rose-50/20">{getStaffAttendance(staff.id, 'S')}</td>
                                    <td className="border border-black font-bold text-amber-600 bg-amber-50/20">{getStaffAttendance(staff.id, 'I')}</td>
                                    <td className="border border-black font-bold text-red-700 bg-red-50/20">{getStaffAttendance(staff.id, 'A')}</td>
                                    <td className="border border-black font-bold">{getStaffAttendance(staff.id, 'C')}</td>
                                    <td className="border border-black"></td>
                                    <td className="border border-black font-bold text-indigo-600 bg-indigo-50/20">{getStaffAttendance(staff.id, 'DL')}</td>
                                </tr>
                            ))}
                            {[...Array(Math.max(0, 14 - filteredStaff.length))].map((_, i) => (
                                <tr key={`empty-${i}`} className="h-10">
                                    {[...Array(17)].map((_, j) => <td key={j} className="border border-black"></td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex justify-end">
                    <div className="text-center w-[250px] text-[8.5pt]">
                        <p>Kediri, {format(new Date(), 'dd MMMM yyyy', { locale: id })}</p>
                        <p className="font-bold mt-1">Kepala Sekolah</p>
                        <div className="h-14"></div>
                        <p className="font-bold underline uppercase tracking-tight">{config.principalName}</p>
                        <p className="text-[7.5pt]">NIP. {config.principalNip}</p>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .monthly-report-paper { box-sizing: border-box; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        @media print {
          body * { visibility: hidden; }
          .monthly-report-paper, .monthly-report-paper * { visibility: visible !important; }
          .monthly-report-paper { 
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
