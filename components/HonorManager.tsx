
import React, { useState, useEffect, useRef } from 'react';
import { Coins, Printer, Loader2, Save, Users, Calendar, ArrowRight, Receipt, Music, Hammer, CheckCircle2, ChevronLeft, FileDown, Percent, ZoomIn, ZoomOut } from 'lucide-react';
import { subscribeToConfig, subscribeToStaff, StaffMember, saveMail } from '../services/storage';
import { SchoolConfig, Mail, MailType, MailStatus, UrgencyLevel } from '../types';
import { format } from 'date-fns';
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
  const [saveLoading, setSaveLoading] = useState(false);
  const [scale, setScale] = useState(0.85);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Pajak PPh21 Standar Juknis BOS 2026 (5% untuk non-pegawai/honorarium)
  const TAX_RATE = 0.05;

  useEffect(() => {
    const unsubscribeConfig = subscribeToConfig(setConfig);
    const unsubscribeStaff = subscribeToStaff(setAllStaff);
    return () => {
      unsubscribeConfig();
      unsubscribeStaff();
    };
  }, []);

  const currentStaffList = allStaff.filter(s => s.category === activeCategory);

  const getAttendanceCount = (staffId: string) => {
    const key = `attendance_draft_${activeCategory}_${month}_${year}`;
    const saved = localStorage.getItem(key);
    if (!saved) return 0;
    try {
      const { attendance } = JSON.parse(saved);
      let count = 0;
      for (let d = 1; d <= 31; d++) {
        if (attendance[`${staffId}-${d}-in`] === 'P') count++;
      }
      return count;
    } catch (e) { return 0; }
  };

  const handleRateChange = (staffId: string, val: string) => {
    setRates({ ...rates, [staffId]: parseInt(val) || 0 });
  };

  const calculateGross = (staffId: string) => {
    return getAttendanceCount(staffId) * (rates[staffId] || 0);
  };

  const calculateTax = (staffId: string) => {
    return Math.floor(calculateGross(staffId) * TAX_RATE);
  };

  const calculateNet = (staffId: string) => {
    return calculateGross(staffId) - calculateTax(staffId);
  };

  const handleGenerateReceipt = async () => {
    if (!receiptRef.current) return;
    if (!confirm('Simpan daftar penerimaan honor ini ke Arsip Surat Keluar?')) return;
    
    setSaveLoading(true);
    try {
      const canvas = await html2canvas(receiptRef.current, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff' 
      });
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
        description: `Rekapitulasi pembayaran honorarium bulan ${period} sesuai Juknis BOS 2026.`,
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

  if (!config) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-6 animate-fade-in h-[calc(100vh-100px)] overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2 print:hidden">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Penerimaan Honor BOS 2026</h2>
          <p className="text-slate-500 font-bold text-sm">Format Landscape (No, Nama, Tugas, Kehadiran, Honor, Pajak, Jumlah)</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => window.print()} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 shadow-sm transition-all flex items-center gap-2">
            <Printer size={16} /> Cetak
          </button>
          <button 
            onClick={handleGenerateReceipt} 
            disabled={saveLoading}
            className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            {saveLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Simpan Arsip
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start min-h-0">
        {/* Settings Panel */}
        <div className="lg:col-span-3 space-y-6 print:hidden overflow-y-auto max-h-full pr-2">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Kategori Tenaga</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setActiveCategory('extra')} className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border ${activeCategory === 'extra' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`}>
                  <Music size={24} />
                  <span className="text-[10px] font-black uppercase">Ekskul</span>
                </button>
                <button onClick={() => setActiveCategory('tukang')} className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border ${activeCategory === 'tukang' ? 'bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-100' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`}>
                  <Hammer size={24} />
                  <span className="text-[10px] font-black uppercase">Tukang</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Periode</label>
               <div className="grid grid-cols-1 gap-2">
                  <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none">
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>{format(new Date(2024, i, 1), 'MMMM', { locale: id })}</option>
                    ))}
                  </select>
                  <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none" />
               </div>
            </div>

            <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 space-y-3">
               <div className="flex items-center gap-2 text-indigo-700">
                  <Coins size={18} />
                  <span className="text-xs font-black uppercase tracking-widest">Tarif Honor Bruto</span>
               </div>
               <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {currentStaffList.map(s => (
                    <div key={s.id} className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase truncate">{s.name}</p>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Rp</span>
                        <input 
                          type="number" 
                          placeholder="0"
                          value={rates[s.id] || ''} 
                          onChange={(e) => handleRateChange(s.id, e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none" 
                        />
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>

        {/* Receipt Preview (LANDSCAPE) */}
        <div className="lg:col-span-9 overflow-auto bg-slate-100/50 rounded-[3rem] p-12 print:p-0 print:bg-white flex justify-center">
           <div 
             ref={receiptRef}
             className="receipt-paper-landscape bg-white shadow-2xl p-[15mm] text-black font-serif flex flex-col"
             style={{ width: '330mm', minHeight: '215mm', transform: `scale(${scale})`, transformOrigin: 'top center' }}
           >
              {/* Kop Surat */}
              <div className="border-b-[3px] border-double border-black pb-4 mb-6 grid grid-cols-[80px_1fr_80px] items-center text-center">
                 <img src={config.logoDaerahUrl} className="w-full h-auto" />
                 <div className="px-4">
                    <h3 className="text-[12pt] uppercase leading-tight font-bold">{config.headerLine1}</h3>
                    <h3 className="text-[12pt] font-bold uppercase leading-tight">{config.headerLine2}</h3>
                    <h1 className="text-[16pt] font-black uppercase my-1 tracking-tight">{config.name}</h1>
                    <p className="text-[9pt] leading-tight font-bold italic">{config.address}</p>
                 </div>
                 <img src={config.logoUrl} className="w-full h-auto" />
              </div>

              <div className="text-center mb-8">
                 <h2 className="text-[14pt] font-bold underline uppercase">DAFTAR PENERIMAAN HONORARIUM</h2>
                 <p className="text-[12pt] font-bold uppercase mt-1">
                   {activeCategory === 'extra' ? 'TENAGA PENGAJAR EKSTRAKURIKULER' : 'TENAGA TUKANG / PEMELIHARAAN SARPRAS'}
                 </p>
                 <p className="text-[11pt] uppercase tracking-widest mt-1">BULAN : {format(new Date(year, month, 1), 'MMMM yyyy', { locale: id })}</p>
              </div>

              <table className="w-full border-collapse border-black border-[1.5pt] text-[9pt]">
                 <thead>
                    <tr className="bg-slate-50">
                       <th className="border border-black p-2 w-10 text-center">NO</th>
                       <th className="border border-black p-2 text-left">NAMA PENERIMA</th>
                       <th className="border border-black p-2 text-center w-40">{activeCategory === 'extra' ? 'TUGAS' : 'JABATAN'}</th>
                       <th className="border border-black p-2 text-center w-20">{activeCategory === 'extra' ? 'KEHADIRAN' : 'HARI'}</th>
                       <th className="border border-black p-2 text-right w-40">HONOR BRUTO (Rp)</th>
                       <th className="border border-black p-2 text-right w-36">{activeCategory === 'extra' ? 'PAJAK PPh21 (5%)' : 'PPh'}</th>
                       <th className="border border-black p-2 text-right w-40">JUMLAH (Rp)</th>
                       <th className="border border-black p-2 text-center w-40">TANDA TANGAN</th>
                    </tr>
                 </thead>
                 <tbody>
                    {currentStaffList.map((s, idx) => {
                      const count = getAttendanceCount(s.id);
                      const gross = calculateGross(s.id);
                      const tax = calculateTax(s.id);
                      const net = calculateNet(s.id);
                      
                      return (
                        <tr key={s.id} className="h-10">
                           <td className="border border-black p-2 text-center">{idx + 1}</td>
                           <td className="border border-black p-2 font-bold leading-tight">{s.name}</td>
                           <td className="border border-black p-2 text-center text-[8pt]">{s.rank || '-'}</td>
                           <td className="border border-black p-2 text-center font-bold">{count}</td>
                           <td className="border border-black p-2 text-right">{gross.toLocaleString('id-ID')}</td>
                           <td className="border border-black p-2 text-right text-rose-600 italic">({tax.toLocaleString('id-ID')})</td>
                           <td className="border border-black p-2 text-right font-bold">{net.toLocaleString('id-ID')}</td>
                           <td className="border border-black p-2 text-left relative">
                              <span className="text-[7pt] text-slate-400 absolute top-1 left-1">{idx + 1}.</span>
                           </td>
                        </tr>
                      );
                    })}
                    <tr className="font-bold bg-slate-50">
                       <td colSpan={4} className="border border-black p-2 text-right uppercase font-bold">TOTAL KESELURUHAN</td>
                       <td className="border border-black p-2 text-right">
                          {currentStaffList.reduce((acc, s) => acc + calculateGross(s.id), 0).toLocaleString('id-ID')}
                       </td>
                       <td className="border border-black p-2 text-right text-rose-600 italic">
                          ({currentStaffList.reduce((acc, s) => acc + calculateTax(s.id), 0).toLocaleString('id-ID')})
                       </td>
                       <td className="border border-black p-2 text-right font-black">
                          {currentStaffList.reduce((acc, s) => acc + calculateNet(s.id), 0).toLocaleString('id-ID')}
                       </td>
                       <td className="border border-black p-2"></td>
                    </tr>
                 </tbody>
              </table>

              <div className="mt-6 text-[9pt] leading-tight flex justify-between items-start">
                 <div>
                    <p className="font-bold mb-1">Catatan Penting:</p>
                    <ul className="list-disc pl-5 italic text-slate-600">
                       <li>Perhitungan Pajak PPh Pasal 21 sebesar 5% sesuai Juknis BOS 2026.</li>
                       <li>Besaran honorarium didasarkan pada data kehadiran riil per bulan.</li>
                       <li>Dokumen ini sah digunakan sebagai bukti Surat Pertanggungjawaban (SPJ).</li>
                    </ul>
                 </div>
              </div>

              <div className="mt-12 flex justify-between px-10 text-[10pt]">
                 <div className="text-center w-[220px]">
                    <p className="mb-20">Setuju Dibayar,<br/>Kepala Sekolah</p>
                    <p className="font-bold underline uppercase">{config.principalName}</p>
                    <p>NIP. {config.principalNip}</p>
                 </div>
                 <div className="text-center w-[220px]">
                    <p className="mb-20">Kediri, {format(new Date(), 'dd MMMM yyyy', { locale: id })}<br/>Bendahara BOS,</p>
                    <p className="font-bold underline uppercase">....................................</p>
                    <p>NIP. ............................</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
      
      {/* Zoom Controls print:hidden */}
      <div className="fixed bottom-6 right-6 flex gap-2 print:hidden">
        <button onClick={() => setScale(Math.max(0.5, scale - 0.1))} className="p-3 bg-white border shadow-lg rounded-2xl"><ZoomOut size={20}/></button>
        <button onClick={() => setScale(1)} className="px-4 bg-white border shadow-lg rounded-2xl font-bold text-xs">{Math.round(scale * 100)}%</button>
        <button onClick={() => setScale(Math.min(1.5, scale + 0.1))} className="p-3 bg-white border shadow-lg rounded-2xl"><ZoomIn size={20}/></button>
      </div>

      <style>{`
        .receipt-paper-landscape {
          box-sizing: border-box;
          line-height: 1.5;
        }
        @media print {
          body * { visibility: hidden; }
          .receipt-paper-landscape, .receipt-paper-landscape * { visibility: visible !important; }
          .receipt-paper-landscape {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 330mm !important;
            height: 215mm !important;
            margin: 0 !important;
            transform: none !important;
            padding: 15mm !important;
          }
          @page { size: 330mm 215mm landscape; margin: 0; }
        }
      `}</style>
    </div>
  );
};

export default HonorManager;
