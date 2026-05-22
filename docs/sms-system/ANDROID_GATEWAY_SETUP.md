# Setup Android SMS Gateway

## Prezentare generală

Arhitectura SMS a portalului funcționează direct între Supabase Edge Functions și telefonul Android cu SIM Orange, fără servicii intermediare plătite.

```
Aplicație → sms_queue (Supabase DB) → pg_cron (5 min) → Edge Function → Android Gateway → Orange → Client
Bancă → SMS la telefon → Android Gateway → webhook → sms-parse-bank → auto-confirmare plată
```

## Cerințe

- Telefon Android cu SIM Orange activ
- Aplicație android-sms-gateway instalată
- ngrok sau Cloudflare Tunnel (pentru expunere internet)

## Pas 1: Instalare android-sms-gateway

1. Descarcă APK-ul din [GitHub Releases](https://github.com/capcom6/android-sms-gateway/releases/latest)
2. Activează "Instalare din surse necunoscute" în setările Android
3. Instalează APK-ul
4. Deschide aplicația → vei vedea un IP local (ex: `http://192.168.1.100:9090`)
5. Notează **Device ID** afișat în aplicație (necesar pentru configurare club în portal)

## Pas 2: Configurare token autentificare

1. În aplicație → Settings → Security
2. Setează un token Bearer (ex: `my-secret-token-2026`)
3. Salvează token-ul — îl vei introduce în portal la configurarea gateway-ului

## Pas 3: Expunere internet cu ngrok (recomandat pentru start)

```bash
# Instalare ngrok
npm install -g ngrok
# SAU descarcă de la https://ngrok.com/download

# Autentificare (o singură dată, necesită cont gratuit)
ngrok config add-authtoken <your-ngrok-token>

# Pornire tunel
ngrok http 9090
```

Rezultat: `https://abc123.ngrok.io` → Aceasta devine `ANDROID_GATEWAY_URL`

**Notă:** URL-ul ngrok gratuit se schimbă la fiecare repornire. Pentru producție, folosește Cloudflare Tunnel (Pasul 3b).

## Pas 3b: Expunere internet cu Cloudflare Tunnel (recomandat producție)

```bash
# Instalare cloudflared
# Windows: winget install --id Cloudflare.cloudflared
# Linux: curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared && chmod +x cloudflared

# Pornire tunel (fără cont, URL temporar)
cloudflared tunnel --url http://localhost:9090

# Sau cu cont Cloudflare (URL stabil, subdomain propriu):
cloudflared tunnel create sms-gateway
cloudflared tunnel route dns sms-gateway sms.yourdomain.com
cloudflared tunnel run sms-gateway
```

## Pas 4: Configurare webhook SMS incoming (pentru parsing plăți bancă)

În aplicația android-sms-gateway:
1. Settings → Webhooks → Add Webhook
2. URL: `https://<your-supabase-project>.supabase.co/functions/v1/sms-parse-bank`
3. Type: **Incoming SMS**
4. Headers: `x-callback-secret: <valoarea SMS_CALLBACK_SECRET din .env>`
5. Opțional: Filter by sender — adaugă numerele băncii tale:
   - ING: `0800030666` sau `ING`
   - BCR: `BCR`
   - BRD: `BRD`
   - Raiffeisen: `Raiffeisen`

## Pas 5: Configurare callback delivery status

1. Settings → Webhooks → Add Webhook
2. URL: `https://<your-supabase-project>.supabase.co/functions/v1/sms-callback`
3. Type: **Message Status**
4. Headers: `x-callback-secret: <valoarea SMS_CALLBACK_SECRET din .env>`

## Pas 6: Configurare în portal

1. Autentifică-te ca ADMIN_CLUB
2. Meniu → SMS → tab Configurare
3. Completează:
   - **Provider:** Android Gateway
   - **Gateway URL:** URL-ul ngrok/Cloudflare (ex: `https://abc123.ngrok.io`)
   - **API Key/Token:** token-ul setat în Pasul 2
   - **Device ID:** ID-ul din aplicație (Pasul 1)
   - **Telefon sender:** numărul SIM-ului din telefon (informativ)
4. Click **Testează conexiunea** — ar trebui să primești un SMS de test

## Pas 7: Activare pg_cron în Supabase

Rulează în **Supabase Dashboard → SQL Editor:**

```sql
-- Activează extensia pg_cron (dacă nu e activată)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Job 1: Procesare queue SMS la fiecare 5 minute
SELECT cron.schedule(
  'sms-process-queue',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<your-project>.supabase.co/functions/v1/sms-process-queue',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Job 2: Generare remindere zilnic la 07:00
SELECT cron.schedule(
  'sms-schedule-reminders',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<your-project>.supabase.co/functions/v1/sms-schedule-reminders',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

## Pas 8: Deploy Edge Functions

```bash
# Din directorul proiectului
supabase functions deploy sms-process-queue
supabase functions deploy sms-callback
supabase functions deploy sms-schedule-reminders
supabase functions deploy sms-parse-bank

# Setează secretele
supabase secrets set SMS_CALLBACK_SECRET=<valoarea din .env>
supabase secrets set ANDROID_GATEWAY_URL=<URL-ul ngrok/CF>
supabase secrets set ANDROID_GATEWAY_TOKEN=<token-ul gateway>
supabase secrets set SMS_PROVIDER=android_gateway
```

## Pas 9: Migrație DB

Rulează în **Supabase Dashboard → SQL Editor:**

```bash
# Sau via CLI
supabase db push
```

Sau copiază conținutul `supabase/migrations/20260523_sms_system.sql` și rulează manual în SQL Editor.

## Scalare

| Volum | Setup recomandat |
|---|---|
| 20-30 SMS/lună | Android Gateway + ngrok. pg_cron 5min. |
| 1000+ SMS/lună | Cloudflare Tunnel (URL stabil). SIM Orange Business (tarife bulk). Mărește `rate_limit_per_hour` la 50. |
| 10000+ SMS/lună | Înlocuiește provider: în portal SMS → Configurare, schimbă provider la `smslink` sau `twilio`. Adaugă `SMSLINK_CONNECTION_ID` și `SMSLINK_PASSWORD` (sau `TWILIO_SID`/`TWILIO_AUTH_TOKEN`) în Supabase secrets. Zero cod de schimbat. |

## Troubleshooting

**SMS-urile nu se trimit:**
1. Verifică că `sms_config.activ = true` în DB
2. Verifică că `sms_config.gateway_url` este URL-ul ngrok curent (se schimbă la repornire!)
3. Verifică că ngrok/cloudflared rulează pe telefon
4. Click "Testează conexiunea" în portal → verifică eroarea afișată

**Plățile nu se auto-confirmă din SMS bancă:**
1. Verifică că webhook-ul "Incoming SMS" e configurat în android-sms-gateway (Pasul 4)
2. Verifică `sms_incoming` în Supabase — SMS-ul a ajuns cu status `unmatched`?
3. Dacă `confidence < 0.5`: numele plătitorului din SMS diferă prea mult de cel din DB — confirmă manual din SMS → Încasări
4. Adaugă filtru pe numărul băncii în aplicație (Pasul 4, opțional) pentru a evita SMS-uri non-financiare

**Banca mea nu e recunoscută:**
Adaugă un parser regex nou în `supabase/functions/sms-parse-bank/index.ts`, în array-ul `BANK_PARSERS`. Testează cu SMS-ul real de la bancă.
