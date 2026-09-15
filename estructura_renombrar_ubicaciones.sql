-- ============================================================
-- No toca ningún enum, se ejecuta entera de una vez (un único Run).
--
-- Renombra los códigos ya guardados en profiles.ubicacion:
--   FER (Ferrol)   -> OF1
--   BIL (Bilbao)   -> OF2
--   MAD (Madrid)   -> OF3
--   CAN (Canarias) -> OF4
--   SEV (Sevilla)  -> OF5
--
-- Nota: el orden pedido fue Ferrol, Bilbao, Madrid, Canarias, Sevilla
-- -> OF1, OF2, OF3, OF4, OF4 (con OF4 repetido dos veces, un despiste
-- al escribirlo); aquí a Sevilla le toca OF5 para no repetir código.
--
-- Solo cambia el texto guardado -- el significado real (para calcular
-- festivos/días laborables) se mantiene igual, vía el mismo mapa
-- (MAPA_UBICACION_SEDE en arbol.html) actualizado con las claves
-- nuevas en el arbol.html que se entrega junto a este .sql.
-- ============================================================

update public.profiles set ubicacion = 'OF1' where ubicacion = 'FER';
update public.profiles set ubicacion = 'OF2' where ubicacion = 'BIL';
update public.profiles set ubicacion = 'OF3' where ubicacion = 'MAD';
update public.profiles set ubicacion = 'OF4' where ubicacion = 'CAN';
update public.profiles set ubicacion = 'OF5' where ubicacion = 'SEV';
