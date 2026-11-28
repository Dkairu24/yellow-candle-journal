-- The Yellow Candle journal: public trade pages
-- Run this once in Supabase: SQL Editor > New query > paste > Run. Safe to run again.
--
-- How it works
--  * You choose which trades to share. Nothing is public until you press Share on a trade.
--  * Each shared trade gets a long random link (?t=...). Anyone with the link can read that one trade.
--  * Nobody can list or search shared trades: the public can only call get_shared_trade(slug) with the exact slug.
--  * Press "Stop sharing" and the link stops working immediately.

create table if not exists public.shared_trades (
  slug        text        primary key,
  user_id     uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  trade_id    text        not null,
  data        jsonb       not null,
  has_shot    boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, trade_id)
);

alter table public.shared_trades enable row level security;

drop policy if exists "own shared select" on public.shared_trades;
drop policy if exists "own shared insert" on public.shared_trades;
drop policy if exists "own shared update" on public.shared_trades;
drop policy if exists "own shared delete" on public.shared_trades;

-- Only the owner can see or change rows directly. The public has no table access at all.
create policy "own shared select" on public.shared_trades for select to authenticated using (user_id = auth.uid());
create policy "own shared insert" on public.shared_trades for insert to authenticated with check (user_id = auth.uid());
create policy "own shared update" on public.shared_trades for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own shared delete" on public.shared_trades for delete to authenticated using (user_id = auth.uid());

-- The one door for the public: look up a single trade by its exact slug.
create or replace function public.get_shared_trade(p_slug text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'data', s.data,
    'has_shot', s.has_shot,
    'shared_at', s.created_at
  )
  from public.shared_trades s
  where s.slug = p_slug
  limit 1;
$$;

revoke all on function public.get_shared_trade(text) from public;
grant execute on function public.get_shared_trade(text) to anon, authenticated;

-- Public bucket for the chart screenshot of a shared trade. File names are the random slug.
-- Only you can upload, replace or delete. There is no policy that lets anyone list the files.
insert into storage.buckets (id, name, public)
values ('public-shots', 'public-shots', true)
on conflict (id) do nothing;

drop policy if exists "own public shots select" on storage.objects;
drop policy if exists "own public shots insert" on storage.objects;
drop policy if exists "own public shots update" on storage.objects;
drop policy if exists "own public shots delete" on storage.objects;

create policy "own public shots select" on storage.objects for select to authenticated
  using (bucket_id = 'public-shots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own public shots insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'public-shots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own public shots update" on storage.objects for update to authenticated
  using (bucket_id = 'public-shots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own public shots delete" on storage.objects for delete to authenticated
  using (bucket_id = 'public-shots' and (storage.foldername(name))[1] = auth.uid()::text);
