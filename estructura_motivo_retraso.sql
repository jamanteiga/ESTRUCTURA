-- ============================================================
-- Motivo de retraso categorizado: cuando se fija una fecha fin
-- prevista posterior a la que ya había (un retraso real), la app pide
-- elegir una categoría (y opcionalmente un detalle) y queda guardado
-- junto con esa entrada del historial de replanificaciones — así se
-- puede analizar más adelante qué está causando los retrasos.
--
-- Este archivo es autocontenido: crea la tabla historial_fechas_previstas
-- si todavía no existe (por si no se llegó a ejecutar
-- estructura_historial_fechas_previstas.sql) y luego añade las
-- columnas de motivo. Se puede ejecutar tal cual, sin depender de
-- haber ejecutado antes ningún otro archivo de este bloque.
-- ============================================================

create table if not exists public.historial_fechas_previstas (
    id uuid primary key default gen_random_uuid(),
    node_id uuid not null references public.nodes(id) on delete cascade,
    fecha_inicio_anterior date,
    fecha_fin_anterior date,
    fecha_inicio_nueva date,
    fecha_fin_nueva date,
    cambiado_por uuid references public.profiles(id),
    cambiado_en timestamptz not null default now()
);

alter table public.historial_fechas_previstas enable row level security;
drop policy if exists historial_fechas_previstas_select on public.historial_fechas_previstas;
create policy historial_fechas_previstas_select on public.historial_fechas_previstas for select using (auth.role() = 'authenticated');

alter table public.historial_fechas_previstas
    add column if not exists motivo_categoria text,
    add column if not exists motivo_detalle text;

alter table public.historial_fechas_previstas
    drop constraint if exists historial_fechas_previstas_motivo_categoria_check;
alter table public.historial_fechas_previstas
    add constraint historial_fechas_previstas_motivo_categoria_check
    check (motivo_categoria is null or motivo_categoria in (
        'FALTA_MATERIAL', 'CAMBIO_DISENO', 'AUSENCIA_PERSONAL', 'DEPENDENCIA_EXTERNA', 'OTRO'
    ));

-- Necesita que node_workflow ya tenga las columnas de fechas previstas
-- (estructura_fechas_previstas.sql). Si esa tabla/columnas no existen
-- todavía, este CREATE OR REPLACE fallará indicando exactamente cuál
-- falta — en ese caso ejecuta primero estructura_fechas_previstas.sql.

-- Se sustituye la función por una con dos parámetros nuevos (con
-- default null, para no romper otras llamadas que pudiera haber).
-- Al cambiar la firma, Postgres crearía una función aparte en vez de
-- reemplazar la de 3 argumentos — se borran ambas variantes antiguas
-- primero (da igual si alguna no existe: el "if exists" lo permite).
drop function if exists public.establecer_fechas_previstas(uuid, date, date);
drop function if exists public.establecer_fechas_previstas(uuid, date, date, text, text);

create function public.establecer_fechas_previstas(
    p_node_id uuid,
    p_fecha_inicio date,
    p_fecha_fin date,
    p_motivo_categoria text default null,
    p_motivo_detalle text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_inicio_anterior date;
    v_fin_anterior date;
begin
    if not public.is_reviewer() then
        raise exception 'Solo ADMIN o REVISOR pueden fijar fechas previstas';
    end if;
    if p_fecha_inicio is not null and p_fecha_fin is not null and p_fecha_fin < p_fecha_inicio then
        raise exception 'La fecha fin prevista no puede ser anterior a la fecha inicio prevista';
    end if;
    if p_motivo_categoria is not null and p_motivo_categoria not in (
        'FALTA_MATERIAL', 'CAMBIO_DISENO', 'AUSENCIA_PERSONAL', 'DEPENDENCIA_EXTERNA', 'OTRO'
    ) then
        raise exception 'Categoría de motivo no válida';
    end if;

    select fecha_inicio_prevista, fecha_fin_prevista into v_inicio_anterior, v_fin_anterior
    from public.node_workflow where node_id = p_node_id;

    update public.node_workflow
    set fecha_inicio_prevista = p_fecha_inicio,
        fecha_fin_prevista = p_fecha_fin,
        fecha_inicio_prevista_base = coalesce(fecha_inicio_prevista_base, p_fecha_inicio),
        fecha_fin_prevista_base = coalesce(fecha_fin_prevista_base, p_fecha_fin)
    where node_id = p_node_id;

    if not found then
        insert into public.node_workflow (node_id, fecha_inicio_prevista, fecha_fin_prevista, fecha_inicio_prevista_base, fecha_fin_prevista_base)
        values (p_node_id, p_fecha_inicio, p_fecha_fin, p_fecha_inicio, p_fecha_fin);
    end if;

    if v_inicio_anterior is distinct from p_fecha_inicio or v_fin_anterior is distinct from p_fecha_fin then
        insert into public.historial_fechas_previstas
            (node_id, fecha_inicio_anterior, fecha_fin_anterior, fecha_inicio_nueva, fecha_fin_nueva, cambiado_por, motivo_categoria, motivo_detalle)
        values
            (p_node_id, v_inicio_anterior, v_fin_anterior, p_fecha_inicio, p_fecha_fin, auth.uid(), p_motivo_categoria, p_motivo_detalle);
    end if;
end;
$$;

grant execute on function public.establecer_fechas_previstas(uuid, date, date, text, text) to authenticated;
