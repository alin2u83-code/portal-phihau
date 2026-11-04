# Faza 36 — Acces extern competitie: ce a ramas (5.11.2026)

12/12 planuri executate, commit-uri pe main, NEPUSHUITE. Migrari live: 20261106a, b, c, d. Detalii: `.planning/phases/36-*/36-VERIFICARE.md`, `36-11-SUMMARY.md`.
**Nu da push inainte de punctele 1-3** (dupa push Vercel deployeaza).

## 1. Verificari ramase
- [ ] `gsd-verifier` pe faza 36 + `/gsd-secure-phase 36` (SECURITY.md lipseste).
- [ ] Browser: inscriere efectiva a unui sportiv cu cont extern (wizard), fila Taxe cu date reale, mai multe granturi.
- [ ] Mobil real (screenshot headless in `screens/36-12-extern-mobil.png` e doar redimensionat).
- [ ] Super admin: tab "Acces extern" -> copiaza link, aproba cerere reala de test, revoca.
- [ ] Endpoint `/api/aproba-cerere-acces` prin Vercel (testat doar ca handler importat direct).

## 2. Din code review (neaplicate, asteapta OK)
- [ ] **REQUIRED** Regresie posibila: `vedere_prezenta_sportiv` pe security_invoker (migr. 20261106c sectiunea G) -> `SportivDashboard/FamilieWidget.tsx:70` poate arata prezente 0 pentru frati la parinte SPORTIV. Testeaza cu cont de familie; fix = revert view la definer SAU politica SELECT pe `prezenta_antrenament` pentru familie.
- [ ] **REQUIRED** `trimite_cerere_acces`: anon poate umple plafonul de 200 cereri/competitie. Rate limit pe IP sau plafon per club + actiune "sterge cereri in asteptare" pt federatie.
- [ ] **REQUIRED** Enumerare email prin `signInWithOtp` (422 `otp_disabled`) + spam de coduri catre conturi reale: mesaj neutru + "Solicita acces" separat (flux complet neutru cere endpoint server).
- [ ] Optional: aprobare email fara randuri in `utilizator_roluri_multicont` il face "doar extern" (15 auth users fara rol, 5 sportivi cu user_id fara rol) -> avertisment si pt acest caz.
- [ ] Optional: aprobare simultana intoarce ok de 2 ori (benign); rate limit endpoint in-memory per instanta.

## 3. Riscuri de decis inainte de lansare (hardening, faza separata recomandata)
- [ ] HIGH: ~170 RPC `SECURITY DEFINER` apelabile de orice `authenticated` (merge_sportivi, transfer_sportiv, genereaza_taxe_anuale, inregistreaza_plata_federatie, decrypt_cnp, get_all_app_data, adauga_sportiv_complet, export_sportivi_selectati, scoala_ioncreanga_*...). Audit garzi + REVOKE/guard `NOT este_doar_extern()`.
- [ ] MEDIUM: `sportivi` SELECT toate coloanele (cnp, adresa, telefon) pt clubul din grant -> view limitat / column grants (GDPR minori).
- [ ] `cluburi_public_select` expune cif/setari; `lista_cluburi_publice` expune numele tuturor cluburilor oricui are linkul.
- [ ] Cheie localStorage `phi-hau-active-role-context-id` comuna intre login extern si portal.

## 4. Prerechizit lansare
- [ ] Executa planul 32-08 (SMTP custom spatiul.ro) inainte de a invita reprezentanti reali; fara el OTP limitat de Supabase (~2 emailuri/ora).
- [ ] Test cu email real + telefon real dupa SMTP.
