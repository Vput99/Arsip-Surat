
import React, { useState, useEffect, useRef } from 'react';
import { Coins, Printer, Loader2, Save, Music, Hammer, ChevronLeft, ZoomIn, ZoomOut, QrCode } from 'lucide-react';
import { subscribeToConfig, subscribeToStaff, StaffMember, saveMail, subscribeToAttendance } from '../services/storage';
import { SchoolConfig, Mail, MailType, MailStatus, UrgencyLevel } from '../types';
import { format, getDaysInMonth } from 'date-fns';
import { id } from 'date-fns/locale/id';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';

type Category = 'extra' | 'tukang';

const HonorManager: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>('extra');
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [rates, setRates] = useState<Record<string, number>>({});
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [scale, setScale] = useState(0.85);
  const receiptRef = useRef<HTMLDivElement>(null);

  const TAX_RATE = 0.05; // PPh21

  useEffect(() => {
    const unsubscribeConfig = subscribeToConfig(setConfig);
    const unsubscribeStaff = subscribeToStaff(setAllStaff);
    return () => { unsubscribeConfig(); unsubscribeStaff(); };
  }, []);

  // Sync dengan Database Absensi secara Realtime
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

  const calculateGross = (staffId: string) => getAttendanceCount(staffId) * (rates[staffId] || 0);
  const calculateTax = (staffId: string) => Math.floor(calculateGross(staffId) * TAX_RATE);
  const calculateNet = (staffId: string) => calculateGross(staffId) - calculateTax(staffId);

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

  const qrValue = `VALIDASI HONORARIUM\nSekolah: ${config.name}\nBulan: ${format(new Date(year, month, 1), 'MMMM yyyy', { locale: id })}\nPejabat: ${config.principalName}`;

  return (
    <div className="space-y-6 animate-fade-in pb-10 bg-slate-50 min-h-screen p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2 max-w-[1600px] mx-auto">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Penerimaan Honor BOS</h2>
          <p className="text-slate-500 font-bold text-sm italic">Terintegrasi otomatis dengan database absensi realtime.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleGenerateReceipt} disabled={saveLoading} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2">
            {saveLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan Arsip
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-[1600px] mx-auto">
        {/* Panel Pengaturan */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Kategori</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setActiveCategory('extra')} className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border ${activeCategory === 'extra' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                  <Music size={24} /><span className="text-[10px] font-black uppercase">Ekskul</span>
                </button>
                <button onClick={() => setActiveCategory('tukang')} className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border ${activeCategory === 'tukang' ? 'bg-amber-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                  <Hammer size={24} /><span className="text-[10px] font-black uppercase">Tukang</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tarif Per Pertemuan/Hari (Rp)</label>
               <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                  {currentStaffList.map(s => (
                    <div key={s.id} className="space-y-1">
                      <p className="text-[9px] font-black text-slate-600 uppercase truncate">{s.name}</p>
                      <input type="number" value={rates[s.id] || ''} onChange={(e) => handleRateChange(s.id, e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold" placeholder="Input Tarif..." />
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>

        {/* Area Preview */}
        <div className="lg:col-span-9 overflow-x-auto bg-slate-200/50 rounded-[2.5rem] p-4 flex justify-center">
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
                    <h1 className="text-[16pt] font-black uppercase my-1">{config.name}</h1>
                    <p className="text-[9pt] font-bold italic">{config.address}</p>
                 </div>
                 <img src={config.logoUrl} className="w-full h-auto object-contain" />
              </div>

              <div className="text-center mb-8">
                 <h2 className="text-[14pt] font-bold underline uppercase">DAFTAR PENERIMAAN HONORARIUM</h2>
                 <p className="text-[11pt] uppercase tracking-widest mt-1">BULAN : {format(new Date(year, month, 1), 'MMMM yyyy', { locale: id })}</p>
              </div>

              <table className="w-full border-collapse border-black border-[1.5pt] text-[9pt]">
                 <thead>
                    <tr className="bg-slate-50">
                       <th className="border border-black p-2 w-10 text-center">NO</th>
                       <th className="border border-black p-2 text-left">NAMA PENERIMA</th>
                       <th className="border border-black p-2 text-center w-20">JML</th>
                       <th className="border border-black p-2 text-right w-40">BRUTO (Rp)</th>
                       <th className="border border-black p-2 text-right w-36">PPh21 (5%)</th>
                       <th className="border border-black p-2 text-right w-40">NETTO (Rp)</th>
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
                           <td className="border border-black p-2 font-bold">{s.name}</td>
                           <td className="border border-black p-2 text-center font-bold">{count}</td>
                           <td className="border border-black p-2 text-right">{gross.toLocaleString('id-ID')}</td>
                           <td className="border border-black p-2 text-right italic">({tax.toLocaleString('id-ID')})</td>
                           <td className="border border-black p-2 text-right font-bold">{net.toLocaleString('id-ID')}</td>
                           <td className="border border-black p-2 text-left relative">
                              <span className="text-[7pt] text-slate-400 absolute top-1 left-1">{idx + 1}.</span>
                           </td>
                        </tr>
                      );
                    })}
                 </tbody>
              </table>

              <div className="mt-12 flex justify-end px-10 text-[10pt]">
                 <div className="text-center w-[300px]">
                    <p className="mb-1">Kediri, {format(new Date(), 'dd MMMM yyyy', { locale: id })}</p>
                    <p className="font-bold uppercase mb-2">Kepala Sekolah {config.name}</p>
                    <div className="h-24 flex items-center justify-center my-2">
                       <QRCodeSVG value={qrValue} size={80} level="H" />
                    </div>
                    <p className="font-bold underline uppercase">{config.principalName}</p>
                    <p>NIP. {config.principalNip}</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
      
      {/* Zoom Control */}
      <div className="fixed bottom-6 right-6 flex gap-2 z-50 print:hidden">
        <button onClick={() => setScale(Math.max(0.4, scale - 0.1))} className="p-3 bg-white border shadow-lg rounded-2xl hover:bg-slate-50"><ZoomOut size={20}/></button>
        <button onClick={() => setScale(0.85)} className="px-4 bg-white border shadow-lg rounded-2xl font-bold text-xs uppercase">Reset</button>
        <button onClick={() => setScale(Math.min(1.2, scale + 0.1))} className="p-3 bg-white border shadow-lg rounded-2xl hover:bg-slate-50"><ZoomIn size={20}/></button>
      </div>
    </div>
  );
};

export default HonorManager;
