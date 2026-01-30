/*
 * SCRIPT PENTRU CREAREA CONTURILOR DE AUTENTIFICARE LIPSĂ
 *
 * Cum se rulează:
 * 1. Asigurați-vă că sunteți într-un mediu Node.js (v16+).
 * 2. Instalați dependințele necesare rulând în terminal:
 *    npm install @supabase/supabase-js dotenv
 * 3. Creați un fișier `.env` în directorul rădăcină al proiectului.
 * 4. Adăugați următoarele variabile de mediu în fișierul `.env`:
 *    VITE_SUPABASE_URL=URL-ul_proiectului_dumneavoastră_Supabase
 *    SUPABASE_SERVICE_ROLE_KEY=Cheia_de_serviciu_Supabase
 * 5. Rulați scriptul din terminal:
 *    node ./scripts/create-missing-users.js
 *
 * Ce face scriptul:
 * - Găsește toți sportivii din tabelul `sportivi` care nu au un `user_id`.
 * - Pentru fiecare sportiv cu email, creează un cont de autentificare în Supabase Auth.
 * - La crearea contului, Supabase trimite automat un email de invitație/resetare parolă.
 * - Leagă noul cont de autentificare de profilul sportivului, actualizând coloana `user_id`.
 * - Gestionează cazul în care un cont de autentificare cu email-ul respectiv există deja, dar nu este asociat.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Încarcă variabilele de mediu din fișierul .env
dotenv.config();

// --- CONFIGURARE ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // IMPORTANT: Folosiți cheia de serviciu (Service Role Key)

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Eroare: Asigurați-vă că variabilele de mediu VITE_SUPABASE_URL și SUPABASE_SERVICE_ROLE_KEY sunt setate în fișierul .env.');
  process.exit(1);
}

// Inițializare client Supabase cu privilegii de administrator
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createMissingAuthUsers() {
  console.log('--- 🚀 Start script: Creare conturi de autentificare lipsă ---');

  // 1. Preia toți sportivii care nu au un user_id
  console.log('1. Se preiau sportivii fără cont de utilizator...');
  const { data: sportivi, error: fetchError } = await supabase
    .from('sportivi')
    .select('id, email, nume, prenume')
    .is('user_id', null);

  if (fetchError) {
    console.error('❌ EROARE la preluarea sportivilor:', fetchError.message);
    return;
  }

  if (!sportivi || sportivi.length === 0) {
    console.log('✅ Toți sportivii au deja un cont de utilizator asociat. Nicio acțiune necesară.');
    console.log('--- Script finalizat ---');
    return;
  }

  console.log(`ℹ️  Au fost găsiți ${sportivi.length} sportivi fără cont. Se începe procesarea...`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // 2. Iterează și creează un cont pentru fiecare
  for (const sportiv of sportivi) {
    const { id, email, nume, prenume } = sportiv;
    const sportivName = `${nume} ${prenume}`;

    // Omite dacă nu există email
    if (!email) {
      console.warn(`⚠️  OMIS: Sportivul ${sportivName} (ID: ${id}) nu are o adresă de email. Nu se poate crea cont.`);
      skippedCount++;
      continue;
    }

    console.log(`\nProcesare pentru ${sportivName} (${email})...`);

    try {
      // 3. Creează utilizatorul în Supabase Auth
      // Fără a furniza o parolă, Supabase trimite un link de invitație/resetare parolă.
      const { data: userData, error: createUserError } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true, // Marchează email-ul ca fiind confirmat; utilizatorul va primi o invitație pentru a seta parola
      });

      if (createUserError) {
        // Gestionează cazul în care utilizatorul există deja în auth, dar nu este asociat
        if (createUserError.message.includes('User already registered')) {
            console.warn(`🟡 AVERTISMENT: Un utilizator cu email-ul ${email} există deja în sistemul de autentificare. Se încearcă asocierea...`);
            
            const { data: { user: existingUser }, error: getUserError } = await supabase.auth.admin.getUserByEmail(email);

            if (getUserError || !existingUser) {
                throw new Error(`Nu s-a putut prelua utilizatorul existent pentru ${email}: ${getUserError?.message || 'Utilizator negăsit'}`);
            }

            // Asociază contul de autentificare existent cu profilul sportivului
            const { error: linkError } = await supabase
                .from('sportivi')
                .update({ user_id: existingUser.id })
                .eq('id', id);

            if (linkError) {
                throw new Error(`Eroare la asocierea contului existent: ${linkError.message}`);
            }
            console.log(`✅ SUCCES (Asociere): Contul existent pentru ${email} a fost asociat cu profilul sportivului ${sportivName}.`);

        } else {
            throw createUserError;
        }
      } else {
        const newAuthUser = userData.user;
        if (!newAuthUser) {
          throw new Error('Crearea utilizatorului nu a returnat date valide.');
        }

        console.log(`   -> Cont de autentificare creat. ID: ${newAuthUser.id}. Se trimite email de invitație...`);

        // 4. Actualizează profilul sportivului cu noul user_id
        const { error: updateError } = await supabase
          .from('sportivi')
          .update({ user_id: newAuthUser.id })
          .eq('id', id);

        if (updateError) {
          throw new Error(`Eroare la actualizarea profilului sportivului: ${updateError.message}. RECOMANDARE: Ștergeți manual utilizatorul Auth (ID: ${newAuthUser.id}) și rulați din nou scriptul.`);
        }
        console.log(`✅ SUCCES: Contul pentru ${sportivName} a fost creat și asociat.`);
      }
      successCount++;
    } catch (err) {
      console.error(`❌ EROARE la procesarea sportivului ${sportivName}:`, (err as Error).message);
      errorCount++;
    }
  }

  // 5. Raport final
  console.log('\n--- ✅ Script finalizat ---');
  console.log('Rezumat:');
  console.log(`   - ${successCount} conturi create/asociate cu succes.`);
  console.log(`   - ${skippedCount} sportivi omiși (fără email).`);
  console.log(`   - ${errorCount} erori întâmpinate.`);
  console.log('---------------------------');
}

// Rularea funcției principale
createMissingAuthUsers().catch(err => {
  console.error('❌ A apărut o eroare neașteptată în timpul execuției scriptului:', err);
});
