import { Printer, Loader2, FileText, Layout, UserPlus, Info, QrCode, Save, Users, Search, Check, FileDown, RotateCcw, Sparkles, Wand2, ChevronLeft, X, ZoomIn, ZoomOut } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
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
                    <th key={idx} className="border border-black p-1.5 text-center font-bold align-middle uppercase bg-slate-50/50">{cell.trim()}</th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {tableRows.slice(hasHeader ? 1 : 0).map((row, rowIdx) => (
                <tr key={rowIdx} className="break-inside-avoid">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className={`border border-black px-2 py-1 align-top leading-normal ${cellIdx === 0 ? 'text-center w-10' : ''}`}>
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
    const isActuallyDataTable = columns.length >= 3 && !['Dasar', 'Untuk', 'Kepada', 'Hari', 'Waktu', 'Tempat', 'Pukul', 'Perihal', 'Nomor'].some(k => trimmed.startsWith(k));
    const isNumberedData = /^\d+\./.test(trimmed);

    if (isActuallyDataTable || (isInTableMode && isNumberedData)) {
      isInTableMode = true;
      tableRows.push(columns);
      return;
    }

    flushTable();

    // Deteksi Judul Tengah (Uppercase)
    if (trimmed === trimmed.toUpperCase() && trimmed.length < 100 && !trimmed.includes(':') && trimmed.length > 4) {
      renderedBlocks.push(<div key={`title-${index}`} className="mt-4 mb-2 font-bold text-center uppercase tracking-wide underline underline-offset-4 text-[12pt] break-inside-avoid">{trimmed}</div>);
    } 
    // Deteksi Label: Value (Format Kedinasan)
    else if (trimmed.includes(':') && !trimmed.startsWith('http')) {
      const firstColonIdx = line.indexOf(':');
      let label = line.substring(0, firstColonIdx).trim();
      let value = line.substring(firstColonIdx + 1).trim();
      
      const isIntroSentence = label.length > 60 || label.toLowerCase().includes('yang bertanda tangan') || label.toLowerCase().includes('menerangkan bahwa');
      
      if (isIntroSentence) {
         renderedBlocks.push(<p key={`p-${index}`} className="my-[5px] text-justify leading-[1.5] indent-[3.5rem]">{trimmed}</p>);
      } else {
         const labelWidth = 'w-[150px]';
         renderedBlocks.push(
            <div key={`info-${index}`} className="flex my-[2px] break-inside-avoid leading-[1.5]">
              <span className={`${labelWidth} shrink-0 font-medium`}>{label}</span>
              <span className="w-[20px] text-center shrink-0">:</span>
              <span className="flex-1 text-justify">{value}</span>
            </div>
         );
      }
    } 
    // Deteksi List Nomor
    else if (isNumberedData) {
      const match = trimmed.match(/^(\d+\.)\s+(.*)/);
      renderedBlocks.push(
        <div key={`list-${index}`} className="flex my-[4px] pl-[1rem] leading-[1.5] relative break-inside-avoid">
          <span className="w-6 text-left shrink-0 font-medium">{match ? match[1] : ''}</span>
          <span className="flex-1 text-justify">{match ? match[2] : trimmed}</span>
        </div>
      );
    }
    else {
      renderedBlocks.push(<p key={`p-${index}`} className="my-[5px] text-justify leading-[1.5] indent-[3.5rem]">{trimmed}</p>);
    }
  });
  
  flushTable();
  return <div className="text-[12pt] font-serif">{renderedBlocks}</div>;
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
  const [scale, setScale] = useState(0.7);

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
          scale: 3, 
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 1200
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
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
      } else if (newContent.includes('[NAMA_LAMA]')) {
         newContent = newContent.replace('[NAMA_LAMA]', member.name);
         newContent = newContent.replace('[NIP_LAMA]', member.nip || '-');
         newContent = newContent.replace('[PANGKAT_LAMA]', member.rank || '-');
      } else {
        newContent += `\nNama : ${member.name}\nNIP : ${member.nip || '-'}\nJabatan : ${member.rank || '-'}\n`;
      }
      return { ...prev, content: newContent };
    });
    setShowStaffPicker(false);
  };

  if (!config || templates.length === 0) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-indigo-600"/></div>;

  const getPaginatedContent = (text: string) => {
    if (text.includes('[PAGE_BREAK]')) return text.split('[PAGE_BREAK]');
    
    const lines = text.split('\n');
    const pages: string[] = [];
    let currentPage = '';
    let currentLines = 0;
    
    // Page 1 has header (approx 10 lines) + date/subject (approx 5 lines)
    const MAX_LINES_PAGE_1 = 30; 
    const MAX_LINES_PAGE_2 = 45;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const estimatedLines = Math.max(1, Math.ceil(line.length / 85));
      
      const maxLines = pages.length === 0 ? MAX_LINES_PAGE_1 : MAX_LINES_PAGE_2;
      
      if (currentLines + estimatedLines > maxLines && currentPage !== '') {
        pages.push(currentPage);
        currentPage = line;
        currentLines = estimatedLines;
      } else {
        currentPage += (currentPage ? '\n' : '') + line;
        currentLines += estimatedLines;
      }
    }
    
    if (currentPage || pages.length === 0) {
      const maxLines = pages.length === 0 ? MAX_LINES_PAGE_1 : MAX_LINES_PAGE_2;
      if (currentLines + 8 > maxLines) {
        pages.push(currentPage);
        pages.push('');
      } else {
        pages.push(currentPage);
      }
    }
    
    return pages;
  };

  // Split content by [PAGE_BREAK] for manual pagination or auto-paginate
  const contentParts = getPaginatedContent(formData.content);
  const qrValue = `DOKUMEN SAH SDN ${config.name.toUpperCase()}\nNomor: ${formData.refNumber}\nPejabat: ${formData.signerName}\nTanggal: ${formData.date}`;

  const isOfficialLayout = selectedTemplate?.layout === 'standard';

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-8 animate-fade-in text-slate-900 print:h-auto print:overflow-visible relative z-10">
      {/* Header Toolbar - Glass Style */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 glass-card p-6 rounded-[2.5rem] border border-white/40 shadow-xl print:hidden">
        <div className="flex items-center gap-5">
          <button onClick={() => navigate(-1)} className="p-3 glass-panel hover:bg-white/80 rounded-2xl text-slate-500 transition-all border border-white/20"><ChevronLeft size={24}/></button>
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Editor Naskah Digital</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1 opacity-70">Precise F4 Folio Simulation • Realtime Preview</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex glass-panel p-1.5 rounded-2xl mr-2 border border-white/10">
             <button onClick={() => setScale(Math.max(0.4, scale - 0.1))} className="p-2.5 text-slate-500 hover:text-indigo-600 transition-colors"><ZoomOut size={18}/></button>
             <button onClick={() => setScale(0.7)} className="px-5 text-[10px] font-black text-slate-400 hover:text-indigo-600 transition-colors">RESET</button>
             <button onClick={() => setScale(Math.min(1.2, scale + 0.1))} className="p-2.5 text-slate-500 hover:text-indigo-600 transition-colors"><ZoomIn size={18}/></button>
          </div>
          <button onClick={handleSaveToOutbox} disabled={saveLoading || pdfGenerating} className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.25em] flex items-center gap-3 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.4)] hover:bg-emerald-700 transition-all active:scale-95 ring-1 ring-white/20">
            {saveLoading || pdfGenerating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
            ARSIP KELUAR
          </button>
          <button onClick={() => window.print()} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.25em] flex items-center gap-3 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)] hover:bg-black transition-all active:scale-95 border border-white/10">
            <Printer size={18} /> CETAK
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 h-full overflow-hidden print:h-auto print:overflow-visible print:block pb-6">
        {/* Editor Sidebar - Pro Glass */}
        <div className="w-full lg:w-[440px] flex flex-col gap-6 overflow-y-auto pr-2 print:hidden shrink-0 custom-scrollbar">
          <div className="glass-card p-8 rounded-[3rem] border border-white/40 shadow-lg space-y-8">
             <div>
               <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Templat Naskah</label>
               <select className="w-full px-6 py-4 glass-input border-white/20 rounded-2xl outline-none font-bold text-slate-700 focus:bg-white/80 transition-all appearance-none cursor-pointer" onChange={handleTemplateChange} value={selectedTemplate?.id}>
                 {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
               </select>
             </div>
             <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Perihal Dokumen</label>
                  <input name="subject" value={formData.subject} onChange={handleInputChange} className="w-full px-6 py-4 glass-input border-white/20 rounded-2xl text-sm font-black uppercase text-indigo-900 focus:bg-white/80" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Nomor Surat</label>
                     <input name="refNumber" value={formData.refNumber} onChange={handleInputChange} className="w-full px-5 py-3.5 glass-input border-white/20 rounded-2xl text-[11px] font-mono font-bold" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Lampiran</label>
                     <input name="attachment" value={formData.attachment} onChange={handleInputChange} className="w-full px-5 py-3.5 glass-input border-white/20 rounded-2xl text-[11px] font-bold" />
                   </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Tanggal Dokumen</label>
                  <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full px-6 py-3.5 glass-input border-white/20 rounded-2xl text-xs font-bold" />
                </div>
             </div>
             <div className="pt-8 border-t border-white/10 space-y-5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Tanda Tangan</label>
                  <button onClick={() => setUseQRCode(!useQRCode)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${useQRCode ? 'bg-indigo-600 text-white shadow-lg ring-1 ring-white/20' : 'glass-panel text-slate-400'}`}>
                    <QrCode size={16} /> {useQRCode ? 'QR Aktif' : 'QR Mati'}
                  </button>
                </div>
                <div className="space-y-4">
                  <input name="signerName" value={formData.signerName} onChange={handleInputChange} className="w-full px-5 py-3.5 glass-input border-transparent rounded-2xl text-xs font-black placeholder:text-slate-300 focus:bg-white/80 focus:border-indigo-200" placeholder="NAMA TERANG PENANDATANGAN" />
                  <input name="signerNip" value={formData.signerNip} onChange={handleInputChange} className="w-full px-5 py-3.5 glass-input border-transparent rounded-2xl text-xs font-bold placeholder:text-slate-300 focus:bg-white/80 focus:border-indigo-200" placeholder="NIP" />
                  <input name="signatureTitle" value={formData.signatureTitle} onChange={handleInputChange} className="w-full px-5 py-3.5 glass-input border-transparent rounded-2xl text-xs font-bold placeholder:text-slate-300 focus:bg-white/80 focus:border-indigo-200" placeholder="JABATAN DINAS" />
                </div>
             </div>
          </div>
          <div className="glass-card p-8 rounded-[3rem] border border-white/40 flex-1 flex flex-col min-h-[450px] print:hidden shadow-lg">
             <div className="flex justify-between items-center mb-6">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Isi Naskah</label>
                <div className="flex gap-2">
                   { (selectedTemplate?.id === 't_notulen' || selectedTemplate?.id === 't_laporan_sppd') && (
                     <button onClick={handleMagicFill} disabled={aiGenerating} className="text-[10px] font-black bg-indigo-50/50 text-indigo-600 px-4 py-2.5 rounded-xl border border-indigo-100 flex items-center gap-2 hover:bg-indigo-100 transition-colors shadow-sm">
                       {aiGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-amber-500" />} 
                       MAGIC FILL
                     </button>
                   )}
                   <button onClick={() => setShowStaffPicker(true)} className="text-[10px] font-black bg-emerald-50/50 text-emerald-600 px-4 py-2.5 rounded-xl border border-emerald-100 flex items-center gap-2 hover:bg-emerald-100 transition-colors shadow-sm"><Users size={14} /> PERSONIL</button>
                </div>
             </div>
             <textarea name="content" value={formData.content} onChange={handleInputChange} className="w-full flex-1 p-6 glass-input border-white/20 rounded-[2.5rem] outline-none font-mono text-[13px] leading-relaxed resize-none focus:bg-white/80 focus:ring-4 focus:ring-indigo-50/50 transition-all shadow-inner" placeholder="Pilih template atau ketik naskah di sini..." />
             <div className="mt-4 text-[9px] text-slate-400 font-black uppercase text-center italic tracking-widest opacity-60">Tip: Gunakan [PAGE_BREAK] untuk membagi halaman.</div>
          </div>
        </div>

        {/* Preview Paper Area - Pro Backdrop */}
        <div ref={letterContainerRef} className="flex-1 glass-panel rounded-[4rem] overflow-y-auto p-16 flex flex-col items-center gap-16 print:p-0 print:m-0 print:bg-white print:block custom-scrollbar shadow-inner relative print:overflow-visible print:h-auto print:w-full border border-white/10">
           {contentParts.map((part, pIdx) => (
             <div key={pIdx} className="letter-paper bg-white shadow-2xl relative print:shadow-none flex flex-col text-black mb-20 print:mb-0 transition-transform origin-top print:transform-none" style={{ transform: `scale(${scale})` }}>
                {pIdx === 0 && (
                  <div className="mb-6 relative">
                    <div className="grid grid-cols-[32mm_1fr_32mm] items-center text-black pb-1">
                       <div className="flex justify-center items-center">
                         {config.logoDaerahUrl && <img src={config.logoDaerahUrl} className="h-[32mm] max-w-full object-contain" />}
                       </div>
                       <div className="text-center w-full px-4">
                          <h3 className="text-[14pt] uppercase font-bold leading-tight tracking-wide">{config.headerLine1}</h3>
                          <h3 className="text-[14pt] font-bold uppercase leading-tight tracking-wide">{config.headerLine2}</h3>
                          <h1 className="text-[18pt] font-black uppercase my-1 tracking-tight leading-none">{config.name}</h1>
                          <p className="text-[9pt] leading-tight font-medium mt-1">{config.address}</p>
                          <div className="flex justify-center items-center gap-2 text-[8pt] font-medium whitespace-nowrap">
                             <span>NPSN: {config.npsn}</span>
                             <span className="text-slate-400">|</span>
                             <span>Email: {config.email}</span>
                          </div>
                       </div>
                       <div className="flex justify-center items-center">
                         {config.logoUrl && <img src={config.logoUrl} className="h-[32mm] max-w-full object-contain" />}
                       </div>
                    </div>
                    <div className="border-b-[3.5pt] border-black w-full"></div>
                    <div className="border-b-[1pt] border-black w-full mt-[1.5pt]"></div>
                  </div>
                )}
                
                <div className="flex flex-col">
                   {pIdx === 0 && (
                     <>
                       {isOfficialLayout ? (
                         <div className="grid grid-cols-2 mb-8 text-[12pt] font-serif">
                            <div className="space-y-0.5">
                               <div className="flex"><span className="w-24 font-bold">Nomor</span><span className="w-4 text-center">:</span><span className="flex-1">{formData.refNumber}</span></div>
                               <div className="flex"><span className="w-24 font-bold">Lampiran</span><span className="w-4 text-center">:</span><span className="flex-1">{formData.attachment}</span></div>
                               <div className="flex"><span className="w-24 font-bold">Perihal</span><span className="w-4 text-center">:</span><span className="flex-1 font-bold underline leading-tight">{formData.subject}</span></div>
                            </div>
                            <div className="text-right">
                               <p className="font-medium">Kediri, {format(new Date(formData.date), 'dd MMMM yyyy', { locale: id })}</p>
                            </div>
                         </div>
                       ) : (
                         <div className="text-center mb-8 break-inside-avoid">
                           <h2 className="text-[13pt] font-bold uppercase underline underline-offset-4 decoration-2">{formData.subject}</h2>
                           <p className="text-[12pt] mt-1 font-bold uppercase">NOMOR: {formData.refNumber}</p>
                         </div>
                       )}
                     </>
                   )}
                   
                   <div className="naskah-content">
                     <SmartContentRenderer text={part} subject={formData.subject} />
                     
                     {pIdx === contentParts.length - 1 && (
                       <div className="mt-[1.5em] ml-auto w-[350px] flex flex-col text-center break-inside-avoid signature-block">
                          {!isOfficialLayout && <p className="mb-1 font-medium">Kediri, {format(new Date(formData.date), 'dd MMMM yyyy', { locale: id })}</p>}
                          <p className="font-bold text-[12pt]">{formData.signatureTitle}</p>
                          <div className="h-32 flex items-center justify-center my-1 relative">
                            {useQRCode && (
                              <div className="relative p-2 bg-white rounded-xl shadow-sm border border-slate-100 ring-1 ring-slate-50">
                                 <QRCodeSVG 
                                  value={qrValue} 
                                  size={85} 
                                  level="H" 
                                  imageSettings={{
                                      src: config.logoDaerahUrl,
                                      height: 18,
                                      width: 18,
                                      excavate: true,
                                  }}
                                  />
                              </div>
                            )}
                          </div>
                          <p className="font-bold underline uppercase text-[12pt] decoration-2">{formData.signerName}</p>
                          <p className="font-bold text-[11pt]">{formData.signerNip ? `NIP. ${formData.signerNip}` : ''}</p>
                       </div>
                     )}
                   </div>
                </div>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] pointer-events-none print:hidden opacity-50">
                   HALAMAN {pIdx + 1}
                </div>
             </div>
           ))}
        </div>
      </div>

      {/* Staff Picker Modal - Glass UI */}
      {showStaffPicker && (
         <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
           <div className="glass-card rounded-[4rem] w-full max-w-xl p-10 shadow-3xl flex flex-col h-[85vh] border border-white/20">
              <div className="flex justify-between items-center mb-10">
                 <div>
                    <h4 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Pilih Personil</h4>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1.5 opacity-70">Sisipkan data staff secara otomatis</p>
                 </div>
                 <button onClick={() => setShowStaffPicker(false)} className="p-4 glass-panel text-slate-400 rounded-3xl hover:bg-rose-500 hover:text-white transition-all shadow-lg border border-white/20"><X size={24}/></button>
              </div>
              <div className="relative mb-8 group">
                <Search size={22} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-within:text-premium-500 transition-colors" />
                <input type="text" placeholder="Cari personil berdasarkan nama atau NIP..." value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} className="w-full pl-16 pr-6 py-5 glass-input border-white/20 rounded-[1.75rem] outline-none focus:bg-white/80 transition-all font-bold text-sm shadow-inner" />
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-3">
                {staff.filter(s => s.name.toLowerCase().includes(staffSearch.toLowerCase()) || s.nip.includes(staffSearch)).map(member => (
                   <button key={member.id} onClick={() => handleSelectStaff(member)} className="w-full p-6 glass-panel rounded-[2rem] text-left hover:bg-premium-600 hover:text-white group/item border border-white/20 hover:border-premium-400 transition-all flex items-center justify-between shadow-sm hover:shadow-xl hover:-translate-y-1">
                    <div>
                       <p className="font-black text-base uppercase tracking-tight group-hover/item:text-white transition-colors">{member.name}</p>
                       <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 group-hover/item:text-white/70 transition-colors">NIP. {member.nip || '-'} • {member.rank || 'Staff'}</p>
                    </div>
                    <div className="p-3 bg-premium-50 text-premium-600 rounded-2xl group-hover/item:bg-white/20 group-hover/item:text-white transition-all">
                      <UserPlus size={20} />
                    </div>
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
          height: auto;
          padding: 1.7cm 2.33cm 0.49cm 2.33cm; /* Top Right Bottom Left */
          font-family: 'Times New Roman', Times, serif;
          font-size: 12pt;
          line-height: 1.0; /* Spasi 1.0 */
          box-sizing: border-box;
          position: relative;
          color: black;
          background-color: white;
        } 
        
        .letter-paper p {
          margin-top: 0;
          margin-bottom: 0;
        }
        
        .naskah-content {
          text-align: justify;
        }

        .break-inside-avoid {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

        @media print { 
          @page { 
            size: 215mm 330mm; 
            margin: 0; 
          }
          
          html, body {
            width: 215mm;
            height: 100%;
            margin: 0 !important;
            padding: 0 !important;
            background: white;
          }

          /* Hide everything by default is handled by print:hidden classes on parents */
          /* We just need to ensure the visible parts flow correctly */

          .letter-paper { 
            width: 215mm !important; 
            height: 330mm !important; 
            margin: 0 !important; 
            padding: 1.7cm 2.33cm 0.49cm 2.33cm !important; 
            page-break-after: always;
            break-after: page;
            transform: none !important;
            box-shadow: none !important;
            border: none !important;
            overflow: hidden !important;
            display: block !important;
            position: relative !important;
            left: auto !important;
            top: auto !important;
          }
          
          .letter-paper:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          /* Ensure proper text rendering */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LetterCreator;
