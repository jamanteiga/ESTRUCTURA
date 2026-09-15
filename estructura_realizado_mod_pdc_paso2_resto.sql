-- ============================================================
-- PASO 2 de 2 — ejecutar SOLO después de que
-- estructura_realizado_mod_pdc_paso1_enum.sql haya terminado con
-- éxito, en un "Run" NUEVO y separado de aquel.
--
-- Modelo (MOD) y Plano de corte (PDC) generan ahora un hijo
-- "Realizado": un único nodo cuyo nombre muestra "No", o si se marca
-- que sí, "Sí - fecha hora - usuario" (todo junto, a diferencia de
-- Windchill que lo separa en dos nodos: Publicar y Fichero subido).
-- Solo ADMIN/REVISOR o el rol WINDCHILL pueden cambiarlo.
--
-- Este archivo ya NO asume que el enum se llama "node_type": la
-- comprobación del Paso 1 y el INSERT de abajo localizan el enum
-- real buscando el valor 'DOC_WINDCHILL', igual que hace ahora el
-- Paso 1.
-- ============================================================

do $$
begin
    if not exists (
        select 1
        from pg_enum e
        where e.enumlabel = 'DOC_REALIZADO'
          and e.enumtypid in (
              select enumtypid from pg_enum where enumlabel = 'DOC_WINDCHILL'
          )
    ) then
        raise exception 'Todavía no se ha ejecutado (o no ha terminado con éxito) el Paso 1 -- ejecuta primero estructura_realizado_mod_pdc_paso1_enum.sql, espera a que diga Success, y vuelve a lanzar este archivo en un Run nuevo.';
    end if;
end $$;

-- Modelo y Plano de corte admiten "Realizado" como hijo.
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
    where e.enumlabel = 'DOC_WINDCHILL'
    limit 1;

    execute format($f$
        insert into public.node_type_rules (parent_type, child_type)
        select t.parent_type::%1$I.%2$I, t.child_type::%1$I.%2$I
        from (values
            ('DOC_MODELO', 'DOC_REALIZADO'),
            ('DOC_PLANO_CORTE', 'DOC_REALIZADO')
        ) as t(parent_type, child_type)
        where not exists (
            select 1 from public.node_type_rules r
            where r.parent_type::text = t.parent_type and r.child_type::text = t.child_type
        )
    $f$, v_enum_schema, v_enum_tipo);
end $$;

-- Marca "Realizado" (Sí/No) de un nodo Modelo o Plano de corte. Al
-- marcar Sí, guarda en el propio nombre la fecha, hora y usuario; al
-- desmarcar, lo deja en "No". p_node_id_realizado es el ID del nodo
-- "Realizado" tocado desde el árbol. Solo ADMIN/REVISOR o WINDCHILL.
create or replace function public.marcar_realizado_pieza(p_node_id_realizado uuid, p_realizado boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_nombre_usuario text;
begin
    if not (
        public.is_reviewer()
        or exists (select 1 from public.profiles where id = auth.uid() and rol = 'WINDCHILL')
    ) then
        raise exception 'No autorizado para marcar como realizado';
    end if;

    if not exists (select 1 from public.nodes where id = p_node_id_realizado and tipo = 'DOC_REALIZADO') then
        raise exception 'El nodo indicado no es un nodo "Realizado" válido';
    end if;

    if p_realizado then
        select nombre_completo into v_nombre_usuario from public.profiles where id = auth.uid();
        update public.nodes
        set nombre = 'Sí - ' || to_char(now() at time zone 'Europe/Madrid', 'DD/MM/YYYY HH24:MI') || ' - ' || coalesce(v_nombre_usuario, '—')
        where id = p_node_id_realizado;
    else
        update public.nodes set nombre = 'No' where id = p_node_id_realizado;
    end if;
end;
$$;
grant execute on function public.marcar_realizado_pieza(uuid, boolean) to authenticated;
