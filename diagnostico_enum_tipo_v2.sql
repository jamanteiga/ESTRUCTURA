-- Solo lectura, no cambia nada. Dime qué te devuelve (debería ser 3 filas:
-- nodes.tipo y node_type_rules.parent_type/child_type).
select
    c.relname as tabla,
    n.nspname as tabla_schema,
    a.attname as columna,
    t.typname as tipo_columna,
    tn.nspname as tipo_schema
from pg_attribute a
join pg_class c on c.oid = a.attrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_type t on t.oid = a.atttypid
join pg_namespace tn on tn.oid = t.typnamespace
where a.attnum > 0 and not a.attisdropped
  and c.relname in ('nodes', 'node_type_rules')
  and a.attname in ('tipo', 'parent_type', 'child_type');
