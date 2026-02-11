import React, { useState, useEffect, useRef } from 'react';
import { Printer, Loader2, FileText, Layout, UserPlus, Info, QrCode } from 'lucide-react';
import { subscribeToConfig, subscribeToTemplates, LetterTemplate } from '../services/storage';
import { SchoolConfig } from '../types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { QRCodeSVG } from 'qrcode.react';

const SmartContentRenderer = ({ text }: { text: string }) => {
  const lines = text.split('\n');
  const renderedBlocks: React.ReactNode[] = [];
  let tableRows: string[][] = [];
  let isInTableMode = false;

  const flushTable = () => {
    if (tableRows.length > 0) {
      const firstRow = tableRows[0];
      const hasHeader = firstRow.some(cell => 
        ['nama', 'jabatan', 'no', 'kelas', 'rekening', 'id', 'virtual', 'peserta'].some(k => cell.toLowerCase().includes(k))
      );
      
      renderedBlocks.push(
        <div key={`table-wrapper-${renderedBlocks.length}`} className="mb-6 break-inside-avoid px-0 w-full overflow-x-auto">
          <table className="w-full border-collapse border-[1.5pt] border-black text-[10.5pt] text-black font-serif">
            <thead>
              {hasHeader && (
                <tr className="bg-slate-50 print:bg-transparent">
                  {tableRows[0].map((cell, idx) => (
                    <th key={idx} className="border border-black p-2 text-center font-bold uppercase font-serif align-middle bg-slate-50/50 print:bg-transparent">{cell.trim()}</th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {tableRows.slice(hasHeader ? 1 : 0).map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className={`border border-black px-2 py-1.5 font-serif align-top ${cellIdx === 0 ? 'text-center w-10' : ''} ${cellIdx === 2 && row.length > 4 ? 'text-center w-16' : ''}`}>
                      {cell.trim() || ' '}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      isInTableMode = false;
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed === '') {
      flushTable();
      renderedBlocks.push(<div className="h-2" key={`br-${index}`}></div>);
      return;
    }

    const columns = line.split(':');
    const hasManyColumns = columns.length >= 3;
    const isNumberedData = /^\d+\./.test(trimmed);
    const isLetteredData = /^[a-zA-Z]\./.test(trimmed);
    const isContinuedData = line.startsWith(':');
    const shouldBeInTable = hasManyColumns || (isInTableMode && (isNumberedData || isContinuedData));

    if (trimmed === '[PAGE_BREAK]') {
      flushTable();
      renderedBlocks.push(<div key={`pb-${index}`} className="page-breaker print:break-after-page h-0 my-1 relative border-t border-dashed border-slate-300 print:border-none print:my-0"></div>);
      return;
    }

    if (shouldBeInTable) {
      isInTableMode = true;
      let finalRow = columns;
      if (columns.length < 3 && isNumberedData) {
        const match = trimmed.match(/^(\d+\.)\s*(.*)/);
        if (match) {
          finalRow = [match[1], match[2], '', '', ''];
        }
      }
      tableRows.push(finalRow);
      return;
    }

    flushTable();

    // Deteksi Judul Tengah / Kapital
    if (trimmed.startsWith('PASAL') || trimmed === 'MEMUTUSKAN' || (trimmed === trimmed.toUpperCase() && trimmed.length < 60 && trimmed.length > 3 && !trimmed.includes(':'))) {
      renderedBlocks.push(<div key={`title-${index}`} className="mt-5 mb-2 font-bold text-center text-black font-serif uppercase tracking-wider underline underline-offset-4 decoration-1">{trimmed}</div>);
    } 
    // Deteksi Format Kolom Info (Label : Isi)
    else if (columns.length === 2 && !trimmed.endsWith(':')) {
      const isKonsideran = ['menimbang', 'mengingat', 'memperhatikan', 'menetapkan', 'hari/tanggal', 'waktu', 'tempat', 'keperluan'].some(k => columns[0].trim().toLowerCase().includes(k));
      renderedBlocks.push(
        <div key={`info-${index}`} className={`flex mb-1 break-inside-avoid text-black font-serif ${isKonsideran ? 'mt-3' : 'pl-8'}`}>
          <span className={`${isKonsideran ? 'w-[120px] font-bold' : 'w-[28%]'} shrink-0 align-top`}>{columns[0].trim()}</span>
          <span className="w-[15px] text-center shrink-0">:</span>
          <span className="flex-1 pl-1 text-justify">{columns[1].trim()}</span>
        </div>
      );
    } 
    // Deteksi Daftar (List 1. 2. a. b. -)
    else if (/^(\d+\.|[a-zA-Z]\.|-)\s/.test(trimmed)) {
       const match = trimmed.match(/^(\d+\.|[a-zA-Z]\.|-)\s+(.*)/);
       if (match) renderedBlocks.push(<div key={`list-${index}`} className="flex mb-1 pl-8 font-serif text-black leading-relaxed"><span className="w-8 shrink-0">{match[1]}</span><span className="flex-1 text-justify">{match[2]}</span></div>);
    }
    // Paragraf Biasa
    else {
      const lower = trimmed.toLowerCase();
      const isIntro = lower.startsWith('dengan hormat') || lower.startsWith('yang bertanda tangan') || lower.startsWith('menindaklanjuti');
      const isClosing = lower.startsWith('demikian') || lower.startsWith('atas perhatian');
      renderedBlocks.push(<p key={`p-${index}`} className={`mb-3 text-justify font-serif text-black leading-[1.6] ${isIntro || isClosing ? '' : 'indent-10'}`}>{trimmed}</p>);
    }
  });
  
  flushTable();
  return <div className="font-serif text-black leading-relaxed text-[11pt]">{renderedBlocks}</div>;
};

const LetterCreator: React.FC = () => {
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplate | null>(null);
  const isInitialized = useRef({ config: false, templates: false });
  const [useQRCode, setUseQRCode] = useState(true);

  const [formData, setFormData] = useState({
    refNumber: `422/..../419.42.03.135/${new Date().getFullYear()}`,
    date: new Date().toISOString().split('T')[0],
    recipient: '',
    signatureTitle: 'Kepala Sekolah',
    signerName: '',
    signerNip: '',
    signerNamePihak2: '( ........................................... )',
    subject: '',
    content: ''
  });

  useEffect(() => {
    const unsubscribeConfig = subscribeToConfig((newConfig) => {
      setConfig(newConfig);
      if (!isInitialized.current.config) {
        setFormData(prev => ({ 
          ...prev, 
          signerName: newConfig.principalName, 
          signerNip: newConfig.principalNip 
        }));
        isInitialized.current.config = true;
      }
    });

    const unsubscribeTemplates = subscribeToTemplates((data) => {
      setTemplates(data);
      if (data.length > 0 && !isInitialized.current.templates) {
        const firstTemplate = data[0];
        setSelectedTemplate(firstTemplate);
        setFormData(prev => ({ 
          ...prev, 
          subject: firstTemplate.subject, 
          content: firstTemplate.content 
        }));
        isInitialized.current.templates = true;
      }
    });

    return () => { unsubscribeConfig(); unsubscribeTemplates(); };
  }, []);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const template = templates.find(t => t.id === e.target.value);
    if (template) {
      setSelectedTemplate(template);
      setFormData(prev => ({ 
        ...prev, 
        subject: template.subject, 
        content: template.content, 
        signatureTitle: template.category === 'Tugas' ? 'Kepala Sekolah,' : 'Kepala Sekolah' 
      }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (!config || templates.length === 0) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-indigo-600"/></div>;

  const isMOU = selectedTemplate?.category === 'Kerjasama';
  const isCenteredLayout = selectedTemplate?.layout === 'centered';
  const contentParts = formData.content.split('[PAGE_BREAK]');

  // Data QR Code
  const qrValue = `DOKUMEN SAH SDN ${config.name.toUpperCase()}\nNomor: ${formData.refNumber}\nPejabat: ${formData.signerName}\nTanggal: ${formData.date}`;

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-6 animate-fade-in text-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">Editor Surat Digital</h2>
            <p className="text-slate-500 text-xs font-medium">Drafting naskah dinas dengan pratinjau F4.</p>
          </div>
        </div>
        <button onClick={() => window.print()} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 font-bold text-sm flex items-center gap-2">
          <Printer size={18} /> Cetak / PDF
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
        {/* Editor Sidebar */}
        <div className="w-full lg:w-[420px] flex flex-col gap-4 overflow-y-auto pr-2 print:hidden shrink-0">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-5 shadow-sm">
             <div>
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Templat Surat</label>
               <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700 transition-all" onChange={handleTemplateChange} value={selectedTemplate?.id}>
                 {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
               </select>
             </div>
             
             <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Judul/Perihal</label>
                  <input name="subject" value={formData.subject} onChange={handleInputChange} placeholder="PERIHAL SURAT" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold uppercase" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. Surat</label>
                     <input name="refNumber" value={formData.refNumber} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono" />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</label>
                     <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                   </div>
                </div>
                {!isCenteredLayout && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Penerima (Yth.)</label>
                    <input name="recipient" value={formData.recipient} onChange={handleInputChange} placeholder="Kepada Yth..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  </div>
                )}
             </div>

             <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanda Tangan</label>
                  <button onClick={() => setUseQRCode(!useQRCode)} className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${useQRCode ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <QrCode size={14} /> {useQRCode ? 'QR Aktif' : 'QR Mati'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input name="signerName" value={formData.signerName} onChange={handleInputChange} placeholder="Nama Pejabat" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                  <input name="signerNip" value={formData.signerNip} onChange={handleInputChange} placeholder="NIP" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                </div>
                {isMOU && <input name="signerNamePihak2" value={formData.signerNamePihak2} onChange={handleInputChange} placeholder="Nama Pihak Kedua" className="w-full px-3 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-bold" />}
             </div>
          </div>
          
          <div className="bg-white p-5 rounded-3xl border border-slate-200 flex-1 flex flex-col min-h-[350px] shadow-sm">
             <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Isi Naskah</label>
                <button onClick={() => setFormData(prev => ({...prev, content: prev.content + '\n[PAGE_BREAK]\n'}))} className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg border border-indigo-100 flex items-center gap-1.5 hover:bg-indigo-100 transition-all">
                  <Layout size={12} /> Tambah Halaman
                </button>
             </div>
             <textarea name="content" value={formData.content} onChange={handleInputChange} className="w-full flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-mono text-[11px] leading-relaxed resize-none focus:ring-2 focus:ring-indigo-500 transition-all" />
             <div className="mt-3 text-[9px] text-slate-400 font-medium italic flex items-center gap-1">
               <Info size={10} /> Gunakan tanda titik dua (:) untuk format tabel otomatis.
             </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 bg-slate-200/50 rounded-3xl border border-slate-200 overflow-y-auto p-8 flex flex-col items-center gap-10 print:p-0 print:m-0 print:bg-white print:block">
           {contentParts.map((part, pIdx) => (
             <div key={pIdx} className="letter-paper bg-white w-[215mm] shadow-2xl relative print:shadow-none print:w-full print:min-h-0 flex flex-col text-black font-serif mb-10 print:mb-0">
                {pIdx === 0 && (
                  <div className="border-b-[4.5pt] border-double border-black pb-3 mb-2 grid grid-cols-[90px_1fr_90px] items-center text-black">
                     <div className="flex justify-center">{config.logoDaerahUrl && <img src={config.logoDaerahUrl} className="w-[22mm] h-auto" />}</div>
                     <div className="text-center w-full px-4">
                        <h3 className="text-[12pt] font-bold uppercase leading-tight">{config.headerLine1}</h3>
                        <h3 className="text-[12pt] font-bold uppercase leading-tight">{config.headerLine2}</h3>
                        <h1 className="text-[18pt] font-black uppercase my-1 leading-none tracking-tight">{config.name}</h1>
                        <p className="text-[9pt] italic font-medium">{config.address}</p>
                        <p className="text-[9pt] font-bold">NPSN: {config.npsn} | Email: {config.email}</p>
                     </div>
                     <div className="flex justify-center">{config.logoUrl && <img src={config.logoUrl} className="w-[22mm] h-auto" />}</div>
                  </div>
                )}
                
                <div className="flex-1 flex flex-col pt-5">
                   {pIdx === 0 && (
                     isCenteredLayout ? (
                       <div className="text-center mb-6">
                         <h2 className="text-[13pt] font-bold uppercase underline underline-offset-4 decoration-2 tracking-wide leading-tight">{formData.subject}</h2>
                         <p className="text-[11pt] mt-1 font-bold">Nomor: {formData.refNumber}</p>
                       </div>
                     ) : (
                       <div className="mb-6 text-black">
                         <div className="flex justify-end mb-4"><p className="text-[11pt]">Kediri, {format(new Date(formData.date), 'dd MMMM yyyy', { locale: id })}</p></div>
                         <div className="space-y-0.5 flex flex-col">
                            <div className="flex"><span className="w-24">Nomor</span><span>: {formData.refNumber}</span></div>
                            <div className="flex"><span className="w-24">Lampiran</span><span>: -</span></div>
                            <div className="flex"><span className="w-24">Perihal</span><span className="font-bold underline underline-offset-2">: {formData.subject}</span></div>
                         </div>
                         <div className="mt-6"><p>Kepada Yth.</p><p className="font-bold">{formData.recipient || '................................'}</p><p>di Tempat</p></div>
                       </div>
                     )
                   )}
                   
                   <div className="flex-1"><SmartContentRenderer text={part} /></div>

                   {pIdx === contentParts.length - 1 && (
                     <div className={`mt-10 break-inside-avoid grid ${isMOU ? 'grid-cols-2' : 'grid-cols-1'} gap-6 text-[11pt] font-serif`}>
                        {isMOU && (
                          <div className="flex flex-col text-center">
                            <p className="mb-1">&nbsp;</p>
                            <p className="font-bold uppercase tracking-wider mb-2">PIHAK KEDUA,</p>
                            <div className="h-24"></div>
                            <p className="font-bold underline uppercase">{formData.signerNamePihak2}</p>
                          </div>
                        )}
                        <div className={`${!isMOU ? 'ml-auto w-[320px]' : ''} flex flex-col items-center text-center`}>
                           {isCenteredLayout && pIdx === 0 && <p className="mb-1">Kediri, {format(new Date(formData.date), 'dd MMMM yyyy', { locale: id })}</p>}
                           {isMOU && <p className="font-bold uppercase tracking-wider mb-2">PIHAK PERTAMA,</p>}
                           <p className="font-bold">{formData.signatureTitle}</p>
                           
                           <div className="h-28 flex items-center justify-center">
                             {useQRCode ? (
                               <div className="p-1.5 border border-black/5 bg-white">
                                 <QRCodeSVG value={qrValue} size={85} level="H" />
                               </div>
                             ) : (
                               <div className="h-full"></div>
                             )}
                           </div>

                           <p className="font-bold underline underline-offset-4 decoration-2 uppercase tracking-wide">{formData.signerName}</p>
                           <p className="font-bold">{formData.signerNip ? `NIP. ${formData.signerNip}` : ''}</p>
                        </div>
                     </div>
                   )}
                </div>
                <div className="absolute bottom-6 right-10 text-[8pt] italic text-slate-300 print:hidden font-sans">Halaman {pIdx + 1}</div>
             </div>
           ))}
        </div>
      </div>
      <style>{`.letter-paper { padding: 5mm 20mm 20mm 30mm; min-height: 297mm; } @media print { @page { size: 215mm 330mm portrait; margin: 0; } body * { visibility: hidden; } .letter-paper, .letter-paper * { visibility: visible !important; } .letter-paper { position: relative !important; width: 100% !important; height: 330mm !important; margin: 0 !important; padding: 5mm 20mm 20mm 30mm !important; display: block !important; page-break-after: always !important; } .page-breaker { display: none !important; } table { border: 1.5pt solid black !important; } th, td { border: 1pt solid #000 !important; } * { color: black !important; } }`}</style>
    </div>
  );
};

export default LetterCreator;