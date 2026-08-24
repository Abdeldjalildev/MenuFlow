 import React, { useState, useEffect, type ChangeEvent } from 'react';
import { db } from '../../../firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { Palette, Image as ImageIcon, Sparkles, Save, CheckCircle2, Upload, Link as LinkIcon, Eye, RotateCcw } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { translations } from '../../../utils/translations/merchantTranslations';

type Language = 'ar' | 'fr' | 'en';

interface ThemeSettingsProps {
  lang?: Language;
}

export const ThemeSettings: React.FC<ThemeSettingsProps> = (props) => {
  const outletContext = useOutletContext<{ lang: Language }>() || {};
  const lang = props.lang || outletContext.lang || 'ar';
  const t = translations[lang].themeSettings;

  // --- 1. العامة ---
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#f1f5f9');

  // --- 2. صفحة الترحيب (Welcome Screen) ---
  const [welcomeBgType, setWelcomeBgType] = useState<'color' | 'image'>('color');
  const [welcomeBgColor, setWelcomeBgColor] = useState('#ffffff');
  const [welcomeBgImage, setWelcomeBgImage] = useState('');
  const [welcomeBgOpacity, setWelcomeBgOpacity] = useState(100);
  const [welcomeBgBlur, setWelcomeBgBlur] = useState(0);

  // --- 3. صفحة المنيو (Menu Screen) ---
  const [menuBannerUrl, setMenuBannerUrl] = useState('');
  const [menuBgType, setMenuBgType] = useState<'color' | 'image'>('color');
  const [menuBgColor, setMenuBgColor] = useState('#f8fafc');
  const [menuBgImage, setMenuBgImage] = useState('');
  const [menuBgOpacity, setMenuBgOpacity] = useState(100);
  const [menuBgBlur, setMenuBgBlur] = useState(0);

  // --- Control States ---
  const [previewTab, setPreviewTab] = useState<'welcome' | 'menu'>('menu');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // ✅ جلب إعدادات الثيم الخاصة بالمطعم الحالي فقط
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const restaurantId = localStorage.getItem('restaurantId');
        if (!restaurantId) {
          setLoading(false);
          return;
        }

        const themeDoc = await getDoc(doc(db, 'restaurants', restaurantId, 'settings', 'theme'));
        if (themeDoc.exists()) {
          const data = themeDoc.data();
          setLogoUrl(data.logoUrl || '');
          setPrimaryColor(data.primaryColor || '#2563eb');
          setSecondaryColor(data.secondaryColor || '#f1f5f9');

          setWelcomeBgType(data.welcomeBgType || 'color');
          setWelcomeBgColor(data.welcomeBgColor || '#ffffff');
          setWelcomeBgImage(data.welcomeBgImage || '');
          setWelcomeBgOpacity(data.welcomeBgOpacity ?? 100);
          setWelcomeBgBlur(data.welcomeBgBlur ?? 0);

          setMenuBannerUrl(data.menuBannerUrl || data.bannerUrl || '');
          setMenuBgType(data.menuBgType || data.bgType || 'color');
          setMenuBgColor(data.menuBgColor || data.bgColor || '#f8fafc');
          setMenuBgImage(data.menuBgImage || data.bgImageUrl || '');
          setMenuBgOpacity(data.menuBgOpacity ?? 100);
          setMenuBgBlur(data.menuBgBlur ?? 0);
        }
      } catch (err) {
        console.error("Error fetching theme:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTheme();
  }, []);
    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>, setter: (value: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { 
        alert(t.sizeWarning || 'حجم الصورة كبير جداً (الأقصى 2MB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setter(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // ✅ حفظ إعدادات الثيم مربوطة بالمطعم الحالي
  const handleSave = async () => {
    const restaurantId = localStorage.getItem('restaurantId');
    if (!restaurantId) {
      alert("خطأ: لم يتم العثور على معرف المطعم.");
      return;
    }

    setSaving(true);
    setSavedSuccess(false);
    try {
      await setDoc(doc(db, 'restaurants', restaurantId, 'settings', 'theme'), {
        restaurantId,
        logoUrl,
        primaryColor,
        secondaryColor,
        welcomeBgType,
        welcomeBgColor,
        welcomeBgImage,
        welcomeBgOpacity,
        welcomeBgBlur,

        menuBannerUrl,
        menuBgType,
        menuBgColor,
        menuBgImage,
        menuBgOpacity,
        menuBgBlur,

        updatedAt: new Date()
      }, { merge: true });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving theme:", err);
      alert(t.saveError || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  // ✅ 🔄 إعادة الضبط للمطعم الحالي فقط
  const handleResetToDefault = async () => {
    const restaurantId = localStorage.getItem('restaurantId');
    if (!restaurantId) return;

    const confirmReset = window.confirm(
      lang === 'ar' 
        ? 'هل أنت تأكد من إلغاء التصميم المخصص والعودة للتصميم الافتراضي للتطبيق؟' 
        : 'Are you sure you want to reset and remove the custom theme?'
    );

    if (!confirmReset) return;

    setResetting(true);
    try {
      await deleteDoc(doc(db, 'restaurants', restaurantId, 'settings', 'theme'));
      
      setLogoUrl('');
      setPrimaryColor('#2563eb');
      setSecondaryColor('#f1f5f9');
      setWelcomeBgType('color');
      setWelcomeBgColor('#ffffff');
      setWelcomeBgImage('');
      setWelcomeBgOpacity(100);
      setWelcomeBgBlur(0);
      setMenuBannerUrl('');
      setMenuBgType('color');
      setMenuBgColor('#f8fafc');
      setMenuBgImage('');
      setMenuBgOpacity(100);
      setMenuBgBlur(0);

      alert(lang === 'ar' ? 'تم إلغاء التصميم والعودة للوضع الافتراضي بنجاح! 🎉' : 'Theme reset successfully!');
    } catch (err) {
      console.error("Error resetting theme:", err);
      alert(lang === 'ar' ? 'حدث خطأ أثناء إلغاء التصميم' : 'Error resetting theme');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8 flex items-center justify-center">
        <p className="animate-pulse text-sm text-slate-400">{t.loading || 'جاري التحميل...'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 sm:p-8 space-y-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Palette className="text-amber-500" />
            <span>{t.title || 'تخصيص الواجهات'}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t.subtitle || 'تخصيص الشعار والألوان وصور الخلفيات لصفحتي الترحيب والمنيو'}
          </p>
        </div>

        <div className="flex items-center gap-3">
           <button
            type="button"
            onClick={handleResetToDefault}
            disabled={resetting || saving}
            className="bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-800/50 font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer text-xs flex items-center gap-2"
          >
            <RotateCcw size={16} className={resetting ? "animate-spin" : ""} />
            <span>{resetting ? 'جاري الإلغاء...' : 'استعادة الافتراضي'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || resetting}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-amber-500/10 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer text-xs"
          >
            {saving ? (
              <span className="animate-spin text-sm">⏳</span>
            ) : savedSuccess ? (
              <>
                <CheckCircle2 size={18} />
                <span>{t.saved || 'تم الحفظ!'}</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>{t.save || 'حفظ التغييرات'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* 1. الشعار والألوان العامة */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-5">
            <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
              <ImageIcon size={18} />
              <span>{t.logoAndGeneralColors || 'الشعار والألوان العامة'}</span>
            </h3>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">{t.logoLabel || 'شعار المطعم'}</label>
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <label className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 border border-slate-600 transition-all">
                  <Upload size={16} />
                  <span>{t.uploadFromDevice || 'رفع من الجهاز'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, setLogoUrl)} />
                </label>
                <div className="relative w-full flex-1">
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder={t.urlPlaceholder || 'رابط الصورة...'}
                    className={`w-full bg-slate-900 border border-slate-700 rounded-xl py-2 text-xs text-white focus:border-amber-500 focus:outline-none ${
                      lang === 'ar' ? 'pr-9 pl-4' : 'pl-9 pr-4'
                    }`}
                  />
                  <LinkIcon size={14} className={`absolute top-3 text-slate-500 ${lang === 'ar' ? 'right-3' : 'left-3'}`} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-700/50 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t.primaryColorTitle || 'اللون الرئيسي'}</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0" />
                  <span className="text-xs font-mono text-slate-400">{primaryColor}</span>
                </div>
              </div>
                <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t.secondaryColorTitle || 'اللون الثانوي'}</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0" />
                  <span className="text-xs font-mono text-slate-400">{secondaryColor}</span>
                </div>
              </div>
            </div>
          </div>
           <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
              <Sparkles size={18} />
              <span>{t.welcomeScreenTitle || 'تصميم صفحة الترحيب'}</span>
            </h3>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setWelcomeBgType('color')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${welcomeBgType === 'color' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
              >
                {t.solidColor || 'لون ثابت'}
              </button>
              <button
                type="button"
                onClick={() => setWelcomeBgType('image')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${welcomeBgType === 'image' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
              >
                {t.bgImage || 'صورة خلفية'}
              </button>
            </div>

            {welcomeBgType === 'color' ? (
              <div className="flex items-center gap-3">
                <input type="color" value={welcomeBgColor} onChange={(e) => setWelcomeBgColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0" />
                <span className="text-xs font-mono text-slate-400">{welcomeBgColor}</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <label className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 border border-slate-600 transition-all">
                    <Upload size={16} />
                    <span>{t.uploadFromDevice || 'رفع من الجهاز'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, setWelcomeBgImage)} />
                  </label>
                  <div className="relative w-full flex-1">
                    <input type="text" value={welcomeBgImage} onChange={(e) => setWelcomeBgImage(e.target.value)} placeholder={t.urlPlaceholder || 'رابط الصورة...'} className={`w-full bg-slate-900 border border-slate-700 rounded-xl py-2 text-xs text-white focus:border-amber-500 focus:outline-none ${lang === 'ar' ? 'pr-9 pl-4' : 'pl-9 pr-4'}`} />
                    <LinkIcon size={14} className={`absolute top-3 text-slate-500 ${lang === 'ar' ? 'right-3' : 'left-3'}`} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/50 p-3.5 rounded-xl border border-slate-700/50">
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>{t.opacity || 'الشفافية'}</span>
                      <span className="font-mono text-amber-400">{welcomeBgOpacity}%</span>
                    </div>
                    <input type="range" min="10" max="100" value={welcomeBgOpacity} onChange={(e) => setWelcomeBgOpacity(Number(e.target.value))} className="w-full accent-amber-500 cursor-pointer" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>{t.blur || 'الضبابية (Blur)'}</span>
                      <span className="font-mono text-amber-400">{welcomeBgBlur}px</span>
                    </div>
                    <input type="range" min="0" max="20" value={welcomeBgBlur} onChange={(e) => setWelcomeBgBlur(Number(e.target.value))} className="w-full accent-amber-500 cursor-pointer" />
                  </div>
                </div>
              </div>
            )}
          </div>
            {/* 3. تصميم صفحة المنيو */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
              <Sparkles size={18} />
              <span>{t.menuScreenTitle || 'تصميم صفحة المنيو'}</span>
            </h3>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">{t.bannerLabel || 'صورة الغلاف العلوي'}</label>
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <label className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 border border-slate-600 transition-all">
                  <Upload size={16} />
                  <span>{t.uploadFromDevice || 'رفع من الجهاز'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, setMenuBannerUrl)} />
                </label>
                <div className="relative w-full flex-1">
                  <input type="text" value={menuBannerUrl} onChange={(e) => setMenuBannerUrl(e.target.value)} placeholder={t.urlPlaceholder || 'رابط الصورة...'} className={`w-full bg-slate-900 border border-slate-700 rounded-xl py-2 text-xs text-white focus:border-amber-500 focus:outline-none ${lang === 'ar' ? 'pr-9 pl-4' : 'pl-9 pr-4'}`} />
                  <LinkIcon size={14} className={`absolute top-3 text-slate-500 ${lang === 'ar' ? 'right-3' : 'left-3'}`} />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-700/50 pt-3 space-y-3">
              <label className="block text-xs font-semibold text-slate-300">{t.bgSectionTitle || 'خلفية المنيو'}</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setMenuBgType('color')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${menuBgType === 'color' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
                >
                  {t.solidColor || 'لون ثابت'}
                </button>
                <button
                  type="button"
                  onClick={() => setMenuBgType('image')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${menuBgType === 'image' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
                >
                  {t.bgImage || 'صورة خلفية'}
                </button>
              </div>

              {menuBgType === 'color' ? (
                <div className="flex items-center gap-3 pt-1">
                  <input type="color" value={menuBgColor} onChange={(e) => setMenuBgColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0" />
                  <span className="text-xs font-mono text-slate-400">{menuBgColor}</span>
                </div>
              ) : (
                <div className="space-y-4 pt-1">
                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <label className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 border border-slate-600 transition-all">
                      <Upload size={16} />
                      <span>{t.uploadFromDevice || 'رفع من الجهاز'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, setMenuBgImage)} />
                      </label>
                    <div className="relative w-full flex-1">
                      <input type="text" value={menuBgImage} onChange={(e) => setMenuBgImage(e.target.value)} placeholder={t.urlPlaceholder || 'رابط الصورة...'} className={`w-full bg-slate-900 border border-slate-700 rounded-xl py-2 text-xs text-white focus:border-amber-500 focus:outline-none ${lang === 'ar' ? 'pr-9 pl-4' : 'pl-9 pr-4'}`} />
                      <LinkIcon size={14} className={`absolute top-3 text-slate-500 ${lang === 'ar' ? 'right-3' : 'left-3'}`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/50 p-3.5 rounded-xl border border-slate-700/50">
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>{t.opacity || 'الشفافية'}</span>
                        <span className="font-mono text-amber-400">{menuBgOpacity}%</span>
                      </div>
                      <input type="range" min="10" max="100" value={menuBgOpacity} onChange={(e) => setMenuBgOpacity(Number(e.target.value))} className="w-full accent-amber-500 cursor-pointer" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>{t.blur || 'الضبابية (Blur)'}</span>
                        <span className="font-mono text-amber-400">{menuBgBlur}px</span>
                      </div>
                      <input type="range" min="0" max="20" value={menuBgBlur} onChange={(e) => setMenuBgBlur(Number(e.target.value))} className="w-full accent-amber-500 cursor-pointer" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
          {/* Right Live Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-400 flex items-center gap-1.5">
              <Eye size={16} />
              <span>{t.livePreview || 'المعاينة المباشرة'}</span>
            </h3>

            <div className="bg-slate-800 p-1 rounded-xl flex gap-1 border border-slate-700">
              <button
                type="button"
                onClick={() => setPreviewTab('welcome')}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${previewTab === 'welcome' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                {t.welcomeTab || 'الترحيب'}
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('menu')}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${previewTab === 'menu' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                {t.menuTab || 'المنيو'}
              </button>
            </div>
          </div>

          <div className="w-full rounded-3xl p-4 border border-slate-700 shadow-2xl relative overflow-hidden min-h-120 flex flex-col justify-between transition-all bg-slate-950">
            {previewTab === 'welcome' ? (
              welcomeBgType === 'image' && welcomeBgImage && (
                <div
                  className="absolute inset-0 transition-all pointer-events-none"
                  style={{
                    backgroundImage:` url(${welcomeBgImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: welcomeBgOpacity / 100,
                    filter:` blur(${welcomeBgBlur}px)`
                  }}
                />
              )
            ) : (
              menuBgType === 'image' && menuBgImage && (
                <div
                  className="absolute inset-0 transition-all pointer-events-none"
                  style={{
                    backgroundImage: `url(${menuBgImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: menuBgOpacity / 100,
                    filter: `blur(${menuBgBlur}px)`
                  }}
                />
              )
            )}

            <div
              className="absolute inset-0 -z-10 transition-all"
              style={{
                backgroundColor: previewTab === 'welcome' ? welcomeBgColor : menuBgColor
              }}
            />

            <div className="relative z-10 flex-1 flex flex-col justify-between">
              {previewTab === 'welcome' ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden border-2 shadow-md bg-white" style={{ borderColor: primaryColor }}>
                    {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold text-slate-700">LOGO</span>}
                  </div>
                  <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-white/40 shadow-sm max-w-55">
                    <h4 className="text-xs font-extrabold text-slate-900">أهلاً بك في مطعمنا!</h4>
                    <p className="text-[9px] text-slate-600 mt-1">استمتع بتجربة طعام فريدة مع قائمة مختارة بعناية</p>
                  </div>
                  <button
                    type="button"
                    style={{ backgroundColor: primaryColor }}
                    className="text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md w-full max-w-45"
                  >
                    استعرض قائمة الطعام
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-slate-800">
                  {menuBannerUrl && (
                    <div className="w-full h-20 rounded-2xl overflow-hidden border border-slate-200/60 shadow-sm">
                      <img src={menuBannerUrl} alt="Banner" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex items-center justify-between p-2 rounded-xl shadow-sm border border-slate-200/50" style={{ backgroundColor: secondaryColor }}>
                    <div className="flex items-center gap-2">
                      {logoUrl && <img src={logoUrl} alt="Logo" className="w-7 h-7 rounded-lg object-cover" />}
                      <div>
                        <h4 className="text-[11px] font-bold">منيو فلو</h4>
                        <p className="text-[9px] text-slate-500">أهلاً بك في مطعمنا!</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1.5 overflow-x-auto py-1">
                    <span style={{ backgroundColor: primaryColor }} className="text-white text-[10px] px-3 py-1 rounded-full font-bold">الكل</span>
                    <span style={{ backgroundColor: secondaryColor }} className="text-slate-700 text-[10px] px-3 py-1 rounded-full font-semibold">برجر</span>
                    <span style={{ backgroundColor: secondaryColor }} className="text-slate-700 text-[10px] px-3 py-1 rounded-full font-semibold">بيتزا</span>
                  </div>

                  <div className="p-2.5 rounded-xl border border-slate-200/80 shadow-sm flex justify-between items-center bg-white/90 backdrop-blur-sm">
                    <div>
                      <h5 className="text-xs font-bold">برجر كلاسيك فاخر</h5>
                      <p className="text-[10px] font-bold text-slate-700 mt-1">12.5 د.ج</p>
                    </div>
                    <button type="button" style={{ backgroundColor: primaryColor }} className="text-white text-[9px] font-bold px-2.5 py-1.5 rounded-lg shadow-sm">
                      أضف للسلة
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};