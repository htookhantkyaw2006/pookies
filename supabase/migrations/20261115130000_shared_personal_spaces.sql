-- Personal space became three shared quiet rooms that anyone can use, rather
-- than a room per person, so per-person rooms are no longer stored. This
-- undoes 20261115120000_personal_rooms (which held only automatic room
-- numbers and empty styles).

drop trigger if exists assign_room on public.workspace_members;
drop function if exists private.assign_room();
drop function if exists public.set_room_style(jsonb);
drop index if exists public.workspace_members_room_number;
alter table public.workspace_members
  drop column if exists room_number,
  drop column if exists room_style;
