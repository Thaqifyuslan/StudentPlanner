create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nama text not null default '',
  no_matrik text not null default '',
  kursus text not null default '',
  semester text not null default '',
  kod_fakulti text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kod_subjek text not null,
  nama_subjek text not null,
  pensyarah text not null default 'Pensyarah',
  bilik text not null default 'Lab 1',
  hari text not null,
  masa text not null default '09:00 AM',
  masa_mula text not null default '09:00',
  masa_tamat text not null default '10:00',
  kod_warna text not null default '#6C5CE7',
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tajuk text not null,
  course text not null default '',
  tarikh_luput text not null default current_date::text,
  due_date text not null default current_date::text,
  priority text not null default 'High',
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  file_url text not null,
  type text not null check (type in ('image', 'file')),
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

alter table public.schedules
  add column if not exists kod_kursus text not null default '',
  add column if not exists nama_kursus text not null default '',
  add column if not exists kod_subjek text not null default '',
  add column if not exists nama_subjek text not null default 'Legacy course - please update',
  add column if not exists masa_mula text not null default '09:00',
  add column if not exists masa_tamat text not null default '10:00',
  add column if not exists bilik text not null default 'Not assigned',
  add column if not exists masa text not null default '09:00 AM',
  add column if not exists kod_warna text not null default '#6C5CE7';

alter table public.schedules
  alter column kod_kursus set default '',
  alter column nama_kursus set default '',
  alter column masa_mula set default '09:00',
  alter column masa_tamat set default '10:00';

update public.schedules
set kod_kursus = coalesce(kod_kursus, ''),
    nama_kursus = coalesce(nama_kursus, ''),
    masa_mula = coalesce(masa_mula, '09:00'),
    masa_tamat = coalesce(masa_tamat, '10:00');

alter table public.schedules
  alter column masa_mula set not null,
  alter column masa_tamat set not null;

alter table public.tasks
  add column if not exists course text not null default '',
  add column if not exists tarikh_luput text not null default current_date::text,
  add column if not exists due_date text not null default current_date::text,
  add column if not exists priority text not null default 'High',
  add column if not exists is_done boolean not null default false;

do $$
declare
  due_date_type text;
begin
  select data_type
  into due_date_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'tasks'
    and column_name = 'tarikh_luput';

  if due_date_type in ('text', 'character varying', 'character') then
    update public.tasks
      set tarikh_luput = to_char(current_date, 'YYYY-MM-DD')
      where tarikh_luput is null;
    alter table public.tasks
      alter column tarikh_luput set default current_date::text;
  elsif due_date_type in ('date', 'timestamp without time zone', 'timestamp with time zone') then
    update public.tasks
      set tarikh_luput = current_date
      where tarikh_luput is null;
    alter table public.tasks
      alter column tarikh_luput set default current_date;
  end if;

  alter table public.tasks
    alter column tarikh_luput set not null;
end;
$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'status'
  ) then
    execute $migration$
      update public.tasks
      set is_done = lower(coalesce(status::text, '')) in ('done', 'completed', 'true', 'selesai')
      where is_done = false
    $migration$;
  end if;
end;
$$;

alter table public.revisions
  add column if not exists name text not null default 'Bahan lama',
  add column if not exists file_url text not null default '',
  add column if not exists type text not null default 'file';

create index if not exists schedules_user_id_idx on public.schedules (user_id);
create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists revisions_user_id_idx on public.revisions (user_id);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
    ) then
      alter publication supabase_realtime add table public.profiles;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'schedules'
    ) then
      alter publication supabase_realtime add table public.schedules;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks'
    ) then
      alter publication supabase_realtime add table public.tasks;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'revisions'
    ) then
      alter publication supabase_realtime add table public.revisions;
    end if;
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.schedules enable row level security;
alter table public.tasks enable row level security;
alter table public.revisions enable row level security;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.schedules to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.revisions to authenticated;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "Users can manage own schedules" on public.schedules;
create policy "Users can manage own schedules"
  on public.schedules for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can manage own tasks" on public.tasks;
create policy "Users can manage own tasks"
  on public.tasks for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can manage own revisions" on public.revisions;
create policy "Users can manage own revisions"
  on public.revisions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, nama, no_matrik, kursus, semester, kod_fakulti)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'nama', ''),
    coalesce(new.raw_user_meta_data ->> 'no_matrik', ''),
    coalesce(new.raw_user_meta_data ->> 'kursus', ''),
    coalesce(new.raw_user_meta_data ->> 'semester', ''),
    coalesce(new.raw_user_meta_data ->> 'kod_fakulti', '')
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('revision-materials', 'revision-materials', false, 52428800),
  ('avatars', 'avatars', false, 10485760)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit;

drop policy if exists "Users can read own revision files" on storage.objects;
create policy "Users can read own revision files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'revision-materials'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can upload own revision files" on storage.objects;
create policy "Users can upload own revision files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'revision-materials'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete own revision files" on storage.objects;
create policy "Users can delete own revision files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'revision-materials'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can read own avatars" on storage.objects;
create policy "Users can read own avatars"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can upload own avatars" on storage.objects;
create policy "Users can upload own avatars"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can update own avatars" on storage.objects;
create policy "Users can update own avatars"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete own avatars" on storage.objects;
create policy "Users can delete own avatars"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
