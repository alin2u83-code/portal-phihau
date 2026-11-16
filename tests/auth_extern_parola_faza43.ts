// tests/auth_extern_parola_faza43.ts
//
// Faza 43, plan 02: flux parola pentru cont extern fara parola, pe GoTrue live
// (cont fara parola -> cod recovery -> parola setata -> login cu parola), pe serviciul real din services/authService.ts.
//
// Rulare: npx tsx tests/auth_extern_parola_faza43.ts
// Date efemere: zztest_faza43_<RUN>@example.test; cleanup in finally.
// Output fara PII: doar PASS/FAIL/INFO, status si cod de eroare; parolele nu se afiseaza.
// Nota: pasul A4 inregistreaza un eveniment 'reset_parola' in contorul de emailuri Auth si poate trimite un email real
// (catre o adresa example.test inexistenta, deci GoTrue nu trimite nimic daca utilizatorul nu exista).

import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { trimiteCodResetParola, reseteazaParolaCuCod } from '../services/authService';
import { supabase } from '../supabaseClient';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey) {
  console.error('Lipsesc VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const RUN = Date.now();
const email = `zztest_faza43_${RUN}@example.test`;
const emailInexistent = `zztest_faza43_${RUN}_nu@example.test`;
const randomPass = () => `${randomBytes(12).toString('base64url')}Aa1`;
const P1 = randomPass();
const P2 = randomPass();

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = () => createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

let fail = 0;
const assert = (cond: boolean, mesaj: string, detaliu = '') => {
  if (!cond) fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${mesaj}${detaliu ? ` (${detaliu})` : ''}`);
};
const info = (mesaj: string) => console.log(`INFO — ${mesaj}`);
const cod = (e: any) => `status=${e?.status ?? '?'} code=${e?.code ?? '?'}`;

async function main() {
  let userId: string | undefined;
  try {
    // 1. cont fara parola, ca in api/_contCompetitieClub.ts
    const cr = await admin.auth.admin.createUser({ email, email_confirm: true });
    userId = cr.data.user?.id;
    assert(!cr.error && !!userId, '1. cont creat fara parola', cr.error ? cod(cr.error) : '');
    if (!userId) return;

    // 2. login cu parola pe cont fara parola esueaza
    const l2 = await anon().auth.signInWithPassword({ email, password: randomPass() });
    assert(!!l2.error && !l2.data.session, '2. login pe cont fara parola respins', cod(l2.error));

    // 3. email inexistent => aceeasi eroare (fara enumerare)
    const l3 = await anon().auth.signInWithPassword({ email: emailInexistent, password: randomPass() });
    assert(
      !!l3.error && l3.error?.status === l2.error?.status && l3.error?.code === l2.error?.code,
      '3. email inexistent da aceeasi eroare ca parola gresita',
      cod(l3.error),
    );

    // 4. cod pentru email inexistent nu dezvaluie nimic
    const a4 = await trimiteCodResetParola(emailInexistent);
    if (a4.error?.status === 429) console.log('SKIP A4: limita emailuri');
    else assert(!a4.error, '4. trimiteCodResetParola pe email inexistent fara eroare', a4.error ? cod(a4.error) : '');

    // 5. prima setare a parolei prin cod recovery (otp generat admin, fara email)
    const g1 = await admin.auth.admin.generateLink({ type: 'recovery', email });
    const otp1 = g1.data?.properties?.email_otp;
    assert(!g1.error && !!otp1, '5a. cod recovery generat', g1.error ? cod(g1.error) : '');
    const r5 = await reseteazaParolaCuCod(email, otp1 ?? '', P1);
    assert(r5.etapa === null && r5.user?.id === userId, '5b. reseteazaParolaCuCod seteaza parola (etapa null, acelasi user)', r5.error ? cod(r5.error) : '');

    // 6. cod de unica folosinta
    const r6 = await reseteazaParolaCuCod(email, otp1 ?? '', P2);
    assert(r6.etapa === 'cod', '6. al doilea apel cu acelasi cod respins la etapa cod', cod(r6.error));
    await supabase.auth.signOut({ scope: 'local' });

    // 7. login cu parola setata
    const l7 = await anon().auth.signInWithPassword({ email, password: P1 });
    assert(!l7.error && !!l7.data.session, '7a. login cu parola setata reuseste', l7.error ? cod(l7.error) : '');
    const l7b = await anon().auth.signInWithPassword({ email, password: randomPass() });
    assert(!!l7b.error, '7b. parola gresita respinsa', cod(l7b.error));

    // 8. Pitfall 6: updateUser esueaza (parola identica) => sesiunea de recovery se inchide local
    const g2 = await admin.auth.admin.generateLink({ type: 'recovery', email });
    const otp2 = g2.data?.properties?.email_otp;
    const r8 = await reseteazaParolaCuCod(email, otp2 ?? '', P1);
    const sesiune = (await supabase.auth.getSession()).data.session;
    if (r8.etapa === 'parola') {
      assert(sesiune === null, '8. esec updateUser => fara sesiune ramasa', cod(r8.error));
    } else {
      info(`8. GoTrue a acceptat parola identica (etapa=${r8.etapa}); Pitfall 6 netestat pe aceasta cale`);
    }
  } finally {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    if (userId) {
      const del = await admin.auth.admin.deleteUser(userId);
      if (!del.error) console.log('Reziduuri: 0');
      else { fail++; console.log(`FAIL — cleanup (${cod(del.error)})`); }
    }
  }
}

main()
  .catch((e) => { fail++; console.log(`FAIL — exceptie: ${e?.code ?? e?.name ?? 'necunoscuta'}`); })
  .finally(() => process.exit(fail ? 1 : 0));
