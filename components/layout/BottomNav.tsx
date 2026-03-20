'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Wrench, Fuel, User, BarChart2 } from 'lucide-react'

const leftTabs = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/services', icon: Wrench, label: 'Services' },
]

const rightTabs = [
  { href: '/fuel', icon: Fuel, label: 'Fuel' },
  { href: '/profile', icon: User, label: 'Profile' },
]

export default function BottomNav() {
  const pathname = usePathname()

  const renderTab = ({ href, icon: Icon, label }: typeof leftTabs[0]) => {
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
          padding: '5px 14px',
          transition: 'background 0.25s ease',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={21} strokeWidth={active ? 2.2 : 1.6} />
        </div>
        <span style={{ fontSize: 10, marginTop: 2, fontWeight: active ? 700 : 400 }}>
          {label}
        </span>
      </Link>
    )
  }

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#FFFFFF',
      boxShadow: '0 -1px 0 rgba(0,0,0,0.04), 0 -4px 20px rgba(0,0,0,0.04)',
      borderRadius: '24px 24px 0 0',
      display: 'flex', alignItems: 'center',
      paddingBottom: 'env(safe-area-inset-bottom, 8px)',
      zIndex: 50,
    }}>
      {leftTabs.map(renderTab)}

      {/* Centre FAB slot */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0 4px' }}>
        <Link href="/insights" style={{
          width: 52, height: 52,
          borderRadius: '50%',
          background: '#CBFF4D',
          boxShadow: '0 4px 20px rgba(203,255,77,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          textDecoration: 'none',
          marginBottom: 14,
          flexShrink: 0,
        }}>
          <BarChart2 size={22} color="#111111" strokeWidth={2} />
        </Link>
      </div>

      {rightTabs.map(renderTab)}
    </nav>
  )
}
