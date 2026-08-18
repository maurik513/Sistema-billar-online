// ============================================================
// BASE DE DATOS LOCAL — reemplaza por completo al backend.
// Todo se guarda en localStorage, en el mismo navegador/dispositivo.
// No requiere internet, servidor ni base de datos externa.
// ============================================================

const STORAGE_KEY = 'billar_db_v1';

const DEFAULT_CONFIG = {
  name: 'Billar System',
  primary_color: '#00C853',
  secondary_color: '#1B1B1B',
  currency_symbol: 'Bs',
  currency: 'BOB',
  ticket_footer: 'Gracias por su visita',
  billing_mode: 'hour', // 'hour' | 'half_hour'
};

function emptyDB() {
  return {
    seq: 1,
    tables: [],
    sessions: [],
    session_products: [],
    products: [],
    sales: [],
    sale_items: [],
    stock_movements: [],
    cash_movements: [],
    arqueos: [],
    config: { ...DEFAULT_CONFIG },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDB();
    const parsed = JSON.parse(raw);
    // Rellena claves nuevas si vienen de una versión anterior del respaldo
    return { ...emptyDB(), ...parsed, config: { ...DEFAULT_CONFIG, ...(parsed.config || {}) } };
  } catch {
    return emptyDB();
  }
}

let db = load();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return true;
  } catch (err) {
    console.error('No se pudo guardar en almacenamiento local', err);
    return false;
  }
}

function nextId() {
  const id = db.seq;
  db.seq += 1;
  return id;
}

function nowISO() {
  return new Date().toISOString();
}

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function isWithinDays(iso, days) {
  if (!iso) return false;
  const d = new Date(iso).getTime();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return d >= cutoff;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ============================================================
// TURNO DE CAJA — un billar abre ~4pm y puede cerrar pasada la
// medianoche, así que "hoy" (fecha calendario) no sirve para
// agrupar ventas/arqueo. En su lugar, el "turno" va desde la
// última APERTURA de caja hasta su CIERRE (o hasta ahora si sigue
// abierto). Si nunca se usó "Abrir caja", se usa el día calendario
// como respaldo para no romper instalaciones existentes.
// ============================================================

function currentOpenApertura() {
  const aperturas = db.arqueos
    .filter((a) => a.type === 'apertura')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (!aperturas.length) return null;
  const last = aperturas[0];
  const closedAfter = db.arqueos.some(
    (a) => a.type === 'cierre' && new Date(a.created_at) > new Date(last.created_at)
  );
  return closedAfter ? null : last;
}

function inShift(iso) {
  if (!iso) return false;
  const apertura = currentOpenApertura();
  if (apertura) return new Date(iso) >= new Date(apertura.created_at);
  return isToday(iso); // respaldo: nunca se abrió turno todavía
}

function inRange(iso, startIso, endIso) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (startIso && t < new Date(startIso).getTime()) return false;
  if (endIso && t > new Date(endIso).getTime()) return false;
  return true;
}

class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// ============================================================
// MESAS
// ============================================================

function listTables() {
  return db.tables
    .slice()
    .sort((a, b) => a.id - b.id)
    .map((t) => {
      const session = db.sessions.find((s) => s.table_id === t.id && s.status === 'open');
      let products_total = 0;
      let session_id = null;
      let start_time = null;
      let opened_by_name = null;
      if (session) {
        session_id = session.id;
        start_time = session.start_time;
        opened_by_name = 'Cajero';
        products_total = db.session_products
          .filter((sp) => sp.session_id === session.id)
          .reduce((s, sp) => s + sp.subtotal, 0);
      }
      return { ...t, session_id, start_time, opened_by_name, products_total };
    });
}

function createTable({ name, price_per_hour }) {
  if (!name || !price_per_hour) throw new ApiError('Nombre y precio requeridos');
  const table = {
    id: nextId(),
    name,
    price_per_hour: parseFloat(price_per_hour),
    status: 'free',
    created_at: nowISO(),
  };
  db.tables.push(table);
  persist();
  return table;
}

function updateTable(id, { name, price_per_hour }) {
  const table = db.tables.find((t) => t.id === Number(id));
  if (!table) throw new ApiError('Mesa no encontrada', 404);
  table.name = name ?? table.name;
  table.price_per_hour = price_per_hour !== undefined ? parseFloat(price_per_hour) : table.price_per_hour;
  persist();
  return table;
}

function deleteTable(id) {
  const table = db.tables.find((t) => t.id === Number(id));
  if (!table) throw new ApiError('Mesa no encontrada', 404);
  if (table.status === 'occupied') throw new ApiError('No se puede eliminar una mesa ocupada');
  const openSession = db.sessions.find((s) => s.table_id === table.id && s.status === 'open');
  if (openSession) throw new ApiError('La mesa tiene una sesión activa');
  db.tables = db.tables.filter((t) => t.id !== table.id);
  persist();
  return { success: true };
}

// ============================================================
// SESIONES DE MESA
// ============================================================

function openSession({ table_id }) {
  const table = db.tables.find((t) => t.id === Number(table_id));
  if (!table) throw new ApiError('Mesa no encontrada', 404);
  if (table.status === 'occupied') throw new ApiError('La mesa ya está ocupada');

  const session = {
    id: nextId(),
    table_id: table.id,
    start_time: nowISO(),
    end_time: null,
    duration_minutes: null,
    table_cost: 0,
    products_total: 0,
    total: 0,
    notes: null,
    status: 'open',
  };
  db.sessions.push(session);
  table.status = 'occupied';
  persist();
  return { session_id: session.id };
}

function getSession(id) {
  const session = db.sessions.find((s) => s.id === Number(id));
  if (!session) throw new ApiError('Sesión no encontrada', 404);
  const table = db.tables.find((t) => t.id === session.table_id);
  const products = db.session_products
    .filter((sp) => sp.session_id === session.id)
    .sort((a, b) => new Date(a.added_at) - new Date(b.added_at));
  return {
    session: { ...session, table_name: table?.name, price_per_hour: table?.price_per_hour, opened_by_name: 'Cajero' },
    products,
  };
}

function addProductToSession(id, { product_id, quantity }) {
  const qty = parseInt(quantity) || 1;
  const session = db.sessions.find((s) => s.id === Number(id));
  if (!session || session.status !== 'open') throw new ApiError('Sesión no encontrada o cerrada');
  const product = db.products.find((p) => p.id === Number(product_id));
  if (!product) throw new ApiError('Producto no encontrado', 404);
  if (product.stock < qty) throw new ApiError('Stock insuficiente');

  const subtotal = round2(product.price * qty);
  db.session_products.push({
    id: nextId(),
    session_id: session.id,
    product_id: product.id,
    product_name: product.name,
    quantity: qty,
    unit_price: product.price,
    subtotal,
    added_at: nowISO(),
  });
  product.stock -= qty;
  db.stock_movements.push({
    id: nextId(),
    product_id: product.id,
    type: 'out',
    quantity: qty,
    reason: `Consumo sesión #${session.id}`,
    created_at: nowISO(),
  });

  session.products_total = round2(
    db.session_products.filter((sp) => sp.session_id === session.id).reduce((s, sp) => s + sp.subtotal, 0)
  );
  persist();
  return { products: db.session_products.filter((sp) => sp.session_id === session.id) };
}

function removeProductFromSession(id, itemId) {
  const item = db.session_products.find((sp) => sp.id === Number(itemId) && sp.session_id === Number(id));
  if (!item) throw new ApiError('Item no encontrado', 404);

  db.session_products = db.session_products.filter((sp) => sp.id !== item.id);
  const product = db.products.find((p) => p.id === item.product_id);
  if (product) product.stock += item.quantity;
  db.stock_movements.push({
    id: nextId(),
    product_id: item.product_id,
    type: 'in',
    quantity: item.quantity,
    reason: `Reverso consumo sesión #${id}`,
    created_at: nowISO(),
  });

  const session = db.sessions.find((s) => s.id === Number(id));
  if (session) {
    session.products_total = round2(
      db.session_products.filter((sp) => sp.session_id === session.id).reduce((s, sp) => s + sp.subtotal, 0)
    );
  }
  persist();
  return { products: db.session_products.filter((sp) => sp.session_id === Number(id)) };
}

function closeSession(id, { notes, payment_method } = {}) {
  const session = db.sessions.find((s) => s.id === Number(id));
  if (!session || session.status !== 'open') throw new ApiError('Sesión no encontrada o ya cerrada');
  const table = db.tables.find((t) => t.id === session.table_id);
  if (!['efectivo', 'qr'].includes(payment_method)) throw new ApiError('Selecciona el método de pago (efectivo o QR)');

  const start = new Date(session.start_time);
  const end = new Date();
  const durationMinutes = (end.getTime() - start.getTime()) / 60000;

  let billableHours;
  if (db.config.billing_mode === 'half_hour') {
    const halfHours = Math.ceil(durationMinutes / 30);
    billableHours = (halfHours * 30) / 60;
  } else {
    billableHours = durationMinutes / 60;
  }
  const tableCost = round2(billableHours * table.price_per_hour);
  const productsTotal = session.products_total || 0;
  const total = round2(tableCost + productsTotal);

  session.end_time = nowISO();
  session.duration_minutes = Math.round(durationMinutes);
  session.table_cost = tableCost;
  session.total = total;
  session.notes = notes || null;
  session.payment_method = payment_method;
  session.status = 'closed';
  table.status = 'free';

  db.cash_movements.push({
    id: nextId(),
    type: 'session',
    amount: total,
    payment_method,
    description: `Cierre mesa ${table.name}`,
    reference_id: session.id,
    created_at: nowISO(),
  });

  persist();
  return { session: { ...session, table_name: table.name } };
}

function sessionsHistory(limit = 50) {
  return db.sessions
    .filter((s) => s.status === 'closed' && inShift(s.end_time))
    .sort((a, b) => new Date(b.end_time) - new Date(a.end_time))
    .slice(0, limit)
    .map((s) => {
      const table = db.tables.find((t) => t.id === s.table_id);
      return { ...s, table_name: table?.name || '—', opened_by_name: 'Cajero' };
    });
}

// ============================================================
// PRODUCTOS / INVENTARIO
// ============================================================

function listProducts() {
  return db.products.filter((p) => p.active).sort((a, b) => a.name.localeCompare(b.name));
}

function createProduct({ name, price, stock, min_stock, category }) {
  if (!name || price === undefined || price === '') throw new ApiError('Nombre y precio requeridos');
  const product = {
    id: nextId(),
    name,
    price: parseFloat(price),
    stock: parseInt(stock) || 0,
    min_stock: parseInt(min_stock) || 5,
    category: category || 'general',
    active: true,
    created_at: nowISO(),
  };
  db.products.push(product);
  if (product.stock > 0) {
    db.stock_movements.push({
      id: nextId(),
      product_id: product.id,
      type: 'in',
      quantity: product.stock,
      reason: 'Stock inicial',
      created_at: nowISO(),
    });
  }
  persist();
  return product;
}

function updateProduct(id, { name, price, min_stock, category }) {
  const product = db.products.find((p) => p.id === Number(id));
  if (!product) throw new ApiError('Producto no encontrado', 404);
  product.name = name ?? product.name;
  product.price = price !== undefined ? parseFloat(price) : product.price;
  product.min_stock = min_stock !== undefined ? parseInt(min_stock) : product.min_stock;
  product.category = category ?? product.category;
  persist();
  return product;
}

function deleteProduct(id) {
  const product = db.products.find((p) => p.id === Number(id));
  if (!product) throw new ApiError('Producto no encontrado', 404);
  product.active = false;
  persist();
  return { success: true };
}

function addStock(id, { quantity, reason }) {
  const qty = parseInt(quantity);
  if (!qty || qty <= 0) throw new ApiError('Cantidad inválida');
  const product = db.products.find((p) => p.id === Number(id));
  if (!product) throw new ApiError('Producto no encontrado', 404);
  product.stock += qty;
  db.stock_movements.push({
    id: nextId(),
    product_id: product.id,
    type: 'in',
    quantity: qty,
    reason: reason || 'Entrada de stock',
    created_at: nowISO(),
  });
  persist();
  return product;
}

// ============================================================
// VENTAS DIRECTAS
// ============================================================

function listSales(limit = 50) {
  return db.sales
    .filter((s) => inShift(s.created_at))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit)
    .map((s) => ({
      ...s,
      user_name: 'Cajero',
      items_count: db.sale_items.filter((si) => si.sale_id === s.id).length,
    }));
}

function getSale(id) {
  const sale = db.sales.find((s) => s.id === Number(id));
  if (!sale) throw new ApiError('Venta no encontrada', 404);
  const items = db.sale_items.filter((si) => si.sale_id === sale.id);
  return { sale: { ...sale, user_name: 'Cajero' }, items };
}

function createSale({ items, payment_method }) {
  if (!items || !items.length) throw new ApiError('No hay productos en la venta');
  if (!['efectivo', 'qr'].includes(payment_method)) throw new ApiError('Selecciona el método de pago (efectivo o QR)');
  let total = 0;
  const productData = [];
  for (const item of items) {
    const product = db.products.find((p) => p.id === Number(item.product_id));
    if (!product) throw new ApiError(`Producto ${item.product_id} no encontrado`);
    const qty = parseInt(item.quantity) || 1;
    if (product.stock < qty) throw new ApiError(`Stock insuficiente para ${product.name}`);
    const subtotal = round2(product.price * qty);
    total += subtotal;
    productData.push({ product, qty, subtotal });
  }
  total = round2(total);

  const sale = { id: nextId(), total, payment_method, created_at: nowISO() };
  db.sales.push(sale);

  const saleItems = [];
  for (const { product, qty, subtotal } of productData) {
    const item = {
      id: nextId(),
      sale_id: sale.id,
      product_id: product.id,
      product_name: product.name,
      quantity: qty,
      unit_price: product.price,
      subtotal,
    };
    db.sale_items.push(item);
    saleItems.push(item);
    product.stock -= qty;
    db.stock_movements.push({
      id: nextId(),
      product_id: product.id,
      type: 'out',
      quantity: qty,
      reason: `Venta directa #${sale.id}`,
      created_at: nowISO(),
    });
  }

  db.cash_movements.push({
    id: nextId(),
    type: 'sale',
    amount: total,
    payment_method,
    description: `Venta directa #${sale.id}`,
    reference_id: sale.id,
    created_at: nowISO(),
  });

  persist();
  return { sale: { ...sale, user_name: 'Cajero' }, items: saleItems };
}

// ============================================================
// CAJA (movimientos manuales de ingreso/egreso) — siempre efectivo,
// ya que son movimientos físicos de la caja (compras, retiros, etc.)
// ============================================================

function listCashMovements(limit = 50) {
  return db.cash_movements
    .filter((c) => inShift(c.created_at))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit)
    .map((c) => ({ ...c, user_name: 'Cajero' }));
}

function createCashMovement({ type, amount, description }) {
  if (!['in', 'out'].includes(type)) throw new ApiError('Tipo inválido');
  const amt = parseFloat(amount);
  if (!amt || amt <= 0) throw new ApiError('Monto inválido');
  const movement = {
    id: nextId(),
    type,
    amount: amt,
    payment_method: 'efectivo',
    description: description || null,
    reference_id: null,
    created_at: nowISO(),
  };
  db.cash_movements.push(movement);
  persist();
  return { ...movement, user_name: 'Cajero' };
}

// ============================================================
// ARQUEOS DE CAJA (apertura / cierre de turno con conteo físico)
// ============================================================

function listArqueos(limit = 30) {
  return db.arqueos
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

function getArqueo(id) {
  const a = db.arqueos.find((x) => x.id === Number(id));
  if (!a) throw new ApiError('Arqueo no encontrado', 404);
  return a;
}

// Arma el desglose completo (efectivo/QR, mesas, ventas, top productos)
// de un turno, entre `startIso` (apertura, o null si nunca se abrió) y
// `endIso` (cierre o "ahora" si el turno sigue abierto).
function buildShiftReport(startIso, endIso, fondoInicial = 0) {
  const closedSessions = db.sessions.filter((s) => s.status === 'closed' && inRange(s.end_time, startIso, endIso));
  const sales = db.sales.filter((s) => inRange(s.created_at, startIso, endIso));
  const movements = db.cash_movements.filter(
    (c) => (c.type === 'in' || c.type === 'out') && inRange(c.created_at, startIso, endIso)
  );

  const tablesCash = round2(closedSessions.filter((s) => s.payment_method !== 'qr').reduce((s, x) => s + x.total, 0));
  const tablesQr = round2(closedSessions.filter((s) => s.payment_method === 'qr').reduce((s, x) => s + x.total, 0));
  const salesCash = round2(sales.filter((s) => s.payment_method !== 'qr').reduce((s, x) => s + x.total, 0));
  const salesQr = round2(sales.filter((s) => s.payment_method === 'qr').reduce((s, x) => s + x.total, 0));
  const cashIn = round2(movements.filter((m) => m.type === 'in').reduce((s, x) => s + x.amount, 0));
  const cashOut = round2(movements.filter((m) => m.type === 'out').reduce((s, x) => s + x.amount, 0));

  const totalEfectivo = round2(tablesCash + salesCash + cashIn - cashOut);
  const totalQr = round2(tablesQr + salesQr);
  const totalGeneral = round2(totalEfectivo + totalQr);
  const expectedCash = round2(fondoInicial + totalEfectivo);

  const productMap = {};
  db.session_products
    .filter((sp) => closedSessions.some((s) => s.id === sp.session_id))
    .forEach((sp) => {
      productMap[sp.product_name] = productMap[sp.product_name] || { product_name: sp.product_name, quantity: 0, revenue: 0 };
      productMap[sp.product_name].quantity += sp.quantity;
      productMap[sp.product_name].revenue += sp.subtotal;
    });
  db.sale_items
    .filter((si) => sales.some((s) => s.id === si.sale_id))
    .forEach((si) => {
      productMap[si.product_name] = productMap[si.product_name] || { product_name: si.product_name, quantity: 0, revenue: 0 };
      productMap[si.product_name].quantity += si.quantity;
      productMap[si.product_name].revenue += si.subtotal;
    });
  const top_products = Object.values(productMap)
    .map((p) => ({ ...p, revenue: round2(p.revenue) }))
    .sort((a, b) => b.quantity - a.quantity);

  return {
    shift_start: startIso,
    shift_end: endIso,
    fondo_inicial: round2(fondoInicial),
    sessions_count: closedSessions.length,
    sales_count: sales.length,
    tables_cash: tablesCash,
    tables_qr: tablesQr,
    tables_total: round2(tablesCash + tablesQr),
    sales_cash: salesCash,
    sales_qr: salesQr,
    sales_total: round2(salesCash + salesQr),
    cash_in: cashIn,
    cash_out: cashOut,
    total_efectivo: totalEfectivo,
    total_qr: totalQr,
    total_general: totalGeneral,
    expected_cash: expectedCash,
    top_products,
  };
}

function expectedForCierre() {
  const apertura = currentOpenApertura();
  const fondo = apertura ? apertura.counted_amount : 0;
  const report = buildShiftReport(apertura ? apertura.created_at : null, nowISO(), fondo);
  return report.expected_cash;
}

function createArqueo({ type, counted_amount, notes }) {
  if (!['apertura', 'cierre'].includes(type)) throw new ApiError('Tipo inválido');
  const counted = parseFloat(counted_amount);
  if (Number.isNaN(counted) || counted < 0) throw new ApiError('Monto contado inválido');

  const openApertura = currentOpenApertura();
  if (type === 'apertura' && openApertura) {
    throw new ApiError('Ya hay un turno abierto. Cierra la caja actual antes de abrir un turno nuevo.');
  }
  if (type === 'cierre' && !openApertura) {
    throw new ApiError('No hay un turno abierto para cerrar. Abre la caja primero.');
  }

  const createdAt = nowISO();
  let report = null;

  if (type === 'cierre') {
    report = buildShiftReport(openApertura.created_at, createdAt, openApertura.counted_amount);
  }

  const expected = report ? report.expected_cash : null;
  const record = {
    id: nextId(),
    type,
    expected_amount: expected,
    counted_amount: round2(counted),
    difference: type === 'cierre' ? round2(counted - expected) : null,
    notes: notes || null,
    created_at: createdAt,
  };

  if (report) {
    record.report = { ...report, counted_cash: record.counted_amount, difference: record.difference };
  }

  db.arqueos.push(record);
  persist();
  return record;
}

// ============================================================
// REPORTES
// ============================================================

function stats() {
  const todaySessionsIncome = db.sessions
    .filter((s) => s.status === 'closed' && isToday(s.end_time))
    .reduce((sum, s) => sum + s.total, 0);
  const todaySalesIncome = db.sales.filter((s) => isToday(s.created_at)).reduce((sum, s) => sum + s.total, 0);
  const todaySessions = db.sessions.filter((s) => s.status === 'closed' && isToday(s.end_time)).length;
  const activeTables = db.tables.filter((t) => t.status === 'occupied').length;
  const lowStock = db.products.filter((p) => p.active && p.stock <= p.min_stock).length;

  return {
    today_income: round2(todaySessionsIncome + todaySalesIncome),
    active_tables: activeTables,
    today_sessions: todaySessions,
    low_stock_products: lowStock,
  };
}

function cashSummary() {
  const apertura = currentOpenApertura();
  const startIso = apertura ? apertura.created_at : null;
  const fondo = apertura ? apertura.counted_amount : 0;
  const report = buildShiftReport(startIso, nowISO(), fondo);

  return {
    shift_open: !!apertura,
    shift_start: startIso,
    fondo_inicial: report.fondo_inicial,
    tables_income: report.tables_total,
    sales_income: report.sales_total,
    cash_in: report.cash_in,
    cash_out: report.cash_out,
    total_efectivo: report.total_efectivo,
    total_qr: report.total_qr,
    total_income: report.total_general,
  };
}

function income({ period }) {
  let days, groupFn;
  if (period === 'month') {
    days = 30;
    groupFn = (d) => d.toISOString().slice(0, 10);
  } else if (period === 'year') {
    days = 365;
    groupFn = (d) => d.toISOString().slice(0, 7);
  } else {
    days = 7;
    groupFn = (d) => d.toISOString().slice(0, 10);
  }

  const map = {};
  db.sessions
    .filter((s) => s.status === 'closed' && isWithinDays(s.end_time, days))
    .forEach((s) => {
      const label = groupFn(new Date(s.end_time));
      map[label] = map[label] || { label, income: 0, sessions: 0 };
      map[label].income += s.total;
      map[label].sessions += 1;
    });
  db.sales
    .filter((s) => isWithinDays(s.created_at, days))
    .forEach((s) => {
      const label = groupFn(new Date(s.created_at));
      map[label] = map[label] || { label, income: 0, sessions: 0 };
      map[label].income += s.total;
    });

  const chart_data = Object.values(map)
    .map((r) => ({ ...r, income: round2(r.income) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const total_income = round2(chart_data.reduce((s, r) => s + r.income, 0));
  const total_sessions = chart_data.reduce((s, r) => s + r.sessions, 0);
  const avg_per_session = total_sessions > 0 ? round2(total_income / total_sessions) : 0;

  return { total_income, total_sessions, avg_per_session, chart_data };
}

function topProducts() {
  const map = {};
  [...db.session_products, ...db.sale_items].forEach((item) => {
    map[item.product_name] = map[item.product_name] || { product_name: item.product_name, total_quantity: 0, total_revenue: 0 };
    map[item.product_name].total_quantity += item.quantity;
    map[item.product_name].total_revenue += item.subtotal;
  });
  return Object.values(map)
    .sort((a, b) => b.total_quantity - a.total_quantity)
    .slice(0, 10);
}

// ============================================================
// CONFIGURACIÓN
// ============================================================

function getConfig() {
  return { ...db.config };
}

function updateConfig(patch) {
  const allowedKeys = ['name', 'primary_color', 'secondary_color', 'currency_symbol', 'currency', 'ticket_footer', 'billing_mode', 'logo'];
  for (const key of allowedKeys) {
    if (patch[key] !== undefined) db.config[key] = String(patch[key]);
  }
  persist();
  return { ...db.config };
}

// ============================================================
// RESPALDO / RESTAURACIÓN (exportar-importar JSON)
// ============================================================

function exportBackup() {
  return JSON.stringify(db, null, 2);
}

function importBackup(jsonString) {
  const parsed = JSON.parse(jsonString);
  if (typeof parsed !== 'object' || parsed === null) throw new ApiError('Archivo de respaldo inválido');
  db = { ...emptyDB(), ...parsed, config: { ...DEFAULT_CONFIG, ...(parsed.config || {}) } };
  persist();
  return true;
}

function wipeAll() {
  db = emptyDB();
  persist();
  return true;
}

export {
  ApiError,
  listTables, createTable, updateTable, deleteTable,
  openSession, getSession, addProductToSession, removeProductFromSession, closeSession, sessionsHistory,
  listProducts, createProduct, updateProduct, deleteProduct, addStock,
  listSales, getSale, createSale,
  listCashMovements, createCashMovement,
  listArqueos, getArqueo, createArqueo, expectedForCierre, currentOpenApertura,
  stats, cashSummary, income, topProducts,
  getConfig, updateConfig,
  exportBackup, importBackup, wipeAll,
};
