import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Save, Download, Upload, AlertTriangle } from 'lucide-react';
import api from '../utils/api';
import { useConfig } from '../context/ConfigContext';
import { exportBackup, importBackup, wipeAll } from '../utils/localdb';
import toast from 'react-hot-toast';

function BackupCard() {
  const fileInputRef = useRef(null);

  const handleExport = () => {
    const json = exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.href = url;
    a.download = `respaldo-billar-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Respaldo descargado');
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Importar un respaldo reemplaza TODOS los datos actuales de esta app en este dispositivo. ¿Continuar?')) {
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importBackup(reader.result);
        toast.success('Respaldo importado. Recargando...');
        setTimeout(() => window.location.reload(), 800);
      } catch (err) {
        toast.error('El archivo no es un respaldo válido');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleWipe = () => {
    if (!confirm('Esto borrará TODOS los datos guardados en este dispositivo (mesas, ventas, caja, arqueos, inventario). Esta acción no se puede deshacer. ¿Seguro?')) return;
    if (!confirm('Confirma una vez más: se perderá todo si no tienes un respaldo descargado. ¿Borrar todo?')) return;
    wipeAll();
    toast.success('Datos borrados. Recargando...');
    setTimeout(() => window.location.reload(), 800);
  };

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="font-bold text-white">Respaldo de datos</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Toda la información vive únicamente en este dispositivo. Si se desinstala la app, se borra el navegador,
          o se cambia de celular, los datos se pierden. Descarga un respaldo con frecuencia (por ejemplo, al cerrar caja cada día).
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={handleExport} className="btn-primary text-xs px-3 py-2">
          <Download size={14} /> Descargar respaldo
        </button>
        <button onClick={handleImportClick} className="btn-secondary text-xs px-3 py-2">
          <Upload size={14} /> Importar respaldo
        </button>
        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
      </div>
      <div className="rounded-lg p-3 flex items-start gap-2" style={{ backgroundColor: 'rgba(244,67,54,0.08)', border: '1px solid rgba(244,67,54,0.3)' }}>
        <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-xs text-red-300 mb-2">Zona de peligro: borra todos los datos de este dispositivo.</div>
          <button onClick={handleWipe} className="btn-danger text-xs px-3 py-1.5">Borrar todos los datos</button>
        </div>
      </div>
    </div>
  );
}

function TableModal({ table, onClose, onSave }) {
  const [form, setForm] = useState(table || { name: '', price_per_hour: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price_per_hour) return toast.error('Nombre y precio requeridos');
    setLoading(true);
    try {
      if (table?.id) {
        await api.put(`/tables/${table.id}`, form);
      } else {
        await api.post('/tables', form);
      }
      toast.success(table?.id ? 'Mesa actualizada' : 'Mesa creada');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-xl" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-bold text-white">{table?.id ? 'Editar' : 'Nueva'} mesa</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div><label className="label">Nombre de la mesa</label><input className="input" placeholder="Ej: Mesa 1" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
          <div><label className="label">Precio por hora</label><input className="input" type="number" step="0.01" min="0" placeholder="Ej: 5.00" value={form.price_per_hour} onChange={e => setForm({...form, price_per_hour: e.target.value})} required /></div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">{loading ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [tables, setTables] = useState([]);
  const [showTableModal, setShowTableModal] = useState(false);
  const [editTable, setEditTable] = useState(null);
  const { config, updateConfig, formatCurrency } = useConfig();
  const [configForm, setConfigForm] = useState(config);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    api.get('/tables').then(res => setTables(res.data));
  }, []);

  useEffect(() => {
    setConfigForm(config);
  }, [config]);

  const loadTables = async () => {
    const res = await api.get('/tables');
    setTables(res.data);
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await api.put('/config', configForm);
      updateConfig(res.data);
      toast.success('Configuración guardada');
    } catch (err) {
      toast.error('Error al guardar configuración');
    } finally { setSavingConfig(false); }
  };

  const handleDeleteTable = async (id, name) => {
    if (!confirm(`¿Eliminar "${name}"? Solo es posible si no tiene sesiones activas.`)) return;
    try {
      await api.delete(`/tables/${id}`);
      toast.success('Mesa eliminada');
      loadTables();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Ajustes del sistema</p>
      </div>

      {/* General Config */}
      <div className="card space-y-4">
        <h2 className="font-bold text-white">Configuración general</h2>
        <form onSubmit={handleSaveConfig} className="space-y-3">
          <div><label className="label">Nombre del establecimiento</label><input className="input" value={configForm.name || ''} onChange={e => setConfigForm({...configForm, name: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Color primario</label>
              <div className="flex gap-2">
                <input type="color" className="w-10 h-9 rounded cursor-pointer border-0 p-0.5" style={{ backgroundColor: 'var(--color-surface-raised)' }} value={configForm.primary_color || '#00C853'} onChange={e => setConfigForm({...configForm, primary_color: e.target.value})} />
                <input className="input" value={configForm.primary_color || ''} onChange={e => setConfigForm({...configForm, primary_color: e.target.value})} placeholder="#00C853" />
              </div>
            </div>
            <div><label className="label">Símbolo de moneda</label><input className="input" value={configForm.currency_symbol || ''} onChange={e => setConfigForm({...configForm, currency_symbol: e.target.value})} placeholder="$" /></div>
          </div>
          <div><label className="label">Pie de ticket</label><input className="input" value={configForm.ticket_footer || ''} onChange={e => setConfigForm({...configForm, ticket_footer: e.target.value})} placeholder="Gracias por su visita" /></div>
          <div><label className="label">Modo de cobro</label>
            <select className="input" value={configForm.billing_mode || 'hour'} onChange={e => setConfigForm({...configForm, billing_mode: e.target.value})}>
              <option value="hour">Por hora (fracción proporcional)</option>
              <option value="half_hour">Por media hora</option>
            </select>
          </div>
          <button type="submit" disabled={savingConfig} className="btn-primary">
            <Save size={16} /> {savingConfig ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </form>
      </div>

      {/* Tables */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-white">Mesas ({tables.length})</h2>
          <button onClick={() => { setEditTable(null); setShowTableModal(true); }} className="btn-primary text-xs px-3 py-1.5">
            <Plus size={14} /> Nueva mesa
          </button>
        </div>
        <div className="space-y-2">
          {tables.length === 0 && <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No hay mesas configuradas</p>}
          {tables.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--color-surface-raised)' }}>
              <div>
                <div className="text-sm font-medium text-white">{t.name}</div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(t.price_per_hour)}/hr</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditTable(t); setShowTableModal(true); }} className="p-1.5 rounded text-blue-400 hover:bg-blue-900/20"><Edit2 size={14} /></button>
                <button onClick={() => handleDeleteTable(t.id, t.name)} className="p-1.5 rounded text-red-400 hover:bg-red-900/20"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BackupCard />

      {showTableModal && (
        <TableModal
          table={editTable}
          onClose={() => setShowTableModal(false)}
          onSave={() => { setShowTableModal(false); loadTables(); }}
        />
      )}
    </div>
  );
}
