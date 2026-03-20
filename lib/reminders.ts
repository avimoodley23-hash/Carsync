import { ServiceType, ServiceLog, Reminder } from './supabase'

export function calculateDueDate(
  serviceType: ServiceType,
  lastService: ServiceLog | null
): { dueDate: string | null; dueOdometer: number | null } {
  let dueDate: string | null = null
  let dueOdometer: number | null = null

  const now = new Date()

  if (serviceType.interval_months) {
    const base = lastService ? new Date(lastService.performed_at) : now
    const due = new Date(base)
    due.setMonth(due.getMonth() + serviceType.interval_months)
    dueDate = due.toISOString().split('T')[0]
  }

  if (serviceType.interval_km && lastService) {
    dueOdometer = lastService.odometer_at_service + serviceType.interval_km
  }

  return { dueDate, dueOdometer }
}

export function calculateStatus(
  reminder: Reminder,
  serviceType: ServiceType,
  currentOdometer: number
): 'upcoming' | 'due' | 'overdue' {
  const now = new Date()
  const warningDays = serviceType.warning_days ?? 7

  // Check date-based
  if (reminder.due_date) {
    const due = new Date(reminder.due_date)
    const daysUntil = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntil < 0) return 'overdue'
    if (daysUntil <= warningDays) return 'due'
  }

  // Check odometer-based
  if (reminder.due_odometer) {
    const kmUntil = reminder.due_odometer - currentOdometer
    const estimatedDaysUntil = kmUntil / 50 // assume ~50 km/day

    if (kmUntil <= 0) return 'overdue'
    if (estimatedDaysUntil <= warningDays) return 'due'
  }

  return 'upcoming'
}

export function formatDueIn(reminder: Reminder, currentOdometer: number): string {
  const now = new Date()
  const parts: string[] = []

  if (reminder.due_date) {
    const due = new Date(reminder.due_date)
    const days = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (days < 0) {
      parts.push(`${Math.abs(days)}d overdue`)
    } else {
      parts.push(`${days}d`)
    }
  }

  if (reminder.due_odometer) {
    const km = reminder.due_odometer - currentOdometer
    if (km < 0) {
      parts.push(`${Math.abs(km).toLocaleString()} km overdue`)
    } else {
      parts.push(`${km.toLocaleString()} km`)
    }
  }

  return parts.join(' / ') || 'Unknown'
}
