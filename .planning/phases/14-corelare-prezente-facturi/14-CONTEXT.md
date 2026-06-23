# Phase 14: Corelare Prezențe-Facturi — Context

**Gathered:** 2026-06-23
**Status:** Ready for planning
**Source:** portal-debug intake (SET 1–4 confirmat de utilizator)

<domain>
## Phase Boundary

Această fază corelează modulul Prezență cu modulul Plăți:
- Prezențele din luna unei facturi devin vizibile în modalul facturii
- Adminul poate gestiona facturi manual pentru orice lună (generat/șters)
- Sistemul detectează luni fără factură pentru sportivii activi
- Vizibilitate completă: badge pe profil + raport centralizat

**Out of scope:**
- Modificarea calculului soldului existent
- Modificarea modulului Prezență propriu-zis (citire only)
- Import CSV/Excel
- Raportul lunar de prezențe existent
- types.ts, ui.tsx, DataContext (NU se ating)

</domain>

<decisions>
## Implementation Decisions

### Roluri și acces
- LOCKED: Doar `ADMIN_CLUB` poate genera facturi manual, șterge facturi, și vedea raportul "Luni Lipsă"
- LOCKED: `SPORTIV` poate vedea prezențele din modalul propriei facturi (read-only)
- LOCKED: `INSTRUCTOR` nu are acces la aceste funcționalități

### Prezențe în modal factură
- LOCKED: Apare în AMBELE locuri unde se deschide modalul: PlatiScadente + profilul sportivului (tab Plăți)
- LOCKED: Format: număr total vizibil + click expandează lista datelor exacte (nu inline)
- LOCKED: Câmp afișat: "Prezențe în [luna factării]: N ▾" cu expandare pentru lista datelor

### Generare facturi
- LOCKED: Generarea auto există deja — NU se modifică
- LOCKED: Se adaugă generare manuală: calendar picker lună (trecut/viitor) per sportiv
- LOCKED: Se adaugă wizard detectare luni lipsă cu generare bulk pentru sportivi activi
- LOCKED: Nu se pot genera duplicate (dacă factura pentru luna X există, blocăm)

### Ștergere facturi
- LOCKED: Butonul de ștergere există deja — se adaugă restricție
- LOCKED: Activ DOAR pentru facturi cu status neplatit
- LOCKED: Pentru facturi platite: buton dezactivat + tooltip cu explicație
- LOCKED: NU se cere motiv la ștergere (simplitate)

### Vizualizare luni lipsă
- LOCKED: Calcul față de o dată de start configurabilă de admin per sportiv
- LOCKED: DOAR sportivi activi (nu inactivi/suspendați)
- LOCKED: Badge "X luni fără factură" pe profilul fiecărui sportiv activ afectat
- LOCKED: Raport centralizat în modulul Plăți (tab sau secțiune "Luni Lipsă") cu toți sportivii activi afectați
- LOCKED: Ambele locuri (badge profil + raport centralizat)

### Infrastructură
- LOCKED: NU se modifică types.ts, ui.tsx, DataContext, NavigationContext
- LOCKED: Calculul soldului și generarea auto de facturi rămân intacte
- LOCKED: Filtrare client-side pe date deja încărcate (fără query-uri Supabase noi unde posibil)
- PERMIS: Se pot adăuga query-uri noi în hooks pentru prezențe per lună și pentru luni lipsă

### Claude's Discretion
- Structura componentelor noi (inline vs. modal separat)
- Cum se face query-ul prezențe per lună (join prezente cu factura.luna)
- Exact unde se pune câmpul "data start facturare" per sportiv (câmp nou în sportivi sau în configurare club)
- Pattern de caching pentru prezente per lună (React Query)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Module Plăți
- `src/components/Plati/` — componente existente: PlatiScadente, DetaliiFactura, etc.
- `src/components/Plati/PlatiScadente.tsx` — lista facturi + modal detalii
- `src/hooks/usePlati.ts` sau echivalent — hook date facturi

### Module Prezență
- `src/components/Prezenta/index.tsx` — modul prezență (citire structură)
- `src/hooks/usePrezenta.ts` sau echivalent — hook prezențe

### Profil Sportiv
- `src/components/Sportivi/ProfilSportiv.tsx` sau echivalent — profil cu tab Plăți
- Identifică exact unde se renderizează tab-ul Plăți din profilul sportivului

### Types
- `types.ts` — tipurile Factura, Plata, Prezenta (citire only — NU modificare)

### Design system
- `src/components/ui.tsx` — Button, Modal, Badge, Tooltip, Spinner (citire only)

### Config
- `CLAUDE.md` — convenții limbă română domeniu, engleză tehnic; pattern usePermissions

</canonical_refs>

<specifics>
## Specific Ideas

- Câmpul "data_start_facturare" per sportiv poate merge pe tabelul `sportivi` sau separat — cercetare necesară
- Prezențele se iau din tabelul `prezente` filtrat pe `data >= luna_factura_start AND data < luna_factura_end`
- "Luni lipsă" = SET de luni de la `data_start_facturare` până azi MINUS lunile cu factură existentă
- Badge pe profil — similar cu badge-ul de restanțe existent (dacă există pattern)
- Generare factură manuală refolosește logica din generarea auto (service existent)

</specifics>

<deferred>
## Deferred Ideas

- Motiv obligatoriu la ștergere (utilizatorul a ales explicit să nu ceară motiv)
- Restricție ștergere per rol (nu doar neplatite — utilizatorul a ales explicit)
- Notificări WhatsApp pentru luni lipsă (altă fază)
- Generare automată în bulk pentru toți sportivii unui club dintr-o dată (poate fi viitoare iterație)

</deferred>

---

*Phase: 14-corelare-prezente-facturi*
*Context gathered: 2026-06-23 via portal-debug intake*
