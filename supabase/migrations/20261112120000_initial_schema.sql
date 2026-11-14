-- Pookies: initial schema.
--
-- Security model in one paragraph: browsers talk to the database directly with
-- the publishable key, so row-level security (RLS) is the only gate. People can
-- read what belongs to their own workspace and change only their own profile,
-- status and check-ins. Anything that needs more than that (joining, inviting,
-- changing roles, removing people) goes through the functions at the bottom,
-- which check who is calling before they act.

-- ---------------------------------------------------------------------------
-- A schema the API does not expose, for helpers that must not be callable.
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create type public.member_role as enum ('admin', 'member');
create type public.presence_status as enum ('online', 'busy', 'away');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  avatar_color text not null default 'lilac'
    check (avatar_color in ('peach', 'mint', 'sky', 'lilac', 'butter', 'rose')),
  avatar_shape text not null default 'bear'
    check (avatar_shape in ('round', 'bear', 'cat', 'bunny')),
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64),
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  -- The shared office that guest mode drops people into. At most one exists.
  is_demo boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index workspaces_single_demo on public.workspaces (is_demo) where is_demo;
create index workspaces_created_by_idx on public.workspaces (created_by);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'member',
  -- The status the person last chose. Whether they are actually here right now
  -- comes from the live presence channel, not from this row.
  status public.presence_status not null default 'online',
  status_note text not null default '' check (char_length(status_note) <= 80),
  status_updated_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
-- v1 rule: one workspace per person. Drop this index to allow several.
create unique index workspace_members_one_workspace_per_user
  on public.workspace_members (user_id);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  token text not null unique,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  use_count integer not null default 0
);
create index invites_workspace_id_idx on public.invites (workspace_id);
create index invites_created_by_idx on public.invites (created_by);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- The author's own calendar day. One check-in per person per day.
  check_in_date date not null,
  yesterday text not null default '' check (char_length(yesterday) <= 500),
  today text not null check (char_length(btrim(today)) between 1 and 500),
  blockers text not null default '' check (char_length(blockers) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id, check_in_date)
);
create index check_ins_user_id_idx on public.check_ins (user_id);
create index check_ins_workspace_date_idx on public.check_ins (workspace_id, check_in_date desc);

-- ---------------------------------------------------------------------------
-- Helpers used by the policies. SECURITY DEFINER so they can look at
-- memberships without tripping over the policies that call them.
-- ---------------------------------------------------------------------------
create function private.is_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = target_workspace
      and m.user_id = (select auth.uid())
  );
$$;

create function private.is_admin(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = target_workspace
      and m.user_id = (select auth.uid())
      and m.role = 'admin'
  );
$$;

create function private.shares_workspace(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members mine
    join public.workspace_members theirs on theirs.workspace_id = mine.workspace_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = other_user
  );
$$;

create function private.my_workspace()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.workspace_id
  from public.workspace_members m
  where m.user_id = (select auth.uid())
  limit 1;
$$;

-- Today's date where the person is; falls back to UTC for an unknown zone.
create function private.local_date(zone text)
returns date
language plpgsql
stable
set search_path = ''
as $$
begin
  return (now() at time zone zone)::date;
exception when others then
  return (now() at time zone 'UTC')::date;
end;
$$;

-- Live channels are named "workspace:<id>". Only members may use them.
create function private.can_use_topic(topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if topic is null or topic !~ '^workspace:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return private.is_member(substring(topic from 11)::uuid);
end;
$$;

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.invites enable row level security;
alter table public.check_ins enable row level security;

-- Nothing for visitors who are not signed in.
revoke all on public.profiles, public.workspaces, public.workspace_members,
  public.invites, public.check_ins from anon;

-- Signed-in people get exactly these table privileges; the policies below then
-- narrow them to the right rows. Column lists stop anyone editing fields that
-- only the functions may change (roles, ids, counters).
revoke all on public.profiles, public.workspaces, public.workspace_members,
  public.invites, public.check_ins from authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, avatar_color, avatar_shape, timezone) on public.profiles to authenticated;

grant select on public.workspaces to authenticated;
grant update (name) on public.workspaces to authenticated;

grant select on public.workspace_members to authenticated;
grant update (status, status_note, status_updated_at) on public.workspace_members to authenticated;

grant select on public.invites to authenticated;
grant select on public.check_ins to authenticated;

create policy "People see themselves and their teammates"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_workspace(id));

create policy "People edit their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Members see their workspace"
  on public.workspaces for select to authenticated
  using (private.is_member(id));

create policy "Admins rename their workspace"
  on public.workspaces for update to authenticated
  using (private.is_admin(id))
  with check (private.is_admin(id));

create policy "Members see who is in their workspace"
  on public.workspace_members for select to authenticated
  using (private.is_member(workspace_id));

create policy "People set their own status"
  on public.workspace_members for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Admins see invite links"
  on public.invites for select to authenticated
  using (private.is_admin(workspace_id));

create policy "Members read their workspace's check-ins"
  on public.check_ins for select to authenticated
  using (private.is_member(workspace_id));

-- ---------------------------------------------------------------------------
-- Live updates
-- ---------------------------------------------------------------------------

-- Who may join a workspace's live channel, see who is present, and send
-- (presence, walking positions, waves).
create policy "Members receive their workspace's live channel"
  on realtime.messages for select to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and private.can_use_topic((select realtime.topic()))
  );

create policy "Members send on their workspace's live channel"
  on realtime.messages for insert to authenticated
  with check (
    realtime.messages.extension in ('broadcast', 'presence')
    and private.can_use_topic((select realtime.topic()))
  );

-- When saved data changes, tell everyone in that workspace which table moved.
-- Browsers then re-read that table (through RLS), so the message itself never
-- carries any data.
create function private.notify_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target uuid;
begin
  if tg_table_name = 'workspace_members' and tg_op = 'UPDATE' then
    -- Status changes already travel over the presence channel.
    if (to_jsonb(new) ->> 'role') is not distinct from (to_jsonb(old) ->> 'role') then
      return null;
    end if;
  end if;

  if tg_table_name = 'profiles' then
    for target in
      select m.workspace_id
      from public.workspace_members m
      where m.user_id = (changed ->> 'id')::uuid
    loop
      perform realtime.send(
        jsonb_build_object('table', tg_table_name), 'db', 'workspace:' || target::text, true
      );
    end loop;
    return null;
  end if;

  target := case
    when tg_table_name = 'workspaces' then (changed ->> 'id')::uuid
    else (changed ->> 'workspace_id')::uuid
  end;
  perform realtime.send(
    jsonb_build_object('table', tg_table_name), 'db', 'workspace:' || target::text, true
  );
  return null;
end;
$$;
revoke all on function private.notify_workspace() from public, authenticated;

create trigger notify_workspace after insert or update or delete on public.workspaces
  for each row execute function private.notify_workspace();
create trigger notify_workspace after insert or update or delete on public.workspace_members
  for each row execute function private.notify_workspace();
create trigger notify_workspace after insert or update or delete on public.invites
  for each row execute function private.notify_workspace();
create trigger notify_workspace after insert or update or delete on public.check_ins
  for each row execute function private.notify_workspace();
create trigger notify_workspace after update on public.profiles
  for each row execute function private.notify_workspace();

-- ---------------------------------------------------------------------------
-- Actions. Each runs with elevated rights, so each starts by checking the caller.
-- ---------------------------------------------------------------------------

-- Guest mode (development): take a name and step into the shared demo office.
-- The first person in becomes its admin.
create function public.join_demo_workspace(
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

-- First sign-in with no workspace: create one and become its admin.
create function public.create_workspace(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_workspace uuid;
begin
  if v_user is null then
    raise exception 'Sign in first.';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_user) then
    raise exception 'Set up your profile first.';
  end if;
  if exists (select 1 from public.workspace_members m where m.user_id = v_user) then
    raise exception 'You are already in a workspace.';
  end if;

  insert into public.workspaces (name, created_by)
  values (btrim(p_name), v_user)
  returning id into v_workspace;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace, v_user, 'admin');
  return v_workspace;
end;
$$;

-- Join through an invite link.
create function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_invite public.invites%rowtype;
  v_current uuid;
begin
  if v_user is null then
    raise exception 'Sign in first.';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_user) then
    raise exception 'Set up your profile first.';
  end if;

  select * into v_invite from public.invites i where i.token = p_token for update;
  if not found or v_invite.revoked_at is not null or v_invite.expires_at <= now() then
    raise exception 'This invite link is no longer valid.';
  end if;

  select m.workspace_id into v_current
  from public.workspace_members m
  where m.user_id = v_user;
  if v_current = v_invite.workspace_id then
    return v_current; -- already in
  end if;
  if v_current is not null then
    raise exception 'You are already in another workspace.';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_invite.workspace_id, v_user, 'member');
  update public.invites set use_count = use_count + 1 where id = v_invite.id;
  return v_invite.workspace_id;
end;
$$;

-- Admins: make a new invite link, good for seven days.
create function public.create_invite()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace uuid := private.my_workspace();
  v_invite uuid;
begin
  if v_workspace is null or not private.is_admin(v_workspace) then
    raise exception 'Only admins can create invite links.';
  end if;

  insert into public.invites (workspace_id, token, created_by, expires_at)
  values (
    v_workspace,
    replace(gen_random_uuid()::text, '-', '') || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
    (select auth.uid()),
    now() + interval '7 days'
  )
  returning id into v_invite;
  return v_invite;
end;
$$;

-- Admins: switch an invite link off.
create function public.revoke_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace uuid;
begin
  select i.workspace_id into v_workspace from public.invites i where i.id = p_invite_id;
  if v_workspace is null or not private.is_admin(v_workspace) then
    raise exception 'Only admins can revoke invite links.';
  end if;
  update public.invites set revoked_at = now() where id = p_invite_id and revoked_at is null;
end;
$$;

-- Admins: make someone an admin or a member. A workspace always keeps one admin.
create function public.set_member_role(p_user_id uuid, p_role public.member_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace uuid := private.my_workspace();
  v_current public.member_role;
begin
  if v_workspace is null or not private.is_admin(v_workspace) then
    raise exception 'Only admins can change roles.';
  end if;

  -- One role change at a time, so two admins can't demote each other at once.
  perform 1 from public.workspaces w where w.id = v_workspace for update;

  select m.role into v_current
  from public.workspace_members m
  where m.workspace_id = v_workspace and m.user_id = p_user_id;
  if v_current is null then
    raise exception 'That person is no longer in the workspace.';
  end if;

  if v_current = 'admin' and p_role = 'member' and (
    select count(*) from public.workspace_members m
    where m.workspace_id = v_workspace and m.role = 'admin'
  ) = 1 then
    raise exception 'A workspace needs at least one admin. Make someone else an admin first.';
  end if;

  update public.workspace_members
  set role = p_role
  where workspace_id = v_workspace and user_id = p_user_id;
end;
$$;

-- Admins: remove someone from the workspace, along with their check-ins there.
create function public.remove_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace uuid := private.my_workspace();
  v_target public.member_role;
begin
  if v_workspace is null or not private.is_admin(v_workspace) then
    raise exception 'Only admins can remove people.';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'You can''t remove yourself from the workspace.';
  end if;

  perform 1 from public.workspaces w where w.id = v_workspace for update;

  select m.role into v_target
  from public.workspace_members m
  where m.workspace_id = v_workspace and m.user_id = p_user_id;
  if v_target is null then
    raise exception 'That person is no longer in the workspace.';
  end if;

  delete from public.check_ins where workspace_id = v_workspace and user_id = p_user_id;
  delete from public.workspace_members where workspace_id = v_workspace and user_id = p_user_id;
end;
$$;

-- Post today's check-in, or edit it if there already is one. The day is worked
-- out here from the author's time zone, never taken from the browser.
create function public.save_check_in(p_yesterday text, p_today text, p_blockers text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_workspace uuid := private.my_workspace();
  v_zone text;
  v_check_in uuid;
begin
  if v_user is null or v_workspace is null then
    raise exception 'Join a workspace first.';
  end if;
  select p.timezone into v_zone from public.profiles p where p.id = v_user;

  insert into public.check_ins (workspace_id, user_id, check_in_date, yesterday, today, blockers)
  values (
    v_workspace,
    v_user,
    private.local_date(v_zone),
    btrim(coalesce(p_yesterday, '')),
    btrim(coalesce(p_today, '')),
    btrim(coalesce(p_blockers, ''))
  )
  on conflict (workspace_id, user_id, check_in_date) do update
    set yesterday = excluded.yesterday,
        today = excluded.today,
        blockers = excluded.blockers,
        updated_at = now()
  returning id into v_check_in;
  return v_check_in;
end;
$$;

-- Only signed-in people may call the actions.
revoke all on function
  public.join_demo_workspace(text, text, text, text),
  public.create_workspace(text),
  public.accept_invite(text),
  public.create_invite(),
  public.revoke_invite(uuid),
  public.set_member_role(uuid, public.member_role),
  public.remove_member(uuid),
  public.save_check_in(text, text, text)
from public, anon;

grant execute on function
  public.join_demo_workspace(text, text, text, text),
  public.create_workspace(text),
  public.accept_invite(text),
  public.create_invite(),
  public.revoke_invite(uuid),
  public.set_member_role(uuid, public.member_role),
  public.remove_member(uuid),
  public.save_check_in(text, text, text)
to authenticated;
