import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useConfig } from '../context/ConfigContext';
import api from '../utils/api';
import { Clock, TrendingUp, Activity, AlertTriangle } from 'lucide-react';
import TableCard from '../components/dashboard/TableCard';
import StatsCard from '../components/dashboard/StatsCard';

export default function DashboardPage() {
  const [tables, setTables] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();
  const { formatCurrency } = useConfig();

  const loadData = useCallback(async () => {
    try {
      const [tablesRes, statsRes] = await Promise.all([
        api.get('/tables'),
        api.get('/reports/stats')
      ]);
      setTables(tablesRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    if (!socket) return;
    const reload = () => loadData();
    socket.on('tables_updated', reload);
    socket.on('table_opened', reload);
    socket.on('table_closed', reload);
    socket.on('session_product_added', reload);
    return () => {
      socket.off('tables_updated', reload);
      socket.off('table_opened', reload);
      socket.off('table_closed', reload);
      socket.off('session_product_added', reload);
    };
  }, [socket, loadData]);

  const occupied = tables.filter(t => t.status === 'occupied').length;
  const free = tables.filter(t => t.status === 'free').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-green-400 animate-pulse text-lg">Cargando mesas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {occupied} mesa{occupied !== 1 ? 's' : ''} ocupada{occupied !== 1 ? 's' : ''} · {free} libre{free !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>En vivo</span>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard icon={TrendingUp} label="Ingresos hoy" value={formatCurrency(stats.today_income)} color="green" />
          <StatsCard icon={Activity} label="Mesas activas" value={stats.active_tables} color="blue" />
          <StatsCard icon={Clock} label="Sesiones hoy" value={stats.today_sessions} color="purple" />
          <StatsCard icon={AlertTriangle} label="Stock bajo" value={stats.low_stock_products} color={stats.low_stock_products > 0 ? 'red' : 'green'} />
        </div>
      )}

      {tables.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🎱</div>
          <p className="text-white font-medium">No hay mesas configuradas</p>
          <Link to="/settings" className="btn-primary mt-4 inline-flex">Configurar mesas</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map(table => (
            <TableCard key={table.id} table={table} onUpdate={loadData} />
          ))}
        </div>
      )}
    </div>
  );
}
