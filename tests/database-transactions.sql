-- Pruebas sobre filas temporales: toda la transacción termina en ROLLBACK.
begin;
set local statement_timeout = '30s';
do $$
declare
  empresa uuid := gen_random_uuid();
  otra_empresa uuid := gen_random_uuid();
  producto uuid := gen_random_uuid();
  nave1 uuid := gen_random_uuid();
  nave2 uuid := gen_random_uuid();
  nave_ajena uuid := gen_random_uuid();
  stock uuid := gen_random_uuid();
  solicitud uuid := gen_random_uuid();
  cabecera jsonb := jsonb_build_object('cliente_nombre','TEST TRANSACCIÓN','fecha',current_date,'fecha_salida',current_date);
  lineas jsonb;
  respuesta jsonb;
  repetida jsonb;
  rechazado boolean;
begin
  insert into public.empresas(id,nombre,activo,prefijo_albaran) values(empresa,'TEST ROLLBACK',true,'TEST-'),(otra_empresa,'TEST AISLAMIENTO',true,'TEST-');
  insert into public.productos(id,empresa_id,nombre,kilos_stock,cajas_stock) values(producto,empresa,'TEST PRODUCTO',20,10);
  lineas := jsonb_build_array(
    jsonb_build_object('producto_id',producto,'producto_nombre','TEST PRODUCTO','cajas',1,'kilos',2,'precio_kg',10),
    jsonb_build_object('producto_id',producto,'producto_nombre','TEST PRODUCTO','cajas',1,'kilos',3,'precio_kg',10));
  respuesta := public.erp_guardar_albaran(empresa,solicitud,cabecera,lineas);
  if (select kilos_stock from public.productos where id=producto)<>15 or (select cajas_stock from public.productos where id=producto)<>8 then raise exception 'FAIL: descuento agrupado'; end if;
  if (select count(*) from public.lineas_albaran where albaran_id=(respuesta->>'id')::uuid)<>2 then raise exception 'FAIL: detalle'; end if;
  if (respuesta->>'total_importe')::numeric<>50 then raise exception 'FAIL: importe'; end if;
  repetida := public.erp_guardar_albaran(empresa,solicitud,cabecera,lineas);
  if repetida->>'id'<>respuesta->>'id' or (select kilos_stock from public.productos where id=producto)<>15 then raise exception 'FAIL: idempotencia'; end if;
  rechazado := false;
  begin
    perform public.erp_guardar_albaran(empresa,solicitud,cabecera,jsonb_build_array(lineas->0));
  exception when others then rechazado := true; end;
  if not rechazado then raise exception 'FAIL: reutilización de solicitud modificada'; end if;
  rechazado := false;
  begin
    perform public.erp_guardar_albaran(empresa,gen_random_uuid(),cabecera,jsonb_build_array(jsonb_build_object('producto_id',producto,'cajas',1,'kilos',500,'precio_kg',10)));
  exception when others then rechazado := true; end;
  if not rechazado or (select count(*) from public.albaranes where empresa_id=empresa)<>1 or (select kilos_stock from public.productos where id=producto)<>15 then raise exception 'FAIL: rollback por stock insuficiente'; end if;
  insert into public.almacenes(id,empresa_id,nombre) values(nave1,empresa,'Origen'),(nave2,empresa,'Destino'),(nave_ajena,otra_empresa,'Ajena');
  insert into public.stock_almacenes(id,empresa_id,almacen_id,producto_id,lote,fecha_caducidad,cajas,kilos) values(stock,empresa,nave1,producto,'TEST-LOTE','2027-01-01',5,10);
  perform public.erp_transferir_stock(empresa,stock,nave2,2,4);
  if (select cajas from public.stock_almacenes where id=stock)<>3 or (select sum(kilos) from public.stock_almacenes where empresa_id=empresa)<>10 then raise exception 'FAIL: conservación de stock'; end if;
  if not exists(select 1 from public.stock_almacenes where empresa_id=empresa and almacen_id=nave2 and lote='TEST-LOTE' and fecha_caducidad='2027-01-01' and kilos=4) then raise exception 'FAIL: trazabilidad del traslado'; end if;
  rechazado := false;
  begin perform public.erp_transferir_stock(empresa,stock,nave2,100,100); exception when others then rechazado := true; end;
  if not rechazado or (select cajas from public.stock_almacenes where id=stock)<>3 then raise exception 'FAIL: traslado sin existencias'; end if;
  rechazado := false;
  begin perform public.erp_transferir_stock(empresa,stock,nave_ajena,1,1); exception when others then rechazado := true; end;
  if not rechazado then raise exception 'FAIL: destino ajeno'; end if;
  rechazado := false;
  begin perform public.erp_transferir_stock(empresa,stock,nave2,-1,1); exception when others then rechazado := true; end;
  if not rechazado then raise exception 'FAIL: cantidades negativas'; end if;
end;
$$;
select 'PASS: agrupación, detalle, importes, idempotencia, rollback, conservación, trazabilidad y validaciones' as resultado;
rollback;
