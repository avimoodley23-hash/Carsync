'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Vehicle, ServiceType } from '@/lib/supabase'
import { calculateStatus } from '@/lib/reminders'
import { AlertTriangle, Clock, CheckCircle, ChevronDown, ChevronUp, X, Wrench, Camera, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { DIY_GUIDES } from '@/lib/diy-guides'
import ServiceBookScanner from '@/components/ServiceBookScanner'

type ReminderFull = {
  id: string
  vehicle_id: string
  service_type_id: string
  due_date: string | null
  due_odometer: number | null
  status: 'upcoming' | 'due' | 'overdue'
  last_notified_at: string | null
  service_types: ServiceType
}

type LogModalData = { reminder: ReminderFull; vehicle: Vehicle } | null

export default function ServicesPage() {
  const router = useRouter()
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [reminders, setReminders] = useState<ReminderFull[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'overdue' | 'due' | 'upcoming'>('all')
  const [logModal, setLogModal] = useState<LogModalData>(null)
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0])
  const [logKm, setLogKm] = useState('')
  const [logCost, setLogCost] = useState('')
  const [logNotes, setLogNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedDIY, setExpandedDIY] = useState<string | null>(null)
  const [showScanner, setShowScanner] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: vs } = await supabase.from('vehicles').select('*').eq('user_id', user.id).order('created_at').limit(1)
      if (!vs || vs.length === 0) { router.push('/onboarding'); return }
      setVehicle(vs[0])
      setLogKm(String(vs[0].current_odometer))
      await load(vs[0])
      setLoading(false)
    }
    init()
  }, [])

  const load = async (v: Vehicle) => {
    const { data } = await supabase.from('reminders').select('*, service_types(*)').eq('vehicle_id', v.id)
    if (data) {
      const updated = data.map((r: any) => ({
        ...r, status: calculateStatus(r, r.service_types, v.current_odometer),
      })) as ReminderFull[]
      updated.sort((a, b) => {
        const order = { overdue: 0, due: 1, upcoming: 2 }
        return order[a.status] - order[b.status]
      })
      setReminders(updated)
    }
  }

  const openLog = (r: ReminderFull) => {
    setLogModal({ reminder: r, vehicle: vehicle! })
    setLogDate(new Date().toISOString().split('T')[0])
    setLogKm(String(vehicle!.current_odometer))
    setLogCost('')
    setLogNotes('')
  }

  const handleLog = async () => {
    if (!logModal || !logKm) { toast.error('Enter odometer reading'); return }
    setSaving(true)
    const { reminder, vehicle: v } = logModal
    const svc = reminder.service_types
    const km = parseInt(logKm)

    const { error: logErr } = await supabase.from('service_logs').insert({
      vehicle_id: v.id,
      service_type_id: reminder.service_type_id,
      performed_at: logDate,
      odometer_at_service: km,
      cost: logCost ? parseFloat(logCost) : null,
      notes: logNotes || null,
    })
    if (logErr) { toast.error(logErr.message); setSaving(false); return }

    if (km > v.current_odometer) {
      await supabase.from('vehicles').update({ current_odometer: km }).eq('id', v.id)
      setVehicle(prev => prev ? { ...prev, current_odometer: km } : prev)
    }

    const performed = new Date(logDate)
    let dueDate: string | null = null
    let dueOdometer: number | null = null
    if (svc.interval_months) {
      const d = new Date(performed)
      d.setMonth(d.getMonth() + svc.interval_months)
      dueDate = d.toISOString().split('T')[0]
    }
    if (svc.interval_km) dueOdometer = km + svc.interval_km

    await supabase.from('reminders').update({
      due_date: dueDate, due_odometer: dueOdometer, status: 'upcoming',
    }).eq('id', reminder.id)

    toast.success(`${svc.name} logged! Next due ${dueDate ?? `at ${dueOdometer?.toLocaleString()} km`}`)
    setLogModal(null)
    await load(vehicle!)
    setSaving(false)
  }

  const handleScanExtracted = (data: {
    date: string | null; odometer: number | null; serviceType: string | null;
    cost: number | null; notes: string | null; workshop: string | null
  }) => {
    setShowScanner(false)
    if (data.date) setLogDate(data.date)
    if (data.odometer) setLogKm(String(data.odometer))
    if (data.cost) setLogCost(String(data.cost))
    if (data.notes) setLogNotes(data.notes)
    if (data.serviceType) {
      const match = reminders.find(r =>
        r.service_types.name.toLowerCase().includes(data.serviceType!.toLowerCase()) ||
        data.serviceType!.toLowerCase().includes(r.service_types.name.toLowerCase())
      )
      if (match) {
        setLogModal({ reminder: match, vehicle: vehicle! })
        toast.success(`Found match: ${match.service_types.name} — fill in any remaining details`)
      } else {
        toast.info(`Detected: ${data.serviceType} — select which service to log`)
      }
    }
  }

  const filtered = reminders.filter(r => filter === 'all' || r.status === filter)

  const statusCfg = {
    overdue: { color: '#ef4444', bg: '#ef444422', label: 'Overdue', Icon: AlertTriangle },
    due: { color: '#f59e0b', bg: '#f59e0b22', label: 'Due soon', Icon: Clock },
    upcoming: { color: '#22c55e', bg: '#22c55e22', label: 'OK', Icon: CheckCircle },
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: '52px 20px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f5f5f5' }}>Services</h1>
          <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
            {vehicle?.year} {vehicle?.make} {vehicle?.model} · {vehicle?.current_odometer.toLocaleString()} km
          </p>
        </div>
        <button
          onClick={() => setShowScanner(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12,
            color: '#f5f5f5', fontSize: 13, fontWeight: 500, cursor: 'pointer', marginTop: 8,
          }}
        >
          <Camera size={16} color="#ff6b2b" />
          Scan Book
        </button>
      </div>

      {/* Filter pills */}
      <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8 }}>
        {(['all', 'overdue', 'due', 'upcoming'] as const).map(f => {
          const count = f === 'all' ? reminders.length : reminders.filter(r => r.status === f).length
          const active = filter === f
          const color = f === 'overdue' ? '#ef4444' : f === 'due' ? '#f59e0b' : f === 'upcoming' ? '#22c55e' : '#ff6b2b'
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              background: active ? color : '#1a1a1a',
              color: active ? 'white' : '#888',
              border: `1px solid ${active ? color : '#2a2a2a'}`,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              <span style={{ fontSize: 11, opacity: 0.8 }}>({count})</span>
            </button>
          )
        })}
      </div>

      {/* Service cards */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(r => {
          const cfg = statusCfg[r.status]
          const Icon = cfg.Icon
          const diyGuide = DIY_GUIDES[r.service_types?.name]
          const isDIYOpen = expandedDIY === r.id

          return (
            <div key={r.id} style={{
              background: '#1a1a1a', border: `1px solid ${r.status !== 'upcoming' ? cfg.color + '44' : '#2a2a2a'}`,
              borderRadius: 16, overflow: 'hidden',
            }}>
              {/* Main card row */}
              <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={20} color={cfg.color} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: '#f5f5f5' }}>{r.service_types?.name}</p>
                      {r.service_types?.is_critical && (
                        <span style={{ fontSize: 10, color: '#ef4444', background: '#ef444422', padding: '2px 6px', borderRadius: 10 }}>Critical</span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: cfg.color, marginTop: 2 }}>
                      {cfg.label}
                      {r.due_date && ` · ${new Date(r.due_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                      {r.due_odometer && ` · ${r.due_odometer.toLocaleString()} km`}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {diyGuide && (
                    <button
                      onClick={() => setExpandedDIY(isDIYOpen ? null : r.id)}
                      style={{
                        width: 36, height: 36, background: isDIYOpen ? '#ff6b2b22' : '#2a2a2a',
                        border: `1px solid ${isDIYOpen ? '#ff6b2b44' : '#333'}`,
                        borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      }}
                      title="DIY Guide"
                    >
                      <BookOpen size={16} color={isDIYOpen ? '#ff6b2b' : '#888'} />
                    </button>
                  )}
                  <button
                    onClick={() => openLog(r)}
                    style={{
                      padding: '8px 14px', background: '#ff6b2b', border: 'none', borderRadius: 10,
                      color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>

              {/* DIY Guide expandable */}
              {diyGuide && isDIYOpen && (
                <div style={{ borderTop: '1px solid #2a2a2a', padding: '16px' }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Wrench size={16} color="#ff6b2b" />
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#f5f5f5' }}>DIY Guide</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{
                        fontSize: 11, padding: '3px 8px', borderRadius: 8,
                        background: diyGuide.difficulty === 'Easy' ? '#22c55e22' : diyGuide.difficulty === 'Medium' ? '#f59e0b22' : '#ef444422',
                        color: diyGuide.difficulty === 'Easy' ? '#22c55e' : diyGuide.difficulty === 'Medium' ? '#f59e0b' : '#ef4444',
                      }}>{diyGuide.difficulty}</span>
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 8, background: '#2a2a2a', color: '#888' }}>
                        {diyGuide.time}
                      </span>
                    </div>
                  </div>

                  {!diyGuide.canDIY ? (
                    <p style={{ fontSize: 13, color: '#f59e0b', background: '#f59e0b11', padding: '10px 12px', borderRadius: 10 }}>
                      This service requires a professional mechanic — safety-critical components are involved.
                    </p>
                  ) : (
                    <>
                      {/* Tools needed */}
                      {diyGuide.tools && diyGuide.tools.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <p style={{ fontSize: 12, color: '#888', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tools needed</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {diyGuide.tools.map(t => (
                              <span key={t} style={{ fontSize: 12, padding: '3px 8px', background: '#2a2a2a', color: '#ccc', borderRadius: 8 }}>{t}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Steps */}
                      <div style={{ marginBottom: 12 }}>
                        <p style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Steps</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {diyGuide.steps.map((step, i) => (
                            <div key={i} style={{ display: 'flex', gap: 10 }}>
                              <div style={{
                                width: 22, height: 22, borderRadius: '50%', background: '#ff6b2b22',
                                color: '#ff6b2b', fontSize: 11, fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                              }}>{i + 1}</div>
                              <p style={{ fontSize: 13, color: '#ccc', lineHeight: 1.5 }}>{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tips */}
                      {diyGuide.tips && diyGuide.tips.length > 0 && (
                        <div style={{ background: '#ff6b2b0d', border: '1px solid #ff6b2b22', borderRadius: 10, padding: '10px 12px' }}>
                          <p style={{ fontSize: 12, color: '#ff6b2b', fontWeight: 600, marginBottom: 6 }}>Pro tips</p>
                          {diyGuide.tips.map((tip, i) => (
                            <p key={i} style={{ fontSize: 12, color: '#ccc', marginBottom: i < diyGuide.tips.length - 1 ? 4 : 0 }}>• {tip}</p>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Log Modal */}
      {logModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200,
          display: 'flex', alignItems: 'flex-end',
        }}>
          <div style={{
            background: '#1a1a1a', borderRadius: '24px 24px 0 0', width: '100%',
            padding: '24px 20px 40px', maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f5f5f5' }}>Log Service</h3>
                <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{logModal.reminder.service_types?.name}</p>
              </div>
              <button onClick={() => setLogModal(null)} style={{ background: '#2a2a2a', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={18} color="#888" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="cs-label">Date</label>
                  <input className="cs-input" type="date" value={logDate} onChange={e => setLogDate(e.target.value)} />
                </div>
                <div>
                  <label className="cs-label">Odometer (km)</label>
                  <input className="cs-input" type="number" value={logKm} onChange={e => setLogKm(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="cs-label">Cost (R) — optional</label>
                <input className="cs-input" type="number" value={logCost} onChange={e => setLogCost(e.target.value)} placeholder="0.00" step="0.01" />
              </div>
              <div>
                <label className="cs-label">Notes — optional</label>
                <textarea
                  className="cs-input"
                  value={logNotes}
                  onChange={e => setLogNotes(e.target.value)}
                  placeholder="e.g. Done at Toyota dealer, used 5W-30..."
                  rows={3}
                  style={{ resize: 'none' }}
                />
              </div>
              <button
                onClick={handleLog}
                disabled={saving}
                className="cs-btn-primary"
                style={{ marginTop: 4 }}
              >
                {saving ? 'Saving...' : 'Mark as Done'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Book Scanner Modal */}
      {showScanner && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 300,
          display: 'flex', alignItems: 'flex-end',
        }}>
          <div style={{
            background: '#1a1a1a', borderRadius: '24px 24px 0 0', width: '100%',
            padding: '24px 20px 40px', maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f5f5f5' }}>Scan Service Book</h3>
                <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Take a photo or upload a page</p>
              </div>
              <button onClick={() => setShowScanner(false)} style={{ background: '#2a2a2a', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={18} color="#888" />
              </button>
            </div>
            <ServiceBookScanner onExtracted={handleScanExtracted} onClose={() => setShowScanner(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
