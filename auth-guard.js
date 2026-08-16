// auth-guard.js - Control de Autenticación, Roles e Inyección del Navbar
(function authGuardAndNavbar() {
  
  const rutaActual = window.location.pathname.split('/').pop() || 'index.html';

  if (rutaActual === 'login.html') {
    return;
  }

  const sesionRaw = localStorage.getItem('erp_usuario_sesion') || 
                    localStorage.getItem('usuario_sesion') || 
                    localStorage.getItem('user_session') || 
                    localStorage.getItem('sesion');

  if (!sesionRaw) {
    window.location.href = "login.html";
    return;
  }

  let sesion = {};
  try {
    sesion = JSON.parse(sesionRaw);
    if (!sesion || (!sesion.id && !sesion.email)) {
      throw new Error("Sesión inválida");
    }
  } catch (err) {
    localStorage.clear();
    window.location.href = "login.html";
    return;
  }

  // INYECCIÓN DEL NAVBAR
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('erp-navbar-root')) return;

    // Solo es Superadmin si su rol es explícitamente SUPERADMIN
    const esSuperadmin = sesion.es_superadmin === true && sesion.rol === 'SUPERADMIN';
    const esDemo = sesion.es_demo === true;
    const empresaNombre = sesion.empresa_nombre || 'Mi Empresa';

    function esActivo(pagina) {
      return rutaActual === pagina ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white';
    }

    const navbarHTML = `
      <div id="erp-navbar-root" class="w-full no-print">
        <!-- BARRA PRINCIPAL -->
        <nav class="bg-[#0f172a] text-white border-b border-slate-800 sticky top-0 z-50">
          <div class="max-w-[1700px] mx-auto px-4 flex items-center justify-between h-14">
            
            <!-- LOGO ERP -->
            <div class="flex items-center gap-3 shrink-0 mr-3">
              <div class="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/30">
                <i class="fa-solid fa-snowflake text-lg"></i>
              </div>
              <div class="hidden lg:block">
                <h1 class="font-black text-sm tracking-wide leading-none">ERP CONGELADOS</h1>
                <span class="text-[9px] text-slate-400 font-bold tracking-wider uppercase">Sistema ERP Integral & Trazabilidad</span>
              </div>
            </div>

            <!-- NAVEGACIÓN -->
            <div class="flex items-center space-x-1 overflow-x-auto no-scrollbar py-1 text-xs font-bold scroll-smooth">
              
              ${esSuperadmin ? `
                <a href="superadmin_dashboard.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/40 mr-1">
                  <i class="fa-solid fa-shield-halved"></i> Panel Superadmin
                </a>
              ` : ''}

              <a href="index.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('index.html')}">
                <i class="fa-solid fa-house text-blue-400"></i> Inicio
              </a>
              <a href="albaranes.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('albaranes.html')}">
                <i class="fa-solid fa-truck text-amber-400"></i> Albaranes
              </a>
              <a href="historico.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('historico.html')}">
                <i class="fa-solid fa-book text-amber-600"></i> Histórico
              </a>
              <a href="hoja_carga.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('hoja_carga.html')}">
                <i class="fa-solid fa-truck-ramp-box text-blue-400"></i> Hoja Carga
              </a>
              <a href="rutas.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('rutas.html')}">
                <i class="fa-solid fa-map-location-dot text-indigo-400"></i> Rutas
              </a>
              <a href="reparto.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('reparto.html')}">
                <i class="fa-solid fa-truck-fast text-rose-400"></i> Reparto
              </a>
              <a href="repartidor.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('repartidor.html')}">
                <i class="fa-solid fa-id-card text-emerald-400"></i> Vista Repartidor
              </a>
              <a href="facturacion.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('facturacion.html')}">
                <i class="fa-solid fa-scale-balanced text-amber-400"></i> Facturación
              </a>
              <a href="facturas.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('facturas.html')}">
                <i class="fa-solid fa-file-invoice-dollar text-emerald-400"></i> Facturas
              </a>
              <a href="tesoreria.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('tesoreria.html')}">
                <i class="fa-solid fa-vault text-yellow-400"></i> Tesorería
              </a>
              <a href="compras.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('compras.html')}">
                <i class="fa-solid fa-cart-shopping text-cyan-400"></i> Compras
              </a>
              <a href="compras_gastos.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('compras_gastos.html')}">
                <i class="fa-solid fa-receipt text-rose-400"></i> Gastos
              </a>
              <a href="almacen.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('almacen.html')}">
                <i class="fa-solid fa-warehouse text-amber-500"></i> Almacén
              </a>
              <a href="productos.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('productos.html')}">
                <i class="fa-solid fa-tag text-teal-400"></i> Productos
              </a>
              <a href="etiquetas.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('etiquetas.html')}">
                <i class="fa-solid fa-barcode text-slate-300"></i> Etiquetas
              </a>
              <a href="clientes.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('clientes.html')}">
                <i class="fa-solid fa-users text-purple-400"></i> Clientes
              </a>
              <a href="usuarios.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('usuarios.html')}">
                <i class="fa-solid fa-user-gear text-sky-400"></i> Usuarios
              </a>
              <a href="estadisticas.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('estadisticas.html')}">
                <i class="fa-solid fa-chart-line text-emerald-500"></i> Estadísticas
              </a>
              <a href="importar.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('importar.html')}">
                <i class="fa-solid fa-file-import text-violet-400"></i> Importar CSV
              </a>
              <a href="logs.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('logs.html')}">
                <i class="fa-solid fa-list-ul text-slate-400"></i> Logs
              </a>
            </div>

            <!-- BOTONES DERECHA -->
            <div class="flex items-center gap-2 shrink-0 ml-3">
              <a href="configuracion.html" title="Configuración" class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
                <i class="fa-solid fa-gear text-sm"></i>
              </a>
              <button onclick="cerrarSesionERP()" title="Cerrar Sesión" class="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition">
                <i class="fa-solid fa-power-off text-sm"></i>
              </button>
            </div>

          </div>
        </nav>

        <!-- BANNER SUPERADMIN (Solo visible si es SUPERADMIN real) -->
        ${esSuperadmin ? `
          <div class="bg-amber-500 text-slate-950 px-4 py-1 text-xs font-black flex justify-between items-center shadow-md border-b border-amber-600">
            <div class="flex items-center gap-3">
              <span class="flex items-center gap-1.5">
                <i class="fa-solid fa-eye text-sm"></i>
                MODO INSPECCIÓN SUPERADMIN: Viendo datos de ${empresaNombre}
              </span>
              <a href="superadmin_dashboard.html" class="bg-slate-950/20 hover:bg-slate-950/40 text-slate-950 px-2.5 py-0.5 rounded border border-slate-950/30 text-[11px] font-extrabold transition">
                ⚙️ Ir a Dashboard Superadmin
              </a>
            </div>
            <button onclick="cerrarSesionERP()" class="bg-slate-950 hover:bg-slate-900 text-white text-[10px] font-bold px-3 py-1 rounded-lg transition shadow">
              ✕ Salir de Inspección
            </button>
          </div>
        ` : ''}

        <!-- BANNER MODO DEMO / PRUEBA -->
        ${esDemo ? `
          <div class="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white px-4 py-2 text-xs font-black flex justify-between items-center shadow-md border-b border-white/10">
            <div class="flex items-center gap-2">
              <span class="bg-white/20 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">MODO DEMO</span>
              <span>🚀 Estás usando la versión de prueba gratuita.</span>
            </div>
            <button onclick="alert('Aquí se conectará la pasarela de pago para activar el Plan Pro (19€/mes).')" class="bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-1 rounded text-[11px] font-black shadow transition flex items-center gap-1">
              <i class="fa-solid fa-crown"></i> Activar Plan Pro (19€/mes)
            </button>
          </div>
        ` : ''}
      </div>
    `;

    document.body.insertAdjacentHTML('afterbegin', navbarHTML);
  });
})();

function getEmpresaIdActivo() {
  const sesionRaw = localStorage.getItem('erp_usuario_sesion');
  if (sesionRaw) {
    try {
      const sesion = JSON.parse(sesionRaw);
      if (sesion.empresa_id) return sesion.empresa_id;
    } catch(e) {}
  }
  return localStorage.getItem('empresa_id_activo') || '473e56d8-be5d-441d-bbbf-9a6010f35443';
}

function cerrarSesionERP() {
  localStorage.clear();
  window.location.href = "login.html";
}