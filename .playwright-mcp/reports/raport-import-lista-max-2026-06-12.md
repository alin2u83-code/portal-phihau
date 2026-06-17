# Raport Import Sportivi — Kim Long Dao Fălticeni — 2026-06-12

## Rezumat

| Categorie | Valoare |
|-----------|---------|
| Fișier sursă | `lista max.xlsx` (Sheet1) |
| Club destinație | **Kim Long Dao Fălticeni** |
| Total rânduri în Excel | 119 |
| Sări peste (fără CNP) | 4 |
| Pregătiți pentru import | 115 |
| Analizați | 115 |
| Statut analiză | ✅ Toți 115 = **NOU** (niciun duplicat detectat) |
| Import executat | ✅ "Finalizeaza Import (115 sportivi)" confirmat |
| Rezultat final | Dashboard afișat → import reușit |

## Fix aplicat: Selector club pentru SUPER_ADMIN

**Problema:** `ImportSportiviPage` lua `club_id` din rolul primar al utilizatorului (`is_primary = true`), ignorând contextul activ. Pentru SUPER_ADMIN_FEDERATIE, importul mergea la clubul primar, nu la clubul dorit.

**Fix:** Adăugat selector "Club destinație import" vizibil doar pentru `isFederationAdmin`. SUPER_ADMIN poate alege orice club din federație înainte de a importa.

**Fișier modificat:** `components/Sportivi/ImportSportiviPage/index.tsx` (v2.1.0)

## Sportivi importați (115)

| # | Nume | Prenume | Data nașterii | Sex |
|---|------|---------|--------------|-----|
| 1 | AIOANEI | TUDOR FLORIN | 2011-03-23 | M |
| 2 | ALEXANDRU | MARIA RENATA | 2012-12-27 | F |
| 3 | AMARIEI | ALBERT-MATEI | 2014-04-09 | M |
| 4 | AMARIEI | ALEXANDRU LUCIAN | 2014-07-25 | M |
| 5 | AMARIEI | ȘTEFAN-ANDREI | 2012-10-04 | M |
| 6 | ANDREI | ALEXANDRU-DANIEL | 2016-05-05 | M |
| 7 | ANDREI | PAUL-CRISTIAN | 2013-05-15 | M |
| 8 | ANECHIFORESEI | GABRIELA | 2013-09-04 | F |
| 9 | APOSTOL | ANDREEA | 2010-05-31 | F |
| 10 | AVĂDANEI | ROBERT ANDREI | 2009-11-28 | M |
| 11 | BĂEȘU | TEODOR | 2017-03-17 | M |
| 12 | BABICI | MIHAI GABRIEL | 2013-11-21 | M |
| 13 | BABICI | MARIA EFREMIA | 2017-01-25 | F |
| 14 | BRĂNEANU | PETRU SEBASTIAN | 2017-04-04 | M |
| 15 | BRAȘOV | ANDREEA -ELENA | 2012-07-26 | F |
| 16 | BOCA | CRISTIAN-NICOLAS | 2013-11-04 | M |
| 17 | BOLOHAN | VLAD | 2014-12-21 | M |
| 18 | BURLEA | KEVIN-MATEI | 2018-01-20 | M |
| 19 | CĂLUȘERIU | CARMEN IONELA | 2010-01-12 | F |
| 20 | CĂLUȘERIU | SEBASTIAN | 2011-10-17 | M |
| 21 | CERCEL | CRISTIAN GABRIEL | 2016-09-21 | M |
| 22 | CERCEL | IOANA-MELISA | 2020-01-05 | F |
| 23 | CEPARU | TEOFANA MARIA | 2017-05-29 | F |
| 24 | CERVINSKI | ANA | 2008-10-18 | F |
| 25 | CHITICARU | ERICA ELENA | 2016-10-28 | F |
| 26 | CHIHAIA | ANDREI NICOLAE | 2021-01-01 | M |
| 27 | CHIRILEASA | ȘTEFAN | 2015-06-23 | M |
| 28 | CHIȚESCU | RADU-DIMITRIE | 2020-02-20 | M |
| 29 | CIOBANU | ANTONIA | 2013-02-25 | F |
| 30 | CIOCÂRLAN | ADA ECATERINA | 2016-10-31 | F |
| 31 | CIOCÂRLAN | ARSENIE | 2016-10-10 | M |
| 32 | CIOCÂRLAN | RAMIN-DIMITRIE | 2014-10-22 | M |
| 33 | CIORNEI | ANAMARIA | 1984-12-17 | F |
| 34 | COJOCARU | DARIUS MATEI | 2013-06-18 | M |
| 35 | COSTAN | DARIUS GEORGIAN | 2016-03-19 | M |
| 36 | COSTEA | ȘTEFAN ANDREI | 2020-11-25 | M |
| 37 | COVACI | MIHAI RAREȘ | 2014-01-22 | M |
| 38 | CRISTINA | DARIUS-ANDREI | 2017-03-19 | M |
| 39 | CURECHERIU | ANTONIA MARIA | 2013-09-01 | F |
| 40 | CURCĂ | ANASTASIA IONELA | 2013-11-22 | F |
| 41 | DOCHIA | ȘTEFAN | 2011-09-30 | M |
| 42 | DELEANU GUȘĂ | EDEN MARIA | 2014-02-24 | F |
| 43 | DRUGĂ | NIKOLAS | 2018-12-11 | M |
| 44 | FODOR | IUSTINA MARIA | 2016-03-08 | F |
| 45 | GAVRIL | ȘTEFAN | 2017-04-18 | M |
| 46 | GRAUR | ANDREI ALEXANDRU | 2013-11-29 | M |
| 47 | GRAUR | CLAUDIA GEORGIANA | 2012-04-03 | F |
| 48 | GREȘANU | MARIA | 2015-06-26 | F |
| 49 | GRIGORAȘ | ROBERT ALEXANDRU | 2016-08-04 | M |
| 50 | GRIGORAȘ | ECATERINA | 2018-03-20 | F |
| 51 | GRIGORIU | IONUȚ-LUCA | 2016-06-01 | M |
| 52 | HOGAȘ | ILINCA OTEEA | 2019-07-04 | F |
| 53 | HOGAȘ | RAUL ȘTEFAN | 2017-09-18 | M |
| 54 | HLIHOR | IOAN | 2009-01-23 | M |
| 55 | HRESTIC | CRISTINA-ROSEMARIE | 2013-01-11 | F |
| 56 | HRISTEA | RAREȘ-IOAN | 2016-12-26 | M |
| 57 | IANCU | REBECA ELENA | 2015-07-06 | F |
| 58 | IUGA | TEODOR | 2020-10-21 | M |
| 59 | LĂMĂȘANU | ANASTASIA | 2016-08-29 | F |
| 60 | LĂMĂȘANU | ANDREI | 2020-02-25 | M |
| 61 | LĂMĂȘANU | MIRUNA-MARIA | 2017-01-05 | F |
| 62 | LAZNIUC | ANDREI | 2018-07-01 | M |
| 63 | LEVINSCHI | MATHIAS-LEON | 2017-12-31 | M |
| 64 | LIUȚĂ | MATEI | 2018-06-27 | M |
| 65 | LIUȚĂ | NATASHA ELENA MARIA | 2020-10-22 | F |
| 66 | MARTIAN | CRISTIAN | 2008-07-25 | M |
| 67 | MAYER | CARL OCTAV | 2017-09-05 | M |
| 68 | MIHAI | IOANA | 2013-05-24 | F |
| 69 | MIRON | ANDREI NECTARIE | 2014-12-17 | M |
| 70 | MIRON | REBECA | 2013-07-13 | F |
| 71 | MITU | IUSTIN ANTONIO | 2009-09-19 | M |
| 72 | MOROȘANU | IASMINA | 2014-03-01 | F |
| 73 | MOROȘANU | DAMIAN ȘTEFAN | 2014-11-22 | M |
| 74 | NECHITA | RAYSA THEODORA | 2017-07-21 | F |
| 75 | NEGOIȚĂ | MARIA-DANIELA | 2006-08-14 | F |
| 76 | NIȚĂ | ALEXANDRU | 2015-04-14 | M |
| 77 | NIȚĂ | ELIZA GABRIELA | 2010-03-10 | F |
| 78 | NISTOR | ANA | 2016-06-17 | F |
| 79 | ONISIE | CARLA IONELA | 2013-06-03 | F |
| 80 | ONOFREI | LUCA | 2015-10-01 | M |
| 81 | ONOFREI | MIRIAM | 2013-08-23 | F |
| 82 | PANDELEA | FLAVIUS-NICOLAS-IOAN | 2015-09-23 | M |
| 83 | PASINCIUC | FILIP | 2018-09-27 | M |
| 84 | PAVEL | OLIVIAN | 2019-01-21 | M |
| 85 | PINTILEI | DARIUS ANDREI | 2017-12-21 | M |
| 86 | PÎNZARU | DANIEL | 2017-03-13 | M |
| 87 | PÎRVU | RICARDO-IOAN | 2014-02-14 | M |
| 88 | PLEVIȚ | LUCA-NICOLAS | 2018-10-11 | M |
| 89 | POPOVICI | ANDREI-COSMIN | 2016-02-13 | M |
| 90 | RĂILEANU | ADINA CASIANA | 2017-09-13 | F |
| 91 | RADU | RAZVAN | 2014-12-22 | M |
| 92 | ROMAN | PETRU | 2017-04-06 | M |
| 93 | RUSU | ANDREEA ARIANA | 2017-05-21 | F |
| 94 | SANDU | FABIAN-IOAN | 2018-06-25 | M |
| 95 | SANDU | MARCU | 2013-10-19 | M |
| 96 | SECRIERIU | ELISA-REBECA | 2011-03-21 | F |
| 97 | SOLCANU | IOANA-ELIZA | 2014-06-02 | F |
| 98 | SPINARE | ALEXANDRU | 2016-02-05 | M |
| 99 | ȘOLDĂNESCU | ANISIA | 2016-07-24 | F |
| 100 | ȘOLDĂNESCU | MINA | 2018-03-10 | M |
| 101 | ȘOLDĂNESCU | MATEI | 2017-05-30 | M |
| 102 | TODICĂ | ANDREI | 2013-09-13 | M |
| 103 | TODICĂ | ELISA-MARIA | 2015-08-15 | F |
| 104 | TOMA | SOFIA MARIA | 2013-05-02 | F |
| 105 | TRIFAN | ANDREI STELIAN | 2013-02-24 | M |
| 106 | URSACHE | RADU-STEFAN | 2018-07-21 | M |
| 107 | VAMANU | LUCA | 2019-07-31 | M |
| 108 | VAMEȘU | DARIA-PARASCHIVA | 2017-10-15 | F |
| 109 | VASILIU | SABIN ANDREI | 2016-11-08 | M |
| 110 | VERDEȘ | VLADIMIR | 2019-02-15 | M |
| 111 | VICTORIA | ANA ELISABETA | 2010-07-05 | F |
| 112 | VIZITIU | ALEXANDRU-GABRIEL | 2016-01-12 | M |
| 113 | VIZITIU | ANDREI-IONUȚ | 2014-07-30 | M |
| 114 | VLASOV | ANDREI | 2014-05-28 | M |
| 115 | VADANA | ANA-TAISIA | 2015-04-09 | F |

## Sportivi neintrodusi (4 — fără CNP)

| Nume complet | Motiv |
|---|---|
| ANDON NICOLAS ALEXANDRU | Fără CNP — data nașterii necunoscută |
| BIVOLARU MARCO | Fără CNP — data nașterii necunoscută |
| NICAU IOANA | Fără CNP — data nașterii necunoscută |
| SANDU ELENA | Fără CNP — data nașterii necunoscută |

> Acești 4 sportivi trebuie adăugați manual cu datele complete.

## Note tehnice

- Deduplicare: toți 115 detectați ca NOU (niciun sportiv din Fălticeni nu exista anterior în DB)
- Data nașterii extrasă din CNP (format YYYY-MM-DD)
- Gen extras din CNP (cifra 1 = Masculin, cifra 2 = Feminin)
- CSV generat cu BOM UTF-8 pentru diacritice corecte
- Grad implicit: Debutant (implicit portalului)
