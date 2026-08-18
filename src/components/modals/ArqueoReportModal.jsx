import { X, Printer, Download } from 'lucide-react';
import { useConfig } from '../../context/ConfigContext';

function Row({ label, value, bold, muted, color }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold' : ''}`}>
      <span style={{ color: muted ? '#666' : '#111' }}>{label}</span>
      <span style={{ color: color || '#111' }}>{value}</span>
    </div>
  );
}

// Reporte de cierre de caja: se genera al hacer el "Cierre" de un
// turno (arqueo), y también se puede volver a ver desde el historial
// de arqueos. `report` viene de localdb.buildShiftReport(...), y
// `arqueo` trae counted_amount/difference cuando ya está cerrado.
export default function ArqueoReportModal({ report, arqueo, config: configProp, onClose }) {
  const { config: configCtx, formatCurrency } = useConfig();
  const config = configProp || configCtx;

  const start = report.shift_start ? new Date(report.shift_start) : null;
  const end = new Date(report.shift_end);
  const durationMin = start ? Math.round((end - start) / 60000) : null;
  const durationLabel = durationMin !== null ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m` : '—';

  const counted = arqueo?.counted_amount ?? report.counted_cash;
  const difference = arqueo?.difference ?? report.difference;

  const handleDownload = () => {
    const lines = [];
    lines.push((config?.name || 'Billar System').toUpperCase());
    lines.push('REPORTE DE CIERRE DE CAJA');
    lines.push('='.repeat(32));
    lines.push(`Apertura: ${start ? start.toLocaleString('es') : '—'}`);
    lines.push(`Cierre:   ${end.toLocaleString('es')}`);
    lines.push(`Duración: ${durationLabel}`);
    lines.push('-'.repeat(32));
    lines.push(`Fondo inicial:        ${formatCurrency(report.fondo_inicial)}`);
    lines.push(`Mesas (${report.sessions_count}):           ${formatCurrency(report.tables_total)}`);
    lines.push(`Ventas directas (${report.sales_count}):    ${formatCurrency(report.sales_total)}`);
    lines.push(`Ingresos manuales:    ${formatCurrency(report.cash_in)}`);
    lines.push(`Egresos manuales:     -${formatCurrency(report.cash_out)}`);
    lines.push('-'.repeat(32));
    lines.push(`TOTAL EFECTIVO:       ${formatCurrency(report.total_efectivo)}`);
    lines.push(`TOTAL QR:             ${formatCurrency(report.total_qr)}`);
    lines.push(`TOTAL GENERAL:        ${formatCurrency(report.total_general)}`);
    lines.push('-'.repeat(32));
    lines.push(`Esperado en caja (efectivo): ${formatCurrency(report.expected_cash)}`);
    if (counted !== undefined) lines.push(`Contado físicamente:         ${formatCurrency(counted)}`);
    if (difference !== undefined && difference !== null) {
      lines.push(`Diferencia:                  ${difference > 0 ? '+' : ''}${formatCurrency(difference)}`);
    }
    lines.push('-'.repeat(32));
    lines.push('PRODUCTOS VENDIDOS');
    if (report.top_products.length === 0) lines.push('  (sin productos vendidos en este turno)');
    report.top_products.forEach((p) => {
      lines.push(`  ${p.product_name} x${p.quantity}  —  ${formatCurrency(p.revenue)}`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arqueo-${end.toISOString().slice(0, 16).replace(/[:T]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-md rounded-xl overflow-hidden flex flex-col max-h-[90vh]" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="flex items-center justify-between p-4 border-b no-print shrink-0" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-bold text-white">Reporte de cierre de caja</h2>
          <button onClick={onClose} aria-label="Cerrar"><X size={20} className="text-gray-400" /></button>
        </div>

        <div className="overflow-y-auto">
          <div className="print-area p-5 text-sm space-y-3" style={{ backgroundColor: '#fff', color: '#111' }}>
            <div className="text-center">
              <div className="font-bold text-base">{config?.name || 'Billar System'}</div>
              <div className="text-xs" style={{ color: '#666' }}>Reporte de cierre de caja</div>
            </div>

            <div className="space-y-1 pb-2" style={{ borderBottom: '1px dashed #999' }}>
              <Row label="Apertura" value={start ? start.toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' }) : '—'} />
              <Row label="Cierre" value={end.toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })} />
              <Row label="Duración del turno" value={durationLabel} />
            </div>

            <div className="space-y-1 pb-2" style={{ borderBottom: '1px dashed #999' }}>
              <Row label="Fondo inicial" value={formatCurrency(report.fondo_inicial)} muted />
              <Row label={`Mesas (${report.sessions_count})`} value={formatCurrency(report.tables_total)} />
              <Row label={`Ventas directas (${report.sales_count})`} value={formatCurrency(report.sales_total)} />
              <Row label="Ingresos manuales" value={`+${formatCurrency(report.cash_in)}`} color="#0a8a3a" />
              <Row label="Egresos manuales" value={`-${formatCurrency(report.cash_out)}`} color="#c62828" />
            </div>

            <div className="space-y-1 pb-2" style={{ borderBottom: '1px dashed #999' }}>
              <Row label="TOTAL EFECTIVO" value={formatCurrency(report.total_efectivo)} bold />
              <Row label="TOTAL QR" value={formatCurrency(report.total_qr)} bold />
              <Row label="TOTAL GENERAL" value={formatCurrency(report.total_general)} bold color="#0a8a3a" />
            </div>

            <div className="space-y-1 pb-2" style={{ borderBottom: '1px dashed #999' }}>
              <Row label="Esperado en caja (efectivo)" value={formatCurrency(report.expected_cash)} muted />
              {counted !== undefined && <Row label="Contado físicamente" value={formatCurrency(counted)} />}
              {difference !== undefined && difference !== null && (
                <Row
                  label="Diferencia"
                  bold
                  value={`${difference > 0 ? '+' : ''}${formatCurrency(difference)}`}
                  color={difference === 0 ? '#111' : difference > 0 ? '#0a8a3a' : '#c62828'}
                />
              )}
            </div>

            <div>
              <div className="font-bold mb-1">Productos vendidos</div>
              {report.top_products.length === 0 ? (
                <div style={{ color: '#666' }}>Sin productos vendidos en este turno.</div>
              ) : (
                <div className="space-y-0.5">
                  {report.top_products.map((p) => (
                    <Row key={p.product_name} label={`${p.product_name} x${p.quantity}`} value={formatCurrency(p.revenue)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 p-4 pt-3 no-print shrink-0 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cerrar</button>
          <button onClick={handleDownload} className="btn-secondary flex-1 justify-center">
            <Download size={14} /> Descargar
          </button>
          <button onClick={() => window.print()} className="btn-primary flex-1 justify-center">
            <Printer size={14} /> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
