-- DatePad core schema: per-user custom categories + important dates.
-- Built-in categories (birthday/anniversary/holiday/reminder) stay client-side
-- constants; only user-created categories are stored here. Ids are client-
-- generated text so local (AsyncStorage) rows migrate up without remapping.

create table public.categories (
  id         text primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label      text not null,
  emoji      text not null default '📌',
  year_mode  text not null default 'none' check (year_mode in ('age', 'years', 'none')),
  created_at timestamptz not null default now()
);

create table public.important_dates (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  category_id text not null, -- built-in slug ('birthday') or a categories.id
  month       smallint not null check (month between 1 and 12),
  day         smallint not null check (day between 1 and 31),
  year        smallint,
  hour        smallint check (hour between 0 and 23),
  minute      smallint check (minute between 0 and 59),
  note        text,
  created_at  timestamptz not null default now()
);

create index important_dates_user_id_idx on public.important_dates (user_id);
create index categories_user_id_idx on public.categories (user_id);

-- Row-level security: a user can only ever see and touch their own rows.
alter table public.categories enable row level security;
alter table public.important_dates enable row level security;

create policy "categories are private to their owner"
  on public.categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "dates are private to their owner"
  on public.important_dates for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Signed-in users operate on these tables (RLS still scopes rows to them).
-- anon (signed-out) never touches the cloud — it uses local storage instead.
-- service_role (the reminders job) reads across all users, bypassing RLS.
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.important_dates to authenticated;
grant select, insert, update, delete on public.categories to service_role;
grant select, insert, update, delete on public.important_dates to service_role;
