import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, RefreshCw, Plus, ClipboardList } from 'lucide-react';
import api from '../utils/api';
import { useConfig } from '../context/ConfigContext';
import toast from 'react-hot-toast';

function CashMovementModal({ onClose, onSave }) {
  const [type, setType] = useState('in');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { formatCurrency } = useConfig();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/cash', { type, amount, description });
      toast.success(type === 'in' ? 'Ingreso registrado' : 'Egreso registrado');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar movimiento');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-xl" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-bold text-white">Movimiento de caja</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => setType('in')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${type === 'in' ? 'text-black' : 'text-gray-400'}`}
              style={type === 'in' ? { backgroundColor: 'var(--color-primary)' } : { backgroundColor: 'var(--color-surface-raised)' }}>
              Ingreso
            </button>
            <button type="button" onClick={() => setType('out')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${type === 'out' ? 'text-white' : 'text-gray-400'}`}
              style={type === 'out' ? { backgroundColor: 'var(--color-danger)' } : { backgroundColor: 'var(--color-surface-raised)' }}>
              Egreso
            </button>
          </div>
          <div><label className="label">Monto</label>
            <input className="input" type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} required autoFocus />
          </div>
          <div><label className="label">Motivo / descripción</label>
            <input className="input" placeholder="Ej: Compra de hielo, retiro de caja..." value={description} onChange={e => setDescription(e.target.value)} />
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

function ArqueoModal({ onClose, onSave }) {
  const [type, setType] = useState('cierre');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [expected, setExpected] = useState(0);
  const [loading, setLoading] = useState(false);
  const { formatCurrency } = useConfig();

  useEffect(() => {
    if (type === 'cierre') {
      api.get('/reports/arqueo-esperado').then(res => setExpected(res.data.expected));
    }
  }, [type]);

  const counted = parseFloat(amount) || 0;
  const difference = counted - expected;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/arqueos', { type, counted_amount: amount, notes });
      toast.success(type === 'apertura' ? 'Fondo inicial registrado' : 'Arqueo de cierre registrado');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar el arqueo');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-xl" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-bold text-white">Nuevo arqueo de caja</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => setType('apertura')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${type === 'apertura' ? 'text-black' : 'text-gray-400'}`}
              style={type === 'apertura' ? { backgroundColor: 'var(--color-primary)' } : { backgroundColor: 'var(--color-surface-raised)' }}>
              Apertura (fondo)
            </button>
            <button type="button" onClick={() => setType('cierre')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${type === 'cierre' ? 'text-black' : 'text-gray-400'}`}
              style={type === 'cierre' ? { backgroundColor: 'var(--color-primary)' } : { backgroundColor: 'var(--color-surface-raised)' }}>
              Cierre (conteo)
            </button>
          </div>

          {type === 'cierre' && (
            <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: 'var(--color-surface-raised)' }}>
              <div className="flex justify-between"><span className="text-gray-400">Esperado en caja (sistema)</span><span className="text-white font-medium">{formatCurrency(expected)}</span></div>
              {amount !== '' && (
                <div className="flex justify-between mt-1">
                  <span className="text-gray-400">Diferencia</span>
                  <span className={difference === 0 ? 'text-white' : difference > 0 ? 'text-green-400' : 'text-red-400'}>
                    {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="label">{type === 'apertura' ? 'Monto de fondo inicial contado' : 'Monto contado físicamente'}</label>
            <input className="input" type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} required autoFocus />
          </div>
          <div><label className="label">Notas (opcional)</label>
            <input className="input" placeholder="Observaciones..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">{loading ? 'Guardando...' : 'Guardar arqueo'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CashPage() {
  const [summary, setSummary] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sales, setSales] = useState([]);
  const [movements, setMovements] = useState([]);
  const [arqueos, setArqueos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('sessions');
  const [showMovement, setShowMovement] = useState(false);
  const [showArqueo, setShowArqueo] = useState(false);
  const { formatCurrency } = useConfig();

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryRes, sessionsRes, salesRes, movementsRes, arqueosRes] = await Promise.all([
        api.get('/reports/cash-summary'),
        api.get('/sessions/history?limit=20'),
        api.get('/sales?limit=20'),
        api.get('/cash?limit=20'),
        api.get('/arqueos?limit=20'),
      ]);
      setSummary(summaryRes.data);
      setSessions(sessionsRes.data);
      setSales(salesRes.data);
      setMovements(movementsRes.data);
      setArqueos(arqueosRes.data);
    } catch (err) {
      toast.error('Error al cargar caja');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-green-400 animate-pulse">Cargando caja...</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Caja</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Resumen del día</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowArqueo(true)} className="btn-secondary gap-2 text-xs">
            <ClipboardList size={15} /> Nuevo arqueo
          </button>
          <button onClick={() => setShowMovement(true)} className="btn-secondary gap-2 text-xs">
            <Plus size={15} /> Movimiento
          </button>
          <button onClick={loadData} className="btn-ghost p-2" title="Actualizar">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-900/30 flex items-center justify-center">
                <TrendingUp size={20} className="text-green-400" />
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Mesas hoy</div>
                <div className="text-xl font-bold text-green-400">{formatCurrency(summary.tables_income)}</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center">
                <Wallet size={20} className="text-blue-400" />
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Ventas directas hoy</div>
                <div className="text-xl font-bold text-blue-400">{formatCurrency(summary.sales_income)}</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-900/30 flex items-center justify-center">
                <TrendingUp size={20} className="text-purple-400" />
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Total del día (con ingresos/egresos)</div>
                <div className="text-xl font-bold text-purple-400">{formatCurrency(summary.total_income)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 border-b overflow-x-auto" style={{ borderColor: 'var(--color-border)' }}>
        {[
          ['sessions', 'Sesiones de mesa'],
          ['sales', 'Ventas directas'],
          ['movements', 'Ingresos/Egresos'],
          ['arqueos', 'Arqueos'],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === key ? 'border-green-400 text-green-400' : 'border-transparent text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'sessions' && (
        <div className="card overflow-hidden p-0">
          <table className="table-fixed-layout">
            <thead>
              <tr>
                <th>Mesa</th><th>Inicio</th><th>Duración</th><th>Mesa $</th><th>Consumos</th><th>Total</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Sin sesiones hoy</td></tr>
              )}
              {sessions.map(s => (
                <tr key={s.id}>
                  <td className="text-white font-medium">{s.table_name}</td>
                  <td className="text-gray-400">{new Date(s.start_time).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="text-gray-400">{s.duration_minutes ? `${Math.floor(s.duration_minutes / 60)}h ${s.duration_minutes % 60}m` : '-'}</td>
                  <td className="text-green-400">{formatCurrency(s.table_cost)}</td>
                  <td className="text-yellow-400">{formatCurrency(s.products_total)}</td>
                  <td className="text-white font-bold">{formatCurrency(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'sales' && (
        <div className="card overflow-hidden p-0">
          <table className="table-fixed-layout">
            <thead><tr><th>Hora</th><th>Items</th><th>Total</th></tr></thead>
            <tbody>
              {sales.length === 0 && (
                <tr><td colSpan={3} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Sin ventas hoy</td></tr>
              )}
              {sales.map(s => (
                <tr key={s.id}>
                  <td className="text-gray-400">{new Date(s.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="text-gray-400">{s.items_count} producto{s.items_count !== 1 ? 's' : ''}</td>
                  <td className="text-green-400 font-bold">{formatCurrency(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'movements' && (
        <div className="card overflow-hidden p-0">
          <table className="table-fixed-layout">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Monto</th></tr></thead>
            <tbody>
              {movements.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Sin movimientos registrados</td></tr>
              )}
              {movements.map(m => (
                <tr key={m.id}>
                  <td className="text-gray-400">{new Date(m.created_at).toLocaleString('es', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>
                    <span className={`badge ${m.type === 'in' || m.type === 'sale' || m.type === 'session' ? 'badge-green' : 'badge-red'}`}>
                      {m.type === 'in' ? <TrendingUp size={12} /> : m.type === 'out' ? <TrendingDown size={12} /> : null}
                      {{ in: 'Ingreso', out: 'Egreso', sale: 'Venta', session: 'Mesa' }[m.type]}
                    </span>
                  </td>
                  <td className="text-gray-300">{m.description || '-'}</td>
                  <td className={`font-bold ${m.type === 'out' ? 'text-red-400' : 'text-green-400'}`}>
                    {m.type === 'out' ? '-' : '+'}{formatCurrency(m.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'arqueos' && (
        <div className="card overflow-hidden p-0">
          <table className="table-fixed-layout">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Esperado</th><th>Contado</th><th>Diferencia</th><th>Notas</th></tr></thead>
            <tbody>
              {arqueos.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Sin arqueos registrados aún</td></tr>
              )}
              {arqueos.map(a => (
                <tr key={a.id}>
                  <td className="text-gray-400">{new Date(a.created_at).toLocaleString('es', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="capitalize text-white">{a.type}</td>
                  <td className="text-gray-400">{a.expected_amount !== null ? formatCurrency(a.expected_amount) : '-'}</td>
                  <td className="text-white font-medium">{formatCurrency(a.counted_amount)}</td>
                  <td>
                    {a.difference === null ? '-' : (
                      <span className={a.difference === 0 ? 'text-white' : a.difference > 0 ? 'text-green-400' : 'text-red-400'}>
                        {a.difference > 0 ? '+' : ''}{formatCurrency(a.difference)}
                      </span>
                    )}
                  </td>
                  <td className="text-gray-400">{a.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showMovement && (
        <CashMovementModal onClose={() => setShowMovement(false)} onSave={() => { setShowMovement(false); loadData(); }} />
      )}
      {showArqueo && (
        <ArqueoModal onClose={() => setShowArqueo(false)} onSave={() => { setShowArqueo(false); loadData(); }} />
      )}
    </div>
  );
}
