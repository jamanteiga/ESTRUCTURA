-- ============================================================
-- Aprobación automática de la documentación (Modelo/Plano de
-- corte/Windchill) al marcar "Realizado" o "Publicar".
--
-- No toca ningún enum, así que se ejecuta entero de una vez (un
-- único Run), a diferencia de las migraciones anteriores.
--
-- Reglas:
--  1) Al marcar "Realizado" = Sí en Modelo o Plano de corte: el
--     propio nodo "Realizado" y su padre (Modelo o Plano de corte)
--     pasan a estado Aprobado. Al desmarcarlo, vuelven a quedar sin
--     estado.
--  2) Al marcar "Publicar" = Sí dentro de Windchill: Windchill (y
--     Publicar/Fichero subido dentro), Modelo (con su Realizado) y
--     Plano de corte (con su Realizado) pasan todos a Aprobado, ya
--     que la documentación se envía una vez está aprobada.
--  3) En ambos casos, si la pieza (el nodo inmediato superior de
--     Modelo/Plano de corte/Windchill) todavía no está Aprobada,
--     también pasa a Aprobado.
--
-- El estado "Aprobado" se guarda igual que en el resto de la app:
-- en node_workflow.revision_estado (ver revisar_nodo en
-- migracion_bloque_c_final.sql). Como los nodos de documentación
-- nunca pasan por asignación de tarea, es normal que todavía no
-- tengan fila en node_workflow -- por eso se usa un ayudante que
-- crea la fila si hace falta.
-- ============================================================

-- Ayudante interno: fija (o borra, con null) el revision_estado de
-- un nodo cualquiera, creando su fila en node_workflow si no existe
-- todavía. No se concede a "authenticated" directamente porque no
-- comprueba ningún permiso por sí mismo -- solo lo deben llamar
-- otras funciones (marcar_realizado_pieza,
-- marcar_publicacion_windchill_nodo) que ya validan quién puede.
create or replace function public.fijar_revision_estado_nodo(p_node_id uuid, p_estado text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.node_workflow
    set revision_estado = p_estado
    where node_id = p_node_id;

    if not found then
        insert into public.node_workflow (node_id, revision_estado)
        values (p_node_id, p_estado);
    end if;
end;
$$;
revoke execute on function public.fijar_revision_estado_nodo(uuid, text) from public;

-- Marca "Realizado" (Sí/No) de un nodo Modelo o Plano de corte. Al
-- marcar Sí, guarda en el propio nombre la fecha, hora y usuario, y
-- aprueba el nodo "Realizado", su padre y la pieza; al desmarcar,
-- deja el nombre en "No" y quita la aprobación de "Realizado" y de
-- su padre (la pieza no se toca al desmarcar). Solo ADMIN/REVISOR o
-- WINDCHILL.
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
    if not (
        public.is_reviewer()
        or exists (select 1 from public.profiles where id = auth.uid() and rol = 'WINDCHILL')
    ) then
        raise exception 'No autorizado para marcar como realizado';
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

-- Marca "Publicar" (Sí/No) dentro de Windchill y actualiza "Fichero
-- subido". Al publicar (Sí), aprueba además Windchill (y Publicar /
-- Fichero subido), Modelo y Plano de corte (con su Realizado) y la
-- pieza entera. Solo ADMIN/REVISOR o WINDCHILL.
create or replace function public.marcar_publicacion_windchill_nodo(p_node_id_publicar uuid, p_publicado boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_padre_id uuid;
    v_ficha_id uuid;
    v_nombre_usuario text;
    v_pieza_id uuid;
    v_mod_id uuid;
    v_pdc_id uuid;
    v_rea_id uuid;
begin
    if not ( public.is_reviewer() or exists (select 1 from public.profiles where id = auth.uid() and rol = 'WINDCHILL') ) then
        raise exception 'No autorizado para marcar la publicación en Windchill';
    end if;

    select parent_id into v_padre_id from public.nodes where id = p_node_id_publicar and tipo = 'DOC_PUBLICAR';
    if v_padre_id is null then raise exception 'El nodo indicado no es un nodo "Publicar" válido'; end if;

    update public.nodes set nombre = case when p_publicado then 'Sí' else 'No' end where id = p_node_id_publicar;

    select id into v_ficha_id from public.nodes where parent_id = v_padre_id and tipo = 'DOC_FICHERO_SUBIDO' limit 1;
    if v_ficha_id is not null then
        if p_publicado then
            select nombre_completo into v_nombre_usuario from public.profiles where id = auth.uid();
            update public.nodes set nombre = to_char(now() at time zone 'Europe/Madrid', 'DD/MM/YYYY HH24:MI') || ' - ' || coalesce(v_nombre_usuario, '—') where id = v_ficha_id;
        else
            update public.nodes set nombre = '—' where id = v_ficha_id;
        end if;
    end if;

    if p_publicado then
        perform public.fijar_revision_estado_nodo(v_padre_id, 'APROBADO');
        perform public.fijar_revision_estado_nodo(p_node_id_publicar, 'APROBADO');
        if v_ficha_id is not null then
            perform public.fijar_revision_estado_nodo(v_ficha_id, 'APROBADO');
        end if;

        select parent_id into v_pieza_id from public.nodes where id = v_padre_id;
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
