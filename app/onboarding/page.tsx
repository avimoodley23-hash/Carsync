'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { decodeVIN } from '@/lib/nhtsa'
import { Car, Search, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

const DEFAULT_SERVICES = [
  { name: 'Oil Change', interval_months: 6, interval_km: 10000, warning_days: 14, is_critical: false },
  { name: 'Oil Filter', interval_months: 6, interval_km: 10000, warning_days: 14, is_critical: false },
  { name: 'Tyre Rotation', interval_months: 6, interval_km: 10000, warning_days: 14, is_critical: false },
  { name: 'Air Filter', interval_months: 12, interval_km: 20000, warning_days: 14, is_critical: false },
  { name: 'Cabin Filter', interval_months: 12, interval_km: 20000, warning_days: 14, is_critical: false },
  { name: 'Brake Inspection', interval_months: 12, interval_km: 20000, warning_days: 30, is_critical: true },
  { name: 'Brake Fluid', interval_months: 24, interval_km: 40000, warning_days: 30, is_critical: true },
  { name: 'Spark Plugs', interval_months: 24, interval_km: 40000, warning_days: 30, is_critical: false },
  { name: 'Coolant Flush', interval_months: 24, interval_km: 50000, warning_days: 30, is_critical: false },
  { name: 'Transmission Service', interval_months: 24, interval_km: 50000, warning_days: 30, is_critical: false },
  { name: 'Power Steering Fluid', interval_months: 24, interval_km: 50000, warning_days: 14, is_critical: false },
  { name: 'Battery Check', interval_months: 12, interval_km: null, warning_days: 30, is_critical: true },
  { name: 'Wheel Alignment', interval_months: 12, interval_km: 20000, warning_days: 14, is_critical: false },
  { name: 'Wheel Balancing', interval_months: 12, interval_km: 20000, warning_days: 14, is_critical: false },
  { name: 'Cambelt / Timing Belt', interval_months: 48, interval_km: 80000, warning_days: 60, is_critical: true },
  { name: 'Differential Service', interval_months: 24, interval_km: 50000, warning_days: 30, is_critical: false },
  { name: 'Fuel Filter', interval_months: 24, interval_km: 40000, warning_days: 14, is_critical: false },
  { name: 'Wiper Blades', interval_months: 12, interval_km: null, warning_days: 14, is_critical: false },
  { name: 'Tyre Replacement', interval_months: 48, interval_km: 60000, warning_days: 30, is_critical: true },
  { name: 'Full Service', interval_months: 12, interval_km: 15000, warning_days: 14, is_critical: false },
]

type Step = 1 | 2 | 3

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [saving, setSaving] = useState(false)

  const [vin, setVin] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [plate, setPlate] = useState('')
  const [odometer, setOdometer] = useState('')
  const [engine, setEngine] = useState('')
  const [decoding, setDecoding] = useState(false)
  const [vinDecoded, setVinDecoded] = useState(false)

  const [lastServiceDate, setLastServiceDate] = useState('')
  const [lastServiceKm, setLastServiceKm] = useState('')
  const [lastServiceType, setLastServiceType] = useState('Full Service')
  const [skipLastService, setSkipLastService] = useState(false)

  const [enabledServices, setEnabledServices] = useState<Set<number>>(
    new Set(DEFAULT_SERVICES.map((_, i) => i))
  )

  const handleVINLookup = async () => {
    if (vin.length !== 17) { toast.error('VIN must be 17 characters'); return }
    setDecoding(true)
    try {
      const result = await decodeVIN(vin.toUpperCase())
      if (result.valid) {
        setMake(result.make)
        setModel(result.model)
        setYear(String(result.year))
        setEngine(result.engine)
        setVinDecoded(true)
        toast.success(`Found: ${result.year} ${result.make} ${result.model}`)
      } else {
        toast.info('VIN not found — enter details manually below')
      }
    } catch {
      toast.error('Could not reach lookup service')
    }
    setDecoding(false)
  }

  const step1Valid = make && model && year && odometer
  const step2Valid = skipLastService || (lastServiceDate && lastServiceKm)

  const handleFinish = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: vehicle, error: vErr } = await supabase
        .from('vehicles')
        .insert({
          user_id: user.id,
          vin: vin.toUpperCase() || 'MANUAL',
          make, model,
          year: parseInt(year),
          engine: engine || null,
          trim: null,
          current_odometer: parseInt(odometer),
          odometer_unit: 'km',
          plate: plate || null,
        })
        .select().single()

      if (vErr) throw vErr

      const { data: existingTypes } = await supabase.from('service_types').select('id').limit(1)
      let allTypes: any[] = []
      if (!existingTypes || existingTypes.length === 0) {
        const { data: types, error: tErr } = await supabase.from('service_types').insert(DEFAULT_SERVICES).select()
        if (tErr) throw tErr
        allTypes = types
      } else {
        const { data: types } = await supabase.from('service_types').select('*')
        allTypes = types ?? []
      }

      const selectedServices = DEFAULT_SERVICES
        .map((s, i) => ({ ...s, index: i }))
        .filter(s => enabledServices.has(s.index))

      const reminders = allTypes
        .filter(t => selectedServices.some(s => s.name === t.name))
        .map(t => {
          const svc = selectedServices.find(s => s.name === t.name)!
          let dueDate = null
          let dueOdometer = null

          if (!skipLastService && lastServiceDate && lastServiceKm) {
            const lastDate = new Date(lastServiceDate)
            const lastKm = parseInt(lastServiceKm)
            if (svc.interval_months) {
              const due = new Date(lastDate)
              due.setMonth(due.getMonth() + svc.interval_months)
              dueDate = due.toISOString().split('T')[0]
            }
            if (svc.interval_km) {
              dueOdometer = lastKm + svc.interval_km
            }
          }

          return {
            vehicle_id: vehicle.id,
            service_type_id: t.id,
            due_date: dueDate,
            due_odometer: dueOdometer,
            status: 'upcoming',
          }
        })

      if (reminders.length > 0) {
        await supabase.from('reminders').insert(reminders)
      }

      if (!skipLastService && lastServiceDate && lastServiceKm) {
        const serviceType = allTypes.find(t => t.name === lastServiceType)
        if (serviceType) {
          await supabase.from('service_logs').insert({
            vehicle_id: vehicle.id,
            service_type_id: serviceType.id,
            performed_at: lastServiceDate,
            odometer_at_service: parseInt(lastServiceKm),
            cost: null,
            notes: 'Added during setup',
          })
        }
      }

      toast.success("You're all set!")
      router.push('/home')
    } catch (err: any) {
      toast.error(err.message ?? 'Something went wrong')
    }
    setSaving(false)
  }

  const toggleService = (i: number) => {
    setEnabledServices(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F0', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '48px 24px 24px', textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: '#CBFF4D', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 4px 20px rgba(203,255,77,0.35)' }}>
          <Car size={24} color="#111111" />
        </div>
        <p style={{ color: '#666666', fontSize: 15, fontWeight: 500 }}>
          {step === 1 && "Let's set up your vehicle"}
          {step === 2 && 'When was your last service?'}
          {step === 3 && 'Which services apply to your car?'}
        </p>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 32 }}>
        {[1,2,3].map(s => (
          <div key={s} style={{
            width: s === step ? 24 : 8, height: 8, borderRadius: 4,
            background: s <= step ? '#CBFF4D' : '#E5E5E0',
            transition: 'all 0.3s',
          }} />
        ))}
      </div>

      <div style={{ flex: 1, padding: '0 24px', maxWidth: 480, margin: '0 auto', width: '100%' }}>

        {/* STEP 1: Vehicle Details */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="cs-label">VIN Number (optional)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="cs-input"
                  value={vin}
                  onChange={e => setVin(e.target.value.toUpperCase())}
                  placeholder="17-character VIN"
                  maxLength={17}
                  style={{ fontFamily: 'monospace', flex: 1 }}
                />
                <button
                  onClick={handleVINLookup}
                  disabled={vin.length !== 17 || decoding}
                  style={{
                    padding: '0 16px',
                    background: vin.length === 17 ? '#CBFF4D' : '#E8E8E3',
                    border: 'none', borderRadius: 12,
                    color: vin.length === 17 ? '#111111' : '#AAAAAA',
                    cursor: vin.length === 17 ? 'pointer' : 'default', flexShrink: 0,
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500,
                  }}
                >
                  <Search size={14} />
                  {decoding ? '...' : 'Lookup'}
                </button>
              </div>
              <p style={{ fontSize: 12, color: '#999999', marginTop: 4 }}>
                Found on your dashboard, door frame, or registration papers
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="cs-label">Make *</label>
                <input className="cs-input" value={make} onChange={e => setMake(e.target.value)} placeholder="e.g. Volkswagen" />
              </div>
              <div>
                <label className="cs-label">Model *</label>
                <input className="cs-input" value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. Polo" />
              </div>
              <div>
                <label className="cs-label">Year *</label>
                <input className="cs-input" type="number" value={year} onChange={e => setYear(e.target.value)} placeholder="e.g. 2019" />
              </div>
              <div>
                <label className="cs-label">Engine</label>
                <input className="cs-input" value={engine} onChange={e => setEngine(e.target.value)} placeholder="e.g. 1.4 TSI" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="cs-label">Current Km *</label>
                <input className="cs-input" type="number" value={odometer} onChange={e => setOdometer(e.target.value)} placeholder="e.g. 85000" />
              </div>
              <div>
                <label className="cs-label">Licence Plate</label>
                <input className="cs-input" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} placeholder="e.g. CA 123-456" />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Last Service */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: 20, padding: 20, boxShadow: 'var(--shadow-card)' }}>
              <p style={{ color: '#111111', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>When was your last service?</p>
              <p style={{ color: '#666666', fontSize: 13 }}>This helps us calculate accurate due dates for all your services.</p>
            </div>

            {!skipLastService && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="cs-label">Service Date *</label>
                    <input className="cs-input" type="date" value={lastServiceDate} onChange={e => setLastServiceDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="cs-label">Km at Service *</label>
                    <input className="cs-input" type="number" value={lastServiceKm} onChange={e => setLastServiceKm(e.target.value)} placeholder="e.g. 80000" />
                  </div>
                </div>
                <div>
                  <label className="cs-label">Service Type</label>
                  <select
                    className="cs-input"
                    value={lastServiceType}
                    onChange={e => setLastServiceType(e.target.value)}
                    style={{ background: '#FFFFFF', color: '#111111' }}
                  >
                    {DEFAULT_SERVICES.map(s => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <button
              onClick={() => setSkipLastService(s => !s)}
              style={{
                background: skipLastService ? '#F2FFD6' : 'transparent',
                border: `1px solid ${skipLastService ? '#CBFF4D' : '#E5E5E0'}`,
                borderRadius: 12, padding: '14px 16px',
                color: skipLastService ? '#6B8F0E' : '#666666',
                cursor: 'pointer', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <CheckCircle size={16} />
              {skipLastService ? "I'll add service history later" : "I don't know / skip this step"}
            </button>
          </div>
        )}

        {/* STEP 3: Services */}
        {step === 3 && (
          <div>
            <p style={{ color: '#666666', fontSize: 13, marginBottom: 16 }}>
              Toggle off any services that don't apply to your car (e.g. diesel cars don't need spark plugs).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DEFAULT_SERVICES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => toggleService(i)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', borderRadius: 16,
                    background: enabledServices.has(i) ? '#FFFFFF' : '#F5F5F0',
                    border: `1px solid ${enabledServices.has(i) ? '#E5E5E0' : '#F0F0EB'}`,
                    cursor: 'pointer', transition: 'all 0.15s',
                    boxShadow: enabledServices.has(i) ? 'var(--shadow-card)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: enabledServices.has(i) ? '#CBFF4D' : '#E8E8E3',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'background 0.15s',
                    }}>
                      {enabledServices.has(i) && <CheckCircle size={13} color="#111111" />}
                    </div>
                    <span style={{ fontSize: 14, color: enabledServices.has(i) ? '#111111' : '#999999' }}>
                      {s.name}
                    </span>
                  </div>
                  {s.is_critical && (
                    <span style={{ fontSize: 11, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', padding: '2px 8px', borderRadius: 20 }}>
                      Critical
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div style={{ padding: '24px', maxWidth: 480, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {step > 1 && (
            <button
              onClick={() => setStep(s => (s - 1) as Step)}
              style={{
                flex: 1, padding: '16px', background: '#FFFFFF', border: '1px solid #E5E5E0',
                borderRadius: 14, color: '#111111', cursor: 'pointer', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <ChevronLeft size={18} /> Back
            </button>
          )}
          <button
            onClick={() => {
              if (step === 1 && !step1Valid) { toast.error('Fill in make, model, year and odometer'); return }
              if (step === 2 && !step2Valid) { toast.error('Enter last service details or skip'); return }
              if (step < 3) { setStep(s => (s + 1) as Step) } else { handleFinish() }
            }}
            disabled={saving}
            style={{
              flex: 3, padding: '16px', background: '#CBFF4D', border: 'none',
              borderRadius: 14, color: '#111111', cursor: 'pointer', fontWeight: 700, fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: saving ? 0.6 : 1,
              boxShadow: '0 4px 20px rgba(203,255,77,0.35)',
            }}
          >
            {saving ? 'Setting up...' : step === 3 ? "Let's go!" : 'Continue'}
            {!saving && step < 3 && <ChevronRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}
