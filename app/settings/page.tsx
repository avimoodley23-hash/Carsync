'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, UserPreferences } from '@/lib/supabase'
import { toast } from 'sonner'
import { ArrowLeft, Bell } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [prefs, setPrefs] = useState<Partial<UserPreferences>>({
    email_reminders_enabled: true,
    reminder_days_before: 7,
    critical_only: false,
    digest_frequency: 'never',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (data) setPrefs(data)
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('user_preferences')
      .upsert({ ...prefs, user_id: userId }, { onConflict: 'user_id' })

    if (error) {
      toast.error('Failed to save preferences')
    } else {
      toast.success('Notification preferences saved')
    }
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-semibold text-gray-900">Settings</h1>
      </header>
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border p-6">
          <div className="flex items-center gap-2 mb-6">
            <Bell className="text-blue-600" size={20} />
            <h2 className="font-semibold text-gray-900">Email Notifications</h2>
          </div>

          <div className="space-y-6">
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Email Reminders</p>
                <p className="text-sm text-gray-400">Receive email when services are due</p>
              </div>
              <button
                onClick={() => setPrefs(p => ({ ...p, email_reminders_enabled: !p.email_reminders_enabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  prefs.email_reminders_enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  prefs.email_reminders_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Days before */}
            <div>
              <label className="block font-medium text-gray-800 mb-1">
                Remind me <span className="text-blue-600">{prefs.reminder_days_before}</span> days before due
              </label>
              <input
                type="range"
                min="1"
                max="30"
                value={prefs.reminder_days_before}
                onChange={e => setPrefs(p => ({ ...p, reminder_days_before: parseInt(e.target.value) }))}
                className="w-full accent-blue-600"
                disabled={!prefs.email_reminders_enabled}
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1 day</span>
                <span>30 days</span>
              </div>
            </div>

            {/* Critical only */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Critical Services Only</p>
                <p className="text-sm text-gray-400">Only alert for cambelt, brakes, battery, etc.</p>
              </div>
              <button
                onClick={() => setPrefs(p => ({ ...p, critical_only: !p.critical_only }))}
                disabled={!prefs.email_reminders_enabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40 ${
                  prefs.critical_only ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  prefs.critical_only ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Digest frequency */}
            <div>
              <label className="block font-medium text-gray-800 mb-2">Email Frequency</label>
              <div className="grid grid-cols-3 gap-2">
                {(['never', 'daily', 'weekly'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setPrefs(p => ({ ...p, digest_frequency: f }))}
                    disabled={!prefs.email_reminders_enabled}
                    className={`py-2 text-sm rounded-lg border font-medium capitalize disabled:opacity-40 ${
                      prefs.digest_frequency === f
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {f === 'never' ? 'Immediate' : f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-8 w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  )
}
