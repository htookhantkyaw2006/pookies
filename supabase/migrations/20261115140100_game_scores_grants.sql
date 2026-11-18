-- Nothing on the high-score table for visitors who are not signed in, and
-- members may only read it (row-level security already narrows that to their
-- own workspace). Scores are only ever saved through submit_score().

revoke all on public.game_scores from anon, authenticated;
grant select on public.game_scores to authenticated;
