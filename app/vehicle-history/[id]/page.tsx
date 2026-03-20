'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase, Vehicle, ServiceLog } from '@/lib/supabase'
import { ArrowLeft, DollarSign, History } from 'lucide-react'

type LogWithType = ServiceLog & { service_types: { name: string; is_critical: boolean } }

export default function VehicleHistoryPage() {
  const params = useParams()
  const vehicleId = params.id as string

  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [logs, setLogs] = useState<LogWithType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: v } = await supabase.from('vehicles').select('*').eq('id', vehicleId).single()
      setVehicle(v)

      const { data: l } = await supabase
        .from('service_logs')
        .select('*, service_types(name, is_critical)')
        .eq('vehicle_id', vehicleId)
        .order('performed_at', { ascending: false })
      setLogs(l ?? [])
      setLoading(false)
    }
    load()
  }, [vehicleId])

  const totalCost = logs.reduce((sum, l) => sum + (l.cost ?? 0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-semibold text-gray-900">Service History</h1>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {vehicle && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h2>
            <p className="text-gray-500 text-sm">{logs.length} services logged</p>
          </div>
        )}

        {/* Cost Summary */}
        {logs.length > 0 && (
          <div className="bg-blue-600 text-white rounded-2xl p-5 mb-6 flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm">Total Spent</p>
              <p className="text-3xl font-bold">R{totalCost.toFixed(2)}</p>
            </div>
            <DollarSign size={40} className="text-blue-400" />
          </div>
        )}

        {loading ? (
          <p className="text-center text-gray-400 py-10">Loading...</p>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <History size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No services logged yet</p>
            <Link
              href={`/log-service/${vehicleId}`}
              className="mt-4 inline-block px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Log First Service
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map(log => (
              <div key={log.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{log.service_types?.name}</span>
                      {log.service_types?.is_critical && (
                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Critical</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {new Date(log.performed_at).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}
                      {' · '}
                      {log.odometer_at_service.toLocaleString()} {vehicle?.odometer_unit}
                    </p>
                    {log.notes && <p className="text-sm text-gray-500 mt-1 italic">"{log.notes}"</p>}
                  </div>
                  {log.cost != null && (
                    <span className="text-sm font-semibold text-gray-700">R{log.cost.toFixed(2)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
