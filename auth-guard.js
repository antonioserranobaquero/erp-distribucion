// ==========================================
// AUTH-GUARD.JS - ERP DISTRIBUCIÓN
// ==========================================

const SUPABASE_URL_GUARD = "https://cybzltwxpwezawfnklgd.supabase.co";
const SUPABASE_KEY_GUARD = "sb_publishable_S1O3tX2mNv09PVH-WuSopA_mUEaz7U_";

// Inicializar cliente de Supabase para la guardia de autenticación
if (!window.supabaseClientGuard) {
  window.supabaseClientGuard = window.supabase.createClient(SUPABASE_URL_GUARD, SUPABASE_KEY_GUARD);
}

// ------------------------------------------
// 1. OBTENER EMPRESA ACTIVA (MODO DIOS O SESIÓN)
// ------------------------------------------
function getEmpresaIdActivo() {
  // 1. Si está activo el Modo Inspección (Modo Dios) de SuperAdmin, manda este ID
  const modoDiosId = localStorage.getItem('MODO_DIOS_EMPRESA_ID');
  if (modoDiosId) return modoDiosId;

  // 2. Si no, busca la empresa del usuario logueado en LocalStorage
  const userMeta = JSON.parse(localStorage.getItem('USER_METADATA') || '{}');
  return userMeta.empresa_id || null;
}

// ------------------------------------------
// 2. VERIFICACIÓN DE SESIÓN Y ROL
// ------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';

  // Si estamos en login.html, no redirigir
  if (currentPath === 'login.html') return;

  const { data: { session } } = await window.supabaseClientGuard.auth.getSession();

  // Si no hay sesión válida, redirigir al login
  if (!session) {
    localStorage.clear();
    window.location.href = 'login.html';
    return;
  }

  // Cargar metadatos del usuario si no existen en LocalStorage
  if (!localStorage.getItem('USER_METADATA')) {
    const { data: usr } = await window.supabaseClientGuard
      .from('usuarios')
      .select('*')
      .eq('email', session.user.email)
      .maybeSingle();

    if (usr) {
      localStorage.setItem('USER_METADATA', JSON.stringify(usr));
    }
  }

  // Renderizar la interfaz común (Navbar + Franja Modo Dios)
  renderizarNavbarUnificado(currentPath);
  renderizarBannerModoDios();
});

// ------------------------------------------
// 3. NAVBAR DINÁMICO RESPONSIVO
// ------------------------------------------
function renderizarNavbarUnificado(currentPath) {
  const userMeta = JSON.parse(localStorage.getItem('USER_METADATA') || '{}');
  const esSuperAdmin = userMeta.rol === 'SUPERADMIN' || localStorage.getItem('MODO_DIOS_EMPRESA_ID');

  // Si existe un navbar estático en la página, lo reemplazamos por el dinámico
  let existingNav = document.querySelector('nav');
  if (existingNav) {
    existingNav.remove();
  }

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
    { href: 'importar.html', label: '📥 Importar CSV' },
    { href: 'logs.html', label: '📜 Logs' }
  ];

  if (esSuperAdmin) {
    menuItems.push({ href: 'superadmin_dashboard.html', label: '⚡ SuperAdmin' });
  }

  const linksHtml = menuItems.map(item => {
    const isSelected = currentPath === item.href;
    const baseClass = "px-2.5 py-2 rounded-lg transition text-xs font-semibold flex items-center gap-1 whitespace-nowrap";
    const activeClass = isSelected 
      ? "bg-blue-700 text-white font-bold shadow" 
      : "hover:bg-gray-800 hover:text-blue-400 text-gray-300";

    return `<a href="${item.href}" class="${baseClass} ${activeClass}">${item.label}</a>`;
  }).join('');

  const navContainer = document.createElement('nav');
  navContainer.className = "bg-gray-900 text-white shadow-lg mb-6 sticky top-0 z-50 no-print";
  navContainer.innerHTML = `
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex justify-between h-16 items-center">
        <div class="flex items-center gap-3">
          <span class="text-2xl">❄️</span>
          <div>
            <a href="index.html" class="font-extrabold text-base tracking-wide text-white hover:text-blue-400 transition">ERP CONGELADOS</a>
            <span class="block text-[10px] text-gray-400 font-normal -mt-1">Sistema ERP Integral & Trazabilidad</span>
          </div>
        </div>
        <div class="hidden xl:flex items-center space-x-1 overflow-x-auto py-2">
          ${linksHtml}
        </div>
        <div class="flex items-center gap-2">
          <a href="configuracion.html" title="Configuración" class="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition text-sm">⚙️</a>
          <button onclick="cerrarSesionGlobal()" title="Cerrar Sesión" class="p-2 rounded-lg bg-rose-900/50 hover:bg-rose-800 text-rose-200 transition text-sm font-bold">🚪</button>
        </div>
      </div>
    </div>
  `;

  document.body.prepend(navContainer);
}

// ------------------------------------------
// 4. FRANJA NOTIFICACIÓN MODO INSPECCIÓN
// ------------------------------------------
function renderizarBannerModoDios() {
  const modoDiosNombre = localStorage.getItem('MODO_DIOS_EMPRESA_NOMBRE');
  if (!modoDiosNombre) return;

  const banner = document.createElement('div');
  banner.id = "bannerModoDios";
  banner.className = "bg-amber-500 text-slate-950 font-black text-xs py-2 px-4 shadow-md flex justify-between items-center sticky top-16 z-40 border-b border-amber-600 no-print";
  banner.innerHTML = `
    <div class="flex items-center gap-2">
      <span class="text-base">👁️</span>
      <span>MODO INSPECCIÓN SUPERADMIN: Viendo datos de <strong>${modoDiosNombre}</strong></span>
    </div>
    <button onclick="salirModoDios()" class="bg-slate-950 hover:bg-slate-800 text-amber-400 px-3 py-1 rounded-lg transition font-bold text-[11px]">
      ✕ Salir de Inspección
    </button>
  `;

  document.body.insertBefore(banner, document.body.children[1]);
}

// ------------------------------------------
// 5. ACCIONES GLOBAL DE SESIÓN
// ------------------------------------------
function salirModoDios() {
  localStorage.removeItem('MODO_DIOS_EMPRESA_ID');
  localStorage.removeItem('MODO_DIOS_EMPRESA_NOMBRE');
  window.location.href = 'superadmin_dashboard.html';
}

async function cerrarSesionGlobal() {
  if (window.supabaseClientGuard) {
    await window.supabaseClientGuard.auth.signOut();
  }
  localStorage.clear();
  window.location.href = 'login.html';
}