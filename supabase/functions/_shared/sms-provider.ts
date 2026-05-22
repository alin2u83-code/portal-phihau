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

// android-sms-gateway v2+ API (docs.sms-gate.app)
// Local mode (ngrok): POST /3rdparty/v1/messages + Bearer JWT
// Local legacy:       POST /message + Basic Auth (username:password)
export class AndroidGatewayProvider implements SmsProvider {
  readonly name = 'android_gateway'

  constructor(
    private readonly gatewayUrl: string,
    private readonly token: string,
    private readonly username?: string, // set for Basic Auth (legacy local mode)
  ) {}

  async send(msg: SmsMessage): Promise<SmsResult> {
    try {
      // Local legacy mode uses /message + Basic Auth; new API uses /3rdparty/v1/messages + JWT
      const isLegacyLocal = !!this.username
      const url = isLegacyLocal
        ? `${this.gatewayUrl}/message`
        : `${this.gatewayUrl}/3rdparty/v1/messages`

      const authHeader = isLegacyLocal
        ? `Basic ${btoa(`${this.username}:${this.token}`)}`
        : `Bearer ${this.token}`

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          phoneNumbers: [msg.to],
          textMessage: { text: msg.body },
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        return { success: false, error: `HTTP ${res.status}: ${text}` }
      }

      const data = await res.json()
      return { success: true, externalId: data.id }
    } catch (err) {
      return { success: false, error: `network error: ${err instanceof Error ? err.message : String(err)}` }
    }
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
    try {
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

      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}: ${text}` }
      }

      // Răspuns numeric pozitiv = ID mesaj (succes)
      if (/^\d+$/.test(text)) {
        return { success: true, externalId: text }
      }

      return { success: false, error: `smslink error: ${text}` }
    } catch (err) {
      return { success: false, error: `network error: ${err instanceof Error ? err.message : String(err)}` }
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface SmsProviderConfig {
  provider: string
  gatewayUrl?: string
  token?: string       // JWT Bearer (new API) sau password (legacy Basic Auth)
  username?: string    // setat doar pentru legacy Basic Auth
  connectionId?: string
  password?: string
}

export function createSmsProvider(config: SmsProviderConfig): SmsProvider {
  switch (config.provider) {
    case 'android_gateway':
      if (!config.gatewayUrl || !config.token) {
        throw new Error('android_gateway requires gatewayUrl and token')
      }
      return new AndroidGatewayProvider(config.gatewayUrl, config.token, config.username)

    case 'smslink':
      if (!config.connectionId || !config.password) {
        throw new Error('smslink requires connectionId and password')
      }
      return new SMSLinkProvider(config.connectionId, config.password)

    default:
      throw new Error(`Unknown SMS provider: ${config.provider}`)
  }
}
