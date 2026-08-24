import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Globe, Phone } from 'lucide-react';

// دالة لتحديد لغة المتصفح الافتراضية
const getBrowserLanguage = (): 'ar' | 'fr' | 'en' => {
  const browserLang = navigator.language || (navigator as any).userLanguage || 'en';
  if (browserLang.startsWith('ar')) return 'ar';
  if (browserLang.startsWith('fr')) return 'fr';
  return 'en';
};

// قاموس الترجمات المحدث ليدعم خيار الهاتف
const loginTranslations = {
  ar: {
    title: 'تسجيل الدخول',
    subtitle: 'مرحباً بك في منصة MenuFlow',
    loginWithPhone: 'رقم الهاتف',
    loginWithEmail: 'البريد الإلكتروني',
    emailPlaceholder: 'البريد الإلكتروني',
    phonePlaceholder: 'رقم الهاتف (مثال: 077...إلخ)',
    passwordPlaceholder: 'كلمة المرور',
    loginBtn: 'دخول',
    loadingBtn: 'جاري الدخول...',
    errorMsg: 'بيانات الدخول غير صحيحة، يرجى التأكد من الرقم/البريد وكلمة المرور',
    staffNotFound: 'لم يتم العثور على بيانات المستخدم'
  },
  fr: {
    title: 'Connexion',
    subtitle: 'Bienvenue sur MenuFlow',
    loginWithPhone: 'Numéro de téléphone',
    loginWithEmail: 'Adresse e-mail',
    emailPlaceholder: 'Adresse e-mail',
    phonePlaceholder: 'Numéro de téléphone',
    passwordPlaceholder: 'Mot de passe',
    loginBtn: 'Se connecter',
    loadingBtn: 'Connexion en cours...',
    errorMsg: 'E-mail, téléphone ou mot de passe incorrect',
    staffNotFound: 'Données introuvables'
  },
  en: {
    title: 'Sign In',
    subtitle: 'Welcome to MenuFlow',
    loginWithPhone: 'Phone Number',
    loginWithEmail: 'Email Address',
    emailPlaceholder: 'Email Address',
    phonePlaceholder: 'Phone Number',
    passwordPlaceholder: 'Password',
    loginBtn: 'Sign In',
    loadingBtn: 'Signing in...',
    errorMsg: 'Invalid credentials or password',
    staffNotFound: 'User data not found'
  }
};

export const Login: React.FC = () => {
  // الحالة الخاصة باللغة مع دعم الحفظ واستشعار المتصفح
  const [lang, setLang] = useState<'ar' | 'fr' | 'en'>(() => {
    return (localStorage.getItem('preferred_lang') as 'ar' | 'fr' | 'en') || getBrowserLanguage();
  });

  const t = loginTranslations[lang];

  // حالة لتحديد طريقة الدخول (هاتف أو إيميل)
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [inputValue, setInputValue] = useState(''); // سيحمل رقم الهاتف أو البريد المدخل
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // دالة تغيير اللغة وحفظها
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

      // إذا كانت طريقة الدخول هي رقم الهاتف، نقوم بتحويله إلى الإيميل الوهمي المبرمج خلف الكواليس
      if (loginMethod === 'phone') {
        const cleanPhone = authEmail.replace(/\s+/g, '').replace(/[^0-9]/g, '');
        authEmail = `${cleanPhone}@restaurant-staff.local`;
      }

      // 1. محاولة تسجيل الدخول عبر Firebase Auth باستخدام الإيميل (الحقيقي أو الوهمي المبني على الهاتف)
      await signInWithEmailAndPassword(auth, authEmail, password);
      
      // 2. التحقق مما إذا كان البريد هو بريدك الخاص بالمدير العام (Super Admin)
      if (authEmail === 'abdeldjalilkhalfa2@gmail.com') {
        localStorage.setItem('userRole', 'SuperAdmin');
        localStorage.setItem('userName', 'Abdeljalil Khalfa');
        navigate('/super-admin');
        return;
      }
      
      // 3. البحث عن بيانات الموظف في Firestore إما بالبريد الإلكتروني الحقيقي أو برقم الهاتف
      let staffQuery;
      if (loginMethod === 'phone') {
        staffQuery = query(collection(db, 'staff'), where('phone', '==', inputValue.trim()));
      } else {
        staffQuery = query(collection(db, 'staff'), where('email', '==', authEmail));
      }
      
      let querySnapshot = await getDocs(staffQuery);

      // احتياطاً: إن لم يتم العثور بالهاتف المباشر، نبحث عبر الإيميل المرتبط
      if (querySnapshot.empty && loginMethod === 'phone') {
        const fallbackQuery = query(collection(db, 'staff'), where('email', '==', authEmail));
        querySnapshot = await getDocs(fallbackQuery);
      }

      if (!querySnapshot.empty) {
        const staffData = querySnapshot.docs[0].data();
        
        localStorage.setItem('restaurantId', staffData.restaurantId);
        localStorage.setItem('userRole', staffData.role);
        localStorage.setItem('userName', staffData.name);

        // التوجيه الذكي حسب الدور
        if (staffData.role === 'Admin') navigate('/merchant/overview');
        else if (staffData.role === 'Cashier') navigate('/cashier');
        else if (staffData.role === 'Kitchen') navigate('/kitchen');
        else navigate('/delivery');
      } else {
        // التحقق كـ مطعم مسجل مباشرة (Restaurants Collection)
        const restaurantQuery = query(collection(db, 'restaurants'), where('email', '==', authEmail));
        const restSnapshot = await getDocs(restaurantQuery);
        
        if (!restSnapshot.empty) {
          const restData = restSnapshot.docs[0].data();
          localStorage.setItem('restaurantId', restSnapshot.docs[0].id);
          localStorage.setItem('userRole', 'Admin');
          localStorage.setItem('userName', restData.owner || restData.name);
          navigate('/merchant/overview');
        } else {
          throw new Error(t.staffNotFound);
        }
      }
    } catch (err: any) {
      setError(t.errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm space-y-5 relative">
        {/* زر تبديل اللغة السريع */}
        <div className="flex justify-end items-center gap-1">
          <Globe size={16} className="text-slate-400" />
          <select 
            value={lang} 
            onChange={(e) => handleLanguageChange(e.target.value as 'ar' | 'fr' | 'en')}
            className="text-xs bg-slate-100 border-none rounded-lg p-1 text-slate-700 font-semibold cursor-pointer focus:outline-none"
          >
            <option value="ar">العربية</option>
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">{t.title}</h2>
          <p className="text-slate-500 text-sm mt-1">{t.subtitle}</p>
        </div>

        {/* أزرار التبديل بين طريقة الدخول بالهاتف أو البريد */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => { setLoginMethod('phone'); setInputValue(''); }}
            className={`py-2 text-xs font-bold rounded-lg transition ${
              loginMethod === 'phone' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {t.loginWithPhone}
          </button>
          <button
            type="button"
            onClick={() => { setLoginMethod('email'); setInputValue(''); }}
              className={`py-2 text-xs font-bold rounded-lg transition ${
              loginMethod === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {t.loginWithEmail}
          </button>
        </div>

        {error && <p className="text-red-500 text-xs text-center bg-red-50 p-2.5 rounded-xl">{error}</p>}

        <div className="space-y-4">
          {/* حقل الإدخال المتغير (هاتف أو إيميل) لمنع أخطاء المتصفح */}
          <div className="relative">
            {loginMethod === 'phone' ? (
              <Phone className={`absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-3.5 text-slate-400`} size={18} />
            ) : (
              <Mail className={`absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-3.5 text-slate-400`} size={18} />
            )}
            <input
              type={loginMethod === 'phone' ? 'text' : 'email'}
              placeholder={loginMethod === 'phone' ? t.phonePlaceholder : t.emailPlaceholder}
              className={`w-full p-3 ${lang === 'ar' ? 'pl-10' : 'pr-10'} border rounded-xl text-sm`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              required
              autoComplete={loginMethod === 'phone' ? 'username' : 'email'} 
              dir="ltr"
            />
          </div>

          <div className="relative">
            <Lock className={`absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-3.5 text-slate-400`} size={18} />
            <input
              type="password"
              placeholder={t.passwordPlaceholder}
              className={`w-full p-3 ${lang === 'ar' ? 'pl-10' : 'pr-10'} border rounded-xl text-sm`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              dir="ltr"
            />
          </div>
        </div>

        <button
          disabled={loading}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition text-sm shadow-md"
        >
          {loading ? t.loadingBtn : t.loginBtn}
        </button>
      </form>
    </div>
  );
};