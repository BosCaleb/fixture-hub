create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  role text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'viewer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

insert into storage.buckets (id, name, public)
values ('tournament-assets', 'tournament-assets', true)
on conflict (id) do nothing;

create table if not exists public.tournaments (
  id text primary key,
  name text not null,
  manager_name text not null,
  logo_path text,
  is_public boolean not null default true,
  points_for_win integer not null default 3,
  points_for_draw integer not null default 1,
  points_for_loss integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pools (
  id text primary key,
  tournament_id text not null references public.tournaments(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id text primary key,
  tournament_id text not null references public.tournaments(id) on delete cascade,
  pool_id text references public.pools(id) on delete set null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id text primary key,
  tournament_id text not null references public.tournaments(id) on delete cascade,
  team_id text references public.teams(id) on delete set null,
  name text not null,
  jersey_number text not null default '',
  position text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.fixtures (
  id text primary key,
  tournament_id text not null references public.tournaments(id) on delete cascade,
  pool_id text not null references public.pools(id) on delete cascade,
  home_team_id text not null references public.teams(id) on delete cascade,
  away_team_id text not null references public.teams(id) on delete cascade,
  home_score integer,
  away_score integer,
  played boolean not null default false,
  round integer not null default 1,
  date text,
  time text,
  venue text,
  created_at timestamptz not null default now()
);

create table if not exists public.playoff_matches (
  id text primary key,
  tournament_id text not null references public.tournaments(id) on delete cascade,
  round integer not null,
  position integer not null,
  home_team_id text references public.teams(id) on delete set null,
  away_team_id text references public.teams(id) on delete set null,
  home_score integer,
  away_score integer,
  played boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tournaments_set_updated_at on public.tournaments;
create trigger tournaments_set_updated_at
before update on public.tournaments
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.tournaments enable row level security;
alter table public.pools enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.fixtures enable row level security;
alter table public.playoff_matches enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_admin_select_all" on public.profiles for select to authenticated using (public.is_admin());

create policy "tournaments_public_read" on public.tournaments for select to anon, authenticated using (is_public = true);
create policy "tournaments_admin_write" on public.tournaments for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "pools_public_read" on public.pools for select to anon, authenticated using (exists (select 1 from public.tournaments t where t.id = pools.tournament_id and t.is_public = true));
create policy "pools_admin_write" on public.pools for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "teams_public_read" on public.teams for select to anon, authenticated using (exists (select 1 from public.tournaments t where t.id = teams.tournament_id and t.is_public = true));
create policy "teams_admin_write" on public.teams for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "players_public_read" on public.players for select to anon, authenticated using (exists (select 1 from public.tournaments t where t.id = players.tournament_id and t.is_public = true));
create policy "players_admin_write" on public.players for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "fixtures_public_read" on public.fixtures for select to anon, authenticated using (exists (select 1 from public.tournaments t where t.id = fixtures.tournament_id and t.is_public = true));
create policy "fixtures_admin_write" on public.fixtures for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "playoffs_public_read" on public.playoff_matches for select to anon, authenticated using (exists (select 1 from public.tournaments t where t.id = playoff_matches.tournament_id and t.is_public = true));
create policy "playoffs_admin_write" on public.playoff_matches for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public_read_tournament_assets" on storage.objects for select to public using (bucket_id = 'tournament-assets');
create policy "admin_upload_tournament_assets" on storage.objects for insert to authenticated with check (bucket_id = 'tournament-assets' and public.is_admin());
create policy "admin_update_tournament_assets" on storage.objects for update to authenticated using (bucket_id = 'tournament-assets' and public.is_admin()) with check (bucket_id = 'tournament-assets' and public.is_admin());
create policy "admin_delete_tournament_assets" on storage.objects for delete to authenticated using (bucket_id = 'tournament-assets' and public.is_admin());
