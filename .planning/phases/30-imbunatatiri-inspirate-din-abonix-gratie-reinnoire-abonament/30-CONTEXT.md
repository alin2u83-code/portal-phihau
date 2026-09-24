# Phase 30: Imbunatatiri inspirate din Abonix - Context

**Gathered:** 2026-09-18
**Status:** Ready for planning
**Source:** Analiza directa aplicatie Abonix (abonix-raport.md) + research codebase (30-RESEARCH.md), decizii luate direct de operator (fara sesiune discuss-phase interactiva)

<domain>
## Phase Boundary

3 feature-uri, implementate in aceasta ordine (in acelasi plan de faza, pot fi PLAN.md-uri separate in cadrul fazei):

1. Perioada de gratie configurabila la reinnoire abonament/taxa
2. Fix bug critic + extindere sistem memento-uri SMS existent (praguri configurabile -7/-3/0/+3/+7)
3. Loialitate automata pe politici_reducere (bonus dupa N reinnoiri consecutive)

</domain>

<decisions>
## Implementation Decisions

### Feature 1 — Perioada de gratie
- Portal PhiHau factureaza pe luna calendaristica (`plati.luna`/`plati.an`), NU pe interval continuu start/end ca Abonix — nu se copiaza modelul Abonix 1:1
- Gratia controleaza continuitatea `sportivi.data_start_facturare` in mecanismul existent `calculeazaLuniLipsa()` (utils/luniLipsa.ts, Faza 14): daca gap-ul de la ultima plata <= prag zile → data_start_facturare ramane neschimbata (sportivul datoreaza lunile lipsa); daca gap > prag → se reseteaza la luna curenta (lunile vechi sunt iertate)
- Prag configurabil per club (coloana noua, ex. `cluburi.perioada_gratie_zile`, default 30)
- Loc integrare: `handleGenerateSubscriptions` in `components/Plati/PlatiScadente.tsx`

### Feature 2 — Memento-uri automate (PRIORITATE: fix inainte de extindere)
- **Bug critic confirmat (research):** `schedule_training_reminders()` (SQL, `supabase/migrations/20260523_sms_system.sql`) filtreaza `p.tip = 'abonament'` / `p.status = 'achitat'` (litere mici) dar toata aplicatia scrie `'Abonament'` / `'Achitat'` (majuscula) — ramura de memento expirare nu a functionat NICIODATA de la deploy. Fix-ul e task obligatoriu, prioritar oricarei extinderi.
- **pg_cron confirmat LIVE** (verificat direct in DB): job `sms-schedule-reminders`, schedule `0 7 * * *`, activ, ruleaza `schedule_training_reminders()` — deci fix-ul de bug are efect imediat odata aplicat
- **Gap suplimentar gasit:** nu exista job pg_cron sau Vercel cron care sa proceseze `sms_queue` (nu exista `sms-process-queue` in `cron.job`, nu exista `crons` in `vercel.json`) — coada se umple dar nimic n-o goleste. De adaugat.
- Nu se construieste infrastructura noua — se extinde ce exista deja: `sms_config`, `sms_templates` (are deja tip `expirare_abonament` cu `{{name}}`/`{{days}}`), `sms_queue`, RPC `add_sms_to_queue`, `/api/sms`
- Extindere: prag fix de 7 zile → praguri configurabile per club (-7/-3/0/+3/+7), pastrate in tabel/coloana noua (nu hardcodat in functia SQL)
- **MVP scope: doar SMS.** Nu exista NICIO infrastructura de email in cod (fara Resend/SendGrid/Nodemailer/SMTP, fara env var) — a adauga email e decizie separata si mai mare (provider nou), NU parte din aceasta faza
- Canal WhatsApp: nu exista implementare gasita in cod (doar plan documentat in memorie `project_notificare_taxe_whatsapp.md`) — ramane in afara scope-ului acestei faze, doar SMS

### Feature 3 — Loialitate automata
- Se leaga de un TODO deja existent in cod: `PlatiScadente.tsx` (linii ~239-241, ~270-271, "Bug 4 TODO") care asteapta deja integrarea `politici_reducere` + `aplicare_reduceri` in `handleGenerateSubscriptions`
- **Atentie la pitfall gasit de research:** `politici_reducere` (folosit in Bug4 TODO) e DIFERIT de tabelul `reduceri` folosit in UI de `components/Plati/Reduceri.tsx` (schema diferita, interfata `Reducere` separata in types.ts) — nu se confunda cele doua
- Numarare reinnoiri consecutive: pe baza randurilor `plati` cu `status='Achitat'` (nu tranzactii brute) — aliniat cu logica reala de facturare a aplicatiei
- Coloane noi pe `politici_reducere`: `reinnoiri_necesare` (int), `tip_bonus` (enum: zile_gratis | discount)
- **Schema `politici_reducere`/`aplicare_reduceri` NU verificata live in research** (fara acces Supabase MCP in acea sesiune) — primul task din planul acestui feature TREBUIE sa fie verificare schema live inainte de a scrie orice cod impotriva acestor tabele

### Claude's Discretion
- Denumiri exacte coloane noi (cat timp respecta snake_case si conventiile existente din CLAUDE.md)
- Structura exacta UI pt configurare praguri/gratie (tab nou in Setari club vs extindere pagina existenta)
- Daca job-ul de procesare `sms_queue` merge ca pg_cron nou sau Vercel cron / edge function separata

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Research si analiza sursa
- `.planning/phases/30-imbunatatiri-inspirate-din-abonix-gratie-reinnoire-abonament/30-RESEARCH.md` — research complet, findings detaliate, pitfalls, cod existent
- `abonix-raport.md` (radacina repo) — analiza completa aplicatie Abonix, sectiunile 4, 6, 7, 8 relevante

### Cod existent de citit inainte de implementare
- `utils/luniLipsa.ts` — mecanism `calculeazaLuniLipsa()` (Faza 14)
- `components/Plati/PlatiScadente.tsx` — `handleGenerateSubscriptions`, Bug 4 TODO (linii ~239-271)
- `supabase/migrations/20260523_sms_system.sql` — sistem SMS existent, bug de capitalizare
- `components/Plati/Reduceri.tsx` + `Reducere` in `types.ts` — NU se confunda cu `politici_reducere`

</canonical_refs>

<specifics>
## Specific Ideas

- Ordinea de implementare in executie: Feature 2 (fix bug, impact imediat pe productie) → Feature 1 (gratie) → Feature 3 (loialitate) e ordinea de valoare/risc reala; dar user a cerut explicit ordinea 1, 2, 3 pt discutie — planner poate organiza wave-urile de executie optim (fix-ul de bug la feature 2 fiind trivial si prioritar chiar daca planul e listat al doilea)

</specifics>

<deferred>
## Deferred Ideas

- Email ca al doilea canal de notificari — necesita alegere provider nou (Resend/SendGrid), in afara scope-ului
- Canal WhatsApp real (doar plan documentat, neimplementat) — in afara scope-ului
- Model Abonix de abonament cu interval continuu start/end — nu se schimba modelul de facturare pe luna calendaristica

</deferred>

---

*Phase: 30-imbunatatiri-inspirate-din-abonix-gratie-reinnoire-abonament*
*Context gathered: 2026-09-18 — decizii operator, fara discuss-phase interactiv*
