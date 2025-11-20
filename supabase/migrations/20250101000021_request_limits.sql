-- Request limits table for distributed rate limiting
-- Migration: 20250101000021_request_limits

create table if not exists request_limits (
  id uuid primary key default gen_random_uuid(),
  key text not null, -- composite key like "ip:endpoint" or "user:route"
  window_start timestamptz not null,
  count integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for efficient lookups by key and window_start
create index if not exists idx_request_limits_key_window on request_limits(key, window_start);

-- Index for cleanup of old windows
create index if not exists idx_request_limits_window_start on request_limits(window_start);

-- Function to update updated_at timestamp
create or replace function update_request_limits_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at
do $$
declare
  trigger_exists boolean;
begin
  select exists (
    select 1
    from pg_trigger
    where tgname = 'trigger_update_request_limits_updated_at'
  ) into trigger_exists;

  if not trigger_exists then
    execute $create$
      create trigger trigger_update_request_limits_updated_at
        before update on request_limits
        for each row
        execute function update_request_limits_updated_at()
    $create$;
  end if;
end;
$$;

-- Optional: Function to clean up old rate limit windows (older than 24 hours)
-- Can be called periodically via cron or scheduled job
create or replace function cleanup_old_request_limits()
returns integer as $$
declare
  deleted_count integer;
begin
  delete from request_limits
  where window_start < now() - interval '24 hours';
  
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$ language plpgsql;

