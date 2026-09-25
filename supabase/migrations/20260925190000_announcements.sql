-- Site announcements shown to visitors on the marketing website.
-- Distinct from Insights "News" articles: short updates, banners, and CTAs.

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  link_label text,
  link_url text,
  tone text not null default 'info'
    check (tone in ('info', 'highlight', 'urgent')),
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists announcements_updated_at on public.announcements;
create trigger announcements_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

create index if not exists announcements_published_idx
  on public.announcements (published, sort_order);

create index if not exists announcements_schedule_idx
  on public.announcements (starts_at, ends_at);

alter table public.announcements enable row level security;

-- Visitors can read currently active published announcements.
drop policy if exists "Public read active announcements" on public.announcements;
create policy "Public read active announcements"
  on public.announcements for select
  using (
    published = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

drop policy if exists "Admin all announcements" on public.announcements;
create policy "Admin all announcements"
  on public.announcements for all
  to authenticated
  using (public.is_studio_admin())
  with check (public.is_studio_admin());

grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;
