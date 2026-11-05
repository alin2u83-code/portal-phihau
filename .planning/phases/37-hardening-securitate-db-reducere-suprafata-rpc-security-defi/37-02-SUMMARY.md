---
phase: 37
plan: 02
status: complete
requirements: [SEC-37-V0]
---
# 37-02 SUMMARY — triaj functii SECURITY DEFINER (Val 0b)

## Livrat
- `37-TRIAJ.md`: 177 definer = 34 `scoala_ioncreanga_*` (exceptie, un rand de grup) + 143 triate: 25 C (trigger), 4 D, 22 B, 83 A, 9 interne deja service-only. Liste de executie 3.1-3.10, divergente fata de PROPUNERE, riscuri 37-03, sectiunea 7 (constatari in afara triajului). 144 randuri `| public.` (<150 din plan: scoala e un singur rand de grup, conform CONTEXT).
- Fix securitate in afara triajului: `api/sms.ts` (3 handlere rulau cu service_role fara autentificare) acum cer Bearer + ADMIN_CLUB(+) in clubul cerut sau federatie; `components/SMS/SMSConfigurare.tsx` trimite tokenul. Commit separat.

## Review separat (2 treceri)
Triaj (agent-skills:code-reviewer, SELECT-only pe live): 1 CRITICAL (api/sms.ts, REPARAT), 3 HIGH (transfer_sportiv, recalculare_stare_plata, find_similar_sportivi: toate aplicate in triaj dupa OK), 6 MEDIUM, 5 LOW. Corectii aplicate: transfer_sportiv->B, find_similar_sportivi->SERVICE_ONLY, add_sms_to_queue->B, generare_factura_examen(uuid)->DROP (confirmat live: refera plati.data_platii inexistent), prerequisit 90 plati Achitat fara incasare (confirmat live: 90/861) la 37-04, ALTER DEFAULT PRIVILEGES pe postgres + supabase_admin, validari extra la proceseaza_incasare_normalizata/export_sportivi_selectati, nota decrypt_cnp (cheie nesetata, este_staff() nelegata de header).
api/sms.ts diff: 0 CRITICAL/Required. Optional (latent): handleSend nu verifica sportiv_id contra club_id (azi esueaza inchis: auth.uid() NULL sub service_role).

## Verificat / Neverificat
Verificat: numar functii live (177), 21 REVOKE-anon = lista anon live minus D, intersectia cu apelanti PRE-AUTH vida, corpuri B/D citite, 36 corpuri A citite de reviewer, cele 3 handlere SMS (401 fara/cu token fals, 403 cont fara rol, local), tsc.
Neverificat: calea pozitiva ADMIN_CLUB pe /api/sms (browser/deploy), daca ruta era publica in productie, corpurile celor ~47 A ramase si ale celor 25 trigger (doar tip returnat), apeluri .rpc( cu nume dinamic, hook-uri auth din dashboard, runtime/browser dupa REVOKE.

## De actualizat la executie
Planurile 37-03/04/05 nu reflecta inca: DROP generare_factura_examen(uuid), transfer_sportiv + add_sms_to_queue ca tinte B, find_similar_sportivi in SERVICE_ONLY, prerequisitul celor 90 plati.
