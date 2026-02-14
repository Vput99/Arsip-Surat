
import React, { useState, useEffect, useRef } from 'react';
import { Coins, Printer, Loader2, Save, Users, Calendar, ArrowRight, Receipt, Music, Hammer, CheckCircle2, ChevronLeft, FileDown, Percent } from 'lucide-react';
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
  const receiptRef = useRef<HTMLDivElement>(null);

  // Pajak PPh21 Standar Juknis (5% untuk non-pegawai/honorarium)
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

  // Kalkulasi Bruto
  const calculateGross = (staffId: string) => {
    return getAttendanceCount(staffId) * (rates[staffId] || 0);
  };

  // Kalkulasi Pajak
  const calculateTax = (staffId: string) => {
    return Math.floor(calculateGross(staffId) * TAX_RATE);
  };

  // Kalkulasi Netto (Jumlah Diterima)
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
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [215, 330] });
      pdf.addImage(imgData, 'JPEG', 0, 0, 215, 330);
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
    <div className="max-w-7xl mx-auto py-8 px-4 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Penerimaan Honor BOS 2026</h2>
          <p className="text-slate-500 font-medium">Format otomatis dengan perhitungan Pajak PPh21 sesuai Juknis.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => window.print()} className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 shadow-sm transition-all flex items-center gap-2">
            <Printer size={16} /> Cetak
          </button>
          <button 
            onClick={handleGenerateReceipt} 
            disabled={saveLoading}
            className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            {saveLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Simpan Arsip
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Settings Panel */}
        <div className="lg:col-span-3 space-y-6 print:hidden">
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
                  <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500">
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
                  <span className="text-xs font-black uppercase tracking-widest">Tarif Honor</span>
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

        {/* Receipt Preview */}
        <div className="lg:col-span-9 overflow-x-auto p-4 bg-slate-100 rounded-[2.5rem] border border-slate-200 flex justify-center items-start min-h-[800px]">
           <div 
             ref={receiptRef}
             className="receipt-paper bg-white shadow-2xl p-[15mm] text-black font-['Times_New_Roman'] flex flex-col origin-top scale-[0.6] md:scale-[0.85] lg:scale-100"
             style={{ width: '215mm', minHeight: '330mm' }}
           >
              {/* Kop Surat */}
              <div className="border-b-[3px] border-double border-black pb-4 mb-8 grid grid-cols-[80px_1fr_80px] items-center">
                 <img src={config.logoDaerahUrl} className="w-full h-auto" />
                 <div className="text-center px-4">
                    <h3 className="text-[12pt] uppercase leading-tight font-bold">{config.headerLine1}</h3>
                    <h3 className="text-[12pt] font-bold uppercase leading-tight">{config.headerLine2}</h3>
                    <h1 className="text-[16pt] font-black uppercase my-1">{config.name}</h1>
                    <p className="text-[9pt] leading-tight font-bold">{config.address}</p>
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

              <table className="w-full border-collapse border border-black text-[10pt]">
                 <thead>
                    <tr className="bg-slate-50">
                       <th className="border border-black p-2 w-8 text-center">NO</th>
                       <th className="border border-black p-2 text-left">NAMA PENERIMA</th>
                       <th className="border border-black p-2 text-center w-28">{activeCategory === 'extra' ? 'TUGAS' : 'JABATAN'}</th>
                       <th className="border border-black p-2 text-center w-14">{activeCategory === 'extra' ? 'HADIR' : 'HARI'}</th>
                       <th className="border border-black p-2 text-right w-28">HONOR (Rp)</th>
                       <th className="border border-black p-2 text-right w-24">{activeCategory === 'extra' ? 'PPh 21 (5%)' : 'PPh'}</th>
                       <th className="border border-black p-2 text-right w-28">JUMLAH (Rp)</th>
                       <th className="border border-black p-2 text-center w-24">TANDA TANGAN</th>
                    </tr>
                 </thead>
                 <tbody>
                    {currentStaffList.map((s, idx) => {
                      const count = getAttendanceCount(s.id);
                      const gross = calculateGross(s.id);
                      const tax = calculateTax(s.id);
                      const net = calculateNet(s.id);
                      
                      return (
                        <tr key={s.id}>
                           <td className="border border-black p-2 text-center">{idx + 1}</td>
                           <td className="border border-black p-2 font-bold leading-tight">{s.name}</td>
                           <td className="border border-black p-2 text-center text-[9pt] leading-tight">{s.rank || '-'}</td>
                           <td className="border border-black p-2 text-center font-bold">{count}</td>
                           <td className="border border-black p-2 text-right">{gross.toLocaleString('id-ID')}</td>
                           <td className="border border-black p-2 text-right text-rose-600 font-medium">({tax.toLocaleString('id-ID')})</td>
                           <td className="border border-black p-2 text-right font-bold">{net.toLocaleString('id-ID')}</td>
                           <td className="border border-black p-2 text-left relative h-12">
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
                       <td className="border border-black p-2 text-right text-rose-600">
                          ({currentStaffList.reduce((acc, s) => acc + calculateTax(s.id), 0).toLocaleString('id-ID')})
                       </td>
                       <td className="border border-black p-2 text-right font-black">
                          {currentStaffList.reduce((acc, s) => acc + calculateNet(s.id), 0).toLocaleString('id-ID')}
                       </td>
                       <td className="border border-black p-2"></td>
                    </tr>
                 </tbody>
              </table>

              <div className="mt-8 text-[9pt] leading-snug">
                 <p className="font-bold">Keterangan:</p>
                 <ul className="list-disc pl-5">
                    <li>Perhitungan Pajak PPh Pasal 21 sesuai Juknis BOS 2026.</li>
                    <li>Besaran honorarium didasarkan pada kehadiran riil di sekolah.</li>
                 </ul>
              </div>

              <div className="mt-10 flex justify-between px-6">
                 <div className="text-center w-[180px]">
                    <p className="mb-20">Setuju Dibayar,<br/>Kepala Sekolah</p>
                    <p className="font-bold underline uppercase">{config.principalName}</p>
                    <p className="text-[10pt]">NIP. {config.principalNip}</p>
                 </div>
                 <div className="text-center w-[180px]">
                    <p className="mb-20">Kediri, {format(new Date(year, month + 1, 0), 'dd MMMM yyyy', { locale: id })}<br/>Bendahara BOS,</p>
                    <p className="font-bold underline uppercase">....................................</p>
                    <p className="text-[10pt]">NIP. ............................</p>
                 </div>
              </div>
              
              <div className="mt-auto pt-6 text-[8pt] text-slate-400 italic flex justify-between items-end border-t border-slate-100">
                 <span>Dicetak pada: {format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
                 <span>Sistem ArsipDigital SDntempurejo1 - Realtime Cloud Data</span>
              </div>
           </div>
        </div>
      </div>

      <style>{`
        .receipt-paper {
          box-sizing: border-box;
          line-height: 1.5;
        }
        @media print {
          body * { visibility: hidden; }
          .receipt-paper, .receipt-paper * { visibility: visible !important; }
          .receipt-paper {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 215mm !important;
            height: 330mm !important;
            padding: 20mm !important;
            margin: 0 !important;
            transform: none !important;
          }
          @page { size: 215mm 330mm portrait; margin: 0; }
        }
      `}</style>
    </div>
  );
};

export default HonorManager;
