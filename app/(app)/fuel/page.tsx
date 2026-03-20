'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Vehicle } from '@/lib/supabase'
import { Fuel, Plus, X, TrendingDown, TrendingUp, Droplets } from 'lucide-react'
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

    // Update vehicle odometer
    if (parseInt(odometer) > vehicle!.current_odometer) {
      await supabase.from('vehicles').update({ current_odometer: parseInt(odometer) }).eq('id', vehicle!.id)
    }

    toast.success('Fuel logged!')
    setShowAdd(false)
    setLitres(''); setPpl(''); setNotes('')
    await load(vehicle!.id)
    setSaving(false)
  }

  // Stats
  const totalSpent = logs.reduce((s, l) => s + l.total_cost, 0)
  const totalLitres = logs.reduce((s, l) => s + l.litres, 0)
  const avgPpl = logs.length > 0 ? logs.reduce((s, l) => s + l.price_per_litre, 0) / logs.length : 0

  // Fuel economy (L/100km) from consecutive full tank fill-ups
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

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 100 }}>
      <div style={{ padding: '52px 20px 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f5f5f5' }}>Fuel</h1>
          <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{vehicle?.make} {vehicle?.model}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ width: 40, height: 40, borderRadius: 12, background: '#ff6b2b', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Plus size={20} color="white" />
        </button>
      </div>

      {/* Stats */}
      <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 16 }}>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Total Spent</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#f5f5f5' }}>R{totalSpent.toFixed(0)}</p>
          <p style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{logs.length} fill-ups</p>
        </div>
        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 16 }}>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Fuel Economy</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: avgEconomy > 0 ? '#f5f5f5' : '#555' }}>
            {avgEconomy > 0 ? `${avgEconomy.toFixed(1)} L` : '—'}
          </p>
          <p style={{ fontSize: 11, color: '#555', marginTop: 2 }}>per 100 km</p>
        </div>
        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 16 }}>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Total Litres</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#3b82f6' }}>{totalLitres.toFixed(0)}L</p>
          <p style={{ fontSize: 11, color: '#555', marginTop: 2 }}>all time</p>
        </div>
        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 16 }}>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Avg Price</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#f5f5f5' }}>
            {avgPpl > 0 ? `R${avgPpl.toFixed(2)}` : '—'}
          </p>
          <p style={{ fontSize: 11, color: '#555', marginTop: 2 }}>per litre</p>
        </div>
      </div>

      {/* Fuel log */}
      <div style={{ padding: '0 20px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Fill-up History</p>
        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Fuel size={40} color="#2a2a2a" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#555', fontSize: 14 }}>No fill-ups logged yet</p>
            <button onClick={() => setShowAdd(true)} style={{ marginTop: 16, padding: '10px 20px', background: '#ff6b2b', border: 'none', borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
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
                <div key={log.id} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 14, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#f5f5f5' }}>
                        R{log.total_cost.toFixed(2)} · {log.litres}L
                      </p>
                      <p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                        R{log.price_per_litre.toFixed(2)}/L · {log.odometer.toLocaleString()} km
                        {economy ? ` · ${economy.toFixed(1)} L/100km` : ''}
                      </p>
                    </div>
                    <p style={{ fontSize: 12, color: '#555' }}>
                      {new Date(log.filled_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  {log.notes && <p style={{ fontSize: 12, color: '#555', marginTop: 6, fontStyle: 'italic' }}>"{log.notes}"</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: '#1a1a1a', borderRadius: '24px 24px 0 0', width: '100%', padding: '24px 20px 40px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f5f5f5' }}>Log Fill-up</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: '#2a2a2a', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={18} color="#888" />
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
                <div style={{ background: '#ff6b2b11', border: '1px solid #ff6b2b33', borderRadius: 10, padding: '10px 14px' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#ff6b2b' }}>
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
                style={{ padding: '12px 16px', background: fullTank ? '#3b82f622' : 'transparent', border: `1px solid ${fullTank ? '#3b82f6' : '#2a2a2a'}`, borderRadius: 12, color: fullTank ? '#3b82f6' : '#888', cursor: 'pointer', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Droplets size={16} />
                {fullTank ? 'Full tank ✓' : 'Partial fill-up'}
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
