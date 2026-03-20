'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Vehicle } from '@/lib/supabase'
import { TrendingUp, Gauge, Wrench, Fuel } from 'lucide-react'

type MonthlyData = { month: string; service: number; fuel: number }

export default function InsightsPage() {
  const router = useRouter()
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [serviceCosts, setServiceCosts] = useState(0)
  const [fuelCosts, setFuelCosts] = useState(0)
  const [totalServices, setTotalServices] = useState(0)
  const [totalFillUps, setTotalFillUps] = useState(0)
  const [monthly, setMonthly] = useState<MonthlyData[]>([])
  const [upcomingCosts, setUpcomingCosts] = useState<{ name: string; est: number }[]>([])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: vs } = await supabase.from('vehicles').select('*').eq('user_id', user.id).order('created_at').limit(1)
      if (!vs || vs.length === 0) { router.push('/onboarding'); return }
      const v = vs[0]
      setVehicle(v)
      await loadData(v)
      setLoading(false)
    }
    init()
  }, [])

  const loadData = async (v: Vehicle) => {
    const [{ data: svcLogs }, { data: fuelLogs }, { data: reminders }] = await Promise.all([
      supabase.from('service_logs').select('cost, performed_at').eq('vehicle_id', v.id),
      supabase.from('fuel_logs').select('total_cost, filled_at').eq('vehicle_id', v.id),
      supabase.from('reminders').select('*, service_types(*)').eq('vehicle_id', v.id),
    ])

    const sTotal = (svcLogs ?? []).reduce((s: number, l: any) => s + (l.cost ?? 0), 0)
    const fTotal = (fuelLogs ?? []).reduce((s: number, l: any) => s + (l.total_cost ?? 0), 0)
    setServiceCosts(sTotal)
    setFuelCosts(fTotal)
    setTotalServices((svcLogs ?? []).length)
    setTotalFillUps((fuelLogs ?? []).length)

    const months: MonthlyData[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('en-ZA', { month: 'short' })
      const svc = (svcLogs ?? []).filter((l: any) => l.performed_at?.startsWith(key)).reduce((s: number, l: any) => s + (l.cost ?? 0), 0)
      const fuel = (fuelLogs ?? []).filter((l: any) => l.filled_at?.startsWith(key)).reduce((s: number, l: any) => s + (l.total_cost ?? 0), 0)
      months.push({ month: label, service: svc, fuel })
    }
    setMonthly(months)

    const estimates: Record<string, number> = {
      'Oil Change': 800, 'Full Service': 2500, 'Brake Inspection': 500,
      'Brake Fluid': 600, 'Cambelt / Timing Belt': 4000, 'Tyre Replacement': 3500,
      'Battery Check': 1200, 'Spark Plugs': 800, 'Transmission Service': 3000,
    }
    const upcoming = (reminders ?? [])
      .filter((r: any) => r.status === 'due' || r.status === 'overdue')
      .map((r: any) => ({ name: r.service_types?.name, est: estimates[r.service_types?.name] ?? 500 }))
      .filter((r: any) => r.name)
      .slice(0, 5)
    setUpcomingCosts(upcoming)
  }

  const maxBar = Math.max(...monthly.map(m => m.service + m.fuel), 1)

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666666' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 100 }}>
      <div style={{ padding: '52px 20px 16px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111111' }}>Insights</h1>
        <p style={{ fontSize: 13, color: '#666666', marginTop: 2 }}>{vehicle?.make} {vehicle?.model}</p>
      </div>

      {/* Total cost card */}
      <div style={{ padding: '0 20px', marginBottom: 16 }}>
        <div style={{ background: '#CBFF4D', borderRadius: 20, padding: '20px', boxShadow: 'var(--shadow-fab)' }}>
          <p style={{ fontSize: 13, color: '#6B8F0E', marginBottom: 4, fontWeight: 600 }}>Total Vehicle Spend</p>
          <p style={{ fontSize: 40, fontWeight: 700, color: '#111111' }}>R{(serviceCosts + fuelCosts).toFixed(0)}</p>
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: '#6B8F0E' }} />
              <span style={{ fontSize: 12, color: '#6B8F0E', fontWeight: 500 }}>Services R{serviceCosts.toFixed(0)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: '#3B82F6' }} />
              <span style={{ fontSize: 12, color: '#6B8F0E', fontWeight: 500 }}>Fuel R{fuelCosts.toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { icon: Wrench, label: 'Services logged', value: totalServices, color: '#6B8F0E' },
          { icon: Fuel, label: 'Fill-ups logged', value: totalFillUps, color: '#3B82F6' },
          { icon: Gauge, label: 'Current km', value: `${vehicle?.current_odometer.toLocaleString()}`, color: '#16A34A' },
          { icon: TrendingUp, label: 'Avg per service', value: totalServices > 0 ? `R${(serviceCosts / totalServices).toFixed(0)}` : '—', color: '#D97706' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: 20, padding: '14px', boxShadow: 'var(--shadow-card)' }}>
            <Icon size={16} color={color} style={{ marginBottom: 6 }} />
            <p style={{ fontSize: 20, fontWeight: 700, color: '#111111' }}>{value}</p>
            <p style={{ fontSize: 11, color: '#666666', marginTop: 2 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Monthly chart */}
      <div style={{ padding: '0 20px', marginBottom: 20 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#666666', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Last 6 Months</p>
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: 20, padding: '16px', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
            {monthly.map(m => {
              const total = m.service + m.fuel
              const h = maxBar > 0 ? (total / maxBar) * 85 : 0
              const svcH = total > 0 ? (m.service / total) * h : 0
              const fuelH = total > 0 ? (m.fuel / total) * h : 0
              return (
                <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 85, width: '100%' }}>
                    {svcH > 0 && <div style={{ background: '#CBFF4D', height: svcH, borderRadius: '4px 4px 0 0', width: '100%' }} />}
                    {fuelH > 0 && <div style={{ background: '#3B82F6', height: fuelH, borderRadius: svcH > 0 ? 0 : '4px 4px 0 0', width: '100%' }} />}
                    {h === 0 && <div style={{ background: '#E8E8E3', height: 4, borderRadius: 2, width: '100%' }} />}
                  </div>
                  <p style={{ fontSize: 10, color: '#666666' }}>{m.month}</p>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: '#CBFF4D' }} />
              <span style={{ fontSize: 11, color: '#666666' }}>Services</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: '#3B82F6' }} />
              <span style={{ fontSize: 11, color: '#666666' }}>Fuel</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming estimated costs */}
      {upcomingCosts.length > 0 && (
        <div style={{ padding: '0 20px' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#666666', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Estimated Upcoming Costs
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcomingCosts.map(({ name, est }) => (
              <div key={name} style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: 16, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-card)' }}>
                <p style={{ fontSize: 14, color: '#111111' }}>{name}</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#D97706' }}>~R{est.toLocaleString()}</p>
              </div>
            ))}
            <p style={{ fontSize: 11, color: '#666666', marginTop: 4 }}>* Estimates based on South African average workshop prices</p>
          </div>
        </div>
      )}
    </div>
  )
}
