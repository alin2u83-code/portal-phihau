# Fluxuri Principale de Date

## 1. Autentificare și inițializare

```
Supabase Auth (email+parolă)
    ↓
useAppLogic.ts — inițializare sesiune
    ↓
Fetch user_roles → determină roluri disponibile
    ↓
Dacă 1 rol: setare automată context activ
Dacă mai multe: RoleSelectionPage → userul alege
    ↓
activeRoleContext stocat în localStorage
    ↓
Supabase client injectează header active-role-context-id în toate requesturile
    ↓
RLS Supabase filtrează datele conform rolului activ
```

Dacă `trebuie_schimbata_parola = true` → redirect `MandatoryPasswordChange`.

## 2. Încărcare date globale

```
DataContext.tsx (React Query)
    ↓
Fetch paralel: sportivi, grupe, plăți, examene, antrenamente, ...
    ↓
useFilteredData.ts → filtrare după club_id (pentru admin club) sau "all" (super admin)
    ↓
filteredData distribuit prin DataContext la toate componentele
```

Datele sunt cache-uite de React Query cu `staleTime` configurat per query.

## 3. Flux înscriere examen

```
Admin selectează sesiune examen
    ↓
ModulInscriereExamen.tsx — filtrare sportivi eligibili
    ↓
Validări: grad următor disponibil? perioadă minimă? viză medicală?
    ↓
Generare plată 'Taxa Examen' (status: Neachitat)
    ↓
Sesiune → Finalizare (FinalizeExam.tsx)
    ↓
Introducere note per sportiv
    ↓
Promovare automată sau manuală → update grad_actual_id
    ↓
Insert în istoricGrade
```

## 4. Flux plăți abonamente

```
PlatiScadente.tsx — generare lunară
    ↓
Per sportiv activ: creare Plata {luna, an, tip: 'Abonament', status: 'Neachitat'}
    ↓
Încasare (JurnalIncasari.tsx sau inline):
    ↓
Creare Tranzactie + update Plata.status → 'Achitat'
    ↓
Sold calculat dinamic: SUM(plăți neachitate) per sportiv/familie
```

Reducerile din tabela `reduceri` se aplică la generarea plății (`suma_initiala` vs `suma`).

## 5. Flux competiție

```
SUPER_ADMIN sau ADMIN_CLUB creează Competitie
    ↓
Definire probe (ProbaCompetitie) + categorii (CategorieCompetitie)
    sau importare din template (categorii_template)
    ↓
Deschidere înscrieri (status → 'inscrieri_deschise')
    ↓
ADMIN_CLUB înscrie sportivi individuali sau echipe
    ↓
Validări: vârstă min/max, grad eligibil, gen, viză medicală, taxă achitată
    ↓
Status → 'inscrieri_inchise' → 'finalizata'
```

## 6. Flux prezență

```
INSTRUCTOR deschide MartialAttendance.tsx
    ↓
Selectează antrenament din ziua curentă (sau creează)
    ↓
Marchează prezența per sportiv (prezent/absent/tard)
    ↓
Insert/update în tabela prezenta
    ↓
Raport lunar calculat din agregare prezente per sportiv per lună
```

Sportivii din grupe secundare (`sportivi_grupe_secundare`) apar și ei în listele de prezență.

## 7. Flux AI Assistant (RAG)

```
User tastează întrebare în AIAssistantWidget
    ↓
ragService.ts: generare embedding query cu Gemini text-embedding-004
    ↓
Vector search în tabela knowledge_base (pgvector cosine similarity)
    ↓
Top 3-5 chunks relevante → injectate în system prompt
    ↓
claudeService.ts: apel Claude API cu context RAG
    ↓
Răspuns afisat în chat
```

## 8. Navigare internă

Aplicația NU folosește URL-uri pentru navigare internă:
```
Sidebar click / buton →
    setActiveView('examene') →
    NavigationContext stochează în history stack →
    AppRouter.tsx renderează componenta corespunzătoare
```

`goBack()` traversează history stack intern (nu browser history).

## 9. Flux acces extern la competiție (Faza 36)

```
Federația copiază linkul din Competiție → tab „Acces extern": /competitie/<uuid>
    ↓
Reprezentantul deschide linkul (index.tsx montează o aplicație izolată, fără portal/sidebar)
    ↓
Teaser public (RPC get_competitie_publica): denumire, perioadă, probe. Link invalid / draft / necunoscut → același mesaj generic
    ↓
Login email + cod OTP (signInWithOtp, fără parolă, fără link de acțiune în email)
    ↓
Context eligibil (ADMIN_CLUB/INSTRUCTOR la un club sau grant REPREZENTANT_COMPETITIE) → alegere context dacă sunt mai multe
    ↓
Shell extern: doar filele Înscrieri / Categorii / Taxe (read-only) / Detalii; înscriere prin wizard (inter-club dezactivat, D-14)
```

**Ramura „Solicită acces"** (email fără cont):

```
Formular (email, nume, club, mesaj) → RPC trimite_cerere_acces (anon; plafon 200 în așteptare, fără dublare)
    ↓
Federația: tab „Acces extern" → Aprobă / Respinge  (POST /api/aproba-cerere-acces, doar SUPER_ADMIN_FEDERATIE)
    ↓
Aprobare: cont creat fără parolă (sau rol adăugat la cont existent, cu avertisment `cont_existent_cu_alte_roluri`),
          rând REPREZENTANT_COMPETITIE + grant activ. Fără email de notificare: federația anunță separat.
    ↓
Reprezentantul se loghează cu OTP pe același link
```

- Revocarea = `activ = false` pe grant (reversibilă). Reaprobarea unei cereri procesate întoarce 409.
- Dezactivat în zona externă: coechipier din alt club, echipe inter-club, orice funcție cross-club (D-14).
- Portalul principal rămâne neschimbat pentru rolurile existente (D-16); un cont doar-extern care deschide `/` vede „Acces limitat".
- Context activ: aceeași cheie localStorage (`phi-hau-active-role-context-id`) ca în portal; pe același browser, loginul extern suprascrie contextul portalului.
- Prerechizit de lansare: SMTP custom (planul 32-08), altfel emailurile OTP sunt limitate de Supabase.
