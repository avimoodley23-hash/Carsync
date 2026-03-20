'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, Vehicle, Reminder, ServiceType } from '@/lib/supabase'
import { calculateStatus } from '@/lib/reminders'
import { AlertTriangle, Clock, CheckCircle, Fuel, ChevronRight, Bell, Gauge, Wrench, BarChart2, ChevronDown } from 'lucide-react'
import WeeklyCheckin from '@/components/WeeklyCheckin'
import { registerPushNotifications } from '@/lib/push'
import { toast } from 'sonner'

type ReminderFull = Reminder & { service_types: ServiceType }

function HealthRing({ score }: { score: number }) {
  const r = 64
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const strokeColor = score >= 75 ? '#22C55E' : score >= 40 ? '#F59E0B' : '#EF4444'
  const textColor = score >= 75 ? '#16A34A' : score >= 40 ? '#D97706' : '#DC2626'
  const label = score >= 75 ? 'Great shape' : score >= 40 ? 'Needs attention' : 'Action required'
  const trend = score >= 75 ? '↑ On track' : score >= 40 ? '↗ Improving' : '↓ Act now'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0 12px' }}>
      <div style={{ position: 'relative', width: 176, height: 176 }}>
        <svg width="176" height="176" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="88" cy="88" r={r} fill="none" stroke="#E8E8E3" strokeWidth="12" />
          <circle cx="88" cy="88" r={r} fill="none" stroke={strokeColor} strokeWidth="12"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease', filter: `drop-shadow(0 0 12px ${strokeColor}55)` }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{ fontSize: 56, fontWeight: 800, color: textColor, lineHeight: 1, letterSpacing: '-2px' }}>{score}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: textColor }}>%</span>
          </div>
          <span style={{ fontSize: 11, color: '#999999', marginTop: 2 }}>health</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: textColor }}>{label}</span>
        <span style={{ fontSize: 11, background: `${strokeColor}22`, color: textColor, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{trend}</span>
      </div>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [reminders, setReminders] = useState<ReminderFull[]>([])
  const [loading, setLoading] = useState(true)
  const [healthScore, setHealthScore] = useState(100)
  const [showPushPrompt, setShowPushPrompt] = useState(false)
  const [showOdometerNudge, setShowOdometerNudge] = useState(false)
  const [newOdometer, setNewOdometer] = useState('')
  const [savingOdo, setSavingOdo] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/login'); return }
      setUser(u)
      const { data: vs } = await supabase.from('vehicles').select('*').eq('user_id', u.id).order('created_at')
      if (!vs || vs.length === 0) { router.push('/onboarding'); return }
      setVehicles(vs)
      setVehicle(vs[0])
      setNewOdometer(String(vs[0].current_odometer))
      await loadReminders(vs[0])

      if ('Notification' in window && Notification.permission === 'default') {
        const seen = localStorage.getItem('push-prompt-seen')
        if (!seen) setShowPushPrompt(true)
      }

      const { data: lastLog } = await supabase
        .from('service_logs').select('created_at').eq('vehicle_id', vs[0].id)
        .order('created_at', { ascending: false }).limit(1)
      const { data: lastFuel } = await supabase
        .from('fuel_logs').select('created_at').eq('vehicle_id', vs[0].id)
        .order('created_at', { ascending: false }).limit(1)
      const lastActivity = [lastLog?.[0]?.created_at, lastFuel?.[0]?.created_at].filter(Boolean).sort().reverse()[0]
      if (!lastActivity || new Date().getTime() - new Date(lastActivity).getTime() > 7 * 24 * 60 * 60 * 1000) {
        setShowOdometerNudge(true)
      }
      setLoading(false)
    }
    init()
  }, [])

  const loadReminders = async (v: Vehicle) => {
    const { data } = await supabase.from('reminders').select('*, service_types(*)').eq('vehicle_id', v.id)
    if (data) {
      const updated = data.map((r: any) => ({ ...r, status: calculateStatus(r, r.service_types, v.current_odometer) })) as ReminderFull[]
      setReminders(updated)
      const overdue = updated.filter(r => r.status === 'overdue').length
      const due = updated.filter(r => r.status === 'due').length
      setHealthScore(Math.max(0, 100 - overdue * 15 - due * 5))
    }
  }

  const handleEnablePush = async () => {
    localStorage.setItem('push-prompt-seen', '1')
    setShowPushPrompt(false)
    const ok = await registerPushNotifications(user.id)
    if (ok) toast.success('Push notifications enabled!')
    else toast.error('Could not enable notifications — check browser settings')
  }

  const handleOdometerUpdate = async () => {
    if (!newOdometer || !vehicle) return
    setSavingOdo(true)
    const km = parseInt(newOdometer)
    if (km <= vehicle.current_odometer) { toast.error('Must be greater than current reading'); setSavingOdo(false); return }
    await supabase.from('vehicles').update({ current_odometer: km }).eq('id', vehicle.id)
    setVehicle(v => v ? { ...v, current_odometer: km } : v)
    setShowOdometerNudge(false)
    toast.success(`Odometer updated to ${km.toLocaleString()} km`)
    setSavingOdo(false)
  }

  const urgent = reminders.filter(r => r.status === 'overdue' || r.status === 'due')
    .sort((a, b) => (a.status === 'overdue' ? -1 : 1)).slice(0, 4)

  // Derive first name from email
  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]?.replace(/[._-]/g, ' ')?.split(' ')[0]
    || 'there'
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1)

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999999' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 110 }}>
      {/* Header */}
      <div style={{ padding: '52px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 13, color: '#999999', fontWeight: 500 }}>Good day,</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: '#111111', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
            Hi, {displayName}! 👋
          </p>
        </div>
        <Link href="/profile" style={{ textDecoration: 'none' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: '#CBFF4D',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(203,255,77,0.4)',
          }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#111111' }}>
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        </Link>
      </div>

      {/* Vehicle selector */}
      <div style={{ padding: '0 20px 16px' }}>
        {vehicles.length > 1 ? (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {vehicles.map(v => (
              <button key={v.id} onClick={() => { setVehicle(v); loadReminders(v) }} style={{
                padding: '6px 14px', borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, border: 'none',
                background: vehicle?.id === v.id ? '#111111' : '#FFFFFF',
                color: vehicle?.id === v.id ? '#CBFF4D' : '#666666',
                boxShadow: vehicle?.id === v.id ? '0 2px 8px rgba(0,0,0,0.15)' : 'var(--shadow-card)',
              }}>
                {v.year} {v.make} {v.model}
              </button>
            ))}
          </div>
        ) : vehicle ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#111111', borderRadius: 100, padding: '6px 14px' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#CBFF4D' }}>{vehicle.year} {vehicle.make} {vehicle.model}</span>
            <ChevronDown size={13} color="#CBFF4D" />
          </div>
        ) : null}
      </div>

      {/* Health Ring Card */}
      <div style={{ padding: '0 20px', marginBottom: 16 }}>
        <div style={{ background: '#FFFFFF', borderRadius: 28, border: '1px solid #E5E5E0', padding: '20px', boxShadow: 'var(--shadow-card)' }}>
          <HealthRing score={healthScore} />

          {/* Mini stats row */}
          <div style={{ display: 'flex', borderTop: '1px solid #F0F0EB', paddingTop: 16, gap: 0 }}>
            {[
              { label: 'Overdue', value: reminders.filter(r => r.status === 'overdue').length, color: '#DC2626' },
              { label: 'Due soon', value: reminders.filter(r => r.status === 'due').length, color: '#D97706' },
              { label: 'All good', value: reminders.filter(r => r.status === 'upcoming').length, color: '#16A34A' },
            ].map((s, i, arr) => (
              <div key={s.label} style={{
                flex: 1, textAlign: 'center',
                borderRight: i < arr.length - 1 ? '1px solid #F0F0EB' : 'none',
              }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#999999', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Push notification prompt */}
      {showPushPrompt && (
        <div style={{ margin: '0 20px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 20, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Bell size={16} color="#3B82F6" />
                <p style={{ fontSize: 14, fontWeight: 700, color: '#111111' }}>Enable notifications</p>
              </div>
              <p style={{ fontSize: 13, color: '#666666' }}>Get reminders when services are due — no spam, only what matters.</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={handleEnablePush} style={{ padding: '8px 16px', background: '#3B82F6', border: 'none', borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Enable</button>
                <button onClick={() => { localStorage.setItem('push-prompt-seen', '1'); setShowPushPrompt(false) }} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #E5E5E0', borderRadius: 10, color: '#666666', fontSize: 13, cursor: 'pointer' }}>Later</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Odometer nudge */}
      {showOdometerNudge && (
        <div style={{ margin: '0 20px 16px', background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: 20, padding: '16px', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Gauge size={16} color="#D97706" />
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111111' }}>Update your odometer</p>
          </div>
          <p style={{ fontSize: 13, color: '#666666', marginBottom: 12 }}>
            Current: <strong style={{ color: '#111111' }}>{vehicle?.current_odometer.toLocaleString()} km</strong> — keep it accurate for better reminders
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number"
              value={newOdometer}
              onChange={e => setNewOdometer(e.target.value)}
              className="cs-input"
              style={{ flex: 1 }}
              placeholder="New km reading"
            />
            <button onClick={handleOdometerUpdate} disabled={savingOdo} style={{ padding: '0 16px', background: '#CBFF4D', border: 'none', borderRadius: 12, color: '#111111', fontSize: 14, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              {savingOdo ? '...' : 'Update'}
            </button>
            <button onClick={() => setShowOdometerNudge(false)} style={{ padding: '0 12px', background: 'transparent', border: '1px solid #E5E5E0', borderRadius: 12, color: '#666666', fontSize: 13, cursor: 'pointer' }}>
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Urgent alert cards */}
      {urgent.length > 0 && (
        <div style={{ padding: '0 20px', marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#999999', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Needs Attention</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {urgent.map(r => {
              const isOverdue = r.status === 'overdue'
              const accentColor = isOverdue ? '#EF4444' : '#F59E0B'
              const textColor = isOverdue ? '#DC2626' : '#D97706'
              const bgColor = isOverdue ? '#FEF2F2' : '#FFFBEB'
              const Icon = isOverdue ? AlertTriangle : Clock
              return (
                <Link key={r.id} href="/services" style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 20, textDecoration: 'none',
                  background: '#FFFFFF',
                  borderLeft: `4px solid ${accentColor}`,
                  border: `1px solid ${isOverdue ? '#FECACA' : '#FDE68A'}`,
                  borderLeftWidth: 4,
                  boxShadow: 'var(--shadow-card)',
                }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={20} color={accentColor} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#111111' }}>{r.service_types?.name}</p>
                    <p style={{ fontSize: 12, color: textColor, marginTop: 2, fontWeight: 600 }}>
                      {isOverdue ? 'Overdue' : 'Due soon'}{r.service_types?.is_critical ? ' · Critical' : ''}
                    </p>
                  </div>
                  <ChevronRight size={16} color="#CCCCCC" />
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {urgent.length === 0 && (
        <div style={{ padding: '0 20px', marginBottom: 20 }}>
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 20, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-card)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={22} color="#22C55E" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#16A34A' }}>All services up to date</p>
              <p style={{ fontSize: 13, color: '#666666', marginTop: 2 }}>Your car is looking good!</p>
            </div>
          </div>
        </div>
      )}

      {/* Weekly check-in */}
      {vehicle && user && <WeeklyCheckin vehicleId={vehicle.id} userId={user.id} />}

      {/* Quick actions — horizontal scroll */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#999999', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, padding: '0 20px' }}>Quick Actions</p>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '4px 20px 8px', scrollbarWidth: 'none' }}>
          {[
            { href: '/services', icon: Wrench, label: 'Log Service', sub: 'Mark as done', iconBg: '#F2FFD6', iconColor: '#6B8F0E' },
            { href: '/fuel', icon: Fuel, label: 'Log Fuel', sub: 'Track fill-ups', iconBg: '#EFF6FF', iconColor: '#3B82F6' },
            { href: '/insights', icon: BarChart2, label: 'Insights', sub: 'View spend', iconBg: '#FEF9EC', iconColor: '#D97706' },
            { href: '/profile', icon: CheckCircle, label: 'Profile', sub: 'Settings', iconBg: '#F0FDF4', iconColor: '#16A34A' },
          ].map(({ href, icon: Icon, label, sub, iconBg, iconColor }) => (
            <Link key={href} href={href} style={{
              background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: 20,
              padding: '16px', textDecoration: 'none',
              display: 'flex', flexDirection: 'column', gap: 10,
              boxShadow: 'var(--shadow-card)',
              minWidth: 130, flexShrink: 0,
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={22} color={iconColor} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#111111' }}>{label}</p>
                <p style={{ fontSize: 12, color: '#999999', marginTop: 2 }}>{sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
