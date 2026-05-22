import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createSmsProvider } from '../_shared/sms-provider.ts'

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const now = new Date().toISOString()

  // 1. Fetch pending/failed items eligibile pentru procesare
  const { data: items, error: fetchError } = await supabase
    .from('sms_queue')
    .select(`
      id, club_id, sportiv_id, telefon, mesaj, tip,
      status, retry_count, max_retries, scheduled_at, metadata
    `)
    .in('status', ['pending', 'failed'])
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(50)

  if (fetchError) {
    console.error('[sms-process-queue] fetch queue error:', fetchError.message)
    return new Response(
      JSON.stringify({ error: fetchError.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (!items || items.length === 0) {
    return new Response(
      JSON.stringify({ processed: 0 }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  }

  let processed = 0

  // Cache config per club_id ca să nu facem query repetat pentru același club
  const configCache: Record<string, {
    provider: string
    gateway_url: string | null
    api_key: string | null
    rate_limit_per_hour: number
    activ: boolean
  } | null> = {}

  for (const item of items) {
    // Verifică retry_count < max_retries (nu poate fi filtrat simplu pe server
    // când max_retries diferă per item)
    if (item.retry_count >= item.max_retries) {
      // Marchează definitiv failed dacă nu e deja
      if (item.status !== 'failed') {
        await supabase
          .from('sms_queue')
          .update({ status: 'failed' })
          .eq('id', item.id)
      }
      continue
    }

    // 2. Fetch sms_config pentru club (cu cache)
    if (!(item.club_id in configCache)) {
      const { data: cfg } = await supabase
        .from('sms_config')
        .select('provider, gateway_url, api_key, rate_limit_per_hour, activ')
        .eq('club_id', item.club_id)
        .single()
      configCache[item.club_id] = cfg ?? null
    }

    const config = configCache[item.club_id]

    // Skip dacă lipsă config sau club inactiv
    if (!config || !config.activ) {
      console.warn(`[sms-process-queue] skip item ${item.id}: no config or inactive for club ${item.club_id}`)
      continue
    }

    // 3. Verifică rate limit: SMS-uri trimise în ultimele 60 de minute pentru club
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: rateSent } = await supabase
      .from('sms_rate_log')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', item.club_id)
      .gte('sent_at', oneHourAgo)

    if ((rateSent ?? 0) >= config.rate_limit_per_hour) {
      console.warn(`[sms-process-queue] skip item ${item.id}: rate limit reached for club ${item.club_id}`)
      continue
    }

    // 4. Marchează optimist ca 'sending'
    const { error: markSendingErr } = await supabase
      .from('sms_queue')
      .update({ status: 'sending' })
      .eq('id', item.id)
      .eq('status', item.status) // guard: nu suprascrie dacă alt worker l-a preluat

    if (markSendingErr) {
      console.warn(`[sms-process-queue] could not mark item ${item.id} as sending:`, markSendingErr.message)
      continue
    }

    // 5. Instanțiază provider și trimite SMS
    let provider
    try {
      provider = createSmsProvider({
        provider: config.provider,
        gatewayUrl: config.gateway_url ?? undefined,
        token: config.api_key ?? undefined,
      })
    } catch (err) {
      console.error(`[sms-process-queue] cannot create provider for club ${item.club_id}:`, err)
      // Revert la pending ca să putem retria după ce config e reparat
      await supabase
        .from('sms_queue')
        .update({ status: 'pending', error_message: `Provider error: ${err instanceof Error ? err.message : String(err)}` })
        .eq('id', item.id)
      continue
    }

    const result = await provider.send({
      to: item.telefon,
      body: item.mesaj,
      queueId: item.id,
    })

    if (result.success) {
      // 6a. Succes: marchează sent + log rate
      await supabase
        .from('sms_queue')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          external_id: result.externalId ?? null,
          error_message: null,
        })
        .eq('id', item.id)

      await supabase
        .from('sms_rate_log')
        .insert({ club_id: item.club_id })

      processed++
      console.log(`[sms-process-queue] sent item ${item.id} via ${provider.name}, external_id=${result.externalId}`)
    } else {
      // 6b. Eșec: exponential backoff + incrementare retry_count
      const newRetryCount = item.retry_count + 1
      const backoffMinutes = newRetryCount * 5
      const nextScheduledAt = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString()
      const newStatus = newRetryCount < item.max_retries ? 'pending' : 'failed'

      await supabase
        .from('sms_queue')
        .update({
          status: newStatus,
          retry_count: newRetryCount,
          scheduled_at: nextScheduledAt,
          error_message: result.error ?? 'Unknown error',
        })
        .eq('id', item.id)

      console.warn(`[sms-process-queue] failed item ${item.id}: ${result.error} → ${newStatus} (retry ${newRetryCount}/${item.max_retries}, next at ${nextScheduledAt})`)
    }

    // 7. Pauză 2 secunde între SMS pentru a evita flood la gateway
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  return new Response(
    JSON.stringify({ processed }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
