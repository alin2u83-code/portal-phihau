import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIp } from './_rateLimit';

// Oglindește exact roleWeights din hooks/useRoleAssignment.ts — gardă server-side
// împotriva escaladării de privilegii (T-26-01, T-26-02).
const ROLE_WEIGHTS: Record<string, number> = {
  'SUPER_ADMIN_FEDERATIE': 5,
  'ADMIN': 4,
  'ADMIN_CLUB': 3,
  'INSTRUCTOR': 2,
  'SPORTIV': 1,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Rate limit — protecție împotriva abuzului (T-26-06).
  const rateLimitResult = checkRateLimit(`creare-cont:${getClientIp(req)}`, { windowMs: 60000, maxRequests: 10 });
  if (!rateLimitResult.allowed) {
    return res.status(429).json({ error: 'Prea multe cereri. Reîncercați peste un minut.' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    return res.status(500).json({ error: "Serverul nu este configurat corect: VITE_SUPABASE_URL lipsește." });
  }
  if (!supabaseServiceRoleKey) {
    return res.status(500).json({ error: "Serverul nu este configurat corect: SUPABASE_SERVICE_ROLE_KEY lipsește." });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // 2. Autentificare apelant (T-26-01) — orice client anonim era anterior
  // capabil să emită un cont cu roluri arbitrare folosind service role key.
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autentificare necesară.' });
  }
  const callerToken = authHeader.slice('Bearer '.length);
  const { data: callerAuthData, error: callerAuthError } = await supabaseAdmin.auth.getUser(callerToken);
  if (callerAuthError || !callerAuthData?.user) {
    return res.status(401).json({ error: 'Sesiune invalidă sau expirată. Reautentificați-vă.' });
  }
  const callerId = callerAuthData.user.id;

  // 3. Rolurile apelantului — determină greutatea maximă de privilegii.
  const { data: callerRoleRows, error: callerRolesError } = await supabaseAdmin
    .from('utilizator_roluri_multicont')
    .select('rol_denumire, club_id')
    .eq('user_id', callerId);

  if (callerRolesError) {
    return res.status(500).json({ error: 'Nu s-au putut verifica permisiunile apelantului.' });
  }

  const callerRoles = callerRoleRows || [];
  const callerMaxWeight = Math.max(0, ...callerRoles.map((r: any) => ROLE_WEIGHTS[r.rol_denumire] || 0));

  if (callerMaxWeight < 2) {
    return res.status(403).json({ error: 'Nu aveți permisiunea de a crea conturi.' });
  }

  const { email, password, userData, roles } = req.body;

  // 4. Anti-escaladare de privilegii (T-26-01).
  if (!Array.isArray(roles) || roles.length === 0) {
    return res.status(400).json({ error: 'Lista de roluri este invalidă.' });
  }
  for (const roleName of roles) {
    if (!(roleName in ROLE_WEIGHTS)) {
      return res.status(400).json({ error: `Rol necunoscut: ${roleName}.` });
    }
    if (ROLE_WEIGHTS[roleName] > callerMaxWeight) {
      return res.status(403).json({ error: 'Nu puteți acorda un rol cu privilegii mai mari decât rolul dumneavoastră.' });
    }
  }

  // 5. Scoping pe club (T-26-02) — apelanții non-federație doar în clubul propriu.
  if (callerMaxWeight < 5) {
    const cluburiApelant = new Set(callerRoles.map((r: any) => r.club_id).filter(Boolean));
    if (!userData?.club_id || !cluburiApelant.has(userData.club_id)) {
      return res.status(403).json({ error: 'Nu puteți crea conturi în alt club.' });
    }
  }

  try {
    // 1. Create user in auth.users (sau preia user-ul existent dacă emailul e deja înregistrat)
    let userId: string;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userData
    });

    if (authError) {
      // Dacă emailul există deja în auth.users, preia user_id-ul existent
      const isAlreadyRegistered =
        authError.message?.toLowerCase().includes('already been registered') ||
        authError.message?.toLowerCase().includes('already registered') ||
        authError.message?.toLowerCase().includes('already exists');

      if (!isAlreadyRegistered) throw authError;

      // Caută user-ul existent în sportivi după email
      const { data: existingSportiv, error: findError } = await supabaseAdmin
        .from('sportivi')
        .select('user_id')
        .eq('email', email)
        .maybeSingle();

      if (findError) throw findError;
      if (!existingSportiv?.user_id) {
        throw new Error(`Emailul ${email} există în autentificare dar nu are un profil sportiv asociat. Contactați administratorul.`);
      }

      userId = existingSportiv.user_id;
    } else {
      userId = authData.user.id;
    }

    // 2. Assign roles via RPC
    const { error: rpcError } = await supabaseAdmin.rpc('refactor_create_user_account', {
      p_nume: userData.nume,
      p_prenume: userData.prenume,
      p_email: email,
      p_username: userData.username || null,
      p_club_id: userData.club_id || null,
      p_roles: roles,
      p_user_id: userId,
      p_additional_data: {
        data_nasterii: userData.data_nasterii,
        cnp: userData.cnp,
        gen: userData.gen,
        telefon: userData.telefon,
        adresa: userData.adresa,
        grad_actual_id: userData.grad_actual_id,
        grupa_id: userData.grupa_id
      }
    });

    if (rpcError) throw rpcError;

    if (!userId) {
      return res.status(500).json({ error: "Contul a fost procesat dar userId-ul nu a putut fi determinat." });
    }

    // 6. Marchează că trebuie schimbată parola la prima autentificare (D-05).
    // RPC-ul refactor_create_user_account nu setează acest flag — vezi
    // api/reset-parola-sportiv.ts pentru pattern-ul identic (nu eșuăm request-ul).
    const { error: forceParolaError } = await supabaseAdmin
      .from('sportivi')
      .update({ trebuie_schimbata_parola: true })
      .eq('user_id', userId);

    if (forceParolaError) {
      console.warn('Nu s-a putut seta trebuie_schimbata_parola:', forceParolaError.message);
    }

    const { data: sportivData, error: sportivFetchError } = await supabaseAdmin
      .from('sportivi')
      .select('*, cluburi(*)')
      .eq('user_id', userId)
      .maybeSingle();

    if (sportivFetchError) throw sportivFetchError;

    res.json({ success: true, userId, sportiv: sportivData });
  } catch (error: any) {
    console.error("Error creating account:", error);
    res.status(500).json({ error: error.message });
  }
}
