---
phase: quick
plan: 260705-1js
subsystem: api
tags: [vercel, serverless-functions, refactor, deploy]

requires: []
provides:
  - "api/sms.ts — inlocuieste sms-send.ts, sms-status.ts, sms-test-connection.ts (GET=status, POST action=send|test)"
  - "api/llm-proxy.ts — inlocuieste claude-proxy.ts, gemini-proxy.ts, groq-proxy.ts (POST provider=claude|gemini|groq)"
  - "api/account.ts — inlocuieste schimba-email.ts, schimba-username.ts (POST action=email|username)"
  - "api/ redus de la 14 la 9 fisiere handler, sub limita Vercel Hobby (12)"
affects: [deploy, sms, ai-assistant, sportivi]

tech-stack:
  added: []
  patterns:
    - "consolidare endpoint-uri inrudite intr-un singur handler cu routing pe query param (action/provider) cand limita de functii serverless e atinsa"

key-files:
  created:
    - api/sms.ts
    - api/llm-proxy.ts
    - api/account.ts
  deleted:
    - api/sms-send.ts
    - api/sms-status.ts
    - api/sms-test-connection.ts
    - api/claude-proxy.ts
    - api/gemini-proxy.ts
    - api/groq-proxy.ts
    - api/schimba-email.ts
    - api/schimba-username.ts
  modified:
    - components/SMS/SMSConfigurare.tsx
    - services/claudeService.ts
    - services/agents/orchestrator.ts
    - services/sportivService.ts
    - vite.config.ts
    - docs/RAG_IMPLEMENTARE.md

key-decisions:
  - "Nu s-a extras helper comun pentru validare env Supabase — fiecare handleX intern isi pastreaza propriul bloc, copiat exact din fisierul original, ca sa minimizeze riscul de regresie"
  - "Shape-uri de raspuns pastrate identic per provider LLM (claude: raw Anthropic response, gemini/groq: {text}) — clientii actuali nu s-au schimbat"
  - "vite.config.ts middleware dev generalizat sa raspunda doar la provider=claude, altfel next() — gemini/groq nu aveau emulare dev nici inainte, comportament identic"

requirements-completed: []

duration: ~35min
completed: 2026-07-05
---

# Quick Task 260705-1js: Consolidare endpoint-uri Vercel API sub limita Hobby Summary

**Deploy Vercel blocat ("No more than 12 Serverless Functions... Hobby plan") — api/ avea 14 fisiere. Consolidate 8 fisiere inrudite in 3, ajuns la 9.**

## Cauza

Vercel Hobby permite max 12 Serverless Functions per deployment. Fiecare fisier top-level din `api/` conteaza ca o functie separata. Proiectul acumulase 14.

## Ce s-a facut

**Task 1 — SMS:** `api/sms-send.ts` + `api/sms-status.ts` + `api/sms-test-connection.ts` → `api/sms.ts`. Routing: `GET` = status (query), `POST ?action=test` = test conexiune, `POST ?action=send` (sau fara action) = trimitere SMS. Doar `sms-test-connection` avea apel real din frontend (`components/SMS/SMSConfigurare.tsx`) — actualizat la `/api/sms?action=test`. `sms-send`/`sms-status` erau deja neapelate din frontend (verificat grep global) — consolidarea nu schimba nimic functional.

**Task 2 — LLM proxy:** `api/claude-proxy.ts` + `api/gemini-proxy.ts` + `api/groq-proxy.ts` → `api/llm-proxy.ts`. Routing: `POST ?provider=claude|gemini|groq`. Doar `groq-proxy` avea apel real (`services/claudeService.ts`, `services/agents/orchestrator.ts`) — actualizate la `/api/llm-proxy?provider=groq`. Shape-uri raspuns pastrate identic per provider (claude = raw Anthropic response, gemini/groq = `{text}`). `vite.config.ts` avea middleware dev doar pentru claude — generalizat sa raspunda la path nou `/api/llm-proxy` DAR doar cand query are `provider=claude`, altfel `next()` (gemini/groq nu aveau emulare dev nici inainte de schimbare).

**Task 3 — Cont:** `api/schimba-email.ts` + `api/schimba-username.ts` → `api/account.ts`. Routing: `POST ?action=email|username`. Ambele erau apelate din `services/sportivService.ts` (liniile 57, 89) — actualizate la `/api/account?action=email` / `?action=username`.

**Task 4 — Verificare:** `api/` are acum 9 fisiere handler (`account.ts`, `creare-cont.ts`, `genereaza-magic-link.ts`, `health.ts`, `llm-proxy.ts`, `rag-index.ts`, `rag-search.ts`, `reset-parola-sportiv.ts`, `sms.ts`) — sub limita de 12, marja de 3. Doc `RAG_IMPLEMENTARE.md` actualizat (referea deja gresit `claude-proxy` in loc de endpoint-ul real folosit, `groq` — corectat la `llm-proxy?provider=groq`).

## Commits

1. `857b37c` — Task 1: consolidare SMS
2. `b929d1e` — Task 2: consolidare LLM proxy
3. `1dde849` — Task 3: consolidare cont
4. `bcfd0a4` — Task 4: doc fix

## Verificare

- `npx tsc --noEmit` — curat, 0 erori
- `ls api/*.ts | grep -v '^api/_' | wc -l` — 9
- `grep -rE "api/(sms-send|sms-status|sms-test-connection|claude-proxy|gemini-proxy|groq-proxy|schimba-email|schimba-username)"` in tot repo (exclus worktrees) — 0 rezultate

## Deviations from Plan

Niciuna — plan executat exact cum a fost scris.

## Issues Encountered

Niciuna.

## User Setup Required

Niciuna. Urmatorul deploy Vercel ar trebui sa treaca (9 < 12 functii).

## Next Phase Readiness

- Deploy-ul poate fi reincercat.
- Recomandare verificare manuala post-deploy: test conexiune SMS din Setari SMS, Asistent AI (foloseste groq prin llm-proxy), schimbare email/username sportiv din profil.

---
*Quick task: 260705-1js*
*Completed: 2026-07-05*
