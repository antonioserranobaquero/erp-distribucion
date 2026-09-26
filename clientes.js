/* Clientes: altas, edición y saldo de facturas. Nunca modifica documentos históricos. */
const db = ERP.getClient();
let clientesLista = [];
let clientesVisibles = [];
let guardandoCliente = false;
let focoAnteriorCliente;

document.addEventListener('DOMContentLoaded', cargarClientes);

async function cargarClientes() {
  try {
    const empresa = ERP.companyId();
    const [clientes, facturas] = await Promise.all([
      ERP.readAll(db, 'clientes', empresa),
      ERP.readAll(db, 'facturas', empresa, { columns: 'id,cliente_id,total_importe,total_factura,total,estado,estado_cobro,cobrado' })
    ]);
    const saldos = ERP.clientBalances(facturas);
    clientesLista = clientes.map(c => ({ ...c, deuda_pendiente: saldos.get(String(c.id)) || 0 }));
    clientesLista.sort((a, b) => nombreCliente(a).localeCompare(nombreCliente(b), 'es'));
    document.getElementById('statClientes').textContent = clientes.length;
    document.getElementById('statDeuda').textContent = euros(clientesLista.reduce((s, c) => s + c.deuda_pendiente, 0));
    document.getElementById('statRiesgo').textContent = clientesLista.filter(riesgoCliente).length + ' Clientes';
    filtrarTabla();
  } catch (error) {
    clientesLista = []; clientesVisibles = [];
    ['statClientes', 'statDeuda', 'statRiesgo'].forEach(id => document.getElementById(id).textContent = 'No disponible');
    document.getElementById('tablaClientesBody').innerHTML = '<tr><td colspan="7" class="p-6 text-rose-600">No se pudieron cargar los clientes y sus saldos. Vuelve a cargar la página.</td></tr>';
    ERP.showError(error);
  }
}
function nombreCliente(c) { return c.nombre_comercial || c.nombre || c.razon_social || 'Cliente'; }
function euros(n) { return Number(n).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }); }
function riesgoCliente(c) { return Number(c.limite_credito) > 0 && c.deuda_pendiente > Number(c.limite_credito); }
function filtrarTabla() {
  const q = document.getElementById('inputBuscar').value.toLocaleLowerCase('es').trim();
  const soloRiesgo = document.getElementById('soloRiesgo').checked;
  clientesVisibles = clientesLista.filter(c => (!soloRiesgo || riesgoCliente(c)) &&
    [nombreCliente(c), c.cif_nif || c.cif, c.direccion, c.telefono, c.email, c.poblacion].some(v => String(v || '').toLocaleLowerCase('es').includes(q)));
  document.getElementById('resultadosClientes').textContent = clientesVisibles.length + ' de ' + clientesLista.length + ' clientes';
  const esc = ERP.escapeHTML;
  document.getElementById('tablaClientesBody').innerHTML = clientesVisibles.map(c => `
    <tr class="hover:bg-slate-50">
      <td class="p-3 font-bold">${esc(nombreCliente(c))}<div class="text-xs font-normal text-slate-500">${esc(c.telefono || '')}</div></td>
      <td class="p-3">${esc(c.cif_nif || c.cif || '—')}</td>
      <td class="p-3">${esc(c.forma_pago || '—')}</td>
      <td class="p-3 text-right">${euros(c.deuda_pendiente)}</td>
      <td class="p-3 text-right">${Number(c.limite_credito) > 0 ? euros(c.limite_credito) : 'Sin límite'}</td>
      <td class="p-3 text-center">${riesgoCliente(c) ? '<strong class="text-rose-600">RIESGO EXCEDIDO</strong>' : 'OK'}</td>
      <td class="p-3 text-center"><button type="button" data-editar="${esc(c.id)}" class="text-blue-700 font-bold">Editar</button></td>
    </tr>`).join('') || '<tr><td colspan="7" class="p-6 text-center">No hay clientes que coincidan con los filtros.</td></tr>';
}
document.addEventListener('click', event => {
  const button = event.target.closest('[data-editar]');
  if (button) abrirCliente(button.dataset.editar);
});
function abrirCliente(id) {
  const c = id ? clientesLista.find(c => c.id === id) : {};
  if (!c) return;
  const form = document.getElementById('formCliente');
  form.reset();
  form.elements.id.value = c.id || '';
  for (const field of ['nombre_comercial', 'razon_social', 'cif_nif', 'direccion', 'poblacion', 'telefono', 'email', 'forma_pago', 'dias_pago', 'limite_credito']) {
    form.elements[field].value = c[field] ?? (field === 'limite_credito' ? 1000 : field === 'dias_pago' ? 0 : '');
  }
  form.elements.nombre_comercial.value = id ? nombreCliente(c) : '';
  form.elements.cif_nif.value = c.cif_nif || c.cif || '';
  document.getElementById('tituloCliente').textContent = id ? 'Editar cliente' : 'Nuevo cliente';
  document.getElementById('errorCliente').textContent = '';
  focoAnteriorCliente = document.activeElement;
  document.getElementById('dialogCliente').showModal();
  form.elements.nombre_comercial.focus();
}
function cerrarCliente() {
  if (guardandoCliente) return;
  document.getElementById('dialogCliente').close();
  focoAnteriorCliente?.focus();
}
async function enviarCliente(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (guardandoCliente || !form.reportValidity()) return;
  guardandoCliente = true;
  const button = document.getElementById('guardarCliente');
  button.disabled = true;
  document.getElementById('errorCliente').textContent = '';
  let guardado = false;
  try {
    const empresa = ERP.companyId();
    const payload = {};
    for (const field of ['nombre_comercial', 'razon_social', 'cif_nif', 'direccion', 'poblacion', 'telefono', 'email', 'forma_pago']) payload[field] = form.elements[field].value.trim();
    if (!payload.nombre_comercial) throw new Error('Indica el nombre comercial.');
    payload.dias_pago = Number(form.elements.dias_pago.value);
    payload.limite_credito = Number(form.elements.limite_credito.value);
    if (!Number.isInteger(payload.dias_pago) || payload.dias_pago < 0 || !Number.isFinite(payload.limite_credito) || payload.limite_credito < 0) throw new Error('Revisa los días de pago y el límite de crédito.');
    const id = form.elements.id.value;
    if (id && !clientesLista.some(c => c.id === id && c.empresa_id === empresa)) throw new Error('El cliente no pertenece a la empresa activa.');
    const query = id ? db.from('clientes').update(payload).eq('id', id).eq('empresa_id', empresa) : db.from('clientes').insert({ ...payload, empresa_id: empresa });
    const { data, error } = await query.select('id').single();
    if (error) throw error;
    if (!data?.id) throw new Error('No se ha confirmado el guardado.');
    guardado = true;
  } catch (error) {
    document.getElementById('errorCliente').textContent = error.message || 'No se pudo guardar. Inténtalo de nuevo.';
  } finally {
    guardandoCliente = false;
    button.disabled = false;
  }
  if (guardado) {
    cerrarCliente();
    document.getElementById('estadoClientes').textContent = 'Cliente guardado correctamente.';
    await cargarClientes();
  }
}
function exportarClientes() {
  const rows = [['Nombre comercial', 'CIF/NIF', 'Teléfono', 'Email', 'Dirección', 'Población', 'Forma de pago', 'Días de pago', 'Saldo pendiente EUR', 'Límite crédito EUR'],
    ...clientesVisibles.map(c => [nombreCliente(c), c.cif_nif || c.cif, c.telefono, c.email, c.direccion, c.poblacion, c.forma_pago, c.dias_pago, c.deuda_pendiente.toFixed(2), c.limite_credito])];
  const url = URL.createObjectURL(new Blob(['\uFEFF' + ERP.csvText(rows)], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a'); a.href = url; a.download = 'clientes-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
