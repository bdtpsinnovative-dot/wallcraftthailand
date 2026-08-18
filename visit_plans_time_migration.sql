-- Run this once in the Supabase SQL Editor.
-- Times are kept as separate columns so other screens and notifications
-- can reuse them independently from the visit date.
alter table public.visit_plans
  add column if not exists start_time time without time zone,
  add column if not exists end_time time without time zone,
  add column if not exists client_request_id text;

create unique index if not exists visit_plans_client_request_id_key
  on public.visit_plans (client_request_id)
  where client_request_id is not null;
