-- =====================================================================
-- LernPilot – Datenbank-Schema für Supabase (PostgreSQL)
-- Einmalig im SQL-Editor ausführen. Mehrfaches Ausführen ist sicher
-- (alles "if not exists" / "add column if not exists").
-- Schweizer Notensystem: 6 = beste Note, 4 = bestanden.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) TABELLEN
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  dark_mode   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.exams (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  fach             text not null,
  datum            date not null,
  wunschnote       numeric(2,1) not null,
  schwierigkeit    integer not null check (schwierigkeit between 1 and 6),
  lerntyp          text not null,
  geplante_stunden numeric not null default 0,
  erreichte_note   numeric(2,1),
  created_at       timestamptz not null default now()
);

create table if not exists public.blocks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  exam_id     uuid references public.exams(id) on delete cascade,
  fach        text not null,
  datum       date not null,
  aufgabe     text not null,
  dauer       numeric not null,
  lerntyp     text not null,
  erledigt    boolean not null default false,
  sr          boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 1b) NEUE SPALTEN (für KI-Plan aus Lernzielen)
-- ---------------------------------------------------------------------
alter table public.exams  add column if not exists lernziele       text;
alter table public.exams  add column if not exists stunden_pro_tag numeric not null default 1.5;
alter table public.blocks add column if not exists thema           text;

-- ---------------------------------------------------------------------
-- 1c) KARTEIKARTEN (KI-Quiz)
-- ---------------------------------------------------------------------
create table if not exists public.flashcards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  exam_id     uuid references public.exams(id) on delete cascade,
  fach        text not null,
  frage       text not null,
  antwort     text not null,
  thema       text,
  box         integer not null default 0,
  faellig     date not null default current_date,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2) INDIZES
-- ---------------------------------------------------------------------
create index if not exists exams_user_id_idx       on public.exams(user_id);
create index if not exists blocks_user_id_idx      on public.blocks(user_id);
create index if not exists blocks_exam_id_idx      on public.blocks(exam_id);
create index if not exists flashcards_user_id_idx  on public.flashcards(user_id);
create index if not exists flashcards_exam_id_idx  on public.flashcards(exam_id);

-- ---------------------------------------------------------------------
-- 3) ROW LEVEL SECURITY (jeder sieht nur seine eigenen Zeilen)
-- ---------------------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.exams      enable row level security;
alter table public.blocks     enable row level security;
alter table public.flashcards enable row level security;

drop policy if exists "profiles_owner" on public.profiles;
create policy "profiles_owner" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "exams_owner" on public.exams;
create policy "exams_owner" on public.exams
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "blocks_owner" on public.blocks;
create policy "blocks_owner" on public.blocks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "flashcards_owner" on public.flashcards;
create policy "flashcards_owner" on public.flashcards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 4) TRIGGER: bei Registrierung automatisch profiles-Zeile anlegen
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Fertig.
-- =====================================================================
