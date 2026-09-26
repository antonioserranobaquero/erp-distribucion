# Análisis y optimización — 25 de septiembre de 2026

Se ha revisado el frontend de 24 páginas y el esquema real del proyecto Supabase. Las copias entregadas coinciden con el contenido del repositorio de GitHub, salvo el salto de línea final y los nombres con doble extensión. En GitHub esos nombres ya estaban corregidos.

## Cambios realizados

| Área | Antes | Ahora |
|---|---|---|
| Panel principal | Cuatro consultas secuenciales y descarga de albaranes, clientes, productos y líneas completas | Una llamada a `erp_dashboard_resumen`, con agregados y un máximo de cinco filas por tabla visible |
| Datos del panel | 18.552 y 116.164 bytes de JSON de tablas, respectivamente, en las dos empresas existentes | 361 y 1.445 bytes de JSON del resumen: aproximadamente un 98,1 % y un 98,8 % menos |
| Estilos | Tailwind se descargaba y compilaba en cada navegador | CSS compilado y reutilizable de aproximadamente 42 KB, manteniendo la interfaz |
| Cruces de listas | Búsquedas completas de líneas, clientes y stock dentro de otros bucles | Índices `Map` y conjuntos `Set` en panel, productos, histórico de ventas, compras y hoja de carga |
| Renderizado | Reconstrucción de todas las filas acumuladas al añadir cada fila | Una asignación en clientes e inserción incremental en 24 puntos de otros módulos |
| Buscadores | Renderizado por cada pulsación | Espera de 120 ms en búsquedas de texto; los cálculos de cantidades siguen siendo inmediatos |
| Lecturas extensas | Dependencia del límite de filas por defecto de la API | Paginación explícita en resúmenes, clientes e histórico de compras; errores visibles si una lectura queda incompleta |
| Albaranes | Cabecera, líneas y descuentos separados; número aleatorio con solo 900 combinaciones; descuento incorrecto si se repetía un producto | Transacción, número correlativo por empresa, agrupación de productos, validación de existencias e idempotencia por solicitud |
| Traslados | Varias escrituras sin comprobar sus errores ni garantizar rollback | Una transacción con bloqueo, control de existencias y conservación de lote/caducidad |
| Base de datos | 18 relaciones sin índices de soporte | Índices para esas relaciones y para filtros por empresa, fecha, estado y stock |
| Compatibilidad | Consultas a `created_at` inexistente y a una columna `nombre` inexistente en líneas | Fechas añadidas y consulta de líneas corregida |
| Clientes | Una lista vacía podía activar una consulta global y mostrar clientes ajenos | Consulta obligatoriamente limitada a la empresa, sin ese fallback |
| Sesión local | Empresa fija de respaldo y borrado completo de `localStorage` | Error si falta empresa válida; borrado solo de claves de sesión; inspección reservada en la interfaz al superadmin |

Las medidas de bytes son tamaños de representaciones JSON calculados en PostgreSQL después de añadir las columnas de compatibilidad. No son una medición de tráfico HTTP comprimido ni implican que toda la aplicación sea un 98 % más rápida. Con el volumen actual, algunos índices nuevos aún no se han utilizado; deben reevaluarse con carga real.

## Cambios de comportamiento relevantes

- La numeración del albarán se asigna al guardar. Se respeta el prefijo configurado por empresa y se actualiza `ultimo_albaran`. Los documentos anteriores conservan sus números.
- Si no hay existencias suficientes, el albarán se rechaza completo. Antes se podía registrar la venta y dejar el stock en cero mediante un recorte silencioso.
- Un reintento de la misma solicitud no genera otro albarán ni descuenta stock otra vez. Si se intenta reutilizarla con un contenido distinto, se informa del conflicto.
- Los importes de las nuevas líneas se calculan en el servidor y se redondean a dos decimales por línea.
- `created_at` de los albaranes antiguos se aproxima usando su fecha de documento; la hora original no existía. Las líneas heredan esa fecha. La fecha de creación histórica de las empresas no puede reconstruirse y las existentes reciben la fecha de migración.
- El acceso especial que el código otorgaba a `admin@admin.com` se representa ahora con un rol `SUPERADMIN` explícito. El navegador ya no concede ese rol por comparar el correo.
- La lista vacía de permisos conserva el comportamiento heredado de usar los permisos por rol; las listas personalizadas se guardan en la sesión al entrar.
- Los indicadores del inicio se llaman «Albaranes facturados» y «Albaranes sin facturar»: no deben confundirse con cobros reales.
- `conexion.html`, que era una plantilla incompleta, conduce al módulo de configuración existente.

## Verificación

- 14 pruebas automatizadas: paginación con límite de servidor inferior al solicitado, errores a mitad de lectura, aislamiento del contexto local, tratamiento de ceros, agrupaciones, escape de HTML, doble clic, sintaxis y referencias a archivos.
- Prueba de carga de las 24 páginas en Microsoft Edge con una API simulada. Se detectan excepciones JavaScript y escrituras inesperadas al cargar. Esto no sustituye una prueba completa de todos los formularios contra producción.
- Los importes y el stock del nuevo resumen coinciden con consultas independientes en las dos empresas reales.
- Pruebas SQL de creación, repetición de producto, reintento, rechazo por falta de existencias, rollback, traslado y conservación de lote/caducidad, ejecutadas también con el rol que usa el frontend. Todos los datos creados por esas pruebas se revirtieron mediante `ROLLBACK`.
- El asesor de Supabase dejó de señalar las 18 relaciones sin índices.

## Problemas críticos que siguen abiertos

**Esta versión mejora el rendimiento y la consistencia de algunas operaciones; no certifica que el ERP esté preparado como SaaS multiempresa seguro.**

1. **Autenticación y aislamiento real.** Trece tablas tienen RLS desactivado. `empresas` tiene políticas que permiten acceso general. El login todavía descarga usuarios y compara contraseñas en el navegador; los roles de `localStorage` no son una barrera de seguridad. Los ajustes del frontend eliminan errores concretos, pero un cliente puede llamar directamente a la API. Las nuevas funciones son `SECURITY INVOKER`: heredan los permisos existentes y no resuelven ese problema. Es necesaria una migración coordinada a Supabase Auth, perfiles vinculados a `auth.uid()`, administración de cuentas en servidor, retirada de contraseñas de tablas públicas y políticas por empresa y operación. Hay cinco perfiles y solo dos identidades Auth existentes; activar RLS sin migrar ese acceso bloquearía a los usuarios. No se ha aplicado una política incompleta que finja resolverlo. [RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [aviso del asesor](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public).
2. **Tablas ausentes.** No existen `gastos` ni `logs_auditoria`, aunque el frontend las consulta. Gastos y auditoría no están plenamente implementados en el backend; tesorería ahora muestra un error si no puede obtener un resumen completo. No se han inventado gastos ni ocultado el error como un saldo cero.
3. **Resto de escrituras contables y de stock.** Compras, edición en reparto, abonos, eliminación y emisión de facturas aún usan escrituras separadas y necesitan transacciones, idempotencia y pruebas de concurrencia específicas. El stock global de productos y el stock por almacén siguen siendo dos representaciones que requieren una regla única de actualización. No se ha inventado una nave de salida para los albaranes que no la indican.
4. **Seguridad del HTML.** El panel, la ficha de clientes y el menú tienen tratamiento de texto seguro añadido. Otros módulos aún insertan datos en plantillas HTML y en atributos `onclick`; hace falta completar el cambio a nodos de texto y manejadores de eventos para resolver XSS de forma global.
5. **Cifras de negocio.** Estadísticas calcula ventas menos compras y lo denomina beneficio neto, sin incorporar todos los gastos ni existencias. Tesorería mezcla en su lógica estados de entrega y de cobro. Esos criterios necesitan definición y pruebas de negocio antes de usar los indicadores como contabilidad definitiva. No se ha verificado el cumplimiento normativo que el README original atribuía a la facturación.
6. **Escala y dependencias.** Los listados de otros módulos todavía necesitan paginación desde el servidor. Supabase JS y algunas librerías permanecen en CDN; falta fijar y empaquetar todas las dependencias, ampliar las pruebas de impresión/móvil y medir concurrencia real. La aplicación no incluye una PWA offline completa.

## Reproducción y mantenimiento

- `npm install` y `npm run build:css` regeneran `assets/app.css` con Tailwind 3.4.17. El CSS generado se incluye: el servidor estático no necesita compilarlo para servir la aplicación.
- `npm test` ejecuta las pruebas unitarias y estructurales con Node.js.
- `tests/browser-smoke.cjs` requiere Playwright. Acepta `PLAYWRIGHT_MODULE` y `BROWSER_EXECUTABLE`; intercepta todas las conexiones y utiliza datos sintéticos.
- `tests/database-transactions.sql` termina con `ROLLBACK`. Ejecutarlo en un entorno de pruebas o durante una ventana de validación controlada.
- Las dos migraciones de `supabase/migrations/` ya se han aplicado al proyecto conectado. Son el registro del cambio, no una indicación de repetirlas a ciegas.
- Las claves de `erp-config.js` son publicables. Una clave `service_role` nunca debe ponerse en estos archivos.
- La versión anterior de los archivos sigue disponible en el historial de GitHub. Las migraciones añaden estructura y funciones; volver al frontend anterior no requiere borrar tablas ni datos.

## Ampliación de clientes e inventario funcional

- Se incluye `FUNCIONES_APLICACION.md` con las capacidades de los 24 módulos y sus límites.
- Alta y edición de clientes con validación, selección explícita de empresa y bloqueo de envíos simultáneos en el formulario.
- Saldo calculado a partir de facturas pendientes; incluye abonos y excluye cobradas, anuladas y borradores. No incluye pagos parciales ni albaranes sin facturar.
- Búsqueda por contacto/localidad, filtro de riesgo y exportación CSV de los resultados con neutralización de fórmulas.
- Los indicadores representan toda la empresa y no cambian al filtrar la tabla. Un fallo al leer las facturas muestra «No disponible» en lugar de cero.
- 16 pruebas de lógica y estructura superadas. La prueba de navegador incorpora alta/edición de clientes y estabilidad de indicadores al buscar, con API simulada.
- Esta ampliación se entrega en los archivos locales. No se ha realizado una migración de autenticación ni se han creado las tablas pendientes de gastos/auditoría en esta fase.
