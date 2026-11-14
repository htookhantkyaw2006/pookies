-- Checks the database rules end to end by acting as several pretend people.
--
-- Run it in the Supabase SQL editor (or through the Supabase MCP). It always
-- ends by raising an error, on purpose, so that everything it created is
-- rolled back:
--   "ALL CHECKS PASSED (rolled back)"  -> the rules behave as intended
--   "CHECK FAILED: ..."                -> something is wrong; read the message
--
-- It needs the shared demo office to be empty or absent, and it never keeps
-- any of its changes either way.

do $$
declare
  ana uuid := gen_random_uuid(); -- first in: becomes admin
  ben uuid := gen_random_uuid();
  cy uuid := gen_random_uuid();
  dee uuid := gen_random_uuid(); -- never joins: the outsider
  office uuid;
  invite uuid;
  invite_token text;
  first_check_in uuid;
  second_check_in uuid;
  n integer;
  denied boolean;
begin
  insert into auth.users (id, aud, role, is_anonymous)
  values
    (ana, 'authenticated', 'authenticated', true),
    (ben, 'authenticated', 'authenticated', true),
    (cy, 'authenticated', 'authenticated', true),
    (dee, 'authenticated', 'authenticated', true);

  if exists (
    select 1 from public.workspace_members m
    join public.workspaces w on w.id = m.workspace_id
    where w.is_demo
  ) then
    raise exception 'CHECK FAILED: the demo office has people in it; run this when it is empty';
  end if;

  -- From here on, act as real signed-in browsers would.
  execute 'set local role authenticated';

  -- 1. The first guest becomes admin, later ones are members.
  perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
  office := public.join_demo_workspace('Ana', 'peach', 'cat', 'Asia/Bangkok');
  perform set_config('request.jwt.claims', json_build_object('sub', ben, 'role', 'authenticated')::text, true);
  perform public.join_demo_workspace('Ben', 'sky', 'bear', 'Europe/London');
  perform set_config('request.jwt.claims', json_build_object('sub', cy, 'role', 'authenticated')::text, true);
  perform public.join_demo_workspace('Cy', 'mint', 'bunny', 'Not/AZone');

  select count(*) into n from public.workspace_members where role = 'admin';
  if n <> 1 then raise exception 'CHECK FAILED: expected exactly one admin, found %', n; end if;
  if not exists (select 1 from public.workspace_members where user_id = ana and role = 'admin') then
    raise exception 'CHECK FAILED: the first guest should be the admin';
  end if;

  -- 2. A member sees teammates, but no invite links, and can't promote themself.
  perform set_config('request.jwt.claims', json_build_object('sub', ben, 'role', 'authenticated')::text, true);
  select count(*) into n from public.workspace_members;
  if n <> 3 then raise exception 'CHECK FAILED: a member should see 3 people, saw %', n; end if;
  select count(*) into n from public.profiles;
  if n <> 3 then raise exception 'CHECK FAILED: a member should see 3 profiles, saw %', n; end if;

  denied := false;
  begin
    update public.workspace_members set role = 'admin' where user_id = ben;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: a member edited their own role directly'; end if;

  denied := false;
  begin
    perform public.set_member_role(ben, 'admin');
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: a member promoted themself'; end if;

  denied := false;
  begin
    perform public.create_invite();
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: a member created an invite link'; end if;

  -- A member can't change someone else's status; they can change their own.
  update public.workspace_members set status = 'busy', status_note = 'hacked' where user_id = ana;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'CHECK FAILED: a member changed someone else''s status'; end if;
  update public.workspace_members set status = 'busy', status_note = 'Deep work' where user_id = ben;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'CHECK FAILED: a member could not set their own status'; end if;

  -- A member can't rename the workspace or edit someone else's profile.
  update public.workspaces set name = 'Renamed by Ben' where id = office;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'CHECK FAILED: a member renamed the workspace'; end if;
  update public.profiles set display_name = 'Not Ana' where id = ana;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'CHECK FAILED: a member edited someone else''s profile'; end if;

  -- Any member can write on the whiteboard and water the plants, and nothing else.
  perform public.write_board('  Demo   at 3pm  ');
  if (select board_text from public.workspaces where id = office) <> 'Demo at 3pm' then
    raise exception 'CHECK FAILED: a member could not write on the whiteboard';
  end if;
  if (select board_by from public.workspaces where id = office) <> ben then
    raise exception 'CHECK FAILED: the whiteboard did not record who wrote it';
  end if;
  denied := false;
  begin
    perform public.write_board(repeat('x', 81));
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: the whiteboard took more than 80 characters'; end if;

  perform public.water_plant('plant-desks-1');
  if not ((select plants from public.workspaces where id = office) ? 'plant-desks-1') then
    raise exception 'CHECK FAILED: a member could not water a plant';
  end if;
  denied := false;
  begin
    perform public.water_plant('"; drop table x; --');
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: a made-up plant id was accepted'; end if;

  -- 3. Check-ins: one per person per day, visible to teammates.
  first_check_in := public.save_check_in('Fixed the bug', 'Ship it', '');
  second_check_in := public.save_check_in('Fixed the bug', 'Ship it, then lunch', 'None');
  if first_check_in <> second_check_in then
    raise exception 'CHECK FAILED: a second check-in on the same day made a new row';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', cy, 'role', 'authenticated')::text, true);
  select count(*) into n from public.check_ins where today = 'Ship it, then lunch';
  if n <> 1 then raise exception 'CHECK FAILED: a teammate could not read the check-in'; end if;
  -- Cy's time zone is nonsense; saving should still work (falls back to UTC).
  perform public.save_check_in('', 'Still works', '');

  denied := false;
  begin
    insert into public.check_ins (workspace_id, user_id, check_in_date, today)
    values (office, cy, current_date - 1, 'Backdated');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: a check-in was inserted directly, bypassing the rules'; end if;

  -- 4. Admin actions, and the "always one admin" rule.
  perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
  invite := public.create_invite();
  select token into invite_token from public.invites where id = invite;
  if invite_token is null then
    raise exception 'CHECK FAILED: the admin should see their invite link';
  end if;

  update public.workspaces set name = 'Ana''s Office' where id = office;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'CHECK FAILED: the admin could not rename the workspace'; end if;

  denied := false;
  begin
    perform public.set_member_role(ana, 'member');
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: the last admin was demoted'; end if;

  denied := false;
  begin
    perform public.remove_member(ana);
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: an admin removed themself'; end if;

  perform public.set_member_role(ben, 'admin');
  perform public.set_member_role(ana, 'member'); -- fine now: Ben is an admin

  denied := false;
  begin
    perform public.revoke_invite(invite);
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: a former admin revoked an invite link'; end if;
  select count(*) into n from public.invites;
  if n <> 0 then raise exception 'CHECK FAILED: a former admin can still see invite links'; end if;

  -- 5. Invite links: valid ones let someone in once; revoked ones don't.
  perform set_config('request.jwt.claims', json_build_object('sub', ben, 'role', 'authenticated')::text, true);
  perform public.remove_member(cy);
  select count(*) into n from public.check_ins where user_id = cy;
  if n <> 0 then raise exception 'CHECK FAILED: a removed person''s check-ins were kept'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', cy, 'role', 'authenticated')::text, true);
  select count(*) into n from public.workspace_members;
  if n <> 0 then raise exception 'CHECK FAILED: a removed person can still see the team'; end if;
  select count(*) into n from public.workspaces;
  if n <> 0 then raise exception 'CHECK FAILED: a removed person can still see the workspace'; end if;
  if private.can_use_topic('workspace:' || office::text) then
    raise exception 'CHECK FAILED: a removed person can still join the live channel';
  end if;

  perform public.accept_invite(invite_token);
  select count(*) into n from public.workspace_members;
  if n <> 3 then raise exception 'CHECK FAILED: accepting an invite did not let the person in'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', ben, 'role', 'authenticated')::text, true);
  if (select use_count from public.invites where id = invite) <> 1 then
    raise exception 'CHECK FAILED: the invite link did not count its use';
  end if;
  perform public.revoke_invite(invite);
  perform public.remove_member(cy);

  perform set_config('request.jwt.claims', json_build_object('sub', cy, 'role', 'authenticated')::text, true);
  denied := false;
  begin
    perform public.accept_invite(invite_token);
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: a revoked invite link still worked'; end if;

  -- 6. An outsider sees nothing at all.
  perform set_config('request.jwt.claims', json_build_object('sub', dee, 'role', 'authenticated')::text, true);
  select (select count(*) from public.workspaces)
       + (select count(*) from public.workspace_members)
       + (select count(*) from public.profiles)
       + (select count(*) from public.check_ins)
       + (select count(*) from public.invites)
  into n;
  if n <> 0 then raise exception 'CHECK FAILED: an outsider can read % rows', n; end if;
  denied := false;
  begin
    perform public.write_board('Not my office');
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: an outsider wrote on the whiteboard'; end if;
  denied := false;
  begin
    perform public.water_plant('plant-desks-1');
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: an outsider watered a plant'; end if;
  if private.can_use_topic('workspace:' || office::text) then
    raise exception 'CHECK FAILED: an outsider can join the live channel';
  end if;
  if private.can_use_topic('not-a-workspace') or private.can_use_topic(null) then
    raise exception 'CHECK FAILED: a malformed channel name was accepted';
  end if;

  -- Members can use their own workspace's live channel.
  perform set_config('request.jwt.claims', json_build_object('sub', ben, 'role', 'authenticated')::text, true);
  if not private.can_use_topic('workspace:' || office::text) then
    raise exception 'CHECK FAILED: a member cannot join their own live channel';
  end if;

  -- 7. Leaving: the only admin leaving hands the role to whoever is left.
  perform public.leave_demo_workspace();
  perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
  if not exists (select 1 from public.workspace_members where user_id = ana and role = 'admin') then
    raise exception 'CHECK FAILED: nobody was made admin after the last admin left';
  end if;

  -- 8. Visitors who are not signed in can't touch anything.
  execute 'set local role anon';
  denied := false;
  begin
    select count(*) into n from public.profiles;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: a signed-out visitor read profiles'; end if;

  denied := false;
  begin
    perform public.join_demo_workspace('Nobody', 'peach', 'cat', 'UTC');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: a signed-out visitor called an action'; end if;

  execute 'reset role';
  if exists (select 1 from public.profiles where id = ben) then
    raise exception 'CHECK FAILED: a guest''s profile was kept after they left';
  end if;

  raise exception 'ALL CHECKS PASSED (rolled back)';
end;
$$;
