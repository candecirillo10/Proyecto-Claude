-- Ejecutar completo en Supabase → SQL Editor (una sola vez).

-- 1) Dueña/o de la app: la única cuenta que puede editar
create table if not exists app_owner(user_id uuid primary key references auth.users on delete cascade);
alter table app_owner enable row level security;  -- sin policies: solo la función is_owner() la lee

create or replace function is_owner() returns boolean
language sql security definer stable set search_path=public as
$$ select exists(select 1 from app_owner where user_id = auth.uid()) $$;

-- 2) Contenido (marca, carpetas, publicaciones, ideas)
create table if not exists docs(
  path text primary key,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table docs enable row level security;
drop policy if exists docs_read on docs; drop policy if exists docs_ins on docs;
drop policy if exists docs_upd on docs;  drop policy if exists docs_del on docs;
create policy docs_read on docs for select to authenticated
  using (path not like 'data/users/%' or path like 'data/users/' || auth.uid() || '/%');
create policy docs_ins on docs for insert to authenticated with check (is_owner());
create policy docs_upd on docs for update to authenticated using (is_owner()) with check (is_owner());
create policy docs_del on docs for delete to authenticated using (is_owner());

-- 3) Comentarios (cualquier cuenta comenta; borra el suyo o la dueña/o)
create table if not exists comments(
  id bigint generated always as identity primary key,
  target text not null,
  author_id uuid not null default auth.uid(),
  author_name text not null default '',
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists comments_target on comments(target);
alter table comments enable row level security;
drop policy if exists c_read on comments; drop policy if exists c_ins on comments; drop policy if exists c_del on comments;
create policy c_read on comments for select to authenticated using (true);
create policy c_ins  on comments for insert to authenticated with check (author_id = auth.uid());
create policy c_del  on comments for delete to authenticated using (author_id = auth.uid() or is_owner());

-- 4) Archivos (privado, 50 MB por archivo)
insert into storage.buckets(id,name,public,file_size_limit)
  values ('media','media',false,52428800) on conflict (id) do nothing;
drop policy if exists m_read on storage.objects; drop policy if exists m_ins on storage.objects;
drop policy if exists m_upd on storage.objects;  drop policy if exists m_del on storage.objects;
create policy m_read on storage.objects for select to authenticated using (bucket_id='media');
create policy m_ins  on storage.objects for insert to authenticated with check (bucket_id='media' and is_owner());
create policy m_upd  on storage.objects for update to authenticated using (bucket_id='media' and is_owner());
create policy m_del  on storage.objects for delete to authenticated using (bucket_id='media' and is_owner());

-- 4b) Clientes: no ven borradores; pueden aprobar / pedir cambios
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

-- 5) Tiempo real
alter publication supabase_realtime add table docs, comments;

-- 6) DESPUÉS de crear tu cuenta en la app, hacete dueña/o (cambiá el email):
-- insert into app_owner select id from auth.users where email = 'TU_EMAIL@ejemplo.com';
