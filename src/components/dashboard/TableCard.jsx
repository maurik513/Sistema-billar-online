import { useState, useEffect } from 'react';
import { Play, Square, Plus, Eye } from 'lucide-react';
import { useConfig } from '../../context/ConfigContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import AddProductModal from '../modals/AddProductModal';
import SessionDetailModal from '../modals/SessionDetailModal';
import CloseTableModal from '../modals/CloseTableModal';

function useTimer(startTime, isOccupied) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isOccupied || !startTime) { setElapsed(0); return; }
    const update = () => setElapsed(Date.now() - new Date(startTime).getTime());
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startTime, isOccupied]);

  return elapsed;
}

function formatTime(ms) {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TableCard({ table, onUpdate }) {
  const { formatCurrency } = useConfig();
  const isOccupied = table.status === 'occupied';
  const elapsed = useTimer(table.start_time, isOccupied);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentCost = isOccupied ? (elapsed / 3600000) * table.price_per_hour : 0;
  const productsTotal = parseFloat(table.products_total || 0);
  const total = currentCost + productsTotal;

  const handleOpen = async () => {
    setLoading(true);
    try {
      await api.post('/sessions/open', { table_id: table.id });
      toast.success(`${table.name} abierta`);
      onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al abrir mesa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`card flex flex-col gap-3 transition-all duration-300 ${isOccupied ? 'occupied-glow' : ''}`}
        style={{ borderColor: isOccupied ? 'var(--color-danger)' : 'var(--color-border)' }}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-white text-base">{table.name}</h3>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {formatCurrency(table.price_per_hour)}/hr
            </div>
          </div>
          <div className={`badge ${isOccupied ? 'badge-red' : 'badge-green'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isOccupied ? 'bg-red-400 animate-pulse' : 'bg-green-400'}`} />
            {isOccupied ? 'Ocupada' : 'Libre'}
          </div>
        </div>

        {isOccupied ? (
          <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: 'var(--color-surface-raised)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Tiempo</span>
              <span className="font-mono font-bold text-lg text-green-400 timer-blink">{formatTime(elapsed)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Mesa</span>
              <span className="text-sm font-medium text-white">{formatCurrency(currentCost)}</span>
            </div>
            {productsTotal > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Consumos</span>
                <span className="text-sm font-medium text-yellow-400">{formatCurrency(productsTotal)}</span>
              </div>
            )}
            <div className="border-t pt-2" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Total estimado</span>
                <span className="font-bold text-green-400">{formatCurrency(total)}</span>
              </div>
            </div>
            {table.opened_by_name && (
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Por: {table.opened_by_name}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'var(--color-surface-raised)' }}>
            <div className="text-3xl mb-1">🎱</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Mesa disponible</div>
          </div>
        )}

        <div className="flex gap-2">
          {!isOccupied ? (
            <button onClick={handleOpen} disabled={loading} className="btn-primary flex-1 justify-center py-2 text-xs">
              <Play size={14} />
              Abrir
            </button>
          ) : (
            <>
              <button onClick={() => setShowAddProduct(true)} className="btn-secondary flex-1 justify-center py-2 text-xs">
                <Plus size={14} />
                Consumo
              </button>
              <button onClick={() => setShowDetail(true)} className="btn-ghost px-2 py-2" title="Detalles">
                <Eye size={15} />
              </button>
              <button onClick={() => setShowClose(true)} className="btn-danger px-2 py-2" title="Cerrar mesa">
                <Square size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      {showAddProduct && (
        <AddProductModal
          session_id={table.session_id}
          tableName={table.name}
          onClose={() => setShowAddProduct(false)}
          onSuccess={() => { setShowAddProduct(false); onUpdate(); }}
        />
      )}

      {showDetail && (
        <SessionDetailModal
          session_id={table.session_id}
          tableName={table.name}
          onClose={() => setShowDetail(false)}
        />
      )}

      {showClose && (
        <CloseTableModal
          session_id={table.session_id}
          tableName={table.name}
          currentCost={currentCost}
          productsTotal={productsTotal}
          total={total}
          elapsed={elapsed}
          onClose={() => setShowClose(false)}
          onSuccess={() => { setShowClose(false); onUpdate(); }}
        />
      )}
    </>
  );
}
