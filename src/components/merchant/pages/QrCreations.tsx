import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Plus, Trash2, Smartphone, QrCode, CheckCircle, Loader2, Edit3, FileDown, Copy } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type Language = 'ar' | 'fr' | 'en';

interface TableItem {
  id: string;
  name: string;
  status: 'active' | 'reserved' | 'maintenance';
}

export const QrCreations: React.FC = () => {
  const outletContext = useOutletContext<{ lang: Language }>();
  const currentLang = outletContext?.lang || 'ar';
  
  const [tables, setTables] = useState<TableItem[]>([
    { id: '1', name: 'طاولة 1', status: 'active' },
    { id: '2', name: 'طاولة 2', status: 'active' },
    { id: '3', name: 'طاولة 3', status: 'active' },
    { id: '4', name: 'طاولة 4', status: 'active' },
    { id: '5', name: 'VIP', status: 'active' },
  ]);
  const [includeDelivery, setIncludeDelivery] = useState<boolean>(true);
  const [restaurantName, setRestaurantName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const restaurantId = localStorage.getItem('restaurantId') || 'default_restaurant';
  const baseUrl = window.location.origin;

  const t = {
    ar: {
      title: 'إدارة وتوليد الـ QR Codes', subtitle: 'تخصيص أسماء وحالات الطاولات وتوليد أكواد الـ QR الخاصة بها مع دعم الطباعة وملفات PDF', save: 'حفظ التعديلات', saving: 'جاري الحفظ...', saved: 'تم الحفظ بنجاح', downloadPdf: 'تحميل PDF', printQrs: 'طباعة الأكواد', customizeTables: 'تخصيص الطاولات والحالات', addTable: 'إضافة طاولة جديدة', active: 'نشطة', reserved: 'محجوزة', maintenance: 'صيانة', deliveryLabel: 'تفعيل وتوليد كود الـ QR الخاص بخدمة التوصيل الخارجي (Delivery)', previewTitle: 'معاينة الأكواد الجاهزة للطباعة والتصدير:', scanToOrder: 'امسح الكود للطلب المباشر', deliveryTitle: 'طلبات التوصيل الخارجي', deliveryCardName: 'خدمة التوصيل (Delivery)', loadingText: 'جاري تحميل إعدادات الطاولات والأكواد...', copyLink: 'نسخ الرابط', copied: 'تم النسخ!'
    },
    fr: {
      title: 'Gestion et Génération des Codes QR', subtitle: 'Personnaliser les noms et états des tables et générer leurs codes QR avec support d\'impression et PDF', save: 'Enregistrer', saving: 'Enregistrement...', saved: 'Enregistré avec succès', downloadPdf: 'Télécharger PDF', printQrs: 'Imprimer les QR', customizeTables: 'Personnaliser les tables et statuts', addTable: 'Ajouter une table', active: 'Actif', reserved: 'Réservé', maintenance: 'Maintenance', deliveryLabel: 'Activer et générer le code QR pour la livraison externe (Delivery)', previewTitle: 'Aperçu des codes prêts pour l\'impression et l\'exportation:', scanToOrder: 'Scannez pour commander directement', deliveryTitle: 'Commandes de livraison externe', deliveryCardName: 'Service de Livraison (Delivery)', loadingText: 'Chargement des paramètres des tables...', copyLink: 'Copier le lien', copied: 'Copié !'
    },
    en: {
      title: 'QR Codes Management & Generation', subtitle: 'Customize table names and statuses and generate QR codes with print and PDF support', save: 'Save Changes', saving: 'Saving...', saved: 'Saved Successfully', downloadPdf: 'Download PDF', printQrs: 'Print QR Codes', customizeTables: 'Customize Tables & Statuses', addTable: 'Add New Table', active: 'Active', reserved: 'Reserved', maintenance: 'Maintenance', deliveryLabel: 'Enable and generate QR code for external delivery service', previewTitle: 'Preview of ready-to-print and export QR codes:', scanToOrder: 'Scan code for direct ordering', deliveryTitle: 'External Delivery Orders', deliveryCardName: 'Delivery Service', loadingText: 'Loading table settings and QR codes...', copyLink: 'Copy Link', copied: 'Copied!'
    }
  }[currentLang];

  useEffect(() => {
    const fetchRestaurantData = async () => {
      try {
        setLoading(true);
        const settingsDoc = await getDoc(doc(db, 'settings', restaurantId));
        if (settingsDoc.exists()) setRestaurantName(settingsDoc.data().restaurantName || 'مطعمنا');
        const qrDoc = await getDoc(doc(db, 'restaurant_qr_config', restaurantId));
        if (qrDoc.exists()) {
          const qrData = qrDoc.data();
          if (qrData.tables && Array.isArray(qrData.tables)) setTables(qrData.tables);
          setIncludeDelivery(qrData.includeDelivery ?? true);
        }
      } catch (error) {
        console.error("خطأ في جلب بيانات الأكواد:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurantData();
  }, [restaurantId]);

  const handleAddTable = () => {
    const newTable: TableItem = { id: Date.now().toString(), name: `طاولة ${tables.length + 1}`, status: 'active' };
    setTables([...tables, newTable]);
  };
  const handleRemoveTable = (id: string) => setTables(tables.filter(t => t.id !== id));
  const handleUpdateTable = (id: string, field: keyof TableItem, value: string) => setTables(tables.map(t => t.id === id ? { ...t, [field]: value } : t));
  const handleCopyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };
  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      await setDoc(doc(db, 'restaurant_qr_config', restaurantId), { restaurantId, tables, includeDelivery, updatedAt: new Date() }, { merge: true });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (error) {
      console.error("خطأ أثناء الحفظ:", error);
    } finally {
      setSaving(false);
    }
  };
  const printQRs = () => window.print();
  const generatePDF = async () => {
    if (!printRef.current) return;
    try {
      setIsGeneratingPdf(true);
      const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
      pdf.save(`QR-Codes-${restaurantName || 'Restaurant'}.pdf`);
    } catch (error) {
      console.error("خطأ أثناء توليد الـ PDF:", error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };
  if (loading) return <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3 text-slate-500"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /><p className="text-sm font-medium">{t.loadingText}</p></div>;

  return (
    <div className="space-y-6" dir={currentLang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div><h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><QrCode className="text-amber-500" /> {t.title}</h1><p className="text-sm text-slate-500">{t.subtitle}</p></div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {savedSuccess && <span className="text-emerald-600 text-xs font-bold flex items-center gap-1 animate-pulse"><CheckCircle size={16} /> {t.saved}</span>}
          <button type="button" onClick={handleSaveConfig} disabled={saving} className="flex-1 md:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition text-sm cursor-pointer">{saving ? t.saving : t.save}</button>
          <button type="button" onClick={generatePDF} disabled={isGeneratingPdf} className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition shadow-md text-sm cursor-pointer">{isGeneratingPdf ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}<span>{t.downloadPdf}</span></button>
          <button type="button" onClick={printQRs} className="flex-1 md:flex-none bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition shadow-md text-sm cursor-pointer"><Printer size={18} /><span>{t.printQrs}</span></button>
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm no-print space-y-4">
        <div className="flex justify-between items-center border-b pb-3"><h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Edit3 size={16} className="text-amber-500" /> {t.customizeTables}</h3><button type="button" onClick={handleAddTable} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition"><Plus size={14} /> {t.addTable}</button></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-60 overflow-y-auto p-1">
          {tables.map((table) => <div key={table.id} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200"><input type="text" value={table.name} onChange={(e) => handleUpdateTable(table.id, 'name', e.target.value)} className="w-full bg-white px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-amber-500" placeholder="اسم الطاولة" /><select value={table.status} onChange={(e) => handleUpdateTable(table.id, 'status', e.target.value as TableItem['status'])} className="bg-white px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600"><option value="active">{t.active}</option><option value="reserved">{t.reserved}</option><option value="maintenance">{t.maintenance}</option></select><button type="button" onClick={() => handleRemoveTable(table.id)} className="text-red-500 hover:text-red-700 p-1 transition" title="حذف"><Trash2 size={16} /></button></div>)}
        </div>
        <div className="pt-3 border-t"><label className="flex items-center gap-3 cursor-pointer w-fit"><input type="checkbox" checked={includeDelivery} onChange={(e) => setIncludeDelivery(e.target.checked)} className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400" /><span className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Smartphone size={14} className="text-blue-500" /> {t.deliveryLabel}</span></label></div>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 no-print text-sm">{t.previewTitle}</h3>
        <div ref={printRef} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 print-grid bg-white p-2">
          {tables.map((table) => {
            const menuLink = `${baseUrl}/menu?restaurantId=${restaurantId}&table=${encodeURIComponent(table.name)}`;
            return <div key={table.id} className="qr-card relative bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm flex flex-col items-center text-center justify-between hover:border-amber-200 transition"><div className="absolute top-2 left-2 flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${table.status === 'active' ? 'bg-emerald-500' : table.status === 'reserved' ? 'bg-amber-500' : 'bg-red-500'}`} title={table.status}></span><span className="bg-slate-100 text-slate-600 font-mono text-[10px] px-1.5 py-0.5 rounded-md font-bold">{table.name}</span></div><div className="mb-1 pt-2"><h4 className="font-extrabold text-slate-900 text-sm">{restaurantName || 'المطعم'}</h4><p className="text-[10px] text-slate-400">{t.scanToOrder}</p></div><div className="p-2 bg-white rounded-xl border border-slate-100 my-1"><QRCodeSVG value={menuLink} size={110} level="M" /></div><div className="w-full mt-2 no-print"><div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200"><input type="text" readOnly value={menuLink} className="w-full bg-transparent text-[9px] text-slate-600 px-1 focus:outline-none select-all" /><button type="button" onClick={() => handleCopyLink(menuLink, table.id)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded text-[9px] font-bold flex items-center gap-1 transition" title={t.copyLink}>{copiedLink === table.id ? <CheckCircle size={10} className="text-emerald-600" /> : <Copy size={10} />}<span>{copiedLink === table.id ? t.copied : ''}</span></button></div></div><div className="mt-2 bg-amber-50 text-amber-900 w-full py-1.5 rounded-xl font-extrabold text-xs">{table.name}</div></div>;
          })}
          {includeDelivery && (() => { const deliveryLink = `${baseUrl}/menu?restaurantId=${restaurantId}&type=delivery`; return <div className="qr-card relative bg-white p-4 rounded-2xl border-2 border-blue-100 shadow-sm flex flex-col items-center text-center justify-between hover:border-blue-200 transition"><span className="absolute top-2 left-2 bg-blue-50 text-blue-600 font-mono text-[10px] px-2 py-0.5 rounded-md font-bold">Delivery</span><div className="mb-1 pt-2"><h4 className="font-extrabold text-slate-900 text-sm">{restaurantName || 'المطعم'}</h4><p className="text-[10px] text-blue-500 font-medium">{t.deliveryTitle}</p></div><div className="p-2 bg-white rounded-xl border border-blue-50 my-1"><QRCodeSVG value={deliveryLink} size={110} level="M" /></div><div className="w-full mt-2 no-print"><div className="flex items-center gap-1 bg-blue-50/50 p-1 rounded-lg border border-blue-100"><input type="text" readOnly value={deliveryLink} className="w-full bg-transparent text-[9px] text-slate-600 px-1 focus:outline-none select-all" /><button type="button" onClick={() => handleCopyLink(deliveryLink, 'delivery')} className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded text-[9px] font-bold flex items-center gap-1 transition" title={t.copyLink}>{copiedLink === 'delivery' ? <CheckCircle size={10} className="text-emerald-600" /> : <Copy size={10} />}<span>{copiedLink === 'delivery' ? t.copied : ''}</span></button></div></div><div className="mt-2 bg-blue-50 text-blue-900 w-full py-1.5 rounded-xl font-extrabold text-xs">{t.deliveryCardName}</div></div>; })()}
        </div>
      </div>
      <style>{`@media print { body { background: white !important; } .no-print { display: none !important; } .print-grid { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 15px !important; width: 100% !important; } .qr-card { break-inside: avoid; page-break-inside: avoid; border: 1px solid #cbd5e1 !important; box-shadow: none !important; margin-bottom: 10px; } }`}</style>
    </div>
  );
};
