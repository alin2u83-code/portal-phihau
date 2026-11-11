# Phase 39: Cont unic de competitie per club — Context

**Gathered:** 2026-11-11
**Status:** Discutie finalizata (4 zone) — gata pentru /gsd-plan-phase 39
**Sursa:** conversatie cu utilizatorul (11.11.2026) + 2 evaluari avocat-diavol (DB separat respins; autor modificari -> D+A).

## Domain
Un singur cont de acces competitional pe club, creat de proprietarul aplicatiei. Intra implicit in zona de competitie; managementul clubului e separat. Fara proiect Supabase nou (respins: sincronizare, auth dublat, GDPR minori; vezi evaluarea din sesiune).

## Decizii (LOCKED)
- D-01: Un singur cont de competitie per club (UNIQUE pe club), creat DOAR de proprietarul aplicatiei alin2u83@gmail.com (nu de alti super admini). Include cluburile existente.
- D-02: Instructorii/adminii de club existenti (41 ADMIN_CLUB, 2 INSTRUCTOR) raman cu rolurile si accesul actual.
- D-03: Intrare: implicit zona de competitie; sau direct pe link la competitie; vede competitii noi (active) si ISTORICUL competitiilor la care clubul a participat. Intrarea intr-o competitie cere CONFIRMARE (sa nu ajunga acolo din greseala).
- D-04: Fara competitii active: mesaj "Nu sunt competitii active".
- D-05: Buton "Management club" MEREU vizibil. Fara acces acordat de proprietar -> zona de TEST (demo read-only cu date FICTIVE, ca sa vada cum arata managementul si sa aleaga); cu acces acordat -> management real.
- D-06: Autor modificari (corectitudine interna, NU proba/dispute): D+A. La intrarea in inscrieri se alege instructorul din club (lista din utilizator_roluri_multicont) sau "altcineva: nume" (marcat neverificat). RPC `deschide_sesiune_actor` + trigger de audit care pune actorul din sesiune (nu din payload). Declarativ: se spune explicit in UI si in registrul GDPR.
- D-07: Un singur dispozitiv per cont (nu se acopera sesiuni concurente).
- D-08: Migrarea 20261111b (commit 9e68262, NEAPLICATA) se reproiecteaza: ramane proprietari_aplicatie + este_proprietar(); acorda/revoca management merg pe contul de club, nu pe grant per competitie.

## Decizii din discutie (11.11.2026) — LOCKED
### Intrare si confirmare
- D-09: Dupa login contul de club vede MEREU ecranul-lista (competitii active + istoric). Intra intr-o competitie doar la click explicit; fara auto-intrare.
- D-10: Link direct la competitie (/competitie/ID): dupa login dialog "Ai fost trimis la competitia X — Intra / Vezi toate competitiile". Nu intra automat.
- D-11: Fara competitii active: mesaj "Nu sunt competitii active" + sub el istoricul + buton "Management club" ramane vizibil.
- D-12: Istoric = competitii inchise/terminate unde clubul are cel putin o inscriere (inscrieri_competitie sau echipe). Read-only, doar inscrierile proprii ale clubului.
### Conturi cluburi existente
- D-13: Creare per club din ecran proprietar (alegi clubul, introduci emailul, creezi). Pilot pe 1-2 cluburi inainte de restul. Nu in masa.
- D-14: Emailul contului il introduce proprietarul la creare; se pastreaza pe contul/grantul clubului. `cluburi` NU are coloana email (verificat live) — fara migrare pe cluburi.
- D-15: Inlocuire persoana: proprietarul schimba emailul contului din ecranul lui; sesiunile/dispozitivul vechi se invalideaza. Doar proprietarul poate.
### Management si zona de test
- D-16: La acordare proprietarul alege rolul: ADMIN_CLUB sau INSTRUCTOR (selector, ca in 20261111b). Retragerea sterge doar ce a acordat mecanismul.
- D-17: Zona de test = club demo cu date FICTIVE read-only (sportivi/grupe/plati inventate), banner "Demonstratie; cere acces de la proprietar". Nicio citire din date reale, nicio scriere.
- D-18: Comutatorul Acorda/Retrage management sta pe cardul clubului in ecranul proprietar (lista conturilor de club); vizibil doar proprietarului, RPC verifica server-side. NU in CereriAccesAdmin per grant.
### Autorul modificarilor
- D-19: Autorul se alege la intrarea in competitie ("Cine lucreaza?": lista instructorilor clubului sau "altcineva: nume" neverificat) si e schimbabil oricand (badge sus + buton Schimba); expira dupa inactivitate lunga.
- D-20: Se logheaza actorul pe: inscrieri_competitie, echipe (echipe_competitie, echipa_sportivi, cereri/solicitari), schimbari grad (istoric_grade). Jurnalul il vad proprietarul + admin club; instructorul doar propriile actiuni. UI/GDPR mentioneaza clar: declarativ, neverificat.

## Deferred / nu in aceasta faza
- Proiect Supabase separat (respins). OTP per instructor (B') doar daca apar dispute. Sesiuni concurente pe acelasi cont (D-07: un dispozitiv).

## Ordine valuri (aprobata)
1. Cont club + RLS (grant la nivel de club, nu per competitie) + lista competitii cu istoric + confirmare la intrare.
2. Autor modificari (D+A): extindere audit_trigger_fn pe tabelele wizardului, RPC sesiune actor, ecran alegere actor.
3. Buton management + zona de test + acordare management de catre proprietar.

## Riscuri / de verificat (din evaluari)
- audit_trigger_fn face (NEW.id)::uuid: fa-l tolerant (to_jsonb(NEW)->>'id') inainte de trigger pe echipa_sportivi / competitie_sportiv_arme (posibil fara coloana id). Logheaza doar diferenta pt date minori (istoric_grade, echipa_sportivi).
- Tabele din wizard fara audit azi: echipe_competitie, echipa_sportivi, solicitari_echipe_incomplete, cereri_coechipier, competitie_sportiv_arme, sportiv_arme, istoric_grade (inscrieri_competitie e auditat).
- RLS Faza 36 verifica grant per competitie (acces_extern_competitie) -> de rescris pe cont de club; politici restrictive ext_r_* (este_doar_extern) raman. Audit pe pg_policies LIVE.
- utilizator_roluri_multicont are FORCE RLS: definer nu ocoleste RLS; proprietarul e si super admin.
- OTP merge la un singur email per club; SMTP custom (planul 32-08) ramane prerechizit de lansare.
- Zona de test: date fictive, nicio citire din date reale, fara scrieri.
- Neverificat: unde se creeaza plati/facturi la inscriere (nu in wizard), ip_address/user_agent in audit_log, starea live a triggerelor de audit.

## Cod existent de refolosit
components/CompetitieExterna/* (shell, login OTP, ExternDataProvider), Competitii/index.tsx (mode="extern"), services/accesExternService.ts, api/_aprobaCerereAcces.ts, supabase/migrations/20261106a..g, 20261111b, audit_log + audit_trigger_fn (sql/migrations/*audit*).
T2 (CereriAccesAdmin comutator management, per grant) NECOMIS in working tree — de refacut pe modelul de club.
