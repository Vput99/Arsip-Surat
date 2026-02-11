import React, { useState, useEffect, useRef } from 'react';
import { Printer, Loader2, FileText, Layout, UserPlus, Info, QrCode, Save, Users, Search, Check } from 'lucide-react';
import { subscribeToConfig, subscribeToTemplates, LetterTemplate, subscribeToStaff, StaffMember, saveMail } from '../services/storage';
import { SchoolConfig, MailType, MailStatus, UrgencyLevel, Mail } from '../types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { QRCodeSVG } from 'qrcode.react';
import { useLocation, useNavigate } from 'react-router-dom';

const SmartContentRenderer = ({ text }: { text: string }) => {
  const cleanText = (t: string) => {
    return t.replace(/\*\*/g, '').trim();
  };

  const lines = cleanText(text).split('\n');
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

    if (trimmed === '[PAGE_BREAK]') {
      flushTable();
      renderedBlocks.push(<div key={`pb-${index}`} className="page-breaker print:break-after-page h-0 my-1 relative border-t border-dashed border-slate-300 print:border-none print:my-0"></div>);
      return;
    }

    const columns = line.split(':');
    const hasColon = columns.length >= 2;
    const isNumberedData = /^\d+\./.test(trimmed);

    if (columns.length >= 3 || (isInTableMode && isNumberedData)) {
      isInTableMode = true;
      tableRows.push(columns);
      return;
    }

    flushTable();

    // Render Judul atau MEMERINTAHKAN :
    if (trimmed === trimmed.toUpperCase() && trimmed.length < 50 && !trimmed.includes(':')) {
      renderedBlocks.push(<div key={`title-${index}`} className="mt-6 mb-3 font-bold text-center text-black font-serif uppercase tracking-widest">{trimmed}</div>);
    } 
    // Render Field Label : Value (Dasar, Untuk, Nama, dll)
    else if (hasColon && !trimmed.startsWith('http')) {
      const label = columns[0].trim();
      const value = columns.slice(1).join(':').trim();
      renderedBlocks.push(
        <div key={`info-${index}`} className="flex mb-1.5 break-inside-avoid text-[11pt] font-serif text-black leading-relaxed">
          <span className="w-[110px] shrink-0 font-bold">{label}</span>
          <span className="w-[20px] text-center shrink-0">:</span>
          <span className="flex-1 text-justify">{value}</span>
        </div>
      );
    } 
    // Render Poin Berurutan (1. ... 2. ...)
    else if (isNumberedData) {
      const match = trimmed.match(/^(\d+\.)\s+(.*)/);
      renderedBlocks.push(
        <div key={`list-${index}`} className="flex mb-1.5 pl-[130px] font-serif text-[11pt] text-black leading-relaxed">
          <span className="w-8 shrink-0">{match ? match[1] : ''}</span>
          <span className="flex-1 text-justify">{match ? match[2] : trimmed}</span>
        </div>
      );
    }
    // Render Paragraf Biasa
    else {
      renderedBlocks.push(<p key={`p-${index}`} className="mb-4 text-justify font-serif text-[11pt] text-black leading-[1.6] indent-10">{trimmed}</p>);
    }
  });
  
  flushTable();
  return <div className="font-serif text-black leading-relaxed">{renderedBlocks}</div>;
};

const LetterCreator: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplate | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showStaffPicker, setShowStaffPicker] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
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
    subject: 'SURAT PERINTAH TUGAS',
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

    const unsubscribeStaff = subscribeToStaff(setStaff);

    const unsubscribeTemplates = subscribeToTemplates((data) => {
      setTemplates(data);
      
      if (location.state && location.state.templateId) {
        const targetTemplate = data.find(t => t.id === location.state.templateId);
        if (targetTemplate) {
          setSelectedTemplate(targetTemplate);
          // Paksa judul jadi SURAT PERINTAH TUGAS jika template SPT
          const isSPT = targetTemplate.id === 't_spt' || targetTemplate.name.includes('SPT');
          setFormData(prev => ({
            ...prev,
            subject: isSPT ? 'SURAT PERINTAH TUGAS' : (location.state.subject || targetTemplate.subject),
            content: (location.state.content || targetTemplate.content).replace(/\*\*/g, ''),
            signatureTitle: targetTemplate.category === 'Tugas' ? 'Kepala Sekolah,' : 'Kepala Sekolah'
          }));
        }
      } else if (data.length > 0 && !isInitialized.current.templates) {
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

    return () => { unsubscribeConfig(); unsubscribeTemplates(); unsubscribeStaff(); };
  }, [location.state]);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const template = templates.find(t => t.id === e.target.value);
    if (template) {
      setSelectedTemplate(template);
      const isSPT = template.id === 't_spt' || template.name.includes('SPT');
      setFormData(prev => ({ 
        ...prev, 
        subject: isSPT ? 'SURAT PERINTAH TUGAS' : template.subject, 
        content: template.content.replace(/\*\*/g, ''), 
        signatureTitle: template.category === 'Tugas' ? 'Kepala Sekolah,' : 'Kepala Sekolah' 
      }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectStaff = (member: StaffMember) => {
    setFormData(prev => {
      let newContent = prev.content;
      if (newContent.includes('[NAMA_PETUGAS]')) {
        newContent = newContent.replace('[NAMA_PETUGAS]', member.name);
        newContent = newContent.replace('[NIP_PETUGAS]', member.nip ? `NIP. ${member.nip}` : '-');
        newContent = newContent.replace('[JABATAN_PETUGAS]', member.rank || '-');
      } else {
        newContent += `\nNama : ${member.name}\nNIP : ${member.nip || '-'}\nJabatan : ${member.rank || '-'}\n`;
      }
      return { ...prev, content: newContent };
    });
    setShowStaffPicker(false);
  };

  const handleSaveToOutbox = async () => {
    if (!confirm('Simpan naskah ini ke database Surat Keluar?')) return;
    setSaveLoading(true);
    try {
      const newMail: Mail = {
        id: Date.now().toString(),
        type: MailType.OUTGOING,
        referenceNumber: formData.refNumber,
        date: formData.date,
        receivedDate: formData.date,
        createdAt: new Date().toISOString(),
        sender: formData.recipient || 'Internal / Dinas',
        subject: formData.subject,
        description: formData.content.split('\n').slice(0, 3).join(' '),
        category: selectedTemplate?.category || 'Lainnya',
        urgency: UrgencyLevel.LOW,
        status: MailStatus.ARCHIVED,
        aiSummary: `Dokumen digital dibuat dari template: ${selectedTemplate?.name}`
      };
      await saveMail(newMail);
      alert('Surat berhasil disimpan ke arsip Surat Keluar.');
      navigate('/outbox');
    } catch (e) {
      alert('Gagal menyimpan ke arsip.');
    } finally {
      setSaveLoading(false);
    }
  };

  if (!config || templates.length === 0) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-indigo-600"/></div>;

  const isMOU = selectedTemplate?.category === 'Kerjasama';
  const isCenteredLayout = selectedTemplate?.layout === 'centered';
  const contentParts = formData.content.split('[PAGE_BREAK]');
  const qrValue = `DOKUMEN SAH SDN ${config.name.toUpperCase()}\nNomor: ${formData.refNumber}\nPejabat: ${formData.signerName}\nTanggal: ${formData.date}`;

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-6 animate-fade-in text-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200"><FileText size={20} /></div>
          <div>
            <h2 className="text-xl font-black text-slate-800">Editor Surat Digital</h2>
            <p className="text-slate-500 text-xs font-medium">Buat naskah dinas resmi dan arsipkan otomatis.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSaveToOutbox} disabled={saveLoading} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/30 font-bold text-sm flex items-center gap-2">
            {saveLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Simpan Arsip
          </button>
          <button onClick={() => window.print()} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 font-bold text-sm flex items-center gap-2">
            <Printer size={18} /> Cetak / PDF
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
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
                  <input name="subject" value={formData.subject} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold uppercase" />
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
             </div>

             <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanda Tangan</label>
                  <button onClick={() => setUseQRCode(!useQRCode)} className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${useQRCode ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <QrCode size={14} /> {useQRCode ? 'QR Aktif' : 'QR Mati'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input name="signerName" value={formData.signerName} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                  <input name="signerNip" value={formData.signerNip} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                </div>
             </div>
          </div>
          
          <div className="bg-white p-5 rounded-3xl border border-slate-200 flex-1 flex flex-col min-h-[350px] shadow-sm relative">
             <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Isi Naskah</label>
                <div className="flex gap-2">
                  <button onClick={() => setShowStaffPicker(true)} className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg border border-emerald-100 flex items-center gap-1.5 hover:bg-emerald-100 transition-all"><Users size={12} /> Pilih Petugas</button>
                </div>
             </div>
             <textarea name="content" value={formData.content} onChange={handleInputChange} className="w-full flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-mono text-[11px] leading-relaxed resize-none focus:ring-2 focus:ring-indigo-500 transition-all" />
          </div>
        </div>

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
                     <div className="text-center mb-8">
                       <h2 className="text-[13pt] font-bold uppercase underline underline-offset-4 decoration-2 tracking-wide leading-tight">{formData.subject}</h2>
                       <p className="text-[11pt] mt-1 font-bold">Nomor: {formData.refNumber}</p>
                     </div>
                   )}
                   
                   <div className="flex-1"><SmartContentRenderer text={part} /></div>

                   {pIdx === contentParts.length - 1 && (
                     <div className="mt-10 break-inside-avoid ml-auto w-[320px] flex flex-col items-center text-center">
                        <p className="mb-1">Kediri, {format(new Date(formData.date), 'dd MMMM yyyy', { locale: id })}</p>
                        <p className="font-bold">{formData.signatureTitle}</p>
                        <div className="h-28 flex items-center justify-center">
                          {useQRCode && <QRCodeSVG value={qrValue} size={85} level="H" />}
                        </div>
                        <p className="font-bold underline underline-offset-4 decoration-2 uppercase tracking-wide">{formData.signerName}</p>
                        <p className="font-bold">{formData.signerNip ? `NIP. ${formData.signerNip}` : ''}</p>
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
                 <button onClick={() => setShowStaffPicker(false)} className="text-slate-400 hover:text-rose-500 font-bold uppercase text-xs">Tutup</button>
              </div>
              <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Cari nama..." value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {staff.filter(s => s.name.toLowerCase().includes(staffSearch.toLowerCase())).map(member => (
                  <button key={member.id} onClick={() => handleSelectStaff(member)} className="w-full p-4 bg-slate-50 rounded-xl text-left hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100 group">
                    <p className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{member.name}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">{member.rank}</p>
                  </button>
                ))}
              </div>
           </div>
         </div>
      )}
      
      <style>{`.letter-paper { padding: 5mm 20mm 20mm 30mm; min-height: 297mm; } @media print { @page { size: 215mm 330mm portrait; margin: 0; } body * { visibility: hidden; } .letter-paper, .letter-paper * { visibility: visible !important; } .letter-paper { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; height: 330mm !important; margin: 0 !important; padding: 5mm 20mm 20mm 30mm !important; display: block !important; } }`}</style>
    </div>
  );
};

export default LetterCreator;