import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'
)

// Server-side client with service role (for cron jobs)
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Types
export type Vehicle = {
  id: string
  user_id: string
  vin: string
  make: string
  model: string
  year: number
  engine: string | null
  trim: string | null
  current_odometer: number
  odometer_unit: 'km' | 'miles'
  created_at: string
}

export type ServiceType = {
  id: string
  name: string
  interval_months: number | null
  interval_km: number | null
  warning_days: number
  is_critical: boolean
  description: string | null
}

export type ServiceLog = {
  id: string
  vehicle_id: string
  service_type_id: string
  performed_at: string
  odometer_at_service: number
  cost: number | null
  notes: string | null
  created_at: string
  service_types?: ServiceType
}

export type Reminder = {
  id: string
  vehicle_id: string
  service_type_id: string
  due_date: string | null
  due_odometer: number | null
  status: 'upcoming' | 'due' | 'overdue'
  last_notified_at: string | null
  service_types?: ServiceType
}

export type UserPreferences = {
  id: string
  user_id: string
  email_reminders_enabled: boolean
  reminder_days_before: number
  critical_only: boolean
  digest_frequency: 'daily' | 'weekly' | 'never'
}

export type Recall = {
  id: string
  vehicle_id: string
  nhtsa_campaign_id: string
  component: string
  summary: string
  remedy: string | null
  report_date: string | null
}
