 import React, { useState, useEffect } from 'react';
import { db, auth } from '../../../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { Plus, Trash2, User, DollarSign, ToggleLeft, ToggleRight, CreditCard, CheckCircle2, Phone, Lock } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { translations } from '../../../utils/translations/merchantTranslations';

type Language = 'ar' | 'fr' | 'en';

interface StaffProps {
  lang?: Language;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
  salary: number;
  status: 'active' | 'inactive';
  restaurantId: string;
  loginMethod?: 'email' | 'phone';
}

export const Staff: React.FC<StaffProps> = (props) => {
  const outletContext = useOutletContext<{ lang: Language; restaurantId?: string }>() || {};
  const lang = props.lang || outletContext.lang || 'ar';
  const restaurantId = outletContext.restaurantId || localStorage.getItem('restaurantId') || '';
  const t = translations[lang]?.staff || {};

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [paidStatus, setPaidStatus] = useState<{ [key: string]: boolean }>({});
  
// حالة نموذج إضافة موظف جديد تدعم الاختيار بين الإيميل أو الهاتف مع كلمة المرور
  const [newStaff, setNewStaff] = useState({
    name: '',
    role: 'Kitchen', // 👈 توحيد القيمة الافتراضية برمجياً
    phone: '',
    email: '',
    password: '',
    loginMethod: 'phone' as 'phone' | 'email',
    salary: 0,
    status: 'active' as 'active' | 'inactive'
  });



useEffect(() => {
    // نحافظ على القيمة البرمجية 'kitchen' وثباتها بغض النظر عن لغة الواجهة
    setNewStaff(prev => ({ ...prev, role: 'Kitchen' }));
  }, [lang]);

  // جلب الموظفين الخاصين بهذا المطعم حصرياً لضمان عزل البيانات
  useEffect(() => {
    if (!restaurantId) return;
    
    const q = query(collection(db, 'staff'), where('restaurantId', '==', restaurantId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStaff(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as StaffMember)));
    });
    return () => unsubscribe();
  }, [restaurantId]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.phone || !newStaff.password) return;

    try {
      // توليد إيميل وهمي ثابت من رقم الهاتف
      const cleanPhone = newStaff.phone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
      const authEmail = `${cleanPhone}@restaurant-staff.local`;

      // 1. إنشاء الحساب في Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, authEmail, newStaff.password);
      
      // 🎯 تحديد وتوحيد قيمة الدور (role) لتتوافق مع نظام التوجيه
      const roleLower = String(newStaff.role).toLowerCase();
      const normalizedRole = roleLower.includes('cashier') ? 'cashier'
        : roleLower.includes('delivery') ? 'delivery'
        : roleLower.includes('waiter') ? 'waiter'
        : 'Kitchen';

      // 2. حفظ البيانات في Firestore
      await addDoc(collection(db, 'staff'), {
        uid: userCredential.user.uid,
        name: newStaff.name,
        role: normalizedRole, // 👈 حفظ الدور بصيغة برمجية موحدة وصحيحة للتوجيه
        phone: newStaff.phone, // نحفظ رقم الهاتف الحقيقي
        loginMethod: 'phone', // نثبتها على هاتف
        salary: Number(newStaff.salary || 0),
        status: 'active',
        restaurantId: restaurantId,
        createdAt: serverTimestamp()
      });

      setShowAddModal(false);
      
      // 👈 تفريغ الفورم بعد النجاح مع إعادة تعيين الدور للقيمة البرمجية الصحيحة
      setNewStaff({
        name: '',
        role: 'Kitchen',
        phone: '',
        email: '',
        password: '',
        loginMethod: 'phone',
        salary: 0,
        status: 'active'
      });

      alert(lang === 'ar' ? 'تم إضافة الموظف بنجاح!' : 'Staff member added successfully!');
    } catch (error: any) {
      console.error(error);
      alert(lang === 'ar' ? 'حدث خطأ أثناء إضافة الموظف' : 'Error adding staff');
    }
  };
  // دالة صرف الراتب وربطه المباشر بالمصاريف والتقارير
  const handlePaySalary = async (member: StaffMember) => {
    if (member.salary <= 0) {
      alert(t.noSalaryAlert || 'No salary specified');
      return;
    }

    const confirmMsg = (t.confirmPaySalary || 'Pay salary for {name}?')
      .replace('{name}', member.name)
      .replace('{salary}', member.salary.toLocaleString());
      
    if (window.confirm(confirmMsg)) {
      try {
        const titleText = (t.expenseTitle || 'Salary: {name}').replace('{name}', member.name).replace('{role}', member.role);
        const notesText = (t.expenseNotes || 'Phone: {phone}').replace('{phone}', member.phone);

        await addDoc(collection(db, 'expenses'), {
          title: titleText,
          amount: Number(member.salary),
          category: t.expenseCategory || 'Salaries',
          notes: notesText,
          restaurantId: restaurantId,
          createdAt: serverTimestamp()
        });
        
        setPaidStatus(prev => ({ ...prev, [member.id]: true }));
        alert((t.salaryPaidSuccess || 'Salary paid successfully for {name}').replace('{name}', member.name));
      } catch (error) {
        console.error("خطأ أثناء صرف الراتب:", error);
      }
    }
  };

  const toggleStatus = async (id: string, currentStatus: 'active' | 'inactive') => {
    const staffRef = doc(db, 'staff', id);
    await updateDoc(staffRef, {
      status: currentStatus === 'active' ? 'inactive' : 'active'
    });
  };

  const handleDeleteStaff = async (id: string) => {
    if (window.confirm(t.deleteConfirm || 'Are you sure you want to delete this staff member?')) {
      await deleteDoc(doc(db, 'staff', id));
    }
  };

  return (
    <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* الهيدر وزر الإضافة */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t.title || 'Staff Management'}</h1>
          <p className="text-sm text-slate-500">{t.subtitle || 'Manage your team accounts and roles'}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition shadow-md text-sm"
        >
          <Plus size={18} />
          <span>{t.addNewButton || 'Add Staff'}</span>
        </button>
      </div>

      {/* بطاقات الإحصاء السريع */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">{t.totalStaffStats || 'Total Staff'}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{staff.length}</p>
          </div>
          <span className="p-3 bg-indigo-50 text-indigo-500 rounded-xl">👥</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">{t.activeStaffStats || 'Active Staff'}</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {staff.filter(s => s.status === 'active').length}
            </p>
          </div>
          <span className="p-3 bg-green-50 text-green-500 rounded-xl">🟢</span>
        </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">{t.monthlySalariesStats || 'Total Salaries'}</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {staff.reduce((sum, s) => sum + Number(s.salary || 0), 0).toLocaleString()} {t.currency || 'DZD'}
            </p>
          </div>
          <span className="p-3 bg-amber-50 text-amber-500 rounded-xl">
            <DollarSign size={20} />
          </span>
        </div>
      </div>

      {/* جدول البيانات المطور */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className={`w-full border-collapse ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
              <th className="p-4">{t.tableName || 'Name'}</th>
              <th className="p-4">{t.tableRole || 'Role'}</th>
              <th className="p-4">{lang === 'ar' ? 'طريقة الدخول' : 'Login Via'}</th>
              <th className="p-4">{t.tablePhone || 'Phone'}</th>
              <th className="p-4">{t.tableSalary || 'Salary'}</th>
              <th className="p-4">{t.tableStatus || 'Status'}</th>
              <th className="p-4 text-center">{t.tablePaySalary || 'Pay'}</th>
              <th className="p-4 text-center">{t.tableDelete || 'Delete'}</th>
            </tr>
          </thead>
          <tbody className="text-slate-700 text-sm divide-y divide-slate-100">
            {staff.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400 italic">{t.emptyState || 'No staff members found'}</td>
              </tr>
            ) : (
              staff.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/50 transition">
                  <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                    <User size={16} className="text-slate-400 shrink-0" />
                    <span>{member.name}</span>
                  </td>
                  <td className="p-4">
                    <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-xs font-semibold">
                      {member.role}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600 text-xs font-medium">
                    {member.loginMethod === 'email' 
                      ? (lang === 'ar' ? 'البريد الإلكتروني' : 'Email') 
                      : (lang === 'ar' ? 'رقم الهاتف' : 'Phone')}
                  </td>
                  <td className="p-4" dir="ltr">{member.phone}</td>
                  <td className="p-4 font-bold text-slate-800">{Number(member.salary || 0).toLocaleString()} {t.currency || 'DZD'}</td>
                  <td className="p-4">
                    <button 
                      onClick={() => toggleStatus(member.id, member.status)}
                      className="flex items-center gap-1 transition"
                    >
                      {member.status === 'active' ? (
                        <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                          <ToggleRight size={16} className="text-green-600" /> {t.activeStatus || 'Active'}
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                          <ToggleLeft size={16} className="text-slate-400" /> {t.inactiveStatus || 'Inactive'}
                        </span>
                      )}
                    </button>
                  </td>
                   <td className="p-4 text-center">
                    <button
                      onClick={() => handlePaySalary(member)}
                      disabled={paidStatus[member.id]}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 mx-auto transition shadow-sm ${
                        paidStatus[member.id]
                          ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed'
                          : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                      }`}
                    >
                      {paidStatus[member.id] ? (
                        <>
                          <CheckCircle2 size={14} /> {t.paidBadge || 'Paid'}
                        </>
                      ) : (
                        <>
                          <CreditCard size={14} /> {t.paySalaryBtn || 'Pay Salary'}
                        </>
                      )}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleDeleteStaff(member.id)}
                      className="text-red-400 hover:text-red-600 transition"
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

        {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddStaff} className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-3.5" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <h3 className="font-bold text-lg text-slate-800 pb-1 border-b">
              {lang === 'ar' ? 'إضافة موظف جديد' : 'Add New Staff'}
            </h3>

            {/* الاسم الكامل */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}
              </label>
              <input
                type="text"
                required
                autoComplete="off"
                placeholder={lang === 'ar' ? 'مثال: محمد الأمين' : 'e.g. John Doe'}
                value={newStaff.name}
                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                className="w-full p-2.5 border rounded-xl text-sm"
              />
            </div>

            {/* رقم الهاتف */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {lang === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="tel"
                  required
                  autoComplete="off"
                  name="staff_phone_number_unique"
                  placeholder="0550000000"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                  className="w-full p-2.5 pl-9 border rounded-xl text-sm text-left"
                  dir="ltr"
                />
              </div>
            </div>

            {/* كلمة المرور */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {lang === 'ar' ? 'كلمة المرور' : 'Password'}
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  name="staff_secret_password_unique"
                  placeholder="••••••••"
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                  className="w-full p-2.5 pl-9 border rounded-xl text-sm text-left"
                  dir="ltr"
                />
              </div>
            </div>

            {/* الراتب والوظيفة */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {lang === 'ar' ? 'الراتب الشهري (دج)' : 'Monthly Salary'}
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={newStaff.salary}
                  onChange={(e) => setNewStaff({ ...newStaff, salary: Number(e.target.value) })}
                  className="w-full p-2.5 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {lang === 'ar' ? 'الوظيفة' : 'Role'}
                </label>
                <select 
                  value={newStaff.role} 
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-sm bg-white"
                  >
                  <option value="Chef">{lang === 'ar' ? 'طباخ (Chef)' : 'Chef'}</option>
                  <option value="Cashier">{lang === 'ar' ? 'كاشير (Cashier)' : 'Cashier'}</option>
                  <option value="Waiter">{lang === 'ar' ? 'نادل (Waiter)' : 'Waiter'}</option>
                  <option value="Delivery">{lang === 'ar' ? 'عامل توصيل (Delivery)' : 'Delivery'}</option>
                </select>
              </div>
            </div>

            {/* أزرار الحفظ والإلغاء */}
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-xl text-sm transition">
                {lang === 'ar' ? 'حفظ' : 'Save'}
              </button>
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl text-sm transition">
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};