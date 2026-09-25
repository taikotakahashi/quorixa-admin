-- Persistent admin notifications, preferences, and optional push subscriptions.

alter table public.profiles
  add column if not exists notify_email boolean not null default true;

alter table public.profiles
  add column if not exists notify_push boolean not null default true;

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('user_pending', 'feedback_pending', 'system')),
  title text not null,
  body text not null default '',
  href text not null default '/',
  source_type text,
  source_id text,
  read_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint admin_notifications_source_unique
    unique (recipient_id, source_type, source_id)
);

create index if not exists admin_notifications_recipient_created_idx
  on public.admin_notifications (recipient_id, created_at desc);

create index if not exists admin_notifications_recipient_unread_idx
  on public.admin_notifications (recipient_id)
  where read_at is null;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_unique unique (endpoint)
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.admin_notifications enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "Admins read own notifications" on public.admin_notifications;
create policy "Admins read own notifications"
  on public.admin_notifications for select
  to authenticated
  using (recipient_id = auth.uid() and public.is_studio_admin());

drop policy if exists "Admins update own notifications" on public.admin_notifications;
create policy "Admins update own notifications"
  on public.admin_notifications for update
  to authenticated
  using (recipient_id = auth.uid() and public.is_studio_admin())
  with check (recipient_id = auth.uid() and public.is_studio_admin());

drop policy if exists "Admins insert notifications" on public.admin_notifications;
create policy "Admins insert notifications"
  on public.admin_notifications for insert
  to authenticated
  with check (public.is_studio_admin());

drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions"
  on public.push_subscriptions for all
  to authenticated
  using (user_id = auth.uid() and public.is_studio_admin())
  with check (user_id = auth.uid() and public.is_studio_admin());

grant select, insert, update on public.admin_notifications to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- Fan-out a notification to every active studio admin.
create or replace function public.notify_studio_admins(
  p_kind text,
  p_title text,
  p_body text,
  p_href text,
  p_source_type text,
  p_source_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_notifications (
    recipient_id, kind, title, body, href, source_type, source_id
  )
  select
    p.id,
    p_kind,
    p_title,
    coalesce(p_body, ''),
    coalesce(p_href, '/'),
    p_source_type,
    p_source_id
  from public.profiles p
  where p.role = 'admin'
    and p.status = 'active'
  on conflict (recipient_id, source_type, source_id) do nothing;
end;
$$;

create or replace function public.trg_notify_pending_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from 'pending') then
    perform public.notify_studio_admins(
      'user_pending',
      coalesce(nullif(new.full_name, ''), nullif(new.email, ''), 'New user'),
      'Pending administrator access',
      '/users',
      'profile',
      new.id::text
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_pending_notify on public.profiles;
create trigger on_profile_pending_notify
  after insert or update of status on public.profiles
  for each row execute function public.trg_notify_pending_profile();

create or replace function public.trg_notify_pending_feedback()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from 'pending') then
    perform public.notify_studio_admins(
      'feedback_pending',
      coalesce(nullif(new.author_name, ''), 'Feedback'),
      left(coalesce(new.quote, 'Pending review'), 160),
      '/feedback',
      'feedback',
      new.id::text
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_feedback_pending_notify on public.feedback;
create trigger on_feedback_pending_notify
  after insert or update of status on public.feedback
  for each row execute function public.trg_notify_pending_feedback();

-- Backfill + keep derived pending items in sync for the current admin.
create or replace function public.sync_admin_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  pending_users integer := 0;
  pending_feedback integer := 0;
begin
  if auth.uid() is null or not public.is_studio_admin() then
    return 0;
  end if;

  select count(*) into pending_users from public.profiles where status = 'pending';
  select count(*) into pending_feedback from public.feedback where status = 'pending';

  perform public.notify_studio_admins(
    'user_pending',
    coalesce(nullif(p.full_name, ''), nullif(p.email, ''), 'New user'),
    'Pending administrator access',
    '/users',
    'profile',
    p.id::text
  )
  from public.profiles p
  where p.status = 'pending';

  perform public.notify_studio_admins(
    'feedback_pending',
    coalesce(nullif(f.author_name, ''), 'Feedback'),
    left(coalesce(f.quote, 'Pending review'), 160),
    '/feedback',
    'feedback',
    f.id::text
  )
  from public.feedback f
  where f.status = 'pending';

  return pending_users + pending_feedback;
end;
$$;

create or replace function public.mark_notification_read(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_studio_admin() then
    raise exception 'Not authorized';
  end if;
  update public.admin_notifications
  set read_at = coalesce(read_at, now())
  where id = p_id
    and recipient_id = auth.uid();
end;
$$;

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if auth.uid() is null or not public.is_studio_admin() then
    raise exception 'Not authorized';
  end if;
  update public.admin_notifications
  set read_at = now()
  where recipient_id = auth.uid()
    and read_at is null;
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function public.sync_admin_notifications() to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.notify_studio_admins(text, text, text, text, text, text) to authenticated;

create or replace function public.update_notification_prefs(
  p_notify_email boolean default null,
  p_notify_push boolean default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authorized';
  end if;
  update public.profiles
  set
    notify_email = coalesce(p_notify_email, notify_email),
    notify_push = coalesce(p_notify_push, notify_push),
    updated_at = now()
  where id = auth.uid();
end;
$$;

grant execute on function public.update_notification_prefs(boolean, boolean) to authenticated;

-- Seed existing pending rows for current admins.
select public.notify_studio_admins(
  'user_pending',
  coalesce(nullif(p.full_name, ''), nullif(p.email, ''), 'New user'),
  'Pending administrator access',
  '/users',
  'profile',
  p.id::text
)
from public.profiles p
where p.status = 'pending';

select public.notify_studio_admins(
  'feedback_pending',
  coalesce(nullif(f.author_name, ''), 'Feedback'),
  left(coalesce(f.quote, 'Pending review'), 160),
  '/feedback',
  'feedback',
  f.id::text
)
from public.feedback f
where f.status = 'pending';

-- Enable realtime for live badge updates (ignore if already added).
do $$
begin
  alter publication supabase_realtime add table public.admin_notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;