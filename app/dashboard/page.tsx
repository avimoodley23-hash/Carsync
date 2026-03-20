'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, Vehicle, Reminder, ServiceType } from '@/lib/supabase'
import { calculateStatus, formatDueIn } from '@/lib/reminders'
import AddCarForm from '@/components/AddCarForm'
import OdometerQuickLog from '@/components/OdometerQuickLog'
import { Car, Plus, AlertTriangle, Clock, CheckCircle, Settings, LogOut, History, Wrench } from 'lucide-react'

type ReminderWithType = Reminder & { service_types: ServiceType }

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [reminders, setReminders] = useState<ReminderWithType[]>([])
  const [showAddCar, setShowAddCar] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login')
      } else {
        setUser(data.user)
        loadVehicles(data.user.id)
      }
    })
  }, [])

  const loadVehicles = async (userId: string) => {
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    setVehicles(data ?? [])
    if (data && data.length > 0) {
      setSelectedVehicle(data[0])
      loadReminders(data[0].id, data[0].current_odometer)
    }
    setLoading(false)
  }

  const loadReminders = async (vehicleId: string, odometer: number) => {
    const { data } = await supabase
      .from('reminders')
      .select('*, service_types(*)')
      .eq('vehicle_id', vehicleId)
      .order('due_date', { ascending: true, nullsFirst: false })

    if (data) {
      const updated = data.map((r: any) => ({
        ...r,
        status: calculateStatus(r, r.service_types, odometer),
      }))
      setReminders(updated)
    }
  }

  const selectVehicle = (v: Vehicle) => {
    setSelectedVehicle(v)
    loadReminders(v.id, v.current_odometer)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const statusConfig = {
    overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle, dot: 'bg-red-500' },
    due: { label: 'Due', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock, dot: 'bg-yellow-500' },
    upcoming: { label: 'Upcoming', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, dot: 'bg-green-500' },
  }

  const overdue = reminders.filter(r => r.status === 'overdue')
  const due = reminders.filter(r => r.status === 'due')
  const upcoming = reminders.filter(r => r.status === 'upcoming').slice(0, 5)
  const nextThree = [...overdue, ...due, ...upcoming].slice(0, 3)

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Car className="text-blue-600" size={22} />
          <span className="font-bold text-lg text-gray-900">CarSync</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <Settings size={18} />
          </Link>
          <button onClick={handleSignOut} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Vehicle Selector */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {vehicles.map(v => (
            <button
              key={v.id}
              onClick={() => selectVehicle(v)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                selectedVehicle?.id === v.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
              }`}
            >
              {v.year} {v.make} {v.model}
            </button>
          ))}
          <button
            onClick={() => setShowAddCar(true)}
            className="px-4 py-2 rounded-full text-sm font-medium border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 flex items-center gap-1"
          >
            <Plus size={14} />
            Add Vehicle
          </button>
        </div>

        {/* Add Car Modal */}
        {showAddCar && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">Add New Vehicle</h2>
                <button onClick={() => setShowAddCar(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <AddCarForm
                userId={user?.id}
                onAdded={() => {
                  setShowAddCar(false)
                  loadVehicles(user?.id)
                }}
              />
            </div>
          </div>
        )}

        {vehicles.length === 0 ? (
          <div className="text-center py-20">
            <Car size={48} className="text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No vehicles yet</h2>
            <p className="text-gray-400 mb-6">Add your first vehicle to get started</p>
            <button
              onClick={() => setShowAddCar(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Add Your First Vehicle
            </button>
          </div>
        ) : selectedVehicle ? (
          <>
            {/* Vehicle Card */}
            <div className="bg-white rounded-2xl border p-5 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                  </h1>
                  <p className="text-gray-500 text-sm mt-0.5">
                    {selectedVehicle.trim && <span>{selectedVehicle.trim} · </span>}
                    {selectedVehicle.engine && <span>{selectedVehicle.engine} · </span>}
                    <span className="font-mono text-xs">{selectedVehicle.vin}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/vehicle-history/${selectedVehicle.id}`}
                    className="px-3 py-1.5 text-sm text-gray-600 border rounded-lg hover:bg-gray-50 flex items-center gap-1"
                  >
                    <History size={14} />
                    History
                  </Link>
                  <Link
                    href={`/log-service/${selectedVehicle.id}`}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                  >
                    <Wrench size={14} />
                    Log Service
                  </Link>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <OdometerQuickLog
                  vehicleId={selectedVehicle.id}
                  currentOdometer={selectedVehicle.current_odometer}
                  unit={selectedVehicle.odometer_unit}
                  onUpdated={() => loadVehicles(user?.id)}
                />
              </div>
            </div>

            {/* Status Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{overdue.length}</div>
                <div className="text-sm text-red-500 font-medium">Overdue</div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{due.length}</div>
                <div className="text-sm text-yellow-500 font-medium">Due Soon</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{upcoming.length}</div>
                <div className="text-sm text-green-500 font-medium">Upcoming</div>
              </div>
            </div>

            {/* Next Services Due */}
            {nextThree.length > 0 && (
              <div className="bg-white rounded-2xl border p-5 mb-6">
                <h2 className="font-semibold text-gray-900 mb-4">Next Services Due</h2>
                <div className="space-y-3">
                  {nextThree.map(r => {
                    const cfg = statusConfig[r.status]
                    const Icon = cfg.icon
                    return (
                      <div key={r.id} className={`flex items-center justify-between p-3 rounded-xl border ${cfg.color}`}>
                        <div className="flex items-center gap-3">
                          <Icon size={16} />
                          <div>
                            <div className="font-medium text-sm">
                              {r.service_types?.name}
                              {r.service_types?.is_critical && (
                                <span className="ml-2 text-xs bg-red-600 text-white px-1.5 py-0.5 rounded font-medium">CRITICAL</span>
                              )}
                            </div>
                            <div className="text-xs opacity-70">
                              {formatDueIn(r, selectedVehicle.current_odometer)}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/60">
                          {cfg.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* All Reminders */}
            <div className="bg-white rounded-2xl border p-5">
              <h2 className="font-semibold text-gray-900 mb-4">All Service Reminders ({reminders.length})</h2>
              <div className="space-y-2">
                {reminders.map(r => {
                  const cfg = statusConfig[r.status]
                  return (
                    <div key={r.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                        <span className="text-sm text-gray-800">
                          {r.service_types?.name}
                          {r.service_types?.is_critical && (
                            <span className="ml-1.5 text-xs text-red-500 font-medium">●</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{formatDueIn(r, selectedVehicle.current_odometer)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
