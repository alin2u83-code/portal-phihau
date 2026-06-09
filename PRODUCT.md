# Product

## Register

product

## Users

**Admini de club (ADMIN_CLUB)** — gestionează zilnic sportivi, grupe, plăți, examene; context de birou sau sală; sesiuni de lucru de 10-30 min, sarcini repetitive.

**Instructori (INSTRUCTOR)** — marchează prezența, consultă orarele și grupele; context de sală, deseori pe mobil între antrenamente.

**Admini federație (SUPER_ADMIN_FEDERATIE)** — vizualizare cross-club, rapoarte, competiții, configurare grade; sesiuni mai rare, decizii strategice.

**Sportivi (SPORTIV)** — consultare dashboard personal: plăți, grad actual, prezență, competiții înscrise; utilizare ocazională.

Job principal: operațiuni rapide și fără erori pe ciclul complet al unui practicant — înregistrare → antrenamente → examene de grad → competiții → plăți.

## Product Purpose

Portal web pentru Federația QwanKiDo România și cluburile afiliate. Gestionează ciclul complet al unui practicant de arte marțiale. Țintă: 35 cluburi, 3500+ sportivi.

Succes = admin de club finalizează o sarcină (înregistrare sportiv, marcare prezență, generare factură) în sub 3 click-uri, fără ambiguitate, fără erori de date.

## Brand Personality

**Disciplinat, precis, autoritar, respectuos.** Tonul instituției serioase — nu corporație, nu startup. Ca un antrenor de arte marțiale: direct, competent, fără ornamente inutile. Interfața transmite că datele sunt corecte și că sistemul știe ce face.

## Anti-references

- **Strava / Garmin** — gamification, metrici de fitness, tone consumer; portalul e instrument de administrare, nu motivator personal
- **SAP / Salesforce** — rigiditate vizuală, text dens, UX de ERP; portalul trebuie să fie fluent, nu intimidant
- **FFA / FIFA portals** — birocrație vizuală, tabele interminabile, design instituțional îmbătrânit
- **SaaS generic 2026** — fundal cream, gradient purple, glassmorphism decorativ, eyebrows cu tracking, pattern AI-slop

## Design Principles

1. **Precizie înainte de decorație** — fiecare element vizual câștigă locul prin funcție. Dacă nu ajută la scanare, navigare sau înțelegere, dispare.
2. **Autoritate fără rigiditate** — ierarhia de roluri se reflectă în interfață (ce vede fiecare rol), dar navigarea trebuie să fie fluentă, nu descurajantă.
3. **Claritate imediată a datelor** — tabele, liste, statistici scanabile în sub 2 secunde. Nicio decorație care obstrucționează datele.
4. **Complexitate câștigată** — suprafețe simple la primul contact, profunzime la cerere. Nu expune toate funcțiile simultan.
5. **Disciplina vizuală dark** — tema întunecată reflectă atmosfera concentrată a antrenamentului de arte marțiale; nu dark "pentru că e cool", ci dark ca stare de spirit.

## Accessibility & Inclusion

**WCAG 2.1 AAA** — federație națională cu utilizatori diversi, posibil cu dizabilități vizuale.

- Contrast text ≥ 7:1 (AAA body), ≥ 4.5:1 (large text)
- Navigare completă keyboard
- Screen reader support (ARIA roles, live regions pentru notificări)
- `prefers-reduced-motion` respectat pentru toate animațiile
- Touch targets ≥ 44×44px (instrutorii folosesc pe mobil în sală)
