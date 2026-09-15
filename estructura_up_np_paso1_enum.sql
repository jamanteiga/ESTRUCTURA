-- ============================================================
-- PASO 1 de 2 -- ejecutar ESTE fichero solo, y luego el "paso2" en una
-- consulta NUEVA (Postgres no deja usar un valor de enum recién creado
-- en la misma transacción en la que se crea).
--
-- Añade dos códigos nuevos al enum de nodes.tipo (y de node_type_rules,
-- que comparte el mismo enum):
--   UP -- Unidad plana fabricada (mismas propiedades que UL)
--   NP -- Panel plano (el panel propio de UP, igual que NL lo es de UL)
--
-- Localiza el enum buscando un valor que YA existe ('UL') en vez de
-- adivinar el nombre del tipo -- es la técnica que ya ha funcionado en
-- los pasos1 anteriores de este proyecto.
-- ============================================================

do $$
declare
    v_enum_tipo text;
    v_enum_schema text;
begin
    select t.typname, n.nspname into v_enum_tipo, v_enum_schema
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where e.enumlabel = 'UL'
    limit 1;

    if v_enum_tipo is null then
        raise exception 'No se encontró el enum que contiene el valor ''UL'' -- ¿estás en el proyecto correcto de Supabase?';
    end if;

    execute format('alter type %I.%I add value if not exists %L', v_enum_schema, v_enum_tipo, 'UP');
    execute format('alter type %I.%I add value if not exists %L', v_enum_schema, v_enum_tipo, 'NP');
end $$;
