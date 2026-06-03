# Module Aplicație — Stare și Componente

## 1. Sportivi
**Stare:** funcțional cu date reale. Import Excel/CSV îmbunătățit Mai 2026.

Componente cheie:
- `Sportivi.tsx` — listă cu filtre server-side, export
- `SportivFormModal.tsx` — CRUD profil sportiv
- `ImportSportiviPage.tsx` — import multi-format cu mapare auto coloane
- `FisaDigitalaSportiv.tsx` — fișa completă sportiv (grade, prezențe, plăți)
- `DeduplicareSportivi.tsx` — tool admin pentru eliminare duplicate

Hooks: `useSportivi.ts`, `useSportivForm.ts`
Service: `services/importSportiviService.ts`

## 2. Examene
**Stare:** funcțional, sesiuni locale și federație parțiale.

Componente cheie:
- `GestiuneExamene/` — folder cu subcomponente wizard
- `GestiuneExamene.tsx` — orchestrator principal
- `ModulInscriereExamen.tsx` — înscrierea sportivilor
- `FinalizeExam.tsx` — finalizare + promovare grade
- `RapoarteExamen.tsx` — rapoarte PDF

Hooks: `useExamManager.ts`, `useExamenRegistration.ts`

## 3. Prezență
**Stare:** complet funcțional, rapoarte lunare cu sportivi secundari.

Componente cheie:
- `MartialAttendance.tsx` — marcare prezență la antrenament curent
- `RaportLunarPrezenta.tsx` — raport lunar cu statistici
- `RaportPrezenta.tsx` — raport general prezențe
- `ArhivaPrezente.tsx` — arhivă istorică
- `ListaPrezentaAntrenament.tsx` — lista unui antrenament specific

Hooks: `useAttendance.ts`, `useAttendanceData.ts`, `useAttendanceStats.ts`

## 4. Grupe
**Stare:** funcțional, grupe secundare implementate Apr 2026.

Componente cheie:
- `Grupe/` — CRUD grupe cu editor program săptămânal
- `ProgramAntrenamenteManagement.tsx` — generare masivă antrenamente pe perioadă

Hooks: `useGrupe.ts`

## 5. Plăți și finanțe
**Stare:** plăți manuale funcționale, flux federație parțial.

Componente cheie:
- `PlatiScadente.tsx` — generare și gestionare abonamente lunare
- `JurnalIncasari.tsx` — log încasări zilnice
- `RaportFinanciar.tsx` — raport financiar club
- `FinancialDashboard.tsx` — dashboard financiar
- `TaxeAnuale.tsx` — taxe anuale + vizualizare sportivi cu taxă achitată
- `FederationInvoices.tsx` — facturi federație → club

Hooks: `usePlati.ts`, `useFamilyManager.ts`

## 6. Competiții
**Stare:** arhitectură implementată, wizard categorii funcțional. În dezvoltare activă.

Componente cheie:
- `Competitii/` — folder principal cu toate subcomponentele
- `CompetitiiManagement.tsx` — listă + creare competiții
- `FisaCompetitie.tsx` — fișa completă a unei competiții
- `ManagementInscrieri.tsx` — gestionare înscrieri sportivi
- Wizard în `Competitii/` — creare competiție în pași

Tipuri: `tehnica` | `giao_dau` | `cvd`
Detalii complete: [docs/ARHITECTURA_COMPETITII.md](ARHITECTURA_COMPETITII.md)

## 7. Calendar și Evenimente
**Stare:** calendar intern funcțional, fără comunicare automată.

Componente: `CalendarView.tsx`, `EvenimentePage.tsx`, `EvenimenteleMele.tsx`

## 8. Dashboard-uri
- `AdminDashboard.tsx` / `UnifiedDashboard.tsx` — admin club
- `FederationDashboard.tsx` — super admin federație
- `SportivDashboard/` — portal sportiv (grade, prezențe, plăți proprii)
- `QwanKiDoDashboard.tsx` — dashboard unificat

## 9. AI Assistant
**Stare:** funcțional cu RAG.

Componente: `AIAssistant/` — widget chat flotant
Context: `AIAssistantContext.tsx` — injectat la nivel AppLayout
Services: `ragService.ts` (Gemini embeddings + pgvector), `claudeService.ts` (răspunsuri)
Detalii: [docs/RAG_IMPLEMENTARE.md](RAG_IMPLEMENTARE.md)

## 10. SMS și Notificări
**Stare:** parțial implementat.

Componente: `SMS/`, `Notificari.tsx`, `NotificationBell.tsx`
Docs: [docs/sms-system/](sms-system/)

## 11. Import / Export
- Import sportivi: Excel (.xlsx) + CSV cu detecție automată coloane
- Import examene: `importExcelExamenService.ts`
- Export PDF: jsPDF în multiple componente
- Export Excel: xlsx în rapoarte financiare
