import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';
import TableCard from '../components/dashboard/TableCard';

export default function TablesPage() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const loadTables = useCallback(async () => {
    try {
      const res = await api.get('/tables');
      setTables(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTables();
    const interval = setInterval(loadTables, 30000);
    return () => clearInterval(interval);
  }, [loadTables]);

  useEffect(() => {
    if (!socket) return;
    const reload = () => loadTables();
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
  }, [socket, loadTables]);

  const occupied = tables.filter(t => t.status === 'occupied').length;
  const free = tables.filter(t => t.status === 'free').length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-green-400 animate-pulse">Cargando mesas...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mesas</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {occupied} ocupada{occupied !== 1 ? 's' : ''} · {free} libre{free !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>En vivo</span>
        </div>
      </div>

      {tables.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🎱</div>
          <p className="text-white font-medium">No hay mesas configuradas</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Ve a Configuración para agregar mesas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map(table => (
            <TableCard key={table.id} table={table} onUpdate={loadTables} />
          ))}
        </div>
      )}
    </div>
  );
}
