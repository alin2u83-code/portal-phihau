# Phase 8: Button Design System - Context

**Gathered:** 2026-06-09
**Status:** Ready for planning
**Source:** User Q&A (95% clarification session)

<domain>
## Phase Boundary

Extinderea componentei `Button` din `components/ui.tsx` cu variante vizuale noi (pill, ghost, outline), icoane (leftIcon/rightIcon), dimensiuni suplimentare (xs, lg), plus o componentă nouă `ConfirmButton` cu confirmare inline și o pagină catalog `ButtonCatalog` accesibilă doar SUPER_ADMIN_FEDERATIE.

**Ce NU face această fază:**
- Nu schimbă API-ul existent al Button (backward compatible 100%)
- Nu introduce librării UI externe (Chakra, MUI, Shadcn)
- Nu modifică logica de business din componente care folosesc Button
- Nu adaugă animații complexe sau efecte CSS avansate

</domain>

<decisions>
## Implementation Decisions

### Strategie modificare
- **DECIZIE LOCKED**: Înlocuire graduală — stilul Button-ului existent se actualizează, variantele noi se adaugă. API existent neschimbat. Risc mic.
- Toate componentele existente continuă să funcționeze fără nicio modificare

### Variante noi de adăugat (inspirate Adservio + research web)
- **DECIZIE LOCKED**: `ghost` variant — buton transparent cu border, text colorat, fără fundal (pentru acțiuni secundare / terțiare)
- **DECIZIE LOCKED**: `outline` variant — similar ghost dar cu border mai pronunțat (alternativă la secondary)
- **DECIZIE LOCKED**: `pill` prop boolean — aplică `rounded-full` în loc de `rounded-xl` (aspect modern, fully-rounded)

### Dimensiuni
- **DECIZIE LOCKED**: Adaugă `xs` (px-3 py-1 text-xs) și `lg` (px-8 py-4 text-lg) la sizeClasses — păstrează `sm` și `md` existente
- Total dimensiuni: `xs | sm | md | lg`

### Icoane
- **DECIZIE LOCKED**: Adaugă `leftIcon?: ReactNode` și `rightIcon?: ReactNode` la ButtonProps
- Icoanele se randează cu gap-2 față de text: `{leftIcon} {children} {rightIcon}`
- API simplu: `<Button leftIcon={<PlusIcon/>}>Adaugă</Button>`

### Teme și culori
- **DECIZIE LOCKED**: Păstrăm variabilele CSS de temă (`--t-primary`, `--t-secondary`, etc.)
- Variantele ghost/outline derivă culorile din aceleași CSS vars
- Ghost primary: text `var(--t-primary)`, border `var(--t-primary)`, background transparent
- Ghost secondary: text `var(--t-secondary-fg)`, border `var(--t-border)`
- Ghost danger/success/info/warning: text din `var(--t-status-*)`, border corespunzător

### ConfirmButton
- **DECIZIE LOCKED**: Componentă nouă `ConfirmButton` exportată din `components/ui.tsx`
- Pattern: la primul click → stare confirmare (inline, în același buton) → "Ești sigur? [Da] [Nu]"
- Props: `onConfirm: () => void`, `confirmText?: string` (default: "Ești sigur?"), `confirmLabel?: string` (default: "Da"), `cancelLabel?: string` (default: "Nu"), plus toate props normale Button
- Implicit variant=danger (pentru acțiuni distructive)
- Timeout auto-reset: dacă userul nu confirmă în 3 secunde, butonul revine la starea inițială

### Catalog vizual
- **DECIZIE LOCKED**: Pagina `components/ButtonCatalog.tsx` ca view separat în portal
- `activeView='button-catalog'` înregistrat în AppRouter
- Vizibil în Sidebar DOAR pentru `SUPER_ADMIN_FEDERATIE` (permissions.isFederationAdmin)
- Afișează grid: fiecare variant × fiecare size × stări (normal, hover, disabled, loading)
- Include și ConfirmButton demo interactiv

### Claude's Discretion
- Organizarea internă a codului în ui.tsx (funcții helper, order of declarations)
- Culoarea exactă de border pentru ghost variants (derivă din CSS vars existente)
- Poziționarea linkului catalog în Sidebar (footer sau secțiune separată)
- Iconița pentru link-ul catalog din Sidebar

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System actual
- `components/ui.tsx` liniile 1-106 — Button component complet cu toate variantele și stilurile actuale
- `components/ui.tsx` — întreg design system intern; nicio importare din exterior

### Teme CSS
- `index.css` — variabile CSS `--t-primary`, `--t-secondary`, `--t-status-*`, `--t-border`, `--t-surface`
- `lib/themes.ts` — definiții teme (dacă există după Phase 5)

### Navigare și roluri
- `types.ts` — tipul `View` (string union activeView) — 'button-catalog' trebuie adăugat
- `components/AppRouter.tsx` — switch pe activeView — adaugă case 'button-catalog'
- `components/Sidebar.tsx` — meniu navigare — adaugă link catalog pentru SUPER_ADMIN
- `hooks/usePermissions.ts` — `isFederationAdmin` flag pentru vizibilitate catalog

### Constraints active
- `CLAUDE.md` — `components/ui.tsx` = design system intern; nu Shadcn/MUI
- `.planning/intel/constraints.md` — CON-design-system, CON-tech-stack

</canonical_refs>

<specifics>
## Specific Ideas

### Inspirații Adservio
- Butoane SPA fără `<a>` — pattern confirmat (CON-adservio-spa-nav)
- Butoane cu iconițe la stânga (pattern comun în Adservio pentru acțiuni primare)
- Variante ghost pentru acțiuni secundare în tabele

### Research web recomandat pentru planner
Planner-ul ar trebui să cerceteze:
- Shadcn/ui Button API (pentru inspirație API, nu adoptat ca librărie)
- Tailwind UI button patterns
- React Aria / Headless UI button patterns pentru accesibilitate
- GitHub Primer button system pentru ConfirmButton pattern

### Locuri în aplicație unde noul ConfirmButton s-ar potrivi
- Butonul "Șterge" din modals (înlocuire graduală, nu obligatorie în această fază)
- Butonul "Retrage" din wizard-ul de competiții
- Butonul "Anulare antrenament" din Calendar (Phase 3)

</specifics>

<deferred>
## Deferred Ideas

- Migrarea explicită a tuturor butoanelor existente la variantele noi (scope prea mare, se face gradual)
- Animații de tranziție complexe (motion/framer) — outside stack
- Buton split (dropdown + acțiune principală) — v2
- Storybook sau documentare HTML separată — nu e in-app; catalogul vizual acoperă nevoia

</deferred>

---

*Phase: 08-button-design-system*
*Context gathered: 2026-06-09 via User Q&A*
