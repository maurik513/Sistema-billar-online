import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, RefreshCw, Plus, ClipboardList, Lock, Unlock, FileText, QrCode, Banknote } from 'lucide-react';
import api from '../utils/api';
import { useConfig } from '../context/ConfigContext';
import ArqueoReportModal from '../components/modals/ArqueoReportModal';
import toast from 'react-hot-toast';

function PaymentBadge({ method }) {
  const isQr = method === 'qr';
  return (
    <span className={`badge ${isQr ? 'badge-blue' : 'badge-green'}`}>
      {isQr ? <QrCode size={11} /> : <Banknote size={11} />}
      {isQr ? 'QR' : 'Efectivo'}
    </span>
  );
}

function CashMovementModal({ onClose, onSave }) {
  const [type, setType] = useState('in');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

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
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Los movimientos manuales siempre se registran como efectivo.</p>
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

// Modal de apertura/cierre de turno. Si ya hay un turno abierto solo
// deja cerrar; si no hay ninguno abierto solo deja abrir uno nuevo.
function ArqueoModal({ shiftOpen, onClose, onSave }) {
  const type = shiftOpen ? 'cierre' : 'apertura';
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
      const res = await api.post('/arqueos', { type, counted_amount: amount, notes });
      toast.success(type === 'apertura' ? 'Caja abierta — turno iniciado' : 'Caja cerrada — turno finalizado');
      onSave(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar el arqueo');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-xl" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-bold text-white flex items-center gap-2">
            {type === 'apertura' ? <Unlock size={17} className="text-green-400" /> : <Lock size={17} className="text-yellow-400" />}
            {type === 'apertura' ? 'Abrir caja (nuevo turno)' : 'Cerrar caja (fin de turno)'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {type === 'cierre' && (
            <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: 'var(--color-surface-raised)' }}>
              <div className="flex justify-between"><span className="text-gray-400">Esperado en caja (efectivo)</span><span className="text-white font-medium">{formatCurrency(expected)}</span></div>
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
            <label className="label">{type === 'apertura' ? 'Monto de fondo inicial contado' : 'Monto contado físicamente (efectivo)'}</label>
            <input className="input" type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} required autoFocus />
          </div>
          <div><label className="label">Notas (opcional)</label>
            <input className="input" placeholder="Observaciones..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'Guardando...' : type === 'apertura' ? 'Abrir caja' : 'Cerrar caja'}
            </button>
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
  const [viewReport, setViewReport] = useState(null); // { report, arqueo }
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

  const handleArqueoSaved = (arqueo) => {
    setShowArqueo(false);
    loadData();
    if (arqueo?.type === 'cierre' && arqueo.report) {
      setViewReport({ report: arqueo.report, arqueo });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-green-400 animate-pulse">Cargando caja...</div></div>;

  const shiftOpen = summary?.shift_open;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Caja</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Resumen del turno actual</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowArqueo(true)}
            className={shiftOpen ? 'btn-danger gap-2 text-xs' : 'btn-primary gap-2 text-xs'}>
            {shiftOpen ? <Lock size={15} /> : <Unlock size={15} />}
            {shiftOpen ? 'Cerrar caja' : 'Abrir caja'}
          </button>
          <button onClick={() => setShowMovement(true)} disabled={!shiftOpen} className="btn-secondary gap-2 text-xs disabled:opacity-40">
            <Plus size={15} /> Movimiento
          </button>
          <button onClick={loadData} className="btn-ghost p-2" title="Actualizar">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Estado del turno */}
      <div className="card flex items-center gap-3" style={{ borderColor: shiftOpen ? 'var(--color-primary)' : 'var(--color-border)' }}>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${shiftOpen ? 'bg-green-900/30' : 'bg-gray-800'}`}>
          {shiftOpen ? <Unlock size={20} className="text-green-400" /> : <Lock size={20} className="text-gray-400" />}
        </div>
        <div>
          {shiftOpen ? (
            <>
              <div className="text-white font-medium">Turno abierto</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Desde {new Date(summary.shift_start).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })} · Fondo inicial {formatCurrency(summary.fondo_inicial)}
              </div>
            </>
          ) : (
            <>
              <div className="text-white font-medium">Caja cerrada</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Abre la caja para empezar a registrar el turno de hoy</div>
            </>
          )}
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-900/30 flex items-center justify-center">
                <Banknote size={20} className="text-green-400" />
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Efectivo en el turno</div>
                <div className="text-xl font-bold text-green-400">{formatCurrency(summary.total_efectivo)}</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center">
                <QrCode size={20} className="text-blue-400" />
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>QR en el turno</div>
                <div className="text-xl font-bold text-blue-400">{formatCurrency(summary.total_qr)}</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-900/30 flex items-center justify-center">
                <Wallet size={20} className="text-purple-400" />
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Total del turno</div>
                <div className="text-xl font-bold text-purple-400">{formatCurrency(summary.total_income)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="card py-3"><div className="flex justify-between"><span style={{ color: 'var(--color-text-muted)' }}>Mesas</span><span className="text-white font-medium">{formatCurrency(summary.tables_income)}</span></div></div>
          <div className="card py-3"><div className="flex justify-between"><span style={{ color: 'var(--color-text-muted)' }}>Ventas directas</span><span className="text-white font-medium">{formatCurrency(summary.sales_income)}</span></div></div>
          <div className="card py-3"><div className="flex justify-between"><span style={{ color: 'var(--color-text-muted)' }}>Ingresos − Egresos</span><span className="text-white font-medium">{formatCurrency(summary.cash_in - summary.cash_out)}</span></div></div>
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
                <th>Mesa</th><th>Inicio</th><th>Duración</th><th>Costo mesa</th><th>Consumos</th><th>Total</th><th>Pago</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Sin sesiones en este turno</td></tr>
              )}
              {sessions.map(s => (
                <tr key={s.id}>
                  <td className="text-white font-medium">{s.table_name}</td>
                  <td className="text-gray-400">{new Date(s.start_time).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="text-gray-400">{s.duration_minutes ? `${Math.floor(s.duration_minutes / 60)}h ${s.duration_minutes % 60}m` : '-'}</td>
                  <td className="text-green-400">{formatCurrency(s.table_cost)}</td>
                  <td className="text-yellow-400">{formatCurrency(s.products_total)}</td>
                  <td className="text-white font-bold">{formatCurrency(s.total)}</td>
                  <td><PaymentBadge method={s.payment_method} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'sales' && (
        <div className="card overflow-hidden p-0">
          <table className="table-fixed-layout">
            <thead><tr><th>Hora</th><th>Items</th><th>Total</th><th>Pago</th></tr></thead>
            <tbody>
              {sales.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Sin ventas en este turno</td></tr>
              )}
              {sales.map(s => (
                <tr key={s.id}>
                  <td className="text-gray-400">{new Date(s.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="text-gray-400">{s.items_count} producto{s.items_count !== 1 ? 's' : ''}</td>
                  <td className="text-green-400 font-bold">{formatCurrency(s.total)}</td>
                  <td><PaymentBadge method={s.payment_method} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'movements' && (
        <div className="card overflow-hidden p-0">
          <table className="table-fixed-layout">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Pago</th><th>Monto</th></tr></thead>
            <tbody>
              {movements.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Sin movimientos registrados</td></tr>
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
                  <td>{m.payment_method && <PaymentBadge method={m.payment_method} />}</td>
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
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Esperado</th><th>Contado</th><th>Diferencia</th><th>Notas</th><th></th></tr></thead>
            <tbody>
              {arqueos.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Sin arqueos registrados aún</td></tr>
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
                  <td>
                    {a.report && (
                      <button onClick={() => setViewReport({ report: a.report, arqueo: a })} className="btn-ghost p-1 text-xs gap-1">
                        <FileText size={13} /> Reporte
                      </button>
                    )}
                  </td>
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
        <ArqueoModal shiftOpen={shiftOpen} onClose={() => setShowArqueo(false)} onSave={handleArqueoSaved} />
      )}
      {viewReport && (
        <ArqueoReportModal report={viewReport.report} arqueo={viewReport.arqueo} onClose={() => setViewReport(null)} />
      )}
    </div>
  );
}
