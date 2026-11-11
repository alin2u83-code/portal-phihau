# Reprezentantul schimba gradul direct in competitie (cerere utilizator, 12.11.2026)

Cerere: din zona de competitie (cont de club, rol REPREZENTANT_COMPETITIE, `/competitie`) reprezentantul sa poata **schimba gradul**
unui sportiv, si, in acelasi fel, sa **adauge sportivi noi** si sa **activeze sportivi vechi**. "Totul cat mai simplu de gestionat."
Nu e implementat. Azi se face doar din portalul principal (ADMIN_CLUB/SUPER_ADMIN) sau din "Management club" cu management acordat.

## Cazul care a declansat cererea
Competitia Co Vo Dao (Roman 2026), Song Luyen feminin 13-15 ani (categorie 1-4 Cap Albastru, grad ordine 15-18). BALMUS si SFICA (C.S. Phi Hau,
13 ani, Bong ales) au `C.V. 2 Cap Alb` (ordine 12) → nu au categorie. La 13 ani gradul se schimba prin examen de echivalare (factura 0);
instructorul acorda gradul real. Fix-uri deja facute si pushate: 4edd696 (contor Pas3 = regula modalului), 8aeab4e (mesaj corect + lista sportivilor
fara categorie). Gradul fetelor NU a fost schimbat inca (DB: ordine 12, 12.11.2026).

## Constrangeri / ce trebuie decis (nu e reparatie rapida)
- `components/Competitii/index.tsx:213`: `canEditGrad = !extern && ...` → butonul "Schimba grad" (Pas1.tsx ~327, SchimbaGradModal.tsx) e ascuns in zona externa.
- Faza 39 D-05/D-16/D-17: tot ce tine de sportivii clubului = Management (acordat de proprietar); fara acces → demo read-only. D-20 prevede audit cu autor
  declarat pe `istoric_grade`, dar RLS pe `sportivi`/`istoric_grade` nu e deschis contului extern (de verificat in pg_policies live).
- Date de minori scrise prin contul comun al clubului → GDPR, autor declarat in audit (garda 20261111g cere sesiune de autor pentru REPREZENTANT).
- Alternativa mai mica: "Cere schimbare grad / activare" → cerere vizibila adminului clubului (fara scriere directa).
- Utilizatorul a ales (12.11) temporar "ramane prin Management club"; apoi a cerut aceasta functie ca to-do → de planificat ca faza GSD noua.

## De facut (propunere)
- [ ] Decizie: scriere directa (RLS nou pe sportivi + istoric_grade, doar clubul propriu, autor declarat, teste cross-club) vs cerere catre admin.
- [ ] `/gsd-discuss-phase` + `avocat-diavol` (agentul a respins deja scrierea automata/anticipata a gradului: A/B; C = modalul existent).
- [ ] SchimbaGradModal: nota implicita sa spuna "Echivalare ..." + cine a aprobat (audit nu pastreaza motivul).
- [ ] Regula "2 sportivi la aceeasi arma" din contorul Pas3 (preexistenta) vs modal (un singur sportiv): de decis separat.
- [ ] Lista de autori "Cine lucreaza?": 3 intrari "Fara nume · Administrator club" + "Instructor Phi Hau · Administrator club" (nume lipsa) — curatare date/cache.
