// auth-guard.js - Control Granular de Permisos y Menú Dinámico Personalizado
(function authGuardAndNavbar() {
  
  const rutaActual = window.location.pathname.split('/').pop() || 'index.html';

  if (rutaActual === 'login.html') {
    return;
  }

  const sesion = ERP.readSession();
  if (!sesion) {
    ERP.clearSession();
    window.location.replace('login.html');
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
    if (pagina === 'imprimir_albaran.html') return tieneAccesoPagina('albaranes.html') || tieneAccesoPagina('historico.html') || tieneAccesoPagina('repartidor.html');
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

  const empresaNombre = (esSuperadmin && (localStorage.getItem('empresa_nombre_activo') || localStorage.getItem('MODO_DIOS_EMPRESA_NOMBRE'))) || 
                        sesion.empresa_nombre || 
                        'Mi Empresa';

  const empresaLogo = (esSuperadmin && localStorage.getItem('empresa_logo_activo')) || 
                      sesion.empresa_logo || 
                      null;

  window.erpCanAccess = tieneAccesoPagina;
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('erp-navbar-root')) return;
    renderERPShell({ page: rutaActual, session: sesion, role: rol, companyName: empresaNombre,
      companyLogo: empresaLogo, inspection: esModoInspeccionActivo, canAccess: tieneAccesoPagina });
  });
})();

function getEmpresaIdActivo() {
  return ERP.companyId();
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
  ERP.clearSession();
  window.location.href = "login.html";
}