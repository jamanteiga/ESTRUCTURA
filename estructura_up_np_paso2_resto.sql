-- ============================================================
-- PASO 2 de 2 -- ejecutar DESPUÉS de estructura_up_np_paso1_enum.sql,
-- en una consulta NUEVA (Run aparte).
--
-- Da de alta en node_type_rules las reglas de UP y NP, copiándolas
-- literalmente de las de UL y NL -- así quedan "con las mismas
-- propiedades que UL" tal cual se pidió:
--
--   1) UP puede ir en todos los sitios donde hoy puede ir UL (se copian
--      las filas donde child_type = 'UL', cambiando el hijo a 'UP').
--   2) UP admite los mismos hijos que UL EXCEPTO NL (PS/PT/PM), porque
--      su panel propio es NP, no NL.
--   3) NP solo puede ir dentro de UP (igual que NL solo va dentro de UL).
--
-- Todas las inserciones comprueban antes que la fila no exista ya, así
-- que este fichero se puede volver a ejecutar sin duplicar nada.
-- ============================================================

-- 1) Dónde puede ir UP (mismos padres que UL)
insert into node_type_rules (parent_type, child_type)
select r.parent_type, 'UP'
from node_type_rules r
where r.child_type = 'UL'
  and not exists (
    select 1 from node_type_rules x
    where x.parent_type = r.parent_type and x.child_type = 'UP'
  );

-- 2) Qué admite UP dentro (lo mismo que UL, menos NL)
insert into node_type_rules (parent_type, child_type)
select 'UP', r.child_type
from node_type_rules r
where r.parent_type = 'UL' and r.child_type <> 'NL'
  and not exists (
    select 1 from node_type_rules x
    where x.parent_type = 'UP' and x.child_type = r.child_type
  );

-- 3) NP solo dentro de UP
insert into node_type_rules (parent_type, child_type)
select 'UP', 'NP'
where not exists (
    select 1 from node_type_rules x
    where x.parent_type = 'UP' and x.child_type = 'NP'
);
