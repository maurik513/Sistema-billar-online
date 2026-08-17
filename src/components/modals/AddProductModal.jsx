import { useState, useEffect } from 'react';
import { X, Search, Plus, Minus, ShoppingBag } from 'lucide-react';
import api from '../../utils/api';
import { useConfig } from '../../context/ConfigContext';
import toast from 'react-hot-toast';

export default function AddProductModal({ session_id, tableName, onClose, onSuccess }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState({});
  const [loading, setLoading] = useState(false);
  const { formatCurrency } = useConfig();

  useEffect(() => {
    api.get('/products').then(res => setProducts(res.data));
  }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) && p.stock > 0
  );

  const addToCart = (product) => {
    setCart(prev => {
      const qty = (prev[product.id]?.qty || 0) + 1;
      if (qty > product.stock) { toast.error('Stock insuficiente'); return prev; }
      return { ...prev, [product.id]: { ...product, qty } };
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => {
      const qty = (prev[productId]?.qty || 0) - 1;
      if (qty <= 0) { const n = { ...prev }; delete n[productId]; return n; }
      return { ...prev, [productId]: { ...prev[productId], qty } };
    });
  };

  const cartItems = Object.values(cart).filter(i => i.qty > 0);
  const cartTotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);

  const handleSubmit = async () => {
    if (!cartItems.length) return toast.error('Agrega al menos un producto');
    setLoading(true);
    try {
      for (const item of cartItems) {
        await api.post(`/sessions/${session_id}/products`, { product_id: item.id, quantity: item.qty });
      }
      toast.success('Consumos registrados');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al agregar consumos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-lg rounded-xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <h2 className="font-bold text-white">Agregar consumo</h2>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tableName}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
              No hay productos con stock disponible
            </div>
          )}
          {filtered.map(product => {
            const cartQty = cart[product.id]?.qty || 0;
            return (
              <div key={product.id} className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: 'var(--color-surface-raised)' }}>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{product.name}</div>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {formatCurrency(product.price)} · Stock: {product.stock}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {cartQty > 0 && (
                    <>
                      <button onClick={() => removeFromCart(product.id)} className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-700 hover:bg-gray-600">
                        <Minus size={13} />
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-green-400">{cartQty}</span>
                    </>
                  )}
                  <button onClick={() => addToCart(product)} className="w-7 h-7 rounded-full flex items-center justify-center text-black"
                    style={{ backgroundColor: 'var(--color-primary)' }}>
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {cartItems.length > 0 && (
          <div className="p-4 border-t space-y-3" style={{ borderColor: 'var(--color-border)' }}>
            <div className="space-y-1">
              {cartItems.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-300">{item.name} x{item.qty}</span>
                  <span className="text-white">{formatCurrency(item.price * item.qty)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold border-t pt-1 mt-1" style={{ borderColor: 'var(--color-border)' }}>
                <span className="text-white">Total consumos</span>
                <span className="text-green-400">{formatCurrency(cartTotal)}</span>
              </div>
            </div>
            <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full justify-center">
              <ShoppingBag size={16} />
              {loading ? 'Registrando...' : 'Confirmar consumos'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
