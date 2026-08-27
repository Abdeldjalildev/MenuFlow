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

interface StaffForm {
  name: string;
  role: string;
  phone: string;
  email: string;
  password: string;
  loginMethod: 'phone' | 'email';
  salary: number;
  status: 'active' | 'inactive';
}

export const Staff: React.FC<StaffProps> = (props) => {
  const outletContext = useOutletContext<{ lang: Language; restaurantId?: string }>() || {};
  const lang = props.lang || outletContext.lang || 'ar';
  const restaurantId = outletContext.restaurantId || localStorage.getItem('restaurantId') || '';
  const t = translations[lang]?.staff || {};

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [paidStatus, setPaidStatus] = useState<Record<string, boolean>>({});

  // Keep the stored role value language-independent for routing and permissions.
  const createInitialStaff = (): StaffForm => ({
    name: '',
    role: 'Kitchen',
    phone: '',
    email: '',
    password: '',
    loginMethod: 'phone',
    salary: 0,
    status: 'active'
  });

  const [newStaff, setNewStaff] = useState<StaffForm>(createInitialStaff);

  // Fetch staff members for this restaurant only.
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
      const cleanPhone = newStaff.phone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
      const authEmail = `${cleanPhone}@restaurant-staff.local`;

      const userCredential = await createUserWithEmailAndPassword(auth, authEmail, newStaff.password);

      const roleLower = newStaff.role.toLowerCase();
      const normalizedRole = roleLower.includes('cashier') ? 'cashier'
        : roleLower.includes('delivery') ? 'delivery'
        : roleLower.includes('waiter') ? 'waiter'
        : 'Kitchen';

      await addDoc(collection(db, 'staff'), {
        uid: userCredential.user.uid,
        name: newStaff.name,
        role: normalizedRole,
        phone: newStaff.phone,
        loginMethod: 'phone',
        salary: Number(newStaff.salary || 0),
        status: 'active',
        restaurantId: restaurantId,
        createdAt: serverTimestamp()
      });

      setShowAddModal(false);
      setNewStaff(createInitialStaff());

      alert(lang === 'ar' ? 'تم إضافة الموظف بنجاح!' : 'Staff member added successfully!');
    } catch (error: unknown) {
      console.error(error);
      alert(lang === 'ar' ? 'حدث خطأ أثناء إضافة الموظف' : 'Error adding staff');
    }
  };

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
        const titleText = (t.expenseTitle || 'Salary: {name}')
          .replace('{name}', member.name)
          .replace('{role}', member.role);
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
      } catch (error: unknown) {
        console.error('خطأ أثناء صرف الراتب:', error);
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
      {/* Header and add button */}
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

      {/* Quick statistics */}
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

      {/* Staff table */}
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
            <h3 className="font-bold text-lg text-slate-800 pb-1 border-b">{t.addModalTitle || 'Add New Staff'}</h3>

            <input
              type="text"
              placeholder={t.namePlaceholder || 'Full name'}
              value={newStaff.name}
              onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
              required
            />

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">{t.roleLabel || 'Role'}</label>
              <select
                value={newStaff.role}
                onChange={(e) => setNewStaff(prev => ({ ...prev, role: e.target.value }))}
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="Kitchen">{t.roles?.kitchen || 'Kitchen'}</option>
                <option value="Waiter">{t.roles?.waiter || 'Waiter'}</option>
                <option value="Cashier">{t.roles?.cashier || 'Cashier'}</option>
                <option value="Delivery">{t.roles?.delivery || 'Delivery'}</option>
              </select>
            </div>

            <div className="relative">
              <Phone size={16} className="absolute top-3 left-3 text-slate-400" />
              <input
                type="tel"
                placeholder={t.phonePlaceholder || 'Phone number'}
                value={newStaff.phone}
                onChange={(e) => setNewStaff(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full p-2.5 pl-9 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div className="relative">
              <Lock size={16} className="absolute top-3 left-3 text-slate-400" />
              <input
                type="password"
                placeholder={t.passwordPlaceholder || 'Password'}
                value={newStaff.password}
                onChange={(e) => setNewStaff(prev => ({ ...prev, password: e.target.value }))}
                className="w-full p-2.5 pl-9 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                required
                minLength={6}
              />
            </div>

            <input
              type="number"
              min="0"
              placeholder={t.salaryPlaceholder || 'Monthly salary'}
              value={newStaff.salary}
              onChange={(e) => setNewStaff(prev => ({ ...prev, salary: Number(e.target.value) || 0 }))}
              className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
            />

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-semibold">
                {t.cancelButton || 'Cancel'}
              </button>
              <button type="submit" className="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold">
                {t.saveButton || 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
