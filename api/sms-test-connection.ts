import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { club_id, test_phone } = req.body;
  if (!club_id || !test_phone) {
    return res.status(400).json({ error: 'club_id și test_phone sunt obligatorii' });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch config
  const { data: config, error: configErr } = await supabase
    .from('sms_config')
    .select('provider, gateway_url, api_key, activ')
    .eq('club_id', club_id)
    .single();

  if (configErr || !config) {
    return res.status(404).json({ error: 'SMS config negăsit pentru acest club' });
  }
  if (!config.activ) {
    return res.status(400).json({ error: 'SMS dezactivat pentru acest club' });
  }
  if (!config.gateway_url) {
    return res.status(400).json({ error: 'gateway_url nu este configurat' });
  }

  const startTime = Date.now();

  try {
    // Test direct — bypass queue
    const gatewayRes = await fetch(`${config.gateway_url}/v1/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api_key}`,
      },
      body: JSON.stringify({
        phoneNumbers: [test_phone],
        message: 'Test conexiune SMS Portal. Dacă primești acest mesaj, integrarea funcționează corect.',
        withDeliveryReport: false,
      }),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    const latencyMs = Date.now() - startTime;

    if (!gatewayRes.ok) {
      const errorText = await gatewayRes.text();
      // Actualizează status în DB
      await supabase.from('sms_config').update({
        status: 'error',
        last_error: `HTTP ${gatewayRes.status}: ${errorText.slice(0, 200)}`,
        last_check_at: new Date().toISOString(),
      }).eq('club_id', club_id);

      return res.status(200).json({ success: false, error: `Gateway HTTP ${gatewayRes.status}`, latency_ms: latencyMs });
    }

    // Success — actualizează status
    await supabase.from('sms_config').update({
      status: 'connected',
      last_error: null,
      last_check_at: new Date().toISOString(),
    }).eq('club_id', club_id);

    return res.json({ success: true, latency_ms: latencyMs });

  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);

    await supabase.from('sms_config').update({
      status: 'error',
      last_error: errorMsg.slice(0, 500),
      last_check_at: new Date().toISOString(),
    }).eq('club_id', club_id);

    return res.status(200).json({ success: false, error: errorMsg, latency_ms: latencyMs });
  }
}
