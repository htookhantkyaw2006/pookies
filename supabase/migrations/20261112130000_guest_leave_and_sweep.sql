-- Guest mode housekeeping, so the shared demo office doesn't fill up with
-- people who will never come back (a guest who closes their browser can't
-- sign in as the same person again).

-- Leave the demo office for good: removes your membership, check-ins and
-- profile. If you were the only admin, the longest-standing member takes over.
create function public.leave_demo_workspace()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_workspace uuid;
begin
  if v_user is null then
    return;
  end if;

  select m.workspace_id into v_workspace
  from public.workspace_members m
  join public.workspaces w on w.id = m.workspace_id
  where m.user_id = v_user and w.is_demo;
  if v_workspace is null then
    return; -- not in the demo office: nothing to do
  end if;

  perform 1 from public.workspaces w where w.id = v_workspace for update;

  delete from public.check_ins where workspace_id = v_workspace and user_id = v_user;
  delete from public.workspace_members where workspace_id = v_workspace and user_id = v_user;
  delete from public.profiles where id = v_user;

  if not exists (
    select 1 from public.workspace_members m
    where m.workspace_id = v_workspace and m.role = 'admin'
  ) then
    update public.workspace_members
    set role = 'admin'
    where workspace_id = v_workspace
      and user_id = (
        select m.user_id from public.workspace_members m
        where m.workspace_id = v_workspace
        order by m.joined_at
        limit 1
      );
  end if;
end;
$$;

revoke all on function public.leave_demo_workspace() from public, anon;
grant execute on function public.leave_demo_workspace() to authenticated;

-- Sweep guests who joined more than three days ago whenever someone new
-- arrives. Runs inside join_demo_workspace, below.
create function private.sweep_demo_guests(target_workspace uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  stale uuid[];
begin
  select coalesce(array_agg(m.user_id), '{}') into stale
  from public.workspace_members m
  join auth.users u on u.id = m.user_id
  where m.workspace_id = target_workspace
    and u.is_anonymous
    and m.joined_at < now() - interval '3 days';

  if array_length(stale, 1) is null then
    return;
  end if;

  delete from public.check_ins where workspace_id = target_workspace and user_id = any (stale);
  delete from public.workspace_members where workspace_id = target_workspace and user_id = any (stale);
  delete from public.profiles where id = any (stale);
end;
$$;
revoke all on function private.sweep_demo_guests(uuid) from public, authenticated;

create or replace function public.join_demo_workspace(
  p_display_name text,
  p_avatar_color text,
  p_avatar_shape text,
  p_timezone text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_workspace uuid;
  v_role public.member_role;
begin
  if v_user is null then
    raise exception 'Sign in first.';
  end if;

  insert into public.profiles (id, display_name, avatar_color, avatar_shape, timezone)
  values (
    v_user,
    btrim(p_display_name),
    p_avatar_color,
    p_avatar_shape,
    coalesce(nullif(btrim(p_timezone), ''), 'UTC')
  )
  on conflict (id) do update
    set display_name = excluded.display_name,
        avatar_color = excluded.avatar_color,
        avatar_shape = excluded.avatar_shape,
        timezone = excluded.timezone;

  select m.workspace_id into v_workspace
  from public.workspace_members m
  where m.user_id = v_user;
  if v_workspace is not null then
    return v_workspace;
  end if;

  select w.id into v_workspace from public.workspaces w where w.is_demo;
  if v_workspace is null then
    begin
      insert into public.workspaces (name, is_demo, created_by)
      values ('Pookies Demo Office', true, v_user)
      returning id into v_workspace;
    exception when unique_violation then
      select w.id into v_workspace from public.workspaces w where w.is_demo;
    end;
  end if;

  -- One joiner at a time, so two people arriving together can't both be "first".
  perform 1 from public.workspaces w where w.id = v_workspace for update;

  perform private.sweep_demo_guests(v_workspace);

  if (select count(*) from public.workspace_members m where m.workspace_id = v_workspace) >= 25 then
    raise exception 'The demo office is full right now.';
  end if;

  v_role := case
    when exists (
      select 1 from public.workspace_members m
      where m.workspace_id = v_workspace and m.role = 'admin'
    ) then 'member'
    else 'admin'
  end;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace, v_user, v_role);
  return v_workspace;
end;
$$;
