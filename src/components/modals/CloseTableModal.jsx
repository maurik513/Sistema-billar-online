import { useState } from 'react';
import { X, Printer, Banknote, QrCode } from 'lucide-react';
import api from '../../utils/api';
import { useConfig } from '../../context/ConfigContext';
import TicketModal from './TicketModal';
import toast from 'react-hot-toast';

function formatTime(ms) {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function CloseTableModal({ session_id, tableName, currentCost, productsTotal, total, elapsed, onClose, onSuccess }) {
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [closed, setClosed] = useState(null);
  const [showTicket, setShowTicket] = useState(false);
  const { config, formatCurrency } = useConfig();

  const handleClose = async () => {
    if (!paymentMethod) return toast.error('Selecciona cómo pagó el cliente');
    setLoading(true);
    try {
      const res = await api.post(`/sessions/close/${session_id}`, { notes, payment_method: paymentMethod });
      setClosed(res.data);
      toast.success(`${tableName} cerrada`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cerrar mesa');
      setLoading(false);
    }
  };

  const handlePrintTicket = () => {
    if (!closed) return;
    setShowTicket(true);
  };

  if (closed && showTicket) {
    const s = closed.session;
    return (
      <TicketModal
        title={tableName}
        dateLabel={new Date(s.end_time || Date.now()).toLocaleString('es')}
        rows={[{ label: 'Tiempo de juego', value: formatCurrency(s.table_cost) }]}
        total={formatCurrency(s.total)}
        footer={config.ticket_footer}
        config={config}
        onClose={() => setShowTicket(false)}
      />
    );
  }

  if (closed) {
    const s = closed.session;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
        <div className="w-full max-w-sm rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)' }}>
          <div className="p-6 text-center space-y-4">
            <div className="text-4xl">✅</div>
            <h2 className="text-xl font-bold text-white">Mesa cerrada</h2>
            <div className="card space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Mesa</span><span className="text-white">{tableName}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Tiempo</span><span className="text-white">{formatTime(elapsed)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Tiempo de juego</span><span className="text-white">{formatCurrency(s.table_cost)}</span></div>
              {s.products_total > 0 && <div className="flex justify-between"><span className="text-gray-400">Consumos</span><span className="text-yellow-400">{formatCurrency(s.products_total)}</span></div>}
              <div className="flex justify-between"><span className="text-gray-400">Pago</span><span className="text-white capitalize">{s.payment_method}</span></div>
              <div className="flex justify-between font-bold text-base border-t pt-2" style={{ borderColor: 'var(--color-border)' }}>
                <span className="text-white">TOTAL</span>
                <span className="text-green-400">{formatCurrency(s.total)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handlePrintTicket} className="btn-secondary flex-1 justify-center text-xs">
                <Printer size={14} /> Imprimir ticket
              </button>
              <button onClick={() => { onSuccess(); }} className="btn-primary flex-1 justify-center">
                Listo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-bold text-white">Cerrar {tableName}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="card space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Tiempo</span><span className="text-white font-mono">{formatTime(elapsed)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Costo mesa</span><span className="text-white">{formatCurrency(currentCost)}</span></div>
            {productsTotal > 0 && <div className="flex justify-between"><span className="text-gray-400">Consumos</span><span className="text-yellow-400">{formatCurrency(productsTotal)}</span></div>}
            <div className="flex justify-between font-bold text-base border-t pt-2" style={{ borderColor: 'var(--color-border)' }}>
              <span>TOTAL ESTIMADO</span>
              <span className="text-green-400">{formatCurrency(total)}</span>
            </div>
          </div>
          <div>
            <label className="label">Método de pago</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPaymentMethod('efectivo')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${paymentMethod === 'efectivo' ? 'text-black' : 'text-gray-400'}`}
                style={paymentMethod === 'efectivo' ? { backgroundColor: 'var(--color-primary)' } : { backgroundColor: 'var(--color-surface-raised)' }}>
                <Banknote size={15} /> Efectivo
              </button>
              <button type="button" onClick={() => setPaymentMethod('qr')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${paymentMethod === 'qr' ? 'text-black' : 'text-gray-400'}`}
                style={paymentMethod === 'qr' ? { backgroundColor: 'var(--color-primary)' } : { backgroundColor: 'var(--color-surface-raised)' }}>
                <QrCode size={15} /> QR
              </button>
            </div>
          </div>
          <div>
            <label className="label">Notas (opcional)</label>
            <input className="input" placeholder="Observaciones..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button onClick={handleClose} disabled={loading} className="btn-danger flex-1 justify-center">
              {loading ? 'Cerrando...' : 'Confirmar cierre'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
