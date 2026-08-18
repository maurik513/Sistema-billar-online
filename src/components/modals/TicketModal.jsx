import { X, Printer } from 'lucide-react';

// Muestra el ticket dentro de la app (no en una ventana nueva).
// En iPhone, cuando la app está instalada como PWA (modo standalone),
// window.open() no tiene barra de navegación ni botón "atrás", así que
// el usuario quedaba atrapado en la pantalla del ticket. Este modal
// se cierra con el mismo botón "X"/"Cerrar" que el resto de la app,
// y usa window.print() con un área impresa (.ticket-print-area) que
// solo se muestra en la vista de impresión.
export default function TicketModal({ title = 'Mesa', dateLabel, rows, total, footer, config, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="flex items-center justify-between p-4 border-b no-print" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-bold text-white">Ticket</h2>
          <button onClick={onClose} aria-label="Cerrar">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="ticket-print-area p-5" style={{ fontFamily: "'Courier New', monospace", color: '#111', backgroundColor: '#fff' }}>
          <h1 className="text-center font-bold text-base m-0">{config?.name || 'Billar System'}</h1>
          <div className="text-center text-xs mb-2" style={{ color: '#555' }}>{dateLabel}</div>
          <div className="text-sm mb-1"><span className="font-bold">{title}</span></div>
          {rows.map((r, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>{r.label}</span>
              <span>{r.value}</span>
            </div>
          ))}
          <hr className="my-2" style={{ borderTop: '1px dashed #000' }} />
          <div className="flex justify-between font-bold text-base">
            <span>TOTAL</span>
            <span>{total}</span>
          </div>
          {footer && <div className="text-center text-xs mt-3" style={{ color: '#555' }}>{footer}</div>}
        </div>

        <div className="flex gap-2 p-4 pt-0 no-print">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cerrar</button>
          <button onClick={() => window.print()} className="btn-primary flex-1 justify-center">
            <Printer size={14} /> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
