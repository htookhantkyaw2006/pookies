-- Real accounts: people sign up with email and password, set up their
-- profile, then create a workspace or join one with an invite link. The
-- workspace functions (create_workspace, accept_invite, create_invite)
-- already exist; these two fill the gaps around them.

-- Save your own name and look. New accounts call this before creating or
-- joining a workspace (both require a profile). Guests keep using
-- join_demo_workspace, which saves theirs as it lets them in.
create function public.save_profile(
  p_display_name text,
  p_avatar_color text,
  p_avatar_shape text,
  p_timezone text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_name text := btrim(regexp_replace(coalesce(p_display_name, ''), '\s+', ' ', 'g'));
begin
  if v_user is null then
    raise exception 'Sign in first.';
  end if;
  if char_length(v_name) not between 1 and 40 then
    raise exception 'Your name needs 1 to 40 characters.';
  end if;
  if p_avatar_color is null or p_avatar_color not in ('peach', 'mint', 'sky', 'lilac', 'butter', 'rose') then
    raise exception 'Pick a colour for your pookie.';
  end if;
  if p_avatar_shape is null or p_avatar_shape not in ('round', 'bear', 'cat', 'bunny') then
    raise exception 'Pick ears for your pookie.';
  end if;

  insert into public.profiles (id, display_name, avatar_color, avatar_shape, timezone)
  values (
    v_user,
    v_name,
    p_avatar_color,
    p_avatar_shape,
    left(coalesce(nullif(btrim(p_timezone), ''), 'UTC'), 64)
  )
  on conflict (id) do update
    set display_name = excluded.display_name,
        avatar_color = excluded.avatar_color,
        avatar_shape = excluded.avatar_shape,
        timezone = excluded.timezone;
end;
$$;

revoke all on function public.save_profile(text, text, text, text) from public, anon;
grant execute on function public.save_profile(text, text, text, text) to authenticated;

-- What an invite link is for, so its page can say "Join Sunny Side Studio
-- (4 people)" before you've signed up. Only answers for a link that still
-- works, and only the workspace's name and size. Invite tokens are 40 random
-- hex characters, so they can't be guessed.
create function public.invite_preview(p_token text)
returns table (workspace_name text, member_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select w.name,
         (select count(*)::integer from public.workspace_members m where m.workspace_id = w.id)
    from public.invites i
    join public.workspaces w on w.id = i.workspace_id
   where i.token = p_token
     and i.revoked_at is null
     and i.expires_at > now();
$$;

revoke all on function public.invite_preview(text) from public;
grant execute on function public.invite_preview(text) to anon, authenticated;
