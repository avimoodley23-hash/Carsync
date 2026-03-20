'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { WEEKLY_CHECKS, MONTHLY_CHECKS } from '@/lib/weekly-checks'
import { CheckCircle, Circle, ChevronDown, ChevronUp, Flame } from 'lucide-react'
import { toast } from 'sonner'
import * as Icons from 'lucide-react'

interface Props {
  vehicleId: string
  userId: string
}

export default function WeeklyCheckin({ vehicleId, userId }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [streak, setStreak] = useState(0)
  const [expanded, setExpanded] = useState(true)
  const [showMonthly, setShowMonthly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [thisWeekDone, setThisWeekDone] = useState(false)
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null)

  const weekKey = (() => {
    const d = new Date()
    const jan1 = new Date(d.getFullYear(), 0, 1)
    const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
    return `${d.getFullYear()}-W${week}`
  })()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('weekly_checkins')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .eq('week_key', weekKey)
        .single()

      if (data) {
        setChecked(new Set(data.checks_done))
        if (data.checks_done.length >= WEEKLY_CHECKS.length) setThisWeekDone(true)
      }

      // Calculate streak
      const { data: all } = await supabase
        .from('weekly_checkins')
        .select('week_key, checks_done')
        .eq('vehicle_id', vehicleId)
        .order('week_key', { ascending: false })
        .limit(20)

      if (all) {
        let s = 0
        for (const row of all) {
          if (row.checks_done.length >= WEEKLY_CHECKS.length) s++
          else break
        }
        setStreak(s)
      }
      setLoading(false)
    }
    load()
  }, [vehicleId])

  const toggle = async (id: string) => {
    const next = new Set(checked)
    next.has(id) ? next.delete(id) : next.add(id)
    setChecked(next)

    const checksArray = Array.from(next)
    await supabase.from('weekly_checkins').upsert({
      vehicle_id: vehicleId,
      user_id: userId,
      week_key: weekKey,
      checks_done: checksArray,
      completed_at: checksArray.length >= WEEKLY_CHECKS.length ? new Date().toISOString() : null,
    }, { onConflict: 'vehicle_id,week_key' })

    if (checksArray.length === WEEKLY_CHECKS.length) {
      setThisWeekDone(true)
      toast.success(`All checks done! ${streak + 1} week streak 🔥`)
    }
  }

  const allDone = checked.size >= WEEKLY_CHECKS.length
  const progress = Math.round((checked.size / WEEKLY_CHECKS.length) * 100)

  if (loading) return null

  return (
    <div style={{ margin: '0 20px 20px', background: '#1a1a1a', border: `1px solid ${allDone ? '#22c55e44' : '#2a2a2a'}`, borderRadius: 20, overflow: 'hidden' }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', padding: '16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: allDone ? '#22c55e22' : '#ff6b2b22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {allDone ? <CheckCircle size={18} color="#22c55e" /> : <Flame size={18} color="#ff6b2b" />}
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#f5f5f5' }}>Weekly Check-in</p>
            <p style={{ fontSize: 12, color: allDone ? '#22c55e' : '#888', marginTop: 1 }}>
              {allDone ? `All done! · ${streak} week streak` : `${checked.size}/${WEEKLY_CHECKS.length} done · ${streak > 0 ? `${streak} week streak` : 'Start your streak'}`}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {streak > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#ff6b2b22', padding: '4px 8px', borderRadius: 20 }}>
              <Flame size={12} color="#ff6b2b" />
              <span style={{ fontSize: 12, color: '#ff6b2b', fontWeight: 700 }}>{streak}</span>
            </div>
          )}
          {expanded ? <ChevronUp size={16} color="#555" /> : <ChevronDown size={16} color="#555" />}
        </div>
      </button>

      {/* Progress bar */}
      <div style={{ height: 3, background: '#111', margin: '0 16px' }}>
        <div style={{ height: '100%', background: allDone ? '#22c55e' : '#ff6b2b', width: `${progress}%`, borderRadius: 2, transition: 'width 0.3s' }} />
      </div>

      {expanded && (
        <div style={{ padding: '12px 16px 16px' }}>
          <p style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>This week's checks</p>

          {WEEKLY_CHECKS.map(check => {
            const done = checked.has(check.id)
            const isOpen = expandedGuide === check.id
            return (
              <div key={check.id} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
                  <button onClick={() => toggle(check.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                    {done
                      ? <CheckCircle size={22} color="#22c55e" fill="#22c55e22" />
                      : <Circle size={22} color="#444" />
                    }
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, color: done ? '#888' : '#f5f5f5', fontWeight: 500, textDecoration: done ? 'line-through' : 'none' }}>
                        {check.label}
                      </span>
                      {check.critical && <span style={{ fontSize: 10, color: '#ef4444', background: '#ef444422', padding: '1px 6px', borderRadius: 10 }}>Critical</span>}
                    </div>
                    <p style={{ fontSize: 12, color: '#555', marginTop: 1 }}>{check.description}</p>
                  </div>
                  <button
                    onClick={() => setExpandedGuide(isOpen ? null : check.id)}
                    style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: '4px 10px', color: '#888', fontSize: 12, cursor: 'pointer' }}
                  >
                    How?
                  </button>
                </div>
                {isOpen && (
                  <div style={{ background: '#111', borderRadius: 12, padding: '12px 14px', marginBottom: 4 }}>
                    <p style={{ fontSize: 13, color: '#aaa', lineHeight: 1.6 }}>{check.howTo}</p>
                  </div>
                )}
              </div>
            )
          })}

          {/* Monthly checks toggle */}
          <button
            onClick={() => setShowMonthly(s => !s)}
            style={{ width: '100%', marginTop: 8, padding: '10px', background: '#111', border: '1px solid #2a2a2a', borderRadius: 12, color: '#888', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            {showMonthly ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Monthly checks ({MONTHLY_CHECKS.length})
          </button>

          {showMonthly && (
            <div style={{ marginTop: 8 }}>
              {MONTHLY_CHECKS.map(check => {
                const done = checked.has(`monthly_${check.id}`)
                const isOpen = expandedGuide === `monthly_${check.id}`
                return (
                  <div key={check.id} style={{ marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
                      <button onClick={() => toggle(`monthly_${check.id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                        {done ? <CheckCircle size={22} color="#3b82f6" fill="#3b82f622" /> : <Circle size={22} color="#444" />}
                      </button>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 14, color: done ? '#888' : '#f5f5f5', fontWeight: 500, textDecoration: done ? 'line-through' : 'none' }}>
                          {check.label}
                        </span>
                        <p style={{ fontSize: 12, color: '#555', marginTop: 1 }}>{check.description}</p>
                      </div>
                      <button
                        onClick={() => setExpandedGuide(isOpen ? null : `monthly_${check.id}`)}
                        style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: '4px 10px', color: '#888', fontSize: 12, cursor: 'pointer' }}
                      >
                        How?
                      </button>
                    </div>
                    {isOpen && (
                      <div style={{ background: '#111', borderRadius: 12, padding: '12px 14px', marginBottom: 4 }}>
                        <p style={{ fontSize: 13, color: '#aaa', lineHeight: 1.6 }}>{check.howTo}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
