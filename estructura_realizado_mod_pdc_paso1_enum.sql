-- ============================================================
-- PASO 1 de 2 — ejecutar este archivo ENTERO y SOLO, en su propio
-- "Run". Cuando termine (debe decir "Success"), pasa al archivo
-- estructura_realizado_mod_pdc_paso2_resto.sql en una consulta
-- NUEVA (o borrando todo el editor y pegando el otro archivo).
--
-- CAMBIO DE ENFOQUE: las dos consultas de diagnóstico anteriores
-- (information_schema.columns y pg_catalog buscando la COLUMNA
-- nodes.tipo) devolvieron 0 filas las dos veces, lo cual no tiene
-- explicación normal si estás en el proyecto correcto. En vez de
-- seguir por ahí, este Paso 1 busca el enum de otra forma, mucho
-- más directa: busca qué tipo enum contiene ya el VALOR
-- 'DOC_WINDCHILL' (que sabemos seguro que existe, porque lo
-- añadiste con éxito en una migración anterior y ya lo usa la app
-- en vivo). Esto no depende de metadatos de columnas, así que
-- debería funcionar aunque los diagnósticos anteriores fallasen.
--
-- Si este bloque falla con "No se ha encontrado ningún enum...",
-- entonces sí es casi seguro que este SQL Editor está abierto sobre
-- un proyecto de Supabase DISTINTO al de la app -- comprueba el
-- nombre del proyecto en la esquina superior del Dashboard.
-- ============================================================

do $$
declare
    v_enum_tipo text;
    v_enum_schema text;
begin
    select t.typname, n.nspname
      into v_enum_tipo, v_enum_schema
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join pg_enum e on e.enumtypid = t.oid
    where e.enumlabel in ('DOC_WINDCHILL', 'PLANCHA_1000', 'BUQUE')
    limit 1;

    if v_enum_tipo is null then
        raise exception 'No se ha encontrado ningún enum que contenga los valores DOC_WINDCHILL / PLANCHA_1000 / BUQUE. Esto indica casi con seguridad que este SQL Editor está conectado a un proyecto de Supabase DISTINTO al que usa la app en producción -- comprueba el nombre/URL del proyecto en el Dashboard antes de seguir.';
    end if;

    raise notice 'Enum de nodes.tipo encontrado: %.%', v_enum_schema, v_enum_tipo;

    execute format('alter type %I.%I add value if not exists %L', v_enum_schema, v_enum_tipo, 'DOC_REALIZADO');
end $$;
