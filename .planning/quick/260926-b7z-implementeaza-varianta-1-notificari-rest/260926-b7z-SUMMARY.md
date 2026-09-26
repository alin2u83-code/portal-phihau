---
phase: quick-260926-b7z
plan: 01
subsystem: payments
tags: [react, typescript, whatsapp, client-side, notifications, plati]

requires: []
provides:
  - "utils/notificariRestantieri.ts: normalizare telefon wa.me, template mesaj, grupare pe telefon, detectie luni restante"
  - "types.ts: interfata NotificareRestanta"
  - "components/Plati/NotificariRestantieriModal.tsx: UI listare + copiere + link WhatsApp"
  - "Buton 'Trimite notificări restanțieri' in PlatiScadente.tsx"
affects: [plati, whatsapp-notificari]

tech-stack:
  added: []
  patterns:
    - "Test colocat fara vitest/jest (npx tsx utils/<fisier>.test.ts) — acelasi pattern ca utils/perioadaGratie.test.ts"
    - "Grupare notificari pe telefon normalizat (wa.me) pentru facturi individuale + de familie, cu fallback pe reprezentant/membru familie"

key-files:
  created:
    - utils/notificariRestantieri.ts
    - utils/notificariRestantieri.test.ts
    - components/Plati/NotificariRestantieriModal.tsx
  modified:
    - types.ts
    - components/Plati/PlatiScadente.tsx

key-decisions:
  - "sursaTelefon pentru factura individuala ramane 'sportiv' chiar daca telefonul e null/invalid (identifica sursa datelor, nu validitatea) — UI arata 'Fără telefon valid' separat, ignorand eticheta sursei in acel caz"
  - "Pentru 'Achitat Parțial' mesajul foloseste suma totala a facturii (nu rest de plata, camp nefiabil) — UI marcheaza randul cu Badge amber si permite editare manuala a mesajului"
  - "clubId trimis modalului doar cand permissions.isSuperAdmin (filter.clubId persista in localStorage intre roluri si ar putea scapa scoping-ul pt ADMIN_CLUB)"
  - "Selectorul de perioada include implicit luna curenta + toate lunile cu restante Abonament (luniCuAbonamenteRestante), nu doar luna curenta — la inceput de luna facturile pot sa nu fie inca generate"

patterns-established:
  - "Notificari client-side derivate 100% din filteredData (React Query cache), zero query Supabase nou — reutilizabil pentru alte fluxuri de comunicare (ex. notificari examene/competitii)"

requirements-completed: [QUICK-260926-B7Z-01, QUICK-260926-B7Z-02, QUICK-260926-B7Z-03]

duration: ~45min
completed: 2026-09-26
---

# Quick Task 260926-b7z: Notificări restanțieri (Varianta 1, semi-auto) Summary

**Buton "Trimite notificări restanțieri" în Plăți care generează, 100% client-side din datele deja încărcate, mesaje WhatsApp pre-completate per părinte pentru taxa lunară neachitată — cu grupare automată a fraților pe același telefon și link wa.me/copiere în clipboard.**

## Performance

- **Tasks:** 2/2 completate
- **Files modified:** 5 (2 create + 3 modificate, dintre care types.ts modificat)

## Accomplishments
- `utils/notificariRestantieri.ts` — funcții pure (normalizare telefon E.164 pentru wa.me, template mesaj cu diacritice, grupare pe telefon, detecție luni cu restanțe), acoperite de 21 teste colocate (`npx tsx utils/notificariRestantieri.test.ts`)
- `NotificariRestantieriModal` — listă destinatari cu mesaj editabil, „Copiază mesaj” (clipboard), link WhatsApp (`wa.me`) cu `target=_blank rel="noopener noreferrer"`, „Copiază toate”, selector perioadă
- Buton „Trimite notificări restanțieri” în `PlatiScadente.tsx`, vizibil pentru `permissions.canManageFinances`, independent de facturi selectate
- Zero query Supabase nou, zero librării noi, `handleNotifyOverdue` și `PlatiScadenteProps` neschimbate

## Task Commits

1. **Task 1: Tip NotificareRestanta + util pur utils/notificariRestantieri.ts cu teste** - `370e3aa` (test — RED→GREEN, teste + implementare în același commit conform pattern-ului existent `perioadaGratie.test.ts`)
2. **Task 2: NotificariRestantieriModal + buton în PlatiScadente** - `69b2dc3` (feat)

**Plan metadata:** (commit separat, gestionat de orchestrator)

## Files Created/Modified
- `types.ts` - adaugă interfața `NotificareRestanta` (secțiunea Domain: Financiar, după `Plata`)
- `utils/notificariRestantieri.ts` - `normalizeazaTelefonWa`, `formateazaSumaLei`, `construiesteMesajRestanta`, `construiesteLinkWhatsApp`, `luniCuAbonamenteRestante`, `genereazaNotificariRestantieri`
- `utils/notificariRestantieri.test.ts` - 21 teste colocate (pattern `perioadaGratie.test.ts`, rulare `npx tsx`)
- `components/Plati/NotificariRestantieriModal.tsx` - componentă nouă, UI complet cu design system intern (`Modal`, `Button`, `Select`, `Badge`, `EmptyState`)
- `components/Plati/PlatiScadente.tsx` - import + state `isNotificariRestantieriOpen` + buton + randare modal condiționată

## Decisions Made
- Vezi `key-decisions` din frontmatter — toate deciziile au fost la discreția planificatorului, deja documentate în PLAN.md, aplicate exact ca specificate.

## Deviations from Plan

### Auto-fixed Issues

Niciuna la nivel de cod livrat — o singură corecție a fost necesară **în fixture-ul de test** (nu în implementare): testul inițial pentru „reprezentant fără telefon → fallback membru” presupunea 2 membri activi în familie, dar reprezentantul (`reprezentant_id`) este el însuși un sportiv membru al familiei (`familie_id` comun) conform contractului din `types.ts` („reprezentant_id = id-ul unui SPORTIV membru al familiei”) — deci apare corect și el în `numeSportivi`. Corectat assertion-ul de la 2 la 3 nume așteptate; implementarea `genereazaNotificariRestantieri` nu a fost modificată.

## Known Stubs

Niciunul — funcționalitatea este completă și cablată (zero date mock, zero placeholder).

## Threat Flags

Toate suprafețele noi (telefon → URL wa.me, randare nume/telefon în modal, buton gated pe `canManageFinances`, `clubId` scoping) sunt deja documentate și mitigate în `<threat_model>` din PLAN.md (T-b7z-01..07) — nimic nou descoperit în afara acelui registru.

## Human Verification (not performed — non-interactive execution)

Task 2 include un pas `<human-check>` în plan (deschidere `npm run dev`, login ADMIN_CLUB, click pe buton, verificare vizuală mesaj/WhatsApp/clipboard/consolă). Această verificare **nu a fost efectuată** în această rulare (execuție non-interactivă, fără browser/sesiune de login disponibilă) — consistent cu alte quick tasks anterioare din acest proiect (ex. `260924-04t`, `260909-p31`). Toate gate-urile automate din `<verify><automated>` au trecut:
- `npx tsc --noEmit` → exit 0
- `npx tsx utils/notificariRestantieri.test.ts` → 21 PASS, 0 FAIL
- `grep` NotificariRestantieriModal în PlatiScadente.tsx → găsit (2 ocurențe)
- `grep` supabaseClient/supabase.from/supabase.rpc în modal → 0 ocurențe
- `grep` dangerouslySetInnerHTML în modal → 0 ocurențe
- `grep` `noopener noreferrer` în modal → găsit (1 ocurență)

**Recomandare pentru sesiunea următoare:** rulare `npm run dev` + verificare vizuală pașii 1-7 din `<human-check>` (buton vizibil, mesaj format corect, copiere clipboard, link WhatsApp, sportiv fără telefon, consolă fără erori, zero request Supabase nou la deschiderea modalului).

## Self-Check: PASSED

Fișiere verificate pe disc:
- FOUND: types.ts
- FOUND: utils/notificariRestantieri.ts
- FOUND: utils/notificariRestantieri.test.ts
- FOUND: components/Plati/NotificariRestantieriModal.tsx
- FOUND: components/Plati/PlatiScadente.tsx

Commituri verificate în `git log --oneline`:
- FOUND: 370e3aa
- FOUND: 69b2dc3
