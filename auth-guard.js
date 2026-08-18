// auth-guard.js - Control Granular de Permisos y Menú Dinámico Personalizado
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

  const rol = (sesion.rol || 'COMERCIAL').toUpperCase();
  const esSuperadmin = sesion.es_superadmin === true || rol === 'SUPERADMIN';
  const esAdmin = rol === 'ADMIN' || esSuperadmin;

  // Lista de permisos personalizados guardados en el perfil del usuario
  const permisosUsuario = Array.isArray(sesion.permisos) ? sesion.permisos : null;

  // Permisos por defecto en caso de no tener matriz personalizada
  const PERMISOS_DEFAULT = {
    'index.html': ['ADMIN', 'SUPERADMIN', 'COMERCIAL', 'ALMACEN'],
    'albaranes.html': ['ADMIN', 'SUPERADMIN', 'COMERCIAL'],
    'historico.html': ['ADMIN', 'SUPERADMIN', 'COMERCIAL'],
    'clientes.html': ['ADMIN', 'SUPERADMIN', 'COMERCIAL'],
    'hoja_carga.html': ['ADMIN', 'SUPERADMIN', 'ALMACEN', 'REPARTIDOR', 'COMERCIAL'],
    'rutas.html': ['ADMIN', 'SUPERADMIN', 'REPARTIDOR', 'COMERCIAL'],
    'repartidor.html': ['ADMIN', 'SUPERADMIN', 'REPARTIDOR', 'COMERCIAL'],
    'almacen.html': ['ADMIN', 'SUPERADMIN', 'ALMACEN'],
    'productos.html': ['ADMIN', 'SUPERADMIN', 'ALMACEN'],
    'etiquetas.html': ['ADMIN', 'SUPERADMIN', 'ALMACEN'],
    'facturacion.html': ['ADMIN', 'SUPERADMIN'],
    'facturas.html': ['ADMIN', 'SUPERADMIN'],
    'tesoreria.html': ['ADMIN', 'SUPERADMIN'],
    'compras.html': ['ADMIN', 'SUPERADMIN'],
    'compras_gastos.html': ['ADMIN', 'SUPERADMIN'],
    'usuarios.html': ['ADMIN', 'SUPERADMIN'],
    'estadisticas.html': ['ADMIN', 'SUPERADMIN'],
    'importar.html': ['ADMIN', 'SUPERADMIN'],
    'logs.html': ['ADMIN', 'SUPERADMIN'],
    'configuracion.html': ['ADMIN', 'SUPERADMIN'],
    'superadmin_dashboard.html': ['SUPERADMIN']
  };

  // Función verificadora de acceso a una página concreta
  function tieneAccesoPagina(pagina) {
    if (esSuperadmin) return true;
    if (esAdmin && pagina !== 'superadmin_dashboard.html') return true;

    // Si el administrador le asignó permisos concretos
    if (permisosUsuario && permisosUsuario.length > 0) {
      return permisosUsuario.includes(pagina);
    }

    // Fallback por rol
    const permitidos = PERMISOS_DEFAULT[pagina];
    return permitidos && permitidos.includes(rol);
  }

  // Comprobar si puede entrar a la ruta actual
  if (!tieneAccesoPagina(rutaActual)) {
    alert(`⛔ Acceso Denegado: No tienes autorización para ver este módulo.`);
    
    // Redirigir a la primera pantalla que tenga autorizada
    const rutasDisponibles = Object.keys(PERMISOS_DEFAULT);
    const primeraPermitida = rutasDisponibles.find(p => tieneAccesoPagina(p) && p !== rutaActual) || 'login.html';
    window.location.href = primeraPermitida;
    return;
  }

  const empresaIdInspeccionada = localStorage.getItem('empresa_id_activo') || localStorage.getItem('MODO_DIOS_EMPRESA_ID');
  const esModoInspeccionActivo = esSuperadmin && empresaIdInspeccionada && (empresaIdInspeccionada !== sesion.empresa_id_original);

  const empresaNombre = localStorage.getItem('empresa_nombre_activo') || 
                        localStorage.getItem('MODO_DIOS_EMPRESA_NOMBRE') || 
                        sesion.empresa_nombre || 
                        'Mi Empresa';

  const empresaLogo = localStorage.getItem('empresa_logo_activo') || 
                      sesion.empresa_logo || 
                      null;

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('erp-navbar-root')) return;

    function esActivo(pagina) {
      return rutaActual === pagina ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white';
    }

    const logoRender = empresaLogo 
      ? `<img src="${empresaLogo}" alt="Logo" class="h-8 max-w-[120px] object-contain rounded-lg bg-white/10 p-0.5 shadow-sm">`
      : `<div class="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/30"><i class="fa-solid fa-snowflake text-lg"></i></div>`;

    const navbarHTML = `
      <div id="erp-navbar-root" class="w-full no-print">
        <nav class="bg-[#0f172a] text-white border-b border-slate-800 sticky top-0 z-50">
          <div class="max-w-[1700px] mx-auto px-4 flex items-center justify-between h-14">
            
            <!-- LOGO DINÁMICO -->
            <div class="flex items-center gap-3 shrink-0 mr-3">
              ${logoRender}
              <div class="hidden lg:block">
                <h1 class="font-black text-sm tracking-wide leading-none ${esModoInspeccionActivo ? 'text-amber-400' : 'text-white'}">${empresaNombre}</h1>
                <span class="text-[9px] text-slate-400 font-bold tracking-wider uppercase">
                  ${esModoInspeccionActivo ? '⚡ MODO INSPECCIÓN' : 'ERP DISTRIBUCIÓN'}
                </span>
              </div>
            </div>

            <!-- MENÚ DE NAVEGACIÓN DINÁMICO SEGÚN PERMISOS -->
            <div class="flex items-center space-x-1 overflow-x-auto no-scrollbar py-1 text-xs font-bold scroll-smooth">
              
              ${esSuperadmin ? `
                <a href="superadmin_dashboard.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/40 mr-1">
                  <i class="fa-solid fa-shield-halved"></i> Panel Superadmin
                </a>
              ` : ''}

              ${tieneAccesoPagina('index.html') ? `
                <a href="index.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('index.html')}">
                  <i class="fa-solid fa-house text-blue-400"></i> Inicio
                </a>` : ''}

              ${tieneAccesoPagina('albaranes.html') ? `
                <a href="albaranes.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('albaranes.html')}">
                  <i class="fa-solid fa-truck text-amber-400"></i> Albaranes
                </a>` : ''}

              ${tieneAccesoPagina('historico.html') ? `
                <a href="historico.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('historico.html')}">
                  <i class="fa-solid fa-book text-amber-600"></i> Histórico
                </a>` : ''}

              ${tieneAccesoPagina('hoja_carga.html') ? `
                <a href="hoja_carga.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('hoja_carga.html')}">
                  <i class="fa-solid fa-truck-ramp-box text-blue-400"></i> Hoja Carga
                </a>` : ''}

              ${tieneAccesoPagina('rutas.html') ? `
                <a href="rutas.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('rutas.html')}">
                  <i class="fa-solid fa-map-location-dot text-indigo-400"></i> Rutas
                </a>` : ''}

              ${tieneAccesoPagina('repartidor.html') ? `
                <a href="repartidor.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('repartidor.html')}">
                  <i class="fa-solid fa-id-card text-emerald-400"></i> Vista Repartidor
                </a>` : ''}

              ${tieneAccesoPagina('facturacion.html') ? `
                <a href="facturacion.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('facturacion.html')}">
                  <i class="fa-solid fa-scale-balanced text-amber-400"></i> Facturación
                </a>` : ''}

              ${tieneAccesoPagina('facturas.html') ? `
                <a href="facturas.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('facturas.html')}">
                  <i class="fa-solid fa-file-invoice-dollar text-emerald-400"></i> Facturas
                </a>` : ''}

              ${tieneAccesoPagina('tesoreria.html') ? `
                <a href="tesoreria.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('tesoreria.html')}">
                  <i class="fa-solid fa-vault text-yellow-400"></i> Tesorería
                </a>` : ''}

              ${tieneAccesoPagina('compras.html') ? `
                <a href="compras.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('compras.html')}">
                  <i class="fa-solid fa-cart-shopping text-cyan-400"></i> Compras
                </a>` : ''}

              ${tieneAccesoPagina('compras_gastos.html') ? `
                <a href="compras_gastos.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('compras_gastos.html')}">
                  <i class="fa-solid fa-receipt text-rose-400"></i> Gastos
                </a>` : ''}

              ${tieneAccesoPagina('almacen.html') ? `
                <a href="almacen.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('almacen.html')}">
                  <i class="fa-solid fa-warehouse text-amber-500"></i> Almacén
                </a>` : ''}

              ${tieneAccesoPagina('productos.html') ? `
                <a href="productos.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('productos.html')}">
                  <i class="fa-solid fa-tag text-teal-400"></i> Productos
                </a>` : ''}

              ${tieneAccesoPagina('etiquetas.html') ? `
                <a href="etiquetas.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('etiquetas.html')}">
                  <i class="fa-solid fa-barcode text-slate-300"></i> Etiquetas
                </a>` : ''}

              ${tieneAccesoPagina('clientes.html') ? `
                <a href="clientes.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('clientes.html')}">
                  <i class="fa-solid fa-users text-purple-400"></i> Clientes
                </a>` : ''}

              ${tieneAccesoPagina('usuarios.html') ? `
                <a href="usuarios.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('usuarios.html')}">
                  <i class="fa-solid fa-user-gear text-sky-400"></i> Usuarios y Permisos
                </a>` : ''}

              ${tieneAccesoPagina('estadisticas.html') ? `
                <a href="estadisticas.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('estadisticas.html')}">
                  <i class="fa-solid fa-chart-line text-emerald-500"></i> Estadísticas
                </a>` : ''}

              ${tieneAccesoPagina('importar.html') ? `
                <a href="importar.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('importar.html')}">
                  <i class="fa-solid fa-file-import text-violet-400"></i> Importar CSV
                </a>` : ''}

              ${tieneAccesoPagina('logs.html') ? `
                <a href="logs.html" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition ${esActivo('logs.html')}">
                  <i class="fa-solid fa-list-ul text-slate-400"></i> Logs
                </a>` : ''}
            </div>

            <!-- BOTONES DERECHA -->
            <div class="flex items-center gap-2 shrink-0 ml-3">
              <span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                ${rol}
              </span>
              ${tieneAccesoPagina('configuracion.html') ? `
                <a href="configuracion.html" title="Configuración de Empresa y Logo" class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
                  <i class="fa-solid fa-gear text-sm"></i>
                </a>
              ` : ''}
              <button onclick="cerrarSesionERP()" title="Cerrar Sesión" class="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition">
                <i class="fa-solid fa-power-off text-sm"></i>
              </button>
            </div>

          </div>
        </nav>

        <!-- BANNER DE INSPECCIÓN -->
        ${esModoInspeccionActivo ? `
          <div class="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-black flex justify-between items-center shadow-md border-b border-amber-600">
            <div class="flex items-center gap-3">
              <span class="flex items-center gap-1.5">
                <i class="fa-solid fa-eye text-sm"></i>
                MODO INSPECCIÓN SUPERADMIN: Viendo datos de "${empresaNombre}"
              </span>
            </div>
            <div class="flex items-center gap-2">
              <a href="superadmin_dashboard.html" class="bg-slate-950/20 hover:bg-slate-950/40 text-slate-950 px-2.5 py-0.5 rounded border border-slate-950/30 text-[11px] font-extrabold transition">
                ⚙️ Cambiar Empresa
              </a>
              <button onclick="salirModoInspeccion()" class="bg-slate-950 hover:bg-slate-900 text-white text-[10px] font-bold px-3 py-1 rounded-lg transition shadow">
                ✕ Salir
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    document.body.insertAdjacentHTML('afterbegin', navbarHTML);
  });
})();

function getEmpresaIdActivo() {
  const inspeccionada = localStorage.getItem('empresa_id_activo') || localStorage.getItem('MODO_DIOS_EMPRESA_ID');
  if (inspeccionada) return inspeccionada;

  const sesionRaw = localStorage.getItem('erp_usuario_sesion') || localStorage.getItem('usuario_sesion');
  if (sesionRaw) {
    try {
      const ses = JSON.parse(sesionRaw);
      if (ses.empresa_id) return ses.empresa_id;
    } catch(e) {}
  }
  return '473e56d8-be5d-441d-bbbf-9a6010f35443';
}

function salirModoInspeccion() {
  localStorage.removeItem('empresa_id_activo');
  localStorage.removeItem('empresa_nombre_activo');
  localStorage.removeItem('empresa_logo_activo');
  localStorage.removeItem('MODO_DIOS_EMPRESA_ID');
  localStorage.removeItem('MODO_DIOS_EMPRESA_NOMBRE');

  const sesionRaw = localStorage.getItem('erp_usuario_sesion') || localStorage.getItem('usuario_sesion');
  if (sesionRaw) {
    try {
      const ses = JSON.parse(sesionRaw);
      if (ses.empresa_id_original) {
        ses.empresa_id = ses.empresa_id_original;
        ses.empresa_nombre = ses.empresa_nombre_original || 'Mi Empresa';
        ses.empresa_logo = ses.empresa_logo_original || null;
        localStorage.setItem('erp_usuario_sesion', JSON.stringify(ses));
      }
    } catch(e) {}
  }

  window.location.href = "superadmin_dashboard.html";
}

function cerrarSesionERP() {
  localStorage.clear();
  window.location.href = "login.html";
}