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
        <div key={`table-wrapper-${renderedBlocks.length}`} className="mb-4 break-inside-avoid">
          <table className="w-full border-collapse border border-black text-[9pt]">
            <thead>
              {hasHeader && (
                <tr className="bg-slate-50">
                  {tableRows[0].map((cell, idx) => (
                    <th key={idx} className="border border-black p-1 text-center font-bold uppercase font-serif">{cell.trim()}</th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {tableRows.slice(hasHeader ? 1 : 0).map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className={`border border-black p-1 font-serif ${cellIdx === 0 ? 'text-center w-8' : ''} ${cellIdx >= 3 && cellIdx <= 5 ? 'text-right' : ''}`}>
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
    
    if (trimmed.includes('✂') || trimmed.includes('-CUT-LINE')) {
      flushTable();
      renderedBlocks.push(
        <div key={`cut-${index}`} className="flex items-center gap-4 my-8 select-none print:my-12">
          <Scissors size={16} className="text-black transform -rotate-90" />
          <div className="flex-1 border-b-2 border-dashed border-black"></div>
        </div>
      );
      return;
    }

    if (trimmed.startsWith('PASAL')) {
      flushTable();
      renderedBlocks.push(<div key={`pasal-${index}`} className="mt-6 mb-2 font-bold text-center">{trimmed}</div>);
      return;
    }

    const columns = line.split(':');
    if (columns.length > 3) {
      tableRows.push(columns);
    } else if (columns.length === 2 && trimmed.length > 0) {
      flushTable();
      const label = columns[0].trim();
      const value = columns[1].trim();
      renderedBlocks.push(
        <div key={`info-${index}`} className="flex mb-1 pl-4 break-inside-avoid">
          <span className="w-[30%] font-serif">{label}</span>
          <span className="w-[2%] font-serif">:</span>
          <span className="flex-1 font-serif font-bold">{value}</span>
        </div>
      );
    } else {
      flushTable();
      if (trimmed === '') {
         renderedBlocks.push(<div className="h-4" key={`br-${index}`}></div>);
      } else {
         renderedBlocks.push(
           <p key={`p-${index}`} className={`mb-2 text-justify whitespace-pre-wrap break-inside-avoid font-serif ${isTableTemplate && trimmed.toUpperCase() === trimmed && trimmed.length > 10 ? 'font-bold text-center text-[12pt] mb-4 underline' : ''}`}>
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
                   <input name="recipient" value={formData.recipient} onChange={handleInputChange} placeholder="Contoh: Honor Pembimbing Ekstrakurikuler Semester 1" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium" />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Tanggal Dokumen</label>
                   <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium" />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nomor Surat (Jika Ada)</label>
                   <input name="refNumber" value={formData.refNumber} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium" />
                </div>
             </div>

             {isTableTemplate && (
               <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 space-y-3">
                  <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest">Data Bendahara Sekolah</label>
                  <input name="signerNameBendahara" placeholder="Nama Bendahara (dengan gelar)" value={formData.signerNameBendahara} onChange={handleInputChange} className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm font-bold" />
                  <input name="signerNipBendahara" placeholder="NIP Bendahara" value={formData.signerNipBendahara} onChange={handleInputChange} className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm" />
               </div>
             )}

             <div className="pt-2 border-t border-slate-100 space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Kepala Sekolah (Penanda Tangan Utama)</label>
                <div className="grid grid-cols-2 gap-3">
                   <input name="signerName" value={formData.signerName} onChange={handleInputChange} placeholder="Nama Lengkap" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium" />
                   <input name="signerNip" value={formData.signerNip} onChange={handleInputChange} placeholder="NIP" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium" />
                </div>
             </div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex-1 flex flex-col min-h-[400px]">
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Editor Tabel (Ubah rincian di sini)</label>
             <textarea name="content" value={formData.content} onChange={handleInputChange} className="w-full flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono text-xs leading-relaxed" />
          </div>
        </div>

        {/* Preview Paper */}
        <div className="w-full lg:w-7/12 bg-slate-200/50 rounded-2xl border border-slate-200 overflow-y-auto p-4 md:p-8 flex justify-center print:p-0 print:m-0 print:bg-white print:block">
           <div className="letter-paper bg-white w-[215mm] min-h-[330mm] shadow-2xl p-[15mm] mx-auto relative print:shadow-none print:w-full print:p-[10mm] flex flex-col">
              {/* Header / Kop */}
              <div className="border-b-[4px] border-double border-black pb-4 mb-6 pt-2 grid grid-cols-[80px_1fr_80px] items-center">
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
                 <div className="flex-1">
                    <SmartContentRenderer text={formData.content} isTableTemplate={isTableTemplate} />
                 </div>

                 {/* Tanda Tangan */}
                 <div className={`mt-10 break-inside-avoid grid ${isTableTemplate ? 'grid-cols-3' : (isMOU ? 'grid-cols-2' : 'grid-cols-1')} gap-4 text-center text-[10pt] font-serif`}>
                    {isTableTemplate && (
                      <div className="flex flex-col">
                        <p>&nbsp;</p>
                        <p>Setuju Dibayar,</p>
                        <p>Bendahara Sekolah</p>
                        <div className="h-24"></div>
                        <p className="font-bold underline">{formData.signerNameBendahara}</p>
                        <p>{formData.signerNipBendahara ? `NIP. ${formData.signerNipBendahara}` : ''}</p>
                      </div>
                    )}
                    
                    {isMOU && (
                      <div className="flex flex-col">
                        <p>&nbsp;</p>
                        <p>PIHAK KEDUA,</p>
                        <div className="h-24"></div>
                        <p className="font-bold underline">{formData.signerNamePihak2}</p>
                      </div>
                    )}

                    <div className={`${!isTableTemplate && !isMOU ? 'ml-auto w-1/3' : ''} flex flex-col`}>
                       <p>Kediri, {format(new Date(formData.date), 'dd MMMM yyyy', { locale: id })}</p>
                       <p>{isTableTemplate ? 'Mengetahui,' : ''}</p>
                       <p>{formData.signatureTitle}</p>
                       <div className="h-24"></div>
                       <p className="font-bold underline">{formData.signerName}</p>
                       <p>{formData.signerNip ? `NIP. ${formData.signerNip}` : ''}</p>
                    </div>
                    
                    {isTableTemplate && (
                      <div className="flex flex-col">
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
        @media print {
          @page { size: 215mm 330mm; margin: 10mm; }
          body * { visibility: hidden; }
          .print\\:block, .print\\:block * { visibility: visible !important; }
          .print\\:block { position: absolute !important; left: 0; top: 0; width: 100%; }
          .letter-paper { border: none !important; box-shadow: none !important; margin: 0 !important; width: 100% !important; padding: 0 !important; }
          .break-inside-avoid { break-inside: avoid !important; }
        }
      `}</style>
    </div>
  );
};

export default LetterCreator;