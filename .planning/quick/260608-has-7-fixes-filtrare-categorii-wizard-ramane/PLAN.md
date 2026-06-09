---
quick_id: 260608-has
slug: 7-fixes-filtrare-categorii-wizard-ramane
title: 7 Fixes Competitii — filtrare, navigare, responsive, bugs
date: 2026-06-08
status: planned
---

# 7 Fixes Competitii — filtrare, navigare, responsive, bugs

## Goal

Rezolvă 7 probleme identificate în modulul Competitii, grupate în 3 sesiuni de execuție: filtrare și navigare în wizard (Fixes 1-2), UI responsive și navigare mobil (Fixes 3-4), și bug-uri de date/logică (Fixes 5-7).

---

## Sesiunea A — Wizard: filtrare categorii + rămâi pe probă

### Task 1: Filtrare categorii în Pas3Echipe (Sincron/Song Luyen)

**File:** `components/Competitii/InscriereClubWizard/Pas3Echipe.tsx`

**Change:**

Adaugă un state local `filtruCategorii: 'toate' | 'completate' | 'incomplete'` (default `'toate'`) și randează 3 butoane de filtru deasupra listei de carduri:

```
[ Toate (N) ]  [ Completate (N) ]  [ Incomplete (N) ]
```

Filtrele se aplică pe `categoriiStare` înainte de `.map(...)`:
- `completate`: `eCompleta === true || isCatSkipped === true`
- `incomplete`: `eCompleta === false && !isCatSkipped && areEligibili`

Stilul butoanelor: aceeași convenție ca în `InscriereClubCards.tsx` (filtru `toate`/`nefinalizate`) — `border-slate-600 text-slate-400` inactive, `border-brand-primary bg-brand-primary/20 text-white` activ.

Numărătorii per buton se calculează din `categoriiStare` (nu din `categoriiStare` filtrat) pentru a afișa totalurile reale.

**Acceptance:**
- Pe proba Sincron sau Song Luyen, apare bara de filtre cu 3 butoane deasupra listei
- Click pe "Completate" ascunde categoriile incomplete; click pe "Incomplete" ascunde cele completate
- "Toate" restabilește lista completă
- Numărătorii sunt corecți (ex. "Completate (2)")

---

### Task 2: Rămâi pe probă după configurare — Pas3 nu navighează la hub

**File:** `components/Competitii/InscriereClubWizard/index.tsx`

**Change:**

Problema: Când se deschide `onOpenInscriereModal` din `Pas3FormareEchipe` (prin prop), după `onSaved` sau `onClose` a modalului, wizard-ul sare la `step='hub'`. Comportamentul dorit: după salvare din modal, utilizatorul rămâne pe `step=3`.

Verifică că `onOpenInscriereModal` din `index.tsx` (linia ~289) nu resetează `step` și că modalul `InscriereModal` din `index.tsx` (în `Competitii/index.tsx`) nu apelează un callback care schimbă step-ul.

Calea corectă de fix: în `index.tsx` al wizard-ului, prop-ul `onOpenInscriereModal` transmis la `Pas3FormareEchipe` este:
```
onOpenInscriereModal={(cat) => onOpenInscriereModal?.(cat)}
```
Problema e că `onOpenInscriereModal` din props wizard nu are nicio logică de navigare. Verifică în `Competitii/index.tsx` — funcția care deschide modalul și are un `onSaved` callback care apelează `onRefresh()`. Dacă `onSaved` apelează și `setActiveWizardStep('hub')` sau ceva similar, elimină acea schimbare de step.

Calea de implementare concretă:
1. Caută în `components/Competitii/index.tsx` locul unde `InscriereClubWizard` primește `onOpenInscriereModal`
2. Verifică ce se întâmplă în callback-ul `onSaved` al `InscriereModal` în acel context
3. Asigură-te că după `onSaved` din InscriereModal, wizard-ul rămâne la `step=3`

Soluție alternativă dacă `onOpenInscriereModal` nu poate fi separat: adaugă un state `stepDupaModal: number | 'hub' | null` în wizard — când `onOpenInscriereModal` e apelat din `step=3`, setează `stepDupaModal=3`. Când modalul se închide (`onSaved`), restaurează `step=stepDupaModal ?? 'hub'`.

**Acceptance:**
- Utilizator deschide Song Luyen / Sincron din hub → apasă "Configurează" pe o categorie → salvează → rămâne pe pagina Song Luyen/Sincron (nu revine la hub)
- Butonul "Înapoi la probe" din Pas3 merge la hub (comportament corect, neschimbat)

---

## Sesiunea B — UI responsive desktop + navigare mobil

### Task 3: Responsive tabele desktop/laptop — Pas2Quyen

**File:** `components/Competitii/InscriereClubWizard/Pas2Quyen.tsx`

**Change:**

Problema: Pe laptop (1366x768), tabelul înlănțuirilor împreună cu filtrele și footer-ul sticky creează overflow vertical sau elemente prea mari.

Modificări:
1. **Footer sticky**: Reduce padding-ul footer sticky de la `pt-3 pb-2 md:pb-16` la `pt-2 pb-2 md:pb-4` — padding-ul mare `md:pb-16` ocupă prea mult spațiu pe ecrane medii.

2. **Tabel**: Adaugă `max-h-[60vh]` cu `overflow-y-auto` pe containerul tabelului (div-ul cu `overflow-x-auto` de la linia ~370). Structura devine:
   ```
   <div className="overflow-x-auto overflow-y-auto max-h-[60vh] max-w-full rounded-lg border border-slate-700">
   ```
   Aceasta permite scroll independent pe tabel fără ca pagina să crească.

3. **Filtre vârstă**: Div-ul cu vârstele are deja `overflow-x-auto` — verifică că pe desktop nu ocupă mai mult de o linie înaltă prin adăugarea `max-h-12 overflow-y-hidden` cu un buton "mai mult" dacă sunt peste 15 vârste. **Doar dacă numărul de vârste din `varsteCompetitie` depășește 15** — altfel lasă ca e.

4. **Bulk Q1 butoane**: Combină cele 2 butoane bulk Q1 (lines ~352-367) într-un singur buton cu text dinamic:
   - Dacă `sportiviLipsaQ1.length > 0`: `Setează prima opțiune Q1 pentru toți (N)`
   - Altfel: `Resetează Q1 la prima opțiune pentru toți vizibili`

**Acceptance:**
- Pe un viewport 1366x768, pagina Pas2 (tabel înlănțuiri) nu produce scroll de pagina principal sau overflow nedorit
- Tabelul are scroll propriu dacă conține mai mult de ~10 rânduri
- Un singur buton bulk Q1 vizibil

---

### Task 4: Navigare tabele mobil — toate probele cu 2+ tabele

**File:** `components/Competitii/InscriereClubWizard/Pas3Echipe.tsx`

**Change:**

Pe mobil, când există mai mult de 4 categorii, lista de carduri devine lungă. Adaugă un sistem de filtre rapide (tab-like) care replică fix-ul din Task 1 dar optimizat pentru mobil:

Sub header-ul "Echipe — configurare", adaugă un band sticky (sau normal) de filtre:
```
[ Toate ] [ De configurat ] [ Gata ]
```

Pe mobil (`< md`), aceste butoane devin scroll-abile orizontal (ca filtrul de vârste din Pas2).

Acest Task extinde Task 1 — dacă Task 1 e deja implementat, adaugă doar stilizarea responsivă pentru mobil:
- Desktop: butoanele sunt inline flex wrap
- Mobil: `overflow-x-auto` cu `flex nowrap` și `min-w-max` pe container

Pentru probelele cu 1-2 categorii, filtrul nu este afișat (`categoriiStare.length < 3` → nu afișa filtrul).

**Nota:** Acest task acoperă "toate probele" (Sincron, Song Luyen, Giao Dau) prin faptul că Pas3Echipe este componenta partajată pentru toate probele tip echipă/pereche.

**Acceptance:**
- Pe mobil (375px), butoanele de filtru sunt scroll-abile orizontal și nu se rup în linii
- Pe desktop, butoanele sunt inline normali
- Filtrul nu apare când sunt sub 3 categorii

---

## Sesiunea C — Bug-uri de date și logică

### Task 5: Bug count tabletă sincron — eligibili vs. afișați

**File:** `components/Competitii/InscriereClubWizard/Pas3Echipe.tsx`

**Change:**

Problema: Categorie "9-10 ani feminin sincron 3-4 cap rosu" afișează "4 eligibili" dar în modal apar doar 3 sportivi.

Cauza probabilă: `eligibili` în `categoriiStare` (linia ~109 în Pas3Echipe.tsx) folosește `sportivi.filter(s => verificaEligibilitate(s, cat, grade, dataCompetitie).eligibil).length` — aceasta returnează toți sportivii care trec eligibilitatea, inclusiv cei deja retrași sau cu inscrierea anulată.

Fix: Excluderea din contorizare a sportivilor deja înscriși activ **sau** a celor fără date (fără `data_nasterii`). Verifică ce face `verificaEligibilitate` pentru un sportiv fără `data_nasterii` sau cu vârstă exact la limita categoriei.

Implementare:
1. În `useMemo` pentru `categoriiStare` (linia ~98-111), la calculul `eligibili`, filtrează suplimentar sportivii cu `data_nasterii === null` sau cu `gen === null` înainte de `verificaEligibilitate`:
   ```typescript
   const eligibili = sportivi.filter(s => {
     if (!s.data_nasterii || !s.gen) return false;
     return verificaEligibilitate(s, cat, grade, dataCompetitie).eligibil;
   }).length;
   ```
2. Dacă după această modificare count-ul devine corect (3), bugul e rezolvat.
3. Dacă problema persistă (cauza e diferită), inspectează `verificaEligibilitate` din `utils/eligibilitateCompetitie.ts` pentru cazul marginal vârstă 9-10 ani (vârstă la exact limita `varsta_max`).

**Acceptance:**
- Pentru categoria "9-10 ani feminin sincron 3-4 cap rosu", count-ul afișat în cardul Pas3 ("X eligibili") corespunde cu numărul de sportivi afișați în modal-ul de configurare echipă

---

### Task 6: Delete complet din DB pentru retragere sportiv (Thao Quyen)

**File:** `components/Competitii/index.tsx`

**Change:**

Locul: funcția `handleRetrageIndividual` (~linia 3150) și funcția `handleRetrage` (~linia 2806).

Comportament curent: `supabase.from('inscrieri_competitie').update({ status: 'retras' }).eq('id', ins.id)`

Comportament dorit: DELETE definitiv din tabela `inscrieri_competitie`.

Modificări:

**1. `handleRetrageIndividual` (InscriereModal — Thao Quyen):**
```typescript
const { error } = await supabase
  .from('inscrieri_competitie')
  .delete()
  .eq('id', ins.id);
```
Elimină `setRetrasiLocal` (nu mai e necesar dacă nu folosești status) — sau păstrează-l ca UI indicator că sportivul a fost retras în această sesiune, folosind `ins.id` în locul `sportiv_id`.

**2. `handleRetrage` (tab Înscrieri — buton Retrage în tabel):**
```typescript
// type === 'inscris':
const { error } = await supabase
  .from('inscrieri_competitie')
  .delete()
  .eq('id', id);

// type === 'echipa' — RĂMÂNE update status (nu DELETE echipe, confirmat doar pentru inscris):
const { error } = await supabase
  .from('echipe_competitie')
  .update({ status: 'retrasa' })
  .eq('id', id);
```

**IMPORTANT:** Verifică RLS pentru `inscrieri_competitie`. Dacă politica RLS blochează DELETE pentru ADMIN_CLUB (permițând doar UPDATE), trebuie adăugat o politică RLS sau folosit un serviciu server-side. Dacă RLS blochează, înregistrează eroarea și adaugă un comentariu TODO cu SQL-ul necesar.

SQL necesar dacă RLS nu permite DELETE:
```sql
-- Verifică policy existentă:
SELECT * FROM pg_policies WHERE tablename = 'inscrieri_competitie';
-- Adaugă dacă lipsește:
CREATE POLICY "club_admin_delete_inscrieri" ON inscrieri_competitie
  FOR DELETE USING (
    club_id IN (
      SELECT club_id FROM roluri_utilizatori
      WHERE user_id = auth.uid() AND rol_denumire IN ('ADMIN_CLUB', 'SUPER_ADMIN_FEDERATIE')
    )
  );
```

**Acceptance:**
- Apăsând "Retrage" pe un sportiv individual din Thao Quyen, înregistrarea dispare complet din `inscrieri_competitie` (nu mai apare cu status 'retras')
- UI se actualizează corect după DELETE (sportivul dispare din lista de înscriși)
- Dacă RLS blochează, apare un mesaj de eroare clar (nu silently fail)

---

### Task 7: Elimină buton "Selectează toți" din Pas3Echipe

**File:** `components/Competitii/InscriereClubWizard/Pas1.tsx`

**Change:**

Butonul "Selectează toți" (`handleSelectAll`) există în `Pas1.tsx` — acesta este corect și rămâne acolo (Thao Quyen individual, unde selecția multiplă are sens).

Problema raportată: un buton similar de selecție totală apare și în contextul echipelor. Verifică dacă există un buton de tip "selectează toți" în:
- `Pas3Echipe.tsx` — dacă există, elimină-l complet
- Modala `InscriereModal` din `index.tsx` pentru categorii tip echipă/pereche — secțiunea `selectedTitulari`/`selectedRezerve`

Caută în `index.tsx` pattern-ul:
```
selectAll / handleSelectAll / selecteaza toti
```
în contextul `isTeam === true` (modal deschis pe categorie echipă) și elimină orice buton sau checkbox care face selectare totală a sportivilor pentru titulari/rezerve.

Dacă nu există buton explicit de "selectează toți" în Pas3/echipe — documentează că butonul găsit în Pas1 este INTENȚIONAT pentru Thao Quyen și nu există niciun buton de eliminat în echipe.

**Acceptance:**
- Pe pasul de configurare echipă (Sincron, Song Luyen, Giao Dau), nu există buton "Selectează toți" sau checkbox de selectare în masă
- Pe Pas1 (Thao Quyen individual), butonul "Selectează toți" rămâne funcțional și nemodificat

---

## Notă de execuție

Fixes 1 și 4 sunt parțial suprapuse (ambele modifică `Pas3Echipe.tsx`) — execută-le în aceeași sesiune pentru a evita conflicte. Ordinea recomandată per sesiune:

- **Sesiunea A**: Task 2 → Task 1 (navigare fix înainte de filtre, ca să testezi filtrele rămânând pe pagină)
- **Sesiunea B**: Task 3 → Task 4
- **Sesiunea C**: Task 5 → Task 7 → Task 6 (bug-uri independente; Task 6 are risc RLS — execută ultimul)
