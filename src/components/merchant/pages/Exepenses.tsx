import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, query, where } from 'firebase/firestore';
import { Plus, Trash2, Calendar, FileText } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { translations } from '../../../utils/translations/merchantTranslations';

type Language = 'ar' | 'fr' | 'en';
interface ExpensesProps { lang?: Language; }
interface Expense { id: string; title: string; amount: number; category: string; date: string; notes?: string; restaurantId?: string; }

export const Expenses: React.FC<ExpensesProps> = (props) => {
  const outletContext = useOutletContext<{ lang: Language }>() || {};
  const lang = props.lang || outletContext.lang || 'ar';
  const t = translations[lang].expenses;
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExpense, setNewExpense] = useState({ title: '', amount: 0, category: t.categories.utilities, notes: '' });

  useEffect(() => {
    const restaurantId = localStorage.getItem('restaurantId');
    if (!restaurantId) return;
    const localeMap: Record<Language, string> = { ar: 'ar-DZ', fr: 'fr-FR', en: 'en-US' };
    const qExpenses = query(collection(db, 'expenses'), where('restaurantId', '==', restaurantId));
    const unsubscribe = onSnapshot(qExpenses, snapshot => {
      const data = snapshot.docs.map(docSnap => {
        const docData = docSnap.data();
        const createdAt = docData.createdAt;
        const dateObj = createdAt && typeof createdAt === 'object' && 'toDate' in createdAt && typeof createdAt.toDate === 'function' ? createdAt.toDate() : new Date();
        return { id: docSnap.id, ...docData, date: dateObj.toLocaleDateString(localeMap[lang]) } as Expense;
      });
      setExpenses(data);
    });
    return () => unsubscribe();
  }, [lang]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount) return;
    const restaurantId = localStorage.getItem('restaurantId');
    if (!restaurantId) { alert('خطأ: لم يتم العثور على معرف المطعم.'); return; }
    await addDoc(collection(db, 'expenses'), { ...newExpense, amount: Number(newExpense.amount || 0), restaurantId, createdAt: serverTimestamp() });
    setNewExpense({ title: '', amount: 0, category: t.categories.utilities, notes: '' });
    setShowAddModal(false);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm(t.deleteConfirm)) return;
    try { await deleteDoc(doc(db, 'expenses', id)); } catch (error) { console.error('خطأ أثناء الحذف:', error); }
  };

  return (
    <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold text-slate-800">{t.title}</h1><p className="text-sm text-slate-500">{t.subtitle}</p></div><button type="button" onClick={() => { setNewExpense(prev => ({ ...prev, category: t.categories.utilities })); setShowAddModal(true); }} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition shadow-md text-sm cursor-pointer"><Plus size={18} /><span>{t.addNewButton}</span></button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between"><div><p className="text-xs text-slate-400">{t.totalExpensesStats}</p><p className="text-2xl font-bold text-red-600 mt-1">{expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0).toLocaleString()} {t.currency}</p></div><span className="p-3 bg-red-50 text-red-500 rounded-xl">📉</span></div><div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between"><div><p className="text-xs text-slate-400">{t.totalOperationsStats}</p><p className="text-2xl font-bold text-slate-800 mt-1">{expenses.length}</p></div><span className="p-3 bg-slate-50 text-slate-500 rounded-xl">📄</span></div></div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"><table className={`w-full border-collapse ${lang === 'ar' ? 'text-right' : 'text-left'}`}><thead><tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm"><th className="p-4">{t.tableTitle}</th><th className="p-4">{t.tableCategory}</th><th className="p-4">{t.tableDate}</th><th className="p-4">{t.tableAmount}</th><th className="p-4">{t.tableNotes}</th><th className="p-4 text-center">{t.tableActions}</th></tr></thead><tbody className="text-slate-700 text-sm divide-y divide-slate-100">{expenses.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">{t.emptyState}</td></tr> : expenses.map(expense => <tr key={expense.id} className="hover:bg-slate-50/50 transition"><td className="p-4 font-bold text-slate-800 flex items-center gap-2"><FileText size={16} className="text-slate-400 shrink-0" /><span>{expense.title}</span></td><td className="p-4"><span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-semibold">{expense.category}</span></td><td className="p-4 text-slate-500 border-none"><span className="flex items-center gap-1.5"><Calendar size={13} className="shrink-0" /><span>{expense.date}</span></span></td><td className="p-4 font-bold text-red-600">{Number(expense.amount || 0).toLocaleString()} {t.currency}</td><td className="p-4 text-slate-400 max-w-45 truncate">{expense.notes || '—'}</td><td className="p-4 text-center"><button type="button" onClick={() => handleDeleteExpense(expense.id)} className="text-red-400 hover:text-red-600 transition cursor-pointer"><Trash2 size={16} /></button></td></tr>)}</tbody></table></div>
      {showAddModal && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><form onSubmit={handleAddExpense} className="bg-white p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 animate-fadeIn" dir={lang === 'ar' ? 'rtl' : 'ltr'}><h3 className="font-bold text-lg border-b pb-2 text-slate-800">{t.modalTitle}</h3><div><label className="block text-xs font-semibold text-slate-500 mb-1">{t.modalTitleLabel}</label><input type="text" required value={newExpense.title} onChange={e => setNewExpense({ ...newExpense, title: e.target.value })} placeholder={t.modalTitlePlaceholder} className="w-full p-2.5 border rounded-xl text-sm" /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-slate-500 mb-1">{t.modalAmountLabel}</label><input type="number" required value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: Number(e.target.value) })} className="w-full p-2.5 border rounded-xl text-sm" placeholder="0" /></div><div><label className="block text-xs font-semibold text-slate-500 mb-1">{t.modalCategoryLabel}</label><select value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })} className="w-full p-2.5 border rounded-xl text-sm"><option value={t.categories.utilities}>{t.categories.utilities}</option><option value={t.categories.rent}>{t.categories.rent}</option><option value={t.categories.maintenance}>{t.categories.maintenance}</option><option value={t.categories.urgentPurchases}>{t.categories.urgentPurchases}</option><option value={t.categories.salaries}>{t.categories.salaries}</option><option value={t.categories.other}>{t.categories.other}</option></select></div></div><div><label className="block text-xs font-semibold text-slate-500 mb-1">{t.modalNotesLabel}</label><textarea value={newExpense.notes} onChange={e => setNewExpense({ ...newExpense, notes: e.target.value })} placeholder={t.modalNotesPlaceholder} className="w-full p-2.5 border rounded-xl text-sm resize-none h-20" /></div><div className="flex gap-3 pt-2"><button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-xl transition text-sm cursor-pointer">{t.saveBtn}</button><button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl transition text-sm cursor-pointer">{t.cancelBtn}</button></div></form></div>}
    </div>
  );
};