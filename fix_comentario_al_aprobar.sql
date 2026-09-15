-- ============================================================
-- Permite guardar un comentario opcional también al APROBAR,
-- no solo al rechazar (antes se borraba siempre en la aprobación).
-- ============================================================

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
        trabajo_estado = 'TERMINADO',
        trabajo_terminado_en = coalesce(trabajo_terminado_en, now()),
        revision_estado = (case when p_aprobado then 'APROBADO' else 'RECHAZADO' end)::review_status,
        comentario_revision = p_comentario,
        revisado_en = now()
    where node_id = p_node_id
    returning * into v_row;

    if v_row.node_id is null then
        raise exception 'No existe asignación de workflow para este nodo';
    end if;

    return v_row;
end;
$$;
