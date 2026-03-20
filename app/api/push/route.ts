import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { subscription, userId } = await req.json()
  const supabase = createServiceClient()

  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    subscription: JSON.stringify(subscription),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
