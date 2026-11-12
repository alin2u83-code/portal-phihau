# Faza 40 — decizii utilizator la întrebările avocat-diavol (12.11.2026)

- **U1 (limită promovare)**, cuvintele utilizatorului: "daca ultima modificare are sub 8 luni, +1 pentru grade rosii, peste 11 luni pentru grade albe sau albastre, la centuri negre, in functie de tabelul de grad". CONFIRMAT de utilizator ("este bine asa"): regula depinde de timpul scurs de la ultima modificare de grad si de familia gradului (rosu / alb-albastru / negru). Negru = `grade.timp_asteptare`. `grade.timp_asteptare` (text, ex. "6 luni") exista deja: rosu 4-6 luni, alb/albastru 10-12 luni, negru 12-96 luni.
- **U2**: doar undo, fără retrogradare reală în v1 (undo = DELETE controlat pe rândul creat de RPC; retrogradare cu motiv RĂMÂNE în afara v1).
- **U3**: maparea echivalării se ia din tabelul `grade` existent (nu tabel nou de mapare). De verificat: ordine +4 (11→15, 12→16, 13→17, 14→18) și Violet (ordine 10, min 8 ani) fără corespondent evident.
- **U4**: "examen de achitat" = doar stare (nu NotificationBell).
- **U5**: gradul se schimbă peste tot (global, în toate competițiile).
- **U6**: competiția are restricție să aibă deadline (deadline obligatoriu: constrângere/validare în DB + UI; backfill pt cele cu NULL).
- **U7**: v1 = doar grad. Arme și sportiv nou = faze ulterioare.
