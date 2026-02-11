import React, { useState, useEffect, useRef } from 'react';
import { Printer, Loader2, FileText, Layout, UserPlus, Info } from 'lucide-react';
import { subscribeToConfig, subscribeToTemplates, LetterTemplate } from '../services/storage';
import { SchoolConfig } from '../types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const SmartContentRenderer = ({ text }: { text: string }) => {
  const lines = text.split('\n');
  const renderedBlocks: React.ReactNode[] = [];
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (tableRows.length > 0) {
      const firstRow = tableRows[0];
      const hasHeader = firstRow.some(cell => 
        ['nama', 'jabatan', 'no', 'kelas', 'rekening', 'id', 'virtual'].some(k => cell.toLowerCase().includes(k))
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
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const columns = line.split(':');
    
    // TABEL: Baris dianggap bagian tabel jika memiliki minimal 2 titik dua (3 kolom)
    const isTableRow = columns.length >= 3;

    if (trimmed === '[PAGE_BREAK]') {
      flushTable();
      renderedBlocks.push(<div key={`pb-${index}`} className="page-breaker print:break-after-page h-0 my-1 relative border-t border-dashed border-slate-300 print:border-none print:my-0"></div>);
      return;
    }

    if (isTableRow) {
      tableRows.push(columns);
      return;
    }

    // Jika bukan baris tabel, cetak tabel yang sudah terkumpul dulu
    flushTable();

    if (trimmed.startsWith('PASAL') || trimmed === 'MEMUTUSKAN' || (trimmed === trimmed.toUpperCase() && trimmed.length < 60 && trimmed.length > 3 && !trimmed.includes(':'))) {
      renderedBlocks.push(<div key={`title-${index}`} className="mt-6 mb-3 font-bold text-center text-black font-serif uppercase tracking-wider underline underline-offset-4">{trimmed}</div>);
    } 
    else if (columns.length === 2 && trimmed.length > 0 && !trimmed.endsWith(':')) {
      const isKonsideran = ['menimbang', 'mengingat', 'memperhatikan', 'menetapkan'].includes(columns[0].trim().toLowerCase());
      renderedBlocks.push(<div key={`info-${index}`} className={`flex mb-1.5 break-inside-avoid text-black font-serif ${isKonsideran ? 'mt-4' : 'pl-8'}`}><span className={`${isKonsideran ? 'w-[110px] font-bold italic' : 'w-[28%]'} shrink-0 align-top`}>{columns[0].trim()}</span><span className="w-[15px] text-center shrink-0">:</span><span className="flex-1 pl-1 text-justify">{columns[1].trim()}</span></div>);
    } 
    else if (/^(\d+\.|[a-zA-Z]\.|-)\s/.test(trimmed)) {
       const match = trimmed.match(/^(\d+\.|[a-zA-Z]\.|-)\s+(.*)/);
       if (match) renderedBlocks.push(<div key={`list-${index}`} className="flex mb-2 pl-8 font-serif text-black leading-relaxed"><span className="w-8 shrink-0">{match[1]}</span><span className="flex-1 text-justify">{match[2]}</span></div>);
    }
    else {
      if (trimmed === '') renderedBlocks.push(<div className="h-3" key={`br-${index}`}></div>);
      else {
         const lower = trimmed.toLowerCase();
         const isStandardPhrase = lower.startsWith('dengan hormat') || lower.startsWith('demikian') || lower.startsWith('untuk') || lower.startsWith('dasar');
         renderedBlocks.push(<p key={`p-${index}`} className={`mb-3 text-justify font-serif text-black leading-[1.6] ${isStandardPhrase ? '' : 'indent-10'}`}>{trimmed}</p>);
      }
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

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-6 animate-fade-in text-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div><h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2"><FileText className="text-indigo-600" />Editor Surat Digital</h2><p className="text-slate-500 text-sm">Gunakan template untuk mempercepat pembuatan naskah dinas.</p></div>
        <button onClick={() => window.print()} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 font-bold text-sm flex items-center gap-2"><Printer size={18} /> Cetak / PDF</button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
        <div className="w-full lg:w-5/12 flex flex-col gap-4 overflow-y-auto pr-2 print:hidden">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
             <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Pilih Template</label><select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700" onChange={handleTemplateChange} value={selectedTemplate?.id}>{templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
             <div className="space-y-3">
                <input name="subject" value={formData.subject} onChange={handleInputChange} placeholder="Perihal / Judul" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold" />
                <div className="grid grid-cols-2 gap-3"><input name="refNumber" value={formData.refNumber} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" /><input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" /></div>
                {!isCenteredLayout && <input name="recipient" value={formData.recipient} onChange={handleInputChange} placeholder="Yth. Penerima..." className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" />}
             </div>
             <div className="pt-2 border-t border-slate-100 space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Tanda Tangan</label>
                <div className="grid grid-cols-2 gap-3"><input name="signerName" value={formData.signerName} onChange={handleInputChange} placeholder="Nama Pejabat" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" /><input name="signerNip" value={formData.signerNip} onChange={handleInputChange} placeholder="NIP" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" /></div>
                {isMOU && <input name="signerNamePihak2" value={formData.signerNamePihak2} onChange={handleInputChange} placeholder="Nama Pihak Kedua" className="w-full px-3 py-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-sm font-bold" />}
             </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex-1 flex flex-col min-h-[400px] shadow-sm">
             <div className="flex justify-between items-center mb-2"><label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Isi Naskah</label><button onClick={() => setFormData(prev => ({...prev, content: prev.content + '\n[PAGE_BREAK]\n'}))} className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md"><Layout size={12} /> + Halaman</button></div>
             <textarea name="content" value={formData.content} onChange={handleInputChange} className="w-full flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-xs leading-relaxed resize-none" />
          </div>
        </div>

        <div className="w-full lg:w-7/12 bg-slate-200/50 rounded-2xl border border-slate-200 overflow-y-auto p-8 flex flex-col items-center gap-10 print:p-0 print:m-0 print:bg-white print:block">
           {contentParts.map((part, pIdx) => (
             <div key={pIdx} className="letter-paper bg-white w-[215mm] shadow-2xl relative print:shadow-none print:w-full print:min-h-0 flex flex-col text-black font-serif mb-10 print:mb-0">
                {pIdx === 0 && (
                  <div className="border-b-[4px] border-double border-black pb-3 mb-2 grid grid-cols-[80px_1fr_80px] items-center text-black">
                     <div className="flex justify-center">{config.logoDaerahUrl && <img src={config.logoDaerahUrl} className="w-[20mm] h-auto" />}</div>
                     <div className="text-center w-full px-4"><h3 className="text-[12pt] font-bold uppercase leading-tight">{config.headerLine1}</h3><h3 className="text-[12pt] font-bold uppercase leading-tight">{config.headerLine2}</h3><h1 className="text-[17pt] font-extrabold uppercase my-1 leading-none">{config.name}</h1><p className="text-[9pt] italic">{config.address}</p><p className="text-[9pt]">NPSN: {config.npsn} | Email: {config.email}</p></div>
                     <div className="flex justify-center">{config.logoUrl && <img src={config.logoUrl} className="w-[20mm] h-auto" />}</div>
                  </div>
                )}
                <div className="flex-1 flex flex-col pt-4">
                   {pIdx === 0 && (
                     isCenteredLayout ? (
                       <div className="text-center mb-6"><h2 className="text-[13pt] font-bold uppercase underline tracking-wide leading-tight">{formData.subject}</h2><p className="text-[11pt] mt-1 font-bold">Nomor: {formData.refNumber}</p></div>
                     ) : (
                       <div className="mb-6 text-black"><div className="flex justify-end mb-6"><p className="text-[11pt]">Kediri, {format(new Date(formData.date), 'dd MMMM yyyy', { locale: id })}</p></div><div className="space-y-0.5 flex flex-col"><div className="flex"><span className="w-24">Nomor</span><span>: {formData.refNumber}</span></div><div className="flex"><span className="w-24">Lampiran</span><span>: -</span></div><div className="flex"><span className="w-24">Perihal</span><span className="font-bold underline">: {formData.subject}</span></div></div><div className="mt-8"><p>Kepada Yth.</p><p className="font-bold">{formData.recipient || '................................'}</p><p>di Tempat</p></div></div>
                     )
                   )}
                   <div className="flex-1"><SmartContentRenderer text={part} /></div>
                   {pIdx === contentParts.length - 1 && (
                     <div className={`mt-10 break-inside-avoid grid ${isMOU ? 'grid-cols-2' : 'grid-cols-1'} gap-6 text-center text-[11pt] font-serif`}>
                        {isMOU && <div className="flex flex-col"><p className="mb-1">&nbsp;</p><p className="font-bold uppercase tracking-wider mb-2">PIHAK KEDUA,</p><div className="h-24"></div><p className="font-bold underline uppercase">{formData.signerNamePihak2}</p></div>}
                        <div className={`${!isMOU ? 'ml-auto w-[300px]' : ''} flex flex-col`}>
                           {isCenteredLayout && pIdx === 0 && <p className="mb-1">Kediri, {format(new Date(formData.date), 'dd MMMM yyyy', { locale: id })}</p>}
                           {isMOU && <p className="font-bold uppercase tracking-wider mb-2">PIHAK PERTAMA,</p>}
                           <p className="font-bold">{formData.signatureTitle}</p><div className="h-20"></div><p className="font-bold underline uppercase tracking-wide">{formData.signerName}</p><p>{formData.signerNip ? `NIP. ${formData.signerNip}` : ''}</p>
                        </div>
                     </div>
                   )}
                </div>
                <div className="absolute bottom-4 right-8 text-[9pt] italic text-slate-300 print:hidden">Halaman {pIdx + 1}</div>
             </div>
           ))}
        </div>
      </div>
      <style>{`.letter-paper { padding: 5mm 20mm 20mm 30mm; min-height: 297mm; } @media print { @page { size: 215mm 330mm portrait; margin: 0; } body * { visibility: hidden; } .letter-paper, .letter-paper * { visibility: visible !important; } .letter-paper { position: relative !important; width: 100% !important; height: 330mm !important; margin: 0 !important; padding: 5mm 20mm 20mm 30mm !important; display: block !important; page-break-after: always !important; } .page-breaker { display: none !important; } table { border: 1.5pt solid black !important; } th, td { border: 1pt solid #000 !important; } * { color: black !important; } }`}</style>
    </div>
  );
};

export default LetterCreator;