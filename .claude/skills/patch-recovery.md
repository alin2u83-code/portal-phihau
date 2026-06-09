---
name: patch-recovery
description: Recupereaza modificari pierdute din memoria de patch-uri. Foloseste cand utilizatorul spune "am pierdut X", "recupereaza Y", "disparu Z", "am sters accidental", "da-mi inapoi".
---

# Skill: Recuperare Patch

Obiectiv: Identifica cu 95% claritate patch-ul dorit, apoi aplica-l cu tokeni minimi.

## Pasul 0 — Verifica indexul

Citeste: `C:\Users\lungu\.claude\projects\C--Users-lungu-portal-phihau\memory\patches\INDEX.md`

Daca fisierul nu exista: informeaza utilizatorul ca sistemul nu are inca patch-uri captate.

Parseaza liniile in format: `{data} | {hash7} | {mesaj commit} | {fisiere modificate}`
Ignora header-ul (`# Patches Index`).

## Pasul 1 — Clarifica perioada (AskUserQuestion)

Optiuni: ultimele 7 zile / ultimele 30 zile / mai vechi / nu stiu
Filtreaza lista dupa perioada.

## Pasul 2 — Clarifica zona aplicatiei (AskUserQuestion)

Din fisierele in patch-urile filtrate, detecteaza module (competitii, plati, prezenta, sportivi, examene, grupe, auth).
Prezinta distincte gasite + "Nu stiu / oricare". Filtreaza mai departe.

## Pasul 3 — Selecteaza commit-ul (AskUserQuestion)

Max 4 optiuni din patch-urile ramase (cele mai recente):
- Label: `{data} — {mesaj commit}`
- Description: `{fisiere modificate}`

## Pasul 4 — Confirmare cu preview (AskUserQuestion)

Citeste patch-ul: `C:\Users\lungu\.claude\projects\C--Users-lungu-portal-phihau\memory\patches\{data}-{hash}.md`
Extrage primele 40 linii din sectiunea Diff ca preview.
Optiuni: "Da, acesta este" / "Nu, cauta altul"

## Pasul 5 — Aplica patch-ul

### Metoda A — git apply
1. Salveaza diff in `.claude/hooks/.temp-recovery.patch`
2. `git apply --whitespace=fix C:/Users/lungu/portal-phihau/.claude/hooks/.temp-recovery.patch`
3. Daca reuseste: raporteaza fisierele restaurate. Sterge fisierul temporar.

### Metoda B — manuala (daca A esueaza)
Citeste diff-ul complet. Pentru fiecare fisier: citeste starea curenta, aplica modificarile cu Edit.

## Dupa aplicare

"Patch {hash} aplicat. Fisiere restaurate: {lista}."
