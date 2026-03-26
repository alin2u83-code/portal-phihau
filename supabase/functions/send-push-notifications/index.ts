// supabase/functions/send-push-notifications/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificare autentificare
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Lipsește header-ul de autorizare.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabaseAdmin = createClient(
      (globalThis as any).Deno.env.get('SUPABASE_URL') ?? '',
      (globalThis as any).Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verificare JWT și identitate caller
    const supabaseClient = createClient(
      (globalThis as any).Deno.env.get('SUPABASE_URL') ?? '',
      (globalThis as any).Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: callerUser }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Token invalid sau expirat.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // Verificare rol SUPER_ADMIN_FEDERATIE
    const { data: roleCheck } = await supabaseAdmin
      .from('utilizator_roluri_multicont')
      .select('id')
      .eq('user_id', callerUser.id)
      .eq('rol_denumire', 'SUPER_ADMIN_FEDERATIE')
      .maybeSingle()
    if (!roleCheck) {
      return new Response(JSON.stringify({ error: 'Acces interzis. Necesită rol SUPER_ADMIN_FEDERATIE.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const { title, body } = await req.json();
    if (!title || !body) {
        throw new Error("Payload-ul trebuie să conțină 'title' și 'body'.");
    }
    
    // Set VAPID details din variabilele de mediu
    const vapidPublicKey = (globalThis as any).Deno.env.get('VITE_VAPID_PUBLIC_KEY');
    const vapidPrivateKey = (globalThis as any).Deno.env.get('VAPID_PRIVATE_KEY');
    const mailto = (globalThis as any).Deno.env.get('VAPID_MAILTO');

    if (!vapidPublicKey || !vapidPrivateKey || !mailto) {
        throw new Error("Cheile VAPID nu sunt configurate în variabilele de mediu.");
    }

    webpush.setVapidDetails(
      `mailto:${mailto}`,
      vapidPublicKey,
      vapidPrivateKey
    );

    // Preia toate abonamentele din baza de date
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription');

    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: "Nu au fost găsite abonamente active." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const notificationPayload = JSON.stringify({ title, body });

    const sendPromises = subscriptions.map(sub =>
      webpush.sendNotification(
        sub.subscription,
        notificationPayload
      ).catch((err: any) => {
        // Gestionează abonamentele expirate sau invalide
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log('Abonament expirat sau invalid: ', err.endpoint);
          // TODO: Implementează logica pentru a șterge abonamentul invalid din baza de date
        } else {
          console.error('Eroare la trimiterea notificării:', err);
        }
      })
    );

    await Promise.all(sendPromises);

    return new Response(JSON.stringify({ message: `Notificări trimise către ${subscriptions.length} abonați.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
