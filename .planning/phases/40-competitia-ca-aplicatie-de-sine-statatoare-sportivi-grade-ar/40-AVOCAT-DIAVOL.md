# Faza 40 — Avocatul diavolului asupra designului
Design: `docs/superpowers/specs/2026-11-12-competitie-aplicatie-proprie-grade-design.md`. Data: 12.11.2026.

## Verdict: MODIFICAT
Pastram: scrierea printr-un RPC atomic (nu RLS deschis pe `sportivi`/`istoric_grade`), autor obligatoriu, echivalare calculata de sistem, ecran federatie.
Taiem: tabela generica "grad/arma/sportiv nou", retrogradarea in v1, sportivul nou/activarea din aceeasi faza.

## Ce NU am putut verifica
- **RLS LIVE: `pg_policies` NU a fost interogat.** Subagentul nu are unealta Supabase MCP `execute_sql` si nici string de conexiune la DB. Am rulat doar SELECT-uri PostgREST cu service role (coloane, numaratori, date). Concluziile pe RLS vin din migrari + `39-AUDIT-LIVE.md` + antetul `20261111a` (care spune "verificat pe pg_policies live, 11.11"). **Ruleaza inainte de plan** (read-only): `SELECT tablename, policyname, cmd, permissive, roles, qual, with_check FROM pg_policies WHERE tablename IN ('sportivi','istoric_grade','grade','audit_log','competitii') ORDER BY 1,2;` plus `SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgrelid IN ('public.istoric_grade'::regclass,'public.sportivi'::regclass) AND NOT tgisinternal;`
- Indiciu live (PostgREST): `audit_log` are 41 randuri cu `actor_nume` (deci `20261111d` e aplicata), dar **0 randuri cu `tabel='istoric_grade'`**. Fie nu s-a scris nimic in istoric de la aplicare, fie `audit_istoric_grade` (`20261111d:239`) nu exista live. De confirmat cu `pg_trigger`.

## 1. Duplicat de cod
| Nevoie din design | Exista deja | Verdict |
|---|---|---|
| Scrie grad | `components/Competitii/InscriereClubWizard/SchimbaGradModal.tsx:44` (insert `istoric_grade`, verifica duplicat, citeste `grad_actual_id` real) | Refolosit, doar sursa scrierii se muta in RPC |
| Derivare `grad_actual_id` | trigger `trg_sync_grad_actual_from_istoric` (`20260329_normalize_grade_sources.sql:100`) | Nu se atinge |
| Autor, club, competitie, vechi/nou | `audit_log` (coloane `actor_nume, actor_user_id, club_id, competitie_id, date_vechi, date_noi`) + `audit_trigger_fn` + trigger `audit_istoric_grade` (`20261111d:239`) | **Acopera ~80% din "evidenta federatiei"** |
| Ecran cu jurnal pe competitie | `components/Competitii/JurnalActori.tsx` (deja include `istoric_grade`, `sportiv_arme`, `competitie_sportiv_arme`; ascunde `date_vechi/date_noi`, T-39-51) | De extins, nu de reconstruit |
| Citire pentru federatie | `audit_log_select_super_admin` (preexistent) | Exista |
| Taxa gradului | `grade_preturi_config` (`grad_id, suma, is_activ, data_activare`) | Se citeste din RPC, nu se copiaza |
| Notificari | tabele `notificari`, `in_app_notificari`, `NotificationBell.tsx` | Alternativa la "contor"; vezi sect. 6 |
| Garda de autor | `audit_trigger_fn` face fail-closed fara sesiune de autor (`20261111g`) | RPC mosteneste garda gratis (`auth.uid()` ramane al contului) |

Lipsesc doar: **motiv structurat, tip (echivalare/promovare/retrogradare), taxa la momentul schimbarii, stare "achitat"**. Motivul poate sta deja in `istoric_grade.observatii` (text liber, se vede in `date_noi` din audit).

## 2. Normalizare: tabela unica cu tip + vechi/nou generice = antipattern (EAV)
**[ÎNALTA]** `valoare_veche/valoare_noua` text pentru grad, arma si sportiv nou pierde FK-uri, tipuri, indexuri si pune logica de afisare in client. "Taxa" si "examen de achitat" au sens doar pentru grad. Armele (`sportiv_arme`, `competitie_sportiv_arme`) si sportivul nou (`sportivi`) au deja triggere de audit (`20261111d:239-260`) si apar deja in `JurnalActori`. O a doua evidenta pentru ele dubleaza `audit_log`.
Alternativa minima:
- **Fara tabela noua pentru arme/sportiv nou**: federatia le vede din `audit_log` (filtru `tabel`).
- **O tabela ingusta doar pentru grad**, ex. `schimbari_grad_competitie(id, sportiv_id, club_id, competitie_id, grad_vechi_id FK, grad_nou_id FK, tip CHECK in ('echivalare','promovare'), motiv, taxa numeric, achitat_la, achitat_de, istoric_grade_id FK ON DELETE SET NULL, actor_nume, created_at)`. Justificata doar de starea "achitat" + motiv structurat. RLS: SELECT federatie si admin club propriu; zero INSERT/UPDATE direct pentru `authenticated` (doar RPC); UPDATE `achitat_*` doar super admin. Atentie: event trigger-ul `ensure_rls_on_create` pune FORCE RLS pe tabele noi (vezi `20261111d:13`), deci functiile definer trebuie sa mearga pe owner cu BYPASSRLS.
- Daca se renunta la "achitat" ca stare: nu e nevoie de nicio tabela; `audit_log` + `observatii` ajung.

## 3. `istoric_grade` (schema live prin PostgREST)
Coloane: `id, sportiv_id, grad_id, data_obtinere, sesiune_examen_id, observatii, created_at, club_id`. **Fara autor, fara motiv structurat, fara tip.** Trigger-e (din migrari): `trg_sync_grad_actual_from_istoric` (INSERT/UPDATE grad_id/DELETE) si `audit_istoric_grade` (`20261111d`, de confirmat live).
**[CRITIC] Retrogradarea nu functioneaza in modelul curent.** `grad_actual_id` = `max(ordine)` din istoric (`20260329:44-110`). Inserarea unui grad mai mic NU coboara gradul actual; un UPDATE direct pe `sportivi.grad_actual_id` e suprascris la urmatorul insert/delete in istoric. Singura cale reala de coborare = **DELETE pe randul superior din `istoric_grade`**, deci stergere de istoric real (de examen, posibil). Comentariul din `SchimbaGradModal.tsx:63` spune acelasi lucru ("corectie in jos din profil").
**[ÎNALTA] "Ultima castiga" e fals pentru grade.** Daca Management promoveaza la 16 si competitia seteaza 15, ramane 16 (max). Daca competitia pune 17 si Management 16, ramane 17. Decizia "ultima castiga" din design e valabila doar pentru `sportivi` ca rand, nu pentru grad.
Propunere: v1 = doar **promovare/echivalare** (INSERT) si **undo = DELETE doar al randului creat de RPC** (`istoric_grade_id` salvat; `audit_log` pastreaza randul sters). Retrogradarea reala ramane la Management/federatie (fluxul existent), cu motiv. Daca utilizatorul insista: decizie separata despre cum se modeleaza gradul "curent" (coloana explicita vs max).

## 4. RLS (din migrari + AUDIT-LIVE; live neverificat)
- Contul extern: `sportivi` are doar SELECT (`ext_p_sportivi_sel`, `20261106c:61`) si **RESTRICTIVE zero-scriere** (`ext_r_sportivi_ins/upd/del`, `20261106c:94-98`). `istoric_grade` nu e in lista; ramane default-deny (sect. E, `20261106c:130-140`). Deci azi extern NU poate scrie nici una. Corect: nu deschideti RLS, folositi RPC.
- Consecinta: un RPC SECURITY DEFINER **ocoleste RLS** (owner postgres cu BYPASSRLS). Singura aparare = verificarile din functie. Obligatorii: `cont_club_curent()` non-null **si** `sportivi.club_id = cont_club_curent()`; `acces_extern_la_competitie(p_competitie)`; competitie neterminata (aceeasi conditie ca `20261111c2`); grad nou din `grade`; `varsta_minima` verificata; rolul contului = REPREZENTANT, nu extern Faza 36 cu `externRol` INSTRUCTOR (`index.tsx:214` face deja distinctia pe client).
- `istoric_grade` live (din antetul `20261111a`): politici ramase = admin/instructor pe clubul sportivului, super admin, `istoric_grade_comisie` (comisie cross-club). **De confirmat live** ca `Staff_Full_Access` a fost intr-adevar dropat (migrarea e marcata NEAPLICATA).
- Faza 37: orice functie noua cere `REVOKE ALL ... FROM PUBLIC, anon; GRANT EXECUTE ... TO authenticated`, `SET search_path = public, pg_catalog`, `auth.uid()` verificat, si intrare in snapshotul ACL (`20261107a/b/d`). Adauga test cross-club (`tests/rls_*`) si test "anon nu poate apela".

## 5. Schema pentru data limita si varsta
- **Data limita exista**: `competitii.deadline_inscrieri` (date, nullable) + `status` (`inscrieri_deschise`, `finalizata`). **Data competitiei**: `competitii.data_inceput`/`data_sfarsit`. Nu e nevoie de coloana noua.
- **[MEDIE] Date live incoerente**: competitia "Juniori 1, Seniori, Veterani" (31.10.2026) are un rand cu `deadline_inscrieri=2026-12-31`, adica dupa competitie. Si `deadline` poate fi NULL (3 din 5 randuri recente). Definitia ferestrei de undo: `status='inscrieri_deschise' AND (deadline_inscrieri IS NULL OR azi <= deadline_inscrieri)`; fara `deadline`, doar statusul. Nu te baza doar pe deadline.
- **Echivalare sub 13 → peste 13**: nu exista tabel de echivalenta. Datele: `grade.varsta_minima` (CV 1-4 Cap Alb = ordine 11-14, varsta_minima 9-12; 1-4 Cap Albastru = ordine 15-18, varsta_minima 13-15) si `sportivi.data_nasterii`. Varsta la `data_inceput`. Pattern observat: ordine +4 (CV 2 Cap Alb ord 12 → 2 Cap Albastru ord 16), dar **e o conventie, nu o regula in DB**. Cea mai simpla varianta sigura: coloana nullable `grade.echivalent_13_id` (self-FK, 4 randuri completate de federatie) si RPC-ul decide `tip='echivalare'` cand `varsta la data_inceput >= 13` si gradul actual are `varsta_minima < 13` si noul grad = `echivalent_13_id`. Nu ghici +4 in cod. `Pas1.tsx:383-396` calculeaza deja intervalele de varsta pe grade din `varsta_minima`; refoloseste.
- Cazul BALMUS/SFICA (ord 12, 13 ani) → 2 Cap Albastru (16): categoria Song Luyen 13-15 ani cere ord 15-18, deci OK.

## 6. Riscuri
| Sev. | Risc | Locatie | Mitigare |
|---|---|---|---|
| ÎNALTA | Promovare "cu cost" fara poarta: orice reprezentant poate seta orice grad mai mare (inclusiv Dang) pe un minor, devine "grad oficial" si intra in rapoartele federatiei (`vedere_raport_grade`, `view_istoric_grade_sportivi`). Singura frana e un semn "de achitat" pus de aceeasi persoana care lucreaza | design linia 17-18, 40-41 | Cel putin: RPC respinge grad cu `varsta_minima` > varsta; limita la +1/+2 trepte fata de actual sau doar grade care schimba categoria; separat in rapoarte gradele fara `sesiune_examen_id` din competitie. Intrebare deschisa U1 |
| ÎNALTA | Retrogradare imposibila fara DELETE de istoric (sect. 3) | `20260329:44-110` | Taie din v1 |
| ÎNALTA | SECURITY DEFINER ocoleste RLS; o verificare uitata = scriere cross-club pe minori | design linia 46 | Verificari sect. 4 + test cross-club obligatoriu |
| MEDIE | Efect cross-competitie: gradul e global; schimbat pentru competitia A poate scoate sportivul din categoria deja inscrisa la B | `inscrieri_competitie.categorie_id` | Avertisment cu lista inscrierilor existente ale sportivului la alte competitii |
| MEDIE | Undo: stergerea randului din `istoric_grade` face recalcul pe max; daca intre timp Management a adaugat alt grad, undo-ul nu mai readuce vechiul. Undo permis doar daca randul nostru e inca gradul curent | trigger DELETE | RPC `anuleaza_schimbare` verifica `grad_actual_id = grad_nou_id` |
| MEDIE | GDPR: `audit_trigger_fn` copiaza randul complet `sportivi` (inclusiv CNP, telefon) in `date_vechi/date_noi` la fiecare UPDATE (doar `istoric_grade`/`echipa_sportivi` au "diferenta-doar", `20261111d:197`). Un UPDATE de grad pe `sportivi` (efect secundar al triggerului) umple audit_log cu CNP al minorilor | `20261111d:197-203` | Extinde "diferenta-doar" si la `sportivi` sau exclude coloane sensibile |
| MEDIE | Sportiv nou/activare printr-un cont comun: minor fara `consimtamant_parinte_*`, `status_aprobare`, CNP, deduplicare (exista `DeduplicareSportivi`) | `sportivi` (coloane PostgREST) | Sa nu intre in aceeasi faza; vezi sect. 7 |
| MEDIE | "Examen de achitat" cu stare pe tabel nou fara FK catre examene/plati va diverge de facturile reale; inversul fluxului existent (examen -> factura) | design linia 41 | Accepta ca "memento", nu contabilitate; sau trimite ca rand in `notificari` catre super admin (exista `NotificationBell`) in loc de contor propriu |
| MICA | `observatii` pe INSERT/DELETE ramane in `audit_log` in clar (risc deja notat in AUDIT-LIVE:125) | | acceptat |
| MICA | `Pas3Echipe.tsx:494` trimite deja utilizatorul la "Schimba grad"; mesajele trebuie ajustate dupa schimbare | | |

## 7. Responsivitate / UX ecran federatie
- Refoloseste tiparul din `JurnalActori.tsx:92` (`overflow-x-auto` + `<table>`). Pe 375px tabelul cu 8 coloane (sportiv, club, vechi→nou, autor, data, competitie, motiv, tip) nu e citibil: card pe mobil (`md:hidden`) cu sportiv + vechi→nou + badge tip; tabel de la `md`. Filtre (club, competitie, tip) pe 1 coloana sub `sm`, 3 coloane de la `md`. Butoane/chips `min-h-10`.
- Reprezentant: modalul de schimbare grad ca `Modal` din `ui.tsx`, `items-end` pe mobil (comportament existent). Motivul obligatoriu la undo in afara ferestrei: textarea, nu input.
- Retrogradarile "evidentiate": badge rosu + text ("Retrogradare"), nu doar culoare (contrast pe teme).
- Neverificat in browser; doar citit codul.

## Ce pastram / ce taiem
**Pastram**
1. RPC atomic unic pentru schimbare grad (din contul de club), fara a deschide RLS pe `sportivi`/`istoric_grade`.
2. Autor declarat obligatoriu (garda `20261111g` il aplica automat).
3. Echivalare calculata de sistem, cu mapare explicita in DB (`grade.echivalent_13_id`).
4. Fereastra undo = `inscrieri_deschise` + `deadline_inscrieri` (coloane existente).
5. Ecran federatie cu lista + filtre + contor "de achitat", construit peste `audit_log`/`JurnalActori`.

**Taiem / amanam**
1. Tabela de evidenta generica cu `tip=grad|arma|sportiv_nou` si vechi/nou text (EAV). Armele si sportivii noi raman in `audit_log` deja existent.
2. Retrogradarea din v1 (nu exista in model; cere DELETE de istoric). Ramane la Management cu motiv.
3. Sportiv nou + activare din cont comun (consimtamant minori, CNP, dedup): faza separata sau doar "cerere" catre admin club (alternativa deja in todo).
4. "Revert de catre federatie prin fluxul existent" nu e un mecanism; clarifica sau scoate.

## Intrebari deschise pentru utilizator
- U1: Poate reprezentantul promova **oricat** (ex. direct la Dang) sau limitat (doar +1/+2 trepte, doar grade necesare categoriei)? Fara limita, "grad oficial" poate fi setat gratis de orice club.
- U2: Retrogradarea reala (exista cazuri?) sau doar undo al schimbarii facute din competitie? Daca reala, accepti stergerea randului de istoric superior?
- U3: Mapare echivalare: confirmi CV 1/2/3/4 Cap Alb → 1/2/3/4 Cap Albastru? Se aplica si altor perechi sub/peste 13?
- U4: "Examen de achitat": ajunge o stare "achitat" pe randul de evidenta, sau federatia vrea sa apara in `NotificationBell`? Cine are voie sa-l marcheze (doar super admin federatie)?
- U5: Daca un sportiv e inscris la 2 competitii si i se schimba gradul pentru una, cum tratam inscrierea la cealalta?
- U6: Ce se intampla cand `deadline_inscrieri` e NULL sau dupa data competitiei (exista in date live)? Folosim doar `status`?
- U7: Vrei in aceeasi faza sportiv nou/activare/arme, sau mai intai doar grad (mai mic, testabil)?

## Ce am verificat si ce nu
Verificat: citit spec, todo, migrarile `20260329`, `20261106c`, `20261111a/c2/d/d3/g`, `SchimbaGradModal`, `JurnalActori`, `index.tsx:213`; schema live si numaratori prin PostgREST (service role, doar GET). Neverificat: `pg_policies`/`pg_trigger` live, comportamentul in browser, testele.

---
## Adendum 12.11.2026 — verificare LIVE pg_policies (phi-hau-db, SELECT-uri read-only)

**istoric_grade** (coloane: id, sportiv_id, grad_id, data_obtinere, sesiune_examen_id, observatii, created_at, club_id — FARA autor, FARA motiv structurat; doar `observatii` text liber):
- Politici ALL permisive: "Acces Admin Istoric Grade", "Staff - Full Access" (has_access_to_club), Staff_Full_Access (este_staff_autorizat()), SuperAdmin x2, UNIFIED_CLUB_ACCESS (club_id = get_active_role_context()), istoric_grade_comisie.
- RESTRICTIVE `ext_r_deny_all` (ALL): contul doar-extern nu poate citi/scrie. => scrierea din competitie NU merge direct; RPC SECURITY DEFINER obligatoriu (confirmat).
- Triggere: audit_istoric_grade (INS/UPD/DEL), trg_sync_grad_actual_canonical, trigger_ajusteaza_debutant_la_import. Audit trigger EXISTA live.
- Risc: "UNIFIED_CLUB_ACCESS" si "Super Admin - Acces total grade" au rol {public} (nu authenticated) — de curatat/documentat (todo 2026-11-11-istoric-grade-drop-staff-full-access).

**sportivi**:
- INSERT/UPDATE/DELETE: restrictive `ext_r_sportivi_ins/upd/del` blocheaza extern. SELECT extern: doar `acces_extern_la_club(club_id)`.
- UPDATE permisiv: rbv_sportivi_update_staff (has_access_to_club OR id=get_own_sportiv_id()), sportivi_update_comisie, POLITICA_FINALA_SPORTIVI_V3 (ALL).
- Concluzie: contul extern nu scrie nimic direct, in concordanta cu migrarile. Nicio discrepanta gasita pe aceste 2 tabele.
