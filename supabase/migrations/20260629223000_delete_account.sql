-- Self-service account deletion. A signed-in user can erase all their data and
-- their auth record in one call. Runs as definer so it can reach auth.users;
-- the explicit data deletes also cover the case where auth.users deletion is
-- restricted (ON DELETE CASCADE would otherwise handle the child rows).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  delete from public.important_dates where user_id = uid;
  delete from public.categories     where user_id = uid;
  delete from public.push_tokens     where user_id = uid;
  delete from public.profiles        where user_id = uid;
  delete from auth.users             where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
