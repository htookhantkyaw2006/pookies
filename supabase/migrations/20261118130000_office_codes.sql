-- Offices you get into with a code, like a game lobby: no accounts.
--
-- Everyone is a guest (an anonymous sign-in). Pick a nickname and a pookie,
-- then either create an office, which gets a short code like "PKX4QZ", or
-- join one by typing its code. The person who creates it is its admin.
--
--   create_room  leaves any office you're in, then makes a new one
--   join_room    leaves any other office you're in, then joins by code
--   leave_room   leaves your office for good (your name, check-ins and
--                scores go); an office left empty is deleted
--
-- Codes use letters and digits that can't be mixed up (no 0/O or 1/I/L) and
-- are six characters long: about 900 million possibilities.

alter table public.workspaces
  add column join_code text unique
    check (join_code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$');

-- A fresh, unused code.
create function private.new_join_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_letters constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
begin
  loop
    select string_agg(substr(v_letters, 1 + floor(random() * length(v_letters))::int, 1), '')
      into v_code
      from generate_series(1, 6);
    exit when not exists (select 1 from public.workspaces w where w.join_code = v_code);
  end loop;
  return v_code;
end;
$$;
revoke all on function private.new_join_code() from public, authenticated;

-- Leave your office for good. If you were its only admin, whoever joined
-- earliest takes over; if nobody is left, the office is deleted. (The shared
-- demo office is never deleted.)
create function public.leave_room()
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
   where m.user_id = v_user;
  if v_workspace is null then
    delete from public.profiles where id = v_user;
    return;
  end if;

  perform 1 from public.workspaces w where w.id = v_workspace for update;

  delete from public.check_ins where workspace_id = v_workspace and user_id = v_user;
  delete from public.workspace_members where workspace_id = v_workspace and user_id = v_user;
  delete from public.profiles where id = v_user;

  if not exists (select 1 from public.workspace_members m where m.workspace_id = v_workspace) then
    delete from public.workspaces w where w.id = v_workspace and not w.is_demo;
    return;
  end if;

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

-- Make a new office and walk in as its admin. Returns its code.
create function public.create_room(
  p_display_name text,
  p_avatar_color text,
  p_avatar_shape text,
  p_timezone text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_code text;
  v_workspace uuid;
  v_first text;
begin
  if v_user is null then
    raise exception 'Sign in first.';
  end if;

  perform public.leave_room();
  perform public.save_profile(p_display_name, p_avatar_color, p_avatar_shape, p_timezone);

  v_first := split_part(btrim(regexp_replace(p_display_name, '\s+', ' ', 'g')), ' ', 1);
  v_code := private.new_join_code();
  insert into public.workspaces (name, created_by, join_code)
  values (left(v_first || '''s office', 40), v_user, v_code)
  returning id into v_workspace;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace, v_user, 'admin');
  return v_code;
end;
$$;

-- Walk into an office by its code. Returns the (tidied) code.
create function public.join_room(
  p_code text,
  p_display_name text,
  p_avatar_color text,
  p_avatar_shape text,
  p_timezone text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_workspace uuid;
  v_current uuid;
begin
  if v_user is null then
    raise exception 'Sign in first.';
  end if;

  select w.id into v_workspace from public.workspaces w where w.join_code = v_code;
  if v_workspace is null then
    raise exception 'No office has that code. Check it and try again.';
  end if;

  select m.workspace_id into v_current from public.workspace_members m where m.user_id = v_user;
  if v_current = v_workspace then
    perform public.save_profile(p_display_name, p_avatar_color, p_avatar_shape, p_timezone);
    return v_code; -- already in
  end if;

  perform public.leave_room();
  perform public.save_profile(p_display_name, p_avatar_color, p_avatar_shape, p_timezone);

  -- One joiner at a time, so the size limit holds.
  perform 1 from public.workspaces w where w.id = v_workspace for update;
  if (select count(*) from public.workspace_members m where m.workspace_id = v_workspace) >= 25 then
    raise exception 'That office is full (25 people).';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace, v_user, 'member');
  return v_code;
end;
$$;

revoke all on function public.leave_room(), public.create_room(text, text, text, text),
  public.join_room(text, text, text, text, text) from public, anon;
grant execute on function public.leave_room(), public.create_room(text, text, text, text),
  public.join_room(text, text, text, text, text) to authenticated;
