import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { MenuProvider } from './context/MenuProvider';
import { OrderProvider } from './context/OrderProvider';
import { CartProvider } from './context/CartContext';
import { lazy, Suspense, useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Route-level lazy loading keeps feature-specific code out of the initial bundle.
const CustomerMenu = lazy(() => import('./components/customer/CustomerMenu').then(({ CustomerMenu }) => ({ default: CustomerMenu })));
const KitchenDashboard = lazy(() => import('./components/kitchen/KitchenDashboard').then(({ KitchenDashboard }) => ({ default: KitchenDashboard })));
const MerchantDashboard = lazy(() => import('./components/merchant/MerchantDashboard').then(({ MerchantDashboard }) => ({ default: MerchantDashboard })));
const TableEntry = lazy(() => import('./pages/TableEntry').then(({ TableEntry }) => ({ default: TableEntry })));
const StaffScanner = lazy(() => import('./pages/StaffScanner').then(({ StaffScanner }) => ({ default: StaffScanner })));
const Login = lazy(() => import('./pages/auth/Login').then(({ Login }) => ({ default: Login })));
const CashierDashboard = lazy(() => import('./components/cashier/CashierDashboard'));
const DeliveryDashboard = lazy(() => import('./components/delivery/DeliveryDashboard'));
const SuperAdminDashboard = lazy(() => import('./components/Admin/SuperAdminDashboard').then(({ SuperAdminDashboard }) => ({ default: SuperAdminDashboard })));

const MerchantLayout = lazy(() => import('./components/merchant/MerchantLayout').then(({ MerchantLayout }) => ({ default: MerchantLayout })));
const Overview = lazy(() => import('./components/merchant/pages/Overview').then(({ Overview }) => ({ default: Overview })));
const Inventory = lazy(() => import('./components/merchant/pages/Inventory').then(({ Inventory }) => ({ default: Inventory })));
const Customers = lazy(() => import('./components/merchant/pages/Customers').then(({ Customers }) => ({ default: Customers })));
const Suppliers = lazy(() => import('./components/merchant/pages/Suppliers').then(({ Suppliers }) => ({ default: Suppliers })));
const Staff = lazy(() => import('./components/merchant/pages/Staff').then(({ Staff }) => ({ default: Staff })));
const StaffPerformance = lazy(() => import('./components/merchant/pages/StaffPerformance').then(({ StaffPerformance }) => ({ default: StaffPerformance })));
const Expenses = lazy(() => import('./components/merchant/pages/Expenses').then(({ Expenses }) => ({ default: Expenses })));
const WasteLog = lazy(() => import('./components/merchant/pages/WasteLog').then(({ WasteLog }) => ({ default: WasteLog })));
const Complaints = lazy(() => import('./components/merchant/pages/Complaints').then(({ Complaints }) => ({ default: Complaints })));
const Reports = lazy(() => import('./components/merchant/pages/Reports').then(({ Reports }) => ({ default: Reports })));
const ControlPanel = lazy(() => import('./components/merchant/pages/ControlPanel').then(({ ControlPanel }) => ({ default: ControlPanel })));
const Recipes = lazy(() => import('./components/merchant/pages/Recipes').then(({ Recipes }) => ({ default: Recipes })));
const StockTake = lazy(() => import('./components/merchant/pages/StockTake').then(({ StockTake }) => ({ default: StockTake })));
const ThemeSettings = lazy(() => import('./components/merchant/pages/ThemeSettings').then(({ ThemeSettings }) => ({ default: ThemeSettings })));
const QrCreations = lazy(() => import('./components/merchant/pages/QrCreations').then(({ QrCreations }) => ({ default: QrCreations })));

import { ProtectedRoute } from './routes/ProtectedRouteProps';

function AppRoutes() {
  const [lang, setLang] = useState<'en' | 'ar' | 'fr'>('en');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <Routes>
        {/* المسارات العامة */}
        <Route path="/" element={<TableEntry onStart={() => navigate('/menu' + window.location.search)} lang={lang} setLang={setLang} />} />
        <Route path="/menu" element={<CustomerMenu />} />
        <Route path="/staff" element={<StaffScanner />} />
        <Route path="/login" element={<Login />} />

        {/* المسارات المحمية باستخدام ProtectedRoute */}
        <Route path="/super-admin" element={<ProtectedRoute allowedRoles={['SuperAdmin']}><SuperAdminDashboard /></ProtectedRoute>} />
        <Route path="/kitchen" element={<ProtectedRoute allowedRoles={['Kitchen']}><KitchenDashboard /></ProtectedRoute>} />
        <Route path="/cashier" element={<ProtectedRoute allowedRoles={['Cashier']}><CashierDashboard /></ProtectedRoute>} />
        <Route path="/delivery" element={<ProtectedRoute allowedRoles={['Delivery']}><DeliveryDashboard /></ProtectedRoute>} />

        {/* مسارات صاحب المطعم */}
        <Route path="/merchant" element={<ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}><MerchantDashboard /></ProtectedRoute>} />

        {/* المسار الاحتياطي لمنع الشاشة البيضاء عند الدخول بالرابط القديم */}
        <Route path="/merchant/dashboard" element={<Navigate to="/merchant/overview" replace />} />

        <Route path="/merchant/overview" element={<ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}><MerchantLayout><Overview /></MerchantLayout></ProtectedRoute>} />
        <Route path="/merchant/inventory" element={<ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}><MerchantLayout><Inventory /></MerchantLayout></ProtectedRoute>} />
        <Route path="/merchant/suppliers" element={<ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}><MerchantLayout><Suppliers /></MerchantLayout></ProtectedRoute>} />
        <Route path="/merchant/staff" element={<ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}><MerchantLayout><Staff /></MerchantLayout></ProtectedRoute>} />
        <Route path="/merchant/staff-performance" element={<ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}><MerchantLayout><StaffPerformance /></MerchantLayout></ProtectedRoute>} />
        <Route path="/merchant/customers" element={<ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}><MerchantLayout><Customers /></MerchantLayout></ProtectedRoute>} />
        <Route path="/merchant/expenses" element={<ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}><MerchantLayout><Expenses /></MerchantLayout></ProtectedRoute>} />
        <Route path="/merchant/waste" element={<ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}><MerchantLayout><WasteLog /></MerchantLayout></ProtectedRoute>} />
        <Route path="/merchant/complaints" element={<ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}><MerchantLayout><Complaints /></MerchantLayout></ProtectedRoute>} />
        <Route path="/merchant/reports" element={<ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}><MerchantLayout><Reports /></MerchantLayout></ProtectedRoute>} />
        <Route path="/merchant/recipes" element={<ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}><MerchantLayout><Recipes /></MerchantLayout></ProtectedRoute>} />
        <Route path="/control-panel" element={<ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}><MerchantLayout><ControlPanel /></MerchantLayout></ProtectedRoute>} />
        <Route path="/merchant/stock-take" element={<ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}><MerchantLayout><StockTake /></MerchantLayout></ProtectedRoute>} />
        <Route path="/merchant/theme" element={<ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}><MerchantLayout><ThemeSettings /></MerchantLayout></ProtectedRoute>} />
        <Route path="/merchant/qr-codes" element={<ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}><MerchantLayout><QrCreations /></MerchantLayout></ProtectedRoute>} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <Router>
      <MenuProvider>
        <OrderProvider>
          <CartProvider>
            <div className="min-h-screen bg-gray-50">
              <AppRoutes />
            </div>
          </CartProvider>
        </OrderProvider>
      </MenuProvider>
    </Router>
  );
}

export default App;
