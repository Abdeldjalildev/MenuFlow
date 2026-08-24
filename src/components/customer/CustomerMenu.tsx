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

import { db } from '../../firebase';
import { doc, onSnapshot, getDoc, query, where, collection, getDocs } from 'firebase/firestore';
import { Tag } from 'lucide-react';

interface ThemeConfig {
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
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
  const { orders, placeOrder, appendToOrder } = useContext(OrderContext);
  const { cart, notes, handleAddToCart, updateNote, cartCount, clearCart } = useCart();
  const [searchParams] = useSearchParams();
  
  const [hasStarted, setHasStarted] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isOrderPlaced, setIsOrderPlaced] = useState(false);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showReceipts, setShowReceipts] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);

  // Active discount percentage for the current customer
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

  // Resolve the current restaurant ID to enforce strict data isolation
  const getRestaurantId = () => {
    return searchParams.get('restaurantId') || localStorage.getItem('restaurantId') || 'default_restaurant';
  };

  // Fetch theme and visual identity settings from Firestore with full restaurant isolation
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const currentRestaurantId = getRestaurantId();
        
        const themeDoc = await getDoc(doc(db, 'restaurants', currentRestaurantId, 'settings', 'theme'));
        
        if (themeDoc.exists()) {
          const data = themeDoc.data();
          setTheme({
            logoUrl: data.logoUrl || DEFAULT_THEME.logoUrl,
            primaryColor: data.primaryColor || DEFAULT_THEME.primaryColor,
            secondaryColor: data.secondaryColor || DEFAULT_THEME.secondaryColor,
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

  // Extract or create a unique browser ID for the customer
  const getCustomerId = () => {
    let customerBrowserId = localStorage.getItem('menu_customer_id');
    if (!customerBrowserId) {
      customerBrowserId = 'c_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      localStorage.setItem('menu_customer_id', customerBrowserId);
    }
    return customerBrowserId;
  };

  // Live listener for the customer's active discount value from Firestore
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
      console.error("Cart is empty!");
      return;
    }

    const customerBrowserId = getCustomerId();
    const currentRestaurantId = getRestaurantId();
    const { formattedItems, totalAmount } = prepareOrderPayloadData();

    if (currentOrder && currentOrder.id) {
      try {
        await appendToOrder(currentOrder.id, formattedItems);
        setIsOrderPlaced(true);
        if (clearCart) clearCart();
      } catch (error) {
        console.error("Error appending items to current order:", error);
      }
      return;
    }

    if (currentTable && currentTable !== '0') {
      try {
        await placeOrder(formattedItems, currentTable, null, totalAmount, { 
          customerId: customerBrowserId,
          appliedDiscountPercent: activeDiscount,
          restaurantId: currentRestaurantId
        });
        setIsOrderPlaced(true);
        if (clearCart) clearCart();
      } catch (error) {
        console.error("Error sending table order:", error);
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

      // Fetch the first active delivery staff member for this restaurant to auto-assign
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
        console.warn("Could not auto-fetch driver, leaving default values:", staffErr);
      }

      // Send the order with real driver data extracted from the staff collection
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
      console.error("Error sending delivery order:", error);
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

  // Reset the order-placed flag when the active order finishes or disappears,
  // allowing the customer to start a fresh order cycle without stale UI state.
  useEffect(() => {
    if (!currentOrder && isOrderPlaced) {
      setIsOrderPlaced(false);
    }
  }, [currentOrder, isOrderPlaced]);

  if (isChecking) return null;

  if (!hasStarted) {
    return <TableEntry lang={lang} setLang={setLang} onStart={() => setHasStarted(true)} />;
  }

  const effectivePrimaryColor = theme.primaryColor || themeColor;

  // Professional background style: full cover, fixed during scroll
  const pageContainerStyle: React.CSSProperties = {
    backgroundColor: theme.menuBgColor || '#0f172a',
    backgroundImage: theme.menuBgType === 'image' && theme.menuBgImage 
      ? `url('${theme.menuBgImage}')`
      : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
    minHeight: '100vh',
  };

  return (
    <div 
      className="min-h-screen pb-24 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors relative" 
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      style={pageContainerStyle}
    >
      {/* Overlay layer for background blur and opacity */}
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
          bannerUrl={theme.menuBannerUrl}
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
            
            {/* Active discount banner */}
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