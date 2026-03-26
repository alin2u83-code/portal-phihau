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
    // Verificare autentificare
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Lipsește header-ul de autorizare.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // Crearea unui client Supabase cu rol de administrator (folosind cheia de serviciu)
    const supabaseAdmin = createClient(
      (globalThis as any).Deno.env.get('SUPABASE_URL') ?? '',
      (globalThis as any).Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

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

    // Extragem doar câmpurile necesare conform cerințelor
    const { email, nume, prenume, data_nasterii, gen, club_id } = await req.json()

    // Validare câmpuri obligatorii
    if (!email || !nume || !prenume || !data_nasterii || !gen) {
      throw new Error('Toate câmpurile sunt obligatorii: email, nume, prenume, data_nasterii, gen.')
    }

    // Generare parolă aleatorie securizată
    const randomBytes = new Uint8Array(12)
    crypto.getRandomValues(randomBytes)
    const generatedPassword = btoa(String.fromCharCode(...randomBytes)).replace(/[+/=]/g, (c) => ({ '+': 'A', '/': 'B', '=': '' }[c] ?? c)) + '1!'

    // Crearea noului utilizator folosind metoda de admin
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: generatedPassword,
      email_confirm: true, // Confirmă automat adresa de email
      user_metadata: {
        nume: nume.toUpperCase(), // Asigurăm uppercase pentru nume
        prenume: prenume,
      }
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

    // Generare username standard
    const finalUsername = `${prenume.toLowerCase()}.${nume.toLowerCase()}`;

    // Apel RPC pentru înregistrarea sportivului folosind funcția v2
    // Nu se face insert direct în tabela sportivi
    // Nu se trimite status_viza_medicala
    const { error: rpcError } = await supabaseAdmin.rpc('inregistreaza_sportiv_v2', {
      p_user_id: data.user.id,
      p_nume: nume.toUpperCase(), // Asigurăm uppercase
      p_prenume: prenume,
      p_data_nasterii: data_nasterii,
      p_gen: gen,
      p_email: email,
      p_username: finalUsername,
      p_club_id: club_id || null
    });

    if (rpcError) {
      // Dacă RPC-ul eșuează, ar trebui ideal să ștergem userul creat pentru consistență,
      // dar pentru moment aruncăm eroarea
      console.error("RPC Error:", rpcError);
      throw new Error(`Eroare la înregistrarea profilului sportiv: ${rpcError.message}`);
    }

    // Returnează datele noului utilizator și parola generată (pentru a fi comunicată userului dacă e cazul)
    return new Response(JSON.stringify({ 
      user: data.user, 
      message: "Utilizator creat cu succes",
      tempPassword: generatedPassword 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
