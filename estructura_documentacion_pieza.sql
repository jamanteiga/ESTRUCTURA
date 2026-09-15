-- ============================================================
-- Documentación de pieza: para cada pieza final de fabricación
-- (Plancha 1000/2000/3000, Perfil 4000/6000) se hace seguimiento
-- de 3 documentos — Modelo (MOD), Plano de corte (PDC) y
-- Windchill (WIN) — cada uno con "Publicado (Sí/No)" y "Fecha de
-- subida". Lo marcan ADMIN/REVISOR o el nuevo rol WINDCHILL
-- (persona encargada de subir la documentación a Windchill), que
-- no tiene ningún otro permiso en el árbol.
-- ============================================================

create table if not exists public.node_documentacion (
    node_id uuid not null references public.nodes(id) on delete cascade,
    tipo_documento text not null check (tipo_documento in ('MOD', 'PDC', 'WIN')),
    publicado boolean not null default false,
    fecha_subida date,
    actualizado_por uuid references public.profiles(id),
    actualizado_en timestamptz,
    primary key (node_id, tipo_documento)
);

alter table public.node_documentacion enable row level security;
drop policy if exists node_documentacion_select on public.node_documentacion;
create policy node_documentacion_select on public.node_documentacion for select using (auth.role() = 'authenticated');

-- Marca (o desmarca) el Publicado y/o la Fecha de subida de un documento
-- (MOD/PDC/WIN) de una pieza. Solo ADMIN/REVISOR o el rol WINDCHILL.
create or replace function public.marcar_documentacion_pieza(
    p_node_id uuid, p_tipo_documento text, p_publicado boolean, p_fecha_subida date default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if not (
        public.is_reviewer()
        or exists (select 1 from public.profiles where id = auth.uid() and rol = 'WINDCHILL')
    ) then
        raise exception 'No autorizado para marcar la documentación de la pieza';
    end if;

    if p_tipo_documento not in ('MOD', 'PDC', 'WIN') then
        raise exception 'Tipo de documento no válido: %', p_tipo_documento;
    end if;

    insert into public.node_documentacion (node_id, tipo_documento, publicado, fecha_subida, actualizado_por, actualizado_en)
    values (p_node_id, p_tipo_documento, p_publicado, p_fecha_subida, auth.uid(), now())
    on conflict (node_id, tipo_documento) do update
        set publicado = excluded.publicado,
            fecha_subida = excluded.fecha_subida,
            actualizado_por = excluded.actualizado_por,
            actualizado_en = excluded.actualizado_en;
end;
$$;
grant execute on function public.marcar_documentacion_pieza(uuid, text, boolean, date) to authenticated;

-- Devuelve las 3 filas (MOD/PDC/WIN) de una pieza, con su estado por
-- defecto (publicado = false, fecha_subida = null) si todavía no se
-- ha tocado ninguna.
create or replace function public.listar_documentacion_nodo(p_node_id uuid)
returns table (tipo_documento text, publicado boolean, fecha_subida date)
language sql
security definer
set search_path = public
as $$
    select t.tipo_documento, coalesce(d.publicado, false), d.fecha_subida
    from (values ('MOD'), ('PDC'), ('WIN')) as t(tipo_documento)
    left join public.node_documentacion d on d.node_id = p_node_id and d.tipo_documento = t.tipo_documento
    order by array_position(array['MOD', 'PDC', 'WIN'], t.tipo_documento);
$$;
grant execute on function public.listar_documentacion_nodo(uuid) to authenticated;
