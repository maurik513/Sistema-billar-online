import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useConfig } from '../../context/ConfigContext';
import {
  LayoutDashboard, Circle, Package, ShoppingCart, Wallet,
  BarChart3, Settings, Menu, HardDrive
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/tables', icon: Circle, label: 'Mesas' },
  { to: '/sales', icon: ShoppingCart, label: 'Venta Directa' },
  { to: '/cash', icon: Wallet, label: 'Caja' },
  { to: '/inventory', icon: Package, label: 'Inventario' },
  { to: '/reports', icon: BarChart3, label: 'Reportes' },
  { to: '/settings', icon: Settings, label: 'Configuración' },
];

export default function Layout() {
  const { config } = useConfig();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3">
          {config.logo ? (
            <img src={config.logo} alt="Logo" className="w-8 h-8 rounded object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-black font-bold text-sm"
              style={{ backgroundColor: 'var(--color-primary)' }}>🎱</div>
          )}
          <div>
            <div className="font-bold text-sm text-white truncate max-w-[140px]">{config.name}</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>App local</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'text-black font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
            style={({ isActive }) => isActive ? { backgroundColor: 'var(--color-primary)' } : {}}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <HardDrive size={14} />
          <span>Datos guardados en este dispositivo</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-bg)' }}>
      <aside className="hidden md:flex flex-col w-56 shrink-0" style={{ backgroundColor: 'var(--color-surface)', borderRight: '1px solid var(--color-border)' }}>
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside
            className="absolute left-0 top-0 bottom-0 w-64 flex flex-col"
            style={{ backgroundColor: 'var(--color-surface)', paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header
          className="md:hidden flex items-center gap-3 px-4 pb-3 border-b shrink-0"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="-m-2 p-2 rounded text-gray-400 hover:text-white active:bg-white/10"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
          <span className="font-semibold text-white">{config.name}</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
