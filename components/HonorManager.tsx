
import React, { useState, useEffect, useRef } from 'react';
import { 
  Coins, Printer, Loader2, Save, Music, Hammer, ChevronLeft, 
  ZoomIn, ZoomOut, QrCode, Sparkles, Zap, Trash2, ShieldCheck, 
  TrendingUp, Activity, CreditCard, Banknote, PenTool, CheckCircle,
  ToggleLeft, ToggleRight, Info, UserCheck, ChevronDown, MapPin, Search, UserMinus, UserPlus,
  Users, Percent, Hash, FileText, PieChart
} from 'lucide-react';
import { subscribeToConfig, subscribeToStaff, StaffMember, saveMail, subscribeToAttendance } from '../services/storage';
import { analyzePayroll } from '../services/geminiService';
import { SchoolConfig, Mail, MailType, MailStatus, UrgencyLevel } from '../types';
import { format, getDaysInMonth } from 'date-fns';
import { id } from 'date-fns/locale/id';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

type Category = 'extra' | 'tukang' | 'sppd';

const HonorManager: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>('extra');
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [rates, setRates] = useState<Record<string, number>>({});
  const [manualVolumes, setManualVolumes] = useState<Record<string, number>>({});
  const [taxTiers, setTaxTiers] = useState<Record<string, number>>({});
  const [bulkRate, setBulkRate] = useState('');
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});
  const [isTaxActive, setIsTaxActive] = useState(true);
  
  const [selectedSppdStaffIds, setSelectedSppdStaffIds] = useState<string[]>([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedBendahara, setSelectedBendahara] = useState<StaffMember | null>(null);
  
  const [saveLoading, setSaveLoading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [scale, setScale] = useState(0.85);
  const receiptRef = useRef<HTMLDivElement>(null);

  const DEFAULT_TAX_RATE = 0.05;

  useEffect(() => {
    const unsubscribeConfig = subscribeToConfig(setConfig);
    const unsubscribeStaff = subscribeToStaff(setAllStaff);
    return () => { unsubscribeConfig(); unsubscribeStaff(); };
  }, []);

  useEffect(() => {
    if (!selectedBendahara && allStaff.length > 0) {
      const candidate = allStaff.find(s => s.category === 'reg' || s.category === 'pppk');
      if (candidate) setSelectedBendahara(candidate);
    }
  }, [allStaff, selectedBendahara]);

  useEffect(() => {
    if (activeCategory === 'tukang') {
      setIsTaxActive(false); 
    } else {
      setIsTaxActive(true);
    }
  }, [activeCategory]);

  useEffect(() => {
    const unsubscribe = subscribeToAttendance(year, month, activeCategory, (data) => {
      if (data) setAttendanceData(data.attendance || {});
      else setAttendanceData({});
    });
    return () => unsubscribe();
  }, [year, month, activeCategory]);

  const currentStaffList = activeCategory === 'sppd' 
    ? allStaff.filter(s => (s.category === 'reg' || s.category === 'pppk') && selectedSppdStaffIds.includes(s.id))
    : allStaff.filter(s => s.category === activeCategory);
  
  const treasurerCandidates = allStaff.filter(s => s.category === 'reg' || s.category === 'pppk');

  const getAttendanceCount = (staffId: string) => {
    if (manualVolumes[staffId] !== undefined) return manualVolumes[staffId];
    let count = 0;
    const days = getDaysInMonth(new Date(year, month));
    for (let d = 1; d <= days; d++) {
      if (attendanceData[`${staffId}-${d}`] === 'P') count++;
    }
    return count;
  };

  const toggleSppdStaff = (id: string) => {
    setSelectedSppdStaffIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleRateChange = (staffId: string, val: string) => {
    setRates({ ...rates, [staffId]: parseInt(val) || 0 });
  };

  const handleVolumeChange = (staffId: string, val: string) => {
    setManualVolumes({ ...manualVolumes, [staffId]: parseInt(val) || 0 });
  };

  const handleTaxTierChange = (staffId: string, tier: number) => {
    setTaxTiers({ ...taxTiers, [staffId]: tier });
  };

  const applyBulkRate = () => {
    const val = parseInt(bulkRate) || 0;
    const newRates = { ...rates };
    currentStaffList.forEach(s => {
      newRates[s.id] = val;
    });
    setRates(newRates);
  };

  const calculateGross = (staffId: string) => getAttendanceCount(staffId) * (rates[staffId] || 0);
  
  const calculateTax = (staffId: string) => {
    if (!isTaxActive) return 0;
    const gross = calculateGross(staffId);
    const tier = taxTiers[staffId] !== undefined ? taxTiers[staffId] : (activeCategory === 'extra' ? DEFAULT_TAX_RATE : 0);
    return Math.floor(gross * tier);
  };

  const calculateNet = (staffId: string) => calculateGross(staffId) - calculateTax(staffId);

  const getTaxBreakdown = () => {
    const breakdown = { p0: 0, p5: 0, p15: 0, p6: 0 };
    currentStaffList.forEach(s => {
      const tier = taxTiers[s.id] ?? (activeCategory === 'extra' ? DEFAULT_TAX_RATE : 0);
      const tax = calculateTax(s.id);
      if (tier === 0) breakdown.p0 += tax;
      else if (tier === 0.05) breakdown.p5 += tax;
      else if (tier === 0.15) breakdown.p15 += tax;
      else if (tier === 0.06) breakdown.p6 += tax;
    });
    return breakdown;
  };

  const handleAiAnalysis = async () => {
    setAiAnalyzing(true);
    const period = format(new Date(year, month, 1), 'MMMM yyyy', { locale: id });
    const payload = {
      category: activeCategory === 'extra' ? 'Ekstrakurikuler' : activeCategory === 'tukang' ? 'Tukang' : 'Transport SPPD',
      period,
      isTaxActive,
      staff: currentStaffList.map(s => ({
        nama: s.name,
        hadir: getAttendanceCount(s.id),
        bruto: calculateGross(s.id),
        pajak: calculateTax(s.id),
        netto: calculateNet(s.id)
      }))
    };
    const result = await analyzePayroll(payload);
    setAiResult(result);
    setAiAnalyzing(false);
  };

  const handleGenerateReceipt = async () => {
    if (!receiptRef.current) return;
    if (!selectedBendahara) {
      alert("Harap pilih Bendahara terlebih dahulu.");
      return;
    }
    
    setSaveLoading(true);
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [330, 215] });
      pdf.addImage(imgData, 'JPEG', 0, 0, 330, 215);
      const pdfDataUri = pdf.output('datauristring');

      const period = format(new Date(year, month, 1), 'MMMM yyyy', { locale: id });
      const catTitle = activeCategory === 'extra' ? 'Honor Ekskul' : activeCategory === 'tukang' ? 'Upah Tukang' : 'Transport SPPD';
      
      const newMail: Mail = {
        id: Date.now().toString(),
        type: MailType.OUTGOING,
        referenceNumber: `${activeCategory.toUpperCase()}/${month+1}/${year}`,
        date: new Date().toISOString().split('T')[0],
        receivedDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        sender: 'Bendahara BOS',
        subject: `Daftar ${catTitle} - ${period}`,
        description: `Rekapitulasi pembayaran ${catTitle.toLowerCase()} bulan ${period}.`,
        category: 'Absensi',
        urgency: UrgencyLevel.LOW,
        status: MailStatus.ARCHIVED,
        fileUrl: pdfDataUri,
      };
      await saveMail(newMail);
      alert('Arsip Berhasil Disimpan.');
      navigate('/outbox');
    } catch (e: any) {
      alert('Gagal: ' + e.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!config) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-indigo-600" /></div>;

  const totalBruto = currentStaffList.reduce((acc, s) => acc + calculateGross(s.id), 0);
  const totalPajak = currentStaffList.reduce((acc, s) => acc + calculateTax(s.id), 0);
  const totalNetto = totalBruto - totalPajak;
  const taxBreakdown = getTaxBreakdown();

  return (
    <div className="space-y-6 animate-fade-in pb-10 bg-[#F8FAFC] min-h-screen p-4 overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2 max-w-[1600px] mx-auto print:hidden">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">Manajemen Keuangan</h2>
          <p className="text-slate-500 font-bold text-sm italic mt-2 opacity-70">Otomatisasi Laporan & Pelaporan Dana BOS.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleAiAnalysis} disabled={aiAnalyzing} className="px-6 py-3.5 bg-white border border-indigo-200 text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm flex items-center gap-2.5 transition-all hover:shadow-md active:scale-95">
            {aiAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-amber-500" />}
            AI Analysis
          </button>
          <button onClick={handlePrint} className="px-6 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2.5 transition-all hover:bg-slate-50 active:scale-95">
            <Printer size={16} /> Print
          </button>
          <button onClick={handleGenerateReceipt} disabled={saveLoading} className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center gap-2.5 transition-all hover:bg-indigo-700 active:scale-95">
            {saveLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Archive
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-[1600px] mx-auto">
        {/* Panel Pengaturan */}
        <div className="lg:col-span-3 space-y-6 print:hidden">
          <div className="bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-7">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Kategori Dokumen</label>
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => setActiveCategory('extra')} className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border ${activeCategory === 'extra' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 border-indigo-700' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`}>
                  <Music size={20} /><span className="text-[9px] font-black uppercase">Ekskul</span>
                </button>
                <button onClick={() => setActiveCategory('tukang')} className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border ${activeCategory === 'tukang' ? 'bg-amber-600 text-white shadow-lg shadow-amber-100 border-amber-700' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`}>
                  <Hammer size={20} /><span className="text-[9px] font-black uppercase">Tukang</span>
                </button>
                <button onClick={() => setActiveCategory('sppd')} className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border ${activeCategory === 'sppd' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100 border-emerald-700' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`}>
                  <MapPin size={20} /><span className="text-[9px] font-black uppercase">SPPD</span>
                </button>
              </div>
            </div>

            {/* Rekapitulasi Pajak */}
            {isTaxActive && currentStaffList.length > 0 && (
              <div className="p-5 bg-rose-50/50 rounded-[2rem] border border-rose-100 space-y-3 animate-fade-in">
                 <div className="flex items-center gap-2.5 mb-1">
                    <PieChart size={16} className="text-rose-600" />
                    <label className="text-[10px] font-black text-rose-800 uppercase tracking-widest block">Rekap PPh 21</label>
                 </div>
                 <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase"><span>Tarif 5%</span><span className="text-rose-600">Rp {taxBreakdown.p5.toLocaleString('id-ID')}</span></div>
                    <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase"><span>Tarif 15%</span><span className="text-rose-600">Rp {taxBreakdown.p15.toLocaleString('id-ID')}</span></div>
                    <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase"><span>Tarif 6%</span><span className="text-rose-600">Rp {taxBreakdown.p6.toLocaleString('id-ID')}</span></div>
                    <div className="pt-2 mt-2 border-t border-rose-100 flex justify-between items-center text-[10px] font-black text-rose-800 uppercase"><span>Total Pajak</span><span>Rp {totalPajak.toLocaleString('id-ID')}</span></div>
                 </div>
              </div>
            )}

            {/* SELEKSI PEGAWAI SPPD */}
            {activeCategory === 'sppd' && (
              <div className="p-5 bg-emerald-50 rounded-[2rem] border border-emerald-100 space-y-4 animate-fade-in">
                <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block flex items-center gap-2.5">
                  <Users size={16} /> Pilih Penerima
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" />
                  <input 
                    type="text" 
                    placeholder="Cari personil..." 
                    value={staffSearch} 
                    onChange={(e) => setStaffSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-emerald-100 rounded-xl text-[11px] font-bold outline-none"
                  />
                </div>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                   {allStaff
                    .filter(s => (s.category === 'reg' || s.category === 'pppk') && s.name.toLowerCase().includes(staffSearch.toLowerCase()))
                    .map(c => {
                      const isSelected = selectedSppdStaffIds.includes(c.id);
                      return (
                        <button 
                          key={c.id} 
                          onClick={() => toggleSppdStaff(c.id)}
                          className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${isSelected ? 'bg-emerald-600 border-emerald-700 text-white shadow-md' : 'bg-white border-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}
                        >
                          <span className="text-[10px] font-black truncate uppercase">{c.name}</span>
                          {isSelected ? <CheckCircle size={14} /> : <UserPlus size={14} className="opacity-30" />}
                        </button>
                      );
                   })}
                </div>
              </div>
            )}

            {/* Pemilihan Bendahara */}
            <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-200/60 space-y-3">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block flex items-center gap-2.5">
                 <UserCheck size={16} className="text-indigo-600" /> Bendahara BOS
               </label>
               <div className="relative">
                  <select 
                    value={selectedBendahara?.id || ''} 
                    onChange={(e) => {
                      const found = treasurerCandidates.find(c => c.id === e.target.value);
                      if (found) setSelectedBendahara(found);
                    }}
                    className="w-full appearance-none px-5 py-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-800 outline-none"
                  >
                    {treasurerCandidates.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
               </div>
            </div>

            <div className="p-5 bg-indigo-50/50 rounded-[2rem] border border-indigo-100 space-y-4">
               <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">Tarif Masal (Rp)</label>
               <div className="flex gap-2.5">
                 <input type="number" value={bulkRate} onChange={(e) => setBulkRate(e.target.value)} className="flex-1 px-4 py-2.5 bg-white border border-indigo-200 rounded-xl text-[11px] font-bold outline-none" placeholder="Cth: 50000" />
                 <button onClick={applyBulkRate} className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 active:scale-95"><Zap size={18}/></button>
               </div>
            </div>

            <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Personil & Nominal</label>
               <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {currentStaffList.map(s => (
                    <div key={s.id} className="p-4 bg-white border border-slate-100 rounded-2xl space-y-4 group hover:border-indigo-200 hover:shadow-md transition-all">
                      <p className="text-[10px] font-black text-slate-800 uppercase truncate">{s.name}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black text-slate-400 uppercase">Tarif</label>
                          <input type="number" value={rates[s.id] || ''} onChange={(e) => handleRateChange(s.id, e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none focus:bg-white focus:border-indigo-300" placeholder="Rp" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black text-indigo-400 uppercase">Trip/Hari</label>
                          <input type="number" value={manualVolumes[s.id] ?? getAttendanceCount(s.id)} onChange={(e) => handleVolumeChange(s.id, e.target.value)} className="w-full px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-[11px] font-black text-indigo-600 outline-none focus:bg-white" />
                        </div>
                      </div>
                      
                      {isTaxActive && (
                        <div className="flex flex-col gap-2 pt-3 border-t border-slate-50">
                          <div className="flex items-center gap-2">
                             <Percent size={12} className="text-indigo-400" />
                             <label className="text-[8px] font-black text-slate-400 uppercase">Golongan Pajak (PPh 21)</label>
                          </div>
                          <select 
                            value={taxTiers[s.id] ?? (activeCategory === 'extra' ? DEFAULT_TAX_RATE : 0)} 
                            onChange={(e) => handleTaxTierChange(s.id, parseFloat(e.target.value))}
                            className="w-full bg-white border border-indigo-100 rounded-xl text-[9px] font-black p-2.5 outline-none uppercase"
                          >
                            <option value={0}>PPh 0% (Gol I, II / PPPK Paruh Waktu)</option>
                            <option value={0.05}>PPh 5% (Gol III / PPPK Penuh)</option>
                            <option value={0.05}>PPh 5% (Non ASN dengan NPWP)</option>
                            <option value={0.15}>PPh 15% (Gol IV)</option>
                            <option value={0.06}>PPh 6% (Non ASN Tanpa NPWP)</option>
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                  {currentStaffList.length === 0 && (
                    <p className="text-[10px] text-slate-400 font-bold italic text-center py-6 bg-slate-50 rounded-2xl">Pilih personil untuk memuat data.</p>
                  )}
               </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
               <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 <span>Total Pembayaran</span>
                 <span className="text-lg text-indigo-600 tracking-tight font-black">Rp {totalNetto.toLocaleString('id-ID')}</span>
               </div>
            </div>
          </div>
        </div>

        {/* Area Preview Dokument - Landscape */}
        <div className="lg:col-span-9 overflow-x-auto bg-[#F1F5F9] rounded-[3rem] p-10 flex justify-center print:bg-white print:p-0 print:block">
           <div 
             ref={receiptRef}
             className="honor-paper-landscape bg-white p-[20mm] text-black font-serif flex flex-col shadow-2xl origin-top print:shadow-none print:transform-none"
             style={{ width: '330mm', minHeight: '215mm', transform: `scale(${scale})` }}
           >
              {/* Kop Surat */}
              <div className="border-b-[4px] border-double border-black pb-5 mb-8 grid grid-cols-[100px_1fr_100px] items-center text-center">
                 <img src={config.logoDaerahUrl} className="w-[85%] h-auto object-contain mx-auto" />
                 <div className="px-4">
                    <h3 className="text-[14pt] uppercase font-bold leading-tight">{config.headerLine1}</h3>
                    <h3 className="text-[14pt] font-bold uppercase leading-tight">{config.headerLine2}</h3>
                    <h1 className="text-[20pt] font-black uppercase my-1.5 tracking-tight">{config.name}</h1>
                    <p className="text-[10pt] font-bold leading-tight">{config.address}</p>
                    <p className="text-[10pt] font-bold italic leading-tight">NPSN: {config.npsn} | Email: {config.email}</p>
                 </div>
                 <img src={config.logoUrl} className="w-[85%] h-auto object-contain mx-auto" />
              </div>

              <div className="text-center mb-10">
                 <h2 className="text-[15pt] font-bold underline uppercase tracking-wider">{activeCategory === 'sppd' ? "DAFTAR PENERIMAAN BIAYA PERJALANAN DINAS (TRANSPORT)" : "DAFTAR PENERIMAAN HONORARIUM"}</h2>
                 <p className="text-[12pt] uppercase tracking-[0.2em] font-bold mt-2">BULAN : {format(new Date(year, month, 1), 'MMMM yyyy', { locale: id })}</p>
              </div>

              <div className="flex-1">
                <table className="w-full border-collapse border-black border-[1.2pt] text-[10pt]">
                   <thead>
                      <tr className="bg-slate-100/50">
                         <th className="border-[1.2pt] border-black p-3 w-[12mm] text-center font-bold">NO</th>
                         <th className="border-[1.2pt] border-black p-3 text-left font-bold">NAMA PENERIMA / NIP</th>
                         <th className="border-[1.2pt] border-black p-3 text-center w-[45mm] font-bold">JABATAN</th>
                         <th className="border-[1.2pt] border-black p-3 text-center w-[25mm] font-bold">{activeCategory === 'sppd' ? 'VOL (TRIP)' : 'VOL (HARI)'}</th>
                         <th className="border-[1.2pt] border-black p-3 text-right w-[40mm] font-bold">HONOR / SATUAN</th>
                         <th className="border-[1.2pt] border-black p-3 text-right w-[40mm] font-bold">BRUTO (Rp)</th>
                         <th className="border-[1.2pt] border-black p-3 text-right w-[35mm] font-bold">PPh21</th>
                         <th className="border-[1.2pt] border-black p-3 text-right w-[40mm] font-bold">JUMLAH (Rp)</th>
                         <th className="border-[1.2pt] border-black p-3 text-center w-[50mm] font-bold">TANDA TANGAN</th>
                      </tr>
                   </thead>
                   <tbody>
                      {currentStaffList.map((s, idx) => {
                        const count = getAttendanceCount(s.id);
                        const rate = rates[s.id] || 0;
                        const gross = calculateGross(s.id);
                        const tax = calculateTax(s.id);
                        const net = calculateNet(s.id);
                        const tier = taxTiers[s.id] ?? (activeCategory === 'extra' ? DEFAULT_TAX_RATE : 0);
                        return (
                          <tr key={s.id} className="h-14">
                             <td className="border-[1.2pt] border-black p-3 text-center font-bold">{idx + 1}</td>
                             <td className="border-[1.2pt] border-black p-3 leading-tight">
                                <span className="font-bold block uppercase text-[10.5pt]">{s.name}</span>
                                <span className="text-[8.5pt] text-slate-600 font-bold">NIP. {s.nip || '-'}</span>
                             </td>
                             <td className="border-[1.2pt] border-black p-3 text-center text-[9.5pt] uppercase leading-tight">
                                {s.rank || '-'}
                             </td>
                             <td className="border-[1.2pt] border-black p-3 text-center font-bold text-[10.5pt]">{count}</td>
                             <td className="border-[1.2pt] border-black p-3 text-right">{rate.toLocaleString('id-ID')}</td>
                             <td className="border-[1.2pt] border-black p-3 text-right">{gross.toLocaleString('id-ID')}</td>
                             <td className="border-[1.2pt] border-black p-3 text-right italic font-bold">
                                {isTaxActive ? (
                                  <>
                                    {tax > 0 ? `(${tax.toLocaleString('id-ID')})` : '0'}
                                    {tier > 0 && <span className="text-[7pt] block font-black opacity-60">({tier * 100}%)</span>}
                                  </>
                                ) : '0'}
                             </td>
                             <td className="border-[1.2pt] border-black p-3 text-right font-bold">{net.toLocaleString('id-ID')}</td>
                             <td className="border-[1.2pt] border-black p-3 text-left relative overflow-hidden">
                                <span className="text-[7.5pt] font-bold absolute top-1.5 left-2">{idx + 1}.</span>
                                {idx % 2 !== 0 && <span className="block h-full w-2 border-l border-slate-300 mx-auto"></span>}
                             </td>
                          </tr>
                        );
                      })}
                      {currentStaffList.length === 0 && (
                        <tr>
                          <td colSpan={9} className="border-[1.2pt] border-black p-16 text-center italic text-slate-400 font-bold uppercase tracking-widest">Silakan pilih personil untuk memuat data.</td>
                        </tr>
                      )}
                      {currentStaffList.length > 0 && (
                        <tr className="bg-slate-100/50 font-bold h-14">
                           <td className="border-[1.2pt] border-black p-4 text-center uppercase tracking-widest" colSpan={5}>JUMLAH TOTAL</td>
                           <td className="border-[1.2pt] border-black p-4 text-right">{totalBruto.toLocaleString('id-ID')}</td>
                           <td className="border-[1.2pt] border-black p-4 text-right">({totalPajak.toLocaleString('id-ID')})</td>
                           <td className="border-[1.2pt] border-black p-4 text-right underline decoration-2">{totalNetto.toLocaleString('id-ID')}</td>
                           <td className="border-[1.2pt] border-black p-4 bg-white"></td>
                        </tr>
                      )}
                   </tbody>
                </table>
              </div>

              {/* Tanda Tangan */}
              <div className="mt-16 grid grid-cols-2 text-[11pt] leading-snug font-serif px-10">
                 <div className="text-center w-[280px]">
                    <div className="h-[1.5em] mb-1"></div>
                    <p className="mb-8">Mengetahui,</p>
                    <p className="font-bold uppercase tracking-tight">Kepala Sekolah {config.name}</p>
                    <div className="h-[30mm] flex items-center justify-center my-2"></div>
                    <p className="font-bold underline uppercase decoration-[1.5pt]">{config.principalName}</p>
                    <p className="font-bold">NIP. {config.principalNip}</p>
                 </div>
                 
                 <div className="text-center w-[280px] ml-auto">
                    <p className="mb-1">Kediri, {format(new Date(), 'dd MMMM yyyy', { locale: id })}</p>
                    <div className="h-[1.5em] mb-8"></div>
                    <p className="font-bold uppercase tracking-tight">Bendahara BOS</p>
                    <div className="h-[30mm] flex items-center justify-center my-2"></div>
                    {selectedBendahara ? (
                      <>
                        <p className="font-bold underline uppercase decoration-[1.5pt]">{selectedBendahara.name}</p>
                        <p className="font-bold">NIP. {selectedBendahara.nip || '..................................'}</p>
                      </>
                    ) : (
                      <p className="font-bold underline uppercase">.........................................</p>
                    )}
                 </div>
              </div>
              
              <div className="mt-auto pt-6 flex justify-between items-center text-[8pt] text-slate-400 italic border-t border-slate-100 font-bold uppercase tracking-widest">
                <span>Dihasilkan secara otomatis sesuai Juknis Dana BOS Tahun Anggaran {year}.</span>
                <span>Volume data sinkron dengan database absen realtime.</span>
              </div>
           </div>
        </div>
      </div>
      
      <div className="fixed bottom-8 right-8 flex gap-3 z-50 print:hidden">
        <button onClick={() => setScale(Math.max(0.4, scale - 0.1))} className="p-4 bg-white border border-slate-200 shadow-2xl rounded-[1.5rem] hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-90"><ZoomOut size={22}/></button>
        <button onClick={() => setScale(0.85)} className="px-7 bg-indigo-600 text-white border border-indigo-700 shadow-2xl rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all active:scale-95">Reset View</button>
        <button onClick={() => setScale(Math.min(1.2, scale + 0.1))} className="p-4 bg-white border border-slate-200 shadow-2xl rounded-[1.5rem] hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-90"><ZoomIn size={22}/></button>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        
        @media print {
          body * { visibility: hidden; }
          .honor-paper-landscape, .honor-paper-landscape * { visibility: visible !important; }
          .honor-paper-landscape { 
            position: fixed !important; left: 0 !important; top: 0 !important; 
            width: 330mm !important; height: 215mm !important; 
            margin: 0 !important; transform: none !important; padding: 20mm !important;
          }
          @page { size: 330mm 215mm landscape; margin: 0; }
        }
      `}</style>
    </div>
  );
};

export default HonorManager;
