# Phase 13: Sistem Tracking Comenzi Produse - Context

**Gathered:** 2026-06-22
**Status:** Ready for planning
**Source:** Portal-Debug intake session (portal-debug skill)

<domain>
## Phase Boundary

Sistem complet de tracking al comenzilor de echipamente sportive, acoperind 3 fluxuri distincte:
1. **Flux A** (Sportiv → Club → Furnizor): sportivul cere, clubul agregă și comandă
2. **Flux B** (Federație → Cluburi top-down): federația trimite materiale promo / echipament la cluburi
3. **Flux C** (Club → Federație agregat): clubul cere, federația agregă și comandă central

Modulul extinde Phase 12 (Modul Produse) fără a modifica logica existentă de catalog, stoc sau vânzări directe.
</domain>

<decisions>
## Implementation Decisions

### Inițiatori comenzi
- Sportivul poate plasa cerere din dashboard personal (tab Echipamente existent)
- ADMIN_CLUB / INSTRUCTOR poate plasa cerere în numele sportivului
- SUPER_ADMIN_FEDERATIE poate crea comenzi top-down pentru cluburi

### Stările unei comenzi
Mașină de stări completă:
```
SOLICITATĂ → CONFIRMATĂ → PLASATĂ → SOSITĂ → PREDATĂ
                                              ↕
                                         PLĂTITĂ (oricând, sau după predare = datorie)
                                    + ANULATĂ (oricând)
```
- `PLĂTITĂ` este stare separată explicită, nu doar atribut boolean
- Se poate marca „plătit după predare" (sportivul ia produsul pe datorie)
- ADMIN_CLUB avansează stările manual

### Tipuri de produse
Câmp `tip_produs` în catalogul global (Phase 12):
- `per_sportiv` — se distribuie individual (flux predare per sportiv)
- `per_club` — rămâne la club (bannere, materiale promo, consumabile)

### Agregare comenzi
- Cererile sportivilor se grupează într-o **comandă club** (header + iteme)
- Admin poate adăuga cereri noi la comanda activă dacă nu a plecat la furnizor
- Admin poate amâna cereri noi pentru batch următor
- Butoane explicite: „Adaugă la comanda curentă" / „Amână pentru următoarea"

### Vizualizare comenzi
- Sumar agregat: cantitate totală per produs (ex: „Kimono S ×3")
- Detaliu expandabil: lista sportivilor per produs cu stările individuale

### Flux Federație (Flux B și C)
**Flux B (top-down):** SUPER_ADMIN creează comandă, specifică cantități per club
- Clubul primește notificare → confirmă recepție
- Dacă produsul e `per_sportiv`: clubul distribuie mai departe la sportivi
- Dacă produsul e `per_club`: rămâne la club (nicio distribuție per sportiv)

**Flux C (bottom-up):** Clubul trimite cerere la federație
- Federația agregă cererile tuturor cluburilor → comandă centrală la furnizor
- Federația distribuie la cluburi → clubul confirmă recepție → distribuie la sportivi dacă e `per_sportiv`

### Catalog produse
- Se folosește catalogul global existent (commit 1310a50, Phase 12)
- Federația adaugă produse în catalogul global; cluburile comandă din el
- Se adaugă câmpul `tip_produs` (`per_sportiv` | `per_club`) în tabela produse

### Plată integrată
- La predarea produsului: se generează **factură automată** în portofelul sportivului (ca un abonament)
- Integrare cu sistemul Plăți existent (PlatiScadente, portofel) — nu se modifică, se extinde

### Notificări in-app (4 tipuri)
1. Club ← sportiv plasează cerere (badge notificare)
2. Sportiv ← club confirmă comanda
3. Sportiv ← marfă sosită la club (poate veni să ridice)
4. Sportiv ← plată neachitată reminder (restanță produs)

### Export
- PDF bon predare per sportiv (la momentul predării)
- Excel listă produse+cantități pentru furnizor (când comanda e PLASATĂ)
- Raport lunar extins în tab Raport existent din ProduseManagement (extinde RaportProduse.tsx)

### Claude's Discretion
- Structura exactă a tabelelor DB (număr de tabele, foreign keys)
- Logica de batch-uri (dacă multiple comenzi active pot coexista)
- UI exact al dashboard-ului comenzi (tab nou sau secțiune în ProduseManagement)
- Sistemul de notificări (badge simplu sau tabel notificări)
- Numărul și ordinea planurilor de implementare

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Modulul Produse (Phase 12 — baza acestui modul)
- `components/Produse/ProduseManagement.tsx` — componentă principală, tab Raport existent
- `components/Produse/RaportProduse.tsx` — raportul de vânzări (se extinde cu comenzi)
- `sql/` — migrații DB Phase 12 (schema produse, variante, intrari_marfa, vanzari_produse)
- `types.ts` — tipurile centralizate (Produs, VariantaProdus, VanzareProduse etc.)

### Sistem Plăți (se extinde, nu se modifică)
- `components/Plati/` — modulul plăți existent
- Portofelul sportivului și generarea facturilor

### Dashboard Sportiv (se adaugă secțiune comenzi)
- `components/SportivDashboard/` — pagina personală a sportivului

### Infrastructură generală
- `components/ui.tsx` — design system intern (Button, Modal, Card, Badge etc.)
- `contexts/NavigationContext.tsx` — navigare SPA (activeView)
- `supabaseClient.ts` — client Supabase cu header active-role-context-id

</canonical_refs>

<specifics>
## Specific Ideas

### Schema DB propusă
```
cereri_produse          — cererea unui sportiv (produs + variantă + cantitate + stare)
comenzi_produse         — header comandă (tip: club_furnizor | federatie_club | club_federatie)
comenzi_produse_iteme   — produse + cantități din comandă
comenzi_produse_cluburi — destinatarii unei comenzi federație (per club)
```

### Tipuri comenzi
- `club_furnizor` — Flux A: club agregă cereri sportivi → furnizor
- `federatie_club` — Flux B: federație → cluburi (top-down)
- `club_federatie` — Flux C: cluburi → federație → furnizor centralizat

### Câmpuri cheie cerere
- `stare_cerere`: SOLICITATĂ | CONFIRMATĂ | PLASATĂ | SOSITĂ | PREDATĂ | PLĂTITĂ | ANULATĂ
- `platit_dupa_predare`: boolean (marcare datorie)
- `comanda_id`: FK spre comenzi_produse (null dacă nu e asociată încă unui batch)

</specifics>

<deferred>
## Deferred Ideas

- Notificări WhatsApp / SMS (doar in-app în această fază)
- Semnătură digitală pe bonul de predare
- Returnări / schimburi de produse
- Integrare plată online Netopia pentru comenzile sportivilor
</deferred>

---

*Phase: 13-tracking-comenzi-produse*
*Context gathered: 2026-06-22 via portal-debug intake session*
