---
created: 2026-09-01T19:04:52.150Z
title: Reactivare asistent AI dupa fix functionare
area: ui
files:
  - components/AppLayout.tsx (buton footer + <AIAssistantWidget /> comentate)
  - contexts/AIAssistantContext.tsx
  - components/AIAssistant/AIAssistantWidget.tsx
  - components/AIAssistant/index.ts
  - services/ragService (raspunsuri RAG)
  - docs/RAG_IMPLEMENTARE.md
---

## Problem

Asistentul AI (buton footer desktop + widget floating) dezactivat temporar in `components/AppLayout.tsx` — nu functiona corect (raspunsuri gresite/incomplete din RAG). Scos din UI ca sa nu induca in eroare utilizatorii pana se repara.

## Solution

1. Debug pipeline RAG (Gemini embeddings + pgvector + Claude API) — vezi docs/RAG_IMPLEMENTARE.md — gaseste de ce raspunsurile nu sunt corecte.
2. Odata reparat si validat, decomenteaza in AppLayout.tsx:
   - butonul "Asistent AI" din footer (linia ~114 zona, cauta comentariul "Buton AI dezactivat temporar")
   - `<AIAssistantWidget activeRole={activeRole} />` (cauta comentariul "AI Assistant dezactivat temporar")
3. Testeaza cateva intrebari reale inainte de a redeclara functional.
