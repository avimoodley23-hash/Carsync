import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { message, vehicleContext } = await req.json()

  const systemPrompt = `You are a friendly, knowledgeable car assistant for CarSync — a car maintenance app.
${vehicleContext ? `The user's vehicle: ${vehicleContext}` : ''}

Help users with:
- Understanding warning lights and what they mean
- Explaining car maintenance (oil changes, brake fluid, coolant, filters, etc.)
- DIY tips for simple checks (how to check oil, tyre pressure, coolant level)
- Explaining what services mean and why they matter
- Estimating when things might need attention
- General car ownership advice

Keep answers concise, practical and friendly. Use simple language — not everyone is a mechanic.
If something requires a professional mechanic, say so clearly.`

  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        max_tokens: 400,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
      }),
    })

    const data = await res.json()
    const reply = data.choices?.[0]?.message?.content ?? "I'm having trouble responding right now."
    return NextResponse.json({ reply })
  } catch (err) {
    console.error('AI chat error:', err)
    return NextResponse.json({ reply: "I'm having trouble connecting right now. Try again in a moment." })
  }
}
