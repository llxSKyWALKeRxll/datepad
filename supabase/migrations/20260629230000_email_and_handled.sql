-- Email reminders (a second delivery channel) + "mark handled this year"
-- (suppress the remaining reminders for one occurrence).
alter table public.important_dates
  add column email_reminders    boolean not null default false,
  add column handled_occurrence date;

-- reminders_due now also reports the per-date email preference and the owner's
-- (verified, via OTP sign-in) account email, and skips occurrences the user has
-- already marked handled.
drop function if exists public.reminders_due(timestamptz);

create or replace function public.reminders_due(p_now timestamptz default now())
returns table (
  date_id         text,
  user_id         uuid,
  name            text,
  category_id     text,
  lead            integer,
  occurs_on       date,
  email_reminders boolean,
  user_email      text
)
language sql
stable
as $$
  select d.id, d.user_id, d.name, d.category_id,
         (occ.occurs_on - local.today)::integer as lead,
         occ.occurs_on,
         d.email_reminders,
         u.email::text as user_email
  from public.important_dates d
  left join public.profiles p on p.user_id = d.user_id
  left join auth.users u on u.id = d.user_id
  cross join lateral (
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
    and (d.handled_occurrence is null or d.handled_occurrence <> occ.occurs_on)
    and (occ.occurs_on - local.today) = any(d.lead_days);
$$;
