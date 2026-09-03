# Politica de Retentie a Datelor Personale — Portal PhiHau

## Identificare document

| Camp | Valoare |
|------|---------|
| Data redactarii | 2026-09-03 |
| Versiune | 1.0 |
| Faza GSD | Faza 28 — Conformitate GDPR si AI Act pentru date personale sportivi, plan 28-03 |
| Statut | **Draft tehnic** — derivat din decizia blocata in interviul de faza (`28-CONTEXT.md`) si din verificarea directa a codului sursa (absenta unui job automat de retentie). Necesita validare de catre un consilier juridic / DPO — in special termenul financiar (marcat "de confirmat") — inainte de a fi tratat ca politica oficiala aplicata. |

## Principiu

Conform art. 5(1)(e) GDPR (limitarea stocarii), datele personale nu se pastreaza intr-o forma care permite identificarea persoanei vizate mai mult timp decat este necesar pentru scopurile in care sunt prelucrate. Portal PhiHau aplica acest principiu diferentiat, pe categorie de date, conform tabelului de mai jos — nu exista un termen unic global.

## Tabel de retentie

| Categorie de date | Termen | Moment de start al termenului | Actiune la expirare | Justificare (temei) |
|---|---|---|---|---|
| Date operationale sportiv (identificare, grupa, prezenta, competitii) | **3 ani de la ultima activitate** (ultima prezenta, ultima plata sau ultimul examen, oricare e mai recent) | Data ultimei activitati inregistrate pentru sportivul respectiv | Anonimizare/arhivare (vezi sectiunea "Ce inseamna anonimizare aici") | Decizie blocata in interviul de faza 28 (`28-CONTEXT.md`) — dupa 3 ani de inactivitate, sportivul nu mai are legatura activa cu clubul, iar pastrarea datelor identificabile nu mai e necesara scopului initial |
| Date financiare (facturi, tranzactii, deconturi federatie) | **10 ani de la incheierea exercitiului financiar** in care a avut loc tranzactia — termen recomandat, **de confirmat cu contabilul/consilierul juridic** | Sfarsitul anului fiscal in care s-a emis factura/incasarea | Arhivare (nu se sterg, chiar daca sportivul asociat a fost anonimizat operational) | Obligatie legala de arhivare contabila din Romania (Legea contabilitatii 82/1991 si normele fiscale aferente) — termen DISTINCT si MAI LUNG decat cel operational, documentat separat conform cerintei REQ-7 |
| Istoric grade si examene | **30 ani de la ultimul examen sustinut** — termen recomandat pe durata activa a vietii sportive | Data ultimului examen de grad sustinut de sportiv | Pastrare in forma agregata (grad + data, fara alte date de identificare) dupa expirarea termenului sportivului asociat | Interes legitim de certificare a gradelor QwanKiDo — un grad obtinut ramane o certificare valabila pe termen foarte lung, inclusiv pentru sportivi care revin dupa o pauza indelungata |
| Fisa de inscriere (date medicale/familiale, art. 9 GDPR) | **6 luni de la ultima activitate** a sportivului asociat — termen mai scurt decat cel operational | Data ultimei activitati inregistrate pentru sportivul respectiv | Stergere efectiva (nu doar anonimizare) — categorie speciala de date | Sensibilitate ridicata (art. 9 GDPR) justifica un termen de pastrare mai scurt decat datele operationale generale; tabelul contine azi 0 randuri live (confirmat in `16-01-SUMMARY.md`), deci termenul se aplica prospectiv |
| Jurnal de audit / log-uri de securitate | **2 ani de la data evenimentului logat** | Data evenimentului (login/logout, actiune CRUD sensibila) | Arhivare comprimata sau stergere, dupa decizia operatorului | Interes legitim de securitate si investigare incidente — 2 ani acopera un ciclu tipic de audit anual plus o marja de investigatie retroactiva |
| Istoric conversatii AI Assistant | **0 — nu se stocheaza** | N/A | N/A | Verificat prin cod: `grep -rn "ai_chat\|chat_history\|istoric_chat\|conversat" services/ hooks/ contexts/ --include=*.ts --include=*.tsx` returneaza zero rezultate relevante (singura potrivire e un comentariu in `services/agents/orchestrator.ts`). Istoricul de chat traieste exclusiv in starea din browser (React state), pe durata sesiunii, si nu este persistat in DB — confirmat si in `docs/gdpr/DPIA-AI-ASSISTANT.md` |
| Cereri GDPR (`cereri_gdpr`) — export/stergere | **5 ani de la data procesarii cererii** (`procesat_la`) | Data la care ADMIN_CLUB a schimbat statusul cererii (aprobata/respinsa) | Arhivare — cererea insasi (nu datele sportivului la care se refera) ramane ca dovada de conformitate | Dovada ca operatorul a raspuns la exercitarea drepturilor persoanei vizate, utila la un eventual control ANSPDCP; termenul e independent de retentia datelor sportivului la care se refera cererea |
| Conturi de utilizator inactive (fara login) | **2 ani fara autentificare reusita** pentru dezactivare, urmat de **4 ani** fara autentificare pentru anonimizare completa | Data ultimei autentificari reusite (`auth.users`) | Dezactivare cont dupa 2 ani, anonimizare/stergere cont dupa 4 ani | Conturile de staff (INSTRUCTOR/ADMIN_CLUB) fara sportiv asociat nu intra sub regula de 3 ani a sportivilor; termenul mai lung reflecta faptul ca un cont de staff poate ramane inactiv sezonier fara a fi abandonat definitiv |

## Procedura de executie

**Nu exista azi un job automat de anonimizare/arhivare in aplicatie.** Verificat explicit prin cautare in cod (`grep -rn "anonimiz\|arhiveaz\|cron\|scheduled" services/`, `api/`) — nu exista niciun proces server-side, functie programata (cron) sau Supabase Edge Function care sa aplice automat termenele de mai sus. Aplicarea politicii de retentie este in acest moment un **proces MANUAL/asistat**, executat de `ADMIN_CLUB` sau `SUPER_ADMIN_FEDERATIE` folosind fluxurile existente din aplicatie (ex. Sportivi > Sterge, export-urile CSV/PDF deja disponibile pentru arhivare externa).

Legatura cu fluxul `cereri_gdpr` (planul 28-01, 28-05): atunci cand un sportiv creeaza o cerere de stergere si aceasta este **aprobata** de `ADMIN_CLUB`, tehnic se schimba DOAR `status -> 'aprobata'` plus campurile `procesat_de`/`procesat_la` (setate server-side prin trigger, nu de client). **Nicio actiune automata nu se declanseaza pe date** — stergerea/anonimizarea efectiva a datelor sportivului ramane o actiune manuala separata, executata de admin dupa aprobare (decizie D-11 din `28-CONTEXT.md`). Aceasta politica de retentie este ghidul dupa care admin-ul decide CE se sterge/pastreaza atunci cand executa manual acea actiune.

## Ce inseamna anonimizare aici

Pentru a fi operationala, "anonimizare" se defineste concret prin campurile efectiv afectate:

**Campuri care SE STERG sau SE INLOCUIESC** la anonimizare (categoria "Date operationale sportiv" din tabelul de mai sus):
- `nume`, `prenume` — inlocuite cu un identificator generic (ex. "Sportiv anonimizat #ID")
- `CNP` — sters complet (nu se pastreaza nici partial)
- `email`, `telefon`, `adresa` — sterse complet
- `foto` (avatar) — stearsa din storage
- `consimtamant_parinte_nume` — sters (numele parintelui e tot un identificator direct)
- Orice alt camp text liber care ar putea identifica persoana (ex. observatii cu nume propriu)

**Campuri care SE PASTREAZA** in forma agregata/pseudonimizata dupa anonimizare:
- Statistici de prezenta (numar de antrenamente, procent prezenta) — fara nume asociat, doar agregat statistic
- Istoricul de grade obtinute (grad + data) — pastrat pentru certificare pe termen lung (vezi randul dedicat din tabel), decuplat de identificarea directa dupa expirarea termenului operational
- Sumele financiare agregate (fara identificator personal) — necesare pentru raportarea contabila si obligatia legala de arhivare de 10 ani
- `consimtamant_parinte_data` — poate fi pastrata ca marker temporal fara valoare identificatoare directa (spre deosebire de nume)

Fara aceasta definitie concreta, termenul "anonimizare" din randurile tabelului de mai sus ar ramane neoperational — orice executie manuala trebuie sa respecte exact aceasta lista.

## Exceptii

- **Litigii in curs** — daca exista un litigiu (contractual, disciplinar, sau legat de o cerere GDPR contestata) care implica datele unui sportiv, stergerea/anonimizarea se suspenda pana la solutionarea litigiului, indiferent de termenul din tabel.
- **Obligatii legale care suspenda stergerea** — daca o autoritate (ANAF, ANSPDCP, instanta) solicita explicit pastrarea unor date peste termenul standard, obligatia legala are prioritate fata de termenele din aceasta politica.
- **Cereri de stergere aprobate cu date financiare asociate** — chiar daca un sportiv solicita si i se aproba stergerea, datele financiare care intra sub obligatia de arhivare contabila de 10 ani NU pot fi sterse inainte de termen; doar datele de identificare directa neasociate obligatiei legale se anonimizeaza.

## Revizuire

Aceasta politica se revizuieste **anual** sau la orice modificare legislativa relevanta (GDPR, Legea 190/2018, legislatia fiscala privind arhivarea contabila), sau imediat ce se introduce un job automat de anonimizare/arhivare in aplicatie (moment in care sectiunea "Procedura de executie" trebuie actualizata pentru a reflecta noul proces automat, nu doar cel manual descris aici).

---
*Faza: 28-conformitate-gdpr-si-ai-act-pentru-date-personale-sportivi-s*
*Document redactat: 2026-09-03*
