'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase, Vehicle, ServiceType } from '@/lib/supabase'
import { toast } from 'sonner'
import { ArrowLeft, Wrench } from 'lucide-react'

export default function LogServicePage() {
  const router = useRouter()
  const params = useParams()
  const vehicleId = params.id as string

  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [serviceTypeId, setServiceTypeId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [odometer, setOdometer] = useState('')
  const [cost, setCost] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: v } = await supabase.from('vehicles').select('*').eq('id', vehicleId).single()
      setVehicle(v)
      if (v) setOdometer(String(v.current_odometer))

      const { data: types } = await supabase.from('service_types').select('*').order('name')
      setServiceTypes(types ?? [])
    }
    load()
  }, [vehicleId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!serviceTypeId) { toast.error('Select a service type'); return }
    setSaving(true)

    const odometerVal = parseInt(odometer)

    // Insert log
    const { error: logErr } = await supabase.from('service_logs').insert({
      vehicle_id: vehicleId,
      service_type_id: serviceTypeId,
      performed_at: date,
      odometer_at_service: odometerVal,
      cost: cost ? parseFloat(cost) : null,
      notes: notes || null,
    })

    if (logErr) { toast.error(logErr.message); setSaving(false); return }

    // Update vehicle odometer if higher
    if (vehicle && odometerVal > vehicle.current_odometer) {
      await supabase.from('vehicles').update({ current_odometer: odometerVal }).eq('id', vehicleId)
    }

    // Update reminder for this service type
    const serviceType = serviceTypes.find(s => s.id === serviceTypeId)
    if (serviceType) {
      const performed = new Date(date)
      let dueDate: string | null = null
      let dueOdometer: number | null = null

      if (serviceType.interval_months) {
        const due = new Date(performed)
        due.setMonth(due.getMonth() + serviceType.interval_months)
        dueDate = due.toISOString().split('T')[0]
      }
      if (serviceType.interval_km) {
        dueOdometer = odometerVal + serviceType.interval_km
      }

      await supabase
        .from('reminders')
        .update({ due_date: dueDate, due_odometer: dueOdometer, status: 'upcoming' })
        .eq('vehicle_id', vehicleId)
        .eq('service_type_id', serviceTypeId)
    }

    toast.success('Service logged successfully!')
    router.push('/dashboard')
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-semibold text-gray-900">Log Service</h1>
      </header>
      <div className="max-w-xl mx-auto px-4 py-8">
        {vehicle && (
          <p className="text-sm text-gray-500 mb-6">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </p>
        )}
        <div className="bg-white rounded-2xl border p-6">
          <div className="flex items-center gap-2 mb-6">
            <Wrench className="text-blue-600" size={20} />
            <h2 className="font-semibold text-gray-900">Service Details</h2>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Type *</label>
              <select
                value={serviceTypeId}
                onChange={e => setServiceTypeId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select service...</option>
                {serviceTypes.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.is_critical ? ' ⚠️' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Odometer ({vehicle?.odometer_unit ?? 'km'}) *
                </label>
                <input
                  type="number"
                  value={odometer}
                  onChange={e => setOdometer(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost (optional)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R</span>
                <input
                  type="number"
                  value={cost}
                  onChange={e => setCost(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full pl-7 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Used Castrol 5W-30, replaced at Supaquick..."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Service Log'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
