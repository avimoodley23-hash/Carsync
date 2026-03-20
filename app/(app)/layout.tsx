import BottomNav from '@/components/layout/BottomNav'
import AIChatBubble from '@/components/layout/AIChatBubble'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F0', paddingBottom: 80 }}>
      {children}
      <BottomNav />
      <AIChatBubble />
    </div>
  )
}
