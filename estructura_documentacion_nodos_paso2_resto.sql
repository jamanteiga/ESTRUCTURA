-- ============================================================
-- PASO 2 de 2 — ejecutar SOLO después de que el archivo
-- estructura_documentacion_nodos_paso1_enum.sql haya terminado con
-- éxito, en un "Run" NUEVO y separado de aquel.
--
-- Documentación de pieza como NODOS reales del árbol (además del
-- modal ya existente sobre la propia pieza — se mantienen los dos,
-- son cosas independientes): dentro de una pieza numerada (código
-- "1001", "4001"...) se pueden generar 3 nodos hijos, Modelo (MOD),
-- Plano de corte (PDC) y Windchill (WIN). MOD y PDC son solo
-- marcadores; WIN además lleva "Publicado (Sí/No)" y "Fichero
-- subido" (fecha+hora+usuario, guardado automáticamente al marcar
-- Publicado). Solo ADMIN/REVISOR o el rol WINDCHILL pueden marcarlo.
-- ============================================================

-- Comprobación de seguridad: si esto falla, es que el Paso 1 no se
-- ha ejecutado todavía (o en la misma transacción) -- ejecútalo
-- primero, espera a que termine, y vuelve a lanzar este archivo.
do $$
begin
    if not exists (
        select 1 from pg_enum e
        join pg_type t on t.oid = e.enumtypid
        where t.typname = 'node_type' and e.enumlabel = 'DOC_WINDCHILL'
    ) then
        raise exception 'Todavía no se ha ejecutado (o no ha terminado) el Paso 1 -- ejecuta primero estructura_documentacion_nodos_paso1_enum.sql, espera a que diga Success, y vuelve a lanzar este archivo en un Run nuevo.';
    end if;
end $$;

-- Permite que las 5 piezas documentables admitan estos 3 tipos como
-- hijos. No se toca node_type_rules para nada más.
-- El enum del que son parent_type/child_type se llama "node_type" en esta
-- base de datos (lo reveló el propio error de Postgres al probarlo).
insert into public.node_type_rules (parent_type, child_type)
select t.parent_type::node_type, t.child_type::node_type
from (values
    ('PLANCHA_1000', 'DOC_MODELO'), ('PLANCHA_1000', 'DOC_PLANO_CORTE'), ('PLANCHA_1000', 'DOC_WINDCHILL'),
    ('PLANCHA_2000', 'DOC_MODELO'), ('PLANCHA_2000', 'DOC_PLANO_CORTE'), ('PLANCHA_2000', 'DOC_WINDCHILL'),
    ('PLANCHA_3000', 'DOC_MODELO'), ('PLANCHA_3000', 'DOC_PLANO_CORTE'), ('PLANCHA_3000', 'DOC_WINDCHILL'),
    ('PERFIL_4000', 'DOC_MODELO'), ('PERFIL_4000', 'DOC_PLANO_CORTE'), ('PERFIL_4000', 'DOC_WINDCHILL'),
    ('PERFIL_6000', 'DOC_MODELO'), ('PERFIL_6000', 'DOC_PLANO_CORTE'), ('PERFIL_6000', 'DOC_WINDCHILL')
) as t(parent_type, child_type)
where not exists (
    -- parent_type/child_type son del mismo enum que nodes.tipo: se comparan
    -- como texto para no depender de saber su nombre exacto.
    select 1 from public.node_type_rules r
    where r.parent_type::text = t.parent_type and r.child_type::text = t.child_type
);

-- Publicación en Windchill de un nodo DOC_WINDCHILL concreto.
create table if not exists public.node_windchill_publicacion (
    node_id uuid primary key references public.nodes(id) on delete cascade,
    publicado boolean not null default false,
    subido_en timestamptz,
    subido_por uuid references public.profiles(id)
);

alter table public.node_windchill_publicacion enable row level security;
drop policy if exists node_windchill_publicacion_select on public.node_windchill_publicacion;
create policy node_windchill_publicacion_select on public.node_windchill_publicacion for select using (auth.role() = 'authenticated');

-- Marca Publicado Sí/No de un nodo Windchill. Al marcar Sí se guarda
-- automáticamente quién y cuándo (fecha+hora); al desmarcar se borran
-- (deja de haber "fichero subido" vigente). Solo ADMIN/REVISOR o WINDCHILL.
create or replace function public.marcar_publicacion_windchill(p_node_id uuid, p_publicado boolean)
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
        raise exception 'No autorizado para marcar la publicación en Windchill';
    end if;

    insert into public.node_windchill_publicacion (node_id, publicado, subido_en, subido_por)
    values (
        p_node_id,
        p_publicado,
        case when p_publicado then now() else null end,
        case when p_publicado then auth.uid() else null end
    )
    on conflict (node_id) do update
        set publicado = excluded.publicado,
            subido_en = excluded.subido_en,
            subido_por = excluded.subido_por;
end;
$$;
grant execute on function public.marcar_publicacion_windchill(uuid, boolean) to authenticated;

-- Devuelve el estado de publicación de un nodo Windchill, con el
-- nombre de quién lo subió (false/null si todavía no se ha tocado).
create or replace function public.obtener_publicacion_windchill(p_node_id uuid)
returns table (publicado boolean, subido_en timestamptz, subido_por_nombre text)
language sql
security definer
set search_path = public
as $$
    select coalesce(p.publicado, false), p.subido_en, u.nombre_completo
    from (select p_node_id as node_id) base
    left join public.node_windchill_publicacion p on p.node_id = base.node_id
    left join public.profiles u on u.id = p.subido_por;
$$;
grant execute on function public.obtener_publicacion_windchill(uuid) to authenticated;
