// ============================================================
// "api" local — mantiene la misma forma que el cliente axios
// original (api.get/post/put/delete → { data }) para no tener
// que reescribir cada pantalla, pero por dentro NO usa la red:
// todo se resuelve contra localdb.js (localStorage).
// ============================================================
import * as localdb from './localdb';

function ok(data) {
  return Promise.resolve({ data });
}

function fail(err) {
  const status = err.status || 500;
  const message = err.message || 'Error inesperado';
  const wrapped = new Error(message);
  wrapped.response = { status, data: { error: message } };
  return Promise.reject(wrapped);
}

function run(fn) {
  try {
    return ok(fn());
  } catch (err) {
    return fail(err);
  }
}

const routes = {
  get(url) {
    const [path, queryString] = url.split('?');
    const params = new URLSearchParams(queryString || '');

    if (path === '/tables') return run(() => localdb.listTables());
    if (path === '/products') return run(() => localdb.listProducts());
    if (path === '/config') return run(() => localdb.getConfig());
    if (path === '/sales') return run(() => localdb.listSales(parseInt(params.get('limit')) || 50));
    if (path === '/cash') return run(() => localdb.listCashMovements(parseInt(params.get('limit')) || 50));
    if (path === '/arqueos') return run(() => localdb.listArqueos(parseInt(params.get('limit')) || 50));
    if (path === '/sessions/history') return run(() => localdb.sessionsHistory(parseInt(params.get('limit')) || 50));
    if (path === '/reports/stats') return run(() => localdb.stats());
    if (path === '/reports/cash-summary') return run(() => localdb.cashSummary());
    if (path === '/reports/income') return run(() => localdb.income({ period: params.get('period') }));
    if (path === '/reports/top-products') return run(() => localdb.topProducts());
    if (path === '/reports/arqueo-esperado') return run(() => ({ expected: localdb.expectedForCierre() }));

    const sessionMatch = path.match(/^\/sessions\/(\d+)$/);
    if (sessionMatch) return run(() => localdb.getSession(sessionMatch[1]));

    const saleMatch = path.match(/^\/sales\/(\d+)$/);
    if (saleMatch) return run(() => localdb.getSale(saleMatch[1]));

    return fail(new Error(`Ruta no encontrada: GET ${path}`));
  },

  post(url, body = {}) {
    if (url === '/tables') return run(() => localdb.createTable(body));
    if (url === '/products') return run(() => localdb.createProduct(body));
    if (url === '/sales') return run(() => localdb.createSale(body));
    if (url === '/cash') return run(() => localdb.createCashMovement(body));
    if (url === '/arqueos') return run(() => localdb.createArqueo(body));
    if (url === '/sessions/open') return run(() => localdb.openSession(body));

    const closeMatch = url.match(/^\/sessions\/close\/(\d+)$/);
    if (closeMatch) return run(() => localdb.closeSession(closeMatch[1], body));

    const addProductMatch = url.match(/^\/sessions\/(\d+)\/products$/);
    if (addProductMatch) return run(() => localdb.addProductToSession(addProductMatch[1], body));

    const stockMatch = url.match(/^\/products\/(\d+)\/stock$/);
    if (stockMatch) return run(() => localdb.addStock(stockMatch[1], body));

    return fail(new Error(`Ruta no encontrada: POST ${url}`));
  },

  put(url, body = {}) {
    if (url === '/config') return run(() => localdb.updateConfig(body));

    const tableMatch = url.match(/^\/tables\/(\d+)$/);
    if (tableMatch) return run(() => localdb.updateTable(tableMatch[1], body));

    const productMatch = url.match(/^\/products\/(\d+)$/);
    if (productMatch) return run(() => localdb.updateProduct(productMatch[1], body));

    return fail(new Error(`Ruta no encontrada: PUT ${url}`));
  },

  delete(url) {
    const tableMatch = url.match(/^\/tables\/(\d+)$/);
    if (tableMatch) return run(() => localdb.deleteTable(tableMatch[1]));

    const productMatch = url.match(/^\/products\/(\d+)$/);
    if (productMatch) return run(() => localdb.deleteProduct(productMatch[1]));

    const removeProductMatch = url.match(/^\/sessions\/(\d+)\/products\/(\d+)$/);
    if (removeProductMatch) return run(() => localdb.removeProductFromSession(removeProductMatch[1], removeProductMatch[2]));

    return fail(new Error(`Ruta no encontrada: DELETE ${url}`));
  },
};

export default routes;
