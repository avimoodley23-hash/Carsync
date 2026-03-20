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
      background: '#111', borderTop: '1px solid #222',
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
              color: active ? '#ff6b2b' : '#555',
              textDecoration: 'none',
              transition: 'color 0.15s',
            }}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span style={{ fontSize: 10, marginTop: 3, fontWeight: active ? 600 : 400 }}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
