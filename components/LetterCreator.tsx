import React, { useState, useEffect } from 'react';
import { Save, Printer, ChevronDown, CheckCircle2, Scissors, Loader2, QrCode, Key, AlertTriangle } from 'lucide-react';
import { LETTER_TEMPLATES } from '../constants';
import { subscribeToConfig, saveMail } from '../services/storage';
import { Mail, MailType, MailStatus, UrgencyLevel, SchoolConfig } from '../types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { QRCodeSVG } from 'qrcode.react';

// Komponen Pembantu untuk Merender Isi Surat agar Titik Dua Lurus Otomatis
const SmartContentRenderer = ({ text }: { text: string }) => {
  const lines = text.split('\n');
  const renderedBlocks: React.ReactNode[] = [];
  let tableRows: { label: string; separator: string; value: string }[] = [];

  const flushTable = () => {
    if (tableRows.length > 0) {
      renderedBlocks.push(
        <div key={`table-wrapper-${renderedBlocks.length}`} className="pl-8 mb-4 break-inside-avoid print:break-inside-avoid">
          <table className="w-full border-collapse table-fixed">
            <tbody>
              {tableRows.map((row, idx) => (
                <tr key={idx}>
                  <td className="align-top pb-1 w-[28%] whitespace-nowrap pr-2 font-serif">{row.label}</td>
                  <td className="align-top pb-1 px-1 w-[2%] font-serif">{row.separator}</td>
                  <td className="align-top pb-1 w-[70%] font-serif break-words">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // 1. Deteksi Garis Potong (Cut Line)
    if (trimmed.includes('✂') || trimmed.includes('-CUT-LINE')) {
      flushTable();
      renderedBlocks.push(
        <div key={`cut-${index}`} className="flex items-center gap-4 my-6 select-none print:break-inside-avoid">
          <Scissors size={16} className="text-black transform -rotate-90" />
          <div className="flex-1 border-b-2 border-dashed border-black"></div>
        </div>
      );
      return;
    }

    // 2. Deteksi Judul Pasal (Penting untuk MOU)
    if (trimmed.startsWith('PASAL')) {
      flushTable();
      renderedBlocks.push(
        <div key={`pasal-${index}`} className="mt-6 mb-2 font-bold text-center print:break-after-avoid">
          {trimmed}
        </div>
      );
      return;
    }

    // 3. Deteksi pola "Label : Value"
    const colonIndex = line.indexOf(':');
    
    if (trimmed.startsWith('NSS') && colonIndex > 0) {
       flushTable();
       renderedBlocks.push(
         <div key={`nss-${index}`} className="flex items-center mb-4 pl-8 break-inside-avoid">
            <span className="w-[28%] pr-2 font-serif">NSS</span>
            <span className="w-[2%] px-1 font-serif">:</span>
            <span className="font-mono text-lg tracking-[0.3em] border border-black px-2 py-0.5 bg-white inline-block h-8 min-w-[200px]">
               {line.substring(colonIndex + 1).trim()}
            </span>
         </div>
       );
       return;
    }

    if (colonIndex > 0 && colonIndex < 35 && trimmed.length > 0) {
         const label = line.substring(0, colonIndex).trim();
         const value = line.substring(colonIndex + 1).trim();
         
         const isSectionHeader = value === '' && (label.toLowerCase().includes('bahwa') || label.toLowerCase().includes('kepada') || label.toLowerCase().includes('berikut'));
         
         if (isSectionHeader) {
             flushTable();
             renderedBlocks.push(<p key={`p-${index}`} className="mb-2 text-justify font-serif">{line}</p>);
         } else {
             tableRows.push({ label, separator: ':', value });
         }
    } else {
      flushTable();
      if (trimmed === '') {
         renderedBlocks.push(<div className="h-4" key={`br-${index}`}></div>);
      } else {
         const isIndentedContext = line.startsWith('    ') || line.startsWith('\t');
         renderedBlocks.push(
           <p key={`p-${index}`} className={`mb-2 text-justify whitespace-pre-wrap break-inside-avoid print:break-inside-avoid font-serif ${isIndentedContext ? 'pl-8' : ''}`}>
             {line}
           </p>
         );
      }
    }
  });
  flushTable();

  return <div className="font-serif text-black leading-relaxed text-[11pt]">{renderedBlocks}</div>;
};

const LetterCreator: React.FC = () => {
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(LETTER_TEMPLATES[0]);
  const [useQRCode, setUseQRCode] = useState(false);
  const [formData, setFormData] = useState({
    refNumber: `422/150/419.42.03.135/${new Date().getFullYear()}`,
    date: new Date().toISOString().split('T')[0],
    recipient: '',
    signatureTitle: 'Kepala Sekolah',
    signerName: '',
    signerNip: '',
    signerNamePihak2: '( ........................................... )',
    content: LETTER_TEMPLATES[0].content
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToConfig((newConfig) => {
      setConfig(newConfig);
      setFormData(prev => ({
        ...prev,
        signerName: prev.signerName || `( ${newConfig.principalName} )`,
        signerNip: prev.signerNip || newConfig.principalNip
      }));
    });
    return () => unsubscribe();
  }, []);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const template = LETTER_TEMPLATES.find(t => t.id === e.target.value);
    if (template) {
      setSelectedTemplate(template);
      const isMOU = template.category === 'Kerjasama';
      const isMutasiKeluar = template.id === 't_mutasi_keluar';
      
      setFormData(prev => ({ 
        ...prev, 
        content: template.content,
        signatureTitle: isMOU ? 'Kepala Sekolah,' : (isMutasiKeluar ? 'Kepala Sekolah,' : (template.signatureTitle || 'Kepala Sekolah')),
        signerName: (isMutasiKeluar || isMOU) ? `( ${config?.principalName || 'Nama Kepala Sekolah'} )` : `( ${config?.principalName || 'Nama Kepala Sekolah'} )`,
        signerNip: (isMutasiKeluar || isMOU) ? (config?.principalNip || '...................................') : (config?.principalNip || '...................................')
      }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setIsSaved(false);
    setSaveError(null);
  };

  const handlePrint = () => window.print();

  const handleSaveToOutbox = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const newMail: Mail = {
        id: Date.now().toString(),
        type: MailType.OUTGOING,
        referenceNumber: formData.refNumber,
        date: formData.date,
        receivedDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        sender: formData.recipient || 'Pihak Terkait',
        subject: selectedTemplate.subject,
        description: `Surat dibuat menggunakan template: ${selectedTemplate.name}`,
        category: selectedTemplate.category,
        urgency: UrgencyLevel.LOW,
        status: MailStatus.ARCHIVED,
        fileUrl: '', 
        aiSummary: 'Surat dibuat otomatis melalui fitur Buat Surat.'
      };
      await saveMail(newMail);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (e: any) {
      setSaveError("Gagal menyimpan surat.");
    } finally {
      setIsSaving(false);
    }
  };

  const isCentered = selectedTemplate.layout === 'centered';
  const isMOU = selectedTemplate.category === 'Kerjasama';

  const qrData = JSON.stringify({
    tipe: "Surat Resmi Digital",
    sekolah: config?.name,
    nomor: formData.refNumber,
    tanggal: formData.date,
    ttd: formData.signerName.replace(/[()]/g, '').trim(),
    nip: formData.signerNip
  });

  if (!config) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-indigo-600"/></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">Buat Surat</h2>
          <p className="text-slate-500 text-sm">Pilih template dan edit surat dengan mudah.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={handleSaveToOutbox} disabled={isSaving} className={`flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${isSaved ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            {isSaving ? <Loader2 size={18} className="animate-spin mr-2"/> : (isSaved ? <CheckCircle2 size={18} className="mr-2"/> : <Save size={18} className="mr-2"/>)}
            {isSaved ? 'Tersimpan' : 'Simpan ke Arsip'}
          </button>
          <button onClick={handlePrint} className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 font-bold text-sm">
            <Printer size={18} className="mr-2"/>
            Cetak / PDF
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
        <div className="w-full lg:w-5/12 flex flex-col gap-4 overflow-y-auto pr-2 print:hidden">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
             <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Pilih Template</label>
               <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700" onChange={handleTemplateChange} value={selectedTemplate.id}>
                 {LETTER_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
               </select>
             </div>
             <div className="grid grid-cols-2 gap-3">
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nomor Surat</label>
                  <input name="refNumber" value={formData.refNumber} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Tanggal</label>
                  <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
               </div>
             </div>
             {isMOU && (
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nama Pihak Kedua (Guru/Instansi)</label>
                  <input name="signerNamePihak2" placeholder="Contoh: ( Budi Santoso, S.Pd )" value={formData.signerNamePihak2} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
               </div>
             )}
             <div className="pt-2 border-t border-slate-100 space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Info Tanda Tangan Pihak Pertama (Sekolah)</label>
                <input name="signatureTitle" value={formData.signatureTitle} onChange={handleInputChange} placeholder="Jabatan" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                <div className="grid grid-cols-2 gap-3">
                   <input name="signerName" value={formData.signerName} onChange={handleInputChange} placeholder="Nama Lengkap" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                   <input name="signerNip" value={formData.signerNip} onChange={handleInputChange} placeholder="NIP" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <label className="flex items-center p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
                   <input type="checkbox" checked={useQRCode} onChange={(e) => setUseQRCode(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded border-slate-300"/>
                   <span className="ml-3 text-sm font-bold text-slate-700">Tanda Tangan Digital (QR)</span>
                </label>
             </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex-1 flex flex-col min-h-[500px]">
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex justify-between">Isi Surat</label>
             <textarea name="content" value={formData.content} onChange={handleInputChange} className="w-full flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-serif text-slate-800 leading-relaxed text-base" />
          </div>
        </div>

        <div className="w-full lg:w-7/12 bg-slate-200/50 rounded-2xl border border-slate-200 overflow-y-auto p-4 md:p-8 flex justify-center print:bg-white print:p-0 print:border-0 print:overflow-visible print:w-full print:absolute print:top-0 print:left-0 print:z-50">
           <div className="bg-white w-[215mm] min-h-[330mm] shadow-2xl p-[20mm] mx-auto relative print:shadow-none print:w-full print:m-0 flex flex-col">
              <div className="border-b-[4px] border-double border-black pb-4 mb-6 pt-2 grid grid-cols-[120px_1fr_120px] items-center">
                 <div className="flex justify-center items-center h-full">
                   {config.logoDaerahUrl ? <img src={config.logoDaerahUrl} className="w-[24mm] h-auto object-contain max-h-[28mm]" alt="Logo Daerah"/> : <div className="w-[24mm]"></div>}
                 </div>
                 <div className="text-center w-full px-1">
                    <h3 className="text-[14pt] font-bold uppercase leading-tight font-serif text-black">{config.headerLine1}</h3>
                    <h3 className="text-[14pt] font-bold uppercase leading-tight font-serif text-black">{config.headerLine2}</h3>
                    <h1 className="text-[18pt] font-extrabold uppercase my-1 leading-none font-serif text-black">{config.name}</h1>
                    <p className="text-[10pt] font-serif leading-tight mt-1 text-black">{config.address}</p>
                    <p className="text-[10pt] font-serif leading-tight text-black">Email: {config.email}</p>
                 </div>
                 <div className="flex justify-center items-center h-full">
                   {config.logoUrl ? <img src={config.logoUrl} className="w-[24mm] h-auto object-contain max-h-[28mm]" alt="Logo Sekolah"/> : <div className="w-[24mm]"></div>}
                 </div>
              </div>

              <div className="font-serif text-black leading-relaxed flex-1 flex flex-col">
                 <div className="text-center mb-6 break-inside-avoid">
                    <h2 className="text-[12pt] font-bold underline uppercase tracking-wide">{selectedTemplate.subject}</h2>
                    <p className="mt-0 font-bold text-[11pt]">NO : {formData.refNumber}</p>
                 </div>
                 <div className="flex-1">
                    <SmartContentRenderer text={formData.content} />
                 </div>

                 <div className={`mt-8 break-inside-avoid print:break-inside-avoid ${isMOU ? 'grid grid-cols-2 gap-8' : 'flex justify-end'}`}>
                    {isMOU && (
                      <div className="text-center font-serif text-[11pt]">
                         <p className="mb-1">&nbsp;</p>
                         <p>PIHAK KEDUA,</p>
                         <div className="h-24"></div>
                         <p className="font-bold underline">{formData.signerNamePihak2}</p>
                         <p>&nbsp;</p>
                      </div>
                    )}
                    <div className="text-center font-serif text-[11pt]">
                       <p className="mb-1">Kediri, {format(new Date(formData.date), 'dd MMMM yyyy', { locale: id })}</p>
                       <p>{isMOU ? 'PIHAK PERTAMA,' : formData.signatureTitle}</p>
                       {useQRCode ? (
                         <div className="h-24 flex justify-center items-center my-1 relative">
                             <div className="border-2 border-slate-900 p-1 rounded-lg">
                               <QRCodeSVG value={qrData} size={80} level="M"/>
                             </div>
                         </div>
                       ) : <div className="h-24"></div>}
                       <p className="font-bold underline">{formData.signerName}</p>
                       <p>{formData.signerNip ? `NIP. ${formData.signerNip}` : ''}</p>
                    </div>
                 </div>

                 {useQRCode && (
                   <div className="mt-12 border border-slate-400 p-2 flex items-center gap-3 w-full break-inside-avoid">
                     <div className="flex items-center gap-2 shrink-0 border-r-2 border-[#009ee0] pr-3">
                        <div className="w-10 h-10 rounded-full bg-[#009ee0] flex items-center justify-center text-white relative">
                           <Key size={20} className="-rotate-45" />
                        </div>
                        <div className="flex flex-col text-[7pt] font-extrabold text-[#009ee0] leading-tight">
                          <span>Balai</span><span>Sertifikasi</span><span>Elektronik</span>
                        </div>
                     </div>
                     <div className="text-[7pt] font-sans text-slate-800 leading-[1.2]">
                       <p className="mb-0 italic">Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat elektronik yang diterbitkan BSrE sesuai UU ITE No. 19 Tahun 2016.</p>
                     </div>
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>
      <style>{`
        @media print {
          @page { size: 215mm 330mm; margin: 0; }
          body * { visibility: hidden; }
          .bg-slate-200\\/50 { background: white !important; padding: 0 !important; overflow: visible !important; }
          .bg-white.w-\\[215mm\\] { visibility: visible !important; position: absolute; left: 0; top: 0; width: 100%; margin: 0; box-shadow: none; }
          .bg-white.w-\\[215mm\\] * { visibility: visible; }
          .break-inside-avoid { break-inside: avoid !important; -webkit-column-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
};

export default LetterCreator;