-- Prayer wall table for the Betel Manchester app.
-- Run this once in Supabase: Project → SQL Editor → New query → paste → Run.
--
-- How it works:
--  * Anyone using the app can ADD a request (it arrives with approved = false).
--  * Only APPROVED requests are shown on the prayer wall.
--  * To approve one: Table Editor → prayer_requests → tick "approved" on that row.
--  * To remove one: delete the row.

create table if not exists public.prayer_requests (
  id          bigint generated always as identity primary key,
  first_name  text check (char_length(first_name) <= 40),
  request     text not null check (char_length(request) between 1 and 1000),
  approved    boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.prayer_requests enable row level security;

-- The app (anonymous) may insert new, unapproved requests only.
create policy "app can submit requests"
  on public.prayer_requests for insert
  to anon
  with check (approved = false);

-- The app (anonymous) may read approved requests only.
create policy "app can read approved requests"
  on public.prayer_requests for select
  to anon
  using (approved = true);
