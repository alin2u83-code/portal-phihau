import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseRon(s: string): number {
  // "1.234,56" → 1234.56, "1234.56" → 1234.56, "1234,56" → 1234.56
  return parseFloat(s.replace(/\./g, '').replace(',', '.'))
}

function nameSimilarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s.toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, '')

  const wordsA = new Set(normalize(a).split(/\s+/).filter(w => w.length > 1))
  const wordsB = new Set(normalize(b).split(/\s+/).filter(w => w.length > 1))

  if (wordsA.size === 0 || wordsB.size === 0) return 0

  const intersection = [...wordsA].filter(w => wordsB.has(w)).length
  return intersection / Math.max(wordsA.size, wordsB.size)
}

// ---------------------------------------------------------------------------
// Bank parsers
// ---------------------------------------------------------------------------

interface ParsedPayment {
  suma?: number
  platitor?: string
  ref?: string
}

interface BankParser {
  banca: string
  pattern: RegExp
  extract: (m: RegExpMatchArray) => ParsedPayment
}

const BANK_PARSERS: BankParser[] = [
  {
    banca: 'ing',
    pattern: /ING[:\s]+Ai primit\s+([\d,.]+)\s*RON\s+de la\s+([A-ZĂÎÂȘȚ][A-ZĂÎÂȘȚa-zăîâșț\s]+?)(?:\.\s*Ref[^\s]*:\s*(\S+)|\.|$)/i,
    extract: (m: RegExpMatchArray) => ({ suma: parseRon(m[1]), platitor: m[2]?.trim(), ref: m[3] }),
  },
  {
    banca: 'bcr',
    pattern: /BCR[:\s]+(?:Suma de\s+)?([\d,.]+)\s*RON\s+(?:a fost credit[^\s]*\s+(?:in contul dvs[^\s]*\s+)?)?(?:Platitor[:\s]+)?([A-ZĂÎÂȘȚ][A-ZĂÎÂȘȚa-zăîâșț\s]+?)(?:\.|$)/i,
    extract: (m: RegExpMatchArray) => ({ suma: parseRon(m[1]), platitor: m[2]?.trim() }),
  },
  {
    banca: 'brd',
    pattern: /BRD[:\s]+.*?\+\s*([\d,.]+)\s*RON.*?[Dd]e la[:\s]+([A-ZĂÎÂȘȚ][A-ZĂÎÂȘȚa-zăîâșț\s]+?)(?:\.|Ref|$)/i,
    extract: (m: RegExpMatchArray) => ({ suma: parseRon(m[1]), platitor: m[2]?.trim() }),
  },
  {
    banca: 'raiffeisen',
    pattern: /Raiffeisen[^:]*:\s*(?:[Pp]lata\s+[^\s]+\s*)?([\d,.]+)\s*RON\s+de la\s+([A-ZĂÎÂȘȚ][A-ZĂÎÂȘȚa-zăîâșț\s]+?)(?:\.|$)/i,
    extract: (m: RegExpMatchArray) => ({ suma: parseRon(m[1]), platitor: m[2]?.trim() }),
  },
]

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONFIDENCE_THRESHOLD = 0.5

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  // 1. Auth check
  const secret = req.headers.get('x-callback-secret')
  if (secret !== Deno.env.get('SMS_CALLBACK_SECRET')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 2. Parse body
  // android-sms-gateway v2 webhook format (sms:received event):
  // { deviceId, event, id, webhookId, payload: { messageId, sender, phoneNumber, simNumber, receivedAt } }
  // v2 nu include textul mesajului în webhook → trebuie fetch din inbox API
  // Format alternativ legacy (v1): { device_id, phone_number, message, received_at }
  let rawBody: Record<string, unknown>
  try {
    rawBody = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Normalizare: suportă atât v1 (legacy) cât și v2 (sms:received event)
  let device_id: string
  let phone_number: string
  let message: string

  if (rawBody.event === 'sms:received') {
    // Format v2
    const payload = rawBody.payload as Record<string, string> | undefined
    device_id = rawBody.deviceId as string
    phone_number = payload?.sender ?? payload?.phoneNumber ?? ''
    // v2 nu include textul — trebuie fetch din gateway inbox
    const messageId = payload?.messageId
    if (!messageId || !device_id) {
      return new Response(JSON.stringify({ ok: true, message: 'missing messageId or deviceId' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }
    // Fetch text din sms_config pentru gateway_url + api_key
    const supabaseTmp = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: cfgTmp } = await supabaseTmp
      .from('sms_config')
      .select('club_id, gateway_url, api_key')
      .eq('gateway_device_id', device_id)
      .single()

    if (!cfgTmp?.gateway_url || !cfgTmp?.api_key) {
      return new Response(JSON.stringify({ ok: true, message: 'device not configured' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    try {
      const msgRes = await fetch(
        `${cfgTmp.gateway_url}/3rdparty/v1/messages/${messageId}`,
        { headers: { 'Authorization': `Bearer ${cfgTmp.api_key}` } },
      )
      if (!msgRes.ok) {
        return new Response(JSON.stringify({ ok: true, message: 'could not fetch message text' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }
      const msgData = await msgRes.json()
      message = msgData.message ?? msgData.text ?? msgData.textMessage?.text ?? ''
    } catch {
      return new Response(JSON.stringify({ ok: true, message: 'gateway fetch error' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }
  } else {
    // Format v1 legacy
    device_id = rawBody.device_id as string
    phone_number = rawBody.phone_number as string
    message = rawBody.message as string
  }

  if (!device_id || !message) {
    return new Response(JSON.stringify({ error: 'Missing device_id or message' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // 3. Găsește club după device_id
  const { data: config } = await supabase
    .from('sms_config')
    .select('club_id')
    .eq('gateway_device_id', device_id)
    .single()

  if (!config) {
    return new Response(JSON.stringify({ ok: true, message: 'device not registered' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 4. Parsează SMS
  let parsed: ParsedPayment | null = null
  let bancaDetectata: string | null = null
  for (const parser of BANK_PARSERS) {
    const match = message.match(parser.pattern)
    if (match) {
      parsed = parser.extract(match)
      bancaDetectata = parser.banca
      break
    }
  }

  // 5. Log în sms_incoming
  const { data: incoming, error: logError } = await supabase
    .from('sms_incoming')
    .insert({
      club_id: config.club_id,
      telefon_sursa: phone_number,
      continut: message,
      banca_detectata: bancaDetectata,
      suma_detectata: parsed?.suma ?? null,
      platitor_detectat: parsed?.platitor ?? null,
      referinta: parsed?.ref ?? null,
      status: (parsed?.suma && parsed?.platitor) ? 'processing' : 'ignored',
    })
    .select('id')
    .single()

  if (logError || !incoming) {
    console.error('Failed to log SMS:', logError?.message)
    return new Response(JSON.stringify({ error: 'internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!parsed?.suma || !parsed?.platitor) {
    return new Response(JSON.stringify({ ok: true, message: 'not a payment SMS' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 6. Caută plăți pending cu suma ±0.5 RON în clubul respectiv
  const { data: platiPending } = await supabase
    .from('plati')
    .select('id, suma, sportiv_id, sportivi(id, nume, prenume)')
    .eq('club_id', config.club_id)
    .eq('status', 'pending')
    .gte('suma', parsed.suma - 0.5)
    .lte('suma', parsed.suma + 0.5)

  if (!platiPending?.length) {
    await supabase
      .from('sms_incoming')
      .update({ status: 'unmatched', processed_at: new Date().toISOString() })
      .eq('id', incoming!.id)
    return new Response(JSON.stringify({ ok: true, message: 'no matching payment' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 7. Fuzzy match după nume platitor vs sportiv
  type PlataRow = (typeof platiPending)[0]
  let bestMatch: PlataRow | null = null
  let bestScore = 0

  for (const plata of platiPending) {
    const sportiv = Array.isArray(plata.sportivi) ? plata.sportivi[0] : plata.sportivi
    if (!sportiv) continue
    const sportivNume = `${sportiv.nume} ${sportiv.prenume}`
    const score = nameSimilarity(parsed.platitor!, sportivNume)
    if (score > bestScore) {
      bestScore = score
      bestMatch = plata
    }
  }

  // 8. Auto-confirmare sau unmatched → admin review
  if (bestMatch && bestScore >= CONFIDENCE_THRESHOLD) {
    await supabase
      .from('plati')
      .update({ status: 'achitat' })
      .eq('id', bestMatch.id)

    await supabase
      .from('sms_incoming')
      .update({
        status: 'matched',
        plata_id: bestMatch.id,
        confidence: bestScore,
        processed_at: new Date().toISOString(),
      })
      .eq('id', incoming!.id)

    // trg_plata_sms se activează automat → SMS confirmare sportiv
    console.log(`[sms-parse-bank] matched plata ${bestMatch.id} with confidence ${bestScore.toFixed(2)}`)
    return new Response(JSON.stringify({ ok: true, matched: true, confidence: bestScore }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } else {
    await supabase
      .from('sms_incoming')
      .update({
        status: 'unmatched',
        confidence: bestScore,
        processed_at: new Date().toISOString(),
      })
      .eq('id', incoming!.id)

    console.log(`[sms-parse-bank] no match for platitor "${parsed.platitor}", best score=${bestScore.toFixed(2)}`)
    return new Response(JSON.stringify({ ok: true, matched: false, confidence: bestScore }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
