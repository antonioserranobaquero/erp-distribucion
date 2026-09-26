document.addEventListener('DOMContentLoaded', cargarDatosDashboard);
function cargarDatosDashboard() { return ERP.runOnce('dashboard-refresh', actualizarDashboard); }
async function actualizarDashboard() {
  const button = document.getElementById('dashboardRefresh');
  const status = document.getElementById('dashboardUpdated');
  if (button) button.disabled = true;
  if (status) status.textContent = 'Actualizando resumen…';
  const metrics = ['statFacturacion', 'statPendiente', 'statStock', 'statAlertas'];
  try {
    metrics.forEach(id => { document.getElementById(id).textContent = '…'; });
    const empresa = getEmpresaIdActivo();
    const response = await db.rpc('erp_dashboard_resumen', { p_empresa: empresa });
    let result;
    if (!response.error) {
      result = response.data;
      if (!result || !Array.isArray(result.documents) || !Array.isArray(result.lowStock)) throw new Error('El resumen recibido no es válido.');
    } else if (response.error.code === 'PGRST202' || response.error.code === '42883') {
      // Compatibilidad con instalaciones que todavía no han aplicado la migración.
      const [albaranes, clientes, productos] = await Promise.all([
        ERP.readAll(db, 'albaranes', empresa), ERP.readAll(db, 'clientes', empresa), ERP.readAll(db, 'productos', empresa)
      ]);
      const missing = albaranes.filter(row => row.total_importe == null && row.total == null).map(row => row.id);
      const lineas = await ERP.readByIds(db, 'lineas_albaran', empresa, 'albaran_id', missing);
      result = ERP.dashboardData(albaranes, clientes, productos, lineas);
    } else {
      throw new Error(response.error.message);
    }
    document.getElementById('statFacturacion').textContent = result.billed.toFixed(2) + ' €';
    document.getElementById('statPendiente').textContent = result.pending.toFixed(2) + ' €';
    document.getElementById('statStock').textContent = result.stock.toFixed(2) + ' kg';
    document.getElementById('statAlertas').textContent = (result.alertCount ?? result.lowStock.length) + ' Prod.';
    const esc = ERP.escapeHTML;
    document.getElementById('tablaUltimosAlbaranes').innerHTML = result.documents.slice(0, 5).map(row => `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-2.5 px-3 font-mono font-bold text-blue-900">${esc(row.numero_albaran || 'ALB-000')}</td>
        <td class="py-2.5 px-3 font-bold text-slate-800">${esc(row.clientName)}</td>
        <td class="py-2.5 px-3 text-right font-bold text-emerald-700">${row.amount.toFixed(2)} €</td>
        <td class="py-2.5 px-3 text-center"><span class="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">${esc(row.estado || 'pendiente')}</span></td>
      </tr>`).join('') || '<tr><td colspan="4" class="text-center py-6 text-slate-400">No hay albaranes registrados en esta empresa.</td></tr>';
    document.getElementById('tablaStockMinimo').innerHTML = result.lowStock.slice(0, 5).map(row => `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-2.5 px-3 font-bold text-slate-800">${esc(row.name)}</td>
        <td class="py-2.5 px-3 text-center font-bold text-rose-600">${row.kilos.toFixed(2)} kg</td>
        <td class="py-2.5 px-3 text-center"><span class="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Bajo mínimo</span></td>
      </tr>`).join('') || '<tr><td colspan="3" class="text-center py-6 text-emerald-600">Nivel de stock óptimo.</td></tr>';
    if (status) status.textContent = 'Actualizado a las ' + new Date().toLocaleTimeString('es-ES', {hour:'2-digit',minute:'2-digit'});
  } catch (error) {
    if (status) status.textContent = 'No se pudo actualizar el resumen';
    metrics.forEach(id => { document.getElementById(id).textContent = 'No disponible'; });
    for (const [id, columns] of [['tablaUltimosAlbaranes', 4], ['tablaStockMinimo', 3]]) {
      document.getElementById(id).innerHTML = `<tr><td colspan="${columns}" class="p-4 text-center text-rose-600">No se pudieron cargar los datos. Vuelve a cargar la página.</td></tr>`;
    }
    ERP.showError(error);
  } finally { if (button) button.disabled = false; }
}

