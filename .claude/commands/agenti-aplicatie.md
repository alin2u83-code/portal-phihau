# Skill: agenti-aplicatie

Când utilizatorul invocă `/agenti-aplicatie`, execută următoarele:

1. Verifică ce agenți există deja în `.claude/agents/`
2. Creează sau actualizează toți agenții specializați listați mai jos
3. Raportează ce agenți au fost creați/actualizați

## Agenții care trebuie să existe

Verifică dacă există și creează dacă lipsesc:

| Fișier agent | Domeniu |
|---|---|
| `sportivi-management.md` | CRUD sportivi, import/export, roluri |
| `plati-facturi.md` | Plăți, facturi, portofel, restanțe |
| `examene.md` | Sesiuni examene, rezultate, înscrieri |
| `competitii.md` | Competiții, categorii, fișe |
| `prezenta.md` | Prezență antrenamente, orar, rapoarte |
| `rls-securitate.md` | RLS Supabase, permisiuni, roluri |
| `audit-sistem.md` | Audit cross-domain, verificare erori |

Agenții deja existenți (nu suprascrie):
- `sportiv-dashboard.md`, `admin-club.md`, `grupe-orar.md`
- `responsive-mobile-tablet.md`, `autentificare.md`

## Cum creezi un agent lipsă

Folosește `Write` pentru a crea fișierul în `.claude/agents/<nume>.md` cu frontmatter corect și documentație despre domeniu, fișiere cheie, tabele Supabase, RLS, și rețeaua de agenți.

## Audit rapid după creare

După ce toți agenții există, rulează un audit rapid:
- Verifică că fiecare agent are secțiunea "Rețea de agenți"
- Confirmă că `audit-sistem.md` există și poate coordona ceilalți agenți
- Raportează lista completă de agenți activi

## Salvare bug-uri rezolvate în agenți

Când un bug este rezolvat, agentul care l-a reparat (sau `audit-sistem`) trebuie să:
1. Adauge o intrare în secțiunea "Probleme cunoscute rezolvate" din agentul domeniului afectat
2. Adauge aceeași intrare în tabelul din `audit-sistem.md`
3. Formatul înregistrării:
   ```
   | Problemă | Cauza rădăcină | Fix aplicat | Fișiere modificate |
   ```

Aceasta asigură că bug-urile rezolvate nu reapar și că toți agenții știu ce a fost fixat.
