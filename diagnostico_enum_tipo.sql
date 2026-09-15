-- Solo lectura, no cambia nada. Dime qué te devuelve.
select 'nodes.tipo' as columna, udt_schema, udt_name
from information_schema.columns
where table_schema = 'public' and table_name = 'nodes' and column_name = 'tipo'
union all
select 'node_type_rules.parent_type', udt_schema, udt_name
from information_schema.columns
where table_schema = 'public' and table_name = 'node_type_rules' and column_name = 'parent_type';
