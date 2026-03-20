'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { decodeVIN, getRecalls } from '@/lib/nhtsa'
import { toast } from 'sonner'
import { Search, Car, CheckCircle } from 'lucide-react'

interface Props {
  userId: string
  onAdded: () => void
}

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

export default function AddCarForm({ userId, onAdded }: Props) {
  const [vin, setVin] = useState('')
  const [odometer, setOdometer] = useState('')
  const [unit, setUnit] = useState<'km' | 'miles'>('km')
  const [decoded, setDecoded] = useState<{ make: string; model: string; year: number; engine: string; trim: string } | null>(null)
  const [manualMode, setManualMode] = useState(false)
  const [manual, setManual] = useState({ make: '', model: '', year: '', engine: '' })
  const [decoding, setDecoding] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleDecode = async () => {
    if (vin.length !== 17) {
      toast.error('VIN must be exactly 17 characters')
      return
    }
    setDecoding(true)
    try {
      const result = await decodeVIN(vin.toUpperCase())
      if (!result.valid) {
        toast.info('VIN not found in NHTSA database (non-US vehicle). Enter details manually below.')
        setManualMode(true)
      } else {
        setDecoded(result)
        setManualMode(false)
        toast.success(`Found: ${result.year} ${result.make} ${result.model}`)
      }
    } catch {
      toast.error('Failed to contact NHTSA API. Check your connection.')
      setManualMode(true)
    }
    setDecoding(false)
  }

  const effectiveDecoded = manualMode
    ? { make: manual.make, model: manual.model, year: parseInt(manual.year) || 0, engine: manual.engine, trim: '' }
    : decoded
  const isReady = manualMode
    ? manual.make && manual.model && manual.year && vin.length === 17
    : !!decoded

  const handleAdd = async () => {
    if (!isReady || !odometer) {
      toast.error('Please fill in all vehicle details and odometer reading')
      return
    }
    const vehicleData = effectiveDecoded!
    setSaving(true)
    try {
      // Insert vehicle
      const { data: vehicle, error: vErr } = await supabase
        .from('vehicles')
        .insert({
          user_id: userId,
          vin: vin.toUpperCase(),
          make: vehicleData.make,
          model: vehicleData.model,
          year: vehicleData.year,
          engine: vehicleData.engine || null,
          trim: vehicleData.trim || null,
          current_odometer: parseInt(odometer),
          odometer_unit: unit,
        })
        .select()
        .single()

      if (vErr) throw vErr

      // Insert service types for this user (or use global ones)
      // First check if service types exist
      const { data: existingTypes } = await supabase
        .from('service_types')
        .select('id, name')
        .limit(1)

      let serviceTypeIds: string[] = []

      if (!existingTypes || existingTypes.length === 0) {
        const { data: types, error: tErr } = await supabase
          .from('service_types')
          .insert(DEFAULT_SERVICES)
          .select('id')
        if (tErr) throw tErr
        serviceTypeIds = types.map((t: any) => t.id)
      } else {
        const { data: types } = await supabase
          .from('service_types')
          .select('id')
        serviceTypeIds = (types ?? []).map((t: any) => t.id)
      }

      // Create reminders for each service type
      const now = new Date()
      const reminders = serviceTypeIds.map((service_type_id) => ({
        vehicle_id: vehicle.id,
        service_type_id,
        due_date: null,
        due_odometer: null,
        status: 'upcoming' as const,
      }))

      await supabase.from('reminders').insert(reminders)

      // Fetch and store recalls
      const recalls = await getRecalls(vehicleData.make, vehicleData.model, vehicleData.year)
      if (recalls.length > 0) {
        const recallRows = recalls.slice(0, 20).map((r: any) => ({
          vehicle_id: vehicle.id,
          nhtsa_campaign_id: r.NHTSACampaignNumber ?? '',
          component: r.Component ?? '',
          summary: r.Summary ?? '',
          remedy: r.Remedy ?? null,
          report_date: r.ReportReceivedDate ? r.ReportReceivedDate.split('T')[0] : null,
        }))
        await supabase.from('recalls').insert(recallRows)
      }

      toast.success('Vehicle added! 20 service reminders created.')
      onAdded()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to add vehicle')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* VIN Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">VIN Number</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={vin}
            onChange={e => setVin(e.target.value.toUpperCase())}
            placeholder="17-character VIN"
            maxLength={17}
            className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleDecode}
            disabled={decoding || vin.length !== 17}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Search size={14} />
            {decoding ? 'Looking up...' : 'Lookup'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Find your VIN on your dashboard, door jamb, or registration papers</p>
      </div>

      {/* Auto-decoded result */}
      {decoded && !manualMode && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} className="text-green-600" />
            <span className="font-medium text-green-800">Vehicle found!</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-500">Make:</span> <span className="font-medium">{decoded.make}</span></div>
            <div><span className="text-gray-500">Model:</span> <span className="font-medium">{decoded.model}</span></div>
            <div><span className="text-gray-500">Year:</span> <span className="font-medium">{decoded.year}</span></div>
            <div><span className="text-gray-500">Engine:</span> <span className="font-medium">{decoded.engine || '—'}</span></div>
            {decoded.trim && <div className="col-span-2"><span className="text-gray-500">Trim:</span> <span className="font-medium">{decoded.trim}</span></div>}
          </div>
        </div>
      )}

      {/* Manual entry for non-US vehicles */}
      {manualMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-blue-800">Enter your vehicle details manually</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Make *</label>
              <input
                type="text"
                value={manual.make}
                onChange={e => setManual(m => ({ ...m, make: e.target.value }))}
                placeholder="e.g. Volkswagen"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Model *</label>
              <input
                type="text"
                value={manual.model}
                onChange={e => setManual(m => ({ ...m, model: e.target.value }))}
                placeholder="e.g. Polo"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Year *</label>
              <input
                type="number"
                value={manual.year}
                onChange={e => setManual(m => ({ ...m, year: e.target.value }))}
                placeholder="e.g. 2015"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Engine (optional)</label>
              <input
                type="text"
                value={manual.engine}
                onChange={e => setManual(m => ({ ...m, engine: e.target.value }))}
                placeholder="e.g. 1.4 TSI"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Odometer */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Odometer</label>
          <input
            type="number"
            value={odometer}
            onChange={e => setOdometer(e.target.value)}
            placeholder="e.g. 45000"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
          <select
            value={unit}
            onChange={e => setUnit(e.target.value as 'km' | 'miles')}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="km">Kilometres (km)</option>
            <option value="miles">Miles</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleAdd}
        disabled={!isReady || !odometer || saving}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Car size={16} />
        {saving ? 'Adding vehicle...' : 'Add Vehicle & Create 20 Reminders'}
      </button>
    </div>
  )
}
