-- Timezone-correct delivery. Previously reminders fired once daily at 09:00
-- UTC for everyone; now each user has a timezone + preferred reminder hour, the
-- cron runs hourly, and reminders_due only returns a user's dates during the
-- hour that matches their local reminder time.

create table public.profiles (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  timezone      text not null default 'UTC',
  reminder_hour smallint not null default 9 check (reminder_hour between 0 and 23),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are private to their owner"
  on public.profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

-- Replace the date-based helper with a now()-based, timezone-aware version.
drop function if exists public.reminders_due(date);

create or replace function public.reminders_due(p_now timestamptz default now())
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
         (occ.occurs_on - local.today)::integer as lead,
         occ.occurs_on
  from public.important_dates d
  left join public.profiles p on p.user_id = d.user_id
  cross join lateral (
    -- The user's wall-clock now, then today's date and hour in their timezone.
    select (p_now at time zone coalesce(p.timezone, 'UTC'))::date            as today,
           extract(hour from (p_now at time zone coalesce(p.timezone, 'UTC')))::int as hour,
           coalesce(p.reminder_hour, 9)                                       as reminder_hour
  ) local
  cross join lateral (
    select public.next_occurrence(
      coalesce(d.recurrence, 'annual'), d.year, d.month, d.day, d.recurrence_years, local.today
    ) as occurs_on
  ) occ
  where d.reminders_enabled
    and local.hour = local.reminder_hour
    and occ.occurs_on is not null
    and (occ.occurs_on - local.today) = any(d.lead_days);
$$;

-- Reschedule: hourly instead of daily (the function self-filters by local hour).
select cron.unschedule(jobid) from cron.job where jobname = 'datepad-send-reminders';

select cron.schedule(
  'datepad-send-reminders',
  '0 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
