import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Settings, Store, Percent, Truck, Save, CheckCircle, Globe } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { translations } from '../../../utils/translations/merchantTranslations';

type Language = 'ar' | 'fr' | 'en';

interface ControlPanelProps {
  lang?: Language;
  setLang?: (l: Language) => void;
}

interface RestaurantSettings {
  restaurantName: string;
  taxRate: number;
  deliveryFee: number;
  restaurantId?: string;
  updatedAt?: unknown;
}

export const ControlPanel: React.FC<ControlPanelProps> = (props) => {
  const outletContext = useOutletContext<{ lang: Language; setLang: (l: Language) => void }>() || {};
  const lang = props.lang || outletContext.lang || 'ar';
  const setLang = props.setLang || outletContext.setLang || (() => {});
  const restaurantId = localStorage.getItem('restaurantId') || 'default_restaurant';

  const [settings, setSettings] = useState<RestaurantSettings>({ restaurantName: '', taxRate: 0, deliveryFee: 0 });
  const [saved, setSaved] = useState(false);
  const t = translations[lang].controlPanel;

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', restaurantId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings({
          restaurantName: typeof data.restaurantName === 'string' ? data.restaurantName : '',
          taxRate: typeof data.taxRate === 'number' ? data.taxRate : Number(data.taxRate) || 0,
          deliveryFee: typeof data.deliveryFee === 'number' ? data.deliveryFee : Number(data.deliveryFee) || 0,
          restaurantId: typeof data.restaurantId === 'string' ? data.restaurantId : undefined,
          updatedAt: data.updatedAt,
        });
      } else {
        setSettings({ restaurantName: '', taxRate: 0, deliveryFee: 0 });
      }
    });
    return () => unsubscribe();
  }, [restaurantId]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await setDoc(doc(db, 'settings', restaurantId), {
      ...settings,
      restaurantId,
      updatedAt: new Date()
    }, { merge: true });

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t.title}</h1>
          <p className="text-sm text-slate-500">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <Globe size={18} className="text-amber-500 ml-1" />
          <button type="button" onClick={() => setLang('ar')} className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${lang === 'ar' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}>العربية</button>
          <button type="button" onClick={() => setLang('fr')} className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${lang === 'fr' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}>Français</button>
          <button type="button" onClick={() => setLang('en')} className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${lang === 'en' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}>English</button>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <h3 className="font-bold text-slate-700 text-base flex items-center gap-2 border-b pb-3"><Settings size={18} className="text-amber-500" /><span>{t.sectionTitle}</span></h3>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Store size={14} /> {t.restaurantNameLabel}</label>
          <input type="text" value={!settings.restaurantName || settings.restaurantName === 'مطعمنا الجميل' ? t.defaultRestaurantName : settings.restaurantName} placeholder={t.defaultRestaurantName} onChange={(e) => setSettings({ ...settings, restaurantName: e.target.value })} className="w-full p-3 border rounded-xl text-sm" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Percent size={14} /> {t.taxRateLabel}</label>
            <input type="number" value={settings.taxRate} onChange={(e) => setSettings({ ...settings, taxRate: Number(e.target.value) })} className="w-full p-3 border rounded-xl text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Truck size={14} /> {t.deliveryFeeLabel}</label>
            <input type="number" value={settings.deliveryFee} onChange={(e) => setSettings({ ...settings, deliveryFee: Number(e.target.value) })} className="w-full p-3 border rounded-xl text-sm" />
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t">
          {saved ? <span className="text-green-600 text-sm font-semibold flex items-center gap-1 animate-pulse"><CheckCircle size={16} /> {t.savedSuccess}</span> : <div />}
          <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition shadow-md text-sm"><Save size={16} /><span>{t.saveButton}</span></button>
        </div>
      </form>
    </div>
  );
};