-- Operaciones atómicas. SECURITY INVOKER conserva los permisos/RLS existentes.
set lock_timeout = '5s';
set statement_timeout = '30s';
alter table public.albaranes add column if not exists solicitud_id uuid;
alter table public.albaranes add column if not exists solicitud_hash text;
create unique index if not exists erp_albaranes_solicitud_idx on public.albaranes (empresa_id, solicitud_id) where solicitud_id is not null;

create or replace function public.erp_guardar_albaran(p_empresa uuid, p_solicitud uuid, p_cabecera jsonb, p_lineas jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  empresa public.empresas%rowtype;
  existente public.albaranes%rowtype;
  producto public.productos%rowtype;
  grupo record;
  linea jsonb;
  nuevo_id uuid;
  numero text;
  siguiente bigint;
  huella text;
  cliente uuid;
  total_cajas numeric;
  total_kilos numeric;
  total_importe numeric;
begin
  if p_empresa is null or p_solicitud is null or jsonb_typeof(p_cabecera) is distinct from 'object'
     or jsonb_typeof(p_lineas) is distinct from 'array' then raise exception 'Solicitud inválida'; end if;
  if jsonb_array_length(p_lineas)=0 or jsonb_array_length(p_lineas)>1000 then raise exception 'El albarán debe tener entre 1 y 1000 líneas'; end if;
  select * into empresa from public.empresas where id=p_empresa for update;
  if not found or empresa.activo is false then raise exception 'Empresa no disponible'; end if;
  huella := encode(extensions.digest((p_cabecera::text || p_lineas::text),'sha256'),'hex');
  select * into existente from public.albaranes where empresa_id=p_empresa and solicitud_id=p_solicitud;
  if found then
    if existente.solicitud_hash is distinct from huella then raise exception 'Esta solicitud ya se guardó con otro contenido. Recarga el documento antes de continuar.'; end if;
    return jsonb_build_object('id',existente.id,'numero_albaran',existente.numero_albaran,'total_importe',existente.total_importe,'repetida',true);
  end if;
  cliente := nullif(p_cabecera->>'cliente_id','')::uuid;
  if cliente is not null and not exists(select 1 from public.clientes where id=cliente and empresa_id=p_empresa) then raise exception 'Cliente ajeno a la empresa'; end if;
  if coalesce(trim(p_cabecera->>'cliente_nombre'),'')='' then raise exception 'Falta el cliente'; end if;
  for linea in select value from jsonb_array_elements(p_lineas) loop
    if coalesce((linea->>'kilos')::numeric,-1)<0 or coalesce((linea->>'cajas')::numeric,-1)<0
       or coalesce((linea->>'precio_kg')::numeric,-1)<0
       or (linea->>'cajas')::numeric<>trunc((linea->>'cajas')::numeric)
       or (linea->>'kilos')::numeric::text in ('NaN','Infinity','-Infinity')
       or (linea->>'cajas')::numeric::text in ('NaN','Infinity','-Infinity')
       or (linea->>'precio_kg')::numeric::text in ('NaN','Infinity','-Infinity') then
      raise exception 'Cantidades o precios inválidos';
    end if;
    if nullif(linea->>'producto_id','') is not null and not exists(select 1 from public.productos where id=(linea->>'producto_id')::uuid and empresa_id=p_empresa) then raise exception 'Producto ajeno a la empresa'; end if;
  end loop;
  -- Agrupar repeticiones del mismo producto evita sobrescribir descuentos previos.
  for grupo in
    select (value->>'producto_id')::uuid as producto_id, sum((value->>'kilos')::numeric) as kilos, sum((value->>'cajas')::numeric) as cajas
    from jsonb_array_elements(p_lineas)
    where nullif(value->>'producto_id','') is not null and coalesce((value->>'es_encargo')::boolean,false)=false
    group by 1 order by 1
  loop
    select * into producto from public.productos where id=grupo.producto_id and empresa_id=p_empresa for update;
    if not found then raise exception 'Producto no disponible'; end if;
    if coalesce(producto.kilos_stock,0)<grupo.kilos or coalesce(producto.cajas_stock,0)<grupo.cajas then raise exception 'Stock insuficiente para %',producto.nombre; end if;
    update public.productos set kilos_stock=coalesce(kilos_stock,0)-grupo.kilos,cajas_stock=coalesce(cajas_stock,0)-grupo.cajas where id=producto.id and empresa_id=p_empresa;
  end loop;
  select sum((value->>'cajas')::numeric),sum((value->>'kilos')::numeric),sum(round((value->>'kilos')::numeric*(value->>'precio_kg')::numeric,2))
    into total_cajas,total_kilos,total_importe from jsonb_array_elements(p_lineas);
  siguiente := coalesce(empresa.ultimo_albaran,0);
  loop
    siguiente := siguiente+1;
    numero := coalesce(nullif(empresa.prefijo_albaran,''),'ALB-'||extract(year from current_date)::text||'-') || lpad(siguiente::text,greatest(6,length(siguiente::text)),'0');
    exit when not exists(select 1 from public.albaranes where empresa_id=p_empresa and numero_albaran=numero);
  end loop;
  update public.empresas set ultimo_albaran=siguiente where id=p_empresa;
  insert into public.albaranes(empresa_id,cliente_id,cliente_nombre,numero_albaran,estado,repartidor,creado_por,fecha,fecha_salida,total_cajas,total_kilos,total_importe,solicitud_id,solicitud_hash)
  values(p_empresa,cliente,p_cabecera->>'cliente_nombre',numero,'PENDIENTE',p_cabecera->>'repartidor',p_cabecera->>'creado_por',coalesce((p_cabecera->>'fecha')::date,current_date),coalesce((p_cabecera->>'fecha_salida')::date,current_date),total_cajas,total_kilos,total_importe,p_solicitud,huella)
  returning id into nuevo_id;
  insert into public.lineas_albaran(albaran_id,numero_albaran,empresa_id,producto_id,producto_nombre,lote,cajas,kilos_brutos,tara_caja_kg,tara_total_kg,kilos,cajas_original,kilos_original,precio_kg,subtotal,es_encargo,proveedor_compra)
  select nuevo_id,numero,p_empresa::text,nullif(value->>'producto_id','')::uuid,value->>'producto_nombre',value->>'lote',(value->>'cajas')::numeric,(value->>'kilos_brutos')::numeric,(value->>'tara_caja_kg')::numeric,(value->>'tara_total_kg')::numeric,(value->>'kilos')::numeric,(value->>'cajas')::numeric,(value->>'kilos')::numeric,(value->>'precio_kg')::numeric,round((value->>'kilos')::numeric*(value->>'precio_kg')::numeric,2),coalesce((value->>'es_encargo')::boolean,false),coalesce(value->>'proveedor_compra','')
  from jsonb_array_elements(p_lineas);
  return jsonb_build_object('id',nuevo_id,'numero_albaran',numero,'total_importe',total_importe,'repetida',false);
end;
$$;
revoke all on function public.erp_guardar_albaran(uuid,uuid,jsonb,jsonb) from public;
grant execute on function public.erp_guardar_albaran(uuid,uuid,jsonb,jsonb) to anon,authenticated;

create or replace function public.erp_transferir_stock(p_empresa uuid,p_origen_fila uuid,p_destino uuid,p_cajas numeric,p_kilos numeric)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  origen public.stock_almacenes%rowtype;
  destino public.stock_almacenes%rowtype;
  nombre_destino text;
  producto uuid;
begin
  if p_empresa is null or p_origen_fila is null or p_destino is null or p_cajas is null or p_kilos is null
     or p_cajas<0 or p_kilos<0 or (p_cajas=0 and p_kilos=0)
     or p_cajas::text in ('NaN','Infinity','-Infinity') or p_kilos::text in ('NaN','Infinity','-Infinity') then raise exception 'Cantidades inválidas'; end if;
  select producto_id into producto from public.stock_almacenes where id=p_origen_fila and empresa_id=p_empresa;
  if not found or producto is null then raise exception 'Origen no disponible'; end if;
  -- Serializar traslados de un producto, incluyendo la creación del destino.
  perform pg_advisory_xact_lock(hashtextextended(p_empresa::text||':'||producto::text,0));
  select * into origen from public.stock_almacenes where id=p_origen_fila and empresa_id=p_empresa for update;
  if not found then raise exception 'Origen no disponible'; end if;
  if origen.almacen_id=p_destino then raise exception 'Origen y destino coinciden'; end if;
  select nombre into nombre_destino from public.almacenes where id=p_destino and empresa_id=p_empresa;
  if not found then raise exception 'Destino ajeno a la empresa'; end if;
  if coalesce(origen.cajas,0)<p_cajas or coalesce(origen.kilos,0)<p_kilos then raise exception 'Stock insuficiente'; end if;
  select * into destino from public.stock_almacenes where empresa_id=p_empresa and almacen_id=p_destino and producto_id=producto and lote is not distinct from origen.lote and fecha_caducidad is not distinct from origen.fecha_caducidad order by id limit 1 for update;
  if found then
    update public.stock_almacenes set cajas=coalesce(cajas,0)+p_cajas,kilos=coalesce(kilos,0)+p_kilos,updated_at=now() where id=destino.id;
  else
    insert into public.stock_almacenes(empresa_id,almacen_id,almacen_nombre,producto_id,producto_nombre,lote,fecha_caducidad,cajas,kilos)
    values(p_empresa,p_destino,nombre_destino,producto,origen.producto_nombre,origen.lote,origen.fecha_caducidad,p_cajas,p_kilos);
  end if;
  update public.stock_almacenes set cajas=coalesce(cajas,0)-p_cajas,kilos=coalesce(kilos,0)-p_kilos,updated_at=now() where id=origen.id;
end;
$$;
revoke all on function public.erp_transferir_stock(uuid,uuid,uuid,numeric,numeric) from public;
grant execute on function public.erp_transferir_stock(uuid,uuid,uuid,numeric,numeric) to anon,authenticated;
notify pgrst,'reload schema';
