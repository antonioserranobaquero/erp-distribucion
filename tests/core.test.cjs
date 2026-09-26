const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const company = '473e56d8-be5d-441d-bbbf-9a6010f35443';
function boot(session = { id: 'u', rol: 'ADMIN', empresa_id: company }) {
  const storage = new Map(session ? [['erp_usuario_sesion', JSON.stringify(session)]] : []);
  const sandbox = { URL, console, setTimeout, clearTimeout, document: { body: null }, localStorage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key)
  }};
  sandbox.window = sandbox;
  sandbox.location = { href: 'https://example.test/index.html' };
  sandbox.addEventListener = () => {};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'erp-core.js'), 'utf8'), sandbox);
  return { ERP: sandbox.ERP, storage, sandbox };
}
function fakeDatabase(rows, cap = 1000, failureAt = Infinity) {
  const calls = [];
  return { calls, from(table) {
    let offset = 0, end = 499, counting = false;
    const filters = [];
    const query = {
      select(columns, opts) { counting = opts?.count === 'exact'; return query; },
      eq(key, value) { filters.push(r => String(r[key]) === String(value)); return query; },
      in(key, ids) { filters.push(r => ids.map(String).includes(String(r[key]))); return query; },
      order() { return query; },
      range(a, b) { offset = a; end = b; return query; },
      then(resolve, reject) {
        calls.push({ table, offset });
        const data = rows.filter(r => filters.every(f => f(r)));
        return Promise.resolve(offset >= failureAt ? { error: { message: 'sin conexión' } } : {
          data: data.slice(offset, Math.min(end + 1, offset + cap)), count: counting ? data.length : null, error: null
        }).then(resolve, reject);
      }
    };
    return query;
  }};
}
test('lectura completa incluso si el servidor limita a 137 filas por página', async () => {
  const { ERP } = boot();
  const rows = Array.from({ length: 1203 }, (_, id) => ({ id, empresa_id: company }));
  const db = fakeDatabase([...rows, { id: 9000, empresa_id: 'otra' }], 137);
  const result = await ERP.readAll(db, 'albaranes', company);
  assert.equal(result.length, 1203);
  assert.equal(new Set(result.map(r => r.id)).size, 1203);
  assert.equal(db.calls.length, 9);
});
test('un fallo en la segunda página rechaza todo el resumen', async () => {
  const { ERP } = boot();
  const db = fakeDatabase(Array.from({ length: 600 }, (_, id) => ({ id, empresa_id: company })), 500, 500);
  await assert.rejects(ERP.readAll(db, 'albaranes', company), /sin conexión/);
});
test('no hay consultas sin empresa ni con páginas de tamaño cero', async () => {
  const { ERP } = boot();
  const db = fakeDatabase([]);
  await assert.rejects(ERP.readAll(db, 'clientes', null));
  await assert.rejects(ERP.readAll(db, 'clientes', company, { pageSize: 0 }));
  assert.equal(db.calls.length, 0);
});
test('consulta por ids vacíos no accede a la base de datos', async () => {
  const { ERP } = boot();
  const db = fakeDatabase([]);
  assert.equal((await ERP.readByIds(db, 'lineas_albaran', company, 'albaran_id', [])).length, 0);
  assert.equal(db.calls.length, 0);
});
test('consulta por ids divide 205 ids en lotes sin perder ni duplicar datos', async () => {
  const { ERP } = boot();
  const rows = Array.from({ length: 205 }, (_, id) => ({ id, albaran_id: id, empresa_id: company }));
  const db = fakeDatabase(rows);
  const result = await ERP.readByIds(db, 'lineas_albaran', company, 'albaran_id', [...rows.map(r => r.id), 0]);
  assert.equal(result.length, 205);
  assert.equal(db.calls.length, 3);
});
test('los ceros explícitos no se sustituyen por valores alternativos', () => {
  const { ERP } = boot();
  const data = ERP.dashboardData(
    [{ id: 1, total_importe: 0, total: 99, estado: 'facturado' }, { id: 2, estado: 'pendiente' }], [],
    [{ id: 1, kilos_stock: 0, stock: 50, stock_minimo_kilos: 0 }, { id: 2, kilos_stock: 5, stock_minimo_kilos: 0 }],
    [{ albaran_id: 1, subtotal: 70 }, { albaran_id: 2, kilos: 3, precio_kg: 4 }]
  );
  assert.equal(data.billed, 0);
  assert.equal(data.pending, 12);
  assert.equal(data.stock, 5);
  assert.equal(data.lowStock.length, 1);
});
test('empresa activa no permite desviar una sesión normal a otra empresa', () => {
  const { ERP, storage } = boot();
  storage.set('empresa_id_activo', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  assert.equal(ERP.companyId(), company);
});
test('superadmin conserva la inspección autorizada', () => {
  const { ERP, storage } = boot({ id: 'u', rol: 'SUPERADMIN', empresa_id: company });
  storage.set('empresa_id_activo', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  assert.equal(ERP.companyId(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
});
test('sin sesión o sin empresa no se usa una empresa por defecto', () => {
  assert.throws(() => boot(null).ERP.companyId());
  assert.throws(() => boot({ id: 'u' }).ERP.companyId());
});
test('cerrar sesión conserva preferencias y borra todas sus claves', () => {
  const { ERP, storage } = boot();
  storage.set('preferencia_impresora', 'termica');
  storage.set('empresa_id_activo', company);
  ERP.clearSession();
  assert.equal(storage.get('preferencia_impresora'), 'termica');
  assert.equal(storage.has('erp_usuario_sesion'), false);
  assert.equal(storage.has('empresa_id_activo'), false);
});
test('escape de HTML y validación de URL de imágenes', () => {
  const { ERP } = boot();
  assert.equal(ERP.escapeHTML('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(ERP.safeImageURL('javascript:alert(1)'), '');
  assert.equal(ERP.safeImageURL('data:image/svg+xml,<svg onload=alert(1)>'), '');
  assert.equal(ERP.safeImageURL('https://example.test/logo.png'), 'https://example.test/logo.png');
});
test('grupos soportan ids numéricos, texto y nombres de propiedades especiales', () => {
  const { ERP } = boot();
  const groups = ERP.groupBy([{ parent: 1 }, { parent: '1' }, { parent: '__proto__' }], 'parent');
  assert.equal(groups.get('1').length, 2);
  assert.equal(groups.get('__proto__').length, 1);
});
test('dos clics de guardado concurrentes ejecutan una única operación', async () => {
  const { ERP } = boot();
  let calls = 0;
  const save = () => { calls++; return new Promise(resolve => setTimeout(() => resolve('ok'), 5)); };
  const first = ERP.runOnce('guardar', save);
  const second = ERP.runOnce('guardar', save);
  assert.equal(first, second);
  await Promise.all([first, second]);
  assert.equal(calls, 1);
  await ERP.runOnce('guardar', save);
  assert.equal(calls, 2);
});
test('todos los scripts se pueden compilar y los recursos locales existen', () => {
  for (const name of fs.readdirSync(root).filter(n => /\.(html|js)$/.test(n))) {
    const source = fs.readFileSync(path.join(root, name), 'utf8');
    const scripts = name.endsWith('.js') ? [source] : [...source.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
    for (const script of scripts) assert.doesNotThrow(() => new vm.Script(script, { filename: name }));
    if (name.endsWith('.html')) for (const [, ref] of source.matchAll(/(?:src|href)="([^"#]+)"/g)) {
      if (/^(https?:|data:|mailto:|tel:|javascript:|\$\{)/.test(ref) || ref.includes('${')) continue;
      assert.ok(fs.existsSync(path.join(root, ref.split('?')[0])), `${name}: falta ${ref}`);
    }
  }
});

test('saldos: cobros, abonos, estados excluidos y cero explícito', () => {
  const { ERP } = boot();
  const invoices = [
    { cliente_id: 'a', total_importe: 120 },
    { cliente_id: 'a', total_importe: -20 },
    { cliente_id: 'a', total_importe: 90, cobrado: true },
    { cliente_id: 'a', total_importe: 90, estado_cobro: 'cobrada' },
    { cliente_id: 'a', total_importe: 90, estado: 'cobrada' },
    { cliente_id: 'a', total_importe: 90, estado: 'anulada' },
    { cliente_id: 'a', total_importe: 90, estado: 'borrador' },
    { cliente_id: 'a', total_importe: 0, total_factura: 999 },
    { cliente_id: 'b', total_factura: 0.1 },
    { cliente_id: 'b', total: 0.2 }
  ];
  const balances = ERP.clientBalances(invoices);
  assert.equal(balances.get('a'), 100);
  assert.equal(balances.get('b'), 0.3);
});
test('CSV: neutraliza fórmulas y conserva comillas, saltos y delimitadores', () => {
  const { ERP } = boot();
  assert.equal(ERP.csvText([['=SUM(A1)', '  +cmd', '@x', '-12', 'A;B', 'a"b', 'a\nb', null]]),
    '"\'=SUM(A1)";"\'  +cmd";"\'@x";"\'-12";"A;B";"a""b";"a\nb";""');
});
