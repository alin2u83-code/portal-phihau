import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // Security: verifică secret header
  const secret = req.headers.get('x-callback-secret')
  if (secret !== Deno.env.get('SMS_CALLBACK_SECRET')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  // android-sms-gateway callback format:
  // { id: string, state: 'Delivered'|'Failed'|'Sent', results: [{phoneNumber, state, error?}] }
  // sau format simplificat: { queue_id: string, status: 'delivered'|'failed', delivered_at?: string, error?: string }

  // Suportă ambele formate
  const queueId = body.queue_id ?? body.id
  const isDelivered = (body.status === 'delivered') || (body.state === 'Delivered')
  const isFailed = (body.status === 'failed') || (body.state === 'Failed')
  const deliveredAt = body.delivered_at ?? (isDelivered ? new Date().toISOString() : null)
  const errorMsg = body.error ?? (body.results?.[0]?.error ?? null)

  if (!queueId) {
    return new Response(JSON.stringify({ error: 'Missing queue_id or id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const updateData: Record<string, unknown> = {}

  if (isDelivered) {
    updateData.status = 'sent'
    updateData.delivered_at = deliveredAt
    updateData.error_message = null
  } else if (isFailed) {
    updateData.status = 'failed'
    updateData.error_message = errorMsg
  }
  // Dacă nici delivered nici failed (ex: state='Sent') — nu updatem nimic

  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase
      .from('sms_queue')
      .update(updateData)
      .eq('id', queueId)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
