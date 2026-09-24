# Raport Abonix — analiza functionare + comparatie cu Portal PhiHau

Explorare directa (Claude in Chrome, cont logat) pe phihau.abonix.net — 18 sep 2026. Cont gol (0 membri) la momentul analizei — observatiile despre campuri/logica provin din formulare si texte UI, nu din date reale.

## 1. Ce este Abonix

SaaS generic de "membership management" — nu specializat arte martiale/sport. Gandit pt orice business cu abonamente recurente (sala fitness, club, studio). Minimalist fata de portal-phihau.

| Meniu | Rol |
|---|---|
| Panou | Dashboard: abonamente active, expira in 7 zile, expirate, total membri, membri recenti |
| Incasari | Raport plati manuale, filtrat pe interval/plan/moneda (RON/EUR separat) |
| Membri | CRUD membri + import/export CSV |
| Abonamente | Planuri, Promotii (loialitate), Istoric plati |
| Memento-uri | Istoric notificari email/SMS trimise (manual+automat) |
| Marketing | Campanii email/SMS bulk catre membri filtrati |
| Setari | Profil organizatie, politica reinnoire, sabloane notificari |

## 2. Modelul de date — membru

Campuri formular "Adaugă membru":
`Prenume*` `Nume*` `Email` `Telefon` `Tip abonament` `Inceput abonament*` `Sfarsit abonament*` `Note`

**Fara echivalent** pt: CNP/data nastere, adresa, parinte/tutore (minori), club/grupa, grad centura, poza, istoric examene/competitii, portofel/solduri, roluri (sportiv/instructor/admin). Abonix trateaza un "membru" ca persoana + un singur abonament activ — nu familie de date sportive.

## 3. Plan de abonament (echivalent "tip abonament")

Campuri: `Denumire` `Durata (zile)` `Pret` `Moneda RON/EUR` `Activ (toggle)`

Data sfarsit = data inceput + durata (auto). Foarte simplu fata de `Plati` din portal-phihau (taxe anuale 3 straturi, reduceri, facturi, portofel).

## 4. Ce are Abonix in plus (idei de portat)

### Promotii de loialitate — nou pt noi
Regula automata: dupa N reinnoiri platite consecutive pe un plan, urmatoarea reinnoire adauga X zile bonus gratuit, inregistrata cu suma 0 in istoric.
**Aplicabil in PhiHau:** bonus pe abonamente/taxe recurente, calculat automat din `tranzactii` (ex. "10 luni platite → luna 11 gratis").

### Memento-uri automate configurabile pe program fix — nou pt noi
Setari → praguri bifabile: `-7 zile` `-3 zile` `0 (ziua expirarii)` `+3 zile` `+7 zile`, fiecare cu canal email si/sau SMS, plus istoric complet cine-cand-ce a primit.
**Aplicabil in PhiHau:** exista deja plan notificare WhatsApp restanțieri (semi/full-auto) — modelul Abonix de praguri configurabile + istoric per notificare e un pattern curat de adaugat peste ce exista, indiferent de canal.

### Politica de gratie la reinnoire configurabila
Setari → "Perioada de gratie (zile)": daca abonamentul e expirat de mai putin decat pragul, reinnoirea pastreaza data de start originala; daca a expirat de mai mult, data de start se reseteaza la ziua noii perioade.
**Aplicabil in PhiHau:** de verificat daca exista deja regula explicita/configurabila de gratie la reinnoire in `Plati` pt abonamente lunare recurente.

### Marketing bulk cu filtre + quota vizibila
Compune email/SMS, alege destinatari cu filtre (status, "expira in N zile", "aproape de bonus fidelitate"), trimite catre toti cei X membri sau catre selectie. Quota lunara afisata explicit: Email 0/500, SMS 0/100, resetata in 1 a lunii.
**Aplicabil in PhiHau:** segmentarea prin filtre + afisare quota e un detaliu UX bun de copiat.

### Export/Import CSV standard pe pagina Membri
Meniu "⋮" pe Membri: `Export membri (CSV)` `Export istoric abonamente (CSV)` `Import CSV` — vizibile direct.
**Aplicabil in PhiHau:** import deja exista — plasarea (un singur meniu contextual pe pagina de listare) e mai descoperibila.

### Sabloane editabile per tip notificare
4 sabloane separate: email memento, email expirat, SMS memento, SMS expirat — cu variabile (`{first_name}`). Editabile din UI, fara cod.
**Aplicabil in PhiHau:** daca notificarile automate devin permanente, sabloane editabile din UI scad nevoia de interventie developer.

## 5. Ce are deja Portal PhiHau si Abonix nu are

- Roluri multiple (SUPER_ADMIN_FEDERATIE / ADMIN_CLUB / INSTRUCTOR / SPORTIV) + RLS pe club
- Structura club/grupe/orar/prezenta — Abonix nu are "grupa" sau "orar saptamanal"
- Grade/examene/centuri — inexistent in Abonix
- Competitii — inexistent in Abonix
- Portofel sportiv + facturi + reduceri + taxe anuale pe 3 straturi (sportiv→club→federatie)
- Familii/tutori legali (GDPR minori) — Abonix are doar 1 persoana = 1 membru, fara relatii
- AI Assistant (RAG Gemini/Claude)

**Concluzie:** Abonix rezolva doar o felie din ce face PhiHau (membri + abonament + notificari + plati simple). Nu e inlocuitor — produs de nisa mai ingusta (gym generic).

## 6. Migrare sportivi PhiHau → Abonix — evaluare

**Recomandare: nu migra integral.** Ar insemna pierderea a tot ce e specific QwanKiDo (grade, examene, competitii, grupe, roluri, familii). Ai ramane doar cu "membru + abonament" — downgrade functional major.

Daca scopul e strict gestiune abonamente/plati simplificata (nu inlocuire completa):
1. Export sportivi activi din PhiHau (nume, prenume, email, telefon, tip abonament curent, data inceput/sfarsit) — mapare directa pe campurile Abonix.
2. Creare planuri in Abonix echivalente cu tipurile de abonament/taxe din PhiHau.
3. Import CSV in Membri (Abonix are import CSV nativ — verifica formatul de coloane inainte de export).
4. Configurare memento-uri automate + sabloane, daca se doreste inlocuirea notificarilor actuale.

**Alternativa mai buna:** pastreaza PhiHau ca sistem central si porteaza doar cele 3 idei de la sectiunea 4 (loialitate, memento-uri pe praguri configurabile, gratie la reinnoire) direct in modulul `Plati` existent — beneficii fara pierdere de date.

## 7. Test practic efectuat (18 sep 2026)

Nu migrare — doar test functional cu date reale de sportivi (activi, din DB) + date de contact fictive.

**Planuri create** (dupa `tipuri_abonament` sezon curent 2026-2027 din PhiHau):
- Individual - Sezon 2026-2027 — 200 RON, 365 zile
- Familie 2 - Sezon 2026-2027 — 300 RON, 365 zile
- Familie 3 - Sezon 2026-2027 — 350 RON, 365 zile

**Membri test adaugati** (nume reale sportivi activi, email/telefon fictive):
- Horatiu Casian Lungu Ciliac — plan Individual
- Vlad Stefan Iordache — plan Individual
- Alexandru Girigan — plan Familie 2

**Observatii din test:**
- Selectand un plan la adaugare membru, data de sfarsit si "suma platita" se completeaza automat (ex: plan 365 zile → sfarsit = inceput + 365 zile, suma = pretul planului).
- Camp "Suma platita" editabil manual — poate diferi de pretul planului (util pt reduceri/discount ad-hoc).
- Pagina de detaliu membru (`/members/{id}`) are actiuni: Prelungeste abonament, Editeaza, Sterge, plus sectiune "Istoric abonament".
- Lista Membri, cu selectie multipla, ofera actiuni bulk: Trimite memento-uri, Prelungeste abonament, Sterge selectati.
- Native date input RO (`dd.mm.yyyy`) nu accepta typing cu punct in el direct — necesita click pe camp + digit-uri fara separator, sau selectie din picker.

## 8. SMS/email/automatizari — ce foloseste Abonix, plati online

Verificat direct: API intern (`/api/organizations/features`) + continut JS bundle client, cu token de sesiune din localStorage.

**Providerul exact SMS/email nu poate fi aflat din client** — totul e procesat server-side, JS-ul din browser nu expune Twilio/SendGrid/etc. Confirmat sigur din raspunsul API:
```
auto_reminders_enabled, email_reminders_enabled, sms_reminders_enabled,
manual_reminders_enabled, marketing_enabled, plans_enabled, promotions_enabled
```
Plus quota vazuta in UI: 500 email / 100 SMS pe luna, resetata automat — limita impusa de Abonix, nu de user. Indica un provider extern platit (tip Resend/SendGrid/SES pt email, Twilio/Vonage pt SMS), cost inclus in abonamentul SaaS, dar identitatea exacta nu e confirmabila din exterior.

**Incasare online — NU au activata.** Confirmat explicit in UI: "Totalurile se bazeaza pe istoricul platilor inregistrate manual (fara plati online)". API-ul nu are niciun flag `online_payment`. Abonix e 100% evidenta manuala a platilor, fara gateway (Stripe/Netopia/PayU etc).

**Recomandare implementare in PhiHau:**
PhiHau are deja infrastructura mai avansata decat Abonix pt notificari — `SMS_PROVIDER` (android_gateway/smslink/twilio/vonage) + `ANDROID_GATEWAY_URL/TOKEN` in env, plus plan WhatsApp deja documentat. Lipseste doar structura UI, nu tehnologia:
- tabel `reguli_notificare`: praguri configurabile (-7/-3/0/+3/+7 zile fata de expirare), canal (email/SMS/WhatsApp), on/off per prag
- 4 sabloane text editabile din UI (nu hardcodate in cod), cu variabile `{prenume}`
- job zilnic (cron/edge function) care scaneaza abonamente/taxe expirand si trimite prin providerul deja configurat
- tabel istoric notificari (cine, cand, ce canal, ce sportiv) pt audit

Pt plati online (ceva ce nici Abonix nu are): daca se doreste vreodata, urmatorul pas logic e Netopia (cel mai folosit in RO pt asociatii sportive) — nu ceva de copiat de la Abonix, ei nu au asta implementat.

---
*Artifact original: https://claude.ai/artifact/LF1ndHxva3Fdc4sEE7z7NL*
