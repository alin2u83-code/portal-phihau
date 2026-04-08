# Skill: agenti-aplicatie

Când utilizatorul invocă `/agenti-aplicatie [task]`, execută următoarele:

## Pasul 0 — Identifică taskul și agentul potrivit

Dacă utilizatorul a furnizat un task împreună cu comanda (ex: `/agenti-aplicatie corectează bug în Grupe`):

1. **Analizează taskul** și determină ce domeniu acoperă (sportivi, plăți, examene, competiții, prezență, grupe/orar, RLS, autentificare, dashboard sportiv, responsive, admin-club, audit).
2. **Identifică agentul potrivit** din lista de agenți de mai jos.
3. **Verifică dacă agentul există** în `.claude/agents/`.
   - Dacă **agentul există** → sari direct la **Pasul 3** (execuție task).
   - Dacă **agentul lipsește** → continuă cu **Pasul 1** pentru a-l crea, apoi cere restart.

## Pasul 1 — Verificare și creare agenți lipsă

Dacă nu există un task specific (comanda e invocată fără argumente) sau dacă agentul necesar lipsește:

## Agenții care trebuie să existe

Verifică dacă există și creează dacă lipsesc:

| Fișier agent | Domeniu |
|---|---|
| `sportivi-management.md` | CRUD sportivi, import/export, roluri |
| `plati-facturi.md` | Plăți, facturi, portofel, restanțe |
| `examene.md` | Sesiuni examene, rezultate, înscrieri |
| `competitii.md` | Competiții, categorii, fișe |
| `prezenta.md` | Prezență antrenamente, orar, rapoarte |
| `rls-securitate.md` | RLS Supabase, permisiuni, roluri |
| `audit-sistem.md` | Audit cross-domain, verificare erori |

Agenții deja existenți (nu suprascrie):
- `sportiv-dashboard.md`, `admin-club.md`, `grupe-orar.md`
- `responsive-mobile-tablet.md`, `autentificare.md`

## Cum creezi un agent lipsă

Folosește `Write` pentru a crea fișierul în `.claude/agents/<nume>.md` cu frontmatter corect și documentație despre domeniu, fișiere cheie, tabele Supabase, RLS, și rețeaua de agenți.

## Pasul 2 — Cere restart după creare

Dacă au fost creați agenți noi, **oprește-te** și afișează mesajul:

> **Agenți noi creați:** `<lista agenți>`.
> Pentru ca agenții să fie activați, este necesar un **restart Claude Code**.
> Rulează comanda: `/agenti-aplicatie <taskul tău original>` după restart.

Nu continua cu taskul în aceeași sesiune dacă agenți noi au fost creați.

## Cerință globală automată — Responsive Mobile & Tabletă

**ORICE modificare de UI/componente trebuie să fie responsive**, fără excepție:
- Folosește breakpoint-uri Tailwind: `sm:`, `md:`, `lg:` pentru layout-uri diferite
- Pe mobil (`< md`): coloane unice, butoane full-width, fonturi mai mici, padding redus
- Pe tabletă (`md`): layout intermediar, grilă 2 coloane unde e cazul
- Modals: pe mobil se deschid din jos (`items-end`) sau full-screen, nu centrate
- Tabele: pe mobil se transformă în carduri sau au scroll orizontal
- Butoane de acțiune: minim `h-10 touch-target` pe mobil
- Testează mental layout-ul pe `375px` (iPhone), `768px` (iPad), `1280px` (desktop)

Agentul `responsive-mobile-tablet` este consultat automat dacă modificările afectează layout, modals, tabele sau navigare.

## Pasul 3 — Execuție task cu agentul potrivit

Dacă agentul necesar există deja (sau după restart):

1. Folosește `Agent` tool cu `subagent_type` setat la agentul identificat (ex: `grupe-orar`, `prezenta`, `sportivi-management`).
2. Transmite agentului contextul complet: taskul, fișierele relevante, eroarea dacă există.
3. Raportează rezultatul utilizatorului.

**Mapare domeniu → subagent_type:**
| Domeniu | subagent_type |
|---|---|
| Grupe, orar săptămânal, program antrenamente | `grupe-orar` |
| Sportivi, import, export, roluri | `sportivi-management` |
| Plăți, facturi, portofel | `plati-facturi` |
| Examene, grade, promovări | `examene` |
| Competiții, stagii | `competitii` |
| Prezență, calendar, rapoarte | `prezenta` |
| RLS, permisiuni, erori 403 | `rls-securitate` |
| Autentificare, login, reset parolă | `autentificare` |
| Dashboard sportiv | `sportiv-dashboard` |
| Responsive, mobil, tabletă | `responsive-mobile-tablet` |
| Admin club, permisiuni admin | `admin-club` |
| Audit cross-domain, erori fără cauză clară | `audit-sistem` |
| UX, butoane, ghid interactiv | `ux-ghid-utilizator` |

## Audit rapid după creare

După ce toți agenții există, rulează un audit rapid:
- Verifică că fiecare agent are secțiunea "Rețea de agenți"
- Confirmă că `audit-sistem.md` există și poate coordona ceilalți agenți
- Raportează lista completă de agenți activi

## Salvare bug-uri rezolvate în agenți

Când un bug este rezolvat, agentul care l-a reparat (sau `audit-sistem`) trebuie să:
1. Adauge o intrare în secțiunea "Probleme cunoscute rezolvate" din agentul domeniului afectat
2. Adauge aceeași intrare în tabelul din `audit-sistem.md`
3. Formatul înregistrării:
   ```
   | Problemă | Cauza rădăcină | Fix aplicat | Fișiere modificate |
   ```

Aceasta asigură că bug-urile rezolvate nu reapar și că toți agenții știu ce a fost fixat.
