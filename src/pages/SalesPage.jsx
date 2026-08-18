import { useState, useEffect } from 'react';
import { Plus, Minus, ShoppingCart, Printer, Search, Banknote, QrCode } from 'lucide-react';
import api from '../utils/api';
import { useConfig } from '../context/ConfigContext';
import TicketModal from '../components/modals/TicketModal';
import toast from 'react-hot-toast';

export default function SalesPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [showTicket, setShowTicket] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const { config, formatCurrency } = useConfig();

  useEffect(() => { api.get('/products').then(r => setProducts(r.data)); }, []);

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) && p.stock > 0);

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
  const total = cartItems.reduce((s, i) => s + i.price * i.qty, 0);

  const handleSale = async () => {
    if (!cartItems.length) return toast.error('Carrito vacío');
    if (!paymentMethod) return toast.error('Selecciona cómo pagó el cliente');
    setLoading(true);
    try {
      const res = await api.post('/sales', {
        items: cartItems.map(i => ({ product_id: i.id, quantity: i.qty })),
        payment_method: paymentMethod,
      });
      setLastSale(res.data);
      setCart({});
      setPaymentMethod(null);
      toast.success('Venta registrada');
      api.get('/products').then(r => setProducts(r.data));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al procesar venta');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Venta Directa</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Ventas de productos sin mesa</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map(product => {
              const qty = cart[product.id]?.qty || 0;
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="card text-left hover:border-green-600/50 transition-colors relative"
                  style={{ borderColor: qty > 0 ? 'var(--color-primary)' : 'var(--color-border)' }}
                >
                  {qty > 0 && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-black"
                      style={{ backgroundColor: 'var(--color-primary)' }}>{qty}</div>
                  )}
                  <div className="text-2xl mb-2">🛍️</div>
                  <div className="font-medium text-sm text-white leading-tight">{product.name}</div>
                  <div className="text-green-400 font-bold mt-1">{formatCurrency(product.price)}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Stock: {product.stock}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-green-400" />
              <h2 className="font-bold text-white">Carrito</h2>
              {cartItems.length > 0 && <span className="ml-auto badge badge-green">{cartItems.length}</span>}
            </div>

            {cartItems.length === 0 ? (
              <div className="text-center py-6" style={{ color: 'var(--color-text-muted)' }}>
                <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Carrito vacío</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cartItems.map(item => (
                  <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg"
                    style={{ backgroundColor: 'var(--color-surface-raised)' }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{item.name}</div>
                      <div className="text-xs text-green-400">{formatCurrency(item.price * item.qty)}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 rounded flex items-center justify-center bg-gray-700 hover:bg-gray-600">
                        <Minus size={11} />
                      </button>
                      <span className="w-5 text-center text-sm font-bold">{item.qty}</span>
                      <button onClick={() => addToCart(item)} className="w-6 h-6 rounded flex items-center justify-center bg-gray-700 hover:bg-gray-600">
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cartItems.length > 0 && (
              <>
                <div className="border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex justify-between font-bold text-lg">
                    <span className="text-white">Total</span>
                    <span className="text-green-400">{formatCurrency(total)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPaymentMethod('efectivo')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${paymentMethod === 'efectivo' ? 'text-black' : 'text-gray-400'}`}
                    style={paymentMethod === 'efectivo' ? { backgroundColor: 'var(--color-primary)' } : { backgroundColor: 'var(--color-surface-raised)' }}>
                    <Banknote size={15} /> Efectivo
                  </button>
                  <button type="button" onClick={() => setPaymentMethod('qr')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${paymentMethod === 'qr' ? 'text-black' : 'text-gray-400'}`}
                    style={paymentMethod === 'qr' ? { backgroundColor: 'var(--color-primary)' } : { backgroundColor: 'var(--color-surface-raised)' }}>
                    <QrCode size={15} /> QR
                  </button>
                </div>
                <button onClick={handleSale} disabled={loading} className="btn-primary w-full justify-center">
                  {loading ? 'Procesando...' : 'Cobrar'}
                </button>
              </>
            )}
          </div>

          {lastSale && (
            <div className="card space-y-3 border-green-600/30">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-green-400 text-sm">✅ Última venta</h3>
                <button onClick={() => setShowTicket(true)}
                  className="btn-ghost p-1 text-xs gap-1">
                  <Printer size={13} /> Ticket
                </button>
              </div>
              <div className="space-y-1">
                {lastSale.items.map(item => (
                  <div key={item.id} className="flex justify-between text-xs">
                    <span className="text-gray-300">{item.product_name} x{item.quantity}</span>
                    <span className="text-white">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-sm border-t pt-2" style={{ borderColor: 'var(--color-border)' }}>
                <span className="text-white">Total</span>
                <span className="text-green-400">{formatCurrency(lastSale.sale.total)}</span>
              </div>
              <div className="text-xs text-gray-400 capitalize">Pago: {lastSale.sale.payment_method}</div>
            </div>
          )}
        </div>
      </div>

      {showTicket && lastSale && (
        <TicketModal
          title="Venta"
          dateLabel={new Date(lastSale.sale.created_at || Date.now()).toLocaleString('es')}
          rows={lastSale.items.map(i => ({
            label: `${i.product_name} x${i.quantity}`,
            value: formatCurrency(i.subtotal),
          }))}
          total={formatCurrency(lastSale.sale.total)}
          footer={config.ticket_footer}
          config={config}
          onClose={() => setShowTicket(false)}
        />
      )}
    </div>
  );
}
