# Faza 43 — decizii (14.11.2026)
- Management: user+parola+cod email DOAR pe dispozitiv nou (dispozitiv de incredere existent, login persistent 4.11.2026); fara delogare pe inactivitate.
- Acces extern (Faza 36/39, reprezentanti club): email+parola + "Am uitat parola"; INLOCUIESTE OTP; primul login seteaza parola.
- Atentie: regula "emailuri = info/cod, nu link actiune" => reset parola prin cod email. SMTP (32-08) inca blocat.

## Decizii confirmate la planificare (16.11.2026, raspunsuri Q1-Q3 din 43-RESEARCH.md)
- Q1: fara delogare la inactivitate PESTE TOT (sterge useExpirareInactivitate); pe dispozitiv nepersonal sesiunea ramane temporara pana la inchiderea browserului.
- Q2: in zona externa se ascund contextele privilegiate (ADMIN_CLUB/INSTRUCTOR/etc.) pana MFA e valid; pentru restul trimite la portalul principal pentru cod.
- Q3: bifa "dispozitiv personal" si in zona externa, implicit bifata.
