-- CarSync Database Schema
-- Run this in Supabase SQL Editor

-- 1. Vehicles
create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  vin text not null,
  make text not null,
  model text not null,
  year integer not null,
  engine text,
  trim text,
  current_odometer integer not null default 0,
  odometer_unit text not null default 'km' check (odometer_unit in ('km', 'miles')),
  created_at timestamptz default now()
);
alter table vehicles enable row level security;
create policy "Users own their vehicles" on vehicles
  for all using (auth.uid() = user_id);

-- 2. Service Types (global, shared)
create table if not exists service_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  interval_months integer,
  interval_km integer,
  warning_days integer not null default 14,
  is_critical boolean not null default false,
  description text
);
alter table service_types enable row level security;
create policy "Anyone can read service types" on service_types
  for select using (true);
create policy "Anyone can insert service types" on service_types
  for insert with check (true);

-- 3. Service Logs
create table if not exists service_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles(id) on delete cascade not null,
  service_type_id uuid references service_types(id) not null,
  performed_at date not null,
  odometer_at_service integer not null,
  cost numeric(10,2),
  notes text,
  created_at timestamptz default now()
);
alter table service_logs enable row level security;
create policy "Users own their service logs" on service_logs
  for all using (
    exists (select 1 from vehicles v where v.id = service_logs.vehicle_id and v.user_id = auth.uid())
  );

-- 4. Reminders
create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles(id) on delete cascade not null,
  service_type_id uuid references service_types(id) not null,
  due_date date,
  due_odometer integer,
  status text not null default 'upcoming' check (status in ('upcoming', 'due', 'overdue')),
  last_notified_at timestamptz,
  created_at timestamptz default now()
);
alter table reminders enable row level security;
create policy "Users own their reminders" on reminders
  for all using (
    exists (select 1 from vehicles v where v.id = reminders.vehicle_id and v.user_id = auth.uid())
  );

-- 5. Recalls
create table if not exists recalls (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles(id) on delete cascade not null,
  nhtsa_campaign_id text,
  component text,
  summary text,
  remedy text,
  report_date date,
  created_at timestamptz default now()
);
alter table recalls enable row level security;
create policy "Users own their recalls" on recalls
  for all using (
    exists (select 1 from vehicles v where v.id = recalls.vehicle_id and v.user_id = auth.uid())
  );

-- 6. User Preferences
create table if not exists user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  email_reminders_enabled boolean not null default true,
  reminder_days_before integer not null default 7,
  critical_only boolean not null default false,
  digest_frequency text not null default 'never' check (digest_frequency in ('daily', 'weekly', 'never')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table user_preferences enable row level security;
create policy "Users own their preferences" on user_preferences
  for all using (auth.uid() = user_id);

-- 7. Notification History
create table if not exists notification_history (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles(id) on delete cascade not null,
  service_type_id uuid references service_types(id) not null,
  user_id uuid references auth.users(id) not null,
  status text,
  email_sent boolean default false,
  email_recipient text,
  sent_at timestamptz default now()
);
alter table notification_history enable row level security;
create policy "Users own their notification history" on notification_history
  for all using (auth.uid() = user_id);

-- Indexes for performance
create index if not exists idx_vehicles_user_id on vehicles(user_id);
create index if not exists idx_reminders_vehicle_id on reminders(vehicle_id);
create index if not exists idx_service_logs_vehicle_id on service_logs(vehicle_id);
create index if not exists idx_reminders_status on reminders(status);

-- 8. Fuel Logs
create table if not exists fuel_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles(id) on delete cascade not null,
  filled_at date not null,
  litres numeric(8,2) not null,
  price_per_litre numeric(6,2) not null,
  total_cost numeric(10,2) not null,
  odometer integer not null,
  full_tank boolean not null default true,
  notes text,
  created_at timestamptz default now()
);
alter table fuel_logs enable row level security;
create policy "Users own their fuel logs" on fuel_logs
  for all using (
    exists (select 1 from vehicles v where v.id = fuel_logs.vehicle_id and v.user_id = auth.uid())
  );
create index if not exists idx_fuel_logs_vehicle_id on fuel_logs(vehicle_id);

-- Add plate column to vehicles (if not exists)
alter table vehicles add column if not exists plate text;

-- 9. Weekly Check-ins (weekly + monthly checks streak)
create table if not exists weekly_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  vehicle_id uuid references vehicles(id) on delete cascade not null,
  week_key text not null,          -- format: YYYY-Wnn (e.g. 2025-W22)
  checks jsonb not null default '{}', -- { "oil": true, "coolant": false, ... }
  completed_at timestamptz default now(),
  unique (user_id, vehicle_id, week_key)
);
alter table weekly_checkins enable row level security;
create policy "Users own their checkins" on weekly_checkins
  for all using (auth.uid() = user_id);
create index if not exists idx_weekly_checkins_user_vehicle on weekly_checkins(user_id, vehicle_id);

-- 10. Push Subscriptions (Web Push VAPID)
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table push_subscriptions enable row level security;
create policy "Users own their push subscriptions" on push_subscriptions
  for all using (auth.uid() = user_id);
