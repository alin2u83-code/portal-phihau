# RAG — Implementare Portal PhiHau

## Ce este RAG (recap)

RAG = **R**etrieval-**A**ugmented **G**eneration. Înainte de a genera un răspuns, modelul AI face o căutare semantică într-o bază de cunoștințe proprie și primește contextul relevant direct în prompt.

Fără RAG: Claude răspunde doar din training data (poate fi inexact, generic).  
Cu RAG: Claude răspunde bazat pe informații reale din aplicația ta.

---

## Arhitectura în Portal PhiHau

```
User: "Cum adaug un sportiv?"
            │
            ▼
   Generare embedding query        ← Gemini text-embedding-004
   (768 numere care reprezintă sensul)
            │
            ▼
   Vector search în Supabase       ← pgvector + cosine similarity
   (găsește cele mai apropiate chunks din knowledge_base)
            │
            ▼
   Top 3-5 chunks relevante
   ┌─────────────────────────────┐
   │ "Adăugare sportiv: Navighează│
   │  la Sportivi → buton +Nou..."│
   └─────────────────────────────┘
            │
            ▼
   Injectate în system prompt     ← orchestrator.ts
   (înainte de apelul Claude)
            │
            ▼
   Claude generează răspuns       ← cu context real, nu din imaginație
```

---

## Componente

### 1. Vector Store: pgvector în Supabase
- Extensie PostgreSQL inclusă nativ în Supabase (gratuit)
- Tabel `knowledge_base` cu coloana `embedding vector(768)`
- Index IVFFlat pentru nearest-neighbor search rapid
- Funcție SQL `match_knowledge_base()` cu cosine similarity

### 2. Embedding Model: Gemini text-embedding-004
- **Gratuit**: 1500 request-uri/zi, 1M tokens/minut pe free tier
- **768 dimensiuni** — echilibru calitate/performanță
- Pachetul `@google/generative-ai` **deja instalat** în proiect

### 3. API Endpoints Vercel
| Endpoint | Metodă | Scop |
|----------|--------|------|
| `/api/rag-search` | POST | Caută semantic în knowledge base |
| `/api/rag-index` | POST | Indexează un document nou |

### 4. Service Client: `services/ragService.ts`
- `searchKnowledgeBase(query, options)` — apelat din browser/orchestrator
- `formatRAGContext(chunks)` — formatează chunks pentru system prompt

### 5. Integrare: `services/agents/orchestrator.ts`
- `orchestrate()` face search RAG în **paralel** cu construirea system prompt
- Adaugă contextul găsit la final de system prompt
- **Fail-safe**: dacă RAG eșuează, conversația continuă normal

---

## Setup Inițial (o singură dată)

### Pasul 1: Activare pgvector în Supabase
```
Supabase Dashboard → Database → Extensions → căutare "vector" → Enable
```

### Pasul 2: Rulare migration SQL
```
Supabase Dashboard → SQL Editor → copiezi conținutul din:
sql/migrations/add_rag_knowledge_base.sql
→ Run
```

### Pasul 3: Obține GEMINI_API_KEY (gratuit)
1. Mergi la https://aistudio.google.com/app/apikey
2. Sign in cu cont Google
3. "Create API key" → copiezi cheia

### Pasul 4: Adaugă variabilele de mediu

**În `.env` local:**
```env
GEMINI_API_KEY=AIza...
RAG_INDEX_SECRET=un_secret_random_ales_de_tine
```

**În Vercel Dashboard** (Settings → Environment Variables):
```
GEMINI_API_KEY = AIza...
RAG_INDEX_SECRET = același_secret
```

### Pasul 5: Indexare knowledge base inițial
```bash
npx tsx scripts/index-knowledge-base.ts
```
Scriptul indexează toate fișierele din `knowledge/` folder.

---

## Structura knowledge/ (unde scrii cunoștințele)

```
knowledge/
  sportivi.md       ← ghid gestionare sportivi
  examene.md        ← ghid examene și grade
  grupe.md          ← ghid grupe și orar
  prezenta.md       ← ghid prezență
  financiar.md      ← ghid plăți și taxe
  admin.md          ← ghid administrare
  general.md        ← reguli generale, FAQ
```

### Format fișier knowledge

Fiecare secțiune devine un **chunk** separat în vector store:

```markdown
## Cum adaug un sportiv nou

Navighează la Sportivi → click butonul "+ Sportiv Nou" din dreapta sus.
Completează câmpurile obligatorii: Nume, Prenume, Data nașterii, Email.
Clubul este setat automat. Salvează cu butonul verde.

---

## Cum import sportivi din Excel

Mergi la Sportivi → Import. Descarcă template-ul Excel. 
Completează datele (un sportiv per linie). 
Upload fișier → Previzualizare → Confirmare import.
Câmpuri obligatorii: nume, prenume, data_nasterii.
```

Separatorul `---` delimitează chunk-urile. Titlul `##` devine titlul chunk-ului.

---

## Cum adaugi documente noi după setup

### Opțiunea 1: Editezi fișierele .md și rerulezi scriptul
```bash
# editezi knowledge/sportivi.md
npx tsx scripts/index-knowledge-base.ts --clear sportivi
```
Flag-ul `--clear <category>` șterge chunk-urile vechi înainte de reindexare.

### Opțiunea 2: API direct (pentru documente dinamice)
```bash
curl -X POST https://portal-phihau.vercel.app/api/rag-index \
  -H "Content-Type: application/json" \
  -H "x-index-secret: secretul_tau" \
  -d '{
    "title": "Procedura de examen grad 3",
    "content": "Pentru examenul de grad 3 sunt necesare...",
    "category": "examene",
    "source": "manual"
  }'
```

---

## Categorii disponibile
Mapate pe agenții existenți:

| Categorie | Agent | Ce indexezi |
|-----------|-------|-------------|
| `sportivi` | Sportivi | CRUD sportivi, import, profile |
| `examene` | Examene | Sesiuni, grade, înscrieri |
| `grupe` | Grupe | Orar, antrenamente, stagii |
| `prezenta` | Prezenta | Pontaj, rapoarte prezență |
| `financiar` | Financiar | Plăți, taxe, rapoarte |
| `admin` | Admin | Roluri, setări club, utilizatori |
| `rapoarte` | Rapoarte | Tipuri rapoarte, export |
| `legitimatii` | Legitimatii | Generare, vizualizare |
| `general` | General | Orice nu se încadrează |

---

## Monitorizare și debug

### Verifică ce e indexat
```sql
SELECT category, COUNT(*) as chunks, 
       AVG(length(content))::int as avg_chars
FROM knowledge_base 
GROUP BY category
ORDER BY category;
```

### Testează similaritate direct
```sql
-- Caută manual (după activare pgvector)
SELECT title, category, similarity
FROM match_knowledge_base(
  (SELECT embedding FROM knowledge_base LIMIT 1),
  0.5, 5, NULL
);
```

### Logs RAG în consolă
Browserul afișează în consolă `[RAG] X chunks found for: "..."` 
când sunt găsite rezultate relevante.

---

## Flow complet la runtime

```
1. User scrie mesaj în AI Assistant chat
2. orchestrate() în orchestrator.ts este apelat
3. În PARALEL:
   a. selectAgent() → alege agentul potrivit
   b. searchKnowledgeBase() → vector search în Supabase
      ├── POST /api/rag-search cu mesajul user
      ├── Vercel function generează embedding (Gemini)
      ├── pgvector găsește top-5 chunks similare
      └── Returnează chunks cu similarity score
4. system prompt = agent.buildSystemPrompt() + formatRAGContext(chunks)
5. POST /api/claude-proxy cu system prompt îmbogățit
6. Claude răspunde cu informații concrete din knowledge base
```

---

## Performance

- Embedding generation: ~200-400ms (Gemini API)
- Vector search: ~10-50ms (pgvector)
- Total overhead RAG: **~250-450ms** față de fără RAG
- Apelul RAG e în paralel cu construirea prompt-ului → overhead real: ~200ms

---

## Limitări free tier Google AI

| Limită | Valoare |
|--------|---------|
| Requests/zi | 1500 |
| Requests/minut | 1500 |
| Tokens/minut | 1,000,000 |

La utilizare normală (chat asistent), aceste limite sunt mai mult decât suficiente.
