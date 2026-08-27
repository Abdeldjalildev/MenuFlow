import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, onSnapshot, addDoc, getDocs, query, where, deleteDoc, doc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { Plus, Trash2, DollarSign, Package, Camera, FileText } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { translations } from '../../../utils/translations/merchantTranslations';

type Language = 'ar' | 'fr' | 'en';

interface SuppliersProps {
  lang?: Language;
}

interface Supplier {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  category: string;
  pendingBalance: number;
  invoiceImage?: string;
  minOrderQuantity?: number;
  restaurantId?: string;
}

interface InventoryUpdateData {
  currentQuantity: ReturnType<typeof increment>;
  supplierName: string;
  updatedAt: ReturnType<typeof serverTimestamp>;
  minQuantity?: number;
  minOrderQuantity?: number;
}

export const Suppliers: React.FC<SuppliersProps> = (props) => {
  const outletContext = useOutletContext<{ lang: Language }>() || {};
  const lang = props.lang || outletContext.lang || 'ar';
  const t = translations[lang].suppliers;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [invoiceImage, setInvoiceImage] = useState<string>('');
  
  const [newSupplier, setNewSupplier] = useState({
    companyName: '',
    contactName: '',
    phone: '',
    email: '',
    category: t.categories.meats,
    pendingBalance: 0,
    minOrderQuantity: 0,
    suppliedItemName: '',
    suppliedQuantity: 0,
  });

  // Category follows the active language when opening/resetting the form.

  // ✅ جلب الموردين الخاصين بالمطعم الحالي فقط
  useEffect(() => {
    const restaurantId = localStorage.getItem('restaurantId');
    if (!restaurantId) return;

    const q = query(collection(db, 'suppliers'), where('restaurantId', '==', restaurantId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSuppliers(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Supplier)));
    });
    return () => unsubscribe();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInvoiceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // ✅ إضافة مورد مع ربطه بمعرف المطعم الحالي وتحديث المخزن والمصاريف الخاصة به
  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.companyName || !newSupplier.phone) return;

    const restaurantId = localStorage.getItem('restaurantId');
    if (!restaurantId) {
      alert("خطأ: لم يتم العثور على معرف المطعم. يجدر بك تسجيل الدخول مجدداً.");
      return;
    }

    try {
      // 1. تسجيل المورد مع restaurantId
      const supplierData = {
        restaurantId,
        companyName: newSupplier.companyName,
        contactName: newSupplier.contactName,
        phone: newSupplier.phone,
        email: newSupplier.email,
        category: newSupplier.category,
        pendingBalance: Number(newSupplier.pendingBalance || 0),
        minOrderQuantity: Number(newSupplier.minOrderQuantity || 0),
        invoiceImage: invoiceImage || '',
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'suppliers'), supplierData);

      const expenseAmount = Number(newSupplier.pendingBalance || 0);

      // 2. تسجيل الفاتورة في المصاريف تلقائياً مع ربطها بالمطعم
      if (expenseAmount > 0) {
        const itemText = newSupplier.suppliedItemName || newSupplier.category;
        const expenseTitleText = t.expenseTitle
          .replace('{company}', newSupplier.companyName)
          .replace('{item}', itemText);

        const contactText = newSupplier.contactName || t.unspecifiedContact;
        const expenseNotesText = t.expenseNotes.replace('{contact}', contactText);
         await addDoc(collection(db, 'expenses'), {
          restaurantId,
          title: expenseTitleText,
          amount: expenseAmount,
          category: t.expenseCategory,
          notes: expenseNotesText,
          createdAt: serverTimestamp()
        });
      }

      // 3. التحديث التلقائي الذكي لمخزن المطعم الحالي
      const itemName = newSupplier.suppliedItemName?.trim();
      const quantityToAdd = Number(newSupplier.suppliedQuantity || 0);

      if (itemName && quantityToAdd > 0) {
        const inventoryRef = collection(db, 'inventory');
        const q = query(inventoryRef, where('restaurantId', '==', restaurantId), where('itemName', '==', itemName));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const existingDoc = querySnapshot.docs[0];
          const itemDocRef = doc(db, 'inventory', existingDoc.id);

          const updatePayload: InventoryUpdateData = {
            currentQuantity: increment(quantityToAdd),
            supplierName: newSupplier.companyName,
            updatedAt: serverTimestamp()
          };

          if (newSupplier.minOrderQuantity > 0) {
            updatePayload.minQuantity = Number(newSupplier.minOrderQuantity);
            updatePayload.minOrderQuantity = Number(newSupplier.minOrderQuantity);
          }

          await updateDoc(itemDocRef, updatePayload);
        } else {
          await addDoc(inventoryRef, {
            restaurantId,
            itemName: itemName,
            currentQuantity: quantityToAdd,
            quantity: quantityToAdd,
            category: newSupplier.category,
            supplierName: newSupplier.companyName,
            minQuantity: Number(newSupplier.minOrderQuantity || 0),
            minOrderQuantity: Number(newSupplier.minOrderQuantity || 0),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }

      setNewSupplier({
        companyName: '', contactName: '', phone: '', email: '',
        category: t.categories.meats, pendingBalance: 0, minOrderQuantity: 0, suppliedItemName: '', suppliedQuantity: 0
      });
      setInvoiceImage('');
      setShowAddModal(false);
      alert(t.supplySuccessAlert);

    } catch (error) {
      console.error("خطأ أثناء معالجة التوريد والمخزون:", error);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (window.confirm(t.deleteConfirm)) {
      await deleteDoc(doc(db, 'suppliers', id));
    }
  };

  return (
    <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t.title}</h1>
          <p className="text-sm text-slate-500">{t.subtitle}</p>
        </div>
        <button
          onClick={() => {
            setNewSupplier(prev => ({ ...prev, category: t.categories.meats }));
            setShowAddModal(true);
          }}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition shadow-md text-sm"
        >
          <Plus size={18} />
          <span>{t.addNewButton}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">{t.totalSuppliersStats}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{suppliers.length}</p>
          </div>
          <span className="p-3 bg-indigo-50 text-indigo-500 rounded-xl">🤝</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">{t.totalPendingBalanceStats}</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {suppliers.reduce((sum, s) => sum + Number(s.pendingBalance || 0), 0).toLocaleString()} {t.currency}
            </p>
          </div>
          <span className="p-3 bg-amber-50 text-amber-500 rounded-xl">
            <DollarSign size={20} />
          </span>
        </div>
      </div>

      {/* الجدول */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className={`w-full border-collapse ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
              <th className="p-4">{t.tableCompanyName}</th>
              <th className="p-4">{t.tableContactName}</th>
              <th className="p-4">{t.tableCategory}</th>
              <th className="p-4">{t.tableContact}</th>
              <th className="p-4">الحد الأدنى للطلب</th>
              <th className="p-4">{t.tablePendingBalance}</th>
              <th className="p-4 text-center">الفاتورة</th>
              <th className="p-4 text-center">{t.tableActions}</th>
            </tr>
          </thead>
          <tbody className="text-slate-700 text-sm divide-y divide-slate-100">
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400 italic">{t.emptyState}</td>
              </tr>
            ) : (
              suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-slate-50/50 transition">
                  <td className="p-4 font-bold text-slate-800">{supplier.companyName}</td>
                  <td className="p-4 text-slate-600">{supplier.contactName || '—'}</td>
                  <td className="p-4">
                    <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium">
                      {supplier.category}
                    </span>
                  </td>
                  <td className="p-4 space-y-1">
                    <div className="text-xs text-slate-500" dir="ltr">{supplier.phone}</div>
                  </td>
                  <td className="p-4 font-semibold text-slate-700">
                    {supplier.minOrderQuantity ? ` ${supplier.minOrderQuantity} ` : '—'}
                  </td>
                  <td className="p-4 font-semibold text-amber-600">
                    {Number(supplier.pendingBalance || 0).toLocaleString()} {t.currency}
                  </td>
                  <td className="p-4 text-center">
                    {supplier.invoiceImage ? (
                      <button
                        onClick={() => {
                          const w = window.open("");
                          w?.document.write(`<img src="${supplier.invoiceImage}" style="max-width:100%;" />`);
                        }}
                        className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2.5 py-1 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1"
                        title="عرض صورة الفاتورة"
                      >
                        <FileText size={14} />
                        <span>عرض</span>
                      </button>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleDeleteSupplier(supplier.id)} className="text-red-400 hover:text-red-600 transition">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <form onSubmit={handleAddSupplier} className="bg-white p-6 rounded-2xl max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
             <h3 className="font-bold text-lg border-b pb-2 text-slate-800">{t.modalTitle}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{t.modalCompanyLabel}</label>
                <input type="text" required value={newSupplier.companyName} onChange={(e) => setNewSupplier({ ...newSupplier, companyName: e.target.value })} placeholder={t.modalCompanyPlaceholder} className="w-full p-2.5 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{t.modalContactLabel}</label>
                <input type="text" value={newSupplier.contactName} onChange={(e) => setNewSupplier({ ...newSupplier, contactName: e.target.value })} placeholder={t.modalContactPlaceholder} className="w-full p-2.5 border rounded-xl text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{t.modalPhoneLabel}</label>
                <input type="text" required value={newSupplier.phone} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} placeholder={t.modalPhonePlaceholder} className="w-full p-2.5 border rounded-xl text-sm text-left" dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{t.modalCategoryLabel}</label>
                <select value={newSupplier.category} onChange={(e) => setNewSupplier({ ...newSupplier, category: e.target.value })} className="w-full p-2.5 border rounded-xl text-sm">
                  <option value={t.categories.meats}>{t.categories.meats}</option>
                  <option value={t.categories.vegetables}>{t.categories.vegetables}</option>
                  <option value={t.categories.dryGoods}>{t.categories.dryGoods}</option>
                  <option value={t.categories.beverages}>{t.categories.beverages}</option>
                </select>
              </div>
            </div>

            <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/60 space-y-3">
              <p className="text-xs font-bold text-amber-800 flex items-center gap-1">
                <Package size={14} className="shrink-0" /> {t.directSupplySectionTitle}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t.modalSuppliedItemLabel}</label>
                  <input type="text" value={newSupplier.suppliedItemName} onChange={(e) => setNewSupplier({ ...newSupplier, suppliedItemName: e.target.value })} placeholder={t.modalSuppliedItemPlaceholder} className="w-full p-2 border rounded-lg text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t.modalSuppliedQtyLabel}</label>
                  <input type="number" value={newSupplier.suppliedQuantity} onChange={(e) => setNewSupplier({ ...newSupplier, suppliedQuantity: Number(e.target.value) })} placeholder="25" className="w-full p-2 border rounded-lg text-sm bg-white" />
                </div>
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t.modalPendingBalanceLabel}</label>
                  <input type="number" value={newSupplier.pendingBalance} onChange={(e) => setNewSupplier({ ...newSupplier, pendingBalance: Number(e.target.value) })} placeholder="50000" className="w-full p-2 border rounded-lg text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">الحد الأدنى للطلب (MoQ)</label>
                  <input type="number" value={newSupplier.minOrderQuantity} onChange={(e) => setNewSupplier({ ...newSupplier, minOrderQuantity: Number(e.target.value) })} placeholder="مثال: 10" className="w-full p-2 border rounded-lg text-sm bg-white" />
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Camera size={15} className="text-indigo-600" />
                <span>📷 صورة / مسح الفاتورة (اختياري)</span>
              </label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
              {invoiceImage && (
                <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden border border-slate-300 shadow-sm">
                  <img src={invoiceImage} alt="Invoice preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setInvoiceImage('')}
                    className="absolute top-0 right-0 bg-red-500 text-white p-0.5 text-xs rounded-bl hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-xl transition text-sm">
                {t.saveBtn}
              </button>
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl transition text-sm">
                {t.cancelBtn}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};