import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, setDoc, query, where } from 'firebase/firestore';
import { Plus, Trash2, User, Award, Search, Smartphone, Gift, Settings, CheckCircle2 } from 'lucide-react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { translations } from '../../../utils/translations/merchantTranslations';

type Language = 'ar' | 'fr' | 'en';

interface CustomersProps {
  lang?: Language;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  customerId?: string;
  points: number;
  totalOrdersCount: number;
  totalSpent?: number;
  activeDiscount?: number;
}

interface LoyaltyRule {
  requiredPoints: number;
  discountPercent: number;
}

interface OrderRecord {
  id: string;
  status?: string;
  isPaid?: boolean;
  customerId?: string;
  customerPhone?: string;
  customerName?: string;
  deliveryData?: {
    phone?: string;
    name?: string;
  };
  totalAmount?: number | string;
  totalPrice?: number | string;
  total?: number | string;
  tableNumber?: string | number;
  tableName?: string | number;
}

export const Customers: React.FC<CustomersProps> = (props) => {
  const [searchParams] = useSearchParams();
  const phoneFromQuery = searchParams.get('phone') || '';

  const outletContext = useOutletContext<{ lang: Language }>() || {};
  const lang = props.lang || outletContext.lang || 'ar';
  const t = translations[lang].customers;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState(phoneFromQuery);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', points: 0, totalOrdersCount: 0 });
  const [loyaltyRule, setLoyaltyRule] = useState<LoyaltyRule>({ requiredPoints: 50, discountPercent: 10 });

  useEffect(() => {
    const restaurantId = localStorage.getItem('restaurantId');
    if (!restaurantId) return;

    const unsubSettings = onSnapshot(doc(db, 'settings', `${restaurantId}_loyalty`), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as LoyaltyRule;
        setLoyaltyRule({
          requiredPoints: Number(data.requiredPoints || 50),
          discountPercent: Number(data.discountPercent || 10)
        });
      }
    });
    return () => unsubSettings();
  }, []);

  useEffect(() => {
    const restaurantId = localStorage.getItem('restaurantId');
    if (!restaurantId) return;

    let savedCustomers: Customer[] = [];
    let ordersList: OrderRecord[] = [];

    const updateCombinedCustomers = () => {
      const customersMap = new Map<string, Customer>();

      savedCustomers.forEach((cust) => {
        const key = cust.customerId || cust.phone || cust.id;
        if (key) {
          customersMap.set(key, { ...cust });
        }
      });

      const validStatuses = ['completed', 'paid', 'delivered_unpaid'];

      ordersList.forEach((order) => {
        const statusStr = String(order.status || '');
        const isPaid = order.isPaid === true || validStatuses.includes(statusStr);

        if (!isPaid) return;

        const custId = order.customerId || '';
        const phone = order.customerPhone || order.deliveryData?.phone || '';
        const orderAmount = Number(order.totalAmount || order.totalPrice || order.total || 0);
        const tableName = order.tableNumber || order.tableName || '';

        const key = custId || phone || (tableName ? `table_${tableName}_${order.id}` : '');
        if (!key) return;

        const rawName = order.customerName || order.deliveryData?.name || '';
        let realName = '';

        if (!rawName || rawName.includes('طاولة #') || rawName.startsWith('طاولة')) {
          if (tableName && tableName !== '0') {
            const shortCode = custId ? custId.slice(-4) : order.id.slice(-4);
            realName = `زبون طاولة #${tableName} (${shortCode})`;
          } else {
            const shortCode = custId ? custId.slice(-4) : 'خارجي';
            realName = `زبون (${shortCode})`;
          }
        } else {
          realName = rawName;
        }

        if (customersMap.has(key)) {
          const existing = customersMap.get(key)!;

          if ((!existing.name || existing.name.startsWith('زبون')) && rawName && !rawName.includes('طاولة #')) {
            existing.name = rawName;
          }

          existing.totalOrdersCount = (existing.totalOrdersCount || 0) + 1;
          existing.totalSpent = (existing.totalSpent || 0) + orderAmount;
          existing.points = (existing.points || 0) + Math.max(1, Math.floor(orderAmount / 100));

          if (custId && !existing.customerId) existing.customerId = custId;
          if (phone && (!existing.phone || existing.phone === 'غير محدد')) existing.phone = phone;
        } else {
          customersMap.set(key, {
            id: key,
            name: realName,
            phone: phone || 'غير محدد',
            customerId: custId || '',
            points: Math.max(1, Math.floor(orderAmount / 100)),
            totalOrdersCount: 1,
            totalSpent: orderAmount,
          });
        }
      });

      setCustomers(Array.from(customersMap.values()));
    };

    const qCustomers = query(collection(db, 'customers'), where('restaurantId', '==', restaurantId));
    const unsubCustomers = onSnapshot(qCustomers, (snapshot) => {
      savedCustomers = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Customer));
      updateCombinedCustomers();
    });

    const qOrders = query(collection(db, 'orders'), where('restaurantId', '==', restaurantId));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      ordersList = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as OrderRecord));
      updateCombinedCustomers();
    });

    return () => {
      unsubCustomers();
      unsubOrders();
    };
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const restaurantId = localStorage.getItem('restaurantId');
    if (!restaurantId) {
      alert('خطأ: لم يتم العثور على معرف المطعم.');
      return;
    }

    try {
      await setDoc(doc(db, 'settings', `${restaurantId}_loyalty`), loyaltyRule);
      setShowSettingsModal(false);
      alert('تم حفظ إعدادات نظام الولاء بنجاح!');
    } catch (error) {
      console.error('خطأ أثناء حفظ الإعدادات:', error);
    }
  };

  const handleGrantReward = async (customer: Customer) => {
    try {
      const discountVal = loyaltyRule.discountPercent;
      const custRef = doc(db, 'customers', customer.id);
      await updateDoc(custRef, {
        activeDiscount: discountVal,
        points: Math.max(0, customer.points - loyaltyRule.requiredPoints)
      });

      alert(`تم إرسال تخفيض ${discountVal}% بنجاح للعميل ${customer.name}`);
    } catch {
      const restaurantId = localStorage.getItem('restaurantId');
      await setDoc(doc(db, 'customers', customer.id), {
        ...customer,
        restaurantId,
        activeDiscount: loyaltyRule.discountPercent,
        points: Math.max(0, customer.points - loyaltyRule.requiredPoints)
      });
      alert(`تم إرسال تخفيض ${loyaltyRule.discountPercent}% بنجاح للعميل ${customer.name}`);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.phone) return;

    const restaurantId = localStorage.getItem('restaurantId');
    if (!restaurantId) {
      alert('خطأ: لم يتم العثور على معرف المطعم.');
      return;
    }

    await addDoc(collection(db, 'customers'), {
      ...newCustomer,
      restaurantId
    });
    setNewCustomer({ name: '', phone: '', points: 0, totalOrdersCount: 0 });
    setShowAddModal(false);
  };

  const handleAddPoints = async (id: string, currentPoints: number) => {
    try {
      const customerRef = doc(db, 'customers', id);
      await updateDoc(customerRef, { points: (currentPoints || 0) + 10 });
    } catch {
      const targetCustomer = customers.find(c => c.id === id);
      const restaurantId = localStorage.getItem('restaurantId');
      if (targetCustomer) {
        await addDoc(collection(db, 'customers'), {
          ...targetCustomer,
          restaurantId,
          points: (currentPoints || 0) + 10
        });
      }
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (window.confirm(t.deleteConfirm || 'هل أنت متأكد من حذف هذا العميل؟')) {
      try {
        await deleteDoc(doc(db, 'customers', id));
      } catch {
        setCustomers(prev => prev.filter(c => c.id !== id));
      }
    }
  };

  const filteredCustomers = customers.filter(c =>
    (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t.title}</h1>
          <p className="text-sm text-slate-500">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowSettingsModal(true)} className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition shadow-md text-sm cursor-pointer">
            <Settings size={18} />
            <span>إعدادات المكافآت</span>
          </button>

          <button type="button" onClick={() => setShowAddModal(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition shadow-md text-sm cursor-pointer">
            <Plus size={18} />
            <span>{t.addNewButton}</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="text-slate-400 shrink-0" size={20} />
        <input type="text" placeholder={t.searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-transparent border-none text-sm outline-none text-slate-700" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className={`w-full border-collapse ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
              <th className="p-4">{t.tableName}</th>
              <th className="p-4">{t.tablePhone}</th>
              <th className="p-4">{t.tableOrders}</th>
              <th className="p-4">{t.tablePoints}</th>
              <th className="p-4 text-center">حالة المكافأة</th>
              <th className="p-4 text-center">{t.tableQuickBonus}</th>
              <th className="p-4 text-center">{t.tableActions}</th>
            </tr>
          </thead>
          <tbody className="text-slate-700 text-sm divide-y divide-slate-100">
            {filteredCustomers.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-slate-400 italic">{t.emptyState}</td></tr>
            ) : (
              filteredCustomers.map((customer) => {
                const ordersCount = customer.totalOrdersCount || 0;
                const points = customer.points || 0;
                const isEligibleForReward = points >= loyaltyRule.requiredPoints;
                const hasActiveDiscount = (customer.activeDiscount || 0) > 0;

                return (
                  <tr key={customer.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                      <User size={16} className="text-slate-400 shrink-0" />
                      <div>
                        <span>{customer.name}</span>
                        {customer.customerId && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-normal">
                            <Smartphone size={10} />
                            <span>معرف الجهاز متصل</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-medium" dir="ltr">{customer.phone}</td>
                    <td className="p-4 text-indigo-600 font-semibold">{ordersCount} {t.ordersUnit}</td>
                    <td className="p-4"><span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-max"><Award size={14} className="fill-amber-500" />{points} {t.pointsUnit}</span></td>
                    <td className="p-4 text-center">
                      {hasActiveDiscount ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1"><CheckCircle2 size={13} /><span>خصم {customer.activeDiscount}% مفعّل للزبون</span></span>
                      ) : isEligibleForReward ? (
                        <button type="button" onClick={() => handleGrantReward(customer)} className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 justify-center mx-auto shadow-md transition animate-bounce cursor-pointer"><Gift size={14} /><span>إرسال تخفيض {loyaltyRule.discountPercent}%</span></button>
                      ) : (
                        <span className="text-xs text-slate-400">تحتاج {loyaltyRule.requiredPoints - points} نقطة</span>
                      )}
                    </td>
                    <td className="p-4 text-center"><button type="button" onClick={() => handleAddPoints(customer.id, customer.points)} className="bg-slate-100 text-slate-700 hover:bg-amber-500 hover:text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer">{t.manualBonusBtn}</button></td>
                    <td className="p-4 text-center"><button type="button" onClick={() => handleDeleteCustomer(customer.id)} className="text-red-400 hover:text-red-600 transition p-1 hover:bg-red-50 rounded-lg cursor-pointer"><Trash2 size={16} /></button></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <div className="flex items-center gap-2 border-b pb-3"><Settings className="text-amber-500" size={22} /><h3 className="font-bold text-lg text-slate-800">إعدادات نظام الولاء والخصومات</h3></div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">عدد النقاط المطلوبة للمكافأة</label>
              <input type="number" required min="1" value={loyaltyRule.requiredPoints} onChange={(e) => setLoyaltyRule({ ...loyaltyRule, requiredPoints: Number(e.target.value) })} className="w-full p-2.5 border rounded-xl text-sm font-bold text-slate-800 outline-amber-500" placeholder="مثال: 50" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">نسبة التخفيض المئوية (%)</label>
              <input type="number" required min="1" max="100" value={loyaltyRule.discountPercent} onChange={(e) => setLoyaltyRule({ ...loyaltyRule, discountPercent: Number(e.target.value) })} className="w-full p-2.5 border rounded-xl text-sm font-bold text-emerald-600 outline-emerald-500" placeholder="مثال: 10" />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed bg-slate-50 p-3 rounded-xl">💡 عند وصول نقاط الزبون إلى <span className="font-bold text-amber-600">{loyaltyRule.requiredPoints} نقطة</span>، سيظهر زر التخفيض تلقائياً لإرسال خصم بقيمة <span className="font-bold text-emerald-600">{loyaltyRule.discountPercent}%</span> لواجهة الزبون مباشرة.</p>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-xl transition text-sm shadow cursor-pointer">حفظ الإعدادات</button>
              <button type="button" onClick={() => setShowSettingsModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl transition text-sm cursor-pointer">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddCustomer} className="bg-white p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <h3 className="font-bold text-lg border-b pb-2 text-slate-800">{t.modalTitle}</h3>
            <div><label className="block text-xs font-semibold text-slate-500 mb-1">{t.modalNameLabel}</label><input type="text" required value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} placeholder={t.modalNamePlaceholder} className="w-full p-2.5 border rounded-xl text-sm" /></div>
            <div><label className="block text-xs font-semibold text-slate-500 mb-1">{t.modalPhoneLabel}</label><input type="text" required value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} placeholder={t.modalPhonePlaceholder} className="w-full p-2.5 border rounded-xl text-sm text-left" dir="ltr" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-semibold text-slate-500 mb-1">{t.modalPointsLabel}</label><input type="number" value={newCustomer.points} onChange={(e) => setNewCustomer({ ...newCustomer, points: Number(e.target.value) })} className="w-full p-2.5 border rounded-xl text-sm" placeholder="0" /></div>
              <div><label className="block text-xs font-semibold text-slate-500 mb-1">{t.modalOrdersLabel}</label><input type="number" value={newCustomer.totalOrdersCount} onChange={(e) => setNewCustomer({ ...newCustomer, totalOrdersCount: Number(e.target.value) })} className="w-full p-2.5 border rounded-xl text-sm" placeholder="0" /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-xl transition text-sm cursor-pointer">{t.confirmSubmit}</button>
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl transition text-sm cursor-pointer">{t.cancelBtn}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};