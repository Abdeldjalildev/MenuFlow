import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { MenuProvider } from './context/MenuProvider';
import { OrderProvider } from './context/OrderProvider';
import { CartProvider } from './context/CartProvider';
import { CustomerMenu } from './components/customer/CustomerMenu';
import { KitchenDashboard } from './components/kitchen/kitchenDashboard';
import { MerchantDashboard } from './components/merchant/MerchantDashboard';
import { TableEntry } from './pages/TableEntry';
import { StaffScanner } from './pages/StaffScanner';
import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Login } from './pages/auth/Login';
import CashierDashboard from './components/cashier/CashierDashboard';
import DeliveryDashboard from './components/delivery/DeliveryDashboard';
import { SuperAdminDashboard } from './components/Admin/SuperAdminDashboard';
import { MerchantLayout } from './components/merchant/MerchantLayout';
import { Overview } from './components/merchant/pages/Overview';
import { Inventory } from './components/merchant/pages/Inventory';
import { Customers } from './components/merchant/pages/Customers';
import { Suppliers } from './components/merchant/pages/Suppliers';
import { Staff } from './components/merchant/pages/Staff';
import { StaffPerformance } from './components/merchant/pages/StaffPerformance';
import { Expenses } from './components/merchant/pages/Exepenses';
import { WasteLog } from './components/merchant/pages/Wastelog';
import { Complaints } from './components/merchant/pages/Complaints';
import { Reports } from './components/merchant/pages/Reports';
import { ControlPanel } from './components/merchant/pages/ControlPanel';
import { Recipes } from './components/merchant/pages/Recipes';
import { StockTake } from './components/merchant/pages/StockTake';
import { ThemeSettings } from './components/merchant/pages/ThemeSettings';
import { QrCreations } from './components/merchant/pages/QrCreations';
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
    <Routes>
      <Route path="/" element={<TableEntry onStart={() => navigate('/menu' + window.location.search)} lang={lang} setLang={setLang} />} />
      <Route path="/menu" element={<CustomerMenu />} />
      <Route path="/staff" element={<StaffScanner />} />
      <Route path="/login" element={<Login />} />
      <Route path="/super-admin" element={<ProtectedRoute allowedRoles={['SuperAdmin']}><SuperAdminDashboard /></ProtectedRoute>} />
      <Route path="/kitchen" element={<ProtectedRoute allowedRoles={['Kitchen']}><KitchenDashboard /></ProtectedRoute>} />
      <Route path="/cashier" element={<ProtectedRoute allowedRoles={['Cashier']}><CashierDashboard /></ProtectedRoute>} />
      <Route path="/delivery" element={<ProtectedRoute allowedRoles={['Delivery']}><DeliveryDashboard /></ProtectedRoute>} />
      <Route path="/merchant" element={<ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}><MerchantDashboard /></ProtectedRoute>} />
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