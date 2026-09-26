# ERP Distribución

Aplicación estática para la gestión de distribución, con Supabase como backend.

## Versión optimizada — septiembre de 2026

- Panel con agregados calculados en servidor.
- CSS compilado y utilidades compartidas de datos y sesión.
- Índices y consultas revisados sobre el esquema real.
- Albaranes y traslados de almacén transaccionales.
- Pruebas automatizadas y registro de migraciones.

Consulta [el informe de optimización](INFORME_OPTIMIZACION.md) para conocer cambios, medidas, pruebas y problemas pendientes. La autenticación heredada y el aislamiento multiempresa en la base de datos **todavía requieren una migración de seguridad**. Esta versión no certifica cumplimiento fiscal ni una PWA offline completa.

## Servir la aplicación

Publicar la raíz del proyecto en un servidor estático HTTPS. La entrada es login.html y el panel es index.html. Los nombres deben terminar en una sola extensión .html.

Configurar el proyecto y la clave publicable en erp-config.js. Nunca poner una clave de servicio en el frontend. Para guardar albaranes y realizar traslados se necesitan las migraciones de supabase/migrations/, que ya están aplicadas en el proyecto conectado durante esta revisión.

Los archivos de estilos están incluidos. Para regenerarlos, ejecutar npm install y npm run build:css.

Para las pruebas de lógica y estructura, ejecutar npm test con Node.js.

El script tests/browser-smoke.cjs permite probar las pantallas con Playwright y una API simulada. El archivo tests/database-transactions.sql verifica las operaciones SQL dentro de una transacción que se revierte al finalizar.

## Inventario y ampliación de clientes

Consulta [todas las funciones y sus límites](FUNCIONES_APLICACION.md). La ampliación incluye alta y edición de clientes, saldo de facturas pendientes, filtro de riesgo y exportación CSV de resultados.
