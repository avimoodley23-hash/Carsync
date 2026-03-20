'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Wrench, Fuel, BarChart2, User } from 'lucide-react'

const tabs = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/services', icon: Wrench, label: 'Services' },
  { href: '/fuel', icon: Fuel, label: 'Fuel' },
  { href: '/insights', icon: BarChart2, label: 'Insights' },
  { href: '/profile', icon: User, label: 'Profile' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#FFFFFF',
      boxShadow: '0 -1px 0 rgba(0,0,0,0.04), 0 -4px 20px rgba(0,0,0,0.03)',
      borderRadius: '20px 20px 0 0',
      display: 'flex', alignItems: 'center',
      paddingBottom: 'env(safe-area-inset-bottom, 8px)',
      zIndex: 50,
    }}>
      {tabs.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '10px 0 6px',
              textDecoration: 'none',
              color: active ? '#111111' : '#AAAAAA',
              transition: 'color 0.15s',
            }}
          >
            <div style={{
              background: active ? '#CBFF4D' : 'transparent',
              borderRadius: 100,
              padding: '6px 16px',
              transition: 'background 0.25s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={22} strokeWidth={active ? 2.2 : 1.6} />
            </div>
            <span style={{ fontSize: 11, marginTop: 2, fontWeight: active ? 600 : 400 }}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
