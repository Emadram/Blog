-- Supabase schema for Ruflo Developer Blog

create extension if not exists pgcrypto;

-- Posts (Markdown content)
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  content_md text not null,
  published_at timestamptz not null default now(),
  tags text[] not null default '{}',
  draft boolean not null default false,
  featured boolean not null default false,
  cover_image text,
  cover_image_alt text,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.posts
  add column if not exists description text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists draft boolean not null default false,
  add column if not exists featured boolean not null default false,
  add column if not exists cover_image text,
  add column if not exists cover_image_alt text,
  add column if not exists created_by uuid references auth.users (id),
  add column if not exists updated_by uuid references auth.users (id),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists posts_published_at_idx on public.posts (published_at desc);
create index if not exists posts_featured_idx on public.posts (featured, published_at desc);
create index if not exists posts_slug_idx on public.posts (slug);

-- News (curated links)
create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source text not null,
  url text not null,
  summary text,
  published_at timestamptz not null default now(),
  tags text[] not null default '{}',
  read_minutes integer,
  pinned boolean not null default false,
  featured boolean not null default false,
  category text,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.news
  add column if not exists summary text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists read_minutes integer,
  add column if not exists pinned boolean not null default false,
  add column if not exists featured boolean not null default false,
  add column if not exists category text,
  add column if not exists created_by uuid references auth.users (id),
  add column if not exists updated_by uuid references auth.users (id),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists news_published_at_idx on public.news (published_at desc);
create index if not exists news_featured_idx on public.news (featured, published_at desc);
create unique index if not exists news_url_idx on public.news (url);

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  url text not null,
  tags text[] not null default '{}',
  stars integer,
  language text,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists description text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists stars integer,
  add column if not exists language text,
  add column if not exists created_by uuid references auth.users (id),
  add column if not exists updated_by uuid references auth.users (id),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists projects_updated_at_idx on public.projects (updated_at desc);

-- Enable RLS
alter table public.posts enable row level security;
alter table public.news enable row level security;
alter table public.projects enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if (tg_op = 'INSERT' and new.created_by is null) then
    new.created_by = auth.uid();
  end if;
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists set_posts_updated_at on public.posts;
create trigger set_posts_updated_at
  before insert or update on public.posts
  for each row execute function public.set_updated_at();

drop trigger if exists set_news_updated_at on public.news;
create trigger set_news_updated_at
  before insert or update on public.news
  for each row execute function public.set_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
  before insert or update on public.projects
  for each row execute function public.set_updated_at();

-- Public read policies (drafts hidden)
drop policy if exists "Public posts are readable" on public.posts;
create policy "Public posts are readable"
  on public.posts
  for select
  using (draft = false);

drop policy if exists "Public news is readable" on public.news;
create policy "Public news is readable"
  on public.news
  for select
  using (true);

drop policy if exists "Public projects are readable" on public.projects;
create policy "Public projects are readable"
  on public.projects
  for select
  using (true);

-- Admin access (authenticated users listed in admin_users)
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "Admin users can read their record" on public.admin_users;
create policy "Admin users can read their record"
  on public.admin_users
  for select
  using (auth.uid() = user_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "Admins can manage posts" on public.posts;
create policy "Admins can manage posts"
  on public.posts
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can manage news" on public.news;
create policy "Admins can manage news"
  on public.news
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can manage projects" on public.projects;
create policy "Admins can manage projects"
  on public.projects
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Search AI query logs
create table if not exists public.search_ai_queries (
  id bigserial primary key,
  question text not null,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists search_ai_queries_created_at_idx
  on public.search_ai_queries (created_at desc);

alter table public.search_ai_queries enable row level security;

drop policy if exists "Admins can read search AI logs" on public.search_ai_queries;
create policy "Admins can read search AI logs"
  on public.search_ai_queries
  for select
  using (public.is_admin());

-- Visitor logs
create table if not exists public.visitor_logs (
  id bigserial primary key,
  path text,
  referrer text,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists visitor_logs_created_at_idx
  on public.visitor_logs (created_at desc);

alter table public.visitor_logs enable row level security;

drop policy if exists "Admins can read visitor logs" on public.visitor_logs;
create policy "Admins can read visitor logs"
  on public.visitor_logs
  for select
  using (public.is_admin());

-- Preview tokens (draft sharing)
create table if not exists public.preview_tokens (
  token text primary key,
  post_id uuid not null references public.posts (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

alter table public.preview_tokens enable row level security;

drop policy if exists "Admins can manage preview tokens" on public.preview_tokens;
create policy "Admins can manage preview tokens"
  on public.preview_tokens
  for all
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.get_post_preview(token text)
returns table (
  id uuid,
  title text,
  slug text,
  description text,
  content_md text,
  published_at timestamptz,
  tags text[],
  draft boolean,
  cover_image text,
  cover_image_alt text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select
      p.id,
      p.title,
      p.slug,
      p.description,
      p.content_md,
      p.published_at,
      p.tags,
      p.draft,
      p.cover_image,
      p.cover_image_alt,
      p.created_at,
      p.updated_at
    from public.preview_tokens t
    join public.posts p on p.id = t.post_id
    where t.token = get_post_preview.token
      and t.expires_at > now()
    limit 1;
end;
$$;

grant execute on function public.get_post_preview(text) to anon, authenticated;

create or replace function public.cleanup_preview_tokens()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed_count integer;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  delete from public.preview_tokens where expires_at < now();
  get diagnostics removed_count = row_count;
  return removed_count;
end;
$$;

grant execute on function public.cleanup_preview_tokens() to authenticated;

-- Activity log
create table if not exists public.content_activity (
  id bigserial primary key,
  resource text not null,
  action text not null,
  record_id uuid not null,
  title text,
  slug text,
  actor_id uuid references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.content_activity enable row level security;

drop policy if exists "Admins can read activity log" on public.content_activity;
create policy "Admins can read activity log"
  on public.content_activity
  for select
  using (public.is_admin());

drop policy if exists "Admins can insert activity log" on public.content_activity;
create policy "Admins can insert activity log"
  on public.content_activity
  for insert
  with check (public.is_admin());

create or replace function public.log_content_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb;
  resource_name text;
begin
  resource_name := coalesce(TG_ARGV[0], 'unknown');
  payload := coalesce(to_jsonb(new), to_jsonb(old));

  insert into public.content_activity (
    resource,
    action,
    record_id,
    title,
    slug,
    actor_id
  )
  values (
    resource_name,
    lower(TG_OP),
    (payload->>'id')::uuid,
    payload->>'title',
    payload->>'slug',
    auth.uid()
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists log_posts_activity on public.posts;
create trigger log_posts_activity
  after insert or update or delete on public.posts
  for each row execute function public.log_content_activity('posts');

drop trigger if exists log_news_activity on public.news;
create trigger log_news_activity
  after insert or update or delete on public.news
  for each row execute function public.log_content_activity('news');

drop trigger if exists log_projects_activity on public.projects;
create trigger log_projects_activity
  after insert or update or delete on public.projects
  for each row execute function public.log_content_activity('projects');

-- Storage bucket for cover images
insert into storage.buckets (id, name, public)
values ('post-covers', 'post-covers', true)
on conflict (id) do nothing;

drop policy if exists "Public can read post cover images" on storage.objects;
create policy "Public can read post cover images"
  on storage.objects
  for select
  using (bucket_id = 'post-covers');

drop policy if exists "Admins can manage post cover images" on storage.objects;
create policy "Admins can manage post cover images"
  on storage.objects
  for all
  using (bucket_id = 'post-covers' and public.is_admin())
  with check (bucket_id = 'post-covers' and public.is_admin());
