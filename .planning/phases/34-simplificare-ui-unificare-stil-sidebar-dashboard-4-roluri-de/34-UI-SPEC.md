---
phase: 34
slug: simplificare-ui-unificare-stil-sidebar-dashboard-4-roluri-de
status: approved
shadcn_initialized: false
preset: none
created: 2026-11-02
---

# Phase 34 — UI Design Contract

> Contract vizual și de interacțiune pentru Faza 34: Simplificare UI — unificare stil sidebar + dashboard, 4 roluri.
> Generat de gsd-ui-researcher, verificat de gsd-ui-checker. Sursa deciziilor: `34-CONTEXT.md` (toate LOCKED, nu se re-întreabă).
> Singurul lucru care cere aprobarea userului înainte de cod: secțiunea **Meniu — inventar și propunere** + mockup-ul HTML (vezi "Poartă de aprobare").

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (design system intern `components/ui.tsx`; Shadcn/MUI interzis de CLAUDE.md) |
| Preset | not applicable (nu există `components.json`; nu se inițializează) |
| Component library | none (componente proprii: `Card`, `Button`, `Badge`, `StatCard`, `EmptyState`, `Accordion/AccordionItem`, `Modal`, `Input`, `Select`, `Skeleton` din `components/ui.tsx`) |
| Icon library | `components/icons.tsx` (SVG interne, ex. `HomeIcon`, `UsersIcon`) — `lucide-react` există în dependențe dar NU se introduce în shell |
| Font | Inter (index.html încarcă 400/600/700/900) — se folosesc doar 400 și 600; linkul Google Fonts poate fi redus la `wght@400;600` |
| Theming | 20 teme predefinite în `lib/themes.ts`, aplicate ca variabile CSS `--t-*` prin `applyTheme()`; `data-theme-mode="light|dark"` derivat din luminanța `bg`. Tema implicită: "Lavender Light". NU se modifică setul de teme sau tokenii. |
| Constrângeri | Tailwind only, fără fișiere CSS noi, fără librării noi, fără schimbări de API la componentele din `ui.tsx` (props existente rămân; doar aspectul vizual se schimbă) |

### Stare actuală (de ce se face faza) — constatări din cod

| Zonă | Constatare (fișier) | Efect |
|------|---------------------|-------|
| Sidebar | `Sidebar.tsx`/`NavMenu.tsx` folosesc culori hardcodate (`amber-400`, `sky-400`, `slate-800/40`, `border-white/5`, gradient avatar, `shadow-2xl`) în loc de `--t-*` | Sidebar-ul arată ca altă aplicație față de dashboard, mai ales pe temele luminoase |
| Sidebar | Fiecare item e o "cutie" cu border + fundal; iconițe galbene; subitem cu bulină + linie amber; antete 10px uppercase; buton scroll cu `from-slate-900` (greșit pe teme luminoase); badge cu `animate-ping` | Zgomot vizual |
| Sidebar | Buton "Tema" duplicat (și în `Header` există `ThemeDropdown`); pastilă rol colorată per rol (purple/sky/emerald/indigo); punct verde "online" pe logo | Redundanță |
| Header | `shadow 0 1px 20px`, pastilă "Online" verde cu `animate-pulse`, buton back cu `bg-slate-800/80` | Zgomot, nu urmează tokenii |
| Dashboard admin | `AdminMasterMap.tsx`: card "Prezență Rapidă" emerald + pastile QuickAccess + `NewsfeedWidget` + 5–6 acordeoane cu ~35 `ItemCard` (amber) care DUBLEAZĂ integral meniul sidebar | Dashboard lung, redundant |
| Dashboard admin | `AdminDashboard.tsx` și `FederationDashboard.tsx` au alt stil (h1 `text-3xl`, carduri `bg-slate-900`, culori text-sky/emerald/violet) | 3 dashboard-uri federale diferite |
| Dashboard sportiv | `SportivDashboard/index.tsx`: ~8 carduri cu border/fundal tintat (rose/emerald), "Notificări Push" și "Comută Rol Activ" ca carduri | Prea multe culori/carduri, fără ierarhie |
| `StatCard` | gradient + border colorat per `accentColor` + `hover:scale-[1.02]` | Zgomot |
| `Card` | `shadow-lg backdrop-blur-sm` | Nu e "plat" |
| Mobil | Nu există bottom nav (doar hamburger în `Header` + `TraseuMobil` bară traseu); footer fix `hidden md:flex` | Decizia LOCKED cere hamburger + bottom nav |

---

## Spacing Scale

Valori declarate (multipli de 4). În shell și dashboard se folosesc DOAR acestea (Tailwind: `1`=4, `2`=8, `4`=16, `6`=24, `8`=32, `12`=48, `16`=64).

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| xs | 4px | `gap-1`, `p-1` | Gap iconiță–badge, padding intern chip |
| sm | 8px | `gap-2`, `p-2`, `py-2` | Spațiu între elemente compacte, padding vertical item nav |
| md | 16px | `gap-4`, `p-4`, `px-4` | Padding implicit card, gap între elemente |
| lg | 24px | `gap-6`, `p-6` | Padding secțiune, spațiu între carduri pe dashboard |
| xl | 32px | `gap-8`, `p-8` | Padding conținut pe desktop (`lg:p-8` existent) |
| 2xl | 48px | `gap-12` | Separare majoră (ex. între blocuri dashboard pe desktop lat) |
| 3xl | 64px | `h-16` | Înălțime header și bloc logo sidebar (aliniate) |

Exceptions:
- **Țintă tactilă 44px** pe mobil: itemi nav, tab-uri hub, bottom nav (`min-h-11`). Pe desktop itemi nav = 40px (`h-10`).
- **Lățimi sidebar**: expandat 256px (`w-64`), restrâns 80px (`w-20`), sertar mobil 288px (`w-72`) — toate multipli de 4, păstrate.
- **Bottom nav**: 64px înălțime (`h-16`) + `pb-[env(safe-area-inset-bottom)]`.
- **12px** (`px-3`, `gap-3`) = inset orizontal al itemilor de navigare și distanța iconiță-etichetă: 20px iconiță + 12px gap + 12px inset = 44px, ceea ce aliniază submeniul (`ml-8` + `px-3`) exact sub eticheta părintelui.
- **36px** (`h-9`, `lg:h-9`) = nivelul compact desktop: butoanele din Header, itemii de submeniu, bara `TraseuMobil` existentă.
- **40px** (`h-10`) = nivelul standard desktop: itemi nav nivel 1 și inputuri de filtru; pe mobil = 44px (țintă tactilă).
- Toate sunt multipli de 4 și formează trei trepte: 44 tactil mobil / 40 standard desktop / 36 compact desktop.
- Se ELIMINĂ valorile non-multiple de 4 din shell: `p-2.5`, `gap-2.5`, `py-0.5`, `px-1.5`, `h-2.5`, `w-1.5`, `left-[15.2rem]` etc. (înlocuite cu cele din tabel; butonul de restrângere se repoziționează pe marginea sidebar-ului folosind `-right-3` relativ la `aside`).

---

## Typography

Exact 4 dimensiuni, exact 2 greutăți (înlocuiește amestecul actual: `text-[10px]`, `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-2xl`, `text-3xl`, `font-medium/semibold/bold/black`).

| Role | Size | Weight | Line Height | Tailwind | Folosit pentru |
|------|------|--------|-------------|----------|----------------|
| Body | 14px | 400 | 1.5 | `text-sm font-normal leading-normal` | Text curent, itemi nav inactivi, celule tabel, descrieri |
| Label | 12px | 600 | 1.5 | `text-xs font-semibold` | Etichete KPI, antete tabel, caption secțiune în meniu, badge, meta (date, subtitluri). FĂRĂ `uppercase`/`tracking-widest` în shell (rămâne doar `tracking-wide` pe antetele de tabel dacă `ui.tsx` îl are deja) |
| Heading | 16px | 600 | 1.2 | `text-base font-semibold leading-tight` | Titlu card, titlu pagină în `Header` (h1), item nav activ (600), numele grupului în sidebar |
| Display | 24px | 600 | 1.2 | `text-2xl font-semibold leading-tight` | Salut dashboard ("Bună ziua, …"), valoare KPI |

Reguli:
- Item nav inactiv = 14px/400; activ = 14px/600 (a doua greutate doar prin stare).
- Dispar: `font-bold`, `font-black`, `font-medium`, `text-[10px]`, `text-[11px]`, `text-3xl` din shell + dashboard-uri + `StatCard`. (Pe paginile din wave 3 se aplică la fiecare fișier atins; nu se face înlocuire globală în tot repo-ul.)
- Exact un `h1` vizibil per ecran: în `Header` (16/600) pe toate paginile; pe dashboard salutul 24/600 înlocuiește titlul din header ca h1 vizual (în `Header` titlul rămâne, dar fără dublare semantică: salutul e `h2`).

---

## Color

Regulă unică: **toate culorile din shell + dashboard vin din tokenii `--t-*`**. Nu se mai folosesc `amber-*`, `sky-*`, `purple-*`, `indigo-*`, `emerald-*`, `slate-*`, `white/5` hardcodate în sidebar/header/dashboard. (Hack-ul de contrast din `tailwind.config.js` pentru teme luminoase rămâne, dar componentele noi nu mai depind de el.)

| Role | Token | Usage |
|------|-------|-------|
| Dominant (60%) | `--t-content-bg` (zona de conținut), `--t-bg` (rădăcină) | Fundal pagină |
| Secondary (30%) | `--t-surface` (carduri, bottom nav), `--t-sidebar-bg` (sidebar), `--t-header-bg` (header) | Suprafețe; separate de dominant DOAR prin border 1px `--t-border` / `--t-header-border`, fără umbră |
| Accent (10%) | `--t-primary` (+ `--t-primary-fg`), `--t-sidebar-active` (+ `--t-sidebar-active-fg`) | Vezi lista rezervată de mai jos |
| Text | `--t-text` (primar), `--t-text-muted` (secundar), `--t-sidebar-text` (în sidebar) | |
| Destructive | `--t-status-danger` | Doar acțiuni distructive și stări de eroare/restanță; badge-ul numeric de notificări |
| Status (semantic, nu decorativ) | `--t-status-success/warning/info` | Doar pentru Badge/text de stare (Achitat, Restant, Expirat, Valid) — niciodată fundal de card |

Derivate permise (fără token nou, prin `color-mix`, deja folosit în `ui.tsx`): hover itemi sidebar = `color-mix(in srgb, var(--t-sidebar-text) 10%, transparent)`; fundal avatar = `color-mix(in srgb, var(--t-primary) 15%, transparent)`.

Accent reserved for (listă exhaustivă):
1. Item de navigare ACTIV din sidebar (pereche `--t-sidebar-active` / `--t-sidebar-active-fg`)
2. Butonul primar al paginii/dashboard-ului (`Button variant="primary"`, un singur CTA primar vizibil per ecran)
3. Tab-ul activ în stripul de hub (subliniere 2px `--t-primary`)
4. Inel de focus (`--t-input-focus-ring`)
5. Inițiala/avatarul utilizatorului (tint 15%) și iconița din interiorul `StatCard` (nu valoarea)

Interzis ca accent: iconițe de nav (folosesc `--t-sidebar-text`, iar la item activ `--t-sidebar-active-fg`), titluri de carduri, borduri de carduri, fundal de carduri, pastile de rol, punct "online", gradiente (`bg-gradient-*`, `from-*`) în shell/dashboard.

Elemente eliminate (zgomot): gradient avatar; linii gradient separator (→ `border-t 1px` cu `color-mix(in srgb, var(--t-sidebar-text) 15%, transparent)`); `shadow-2xl` sidebar; `shadow-lg backdrop-blur-sm` pe `Card`; `boxShadow` header; `animate-ping`/`animate-pulse` ("Online", badge notificări); pastila rol colorată; card-uri tintate rose/emerald (Plăți sportiv); card emerald "Prezență Rapidă"; `hover:scale-*`.

Umbre: `shadow-none` pe sidebar, header, carduri, KPI. `shadow-lg` doar pe elemente suprapuse (Modal, dropdown-uri, sertar mobil).

Rază (radius): 12px (`rounded-xl`) carduri, Button, Modal, KPI; 8px (`rounded-lg`) itemi nav, inputuri, tab-uri, chip-uri; `rounded-full` doar avatar și badge numeric.

---

## Layout & componente shell

### Sidebar (desktop ≥1024px: fix stânga; mobil <1024px: sertar din stânga)

Structură verticală (de sus în jos), fiecare bloc separat de următorul prin `border-b 1px` în culoare `--t-sidebar-text` la 15%:
1. **Logo** (h-16, aliniat la linia header-ului): `QwanKiDoLogo` 32px + "Qwan Ki Do" 16/600. Fără subtitlul "Management", fără punct verde. Click → dashboard.
2. **Context/rol** (`RoleSwitcher`, un singur rând, 14/600 numele contextului, 12/600 muted sub el rolul ca TEXT simplu — nu pastilă). Rămâne dropdown doar dacă `canSwitchRoles`.
3. **Navigație** (`NavMenu`): listă verticală, `gap-1` (4px), padding `p-2`.
4. **Subsol**: rând utilizator (avatar 32px tint + nume 14/600 + rol 12 muted + buton logout iconiță). Fără buton "Tema" (există în `Header`→`ThemeDropdown`). Logout 44px țintă pe mobil.

Item de navigare (nivel 1):
- Înălțime 40px (mobil 44px), `px-3` (12px — excepție de aliniere: 12 = multiplu de 4), `rounded-lg`, fără border, fundal transparent.
- Iconiță 20px în `--t-sidebar-text`; gap 12px; etichetă 14/400.
- Hover: fundal derivat 10% din `--t-sidebar-text`. Activ: fundal `--t-sidebar-active`, text+iconiță `--t-sidebar-active-fg`, etichetă 600. Fără `scale`, fără border.
- Grup cu submeniu: aceeași înălțime; chevron 16px la dreapta; grupul care conține viewul activ e deschis, celelalte închise (comportament existent, păstrat). Un singur grup deschis o dată (existent).
- Submeniu: fără linie verticală amber și fără bulină; itemi 14/400 cu indentare 32px (aliniat sub etichetă), înălțime 36px (mobil 44px). Activ = aceeași pereche `--t-sidebar-active`. Caption de secțiune (câmpul `section` din `SubMenuItem`, API existent) = 12/600 muted, fără uppercase, folosit DOAR în grupuri cu >5 itemi.
- Badge notificări: pastilă `rounded-full`, fundal `--t-status-danger`, text alb 12/600, max "9+"; fără animație. În mod restrâns: punct 8px `--t-status-danger` pe colțul iconiței. Grup închis cu notificări în copii → punct 8px pe antetul grupului.
- Mod restrâns (80px): doar iconițe centrate, `title` = etichetă; fără submeniuri (click pe grup → expandează sidebar-ul).
- Scroll: scroll nativ, FĂRĂ butoanele-săgeată cu gradient (`from-slate-900` — greșit pe teme luminoase). Fade de 16px sus/jos prin `mask-image` doar dacă lista depășește înălțimea (opțional).
- Buton de restrângere: 24px cerc, `border --t-border`, fundal `--t-sidebar-bg`, la marginea dreaptă a sidebar-ului (`absolute -right-3 top-5`).
- Sidebar: `border-r 1px --t-header-border`, fără umbră. Sertar mobil: `shadow-lg` (suprapus), backdrop `bg-black/50` fără `backdrop-blur`.

### Header (h-16)

- Fundal `--t-header-bg`, `border-b 1px --t-header-border`, fără umbră, fără `backdrop-blur` decorativ.
- Stânga: hamburger (doar <lg, 44×44), buton Înapoi (ghost, 44px mobil / 36px desktop), breadcrumb 12/400 muted, titlu 16/600.
- Se elimină pastila "Online".
- Dreapta: Reîncarcă, `ThemeDropdown`, `NotificationBell`, `UserMenu` — toate 36px pe desktop, 44px pe mobil, fără separator vertical.
- `UserMenu` primește (mutate din sidebar, fără logică nouă de permisiuni — se reutilizează `usePermissions`): "Setări Cont" (există), "Protecția datelor" (toate rolurile; D-15), "Istoric Activitate" (doar `isAtLeastInstructor`, ca în `AppRouter`).

### Bottom nav (nou, doar <1024px — `lg:hidden`)

- Componentă nouă `components/layout/BottomNav.tsx` (folder `components/layout/` există gol). Fix jos, `h-16`, `bg --t-surface`, `border-t 1px --t-border`, `z-30`.
- 4 sloturi egale, fiecare ≥44px: iconiță 20px + etichetă 12/600 (activ: `--t-primary` pe iconiță+etichetă; inactiv: `--t-text-muted`). Slotul 4 = "Meniu" (deschide sertarul sidebar, `setIsMobileOpen(true)`).
- Sloturile 1–3 per rol: vezi tabelul "Mobil". Utilizează aceleași `view`-uri și aceeași funcție `handleNavigate` din `Sidebar` (fără logică nouă de navigare/permisiuni).
- `AppLayout`: `main` capătă `pb-24` sub lg (în loc de `pb-32 md:pb-28`); footer-ul "Realizat cu AI…" devine `hidden lg:flex` (acum `hidden md:flex` s-ar suprapune cu bottom nav între 768–1023px). `TraseuMobil` (h-9 sub header) rămâne, restilizat cu tokeni: chip-uri `rounded-lg`, `text-[var(--t-text-muted)]`, `border --t-border`, fără `text-indigo-300`.

### Carduri și KPI

- `Card`: `bg --t-surface`, `border 1px --t-border`, `rounded-xl`, `p-4` (mobil) / `p-6` (≥md), `shadow-none`, fără `backdrop-blur`. Același `Card` pe TOATE dashboard-urile; clasele `bg-slate-900/50 border-slate-800` locale (SportivDashboard, AdminDashboard) dispar.
- `StatCard` (API neschimbat; `accentColor` rămâne în props dar aspectul se colapsează): fundal `--t-surface`, border `--t-border`, `rounded-xl`, FĂRĂ gradient, FĂRĂ hover scale. Etichetă 12/600 muted (fără uppercase); valoare 24/600 `--t-text`; iconiță 20px în `--t-primary`. Excepție de stare: `accentColor="rose"` → valoarea în `--t-status-danger`; `"emerald"` → `--t-status-success`; orice altă valoare = neutru. Dacă are `onClick`: hover = `border-color: --t-primary`, `cursor-pointer`, fără scale.
- `AccordionItem`: titlu 14/600 (nu uppercase), iconiță `--t-text-muted` (nu amber), corp `--t-surface` (nu `bg-slate-900/40`).
- `Badge`: nemodificat ca API; regulă de utilizare: max 1 badge per rând de listă/card; niciun badge decorativ în shell.

### Hub tab strip (pattern comun pentru paginile din scope)

Precedent existent: `ActivitateSalaTabs.tsx` și `Plati/hub/PlatiHub.tsx`. Contract vizual unic:
- Rând orizontal sub titlu, înălțime 44px, `border-b 1px --t-border`, scroll orizontal pe mobil fără bară vizibilă.
- Tab: 14/400 muted, `px-4`; activ: 14/600 `--t-text` + subliniere 2px `--t-primary`. Fără pastile/fundaluri.
- Fiecare tab = un `view` existent din `AppRouter` (nu se adaugă view-uri noi, nu se schimbă `activeView`).

### Pagini din scope (wave 3) — reguli

Sportivi, Plăți/plati-hub, Competiții, Grupe, Prezență, Examene:
- Antet pagină: titlul vine din `Header`; în pagină NU se repetă `h1`. Acțiunea primară = un singur `Button variant="primary"` aliniat dreapta deasupra listei.
- Filtre (în Competiții: sistemul de filtrare unificat gen/vârstă/grad/probă, deja existent) = un rând inline deasupra listei, inputuri `--t-input-bg`, 40px înălțime, `gap-2`.
- Tabele: tokenii `--t-table-header-bg`, `--t-table-header-text`, `--t-table-row-hover`, `--t-table-border`; antet 12/600, celule 14/400; fără bandă zebra și fără borduri colorate pe rânduri.
- Stări: câte un `Badge` de stare pe rând; culoare de stare doar pe badge/text, nu pe rând întreg.

---

## Dashboard — conținut și ierarhie per rol

Principii: dashboard-ul răspunde la "ce am de făcut azi?", NU duplică meniul. Eliminat: acordeoanele cu ~35 `ItemCard` din `AdminMasterMap` (duplicau sidebar-ul), cardul "Prezență Rapidă" hero emerald, pastilele QuickAccess/Preferate. Ținta: cel mult 4 blocuri, ≤ 1,5 ecrane pe desktop 1080p; 1 coloană pe mobil, grilă de 12 coloane/gap-6 pe desktop.

Ordinea blocurilor (toate rolurile de club/federație): 1) Salut, 2) De rezolvat, 3) KPI, 4) Acțiuni rapide, 5) Anunțuri.

| Bloc | Specificație |
|------|--------------|
| Salut | `h2` 24/600 "Bună ziua, {prenume}" + linie 14/400 muted cu data ("luni, 2 noiembrie") — înlocuiește "Ce facem azi?" |
| De rezolvat | `DeRezolvatCard` existent (ADMIN_CLUB), restilizat: `Card` neutru, titlu 16/600 în `--t-text` (nu `text-amber-400`), fiecare problemă = rând cu text + buton ghost "Rezolvă problema" (textul specific al acțiunii, ex. "Alocă în grupe", rămâne ca atribut `title` pe buton); se afișează DOAR dacă există probleme. Pentru SUPER_ADMIN: același card cu deconturi în așteptare și cereri de înscriere noi (date deja calculate în `AdminMasterMap`) |
| KPI | `StatCard` ×3 (mobil: scroll orizontal sau 1 coloană; desktop: 3 coloane). Doar date deja disponibile: vezi tabelul de mai jos |
| Acțiuni rapide | Rând de 2–4 `Button` (primar + secundare), nu carduri; vezi tabelul de mai jos |
| Anunțuri | `NewsfeedWidget` într-un `Card`, max 3 elemente + "Vezi toate"; ultimul bloc |

| Rol | KPI (3) | Acțiuni rapide (primar întâi) |
|-----|---------|-------------------------------|
| SUPER_ADMIN_FEDERATIE | Cluburi active · Sportivi total · Deconturi în așteptare (rose dacă >0) | "Gestiune cluburi" (primar → `cluburi`), "Deconturi federație" (`deconturi-federatie`), "Panou federație" (`federation-dashboard`) |
| ADMIN_CLUB | Sportivi activi · Antrenamente azi · De încasat (nr. facturi, rose dacă >0) | "Începe prezența" (primar → `prezenta`), "Plăți & Facturi" (`plati-hub`), "Adaugă sportiv" (`sportivi`) |
| INSTRUCTOR | Antrenamente azi · Grupele mele · Sportivi în grupe | "Începe prezența" (primar → `prezenta-instructor`), "Grupe & Orar" (`grupe`) |
| SPORTIV | vezi mai jos (are layout propriu) | "Vezi antrenamentul" (în `TrainingActionCard`) |

Notă dependență: "Preferate"/"Cele mai folosite" (`useQuickAccess`, steaua de pe `ItemCard`) se bazau pe `ItemCard`-urile eliminate. În acest contract sunt **eliminate din dashboard**; hook-ul și datele rămân în repo (neutilizate). Alternativă dacă userul o cere: rând "Recente" cu max 4 chip-uri, alimentat prin `trackView` apelat din `Sidebar.handleNavigate`. → vezi "Decizii deschise".

### Dashboard SPORTIV (layout propriu, 1 col mobil / 2 col ≥md, gap-6)

Ordine și reguli:
1. Salut 24/600 + grad curent ca text 14/400 muted (fără badge colorat).
2. **Următorul antrenament** (`TrainingActionCard`) — lățime completă, singurul card cu buton primar.
3. Rând 2 coloane: **Plăți** (`Card` neutru; starea = un `Badge` + sumă; NU mai tintează cardul rose/emerald) · **Viză medicală** (`VizaMedicalaCard`; se afișează doar dacă expiră în ≤30 zile sau e expirată).
4. Rând 2 coloane: **Evenimente** (`EvenimenteWidget`) · **Istoric grade / progres** (`HistoryModal` trigger existent).
5. **Familie** (`FamilieWidget`) — doar dacă utilizatorul are familie asociată.
- Mutate în afara dashboard-ului (relocare, fără funcționalitate pierdută): "Notificări Push" (`NotificationPermissionWidget`) → pagina "Setări Cont"; "Comută Rol Activ" → deja în `RoleSwitcher`/`UserMenu` ("Schimbă Context"); se șterge cardul duplicat.

---

## Meniu — inventar curent și propunere redusă (PENTRU APROBARE USER)

Sursa inventarului: `components/menuConfig.ts` + `NavMenu.tsx` (Admin Dashboard și Button Catalog se adaugă condiționat pentru `isFederationAdmin`). Nicio rută din `AppRouter` nu se șterge — cele scoase din sidebar rămân accesibile prin tab-uri de hub, `UserMenu` sau dashboard. Permisiunile rămân la `renderProtected`/`usePermissions` (neschimbate).

### Principiile propunerii
1. Un hub = o intrare în sidebar; sub-view-urile apropiate devin tab-uri în pagină (precedent: Activitate Sală, `plati-hub`).
2. Elementele "de cont" (Setări Cont, Protecția datelor, Istoric Activitate) trec în `UserMenu` din header.
3. Max 7 intrări de nivel 1 per rol; max 1 nivel de submeniu; max 6 itemi/grup.
4. Notificările rămân accesibile prin clopoțelul din header + intrarea din "Administrare" (badge propagat pe antetul grupului).

### Inventar curent (numărări)

| Rol | Intrări nivel 1 | Link-uri frunză în submeniuri | Total elemente sidebar |
|-----|-----------------|-------------------------------|------------------------|
| SUPER_ADMIN_FEDERATIE | 9 (+2 dev: Admin Dashboard, Button Catalog) = 11 | 27 | 38 |
| ADMIN_CLUB | 11 | 27 | 38 |
| INSTRUCTOR | 10 | 4 (în 3 grupe; "Examene" are submeniu cu 1 singur item) | 14 |
| SPORTIV | 7 | 0 | 7 |

Inventar detaliat curent:

- **SUPER_ADMIN_FEDERATIE** (`adminMenu`): Dashboard · Gestiune Membri {Sportivi, Familii, Legitimații, Cereri Înscriere, Cereri GDPR, Import Sportivi, Deduplicare Sportivi} · Examene {Sesiuni Examene, Rapoarte Examen, Audit Grade} · Activități Naționale {Activități Naționale, Competiții, Stagii, Template Probe} · Financiar & Plăți {Plăți & Facturi, Vacanțe Antrenamente, Deconturi Federație} · Setări & Admin {Gestiune Cluburi, Nomenclator Grade, Administrare Staff, Structură Federație, Setări Club, Mentenanță Date, Înlănțuiri, Setări Cont, Protecția datelor, Jurnal Audit} · Rapoarte · Notificări · SMS · Istoric Activitate · (Admin Dashboard) · (Button Catalog)
- **ADMIN_CLUB** (`adminClubMenu`): Dashboard · Gestiune Membri {aceleași 7} · Activitate Sală {Grupe & Sezoane, Prezențe & Antrenamente, Rapoarte Prezențe} · Examene {3} · Activități Naționale {4} · Echipamente {Catalog Produse, Vânzări} · Financiar & Plăți {3} · Setări & Admin {Setări Club, Nomenclator Grade, Administrare Staff, Setări Cont, Protecția datelor} · Notificări · SMS · Istoric Activitate
- **INSTRUCTOR** (`instructorMenu`): Dashboard · Sportivi · Activitate Sală {Grupe & Orar, Prezențe & Antrenamente, Rapoarte Prezențe} · Examene {Examene} · Activități Naționale {Activități Naționale, Competiții, Stagii} · Rapoarte · Notificări · Istoric Activitate · Setări Cont · Protecția datelor
- **SPORTIV** (`sportivMenu`): Portalul Meu · Istoric Prezență · Istoric Plăți · Fișa Digitală · Fișa de Competiție · Setări Cont · Protecția datelor

### Propunere redusă

Legendă: **[G]** = grup cu submeniu; **[H]** = hub cu tab-uri în pagină (intrarea duce la primul view; celelalte view-uri apar ca tab-uri); **[F]** = intrare plată.

**SUPER_ADMIN_FEDERATIE — 7 intrări (de la 11)**

| # | Intrare | Tip | Conținut (view-uri existente) |
|---|---------|-----|-------------------------------|
| 1 | Acasă | F | `dashboard` |
| 2 | Sportivi | H | tab-uri: Sportivi (`sportivi`) · Familii (`familii`) · Legitimații (`legitimatii`) · Cereri (`cereri-inscriere`) · Cereri GDPR (`cereri-gdpr`) · Import (`import-sportivi`) · Deduplicare (`deduplicare-sportivi`) |
| 3 | Examene | H | Sesiuni (`examene`) · Rapoarte (`rapoarte-examen`) · Audit Grade (`audit-grade`) |
| 4 | Competiții | H | Competiții (`competitii`) · Stagii (`stagii`) · Activități Naționale (`activitati-nationale`) · Template Probe (`template-probe`) |
| 5 | Financiar | G | Plăți & Facturi (`plati-hub`) · Deconturi Federație (`deconturi-federatie`) · Vacanțe Antrenamente (`perioade-vacanta`) |
| 6 | Rapoarte | F | `rapoarte` |
| 7 | Administrare | G (caption "Federație"/"Sistem") | Federație: Gestiune Cluburi (`cluburi`) · Structură Federație (`structura-federatie`) · Administrare Staff (`user-management`) · Nomenclator Grade (`grade`) · Înlănțuiri (`inlantuiri-admin`) — Sistem: Setări Club (`setari-club`) · Notificări (`notificari`, badge) · SMS (`admin-sms`) · Mentenanță Date (`data-maintenance`) · Jurnal Audit (`jurnal-audit`) · Admin Dashboard (`admin-dashboard`) · Button Catalog (`button-catalog`, doar `isSuperAdmin`) |

Mutate în `UserMenu`: Setări Cont, Protecția datelor, Istoric Activitate. (Grupul 7 are 12 itemi cu 2 caption-uri — excepție documentată de la "max 6", rămâne închis implicit.)

**ADMIN_CLUB — 7 intrări (de la 11)**

| # | Intrare | Tip | Conținut |
|---|---------|-----|----------|
| 1 | Acasă | F | `dashboard` |
| 2 | Sportivi | H | aceleași 7 tab-uri ca la federație |
| 3 | Antrenamente | H | Grupe & Sezoane (`grupe`, alias `sezoane`) · Prezențe & Antrenamente (`prezenta` + aliasuri) · Rapoarte Prezențe (`raport-prezenta`) — reutilizează `ActivitateSalaTabs` |
| 4 | Examene | H | Sesiuni (`examene`) · Rapoarte (`rapoarte-examen`) · Audit Grade (`audit-grade`) |
| 5 | Competiții | H | Competiții (`competitii`) · Stagii (`stagii`) · Activități Naționale (`activitati-nationale`) · Template Probe (`template-probe`) |
| 6 | Financiar | G | Plăți & Facturi (`plati-hub`) · Deconturi Federație (`deconturi-federatie`) · Vacanțe Antrenamente (`perioade-vacanta`) · Echipamente (`produse`) · Vânzări (`vanzari-produse`) |
| 7 | Administrare | G | Setări Club (`setari-club`) · Administrare Staff (`user-management`) · Nomenclator Grade (`grade`) · Notificări (`notificari`, badge) · SMS (`admin-sms`) |

Mutate în `UserMenu`: Setări Cont, Protecția datelor, Istoric Activitate.

**INSTRUCTOR — 7 intrări (de la 10)**

| # | Intrare | Tip | Conținut |
|---|---------|-----|----------|
| 1 | Acasă | F | `dashboard` |
| 2 | Sportivi | F | `sportivi` |
| 3 | Antrenamente | H | Grupe & Orar (`grupe`) · Prezențe (`prezenta-instructor` + aliasuri) · Rapoarte Prezențe (`raport-prezenta`) |
| 4 | Examene | F | `examene` (submeniu cu un singur item se elimină) |
| 5 | Competiții | H | Competiții (`competitii`) · Stagii (`stagii`) · Activități Naționale (`activitati-nationale`) |
| 6 | Rapoarte | F | `rapoarte` |
| 7 | Notificări | F | `notificari` (cu badge numeric) |

Mutate în `UserMenu`: Setări Cont, Protecția datelor, Istoric Activitate.

**SPORTIV — 4 intrări (de la 7)**

| # | Intrare | Tip | Conținut |
|---|---------|-----|----------|
| 1 | Portalul Meu | F | `my-portal` |
| 2 | Prezențe | F | `istoric-prezenta` |
| 3 | Plăți | F | `istoric-plati` |
| 4 | Fișa mea | H | tab-uri: Fișa Digitală (`fisa-digitala`) · Fișa de Competiție (`fisa-competitie`) |

Mutate în `UserMenu`: Setări Cont, Protecția datelor.

### Bilanț

| Rol | Nivel 1: acum → propus | Elemente vizibile cu totul deschis: acum → propus |
|-----|------------------------|--------------------------------------------------|
| SUPER_ADMIN_FEDERATIE | 11 → 7 | 38 → 7 în repaus (max 22 cu Financiar + Administrare deschise: 7 + 3 + 12; un singur grup deschis o dată, deci max 19) |
| ADMIN_CLUB | 11 → 7 | 38 → 7 în repaus (max 12 cu Financiar deschis) |
| INSTRUCTOR | 10 → 7 | 14 → 7 (fără submeniuri; hub-urile se deschid prin tab-uri) |
| SPORTIV | 7 → 4 | 7 → 4 |

### Modificări necesare în cod pentru propunere (informativ pentru planner)
- `menuConfig.ts`: rescrisă pe structura de mai sus (`MenuItem`/`SubMenuItem` neschimbate; aliasurile existente acoperă activarea itemului pentru view-urile din tab-uri).
- Tab-uri noi de hub, după modelul `ActivitateSalaTabs` randate din `AppRouter`: `SportiviTabs`, `ExameneTabs`, `CompetitiiTabs`, `FisaTabs` (doar wrappers de navigare, fără view-uri noi).
- `UserMenu.tsx`: +2 intrări ("Protecția datelor", "Istoric Activitate" condiționat).
- `NavMenu.tsx`: elimină injectarea hardcodată Admin Dashboard/Button Catalog din afara `menuConfig` (se mută în meniul "Administrare" > "Sistem", condiționat `isSuperAdmin`).

### Mobil — bottom nav (sloturi 1–3 + "Meniu")

| Rol | Slot 1 | Slot 2 | Slot 3 | Slot 4 |
|-----|--------|--------|--------|--------|
| SUPER_ADMIN_FEDERATIE | Acasă (`dashboard`) | Sportivi (`sportivi`) | Financiar (`plati-hub`) | Meniu |
| ADMIN_CLUB | Acasă | Sportivi | Antrenamente (`prezenta`) | Meniu |
| INSTRUCTOR | Acasă | Sportivi | Antrenamente (`prezenta-instructor`) | Meniu |
| SPORTIV | Portalul Meu (`my-portal`) | Prezențe (`istoric-prezenta`) | Plăți (`istoric-plati`) | Meniu (conține și Fișa mea) |

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA (dashboard admin/club/instructor) | "Începe prezența" |
| Primary CTA (dashboard federație) | "Gestiune cluburi" |
| Primary CTA (dashboard sportiv) | "Vezi antrenamentul" |
| Buton rând problemă (De rezolvat) | "Rezolvă problema" (textul specific al acțiunii, ex. "Alocă în grupe", rămâne ca atribut `title`) |
| Salut | "Bună ziua, {prenume}" + dată completă în română sub el (ex. "luni, 2 noiembrie") |
| Empty state — De rezolvat (heading) | "Totul e la zi" |
| Empty state — De rezolvat (body) | "Nu ai nimic de rezolvat acum. Verifică din nou după următoarea prezență." |
| Empty state — Anunțuri (heading) | "Niciun anunț" |
| Empty state — Anunțuri (body) | "Anunțurile clubului vor apărea aici." |
| Empty state — KPI fără date | valoarea "—" (liniuță) + etichetă; fără mesaj |
| Empty state — sportiv fără antrenament programat | "Niciun antrenament programat" / "Când instructorul adaugă un orar, îl vei vedea aici." |
| Error state | "Nu am putut încărca datele. Verifică conexiunea și apasă Reîncarcă (săgeata din colțul de sus)." |
| Etichete meniu | "Acasă", "Sportivi", "Antrenamente", "Examene", "Competiții", "Financiar", "Rapoarte", "Administrare", "Notificări", "Fișa mea", "Prezențe", "Plăți", "Meniu" (bottom nav) |
| Aria-label-uri | "Deschide meniul", "Restrânge meniul", "Extinde meniul", "Navigare principală", "Deconectare" |
| Destructive confirmation | none în această fază (faza nu introduce acțiuni distructive; "Deconectare" nu necesită confirmare; ștergerea/ascunderea cardurilor din dashboard nu e permisă) |

Diacriticele corecte (ă, â, î, ș, ț) obligatorii în toate textele noi (cf. fix mojibake din memoria proiectului).

---

## Stări de interacțiune (obligatorii)

| Stare | Contract |
|-------|----------|
| Loading dashboard | `Skeleton` (din `ui.tsx`) în forma blocurilor: 1 linie salut, 3 KPI, 1 card; fără spinner full-page; fără layout shift |
| Focus tastatură | `focus-visible:ring-2` cu `--t-input-focus-ring` pe itemi nav, tab-uri, bottom nav, butoane; ordinea tab = ordinea vizuală |
| Hover | Doar schimbare de fundal/border (fără scale, fără translate) |
| Reduced motion | Tranziții ≤200ms; sertarul mobil 200ms ease-out; respectă `prefers-reduced-motion` (fără animație de sertar) |
| Contrast | Perechile `--t-sidebar-text` pe `--t-sidebar-bg` și `--t-sidebar-active-fg` pe `--t-sidebar-active` trebuie să aibă ≥4,5:1 pe toate cele 20 teme; verificare la mockup pe: Lavender Light (implicită), QwanKiDo Blue, Forest, o a patra luminoasă |
| Navigare activă | `aria-current="page"` pe itemul/tabul activ |
| Scroll | Comportamentul `ScrollRestorer` din `AppRouter` rămâne neschimbat |

---

## Poartă de aprobare (flux obligatoriu înainte de cod)

1. Userul aprobă **propunerea de meniu** de mai sus (sau cere variante).
2. Se produce **mockup HTML static** (artifact) "înainte/după": sidebar + dashboard pentru cele 4 roluri, desktop (1280px) + mobil (390px, cu bottom nav), pe cel puțin 2 teme (Lavender Light — implicită, și QwanKiDo Blue — închisă), folosind valorile de token din `lib/themes.ts` (ex. Lavender Light: `bg #f0eef8`, `surface #ffffff`, `border #c4b8e8`, `text #1e1433`, `primary #7c3aed`, `sidebarBg #ffffff`, `sidebarText #334155`; QwanKiDo Blue: `bg #020617`, `surface #0f172a`, `border #1e293b`, `primary #3b82f6`, `sidebarBg #020617`, `sidebarText #94a3b8`).
3. Aprobare user pe mockup → abia apoi implementare, în valurile din CONTEXT: **Val 1** tokeni + shell (Sidebar, NavMenu, Header, AppLayout, BottomNav, `Card`/`StatCard`/`AccordionItem` din `ui.tsx`, `menuConfig.ts`, `UserMenu`) · **Val 2** dashboard-uri (AdminMasterMap, DeRezolvatCard, AdminDashboard, FederationDashboard, SportivDashboard) · **Val 3** pagini principale (tab-uri hub + reguli de pagină).

## Decizii deschise (de confirmat la aprobarea meniului, NU blochează spec-ul)

1. **Preferate / Cele mai folosite**: eliminate din dashboard (steaua trăia pe `ItemCard`-urile scoase). Păstrăm un rând "Recente" (max 4 chip-uri, `trackView` mutat în `Sidebar.handleNavigate`) sau renunțăm complet? Implicit în spec: renunțăm. **Rezolvat 2026-11-02 conform 34-CONTEXT.md > Aprobari meniu**: se păstrează rândul "Recente".
2. **Tab-urile de hub** (Sportivi, Examene, Competiții, Fișa mea) adaugă 4 wrappers mici de navigare în `AppRouter`. Dacă userul preferă zero componente noi, fallback: se păstrează submeniurile în sidebar (aceleași grupuri, fără tab-uri) — numărul de intrări de nivel 1 rămâne 7, dar elementele vizibile deschise rămân ~25. **Rezolvat 2026-11-02 conform 34-CONTEXT.md > Aprobari meniu**: wrappers de hub.
3. **Import Sportivi / Deduplicare / Cereri GDPR**: în propunere sunt tab-uri în hub-ul Sportivi. Variantă mai agresivă: butoane "Instrumente" în antetul paginii Sportivi (fără tab-uri). **Rezolvat 2026-11-02 conform 34-CONTEXT.md > Aprobari meniu**: tab-uri în hub Sportivi.
4. **Admin Dashboard / Button Catalog** (federație): mutate în "Administrare > Sistem"; `Button Catalog` doar `isSuperAdmin`. **Rezolvat 2026-11-02 conform 34-CONTEXT.md > Aprobari meniu**: Administrare > Sistem.

---

## Deviații de implementare (plan Faza 34)

1. `Card` își păstrează padding-ul implicit `p-4`; `md:p-6` se pasează local pe cardurile de dashboard (22 utilizări `Card` cu `p-0` ar fi sparte).
2. `Badge` devine global `text-xs font-semibold`.
3. Tab-urile de hub sunt un singur `HubTabs` generic în `components/layout/HubTabs.tsx` cu 4 wrappers numite `SportiviTabs` / `ExameneTabs` / `CompetitiiTabs` / `FisaTabs`.
4. `SportiviTabs` și `ExameneTabs` apar doar pentru ADMIN_CLUB/federație (instructorul are intrări plate Sportivi/Examene conform meniului aprobat).
5. "Administrare > Federație" include și "Anunțuri Federație" (`anunturi-federatie`), iar grupul "Prezențe & Antrenamente" din `ActivitateSalaTabs` primește tab-ul "Generator Program" (`activitati`), altfel aceste două view-uri ar deveni inaccesibile după eliminarea acordeoanelor din `AdminMasterMap`.
6. Cardul "De rezolvat" afișează starea goală "Totul e la zi" (copy din contract) în loc să se ascundă.
7. Dashboard sportiv: widgeturile neacoperite explicit (Prezențe recente, Prezențe pe intervale de grad, Pașaport virtual, Antrenamente viitoare) rămân sub un acordeon "Detalii" închis implicit; CTA-ul "Vezi antrenamentul" este un buton ghost către `calendar`.
8. `VizaMedicalaCard` se afișează doar când viza nu este validă (datele nu conțin data de expirare, deci condiția "<=30 zile" nu poate fi calculată fără query nou).
9. "Recente" = ultimele 4 view-uri distincte vizitate din meniu (cheie localStorage `qkd_nav_recent_<userId>`), nu cele mai folosite.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none (shadcn nu e folosit în proiect) | not applicable |
| third-party | none | not applicable — niciun registry declarat (verificat 2026-11-02: nu există `components.json`) |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** approved (user, mockup aprobat 2026-11-02)

## Corectii post-UAT (2026-11-03)

Aceasta sectiune are prioritate asupra tabelelor de mai sus.

- Card "De rezolvat" -> titlu si aria-label "Necesită atenție" (UAT-2).
- Stagii = intrare separata de nivel 1 in meniurile de staff; hub Competitii = Competiții | Activități Naționale | Template Probe (UAT-1).
- "Financiar" (submeniu) -> intrare simpla "Plăți" catre plati-hub in adminMenu/adminClubMenu; Deconturi Federație / Vacanțe Antrenamente / Echipamente / Vânzări sunt tab-uri in hub (Echipamente si Vânzări doar ADMIN_CLUB) (UAT-3).
- Bilant meniu: 8/8/8/4 in loc de 7/7/7/4; slotul bottom nav federatie se numeste "Plăți".
