// Genera un recibo imprimible en una ventana nueva usando solo el
// navegador (window.print()). No depende de ningún servidor.

function baseStyles(config) {
  return `
    body { font-family: 'Courier New', monospace; width: 280px; margin: 0 auto; padding: 16px 8px; color: #000; }
    h1 { font-size: 16px; text-align: center; margin: 0 0 4px; }
    .muted { color: #555; font-size: 11px; text-align: center; margin-bottom: 10px; }
    .row { display: flex; justify-content: space-between; font-size: 13px; margin: 2px 0; }
    hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
    .total { font-weight: bold; font-size: 15px; }
    .footer { text-align: center; font-size: 11px; margin-top: 12px; color: #555; }
    @media print { @page { margin: 0; } body { padding: 8px; } }
  `;
}

function openAndPrint(html) {
  const win = window.open('', '_blank', 'width=320,height=600');
  if (!win) {
    alert('El navegador bloqueó la ventana de impresión. Habilita las ventanas emergentes para imprimir tickets.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

export function printSessionReceipt({ session, items, config }) {
  const itemsHTML = (items || [])
    .map((i) => `<div class="row"><span>${i.product_name} x${i.quantity}</span><span>${config.currency_symbol}${i.subtotal.toFixed(2)}</span></div>`)
    .join('');

  const html = `
    <html><head><meta charset="utf-8"><title>Ticket</title><style>${baseStyles(config)}</style></head>
    <body>
      <h1>${config.name || 'Billar System'}</h1>
      <div class="muted">${new Date(session.end_time || Date.now()).toLocaleString('es')}</div>
      <div class="row"><span>Mesa</span><span>${session.table_name || ''}</span></div>
      <div class="row"><span>Tiempo de juego</span><span>${config.currency_symbol}${(session.table_cost || 0).toFixed(2)}</span></div>
      ${itemsHTML}
      <hr>
      <div class="row total"><span>TOTAL</span><span>${config.currency_symbol}${(session.total || 0).toFixed(2)}</span></div>
      <div class="footer">${config.ticket_footer || ''}</div>
    </body></html>
  `;
  openAndPrint(html);
}

export function printSaleReceipt({ sale, items, config }) {
  const itemsHTML = (items || [])
    .map((i) => `<div class="row"><span>${i.product_name} x${i.quantity}</span><span>${config.currency_symbol}${i.subtotal.toFixed(2)}</span></div>`)
    .join('');

  const html = `
    <html><head><meta charset="utf-8"><title>Ticket</title><style>${baseStyles(config)}</style></head>
    <body>
      <h1>${config.name || 'Billar System'}</h1>
      <div class="muted">${new Date(sale.created_at || Date.now()).toLocaleString('es')}</div>
      ${itemsHTML}
      <hr>
      <div class="row total"><span>TOTAL</span><span>${config.currency_symbol}${(sale.total || 0).toFixed(2)}</span></div>
      <div class="footer">${config.ticket_footer || ''}</div>
    </body></html>
  `;
  openAndPrint(html);
}
