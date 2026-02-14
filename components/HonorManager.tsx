
import React, { useState, useEffect, useRef } from 'react';
import { Coins, Printer, Loader2, Save, Users, Calendar, ArrowRight, Receipt, Music, Hammer, CheckCircle2, ChevronLeft, FileDown } from 'lucide-react';
import { subscribeToConfig, subscribeToStaff, StaffMember, saveMail } from '../services/storage';
import { SchoolConfig, Mail, MailType, MailStatus, UrgencyLevel } from '../types';
import { format } from 'date-fns';
// Fix: Import Indonesian locale from the specific subpath to avoid index export issues
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

  const calculateTotal = (staffId: string) => {
    return getAttendanceCount(staffId) * (rates[staffId] || 0);
  };

  const handleGenerateReceipt = async () => {
    if (!receiptRef.current) return;
    setSaveLoading(true);
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
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
        sender: 'Bendahara Sekolah',
        subject: `Daftar Honor ${activeCategory} - ${period}`,
        description: `Rekapitulasi honor bulan ${period}.`,
        category: 'Absensi',
        urgency: UrgencyLevel.LOW,
        status: MailStatus.ARCHIVED,
        fileUrl: pdfDataUri,
      };
      await saveMail(newMail);
      alert('Tersimpan.');
      navigate('/outbox');
    } catch (e: any) {
      alert('Gagal: ' + e.message);
    } finally {
      setSaveLoading(false);
    }
  };

  if (!config) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 animate-fade-in pb-20">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-3xl font-black">Penerimaan Honor</h2>
        <div className="flex gap-3">
          <button onClick={() => window.print()} className="px-6 py-3 bg-white border rounded-2xl font-black text-xs">Cetak</button>
          <button onClick={handleGenerateReceipt} disabled={saveLoading} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs">{saveLoading ? '...' : 'Simpan Arsip'}</button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-6 print:hidden">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setActiveCategory('extra')} className={`py-4 rounded-2xl flex flex-col items-center border ${activeCategory === 'extra' ? 'bg-indigo-600 text-white' : 'bg-slate-50'}`}><Music/><span className="text-[10px] font-black uppercase">Ekskul</span></button>
              <button onClick={() => setActiveCategory('tukang')} className={`py-4 rounded-2xl flex flex-col items-center border ${activeCategory === 'tukang' ? 'bg-amber-600 text-white' : 'bg-slate-50'}`}><Hammer/><span className="text-[10px] font-black uppercase">Tukang</span></button>
            </div>
            <div className="bg-indigo-50 p-5 rounded-2xl space-y-3">
               {currentStaffList.map(s => (
                 <div key={s.id} className="space-y-1">
                   <p className="text-[9px] font-black uppercase text-slate-400">{s.name}</p>
                   <input type="number" placeholder="Tarif" value={rates[s.id] || ''} onChange={(e) => handleRateChange(s.id, e.target.value)} className="w-full px-3 py-2 border rounded-lg text-xs" />
                 </div>
               ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-8 p-4 bg-slate-100 rounded-3xl flex justify-center items-start min-h-[800px]">
           <div ref={receiptRef} className="receipt-paper bg-white shadow-2xl p-10 flex flex-col" style={{ width: '215mm', minHeight: '330mm' }}>
              <div className="text-center border-b-2 border-black pb-4 mb-8">
                 <h1 className="text-[16pt] font-black uppercase">{config.name}</h1>
                 <h2 className="text-[14pt] font-bold underline uppercase">DAFTAR PENERIMAAN HONORARIUM</h2>
              </div>
              <table className="w-full border-collapse border border-black">
                 <thead>
                    <tr className="bg-slate-50">
                       <th className="border border-black p-2">NO</th>
                       <th className="border border-black p-2">NAMA</th>
                       <th className="border border-black p-2">HADIR</th>
                       <th className="border border-black p-2 text-right">JUMLAH (Rp)</th>
                    </tr>
                 </thead>
                 <tbody>
                    {currentStaffList.map((s, idx) => (
                      <tr key={s.id}>
                         <td className="border border-black p-3 text-center">{idx + 1}</td>
                         <td className="border border-black p-3 font-bold">{s.name}</td>
                         <td className="border border-black p-3 text-center">{getAttendanceCount(s.id)}</td>
                         <td className="border border-black p-3 text-right font-bold">{calculateTotal(s.id).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .receipt-paper, .receipt-paper * { visibility: visible !important; }
          .receipt-paper { position: fixed !important; left: 0 !important; top: 0 !important; width: 215mm !important; height: 330mm !important; }
        }
      `}</style>
    </div>
  );
};

export default HonorManager;
