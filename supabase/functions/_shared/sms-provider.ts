// SMS Provider abstraction — business logic must not depend on a concrete provider.
// Add new providers only when actually needed (YAGNI).

export interface SmsMessage {
  to: string      // destinatar număr telefon
  body: string    // textul SMS-ului
  queueId: string // UUID din sms_queue (pentru callback / tracking)
}

export interface SmsResult {
  success: boolean
  externalId?: string  // ID returnat de gateway pentru tracking
  error?: string       // mesaj de eroare dacă success=false
}

export interface SmsProvider {
  send(msg: SmsMessage): Promise<SmsResult>
  readonly name: string
}

// ---------------------------------------------------------------------------
// AndroidGatewayProvider
// Docs: https://docs.android-sms-gateway.com/api/
// Auth: Bearer token
// ---------------------------------------------------------------------------

export class AndroidGatewayProvider implements SmsProvider {
  readonly name = 'android_gateway'

  constructor(
    private readonly gatewayUrl: string,
    private readonly token: string,
  ) {}

  async send(msg: SmsMessage): Promise<SmsResult> {
    const res = await fetch(`${this.gatewayUrl}/v1/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        phoneNumbers: [msg.to],
        message: msg.body,
        withDeliveryReport: true,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return { success: false, error: `HTTP ${res.status}: ${text}` }
    }

    const data = await res.json()
    return { success: true, externalId: data.id ?? data.message_id }
  }
}

// ---------------------------------------------------------------------------
// SMSLinkProvider
// Docs: https://www.smslink.ro/sms-gateway.html
// Response: ID numeric pozitiv = succes; cod negativ = eroare
// ---------------------------------------------------------------------------

export class SMSLinkProvider implements SmsProvider {
  readonly name = 'smslink'

  constructor(
    private readonly connectionId: string,
    private readonly password: string,
  ) {}

  async send(msg: SmsMessage): Promise<SmsResult> {
    const params = new URLSearchParams({
      connection_id: this.connectionId,
      password: this.password,
      to: msg.to,
      message: msg.body,
    })

    const res = await fetch(
      `https://secure.smslink.ro/sms/gateway/communicate/index.php?${params}`,
    )
    const text = (await res.text()).trim()

    // Răspuns numeric pozitiv = ID mesaj (succes)
    if (/^\d+$/.test(text)) {
      return { success: true, externalId: text }
    }

    return { success: false, error: `smslink error: ${text}` }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

interface SmsProviderConfig {
  provider: string
  gatewayUrl?: string
  token?: string
  connectionId?: string
  password?: string
}

export function createSmsProvider(config: SmsProviderConfig): SmsProvider {
  switch (config.provider) {
    case 'android_gateway':
      if (!config.gatewayUrl || !config.token) {
        throw new Error('android_gateway requires gatewayUrl and token')
      }
      return new AndroidGatewayProvider(config.gatewayUrl, config.token)

    case 'smslink':
      if (!config.connectionId || !config.password) {
        throw new Error('smslink requires connectionId and password')
      }
      return new SMSLinkProvider(config.connectionId, config.password)

    default:
      throw new Error(`Unknown SMS provider: ${config.provider}`)
  }
}
