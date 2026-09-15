-- ============================================================
-- No toca ningún enum, se ejecuta entera de una vez (un único Run).
--
-- Cambios:
--  1) "Realizado" (Modelo/Plano de corte) pasa a poder marcarlo SOLO
--     ADMIN o Supervisor (ya no el rol WINDCHILL) -- es la aprobación
--     técnica, distinta de la publicación.
--  2) Windchill (Publicar y Fichero subido) queda BLOQUEADO mientras
--     Modelo y Plano de corte de la pieza no estén Aprobados los dos.
--  3) "Publicar" y "Fichero subido" pasan a ser independientes: marcar
--     uno ya NO actualiza el otro automáticamente.
--  4) Dos funciones nuevas para aprobar/publicar en lote, pensadas para
--     usarse con la selección múltiple del árbol sobre una familia
--     entera (p.ej. PL1000, que arrastra a 1001, 1002...):
--       - aprobar_documentacion_pieza(pieza): Modelo+Plano de corte de
--         una pieza. Solo ADMIN/Supervisor.
--       - publicar_windchill_pieza(pieza): Publicar de una pieza (solo
--         funciona si Modelo+Plano de corte ya están Aprobados). ADMIN/
--         Supervisor/Windchill.
-- ============================================================

-- Comprueba si Modelo y Plano de corte de una pieza están los dos
-- Aprobados. Sirve de "candado" para todo lo de dentro de Windchill.
create or replace function public.documentacion_base_aprobada(p_pieza_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select
        exists (
            select 1 from public.nodes m
            join public.node_workflow wm on wm.node_id = m.id
            where m.parent_id = p_pieza_id and m.tipo = 'DOC_MODELO' and wm.revision_estado = 'APROBADO'
        )
        and exists (
            select 1 from public.nodes p
            join public.node_workflow wp on wp.node_id = p.id
            where p.parent_id = p_pieza_id and p.tipo = 'DOC_PLANO_CORTE' and wp.revision_estado = 'APROBADO'
        );
$$;
revoke execute on function public.documentacion_base_aprobada(uuid) from public;
grant execute on function public.documentacion_base_aprobada(uuid) to authenticated;

-- Marca "Realizado" (Sí/No) de un nodo Modelo o Plano de corte. Al
-- marcar Sí, guarda en el propio nombre la fecha, hora y usuario, y
-- aprueba el nodo "Realizado", su padre y la pieza; al desmarcar,
-- deja el nombre en "No" y quita la aprobación de "Realizado" y de
-- su padre (la pieza no se toca al desmarcar).
-- SOLO ADMIN o Supervisor (ya no WINDCHILL: es la aprobación técnica).
create or replace function public.marcar_realizado_pieza(p_node_id_realizado uuid, p_realizado boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_nombre_usuario text;
    v_padre_id uuid;
    v_abuelo_id uuid;
begin
    if not public.is_reviewer() then
        raise exception 'Solo ADMIN o Supervisor pueden marcar como realizado';
    end if;

    select parent_id into v_padre_id from public.nodes where id = p_node_id_realizado and tipo = 'DOC_REALIZADO';
    if v_padre_id is null then
        raise exception 'El nodo indicado no es un nodo "Realizado" válido';
    end if;

    if p_realizado then
        select nombre_completo into v_nombre_usuario from public.profiles where id = auth.uid();
        update public.nodes
        set nombre = 'Sí - ' || to_char(now() at time zone 'Europe/Madrid', 'DD/MM/YYYY HH24:MI') || ' - ' || coalesce(v_nombre_usuario, '—')
        where id = p_node_id_realizado;

        perform public.fijar_revision_estado_nodo(p_node_id_realizado, 'APROBADO');
        perform public.fijar_revision_estado_nodo(v_padre_id, 'APROBADO');

        select parent_id into v_abuelo_id from public.nodes where id = v_padre_id;
        if v_abuelo_id is not null then
            perform public.fijar_revision_estado_nodo(v_abuelo_id, 'APROBADO');
        end if;
    else
        update public.nodes set nombre = 'No' where id = p_node_id_realizado;
        perform public.fijar_revision_estado_nodo(p_node_id_realizado, null);
        perform public.fijar_revision_estado_nodo(v_padre_id, null);
    end if;
end;
$$;
grant execute on function public.marcar_realizado_pieza(uuid, boolean) to authenticated;

-- Marca "Publicar" (Sí/No) dentro de Windchill. Ya NO toca "Fichero
-- subido" -- son independientes, aunque estén en la misma rama. Solo
-- se puede publicar (Sí) si Modelo y Plano de corte de la pieza están
-- ya Aprobados; si lo están, aprueba además Windchill (y el propio
-- Publicar), Modelo y Plano de corte (con su Realizado, por si acaso)
-- y la pieza entera. ADMIN/Supervisor/Windchill.
create or replace function public.marcar_publicacion_windchill_nodo(p_node_id_publicar uuid, p_publicado boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_padre_id uuid;    -- WIN
    v_pieza_id uuid;    -- la pieza (1001, 4001...)
    v_mod_id uuid;
    v_pdc_id uuid;
    v_rea_id uuid;
begin
    if not ( public.is_reviewer() or exists (select 1 from public.profiles where id = auth.uid() and rol = 'WINDCHILL') ) then
        raise exception 'No autorizado para marcar la publicación en Windchill';
    end if;

    select parent_id into v_padre_id from public.nodes where id = p_node_id_publicar and tipo = 'DOC_PUBLICAR';
    if v_padre_id is null then raise exception 'El nodo indicado no es un nodo "Publicar" válido'; end if;

    select parent_id into v_pieza_id from public.nodes where id = v_padre_id;

    if p_publicado then
        if v_pieza_id is null or not public.documentacion_base_aprobada(v_pieza_id) then
            raise exception 'No se puede publicar en Windchill: Modelo y Plano de corte de esta pieza deben estar Aprobados primero';
        end if;
    end if;

    update public.nodes set nombre = case when p_publicado then 'Sí' else 'No' end where id = p_node_id_publicar;

    if p_publicado then
        perform public.fijar_revision_estado_nodo(v_padre_id, 'APROBADO');
        perform public.fijar_revision_estado_nodo(p_node_id_publicar, 'APROBADO');

        if v_pieza_id is not null then
            perform public.fijar_revision_estado_nodo(v_pieza_id, 'APROBADO');

            select id into v_mod_id from public.nodes where parent_id = v_pieza_id and tipo = 'DOC_MODELO' limit 1;
            if v_mod_id is not null then
                perform public.fijar_revision_estado_nodo(v_mod_id, 'APROBADO');
                select id into v_rea_id from public.nodes where parent_id = v_mod_id and tipo = 'DOC_REALIZADO' limit 1;
                if v_rea_id is not null then
                    perform public.fijar_revision_estado_nodo(v_rea_id, 'APROBADO');
                end if;
            end if;

            select id into v_pdc_id from public.nodes where parent_id = v_pieza_id and tipo = 'DOC_PLANO_CORTE' limit 1;
            if v_pdc_id is not null then
                perform public.fijar_revision_estado_nodo(v_pdc_id, 'APROBADO');
                select id into v_rea_id from public.nodes where parent_id = v_pdc_id and tipo = 'DOC_REALIZADO' limit 1;
                if v_rea_id is not null then
                    perform public.fijar_revision_estado_nodo(v_rea_id, 'APROBADO');
                end if;
            end if;
        end if;
    end if;
end;
$$;
grant execute on function public.marcar_publicacion_windchill_nodo(uuid, boolean) to authenticated;

-- Marca "Fichero subido" (Sí/No), independiente de "Publicar". Al
-- marcar Sí, guarda fecha, hora y usuario en el propio nombre (solo si
-- Modelo y Plano de corte ya están Aprobados). ADMIN/Supervisor/Windchill.
create or replace function public.marcar_fichero_subido_nodo(p_node_id_ficha uuid, p_subido boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_padre_id uuid;    -- WIN
    v_pieza_id uuid;
    v_nombre_usuario text;
begin
    if not ( public.is_reviewer() or exists (select 1 from public.profiles where id = auth.uid() and rol = 'WINDCHILL') ) then
        raise exception 'No autorizado para marcar el fichero subido';
    end if;

    select parent_id into v_padre_id from public.nodes where id = p_node_id_ficha and tipo = 'DOC_FICHERO_SUBIDO';
    if v_padre_id is null then raise exception 'El nodo indicado no es un nodo "Fichero subido" válido'; end if;

    select parent_id into v_pieza_id from public.nodes where id = v_padre_id;

    if p_subido then
        if v_pieza_id is null or not public.documentacion_base_aprobada(v_pieza_id) then
            raise exception 'No se puede subir el fichero a Windchill: Modelo y Plano de corte de esta pieza deben estar Aprobados primero';
        end if;
        select nombre_completo into v_nombre_usuario from public.profiles where id = auth.uid();
        update public.nodes
        set nombre = to_char(now() at time zone 'Europe/Madrid', 'DD/MM/YYYY HH24:MI') || ' - ' || coalesce(v_nombre_usuario, '—')
        where id = p_node_id_ficha;
        perform public.fijar_revision_estado_nodo(p_node_id_ficha, 'APROBADO');
    else
        update public.nodes set nombre = '—' where id = p_node_id_ficha;
        perform public.fijar_revision_estado_nodo(p_node_id_ficha, null);
    end if;
end;
$$;
grant execute on function public.marcar_fichero_subido_nodo(uuid, boolean) to authenticated;

-- Aprueba en lote Modelo + Plano de corte de una pieza (encuentra sus
-- nodos "Realizado" y reutiliza exactamente la misma lógica que
-- marcarlos a mano, uno por uno). Falla si la pieza todavía no tiene
-- generada la documentación. SOLO ADMIN o Supervisor.
create or replace function public.aprobar_documentacion_pieza(p_pieza_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_mod_rea uuid;
    v_pdc_rea uuid;
begin
    if not public.is_reviewer() then
        raise exception 'Solo ADMIN o Supervisor pueden aprobar documentación en lote';
    end if;

    select r.id into v_mod_rea
    from public.nodes m
    join public.nodes r on r.parent_id = m.id and r.tipo = 'DOC_REALIZADO'
    where m.parent_id = p_pieza_id and m.tipo = 'DOC_MODELO'
    limit 1;

    select r.id into v_pdc_rea
    from public.nodes p
    join public.nodes r on r.parent_id = p.id and r.tipo = 'DOC_REALIZADO'
    where p.parent_id = p_pieza_id and p.tipo = 'DOC_PLANO_CORTE'
    limit 1;

    if v_mod_rea is null or v_pdc_rea is null then
        raise exception 'Esta pieza todavía no tiene generados Modelo y Plano de corte (con su "Realizado") -- usa antes "Generar documentación"';
    end if;

    perform public.marcar_realizado_pieza(v_mod_rea, true);
    perform public.marcar_realizado_pieza(v_pdc_rea, true);
end;
$$;
grant execute on function public.aprobar_documentacion_pieza(uuid) to authenticated;

-- Publica en Windchill (Publicar = Sí) de una pieza en lote. Solo
-- funciona si Modelo y Plano de corte de esa pieza ya están Aprobados
-- (lo comprueba marcar_publicacion_windchill_nodo). ADMIN/Supervisor/
-- Windchill -- normalmente lo hará el usuario Windchill, en una
-- segunda pasada tras la aprobación en lote de arriba.
create or replace function public.publicar_windchill_pieza(p_pieza_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_pub_id uuid;
begin
    select pub.id into v_pub_id
    from public.nodes w
    join public.nodes pub on pub.parent_id = w.id and pub.tipo = 'DOC_PUBLICAR'
    where w.parent_id = p_pieza_id and w.tipo = 'DOC_WINDCHILL'
    limit 1;

    if v_pub_id is null then
        raise exception 'Esta pieza todavía no tiene generado Windchill/Publicar -- usa antes "Generar documentación"';
    end if;

    perform public.marcar_publicacion_windchill_nodo(v_pub_id, true);
end;
$$;
grant execute on function public.publicar_windchill_pieza(uuid) to authenticated;
