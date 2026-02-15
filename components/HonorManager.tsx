
import React, { useState, useEffect, useRef } from 'react';
import { 
  Coins, Printer, Loader2, Save, Music, Hammer, ChevronLeft, 
  ZoomIn, ZoomOut, QrCode, Sparkles, Zap, Trash2, ShieldCheck, 
  TrendingUp, Activity, CreditCard, Banknote, PenTool, CheckCircle,
  ToggleLeft, ToggleRight, Info, UserCheck, ChevronDown, MapPin, Search, UserMinus, UserPlus,
  Users, Percent
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
  // State tarif pajak spesifik per orang (khusus SPPD)
  const [taxTiers, setTaxTiers] = useState<Record<string, number>>({});
  const [bulkRate, setBulkRate] = useState('');
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});
  const [isTaxActive, setIsTaxActive] = useState(true);
  
  // State untuk seleksi pegawai SPPD
  const [selectedSppdStaffIds, setSelectedSppdStaffIds] = useState<string[]>([]);
  const [staffSearch, setStaffSearch] = useState('');
  
  // State untuk bendahara
  const [selectedBendahara, setSelectedBendahara] = useState<StaffMember | null>(null);
  
  const [saveLoading, setSaveLoading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [scale, setScale] = useState(0.8);
  const receiptRef = useRef<HTMLDivElement>(null);

  const DEFAULT_TAX_RATE = 0.05; // 5%

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
  
  const sppdCandidates = allStaff.filter(s => (s.category === 'reg' || s.category === 'pppk'));
  const treasurerCandidates = allStaff.filter(s => s.category === 'reg' || s.category === 'pppk');

  const getAttendanceCount = (staffId: string) => {
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
    
    // Jika SPPD, gunakan taxTier spesifik (Juknis BOS)
    if (activeCategory === 'sppd') {
      const tier = taxTiers[staffId] ?? 0; 
      return Math.floor(gross * tier);
    }
    
    return Math.floor(gross * DEFAULT_TAX_RATE);
  };

  const calculateNet = (staffId: string) => calculateGross(staffId) - calculateTax(staffId);

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
    if (activeCategory === 'sppd' && selectedSppdStaffIds.length === 0) {
      alert("Harap pilih minimal satu pegawai untuk daftar SPPD.");
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

  if (!config) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-indigo-600" /></div>;

  const totalBruto = currentStaffList.reduce((acc, s) => acc + calculateGross(s.id), 0);
  const totalPajak = currentStaffList.reduce((acc, s) => acc + calculateTax(s.id), 0);
  const totalNetto = totalBruto - totalPajak;

  return (
    <div className="space-y-6 animate-fade-in pb-10 bg-slate-50 min-h-screen p-4 overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2 max-w-[1600px] mx-auto">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Manajemen Keuangan</h2>
          <p className="text-slate-500 font-bold text-sm italic">Laporan BOS & Pajak Juknis Terbaru.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleAiAnalysis} disabled={aiAnalyzing} className="px-6 py-3 bg-white border border-indigo-200 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm flex items-center gap-2 hover:bg-indigo-50 transition-all">
            {aiAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-amber-500" />}
            Analisis AI
          </button>
          <button onClick={handleGenerateReceipt} disabled={saveLoading} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2">
            {saveLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan Arsip
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-[1600px] mx-auto">
        {/* Panel Pengaturan */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Kategori Daftar</label>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setActiveCategory('extra')} className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border ${activeCategory === 'extra' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
                  <Music size={20} /><span className="text-[8px] font-black uppercase">Ekskul</span>
                </button>
                <button onClick={() => setActiveCategory('tukang')} className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border ${activeCategory === 'tukang' ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
                  <Hammer size={20} /><span className="text-[8px] font-black uppercase">Tukang</span>
                </button>
                <button onClick={() => setActiveCategory('sppd')} className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border ${activeCategory === 'sppd' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
                  <MapPin size={20} /><span className="text-[8px] font-black uppercase">SPPD</span>
                </button>
              </div>
            </div>

            {/* SELEKSI PEGAWAI SPPD */}
            {activeCategory === 'sppd' && (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-3 animate-fade-in">
                <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block flex items-center gap-2">
                  <Users size={14} /> Pilih Pegawai Dinas
                </label>
                <div className="relative">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                  <input 
                    type="text" 
                    placeholder="Cari nama..." 
                    value={staffSearch} 
                    onChange={(e) => setStaffSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-emerald-200 rounded-xl text-[10px] font-bold outline-none"
                  />
                </div>
                <div className="space-y-1 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                   {sppdCandidates
                    .filter(c => c.name.toLowerCase().includes(staffSearch.toLowerCase()))
                    .map(c => {
                      const isSelected = selectedSppdStaffIds.includes(c.id);
                      return (
                        <button 
                          key={c.id} 
                          onClick={() => toggleSppdStaff(c.id)}
                          className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${isSelected ? 'bg-emerald-600 border-emerald-700 text-white shadow-md' : 'bg-white border-emerald-100 text-emerald-800 hover:bg-emerald-100'}`}
                        >
                          <span className="text-[9px] font-black truncate uppercase">{c.name}</span>
                          {isSelected ? <CheckCircle size={12} /> : <UserPlus size={12} className="opacity-40" />}
                        </button>
                      );
                   })}
                </div>
              </div>
            )}

            {/* Pemilihan Bendahara */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block flex items-center gap-2">
                 <UserCheck size={14} className="text-indigo-600" /> Bendahara BOS
               </label>
               <div className="relative">
                  <select 
                    value={selectedBendahara?.id || ''} 
                    onChange={(e) => {
                      const found = treasurerCandidates.find(c => c.id === e.target.value);
                      if (found) setSelectedBendahara(found);
                    }}
                    className="w-full appearance-none px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {treasurerCandidates.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
               </div>
            </div>

            {/* Toggle Pajak Global */}
            <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${isTaxActive ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
               <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest block ${isTaxActive ? 'text-rose-600' : 'text-slate-500'}`}>Potong PPh21 (5%)</label>
                  <p className="text-[8px] font-bold text-slate-400 italic">Otomatisasi Juknis BOS</p>
               </div>
               <button onClick={() => setIsTaxActive(!isTaxActive)} className={`p-1 rounded-full transition-colors ${isTaxActive ? 'text-rose-600' : 'text-slate-300'}`}>
                 {isTaxActive ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
               </button>
            </div>
            
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-3">
               <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">Tarif Satuan (Rp)</label>
               <div className="flex gap-2">
                 <input type="number" value={bulkRate} onChange={(e) => setBulkRate(e.target.value)} className="flex-1 px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs font-bold outline-none" placeholder="0" />
                 <button onClick={applyBulkRate} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"><Zap size={18}/></button>
               </div>
            </div>

            <div className="space-y-3">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Input Nominal & Pajak</label>
               <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                  {currentStaffList.map(s => (
                    <div key={s.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] font-black text-slate-700 uppercase truncate">{s.name}</p>
                        <span className="text-[8px] font-bold bg-white px-2 py-0.5 rounded border border-slate-200">{getAttendanceCount(s.id)}x</span>
                      </div>
                      <input type="number" value={rates[s.id] || ''} onChange={(e) => handleRateChange(s.id, e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none" placeholder="Tarif..." />
                      
                      {activeCategory === 'sppd' && isTaxActive && (
                        <div className="flex items-center gap-1">
                          <Percent size={10} className="text-rose-400" />
                          <select 
                            value={taxTiers[s.id] || 0} 
                            onChange={(e) => handleTaxTierChange(s.id, parseFloat(e.target.value))}
                            className="flex-1 bg-white border border-rose-100 rounded-md text-[9px] font-bold p-1 outline-none"
                          >
                            <option value={0}>PPh 0% (Gol I/II / Non-ASN / P3K Paruh Waktu)</option>
                            <option value={0.05}>PPh 5% (Gol III / PPPK ASN)</option>
                            <option value={0.15}>PPh 15% (Gol IV)</option>
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                  {currentStaffList.length === 0 && (
                    <p className="text-[9px] text-slate-400 font-bold italic text-center py-4">Pilih pegawai di panel seleksi.</p>
                  )}
               </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2">
               <div className="flex justify-between text-xs font-black text-slate-400 uppercase">
                 <span>Total Netto</span>
                 <span className="text-indigo-600 underline">Rp {totalNetto.toLocaleString('id-ID')}</span>
               </div>
            </div>
          </div>
        </div>

        {/* Area Preview Dokument - Landscape */}
        <div className="lg:col-span-9 overflow-x-auto bg-slate-200/50 rounded-[2.5rem] p-8 flex justify-center">
           <div 
             ref={receiptRef}
             className="bg-white p-[15mm] text-black font-serif flex flex-col shadow-2xl origin-top"
             style={{ width: '330mm', minHeight: '215mm', transform: `scale(${scale})` }}
           >
              {/* Kop Surat */}
              <div className="border-b-[3px] border-double border-black pb-4 mb-6 grid grid-cols-[80px_1fr_80px] items-center text-center">
                 <img src={config.logoDaerahUrl} className="w-full h-auto object-contain" />
                 <div className="px-4">
                    <h3 className="text-[12pt] uppercase font-bold leading-tight">{config.headerLine1}</h3>
                    <h3 className="text-[12pt] font-bold uppercase leading-tight">{config.headerLine2}</h3>
                    <h1 className="text-[18pt] font-black uppercase my-1 tracking-tight">{config.name}</h1>
                    <p className="text-[9pt] font-bold italic leading-tight">{config.address}</p>
                 </div>
                 <img src={config.logoUrl} className="w-full h-auto object-contain" />
              </div>

              <div className="text-center mb-8">
                 <h2 className="text-[14pt] font-bold underline uppercase">{activeCategory === 'sppd' ? "DAFTAR PENERIMAAN BIAYA PERJALANAN DINAS (TRANSPORT)" : "DAFTAR PENERIMAAN HONORARIUM"}</h2>
                 <p className="text-[11pt] uppercase tracking-widest mt-1">BULAN : {format(new Date(year, month, 1), 'MMMM yyyy', { locale: id })}</p>
              </div>

              <div className="flex-1">
                <table className="w-full border-collapse border-black border-[1.5pt] text-[9pt]">
                   <thead>
                      <tr className="bg-slate-50">
                         <th className="border border-black p-2 w-10 text-center">NO</th>
                         <th className="border border-black p-2 text-left">NAMA PENERIMA / NIK</th>
                         <th className="border border-black p-2 text-center w-32">JABATAN</th>
                         <th className="border border-black p-2 text-center w-24">{activeCategory === 'sppd' ? 'VOL (TRIP)' : 'VOL (HARI)'}</th>
                         <th className="border border-black p-2 text-right w-40">BRUTO (Rp)</th>
                         <th className="border border-black p-2 text-right w-36">PPh21</th>
                         <th className="border border-black p-2 text-right w-40">JUMLAH (Rp)</th>
                         <th className="border border-black p-2 text-center w-44">TANDA TANGAN</th>
                      </tr>
                   </thead>
                   <tbody>
                      {currentStaffList.map((s, idx) => {
                        const count = getAttendanceCount(s.id);
                        const gross = calculateGross(s.id);
                        const tax = calculateTax(s.id);
                        const net = calculateNet(s.id);
                        const tier = taxTiers[s.id] ?? 0;
                        return (
                          <tr key={s.id} className="h-12">
                             <td className="border border-black p-2 text-center font-bold">{idx + 1}</td>
                             <td className="border border-black p-2 leading-tight">
                                <span className="font-bold block uppercase">{s.name}</span>
                                <span className="text-[7.5pt] text-slate-500 italic uppercase">Nik. {s.nip || '-'}</span>
                             </td>
                             <td className="border border-black p-2 text-center text-[8pt] uppercase leading-tight">
                                {s.rank || '-'}
                             </td>
                             <td className="border border-black p-2 text-center font-bold">{count}</td>
                             <td className="border border-black p-2 text-right">{gross.toLocaleString('id-ID')}</td>
                             <td className="border border-black p-2 text-right italic text-slate-500">
                                {isTaxActive ? (
                                  <>
                                    {tax > 0 ? `(${tax.toLocaleString('id-ID')})` : '0'}
                                    {activeCategory === 'sppd' && tier > 0 && <span className="text-[7px] block font-black">({tier * 100}%)</span>}
                                  </>
                                ) : '0'}
                             </td>
                             <td className="border border-black p-2 text-right font-bold">{net.toLocaleString('id-ID')}</td>
                             <td className="border border-black p-2 text-left relative overflow-hidden">
                                <span className="text-[6.5pt] text-slate-400 absolute top-1 left-1">{idx + 1}.</span>
                                {idx % 2 !== 0 && <span className="block h-full w-1 border-l-2 border-slate-50 mx-auto"></span>}
                             </td>
                          </tr>
                        );
                      })}
                      {currentStaffList.length === 0 && (
                        <tr>
                          <td colSpan={8} className="border border-black p-10 text-center italic text-slate-400">Silakan pilih pegawai untuk menampilkan data.</td>
                        </tr>
                      )}
                      {currentStaffList.length > 0 && (
                        <tr className="bg-slate-50 font-bold">
                           <td className="border border-black p-3 text-center uppercase" colSpan={4}>JUMLAH TOTAL</td>
                           <td className="border border-black p-3 text-right">{totalBruto.toLocaleString('id-ID')}</td>
                           <td className="border border-black p-3 text-right">({totalPajak.toLocaleString('id-ID')})</td>
                           <td className="border border-black p-3 text-right underline decoration-2 decoration-indigo-500">{totalNetto.toLocaleString('id-ID')}</td>
                           <td className="border border-black p-3 bg-white"></td>
                        </tr>
                      )}
                   </tbody>
                </table>
              </div>

              {/* Tanda Tangan */}
              <div className="mt-12 grid grid-cols-2 text-[10.5pt] leading-tight font-serif px-6">
                 <div className="text-center w-[250px]">
                    <p className="mb-8 font-medium">Mengetahui,</p>
                    <p className="font-bold uppercase">Bendahara BOS</p>
                    <div className="h-24"></div>
                    {selectedBendahara ? (
                      <>
                        <p className="font-bold underline uppercase">{selectedBendahara.name}</p>
                        <p>NIP. {selectedBendahara.nip || '..................................'}</p>
                      </>
                    ) : (
                      <p className="font-bold underline uppercase">.........................................</p>
                    )}
                 </div>
                 <div className="text-center w-[250px] ml-auto">
                    <p className="mb-1">Kediri, {format(new Date(), 'dd MMMM yyyy', { locale: id })}</p>
                    <p className="font-bold uppercase tracking-tight">Kepala Sekolah {config.name}</p>
                    <div className="h-24 flex items-center justify-center my-1"></div>
                    <p className="font-bold underline uppercase decoration-2">{config.principalName}</p>
                    <p>NIP. {config.principalNip}</p>
                 </div>
              </div>
              
              <div className="mt-auto pt-4 flex justify-between items-center text-[7pt] text-slate-400 italic border-t border-slate-100">
                <span>Dihasilkan secara otomatis sesuai Juknis BOS & PMK 262/2010.</span>
                <span>PPh 21 bagi ASN/PPPK Gol III (5%), Gol IV (15%), Gol I/II & P3K Paruh Waktu (0%).</span>
              </div>
           </div>
        </div>
      </div>
      
      {/* Zoom Control */}
      <div className="fixed bottom-6 right-6 flex gap-2 z-50 print:hidden">
        <button onClick={() => setScale(Math.max(0.4, scale - 0.1))} className="p-3 bg-white border shadow-xl rounded-2xl hover:bg-slate-50 transition-all"><ZoomOut size={20}/></button>
        <button onClick={() => setScale(0.8)} className="px-5 bg-white border shadow-xl rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50">Reset</button>
        <button onClick={() => setScale(Math.min(1.2, scale + 0.1))} className="p-3 bg-white border shadow-xl rounded-2xl hover:bg-slate-50 transition-all"><ZoomIn size={20}/></button>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default HonorManager;
