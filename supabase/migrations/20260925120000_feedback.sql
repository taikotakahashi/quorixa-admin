-- Feedback posts from team members, users, and clients.
-- Administrators edit, delete, or approve before they appear on the site.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  author_role text not null default '',
  author_type text not null default 'team'
    check (author_type in ('team', 'user', 'client')),
  quote text not null default '',
  location text,
  photo_url text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  sort_order int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists feedback_updated_at on public.feedback;
create trigger feedback_updated_at
  before update on public.feedback
  for each row execute function public.set_updated_at();

create index if not exists feedback_status_idx on public.feedback (status);
create index if not exists feedback_author_type_idx on public.feedback (author_type);
create index if not exists feedback_published_idx on public.feedback (published);

-- Move existing team testimonials into feedback (idempotent by quote+name).
insert into public.feedback (
  author_name,
  author_role,
  author_type,
  quote,
  location,
  photo_url,
  status,
  sort_order,
  published
)
select
  m.name,
  m.role,
  'team',
  coalesce(m.quote, ''),
  m.region,
  m.photo_url,
  case when m.published then 'approved' else 'pending' end,
  m.sort_order,
  m.published
from public.team_members m
where m.kind = 'testimonial'
  and coalesce(m.quote, '') <> ''
  and not exists (
    select 1
    from public.feedback f
    where f.author_name = m.name
      and f.quote = coalesce(m.quote, '')
  );

alter table public.feedback enable row level security;

drop policy if exists "Public read approved feedback" on public.feedback;
create policy "Public read approved feedback"
  on public.feedback for select
  using (published = true and status = 'approved');

drop policy if exists "Admin all feedback" on public.feedback;
create policy "Admin all feedback"
  on public.feedback for all
  to authenticated
  using (public.is_studio_admin())
  with check (public.is_studio_admin());

grant select on public.feedback to anon, authenticated;
grant insert, update, delete on public.feedback to authenticated;
