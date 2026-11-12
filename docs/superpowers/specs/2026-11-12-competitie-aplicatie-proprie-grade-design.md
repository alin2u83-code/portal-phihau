# Competiția ca aplicație de sine stătătoare: sportivi, grade, arme, înscrieri

Data: 2026-11-12. Stare: design aprobat de utilizator în chat (12.11.2026). Urmează fază GSD nouă (după Faza 38).

## Intenție și motiv
Reprezentantul unui club (cont comun de competiție, `/competitie`, rol REPREZENTANT_COMPETITIE, Faza 39) trebuie să poată face tot ce ține de o competiție fără modulul "Management" (clubul poate să nu-l folosească). Declanșator: sportivii BALMUS și SFICA (C.S. Phi Hau, 13 ani, grad ordine 12) nu aveau categorie la Song Luyen; gradul nu se putea schimba din zona externă (`components/Competitii/index.tsx:213`, `canEditGrad = !extern && ...`).

## Flux țintă (reprezentant)
1. Își ține lista de sportivi: adaugă sportivi noi, activează cei vechi, dezactivează.
2. Înainte de competiție actualizează gradele și armele.
3. Înscrie sportivii (grad, vârstă, sex, categorie), totul în interfața de competiție.

Legătura cu managementul e într-o singură direcție: competiția scrie, managementul citește. Ce se procesează în competiție apare în management ca federația să vadă situația.

## Reguli de business (decise de utilizator)
- Schimbarea de grad din competiție este **gradul oficial** al sportivului (`sportivi` + `istoric_grade`), vizibil peste tot.
- **Echivalare** (sub 13 → peste 13): fără cost.
- **Orice altă promovare**: cu cost (examen, taxa gradului din baza de date). Nu se creează factură automat. Federația primește o **notificare "există un examen de achitat"**, cu taxa.
- Un sportiv poate susține grad între înscriere și competiție.
- **Retrogradare** (grad mai mare → mai mic): **motiv obligatoriu**.
- **Undo**: "sesiune" = toată perioada de înscrieri la acea competiție. În perioada de înscrieri, o schimbare poate fi anulată fără motiv. În afara ei, corecția înapoi cere motiv.
- **Vârsta** se verifică la data competiției. Dacă sportivul trece între înscriere și competiție într-o altă categorie, gradul se poate schimba ca să fie înscris corect.

## Evidența federației
Pentru fiecare schimbare: sportiv, club, grad vechi → nou, autor declarat (Faza 39), dată, competiție, motiv, tip (echivalare / promovare / retrogradare / undo). Retrogradările sunt evidențiate. Notificarea de examen de achitat e un semn în evidență plus un contor.

## Obiective / non-obiective / anti-obiective
- Obiectiv: competiția funcționează fără Management; federația vede orice schimbare de grad și poate prinde greșelile.
- Non-obiectiv: factură automată la schimbarea gradului; email către federație; aprobare prealabilă a federației.
- Anti-obiectiv: contul unui club care scrie sau citește date ale altui club; schimbare de grad fără autor declarat; retrogradare fără motiv.

## Constrângeri
- Contul extern nu are azi drept de scriere pe `sportivi` / `istoric_grade` (RLS). De verificat în `pg_policies` live, nu doar în migrări. Scrierea limitată la clubul propriu, testată cross-club.
- Date de minori (GDPR): autor declarat obligatoriu (garda `20261111g` cere sesiune de autor pentru REPREZENTANT).
- `istoric_grade` poate să nu păstreze motivul (de verificat); se completează dacă lipsește.
- Stack: React 18 + TS + Tailwind, `components/ui.tsx`, fără librării noi. Nu se sparge API-ul existent. Modificările de DB prin migrări noi (`git add -f`, `supabase/` e în `.gitignore`).

## Decizii după builder check
Ale utilizatorului (12.11.2026):
- **Conflicte cu Management:** scriere directă în sportivii clubului, ultima câștigă; fiecare schimbare rămâne în istoric cu autor.
- **"Examen de achitat":** doar rând în evidență cu taxa din baza de date, plus contor; federația îl marchează manual "achitat". Nu atinge examenele sau plățile.
- **Echivalarea:** calculată de sistem (sub 13 → peste 13 și grad corespunzător); reprezentantul nu alege tipul.
- **UI federație (v1):** ecran cu listă și filtre (club, competiție), retrogradările evidențiate, examenele de achitat.

Alegerile mele (de verificat de utilizator):
- Schimbarea se aplică printr-o funcție în baza de date (SECURITY DEFINER, atomică, cu audit), nu prin scriere directă în tabele. Revert de către federație: prin fluxul existent de grade, fără mecanism nou.
- "Perioada de înscrieri" = data limită de înscriere existentă a competiției.
- Arme și sportivi noi: același tabel de evidență, cu coloană de tip (grad / armă / sportiv nou); câmpurile vechi/nou sunt generice.

## Lăsat constructorului
Forma ecranelor, denumirea tabelei de evidență, felul în care se marchează "perioada de înscrieri" în date, UX pentru sportiv nou / activare. Arme și sportivi noi urmează aceeași evidență (alegerea mea, nu a utilizatorului).

## Deschis
- Regula "2 sportivi la aceeași armă" (contor Pas3 vs modal), de decis separat.
- Todo sursă: `.planning/todos/pending/2026-11-12-reprezentant-schimba-grad-in-competitie.md`.
