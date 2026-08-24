import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, query, where } from 'firebase/firestore';
import { Plus, Trash2, Calendar, AlertCircle, ShoppingBag } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { translations } from '../../../utils/translations/merchantTranslations';

type Language = 'ar' | 'fr' | 'en';

interface WasteLogProps {
  lang?: Language;
}

interface WasteItem {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  reason: string;
  estimatedLoss: number;
  date: any;
}

export const WasteLog: React.FC<WasteLogProps> = (props) => {
  // استقبال حالة اللغة الموحدة من الراوتر الأب أو البروبس
  const outletContext = useOutletContext<{ lang: Language }>() || {};
  const lang = props.lang || outletContext.lang || 'ar';
  const t = translations[lang].wasteLog;

  const [wasteItems, setWasteItems] = useState<WasteItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [newWaste, setNewWaste] = useState({
    itemName: '',
    quantity: 0,
    unit: t.units.kg,
    reason: t.reasons.expired,
    estimatedLoss: 0,
  });

  // تحديث القيم المبدئية عند تغيير اللغة
  useEffect(() => {
    setNewWaste(prev => ({
      ...prev,
      unit: t.units.kg,
      reason: t.reasons.expired
    }));
  }, [lang, t.units.kg, t.reasons.expired]);

  // ✅ جلب سجل الهدر الخاص بالمطعم الحالي فقط حياً من الفايربيس
  useEffect(() => {
    const restaurantId = localStorage.getItem('restaurantId');
    if (!restaurantId) {
      setWasteItems([]);
      return;
    }

    const localeMap = { ar: 'ar-DZ', fr: 'fr-FR', en: 'en-US' };

    // استخدام الاستعلام المخصص لعزل البيانات حسب restaurantId
    const q = query(collection(db, 'waste_log'), where('restaurantId', '==', restaurantId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(docSnap => {
        const docData = docSnap.data();
        const dateObj = docData.createdAt?.toDate ? docData.createdAt.toDate() : new Date();

        return {
          id: docSnap.id,
          ...docData,
          date: dateObj.toLocaleDateString(localeMap[lang] || 'ar-DZ')
        } as WasteItem;
      });
      setWasteItems(data);
    });
    return () => unsubscribe();
  }, [lang]);

  // ✅ إضافة تسجيل هدر جديد مربوط بمعرف المطعم
  const handleAddWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWaste.itemName || !newWaste.quantity) return;

    const restaurantId = localStorage.getItem('restaurantId');
    if (!restaurantId) {
      alert("خطأ: لم يتم العثور على معرف المطعم.");
      return;
    }

    await addDoc(collection(db, 'waste_log'), {
      ...newWaste,
      restaurantId,
      createdAt: serverTimestamp()
    });

    setNewWaste({ itemName: '', quantity: 0, unit: t.units.kg, reason: t.reasons.expired, estimatedLoss: 0 });
    setShowAddModal(false);
  };

  // حذف تسجيل
  const handleDeleteWaste = async (id: string) => {
    if (window.confirm(t.deleteConfirm)) {
      await deleteDoc(doc(db, 'waste_log', id));
    }
  };

  return (
    <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* الهيدر */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t.title}</h1>
          <p className="text-sm text-slate-500">{t.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition shadow-md text-sm cursor-pointer"
        >
          <Plus size={18} />
          <span>{t.logWasteBtn}</span>
        </button>
      </div>
        {/* بطاقات الإحصاءات */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">{t.totalLossStats}</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {wasteItems.reduce((sum, item) => sum + Number(item.estimatedLoss || 0), 0).toLocaleString()} {t.currency}
            </p>
          </div>
          <span className="p-3 bg-red-50 text-red-500 rounded-xl">
            <AlertCircle size={20} />
          </span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">{t.totalItemsStats}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{wasteItems.length}</p>
          </div>
          <span className="p-3 bg-slate-50 text-slate-500 rounded-xl">
            <ShoppingBag size={20} />
          </span>
        </div>
      </div>

      {/* الجدول */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className={`w-full border-collapse ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
              <th className="p-4">{t.tableItemName}</th>
              <th className="p-4">{t.tableWastedQty}</th>
              <th className="p-4">{t.tableReason}</th>
              <th className="p-4">{t.tableDate}</th>
              <th className="p-4">{t.tableEstimatedLoss}</th>
              <th className="p-4 text-center">{t.tableActions}</th>
            </tr>
          </thead>
          <tbody className="text-slate-700 text-sm divide-y divide-slate-100">
            {wasteItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 italic">{t.emptyState}</td>
              </tr>
            ) : (
              wasteItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition">
                  <td className="p-4 font-bold text-slate-800">{item.itemName}</td>
                  <td className="p-4 font-medium">{item.quantity} {item.unit}</td>
                  <td className="p-4">
                    <span className="bg-orange-50 text-orange-700 px-2.5 py-1 rounded-md text-xs font-semibold">
                      {item.reason}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 border-none">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={13} className="shrink-0" />
                      <span>{item.date}</span>
                    </span>
                  </td>
                  <td className="p-4 font-bold text-red-600">{Number(item.estimatedLoss || 0).toLocaleString()} {t.currency}</td>
                  <td className="p-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteWaste(item.id)}
                      className="text-red-400 hover:text-red-600 transition cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* مودال الإضافة */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddWaste} className="bg-white p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
         <h3 className="font-bold text-lg border-b pb-2 text-slate-800">{t.modalTitle}</h3>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">{t.modalItemNameLabel}</label>
              <input
                type="text"
                required
                value={newWaste.itemName}
                onChange={(e) => setNewWaste({ ...newWaste, itemName: e.target.value })}
                placeholder={t.modalItemNamePlaceholder}
                className="w-full p-2.5 border rounded-xl text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{t.modalWastedQtyLabel}</label>
                <input
                  type="number"
                  required
                  value={newWaste.quantity}
                  onChange={(e) => setNewWaste({ ...newWaste, quantity: Number(e.target.value) })}
                  className="w-full p-2.5 border rounded-xl text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{t.modalUnitLabel}</label>
                <select
                  value={newWaste.unit}
                  onChange={(e) => setNewWaste({ ...newWaste, unit: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-sm"
                >
                  <option value={t.units.kg}>{t.units.kg}</option>
                  <option value={t.units.piece}>{t.units.piece}</option>
                  <option value={t.units.meal}>{t.units.meal}</option>
                  <option value={t.units.liter}>{t.units.liter}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">{t.modalReasonLabel}</label>
              <select
                value={newWaste.reason}
                onChange={(e) => setNewWaste({ ...newWaste, reason: e.target.value })}
                className="w-full p-2.5 border rounded-xl text-sm"
              >
                <option value={t.reasons.expired}>{t.reasons.expired}</option>
                <option value={t.reasons.storageError}>{t.reasons.storageError}</option>
                <option value={t.reasons.kitchenError}>{t.reasons.kitchenError}</option>
                <option value={t.reasons.customerReturn}>{t.reasons.customerReturn}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">{t.modalEstimatedLossLabel}</label>
              <input
                type="number"
                value={newWaste.estimatedLoss}
                onChange={(e) => setNewWaste({ ...newWaste, estimatedLoss: Number(e.target.value) })}
                className="w-full p-2.5 border rounded-xl text-sm"
                placeholder="0"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-xl transition text-sm cursor-pointer">
                {t.confirmBtn}
              </button>
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl transition text-sm cursor-pointer">
                {t.cancelBtn}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};