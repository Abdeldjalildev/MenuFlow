 import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import { 
  LayoutDashboard, 
  Boxes, 
  ClipboardCheck, 
  Utensils, 
  Truck, 
  Users, 
  TrendingUp, 
  HeartHandshake, 
  Receipt, 
  Trash2, 
  MessageSquareWarning, 
  BarChart3, 
  Palette, 
  Settings, 
  LogOut,
  QrCode // 📱 استيراد أيقونة الـ QR
} from 'lucide-react';
import { translations } from '../../utils/translations/merchantTranslations';

type Language = 'ar' | 'fr' | 'en';

interface SidebarProps {
  lang: Language;
}

export const Sidebar: React.FC<SidebarProps> = ({ lang }) => {
  const t = translations[lang].sidebar;
  const navigate = useNavigate();

  // دالة تسجيل الخروج الفعالة
  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('userRole');
      localStorage.removeItem('restaurantId');
      localStorage.removeItem('userName');
      navigate('/login');
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  const menuItems = [
    { name: t.overview, path: '/merchant/overview', icon: LayoutDashboard },
    { name: t.inventory, path: '/merchant/inventory', icon: Boxes },
    { name: t.stockAudit, path: '/merchant/stock-take', icon: ClipboardCheck },
    { name: t.recipes, path: '/merchant/recipes', icon: Utensils },
    { name: t.suppliers, path: '/merchant/suppliers', icon: Truck },
    { name: t.employees, path: '/merchant/staff', icon: Users },
    { name: t.employeePerformance, path: '/merchant/staff-performance', icon: TrendingUp },
    { name: t.customersLoyalty, path: '/merchant/customers', icon: HeartHandshake },
    { name: t.expenses, path: '/merchant/expenses', icon: Receipt },
    { name: t.wasteLog, path: '/merchant/waste', icon: Trash2 },
    { name: t.complaints, path: '/merchant/complaints', icon: MessageSquareWarning },
    { name: t.reports, path: '/merchant/reports', icon: BarChart3 },
    // 🎨 التبويب لتخصيص المظهر
    { name: lang === 'ar' ? 'تخصيص المظهر' : lang === 'fr' ? 'Personnaliser le thème' : 'Theme Customization', path: '/merchant/theme', icon: Palette },
    // 📱 تبويب إدارة وتوليد أكواد الـ QR الجديد
    { name: lang === 'ar' ? 'إدارة أكواد الـ QR' : lang === 'fr' ? 'Gestion des QR' : 'QR Codes Management', path: '/merchant/qr-codes', icon: QrCode },
  ];

  return (
    <div 
      className={`w-72 bg-[#2d3139] text-slate-300 min-h-screen flex flex-col justify-between p-4 fixed top-0 border-slate-700/50 shadow-2xl z-50 select-none ${
        lang === 'ar' ? 'right-0 border-l' : 'left-0 border-r'
      }`} 
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div>
        {/* هيدر القائمة الجانبية */}
        <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-slate-700/50">
          <div className="bg-amber-500/10 text-amber-500 p-2 rounded-xl font-bold text-lg">
            Op
          </div>
          <div>
            <h2 className="font-bold text-white text-base">{t.opsManagement}</h2>
            <p className="text-[10px] text-slate-400 font-medium">{t.opsSub}</p>
          </div>
        </div>

        {/* عناصر القائمة الجانبية */}
        <nav className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-230px)] px-1 custom-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                      : 'hover:bg-slate-800/60 hover:text-white'
                  }`
                }
              >
                <Icon size={18} className="shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
           {/* العناصر السفلية (لوحة التحكم والخروج) */}
      <div className="border-t border-slate-700/50 pt-4 space-y-1">
        <NavLink
          to="/control-panel"
          className={({ isActive }) =>`
            flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              isActive
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                : 'hover:bg-slate-800/60 hover:text-white'
            }`
          }
        >
          <Settings size={18} className="shrink-0" />
          <span>{t.controlPanel}</span>
        </NavLink>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all text-start cursor-pointer"
        >
          <LogOut size={18} className="shrink-0" />
          <span>{t.logout}</span>
        </button>
      </div>
    </div>
  );
};
          