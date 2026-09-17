-- ============================================================================
-- Importar / restaurar una copia de seguridad (sustitución total)
-- Ejecutar completo en el SQL Editor de Supabase.
--
-- Dos funciones, ambas solo para ADMIN:
--   - restaurar_backup_completo(p_backup)          -> "Todos los buques"
--   - restaurar_backup_buque(p_buque_id, p_backup) -> un buque concreto
--
-- Semántica: REEMPLAZO TOTAL. Se borra todo lo que haya en el ámbito
-- elegido (todo, o solo ese buque) y se sustituye exactamente por el
-- contenido del fichero de backup -- lo que se creó después del backup y
-- no está en el fichero, desaparece. No hay confirmación aquí a nivel de
-- base de datos: la confirmación (dos avisos + escribir una palabra) se
-- hace en árbol.html antes de llamar a estas funciones.
--
-- El restaurar un buque concreto NO toca la tabla profiles (usuarios):
-- un backup de un buque incluye de refilón perfiles de ADMIN/supervisores
-- que no son específicos de ese buque, y restaurarlos podría revertir
-- cambios de nombre/rol/email hechos después, afectando a gente ajena a
-- ese buque.
-- ============================================================================


-- El registro de comunicaciones (comunicaciones_log) referencia profiles
-- sin "on delete", así que un usuario con mucho historial de peticiones
-- bloquearía su propio borrado durante una restauración completa. Se
-- relaja a SET NULL -- el nombre del actor ya queda guardado aparte
-- (actor_nombre), así que el historial sigue siendo legible aunque el
-- perfil que lo generó ya no exista.
alter table public.comunicaciones_log drop constraint if exists comunicaciones_log_actor_id_fkey;
alter table public.comunicaciones_log
  add constraint comunicaciones_log_actor_id_fkey
  foreign key (actor_id) references public.profiles(id) on delete set null;


create or replace function public.restaurar_backup_completo(p_backup jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and rol = 'ADMIN') then
    raise exception 'Solo un administrador puede restaurar una copia de seguridad';
  end if;
  if p_backup is null or not (p_backup ? 'nodes') then
    raise exception 'El backup no tiene el formato esperado (falta "nodes")';
  end if;

  -- Se desactivan los triggers mientras dura la restauración: (a) nodes se
  -- referencia a sí misma (parent_id), así que borrar/insertar todas las
  -- filas de golpe en un orden cualquiera rompería esa comprobación fila a
  -- fila si los triggers de la clave foránea siguieran activos; y (b) no
  -- interesa que ningún trigger (p.ej. de recálculo de fechas) modifique
  -- los valores mientras se cargan tal cual venían en el backup.
  alter table public.node_dependencias disable trigger all;
  alter table public.node_comentarios_modelo disable trigger all;
  alter table public.historial_fechas_previstas disable trigger all;
  alter table public.hitos disable trigger all;
  alter table public.node_workflow disable trigger all;
  alter table public.nodes disable trigger all;
  alter table public.festivos disable trigger all;
  alter table public.ausencias disable trigger all;
  alter table public.profiles disable trigger all;

  delete from public.node_dependencias;
  delete from public.node_comentarios_modelo;
  delete from public.historial_fechas_previstas;
  delete from public.hitos;
  delete from public.node_workflow;
  delete from public.nodes;
  delete from public.festivos;
  delete from public.ausencias;
  delete from public.profiles;

  insert into public.profiles select * from jsonb_populate_recordset(null::public.profiles, coalesce(p_backup->'profiles', '[]'::jsonb));
  insert into public.nodes select * from jsonb_populate_recordset(null::public.nodes, coalesce(p_backup->'nodes', '[]'::jsonb));
  insert into public.node_workflow select * from jsonb_populate_recordset(null::public.node_workflow, coalesce(p_backup->'node_workflow', '[]'::jsonb));
  insert into public.festivos select * from jsonb_populate_recordset(null::public.festivos, coalesce(p_backup->'festivos', '[]'::jsonb));
  insert into public.ausencias select * from jsonb_populate_recordset(null::public.ausencias, coalesce(p_backup->'ausencias', '[]'::jsonb));
  insert into public.hitos select * from jsonb_populate_recordset(null::public.hitos, coalesce(p_backup->'hitos', '[]'::jsonb));
  insert into public.historial_fechas_previstas select * from jsonb_populate_recordset(null::public.historial_fechas_previstas, coalesce(p_backup->'historial_fechas_previstas', '[]'::jsonb));
  insert into public.node_comentarios_modelo select * from jsonb_populate_recordset(null::public.node_comentarios_modelo, coalesce(p_backup->'node_comentarios_modelo', '[]'::jsonb));
  insert into public.node_dependencias select * from jsonb_populate_recordset(null::public.node_dependencias, coalesce(p_backup->'node_dependencias', '[]'::jsonb));

  alter table public.node_dependencias enable trigger all;
  alter table public.node_comentarios_modelo enable trigger all;
  alter table public.historial_fechas_previstas enable trigger all;
  alter table public.hitos enable trigger all;
  alter table public.node_workflow enable trigger all;
  alter table public.nodes enable trigger all;
  alter table public.festivos enable trigger all;
  alter table public.ausencias enable trigger all;
  alter table public.profiles enable trigger all;
end;
$$;

grant execute on function public.restaurar_backup_completo(jsonb) to authenticated;


create or replace function public.restaurar_backup_buque(p_buque_id uuid, p_backup jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and rol = 'ADMIN') then
    raise exception 'Solo un administrador puede restaurar una copia de seguridad';
  end if;
  if p_backup is null or not (p_backup ? 'nodes') then
    raise exception 'El backup no tiene el formato esperado (falta "nodes")';
  end if;
  if not exists (select 1 from public.nodes where id = p_buque_id and tipo = 'BUQUE') then
    raise exception 'El buque indicado no existe';
  end if;
  if (p_backup->'buque'->>'id') is null or (p_backup->'buque'->>'id')::uuid <> p_buque_id then
    raise exception 'El fichero de backup no es de este buque (es de "%")', coalesce(p_backup->'buque'->>'codigo', '?');
  end if;

  -- Todo lo que cuelga ahora mismo del buque (antes de tocar nada), para
  -- poder borrarlo por completo y sustituirlo por lo que traiga el backup.
  with recursive descendientes as (
    select id from public.nodes where id = p_buque_id
    union all
    select n.id from public.nodes n join descendientes d on n.parent_id = d.id
  )
  select array_agg(id) into v_ids from descendientes;

  alter table public.node_dependencias disable trigger all;
  alter table public.node_comentarios_modelo disable trigger all;
  alter table public.historial_fechas_previstas disable trigger all;
  alter table public.hitos disable trigger all;
  alter table public.node_workflow disable trigger all;
  alter table public.nodes disable trigger all;

  delete from public.node_dependencias where predecesor_id = any(v_ids) or sucesor_id = any(v_ids);
  delete from public.node_comentarios_modelo where node_id = any(v_ids);
  delete from public.historial_fechas_previstas where node_id = any(v_ids);
  delete from public.hitos where buque_id = p_buque_id;
  delete from public.node_workflow where node_id = any(v_ids);
  delete from public.nodes where id = any(v_ids);

  insert into public.nodes select * from jsonb_populate_recordset(null::public.nodes, coalesce(p_backup->'nodes', '[]'::jsonb));
  insert into public.node_workflow select * from jsonb_populate_recordset(null::public.node_workflow, coalesce(p_backup->'node_workflow', '[]'::jsonb));
  insert into public.hitos select * from jsonb_populate_recordset(null::public.hitos, coalesce(p_backup->'hitos', '[]'::jsonb));
  insert into public.historial_fechas_previstas select * from jsonb_populate_recordset(null::public.historial_fechas_previstas, coalesce(p_backup->'historial_fechas_previstas', '[]'::jsonb));
  insert into public.node_comentarios_modelo select * from jsonb_populate_recordset(null::public.node_comentarios_modelo, coalesce(p_backup->'node_comentarios_modelo', '[]'::jsonb));
  insert into public.node_dependencias select * from jsonb_populate_recordset(null::public.node_dependencias, coalesce(p_backup->'node_dependencias', '[]'::jsonb));

  alter table public.node_dependencias enable trigger all;
  alter table public.node_comentarios_modelo enable trigger all;
  alter table public.historial_fechas_previstas enable trigger all;
  alter table public.hitos enable trigger all;
  alter table public.node_workflow enable trigger all;
  alter table public.nodes enable trigger all;
end;
$$;

grant execute on function public.restaurar_backup_buque(uuid, jsonb) to authenticated;

-- ============================================================================
-- NOTA: si al ejecutar una restauración aparece un error de "violates
-- foreign key constraint" mencionando una tabla que no sea una de las de
-- arriba (por ejemplo audit_log), es que esa tabla también referencia a
-- profiles o a nodes sin "on delete" -- dime el nombre exacto de la
-- restricción que aparece en el error y añado el mismo arreglo que se ha
-- hecho aquí para comunicaciones_log.
-- ============================================================================
