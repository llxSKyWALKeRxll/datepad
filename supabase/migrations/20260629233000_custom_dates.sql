-- Custom recurrence: a hand-picked list of specific dates that need not share a
-- day-of-month (festivals, irregular meetings). Stored as a date[]; the next
-- occurrence is simply the soonest stored date >= today.
alter table public.important_dates
  add column custom_dates date[];

-- Allow 'custom' in the recurrence check.
alter table public.important_dates
  drop constraint if exists important_dates_recurrence_check;
alter table public.important_dates
  add constraint important_dates_recurrence_check
  check (recurrence in ('annual', 'monthly', 'once', 'everyNYears', 'custom'));

-- reminders_due picks the next custom date directly; all other recurrences keep
-- using next_occurrence(). Everything else (timezone, reminder hour, handled
-- suppression, email/lead filtering) is unchanged.
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
    select case
      when coalesce(d.recurrence, 'annual') = 'custom' then
        (select min(cd) from unnest(coalesce(d.custom_dates, '{}')) cd where cd >= local.today)
      else
        public.next_occurrence(
          coalesce(d.recurrence, 'annual'), d.year, d.month, d.day, d.recurrence_years, local.today
        )
    end as occurs_on
  ) occ
  where d.reminders_enabled
    and local.hour = local.reminder_hour
    and occ.occurs_on is not null
    and (d.handled_occurrence is null or d.handled_occurrence <> occ.occurs_on)
    and (occ.occurs_on - local.today) = any(d.lead_days);
$$;
