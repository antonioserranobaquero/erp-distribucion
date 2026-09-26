/* Navegación de interfaz. La autorización de datos corresponde al servidor. */
window.renderERPShell = function ({ page, session, role, companyName, companyLogo, inspection, canAccess }) {
  const groups = [
    ['Resumen', [['index.html','Panel general','fa-house'],['estadisticas.html','Estadísticas','fa-chart-line']]],
    ['Ventas y clientes', [['albaranes.html','Nuevo albarán','fa-file-circle-plus'],['historico.html','Histórico de ventas','fa-clock-rotate-left'],['clientes.html','Clientes','fa-users'],['facturacion.html','Emitir facturas','fa-file-invoice'],['facturas.html','Facturas y cobros','fa-receipt']]],
    ['Logística', [['rutas.html','Rutas de reparto','fa-route'],['hoja_carga.html','Hoja de carga','fa-truck-ramp-box'],['repartidor.html','Repartidor','fa-truck'],['productos.html','Productos','fa-box'],['almacen.html','Almacenes','fa-warehouse'],['etiquetas.html','Etiquetas','fa-barcode']]],
    ['Administración', [['compras.html','Compras','fa-cart-shopping'],['usuarios.html','Usuarios y permisos','fa-user-gear'],['configuracion.html','Configuración','fa-gear'],['importar.html','Importar datos','fa-file-import'],['superadmin_dashboard.html','Empresas','fa-building']]]
  ];
  const allowed=groups.flatMap(([,items])=>items).filter(([url])=>canAccess(url));
  const active=allowed.find(([url])=>url===page);
  const title=active?.[1] || (page==='imprimir_albaran.html'?'Imprimir albarán':'ERP Distribución');
  const esc=ERP.escapeHTML;
  const link=([url,label,icon])=>`<a href="${url}" ${url===page?'aria-current="page"':''}><i class="fa-solid ${icon}" aria-hidden="true"></i><span>${label}</span></a>`;
  const navigation=groups.map(([label,items])=>{const filtered=items.filter(([url])=>canAccess(url));return filtered.length?`<section class="erp-nav-group"><h2>${label}</h2>${filtered.map(link).join('')}</section>`:'';}).join('');
  document.body.classList.add('erp-app');
  const logo=ERP.safeImageURL(companyLogo);
  const brand=`<div class="erp-brand">${logo?`<img src="${esc(logo)}" alt="Logo de empresa">`:'<span class="erp-brand-symbol" aria-hidden="true">D</span>'}<div><strong>${esc(companyName)}</strong><small>ERP Distribución</small></div></div>`;
  document.body.insertAdjacentHTML('afterbegin',`<div id="erp-navbar-root" class="no-print">
    <aside class="erp-sidebar">${brand}<nav aria-label="Navegación principal">${navigation}</nav><div class="erp-user"><span class="erp-avatar">${esc((session.nombre||session.email||'U').slice(0,1).toUpperCase())}</span><div><strong>${esc(session.nombre||'Usuario')}</strong><small>${esc(role)}</small></div><button type="button" id="erp-logout" aria-label="Cerrar sesión" title="Cerrar sesión"><i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i></button></div></aside>
    <header class="erp-topbar"><div class="erp-header-left"><button type="button" id="erp-menu-open" aria-label="Abrir navegación"><i class="fa-solid fa-bars" aria-hidden="true"></i></button><span class="erp-breadcrumb">Operaciones <span>/</span> <strong>${esc(title)}</strong></span></div><div class="erp-header-actions"><span id="erp-network" role="status"></span><button id="erp-search-open" type="button"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i> <span>Buscar módulo</span><kbd>Ctrl K</kbd></button></div></header>
    ${inspection?`<div class="erp-inspection">Inspección: <strong>${esc(companyName)}</strong><a href="superadmin_dashboard.html">Cambiar empresa</a><button type="button" id="erp-inspection-exit">Salir de inspección</button></div>`:''}
    <dialog id="erp-menu-dialog" class="erp-menu-dialog" aria-label="Navegación móvil"><div class="erp-dialog-heading">${brand}<button type="button" data-close-dialog aria-label="Cerrar navegación">×</button></div><nav aria-label="Módulos">${navigation}</nav><button type="button" id="erp-mobile-logout">Cerrar sesión</button></dialog>
    <dialog id="erp-command" class="erp-command" aria-labelledby="erp-command-title"><div class="erp-dialog-heading"><h2 id="erp-command-title">Ir a un módulo</h2><button type="button" data-close-dialog aria-label="Cerrar búsqueda">×</button></div><label class="erp-sr-only" for="erp-command-query">Nombre del módulo</label><input id="erp-command-query" placeholder="Clientes, albaranes, almacén…" autocomplete="off"><nav id="erp-command-results" aria-label="Resultados de módulos"></nav><p class="erp-command-hint">Pulsa Esc para cerrar · Solo se muestran tus módulos disponibles.</p></dialog>
  </div>`);
  document.getElementById('erp-logout').onclick=cerrarSesionERP;
  document.getElementById('erp-mobile-logout').onclick=cerrarSesionERP;
  if(inspection)document.getElementById('erp-inspection-exit').onclick=salirModoInspeccion;
  const menu=document.getElementById('erp-menu-dialog'),command=document.getElementById('erp-command'),query=document.getElementById('erp-command-query');
  document.getElementById('erp-menu-open').onclick=()=>menu.showModal();
  const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function results(){const found=allowed.filter(([,label])=>normalize(label).includes(normalize(query.value.trim())));document.getElementById('erp-command-results').innerHTML=found.map(link).join('')||'<p class="erp-no-results">No se encontraron módulos.</p>';}
  function openSearch(){if(!command.open){query.value='';results();command.showModal();query.focus();}}
  document.getElementById('erp-search-open').onclick=openSearch;query.oninput=results;
  query.onkeydown=e=>{if(e.key==='Enter'){const a=document.querySelector('#erp-command-results a');if(a)a.click();}};
  document.querySelectorAll('[data-close-dialog]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch();}});
  function network(){const el=document.getElementById('erp-network');el.textContent=navigator.onLine?'':'Sin conexión';el.hidden=navigator.onLine;}
  window.addEventListener('online',network);window.addEventListener('offline',network);network();
  document.querySelectorAll('[data-erp-page]').forEach(el=>{if(!canAccess(el.dataset.erpPage))el.hidden=true;});
  // Evitar que los enlaces rápidos contradigan la navegación disponible.
  if(page==='index.html')document.querySelectorAll('body > div:not(#erp-navbar-root) a[href$=".html"]').forEach(el=>{if(!canAccess(el.getAttribute('href')))el.hidden=true;});
};
