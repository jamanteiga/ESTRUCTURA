-- ============================================================
-- No toca ningún enum, se ejecuta entera de una vez (un único Run).
--
-- Renombra los CÓDIGOS ya existentes en el árbol:
--  - Bloques: "B221", "B222"... -> "SEC221", "SEC222"...
--  - Buque(s): cualquier código que empiece por "BAC" (p.ej. "BAC2")
--    -> el mismo pero con "BUQ" en vez de "BAC" (p.ej. "BUQ2").
--
-- Es solo un cambio de texto en nodes.codigo -- no toca el "tipo"
-- (BLOQUE/BUQUE siguen siendo el mismo tipo interno, esto no rompe
-- node_type_rules ni nada que dependa del tipo). A partir de ahora,
-- el modal "Nuevo Bloque + estructura mínima" en arbol.html también
-- sugiere "SEC" en vez de "B" como código de partida (ese cambio ya
-- va en el arbol.html que se entrega junto a este .sql).
--
-- Antes de tocar nada, esta consulta te enseña qué se va a renombrar
-- -- ejecútala primero sola si quieres verlo antes de aplicar el
-- cambio real:
--
--   select id, tipo, codigo, nombre from public.nodes
--   where (tipo = 'BLOQUE' and codigo ~ '^B[0-9]+$')
--      or (tipo = 'BUQUE' and codigo ~ '^BAC');
-- ============================================================

update public.nodes
set codigo = regexp_replace(codigo, '^B', 'SEC')
where tipo = 'BLOQUE' and codigo ~ '^B[0-9]+$';

update public.nodes
set codigo = regexp_replace(codigo, '^BAC', 'BUQ')
where tipo = 'BUQUE' and codigo ~ '^BAC';
