Contextul aplicației
                                                                             
  1. Cine sunt utilizatorii principali ai aplicației acum și cine ar trebui 
  să fie în viitor?
  - Federație, cluburi, instructori, sportivi — toți folosesc activ aplicația
   sau doar unii?

   avem acum super admin federatie - care vede tot ce tine de federatie - sportivi, grade, stagii, competitii, taxe anuale, taxe de competitie, taxe de stagiu, taxe de examen

   admin club care gestioneaza examenele locale, prezenta, abonamente, incasari de club, abonamente, echipamente, stagii, competitii, iar ce este spre federatie sa redirectioneze,

   instructor doar parte de introducere sportivi, prezenta, examene, incasari,

   as dori un alt rol exclusiv pentru prezenta - nu stiu numele
   avem sportivul care isi vede datele persoanale, si istoricul actiunilor sale
   doresc sa introduc si cont de parinte, care sa vada totul despre copilul sau copii sai, sa achite sau sa vizualizeze

   as dori sa adaug si rolul de arbitru, care sa aiba posibilitatea sa vada in competitii ce sportivi sunt, ce colegi exista si sa se poata face diverse actiuni cu acei arbitri in competitii




  - Există și părinți (tutorii sportivilor minori) care ar trebui să aibă
  acces?

  2. Câte cluburi și câți sportivi activi gestionează aplicația în momentul
  de față?
  - Numărul contează pentru decizii de arhitectură (performanță, filtre,
  export).
cluburi acum sunt vreo 7, dar voi dori sa ajungem la 35, unde sunt cluburi cu peste 100 de sportivi
  ---
  Funcționalități existente — ce lipsește sau e incomplet

  3. Din modulele existente (sportivi, grupe, prezență, examene, competiții,
  plăți), care funcționează bine și care au probleme frecvente sau lipsesc
  lucruri importante?

la sportivi, inca nu reusesc sa realizez un import asa cum imi doresc, usor si cu diacritice fara sa fie dubluri, grupele sa se poata realiza usor, examenele sa aiba posibilitatea de import rapid si corect, competitiile sa aiba optiuni de inscriere care se realizeaza usor si automat pe categorii de competitie, platile sa se poata vedea si realiza usor, sa realizez legatura intre incasari in club si ce trebuie transmis mai departe in federatie, nominal. vreau sa pot avea si posibilitatea de a avea grade de arbitru, grad in arme.
  4. Înregistrarea online (cele 6 faze planificate — guardians, cereri,
  contracte, WhatsApp, Netopia):
  - E o prioritate activă sau e pusă în așteptare?
  - Sportivii se înscriu acum manual de admin sau există un flux
  self-service?
as dori o inscriere in club printr-un formular, care sa fie vizualizat de admin club si apoi acceptat si apoi sa creeze contul adminul
  5. Plăți și facturi:
  - Plățile sunt înregistrate manual de admin sau există integrare cu un
  sistem de plată online?
  - Netopia e o cerință fermă sau e explorată?
deocamdata platile sunt manuale dar as dori sa fac plata online
  ---
  Viziunea finală a aplicației

  6. La final, aplicația ar trebui să fie:
  - Un instrument intern pentru administrarea federației/cluburilor
  (staff-only)?
  - Sau o platformă accesibilă și sportivilor/părinților cu cont propriu și
  interacțiune activă (anunțuri prezență, plăți online, documente)?
la final federatia sa poata vizualiza sportivii, ce sume are de incasat de la cluburi pentru stagii, competitii, examene locale, sau alte actiuni din federatie. toti practicantii sa poata vizualiza in calendar actiunile publicate de federatie. sa se poata realiza prezenta si generaare de facturi, incasari, vizualizare de infromarii relevante de catre sportiv sau tutore
  7. Există funcționalități pe care le-ai văzut la alte aplicații similare și
   vrei să le ai și tu?
  - Exemple: notificări push, calendar vizibil publicului, QR code la
  prezență, clasamente, statistici federale.
la competitii sa am clasament final, statistici, la fel la stagii, poate sa integram qr la prezenta, dar nu inca
  8. Comunicarea cu sportivii/părinții:
  - WhatsApp e singurul canal planificat, sau vrei și email, SMS, notificări
  in-app?
as dori sa generez email prin aplicatie si notificari in app
  ---
  Operațional și tehnic

  9. Aplicația rulează acum în producție cu date reale sau e în faza de
  dezvoltare/testare?
aplicatia are deja date reale introduse, dar este inca in testare
  10. Există termene importante sau un eveniment (competiție, congres de
  federație, sezon nou) pentru care trebuie să fie gata anumite
  funcționalități?
nu este o urgenta in urmatoarele 6 luni
  11. Cine face suportul tehnic după lansare — tu continui să dezvolți, sau
  va prelua altcineva?

  voi face in continuare dezvoltarea aplicatiei

   Roluri — detalii lipsă                                                     
                                                                             
  1. Rolul "doar prezență" — cum îl vizualizezi?                             
  - Persoana vine la sală și marchează cine e prezent, fără să vadă date
  financiare sau personale detaliate?
  - Sau e mai degrabă un asistent al instructorului?
  un asistent care se ocupa de prezenta

  2. Rolul "părinte/tutore":
  - Poate anunța absența copilului din aplicație (cum face sportivul acum)? -da
  - Poate plăti abonamentul online din contul lui? -da 
  - Vede același lucru ca sportivul, sau mai mult (ex: toate chitanțele,
  istoricul complet)? -deocamdata sa vada acelasi lucru
  - Un cont de părinte poate fi legat la mai mulți copii din cluburi
  diferite? - daca este cazul, e posibil sa trebuiasa sa aiba acces la cluburi diferite daca activeaza asa

  3. Rolul "arbitru":
  - Arbitrul e înregistrat ca persoană separată sau poate fi și el sportiv cu
   rol suplimentar? - arbitrul este practicant cu grad
  - Concret în competiție: introduce rezultatele meciurilor? Sau doar vede
  lista și e contactat offline? - as dori sa fac competitia pe aplicatie, dar nu e o prioritate
  - Are grade de arbitru separate de gradele sportive (ex: arbitru național,
  internațional)? - se pot crea, deocamdata nu sunt, insa ar putea exista o notare a arbitrilor pe baza prestatiei la teren

  ---
  Grade — sistem complet

  4. Cum funcționează gradele acum?
  - Există un nomenclator fix (ex: albă → galbenă → portocalie → ... → dan 1
  → dan 2)? - exista nomenclator deja
  - Gradele de arme sunt o ramură separată din același nomenclator sau un
  sistem paralel complet? - aici va fi separat
  - Un sportiv poate avea simultan grad tehnic + grad arme + grad arbitru,
  toate independente?- sunt cu mici limitari, dar poate avea si grad de qwan ki do si grad in arma si arbitru si instructor sau antrenor

  5. La examen local (organizat de club):
  - Clubul propune, federația validează? Sau clubul decide complet? -clubul sustine si promoveaza, dar exista si examene realizate de federatie
  - Există o taxă de examen care merge la federație, separată de taxa club? - taxa de examen trece prin club si se duce la federatie

  ---
  Plăți și finanțe — structura exactă

  6. Tipuri de abonament:
  - Lunar, trimestrial, anual — toate există sau doar unul? - deocamdata este lunar, dar pot fi si alte variante
  - Prețul diferă per grupă, per nivel de grad, per club? - preturile difera de la club la club, poate chiar de la grupa la grupa, de obicei este abonament pe sportiv sau pe familie
  - Există reduceri pentru frați, pentru plată anuală? taxele catre federatie sunt fixe, abonamentele pot avea reduceri de familie, depinde de politica clubului

  7. Fluxul bani club → federație:
  - Clubul colectează totul (abonamente + taxe federale) și virează
  lunar/trimestrial? - vireaza atunci cand este necesar, de obicei inainte de activitati nationale
  - Sau sportivul poate plăti direct la federație anumite taxe (ex: taxa
  anuală de legitimație)? - majoritatea cluburilor achita, nu se face pe sportiv, dar pot exista si exceptii
  - Factura o emite clubul sau federația? - factura este emisa de club, iar federatia catre club

  8. Echipamente:
  - Vrei să vinzi echipamente prin aplicație (comandă + livrare)? - este o idee, nu este o prioritate
  - Sau doar să înregistrezi că un sportiv a primit/cumpărat un echipament? - deocamdata doar sa imi spuna ca doreste ceva sa achizitioneze si clubul sa centralizeze si sa faca comanda

  ---
  Competiții și stagii — detalii operaționale

  9. Categoriile de competiție cum se formează automat?
  - Pe vârstă + grad + greutate (toate trei)? - sunt competitii de tehnica, de lupta, sau de lupta regizata, tehnica este individual, lupta pe echipe, lupta regizata, cate 2, sau sincron cate 3. exista acolo restrictii de varsta, grad sau gen
  - Regulile sunt fixe per tip de competiție sau le configurezi manual pentru
   fiecare competiție? - tipul de competitie poate diferi de la o competitie la alta, depinde de specific, varsta sau categorie, daca e lupta sau tehnica

  10. Clasamentul final:
  - Se introduce manual după competiție, sau aplicația ar trebui să-l
  genereze din rezultatele introduse în timp real? - deocamdata nu facem inca acest lucru, poate pe viitor
  - Există medalii/puncte care se acumulează în timp pentru un clasament
  anual? - nu avem asa ceva, inca

  11. Stagii:
  - Un stagiu e un eveniment cu prezență marcată și o taxă de participare? - un eveniment cu prezenta, as gandi sa poata anunta daca poate veni la toate antrenamentele pentru gradul sau sau nu, exista taxa de participare, care nu este dependenta de numarul de antrenamente la care e prezent, doar taxa de competitie pe categorie.
  - Cine poate organiza stagii — doar federația sau și cluburile? - de obicei doar federatia face stagii

  ---
  Calendar public și comunicare

  12. Calendarul public:
  - Vizibil fără cont (oricine deschide site-ul) sau doar pentru utilizatorii
   autentificați? - doar pentru cei cu cont
  - Ce vede un vizitator: doar evenimentele federației, sau și antrenamentele
   cluburilor? - deocamdata fara vizitatori

  13. Email din aplicație:
  - Trimitere manuală (admin scrie și trimite) sau automată (ex: "ți-a
  expirat abonamentul")? - as dori sa automatizez emailul
  - Vrei să poți trimite email la toți sportivii unui club / toți dintr-o
  grupă / toți cu un anumit grad? - as dori sa pot trimite date la toti cand doresc



  Restricții de acces și vizibilitate per rol                                
                                                                             
  1. Instructorul:                                                           
  - Poate vedea datele financiare ale sportivilor (restanțe, chitanțe)? - da
  - Poate șterge sportivi sau doar adaugă/editează? - doar sa adauge, sa editeze (stergerea sa fie facuta cu acordul unui super vizor sau super admin)
  - Are acces la sportivii din toate grupele clubului sau doar la grupele
  lui? -toate grupele

  2. Asistentul de prezență:
  - Vede numele complet al sportivilor sau doar un identificator? numele sa poata realiza prezenta usor
  - Poate accesa istoricul prezențelor sau doar marchează azi? - doar de azi

  3. Părintele:
  - Dacă un copil împlinește 18 ani, contul de părinte își pierde automat
  accesul la el? - nu sa poata sa vada oricand
  - Poate părintele să modifice date personale ale copilului sau doar
  vizualizează? - poate sa solicite modificari, aprobate de admin club

  4. Arbitrul:
  - Vede datele personale ale sportivilor (CNP, adresă) sau doar nume +
  categorie? - nume si cateogrie

  ---
  Restricții de business — examene

  5. Condiții minime pentru a susține un examen:
  - Există un număr minim de antrenamente în perioada de la ultimul grad? - ar putea fi, daca doreste antrenorul
  - Există o perioadă minimă de timp între două grade (ex: minim 6 luni între
   grade)? - exista o perioada, apare in nomenclator grade
  - Viza medicală valabilă e obligatorie pentru a fi înscris la examen? - viza este obligatorie si trebuie evidentiat daca a expirat

  6. Promovarea gradului:
  - Dacă un sportiv pică examenul, poate fi reinscris imediat la același grad
   sau trebuie să aștepte? - poate sustine din nou examenul in urmatoarea sesiune
  - Există grade care nu pot fi sărite (trebuie luate în ordine strictă)? - daca are o anumita varsta, sustine un anumit examen de grad, apare tot in nomenclator grade

  ---
  Restricții de business — competiții

  7. Condiții pentru a participa la competiție:
  - Viza medicală valabilă e obligatorie? -da
  - Taxa de legitimație anuală plătită e obligatorie? -da
  - Există o vârstă minimă absolută pentru orice competiție? da, acum e 7 ani, dar e in functie de tipul competitiei, acolo sunt varstele la care se participa

  8. Categorii de greutate:
  - Există categorii fixe de greutate (ex: -50kg, -60kg, -70kg, +70kg) sau
  variază per competiție? - doar categorie de varsta si grad, feminin si masculin sau mixt
  - La tehnica și lupta regizată există categorii de greutate sau doar vârstă
   + grad? - sunt categorii de varsta, grad si sex

  ---
  Restricții GDPR și date sensibile

  9. Minori (sub 18 ani):
  - CNP-ul minorilor e stocat în aplicație? Dacă da, cine are acces la el? - sa fie acces restictionat, sa vada parintele si admin club, dar nu stiu cum, sa nu fie usor de accesat
  - Fotografia sportivului minor poate fi vizibilă altor utilizatori sau doar
   staff? - deocamdata doar staff

  10. Datele medicale:
  - Viza medicală — stochezi doar data expirării sau și documentul scanat? - doar data deocamdata
  - Există alte date medicale stocate (boli, alergii, contraindicații)? nu

  ---
  Restricții tehnice și operaționale

  11. Ștergerea datelor:
  - Un sportiv retras din club poate fi șters complet sau trebuie păstrat în
  arhivă (cu istoricul de prezențe, examene, plăți)? - de pastrat in arhiva
  - Un club poate fi șters din federație cu tot istoricul sau se arhivează? - arhivare

  12. Transferul unui sportiv între cluburi:
  - Istoricul complet (grade, prezențe, plăți) merge cu sportivul la noul
  club? - se transfera grade 
  - Fostul club mai vede datele sportivului după transfer? - nu este cazul

  13. Legitimația anuală:
  - E valabilă pe an calendaristic (Ian-Dec) sau pe 12 luni de la achitare? - sunt 2 taxe, una calendaristica, si una pe an scolar
  - Ce se întâmplă cu un sportiv cu legitimația expirată — e blocat de
  anumite funcționalități din aplicație? - daca nu a achitat, sa fie atentionat el si antrenorul pentru a putea sa achite


  ---
  Plan Înscriere Online — Secvențe Incrementale
  (adăugat 10 Apr 2026)

  SECVENȚA 1 — Formularul public de cerere ✅ IN LUCRU
  - Tabel cereri_inregistrare în DB (nume, prenume, data_nasterii, email, telefon, club_id, mesaj, status, token_unic)
  - Pagină publică /inscriere (fără autentificare)
  - Secțiune admin "Cereri înscriere" cu badge notificare
  - Status cerere: in_asteptare / aprobata / respinsa

  SECVENȚA 2 — Aprobare și creare sportiv
  - Admin aprobă cererea → formular sportiv pre-completat automat
  - Email confirmare la aprobare/respingere

  SECVENȚA 3 — Link personalizat per club
  - /inscriere/slug-club → formular adresat automat clubului
  - Admin copiază link din setări club

  SECVENȚA 4 — Notificări email automate
  - Email confirmare la trimitere cerere (solicitant)
  - Email notificare la admin (cerere nouă)
  - Email la aprobare/respingere

  SECVENȚA 5 — Contul de parinte/tutore
  - Tabel guardians + guardian_sportiv (many-to-many)
  - Rol nou PARINTE în utilizator_roluri_multicont
  - Parinte vede datele copilului după aprobare

  SECVENȚA 6 — GDPR + consimțăminte
  - Checkbox consimțământ GDPR la formular
  - Log acceptare stocat în DB

  SECVENȚA 7 — Plată online (viitor)
  - Integrare Netopia pentru taxa legitimație la aprobare

