import React, { useState, useEffect } from 'react';
import { Save, Printer, ChevronDown, CheckCircle2, Scissors, Loader2, QrCode, Key } from 'lucide-react';
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
      // Render tabel dengan indentasi agar menjorok ke dalam seperti surat resmi
      renderedBlocks.push(
        <div key={`table-wrapper-${renderedBlocks.length}`} className="pl-8 mb-2">
          <table className="w-full border-collapse table-fixed">
            <tbody>
              {tableRows.map((row, idx) => (
                <tr key={idx}>
                  {/* Lebar label 28% cukup untuk 'Tempat/Tgl Lahir' dan membuat 'Nama' tidak terlalu jauh */}
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
        <div key={`cut-${index}`} className="flex items-center gap-4 my-6 select-none">
          <Scissors size={16} className="text-black transform -rotate-90" />
          <div className="flex-1 border-b-2 border-dashed border-black"></div>
        </div>
      );
      return;
    }

    // 2. Deteksi pola "Label : Value"
    const colonIndex = line.indexOf(':');
    
    // Logika khusus untuk "NSS :" agar kotaknya terlihat rapi
    if (trimmed.startsWith('NSS') && colonIndex > 0) {
       flushTable();
       renderedBlocks.push(
         <div key={`nss-${index}`} className="flex items-center mb-4 pl-8">
            <span className="w-[28%] pr-2 font-serif">NSS</span>
            <span className="w-[2%] px-1 font-serif">:</span>
            <span className="font-mono text-lg tracking-[0.3em] border border-black px-2 py-0.5 bg-white inline-block h-8 min-w-[200px]">
               {line.substring(colonIndex + 1).trim()}
            </span>
         </div>
       );
       return;
    }

    // Logika tabel standar
    // Syarat: Ada titik dua, dan label tidak terlalu panjang (max 35 char) agar bukan kalimat biasa
    if (colonIndex > 0 && colonIndex < 35 && trimmed.length > 0) {
         const label = line.substring(0, colonIndex).trim();
         const value = line.substring(colonIndex + 1).trim();
         
         // Cek apakah ini header bagian (misal "Menerangkan Bahwa :") -> Jangan jadikan tabel
         const isSectionHeader = value === '' && (label.toLowerCase().includes('bahwa') || label.toLowerCase().includes('kepada') || label.toLowerCase().includes('berikut'));
         
         if (isSectionHeader) {
             flushTable();
             renderedBlocks.push(<p key={`p-${index}`} className="mb-2 text-justify">{line}</p>);
         } else {
             tableRows.push({ label, separator: ':', value });
         }
    } else {
      flushTable();
      // Render teks biasa
      if (trimmed.includes('( ........................................... )') && trimmed.includes('NIP')) {
          renderedBlocks.push(
           <div key={`p-${index}`} className="mb-1 text-right whitespace-pre-wrap font-serif">{line}</div>
         );
      } else if ((line.includes('Kediri,') || line.includes('.............,')) && line.length < 50) {
         renderedBlocks.push(
           <div key={`p-${index}`} className="mb-1 text-right font-serif">{line}</div>
         );
      } else if ((line.includes('Kepala Sekolah') || line.includes('Hormat Kami')) && line.length < 40) {
          renderedBlocks.push(
           <div key={`p-${index}`} className="mb-1 text-right font-serif">{line}</div>
         );
      } else {
          if (trimmed === '') {
             renderedBlocks.push(<div className="h-4" key={`br-${index}`}></div>);
          } else {
             // Cek jika baris ini adalah kelanjutan indentasi (manual check, sederhana)
             const isIndentedContext = line.startsWith('    ') || line.startsWith('\t');
             renderedBlocks.push(
               <p key={`p-${index}`} className={`mb-1 text-justify whitespace-pre-wrap ${isIndentedContext ? 'pl-8' : ''}`}>{line}</p>
             );
          }
      }
    }
  });
  flushTable(); // Flush sisa tabel jika ada

  return <div className="font-serif text-black leading-relaxed text-[11pt]">{renderedBlocks}</div>;
};

const LetterCreator: React.FC = () => {
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(LETTER_TEMPLATES[0]);
  const [useQRCode, setUseQRCode] = useState(false);
  const [formData, setFormData] = useState({
    refNumber: `422/150/419.42.03.135/${new Date().getFullYear()}`, // Format sesuai contoh
    date: new Date().toISOString().split('T')[0],
    recipient: '',
    signatureTitle: 'Kepala Sekolah',
    signerName: '( Nama Kepala Sekolah )',
    signerNip: '...................................',
    content: LETTER_TEMPLATES[0].content
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToConfig((newConfig) => {
      setConfig(newConfig);
    });
    return () => unsubscribe();
  }, []);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const template = LETTER_TEMPLATES.find(t => t.id === e.target.value);
    if (template) {
      setSelectedTemplate(template);
      
      const isMutasiKeluar = template.id === 't_mutasi_keluar';
      
      setFormData(prev => ({ 
        ...prev, 
        content: template.content,
        signatureTitle: isMutasiKeluar ? 'Kepala Sekolah,' : (template.signatureTitle || 'Kepala Sekolah'),
        signerName: isMutasiKeluar ? '( ........................................... )' : '( Nama Kepala Sekolah )',
        signerNip: isMutasiKeluar ? '...........................................' : '...................................'
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

  const handleSaveToOutbox = async () => {
    setIsSaving(true);
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
    } catch (e) {
      alert('Gagal menyimpan surat.');
    } finally {
      setIsSaving(false);
    }
  };

  // @ts-ignore
  const isCentered = selectedTemplate.layout === 'centered';

  // Data untuk QR Code
  const qrData = JSON.stringify({
    tipe: "Surat Resmi Digital",
    sekolah: config?.name,
    nomor: formData.refNumber,
    tanggal: formData.date,
    ttd: formData.signerName.replace(/[()]/g, '').trim(),
    nip: formData.signerNip
  });

  if (!config) {
     return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-indigo-600"/></div>;
  }

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
            disabled={isSaving}
            className={`flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${isSaved ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          >
            {isSaving ? <Loader2 size={18} className="animate-spin mr-2"/> : (isSaved ? <CheckCircle2 size={18} className="mr-2"/> : <Save size={18} className="mr-2"/>)}
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
        {/* Editor Column (Diperluas menjadi 5/12 atau sekitar 42%) */}
        <div className="w-full lg:w-5/12 flex flex-col gap-4 overflow-y-auto pr-2 print:hidden">
          
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
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  {selectedTemplate.id === 't_mutasi_keluar' ? 'Info Tanda Tangan Bawah' : 'Info Penanda Tangan'}
                </label>
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
                  {/* Toggle QR Code */}
                  <label className="flex items-center p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                     <input 
                       type="checkbox" 
                       checked={useQRCode} 
                       onChange={(e) => setUseQRCode(e.target.checked)}
                       className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                     />
                     <div className="ml-3 flex items-center">
                        <QrCode size={16} className="text-slate-500 mr-2"/>
                        <span className="text-sm font-bold text-slate-700">Tanda Tangan Digital (QR)</span>
                     </div>
                  </label>
                </div>
             </div>
          </div>

          {/* Text Editor (Lebih luas, font lebih besar, min-height ditambah) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex-1 flex flex-col min-h-[500px]">
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex justify-between">
                Isi Surat
                <span className="text-[10px] text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full normal-case">Editor Cerdas (Auto-Align)</span>
             </label>
             <p className="text-[10px] text-slate-400 mb-2">
                Tips: Tulis "Label : Isi" agar lurus. Data akan otomatis menjorok ke dalam.
             </p>
             <textarea 
               name="content"
               value={formData.content}
               onChange={handleInputChange}
               className="w-full flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-serif text-slate-800 leading-relaxed text-base"
             />
          </div>
        </div>

        {/* Preview Column (F4 Paper: 215mm x 330mm) - Dikurangi jadi 7/12 */}
        <div className="w-full lg:w-7/12 bg-slate-200/50 rounded-2xl border border-slate-200 overflow-y-auto p-4 md:p-8 flex justify-center print:bg-white print:p-0 print:border-0 print:overflow-visible print:w-full print:absolute print:top-0 print:left-0 print:z-50">
           {/* F4 Container */}
           <div className="bg-white w-[215mm] min-h-[330mm] shadow-2xl p-[20mm] mx-auto relative print:shadow-none print:w-full print:m-0 flex flex-col">
              
              {/* Kop Surat yang Diperbaiki (Lebih Simetris dan Font Serif) */}
              <div className="border-b-[4px] border-double border-black pb-4 mb-6 pt-2 grid grid-cols-[120px_1fr_120px] items-center">
                 {/* Logo Daerah (Kiri) */}
                 <div className="flex justify-center items-center h-full">
                   {config.logoDaerahUrl ? (
                     <img src={config.logoDaerahUrl} className="w-[24mm] h-auto object-contain max-h-[28mm]" alt="Logo Daerah"/>
                   ) : <div className="w-[24mm]"></div>}
                 </div>
                 
                 {/* Text Header (Tengah) */}
                 <div className="text-center w-full px-1">
                    <h3 className="text-[14pt] font-bold uppercase tracking-wide leading-tight font-serif text-black">{config.headerLine1}</h3>
                    <h3 className="text-[14pt] font-bold uppercase tracking-wide leading-tight font-serif text-black">{config.headerLine2}</h3>
                    <h1 className="text-[18pt] font-extrabold uppercase my-1 leading-none tracking-tight font-serif text-black scale-y-110">{config.name}</h1>
                    <p className="text-[10pt] font-serif leading-tight mt-1 text-black">{config.address}</p>
                    <p className="text-[10pt] font-serif leading-tight text-black">Email: {config.email}</p>
                 </div>

                 {/* Logo Sekolah (Kanan) */}
                 <div className="flex justify-center items-center h-full">
                   {config.logoUrl ? (
                     <img src={config.logoUrl} className="w-[24mm] h-auto object-contain max-h-[28mm]" alt="Logo Sekolah"/>
                   ) : <div className="w-[24mm]"></div>}
                 </div>
              </div>

              {/* Body */}
              <div className="font-serif text-black leading-relaxed flex-1 flex flex-col">
                 
                 {isCentered ? (
                   /* Centered Layout (SPT / Laporan) */
                   <div className="text-center mb-6">
                      <h2 className="text-[13pt] font-bold underline uppercase tracking-wide">{selectedTemplate.subject}</h2>
                      {!selectedTemplate.name.includes('Laporan') && (
                        <p className="mt-0 font-bold text-[11pt]">NO : {formData.refNumber}</p>
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

                 {/* Smart Content Renderer */}
                 <div className="min-h-[300px] mb-8">
                    <SmartContentRenderer text={formData.content} />
                 </div>

                 {/* Signature (Bottom) */}
                 <div className="mt-auto flex justify-end">
                    <div className="text-center w-64 text-[11pt]">
                       <p className="mb-1">
                         {selectedTemplate.id === 't_mutasi_keluar' 
                           ? `Kediri, ...........................................` 
                           : `Kediri, ${format(new Date(formData.date), 'dd MMMM yyyy', { locale: id })}`}
                       </p>
                       <p>{formData.signatureTitle}</p>
                       
                       {/* QR Code Logic */}
                       {useQRCode ? (
                         <div className="h-24 flex justify-center items-center my-1 relative">
                             <div className="border-2 border-slate-900 p-1 rounded-lg">
                               <QRCodeSVG 
                                 value={qrData} 
                                 size={80} 
                                 level="M"
                               />
                             </div>
                             <div className="absolute -bottom-2 text-[8px] font-mono bg-white px-1">Digital Signature</div>
                         </div>
                       ) : (
                         <div className="h-24"></div> 
                       )}

                       <p className="font-bold underline">{formData.signerName}</p>
                       <p>NIP. {formData.signerNip}</p>
                    </div>
                 </div>

                 {/* BSrE Footer (Recreated using CSS/SVG to look like the image) */}
                 {useQRCode && (
                   <div className="mt-12 border border-slate-400 p-2 flex items-center gap-3 w-full">
                     {/* Logo Section */}
                     <div className="flex items-center gap-2 shrink-0 border-r-2 border-[#009ee0] pr-3">
                        <div className="w-10 h-10 rounded-full bg-[#009ee0] flex items-center justify-center text-white relative overflow-hidden">
                           <Key size={20} className="-rotate-45" strokeWidth={2.5} />
                           {/* Decorative arc for logo likeness */}
                           <div className="absolute top-0 right-0 w-5 h-5 border-l-2 border-b-2 border-white rounded-bl-full opacity-50"></div>
                        </div>
                        <div className="flex flex-col text-[8pt] font-extrabold text-[#009ee0] leading-[1.1] tracking-tight">
                          <span>Balai</span>
                          <span>Sertifikasi</span>
                          <span>Elektronik</span>
                        </div>
                     </div>

                     {/* Text Section */}
                     <div className="text-[7.5pt] font-sans text-slate-800 leading-[1.3]">
                       <p className="mb-0">Catatan :</p>
                       <p className="mb-0">- UU ITE No. 19 Tahun 2016 tentang Informasi dan Transaksi Elektronik pasal 5 ayat 1: 'Informasi Elektronik dan/atau Dokumen Elektronik dan/atau hasil cetaknya merupakan alat bukti hukum yang sah.'</p>
                       <p className="mb-0">- Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat elektronik yang diterbitkan BSrE</p>
                     </div>
                   </div>
                 )}
              </div>

           </div>
        </div>
      </div>
      
      {/* Print Styles */}
      <style>{`
        @media print {
          @page { size: 215mm 330mm; margin: 0; }
          body * { visibility: hidden; }
          .print\\:block { display: block !important; }
          .print\\:hidden { display: none !important; }
          .bg-slate-200\\/50 { background: white !important; padding: 0 !important; overflow: visible !important; }
          .bg-white.w-\\[215mm\\] { visibility: visible !important; position: absolute; left: 0; top: 0; width: 100%; margin: 0; box-shadow: none; }
          .bg-white.w-\\[215mm\\] * { visibility: visible; }
        }
      `}</style>
    </div>
  );
};

export default LetterCreator;