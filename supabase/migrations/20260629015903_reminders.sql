-- Advance-notice reminders: per-date lead times, device push tokens, and a
-- helper that returns the reminders due on a given day. The actual sending is
-- done by the `send-reminders` edge function, scheduled daily by pg_cron.

-- Lead times (days before the date) each reminder fires on. Default: a week
-- out, the day before, and the morning of.
alter table public.important_dates
  add column lead_days integer[] not null default '{7,1,0}',
  add column reminders_enabled boolean not null default true;

-- Expo push tokens, one row per device. A user may have several.
create table public.push_tokens (
  token      text primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  platform   text,
  updated_at timestamptz not null default now()
);

create index push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

create policy "push tokens are private to their owner"
  on public.push_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.push_tokens to authenticated;
grant select, insert, update, delete on public.push_tokens to service_role;

-- Reminders due on p_today: for every enabled date, the next annual occurrence
-- is computed, and a row is returned for each lead time that lands on today.
-- Feb 29 is observed on Feb 28 in non-leap years to keep make_date total.
create or replace function public.reminders_due(p_today date default current_date)
returns table (
  date_id     text,
  user_id     uuid,
  name        text,
  category_id text,
  lead        integer,
  occurs_on   date
)
language sql
stable
as $$
  select d.id, d.user_id, d.name, d.category_id,
         (occ.occurs_on - p_today)::integer as lead,
         occ.occurs_on
  from public.important_dates d
  cross join lateral (
    select case
             when make_date(extract(year from p_today)::int, d.month, day_safe) >= p_today
               then make_date(extract(year from p_today)::int, d.month, day_safe)
             else make_date(extract(year from p_today)::int + 1, d.month, day_safe)
           end as occurs_on
    from (select case when d.month = 2 and d.day = 29 then 28 else d.day end as day_safe) s
  ) occ
  where d.reminders_enabled
    and (occ.occurs_on - p_today) = any(d.lead_days);
$$;
