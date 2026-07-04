# Raport Test Playwright — Prezență (Activitate Sală) — 2026-07-04

## Rezumat

| Categorie | Total | ✅ OK | ❌ Erori | ⚠️ Warning |
|-----------|-------|-------|---------|-----------|
| Tab-uri testate (Rapid/Grupe/Istoric) | 3 | 3 | 0 | 0 |
| Fluxuri prezență testate | 2 | 1 | 1 | 0 |
| Modals testate (Adaugă Grupă, Adaugă Sportivi, Șterge) | 3 | 3 | 0 | 1 |
| CRUD complet (grupă test) | 1 | 1 | 0 | 1 |
| Viewporturi responsive | 3 | 3 | 0 | 1 |
| Erori consolă JS | — | 0 erori | — | — |

## Erori găsite

### [CRITICAL] BUG-1 — Formular prezență gol pe calea Grupe → Prezență Azi → Bifează/Vezi Prezența
- **Element**: `FormularPrezenta` deschis din `ListaPrezentaAntrenament` (tab Grupe → card grupă → „Prezență Azi →" → „Bifează Prezența →")
- **Simptom**: „Status: 0 / 0 prezenți", „Nu există sportivi pentru filtrul selectat", numele grupei GOL în header
- **Reproductibil**: DA, 100% — atât pe grupă NOUĂ (TEST_PLAYWRIGHT_PREZENTA, 2 sportivi) cât și pe grupă VECHE (Copii Incepatori, antrenament 13 mai) → **afectează TOATE grupele pe această cale**
- **Nu e cache**: persistă după reload complet (F5)
- **Cauza (cod)**: `hooks/useAttendanceData.ts` — refactorul „FIX TIMEOUT" a înlocuit query-ul cu embed `grupe(*, sportivi!grupa_id(...))` cu view-ul plat `vedere_cluburi_program_antrenamente` (`select('*')`). Rândurile NU mai conțin `antrenament.grupe.sportivi` și nici `antrenament.grupe.denumire`. `ListaPrezentaAntrenament.tsx:864` pasează rândul plat direct la `FormularPrezenta`, care citește `antrenament.grupe?.sportivi` (linia 172) → mereu gol.
- **De ce tab-ul Rapid MERGE**: `Prezenta/index.tsx:238 handleSelectAntrenament` face fetch separat cu embed complet înainte de a deschide `FormularPrezenta`.
- **Fix propus (minim)**: în `ListaPrezentaAntrenament`, la click pe „Bifează/Vezi Prezența", fetch antrenament îmbogățit (același select ca `handleSelectAntrenament`) în loc de a pasa rândul plat. Alternativ: enrich în `setSelectedTraining`.
- **Screenshot**: `bug-formular-prezenta-gol.png`

### [HIGH] BUG-2 — Mojibake (encoding UTF-8 stricat) în stringuri UI
Caractere `–`, `→`, `—`, `•` salvate ca `â€“`, `â†'`, `â€"`, `â€¢` — vizibile în UI pe toate device-urile.

Locuri vizibile în UI (componente Prezenta):
| Fișier | Linie | Text afectat |
|--------|-------|--------------|
| PrezentaRapida.tsx | 522 | `18:00 â€“ 19:30` (interval orar card antrenament) |
| PrezentaRapida.tsx | 602 | `â€"` (fallback grad lipsă) |
| PrezentaRapida.tsx | 632 | `Complet â†'` (buton) |
| ListaPrezentaAntrenament.tsx | 286 | `4 iulie â€¢ 18:00` (header formular prezență) |
| InstructorPrezentaPage.tsx | 214, 218 | `â€¢`, `Bifează Prezența â†'` |
| DashboardPrezentaAzi.tsx | 78, 119 | `Generează program â†'`, `Bifează â†'` |
| IstoricPrezentaGlobal.tsx | 243 | `Aplică filtre â†'` |
| RaportPrezenta.tsx | 375 | `Aplică filtre â†'` |
| TabelPrezentaVedere.tsx | 79 | `â€¢` |
| CalendarActivitati.tsx, RaportLunarPrezenta.tsx | comentarii | mojibake în comentarii (nefuncțional, de curățat) |

Mojibake există și în alte module (GestiuneExamene — 5 fișiere, Competitii/StagiiCompetitii.tsx) — în afara scope-ului acestui fix, de raportat separat.

### [MEDIUM] BUG-3 — Diacritice lipsă în stringuri UI PrezentaRapida.tsx
Linii: 69 („Ai modificari nesalvate... Salveaza inainte"), 427 („pentru astazi"), 459 („Apasa pe un sportiv pentru a comuta prezenta"), 555/561 („Toti prezenti/absenti"), 625 („Salveaza Prezenta").

### [MEDIUM] BUG-4 — Lista Grupe nu se actualizează după creare grupă
- După „Adaugă Grupă" + dialog Succes, grupa nouă NU apare în listă până la click manual „Actualizează". Cache-ul nu e invalidat la create.

## Avertismente
- **„Retrasi" afișează „448 Sportivi Activi"** — semantic contradictoriu (retrași ≠ activi); countul folosește doar `grupa_id`, ignoră statusul real de membru retras. De discutat business.
- **Header Detalii Grupă stale**: după adăugare sportivi, subtitlul rămâne „0 sportivi activi" deși tabul arată corect „2 sportivi activi".
- **Tabletă 768px**: sidebar rămâne expandat (~35% lățime), butonul „Adaugă" ușor tăiat pe marginea dreaptă.

## Verificare Responsive

| Viewport | Rezoluție | Date vizibile | Layout OK | Butoane accesibile | Probleme |
|----------|-----------|--------------|-----------|-------------------|---------|
| Laptop | 1366×768 | ✅ | ✅ | ✅ | mojibake vizibil |
| Tabletă portrait | 768×1024 | ✅ | ⚠️ | ⚠️ | sidebar expandat, „Adaugă" ușor tăiat |
| Mobil mare | 390×844 | ✅ | ✅ | ✅ | mojibake vizibil |

## Date de test create și șterse
- ✅ Grupă `TEST_PLAYWRIGHT_PREZENTA` (Sâmbătă 18:00–19:30) — ștearsă, verificat SQL: 0 grupe, 0 orar, 0 antrenamente orfane
- ✅ Sportivi AGAFIȚEI ALEXANDRA MIHAELA + AGRIGOROAE LAVINIA IOANA — mutați temporar din „Retrasi" în grupa test, restaurați în „Retrasi", verificat SQL

## Acțiuni testate cu succes
- ✅ Tab Rapid: card antrenament azi, listă sportivi, sortare Nume/Prenume/Grad
- ✅ Tab Grupe: 6 carduri, shortcuts rapoarte, „Prezență Azi →", filtre Perioadă/Sortare/Sportiv
- ✅ Tab Istoric: tabel prezențe, filtre căutare sportiv/grupă/interval date
- ✅ Modal Adaugă Grupă: validare, salvare, program săptămânal
- ✅ Modal Adaugă Sportivi: căutare, selecție multiplă, salvare
- ✅ Ștergere grupă cu confirmare, cascade curat (orar + antrenamente)
- ✅ 0 erori consolă JS pe tot parcursul

## Recomandări (ordine fix)
1. **BUG-1** — fix enrichment în `ListaPrezentaAntrenament` (critic, blochează marcarea prezenței pe calea Grupe)
2. **BUG-2 + BUG-3** — fix encoding + diacritice în componente Prezenta (vizual, toate device-urile)
3. **BUG-4** — invalidare cache la creare grupă în `components/Grupe/index.tsx`
4. Separat: mojibake în GestiuneExamene + StagiiCompetitii; semantica „Sportivi Activi" pe grupa Retrasi
