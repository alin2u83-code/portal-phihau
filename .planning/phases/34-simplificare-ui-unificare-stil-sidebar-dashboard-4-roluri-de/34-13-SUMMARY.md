---
phase: 34-simplificare-ui-unificare-stil-sidebar-dashboard-4-roluri-de
plan: 13
subsystem: ui
tags: [verificare, playwright, contrast, paritate-meniu, simplificare-ui]
requires: [34-01, 34-02, 34-03, 34-04, 34-05, 34-06, 34-07, 34-08, 34-09, 34-10, 34-11, 34-12]
provides:
  - Poarta automata de verificare a fazei 34 (paritate meniu/hub, contrast 20 teme, shell desktop/mobil)
affects: [tests/ui_faza34_menu_parity.ts, tests/ui_faza34_shell.spec.ts]
key-files:
  created:
    - tests/ui_faza34_menu_parity.ts
    - tests/ui_faza34_shell.spec.ts
decisions:
  - "Spec-ul shell ruleaza strict read-only; tema se aplica si prin localStorage si prin setarea variabilelor --t-* dupa login, fiindca tema din DB a contului suprascrie localStorage"
  - "Capturile de ecran (screens/) nu se comit: arata date reale ale contului de test"
metrics:
  tasks: 3
  files: 2
  completed: 2026-11-03
---

# Phase 34 Plan 13: Poarta de verificare a fazei Summary

Doua teste noi dovedesc automat ca meniul are 7/7/7/4 intrari, ca niciun view vechi nu a ramas fara cale de acces si ca shell-ul se comporta corect pe build de productie. Statusul fazei ramane **asteapta verificare umana**.

## Commits

- f717dff: Task 1, script de paritate meniu/hub + contrast
- e821eed: Task 2, spec Playwright shell
- Task 3: fara cod nou (tsc + build + SUMMARY)

## Rezultate

### Script paritate (`npx tsx tests/ui_faza34_menu_parity.ts`, exit 0)

| Test | Rezultat |
|------|----------|
| 1. 7/7/7/4 intrari de nivel 1 | OK |
| 2. view/aliases/submeniu valide in uniunea `View` | OK |
| 3. paritate HubTabs (Sportivi, Examene, Competitii, Fisa) + ActivitateSalaTabs <-> menuConfig | OK |
| 4. 62 de view-uri vechi inca accesibile (meniu, tab-uri hub, UserMenu, butoane dashboard extrase din cod) | OK |
| 4b. aceleasi 62 view-uri inca prezente in `AppRouter` (nicio ruta stearsa) | OK |
| 5. contrast WCAG pe 20 teme (raport) | 8 perechi sub 4,5:1 |

**Test 5, teme sub 4,5:1 (setul de teme NU a fost modificat, decizia e a utilizatorului):**

- QwanKiDo Blue: sidebarActiveFg/sidebarActive 3,68:1
- Forest: sidebarActiveFg/sidebarActive 3,30:1
- Amber: sidebarActiveFg/sidebarActive 3,19:1
- Ocean: sidebarActiveFg/sidebarActive 3,68:1
- Graphite: sidebarText/sidebarBg 4,35:1
- Rose: sidebarActiveFg/sidebarActive 3,53:1
- Teal: sidebarActiveFg/sidebarActive 3,67:1
- Sunset: sidebarActiveFg/sidebarActive 3,56:1

Perechea sidebarText/sidebarBg trece pe 19 din 20 teme (doar Graphite, 4,35:1, e marginal). Problema este aproape in intregime textul alb pe culoarea de accent a itemului activ (7 teme, inclusiv tema implicita QwanKiDo Blue). Itemul activ foloseste `font-semibold`, iar WCAG trateaza textul bold sub 18,66px tot ca text normal, deci pragul ramane 4,5:1.

### Spec Playwright shell (`npx playwright test tests/ui_faza34_shell.spec.ts`, 4/4 trecute, 0 skip)

Build de productie (`npm run build && npm run preview`), {desktop 1280x800, mobil 390x844} x {Lavender Light, QwanKiDo Blue}. Aserțiuni verificate: sidebar exista; pe desktop sidebar/header cu `box-shadow: none`; niciun `.animate-ping` in header/aside/nav; 4 intrari in navigarea principala; pe mobil bottom nav vizibil cu 4 butoane >= 44px, footer ascuns, fara scroll orizontal, slotul "Meniu" deschide sertarul; pe desktop bottom nav-ul nu e vizibil; zero `pageerror`. Capturi in `.planning/phases/34-.../screens/` (necomise).

**Rol testat: doar SPORTIV** (contul de test intra direct ca "Portal Sportiv", fara MFA, fara selectie de rol). **Netestate de spec:** SUPER_ADMIN_FEDERATIE, ADMIN_CLUB, INSTRUCTOR. Pentru acestea numarul 7 de intrari e acoperit doar de Testul 1 din script (config), nu de randarea reala. Spec-ul accepta si 7 intrari pentru roluri admin/instructor, dar nu a rulat pe ele.

### TypeScript si build

- `npx tsc --noEmit`: zero erori. Baseline-ul din 34-01 este un fisier gol (zero erori), deci zero erori noi.
- `npm run build`: reuseste.

### Deviatii UI-SPEC "Deviatii de implementare" (9)

Nu s-au verificat individual in aceasta executie in afara de ce acopera testele: deviatia 3 (HubTabs generic + 4 wrappers) si 5 (Anunturi Federatie si Generator Program raman accesibile) sunt **confirmate** de Testul 3/4 (`anunturi-federatie` prin submeniu Administrare, `activitati` prin tab Generator Program). Deviatiile 1, 2, 4, 6, 7, 8, 9 sunt **neconfirmate** (necesita inspectie vizuala; intra in lista de acceptare).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `__dirname` indisponibil in script ESM**
- **Found during:** Task 1
- **Fix:** radacina repo = `process.cwd()` (scriptul se ruleaza din radacina).

**2. [Rule 1 - Bug] Verificarea de vizibilitate a sidebar/header pe `offsetParent`**
- **Found during:** Task 2 (primul run, 2 teste desktop picate)
- **Issue:** sidebar-ul si header-ul sunt `position: fixed`, deci `offsetParent` e `null`; testul vedea "lipsa".
- **Fix:** vizibilitate prin `getClientRects().length > 0` si `visibility`.

**3. Comanda de verificare automata din plan nefunctionala**
- Verificarea Task 2 din plan (`--reporter=json | node -e JSON.parse`) pica fiindca `dotenv` tipareste "injected env" pe stdout inainte de JSON. Am rulat cu `--reporter=list`; rezultatul este 4 trecute, 0 skip (expected > 0, unexpected = 0), echivalent cu poarta ceruta.

### Alte note

- Testul 4 extrage butoanele UserMenu/dashboard din cod (regex pe `handleNavigate/setActiveView/navigate/onNavigate('x')` si `view: 'x'`), nu dintr-o lista hardcodata, ca stergerea unui buton sa faca testul sa pice. Limita: un view legat prin variabila (nu literal) nu e detectat.
- Pe mobil, sertarul deschis are `shadow-lg` (Sidebar.tsx:210); regula "fara box-shadow" a fost aserțata doar pe desktop, conform planului. De confirmat vizual daca se doreste fara umbra si pe mobil.

## Known Stubs

None.

## Lista de acceptare umana (end-of-phase)

Status faza: **asteapta verificare umana** (nu marcata ca verificata).

1. Pe Lavender Light si pe QwanKiDo Blue, sidebar-ul si dashboard-ul par o singura aplicatie (aceleasi culori, aceleasi carduri, fara umbre).
2. Meniul are 7 intrari ca SUPER_ADMIN_FEDERATIE, 7 ca ADMIN_CLUB, 7 ca INSTRUCTOR si 4 ca SPORTIV (spec-ul a randat real doar SPORTIV).
3. Fiecare tab de hub (Sportivi, Examene, Competitii, Fisa mea, Antrenamente) deschide pagina corecta.
4. "Recente" apare in sidebar dupa vizitarea a 2 pagini.
5. Anunturi Federatie (Administrare > Federatie) si Generator Program (Antrenamente > Prezente & Antrenamente) raman accesibile.
6. Notificari push exista in Setari Cont.
7. Bottom nav functioneaza pe un telefon real (iOS safe-area) — netestat pana la verificarea umana.
8. Scroll restaurat pe Sportivi si Plati la revenire.
9. Ghidul interactiv isi gaseste ancorele (data-tutorial / data-tour) pe sidebar, Grupe, Plati.
10. Filtrele de la Competitii se combina AND.
11. Incasarea multipla din Plati functioneaza.
12. Schimbarea de rol din UserMenu/RoleSwitcher functioneaza.
13. Dashboard-ul de sportiv: sectiunea "Detalii" si anuntul de prezenta.
14. Cele 20 de teme se aplica fara sidebar/dashboard ilizibile (verificare vizuala pe cel putin 6). Atentie speciala la itemul activ din sidebar pe Forest, Amber, Rose, Sunset, Teal, Ocean si QwanKiDo Blue (contrast sub 4,5:1), si la textul sidebar pe Graphite.
15. Decizie utilizator: se ajusteaza culorile `sidebarActive`/`sidebarActiveFg` ale celor 7 teme sub prag sau se accepta?
16. Rulare vizuala a modalelor si paginilor din 34-06..34-12 (neverificate in browser in acele planuri, conform SUMMARY-urilor lor).

## Self-Check: PASSED

Fisiere create exista (`tests/ui_faza34_menu_parity.ts`, `tests/ui_faza34_shell.spec.ts`); commit-urile f717dff si e821eed exista.
