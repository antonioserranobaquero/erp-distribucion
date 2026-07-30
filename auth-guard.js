// auth-guard.js - Control de Autenticación e Inyección de Navbar ERP
(function authGuardAndNavbar() {
  
  // 1. VERIFICACIÓN DE SESIÓN
  const rutaActual = window.location.pathname.split('/').pop();

  if (rutaActual === 'login.html') {
    return; // Si estamos en el login, no hacer verificaciones ni pintar barra
  }

  const sesionRaw = localStorage.getItem('erp_usuario_sesion') || 
                    localStorage.getItem('usuario_sesion') || 
                    localStorage.getItem('user_session') || 
                    localStorage.getItem('sesion');

  if (!sesionRaw) {
    console.warn("⚠️ No hay sesión activa. Redirigiendo a login.html");
    window.location.href = "login.html";
    return;
  }

  let sesion = {};
  try {
    sesion = JSON.parse(sesionRaw);
    if (!sesion || (!sesion.id && !sesion.email)) {
      throw new Error("Sesión inválida");
    }
    if (sesion.empresa_id && !localStorage.getItem('empresa_id_activo')) {
      localStorage.setItem('empresa_id_activo', sesion.empresa_id);
    }
  } catch (err) {
    console.error("⚠️ Sesión corrupta. Redirigiendo a login.html");
    localStorage.removeItem('erp_usuario_sesion');
    window.location.href = "login.html";
    return;
  }

  // 2. INYECCIÓN DEL NAVBAR Y BANNER SUPERADMIN
  document.addEventListener('DOMContentLoaded', () => {
    // Si ya existe el navbar inyectado, no duplicar
    if (document.getElementById('erp-main-navbar')) return;

    const esSuperadmin = sesion.es_superadmin || sesion.rol === 'SUPERADMIN' || true;
    const empresaNombre = sesion.empresa_nombre || 'DISTRIBUCIONES CONGELADOS S.L.';

    function esActivo(pagina) {
      return (rutaActual === pagina || (rutaActual === '' && pagina === 'index.html'))
        ? 'bg-blue-600 text-white' 
        : 'text-slate-300 hover:bg-slate-800 hover:text-white';
    }

    const navbarHTML = `
      <div id="erp-main-navbar">
        <!-- BANNER DE SUPERADMIN / MODO INSPECCIÓN -->
        ${esSuperadmin ? `
          <div class="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-black flex justify-between items-center shadow-sm no-print">
            <div class="flex items-center gap-2">
              <i class="fa-solid fa-eye"></i>
              <span>MODO INSPECCIÓN SUPERADMIN: Viendo datos de ${empresaNombre}</span>
            </div>
            <button onclick="cerrarSesionERP()" class="bg-slate-950 hover:bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-md transition">
              ✕ Salir de Inspección
            </button>
          </div>
        ` : ''}

        <!-- BARRA DE NAVEGACIÓN PRINCIPAL -->
        <nav class="bg-slate-900 text-white sticky top-0 z-40 shadow-md no-print">
          <div class="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
            
            <!-- LOGO ERP -->
            <div class="flex items-center gap-3">
              <div class="p-1.5 bg-blue-600 rounded-lg text-white">
                <i class="fa-solid fa-snowflake text-lg"></i>
              </div>
              <div>
                <h1 class="font-black text-sm leading-none">ERP CONGELADOS</h1>
                <span class="text-[9px] text-slate-400 font-semibold tracking-wider">Sistema ERP Integral & Trazabilidad</span>
              </div>
            </div>

            <!-- ENLACES DEL MENÚ -->
            <div class="hidden md:flex items-center space-x-1 text-xs font-bold">
              <a href="index.html" class="px-3 py-2 rounded-lg flex items-center gap-1.5 transition ${esActivo('index.html')}">
                <i class="fa-solid fa-house"></i> Inicio
              </a>
              <a href="albaranes.html" class="px-3 py-2 rounded-lg flex items-center gap-1.5 transition ${esActivo('albaranes.html')}">
                <i class="fa-solid fa-truck"></i> Albaranes
              </a>
              <a href="historico.html" class="px-3 py-2 rounded-lg flex items-center gap-1.5 transition ${esActivo('historico.html')}">
                <i class="fa-solid fa-clock-rotate-left"></i> Histórico
              </a>
              <a href="hoja_carga.html" class="px-3 py-2 rounded-lg flex items-center gap-1.5 transition ${esActivo('hoja_carga.html')}">
                <i class="fa-solid fa-truck-ramp-box"></i> Hoja Carga
              </a>
              <a href="rutas.html" class="px-3 py-2 rounded-lg flex items-center gap-1.5 transition ${esActivo('rutas.html')}">
                <i class="fa-solid fa-route"></i> Rutas
              </a>
              <a href="reparto.html" class="px-3 py-2 rounded-lg flex items-center gap-1.5 transition ${esActivo('reparto.html')}">
                <i class="fa-solid fa-boxes-packing"></i> Reparto
              </a>
              <a href="almacen.html" class="px-3 py-2 rounded-lg flex items-center gap-1.5 transition ${esActivo('almacen.html')}">
                <i class="fa-solid fa-warehouse"></i> Almacén
              </a>
              <a href="productos.html" class="px-3 py-2 rounded-lg flex items-center gap-1.5 transition ${esActivo('productos.html')}">
                <i class="fa-solid fa-tags"></i> Productos
              </a>
            </div>

            <!-- BOTÓN SALIR -->
            <button onclick="cerrarSesionERP()" title="Cerrar Sesión" class="text-slate-400 hover:text-rose-400 p-2 text-sm transition">
              <i class="fa-solid fa-power-off"></i>
            </button>

          </div>
        </nav>
      </div>
    `;

    document.body.insertAdjacentHTML('afterbegin', navbarHTML);
  });
})();

// Funciones globales auxiliares
function getEmpresaIdActivo() {
  return localStorage.getItem('empresa_id_activo') || '00000000-0000-0000-0000-000000000001';
}

function cerrarSesionERP() {
  localStorage.clear();
  window.location.href = "login.html";
}