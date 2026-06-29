-- Recurrence: a date can repeat annually (default), monthly, once, or every N
-- years. `reminders_due` is rewritten to compute the next occurrence per type,
-- via a shared next_occurrence() helper that mirrors the client logic.

alter table public.important_dates
  add column recurrence text not null default 'annual'
    check (recurrence in ('annual', 'monthly', 'once', 'everyNYears')),
  add column recurrence_years integer;

-- Last calendar day of a given year/month (1-based month).
create or replace function public.days_in_month(p_year int, p_month int)
returns int
language sql
immutable
as $$
  select extract(
    day from (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')
  )::int;
$$;

-- Next occurrence (>= p_today) of a date under its recurrence rule. For `once`
-- it returns the date's own (possibly past) day, or null if it has no year.
-- The day is clamped to the month length (so Feb 29 lands on Feb 28 off-leap).
create or replace function public.next_occurrence(
  p_recurrence text,
  p_year       int,
  p_month      int,
  p_day        int,
  p_interval   int,
  p_today      date
) returns date
language plpgsql
immutable
as $$
declare
  y    int;
  m    int;
  step int := greatest(coalesce(p_interval, 1), 1);
  d    date;
begin
  if p_recurrence = 'once' then
    if p_year is null then
      return null;
    end if;
    return make_date(p_year, p_month, least(p_day, public.days_in_month(p_year, p_month)));

  elsif p_recurrence = 'monthly' then
    y := extract(year from p_today)::int;
    m := extract(month from p_today)::int;
    d := make_date(y, m, least(p_day, public.days_in_month(y, m)));
    if d < p_today then
      m := m + 1;
      if m > 12 then m := 1; y := y + 1; end if;
      d := make_date(y, m, least(p_day, public.days_in_month(y, m)));
    end if;
    return d;

  elsif p_recurrence = 'everyNYears' then
    y := coalesce(p_year, extract(year from p_today)::int);
    loop
      d := make_date(y, p_month, least(p_day, public.days_in_month(y, p_month)));
      exit when d >= p_today;
      y := y + step;
    end loop;
    return d;

  else -- annual
    y := extract(year from p_today)::int;
    d := make_date(y, p_month, least(p_day, public.days_in_month(y, p_month)));
    if d < p_today then
      y := y + 1;
      d := make_date(y, p_month, least(p_day, public.days_in_month(y, p_month)));
    end if;
    return d;
  end if;
end;
$$;

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
    select public.next_occurrence(
      coalesce(d.recurrence, 'annual'), d.year, d.month, d.day, d.recurrence_years, p_today
    ) as occurs_on
  ) occ
  where d.reminders_enabled
    and occ.occurs_on is not null
    and (occ.occurs_on - p_today) = any(d.lead_days);
$$;
