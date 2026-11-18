-- Checks the office-code rules (create_room, join_room, leave_room) by acting
-- as three pretend guests. Like security_checks.sql it always ends with an
-- error so nothing is kept: "ALL ROOM CHECKS PASSED (rolled back)" is good news.

do $$
declare
  ana uuid := gen_random_uuid();
  ben uuid := gen_random_uuid();
  cy uuid := gen_random_uuid();
  code text;
  code2 text;
  room uuid;
  n integer;
  denied boolean;
begin
  insert into auth.users (id, aud, role, is_anonymous) values
    (ana, 'authenticated', 'authenticated', true),
    (ben, 'authenticated', 'authenticated', true),
    (cy, 'authenticated', 'authenticated', true);
  execute 'set local role authenticated';

  -- Ana makes an office and gets a code.
  perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
  code := public.create_room('Ana Lima', 'peach', 'cat', 'Asia/Bangkok');
  if code !~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$' then raise exception 'CHECK FAILED: bad code %', code; end if;
  select id into room from public.workspaces where join_code = code;
  if (select name from public.workspaces where id = room) <> 'Ana''s office' then raise exception 'CHECK FAILED: office name'; end if;
  if not exists (select 1 from public.workspace_members where user_id = ana and role = 'admin') then raise exception 'CHECK FAILED: creator is not admin'; end if;

  -- Ben joins by typing it sloppily.
  perform set_config('request.jwt.claims', json_build_object('sub', ben, 'role', 'authenticated')::text, true);
  if public.join_room(lower(substr(code,1,3)) || '-' || lower(substr(code,4)), 'Ben', 'sky', 'bear', 'UTC') <> code then
    raise exception 'CHECK FAILED: join returned the wrong code';
  end if;
  select count(*) into n from public.workspace_members;
  if n <> 2 then raise exception 'CHECK FAILED: Ben should see 2 people, saw %', n; end if;
  if (select join_code from public.workspaces where id = room) <> code then raise exception 'CHECK FAILED: members cannot see the code'; end if;

  -- A wrong code is refused; Cy (an outsider) can't see Ana's office.
  perform set_config('request.jwt.claims', json_build_object('sub', cy, 'role', 'authenticated')::text, true);
  denied := false;
  begin perform public.join_room('ZZZZZZ', 'Cy', 'mint', 'bunny', 'UTC'); exception when raise_exception then denied := true; end;
  if not denied then raise exception 'CHECK FAILED: a made-up code worked'; end if;
  if exists (select 1 from public.workspaces) then raise exception 'CHECK FAILED: an outsider can see an office'; end if;

  -- Ben makes his own office instead: he leaves Ana's.
  perform set_config('request.jwt.claims', json_build_object('sub', ben, 'role', 'authenticated')::text, true);
  code2 := public.create_room('Ben', 'sky', 'bear', 'UTC');
  if code2 = code then raise exception 'CHECK FAILED: two offices got the same code'; end if;
  if (select count(*) from public.workspace_members where user_id = ben) <> 1 then raise exception 'CHECK FAILED: Ben is in two offices'; end if;
  perform public.leave_room();
  execute 'reset role';
  if exists (select 1 from public.workspaces where join_code = code2) then raise exception 'CHECK FAILED: an empty office was kept'; end if;
  if exists (select 1 from public.profiles where id = ben) then raise exception 'CHECK FAILED: a leaver''s name was kept'; end if;

  -- Ana leaves last: her office goes too.
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
  perform public.leave_room();
  execute 'reset role';
  if exists (select 1 from public.workspaces where id = room) then raise exception 'CHECK FAILED: the last one out did not close the office'; end if;

  -- Signed-out visitors can't make or join offices.
  execute 'set local role anon';
  denied := false;
  begin perform public.create_room('X', 'mint', 'cat', 'UTC'); exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'CHECK FAILED: a signed-out visitor made an office'; end if;
  execute 'reset role';

  raise exception 'ALL ROOM CHECKS PASSED (rolled back)';
end;
$$;
