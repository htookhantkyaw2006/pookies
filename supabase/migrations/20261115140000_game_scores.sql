-- High scores for the game corner: each person's best in each game.
--
-- Members can read their workspace's scores. Nobody writes the table
-- directly: submit_score() saves a round, keeps only the higher score, and
-- refuses numbers no round could reach (the same limits as
-- src/lib/data/rules.ts GAME_MAX). The games run in the browser, so a
-- determined person could still send a fake score within those limits.
--
-- Scores belong to a membership: leaving the workspace removes them.

create table public.game_scores (
  workspace_id uuid not null,
  user_id uuid not null,
  game text not null check (game in ('snack', 'darts')),
  score integer not null check (
    score >= 0 and score <= case game when 'snack' then 474 when 'darts' then 150 end
  ),
  scored_at timestamptz not null default now(),
  primary key (workspace_id, user_id, game),
  foreign key (workspace_id, user_id)
    references public.workspace_members (workspace_id, user_id) on delete cascade
);

create index game_scores_user_idx on public.game_scores (user_id);

alter table public.game_scores enable row level security;

create policy "Members see their workspace's high scores"
  on public.game_scores for select to authenticated
  using (private.is_member(workspace_id));

create trigger notify_workspace after insert or update or delete on public.game_scores
  for each row execute function private.notify_workspace();

create function public.submit_score(p_game text, p_score integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_workspace uuid := private.my_workspace();
  v_max integer := case p_game when 'snack' then 474 when 'darts' then 150 end;
begin
  if v_user is null or v_workspace is null then
    raise exception 'Join a workspace first.';
  end if;
  if v_max is null then
    raise exception 'That isn''t a game here.';
  end if;
  if p_score is null or p_score < 0 or p_score > v_max then
    raise exception 'That score doesn''t look right.';
  end if;

  insert into public.game_scores as s (workspace_id, user_id, game, score)
  values (v_workspace, v_user, p_game, p_score)
  on conflict (workspace_id, user_id, game) do update
    set score = excluded.score,
        scored_at = now()
    where excluded.score > s.score;
end;
$$;

revoke all on function public.submit_score(text, integer) from public, anon;
grant execute on function public.submit_score(text, integer) to authenticated;
