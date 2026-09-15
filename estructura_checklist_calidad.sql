-- ============================================================
-- Checklist de calidad antes de aprobar: una lista única de puntos
-- (configurable por ADMIN/REVISOR desde Usuarios, ej. "medidas
-- verificadas", "soldadura revisada") que hay que marcar, todos,
-- antes de poder dar una tarea por Aprobada. El bloqueo se hace con
-- un trigger en node_workflow, así que funciona pase lo que pase por
-- donde se apruebe (árbol, resumen, kanban, aprobación masiva) sin
-- tener que tocar la función revisar_nodo que ya exista.
-- ============================================================

create table if not exists public.checklist_calidad_items (
    id uuid primary key default gen_random_uuid(),
    texto text not null,
    activo boolean not null default true,
    creado_por uuid references public.profiles(id),
    creado_en timestamptz not null default now()
);

alter table public.checklist_calidad_items enable row level security;
drop policy if exists checklist_calidad_items_select on public.checklist_calidad_items;
create policy checklist_calidad_items_select on public.checklist_calidad_items for select using (auth.role() = 'authenticated');

create table if not exists public.node_checklist_calidad (
    node_id uuid not null references public.nodes(id) on delete cascade,
    item_id uuid not null references public.checklist_calidad_items(id) on delete cascade,
    marcado boolean not null default false,
    marcado_por uuid references public.profiles(id),
    marcado_en timestamptz,
    primary key (node_id, item_id)
);

alter table public.node_checklist_calidad enable row level security;
drop policy if exists node_checklist_calidad_select on public.node_checklist_calidad;
create policy node_checklist_calidad_select on public.node_checklist_calidad for select using (auth.role() = 'authenticated');

-- -------------------- Gestión de los puntos del checklist (ADMIN/REVISOR) --------------------

create or replace function public.anadir_item_checklist_calidad(p_texto text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.is_reviewer() then
        raise exception 'Solo ADMIN o REVISOR pueden configurar el checklist de calidad';
    end if;
    if p_texto is null or trim(p_texto) = '' then
        raise exception 'El texto del punto no puede estar vacío';
    end if;
    insert into public.checklist_calidad_items (texto, creado_por) values (trim(p_texto), auth.uid());
end;
$$;
grant execute on function public.anadir_item_checklist_calidad(text) to authenticated;

create or replace function public.establecer_activo_item_checklist(p_id uuid, p_activo boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.is_reviewer() then
        raise exception 'Solo ADMIN o REVISOR pueden configurar el checklist de calidad';
    end if;
    update public.checklist_calidad_items set activo = p_activo where id = p_id;
end;
$$;
grant execute on function public.establecer_activo_item_checklist(uuid, boolean) to authenticated;

create or replace function public.eliminar_item_checklist_calidad(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.is_reviewer() then
        raise exception 'Solo ADMIN o REVISOR pueden configurar el checklist de calidad';
    end if;
    delete from public.checklist_calidad_items where id = p_id;
end;
$$;
grant execute on function public.eliminar_item_checklist_calidad(uuid) to authenticated;

-- -------------------- Marcar el checklist de una tarea concreta --------------------

-- Cualquiera con acceso a la app (menos INVITADO) puede marcar/desmarcar,
-- igual que con los comentarios de Ghenova/Navantia.
create or replace function public.marcar_checklist_item(p_node_id uuid, p_item_id uuid, p_marcado boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if exists (select 1 from public.profiles where id = auth.uid() and rol = 'INVITADO') then
        raise exception 'No autorizado para marcar el checklist de calidad';
    end if;
    insert into public.node_checklist_calidad (node_id, item_id, marcado, marcado_por, marcado_en)
    values (p_node_id, p_item_id, p_marcado, auth.uid(), now())
    on conflict (node_id, item_id) do update
        set marcado = excluded.marcado, marcado_por = excluded.marcado_por, marcado_en = excluded.marcado_en;
end;
$$;
grant execute on function public.marcar_checklist_item(uuid, uuid, boolean) to authenticated;

-- Devuelve, para un nodo, todos los puntos activos del checklist con su
-- estado marcado/sin marcar en ese nodo (false si todavía no se ha tocado).
create or replace function public.listar_checklist_calidad_nodo(p_node_id uuid)
returns table (item_id uuid, texto text, marcado boolean)
language sql
security definer
set search_path = public
as $$
    select i.id, i.texto, coalesce(c.marcado, false)
    from public.checklist_calidad_items i
    left join public.node_checklist_calidad c on c.item_id = i.id and c.node_id = p_node_id
    where i.activo = true
    order by i.creado_en;
$$;
grant execute on function public.listar_checklist_calidad_nodo(uuid) to authenticated;

-- -------------------- Bloqueo en la aprobación --------------------

create or replace function public.trg_validar_checklist_calidad()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_pendientes int;
begin
    select count(*) into v_pendientes
    from public.checklist_calidad_items i
    left join public.node_checklist_calidad c on c.item_id = i.id and c.node_id = new.node_id and c.marcado = true
    where i.activo = true and c.item_id is null;

    if v_pendientes > 0 then
        raise exception 'Faltan % punto(s) del checklist de calidad por marcar antes de aprobar', v_pendientes;
    end if;
    return new;
end;
$$;

drop trigger if exists validar_checklist_calidad on public.node_workflow;
create trigger validar_checklist_calidad
    before update on public.node_workflow
    for each row
    when (new.revision_estado = 'APROBADO' and old.revision_estado is distinct from 'APROBADO')
    execute function public.trg_validar_checklist_calidad();
