import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMenu } from '../../context/MenuContext';
import { useCart } from '../../context/CartContext';
import { OrderContext } from '../../context/OrderProvider';
import { TableEntry } from '../../pages/TableEntry';
import { AIChat } from './AiChat';
import { MenuHeader } from './MenuHeader';
import { CategoryTabs } from './CategoryTabs';
import { MenuGrid } from './MenuGrid';
import { CheckoutBar } from './CheckoutBar';
import { MenuOrOrderManager } from './MenuOrderManager';
import { MyReceipts } from '../customer/MyReceipts';
import { customerTranslations } from '../../utils/translations/customerTranslations';

// 👈 استيراد Firestore والجلب الحي للتخفيضات والثيم
import { db } from '../../firebase';
import { doc, updateDoc, onSnapshot, getDoc, query, where, collection, getDocs } from 'firebase/firestore';
import { Tag } from 'lucide-react';

interface ThemeConfig {
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  // 🎯 إضافة خيارات المنيو والـ Banner إلى الأنواع
  menuBgType: 'color' | 'image';
  menuBgColor: string;
  menuBgImage: string;
  menuBgOpacity: number;
  menuBgBlur: number;
  menuBannerUrl: string;
}

const DEFAULT_THEME: ThemeConfig = {
  logoUrl: '',
  primaryColor: '#4f46e5',
  secondaryColor: '#e0e7ff',
  menuBgType: 'color',
  menuBgColor: '',
  menuBgImage: '',
  menuBgOpacity: 100,
  menuBgBlur: 0,
  menuBannerUrl: '',
};

export const CustomerMenu: React.FC = () => {
  const { menuItems, themeColor, currentTable, setTable } = useMenu();
  const { orders, placeOrder } = useContext(OrderContext);
  const { cart, notes, handleAddToCart, updateNote, cartCount, clearCart } = useCart();
  const [searchParams] = useSearchParams();
  
  const [hasStarted, setHasStarted] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isOrderPlaced, setIsOrderPlaced] = useState(false);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showReceipts, setShowReceipts] = useState(false);

  // 🎨 حالة الثيم
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);

  // 🎯 نسبة الخصم المفعّلة للزبون الحالي
  const [activeDiscount, setActiveDiscount] = useState<number>(0);

  const [lang, setLangState] = useState<'ar' | 'en' | 'fr'>(() => {
    const savedLang = localStorage.getItem('app_lang');
    return (savedLang === 'en' || savedLang === 'fr' || savedLang === 'ar') ? savedLang : 'ar';
  });

  const setLang = (newLang: 'ar' | 'en' | 'fr') => {
    setLangState(newLang);
    localStorage.setItem('app_lang', newLang);
  };

  const t = (key: string): string => {
    return customerTranslations[lang]?.[key as keyof typeof customerTranslations['ar']] ||  
           customerTranslations['ar']?.[key as keyof typeof customerTranslations['ar']] ||  
           key;
  };

  // دالة جلب معرف المطعم الحالي لضمان العزل
  const getRestaurantId = () => {
    return searchParams.get('restaurantId') || localStorage.getItem('restaurantId') || 'default_restaurant';
  };

// 🎨 جلب إعدادات الثيم والهوية البصرية من Firestore مع دعم العزل التام للمطعم
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const currentRestaurantId = getRestaurantId(); // 👈 استخراج معرف المطعم الحالي لضمان العزل
        
        // 👈 جلب الثيم من مسار المطعم المعزول (حسب هيكلة قواعد البيانات لديك)
        const themeDoc = await getDoc(doc(db, 'restaurants', currentRestaurantId, 'settings', 'theme'));
        
        if (themeDoc.exists()) {
          const data = themeDoc.data();
          setTheme({
            logoUrl: data.logoUrl || DEFAULT_THEME.logoUrl,
            primaryColor: data.primaryColor || DEFAULT_THEME.primaryColor,
            secondaryColor: data.secondaryColor || DEFAULT_THEME.secondaryColor,
            // 🎯 جلب خصائص المنيو والغلاف الخاصة بهذا المطعم فقط
            menuBgType: data.menuBgType || DEFAULT_THEME.menuBgType,
            menuBgColor: data.menuBgColor || DEFAULT_THEME.menuBgColor,
            menuBgImage: data.menuBgImage || DEFAULT_THEME.menuBgImage,
            menuBgOpacity: data.menuBgOpacity ?? DEFAULT_THEME.menuBgOpacity,
            menuBgBlur: data.menuBgBlur ?? DEFAULT_THEME.menuBgBlur,
            menuBannerUrl: data.menuBannerUrl || data.bannerUrl || DEFAULT_THEME.menuBannerUrl,
          });
        }
      } catch (error) {
        console.error("Error fetching theme in CustomerMenu:", error);
      }
    };
    fetchTheme();
  }, [searchParams]);

  // 1️⃣ استخراج أو إنشاء معرف متصفح الزبون
  const getCustomerId = () => {
    let customerBrowserId = localStorage.getItem('menu_customer_id');
    if (!customerBrowserId) {
      customerBrowserId = 'c_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      localStorage.setItem('menu_customer_id', customerBrowserId);
    }
    return customerBrowserId;
  };

  // 2️⃣ الاستماع الحي لقيمة التخفيض المفعلة للزبون من Firestore
  useEffect(() => {
    const customerId = getCustomerId();
    const unsub = onSnapshot(doc(db, 'customers', customerId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setActiveDiscount(Number(data.activeDiscount || 0));
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const tableFromUrl = searchParams.get('table');
    setTable(tableFromUrl ? tableFromUrl : '0');
    setIsChecking(false);
  }, [searchParams, setTable]);

  const prepareOrderPayloadData = () => {
    let totalAmount = 0;
    const formattedItems = Object.keys(cart).map(id => {
      const item: any = menuItems.find((m: any) => m.id === id || m._id === id);
      const quantity = cart[id];
      const originalPrice = Number(item?.price || 0);
      
      const discountedPrice = activeDiscount > 0 
        ? originalPrice * (1 - activeDiscount / 100) 
        : originalPrice;

      const itemTotal = discountedPrice * quantity;
      totalAmount += itemTotal;

      const rawNameAr = typeof item?.name === 'object' ? item?.name?.ar : (item?.nameAr || item?.name || '');
      return {
        id,
        menuItemId: id,
        recipeId: item?.recipeId || null,
        name: rawNameAr || 'وجبة',
        nameAr: rawNameAr,
        price: discountedPrice,
        originalPrice: originalPrice,
        quantity: quantity,
        note: notes[id] || '',
        image: item?.image || ''
      };
    });

    return { formattedItems, totalAmount };
  };

  const handleCheckout = async () => {
    if (!cart || Object.keys(cart).length === 0) {
      console.error("الطلب فارغ!");
      return;
    }

    const customerBrowserId = getCustomerId();
    const currentRestaurantId = getRestaurantId();
    const { formattedItems, totalAmount } = prepareOrderPayloadData();

    if (currentOrder && currentOrder.id) {
      try {
        const appendedItems = formattedItems.map(item => ({
          ...item,
          isAppended: true
        }));

        const updatedItems = [...(currentOrder.items || []), ...appendedItems];
        const newTotalAmount = Number(currentOrder.totalAmount || currentOrder.totalPrice || 0) + totalAmount;
        const orderRef = doc(db, "orders", currentOrder.id);
        await updateDoc(orderRef, {
          items: updatedItems,
          totalAmount: newTotalAmount,
          totalPrice: newTotalAmount
        });
        setIsOrderPlaced(true);
        if (clearCart) clearCart();
      } catch (error) {
        console.error("خطأ أثناء إضافة العناصر للطلب الحالي:", error);
      }
      return;
    }

    if (currentTable && currentTable !== '0') {
      try {
        await placeOrder(formattedItems, currentTable, null, totalAmount, { 
          customerId: customerBrowserId,
          appliedDiscountPercent: activeDiscount,
          restaurantId: currentRestaurantId // 👈 عزل الطلب بمعرف المطعم
        });
        setIsOrderPlaced(true);
        if (clearCart) clearCart();
      } catch (error) {
        console.error("خطأ أثناء الإرسال للطاولة:", error);
      }
    } else {
      setShowDeliveryForm(true);
    }
  };
 const handleFinalSubmit = async (deliveryInfo: { name: string; address: string; phone: string }) => {
  try {
    const customerBrowserId = getCustomerId();
    const currentRestaurantId = getRestaurantId();
    const { formattedItems, totalAmount } = prepareOrderPayloadData();

    // 🔍 جلب أول موظف توصيل (Delivery) نشط تابع لهذا المطعم تلقائياً لربطه بالطلب
    let assignedDriverName = 'غير محدد';
    let assignedDriverPhone = '';

    try {
      const staffQuery = query(
        collection(db, 'staff'),
        where('restaurantId', '==', currentRestaurantId),
        where('role', '==', 'delivery'),
        where('status', '==', 'active')
      );
      const staffSnapshot = await getDocs(staffQuery);
      if (!staffSnapshot.empty) {
        const driverData = staffSnapshot.docs[0].data();
        assignedDriverName = driverData.name || 'غير محدد';
        assignedDriverPhone = driverData.phone || '';
      }
    } catch (staffErr) {
      console.warn("تعذر جلب السائق تلقائياً، سيتم ترك القيمة افتراضية:", staffErr);
    }

    // إرسال الطلب مع بيانات السائق الحقيقية المستخرجة من جدول الـ Staff
    await placeOrder(formattedItems, '0', deliveryInfo, totalAmount, { 
      customerId: customerBrowserId,
      appliedDiscountPercent: activeDiscount,
      restaurantId: currentRestaurantId,
      driverName: assignedDriverName,
      driverPhone: assignedDriverPhone
    });

    setIsOrderPlaced(true);
    setShowDeliveryForm(false);
    if (clearCart) clearCart();
  } catch (error) {
    console.error("خطأ أثناء إرسال طلب التوصيل:", error);
  }
};

  const filteredItems = activeCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => {
        const itemCat = String(item.category || '').trim().toLowerCase();
        const targetCat = String(activeCategory || '').trim().toLowerCase();
        return itemCat === targetCat;
      });
  
  const localCustomerId = localStorage.getItem('menu_customer_id');

  const currentOrder = currentTable && localCustomerId
    ? orders.find((o: any) => 
        o.tableNumber === currentTable && 
        o.customerId === localCustomerId && 
        o.status !== 'TrackDone'
      ) 
    : null;

  if (isChecking) return null;

  if (!hasStarted) {
    return <TableEntry lang={lang} setLang={setLang} onStart={() => setHasStarted(true)} />;
  }

  const effectivePrimaryColor = theme.primaryColor || themeColor;

  // 🎨 نمط الخلفية الاحترافي: تملأ الشاشة بالكامل cover وتثبت أثناء التمرير
  const pageContainerStyle: React.CSSProperties = {
    backgroundColor: theme.menuBgColor || '#0f172a', // لون خلفية احتياطي داكن أو فاتح
    backgroundImage: theme.menuBgType === 'image' && theme.menuBgImage 
      ? `url('${theme.menuBgImage}')`
      : 'none',
    backgroundSize: 'cover',        // 👈 تغطي الشاشة بالكامل بدون فراغات بيضاء
    backgroundPosition: 'center',   // 👈 تمركز الصورة بدقة
    backgroundRepeat: 'no-repeat',  // 👈 منع التكرار
    backgroundAttachment: 'fixed',  // 👈 تثبيت الخلفية أثناء التمرير لتبدو أنيقة
    minHeight: '100vh',
  };

  return (
    <div 
      className="min-h-screen pb-24 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors relative" 
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      style={pageContainerStyle}
    >
      {/* 🎯 طبقة الشفافية والضبابية فوق خلفية المنيو */}
      {theme.menuBgType === 'image' && theme.menuBgImage && (
        <div 
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backdropFilter: `blur(${theme.menuBgBlur}px)`,
            backgroundColor: `rgba(255, 255, 255, ${1 - theme.menuBgOpacity / 100})`,
          }}
        />
      )}

      <div className="relative z-10">
        <MenuHeader 
          currentTable={currentTable} 
          lang={lang} 
          themeColor={effectivePrimaryColor} 
          logoUrl={theme.logoUrl}
          bannerUrl={theme.menuBannerUrl} // 👈 إضافة رابط البانر للهيدر
          t={t} 
          onOpenReceipts={() => setShowReceipts(true)} 
        />

        {showReceipts ? (
          <MyReceipts
            lang={lang}
            activeOrderId={currentOrder?.id}
            onBack={() => setShowReceipts(false)}
          />
        ) : (
          <main className="max-w-md mx-auto px-4 mt-4">
            
            {/* 🎁 بنر التنبيه بالخصم */}
            {activeDiscount > 0 && !currentOrder && (
              <div className="mb-4 bg-emerald-500 text-white p-3.5 rounded-2xl shadow-lg flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-2.5">
                  <Tag className="w-5 h-5 shrink-0" />
                   <div>
                    <h4 className="font-bold text-sm">تهانينا! لديك خصم مفعّل 🎉</h4>
                    <p className="text-xs text-emerald-100">تم تطبيق تخفيض {activeDiscount}% على جميع الوجبات!</p>
                  </div>
                </div>
                <span className="bg-white text-emerald-600 font-extrabold text-xs px-2.5 py-1 rounded-xl">
                  -{activeDiscount}%
                </span>
              </div>
            )}

            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold">{t('appName')}</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">{t('welcomeMessage')}</p>
            </div>

            <div className="mb-6">
              <AIChat 
                lang={lang} 
                menuItems={menuItems} 
                t={t} 
                themeColor={effectivePrimaryColor || themeColor} 
              />
            </div>
            
            <MenuOrOrderManager
              showDeliveryForm={showDeliveryForm}
              isOrderPlaced={isOrderPlaced}
              currentOrder={currentOrder}
              onDeliveryConfirm={(name, address, phone) => handleFinalSubmit({ name, address, phone })}
              t={t}
              themeColor={effectivePrimaryColor}
            />

            <CategoryTabs 
              items={menuItems} 
              activeCategory={activeCategory} 
              setActiveCategory={setActiveCategory} 
              themeColor={effectivePrimaryColor} 
              t={t}
            />
            
            <MenuGrid 
              items={filteredItems} 
              cart={cart} 
              notes={notes} 
              onAddToCart={handleAddToCart} 
              onNoteChange={updateNote} 
              themeColor={effectivePrimaryColor}
              lang={lang} 
              t={t} 
              activeDiscount={activeDiscount}
            />
            
            <CheckoutBar 
              cartCount={cartCount} 
              handleCheckout={handleCheckout} 
              themeColor={effectivePrimaryColor} 
              hasActiveOrder={!!currentOrder} 
              t={t} 
              activeDiscount={activeDiscount}
            />
          </main>
        )}
      </div>
    </div>
  );
};