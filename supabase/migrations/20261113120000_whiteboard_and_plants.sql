-- Shared things in the office: the meeting room whiteboard and the plants.
--
-- Both live on the workspace row, so the existing "workspaces changed" live
-- ping tells everyone to re-read them. Members can't update the row directly
-- (only admins can rename it); they change these through the two functions
-- below, which touch nothing else.

alter table public.workspaces
  add column board_text text not null default ''
    check (char_length(board_text) <= 80),
  add column board_by uuid references public.profiles (id) on delete set null,
  add column board_at timestamptz,
  -- Plant id (from the office map) -> when it was last watered.
  add column plants jsonb not null default '{}'::jsonb
    check (jsonb_typeof(plants) = 'object');

create index workspaces_board_by_idx on public.workspaces (board_by);

create function public.write_board(p_text text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_workspace uuid := private.my_workspace();
  v_text text := btrim(regexp_replace(coalesce(p_text, ''), '\s+', ' ', 'g'));
begin
  if v_user is null or v_workspace is null then
    raise exception 'Join a workspace first.';
  end if;
  if char_length(v_text) > 80 then
    raise exception 'Keep the whiteboard to 80 characters.';
  end if;

  update public.workspaces
     set board_text = v_text,
         board_by = case when v_text = '' then null else v_user end,
         board_at = case when v_text = '' then null else now() end
   where id = v_workspace;
end;
$$;

create function public.water_plant(p_plant text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_workspace uuid := private.my_workspace();
  v_plants jsonb;
begin
  if v_user is null or v_workspace is null then
    raise exception 'Join a workspace first.';
  end if;
  if p_plant is null or p_plant !~ '^plant-[a-z0-9-]{1,30}$' then
    raise exception 'That isn''t a plant.';
  end if;

  select w.plants into v_plants from public.workspaces w where w.id = v_workspace for update;
  -- Plant ids come from the map; a handful is plenty, so refuse to grow without bound.
  if not (v_plants ? p_plant) and (select count(*) from jsonb_object_keys(v_plants)) >= 40 then
    raise exception 'That isn''t a plant.';
  end if;

  update public.workspaces
     set plants = v_plants || jsonb_build_object(p_plant, now())
   where id = v_workspace;
end;
$$;

revoke all on function public.write_board(text), public.water_plant(text) from public, anon;
grant execute on function public.write_board(text), public.water_plant(text) to authenticated;
