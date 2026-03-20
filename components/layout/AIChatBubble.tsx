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
          background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)', zIndex: 100,
          display: 'flex', flexDirection: 'column', maxHeight: '70vh',
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ff6b2b22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={16} color="#ff6b2b" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Car Assistant</div>
                <div style={{ fontSize: 11, color: '#22c55e' }}>● Online</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '85%', padding: '10px 14px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: m.role === 'user' ? '#ff6b2b' : '#242424',
                  fontSize: 13, lineHeight: 1.5, color: '#f5f5f5',
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex' }}>
                <div style={{ padding: '10px 14px', background: '#242424', borderRadius: '16px 16px 16px 4px', fontSize: 13, color: '#888' }}>
                  Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #2a2a2a', display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask about your car..."
              style={{
                flex: 1, background: '#111', border: '1px solid #2a2a2a', borderRadius: 10,
                padding: '10px 12px', color: '#f5f5f5', fontSize: 13, outline: 'none',
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              style={{
                width: 38, height: 38, borderRadius: 10, background: input.trim() ? '#ff6b2b' : '#2a2a2a',
                border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transition: 'background 0.15s',
              }}
            >
              <Send size={15} color="white" />
            </button>
          </div>
        </div>
      )}

      {/* Bubble button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 80, right: 16,
          width: 52, height: 52, borderRadius: '50%',
          background: '#ff6b2b', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(255,107,43,0.4)',
          zIndex: 99, transition: 'transform 0.15s',
        }}
      >
        {open ? <X size={22} color="white" /> : <MessageCircle size={22} color="white" />}
      </button>
    </>
  )
}
