-- ============================================================
-- PASO 1 de 2 — ejecutar este archivo ENTERO y SOLO, en su propio
-- "Run". Cuando termine (debe decir "Success"), pasa al archivo
-- estructura_publicar_ficha_nodos_paso2_resto.sql en una consulta
-- NUEVA (o borrando todo el editor y pegando el otro archivo).
--
-- Añade al enum de nodes.tipo los 2 valores nuevos para que, dentro
-- del nodo Windchill (WIN), se puedan generar como hijos "Publicar"
-- y "Fichero subido".
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

    execute format('alter type public.%I add value if not exists %L', v_enum_tipo, 'DOC_PUBLICAR');
    execute format('alter type public.%I add value if not exists %L', v_enum_tipo, 'DOC_FICHERO_SUBIDO');
end $$;
