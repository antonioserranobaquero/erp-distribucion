// Ejecutar con Playwright instalado. Todo acceso externo queda interceptado.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function initialize() {
  const company = '473e56d8-be5d-441d-bbbf-9a6010f35443';
  const id = '11111111-1111-4111-8111-111111111111';
  if (!location.pathname.endsWith('/login.html')) localStorage.setItem('erp_usuario_sesion', JSON.stringify({ id, nombre: 'Prueba', email: 'prueba@example.test', rol: 'SUPERADMIN', empresa_id: company, empresa_nombre: 'Empresa de prueba' }));
  const today = new Date().toISOString().slice(0, 10);
  const row = { id, empresa_id: company, nombre: 'Producto prueba', nombre_comercial: 'Cliente prueba', numero_albaran: 'ALB-1', numero_factura: 'FAC-1', fecha: today, fecha_salida: today, fecha_emision: today, created_at: today, cliente_id: id, producto_id: id, almacen_id: id, albaran_id: id, compra_id: id, proveedor_id: id, almacen_nombre: 'Cámara 1', estado: 'pendiente', total_importe: 120, total_kilos: 10, total_cajas: 2, subtotal: 120, kilos: 10, cajas: 2, kilos_stock: 10, cajas_stock: 2, precio_kg: 12, precio_coste: 8, stock_minimo_kilos: 20, rol: 'ADMIN', activo: true, email: 'prueba@example.test', repartidor: 'Prueba', creado_por: 'Prueba', cif_nif: 'TEST', cif: 'TEST', direccion: 'Calle de prueba', fecha_caducidad: '2027-01-01', lote: 'LOTE-1', permisos: null };
  window.__queries = [];
  window.__writes = [];
  window.supabase = { createClient() { return { rpc: async (name, args) => {
    window.__queries.push(name);
    if (name === 'erp_dashboard_resumen') return { data: { billed: 0, pending: 120, stock: 10, alertCount: 1, documents: [{ ...row, amount: 120, clientName: 'Cliente prueba' }], lowStock: [{ name: 'Producto prueba', kilos: 10 }] }, error: null };
    window.__writes.push({ operation: 'rpc', name });
    if (name === 'erp_guardar_albaran') return { data: { id, numero_albaran: 'ALB-000123', total_importe: 120 }, error: null };
    if (name === 'erp_transferir_stock') return { data: null, error: null };
    return { data: null, error: { code: 'PGRST202' } };
  }, from(table) {
    let rows = [{ ...row }];
    if (table === 'empresas') rows = [{ ...row, id: company }];
    let start = 0, end = 999, single = false;
    const filters = [];
    const chain = new Proxy({}, { get(_, key) {
      if (key === 'then') return (resolve, reject) => {
        window.__queries.push(table);
        const data = rows.filter(r => filters.every(f => f(r)));
        return Promise.resolve({ data: single ? data[0] || null : data.slice(start, end + 1), count: data.length, error: null }).then(resolve, reject);
      };
      return (...args) => {
        if (key === 'eq') filters.push(r => String(r[args[0]]) === String(args[1]));
        if (key === 'in') filters.push(r => args[1].map(String).includes(String(r[args[0]])));
        if (key === 'range') { start = args[0]; end = args[1]; }
        if (key === 'single' || key === 'maybeSingle') single = true;
        if (['insert', 'update', 'delete', 'upsert'].includes(key)) window.__writes.push({ table, operation: key });
        return chain;
      };
    }});
    return chain;
  }, auth: { signOut: async () => ({ error: null }) } }; } };
}
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  try {
    const context = await browser.newContext();
    await context.addInitScript(initialize);
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'erp.test') return route.fulfill({ status: 200, contentType: url.pathname.endsWith('.css') ? 'text/css' : 'application/javascript', body: '' });
      const file = decodeURIComponent(url.pathname.slice(1)) || 'index.html';
      try {
        return route.fulfill({ status: 200, contentType: file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'application/javascript' : 'text/html', body: await fs.readFile(path.join(root, file)) });
      } catch (_) { return route.fulfill({ status: 404, body: 'missing ' + file }); }
    });
    const results = [];
    for (const file of (await fs.readdir(root)).filter(n => n.endsWith('.html'))) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('dialog', d => d.dismiss());
      await page.goto('https://erp.test/' + file + '?id=11111111-1111-4111-8111-111111111111');
      if (file === 'conexion.html') await page.waitForURL('**/configuracion.html');
      await page.waitForTimeout(150);
      const state = await page.evaluate(() => ({ errorBanner: document.getElementById('erp-error')?.textContent || null, writes: window.__writes, queries: window.__queries }));
      results.push({ page: file, errors, ...state });
      await page.close();
    }
    await fs.writeFile(path.join(__dirname, 'browser-smoke-results.json'), JSON.stringify(results, null, 2));
    const failed = results.filter(r => r.errors.length || r.errorBanner || r.writes.length);
    const savePage = await context.newPage();
    savePage.on('dialog', d => d.dismiss());
    await savePage.goto('https://erp.test/albaranes.html');
    const saves = await savePage.evaluate(async () => {
      document.getElementById('clienteInput').value = 'Cliente prueba';
      document.getElementById('clienteIdHidden').value = '11111111-1111-4111-8111-111111111111';
      lineasAlbaran = [{ nombre: 'Producto prueba', producto_id: '11111111-1111-4111-8111-111111111111', cajas: 1, kilos: 10, kilos_brutos: 10, precio_kg: 12, subtotal: 120 }];
      await Promise.all([guardarEImprimirAlbaran(), guardarEImprimirAlbaran()]);
      return window.__writes;
    });
    if (saves.length !== 1 || saves[0].name !== 'erp_guardar_albaran') failed.push({ flow: 'doble-guardado-albaran', writes: saves });
    await savePage.close();
    console.log(JSON.stringify({ pages: results.length, failed }, null, 2));
    if (failed.length) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
