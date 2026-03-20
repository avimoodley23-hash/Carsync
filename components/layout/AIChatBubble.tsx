'use client'
import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string }

interface Props {
  vehicleContext?: string
}

export default function AIChatBubble({ vehicleContext }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm your car assistant. Ask me anything about your vehicle — warning lights, maintenance tips, DIY guides, or what a service means." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(m => [...m, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, vehicleContext }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, I had trouble connecting. Try again.' }])
    }
    setLoading(false)
  }

  return (
    <>
      {/* Chat window */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 90, right: 16, width: 340, maxWidth: 'calc(100vw - 32px)',
          background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: 24,
          boxShadow: 'var(--shadow-chat)', zIndex: 100,
          display: 'flex', flexDirection: 'column', maxHeight: '70vh',
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #F0F0EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F2FFD6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={16} color="#6B8F0E" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111111' }}>Car Assistant</div>
                <div style={{ fontSize: 11, color: '#22C55E' }}>● Online</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#888888', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '10px 14px',
                  borderRadius: m.role === 'user' ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
                  background: m.role === 'user' ? '#CBFF4D' : '#F0F0EB',
                  fontSize: 13, lineHeight: 1.5,
                  color: '#111111',
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex' }}>
                <div style={{ padding: '12px 16px', background: '#F0F0EB', borderRadius: '20px 20px 20px 6px', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #F0F0EB', display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask about your car..."
              style={{
                flex: 1, background: '#F5F5F0', border: '1.5px solid #E5E5E0', borderRadius: 12,
                padding: '10px 12px', color: '#111111', fontSize: 13, outline: 'none',
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              style={{
                width: 38, height: 38, borderRadius: 12,
                background: input.trim() ? '#CBFF4D' : '#E8E8E3',
                border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transition: 'background 0.15s',
              }}
            >
              <Send size={15} color={input.trim() ? '#111111' : '#888888'} />
            </button>
          </div>
        </div>
      )}

      {/* Bubble button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 80, right: 16,
          width: 56, height: 56, borderRadius: '50%',
          background: '#CBFF4D', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(203,255,77,0.35)',
          zIndex: 99, transition: 'transform 0.15s',
        }}
      >
        {open ? <X size={22} color="#111111" /> : <MessageCircle size={22} color="#111111" />}
      </button>
    </>
  )
}
