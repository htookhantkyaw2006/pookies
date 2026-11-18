-- The photo booth and photo wall: team photos of everyone's pookie.
--
-- A photo keeps who was in it and how they looked at the time (name, colour,
-- ears) and a pose for each. Members can read their workspace's photos;
-- nobody writes the table directly:
--   pin_photo()    takes a photo of up to four members, the caller among
--                  them, and keeps only the newest twelve on the wall
--   remove_photo() lets anyone in a photo, whoever took it, or an admin
--                  take it down
-- Someone leaving the workspace is taken out of every photo (a photo of only
-- them is removed), so nothing about them stays behind.

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  taken_by uuid references public.profiles (id) on delete set null,
  taken_at timestamptz not null default now(),
  backdrop text not null check (backdrop in ('garden', 'stars', 'confetti', 'sunset')),
  -- [{ id, name, color, shape, pose }], left to right.
  people jsonb not null check (
    jsonb_typeof(people) = 'array' and jsonb_array_length(people) between 1 and 4
  )
);

create index photos_workspace_taken_idx on public.photos (workspace_id, taken_at desc);
create index photos_taken_by_idx on public.photos (taken_by);

alter table public.photos enable row level security;

-- Nothing for visitors who are not signed in; members may only read.
revoke all on public.photos from anon, authenticated;
grant select on public.photos to authenticated;

create policy "Members see their workspace's photos"
  on public.photos for select to authenticated
  using (private.is_member(workspace_id));

create trigger notify_workspace after insert or update or delete on public.photos
  for each row execute function private.notify_workspace();

create function public.pin_photo(p_backdrop text, p_people uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_workspace uuid := private.my_workspace();
  v_people jsonb;
  v_id uuid;
begin
  if v_user is null or v_workspace is null then
    raise exception 'Join a workspace first.';
  end if;
  if p_backdrop is null or p_backdrop not in ('garden', 'stars', 'confetti', 'sunset') then
    raise exception 'Pick a backdrop.';
  end if;
  if p_people is null or cardinality(p_people) not between 1 and 4 then
    raise exception 'The booth fits one to 4 people.';
  end if;
  if (select count(distinct person) from unnest(p_people) as person) <> cardinality(p_people) then
    raise exception 'Everyone only fits in once.';
  end if;
  if not (v_user = any (p_people)) then
    raise exception 'Step into the booth to be in the photo.';
  end if;
  if exists (
    select 1 from public.photos p
    where p.workspace_id = v_workspace and p.taken_by = v_user
      and p.taken_at > now() - interval '5 seconds'
  ) then
    raise exception 'One photo at a time! Try again in a moment.';
  end if;

  -- Names and looks come from the profiles, never from the caller.
  select jsonb_agg(
           jsonb_build_object(
             'id', pr.id,
             'name', pr.display_name,
             'color', pr.avatar_color,
             'shape', pr.avatar_shape,
             'pose', (array['wave', 'peace', 'jump', 'heart'])[1 + floor(random() * 4)::int]
           )
           order by array_position(p_people, pr.id)
         )
    into v_people
    from public.profiles pr
    join public.workspace_members m on m.user_id = pr.id and m.workspace_id = v_workspace
   where pr.id = any (p_people);

  if coalesce(jsonb_array_length(v_people), 0) <> cardinality(p_people) then
    raise exception 'Everyone in the photo has to be in the office.';
  end if;

  insert into public.photos (workspace_id, taken_by, backdrop, people)
  values (v_workspace, v_user, p_backdrop, v_people)
  returning id into v_id;

  -- The wall holds the newest twelve.
  delete from public.photos p
   where p.workspace_id = v_workspace
     and p.id not in (
       select keep.id from public.photos keep
        where keep.workspace_id = v_workspace
        order by keep.taken_at desc, keep.id
        limit 12
     );

  return v_id;
end;
$$;

create function public.remove_photo(p_photo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_workspace uuid := private.my_workspace();
  v_photo public.photos;
begin
  if v_user is null or v_workspace is null then
    raise exception 'Join a workspace first.';
  end if;
  select * into v_photo from public.photos p where p.id = p_photo and p.workspace_id = v_workspace;
  if not found then
    return; -- already gone
  end if;
  if not (
    v_photo.taken_by = v_user
    or v_photo.people @> jsonb_build_array(jsonb_build_object('id', v_user))
    or private.is_admin(v_workspace)
  ) then
    raise exception 'Only people in the photo can take it down.';
  end if;
  delete from public.photos p where p.id = p_photo;
end;
$$;

revoke all on function public.pin_photo(text, uuid[]), public.remove_photo(uuid) from public, anon;
grant execute on function public.pin_photo(text, uuid[]), public.remove_photo(uuid) to authenticated;

-- Leaving the workspace takes you out of its photos.
create function private.forget_in_photos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me jsonb := jsonb_build_array(jsonb_build_object('id', old.user_id));
begin
  -- Photos of only them go entirely.
  delete from public.photos p
   where p.workspace_id = old.workspace_id
     and p.people @> v_me
     and jsonb_array_length(p.people) = 1;

  update public.photos p
     set people = (
           select jsonb_agg(person order by position)
             from jsonb_array_elements(p.people) with ordinality as e (person, position)
            where person ->> 'id' <> old.user_id::text
         )
   where p.workspace_id = old.workspace_id
     and p.people @> v_me;

  update public.photos p
     set taken_by = null
   where p.workspace_id = old.workspace_id
     and p.taken_by = old.user_id;

  return null;
end;
$$;
revoke all on function private.forget_in_photos() from public, authenticated;

create trigger forget_in_photos after delete on public.workspace_members
  for each row execute function private.forget_in_photos();
