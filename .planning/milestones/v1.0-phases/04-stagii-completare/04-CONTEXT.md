# Phase 4: Stagii Completare - Context

**Gathered:** 2026-06-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Faza livrează fluxul complet pentru stagii de club: creare stagiu (de club sau federație), înscrierea unui sportiv cu calcul taxă per categorie vârstă/grad (3 niveluri fallback), generare plată automată, vizualizare participanți cu status plată, și export CSV. Această fază este o replanificare — implementarea anterioară (2026-06-05) are 3 gaps: acces INSTRUCTOR lipsă, fallback per tip stagiu lipsă, și logica de ștergere participant fără cleanup plată.

</domain>

<decisions>
## Implementation Decisions

### Acces INSTRUCTOR
- **D-01:** INSTRUCTOR **poate înscrie** sportivi la stagii de club — cu generare plată inclusă. Necesită modificare RLS `plati_insert` pentru a permite rolul INSTRUCTOR.
- **D-02:** INSTRUCTOR **vede lista participanților** (Sportiv | Data înscrierii | Categorie) dar **nu vede valorile financiare** (taxă, status Achitat/Neachitat) — date financiare vizibile doar `isAdminClub`.
- **D-03:** INSTRUCTOR **nu poate șterge** un participant din stagiu — ștergerea implică logică de plată, rămâne exclusiv ADMIN_CLUB.

### Fallback taxă — 3 niveluri
- **D-04:** Lanț de fallback complet pentru taxa la înscriere:
  1. `eveniment.pret_copii / pret_grade / pret_centuri` (specific per eveniment)
  2. `tipuri_stagii.pret_copii / pret_grade / pret_centuri` (per tip stagiu, la nivel național)
  3. `preturiConfig` global (fallback final)
- **D-05:** Prețurile per tip stagiu (`tipuri_stagii.pret_copii/pret_grade/pret_centuri`) sunt **diferențiate per categorie** — 3 coloane separate, nu un preț unic.
- **D-06:** Prețurile din `tipuri_stagii` sunt setate de **SUPER_ADMIN_FEDERATIE** prin TipuriStagiiAdmin — prețuri naționale, nu per club. Cluburile pot override direct pe eveniment (nivelul 1).
- **D-07:** Necesită migrație SQL pentru a adăuga `pret_copii`, `pret_grade`, `pret_centuri` pe tabela `tipuri_stagii`.
- **D-08:** EvenimentDetail trebuie să aibă acces la `tipuriStagii` (din DataContext sau prop) pentru a executa nivelul 2 din fallback.

### Ștergere participant
- **D-09:** La ștergerea unui participant din stagiu de către ADMIN_CLUB:
  - Dacă plata aferentă este **Neachitată** → **ștergere automată** a plății (fără confirmare, flux normal).
  - Dacă plata aferentă este **Achitată** → **warning modal**: "Plata de X lei a fost deja achitată. Ștergerea participantului va păstra plata în sistem. Continuați?" → [Da, retrage participant] / [Anulează].
- **D-10:** Match-ul plată ↔ participant se face prin `eveniment_id` (preferabil) sau fallback `sportiv_id + tip='Taxa Stagiu'` pentru plăți vechi.

### Decizii cunoscute din implementarea anterioară (păstrate)
- **D-11:** Centuri Negre = detectare prin `Grad.nume` care conține 'Dan' (Dan 1, Dan 2 etc.) — **nu** prag de vârstă.
- **D-12:** Categorii vârstă: Copii = 7–12 ani | Grade = 13–17 ani (fără centura neagră) | Centuri Negre = Dan 1+ (orice vârstă).
- **D-13:** `preturiConfig` se fetchează cu `withClub` în `useDataProvider` — configurare per club.
- **D-14:** CSV export construit manual (Blob) cu 5 coloane: Sportiv | Data Înscrierii | Categorie | Taxă (lei) | Status Plată.

### Claude's Discretion
- UX detaliu preview taxă în timp real la selecția sportivului (useMemo, deja implementat — păstrează pattern-ul).
- Ordinea coloanelor în tabelul participanți (ADMIN_CLUB vs INSTRUCTOR — subset vizibil).
- Mesaje toast pentru succes/eroare la înscriere și ștergere.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Modul Stagii (fișier principal)
- `components/Competitii/StagiiCompetitii.tsx` — implementarea curentă completă; EvenimentDetail, EvenimentForm, handleAddParticipant, calculeazaCategorieStagiu, getTaxaStagiu

### DB schema & migrații
- `sql/migrations/add_pret_per_categorie_stagiu.sql` — migrație pret_copii/pret_grade/pret_centuri pe `evenimente` + eveniment_id FK pe `plati` (aplicată în faza anterioară)
- `sql/migrations/add_tipuri_stagii.sql` — schema tabelei `tipuri_stagii`
- `sql/migrations/add_pret_tipuri_stagii.sql` — coloana `pret` existentă pe `tipuri_stagii`
- `sql/migrations/fix_rls_all_tables.sql` — politici RLS curente (`plati_insert`, `evenimente_write`)

### State management & hooks
- `hooks/useDataProvider.ts` — AppData interface, fetchAppData, preturiConfig fetch (fix aplicat), tipuriStagii disponibil
- `types.ts` — interfețele `Eveniment` (cu pret_copii/pret_grade/pret_centuri), `Plata` (cu eveniment_id), `Rezultat` (cu created_at), `TipStagiu`, `Permissions`

### Utilities reutilizabile
- `utils/eligibilitateCompetitie.ts` — `calculeazaVarstaLaData` (funcție corectă pentru calcul vârstă la granița de an)
- `utils/pricing.ts` — `getPretValabil` (fallback global preturiConfig)

### Design system
- `components/ui.tsx` — Button, Modal, Card, Input, Select, Switch (design system intern — nu Shadcn)

### Planificarea anterioară (referință)
- `.planning/phases/04-stagii-completare/04-RESEARCH.md` — audit cod, schema DB, buguri identificate, patterns
- `.planning/phases/04-stagii-completare/04-01-SUMMARY.md` — ce s-a implementat în planul 1 (DB + types)
- `.planning/phases/04-stagii-completare/04-02-SUMMARY.md` — ce s-a implementat în planul 2 (preturiConfig fix, calcul taxă)
- `.planning/phases/04-stagii-completare/04-03-SUMMARY.md` — ce s-a implementat în planul 3 (tab participanți, CSV)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `calculeazaVarstaLaData(dataNasterii, dataReferinta)` din `utils/eligibilitateCompetitie.ts` — calcul vârstă corect la granița de an; MUST use pentru categorisire
- `getPretValabil(preturiConfig, 'Taxa Stagiu', data)` din `utils/pricing.ts` — nivelul 3 din fallback taxă
- Pattern export CSV cu Blob din `components/Competitii/index.tsx:593` — copiat deja în faza anterioară
- `usePermissions(activeRoleContext)` apelat local în EvenimentDetail — nu prop-drilled din AppRouter

### Established Patterns
- `useMemo` pentru derivarea `platiParticipanti` (Map<sportiv_id, Plata>) și `randuriiParticipanti` — pattern deja implementat
- `useError()` → `showError` / `showSuccess` pentru feedback UI la mutații
- Mutații directe `supabase.from('plati').delete()` cu `queryClient.invalidateQueries` după
- RLS cu header `active-role-context-id` injectat de `supabaseClient.ts` — toate query-urile respectă

### Integration Points
- `DataContext` / `useData()` — acces la `filteredData.rezultate`, `filteredData.plati`, `preturiConfig`, `tipuriStagii`
- `StagiiCompetitii.tsx` rămâne fișierul unic modificat — nu se creează componente noi separate (constraint din RESEARCH.md)
- RLS `plati_insert` necesită modificare pentru a permite INSTRUCTOR — atenție la `fix_rls_all_tables.sql`

</code_context>

<specifics>
## Specific Ideas

- **Preview taxă real-time:** La selecția unui sportiv în formularul de înscriere, taxa calculată (cu categoria detectată automat) apare imediat sub câmpul de selecție, înainte de confirmare.
- **Tabel participanți — 2 vederi:** ADMIN_CLUB vede toate 5 coloane (inclusiv taxă și status plată); INSTRUCTOR vede 3 coloane (Sportiv | Data | Categorie), fără informații financiare.
- **Modal warning ștergere cu plată achitată:** Text exact: "Plata de [X] lei a fost deja achitată. Ștergerea participantului va păstra plata în sistem. Doriți să continuați?" → butoane [Da, retrage participant] [Anulează].

</specifics>

<deferred>
## Deferred Ideas

- **Persistență filtre în tab participanți** (filtrare per club, per categorie) — v2, nu în scope curent
- **Notificare WhatsApp/SMS la înscriere stagiu** — altă fază
- **Aprobare INSTRUCTOR de către ADMIN înainte ca înscrierea să fie finalizată** — workflow complex, out of scope

</deferred>

---

*Phase: 04-stagii-completare*
*Context gathered: 2026-06-16*
