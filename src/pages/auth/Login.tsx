import React, { useState } from 'react';
import { getIdTokenResult, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Globe, Phone } from 'lucide-react';

const getBrowserLanguage = (): 'ar' | 'fr' | 'en' => {
  const browserLang = navigator.language || 'en';
  if (browserLang.startsWith('ar')) return 'ar';
  if (browserLang.startsWith('fr')) return 'fr';
  return 'en';
};

type StaffRole = 'SuperAdmin' | 'Admin' | 'Cashier' | 'Kitchen' | 'Delivery';

const loginTranslations = {
  ar: {
    title: 'تسجيل الدخول', subtitle: 'مرحباً بك في منصة MenuFlow', loginWithPhone: 'رقم الهاتف', loginWithEmail: 'البريد الإلكتروني',
    emailPlaceholder: 'البريد الإلكتروني', phonePlaceholder: 'رقم الهاتف (مثال: 077...إلخ)', passwordPlaceholder: 'كلمة المرور', loginBtn: 'دخول',
    loadingBtn: 'جاري الدخول...', errorMsg: 'بيانات الدخول غير صحيحة، يرجى التأكد من الرقم/البريد وكلمة المرور',
    authorizationError: 'تم تسجيل الدخول، لكن حسابك لا يملك صلاحيات MenuFlow الموثوقة. تواصل مع المسؤول لإضافة الصلاحيات.'
  },
  fr: {
    title: 'Connexion', subtitle: 'Bienvenue sur MenuFlow', loginWithPhone: 'Numéro de téléphone', loginWithEmail: 'Adresse e-mail',
    emailPlaceholder: 'Adresse e-mail', phonePlaceholder: 'Numéro de téléphone', passwordPlaceholder: 'Mot de passe', loginBtn: 'Se connecter',
    loadingBtn: 'Connexion en cours...', errorMsg: 'E-mail, téléphone ou mot de passe incorrect',
    authorizationError: 'Connexion réussie, mais votre compte ne possède pas de permissions MenuFlow vérifiées.'
  },
  en: {
    title: 'Sign In', subtitle: 'Welcome to MenuFlow', loginWithPhone: 'Phone Number', loginWithEmail: 'Email Address',
    emailPlaceholder: 'Email Address', phonePlaceholder: 'Phone Number', passwordPlaceholder: 'Password', loginBtn: 'Sign In',
    loadingBtn: 'Signing in...', errorMsg: 'Invalid credentials or password',
    authorizationError: 'Signed in successfully, but this account has no trusted MenuFlow authorization claims.'
  }
};

const isStaffRole = (value: unknown): value is StaffRole =>
  typeof value === 'string' &&
  ['SuperAdmin', 'Admin', 'Cashier', 'Kitchen', 'Delivery'].includes(value);

const roleDestination = (role: StaffRole): string => {
  switch (role) {
    case 'SuperAdmin': return '/super-admin';
    case 'Admin': return '/merchant/overview';
    case 'Cashier': return '/cashier';
    case 'Kitchen': return '/kitchen';
    case 'Delivery': return '/delivery';
  }
};

export const Login: React.FC = () => {
  const [lang, setLang] = useState<'ar' | 'fr' | 'en'>(() => {
    const stored = localStorage.getItem('preferred_lang');
    return stored === 'ar' || stored === 'fr' || stored === 'en' ? stored : getBrowserLanguage();
  });
  const t = loginTranslations[lang];
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [inputValue, setInputValue] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLanguageChange = (newLang: 'ar' | 'fr' | 'en') => {
    setLang(newLang);
    localStorage.setItem('preferred_lang', newLang);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let authEmail = inputValue.trim();

      if (loginMethod === 'phone') {
        const cleanPhone = authEmail.replace(/\s+/g, '').replace(/[^0-9]/g, '');
        authEmail = `${cleanPhone}@restaurant-staff.local`;
      }

      const userCredential = await signInWithEmailAndPassword(auth, authEmail, password);
      const tokenResult = await getIdTokenResult(userCredential.user, true);
      const role = tokenResult.claims.role;
      const restaurantId = tokenResult.claims.restaurantId;

      if (!isStaffRole(role)) {
        await auth.signOut();
        setError(t.authorizationError);
        return;
      }

      if (role !== 'SuperAdmin' && typeof restaurantId !== 'string') {
        await auth.signOut();
        setError(t.authorizationError);
        return;
      }

      // These values are cached only for non-authoritative UI display.
      // ProtectedRoute and Firestore rules use Firebase Auth claims instead.
      localStorage.setItem('userId', userCredential.user.uid);
      localStorage.setItem('userRole', role);
      localStorage.setItem('userName', userCredential.user.displayName || userCredential.user.email || 'MenuFlow User');

      if (typeof restaurantId === 'string') {
        localStorage.setItem('restaurantId', restaurantId);
      } else {
        localStorage.removeItem('restaurantId');
      }

      navigate(roleDestination(role));
    } catch (loginError) {
      console.error('MenuFlow login failed:', loginError);
      setError(t.errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm space-y-5 relative">
        <div className="flex justify-end items-center gap-1">
          <Globe size={16} className="text-slate-400" />
          <select value={lang} onChange={(e) => handleLanguageChange(e.target.value as 'ar' | 'fr' | 'en')} className="text-xs bg-slate-100 border-none rounded-lg p-1 text-slate-700 font-semibold cursor-pointer focus:outline-none">
            <option value="ar">العربية</option><option value="fr">Français</option><option value="en">English</option>
          </select>
        </div>
        <div className="text-center"><h2 className="text-2xl font-bold text-slate-900">{t.title}</h2><p className="text-slate-500 text-sm mt-1">{t.subtitle}</p></div>
        <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button type="button" onClick={() => { setLoginMethod('phone'); setInputValue(''); }} className={`py-2 text-xs font-bold rounded-lg transition ${loginMethod === 'phone' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{t.loginWithPhone}</button>
          <button type="button" onClick={() => { setLoginMethod('email'); setInputValue(''); }} className={`py-2 text-xs font-bold rounded-lg transition ${loginMethod === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{t.loginWithEmail}</button>
        </div>
        {error && <p className="text-red-500 text-xs text-center bg-red-50 p-2.5 rounded-xl">{error}</p>}
        <div className="space-y-4">
          <div className="relative">
            {loginMethod === 'phone' ? <Phone className={`absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-3.5 text-slate-400`} size={18} /> : <Mail className={`absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-3.5 text-slate-400`} size={18} />}
            <input type={loginMethod === 'phone' ? 'text' : 'email'} placeholder={loginMethod === 'phone' ? t.phonePlaceholder : t.emailPlaceholder} className={`w-full p-3 ${lang === 'ar' ? 'pl-10' : 'pr-10'} border rounded-xl text-sm`} value={inputValue} onChange={(e) => setInputValue(e.target.value)} required autoComplete={loginMethod === 'phone' ? 'username' : 'email'} dir="ltr" />
          </div>
          <div className="relative">
            <Lock className={`absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-3.5 text-slate-400`} size={18} />
            <input type="password" placeholder={t.passwordPlaceholder} className={`w-full p-3 ${lang === 'ar' ? 'pl-10' : 'pr-10'} border rounded-xl text-sm`} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" dir="ltr" />
          </div>
        </div>
        <button disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition text-sm shadow-md">{loading ? t.loadingBtn : t.loginBtn}</button>
      </form>
    </div>
  );
};
