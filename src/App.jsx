import { useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ConfigProvider } from './context/ConfigContext';
import { SocketProvider } from './context/SocketContext';
import LicenseGate from './components/LicenseGate';
import SplashScreen, { shouldShowSplash } from './components/SplashScreen';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import TablesPage from './pages/TablesPage';
import InventoryPage from './pages/InventoryPage';
import SalesPage from './pages/SalesPage';
import CashPage from './pages/CashPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="tables" element={<TablesPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="cash" element={<CashPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(shouldShowSplash);

  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  return (
    // HashRouter: funciona abriendo el archivo/app sin un servidor
    // que reescriba rutas (imprescindible para uso 100% local/offline).
    <HashRouter>
      <LicenseGate>
        <ConfigProvider>
          <SocketProvider>
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                style: { background: '#2A2A2A', color: '#F5F5F5', border: '1px solid #333' },
                success: { iconTheme: { primary: '#00C853', secondary: '#000' } },
                error: { iconTheme: { primary: '#F44336', secondary: '#fff' } }
              }}
            />
          </SocketProvider>
        </ConfigProvider>
      </LicenseGate>
    </HashRouter>
  );
}
