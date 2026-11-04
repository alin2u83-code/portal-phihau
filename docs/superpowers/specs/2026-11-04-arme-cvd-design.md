# Selecție arme per sportiv — Competiții CVD (design)

Data: 2026-11-04. Stare: ciornă pentru aprobare. Nimic implementat.

## Intenție

La Co Vo Dao (CVD) un sportiv nu are drept la toate armele. Adminul clubului trebuie să poată:
1. alege la ce arme poate participa fiecare sportiv (una sau mai multe) și să păstreze alegerea, editabilă;
2. înscrie sportivul separat pe fiecare armă;
3. alege ce formă execută la fiecare armă, lista de forme filtrată pe arma aleasă.

Exemplu dat de utilizator: Lungu Alin Mihai (C.N. 4 Dang, 42 ani) alege Ma Dao, Moc Guom, Bong; apoi se înscrie la fiecare armă; apoi alege forma pentru fiecare armă. Poate schimba oricând cât timp sunt înscrieri deschise.

## Stare actuală (verificată în cod, DB live și în browser, 4.11.2026)

- Pas2 CVD (`InscriereClubWizard/Pas2Quyen.tsx`) arată un tabel cu până la 27 coloane „OPȚIUNEA 1..27": toate formele permise gradului, într-o listă plată, fără arme.
- Drepturile grad → formă sunt în `inlantuiri_grade` (`tip_proba = thao_lo_individual`), editabile din Grade. Formele nu au câmp de armă; arma e prefixul numelui (Bong Phap Quyen Mot, Moc Guom Doc Luyen Mot, Ma Dao Ung Quyen Mot etc.).
- `categorii_competitie.arma` (text) există și listă armele categoriei, ex. `Long Gian / Song Cot / Moc Can`, `Arme cu lamă și articulate`. O categorie acoperă deci un grup de arme.
- `inscrieri_competitie` are unicitate `(categorie_id, sportiv_id)` și `(competitie_id, sportiv_id, categorie_id)`. Nu are câmp de armă. Are `inlantuire_id` și `inlantuire_id_2`.
- Wizardul alege categoria automat (`autoCategorie`, una per sportiv), de ex. „13-15 ani / Feminin / 1 CAP / Bong", chiar dacă sportiva poate alege forme din alte arme.
- Nicio cheie străină nu referă `inscrieri_competitie`. Triggerele ei: audit (și la delete) și taxa anuală (doar insert).

## Obiective

- Pas nou în wizard, doar pentru competiții `tip = cvd`, între Pas1 (selectare sportivi) și Pas2 (forme): alegerea armelor per sportiv.
- Armele propuse unui sportiv: doar cele la care are drept (matricea `inlantuiri_grade` la gradul efectiv la data competiției) și pentru care există categorie potrivită vârstă/gen/grad.
- Alegere salvată și editabilă: implicit pe sportiv, plus variantă pe competiție (ambele, decizie utilizator).
- O înscriere per armă, fiecare cu propria categorie, formă și taxă (o taxă per înscriere).
- Pas2 arată formele doar pentru armele bifate, grupate pe armă.
- Restricțiile din circulară aplicate pe arme, cu dezactivare și motiv.

## Non-obiective

- Competiții non-CVD (tehnica, giao_dau): neschimbate.
- Probele pe echipe (Song Luyen): în afara acestei iterații (de confirmat). Giao Dau individual (arme) INTRĂ în scop, vezi „Actualizări din 4.11".
- Nu se modifică clasamente, rezultate, rapoarte în afara coloanei de armă în sumar.
- Anti-obiectiv: o schimbare de armă nu trebuie să mute silențios o înscriere deja plătită.

## Decizii ale utilizatorului

- Alegerea armelor într-un **pas nou între Pas1 și Pas2**.
- Persistență **ambele**: implicit pe sportiv, plus alegere pe competiție.
- Drepturile vin din matricea existentă din DB; restricțiile din circulară se adaugă în cod.
- Nomenclator: tabel `arme` + `inlantuiri.arma_id`.
- Salvare: un rând `inscrieri_competitie` per armă.
- Câte arme: mai multe, cu blocare dură a combinațiilor interzise.
- Stagii (min 1 stagiu la armă pentru grade, 3 pentru negre): doar avertisment.
- O singură armă per categorie; unicitatea `(categorie, sportiv)` rămâne.
- Restricția lamă vs articulate se aplică pe arme, nu pe categorie (inclusiv la categoriile 40+ comune).
- O taxă per înscriere (3 arme = 3 taxe).
- Editare: doar ADMIN_CLUB, cât timp înscrierile sunt deschise. Instructorul doar vede.
- Ordine de lucru: întâi fix-urile Competitii din sesiunea curentă, apoi armele.

## Reguli din circulară (din `docs/ARHITECTURA_COMPETITII.md:111-139`)

- Grade (1-4 CAP) la Bong NU pot participa și la 1 Long Gian / Song Cot / Moc Can.
- Centuri negre 18-39 la Bong POT participa și la alte arme.
- Arme cu lamă NU se combină cu arme articulate.
- Maxim 3 sportivi per club la probele individuale (doar avertisment, presupunere).
- Arme de bază pentru grade: Bong, 1 Long Gian (nunchaku), Song Cot, Moc Can. Suplimentare pentru negre: Moc Guom, Song Diep Dao, Yen Dao, Ma Dao, Dai Dao, 2 Long Gian, Tam Thiet Gian, Nhuyen Tien.

## Model de date (propunere, de aprobat înainte de migrare)

- `arme(id, denumire, tip, ordine, activ)`. `tip` ∈ lungă, lamă, articulată, scurtă. Seed cu armele de mai sus. Tipul pentru Song Cot, Moc Can, Cuu Khuc, Phuc Su Dao e **presupunere a mea**; utilizatorul îl confirmă.
- `inlantuiri.arma_id` (FK nullable): legat prin potrivire pe prefixul numelui; formele neclare se listează pentru confirmare, nu se ghicesc.
- `sportiv_arme(sportiv_id, arma_id)`, unic pe pereche: armele implicite ale sportivului.
- `competitie_sportiv_arme(competitie_id, sportiv_id, arma_id)`, unic pe triplet: varianta pe competiție, inițializată din `sportiv_arme` la prima deschidere a pasului. O casetă „salvează ca implicit" copiază înapoi în `sportiv_arme` (presupunere).
- `inscrieri_competitie.arma_id` (FK nullable). Coloana text `arma_ales` rămâne neatinsă. Unicitatea existentă rămâne.
- Maparea armă → categorie: categoria se alege după vârstă/gen/grad și faptul că `categorii_competitie.arma` conține arma (împărțit după „ / "); „Arme cu lamă și articulate" se expandează la toate armele de tip lamă și articulată. Dacă două arme bifate ajung în aceeași categorie, a doua e blocată cu motiv.
- RLS pe tabelele noi: acces prin `has_access_to_club` pe clubul sportivului; scriere doar ADMIN_CLUB și SUPER_ADMIN_FEDERATIE; fără politici permisive suplimentare. După migrare se verifică `pg_policies` live (în DB au existat politici fantomă).

## Comportament

1. **Pas Arme** (nou). Per sportiv selectat în Pas1: chip-uri cu armele permise, bifare multiplă. Combinațiile interzise sunt dezactivate cu motiv scris. Avertismente (nu blocări): stagii insuficiente, peste 3 sportivi per club la categorie. La prima deschidere se preiau armele din `sportiv_arme`.
2. **Pas2 (forme)**. Per sportiv, o secțiune per armă bifată, cu formele acelei arme permise gradului. O formă per armă (`doua_quyenuri` e fals la toate categoriile CVD actuale; suportul pentru a doua formă rămâne unde categoria o cere). Tabelul cu 27 coloane dispare pentru CVD.
3. **Pas4 (sumar)**. Un rând per (sportiv, armă): categorie, formă, taxă. Salvarea creează un `inscrieri_competitie` per armă cu `arma_id` și `inlantuire_id`.
4. **Editare după salvare**. Adminul poate reveni la pas și schimba armele. Debifarea unei arme cu înscriere existentă folosește fluxul Retrage: confirmare în doi pași, refuz dacă `taxa_achitata`, verificarea numărului de rânduri șterse, reîncărcarea datelor. Schimbarea formei la o armă existentă actualizează rândul, nu îl șterge.
5. **Permisiuni**: ADMIN_CLUB și SUPER_ADMIN_FEDERATIE editează cât `competitie.status = inscrieri_deschise`; INSTRUCTOR citește.

## Lăsat pe seama builder-ului

- Numele și tipurile exacte din seed `arme`, cu lista formelor neclare pentru confirmare.
- Aspectul vizual al chip-urilor, textele de motiv și al secțiunilor din Pas2.
- Strategia de migrare a înscrierilor CVD deja existente în DB (rânduri fără `arma_id`): deducerea armei din formă sau păstrarea lor ca atare, fără pierdere de date.
- Sursa datelor pentru avertismentul de stagii; dacă nu există date utilizabile, avertismentul se omite și se notează.

## Actualizări din 4.11 (răspunsuri utilizator, înlocuiesc ce contrazic mai sus)

- **Ordinea:** întâi se aleg armele, apoi probele. Pasul „Arme" devine **primul pas la nivel de competiție CVD**, înainte de cardurile probelor (nu per probă între Pas1 și Pas2). Aici se aleg sportivii clubului și armele lor; apoi Thao Lo și Giao Dau pornesc de la aceste arme.
- **Tipuri de arme:** Moc Guom face parte din grupul „arme de lemn", împreună cu armele fără tip (Bong, Song Cot, Moc Can). Lama: Song Diep Dao, Yen Dao, Ma Dao, Dai Dao. Articulate: Long Gian, 2 Long Gian, Tam Thiet Gian, Nhuyen Tien. Restricțiile (lamă vs articulată; grade la Bong vs Long Gian/Song Cot/Moc Can) rămân, pe arme.
- **Giao Dau individual (arme):** sunt permise doar armele de lemn. Sportivul poate participa cu mai multe arme, dar una singură pe luptă, și o poate schimba pe parcursul competiției. Portalul reține doar **armele de lemn permise** ale sportivului (din armele alese), nu arma de la fiecare luptă; alegerea la luptă se face în sală. Utilizatorul a ales lista „Bong, Song Cot, Moc Can, Moc Guom, plus Long Gian (nunchaku)". Apelul meu: 2 Long Gian, Tam Thiet Gian și Nhuyen Tien nu intră (articulate fără ștampilă de lemn); Phuc Su Dao nu intră (vezi mai jos).
- **Categoriile Giao Dau CVD** sunt pe vârstă, gen și grad, `arma` este `NULL`; arma nu influențează categoria și nu schimbă taxa (80 lei / participant, `docs/ARHITECTURA_COMPETITII.md:180`).
- **Plata:** competiția se achită după ce se clarifică înscrierile, adică toate probele și categoriile. Până la plată, armele, formele și înscrierile se editează liber; blocarea („lacăt") se aplică doar după `taxa_achitata`.
- **Nomenclator deja existent:** `inlantuiri.categorie = 'arma_cvd'` conține cele 12 arme (2 Long Gian, Bong, Dai Dao, Long Gian, Ma Dao, Moc Can, Moc Guom, Nhuyen Tien, Song Cot, Song Diep Dao, Tam Thiet Gian, Yen Dao). Formele sunt grupate în `thao_lo_bong`, `thao_lo_guom`, `thao_lo_dao`, `thao_lo_alte`. Apelul meu: tabelul `arme` se populează din aceste 12 rânduri, iar `inlantuiri.arma_id` se completează din prefixul numelui, verificat contra grupului.
- **Phuc Su Dao și Cuu Khuc** nu sunt în lista celor 12 arme și nu apar în nicio categorie de competiție. Sunt doar forme (`Phuc Su Dao Quyen Mot` în `thao_lo_dao`, `Cuu Khuc ...` în `thao_lo_alte`). Fără armă asociată, acum ar dispărea din Pas2. Rămân neasociate până decide utilizatorul (lista formelor neclare).

## Actualizări din 4.11, runda 2

- **Giao Dau, arme de lemn permise: Bong, Song Cot, Moc Can, Moc Guom, Long Gian.** Nimic altceva (2 Long Gian, Tam Thiet Gian, Nhuyen Tien, lamele rămân excluse). Confirmat.
- **Phuc Su Dao și Cuu Khuc se elimină deocamdată:** nu se asociază nici unei arme și nu se oferă în wizard.
- **Song Luyen intră în scop:** se poate forma o echipă doar din sportivi care au aleasă **aceeași armă** în pasul „Arme", la categoria potrivită. Consecințe pentru builder: (a) Pas3 Echipe filtrează candidații după arma comună; (b) o echipă Song Luyen are o singură armă (de confirmat dacă perechile pot avea arme diferite, ex. „QK 1 contra QK 3" nu sunt arme); (c) categoriile Song Luyen trebuie potrivite pe armă ca la Thao Lo. Modelul „un rând per armă și o armă per categorie" se aplică înscrierilor individuale; echipele rămân pe `echipe_competitie`, unde arma echipei trebuie stocată separat (câmp de decis la plan).
- **Song Luyen, regula armei (confirmat):** doar aceeași armă cu aceeași armă (Bong cu Bong, Moc Guom cu Moc Guom etc.). Doi sportivi cu mai multe arme comune pot forma câte o echipă pe fiecare armă comună, fiecare la categoria ei.
- **Fix-ul Pas4 (inactivii înscriși dispar din sumar) a fost cerut explicit și aplicat înaintea designului.**

## Apeluri ale mele după builder-check (de verificat la citire)

- **Potrivire armă → categorie:** după vârstă, gen, `grad_min_ordine`/`grad_max_ordine` din `categorii_competitie` (nu cu benzi de grad hardcodate) și `arma` care conține arma. Dacă nicio categorie nu se potrivește, arma nu se oferă pentru acel sportiv. Dacă se potrivesc mai multe, se alege cea cu `ordine_afisare` minim. Verificat pe Lungu Alin (40-49, M, C.N. 4 Dang): Bong → „C.N. 2 Dang - C.N. 5 Dang / Bong", Moc Guom → „C.N. - C.N. 5 Dang / Moc Guom", Ma Dao → „C.N. - C.N. 5 Dang / Arme cu lamă și articulate". Câte o categorie fiecare.
- **Grad efectiv:** se reutilizează `gradEfectivLaData` din `utils/eligibilitateCompetitie`, deja folosit de Pas2.
- **Înscrieri CVD existente:** în competiția de test există doar 5 înscrieri Giao Dau, fără formă și neplătite. Nicio înscriere Thao Lo, deci nu e nimic de migrat. Rândurile fără `arma_id` rămân neatinse.
- **Taxa anuală:** trigger-ul rulează per sportiv (`activeaza_taxa_anuala(sportiv_id)`), nu per înscriere. Să nu creeze taxe în plus la 3 arme nu am verificat; se testează la implementare.
- **Armă plătită:** chip-ul armei și forma ei se blochează (lacăt) cât timp `taxa_achitata`. Nu se permite nici schimbarea formei.
- **Sursa de adevăr:** varianta pe competiție decide. Implicitul doar inițializează. Armele din implicit la care sportivul nu mai are drept (promovare) apar estompate cu avertisment, nu se șterg.
- **Lăsate în afara iterației:** Song Luyen pe echipe; datele de stagii dacă nu există sursă utilizabilă. (Giao Dau individual e în scop, vezi „Actualizări din 4.11".)

## Precondiții și riscuri

- Pas4 trebuie să afișeze și sportivii inactivi deja înscriși (regresie găsită în review-ul curent, încă neaplicată). Se repară înainte de reproiectarea lui Pas4.
- Politicile `inscrieri_delete_club` și `inscrieri_update_club` din DB live sunt permisive (orice ADMIN_CLUB poate șterge sau modifica înscrierile oricărui club). Nu aparțin acestui design, dar fluxul de editare al armelor ține de ștergeri; migrarea de drop așteaptă decizia utilizatorului.
- Datele sunt reale și utilizatorul lucrează live pe competiția CVD; migrările nu se aplică fără OK explicit, iar testarea nu șterge înscrieri reale.

## Verificare propusă

`npx tsc --noEmit` filtrat pe Competitii; test în browser pe competiția CVD de test (id 80363db1-63a4-47bf-9adc-6337d571f331) fără a apăsa „Salvează" pe date reale; verificare RLS live; review separat pe diff.
