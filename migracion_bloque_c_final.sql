-- ============================================================
-- 1. Campos nuevos de perfil
-- ============================================================

alter table public.profiles
  add column if not exists ubicacion text,
  add column if not exists email_contacto text,
  add column if not exists movil text,
  add column if not exists linkedin text;

comment on column public.profiles.ubicacion is 'Emplazamiento del usuario: FER (Ferrol), BIL (Bilbao), CAN (Canarias), u otro texto libre';
comment on column public.profiles.email_contacto is 'Email de contacto real (distinto del email sintético de acceso)';


-- ============================================================
-- 2. Regla de jerarquía que faltaba
-- ============================================================

insert into public.node_type_rules (parent_type, child_type)
values ('SUBBLOQUE', 'PIEZA_SUELTA')
on conflict do nothing;


-- ============================================================
-- 3. ADMIN o REVISOR pueden actuar sobre la tarea de CUALQUIER
--    usuario, no solo la que tienen asignada. is_reviewer() ya
--    incluye a ADMIN (revisa su definición: rol in ADMIN/REVISOR),
--    así que sustituye a la comprobación de solo is_admin().
-- ============================================================

create or replace function public.marcar_en_trabajo(p_node_id uuid)
returns public.node_workflow
language plpgsql
security definer
set search_path = public
as $$
declare
    v_row public.node_workflow;
begin
    if not public.is_reviewer() and not exists (
        select 1 from public.node_workflow
        where node_id = p_node_id and trabajador_id = auth.uid()
    ) then
        raise exception 'No autorizado para modificar esta tarea';
    end if;

    update public.node_workflow
    set trabajo_estado = 'EN_TRABAJO',
        trabajo_iniciado_en = now(),
        trabajo_terminado_en = null
    where node_id = p_node_id
    returning * into v_row;

    if v_row.node_id is null then
        raise exception 'No existe asignación de workflow para este nodo';
    end if;

    return v_row;
end;
$$;


create or replace function public.marcar_terminado(p_node_id uuid)
returns public.node_workflow
language plpgsql
security definer
set search_path = public
as $$
declare
    v_row public.node_workflow;
begin
    if not public.is_reviewer() and not exists (
        select 1 from public.node_workflow
        where node_id = p_node_id and trabajador_id = auth.uid()
    ) then
        raise exception 'No autorizado para modificar esta tarea';
    end if;

    update public.node_workflow
    set trabajo_estado = 'TERMINADO',
        trabajo_terminado_en = now()
    where node_id = p_node_id
    returning * into v_row;

    if v_row.node_id is null then
        raise exception 'No existe asignación de workflow para este nodo';
    end if;

    return v_row;
end;
$$;


create or replace function public.revisar_nodo(
    p_node_id uuid,
    p_aprobado boolean,
    p_comentario text default null
)
returns public.node_workflow
language plpgsql
security definer
set search_path = public
as $$
declare
    v_row public.node_workflow;
begin
    if not public.is_reviewer() then
        raise exception 'Solo ADMIN o REVISOR pueden revisar nodos';
    end if;

    update public.node_workflow
    set
        revision_estado = case when p_aprobado then 'APROBADO' else 'RECHAZADO' end,
        comentario_revision = case when p_aprobado then null else p_comentario end,
        revisado_en = now()
    where node_id = p_node_id
    returning * into v_row;

    if v_row.node_id is null then
        raise exception 'No existe asignación de workflow para este nodo';
    end if;

    return v_row;
end;
$$;

-- ============================================================
-- FIN
-- ============================================================
