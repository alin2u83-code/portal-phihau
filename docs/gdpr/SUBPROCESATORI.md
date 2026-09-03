# Registrul Subprocesatorilor — Portal PhiHau

## Identificare document

| Câmp | Valoare |
|------|---------|
| Data redactării | 2026-09-03 |
| Versiune | 1.0 |
| Fază GSD | Faza 28 — Conformitate GDPR și AI Act pentru date personale sportivi, plan 28-02 |
| Statut | **Draft tehnic** — derivat direct din codul sursă și configurația de deploy. Necesită validare de un consilier juridic / DPO și completarea acțiunilor restante marcate mai jos înainte de a fi tratat ca registru oficial în sensul art. 28 GDPR. |

Acest document listează furnizorii terți (subprocesatori) cărora aplicația le transmite date, derivați exclusiv din citirea codului sursă și a fișierelor de configurare — nu din contracte existente, care rămân de confirmat de operator.

## Tabel principal

| Subprocesator | Rol/Serviciu | Categorii de date primite | Locație prelucrare | Transfer extra-UE (SCC necesar?) | Status utilizare în producție | Link DPA public / acțiune necesară |
|---|---|---|---|---|---|---|
| **Supabase** | Bază de date PostgreSQL, autentificare, storage fișiere (poze/avataruri) | Practic toate datele personale ale sportivilor: nume, prenume, CNP, dată naștere, email, telefon, poze, date financiare (plăți), date de grad/examen | De confirmat de operator — regiunea proiectului Supabase (ex. `eu-central-1` vs. altă regiune) nu este specificată în cod (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) | De confirmat de operator, în funcție de regiunea aleasă la crearea proiectului | Activ — furnizorul principal de bază de date pentru întreaga aplicație | Acțiune: confirmarea regiunii proiectului în dashboard-ul Supabase și obținerea DPA-ului standard Supabase (disponibil public la supabase.com/legal). Migrarea infrastructurii este explicit în afara scope-ului acestei faze — se documentează unde sunt datele azi, nu se propune mutarea lor. |
| **Groq Inc.** | Chat completion (generare răspunsuri text) pentru modulul AI Assistant | Promptul de sistem (`activeView`, `userRole`, `clubName` — fără `userName`, eliminat în Faza 28) + textul mesajelor scrise de utilizator în chat (poate conține date personale introduse voluntar) | Statele Unite ale Americii | **Da** — transfer extra-UE, necesită Clauze Contractuale Standard (SCC) | **ACTIV** — `api/llm-proxy.ts` are `provider = 'groq'` ca valoare implicită și `services/agents/orchestrator.ts` apelează explicit `/api/llm-proxy?provider=groq` la fiecare mesaj din chat | Variabilă: `GROQ_API_KEY`. Acțiune: obținerea și arhivarea unui DPA/SCC semnat cu Groq Inc.; verificarea politicii Groq privind retenția și folosirea datelor pentru antrenarea modelelor (neverificat — vezi `28-RESEARCH.md` Assumption A2). |
| **Google (Gemini)** | Generare embeddings vectoriale pentru căutarea semantică RAG (`knowledge_base`) | Textul interogării scrise de utilizator în widget-ul AI Assistant, transmis către `/api/rag-search` (confirmat prin `services/ragService.ts` — nu interoghează tabela `sportivi`, deci nu transmite date personale ale sportivilor) | De confirmat de operator (regiune procesare Google Cloud, dependentă de configurația API-ului Generative Language) | Probabil da, de confirmat de operator | Activ — folosit pentru generarea embeddings-urilor RAG | Variabilă: `GEMINI_API_KEY`. Acțiune: confirmarea termenilor Google privind reținerea datelor de interogare și obținerea DPA-ului aferent Google Cloud/Generative AI. |
| **Anthropic (Claude)** | Cale de cod prezentă pentru chat completion, neapelată de interfața live | N/A în producție — cod prezent, neinvocat de UI (verificat: zero call-site-uri către `services/claudeService.ts`, `28-RESEARCH.md` Critical Finding #1) | Statele Unite ale Americii (dacă ar fi activat) | Da, dacă ar fi activat — necesită SCC | **Cod prezent, neinvocat de UI** — `api/llm-proxy.ts` suportă `provider=claude` folosind `CLAUDE_API_KEY`, dar nicio componentă din aplicație nu apelează această cale azi | Acțiune: de confirmat de operator dacă `CLAUDE_API_KEY` este setată în mediul Vercel de producție; dacă da, decizie explicită dacă rămâne configurată "la rezervă" fără a fi folosită sau dacă se elimină din mediul de producție pentru a reduce suprafața de risc. Nu se afirmă aici dacă cheia este sau nu configurată (neverificat — `28-RESEARCH.md` Open Question 3). |
| **Furnizor SMS** (configurabil: `android_gateway` \| `smslink` \| `twilio` \| `vonage`) | Trimitere notificări SMS către sportivi/părinți (ex. restanțe la plată) | Număr de telefon + conținutul mesajului SMS | Variază după opțiunea aleasă per club | Variază — `android_gateway` este infrastructură auto-găzduită (fără transfer către un vendor SaaS extern); `smslink`/`twilio`/`vonage` sunt vendori SaaS terți reali, posibil cu transfer extra-UE | `android_gateway` este valoarea implicită (`SMS_PROVIDER=android_gateway` în `.env.example`) — infrastructură auto-găzduită, NU este un subprocesator SaaS extern și nu necesită DPA separat. Orice club care rulează efectiv `smslink`, `twilio` sau `vonage` are un subprocesator terț real care necesită DPA propriu, per club (RESEARCH.md Assumption A3). | Acțiune: pentru fiecare club care folosește un provider SMS diferit de `android_gateway`, se identifică furnizorul efectiv configurat și se obține DPA-ul corespunzător. Variabile relevante: `SMS_PROVIDER`, `SMS_CALLBACK_SECRET`, `ANDROID_GATEWAY_URL`, `ANDROID_GATEWAY_TOKEN`. |
| **Vercel** | Găzduire aplicație (frontend static) și execuție funcții serverless (API endpoints, inclusiv `api/llm-proxy.ts`) | Trafic HTTP, adrese IP ale vizitatorilor, log-uri de request/response ale funcțiilor serverless | De confirmat de operator (regiunea funcțiilor Vercel, configurabilă în `vercel.json` sau dashboard) | De confirmat de operator | Activ — platforma de deploy pentru întreaga aplicație (`vercel.json` configurează rewrite-uri SPA și headere de cache/securitate) | Acțiune: confirmarea regiunii de deploy și obținerea DPA-ului standard Vercel (disponibil public la vercel.com/legal/dpa). |

## Acțiuni restante

- [ ] Obținerea și arhivarea unui Acord de Procesare a Datelor (DPA) semnat, per furnizor, pentru toți subprocesatorii marcați "Activ" în tabelul de mai sus (Supabase, Groq, Google/Gemini, Vercel, plus furnizorii SMS terți efectiv folosiți de fiecare club).
- [ ] Confirmarea regiunii de procesare pentru proiectul Supabase (UE vs. non-UE).
- [ ] Confirmarea, în mediul de producție Vercel, a căror chei API sunt efectiv setate (`GROQ_API_KEY`, `GEMINI_API_KEY`, `CLAUDE_API_KEY`) — și eliminarea celor neconfigurate/nefolosite dacă `CLAUDE_API_KEY` nu este necesară.
- [ ] Verificarea termenilor Groq privind retenția conversațiilor și eventuala folosire a datelor transmise pentru antrenarea de modele viitoare (neverificat în acest plan — `28-RESEARCH.md` Assumption A2).
- [ ] Pentru fiecare club care folosește `SMS_PROVIDER` diferit de `android_gateway`: identificarea furnizorului real configurat și obținerea DPA-ului aferent.

## Metodologie

Lista de mai sus a fost derivată strict din trei surse verificabile în cod:

1. **`api/llm-proxy.ts`** — identifică furnizorii de LLM configurați (`groq` implicit, `gemini`, `claude`) și variabilele lor de mediu (`GROQ_API_KEY`, `GEMINI_API_KEY`, `CLAUDE_API_KEY`).
2. **`.env.example`** — listează variabilele de configurare pentru Supabase și pentru sistemul de notificări SMS (`SMS_PROVIDER` cu cele 4 opțiuni disponibile).
3. **`vercel.json`** — confirmă Vercel ca platformă de găzduire și execuție a funcțiilor serverless.

Această listă **trebuie re-verificată la orice integrare nouă** de serviciu extern (un nou furnizor de plăți, un nou serviciu de email, o nouă integrare AI etc.) — orice adăugare de variabilă de mediu care conectează aplicația la un serviciu extern al unui terț trebuie reflectată aici înainte de a fi pusă în producție.
