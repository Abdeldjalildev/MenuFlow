import React, { useState } from 'react';
import { X, Store, Mail, User, CreditCard, Lock } from 'lucide-react';
import { adminTranslations } from '../../utils/translations/AdminTranslations';
import { db, auth } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { deleteUser, getAuth, signOut } from 'firebase/auth';
import { getApp, getApps, initializeApp } from 'firebase/app';

interface RestaurantFormData {
  name: string;
  owner: string;
  email: string;
  password: string;
  plan: 'monthly' | 'quarterly' | 'yearly';
}

interface AddRestaurantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (restaurantData: Omit<RestaurantFormData, 'password'>) => void;
  lang: 'ar' | 'fr' | 'en';
}

const getProvisioningAuth = () => {
  const existingApp = getApps().find((app) => app.name === 'restaurant-provisioning');
  const provisioningApp = existingApp || initializeApp(getApp().options, 'restaurant-provisioning');
  return getAuth(provisioningApp);
};

export const AddRestaurantModal: React.FC<AddRestaurantModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  lang,
}) => {
  const [formData, setFormData] = useState<RestaurantFormData>({
    name: '',
    owner: '',
    email: '',
    password: '',
    plan: 'monthly',
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const t = adminTranslations[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const provisioningAuth = getProvisioningAuth();
    let createdUser = provisioningAuth.currentUser;

    try {
      // Create the restaurant owner's account without replacing the SuperAdmin session.
      const userCredential = await import('firebase/auth').then(({ createUserWithEmailAndPassword }) =>
        createUserWithEmailAndPassword(provisioningAuth, formData.email, formData.password)
      );
      createdUser = userCredential.user;

      await addDoc(collection(db, 'restaurants'), {
        uid: createdUser.uid,
        name: formData.name,
        owner: formData.owner,
        email: formData.email,
        plan: formData.plan,
        status: 'active',
        createdAt: serverTimestamp(),
      });

      const safeRestaurantData: Omit<RestaurantFormData, 'password'> = {
        name: formData.name,
        owner: formData.owner,
        email: formData.email,
        plan: formData.plan,
      };
      onAdd(safeRestaurantData);
      setFormData({ name: '', owner: '', email: '', password: '', plan: 'monthly' });
      onClose();
    } catch (error: unknown) {
      console.error('Error adding restaurant:', error);

      if (createdUser && createdUser.uid !== auth.currentUser?.uid) {
        try {
          await deleteUser(createdUser);
        } catch (cleanupError) {
          console.error('Failed to clean up the provisioned Auth user:', cleanupError);
        }
      }

      alert(
        'حدث خطأ أثناء حفظ المطعم أو إنشاء الحساب: ' +
          (error instanceof Error ? error.message : '')
      );
    } finally {
      await signOut(provisioningAuth).catch(() => undefined);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <Store className="text-amber-500" size={20} />
            <span>{t.modalTitle}</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200/50 transition">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t.nameLabel}</label>
            <div className="relative">
              <Store className={`absolute top-3.5 ${lang === 'ar' ? 'right-3.5' : 'left-3.5'} text-slate-400`} size={16} />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-amber-500 transition ${lang === 'ar' ? 'pr-10' : 'pl-10'}`}
                placeholder="Burger House"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t.ownerLabel}</label>
            <div className="relative">
              <User className={`absolute top-3.5 ${lang === 'ar' ? 'right-3.5' : 'left-3.5'} text-slate-400`} size={16} />
              <input
                type="text"
                required
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-amber-500 transition ${lang === 'ar' ? 'pr-10' : 'pl-10'}`}
                placeholder="Ahmed Benali"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t.emailLabel}</label>
            <div className="relative">
              <Mail className={`absolute top-3.5 ${lang === 'ar' ? 'right-3.5' : 'left-3.5'} text-slate-400`} size={16} />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-amber-500 transition ${lang === 'ar' ? 'pr-10' : 'pl-10'}`}
                placeholder="owner@example.com"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">كلمة المرور (للتسجيل)</label>
            <div className="relative">
              <Lock className={`absolute top-3.5 ${lang === 'ar' ? 'right-3.5' : 'left-3.5'} text-slate-400`} size={16} />
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-amber-500 transition ${lang === 'ar' ? 'pr-10' : 'pl-10'}`}
                placeholder="••••••••"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t.planLabel}</label>
            <div className="relative">
              <CreditCard className={`absolute top-3.5 ${lang === 'ar' ? 'right-3.5' : 'left-3.5'} text-slate-400`} size={16} />
              <select
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value as RestaurantFormData['plan'] })}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-amber-500 transition cursor-pointer ${lang === 'ar' ? 'pr-10' : 'pl-10'}`}
              >
                <option value="monthly">{t.monthly}</option>
                <option value="quarterly">{t.quarterly}</option>
                <option value="yearly">{t.yearly}</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              {loading ? 'جاري الحفظ...' : t.submitBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};