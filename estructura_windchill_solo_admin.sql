-- ============================================================
-- No toca ningún enum, se ejecuta entera de una vez (un único Run).
--
-- Cambio de permisos en Windchill (Publicar y Fichero subido): a partir
-- de ahora SOLO puede tocarlos un ADMIN o el usuario de Windchill --
-- un Supervisor (REVISOR) ya NO puede marcar Publicar ni Fichero subido
-- (sigue pudiendo aprobar Modelo y Plano de corte, eso no cambia).
--
-- Sustituye por completo a las versiones de estas dos funciones que
-- venían en estructura_bloqueo_windchill_y_lotes.sql (create or replace,
-- no hace falta borrar nada a mano).
-- ============================================================

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
    if not ( exists (select 1 from public.profiles where id = auth.uid() and rol = 'ADMIN')
             or exists (select 1 from public.profiles where id = auth.uid() and rol = 'WINDCHILL') ) then
        raise exception 'Solo ADMIN o el usuario de Windchill pueden marcar la publicación en Windchill';
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
    if not ( exists (select 1 from public.profiles where id = auth.uid() and rol = 'ADMIN')
             or exists (select 1 from public.profiles where id = auth.uid() and rol = 'WINDCHILL') ) then
        raise exception 'Solo ADMIN o el usuario de Windchill pueden marcar el fichero subido';
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

-- publicar_windchill_pieza (la versión en lote) no tiene su propio
-- chequeo de rol -- llama a marcar_publicacion_windchill_nodo, así que
-- hereda automáticamente esta misma restricción sin tocarla.
