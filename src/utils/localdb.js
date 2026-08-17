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
  currency_symbol: '$',
  currency: 'USD',
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

function closeSession(id, { notes } = {}) {
  const session = db.sessions.find((s) => s.id === Number(id));
  if (!session || session.status !== 'open') throw new ApiError('Sesión no encontrada o ya cerrada');
  const table = db.tables.find((t) => t.id === session.table_id);

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
  session.status = 'closed';
  table.status = 'free';

  db.cash_movements.push({
    id: nextId(),
    type: 'session',
    amount: total,
    description: `Cierre mesa ${table.name}`,
    reference_id: session.id,
    created_at: nowISO(),
  });

  persist();
  return { session: { ...session, table_name: table.name } };
}

function sessionsHistory(limit = 50) {
  return db.sessions
    .filter((s) => s.status === 'closed' && isToday(s.end_time))
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
    .filter((s) => isToday(s.created_at))
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

function createSale({ items }) {
  if (!items || !items.length) throw new ApiError('No hay productos en la venta');
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

  const sale = { id: nextId(), total, created_at: nowISO() };
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
    description: `Venta directa #${sale.id}`,
    reference_id: sale.id,
    created_at: nowISO(),
  });

  persist();
  return { sale: { ...sale, user_name: 'Cajero' }, items: saleItems };
}

// ============================================================
// CAJA (movimientos manuales de ingreso/egreso)
// ============================================================

function listCashMovements(limit = 50) {
  return db.cash_movements
    .slice()
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
    description: description || null,
    reference_id: null,
    created_at: nowISO(),
  };
  db.cash_movements.push(movement);
  persist();
  return { ...movement, user_name: 'Cajero' };
}

// ============================================================
// ARQUEOS DE CAJA (apertura / cierre con conteo físico)
// ============================================================

function lastOpenArqueoToday() {
  return db.arqueos
    .filter((a) => a.type === 'apertura' && isToday(a.created_at))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null;
}

function listArqueos(limit = 30) {
  return db.arqueos
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

function expectedForCierre() {
  const apertura = lastOpenArqueoToday();
  const fondo = apertura ? apertura.counted_amount : 0;
  const cs = cashSummary();
  return round2(fondo + cs.total_income);
}

function createArqueo({ type, counted_amount, notes }) {
  if (!['apertura', 'cierre'].includes(type)) throw new ApiError('Tipo inválido');
  const counted = parseFloat(counted_amount);
  if (Number.isNaN(counted) || counted < 0) throw new ApiError('Monto contado inválido');

  let expected = 0;
  if (type === 'cierre') expected = expectedForCierre();

  const record = {
    id: nextId(),
    type,
    expected_amount: type === 'cierre' ? expected : null,
    counted_amount: round2(counted),
    difference: type === 'cierre' ? round2(counted - expected) : null,
    notes: notes || null,
    created_at: nowISO(),
  };
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
  const tablesIncome = db.sessions
    .filter((s) => s.status === 'closed' && isToday(s.end_time))
    .reduce((sum, s) => sum + s.total, 0);
  const salesIncome = db.sales.filter((s) => isToday(s.created_at)).reduce((sum, s) => sum + s.total, 0);
  const cashIn = db.cash_movements
    .filter((c) => c.type === 'in' && isToday(c.created_at))
    .reduce((sum, c) => sum + c.amount, 0);
  const cashOut = db.cash_movements
    .filter((c) => c.type === 'out' && isToday(c.created_at))
    .reduce((sum, c) => sum + c.amount, 0);

  return {
    tables_income: round2(tablesIncome),
    sales_income: round2(salesIncome),
    cash_in: round2(cashIn),
    cash_out: round2(cashOut),
    total_income: round2(tablesIncome + salesIncome + cashIn - cashOut),
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
  listArqueos, createArqueo, expectedForCierre, lastOpenArqueoToday,
  stats, cashSummary, income, topProducts,
  getConfig, updateConfig,
  exportBackup, importBackup, wipeAll,
};
