'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, Vehicle, Reminder, ServiceType } from '@/lib/supabase'
import { calculateStatus } from '@/lib/reminders'
import { AlertTriangle, Clock, CheckCircle, Plus, Fuel, ChevronRight, Bell, Gauge } from 'lucide-react'
import WeeklyCheckin from '@/components/WeeklyCheckin'
import { registerPushNotifications } from '@/lib/push'
import { toast } from 'sonner'

type ReminderFull = Reminder & { service_types: ServiceType }

function HealthRing({ score }: { score: number }) {
  const r = 70
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 75 ? '#16A34A' : score >= 40 ? '#D97706' : '#DC2626'
  const strokeColor = score >= 75 ? '#22C55E' : score >= 40 ? '#F59E0B' : '#EF4444'
  const label = score >= 75 ? 'Great shape' : score >= 40 ? 'Needs attention' : 'Action required'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 16px' }}>
      <div style={{ position: 'relative', width: 180, height: 180 }}>
        <svg width="180" height="180" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="90" cy="90" r={r} fill="none" stroke="#E8E8E3" strokeWidth="14" />
          <circle cx="90" cy="90" r={r} fill="none" stroke={strokeColor} strokeWidth="14"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease', filter: `drop-shadow(0 0 10px ${strokeColor}44)` }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 44, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 12, color: '#999999', marginTop: 2 }}>/ 100</span>
        </div>
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, color, marginTop: 4, letterSpacing: '0.02em' }}>{label}</span>
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

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999999' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: '52px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 13, color: '#666666' }}>Your vehicle</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#111111', marginTop: 2 }}>
            {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'No vehicle'}
          </p>
        </div>
        <Link href="/onboarding" style={{ width: 38, height: 38, borderRadius: 12, background: '#FFFFFF', border: '1px solid #E5E5E0', boxShadow: 'var(--shadow-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
          <Plus size={18} color="#666666" />
        </Link>
      </div>

      {/* Vehicle tabs */}
      {vehicles.length > 1 && (
        <div style={{ padding: '12px 20px 0', display: 'flex', gap: 8, overflowX: 'auto' }}>
          {vehicles.map(v => (
            <button key={v.id} onClick={() => { setVehicle(v); loadReminders(v) }} style={{
              padding: '6px 16px', borderRadius: 100, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              background: vehicle?.id === v.id ? '#CBFF4D' : '#FFFFFF',
              color: vehicle?.id === v.id ? '#111111' : '#666666',
              border: `1px solid ${vehicle?.id === v.id ? '#CBFF4D' : '#E5E5E0'}`,
            }}>
              {v.make} {v.model}
            </button>
          ))}
        </div>
      )}

      {/* Health Ring */}
      <div style={{ padding: '8px 20px 0' }}>
        <HealthRing score={healthScore} />
      </div>

      {/* Stats */}
      <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Overdue', value: reminders.filter(r => r.status === 'overdue').length, color: '#DC2626', border: '#FECACA' },
          { label: 'Due soon', value: reminders.filter(r => r.status === 'due').length, color: '#D97706', border: '#FDE68A' },
          { label: 'All good', value: reminders.filter(r => r.status === 'upcoming').length, color: '#16A34A', border: '#BBF7D0' },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#FFFFFF', border: `1px solid ${stat.border}`, borderRadius: 16, padding: '12px 10px', textAlign: 'center', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: '#666666', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Push notification prompt */}
      {showPushPrompt && (
        <div style={{ margin: '0 20px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 16, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Bell size={16} color="#3B82F6" />
                <p style={{ fontSize: 14, fontWeight: 600, color: '#111111' }}>Enable notifications</p>
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
        <div style={{ margin: '0 20px 16px', background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: 16, padding: '16px', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Gauge size={16} color="#D97706" />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#111111' }}>Update your odometer</p>
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
            <button onClick={handleOdometerUpdate} disabled={savingOdo} style={{ padding: '0 16px', background: '#CBFF4D', border: 'none', borderRadius: 10, color: '#111111', fontSize: 14, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
              {savingOdo ? '...' : 'Update'}
            </button>
            <button onClick={() => setShowOdometerNudge(false)} style={{ padding: '0 12px', background: 'transparent', border: '1px solid #E5E5E0', borderRadius: 10, color: '#666666', fontSize: 13, cursor: 'pointer' }}>
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Weekly check-in */}
      {vehicle && user && <WeeklyCheckin vehicleId={vehicle.id} userId={user.id} />}

      {/* Urgent items */}
      {urgent.length > 0 && (
        <div style={{ padding: '0 20px', marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#999999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Needs Attention</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {urgent.map(r => {
              const isOverdue = r.status === 'overdue'
              const color = isOverdue ? '#EF4444' : '#F59E0B'
              const textColor = isOverdue ? '#DC2626' : '#D97706'
              const bgColor = isOverdue ? '#FEF2F2' : '#FFFBEB'
              const borderColor = isOverdue ? '#FECACA' : '#FDE68A'
              const Icon = isOverdue ? AlertTriangle : Clock
              return (
                <Link key={r.id} href="/services" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: 20, textDecoration: 'none',
                  background: '#FFFFFF', border: `1px solid ${borderColor}`,
                  boxShadow: 'var(--shadow-card)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={20} color={color} />
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#111111' }}>{r.service_types?.name}</p>
                      <p style={{ fontSize: 12, color: textColor, marginTop: 1 }}>{isOverdue ? 'Overdue' : 'Due soon'}{r.service_types?.is_critical ? ' · Critical' : ''}</p>
                    </div>
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
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 20, padding: '20px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-card)' }}>
            <CheckCircle size={24} color="#22C55E" />
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#16A34A' }}>All services up to date</p>
              <p style={{ fontSize: 13, color: '#666666', marginTop: 2 }}>Your car is looking good!</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ padding: '0 20px' }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#999999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Quick Actions</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Link href="/services" style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: 20, padding: '16px', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: 'var(--shadow-card)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F2FFD6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={20} color="#6B8F0E" />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#111111' }}>Log Service</p>
            <p style={{ fontSize: 12, color: '#666666' }}>Mark as done</p>
          </Link>
          <Link href="/fuel" style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: 20, padding: '16px', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: 'var(--shadow-card)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Fuel size={20} color="#3B82F6" />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#111111' }}>Log Fuel</p>
            <p style={{ fontSize: 12, color: '#666666' }}>Track fill-ups</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
