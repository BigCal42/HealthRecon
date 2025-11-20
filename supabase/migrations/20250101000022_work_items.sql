-- Work items table
-- Migration: 20250101000022_work_items
--
-- Lightweight worklist layer for tracking items from Today's Focus feed.
-- Per-system but displayed cross-system.

create table if not exists work_items (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references systems(id) on delete cascade,
  -- link back to the underlying object (signal_action, opportunity, interaction, etc.)
  source_type text not null,          -- e.g. 'signal_action' | 'opportunity' | 'interaction'
  source_id uuid not null,            -- id from the source table
  title text not null,
  description text,
  status text not null default 'open',  -- 'open' | 'snoozed' | 'done' | 'dropped'
  due_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists work_items_system_status_idx
  on work_items (system_id, status);

create index if not exists work_items_due_idx
  on work_items (due_at);

-- Enable RLS
alter table work_items enable row level security;

-- Policies for work_items table
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'work_items'
      and policyname = 'Authenticated users can read work_items'
  ) then
    execute $create$
      create policy "Authenticated users can read work_items"
        on work_items for select
        to authenticated
        using (true)
    $create$;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'work_items'
      and policyname = 'Authenticated users can insert work_items'
  ) then
    execute $create$
      create policy "Authenticated users can insert work_items"
        on work_items for insert
        to authenticated
        with check (true)
    $create$;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'work_items'
      and policyname = 'Authenticated users can update work_items'
  ) then
    execute $create$
      create policy "Authenticated users can update work_items"
        on work_items for update
        to authenticated
        using (true)
    $create$;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'work_items'
      and policyname = 'Authenticated users can delete work_items'
  ) then
    execute $create$
      create policy "Authenticated users can delete work_items"
        on work_items for delete
        to authenticated
        using (true)
    $create$;
  end if;
end;
$$;

