import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY ?? 'placeholder')

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`
  if (authHeader !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  let processed = 0, sent = 0, errors = 0

  try {
    // Get all vehicles with their user info
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('*, auth_users:user_id(email)')

    if (!vehicles) return NextResponse.json({ status: 'success', processed: 0, sent: 0, errors: 0, timestamp: new Date().toISOString() })

    for (const vehicle of vehicles) {
      processed++

      // Get user preferences
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', vehicle.user_id)
        .single()

      // Skip if reminders disabled
      if (prefs && !prefs.email_reminders_enabled) continue

      // Get user email
      const { data: { user } } = await supabase.auth.admin.getUserById(vehicle.user_id)
      const email = user?.email
      if (!email) continue

      // Get reminders with service types
      const { data: reminders } = await supabase
        .from('reminders')
        .select('*, service_types(*)')
        .eq('vehicle_id', vehicle.id)

      if (!reminders) continue

      const now = new Date()
      const warningDays = prefs?.reminder_days_before ?? 7

      for (const reminder of reminders) {
        const serviceType = reminder.service_types
        if (!serviceType) continue

        // Skip non-critical if critical_only is set
        if (prefs?.critical_only && !serviceType.is_critical) continue

        // Calculate due status
        let status: 'upcoming' | 'due' | 'overdue' = 'upcoming'
        if (reminder.due_date) {
          const due = new Date(reminder.due_date)
          const daysUntil = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          if (daysUntil < 0) status = 'overdue'
          else if (daysUntil <= warningDays) status = 'due'
        }
        if (reminder.due_odometer) {
          const kmUntil = reminder.due_odometer - vehicle.current_odometer
          if (kmUntil <= 0) status = 'overdue'
          else if (kmUntil / 50 <= warningDays) status = 'due'
        }

        if (status === 'upcoming') continue

        // Check cooldown (3 days for due, 1 day for overdue)
        if (reminder.last_notified_at) {
          const lastNotified = new Date(reminder.last_notified_at)
          const daysSince = Math.floor((now.getTime() - lastNotified.getTime()) / (1000 * 60 * 60 * 24))
          const cooldown = status === 'overdue' ? 1 : 3
          if (daysSince < cooldown) continue
        }

        // Send email
        try {
          const isCritical = serviceType.is_critical
          const vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`
          const subject = status === 'overdue'
            ? `🚨 ${serviceType.name} is overdue — ${vehicleName}`
            : isCritical
            ? `⚠️ Upcoming: ${serviceType.name} — ${vehicleName}`
            : `📅 ${serviceType.name} coming up — ${vehicleName}`

          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://carsync.vercel.app'

          const html = `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
              <h2 style="color: ${status === 'overdue' ? '#dc2626' : '#2563eb'}">${subject}</h2>
              <p>Hi,</p>
              <p>Your <strong>${vehicleName}</strong> is ${status === 'overdue' ? 'overdue for' : 'due for'} a <strong>${serviceType.name}</strong>.</p>
              ${isCritical ? `<p style="color: #dc2626; font-weight: bold;">⚠️ This is a critical safety service. Please schedule it as soon as possible.</p>` : ''}
              ${reminder.due_date ? `<p>Due date: <strong>${new Date(reminder.due_date).toLocaleDateString()}</strong></p>` : ''}
              ${reminder.due_odometer ? `<p>Due at: <strong>${reminder.due_odometer.toLocaleString()} ${vehicle.odometer_unit}</strong> (current: ${vehicle.current_odometer.toLocaleString()} ${vehicle.odometer_unit})</p>` : ''}
              <a href="${appUrl}/dashboard" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">View Dashboard →</a>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">You're receiving this because you have email reminders enabled in CarSync. <a href="${appUrl}/settings">Manage preferences</a></p>
            </div>
          `

          await resend.emails.send({
            from: 'CarSync <reminders@carsync.co.za>',
            to: email,
            subject,
            html,
          })

          // Update last_notified_at
          await supabase
            .from('reminders')
            .update({ last_notified_at: now.toISOString(), status })
            .eq('id', reminder.id)

          // Log to notification_history
          await supabase.from('notification_history').insert({
            vehicle_id: vehicle.id,
            service_type_id: serviceType.id,
            user_id: vehicle.user_id,
            status,
            email_sent: true,
            email_recipient: email,
            sent_at: now.toISOString(),
          })

          sent++
        } catch (emailErr) {
          console.error('Email send error:', emailErr)
          errors++
        }
      }
    }
  } catch (err) {
    console.error('Cron error:', err)
    errors++
  }

  return NextResponse.json({
    status: 'success',
    processed,
    sent,
    errors,
    timestamp: new Date().toISOString(),
  })
}
