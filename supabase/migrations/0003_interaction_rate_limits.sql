create table if not exists interaction_rate_limits (
  action       text not null,
  ip_hash      text not null,
  window_start date not null default current_date,
  count        integer not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (action, ip_hash, window_start)
);

create index if not exists interaction_rate_limits_updated_idx
  on interaction_rate_limits (updated_at);

alter table interaction_rate_limits enable row level security;

create or replace function refresh_skill_stats() returns void
  language sql security definer
  set search_path = public
as $$
  refresh materialized view concurrently skill_stats;
$$;

create or replace function try_consume_interaction(
  p_action text,
  p_ip_hash text,
  p_max_events integer
) returns boolean
  language plpgsql security definer
  set search_path = public
as $$
declare
  consumed integer;
begin
  insert into interaction_rate_limits (action, ip_hash, window_start, count, updated_at)
  values (p_action, p_ip_hash, current_date, 1, now())
  on conflict (action, ip_hash, window_start)
  do update set
    count = interaction_rate_limits.count + 1,
    updated_at = now()
  where interaction_rate_limits.count < p_max_events
  returning count into consumed;

  return consumed is not null and consumed <= p_max_events;
end;
$$;
