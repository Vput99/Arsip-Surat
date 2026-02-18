
import React, { useState, useEffect, useRef } from 'react';
import { Printer, Loader2, FileText, Layout, UserPlus, Info, QrCode, Save, Users, Search, Check, FileDown, RotateCcw, Sparkles, Wand2 } from 'lucide-react';
import { subscribeToConfig, subscribeToTemplates, LetterTemplate, subscribeToStaff, StaffMember, saveMail } from '../services/storage';
import { SchoolConfig, MailType, MailStatus, UrgencyLevel, Mail } from '../types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale/id';
import { QRCodeSVG } from 'qrcode.react';
import { useLocation, useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { generateNotulenContent, generateLaporanSPPDContent } from '../services/geminiService';

const SmartContentRenderer = ({ text, subject }: { text: string, subject: string }) => {
  if (!text) return null;
  
  const cleanText = (t: string) => {
    let result = t.replace(/^(Berikut adalah|Ini adalah|Sesuai dengan|Tentu, ini|Berikut ini).*(:|surat|naskah|berikut):/i, '')
            .replace(/\*\*/g, '')
            .trim();
    
    return result;
  };

  const lines = cleanText(text).split('\n');
  const renderedBlocks: React.ReactNode[] = [];
  let tableRows: string[][] = [];
  let isInTableMode = false;

  const flushTable = () => {
    if (tableRows.length > 0) {
      const firstRow = tableRows[0];
      const hasHeader = firstRow.some(cell => 
        ['nama', 'jabatan', 'no', 'kelas', 'rekening', 'id', 'virtual', 'peserta', 'keterangan'].some(k => cell.toLowerCase().includes(k))
      );
      
      renderedBlocks.push(
        <div key={`table-wrapper-${renderedBlocks.length}`} className="mb-4 break-inside-avoid px-0 w-full overflow-x-auto">
          <table className="w-full border-collapse border border-black text-[11pt]">
            <thead>
              {hasHeader && (
                <tr className="bg-transparent">
                  {tableRows[0].map((cell, idx) => (
                    <th key={idx} className="border border-black p-1.5 text-center font-bold align-middle">{cell.trim()}</th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {tableRows.slice(hasHeader ? 1 : 0).map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className={`border border-black px-2 py-1.5 align-top leading-snug ${cellIdx === 0 ? 'text-center w-12' : ''}`}>
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
      renderedBlocks.push(<div className="h-4" key={`br-${index}`}></div>);
      return;
    }

    if (trimmed === '[PAGE_BREAK]') {
      flushTable();
      renderedBlocks.push(<div key={`pb-${index}`} className="page-breaker print:break-after-page h-0 my-4 relative border-t border-dashed border-slate-300 print:border-none print:my-0"></div>);
      return;
    }

    const columns = line.split(':');
    const isActuallyDataTable = columns.length >= 3 && !['Dasar', 'Untuk', 'Kepada', 'Hari', 'Waktu', 'Tempat', 'Pukul'].some(k => trimmed.startsWith(k));
    const isNumberedData = /^\d+\./.test(trimmed);

    if (isActuallyDataTable || (isInTableMode && isNumberedData)) {
      isInTableMode = true;
      tableRows.push(columns);
      return;
    }

    flushTable();

    // Deteksi Judul Tengah (Uppercase)
    if (trimmed === trimmed.toUpperCase() && trimmed.length < 80 && !trimmed.includes(':') && trimmed.length > 4) {
      renderedBlocks.push(<div key={`title-${index}`} className="mt-4 mb-3 font-bold text-center uppercase tracking-wide underline underline-offset-4">{trimmed}</div>);
    } 
    // Deteksi Label: Value (Format Kedinasan)
    else if (trimmed.includes(':') && !trimmed.startsWith('http')) {
      const firstColonIdx = line.indexOf(':');
      let label = line.substring(0, firstColonIdx).trim();
      let value = line.substring(firstColonIdx + 1).trim();
      
      const isIntroSentence = label.length > 55 || label.toLowerCase().includes('yang bertanda tangan') || label.toLowerCase().includes('menerangkan bahwa');
      
      if (isIntroSentence) {
         renderedBlocks.push(<p key={`p-${index}`} className="mb-2 text-justify leading-[1.6] indent-[3rem]">{trimmed}</p>);
      } else {
         const labelWidth = 'w-[140px]';
         renderedBlocks.push(
            <div key={`info-${index}`} className="flex mb-1.5 break-inside-avoid leading-[1.5]">
              <span className={`${labelWidth} shrink-0`}>{label}</span>
              <span className="w-[20px] text-center shrink-0">:</span>
              <span className="flex-1 text-justify">{value}</span>
            </div>
         );
      }
    } 
    // Deteksi List Nomor (Agenda/Catatan)
    else if (isNumberedData) {
      const match = trimmed.match(/^(\d+\.)\s+(.*)/);
      renderedBlocks.push(
        <div key={`list-${index}`} className="flex mb-1.5 pl-[1rem] leading-[1.6] relative">
          <span className="w-6 text-left shrink-0">{match ? match[1] : ''}</span>
          <span className="flex-1 text-justify">{match ? match[2] : trimmed}</span>
        </div>
      );
    }
    else {
      renderedBlocks.push(<p key={`p-${index}`} className="mb-2 text-justify leading-[1.6] indent-[3rem]">{trimmed}</p>);
    }
  });
  
  flushTable();
  return <div className="text-[12pt]">{renderedBlocks}</div>;
};

const LetterCreator: React.FC = () => {
  const location = useLocation();
  const state = location.state as any;
  const navigate = useNavigate();
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplate | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showStaffPicker, setShowStaffPicker] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  
  const isInitialized = useRef(false);
  const letterContainerRef = useRef<HTMLDivElement>(null);
  const [useQRCode, setUseQRCode] = useState(true);

  const [formData, setFormData] = useState({
    refNumber: `094/..../419.42.03.135/${new Date().getFullYear()}`,
    date: new Date().toISOString().split('T')[0],
    attachment: '-',
    recipient: '',
    signatureTitle: 'Kepala Sekolah',
    signerName: '',
    signerNip: '',
    subject: '',
    content: ''
  });

  useEffect(() => {
    const unsubscribeStaff = subscribeToStaff(setStaff);
    const unsubscribeConfig = subscribeToConfig((newConfig) => {
      setConfig(newConfig);
      if (!isInitialized.current) {
        setFormData(prev => ({ 
          ...prev, 
          signerName: newConfig.principalName, 
          signerNip: newConfig.principalNip 
        }));
      }
    });

    const unsubscribeTemplates = subscribeToTemplates((data) => {
      setTemplates(data);
      if (isInitialized.current) return;

      if (state && state.content) {
        const targetTemplate = data.find(t => t.id === state.templateId) || data[0];
        if (targetTemplate) {
          setSelectedTemplate(targetTemplate);
          setFormData(prev => ({
            ...prev,
            subject: state.subject || targetTemplate.subject,
            content: state.content, 
            signatureTitle: targetTemplate.category === 'Tugas' ? 'Kepala Sekolah,' : 'Kepala Sekolah'
          }));
          isInitialized.current = true;
          return;
        }
      }

      if (state && state.templateId) {
        const targetTemplate = data.find(t => t.id === state.templateId);
        if (targetTemplate) {
          setSelectedTemplate(targetTemplate);
          setFormData(prev => ({
            ...prev,
            subject: targetTemplate.subject,
            content: targetTemplate.content.trim(),
            signatureTitle: targetTemplate.category === 'Tugas' ? 'Kepala Sekolah,' : 'Kepala Sekolah'
          }));
          isInitialized.current = true;
          return;
        }
      } 
      
      if (data.length > 0) {
        const firstTemplate = data[0];
        setSelectedTemplate(firstTemplate);
        setFormData(prev => ({ 
          ...prev, 
          subject: firstTemplate.subject, 
          content: firstTemplate.content 
        }));
        isInitialized.current = true;
      }
    });

    return () => { unsubscribeConfig(); unsubscribeTemplates(); unsubscribeStaff(); };
  }, [state]);

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

  const handleMagicFill = async () => {
    if (!formData.content || formData.content.length < 5) {
      alert("Harap isi deskripsi singkat di naskah sebelum menggunakan AI.");
      return;
    }
    setAiGenerating(true);
    try {
      let result = "";
      if (selectedTemplate?.id === 't_notulen') {
        result = await generateNotulenContent(formData.content);
      } else if (selectedTemplate?.id === 't_laporan_sppd') {
        result = await generateLaporanSPPDContent(formData.content);
      } else {
        alert("Fitur Magic Fill saat ini khusus untuk Notulen dan Laporan SPPD.");
        return;
      }
      setFormData(prev => ({ ...prev, content: result }));
    } catch (e) {
      alert("Gagal memproses AI. Periksa koneksi internet.");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const generatePDFBlob = async (): Promise<string | null> => {
    if (!letterContainerRef.current) return null;
    setPdfGenerating(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [215, 330] });
      const pages = letterContainerRef.current.querySelectorAll('.letter-paper');
      
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        const canvas = await html2canvas(page, {
          scale: 2, 
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 1200
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.80);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, 215, 330);
      }
      return pdf.output('datauristring');
    } catch (err) {
      console.error("PDF Fail:", err);
      return null;
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleSaveToOutbox = async () => {
    if (!confirm('Simpan naskah dan arsipkan ke Surat Keluar?')) return;
    setSaveLoading(true);
    try {
      const pdfDataUri = await generatePDFBlob();
      const newMail: Mail = {
        id: Date.now().toString(),
        type: MailType.OUTGOING,
        referenceNumber: formData.refNumber,
        date: formData.date,
        receivedDate: formData.date,
        createdAt: new Date().toISOString(),
        sender: formData.recipient || 'Internal Sekolah',
        subject: formData.subject,
        description: formData.content.split('\n').slice(0, 3).join(' '),
        category: selectedTemplate?.category || 'Dinas',
        urgency: UrgencyLevel.LOW,
        status: MailStatus.ARCHIVED,
        fileUrl: pdfDataUri || undefined,
        aiSummary: `Dokumen digital dibuat dari template: ${selectedTemplate?.name}`
      };
      await saveMail(newMail);
      alert('Surat berhasil diarsipkan.');
      navigate('/outbox');
    } catch (e: any) {
      alert('Gagal menyimpan: ' + e.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSelectStaff = (member: StaffMember) => {
    setFormData(prev => {
      let newContent = prev.content;
      if (newContent.includes('[NAMA_PETUGAS]')) {
        newContent = newContent.replace('[NAMA_PETUGAS]', member.name);
        newContent = newContent.replace('[NIP_PETUGAS]', member.nip ? `NIP. ${member.nip}` : '-');
        newContent = newContent.replace('[JABATAN_PETUGAS]', member.rank || '-');
        newContent = newContent.replace('[PANGKAT_GOL]', member.rank || '-');
      } else {
        newContent += `\nNama : ${member.name}\nNIP : ${member.nip || '-'}\nJabatan : ${member.rank || '-'}\n`;
      }
      return { ...prev, content: newContent };
    });
    setShowStaffPicker(false);
  };

  if (!config || templates.length === 0) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-indigo-600"/></div>;

  const contentParts = formData.content.split('[PAGE_BREAK]');
  const qrValue = `DOKUMEN SAH SDN ${config.name.toUpperCase()}\nNomor: ${formData.refNumber}\nPejabat: ${formData.signerName}\nTanggal: ${formData.date}`;

  // Hanya surat Undangan yang menggunakan layout 'standard' (Official Style)
  const isOfficialLayout = selectedTemplate?.layout === 'standard';

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-6 animate-fade-in text-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg"><FileText size={20} /></div>
          <div>
            <h2 className="text-xl font-black text-slate-800">Editor Surat Digital</h2>
            <p className="text-slate-500 text-xs font-medium">Naskah otomatis tersimpan ke arsip Keluar.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSaveToOutbox} disabled={saveLoading || pdfGenerating} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center gap-2">
            {saveLoading || pdfGenerating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
            Simpan ke Arsip
          </button>
          <button onClick={() => window.print()} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2">
            <Printer size={18} /> Cetak
          </button>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
        <div className="w-full lg:w-[400px] flex flex-col gap-4 overflow-y-auto pr-2 print:hidden shrink-0">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-5">
             <div>
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Templat Surat</label>
               <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" onChange={handleTemplateChange} value={selectedTemplate?.id}>
                 {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
               </select>
             </div>
             <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {isOfficialLayout ? 'HAL SURAT (Edit Disini)' : 'PERIHAL / JUDUL'}
                  </label>
                  <input name="subject" value={formData.subject} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-black uppercase text-indigo-900" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. Surat</label>
                     <input name="refNumber" value={formData.refNumber} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono" />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lampiran</label>
                     <input name="attachment" value={formData.attachment} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                   </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</label>
                  <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                </div>
             </div>
             <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Penandatangan</label>
                  <button onClick={() => setUseQRCode(!useQRCode)} className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] font-black uppercase ${useQRCode ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <QrCode size={14} /> {useQRCode ? 'QR Aktif' : 'QR Mati'}
                  </button>
                </div>
                <div className="space-y-3">
                  <input name="signerName" value={formData.signerName} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 rounded-xl text-xs font-bold" placeholder="Nama" />
                  <input name="signerNip" value={formData.signerNip} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 rounded-xl text-xs" placeholder="NIP" />
                  <input name="signatureTitle" value={formData.signatureTitle} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 rounded-xl text-xs" placeholder="Jabatan" />
                </div>
             </div>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200 flex-1 flex flex-col min-h-[350px]">
             <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Isi Naskah</label>
                <div className="flex gap-2">
                   { (selectedTemplate?.id === 't_notulen' || selectedTemplate?.id === 't_laporan_sppd') && (
                     <button onClick={handleMagicFill} disabled={aiGenerating} className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg border border-indigo-100 flex items-center gap-1.5 hover:bg-indigo-100 transition-colors">
                       {aiGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} className="text-amber-500" />} 
                       Magic Fill
                     </button>
                   )}
                   <button onClick={() => setShowStaffPicker(true)} className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg border border-emerald-100 flex items-center gap-1.5 hover:bg-emerald-100 transition-colors"><Users size={12} /> Personil</button>
                </div>
             </div>
             <textarea name="content" value={formData.content} onChange={handleInputChange} className="w-full flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-mono text-[11px] resize-none" />
          </div>
        </div>
        <div ref={letterContainerRef} className="flex-1 bg-slate-200/50 rounded-3xl overflow-y-auto p-8 flex flex-col items-center gap-10 print:p-0 print:bg-white print:block">
           {contentParts.map((part, pIdx) => (
             <div key={pIdx} className="letter-paper bg-white shadow-2xl relative print:shadow-none flex flex-col text-black mb-10 print:mb-0">
                {pIdx === 0 && (
                  <div className="border-b-[3px] border-double border-black pb-2 mb-6 grid grid-cols-[24mm_1fr_24mm] items-center text-black">
                     <div className="flex justify-center">{config.logoDaerahUrl && <img src={config.logoDaerahUrl} className="w-full h-auto object-contain" />}</div>
                     <div className="text-center w-full px-2">
                        <h3 className="text-[14pt] uppercase tracking-wide">{config.headerLine1}</h3>
                        <h3 className="text-[14pt] font-bold uppercase tracking-wide">{config.headerLine2}</h3>
                        <h1 className="text-[18pt] font-black uppercase my-1 tracking-tight">{config.name}</h1>
                        <p className="text-[10pt] leading-tight">{config.address}</p>
                        <p className="text-[9pt] font-bold">NPSN: {config.npsn} | Email: {config.email}</p>
                     </div>
                     <div className="flex justify-center">{config.logoUrl && <img src={config.logoUrl} className="w-full h-auto object-contain" />}</div>
                  </div>
                )}
                <div className="flex-1 flex flex-col pt-2">
                   {pIdx === 0 && (
                     <>
                       {isOfficialLayout ? (
                         <div className="grid grid-cols-2 mb-8 text-[12pt]">
                            <div className="space-y-0.5">
                               <div className="flex"><span className="w-16">Nomor</span><span className="w-4">:</span><span>{formData.refNumber}</span></div>
                               <div className="flex"><span className="w-16">Lampiran</span><span className="w-4">:</span><span>{formData.attachment}</span></div>
                               <div className="flex"><span className="w-16">Hal</span><span className="w-4">:</span><span className="font-bold underline">{formData.subject}</span></div>
                            </div>
                            <div className="text-right">
                               <p>Kediri, {format(new Date(formData.date), 'dd MMMM yyyy', { locale: id })}</p>
                            </div>
                         </div>
                       ) : (
                         <div className="text-center mb-8">
                           <h2 className="text-[12pt] font-bold uppercase underline decoration-2">{formData.subject}</h2>
                           <p className="text-[12pt] mt-1">Nomor: {formData.refNumber}</p>
                         </div>
                       )}
                     </>
                   )}
                   <div className="flex-1">
                     <SmartContentRenderer text={part} subject={formData.subject} />
                   </div>
                   {pIdx === contentParts.length - 1 && (
                     <div className="mt-8 ml-auto w-[350px] flex flex-col text-center">
                        {!isOfficialLayout && <p className="mb-1">Kediri, {format(new Date(formData.date), 'dd MMMM yyyy', { locale: id })}</p>}
                        <p className="font-bold">{formData.signatureTitle}</p>
                        <div className="h-28 flex items-center justify-center my-1 relative">
                          {useQRCode && (
                            <div className="relative">
                               <QRCodeSVG 
                                value={qrValue} 
                                size={90} 
                                level="H" 
                                imageSettings={{
                                    src: config.logoDaerahUrl,
                                    height: 20,
                                    width: 20,
                                    excavate: true,
                                }}
                                />
                            </div>
                          )}
                        </div>
                        <p className="font-bold underline uppercase">{formData.signerName}</p>
                        <p className="">{formData.signerNip ? `NIP. ${formData.signerNip}` : ''}</p>
                     </div>
                   )}
                </div>
             </div>
           ))}
        </div>
      </div>
      {showStaffPicker && (
         <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl flex flex-col h-[70vh]">
              <div className="flex justify-between items-center mb-6">
                 <h4 className="text-lg font-black text-slate-800">Pilih Personil</h4>
                 <button onClick={() => setShowStaffPicker(false)} className="text-slate-400 font-bold text-xs hover:text-rose-500 transition-colors">Tutup</button>
              </div>
              <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Cari nama..." value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl outline-none" />
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                {staff.filter(s => s.name.toLowerCase().includes(staffSearch.toLowerCase())).map(member => (
                  <button key={member.id} onClick={() => handleSelectStaff(member)} className="w-full p-4 bg-slate-50 rounded-xl text-left hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all">
                    <p className="font-bold text-slate-800">{member.name}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">{member.rank}</p>
                  </button>
                ))}
              </div>
           </div>
         </div>
      )}
      <style>{`
        .letter-paper { 
          width: 215mm; 
          min-height: 330mm; 
          padding: 20mm 25mm 20mm 25mm; 
          font-family: 'Times New Roman', Times, serif;
          font-size: 12pt;
          line-height: 1.5;
        } 
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

        @media print { 
          @page { size: 215mm 330mm portrait; margin: 0; } 
          body * { visibility: hidden; } 
          .letter-paper, .letter-paper * { visibility: visible !important; } 
          .letter-paper { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; height: 330mm !important; margin: 0 !important; padding: 20mm 25mm 20mm 25mm !important; display: flex !important; flex-direction: column !important; } 
        }
      `}</style>
    </div>
  );
};

export default LetterCreator;
