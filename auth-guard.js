// auth-guard.js - Protección de Rutas ERP
(function checkAuthGuard() {
  const rutaActual = window.location.pathname;

  // Si ya estamos en el login, no hacer nada
  if (rutaActual.includes('login.html')) {
    return;
  }

  // Buscar sesión en localStorage con los nombres más comunes
  const sesionRaw = localStorage.getItem('erp_usuario_sesion') || 
                    localStorage.getItem('usuario_sesion') || 
                    localStorage.getItem('user_session') || 
                    localStorage.getItem('sesion');

  if (!sesionRaw) {
    console.warn("⚠️ No hay sesión activa. Redirigiendo a login.html");
    window.location.href = "login.html";
    return;
  }

  try {
    const sesion = JSON.parse(sesionRaw);
    if (!sesion || (!sesion.id && !sesion.email)) {
      throw new Error("Sesión inválida");
    }
    // Asegurar empresa_id activo en localStorage
    if (sesion.empresa_id && !localStorage.getItem('empresa_id_activo')) {
      localStorage.setItem('empresa_id_activo', sesion.empresa_id);
    }
  } catch (err) {
    console.error("⚠️ Sesión corrupta. Redirigiendo a login.html");
    localStorage.removeItem('erp_usuario_sesion');
    window.location.href = "login.html";
  }
})();

// Función global auxiliar para obtener empresa activa
function getEmpresaIdActivo() {
  return localStorage.getItem('empresa_id_activo') || '00000000-0000-0000-0000-000000000001';
}