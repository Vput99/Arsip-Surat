import React, { useState, useEffect } from 'react';
import { Save, Printer, ChevronDown, CheckCircle2, Scissors, Loader2, QrCode, Key, AlertTriangle } from 'lucide-react';
import { LETTER_TEMPLATES } from '../constants';
import { subscribeToConfig, saveMail } from '../services/storage';
import { Mail, MailType, MailStatus, UrgencyLevel, SchoolConfig } from '../types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { QRCodeSVG } from 'qrcode.react';

const SmartContentRenderer = ({ text, isTableTemplate }: { text: string; isTableTemplate?: boolean }) => {
  const lines = text.split('\n');
  const renderedBlocks: React.ReactNode[] = [];
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (tableRows.length > 0) {
      const firstRow = tableRows[0];
      const hasHeader = firstRow.some(cell => 
        cell.toLowerCase().includes('nama') || 
        cell.toLowerCase().includes('jabatan') || 
        cell.toLowerCase().includes('ekstrakurikuler')
      );

      renderedBlocks.push(
        <div key={`table-wrapper-${renderedBlocks.length}`} className="mb-6 break-inside-avoid">
          <table className="w-full border-collapse border border-black text-[11pt] text-black">
            <thead>
              {hasHeader && (
                <tr className="bg-slate-50 print:bg-transparent">
                  {tableRows[0].map((cell, idx) => (
                    <th key={idx} className="border border-black p-2 text-center font-bold uppercase font-serif text-black align-middle">{cell.trim()}</th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {tableRows.slice(hasHeader ? 1 : 0).map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className={`border border-black p-2 font-serif text-black align-top ${cellIdx === 0 ? 'text-center w-10' : ''} ${cellIdx >= 3 && cellIdx <= 5 ? 'text-right' : ''}`}>
                      {cell.trim()}
                    </td>
                  ))}
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
    
    // 1. Handle Cut Lines
    if (trimmed.includes('✂') || trimmed.includes('-CUT-LINE')) {
      flushTable();
      renderedBlocks.push(
        <div key={`cut-${index}`} className="flex items-center gap-4 my-8 select-none print:my-12 break-inside-avoid">
          <Scissors size={16} className="text-black transform -rotate-90" />
          <div className="flex-1 border-b-2 border-dashed border-black"></div>
        </div>
      );
      return;
    }

    // 2. Handle Pasal / Judul Tengah
    if (trimmed.startsWith('PASAL') || (trimmed === trimmed.toUpperCase() && trimmed.length < 50 && trimmed.length > 3 && !trimmed.includes(':'))) {
      flushTable();
      renderedBlocks.push(<div key={`title-${index}`} className="mt-6 mb-3 font-bold text-center text-black font-serif uppercase tracking-wider break-after-avoid">{trimmed}</div>);
      return;
    }

    // 3. Handle Key:Value pairs (e.g., Nama : Budi)
    const columns = line.split(':');
    if (columns.length > 3) {
      tableRows.push(columns); // Detect as table row if many colons
    } else if (columns.length === 2 && trimmed.length > 0 && !trimmed.endsWith(':')) {
      flushTable();
      const label = columns[0].trim();
      const value = columns[1].trim();
      renderedBlocks.push(
        <div key={`info-${index}`} className="flex mb-1.5 pl-8 break-inside-avoid text-black font-serif">
          <span className="w-[28%] shrink-0">{label}</span>
          <span className="w-[2%] text-center">:</span>
          <span className="flex-1 font-bold pl-1">{value}</span>
        </div>
      );
    } 
    // 4. Handle List Items (Numbered or Bulleted)
    else if (/^(\d+\.|-)\s/.test(trimmed)) {
       flushTable();
       renderedBlocks.push(
         <p key={`list-${index}`} className="mb-2 pl-8 text-justify font-serif text-black leading-relaxed">
           {line}
         </p>
       );
    }
    // 5. Handle Normal Paragraphs
    else {
      flushTable();
      if (trimmed === '') {
         renderedBlocks.push(<div className="h-4" key={`br-${index}`}></div>);
      } else {
         // Cek apakah ini paragraf pembuka/penutup standar (biasanya tidak di indent)
         const isStandardPhrase = trimmed.toLowerCase().startsWith('dengan hormat') || trimmed.toLowerCase().startsWith('demikian');
         const indentClass = isStandardPhrase ? '' : 'indent-12'; // Indentasi sekitar 3rem (48px)

         renderedBlocks.push(
           <p key={`p-${index}`} className={`mb-3 text-justify font-serif text-black leading-[1.6] ${indentClass} ${isTableTemplate && trimmed.toUpperCase() === trimmed && trimmed.length > 10 ? 'font-bold text-center text-[12pt] mb-4 underline !indent-0' : ''}`}>
             {trimmed}
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
  const [formData, setFormData] = useState({
    refNumber: `422/150/419.42.03.135/${new Date().getFullYear()}`,
    date: new Date().toISOString().split('T')[0],
    recipient: '',
    signatureTitle: 'Kepala Sekolah',
    signerName: '',
    signerNip: '',
    signerNameBendahara: '( ........................................... )',
    signerNipBendahara: '',
    signerNamePihak2: '( ........................................... )',
    content: LETTER_TEMPLATES[0].content
  });
  const [isSaving, setIsSaving] = useState(false);

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
      setFormData(prev => ({ 
        ...prev, 
        content: template.content,
        signatureTitle: (template.id === 't_rolstan_pekerja' || template.id === 't_honor_ekskul') ? 'Kepala Sekolah,' : (template.signatureTitle || 'Kepala Sekolah'),
      }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const isMOU = selectedTemplate.category === 'Kerjasama' && 
                selectedTemplate.id !== 't_rolstan_pekerja' && 
                selectedTemplate.id !== 't_honor_ekskul';
  
  const isTableTemplate = selectedTemplate.id === 't_rolstan_pekerja' || 
                          selectedTemplate.id === 't_honor_ekskul';

  if (!config) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-indigo-600"/></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-6 animate-fade-in">
      {/* Header UI */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">Cetak Dokumen Sekolah</h2>
          <p className="text-slate-500 text-sm">Pilih format seperti Rolstan, Honor Ekskul, atau MOU.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={() => window.print()} className="flex-1 md:flex-none flex items-center justify-center px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 font-bold text-sm">
            <Printer size={18} className="mr-2"/>
            Cetak / PDF
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
        {/* Editor UI */}
        <div className="w-full lg:w-5/12 flex flex-col gap-4 overflow-y-auto pr-2 print:hidden">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
             <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Jenis Dokumen</label>
               <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700" onChange={handleTemplateChange} value={selectedTemplate.id}>
                 {LETTER_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
               </select>
             </div>
             
             <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Keterangan / Deskripsi Pekerjaan</label>
                   <input name="recipient" value={formData.recipient} onChange={handleInputChange} placeholder="Contoh: Honor Pembimbing Ekstrakurikuler Semester 1" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800" />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Tanggal Dokumen</label>
                   <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800" />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nomor Surat (Jika Ada)</label>
                   <input name="refNumber" value={formData.refNumber} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800" />
                </div>
             </div>

             {isTableTemplate && (
               <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 space-y-3">
                  <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest">Data Bendahara Sekolah</label>
                  <input name="signerNameBendahara" placeholder="Nama Bendahara (dengan gelar)" value={formData.signerNameBendahara} onChange={handleInputChange} className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm font-bold text-slate-800" />
                  <input name="signerNipBendahara" placeholder="NIP Bendahara" value={formData.signerNipBendahara} onChange={handleInputChange} className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm text-slate-800" />
               </div>
             )}

             <div className="pt-2 border-t border-slate-100 space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Kepala Sekolah (Penanda Tangan Utama)</label>
                <div className="grid grid-cols-2 gap-3">
                   <input name="signerName" value={formData.signerName} onChange={handleInputChange} placeholder="Nama Lengkap" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800" />
                   <input name="signerNip" value={formData.signerNip} onChange={handleInputChange} placeholder="NIP" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800" />
                </div>
             </div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex-1 flex flex-col min-h-[400px]">
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Editor Tabel (Ubah rincian di sini)</label>
             <textarea name="content" value={formData.content} onChange={handleInputChange} className="w-full flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono text-xs leading-relaxed text-slate-800" />
          </div>
        </div>

        {/* Preview Paper */}
        <div className="w-full lg:w-7/12 bg-slate-200/50 rounded-2xl border border-slate-200 overflow-y-auto p-4 md:p-8 flex justify-center print:p-0 print:m-0 print:bg-white print:block">
           <div className="letter-paper bg-white w-[215mm] min-h-[330mm] shadow-2xl mx-auto relative print:shadow-none print:w-full print:min-h-0 flex flex-col text-black">
              {/* Kop Surat */}
              <div className="border-b-[4px] border-double border-black pb-4 mb-6 pt-2 grid grid-cols-[80px_1fr_80px] items-center text-black">
                 <div className="flex justify-center">
                   {config.logoDaerahUrl && <img src={config.logoDaerahUrl} className="w-[18mm] h-auto" alt="Logo Daerah"/>}
                 </div>
                 <div className="text-center w-full">
                    <h3 className="text-[12pt] font-bold uppercase leading-tight font-serif text-black">{config.headerLine1}</h3>
                    <h3 className="text-[12pt] font-bold uppercase leading-tight font-serif text-black">{config.headerLine2}</h3>
                    <h1 className="text-[16pt] font-extrabold uppercase my-1 leading-none font-serif text-black">{config.name}</h1>
                    <p className="text-[8pt] font-serif leading-tight text-black">{config.address}</p>
                 </div>
                 <div className="flex justify-center">
                   {config.logoUrl && <img src={config.logoUrl} className="w-[18mm] h-auto" alt="Logo Sekolah"/>}
                 </div>
              </div>

              {/* Body */}
              <div className="font-serif text-black flex-1 flex flex-col">
                 <div className="flex-1 text-black">
                    <SmartContentRenderer text={formData.content} isTableTemplate={isTableTemplate} />
                 </div>

                 {/* Tanda Tangan Wrapper - break-inside-avoid agar tidak terpotong aneh */}
                 <div className={`mt-10 break-inside-avoid grid ${isTableTemplate ? 'grid-cols-3' : (isMOU ? 'grid-cols-2' : 'grid-cols-1')} gap-4 text-center text-[10pt] font-serif text-black`}>
                    {isTableTemplate && (
                      <div className="flex flex-col text-black">
                        <p>&nbsp;</p>
                        <p>Setuju Dibayar,</p>
                        <p>Bendahara Sekolah</p>
                        <div className="h-24"></div>
                        <p className="font-bold underline">{formData.signerNameBendahara}</p>
                        <p>{formData.signerNipBendahara ? `NIP. ${formData.signerNipBendahara}` : ''}</p>
                      </div>
                    )}
                    
                    {isMOU && (
                      <div className="flex flex-col text-black">
                        <p>&nbsp;</p>
                        <p>PIHAK KEDUA,</p>
                        <div className="h-24"></div>
                        <p className="font-bold underline">{formData.signerNamePihak2}</p>
                      </div>
                    )}

                    <div className={`${!isTableTemplate && !isMOU ? 'ml-auto w-1/3' : ''} flex flex-col text-black`}>
                       <p>Kediri, {format(new Date(formData.date), 'dd MMMM yyyy', { locale: id })}</p>
                       <p>{isTableTemplate ? 'Mengetahui,' : ''}</p>
                       <p>{formData.signatureTitle}</p>
                       <div className="h-24"></div>
                       <p className="font-bold underline">{formData.signerName}</p>
                       <p>{formData.signerNip ? `NIP. ${formData.signerNip}` : ''}</p>
                    </div>
                    
                    {isTableTemplate && (
                      <div className="flex flex-col text-black">
                        <p>&nbsp;</p>
                        <p>Telah Menerima,</p>
                        <p>Penerima / Pelatih</p>
                        <div className="h-24"></div>
                        <p className="italic text-slate-400">(Tanda Tangan Terlampir di Tabel)</p>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      </div>
      <style>{`
        /* PREVIEW MODE (Screen) */
        .letter-paper {
           padding: 15mm 20mm;
        }

        /* PRINT MODE */
        @media print {
          @page { 
            size: 215mm 330mm portrait; /* F4 Portrait */
            margin: 20mm 20mm 20mm 25mm; /* Top, Right, Bottom, Left */
          }
          
          /* RESET OVERFLOW CONTAINER UTAMA agar halaman bisa memanjang */
          html, body, #root {
            height: auto !important;
            overflow: visible !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
          }
          
          /* Hide everything except print area */
          body * { visibility: hidden; }
          .letter-paper, .letter-paper * { visibility: visible !important; }
          
          .letter-paper { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important;
            height: auto !important; /* Biarkan tinggi otomatis */
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            z-index: 9999 !important;
          }
          
          /* Table styling untuk print */
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #000 !important; }
          
          /* Cegah elemen penting terpotong */
          .break-inside-avoid { break-inside: avoid !important; }
          .break-after-avoid { break-after: avoid !important; }
          tr { break-inside: avoid !important; }
        }
      `}</style>
    </div>
  );
};

export default LetterCreator;