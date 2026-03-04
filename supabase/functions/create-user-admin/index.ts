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
    // Extragem doar câmpurile necesare conform cerințelor
    const { email, nume, prenume, data_nasterii, gen, club_id } = await req.json()

    // Validare câmpuri obligatorii
    if (!email || !nume || !prenume || !data_nasterii || !gen) {
      throw new Error('Toate câmpurile sunt obligatorii: email, nume, prenume, data_nasterii, gen.')
    }

    // Crearea unui client Supabase cu rol de administrator (folosind cheia de serviciu)
    const supabaseAdmin = createClient(
      (globalThis as any).Deno.env.get('SUPABASE_URL') ?? '',
      (globalThis as any).Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Generare parolă standard (sau aleatorie dacă se dorește)
    // Pentru simplitate și consistență în acest exemplu, folosim o parolă default complexă
    // Într-o aplicație reală, s-ar putea trimite un email de resetare parolă
    const generatedPassword = `QwanKiDo${new Date().getFullYear()}!`;

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
