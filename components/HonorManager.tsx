
import React, { useState, useEffect, useRef } from 'react';
// Added CheckCircle to imports
import { 
  Coins, Printer, Loader2, Save, Music, Hammer, ChevronLeft, 
  ZoomIn, ZoomOut, QrCode, Sparkles, Zap, Trash2, ShieldCheck, 
  TrendingUp, Activity, CreditCard, Banknote, PenTool, CheckCircle 
} from 'lucide-react';
import { subscribeToConfig, subscribeToStaff, StaffMember, saveMail, subscribeToAttendance } from '../services/storage';
import { analyzePayroll } from '../services/geminiService';
import { SchoolConfig, Mail, MailType, MailStatus, UrgencyLevel } from '../types';
import { format, getDaysInMonth } from 'date-fns';
import { id } from 'date-fns/locale/id';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

type Category = 'extra' | 'tukang';

const HonorManager: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>('extra');
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [rates, setRates] = useState<Record<string, number>>({});
  const [bulkRate, setBulkRate] = useState('');
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [scale, setScale] = useState(0.85);
  const receiptRef = useRef<HTMLDivElement>(null);

  const TAX_RATE = 0.05; // PPh21

  useEffect(() => {
    const unsubscribeConfig = subscribeToConfig(setConfig);
    const unsubscribeStaff = subscribeToStaff(setAllStaff);
    return () => { unsubscribeConfig(); unsubscribeStaff(); };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAttendance(year, month, activeCategory, (data) => {
      if (data) setAttendanceData(data.attendance || {});
      else setAttendanceData({});
    });
    return () => unsubscribe();
  }, [year, month, activeCategory]);

  const currentStaffList = allStaff.filter(s => s.category === activeCategory);

  const getAttendanceCount = (staffId: string) => {
    let count = 0;
    const days = getDaysInMonth(new Date(year, month));
    for (let d = 1; d <= days; d++) {
      if (attendanceData[`${staffId}-${d}`] === 'P') count++;
    }
    return count;
  };

  const handleRateChange = (staffId: string, val: string) => {
    setRates({ ...rates, [staffId]: parseInt(val) || 0 });
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
  const calculateTax = (staffId: string) => Math.floor(calculateGross(staffId) * TAX_RATE);
  const calculateNet = (staffId: string) => calculateGross(staffId) - calculateTax(staffId);

  const handleAiAnalysis = async () => {
    setAiAnalyzing(true);
    const period = format(new Date(year, month, 1), 'MMMM yyyy', { locale: id });
    const payload = {
      category: activeCategory === 'extra' ? 'Ekstrakurikuler' : 'Tukang',
      period,
      staff: currentStaffList.map(s => ({
        nama: s.name,
        hadir: getAttendanceCount(s.id),
        bruto: calculateGross(s.id),
        netto: calculateNet(s.id)
      }))
    };
    const result = await analyzePayroll(payload);
    setAiResult(result);
    setAiAnalyzing(false);
  };

  const handleGenerateReceipt = async () => {
    if (!receiptRef.current) return;
    if (!confirm('Simpan daftar penerimaan honor ini ke Arsip Surat Keluar?')) return;
    
    setSaveLoading(true);
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [330, 215] });
      pdf.addImage(imgData, 'JPEG', 0, 0, 330, 215);
      const pdfDataUri = pdf.output('datauristring');

      const period = format(new Date(year, month, 1), 'MMMM yyyy', { locale: id });
      const newMail: Mail = {
        id: Date.now().toString(),
        type: MailType.OUTGOING,
        referenceNumber: `HONOR/${activeCategory.toUpperCase()}/${month+1}/${year}`,
        date: new Date().toISOString().split('T')[0],
        receivedDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        sender: 'Bendahara BOS',
        subject: `Daftar Honor ${activeCategory === 'extra' ? 'Ekstrakurikuler' : 'Tenaga Tukang'} - ${period}`,
        description: `Rekapitulasi pembayaran honorarium bulan ${period} sesuai Juknis BOS.`,
        category: 'Absensi',
        urgency: UrgencyLevel.LOW,
        status: MailStatus.ARCHIVED,
        fileUrl: pdfDataUri,
      };
      await saveMail(newMail);
      alert('Daftar honor berhasil diarsipkan.');
      navigate('/outbox');
    } catch (e: any) {
      alert('Gagal: ' + e.message);
    } finally {
      setSaveLoading(false);
    }
  };

  if (!config) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-indigo-600" /></div>;

  const totalBruto = currentStaffList.reduce((acc, s) => acc + calculateGross(s.id), 0);
  const totalNetto = currentStaffList.reduce((acc, s) => acc + calculateNet(s.id), 0);

  return (
    <div className="space-y-6 animate-fade-in pb-10 bg-slate-50 min-h-screen p-4 overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2 max-w-[1600px] mx-auto">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Penerimaan Honor</h2>
          <p className="text-slate-500 font-bold text-sm italic">Otomatisasi pengisian tarif & analisis AI.</p>
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
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pilih Kategori</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setActiveCategory('extra')} className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border ${activeCategory === 'extra' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
                  <Music size={24} /><span className="text-[10px] font-black uppercase">Ekskul</span>
                </button>
                <button onClick={() => setActiveCategory('tukang')} className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border ${activeCategory === 'tukang' ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
                  <Hammer size={24} /><span className="text-[10px] font-black uppercase">Tukang</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-3">
               <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">Setel Tarif Masal</label>
               <div className="flex gap-2">
                 <input type="number" value={bulkRate} onChange={(e) => setBulkRate(e.target.value)} className="flex-1 px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs font-bold outline-none" placeholder="Cth: 50000" />
                 <button onClick={applyBulkRate} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"><Zap size={18}/></button>
               </div>
               <p className="text-[8px] text-indigo-400 font-bold leading-tight">Gunakan ini untuk mengisi semua tarif personil sekaligus.</p>
            </div>

            <div className="space-y-3">
               <div className="flex justify-between items-center">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daftar Tarif (Rp)</label>
                 <span className="text-[8px] font-black bg-slate-100 px-2 py-0.5 rounded uppercase">{currentStaffList.length} Org</span>
               </div>
               <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {currentStaffList.map(s => (
                    <div key={s.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl group transition-all hover:bg-white hover:border-indigo-200">
                      <p className="text-[10px] font-black text-slate-700 uppercase truncate mb-1.5 flex justify-between items-center">
                        {s.name}
                        {getAttendanceCount(s.id) > 0 ? <CheckCircle className="text-emerald-500" size={10} /> : <Activity className="text-slate-300" size={10}/>}
                      </p>
                      <input type="number" value={rates[s.id] || ''} onChange={(e) => handleRateChange(s.id, e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="0" />
                    </div>
                  ))}
               </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2">
               <div className="flex justify-between text-xs font-black text-slate-400 uppercase">
                 <span>Total Bruto</span>
                 <span className="text-slate-900">Rp {totalBruto.toLocaleString('id-ID')}</span>
               </div>
               <div className="flex justify-between text-xs font-black text-slate-400 uppercase">
                 <span>Pajak (5%)</span>
                 <span className="text-rose-500">- Rp {(totalBruto - totalNetto).toLocaleString('id-ID')}</span>
               </div>
               <div className="flex justify-between text-sm font-black text-slate-900 uppercase">
                 <span>Total Netto</span>
                 <span className="text-indigo-600 underline">Rp {totalNetto.toLocaleString('id-ID')}</span>
               </div>
            </div>
          </div>
          
          {aiResult && (
            <div className="bg-white p-6 rounded-[2rem] border border-amber-200 shadow-xl animate-fade-in relative overflow-hidden">
               <div className="absolute top-0 right-0 p-3 text-amber-500/20"><Sparkles size={40}/></div>
               <div className="flex justify-between items-center mb-4">
                 <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={14}/> Ringkasan Analisis AI</h4>
                 <button onClick={() => setAiResult(null)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={12}/></button>
               </div>
               <div className="text-[11px] text-slate-600 font-medium leading-relaxed whitespace-pre-line italic">
                 {aiResult}
               </div>
            </div>
          )}
        </div>

        {/* Area Preview Dokument */}
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
                    <h3 className="text-[12pt] uppercase font-bold">{config.headerLine1}</h3>
                    <h3 className="text-[12pt] font-bold uppercase">{config.headerLine2}</h3>
                    <h1 className="text-[18pt] font-black uppercase my-1 tracking-tight">{config.name}</h1>
                    <p className="text-[9pt] font-bold italic">{config.address}</p>
                 </div>
                 <img src={config.logoUrl} className="w-full h-auto object-contain" />
              </div>

              <div className="text-center mb-8">
                 <h2 className="text-[14pt] font-bold underline uppercase">DAFTAR PENERIMAAN HONORARIUM</h2>
                 <p className="text-[11pt] uppercase tracking-widest mt-1">BULAN : {format(new Date(year, month, 1), 'MMMM yyyy', { locale: id })}</p>
                 <p className="text-[10pt] font-bold uppercase mt-0.5">KATEGORI : {activeCategory === 'extra' ? 'TENAGA EKSTRAKURIKULER' : 'TENAGA TUKANG / SARPRAS'}</p>
              </div>

              <div className="flex-1">
                <table className="w-full border-collapse border-black border-[1.5pt] text-[9.5pt]">
                   <thead>
                      <tr className="bg-slate-50">
                         <th className="border border-black p-2 w-10 text-center">NO</th>
                         <th className="border border-black p-2 text-left">NAMA PENERIMA / NIK</th>
                         <th className="border border-black p-2 text-center w-24">VOL (ORG/HARI)</th>
                         <th className="border border-black p-2 text-right w-44">BRUTO (Rp)</th>
                         <th className="border border-black p-2 text-right w-36">PPh21 (5%)</th>
                         <th className="border border-black p-2 text-right w-44">NETTO (Rp)</th>
                         <th className="border border-black p-2 text-center w-48">TANDA TANGAN</th>
                      </tr>
                   </thead>
                   <tbody>
                      {currentStaffList.map((s, idx) => {
                        const count = getAttendanceCount(s.id);
                        const gross = calculateGross(s.id);
                        const tax = calculateTax(s.id);
                        const net = calculateNet(s.id);
                        return (
                          <tr key={s.id} className="h-11">
                             <td className="border border-black p-2 text-center">{idx + 1}</td>
                             <td className="border border-black p-2 leading-tight">
                                <span className="font-bold block uppercase">{s.name}</span>
                                <span className="text-[7pt] text-slate-500 italic uppercase">Nik. {s.nip || '-'}</span>
                             </td>
                             <td className="border border-black p-2 text-center font-bold">{count}</td>
                             <td className="border border-black p-2 text-right">{gross.toLocaleString('id-ID')}</td>
                             <td className="border border-black p-2 text-right italic">({tax.toLocaleString('id-ID')})</td>
                             <td className="border border-black p-2 text-right font-bold">{net.toLocaleString('id-ID')}</td>
                             <td className="border border-black p-2 text-left relative overflow-hidden">
                                <span className="text-[6.5pt] text-slate-400 absolute top-1 left-1">{idx + 1}.</span>
                                {idx % 2 !== 0 && <span className="block h-full w-1 border-l-2 border-slate-50 mx-auto"></span>}
                             </td>
                          </tr>
                        );
                      })}
                      {currentStaffList.length > 0 && (
                        <tr className="bg-slate-50 font-bold">
                           <td className="border border-black p-3 text-center" colSpan={3}>JUMLAH TOTAL</td>
                           <td className="border border-black p-3 text-right">{totalBruto.toLocaleString('id-ID')}</td>
                           <td className="border border-black p-3 text-right">({(totalBruto - totalNetto).toLocaleString('id-ID')})</td>
                           <td className="border border-black p-3 text-right underline">{totalNetto.toLocaleString('id-ID')}</td>
                           <td className="border border-black p-3 bg-white"></td>
                        </tr>
                      )}
                   </tbody>
                </table>
              </div>

              {/* Tanda Tangan Ganda (Sisi Kiri & Kanan) */}
              <div className="mt-12 grid grid-cols-2 text-[10.5pt] leading-tight font-serif px-6">
                 <div className="text-center w-[250px]">
                    <p className="mb-8">Mengetahui,</p>
                    <p className="font-bold">Bendahara BOS</p>
                    <div className="h-24"></div>
                    <p className="font-bold underline uppercase">.........................................</p>
                    <p>NIP. ..................................</p>
                 </div>
                 <div className="text-center w-[250px] ml-auto">
                    <p className="mb-1">Kediri, {format(new Date(), 'dd MMMM yyyy', { locale: id })}</p>
                    <p className="font-bold uppercase">Kepala Sekolah {config.name}</p>
                    <div className="h-24 flex items-center justify-center my-1">
                       {/* Space for Principal Stamp */}
                    </div>
                    <p className="font-bold underline uppercase">{config.principalName}</p>
                    <p>NIP. {config.principalNip}</p>
                 </div>
              </div>
              
              <div className="mt-auto pt-4 flex justify-between items-center text-[7pt] text-slate-400 italic border-t border-slate-100">
                <span>Dokumen ini dihasilkan secara otomatis berdasarkan Juknis BOS 2026.</span>
                <span>PPh21 (5%) dikenakan pada Wajib Pajak sesuai ketentuan perundangan.</span>
              </div>
           </div>
        </div>
      </div>
      
      {/* Zoom Control */}
      <div className="fixed bottom-6 right-6 flex gap-2 z-50 print:hidden">
        <button onClick={() => setScale(Math.max(0.4, scale - 0.1))} className="p-3 bg-white border shadow-xl rounded-2xl hover:bg-slate-50 transition-all"><ZoomOut size={20}/></button>
        <button onClick={() => setScale(0.85)} className="px-5 bg-white border shadow-xl rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50">Reset</button>
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
