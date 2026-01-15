import React, { useState, useEffect, useRef } from 'react';
import { Save, Printer, FileText, ChevronDown, Copy, RefreshCw, CheckCircle2 } from 'lucide-react';
import { LETTER_TEMPLATES } from '../constants';
import { getSchoolConfig, saveMail } from '../services/storage';
import { Mail, MailType, MailStatus, UrgencyLevel, SchoolConfig } from '../types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// Komponen Pembantu untuk Merender Isi Surat agar Titik Dua Lurus Otomatis
const SmartContentRenderer = ({ text }: { text: string }) => {
  const lines = text.split('\n');
  const renderedBlocks: React.ReactNode[] = [];
  let tableRows: { label: string; separator: string; value: string }[] = [];

  const flushTable = () => {
    if (tableRows.length > 0) {
      renderedBlocks.push(
        <table className="w-full mb-2 border-collapse" key={`table-${renderedBlocks.length}`}>
          <tbody>
            {tableRows.map((row, idx) => (
              <tr key={idx}>
                {/* Lebar label dibuat fix agar lurus vertikal */}
                <td className="align-top pb-1 w-[30%] whitespace-nowrap pr-2">{row.label}</td>
                <td className="align-top pb-1 px-1 w-[2%]">{row.separator}</td>
                <td className="align-top pb-1 w-[68%]">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
      tableRows = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Deteksi pola "Label : Value"
    // Syarat: Ada titik dua, dan posisi titik dua tidak terlalu jauh (misal < 50 char) agar bukan kalimat biasa
    const colonIndex = line.indexOf(':');

    if (colonIndex > 0 && colonIndex < 40 && trimmed.length > 0) {
         const label = line.substring(0, colonIndex).trim();
         const value = line.substring(colonIndex + 1).trim();
         
         // Jika ini terlihat seperti header bagian (misal "Menerangkan Bahwa :") tanpa value, render sebagai teks biasa
         if (value === '' && (label.toLowerCase().includes('bahwa') || label.toLowerCase().includes('kepada'))) {
             flushTable();
             renderedBlocks.push(<p key={`p-${index}`} className="mb-2 font-bold">{line}</p>);
         } else {
             tableRows.push({ label, separator: ':', value });
         }
    } else {
      flushTable();
      // Render teks biasa
      if (trimmed === '') {
         renderedBlocks.push(<div className="h-4" key={`br-${index}`}></div>);
      } else {
         renderedBlocks.push(
           <p key={`p-${index}`} className="mb-1 text-justify whitespace-pre-wrap">{line}</p>
         );
      }
    }
  });
  flushTable(); // Flush sisa tabel jika ada

  return <div className="font-serif text-black leading-relaxed text-[11pt]">{renderedBlocks}</div>;
};

const LetterCreator: React.FC = () => {
  const [config, setConfig] = useState<SchoolConfig>(getSchoolConfig());
  const [selectedTemplate, setSelectedTemplate] = useState(LETTER_TEMPLATES[0]);
  const [formData, setFormData] = useState({
    refNumber: `421.2/${Math.floor(Math.random() * 100)}/SD/${new Date().getFullYear()}`,
    date: new Date().toISOString().split('T')[0],
    recipient: '',
    signatureTitle: 'Kepala Sekolah',
    signerName: '( Nama Kepala Sekolah )',
    signerNip: '...................................',
    content: LETTER_TEMPLATES[0].content
  });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setConfig(getSchoolConfig());
  }, []);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const template = LETTER_TEMPLATES.find(t => t.id === e.target.value);
    if (template) {
      setSelectedTemplate(template);
      setFormData(prev => ({ 
        ...prev, 
        content: template.content,
        // @ts-ignore
        signatureTitle: template.signatureTitle || 'Kepala Sekolah',
        // @ts-ignore
        signerName: template.signatureTitle?.includes('Pelaksana') ? '( ___________________________ )' : '( Nama Kepala Sekolah )',
        signerNip: '...................................'
      }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setIsSaved(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveToOutbox = () => {
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

    saveMail(newMail);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // @ts-ignore
  const isCentered = selectedTemplate.layout === 'centered';

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-6 animate-fade-in">
      {/* Header / Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">Buat Surat</h2>
          <p className="text-slate-500 text-sm">Pilih template dan edit surat dengan mudah.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={handleSaveToOutbox}
            className={`flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${isSaved ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          >
            {isSaved ? <CheckCircle2 size={18} className="mr-2"/> : <Save size={18} className="mr-2"/>}
            {isSaved ? 'Tersimpan' : 'Simpan ke Arsip'}
          </button>
          <button 
            onClick={handlePrint}
            className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 font-bold text-sm"
          >
            <Printer size={18} className="mr-2"/>
            Cetak / PDF
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
        {/* Editor Column */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4 overflow-y-auto pr-2 print:hidden">
          
          {/* Settings Panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
             <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Pilih Template</label>
               <div className="relative">
                 <select 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl appearance-none outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
                    onChange={handleTemplateChange}
                    value={selectedTemplate.id}
                 >
                   {LETTER_TEMPLATES.map(t => (
                     <option key={t.id} value={t.id}>{t.name}</option>
                   ))}
                 </select>
                 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16}/>
               </div>
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
             
             {!isCentered && (
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Tujuan / Penerima</label>
                  <input name="recipient" placeholder="Cth: Bapak/Ibu Wali Murid" value={formData.recipient} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
               </div>
             )}

             <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Info Penanda Tangan</label>
                <div className="space-y-3">
                  <div>
                     <label className="text-[10px] text-slate-400 font-bold mb-1 block">Jabatan</label>
                     <input name="signatureTitle" value={formData.signatureTitle} onChange={handleInputChange} placeholder="Jabatan" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                       <label className="text-[10px] text-slate-400 font-bold mb-1 block">Nama</label>
                       <input name="signerName" value={formData.signerName} onChange={handleInputChange} placeholder="Nama Lengkap" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                     </div>
                     <div>
                       <label className="text-[10px] text-slate-400 font-bold mb-1 block">NIP</label>
                       <input name="signerNip" value={formData.signerNip} onChange={handleInputChange} placeholder="NIP" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                     </div>
                  </div>
                </div>
             </div>
          </div>

          {/* Text Editor */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex-1 flex flex-col">
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex justify-between">
                Isi Surat
                <span className="text-[10px] text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full normal-case">Editor Cerdas (Auto-Align)</span>
             </label>
             <p className="text-[10px] text-slate-400 mb-2">
                Tips: Tulis "Label : Isi" (gunakan titik dua) agar otomatis lurus di pratinjau.
             </p>
             <textarea 
               name="content"
               value={formData.content}
               onChange={handleInputChange}
               className="w-full flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-serif text-slate-800 leading-relaxed text-sm"
             />
          </div>
        </div>

        {/* Preview Column (A4 Paper) */}
        <div className="w-full lg:w-2/3 bg-slate-200/50 rounded-2xl border border-slate-200 overflow-y-auto p-4 md:p-8 flex justify-center print:bg-white print:p-0 print:border-0 print:overflow-visible print:w-full print:absolute print:top-0 print:left-0 print:z-50">
           {/* A4 Container */}
           <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl p-[20mm] mx-auto relative print:shadow-none print:w-full print:m-0 flex flex-col">
              
              {/* Kop Surat yang Diperbaiki (Lebih Simetris) */}
              <div className="relative border-b-[4px] border-double border-black pb-4 mb-8 pt-2 flex items-center justify-center min-h-[120px]">
                 {/* Logo Daerah (Kiri) - Absolute */}
                 {config.logoDaerahUrl && (
                   <img src={config.logoDaerahUrl} className="w-[22mm] h-[26mm] object-contain absolute left-0" alt="Logo Daerah"/>
                 )}
                 
                 {/* Text Header - Center with Margin */}
                 <div className="text-center w-full px-[25mm] z-10">
                    <h3 className="text-lg font-bold uppercase tracking-wide leading-tight">{config.headerLine1}</h3>
                    <h3 className="text-lg font-bold uppercase tracking-wide leading-tight">{config.headerLine2}</h3>
                    <h1 className="text-2xl font-extrabold uppercase my-1 leading-none tracking-tight">{config.name}</h1>
                    <p className="text-sm font-serif italic leading-tight">{config.address}</p>
                    <p className="text-sm font-serif leading-tight">Email: {config.email}</p>
                 </div>

                 {/* Logo Sekolah (Kanan) - Absolute */}
                 {config.logoUrl && (
                   <img src={config.logoUrl} className="w-[22mm] h-[26mm] object-contain absolute right-0" alt="Logo Sekolah"/>
                 )}
              </div>

              {/* Body */}
              <div className="font-serif text-black leading-relaxed flex-1 flex flex-col">
                 
                 {isCentered ? (
                   /* Centered Layout (SPT / Laporan) */
                   <div className="text-center mb-8">
                      <h2 className="text-lg font-bold underline uppercase tracking-wide">{selectedTemplate.subject}</h2>
                      {!selectedTemplate.name.includes('Laporan') && (
                        <p className="mt-1 font-bold">Nomor : {formData.refNumber}</p>
                      )}
                   </div>
                 ) : (
                   /* Standard Layout (Undangan / Dinas Biasa) */
                   <div className="flex justify-between mb-8 items-start">
                      <table className="w-auto border-collapse text-[11pt]">
                        <tbody>
                          <tr>
                            <td className="align-top pb-1 pr-2 w-20">Nomor</td>
                            <td className="align-top pb-1 px-1">:</td>
                            <td className="align-top pb-1">{formData.refNumber}</td>
                          </tr>
                          <tr>
                            <td className="align-top pb-1 pr-2">Lampiran</td>
                            <td className="align-top pb-1 px-1">:</td>
                            <td className="align-top pb-1">-</td>
                          </tr>
                          <tr>
                            <td className="align-top pb-1 pr-2">Hal</td>
                            <td className="align-top pb-1 px-1">:</td>
                            <td className="align-top pb-1 font-bold underline decoration-1 underline-offset-2">{selectedTemplate.subject}</td>
                          </tr>
                        </tbody>
                      </table>
                      
                      <div className="flex flex-col items-end text-[11pt]">
                         <p className="mb-4">{format(new Date(formData.date), 'dd MMMM yyyy', { locale: id })}</p>
                         <div className="text-left w-52">
                             <p>Kepada Yth.</p>
                             <p className="font-bold">{formData.recipient || '......................'}</p>
                             <p>di Tempat</p>
                         </div>
                      </div>
                   </div>
                 )}

                 {/* Smart Content Renderer (Menggantikan text-justify biasa) */}
                 <div className="min-h-[300px] mb-8">
                    <SmartContentRenderer text={formData.content} />
                 </div>

                 {/* Signature */}
                 <div className="mt-auto flex justify-end">
                    <div className="text-center w-64">
                       <p className="mb-1">Kediri, {format(new Date(formData.date), 'dd MMMM yyyy', { locale: id })}</p>
                       <p>{formData.signatureTitle}</p>
                       <div className="h-24"></div> {/* Space for signature */}
                       <p className="font-bold underline">{formData.signerName}</p>
                       <p>NIP. {formData.signerNip}</p>
                    </div>
                 </div>
              </div>

           </div>
        </div>
      </div>
      
      {/* Print Styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body * { visibility: hidden; }
          .print\\:block { display: block !important; }
          .print\\:hidden { display: none !important; }
          .bg-slate-200\\/50 { background: white !important; padding: 0 !important; overflow: visible !important; }
          .bg-white.w-\\[210mm\\] { visibility: visible !important; position: absolute; left: 0; top: 0; width: 100%; margin: 0; box-shadow: none; }
          .bg-white.w-\\[210mm\\] * { visibility: visible; }
        }
      `}</style>
    </div>
  );
};

export default LetterCreator;