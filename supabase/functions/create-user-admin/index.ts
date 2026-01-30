// supabase/functions/create-user-admin/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Definirea headerelor CORS pentru a permite cereri de la orice origine
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Gestionarea cererii pre-flight OPTIONS pentru CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      throw new Error('Email-ul și parola sunt obligatorii.')
    }

    // Crearea unui client Supabase cu rol de administrator (folosind cheia de serviciu)
    // FIX: The type checker doesn't know about the Deno global. Access it via globalThis to avoid compile-time errors in environments without Deno types.
    const supabaseAdmin = createClient(
      (globalThis as any).Deno.env.get('SUPABASE_URL') ?? '',
      (globalThis as any).Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Crearea noului utilizator folosind metoda de admin
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmă automat adresa de email
    })

    if (error) {
      // Verifică erorile comune pentru a returna un mesaj clar
      if (error.message.includes('User already registered') || error.message.includes('User already exists')) {
         return new Response(JSON.stringify({ error: 'User already exists' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409, // Conflict
        })
      }
      throw error
    }

    // Returnează datele noului utilizator
    return new Response(JSON.stringify({ user: data.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
