import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, query, where } from 'firebase/firestore';
import { ClipboardCheck, Plus, Calendar, AlertCircle, CheckCircle2, ArrowDownRight } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { translations } from '../../../utils/translations/merchantTranslations';

type Language = 'ar' | 'fr' | 'en';

interface StockTakeProps { lang?: Language; }
interface InventoryItem { id: string; name?: string; itemName?: string; quantity?: number; currentQuantity?: number; unit?: string; restaurantId?: string; }
interface StockTakeRecord { id: string; itemName: string; systemQty: number; actualQty: number; difference: number; unit: string; status: string; date: string; restaurantId?: string; }

export const StockTake: React.FC<StockTakeProps> = (props) => {
  const outletContext = useOutletContext<{ lang: Language }>() || {};
  const lang = props.lang || outletContext.lang || 'ar';
  const t = translations[lang].stockTake;
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [records, setRecords] = useState<StockTakeRecord[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [actualQty, setActualQty] = useState<number>(0);

  useEffect(() => {
    const restaurantId = localStorage.getItem('restaurantId');
    if (!restaurantId) return;
    const q = query(collection(db, 'inventory'), where('restaurantId', '==', restaurantId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setInventoryItems(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as InventoryItem)));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const restaurantId = localStorage.getItem('restaurantId');
    if (!restaurantId) return;
    const localeMap: Record<Language, string> = { ar: 'ar-DZ', fr: 'fr-FR', en: 'en-US' };
    const q = query(collection(db, 'stock_take'), where('restaurantId', '==', restaurantId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: StockTakeRecord[] = snapshot.docs.map(docSnap => {
        const docData = docSnap.data();
        const rawCreatedAt = docData.createdAt;
        const dateObj = rawCreatedAt && typeof rawCreatedAt === 'object' && 'toDate' in rawCreatedAt && typeof rawCreatedAt.toDate === 'function'
          ? rawCreatedAt.toDate() as Date
          : new Date();
        return {
          id: docSnap.id,
          itemName: typeof docData.itemName === 'string' ? docData.itemName : '—',
          systemQty: Number(docData.systemQty) || 0,
          actualQty: Number(docData.actualQty) || 0,
          difference: Number(docData.difference) || 0,
          unit: typeof docData.unit === 'string' ? docData.unit : 'كجم',
          status: typeof docData.status === 'string' ? docData.status : '',
          restaurantId: typeof docData.restaurantId === 'string' ? docData.restaurantId : undefined,
          date: dateObj.toLocaleDateString(localeMap[lang]),
        };
      });
      setRecords(data);
    });
    return () => unsubscribe();
  }, [lang]);

  const handleAddStockTake = async (e: React.FormEvent) => {
    e.preventDefault();
    const restaurantId = localStorage.getItem('restaurantId');
    if (!restaurantId) { alert("خطأ: لم يتم العثور على معرف المطعم."); return; }
    const selectedItem = inventoryItems.find(item => item.id === selectedItemId);
    if (!selectedItem) return;
    const itemName = selectedItem.itemName || selectedItem.name || '—';
    const systemQty = selectedItem.currentQuantity ?? selectedItem.quantity ?? 0;
    const difference = actualQty - systemQty;
    let status = t.statuses.normal;
    if (difference < 0) status = t.statuses.deficit;
    if (difference > 0) status = t.statuses.surplus;
    await addDoc(collection(db, 'stock_take'), { restaurantId, itemName, systemQty, actualQty, difference, unit: selectedItem.unit || 'كجم', status, createdAt: serverTimestamp() });
    const inventoryRef = doc(db, 'inventory', selectedItem.id);
    await updateDoc(inventoryRef, { currentQuantity: Number(actualQty), quantity: Number(actualQty), updatedAt: serverTimestamp() });
    setSelectedItemId(''); setActualQty(0); setShowAddModal(false);
  };

  return (
    <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold text-slate-800">{t.title}</h1><p className="text-sm text-slate-500">{t.subtitle}</p></div><button onClick={() => setShowAddModal(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition shadow-md text-sm"><Plus size={18} /><span>{t.startStockTakeBtn}</span></button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between"><div><p className="text-xs text-slate-400 font-bold">{t.deficitOperationsStats}</p><p className="text-2xl font-bold text-red-600 mt-1">{records.filter(r => r.status === t.statuses.deficit || r.status === 'عجز في المخزن').length} {t.operationsUnit}</p></div><span className="p-3 bg-red-50 text-red-500 rounded-xl"><ArrowDownRight size={20} /></span></div><div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between"><div><p className="text-xs text-slate-400 font-bold">{t.successfulMatchingStats}</p><p className="text-2xl font-bold text-green-600 mt-1">{records.filter(r => r.status === t.statuses.normal || r.status === 'طبيعي').length} {t.operationsUnit}</p></div><span className="p-3 bg-green-50 text-green-500 rounded-xl"><CheckCircle2 size={20} /></span></div></div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"><table className={`w-full border-collapse ${lang === 'ar' ? 'text-right' : 'text-left'}`}><thead><tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm"><th className="p-4">{t.tableItemName}</th><th className="p-4">{t.tableSystemQty}</th><th className="p-4">{t.tableActualQty}</th><th className="p-4">{t.tableDifference}</th><th className="p-4">{t.tableDate}</th><th className="p-4">{t.tableStatus}</th></tr></thead><tbody className="text-slate-700 text-sm divide-y divide-slate-100">{records.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">{t.emptyState}</td></tr> : records.map(record => <tr key={record.id} className="hover:bg-slate-50/50 transition"><td className="p-4 font-bold text-slate-800 flex items-center gap-2"><ClipboardCheck size={16} className="text-indigo-500 shrink-0" /><span>{record.itemName}</span></td><td className="p-4 text-slate-500">{record.systemQty} {record.unit}</td><td className="p-4 font-semibold text-slate-800">{record.actualQty} {record.unit}</td><td className={`p-4 font-bold ${record.difference < 0 ? 'text-red-600' : record.difference > 0 ? 'text-blue-600' : 'text-green-600'}`}>{record.difference > 0 ? `+${record.difference}` : record.difference} {record.unit}</td><td className="p-4 text-slate-400 border-none"><span className="flex items-center gap-1.5"><Calendar size={13} className="shrink-0" /><span>{record.date}</span></span></td><td className="p-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${record.status === t.statuses.normal || record.status === 'طبيعي' ? 'bg-green-50 text-green-700' : record.status === t.statuses.surplus || record.status === 'فائض' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>{record.status}</span></td></tr>)}</tbody></table></div>
      {showAddModal && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><form onSubmit={handleAddStockTake} className="bg-white p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}><h3 className="font-bold text-lg border-b pb-2 text-slate-800">{t.modalTitle}</h3><div><label className="block text-xs font-semibold text-slate-500 mb-1">{t.modalItemLabel}</label><select required value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm"><option value="">{t.selectPlaceholder}</option>{inventoryItems.map(item => { const name = item.itemName || item.name || '—'; const qty = item.currentQuantity ?? item.quantity ?? 0; return <option key={item.id} value={item.id}>{name} ({t.currentRegisteredHint} {qty} {item.unit || 'كجم'})</option>; })}</select></div><div><label className="block text-xs font-semibold text-slate-500 mb-1">{t.modalActualQtyLabel}</label><input type="number" required value={actualQty} onChange={(e) => setActualQty(Number(e.target.value))} className="w-full p-2.5 border rounded-xl text-sm" placeholder={t.modalActualQtyPlaceholder} /></div><div className="bg-amber-50 p-3 rounded-xl flex gap-2 text-amber-800 text-xs leading-relaxed"><AlertCircle size={16} className="shrink-0 mt-0.5" /><p>{t.modalInfoNote}</p></div><div className="flex gap-3 pt-2"><button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-xl transition text-sm">{t.confirmBtn}</button><button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl transition text-sm">{t.cancelBtn}</button></div></form></div>}
    </div>
  );
};