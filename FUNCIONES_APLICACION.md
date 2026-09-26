# Funciones de ERP Distribución

Inventario revisado el 25/09/2026 a partir del código y del esquema de Supabase. «Existente» indica que existe implementación; no equivale a una validación completa de cada proceso con datos reales. Las pruebas de navegador usan datos simulados.

## Ventas y distribución

| Módulo | Funciones implementadas | Límites y observaciones |
|---|---|---|
| Inicio | Resumen de albaranes facturados y sin facturar, stock, productos bajo mínimos y documentos recientes. | Facturado no significa cobrado. Consulta agregada en servidor incorporada en la primera mejora. |
| Albaranes | Selección de cliente y productos, cajas, kilos, taras, precios, consulta de precios anteriores, encargos a proveedores, totales, numeración y preparación de impresión. | Guardado y descuento de stock global en una transacción, con protección frente al mismo envío repetido. |
| Histórico | Búsqueda y filtros de albaranes, indicadores, reasignación de repartidor, eliminación, abonos y reimpresión. | Eliminaciones, abonos y modificaciones necesitan una revisión transaccional adicional. |
| Imprimir albarán | Documento de impresión del albarán seleccionado. | Depende del documento y datos de empresa disponibles. |
| Rutas | Selección por fecha/repartidor, orden de reparto mediante arrastre, estado de entrega y exportación PDF. | Sin optimización geográfica automática ni navegación GPS integrada. |
| Hoja de carga | Consolidación de productos, cajas y kilos para preparar la salida; consulta de existencias y compras. | Debe contrastarse el stock global con el stock por almacén. |
| Repartidor | Consulta de ruta y catálogo, ajuste de cantidades, devoluciones, firma en pantalla, fotografía de incidencias, entrega e impresión. | No hay garantía de funcionamiento sin conexión; varios cambios requieren revisión de atomicidad. |

## Clientes, productos y compras

| Módulo | Funciones implementadas | Límites y observaciones |
|---|---|---|
| Clientes | Listado y búsqueda por nombre, CIF, dirección, localidad, teléfono y correo. **Nueva entrega:** alta y edición, datos fiscales y comerciales, condiciones de pago, límite de crédito, saldo calculado, filtro de riesgo y CSV de resultados. | Antes, el alta era un aviso y editar no tenía acción. El saldo suma facturas pendientes y abonos, excluye cobradas, anuladas y borradores. No representa pagos parciales ni albaranes sin facturar. Cero de límite significa sin límite. |
| Productos | Alta, edición y eliminación, códigos, categorías, precios de coste y venta, cajas/kilos, mínimos, tara, lotes, caducidad y acceso a etiquetas. | Existen campos históricos duplicados de precios y existencias; conviene unificar su uso. |
| Almacén | Gestión y consulta de almacenes, existencias por ubicación y transferencias. | La transferencia incorporada es atómica y conserva lote/caducidad. La sincronización de todos los procesos con stock global sigue pendiente. |
| Etiquetas | Selección de productos, configuración de bloques de información y preparación de impresión de etiquetas. | La salida depende de los ajustes de impresión y del dispositivo. |
| Compras | Proveedores, almacenes, entradas de producto, líneas de compra, lotes, costes, historial y actualización de existencias. | Compra y actualización de todas sus existencias aún requieren una transacción integral. |
| Importar | Lectura CSV, correspondencia de columnas, previsualización e inserción por lotes en las entidades admitidas por la pantalla. | No es una importación universal ni garantiza deshacer automáticamente una importación parcial. |

## Facturación y control económico

| Módulo | Funciones implementadas | Límites y observaciones |
|---|---|---|
| Facturación | Consulta de albaranes pendientes, selección por cliente/fecha, cálculo de importes y emisión de facturas. | Emisión, numeración y vinculación de albaranes necesitan una transacción integral. |
| Facturas | Listado y filtros, estados de cobro, documentos PDF y elementos QR/hash. | La presencia de QR/hash no acredita cumplimiento de VeriFactu. No hay conciliación bancaria ni gestión completa de cobros parciales. |
| Tesorería | Resúmenes y listados de ingresos, gastos y pendientes. | Los criterios actuales mezclan estados de documentos con cobros; necesitan revisión antes de tratar el resumen como saldo de caja real. Depende también del módulo de gastos. |
| Estadísticas | Ventas, compras, diferencias y clasificación de clientes/productos. | La diferencia ventas-compras no equivale a beneficio neto contable. |
| Compras y gastos | Pantalla de registro, filtro y eliminación de gastos, base, IVA y estado. | **Incompleto:** no existe la tabla `gastos` en el esquema revisado. No se presenta como función operativa. |

## Administración y acceso

| Módulo | Funciones implementadas | Límites y observaciones |
|---|---|---|
| Usuarios | Alta/edición, roles, matriz de módulos, bloqueo y eliminación. | El control en navegador no sustituye permisos en servidor. La migración de credenciales a Supabase Auth sigue pendiente. |
| Superadministrador | Gestión de empresas, edición, activación/desactivación, eliminación e inspección de una empresa. | Las operaciones destructivas y el aislamiento entre empresas necesitan protección en servidor. |
| Configuración | Datos comerciales/fiscales, dirección, contacto, logotipo, prefijos de documentos e IVA por defecto. | No constituye un sistema contable o fiscal certificado. |
| Acceso y registro | Formulario de acceso, registro de empresa de demostración, sesión local y navegación según rol/permisos. | **Pendiente crítico:** sustituir autenticación heredada y habilitar políticas RLS coherentes. No se ha migrado en esta entrega para evitar una transición incompleta que deje usuarios sin acceso. |
| Conexión | Acceso redirigido a configuración. | Es una página de compatibilidad, no un módulo independiente de negocio. |
| Auditoría | Pantalla de consulta y filtros de acciones. | **Incompleto:** no existe `logs_auditoria` en el esquema revisado. Falta registro fiable de eventos desde servidor. |

## Mejoras aplicadas y siguiente trabajo

Primera mejora publicada: estilos compilados, conexión y utilidades compartidas, consultas paginadas y agrupadas, búsquedas con retardo breve, índices de base de datos, resumen agregado del panel, guardado atómico de albaranes y transferencias atómicas de almacén.

Ampliación actual: gestión completa de alta/edición de clientes, saldo de facturas pendientes, filtro de riesgo, exportación CSV con neutralización de fórmulas y mensajes de error que evitan mostrar una deuda cero cuando falla la lectura. Los indicadores permanecen referidos a toda la empresa al filtrar la tabla.

Prioridades pendientes, todavía no implementadas: migración coordinada a Supabase Auth y aislamiento RLS; gastos y auditoría con permisos desde su creación; libro unificado de movimientos de stock; compras y facturación atómicas; cobros parciales y conciliación; alertas de caducidad basadas en existencias por lote. Se conserva la orientación a distribución, almacén y reparto.

## Simplificación del 26/09/2026

Gastos y Auditoría retirados por carecer de soporte operativo; Tesorería retirada por balance incompleto. Sus URLs redirigen a Compras, Inicio y Facturas respectivamente, sin eliminar datos de empresa. Las descripciones anteriores documentan el estado previo. Conexión sigue como enlace de compatibilidad hacia Configuración.

Facturas incorpora filtros combinables por fecha de emisión, antigüedad de pendientes de 30/60/90 días, resumen del importe seleccionado, limpieza de filtros y exportación CSV de resultados. La antigüedad no equivale a vencimiento contractual ni contempla cobros parciales. El filtro de antigüedad excluye anuladas, borradores, cobradas y abonos.
