-- Optimización compatible con el esquema verificado el 25/09/2026.
-- No cambia RLS ni sustituye la migración pendiente a Supabase Auth.
set lock_timeout = '5s';
set statement_timeout = '30s';

create index if not exists erp_clientes_empresa_id_idx on public.clientes (empresa_id, id);
create index if not exists erp_productos_empresa_id_idx on public.productos (empresa_id, id);
create index if not exists erp_albaranes_empresa_id_idx on public.albaranes (empresa_id, id);
create index if not exists erp_lineas_albaran_empresa_id_idx on public.lineas_albaran (empresa_id, id);
create index if not exists erp_tarifas_clientes_empresa_id_idx on public.tarifas_clientes (empresa_id, id);
create index if not exists erp_facturas_empresa_id_idx on public.facturas (empresa_id, id);
create index if not exists erp_lotes_empresa_id_idx on public.lotes (empresa_id, id);
create index if not exists erp_proveedores_empresa_id_idx on public.proveedores (empresa_id, id);
create index if not exists erp_compras_empresa_id_idx on public.compras (empresa_id, id);
create index if not exists erp_usuarios_empresa_id_idx on public.usuarios (empresa_id, id);
create index if not exists erp_lineas_compra_empresa_id_idx on public.lineas_compra (empresa_id, id);
create index if not exists erp_almacenes_empresa_id_idx on public.almacenes (empresa_id, id);
create index if not exists erp_stock_almacenes_empresa_id_idx on public.stock_almacenes (empresa_id, id);
create index if not exists erp_tarifas_clientes_cliente_id_idx on public.tarifas_clientes (cliente_id);
create index if not exists erp_albaranes_cliente_id_idx on public.albaranes (cliente_id);
create index if not exists erp_facturas_cliente_id_idx on public.facturas (cliente_id);
create index if not exists erp_lotes_producto_id_idx on public.lotes (producto_id);
create index if not exists erp_lineas_albaran_producto_id_idx on public.lineas_albaran (producto_id);
create index if not exists erp_stock_almacenes_producto_id_idx on public.stock_almacenes (producto_id);
create index if not exists erp_tarifas_clientes_producto_id_idx on public.tarifas_clientes (producto_id);
create index if not exists erp_albaranes_factura_id_idx on public.albaranes (factura_id);
create index if not exists erp_lineas_albaran_albaran_id_idx on public.lineas_albaran (albaran_id);
create index if not exists erp_compras_proveedor_id_idx on public.compras (proveedor_id);
create index if not exists erp_stock_almacenes_almacen_id_idx on public.stock_almacenes (almacen_id);

create index if not exists erp_albaranes_empresa_fecha_idx on public.albaranes (empresa_id, fecha_salida, id);
create index if not exists erp_albaranes_empresa_estado_idx on public.albaranes (empresa_id, estado, id);
create index if not exists erp_stock_empresa_producto_almacen_idx on public.stock_almacenes (empresa_id, producto_id, almacen_id);
create index if not exists erp_lineas_compra_compra_idx on public.lineas_compra (compra_id);
create index if not exists erp_lineas_compra_producto_idx on public.lineas_compra (producto_id);

-- El código original consulta created_at aunque estas columnas no existían.
alter table public.albaranes add column if not exists created_at timestamptz;
update public.albaranes set created_at = coalesce(fecha::timestamptz, fecha_salida::timestamptz, now()) where created_at is null;
alter table public.albaranes alter column created_at set default now();
alter table public.lineas_albaran add column if not exists created_at timestamptz;
update public.lineas_albaran l set created_at = coalesce(a.created_at,now()) from public.albaranes a where l.albaran_id=a.id and l.created_at is null;
alter table public.lineas_albaran alter column created_at set default now();
alter table public.empresas add column if not exists created_at timestamptz default now();

-- Convertir el acceso especial ya existente en el frontend en un rol explícito.
update public.usuarios set rol='SUPERADMIN' where lower(email)='admin@admin.com' and coalesce(trim(rol),'')='';

create or replace function public.erp_dashboard_resumen(p_empresa uuid)
returns jsonb language sql stable security invoker set search_path = '' as $function$
with documentos as (
  select a.id, a.numero_albaran, a.estado, a.created_at, a.cliente_id,
    coalesce(a.total_importe, (select sum(coalesce(l.subtotal,l.kilos*l.precio_kg,0)) from public.lineas_albaran l where l.albaran_id=a.id and l.empresa_id=p_empresa::text),0) as amount,
    coalesce(c.nombre_comercial,c.nombre,c.razon_social,a.cliente_nombre,'Cliente') as "clientName"
  from public.albaranes a
  left join public.clientes c on c.id=a.cliente_id and c.empresa_id=p_empresa
  where a.empresa_id=p_empresa
), productos as (
  select id,coalesce(nombre,nombre_producto,'Producto') as name,coalesce(kilos_stock,stock_kilos,0) as kilos,coalesce(stock_minimo_kilos,20) as minimo
  from public.productos where empresa_id=p_empresa
)
select jsonb_build_object(
  'billed',coalesce((select sum(amount) from documentos where lower(estado)='facturado'),0),
  'pending',coalesce((select sum(amount) from documentos where lower(coalesce(estado,''))<>'facturado'),0),
  'stock',coalesce((select sum(kilos) from productos),0),
  'alertCount',(select count(*) from productos where kilos<=minimo),
  'documents',coalesce((select jsonb_agg(to_jsonb(d)) from (select * from documentos order by created_at desc nulls last,id desc limit 5) d),'[]'::jsonb),
  'lowStock',coalesce((select jsonb_agg(to_jsonb(p)) from (select name,kilos from productos where kilos<=minimo order by id limit 5) p),'[]'::jsonb)
);
$function$;
revoke all on function public.erp_dashboard_resumen(uuid) from public;
grant execute on function public.erp_dashboard_resumen(uuid) to anon, authenticated;
comment on function public.erp_dashboard_resumen(uuid) is 'Resumen acotado, SECURITY INVOKER: hereda las políticas de las tablas. No implementa autorización por sí mismo.';
notify pgrst, 'reload schema';
