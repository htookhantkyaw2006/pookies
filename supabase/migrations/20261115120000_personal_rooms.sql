-- Personal rooms: everyone in a workspace gets a room of their own (numbered
-- 1 to 16, matching the rooms wing of the office) and decorates it.

alter table public.workspace_members
  add column room_number smallint check (room_number between 1 and 16),
  add column room_style jsonb not null default '{}'::jsonb
    check (jsonb_typeof(room_style) = 'object');

-- No two people share a room.
create unique index workspace_members_room_number
  on public.workspace_members (workspace_id, room_number)
  where room_number is not null;

-- Hand out rooms to people already here, longest-standing first.
with numbered as (
  select workspace_id, user_id,
         row_number() over (partition by workspace_id order by joined_at, user_id) as n
  from public.workspace_members
)
update public.workspace_members m
   set room_number = numbered.n
  from numbered
 where m.workspace_id = numbered.workspace_id
   and m.user_id = numbered.user_id
   and numbered.n <= 16;

-- Newcomers get the lowest free room. Rooms free up when people leave.
create function private.assign_room()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.room_number is not null then
    return new;
  end if;
  -- One newcomer at a time per workspace, so two people joining together can't get the same room.
  perform 1 from public.workspaces w where w.id = new.workspace_id for update;
  select min(n) into new.room_number
    from generate_series(1, 16) as n
   where not exists (
     select 1 from public.workspace_members m
      where m.workspace_id = new.workspace_id and m.room_number = n
   );
  return new;
end;
$$;
revoke all on function private.assign_room() from public, authenticated;

create trigger assign_room before insert on public.workspace_members
  for each row execute function private.assign_room();

-- Decorate your own room, choosing only from what's on offer.
create function public.set_room_style(p_style jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_workspace uuid := private.my_workspace();
  v_colors text[] := array['peach', 'mint', 'sky', 'lilac', 'butter', 'rose'];
begin
  if v_user is null or v_workspace is null then
    raise exception 'Join a workspace first.';
  end if;
  if p_style is null
     or jsonb_typeof(p_style) <> 'object'
     or (select count(*) from jsonb_object_keys(p_style)) <> 5
     or not (p_style->>'rug' = any (v_colors))
     or not (p_style->>'chair' = any (v_colors))
     or not (p_style->>'plant' = any (array['fern', 'cactus', 'monstera', 'tulips']))
     or not (p_style->>'keepsake' = any (array['lamp', 'books', 'record', 'fishbowl', 'teddy']))
     or jsonb_typeof(p_style->'doNotDisturb') is distinct from 'boolean'
  then
    raise exception 'That isn''t one of the choices for your room.';
  end if;

  update public.workspace_members
     set room_style = p_style
   where workspace_id = v_workspace and user_id = v_user;
end;
$$;

revoke all on function public.set_room_style(jsonb) from public, anon;
grant execute on function public.set_room_style(jsonb) to authenticated;
