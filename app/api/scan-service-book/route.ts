import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('image') as File
  if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')
  const mimeType = file.type || 'image/jpeg'

  const prompt = `This is a photo of a car service book or service record. Extract the following information and return ONLY valid JSON (no markdown, no explanation):
{
  "date": "YYYY-MM-DD or null",
  "odometer": number or null,
  "serviceType": "most likely service type from: Oil Change, Full Service, Brake Inspection, Tyre Rotation, Air Filter, Cabin Filter, Spark Plugs, Coolant Flush, Transmission Service, Battery Check, Wheel Alignment, Cambelt / Timing Belt, Other",
  "cost": number or null,
  "notes": "any other relevant info or null",
  "workshop": "name of workshop/dealer or null"
}
If you cannot read certain fields, return null for those fields.`

  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-2-vision-1212',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    })

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content ?? '{}'
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const extracted = JSON.parse(cleaned)
    return NextResponse.json({ success: true, data: extracted })
  } catch (err) {
    console.error('Scan error:', err)
    return NextResponse.json({ success: false, data: null, error: 'Could not read image' })
  }
}
