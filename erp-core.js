/* Utilidades compartidas. Los permisos del navegador NO sustituyen RLS. */
(function (root) {
  'use strict';
  const sessionKeys = ['erp_usuario_sesion', 'usuario_sesion', 'user_session', 'sesion'];
  const contextKeys = ['empresa_id_activo', 'empresa_nombre_activo', 'empresa_logo_activo', 'MODO_DIOS_EMPRESA_ID', 'MODO_DIOS_EMPRESA_NOMBRE'];
  let client;
  function getClient() {
    if (!client) {
      if (!root.supabase || !root.ERP_CONFIG?.url || !root.ERP_CONFIG?.publishableKey) throw new Error('No se ha podido cargar la conexión. Comprueba la red y erp-config.js.');
      client = root.supabase.createClient(root.ERP_CONFIG.url, root.ERP_CONFIG.publishableKey);
    }
    return client;
  }
  function readSession() {
    for (const key of sessionKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const value = JSON.parse(raw);
        if (value && (value.id || value.email)) return value;
      } catch (_) { /* Probar la siguiente clave antigua. */ }
    }
    return null;
  }
  function clearSession() {
    for (const key of [...sessionKeys, ...contextKeys]) localStorage.removeItem(key);
  }
  function companyId() {
    const session = readSession();
    if (!session) throw new Error('Inicia sesión para seleccionar una empresa.');
    const superadmin = session.es_superadmin === true || String(session.rol).toUpperCase() === 'SUPERADMIN';
    const inspection = superadmin && (localStorage.getItem('empresa_id_activo') || localStorage.getItem('MODO_DIOS_EMPRESA_ID'));
    const id = inspection || session.empresa_id;
    if (!id || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(String(id))) {
      throw new Error('La sesión no tiene una empresa válida. Selecciona una empresa o vuelve a iniciar sesión.');
    }
    return String(id);
  }
  function number(value) {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
  }
  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  }
  function safeImageURL(value) {
    if (!value) return '';
    if (/^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(value)) return value;
    try {
      const url = new URL(value, root.location.href);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch (_) { return ''; }
  }
  function groupBy(rows, key) {
    const groups = new Map();
    for (const row of rows || []) {
      const id = String(typeof key === 'function' ? key(row) : row[key]);
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(row);
    }
    return groups;
  }
  function indexBy(rows, key = 'id') {
    return new Map((rows || []).map(row => [String(row[key]), row]));
  }
  function debounce(fn, delay = 120) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }
  const searchTimers = new WeakMap();
  const pendingOperations = new Map();
  function runOnce(key, action) {
    if (pendingOperations.has(key)) return pendingOperations.get(key);
    const promise = Promise.resolve().then(action).finally(() => pendingOperations.delete(key));
    pendingOperations.set(key, promise);
    return promise;
  }
  function scheduleSearch(element, fn) {
    clearTimeout(searchTimers.get(element));
    searchTimers.set(element, setTimeout(fn, 120));
  }
  // El count inicial detecta también límites del servidor inferiores a pageSize.
  // Cada página usa un constructor nuevo y orden estable por id.
  async function readAll(client, table, company, options = {}) {
    if (!company) throw new Error('No se puede consultar sin empresa.');
    const pageSize = options.pageSize ?? 500;
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new Error('Tamaño de página inválido.');
    const rows = [];
    let expected = null;
    for (;;) {
      let query = client.from(table).select(options.columns || '*', rows.length === 0 ? { count: 'exact' } : {})
        .eq('empresa_id', company);
      if (options.filter) query = options.filter(query);
      query = query.order('id', { ascending: true }).range(rows.length, rows.length + pageSize - 1);
      const { data, error, count } = await query;
      if (error) throw new Error('No se pudo cargar ' + table + ': ' + error.message);
      if (!Array.isArray(data)) throw new Error('Respuesta inválida de ' + table);
      if (rows.length === 0 && Number.isInteger(count)) expected = count;
      if (expected > 200000 || rows.length + data.length > 200000) throw new Error('Demasiados registros en ' + table + '. Se necesita agregación en servidor.');
      rows.push(...data);
      if (expected !== null && rows.length >= expected) return rows;
      if (data.length === 0) {
        if (expected !== null && rows.length < expected) throw new Error('La lectura de ' + table + ' cambió o quedó incompleta. Vuelve a cargar.');
        return rows;
      }
      if (expected === null && data.length < pageSize) return rows;
    }
  }
  async function readByIds(client, table, company, column, ids) {
    const unique = [...new Set(ids.filter(id => id !== null && id !== undefined).map(String))];
    const batches = [];
    for (let offset = 0; offset < unique.length; offset += 100) batches.push(unique.slice(offset, offset + 100));
    const rows = [];
    // Máximo cuatro consultas de lotes simultáneas; las páginas son secuenciales.
    for (let offset = 0; offset < batches.length; offset += 4) {
      const results = await Promise.all(batches.slice(offset, offset + 4).map(ids => readAll(client, table, company, { filter: q => q.in(column, ids) })));
      for (const batch of results) rows.push(...batch);
    }
    return rows;
  }
  function lineAmount(line) {
    return number(line.subtotal ?? line.importe ?? (number(line.kilos) * number(line.precio_kg ?? line.precio)));
  }
  function documentAmount(document, lines = []) {
    return number(document.total_importe ?? document.total ?? lines.reduce((sum, line) => sum + lineAmount(line), 0));
  }
  function dashboardData(albaranes, clientes, productos, lineas) {
    const clients = indexBy(clientes);
    const lines = groupBy(lineas, line => line.albaran_id ?? line.id_albaran);
    let billed = 0, pending = 0, stock = 0;
    const documents = albaranes.map(row => {
      const amount = documentAmount(row, lines.get(String(row.id)) || []);
      if (String(row.estado).toLowerCase() === 'facturado') billed += amount;
      else pending += amount;
      const client = clients.get(String(row.cliente_id));
      return { ...row, amount, clientName: client?.nombre_comercial || client?.nombre || client?.razon_social || row.cliente_nombre || 'Cliente' };
    });
    documents.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')) || String(b.id).localeCompare(String(a.id)));
    const lowStock = [];
    for (const product of productos) {
      const kilos = number(product.kilos_stock ?? product.stock_kilos ?? product.stock);
      stock += kilos;
      if (kilos <= number(product.stock_minimo_kilos ?? 20)) lowStock.push({ name: product.nombre || product.nombre_producto || 'Producto #' + product.id, kilos });
    }
    return { billed, pending, stock, documents, lowStock };
  }
  function clientBalances(invoices) {
    const balances = new Map();
    for (const invoice of invoices) {
      const state = String(invoice.estado || '').toLowerCase();
      if (!invoice.cliente_id || ['anulada', 'anulado', 'cancelada', 'cancelado', 'borrador'].includes(state) || invoice.cobrado === true || String(invoice.estado_cobro || state).toLowerCase() === 'cobrada') continue;
      // Céntimos para evitar acumulación de errores binarios. Los abonos restan.
      const cents = Math.round(number(invoice.total_importe ?? invoice.total_factura ?? invoice.total) * 100);
      const key = String(invoice.cliente_id);
      balances.set(key, (balances.get(key) || 0) + cents);
    }
    return new Map([...balances].map(([key, cents]) => [key, cents / 100]));
  }
  function csvText(rows) {
    return rows.map(row => row.map(value => {
      let text = String(value ?? '');
      // Neutralizar fórmulas de hojas de cálculo, incluso tras espacios/control.
      if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    }).join(';')).join('\r\n');
  }
  function showError(error) {
    console.error(error);
    if (!document.body) return;
    let box = document.getElementById('erp-error');
    if (!box) {
      box = document.createElement('div');
      box.id = 'erp-error';
      box.setAttribute('role', 'alert');
      box.className = 'no-print';
      box.style.cssText = 'padding:14px;margin:16px;background:#fff1f2;color:#9f1239;border:1px solid #fda4af;border-radius:8px';
      document.body.prepend(box);
    }
    box.textContent = 'No se ha podido completar la operación. ' + (error?.message || 'Comprueba la conexión y vuelve a intentarlo.');
  }
  root.ERP = Object.freeze({ getClient, readSession, clearSession, companyId, number, escapeHTML, safeImageURL, groupBy, indexBy, debounce, scheduleSearch, runOnce, readAll, readByIds, lineAmount, documentAmount, dashboardData, clientBalances, csvText, showError });
  root.addEventListener('unhandledrejection', event => showError(event.reason));
})(window);
