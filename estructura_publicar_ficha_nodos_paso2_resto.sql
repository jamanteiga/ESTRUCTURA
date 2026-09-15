-- ============================================================
-- PASO 2 de 2 — ejecutar SOLO después de que
-- estructura_publicar_ficha_nodos_paso1_enum.sql haya terminado con
-- éxito, en un "Run" NUEVO y separado de aquel.
--
-- "Publicar" y "Fichero subido" pasan a ser nodos hijos DE VERDAD
-- dentro del nodo Windchill (WIN), en vez del modal "✅ Publicación
-- Windchill" (que se retira). El estado se ve directamente en el
-- árbol, en el propio nombre del nodo: "Publicar" muestra Sí/No, y
-- "Fichero subido" muestra fecha, hora y quién lo marcó -- todo
-- calculado automáticamente al cambiar "Publicar", nunca a mano.
-- ============================================================

do $$
begin
    if not exists (
        select 1 from pg_enum e
        join pg_type t on t.oid = e.enumtypid
        where t.typname = 'node_type' and e.enumlabel = 'DOC_FICHERO_SUBIDO'
    ) then
        raise exception 'Todavía no se ha ejecutado (o no ha terminado) el Paso 1 -- ejecuta primero estructura_publicar_ficha_nodos_paso1_enum.sql, espera a que diga Success, y vuelve a lanzar este archivo en un Run nuevo.';
    end if;
end $$;

-- Solo el nodo Windchill (WIN) admite estos 2 tipos como hijos.
insert into public.node_type_rules (parent_type, child_type)
select t.parent_type::node_type, t.child_type::node_type
from (values
    ('DOC_WINDCHILL', 'DOC_PUBLICAR'),
    ('DOC_WINDCHILL', 'DOC_FICHERO_SUBIDO')
) as t(parent_type, child_type)
where not exists (
    select 1 from public.node_type_rules r
    where r.parent_type::text = t.parent_type and r.child_type::text = t.child_type
);

-- Marca "Publicar" (Sí/No) y actualiza automáticamente el nodo
-- hermano "Fichero subido" con fecha, hora y quién lo hizo (o lo deja
-- en blanco si se desmarca). p_node_id es el ID del nodo "Publicar"
-- (el que se ha tocado desde el árbol), no el del nodo Windchill.
-- Solo ADMIN/REVISOR o el rol WINDCHILL.
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
begin
    if not (
        public.is_reviewer()
        or exists (select 1 from public.profiles where id = auth.uid() and rol = 'WINDCHILL')
    ) then
        raise exception 'No autorizado para marcar la publicación en Windchill';
    end if;

    select parent_id into v_padre_id from public.nodes where id = p_node_id_publicar and tipo = 'DOC_PUBLICAR';
    if v_padre_id is null then
        raise exception 'El nodo indicado no es un nodo "Publicar" válido';
    end if;

    update public.nodes set nombre = case when p_publicado then 'Sí' else 'No' end
    where id = p_node_id_publicar;

    select id into v_ficha_id from public.nodes where parent_id = v_padre_id and tipo = 'DOC_FICHERO_SUBIDO' limit 1;
    if v_ficha_id is not null then
        if p_publicado then
            select nombre_completo into v_nombre_usuario from public.profiles where id = auth.uid();
            update public.nodes
            set nombre = to_char(now() at time zone 'Europe/Madrid', 'DD/MM/YYYY HH24:MI') || ' - ' || coalesce(v_nombre_usuario, '—')
            where id = v_ficha_id;
        else
            update public.nodes set nombre = '—' where id = v_ficha_id;
        end if;
    end if;
end;
$$;
grant execute on function public.marcar_publicacion_windchill_nodo(uuid, boolean) to authenticated;
