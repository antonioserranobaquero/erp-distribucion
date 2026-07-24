# 🐟 ERP SaaS Integral - Distribución Comercial de Pescados y Congelados

Sistema web y PWA multiplataforma para la gestión integral de albaranes, facturación oficial Veri*Factu, trazabilidad por lotes, control de riesgo de clientes y rutas de reparto con firma digital táctil.

---

## 🚀 Módulos del Sistema

| Archivo | Módulo / Función |
| :--- | :--- |
| **`index.html`** | Dashboard principal, KPIs de negocio y accesos rápidos. |
| **`albaranes.html`** | Emisión agilizada de albaranes con sugerencias FIFO. |
| **`historico.html`** | Histórico de entregas, reimpresión y generación de PDF A4. |
| **`rutas.html`** | Hoja de ruta de carga de camiones con ordenación Drag & Drop. |
| **`repartidor.html`** | App PWA móvil para choferes con firma digital táctil. |
| **`facturas.html`** | Facturación agrupada Veri*Factu con huella SHA-256. |
| **`almacen.html`** | Control de stock, lotes, caducidades y mermas. |
| **`etiquetas.html`** | Impresión de etiquetas térmicas de trazabilidad alimentaria. |
| **`compras.html`** | Entradas de mercancía de proveedores y lonja. |
| **`clientes.html`** | Fichas comerciales y control de límite de riesgo de deuda. |
| **`estadisticas.html`** | Analítica de ventas, coste de compras y beneficio neto. |
| **`configuracion.html`**| Datos fiscales de la empresa, series e impuestos. |

---

## 🛠️ Requisitos e Infraestructura

1. **Base de Datos:** Cloud PostgreSQL en [Supabase](https://supabase.com).
2. **Hosting Frontend:** Despliegue gratuito sugerido en [Vercel](https://vercel.com), [Netlify](https://netlify.com) o GitHub Pages.
3. **Librerías externas (CDN):**
   - Tailwind CSS
   - FontAwesome 6
   - Supabase JS v2
   - html2pdf.js
   - SignaturePad v4

---

## 📲 Instalación como App Móvil (PWA) para Repartidores

Para llevar `repartidor.html` como una aplicación nativa en el teléfono o tablet del camión:

1. Despliega la carpeta del proyecto en Vercel o Netlify para obtener una dirección `https://`.
2. Abre la URL en el navegador del dispositivo móvil (Chrome en Android / Safari en iOS).
3. Pulsa sobre el menú de opciones del navegador.
4. Selecciona **"Añadir a la pantalla de inicio"** o **"Instalar aplicación"**.