import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../utils/api';
import { useConfig } from '../context/ConfigContext';

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const { formatCurrency } = useConfig();

  useEffect(() => {
    setLoading(true);
    api.get(`/reports/income?period=${period}`)
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reportes</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Análisis de ingresos</p>
        </div>
        <div className="flex gap-2">
          {['week', 'month', 'year'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${period === p ? 'text-black' : 'text-gray-400 hover:text-white'}`}
              style={period === p ? { backgroundColor: 'var(--color-primary)' } : { backgroundColor: 'var(--color-surface-raised)' }}>
              {p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Año'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando reporte...</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card">
              <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Ingresos totales</div>
              <div className="text-2xl font-bold text-green-400">{formatCurrency(data.total_income)}</div>
            </div>
            <div className="card">
              <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Sesiones</div>
              <div className="text-2xl font-bold text-blue-400">{data.total_sessions}</div>
            </div>
            <div className="card">
              <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Promedio por sesión</div>
              <div className="text-2xl font-bold text-purple-400">{formatCurrency(data.avg_per_session)}</div>
            </div>
          </div>

          {data.chart_data && data.chart_data.length > 0 && (
            <div className="card">
              <h3 className="font-medium text-white mb-4">Ingresos por día</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.chart_data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                    labelStyle={{ color: 'var(--color-text)' }}
                    formatter={(value) => [formatCurrency(value), 'Ingresos']}
                  />
                  <Bar dataKey="income" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      ) : (
        <div className="card text-center py-12 text-gray-400">No hay datos para este período</div>
      )}
    </div>
  );
}
