import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, where, query } from 'firebase/firestore';
import { Plus, Trash2, Edit3, AlertTriangle, CheckCircle } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { translations } from '../../../utils/translations/merchantTranslations';

type Language = 'ar' | 'fr' | 'en';
interface InventoryProps { lang?: Language; }
interface InventoryItem { id: string; name?: string; itemName?: string; quantity?: number; currentQuantity?: number; unit?: string; minRequired?: number; minQuantity?: number; minOrderQuantity?: number; category?: string; restaurantId?: string; createdAt?: unknown; updatedAt?: unknown; }

export const Inventory: React.FC<InventoryProps> = (props) => {
  const outletContext = useOutletContext<{ lang: Language }>() || {};
  const lang = props.lang || outletContext.lang || 'ar';
  const t = translations[lang].inventory;
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', quantity: 0, unit: 'كجم', minRequired: 5 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const restaurantId = localStorage.getItem('restaurantId') || 'default_restaurant';

  useEffect(() => {
    const q = query(collection(db, 'restaurants', restaurantId, 'inventory'));
    const unsubscribe = onSnapshot(q, snapshot => setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem))));
    return () => unsubscribe();
  }, [restaurantId]);

  const handleMergeDuplicates = async () => {
    if (!window.confirm('هل أنت تأكد من رغبتك في دمج وتنظيف كافة المواد المكررة في المخزن؟')) return;
    try {
      const groupedMap: Record<string, InventoryItem[]> = {};
      items.forEach(item => { const rawName = (item.itemName || item.name || '').trim().toLowerCase(); if (rawName) (groupedMap[rawName] ||= []).push(item); });
      for (const normalizedName in groupedMap) {
        const duplicates = groupedMap[normalizedName];
        if (duplicates.length <= 1) continue;
        const mainItem = duplicates[0];
        let totalQty = 0; let maxMinReq = 0;
        duplicates.forEach(dup => { totalQty += dup.currentQuantity ?? dup.quantity ?? 0; maxMinReq = Math.max(maxMinReq, dup.minQuantity ?? dup.minOrderQuantity ?? dup.minRequired ?? 0); });
        await updateDoc(doc(db, 'restaurants', restaurantId, 'inventory', mainItem.id), { currentQuantity: Number(totalQty.toFixed(2)), quantity: Number(totalQty.toFixed(2)), minQuantity: maxMinReq, minOrderQuantity: maxMinReq, minRequired: maxMinReq, updatedAt: serverTimestamp() });
        for (let i = 1; i < duplicates.length; i++) await deleteDoc(doc(db, 'restaurants', restaurantId, 'inventory', duplicates[i].id));
      }
      alert('تم دمج العناصر المكررة بنجاح وتنظيف المخزن!');
    } catch (error) { console.error('خطأ أثناء دمج المكررات:', error); alert('حدث خطأ أثناء عملية الدمج.'); }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newItem.name) return;
    await addDoc(collection(db, 'restaurants', restaurantId, 'inventory'), { restaurantId, itemName: newItem.name, name: newItem.name, currentQuantity: Number(newItem.quantity || 0), quantity: Number(newItem.quantity || 0), unit: newItem.unit || 'كجم', minRequired: Number(newItem.minRequired || 0), createdAt: serverTimestamp() });
    setNewItem({ name: '', quantity: 0, unit: 'كجم', minRequired: 5 }); setShowAddModal(false);
  };

  const handleUpdateQuantity = async (id: string) => { await updateDoc(doc(db, 'restaurants', restaurantId, 'inventory', id), { quantity: Number(editQty), currentQuantity: Number(editQty), updatedAt: serverTimestamp() }); setEditingId(null); };
  const handleDeleteItem = async (id: string) => { if (window.confirm(t.deleteConfirm)) await deleteDoc(doc(db, 'restaurants', restaurantId, 'inventory', id)); };

  return (
    <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold text-slate-800">{t.title}</h1><p className="text-sm text-slate-500">{t.subtitle}</p></div><div className="flex items-center gap-3"><button onClick={handleMergeDuplicates} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition text-sm border border-indigo-200"><span>🧹</span><span>تنظيف وتجميع المكررات</span></button><button onClick={() => setShowAddModal(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition shadow-md text-sm"><Plus size={18}/><span>{t.addNewButton}</span></button></div></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between"><div><p className="text-xs text-slate-400">{t.totalItemsStats}</p><p className="text-2xl font-bold text-slate-800 mt-1">{items.length}</p></div><span className="p-3 bg-indigo-50 text-indigo-500 rounded-xl">📦</span></div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between"><div><p className="text-xs text-slate-400">{t.lowStockStats}</p><p className="text-2xl font-bold text-red-600 mt-1">{items.filter(i => (i.currentQuantity ?? i.quantity ?? 0) <= (i.minQuantity ?? i.minOrderQuantity ?? i.minRequired ?? 0)).length}</p></div><span className="p-3 bg-red-50 text-red-500 rounded-xl"><AlertTriangle size={20}/></span></div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between"><div><p className="text-xs text-slate-400">{t.safeStockStats}</p><p className="text-2xl font-bold text-green-600 mt-1">{items.filter(i => (i.currentQuantity ?? i.quantity ?? 0) > (i.minQuantity ?? i.minOrderQuantity ?? i.minRequired ?? 0)).length}</p></div><span className="p-3 bg-green-50 text-green-500 rounded-xl"><CheckCircle size={20}/></span></div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"><table className={`w-full border-collapse ${lang === 'ar' ? 'text-right' : 'text-left'}`}><thead><tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm"><th className="p-4">{t.tableRawMaterial}</th><th className="p-4">{t.tableCurrentQty}</th><th className="p-4">{t.tableMinRequired}</th><th className="p-4">{t.tableStatus}</th><th className="p-4 text-center">{t.tableActions}</th></tr></thead><tbody className="text-slate-700 text-sm divide-y divide-slate-100">{items.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">{t.emptyState}</td></tr> : items.map(item => { const displayName = item.itemName || item.name || t.unnamedItem; const currentQty = item.currentQuantity ?? item.quantity ?? 0; const minReq = item.minQuantity ?? item.minOrderQuantity ?? item.minRequired ?? 0; const displayUnit = item.unit || 'كجم'; const isLow = currentQty <= minReq; return <tr key={item.id} className="hover:bg-slate-50/50 transition"><td className="p-4 font-bold text-slate-800">{displayName}</td><td className="p-4">{editingId === item.id ? <div className="flex items-center gap-2"><input type="number" value={editQty} onChange={e => setEditQty(Number(e.target.value))} className="w-20 p-1 border rounded text-sm bg-white"/><button onClick={() => handleUpdateQuantity(item.id)} className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 text-xs font-bold">✓</button></div> : <div className="flex items-center gap-2"><span className="font-bold text-slate-800">{Number(currentQty.toFixed(2))} {displayUnit}</span><button onClick={() => { setEditingId(item.id); setEditQty(currentQty); }} className="text-slate-400 hover:text-indigo-600 transition"><Edit3 size={14}/></button></div>}</td><td className="p-4 text-slate-600">{minReq} {displayUnit}</td><td className="p-4">{isLow ? <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-full text-xs font-semibold">{t.criticalStatus}</span> : <span className="bg-green-50 text-green-600 px-2.5 py-1 rounded-full text-xs font-semibold">{t.safeStatus}</span>}</td><td className="p-4 text-center"><button onClick={() => handleDeleteItem(item.id)} className="text-red-400 hover:text-red-600 transition"><Trash2 size={16}/></button></td></tr>; })}</tbody></table></div>
      {showAddModal && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn"><form onSubmit={handleAddItem} className="bg-white p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}><h3 className="font-bold text-lg border-b pb-2 text-slate-800">{t.modalTitle}</h3><div><label className="block text-xs font-semibold text-slate-500 mb-1">{t.modalNameLabel}</label><input type="text" required value={newItem.name} onChange={e => setNewItem({...newItem,name:e.target.value})} placeholder={t.modalNamePlaceholder} className="w-full p-2.5 border rounded-xl text-sm"/></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-slate-500 mb-1">{t.modalQtyLabel}</label><input type="number" required value={newItem.quantity} onChange={e => setNewItem({...newItem,quantity:Number(e.target.value)})} className="w-full p-2.5 border rounded-xl text-sm"/></div><div><label className="block text-xs font-semibold text-slate-500 mb-1">{t.modalUnitLabel}</label><select value={newItem.unit} onChange={e => setNewItem({...newItem,unit:e.target.value})} className="w-full p-2.5 border rounded-xl text-sm"><option value="كجم">{t.units.kg}</option><option value="لتر">{t.units.liter}</option><option value="علبة">{t.units.box}</option><option value="حبة">{t.units.piece}</option></select></div></div><div><label className="block text-xs font-semibold text-slate-500 mb-1">{t.modalMinRequiredLabel}</label><input type="number" required value={newItem.minRequired} onChange={e => setNewItem({...newItem,minRequired:Number(e.target.value)})} className="w-full p-2.5 border rounded-xl text-sm"/></div><div className="flex gap-3 pt-2"><button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-xl transition text-sm">{t.saveBtn}</button><button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl transition text-sm">{t.cancelBtn}</button></div></form></div>}
    </div>
  );
};