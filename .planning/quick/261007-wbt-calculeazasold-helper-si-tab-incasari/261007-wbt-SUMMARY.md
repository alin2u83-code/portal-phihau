---
status: complete
---
# Quick 261007-wbt: sold unic + Sumar Incasari

- `services/soldService.ts` (+test): calculeazaSolduri / calculeazaSold / calculeazaSumarIncasari. Sold = Σ tranzactii − Σ facturi neanulate.
- Consumatori migrati: PlatiScadente (useMemo + calcul proaspat), useFamilyManager, SportivWallet (sold; lista facturi ramane din view).
- Sectiune noua `sumar-incasari` in hub Plati > Incasari (`components/Plati/SumarIncasari.tsx`): total, per metoda, per luna, lista tranzactii; filtre perioada/metoda/club (club doar federatie).
- NEATINS: DB, views, types.ts, ui.tsx, DataContext, useDataProvider. RaportFinanciar/FinancialDashboard inca folosesc `suma_incasata` din view (supranumarat) — pas 2/3.
- Verificat: tsc --noEmit curat, soldService.test + platiHubConfig.test PASS. Netestat vizual in browser.
