'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Vehicle, UserPreferences } from '@/lib/supabase'
import { LogOut, ChevronRight, Car, Plus } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

type ServiceLog = { id: string; performed_at: string; odometer_at_service: number; cost: number | null; service_types: { name: string } }

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [recentLogs, setRecentLogs] = useState<ServiceLog[]>([])
  const [prefs, setPrefs] = useState<Partial<UserPreferences>>({ email_reminders_enabled: true, reminder_days_before: 7 })
  const [loading, setLoading] = useState(true)
  const [savingPrefs, setSavingPrefs] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/login'); return }
      setUser(u)

      const { data: vs } = await supabase.from('vehicles').select('*').eq('user_id', u.id).order('created_at')
      setVehicles(vs ?? [])
      if (vs && vs.length > 0) {
        setVehicle(vs[0])
        const { data: logs } = await supabase
          .from('service_logs').select('*, service_types(name)')
          .eq('vehicle_id', vs[0].id)
          .order('performed_at', { ascending: false })
          .limit(5)
        setRecentLogs((logs ?? []) as ServiceLog[])
      }

      const { data: p } = await supabase.from('user_preferences').select('*').eq('user_id', u.id).single()
      if (p) setPrefs(p)
      setLoading(false)
    }
    init()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const savePrefs = async () => {
    setSavingPrefs(true)
    const { error } = await supabase.from('user_preferences').upsert({ ...prefs, user_id: user.id }, { onConflict: 'user_id' })
    if (error) { toast.error('Failed to save'); } else { toast.success('Saved!') }
    setSavingPrefs(false)
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999999' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 100 }}>
      <div style={{ padding: '52px 20px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111111' }}>Profile</h1>
        <p style={{ fontSize: 13, color: '#666666', marginTop: 2 }}>{user?.email}</p>
      </div>

      {/* Vehicle cards */}
      <div style={{ padding: '0 20px', marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#999999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Your Vehicles</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {vehicles.map(v => (
            <div key={v.id} style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: 20, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F2FFD6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Car size={20} color="#6B8F0E" />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#111111' }}>{v.year} {v.make} {v.model}</p>
                  <p style={{ fontSize: 12, color: '#666666', marginTop: 1 }}>
                    {v.current_odometer.toLocaleString()} km
                    {(v as any).plate && ` · ${(v as any).plate}`}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} color="#CCCCCC" />
            </div>
          ))}
          <Link href="/onboarding" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'transparent', border: '1.5px dashed #D5D5D0', borderRadius: 20,
            padding: '14px', textDecoration: 'none', color: '#999999', fontSize: 14,
          }}>
            <Plus size={16} /> Add another vehicle
          </Link>
        </div>
      </div>

      {/* Service history */}
      {recentLogs.length > 0 && (
        <div style={{ padding: '0 20px', marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#999999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Recent Service History</p>
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
            {recentLogs.map((log, i) => (
              <div key={log.id} style={{ padding: '12px 16px', borderBottom: i < recentLogs.length - 1 ? '1px solid #F0F0EB' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 14, color: '#111111' }}>{log.service_types?.name}</p>
                  <p style={{ fontSize: 12, color: '#666666', marginTop: 1 }}>
                    {new Date(log.performed_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}{log.odometer_at_service.toLocaleString()} km
                  </p>
                </div>
                {log.cost && <p style={{ fontSize: 13, fontWeight: 600, color: '#16A34A' }}>R{log.cost.toFixed(0)}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notification prefs */}
      <div style={{ padding: '0 20px', marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#999999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Notifications</p>
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: 20, padding: '16px', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111111' }}>Email Reminders</p>
              <p style={{ fontSize: 12, color: '#666666', marginTop: 2 }}>Get notified when services are due</p>
            </div>
            <button
              onClick={() => setPrefs(p => ({ ...p, email_reminders_enabled: !p.email_reminders_enabled }))}
              style={{
                width: 46, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                background: prefs.email_reminders_enabled ? '#CBFF4D' : '#E8E8E3',
                transition: 'background 0.2s', position: 'relative', flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: 3, left: prefs.email_reminders_enabled ? 23 : 3,
                width: 20, height: 20, borderRadius: '50%', background: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                transition: 'left 0.2s',
              }} />
            </button>
          </div>
          {prefs.email_reminders_enabled && (
            <div>
              <p style={{ fontSize: 12, color: '#666666', marginBottom: 8 }}>
                Remind me <strong style={{ color: '#111111' }}>{prefs.reminder_days_before}</strong> days before due
              </p>
              <input
                type="range" min={1} max={30}
                value={prefs.reminder_days_before}
                onChange={e => setPrefs(p => ({ ...p, reminder_days_before: parseInt(e.target.value) }))}
                style={{ width: '100%', accentColor: '#CBFF4D' }}
              />
            </div>
          )}
          <button onClick={savePrefs} disabled={savingPrefs} className="cs-btn-primary" style={{ marginTop: 16 }}>
            {savingPrefs ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Sign out */}
      <div style={{ padding: '0 20px' }}>
        <button
          onClick={handleSignOut}
          style={{ width: '100%', padding: '14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 20, color: '#DC2626', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  )
}
