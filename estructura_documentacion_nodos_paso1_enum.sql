-- ============================================================
-- PASO 1 de 2 — ejecutar este archivo ENTERO y SOLO, en su propio
-- "Run". Cuando termine (debe decir "Success"), pasa al archivo
-- estructura_documentacion_nodos_paso2_resto.sql en una consulta
-- NUEVA (o borrando todo el editor y pegando el otro archivo) --
-- si se ejecutan los dos juntos en el mismo Run, Postgres da error
-- porque no deja usar un valor de enum recién creado en la misma
-- transacción en la que se creó.
--
-- nodes.tipo es un enum de Postgres (como profiles.rol). Este bloque
-- detecta el nombre real del enum (por si no se llama "node_tipo") y
-- le añade los 3 valores nuevos que necesita la documentación de
-- pieza (Modelo/Plano de corte/Windchill como nodos), si no existen ya.
-- ============================================================

do $$
declare
    v_enum_tipo text;
begin
    select udt_name into v_enum_tipo
    from information_schema.columns
    where table_schema = 'public' and table_name = 'nodes' and column_name = 'tipo';

    if v_enum_tipo is null then
        raise exception 'No se encontró la columna nodes.tipo -- revisa el nombre de la tabla/columna';
    end if;

    execute format('alter type public.%I add value if not exists %L', v_enum_tipo, 'DOC_MODELO');
    execute format('alter type public.%I add value if not exists %L', v_enum_tipo, 'DOC_PLANO_CORTE');
    execute format('alter type public.%I add value if not exists %L', v_enum_tipo, 'DOC_WINDCHILL');
end $$;
