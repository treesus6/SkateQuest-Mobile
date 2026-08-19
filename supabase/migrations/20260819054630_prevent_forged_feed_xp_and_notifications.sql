begin;

do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname='public' and tablename='activity_feed' and cmd='INSERT' loop
    execute format('drop policy %I on public.activity_feed',r.policyname);
  end loop;
  for r in select policyname from pg_policies where schemaname='public' and tablename='notifications' and cmd='INSERT' loop
    execute format('drop policy %I on public.notifications',r.policyname);
  end loop;
end $$;

create policy "Users can post own nonreward activity"
on public.activity_feed for insert to authenticated
with check (
  user_id=(select auth.uid())
  and coalesce(xp_earned,0)=0
);
revoke update,delete on public.activity_feed from anon,authenticated;
grant select,insert on public.activity_feed to authenticated;

revoke insert,delete on public.notifications from anon,authenticated;
grant select,update on public.notifications to authenticated;

commit;
