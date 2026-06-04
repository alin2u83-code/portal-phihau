# CONCERNS.md — Portal PhiHau

**Mapped:** 2026-06-04 | **Focus:** concerns/tech-debt

---

## Critical (Blocking Features)

| Issue | Location | Impact |
|---|---|---|
| Migrație `orar_exceptii` lipsă | DB | Excepțiile de orar nu funcționează |
| TODO discount logic | `PlatiScadente.tsx:171-172` | Reducerile nu se aplică corect |

---

## Tech Debt

### Cod Duplicat
- `generateEmail`, `normalizeDate`, `isSimilar` — duplicate în 3+ importere
- Calcul taxe duplicat în 4 module diferite
- Normalizare grade: aliasuri hard-coded în loc de tabel DB

### Componente Monolitice
- `Competitii.tsx` — **3942 linii**, re-render lent, greu de menținut
- `DataProvider` — fetch 20+ tabele la orice schimbare de rol (nu lazy)

### Query Performance
- Pattern N+1 la înscrieri examene (RPC per înregistrare în loc de batch)
- Liste sportivi fără paginare (totul în memorie)

---

## Security Concerns

| Concern | Detaliu |
|---|---|
| Header injection | `active-role-context-id` în `supabaseClient.ts` — RLS depinde de corectitudinea clientului |
| Upload nevalidat | CSV/Excel importere — fără validare MIME type sau size limit |
| localStorage | Posibil date sensibile cached |
| Câmpuri nesanitizate | Descrieri în modulele financiare |

---

## Race Conditions / Fragile

- Cache invalidation pe orar grupe — parțial fixat Mai 2026, risc residual
- Generare plăți bulk — fără error granular per înregistrare
- Sync offline — menționat în docs, **neimplementat**
- Roluri circulare — nu sunt validate la DB level

---

## Missing Capabilities

- Audit trail pentru operații financiare (cine a modificat ce)
- Notificări bulk email/SMS
- Paginare server-side pe liste mari
- Rate limiting pe AI endpoints

---

## Test Gaps

- Zero teste automate (zero coverage)
- RLS verificat manual, nu automat
- Zero teste pentru fluxul de plăți
- Zero load tests (țintă: 3500+ sportivi)

---

## Notes

Aplicația e funcțională și în producție (7 cluburi, date reale). Riscurile de mai sus sunt tehnice, nu blocante operațional, dar cresc cu scalarea la 35 cluburi.
