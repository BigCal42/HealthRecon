create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references systems(id) on delete cascade,
  full_name text not null,
  title text,
  department text,
  email text,
  phone text,
  seniority text,       -- e.g. 'exec' | 'director' | 'manager' | 'staff'
  role_in_deal text,    -- e.g. 'decision_maker' | 'influencer' | 'champion' | 'blocker' | 'other'
  notes text,
  is_primary boolean not null default false,
  created_at timestamptz default now()
);

