import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import api from '../../utils/api';
import { useConfig } from '../../context/ConfigContext';
import toast from 'react-hot-toast';

export default function SessionDetailModal({ session_id, tableName, onClose }) {
  const [data, setData] = useState(null);
  const { formatCurrency } = useConfig();

  useEffect(() => {
    api.get(`/sessions/${session_id}`).then(res => setData(res.data));
  }, [session_id]);

  const removeProduct = async (itemId) => {
    try {
      const res = await api.delete(`/sessions/${session_id}/products/${itemId}`);
      setData(prev => ({ ...prev, products: res.data.products }));
      toast.success('Producto eliminado');
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-md rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <h2 className="font-bold text-white">Detalle de mesa</h2>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tableName}</p>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        {data ? (
          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            <div className="text-xs space-y-1" style={{ color: 'var(--color-text-muted)' }}>
              <div>Abierta: {new Date(data.session.start_time).toLocaleTimeString('es')}</div>
              <div>Por: {data.session.opened_by_name}</div>
            </div>
            {data.products.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs font-medium text-white uppercase tracking-wide">Consumos</div>
                {data.products.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-lg"
                    style={{ backgroundColor: 'var(--color-surface-raised)' }}>
                    <div>
                      <div className="text-sm text-white">{item.product_name} x{item.quantity}</div>
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(item.added_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-green-400">{formatCurrency(item.subtotal)}</span>
                      <button onClick={() => removeProduct(item.id)} className="text-red-400 hover:text-red-300 p-1">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>Sin consumos registrados</p>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        )}
      </div>
    </div>
  );
}
