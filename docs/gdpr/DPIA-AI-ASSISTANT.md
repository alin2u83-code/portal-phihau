# DPIA — Modulul AI Assistant (Portal PhiHau)

## Identificare document

| Câmp | Valoare |
|------|---------|
| Data redactării | 2026-09-03 |
| Versiune | 1.0 |
| Fază GSD | Faza 28 — Conformitate GDPR și AI Act pentru date personale sportivi, plan 28-02 |
| Autor | Agent executor GSD (Claude), sub coordonarea operatorului portal-phihau |
| Statut | **Draft tehnic** — necesită validare de către un consilier juridic / DPO înainte de a fi publicat ca document de referință în auditul GDPR. Documentul descrie exact ce face codul azi, verificat prin citire directă a fișierelor sursă, nu opinii juridice finale. |

## Descrierea sistemului

Modulul **AI Assistant** este un widget de ajutor contextual integrat în portal (`components/AIAssistant/`), disponibil pentru toți utilizatorii autentificați (SUPER_ADMIN_FEDERATIE, ADMIN_CLUB, INSTRUCTOR, SPORTIV). Combină două funcții:

1. **RAG (Retrieval-Augmented Generation)** peste o bază de cunoștințe statică (`knowledge_base`) — conținut de ajutor al aplicației (cum se adaugă un sportiv, cum se înregistrează o plată etc.), nu date personale ale sportivilor.
2. **Chat completion** — un model LLM extern (Groq, vezi mai jos) generează răspunsuri în limba română, folosind un "system prompt" construit dinamic din contextul sesiunii utilizatorului (rol, club, ecran curent) plus fragmentele RAG relevante.

**Clasificare AI Act (Reg. UE 2024/1689):** Sistemul intră sub obligațiile de **transparență** (art. 50) — utilizatorul trebuie informat că interacționează cu un sistem de inteligență artificială. Modulul **NU** este clasificat ca sistem cu risc ridicat conform Anexei III — nu ia decizii automate cu efect juridic sau similar semnificativ asupra unei persoane fizice (nu decide eligibilitate examen, nu calculează scoruri de risc, nu procesează date biometrice). Rolul lui este strict asistență informativă/navigațională.

## Fluxul de date analizat — fișierele reale

Lanțul de chat completion, verificat prin citirea codului sursă:

| Pas | Fișier | Funcție | Ce face |
|-----|--------|---------|---------|
| 1 | `contexts/AIAssistantContext.tsx` | `sendMessage()` | Colectează mesajul utilizatorului + istoricul conversației (`apiMessages`) și contextul sesiunii (`activeView`, `activeRole`, `clubName`) |
| 2 | `services/agents/orchestrator.ts` | `orchestrate()`, `selectAgent()` | Alege unul dintre cei 9 agenți de domeniu (routing pe ecran activ + cuvinte cheie), construiește promptul de sistem |
| 3 | `services/agents/*Agent.ts` (9 fișiere) | `buildSystemPrompt(ctx)` | Generează textul de sistem trimis modelului LLM, folosind câmpurile din `AgentContext` |
| 4 | `services/agents/orchestrator.ts` | `orchestrate()` | Apelează `fetch('/api/llm-proxy?provider=groq', ...)` cu `messages` + `system` |
| 5 | `api/llm-proxy.ts` | `handleGroq()` | Proxy server-side care adaugă cheia API (`GROQ_API_KEY`) și retransmite către API-ul extern Groq |
| 6 | API extern Groq (`api.groq.com`) | — | Generează răspunsul, model `llama-3.3-70b-versatile` |

Separat, lanțul RAG (independent de chat completion, rulează în paralel cu pasul 3):

| Pas | Fișier | Funcție | Ce face |
|-----|--------|---------|---------|
| R1 | `services/ragService.ts` | `searchKnowledgeBase()` | Trimite textul interogării utilizatorului către `/api/rag-search` |
| R2 | `/api/rag-search` | — | Generează un embedding al textului interogării via Google Gemini, caută similaritate vectorială (`pgvector`) în tabela `knowledge_base` |
| R3 | `services/ragService.ts` | `formatRAGContext()` | Formatează cele mai relevante fragmente găsite și le adaugă la promptul de sistem înainte de trimiterea către Groq (pasul 4 de mai sus) |

`services/ragService.ts` transmite **doar textul interogării** scrise de utilizator către serviciul de embeddings — nu transmite date personale ale sportivilor din baza de date (nu interoghează tabela `sportivi`), conform citirii directe a codului (`searchKnowledgeBase(query, options)` — singurul parametru de conținut este `query`).

Detalii suplimentare despre arhitectura RAG: `docs/RAG_IMPLEMENTARE.md`.

## Câmpuri efectiv trimise către fiecare API (stare POST-REQ-6)

**Către Groq, via `/api/llm-proxy?provider=groq` (pas 4-5 de mai sus):**

| Câmp | Tip | Sursă | Caracter personal |
|------|-----|-------|---------------------|
| `activeView` | string | Ecranul curent din aplicație (ex. `sportivi`, `examene`) | Nepersonal — identifică pagina, nu persoana |
| `userRole` | string | Rolul activ al sesiunii (ex. `ADMIN_CLUB`) | Nepersonal — categorie de rol, nu identifică individul |
| `clubName` | string, opțional | Denumirea clubului asociat rolului activ | Date de organizație, nu date ale unei persoane fizice |
| Conținutul mesajelor (`messages`) | text liber | Ce scrie efectiv utilizatorul în chat | **Risc rezidual** — textul poate conține date personale introduse VOLUNTAR de utilizator (ex. "cum modific CNP-ul lui Ionescu Andrei?") |

**`userName` a fost ELIMINAT în Faza 28 (planul 28-02, task 1).** Înainte de acest fix, fiecare mesaj din AI Assistant includea în promptul de sistem numele complet al utilizatorului logat (`${currentUser.nume} ${currentUser.prenume}`), fără bază legală documentată și fără necesitate funcțională — modelul nu folosea această informație pentru a răspunde corect. Verificare: `grep -rn "userName" services/ contexts/ components/` returnează zero rezultate după implementare.

**Către Google Gemini, via `/api/rag-search` (pas R2):**

| Câmp | Tip | Caracter personal |
|------|-----|---------------------|
| Textul interogării | text liber | Poate conține, teoretic, date introduse voluntar de utilizator în bara de căutare — risc similar și cu aceeași măsură compensatorie ca la Groq |

## Cod inactiv

`services/claudeService.ts` există în repository dar are **zero call-site-uri** — nicio componentă sau context nu importă `askClaude` din acest fișier (verificat prin grep, confirmat în `28-RESEARCH.md`, Critical Finding #1). Fluxul live de chat completion folosește exclusiv `services/agents/orchestrator.ts` → `services/agents/*Agent.ts`, nu `services/claudeService.ts`.

Decizia de a păstra fișierul (nu a fost șters) e documentată ca fiind în afara scope-ului acestei faze (`28-RESEARCH.md`, Open Question 2). Ca măsură de conformitate preventivă, câmpul `userName` a fost eliminat și din acest fișier mort în Faza 28, pentru ca un refactor viitor să nu copieze un pattern non-conform dintr-un fișier existent în repo. Recomandare pentru o fază viitoare: fie ștergerea completă a fișierului, fie conectarea lui la un buton explicit de UI dacă se dorește un al doilea furnizor de chat activ.

## Riscuri identificate

| Risc | Probabilitate | Impact | Măsură aplicată |
|------|---------------|--------|-------------------|
| Transmiterea numelui complet al utilizatorului către un procesator extern (Groq) la fiecare mesaj din chat | Certă (înainte de fix) | Mediu — date de identificare directă expuse fără bază legală documentată | **REDUS LA ZERO** prin REQ-6 (Faza 28, planul 28-02, task 1): `userName` eliminat din `AgentContext`, din toate cele 9 `buildSystemPrompt()`, din `contexts/AIAssistantContext.tsx` și din `services/claudeService.ts` |
| Utilizatorul introduce voluntar date personale (nume, CNP, alte date ale unui sportiv) în textul liber al chatului, care ajung la Groq | Posibilă, imprevizibilă | Mediu — depinde de conținutul efectiv scris | **Risc rezidual, acceptat.** Nu poate fi eliminat tehnic fără filtrare de conținut (în afara scope-ului SPEC.md). Măsură compensatorie: notă de transparență vizibilă în widget-ul de chat + politică de retenție a istoricului de conversație (de definit — vezi Concluzii) |
| Transfer de date în afara UE către Groq Inc. (Statele Unite ale Americii) | Certă — Groq este furnizorul activ | Mediu — necesită mecanism legal de transfer (SCC) | Necesită Clauze Contractuale Standard (SCC) / Acord de procesare a datelor (DPA) semnat cu Groq. Detalii, status și acțiuni restante: `docs/gdpr/SUBPROCESATORI.md` |
| Lipsă de transparență AI Act — utilizatorul nu este informat explicit că interacționează cu un sistem AI | Certă (stare curentă, neverificată în acest plan) | Scăzut-Mediu — obligație de transparență AI Act art. 50 | Măsură recomandată: etichetă vizibilă ("Asistent AI") în widget-ul de chat, deja parțial prezentă prin denumirea "AI Assistant" în UI; verificare completă recomandată într-o fază viitoare dedicată UI-ului |
| RLS spartă la nivel de bază de date ar putea expune date personale prin alte fluxuri (nu prin AI Assistant direct, dar relevant pentru harta generală de risc) | Redusă — audituri anterioare au reparat majoritatea găurilor cunoscute | Ridicat, dacă s-ar materializa | Fazele 15, 16 și 25 (deja executate) au reparat politicile RLS identificate; risc rezidual documentat separat în `STATE.md` (Blockers/Concerns) |

## Concluzie și măsuri restante

Implementarea din Faza 28 (planul 28-02) elimină singurul flux confirmat de transmitere a unui identificator direct de persoană fizică (`userName`) către un procesator extern, în întregul lanț real de cod (`services/agents/*`), nu doar în fișierul mort vizat inițial de textul literal al SPEC.md.

Măsuri restante, care depășesc scope-ul acestui plan:

1. **Validare juridică** a acestui document de către un consilier juridic sau un responsabil cu protecția datelor (DPO) — numirea unui DPO este explicit în afara scope-ului acestei faze (vezi `28-SPEC.md`).
2. **Confirmarea operațională** că `GROQ_API_KEY` și `GEMINI_API_KEY` sunt configurate corect în mediul de producție Vercel, și că nu există chei reziduale neutilizate care ar extinde suprafața de risc.
3. **Decizie privind istoricul conversațiilor** — dacă mesajele din AI Assistant sunt persistate (în prezent, verificarea codului nu a identificat persistare server-side a istoricului de chat dincolo de starea sesiunii client — de confirmat explicit într-un audit separat) și, dacă da, ce politică de retenție se aplică.
4. **Obținerea și arhivarea DPA/SCC semnat cu Groq Inc.** — acțiune tratată integral în `docs/gdpr/SUBPROCESATORI.md`.
5. **Verificarea etichetei de transparență AI Act** în UI-ul widget-ului de chat — recomandat ca task separat într-o fază viitoare axată pe UI.
