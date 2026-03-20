'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Gauge } from 'lucide-react'

interface Props {
  vehicleId: string
  currentOdometer: number
  unit: string
  onUpdated: () => void
}

export default function OdometerQuickLog({ vehicleId, currentOdometer, unit, onUpdated }: Props) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const newVal = parseInt(value)
    if (!newVal || newVal <= currentOdometer) {
      toast.error('New odometer must be greater than current reading')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('vehicles')
      .update({ current_odometer: newVal })
      .eq('id', vehicleId)

    if (error) {
      toast.error('Failed to update odometer')
    } else {
      toast.success(`Odometer updated to ${newVal.toLocaleString()} ${unit}`)
      setValue('')
      onUpdated()
    }
    setSaving(false)
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 text-sm text-gray-500">
        <Gauge size={14} />
        <span>{currentOdometer.toLocaleString()} {unit}</span>
      </div>
      <input
        type="number"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={`New ${unit} reading`}
        className="w-36 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={handleSave}
        disabled={!value || saving}
        className="px-3 py-1 bg-gray-800 text-white rounded text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
      >
        {saving ? '...' : 'Update'}
      </button>
    </div>
  )
}
