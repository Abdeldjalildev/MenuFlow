import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Ban,
  CheckCircle,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Settings,
  Store,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { adminTranslations } from '../../utils/translations/AdminTranslations';
import { AddRestaurantModal } from './AddRestaurantModal';
import { auth, db } from '../../firebase';

type Language = 'ar' | 'fr' | 'en';
type DashboardTab = 'overview' | 'restaurants' | 'subscriptions' | 'settings';
type RestaurantPlan = 'monthly' | 'quarterly' | 'yearly';
type RestaurantStatus = 'active' | 'suspended';

interface RestaurantRecord {
  id: string;
  name?: string;
  owner?: string;
  email?: string;
  plan: RestaurantPlan | string;
  status: string;
  rawStatus: RestaurantStatus;
}

const SUPER_ADMIN_EMAIL = 'abdeldjalilkhalfa2@gmail.com';

export const SuperAdminDashboard: React.FC = () => {
  const [lang, setLang] = useState<Language>('ar');
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [restaurantsList, setRestaurantsList] = useState<RestaurantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;
      setAuthorized(isSuperAdmin);
      setAuthReady(true);

      if (!isSuperAdmin) {
        navigate('/login', { replace: true });
      }
    });

    return unsubscribe;
  }, [navigate]);

  const isCurrentSuperAdmin = () =>
    auth.currentUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

  const fetchRestaurants = async () => {
    if (!isCurrentSuperAdmin()) return;

    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'restaurants'));
      const list: RestaurantRecord[] = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        let planFormatted = data.plan as string | undefined;

        if (data.plan === 'yearly') planFormatted = 'سنوي (1 Year)';
        else if (data.plan === 'quarterly') planFormatted = '3 أشهر (Quarterly)';
        else if (data.plan === 'monthly') planFormatted = 'شهري (Monthly)';

        const rawStatus: RestaurantStatus =
          data.status === 'suspended' ? 'suspended' : 'active';

        return {
          id: docSnap.id,
          name: data.name,
          owner: data.owner,
          email: data.email,
          plan: planFormatted || '',
          status: rawStatus === 'suspended' ? 'معطل (Suspended)' : 'نشط (Active)',
          rawStatus,
        };
      });

      setRestaurantsList(list);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

 useEffect(() => {
  if (!authorized) return;

  const loadRestaurants = async () => {
    if (!isCurrentSuperAdmin()) return;

    setLoading(true);

    try {
      const querySnapshot = await getDocs(collection(db, 'restaurants'));

      const list: RestaurantRecord[] = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        let planFormatted = data.plan as string | undefined;

        if (data.plan === 'yearly') planFormatted = 'سنوي (1 Year)';
        else if (data.plan === 'quarterly') planFormatted = '3 أشهر (Quarterly)';
        else if (data.plan === 'monthly') planFormatted = 'شهري (Monthly)';

        const rawStatus: RestaurantStatus =
          data.status === 'suspended' ? 'suspended' : 'active';

        return {
          id: docSnap.id,
          name: data.name,
          owner: data.owner,
          email: data.email,
          plan: planFormatted || '',
          status:
            rawStatus === 'suspended'
              ? 'معطل (Suspended)'
              : 'نشط (Active)',
          rawStatus,
        };
      });

      setRestaurantsList(list);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  void loadRestaurants();
}, [authorized]);

  const handleToggleSuspend = async (
    restaurantId: string,
    currentRawStatus: RestaurantStatus
  ) => {
    if (!isCurrentSuperAdmin()) {
      navigate('/login', { replace: true });
      return;
    }

    const newStatus: RestaurantStatus =
      currentRawStatus === 'suspended' ? 'active' : 'suspended';

    try {
      await updateDoc(doc(db, 'restaurants', restaurantId), {
        status: newStatus,
      });
      await fetchRestaurants();
    } catch (error) {
      console.error('Error updating restaurant status:', error);
    }
  };

  const handleDeleteRestaurant = async (restaurantId: string) => {
    if (!isCurrentSuperAdmin()) {
      navigate('/login', { replace: true });
      return;
    }

    if (
      window.confirm(
        adminTranslations[lang]?.confirmDelete ||
          'هل أنت متكد من رغبتك في حذف هذا المطعم نهائياً؟'
      )
    ) {
      try {
        await deleteDoc(doc(db, 'restaurants', restaurantId));
        await fetchRestaurants();
      } catch (error) {
        console.error('Error deleting restaurant:', error);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } finally {
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      navigate('/login', { replace: true });
    }
  };

  if (!authReady || (auth.currentUser && !authorized)) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!authorized) return null;

  const stats = {
    totalRestaurants: restaurantsList.length,
    activeSubscriptions: restaurantsList.filter((r) => r.rawStatus !== 'suspended').length,
    pendingRenewals: 2,
    totalRevenue: ` ${restaurantsList.length * 15000} DZD`,
  };

  const t = adminTranslations[lang];
  const navigationItems: Array<{
    id: DashboardTab;
    icon: typeof LayoutDashboard;
    label: string;
  }> = [
    { id: 'overview', icon: LayoutDashboard, label: t.overview },
    { id: 'restaurants', icon: Store, label: t.restaurants },
    { id: 'subscriptions', icon: CreditCard, label: t.subscriptions },
    { id: 'settings', icon: Settings, label: t.settings },
  ];

  const handleAddRestaurant = () => {
    void fetchRestaurants();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <aside className="w-64 bg-slate-900 text-slate-300 flex-col justify-between p-6 shadow-xl hidden md:flex">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-slate-950 p-2 rounded-xl font-bold text-xl">MF</div>
            <div>
              <h2 className="text-white font-bold text-lg">MenuFlow</h2>
              <span className="text-xs text-amber-400 font-semibold">Super Admin Panel</span>
            </div>
          </div>

          <nav className="space-y-2">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                  activeTab === item.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                    : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition"
        >
          <LogOut size={18} />
          <span>{t.logout}</span>
        </button>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{t.dashboardTitle}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{t.welcome}</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Language)}
              className="bg-slate-100 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-semibold outline-none cursor-pointer"
            >
              <option value="ar">العربية</option>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
        </header>

        <div className="p-8 space-y-8">
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400">{t.totalRest}</p>
                    <p className="text-3xl font-extrabold text-slate-800 mt-2">{stats.totalRestaurants}</p>
                  </div>
                  <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><Store size={24} /></div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400">{t.activeSub}</p>
                    <p className="text-3xl font-extrabold text-green-600 mt-2">{stats.activeSubscriptions}</p>
                  </div>
                  <div className="p-4 bg-green-50 text-green-600 rounded-2xl"><CheckCircle size={24} /></div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400">{t.pendingSub}</p>
                    <p className="text-3xl font-extrabold text-amber-600 mt-2">{stats.pendingRenewals}</p>
                  </div>
                  <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl"><AlertCircle size={24} /></div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400">{t.revenue}</p>
                    <p className="text-2xl font-extrabold text-slate-900 mt-2">{stats.totalRevenue}</p>
                  </div>
                  <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl"><TrendingUp size={24} /></div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-lg">{t.recentActivity}</h3>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-sm"
                  >
                    {t.addRestaurantBtn}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className={`w-full border-collapse ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 text-xs">
                        <th className="pb-3">{t.name}</th>
                        <th className="pb-3">{t.owner}</th>
                        <th className="pb-3">{t.plan}</th>
                        <th className="pb-3">{t.status}</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-slate-700 divide-y divide-slate-50">
                      {loading ? (
                        <tr><td colSpan={4} className="py-4 text-center text-slate-400">جاري التحميل...</td></tr>
                      ) : restaurantsList.length === 0 ? (
                        <tr><td colSpan={4} className="py-4 text-center text-slate-400">لا توجد مطاعم مسجلة بعد</td></tr>
                      ) : (
                        restaurantsList.slice(-3).map((rest) => (
                          <tr key={rest.id}>
                            <td className="py-3 font-bold text-slate-800">{rest.name}</td>
                            <td className="py-3 text-slate-500">{rest.owner}</td>
                            <td className="py-3"><span className="bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-md text-xs font-semibold">{rest.plan}</span></td>
                            <td className="py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${rest.rawStatus === 'suspended' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{rest.status}</span></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'restaurants' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{t.restaurants}</h2>
                  <p className="text-xs text-slate-500 mt-1">{t.addRestDesc}</p>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-sm"
                >
                  {t.addRestaurantBtn}
                </button>
              </div>

              <div className="overflow-x-auto pt-2">
                <table className={`w-full border-collapse ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs">
                      <th className="pb-3">{t.name}</th>
                      <th className="pb-3">{t.owner}</th>
                      <th className="pb-3">البريد الإلكتروني</th>
                      <th className="pb-3">{t.plan}</th>
                      <th className="pb-3">{t.status}</th>
                      <th className="pb-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-slate-700 divide-y divide-slate-50">
                    {loading ? (
                      <tr><td colSpan={6} className="py-4 text-center text-slate-400">جاري التحميل...</td></tr>
                    ) : restaurantsList.length === 0 ? (
                      <tr><td colSpan={6} className="py-4 text-center text-slate-400">لا توجد مطاعم مسجلة بعد</td></tr>
                    ) : (
                      restaurantsList.map((rest) => (
                        <tr key={rest.id}>
                          <td className="py-3.5 font-bold text-slate-800">{rest.name}</td>
                          <td className="py-3.5 text-slate-600">{rest.owner}</td>
                          <td className="py-3.5 text-slate-500" dir="ltr">{rest.email}</td>
                          <td className="py-3.5"><span className="bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-md text-xs font-semibold">{rest.plan}</span></td>
                          <td className="py-3.5"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${rest.rawStatus === 'suspended' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{rest.status}</span></td>
                          <td className="py-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleToggleSuspend(rest.id, rest.rawStatus)}
                                title={rest.rawStatus === 'suspended' ? 'تفعيل الاشتراك' : 'إلغاء التفعيل/التعليق'}
                                className={`p-2 rounded-xl transition ${rest.rawStatus === 'suspended' ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
                              >
                                <Ban size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteRestaurant(rest.id)}
                                title="حذف نهائي من قاعدة البيانات"
                                className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'subscriptions' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h2 className="text-xl font-bold text-slate-800">{t.subscriptions}</h2>
              <p className="text-sm text-slate-500">{t.subDesc}</p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h2 className="text-xl font-bold text-slate-800">{t.settings}</h2>
              <p className="text-sm text-slate-500">{t.settingsDesc}</p>
            </div>
          )}
        </div>
      </main>

      <AddRestaurantModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddRestaurant}
        lang={lang}
      />
    </div>
  );
};