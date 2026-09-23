-- Studio accounts: new email and Google sign-ups stay pending until an
-- administrator grants access. People who already had an account keep access.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  full_name text,
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'pending' check (status in ('pending', 'active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.is_studio_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

insert into public.profiles (id, email, full_name, role, status)
select
  u.id,
  coalesce(u.email, ''),
  nullif(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'), ''),
  'admin',
  'active'
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);

create or replace function public.handle_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.profiles (id, email, full_name, role, status)
    values (
      new.id,
      coalesce(new.email, ''),
      nullif(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), ''),
      'member',
      'pending'
    )
    on conflict (id) do nothing;
  elsif tg_op = 'UPDATE' then
    update public.profiles
    set
      email = coalesce(new.email, email),
      full_name = coalesce(
        nullif(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), ''),
        full_name
      )
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user on auth.users;
create trigger on_auth_user
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_auth_user();

alter table public.profiles enable row level security;

drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "Admins read profiles" on public.profiles;
create policy "Admins read profiles"
  on public.profiles for select
  to authenticated
  using (public.is_studio_admin());

revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

create or replace function public.admin_update_user(
  target uuid,
  new_role text,
  new_status text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_studio_admin() then
    raise exception 'Not allowed';
  end if;
  if target = auth.uid() then
    raise exception 'You cannot change your own account here';
  end if;
  if new_role not in ('admin', 'member') or new_status not in ('pending', 'active', 'disabled') then
    raise exception 'Invalid account update';
  end if;
  if not exists (select 1 from public.profiles where id = target) then
    raise exception 'User not found';
  end if;
  if exists (
    select 1 from public.profiles
    where id = target and role = 'admin' and status = 'active'
  ) and (new_role <> 'admin' or new_status <> 'active') then
    if (
      select count(*) from public.profiles
      where role = 'admin' and status = 'active' and id <> target
    ) = 0 then
      raise exception 'At least one active administrator is required';
    end if;
  end if;

  update public.profiles
  set role = new_role, status = new_status
  where id = target;

  if new_status = 'disabled' then
    begin
      delete from auth.sessions where user_id = target;
    exception when others then
      null;
    end;
  end if;
end;
$$;

create or replace function public.admin_delete_user(target uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_studio_admin() then
    raise exception 'Not allowed';
  end if;
  if target = auth.uid() then
    raise exception 'You cannot delete your own account';
  end if;
  if exists (
    select 1 from public.profiles
    where id = target and role = 'admin' and status = 'active'
  ) and (
    select count(*) from public.profiles
    where role = 'admin' and status = 'active' and id <> target
  ) = 0 then
    raise exception 'At least one active administrator is required';
  end if;

  delete from auth.users where id = target;
  if not found then
    raise exception 'User not found';
  end if;
end;
$$;

revoke all on function public.is_studio_admin() from public;
revoke all on function public.admin_update_user(uuid, text, text) from public;
revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.is_studio_admin() to anon, authenticated;
grant execute on function public.admin_update_user(uuid, text, text) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- Studio edits require an active administrator. Public published reads stay as they are.
drop policy if exists "Admin all talent_locations" on public.talent_locations;
create policy "Admin all talent_locations"
  on public.talent_locations for all
  to authenticated
  using (public.is_studio_admin())
  with check (public.is_studio_admin());

drop policy if exists "Admin all team_members" on public.team_members;
create policy "Admin all team_members"
  on public.team_members for all
  to authenticated
  using (public.is_studio_admin())
  with check (public.is_studio_admin());

drop policy if exists "Admin all jobs" on public.jobs;
create policy "Admin all jobs"
  on public.jobs for all
  to authenticated
  using (public.is_studio_admin())
  with check (public.is_studio_admin());

drop policy if exists "Admin all insights" on public.insights;
create policy "Admin all insights"
  on public.insights for all
  to authenticated
  using (public.is_studio_admin())
  with check (public.is_studio_admin());

drop policy if exists "Admin all case_studies" on public.case_studies;
create policy "Admin all case_studies"
  on public.case_studies for all
  to authenticated
  using (public.is_studio_admin())
  with check (public.is_studio_admin());

drop policy if exists "Admin all case_study_details" on public.case_study_details;
create policy "Admin all case_study_details"
  on public.case_study_details for all
  to authenticated
  using (public.is_studio_admin())
  with check (public.is_studio_admin());

drop policy if exists "Admin all clients" on public.clients;
create policy "Admin all clients"
  on public.clients for all
  to authenticated
  using (public.is_studio_admin())
  with check (public.is_studio_admin());

drop policy if exists "Admin upload cms images" on storage.objects;
create policy "Admin upload cms images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('team', 'case-studies', 'clients', 'insights')
    and public.is_studio_admin()
  );

drop policy if exists "Admin update cms images" on storage.objects;
create policy "Admin update cms images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('team', 'case-studies', 'clients', 'insights')
    and public.is_studio_admin()
  );

drop policy if exists "Admin delete cms images" on storage.objects;
create policy "Admin delete cms images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('team', 'case-studies', 'clients', 'insights')
    and public.is_studio_admin()
  );
