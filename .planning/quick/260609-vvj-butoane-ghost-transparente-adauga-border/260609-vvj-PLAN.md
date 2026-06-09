---
phase: quick-260609-vvj
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/ui.tsx
autonomous: false
requirements:
  - VVJ-01
must_haves:
  truths:
    - "Butoanele ghost/transparent cu varianta secondary au border vizibil pe fond întunecat"
    - "Butonul Refresh și tab-urile Înscrieri/Categorii/Raport/Template arată ca elemente clickabile, nu ca text simplu"
    - "Butoanele primare cu background solid rămân neschimbate"
    - "Nicio funcționalitate nu este alterată — modificare pur CSS"
  artifacts:
    - path: "components/ui.tsx"
      provides: "Button component cu border și text contrast corect pe variantele ghost/secondary/outline"
      contains: "ghost_secondary"
  key_links:
    - from: "components/ui.tsx"
      to: "index.css"
      via: "CSS custom properties --t-border, --t-text-muted, --t-secondary-fg"
      pattern: "var\\(--t-"
---

<objective>
Butoanele ghost/transparente cu varianta `secondary` sunt invizibile pe fundalul întunecat al aplicației deoarece folosesc `border: 1px solid var(--t-border)` unde `--t-border = #1e293b` (slate-800, aproape negru). Utilizatorii noi nu recunosc aceste elemente ca butoane clickabile.

Purpose: Vizibilitate imediată pentru toți utilizatorii fără modificarea comportamentului sau funcționalității.
Output: `components/ui.tsx` cu border și text contrast corect pentru `ghost_secondary`, `outline_secondary` și `secondary` (non-ghost).
</objective>

<execution_context>
@/home/user/.claude/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@components/ui.tsx
@index.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Crește vizibilitatea border-ului pe variantele secondary ghost/outline</name>
  <files>components/ui.tsx</files>
  <action>
În `variantStyles` din componenta `Button` (lines ~83-143), modifică DOAR culorile border și text pentru variantele secondary transparente. Nu atinge variantele primary, danger, success, info, warning.

Probleme concrete de rezolvat (toate în același obiect `variantStyles`):

1. `ghost_secondary` — border aproape invizibil:
   - `border` din `'1px solid var(--t-border)'` → `'1px solid var(--t-text-muted)'`
   - `color` rămâne `'var(--t-secondary-fg)'` (OK, e deja `#e2e8f0`)
   - Nu schimba `backgroundColor` (transparenta cu hover pe --t-surface-2 e corectă)

2. `outline_secondary` — border la fel de slab (2px dar tot #1e293b):
   - `border` din `'2px solid var(--t-border)'` → `'2px solid var(--t-text-muted)'`
   - `color` rămâne `'var(--t-secondary-fg)'`

3. `secondary` (solid, non-ghost, non-outline) — background --t-secondary (#1e293b) se pierde în pagină:
   - `backgroundColor` (non-hover) rămâne `'var(--t-secondary)'` — e corect pentru fundalul butonului
   - Adaugă `border: '1px solid var(--t-text-muted)'` ca semnal vizual suplimentar că e buton
   - `color` rămâne `'var(--t-secondary-fg)'`
   - `hover`: `backgroundColor: 'var(--t-secondary-hover)'` rămâne neschimbat

`--t-text-muted` este `#94a3b8` (slate-400) — contrast suficient pe fundalul #020617 și pe carduri #0f172a fără a fi agresiv vizual.

Nu schimba: `ghost_primary`, `ghost_danger`, `ghost_success`, `ghost_info`, `ghost_warning`, `outline_primary`, `outline_danger`, `outline_success`, `outline_info`, `outline_warning`, niciunul din `primary`, `danger`, `success`, `info`, `warning` fără ghost/outline prefix.

Nu adăuga nicio clasă Tailwind nouă. Nu schimba `baseClasses`, `sizeClasses`, `variantClasses`, `roundedClass` sau logica de hover/disabled.
  </action>
  <verify>
    <automated>cd /c/Users/lungu/portal-phihau && npm run build 2>&1 | tail -20</automated>
  </verify>
  <done>Build trece fără erori TypeScript sau Vite.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
Border-ul vizibil (#94a3b8 / slate-400) adăugat pe:
- ghost_secondary: border 1px solid --t-text-muted
- outline_secondary: border 2px solid --t-text-muted
- secondary (solid): border 1px solid --t-text-muted adăugat
  </what-built>
  <how-to-verify>
1. Pornește dev server: `npm run dev` și deschide aplicația în browser
2. Navighează la un modul cu tab-uri (ex: Competiții) — tab-urile Înscrieri/Categorii/Raport/Template trebuie să arate cu border vizibil gri-albăstrui, nu text simplu
3. Caută butonul "Refresh" (ex: în liste sportivi, competiții) — trebuie să aibă border clar
4. Caută butonul "Nu particip" sau orice buton cu ghost secondary — trebuie să aibă contur
5. Verifică că butoanele primare (albastru, verde, roșu) sunt identice ca înainte
6. Verifică pe mobil sau la zoom 150% că border-ul este vizibil
  </how-to-verify>
  <resume-signal>Scrie "aprobat" dacă bordere sunt vizibile și butoanele primare neschimbate, sau descrie orice problemă vizuală</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| CSS custom properties | Valori citite din :root — nu acceptă input utilizator |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-vvj-01 | Tampering | components/ui.tsx | accept | Modificare izolată în obiect de stiluri inline — fără logică executabilă, fără suprafață de atac |
</threat_model>

<verification>
- `npm run build` trece fără erori
- Checkpoint vizual confirmă border vizibil pe ghost/secondary
- Butoanele cu background solid (primary, danger, success) rămân identice
</verification>

<success_criteria>
Orice buton cu `ghost secondary`, `outline secondary` sau `secondary` simplu afișează un border de cel puțin 1px în culoarea slate-400 (#94a3b8), recunoscut imediat ca element clickabil de utilizatori noi pe tema întunecată.
</success_criteria>

<output>
Această sarcină nu produce un fișier SUMMARY.md — este un quick fix.
Notează în CLAUDE.md sau STATE.md dacă este necesar să urmărești această decizie de stil.
</output>
