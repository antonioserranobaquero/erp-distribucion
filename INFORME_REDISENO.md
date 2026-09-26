# Rediseño profesional del ERP — 26/09/2026

Navegación lateral por áreas, menú móvil, buscador de módulos con Ctrl+K y enlaces según los permisos existentes. Diseño compartido para 24 páginas: tipografía, formularios, tablas, tarjetas y acceso. Se conservan las plantillas de impresión.

Panel con actualización manual y prevención de llamadas simultáneas. Clientes: alta, edición, búsqueda, filtro de riesgo, saldos pendientes y exportación CSV. Facturas: lectura paginada por empresa, errores visibles, conservación de filtros al actualizar cobros y protección frente a doble clic.

Validación: 16 pruebas unitarias, carga de 24 páginas con Supabase simulado y flujos de clientes, albaranes, cobro, actualización, búsqueda y menú móvil. Revisión visual de escritorio y móvil. No se han realizado escrituras de prueba en producción.

Limitaciones: la autenticación heredada y las políticas RLS requieren una migración coordinada independiente. Los permisos visuales no sustituyen controles de servidor. No se modifican esquemas ni se afirma que esta entrega resuelva la seguridad multitenant. Los módulos que dependen de tablas aún ausentes mantienen esa limitación.
