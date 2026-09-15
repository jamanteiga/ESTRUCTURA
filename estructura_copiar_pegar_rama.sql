-- ============================================================
-- No toca ningún enum, se ejecuta entera de una vez (un único Run).
--
-- "Copiar rama" / "Pegar aquí": copia un nodo y TODO lo que cuelga de
-- él (recursivamente) dentro de cualquier otro nodo del árbol. Es una
-- copia exacta -- "tal cual" -- de cada nodo: no solo tipo/código/
-- nombre/descripción/orden, sino también su fila de node_workflow
-- completa (usuario asignado, fechas previstas, estado de revisión...).
-- Solo el nodo raíz de la copia pide código y nombre nuevos; el resto
-- de la rama mantiene los mismos códigos/nombres que el original
-- (igual que ya pasa hoy con Modelo/Plano de corte/Windchill, que se
-- llaman siempre igual en cada pieza).
--
-- Para no tener que enumerar a mano cada columna de "nodes" y
-- "node_workflow" (y que se rompa si el día de mañana se añade una
-- columna nueva), se usa el truco de "select * into v_fila ... insert
-- into ... select (v_fila).*": copia la fila entera tal cual venga,
-- solo se sobrescriben los campos que de verdad cambian (id nuevo,
-- padre nuevo, y código/nombre en la raíz).
--
-- Solo ADMIN o Supervisor pueden copiar/pegar ramas completas.
-- ============================================================

-- Clona un único nodo (su fila de "nodes" + su fila de "node_workflow"
-- si la tiene) bajo un nuevo padre, con un nuevo id. Cuando
-- p_nuevo_codigo/p_nuevo_nombre son null, mantiene los del original.
-- Función interna: no se concede a "authenticated" (solo la usan
-- clonar_rama_recursiva y clonar_rama_completa, que ya comprueban el
-- permiso).
create or replace function public.clonar_nodo_individual(p_origen_id uuid, p_nuevo_parent_id uuid, p_nuevo_codigo text default null, p_nuevo_nombre text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_nodo public.nodes;
    v_wf public.node_workflow;
    v_nuevo_id uuid;
begin
    select * into v_nodo from public.nodes where id = p_origen_id;
    if not found then
        raise exception 'El nodo a copiar ya no existe';
    end if;

    v_nuevo_id := gen_random_uuid();
    v_nodo.id := v_nuevo_id;
    v_nodo.parent_id := p_nuevo_parent_id;
    if p_nuevo_codigo is not null then v_nodo.codigo := p_nuevo_codigo; end if;
    if p_nuevo_nombre is not null then v_nodo.nombre := p_nuevo_nombre; end if;

    insert into public.nodes select (v_nodo).*;

    select * into v_wf from public.node_workflow where node_id = p_origen_id;
    if found then
        v_wf.node_id := v_nuevo_id;
        insert into public.node_workflow select (v_wf).*;
    end if;

    return v_nuevo_id;
end;
$$;
revoke execute on function public.clonar_nodo_individual(uuid, uuid, text, text) from public;

-- Clona recursivamente todo lo que cuelga de un nodo (sin tocar
-- código/nombre: los hijos siempre mantienen los suyos). Función
-- interna, no se concede a "authenticated".
create or replace function public.clonar_rama_recursiva(p_origen_id uuid, p_nuevo_parent_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_nuevo_id uuid;
    v_hijo record;
begin
    v_nuevo_id := public.clonar_nodo_individual(p_origen_id, p_nuevo_parent_id, null, null);
    for v_hijo in select id from public.nodes where parent_id = p_origen_id order by orden
    loop
        perform public.clonar_rama_recursiva(v_hijo.id, v_nuevo_id);
    end loop;
end;
$$;
revoke execute on function public.clonar_rama_recursiva(uuid, uuid) from public;

-- Punto de entrada: copia la rama que empieza en p_origen_id entera
-- (con todo lo que cuelga de ella) dentro de p_nuevo_parent_id, con un
-- código y nombre nuevos para el nodo raíz de la copia. Devuelve el id
-- del nuevo nodo raíz. Solo ADMIN o Supervisor.
create or replace function public.clonar_rama_completa(p_origen_id uuid, p_nuevo_parent_id uuid, p_nuevo_codigo text, p_nuevo_nombre text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_nuevo_id uuid;
    v_hijo record;
begin
    if not public.is_reviewer() then
        raise exception 'Solo ADMIN o Supervisor pueden copiar/pegar ramas completas';
    end if;

    if p_origen_id = p_nuevo_parent_id or exists (
        with recursive ancestros as (
            select id, parent_id from public.nodes where id = p_nuevo_parent_id
            union all
            select n.id, n.parent_id from public.nodes n join ancestros a on n.id = a.parent_id
        )
        select 1 from ancestros where id = p_origen_id
    ) then
        raise exception 'No se puede pegar una rama dentro de sí misma o de uno de sus propios hijos';
    end if;

    v_nuevo_id := public.clonar_nodo_individual(p_origen_id, p_nuevo_parent_id, p_nuevo_codigo, p_nuevo_nombre);

    for v_hijo in select id from public.nodes where parent_id = p_origen_id order by orden
    loop
        perform public.clonar_rama_recursiva(v_hijo.id, v_nuevo_id);
    end loop;

    return v_nuevo_id;
end;
$$;
grant execute on function public.clonar_rama_completa(uuid, uuid, text, text) to authenticated;
