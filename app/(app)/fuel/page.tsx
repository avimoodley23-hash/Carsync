'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Vehicle } from '@/lib/supabase'
import { Fuel, Plus, X, Droplets } from 'lucide-react'
import { toast } from 'sonner'

type FuelLog = {
  id: string
  vehicle_id: string
  filled_at: string
  litres: number
  price_per_litre: number
  total_cost: number
  odometer: number
  full_tank: boolean
  notes: string | null
}

export default function FuelPage() {
  const router = useRouter()
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [logs, setLogs] = useState<FuelLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)

  const [litres, setLitres] = useState('')
  const [ppl, setPpl] = useState('')
  const [odometer, setOdometer] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [fullTank, setFullTank] = useState(true)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: vs } = await supabase.from('vehicles').select('*').eq('user_id', user.id).order('created_at').limit(1)
      if (!vs || vs.length === 0) { router.push('/onboarding'); return }
      setVehicle(vs[0])
      setOdometer(String(vs[0].current_odometer))
      await load(vs[0].id)
      setLoading(false)
    }
    init()
  }, [])

  const load = async (vehicleId: string) => {
    const { data } = await supabase.from('fuel_logs').select('*').eq('vehicle_id', vehicleId).order('filled_at', { ascending: false })
    setLogs(data ?? [])
  }

  const handleAdd = async () => {
    if (!litres || !ppl || !odometer) { toast.error('Fill in litres, price and odometer'); return }
    setSaving(true)
    const total = parseFloat(litres) * parseFloat(ppl)
    const { error } = await supabase.from('fuel_logs').insert({
      vehicle_id: vehicle!.id,
      filled_at: date,
      litres: parseFloat(litres),
      price_per_litre: parseFloat(ppl),
      total_cost: parseFloat(total.toFixed(2)),
      odometer: parseInt(odometer),
      full_tank: fullTank,
      notes: notes || null,
    })
    if (error) { toast.error(error.message); setSaving(false); return }

    if (parseInt(odometer) > vehicle!.current_odometer) {
      await supabase.from('vehicles').update({ current_odometer: parseInt(odometer) }).eq('id', vehicle!.id)
    }

    toast.success('Fuel logged!')
    setShowAdd(false)
    setLitres(''); setPpl(''); setNotes('')
    await load(vehicle!.id)
    setSaving(false)
  }

  const totalSpent = logs.reduce((s, l) => s + l.total_cost, 0)
  const totalLitres = logs.reduce((s, l) => s + l.litres, 0)
  const avgPpl = logs.length > 0 ? logs.reduce((s, l) => s + l.price_per_litre, 0) / logs.length : 0

  const fullLogs = logs.filter(l => l.full_tank).slice(0, 10)
  let avgEconomy = 0
  if (fullLogs.length >= 2) {
    const pairs = fullLogs.slice(0, -1).map((l, i) => {
      const prev = fullLogs[i + 1]
      const km = l.odometer - prev.odometer
      return km > 0 ? (l.litres / km) * 100 : null
    }).filter(Boolean) as number[]
    if (pairs.length > 0) avgEconomy = pairs.reduce((s, v) => s + v, 0) / pairs.length
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666666' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 100 }}>
      <div style={{ padding: '52px 20px 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111111' }}>Fuel</h1>
          <p style={{ fontSize: 13, color: '#666666', marginTop: 2 }}>{vehicle?.make} {vehicle?.model}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ width: 40, height: 40, borderRadius: 12, background: '#CBFF4D', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-fab)' }}
        >
          <Plus size={20} color="#111111" />
        </button>
      </div>

      {/* Stats */}
      <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total Spent', value: `R${totalSpent.toFixed(0)}`, sub: `${logs.length} fill-ups`, color: '#111111' },
          { label: 'Fuel Economy', value: avgEconomy > 0 ? `${avgEconomy.toFixed(1)} L` : '—', sub: 'per 100 km', color: avgEconomy > 0 ? '#111111' : '#888888' },
          { label: 'Total Litres', value: `${totalLitres.toFixed(0)}L`, sub: 'all time', color: '#3B82F6' },
          { label: 'Avg Price', value: avgPpl > 0 ? `R${avgPpl.toFixed(2)}` : '—', sub: 'per litre', color: '#111111' },
        ].map(s => (
          <div key={s.label} style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: 20, padding: 16, boxShadow: 'var(--shadow-card)' }}>
            <p style={{ fontSize: 12, color: '#666666', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</p>
            <p style={{ fontSize: 11, color: '#666666', marginTop: 2 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Fuel log */}
      <div style={{ padding: '0 20px' }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#666666', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Fill-up History</p>
        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Fuel size={40} color="#E5E5E0" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#666666', fontSize: 14 }}>No fill-ups logged yet</p>
            <button onClick={() => setShowAdd(true)} style={{ marginTop: 16, padding: '10px 20px', background: '#CBFF4D', border: 'none', borderRadius: 10, color: '#111111', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Log first fill-up
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {logs.map((log, i) => {
              const prev = logs[i + 1]
              const km = prev ? log.odometer - prev.odometer : null
              const economy = km && km > 0 && log.full_tank ? (log.litres / km) * 100 : null
              return (
                <div key={log.id} style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: 20, padding: '14px 16px', boxShadow: 'var(--shadow-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#111111' }}>
                        R{log.total_cost.toFixed(2)} · {log.litres}L
                      </p>
                      <p style={{ fontSize: 12, color: '#666666', marginTop: 2 }}>
                        R{log.price_per_litre.toFixed(2)}/L · {log.odometer.toLocaleString()} km
                        {economy ? ` · ${economy.toFixed(1)} L/100km` : ''}
                      </p>
                    </div>
                    <p style={{ fontSize: 12, color: '#666666' }}>
                      {new Date(log.filled_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  {log.notes && <p style={{ fontSize: 12, color: '#666666', marginTop: 6, fontStyle: 'italic' }}>"{log.notes}"</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div className="cs-sheet" style={{ background: '#FFFFFF', borderRadius: '28px 28px 0 0', width: '100%', padding: '24px 20px 40px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-elevated)' }}>
            {/* Drag handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#D5D5D0', margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111111' }}>Log Fill-up</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: '#F0F0EB', border: '1px solid #E5E5E0', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={18} color="#999999" />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="cs-label">Litres</label>
                  <input className="cs-input" type="number" value={litres} onChange={e => setLitres(e.target.value)} placeholder="e.g. 45.5" step="0.1" />
                </div>
                <div>
                  <label className="cs-label">Price per Litre (R)</label>
                  <input className="cs-input" type="number" value={ppl} onChange={e => setPpl(e.target.value)} placeholder="e.g. 22.50" step="0.01" />
                </div>
              </div>
              {litres && ppl && (
                <div style={{ background: '#F2FFD6', border: '1px solid #E8F5A1', borderRadius: 12, padding: '10px 14px' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#6B8F0E' }}>
                    Total: R{(parseFloat(litres) * parseFloat(ppl)).toFixed(2)}
                  </p>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="cs-label">Odometer (km)</label>
                  <input className="cs-input" type="number" value={odometer} onChange={e => setOdometer(e.target.value)} />
                </div>
                <div>
                  <label className="cs-label">Date</label>
                  <input className="cs-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
              </div>
              <button
                onClick={() => setFullTank(f => !f)}
                style={{
                  padding: '12px 16px',
                  background: fullTank ? '#EFF6FF' : '#F0F0EB',
                  border: `1px solid ${fullTank ? '#BFDBFE' : '#E5E5E0'}`,
                  borderRadius: 12, color: fullTank ? '#3B82F6' : '#666666',
                  cursor: 'pointer', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <Droplets size={16} />
                {fullTank ? 'Full tank' : 'Partial fill-up'}
              </button>
              <div>
                <label className="cs-label">Notes (optional)</label>
                <input className="cs-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Engen on N1, unleaded 95" />
              </div>
              <button onClick={handleAdd} disabled={saving} className="cs-btn-primary">
                {saving ? 'Saving...' : 'Log Fill-up'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
