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
    const { email, password, nume, prenume, data_nasterii, gen, username } = await req.json()

    if (!email || !password || !nume || !prenume || !data_nasterii || !gen) {
      throw new Error('Toate câmpurile sunt obligatorii: email, password, nume, prenume, data_nasterii, gen.')
    }

    // Crearea unui client Supabase cu rol de administrator (folosind cheia de serviciu)
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

    // Generare username dacă nu este furnizat
    const finalUsername = username || `${prenume.toLowerCase()}.${nume.toLowerCase()}`;

    // Apel RPC pentru înregistrarea sportivului
    const { error: rpcError } = await supabaseAdmin.rpc('inregistreaza_sportiv_rapid', {
      p_user_id: data.user.id,
      p_nume: nume,
      p_prenume: prenume,
      p_data_nasterii: data_nasterii,
      p_gen: gen,
      p_email: email,
      p_username: finalUsername
    });

    if (rpcError) {
      throw rpcError;
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
