import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, TrendingUp, AlertTriangle } from 'lucide-react';
import api from '../utils/api';
import { useConfig } from '../context/ConfigContext';
import toast from 'react-hot-toast';

function ProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState(product || { name: '', price: '', stock: 0, min_stock: 5, category: 'general' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) return toast.error('Nombre y precio requeridos');
    setLoading(true);
    try {
      if (product?.id) {
        await api.put(`/products/${product.id}`, form);
      } else {
        await api.post('/products', form);
      }
      toast.success(product?.id ? 'Producto actualizado' : 'Producto creado');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-xl" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-bold text-white">{product?.id ? 'Editar' : 'Nuevo'} producto</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div><label className="label">Nombre</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
          <div><label className="label">Precio de venta</label><input className="input" type="number" step="0.01" min="0" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required /></div>
          {!product?.id && <div><label className="label">Stock inicial</label><input className="input" type="number" min="0" value={form.stock} onChange={e => setForm({...form, stock: parseInt(e.target.value) || 0})} /></div>}
          <div><label className="label">Stock mínimo (alerta)</label><input className="input" type="number" min="0" value={form.min_stock} onChange={e => setForm({...form, min_stock: parseInt(e.target.value) || 5})} /></div>
          <div><label className="label">Categoría</label>
            <select className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
              <option value="general">General</option>
              <option value="bebida">Bebida</option>
              <option value="comida">Comida</option>
              <option value="snack">Snack</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">{loading ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StockModal({ product, onClose, onSave }) {
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { formatCurrency } = useConfig();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/products/${product.id}/stock`, { quantity: qty, reason });
      toast.success(`+${qty} unidades agregadas`);
      onSave();
    } catch (err) {
      toast.error('Error al agregar stock');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-xs rounded-xl" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-bold text-white">Entrada de stock</h2>
          <button onClick={onClose} className="text-gray-400">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="text-sm text-gray-300">{product.name} · Stock actual: <span className="text-green-400 font-bold">{product.stock}</span></div>
          <div><label className="label">Cantidad a agregar</label><input className="input" type="number" min="1" value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} required /></div>
          <div><label className="label">Motivo</label><input className="input" placeholder="Ej: Compra proveedor..." value={reason} onChange={e => setReason(e.target.value)} /></div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">Agregar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStock, setShowStock] = useState(null);
  const [editProduct, setEditProduct] = useState(null);
  const [search, setSearch] = useState('');
  const { formatCurrency } = useConfig();

  const loadProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadProducts(); }, []);

  const handleDelete = async (id, name) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Producto eliminado');
      loadProducts();
    } catch (err) { toast.error('Error al eliminar'); }
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const lowStock = products.filter(p => p.stock <= p.min_stock);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventario</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{products.length} productos</p>
        </div>
        <button onClick={() => { setEditProduct(null); setShowModal(true); }} className="btn-primary">
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      {lowStock.length > 0 && (
        <div className="card border-yellow-600/50 bg-yellow-900/10 flex items-start gap-3">
          <AlertTriangle size={18} className="text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-yellow-400">Stock bajo en {lowStock.length} producto{lowStock.length !== 1 ? 's' : ''}</div>
            <div className="text-xs text-yellow-300/70 mt-0.5">{lowStock.map(p => p.name).join(', ')}</div>
          </div>
        </div>
      )}

      <div>
        <input className="input max-w-xs" placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Cargando...</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="table-fixed-layout">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Mín</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>No hay productos</td></tr>
              )}
              {filtered.map(p => (
                <tr key={p.id}>
                  <td className="font-medium text-white">{p.name}</td>
                  <td className="capitalize text-gray-400">{p.category}</td>
                  <td className="text-green-400 font-medium">{formatCurrency(p.price)}</td>
                  <td>
                    <span className={`font-bold ${p.stock <= p.min_stock ? 'text-red-400' : 'text-white'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="text-gray-400">{p.min_stock}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setShowStock(p)} className="p-1.5 rounded text-green-400 hover:bg-green-900/20" title="Entrada stock">
                        <TrendingUp size={14} />
                      </button>
                      <button onClick={() => { setEditProduct(p); setShowModal(true); }} className="p-1.5 rounded text-blue-400 hover:bg-blue-900/20">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(p.id, p.name)} className="p-1.5 rounded text-red-400 hover:bg-red-900/20">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ProductModal
          product={editProduct}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); loadProducts(); }}
        />
      )}

      {showStock && (
        <StockModal
          product={showStock}
          onClose={() => setShowStock(null)}
          onSave={() => { setShowStock(null); loadProducts(); }}
        />
      )}
    </div>
  );
}
