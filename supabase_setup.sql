-- The Yellow Candle journal: Supabase setup
-- Run this once in Supabase: SQL Editor > New query > paste > Run.
-- It is safe to run again.

-- One row per trade. The whole trade lives in "data" so the journal can keep adding fields.
create table if not exists public.trades (
  id          text        not null,
  user_id     uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  data        jsonb       not null,
  updated_at  timestamptz not null default now(),
  deleted     boolean     not null default false,
  primary key (user_id, id)
);

create index if not exists trades_user_updated on public.trades (user_id, updated_at);

-- Row level security: every person can only see and change their own rows.
alter table public.trades enable row level security;

drop policy if exists "own trades select" on public.trades;
drop policy if exists "own trades insert" on public.trades;
drop policy if exists "own trades update" on public.trades;
drop policy if exists "own trades delete" on public.trades;

create policy "own trades select" on public.trades for select to authenticated using (user_id = auth.uid());
create policy "own trades insert" on public.trades for insert to authenticated with check (user_id = auth.uid());
create policy "own trades update" on public.trades for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own trades delete" on public.trades for delete to authenticated using (user_id = auth.uid());

-- Private bucket for chart screenshots. Files live in a folder named after the user's id.
insert into storage.buckets (id, name, public)
values ('shots', 'shots', false)
on conflict (id) do nothing;

drop policy if exists "own shots select" on storage.objects;
drop policy if exists "own shots insert" on storage.objects;
drop policy if exists "own shots update" on storage.objects;
drop policy if exists "own shots delete" on storage.objects;

create policy "own shots select" on storage.objects for select to authenticated
  using (bucket_id = 'shots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own shots insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'shots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own shots update" on storage.objects for update to authenticated
  using (bucket_id = 'shots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own shots delete" on storage.objects for delete to authenticated
  using (bucket_id = 'shots' and (storage.foldername(name))[1] = auth.uid()::text);
