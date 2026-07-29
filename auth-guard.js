// auth-guard.js - Guardián de Autenticación, Modo Dios e Inyección Dinámica de Navbar

const SUPABASE_URL_GUARD = "https://cybzltwxpwezawfnklgd.supabase.co";
const SUPABASE_KEY_GUARD = "sb_publishable_S1O3tX2mNv09PVH-WuSopA_mUEaz7U_";

if (!window.dbClient) {
  window.dbClient = window.supabase.createClient(SUPABASE_URL_GUARD, SUPABASE_KEY_GUARD);
}

// 1. OBTENER EL ID DE LA EMPRESA ACTIVA EN TODO EL ERP
function getEmpresaIdActivo() {
  const modoDiosId = localStorage.getItem('MODO_DIOS_EMPRESA_ID');
  if (modoDiosId) {
    return modoDiosId;
  }
  
  // Si no hay Modo Dios activo, busca la empresa del usuario en sesión
  const sessionUser = JSON.parse(localStorage.getItem('USER_METADATA') || '{}');
  return sessionUser.empresa_id || null;
}

// 2. SALIR DEL MODO INSPECCIÓN
function salirModoDios() {
  localStorage.removeItem('MODO_DIOS_EMPRESA_ID');
  localStorage.removeItem('MODO_DIOS_EMPRESA_NOMBRE');
  window.location.reload();
}

// 3. VERIFICACIÓN DE ACCESO Y SESIÓN
(async function verificarAccesoSeguro() {
  const rutaActual = window.location.pathname.split('/').pop() || 'index.html';

  // Excluir login del guardián
  if (rutaActual === 'login.html') return;

  // Comprobar sesión activa
  const { data: { session }, error } = await window.dbClient.auth.getSession();

  if (error || !session) {
    console.warn("⚠️ Acceso denegado: Sesión no válida. Redirigiendo a login...");
    window.location.href = "login.html";
    return;
  }

  // Guardar datos del usuario para uso global
  if (session.user) {
    localStorage.setItem('USER_METADATA', JSON.stringify(session.user.user_metadata || {}));
  }

  // Inyectar componentes al cargar el DOM
  document.addEventListener('DOMContentLoaded', () => {
    inyectarBannerModoDios();
    inyectarNavbarDinamico(rutaActual);
  });
})();

// 4. BANNER VISUAL DE MODO INSPECCIÓN
function inyectarBannerModoDios() {
  const modoDiosNombre = localStorage.getItem('MODO_DIOS_EMPRESA_NOMBRE');
  
  if (modoDiosNombre && !document.getElementById('bannerModoDios')) {
    const banner = document.createElement('div');
    banner.id = 'bannerModoDios';
    banner.className = 'bg-amber-500 text-slate-950 px-4 py-2 text-xs font-black flex justify-between items-center sticky top-0 z-[9999] shadow-lg border-b border-amber-600 no-print';
    banner.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-sm">👁️</span>
        <span>MODO INSPECCIÓN SUPERADMIN: Viendo datos de <strong>${modoDiosNombre}</strong></span>
      </div>
      <button onclick="salirModoDios()" class="bg-slate-950 text-amber-400 hover:bg-slate-900 px-3 py-1 rounded-lg text-[10px] font-bold transition shadow">
        ❌ Salir de Inspección
      </button>
    `;
    document.body.prepend(banner);
  }
}

// 5. RENDEREIZADO DE LA BARRA SUPERIOR DINÁMICA
function inyectarNavbarDinamico(paginaActual) {
  const navExistente = document.querySelector('nav');
  
  const menuItems = [
    { href: 'index.html', label: '🏠 Inicio' },
    { href: 'albaranes.html', label: '🚚 Albaranes' },
    { href: 'historico.html', label: '📜 Histórico' },
    { href: 'hoja_carga.html', label: '📦 Hoja Carga' },
    { href: 'rutas.html', label: '🗺️ Rutas' },
    { href: 'repartidor.html', label: '🛵 Reparto' },
    { href: 'facturacion.html', label: '⚖️ Facturación' },
    { href: 'facturas.html', label: '📄 Facturas' },
    { href: 'almacen.html', label: '📦 Almacén' },
    { href: 'productos.html', label: '🏷️ Productos' },
    { href: 'compras.html', label: '🛒 Compras' },
    { href: 'compras_gastos.html', label: '💸 Gastos' },
    { href: 'tesoreria.html', label: '🏦 Tesorería' },
    { href: 'clientes.html', label: '👥 Clientes' },
    { href: 'usuarios.html', label: '👤 Usuarios' },
    { href: 'estadisticas.html', label: '📊 Analítica' },
    { href: 'logs.html', label: '📜 Logs' }
  ];

  const linksHtml = menuItems.map(item => {
    const esActivo = paginaActual === item.href;
    const claseClave = esActivo
      ? 'px-3 py-2 rounded-lg bg-blue-700 text-white font-bold transition flex items-center gap-1'
      : 'px-2.5 py-2 rounded-lg hover:bg-gray-800 hover:text-blue-400 transition flex items-center gap-1';
    
    return `<a href="${item.href}" class="${claseClave}">${item.label}</a>`;
  }).join('');

  const navbarHTML = `
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex justify-between h-16 items-center">
        <div class="flex items-center gap-3">
          <span class="text-2xl">❄️</span>
          <div>
            <a href="index.html" class="font-extrabold text-base tracking-wide text-white hover:text-blue-400 transition">ERP CONGELADOS</a>
            <span class="block text-[10px] text-gray-400 font-normal -mt-1">Sistema ERP Integral & Trazabilidad</span>
          </div>
        </div>
        <div class="hidden xl:flex items-center space-x-1 text-xs font-semibold">
          ${linksHtml}
        </div>
        <div class="flex items-center gap-2">
          <a href="configuracion.html" title="Configuración" class="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition text-sm">⚙️</a>
          <button id="btnLogout" onclick="cerrarSesionGlobal()" title="Cerrar Sesión" class="p-2 rounded-lg bg-rose-900/50 hover:bg-rose-800 text-rose-200 transition text-sm font-bold">🚪</button>
        </div>
      </div>
    </div>
  `;

  if (navExistente) {
    navExistente.innerHTML = navbarHTML;
  } else {
    const nuevoNav = document.createElement('nav');
    nuevoNav.className = "bg-gray-900 text-white shadow-lg mb-6 sticky top-0 z-50 no-print";
    nuevoNav.innerHTML = navbarHTML;
    document.body.insertBefore(nuevoNav, document.body.firstChild);
  }
}

// 6. CIERRE DE SESIÓN GLOBAL
async function cerrarSesionGlobal() {
  if (confirm("¿Seguro que deseas cerrar la sesión?")) {
    await window.dbClient.auth.signOut();
    localStorage.removeItem('MODO_DIOS_EMPRESA_ID');
    localStorage.removeItem('MODO_DIOS_EMPRESA_NOMBRE');
    localStorage.removeItem('USER_METADATA');
    window.location.href = "login.html";
  }
}