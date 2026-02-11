import React, { useState, useEffect } from 'react';
import { Save, Printer, ChevronDown, CheckCircle2, Scissors, Loader2, QrCode, Key, AlertTriangle, FileText, Layout, UserPlus } from 'lucide-react';
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
        cell.toLowerCase().includes('ekstrakurikuler') ||
        cell.toLowerCase().includes('no')
      );

      renderedBlocks.push(
        <div key={`table-wrapper-${renderedBlocks.length}`} className="mb-6 break-inside-avoid px-2">
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
                    <td key={cellIdx} className={`border border-black px-2 py-1.5 font-serif text-black align-top ${cellIdx === 0 ? 'text-center w-12' : ''} ${cellIdx >= 3 && cellIdx <= 5 ? 'text-right' : ''}`}>
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
    
    if (trimmed === '[PAGE_BREAK]') {
      flushTable();
      renderedBlocks.push(
        <div key={`pb-${index}`} className="page-breaker print:break-after-page h-0 my-10 relative border-t border-dashed border-slate-300 print:border-none">
          <span className="absolute right-0 -top-3 bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-400 print:hidden">HALAMAN BARU</span>
        </div>
      );
      return;
    }

    if (trimmed.startsWith('PASAL') || trimmed === 'MEMUTUSKAN' || trimmed === 'MEMERINTAHKAN' || (trimmed === trimmed.toUpperCase() && trimmed.length < 60 && trimmed.length > 3 && !trimmed.includes(':') && !trimmed.startsWith('NO'))) {
      flushTable();
      renderedBlocks.push(<div key={`title-${index}`} className="mt-6 mb-3 font-bold text-center text-black font-serif uppercase tracking-wider break-after-avoid underline underline-offset-4">{trimmed}</div>);
      return;
    }

    const columns = line.split(':');
    if (columns.length > 3) {
      tableRows.push(columns);
    } else if (columns.length === 2 && trimmed.length > 0 && !trimmed.endsWith(':')) {
      flushTable();
      const label = columns[0].trim();
      const value = columns[1].trim();
      
      const isKonsideran = ['menimbang', 'mengingat', 'memperhatikan', 'menetapkan'].includes(label.toLowerCase());
      
      renderedBlocks.push(
        <div key={`info-${index}`} className={`flex mb-1.5 break-inside-avoid text-black font-serif ${isKonsideran ? 'mt-4' : 'pl-8'}`}>
          <span className={`${isKonsideran ? 'w-[110px] font-bold italic' : 'w-[28%]'} shrink-0 align-top`}>{label}</span>
          <span className="w-[15px] text-center shrink-0 align-top">:</span>
          <span className="flex-1 pl-1 text-justify">{value}</span>
        </div>
      );
    } 
    else if (/^(\d+\.|[a-zA-Z]\.|-)\s/.test(trimmed)) {
       flushTable();
       const match = trimmed.match(/^(\d+\.|[a-zA-Z]\.|-)\s+(.*)/);
       if (match) {
         renderedBlocks.push(
           <div key={`list-${index}`} className="flex mb-2 pl-8 font-serif text-black leading-relaxed">
              <span className="w-8 shrink-0">{match[1]}</span>
              <span className="flex-1 text-justify">{match[2]}</span>
           </div>
         );
       } else {
         renderedBlocks.push(<p key={`list-${index}`} className="mb-1 pl-8">{trimmed}</p>);
       }
    }
    else {
      flushTable();
      if (trimmed === '') {
         renderedBlocks.push(<div className="h-4" key={`br-${index}`}></div>);
      } else {
         const lower = trimmed.toLowerCase();
         const isStandardPhrase = lower.startsWith('dengan hormat') || lower.startsWith('demikian') || lower.startsWith('untuk') || lower.startsWith('dasar');
         const indentClass = isStandardPhrase ? '' : 'indent-10';

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
    refNumber: `422/..../419.42.03.135/${new Date().getFullYear()}`,
    date: new Date().toISOString().split('T')[0],
    recipient: '',
    signatureTitle: 'Kepala Sekolah',
    signerName: '',
    signerNip: '',
    signerNameBendahara: '( ........................................... )',
    signerNipBendahara: '',
    signerNamePihak2: '( ........................................... )',
    subject: LETTER_TEMPLATES[0].subject || '',
    content: LETTER_TEMPLATES[0].content
  });

  useEffect(() => {
    const unsubscribe = subscribeToConfig((newConfig) => {
      setConfig(newConfig);
      setFormData(prev => ({
        ...prev,
        signerName: prev.signerName || newConfig.principalName,
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
        subject: template.subject || prev.subject,
        content: template.content,
        signatureTitle: (template.id === 't_rolstan_pekerja' || template.id === 't_honor_ekskul') ? 'Kepala Sekolah,' : ((template as any).signatureTitle || 'Kepala Sekolah'),
        signerNamePihak2: template.category === 'Kerjasama' ? prev.signerNamePihak2 : '( ........................................... )'
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
  
  const isCenteredLayout = selectedTemplate.layout === 'centered';

  const contentParts = formData.content.split('[PAGE_BREAK]');
  const page1Content = contentParts[0];
  const page2Content = contentParts.slice(1).join('\n');

  if (!config) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-indigo-600"/></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-6 animate-fade-in text-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <FileText className="text-indigo-600" />
            Editor Dokumen 2 Halaman
          </h2>
          <p className="text-slate-500 text-sm">Gunakan <code className="bg-slate-100 px-1 rounded">[PAGE_BREAK]</code> untuk memecah ke halaman kedua.</p>
        </div>
        <button onClick={() => window.print()} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 font-bold text-sm flex items-center gap-2">
          <Printer size={18} /> Cetak / PDF
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
        {/* Editor Pane */}
        <div className="w-full lg:w-5/12 flex flex-col gap-4 overflow-y-auto pr-2 print:hidden">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
             <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Template Surat</label>
               <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700 transition-all" onChange={handleTemplateChange} value={selectedTemplate.id}>
                 {LETTER_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
               </select>
             </div>
             
             <div className="space-y-3">
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Judul / Perihal</label>
                   <input name="subject" value={formData.subject} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nomor Surat</label>
                       <input name="refNumber" value={formData.refNumber} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800" />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Tanggal</label>
                       <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800" />
                    </div>
                </div>
                {!isCenteredLayout && (
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Tujuan Surat</label>
                     <input name="recipient" value={formData.recipient} onChange={handleInputChange} placeholder="Yth. Orang Tua / Instansi..." className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800" />
                  </div>
                )}
             </div>

             <div className="pt-2 border-t border-slate-100 space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Tanda Tangan Pihak Pertama (Sekolah)</label>
                <div className="grid grid-cols-2 gap-3">
                   <input name="signerName" value={formData.signerName} onChange={handleInputChange} placeholder="Nama Kepala Sekolah" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800" />
                   <input name="signerNip" value={formData.signerNip} onChange={handleInputChange} placeholder="NIP" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800" />
                </div>

                {isMOU && (
                  <div className="animate-fade-in">
                    <label className="block text-xs font-bold text-indigo-600 uppercase tracking-wide mb-1.5 mt-4 flex items-center gap-2">
                       <UserPlus size={14} /> Tanda Tangan Pihak Kedua (Mitra/Pelatih)
                    </label>
                    <input name="signerNamePihak2" value={formData.signerNamePihak2 === '( ........................................... )' ? '' : formData.signerNamePihak2} onChange={handleInputChange} placeholder="Nama Lengkap Pihak Kedua" className="w-full px-3 py-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-sm font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                )}
             </div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex-1 flex flex-col min-h-[400px] shadow-sm">
             <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Editor Isi Naskah</label>
                <button onClick={() => setFormData(prev => ({...prev, content: prev.content + '\n[PAGE_BREAK]\n'}))} className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md hover:bg-indigo-100 transition-colors flex items-center gap-1">
                   <Layout size={12} /> + Hal 2
                </button>
             </div>
             <textarea name="content" value={formData.content} onChange={handleInputChange} className="w-full flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono text-xs leading-relaxed text-slate-800" />
          </div>
        </div>

        {/* Paper Pane (Visual 2 Pages) */}
        <div className="w-full lg:w-7/12 bg-slate-200/50 rounded-2xl border border-slate-200 overflow-y-auto p-8 flex flex-col items-center gap-10 print:p-0 print:m-0 print:bg-white print:block">
           
           {/* PAGE 1 */}
           <div className="letter-paper bg-white w-[215mm] shadow-2xl relative print:shadow-none print:w-full print:min-h-0 flex flex-col text-black font-serif mb-10 print:mb-0">
              {/* Kop Surat */}
              <div className="border-b-[4px] border-double border-black pb-3 mb-2 pt-2 grid grid-cols-[80px_1fr_80px] items-center text-black">
                 <div className="flex justify-center">
                   {config.logoDaerahUrl && <img src={config.logoDaerahUrl} className="w-[20mm] h-auto" alt="Logo Daerah"/>}
                 </div>
                 <div className="text-center w-full px-4">
                    <h3 className="text-[12pt] font-bold uppercase leading-tight tracking-wide text-black">{config.headerLine1}</h3>
                    <h3 className="text-[12pt] font-bold uppercase leading-tight tracking-wide text-black">{config.headerLine2}</h3>
                    <h1 className="text-[17pt] font-extrabold uppercase my-1 leading-none tracking-wider text-black">{config.name}</h1>
                    <p className="text-[9pt] leading-tight italic text-black">{config.address}</p>
                    <p className="text-[9pt] leading-tight text-black">Email: {config.email}</p>
                 </div>
                 <div className="flex justify-center">
                   {config.logoUrl && <img src={config.logoUrl} className="w-[20mm] h-auto" alt="Logo Sekolah"/>}
                 </div>
              </div>

              {/* Layout Content Page 1 */}
              <div className="flex-1 flex flex-col pt-4">
                 {isCenteredLayout ? (
                   <div className="text-center mb-8">
                      <h2 className="text-[13pt] font-bold uppercase underline tracking-wide leading-tight text-black">{formData.subject}</h2>
                      <p className="text-[11pt] mt-1 font-bold text-black">Nomor: {formData.refNumber}</p>
                   </div>
                 ) : (
                   <div className="mb-8 text-black">
                      <div className="flex justify-end mb-6">
                         <p className="text-[11pt]">Kediri, {format(new Date(formData.date), 'dd MMMM yyyy', { locale: id })}</p>
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex"><span className="w-24">Nomor</span><span>: {formData.refNumber}</span></div>
                        <div className="flex"><span className="w-24">Lampiran</span><span>: -</span></div>
                        <div className="flex"><span className="w-24">Perihal</span><span className="font-bold underline">: {formData.subject}</span></div>
                      </div>
                      <div className="mt-8">
                        <p>Kepada Yth.</p>
                        <p className="font-bold">{formData.recipient || '................................'}</p>
                        <p>di Tempat</p>
                      </div>
                   </div>
                 )}

                 <div className="flex-1">
                    <SmartContentRenderer text={page1Content} isTableTemplate={isTableTemplate} />
                 </div>

                 {/* Signatures Page 1 (Hanya jika tidak ada Page 2) */}
                 {!page2Content && (
                   <div className={`mt-12 break-inside-avoid grid ${isTableTemplate ? 'grid-cols-3' : (isMOU ? 'grid-cols-2' : 'grid-cols-1')} gap-6 text-center text-[11pt] font-serif text-black`}>
                      
                      {isMOU && (
                        <div className="flex flex-col">
                          <p className="mb-1">&nbsp;</p>
                          <p className="font-bold uppercase tracking-wider mb-2">PIHAK KEDUA,</p>
                          <div className="h-24"></div>
                          <p className="font-bold underline uppercase">{formData.signerNamePihak2 || '( ........................................... )'}</p>
                        </div>
                      )}

                      <div className={`${!isTableTemplate && !isMOU ? 'ml-auto w-[250px]' : ''} flex flex-col`}>
                         {isCenteredLayout && <p className="mb-1 text-black">Kediri, {format(new Date(formData.date), 'dd MMMM yyyy', { locale: id })}</p>}
                         {isMOU && <p className="font-bold uppercase tracking-wider mb-2">PIHAK PERTAMA,</p>}
                         <p className="font-bold">{formData.signatureTitle}</p>
                         <div className="h-20"></div>
                         <p className="font-bold underline uppercase tracking-wide">{formData.signerName}</p>
                         <p>{formData.signerNip ? `NIP. ${formData.signerNip}` : ''}</p>
                      </div>
                   </div>
                 )}
              </div>
              <div className="absolute bottom-4 right-8 text-[9pt] italic text-slate-300 print:hidden">Halaman 1</div>
           </div>

           {/* PAGE 2 */}
           {page2Content && (
             <div className="letter-paper bg-white w-[215mm] shadow-2xl relative print:shadow-none print:w-full print:min-h-0 flex flex-col text-black font-serif print:mt-0">
                <div className="flex-1 pt-10">
                   <SmartContentRenderer text={page2Content.replace(/\[NOMOR_SURAT\]/g, formData.refNumber).replace(/\[TANGGAL_SURAT\]/g, format(new Date(formData.date), 'dd MMMM yyyy', { locale: id }))} />
                   
                   {/* Signatures Page 2 (Final) */}
                   <div className={`mt-12 break-inside-avoid grid ${isTableTemplate ? 'grid-cols-3' : (isMOU ? 'grid-cols-2' : 'grid-cols-1')} gap-6 text-center text-[11pt] font-serif text-black`}>
                      
                      {isMOU && (
                        <div className="flex flex-col">
                          <p className="mb-1">&nbsp;</p>
                          <p className="font-bold uppercase tracking-wider mb-2">PIHAK KEDUA,</p>
                          <div className="h-24"></div>
                          <p className="font-bold underline uppercase">{formData.signerNamePihak2 || '( ........................................... )'}</p>
                        </div>
                      )}

                      <div className={`${!isTableTemplate && !isMOU ? 'ml-auto w-[250px]' : ''} flex flex-col`}>
                         {isMOU && <p className="font-bold uppercase tracking-wider mb-2">PIHAK PERTAMA,</p>}
                         <p className="font-bold">{formData.signatureTitle}</p>
                         <div className="h-20"></div>
                         <p className="font-bold underline uppercase tracking-wide">{formData.signerName}</p>
                         <p>{formData.signerNip ? `NIP. ${formData.signerNip}` : ''}</p>
                      </div>
                   </div>
                </div>
                <div className="absolute bottom-4 right-8 text-[9pt] italic text-slate-300 print:hidden">Halaman 2</div>
             </div>
           )}

        </div>
      </div>
      <style>{`
        .letter-paper {
           padding: 20mm 20mm 20mm 30mm;
           min-height: 297mm;
        }

        @media print {
          @page { 
            size: 215mm 330mm portrait; 
            margin: 0;
          }
          
          html, body, #root {
            height: auto !important;
            overflow: visible !important;
            position: static !important;
            background: white !important;
          }
          
          body * { visibility: hidden; }
          .letter-paper, .letter-paper * { visibility: visible !important; }
          
          .letter-paper { 
            position: relative !important;
            width: 100% !important;
            height: 330mm !important; 
            margin: 0 !important;
            padding: 20mm 20mm 20mm 30mm !important;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
            display: block !important;
            page-break-after: always !important;
            font-family: 'Times New Roman', serif !important;
          }
          
          .page-breaker { display: none !important; }
          
          table { width: 100% !important; border-collapse: collapse !important; border: 1.5px solid black !important; }
          th, td { border: 1px solid #000 !important; page-break-inside: avoid !important; }
          .break-inside-avoid { break-inside: avoid !important; page-break-inside: avoid !important; }
          * { color: black !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};

export default LetterCreator;