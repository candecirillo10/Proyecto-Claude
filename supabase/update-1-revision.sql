-- Si ya ejecutaste schema.sql antes: ejecutá SOLO este archivo en el SQL Editor.
-- Qué hace: (1) los clientes no ven publicaciones en "Borrador"; (2) los clientes pueden
-- Aprobar / Pedir cambios, y solo eso (no pueden editar nada más).

drop policy if exists docs_read on docs;
create policy docs_read on docs for select to authenticated using (
  case
    when path like 'data/users/%' then path like 'data/users/' || auth.uid() || '/%'
    when is_owner() then true
    when jsonb_exists(data, 'assets') then coalesce(data->>'status','borrador') <> 'borrador'
    else true
  end);

create or replace function review_item(item_id text, decision text) returns void
language plpgsql security definer set search_path = public as $$
declare cur text; found_row boolean;
begin
  if auth.uid() is null then raise exception 'auth'; end if;
  if decision not in ('aprobada','cambios') then raise exception 'decision'; end if;
  if position('/' in item_id) > 0 then raise exception 'id'; end if;
  select true, coalesce(data->>'status','borrador') into found_row, cur from docs where path = 'items/' || item_id;
  if found_row is not true then raise exception 'no existe'; end if;
  if cur not in ('revision','aprobada','cambios') then raise exception 'estado'; end if;
  update docs set
    data = data || jsonb_build_object(
      'status', decision,
      'reviewedBy', coalesce((select raw_user_meta_data->>'name' from auth.users where id = auth.uid()), 'Cliente'),
      'reviewedAt', (extract(epoch from now()) * 1000)::bigint),
    updated_at = now()
  where path = 'items/' || item_id;
end $$;
revoke all on function review_item(text,text) from public;
grant execute on function review_item(text,text) to authenticated;
