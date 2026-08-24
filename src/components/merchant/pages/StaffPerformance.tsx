 import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, onSnapshot, updateDoc, doc, query, where } from 'firebase/firestore';
import { Star, Award, MessageSquare } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { translations } from '../../../utils/translations/merchantTranslations';

type Language = 'ar' | 'fr' | 'en';

interface StaffPerformanceProps {
  lang?: Language;
}

interface StaffPerformanceData {
  id: string;
  name: string;
  role: string;
  completedOrdersCount?: number;
  rating?: number;
  notes?: string;
  restaurantId?: string;
}

export const StaffPerformance: React.FC<StaffPerformanceProps> = (props) => {
  const outletContext = useOutletContext<{ lang: Language }>() || {};
  const lang = props.lang || outletContext.lang || 'ar';
  const t = translations[lang].staffPerformance;

  const [staffData, setStaffData] = useState<StaffPerformanceData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState<string>('');

  // جلب موظفي المطعم الحالي فقط حياً
  useEffect(() => {
    const restaurantId = localStorage.getItem('restaurantId');
    if (!restaurantId) return;

    const q = query(collection(db, 'staff'), where('restaurantId', '==', restaurantId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStaffData(snapshot.docs.map(docSnap => ({ 
        id: docSnap.id, 
        completedOrdersCount: 0, 
        rating: 5, 
        ...docSnap.data() 
      } as StaffPerformanceData)));
    });
    return () => unsubscribe();
  }, []);

  const handleSaveNote = async (id: string) => {
    const staffRef = doc(db, 'staff', id);
    await updateDoc(staffRef, { notes: adminNote });
    setEditingId(null);
  };

  return (
    <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t.title}</h1>
        <p className="text-sm text-slate-500">{t.subtitle}</p>
      </div>

      <div className="bg-linear-to-r from-amber-500 to-orange-600 p-6 rounded-2xl text-white shadow-md flex justify-between items-center">
        <div className="space-y-2">
          <span className="bg-white/20 text-xs px-2.5 py-1 rounded-full font-bold uppercase">{t.featuredCardBadge}</span>
          <h2 className="text-xl font-bold">{t.featuredCardTitle}</h2>
          <p className="text-xs text-amber-100">{t.featuredCardSubtitle}</p>
        </div>
        <Award size={48} className="text-amber-100 opacity-80 shrink-0" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staffData.length === 0 ? (
          <p className="text-slate-400 italic text-center col-span-full py-10">{t.emptyState}</p>
        ) : (
          staffData.map((employee) => (
            <div key={employee.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">{employee.name}</h3>
                  <p className="text-xs text-indigo-600 font-medium mt-0.5">{employee.role}</p>
                </div>
                <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-lg text-xs font-bold">
                  <Star size={14} className="fill-amber-500 text-amber-500" />
                  <span>{employee.rating?.toFixed(1)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl text-center">
                <div>
                  <p className="text-[10px] text-slate-400">{t.completedOrders}</p>
                  <p className="text-sm font-bold text-slate-700 mt-0.5">{employee.completedOrdersCount || 0}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">{t.disciplineLevel}</p>
                  <p className="text-sm font-bold text-green-600 mt-0.5">{t.disciplineExcellent}</p>
                </div>
              </div>

              <div className="border-t pt-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <MessageSquare size={13} className="shrink-0" />
                  <span>{t.adminNotesTitle}</span>
                </div>
                
                {editingId === employee.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder={t.notePlaceholder}
                      className="w-full p-2 border rounded-xl text-xs resize-none h-16"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveNote(employee.id)}
                        className="bg-green-600 text-white text-xs px-3 py-1 rounded-lg font-bold"
                      >
                        {t.saveBtn}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="bg-slate-100 text-slate-500 text-xs px-3 py-1 rounded-lg"
                      >
                        {t.cancelBtn}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start bg-slate-50/50 p-2 rounded-xl border border-dashed">
                    <p className="text-xs text-slate-600 italic">
                      {employee.notes || t.noNotes}
                    </p>
                    <button
                      onClick={() => { setEditingId(employee.id); setAdminNote(employee.notes || ''); }}
                      className={`text-[10px] text-indigo-600 hover:underline shrink-0 ${lang === 'ar' ? 'mr-2' : 'ml-2'}`}
                    >
                      {t.editBtn}
                    </button>
                  </div>
                )}
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
};