---
slug: coechipier-interclub-pas3
created: 2026-06-08
status: complete
---

# Readaugă buton "Solicită coechipier inter-club" în Pas3Echipe.tsx

## Goal
Restaurează funcționalitatea de solicitare coechipier inter-club în Pas3FormareEchipe, logică extrasă din commit 4c2989b și adaptată la structura actuală.

## Tasks

1. Modifică `Pas3Echipe.tsx`:
   - Adaugă import `supabase`, `useState`, `useEffect`, `useError`
   - Adaugă `competitieId` + `clubSolicitantId` în `Pas3Props`
   - Adaugă state `cereriInterclub: Map<string, 'pending' | 'aprobat' | 'respins'>`
   - Fetch cereri existente la mount (pending/aprobat)
   - Handler `handleSolicitaInterclub(categorieId, nrLocuri)` — insert în `cereri_coechipier`
   - Handler `handleAnuleazaCerere(categorieId)` — update status='anulat'
   - Afișează buton amber sub cardul fiecărei categorii incomplete cu eligibili
   - Badge blue pentru status pending, badge verde pentru aprobat

2. Modifică `index.tsx` (Pas3 render la step===3):
   - Pasează `competitieId={competitie.id}` și `clubSolicitantId={clubId}`
