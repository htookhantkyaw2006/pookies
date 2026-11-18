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
  photo uuid;
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

  -- High scores: your best is kept, and scores no round could reach are refused.
  perform public.submit_score('darts', 90);
  perform public.submit_score('darts', 40);
  if (select score from public.game_scores where user_id = ben and game = 'darts') <> 90 then
    raise exception 'CHECK FAILED: a lower score replaced a better one';
  end if;
  perform public.submit_score('darts', 120);
  if (select score from public.game_scores where user_id = ben and game = 'darts') <> 120 then
    raise exception 'CHECK FAILED: a better score was not saved';
  end if;
  denied := false;
  begin
    perform public.submit_score('darts', 151);
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: an impossible darts score was accepted'; end if;
  denied := false;
  begin
    perform public.submit_score('chess', 1);
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: a score for a made-up game was accepted'; end if;
  denied := false;
  begin
    insert into public.game_scores (workspace_id, user_id, game, score) values (office, ben, 'snack', 474);
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: a score was written directly, bypassing the rules'; end if;

  -- Photos: you have to be in it, everyone in it is a member, names come from profiles.
  photo := public.pin_photo('garden', array[ben, ana]);
  if (select people -> 0 ->> 'name' from public.photos where id = photo) <> 'Ben'
     or (select jsonb_array_length(people) from public.photos where id = photo) <> 2 then
    raise exception 'CHECK FAILED: a member could not pin a photo of themself and a teammate';
  end if;
  denied := false;
  begin
    perform public.pin_photo('garden', array[ben]);
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: photos could be pinned back to back'; end if;
  denied := false;
  begin
    insert into public.photos (workspace_id, taken_by, backdrop, people)
    values (office, ben, 'garden', '[{"id": "x", "name": "Fake"}]');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: a photo was written directly, bypassing the rules'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', cy, 'role', 'authenticated')::text, true);
  denied := false;
  begin
    perform public.pin_photo('stars', array[ana, ben]);
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: someone pinned a photo they are not in'; end if;
  denied := false;
  begin
    perform public.pin_photo('stars', array[cy, dee]);
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: a photo included an outsider'; end if;
  denied := false;
  begin
    perform public.pin_photo('disco', array[cy]);
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: a made-up backdrop was accepted'; end if;
  denied := false;
  begin
    perform public.remove_photo(photo);
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: someone took down a photo they are not in'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', ben, 'role', 'authenticated')::text, true);

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

  -- An invite link's page can show which office it's for, and nothing more.
  if (select workspace_name from public.invite_preview(invite_token)) is distinct from 'Ana''s Office'
     or (select member_count from public.invite_preview(invite_token)) <> 3 then
    raise exception 'CHECK FAILED: an invite link did not show its workspace';
  end if;
  if exists (select 1 from public.invite_preview('not-a-real-token')) then
    raise exception 'CHECK FAILED: a made-up invite token showed a workspace';
  end if;

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
       + (select count(*) from public.game_scores)
       + (select count(*) from public.photos)
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
  denied := false;
  begin
    perform public.submit_score('snack', 10);
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: an outsider saved a high score'; end if;
  denied := false;
  begin
    perform public.pin_photo('garden', array[dee]);
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: an outsider pinned a photo'; end if;
  denied := false;
  begin
    perform public.remove_photo(photo);
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: an outsider took down a photo'; end if;

  -- A new account: sets up its profile, then starts its own workspace.
  denied := false;
  begin
    perform public.create_workspace('Too soon');
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: a workspace was made before a profile'; end if;
  denied := false;
  begin
    perform public.save_profile('Dee', 'neon', 'cat', 'UTC');
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: a made-up pookie colour was saved'; end if;
  perform public.save_profile('  Dee   Dee ', 'mint', 'cat', 'Europe/Paris');
  if (select display_name from public.profiles where id = dee) <> 'Dee Dee' then
    raise exception 'CHECK FAILED: a new account could not save its profile';
  end if;
  -- (Two steps: one statement can't see rows a function inside it has just added.)
  perform public.create_workspace('Dee Co');
  if not exists (select 1 from public.workspace_members where user_id = dee and role = 'admin') then
    raise exception 'CHECK FAILED: a new account could not start its own workspace';
  end if;
  -- ...and still can't see into anyone else's.
  if exists (select 1 from public.workspace_members where workspace_id = office) then
    raise exception 'CHECK FAILED: a new workspace''s admin can see another workspace';
  end if;
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
    select count(*) into n from public.game_scores;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: a signed-out visitor read high scores'; end if;
  denied := false;
  begin
    select count(*) into n from public.photos;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: a signed-out visitor read photos'; end if;

  denied := false;
  begin
    perform public.join_demo_workspace('Nobody', 'peach', 'cat', 'UTC');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: a signed-out visitor called an action'; end if;
  denied := false;
  begin
    perform public.save_profile('Nobody', 'peach', 'cat', 'UTC');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'CHECK FAILED: a signed-out visitor saved a profile'; end if;
  -- Revoked links show nothing, even to visitors.
  if exists (select 1 from public.invite_preview(invite_token)) then
    raise exception 'CHECK FAILED: a revoked invite link still showed its workspace';
  end if;

  execute 'reset role';
  if exists (select 1 from public.profiles where id = ben) then
    raise exception 'CHECK FAILED: a guest''s profile was kept after they left';
  end if;
  if exists (select 1 from public.game_scores where user_id = ben) then
    raise exception 'CHECK FAILED: someone''s high scores were kept after they left';
  end if;
  -- Ben left: he is out of the photo (and no longer its taker); Ana is still in it.
  if not exists (select 1 from public.photos where id = photo) then
    raise exception 'CHECK FAILED: an outsider took down a photo, or it vanished when one person left';
  end if;
  if (select people from public.photos where id = photo) @> jsonb_build_array(jsonb_build_object('id', ben))
     or (select taken_by from public.photos where id = photo) is not null
     or (select jsonb_array_length(people) from public.photos where id = photo) <> 1 then
    raise exception 'CHECK FAILED: someone who left is still in a photo';
  end if;

  raise exception 'ALL CHECKS PASSED (rolled back)';
end;
$$;
