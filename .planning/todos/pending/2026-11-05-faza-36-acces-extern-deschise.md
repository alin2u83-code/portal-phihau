# Faza 36 — Acces extern competitie: ce a ramas (5.11.2026)

12/12 planuri executate, commit-uri pe main, NEPUSHUITE. Migrari live: 20261106a, b, c, d. Detalii: `.planning/phases/36-*/36-VERIFICARE.md`, `36-11-SUMMARY.md`.
**Nu da push inainte de punctele 1-3** (dupa push Vercel deployeaza).

## 1. Verificari ramase
- [x] (verifier rulat: 36-VERIFICATION.md status human_needed; 36-SECURITY.md exista dar e din 5.11, anterior fazelor 37/43 — de re-rulat /gsd-secure-phase 36 daca vrei registru actual) `gsd-verifier` pe faza 36 + `/gsd-secure-phase 36` (SECURITY.md lipseste).
- [ ] Browser: inscriere efectiva a unui sportiv cu cont extern (wizard), fila Taxe cu date reale, mai multe granturi.
- [ ] Mobil real (screenshot headless in `screens/36-12-extern-mobil.png` e doar redimensionat).
- [ ] Super admin: tab "Acces extern" -> copiaza link, aproba cerere reala de test, revoca.
- [ ] Endpoint `/api/aproba-cerere-acces` prin Vercel (testat doar ca handler importat direct).

## 2. Din code review (neaplicate, asteapta OK)
- [x] **REQUIRED** REZOLVAT (mig. 20261106e A, verificat live 19.11.2026: politica prezenta_familie_sel + view security_invoker; netestat cu cont familie). Regresie posibila: `vedere_prezenta_sportiv` pe security_invoker (migr. 20261106c sectiunea G) -> `SportivDashboard/FamilieWidget.tsx:70` poate arata prezente 0 pentru frati la parinte SPORTIV. Testeaza cu cont de familie; fix = revert view la definer SAU politica SELECT pe `prezenta_antrenament` pentru familie.
- [x] **REQUIRED** REZOLVAT (mig. 20261106e C/D: plafon 10/club + 200/competitie, sterge_cereri_in_asteptare; verificat live 19.11.2026). `trimite_cerere_acces`: anon poate umple plafonul de 200 cereri/competitie. Rate limit pe IP sau plafon per club + actiune "sterge cereri in asteptare" pt federatie.
- [x] **REQUIRED** REZOLVAT prin Faza 43 (login extern email+parola, mesaj neutru, 43-02 test PASS; verificat 19.11.2026). Enumerare email prin `signInWithOtp` (422 `otp_disabled`) + spam de coduri catre conturi reale: mesaj neutru + "Solicita acces" separat (flux complet neutru cere endpoint server).
- [x] OBSOLET 19.11.2026: de Faza 39 aprobarea creeaza contul de club (api/_aprobaCerereAcces.ts creeazaContClub), nu mai exista cazul. Optional: aprobare email fara randuri in `utilizator_roluri_multicont` il face "doar extern" (15 auth users fara rol, 5 sportivi cu user_id fara rol) -> avertisment si pt acest caz.
- [x] 19.11.2026: aprobare simultana => 2-a primeste 409 (marcheaza .eq status in_asteptare + creeazaContClub 409 cont existent); rate limit ramane in-memory 30/min/IP (acceptat, endpoint sub auth super admin). Optional: aprobare simultana intoarce ok de 2 ori (benign); rate limit endpoint in-memory per instanta.

## 3. Riscuri de decis inainte de lansare (hardening, faza separata recomandata)
- [x] REZOLVAT prin Faza 37 (mig. 20261107b..e), verificat live 19.11.2026: anon doar 4 RPC publice (+ scoala_ioncreanga_*, aplicatie separata, intentionat); decrypt_cnp/taxe/merge/transfer/export garduite. Rezidual: 51 definer fara marker de garda in corp (euristica, include triggere/helperi) — neauditate individual. HIGH: ~170 RPC `SECURITY DEFINER` apelabile de orice `authenticated` (merge_sportivi, transfer_sportiv, genereaza_taxe_anuale, inregistreaza_plata_federatie, decrypt_cnp, get_all_app_data, adauga_sportiv_complet, export_sportivi_selectati, scoala_ioncreanga_*...). Audit garzi + REVOKE/guard `NOT este_doar_extern()`.
- [ ] MEDIUM: `sportivi` SELECT toate coloanele (cnp, adresa, telefon) pt clubul din grant -> view limitat / column grants (GDPR minori).
- [ ] `cluburi_public_select` expune cif/setari; `lista_cluburi_publice` expune numele tuturor cluburilor oricui are linkul.
- [ ] Cheie localStorage `phi-hau-active-role-context-id` comuna intre login extern si portal.

## 4. Prerechizit lansare
- [x] REZOLVAT 18.11.2026 (43-06-SUMMARY): SMTP custom activ pe core7.spatiul.ro:465, sender noreply@phihau.ro, rate limit email 30/ora; email real primit cu cod 8 cifre fara link. Verificat si in auth_email_events (cod_mfa 5/5, reset_parola 9/9 reusite, ultimul 18.11 13:10 UTC). Executa planul 32-08 (SMTP custom spatiul.ro) inainte de a invita reprezentanti reali; fara el OTP limitat de Supabase (~2 emailuri/ora).
- [~] PARTIAL: email real cu Gmail testat 18.11 (cod primit). Telefon real netestat. Test cu email real + telefon real dupa SMTP.
