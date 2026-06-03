# Portal PhiHau — QwanKiDo Club Management

Portal web pentru **Federația QwanKiDo România** și cluburile afiliate. Gestionează ciclul complet al unui practicant: înregistrare → antrenamente → examene de grad → competiții → plăți. Țintă: 35 cluburi, 3500+ sportivi. Stare actuală: 7 cluburi cu date reale, în testare.

## Stack rapid

**React 18 + TypeScript + Vite** | **Supabase** (PostgreSQL + Auth + RLS) | **Tailwind CSS** | **React Query v5** | **Vercel** deploy

## Convenții esențiale

- **Limbă**: română pentru domeniu (DB, UI, variabile), engleză pentru hook-uri/patternuri tehnice
- **Tipuri**: toate în `types.ts` la rădăcină — fișier unic de referință
- **UI**: `components/ui.tsx` = design system intern — nu se importă Shadcn/MUI
- **Navigare**: SPA fără URL routing intern — `activeView` string în `NavigationContext`
- **Permisiuni**: `usePermissions(activeRoleContext)` + RLS Supabase — nu duplica logica
- **Supabase client**: `supabaseClient.ts` injectează `active-role-context-id` header în toate requesturile

## Roluri

`SUPER_ADMIN_FEDERATIE` > `ADMIN_CLUB` > `INSTRUCTOR` > `SPORTIV`

Un utilizator poate avea roluri multiple la cluburi diferite — contextul activ se alege la login și e trimis ca header la fiecare request Supabase.

## Documentație detaliată

| Fișier | Conținut |
|--------|----------|
| [docs/arhitectura.md](docs/arhitectura.md) | Stack complet, structura folderelor, navigare SPA, Supabase client |
| [docs/baza-de-date.md](docs/baza-de-date.md) | Schema DB completă — toate tabelele cu descriere, views, convenții |
| [docs/roluri-permisiuni.md](docs/roluri-permisiuni.md) | Roluri, `usePermissions`, RLS, GDPR, roluri planificate |
| [docs/module.md](docs/module.md) | Fiecare modul: stare, componente cheie, hooks, servicii |
| [docs/fluxuri.md](docs/fluxuri.md) | Fluxuri complete: auth, plăți, examene, competiții, prezență, AI |
| [docs/conventii-cod.md](docs/conventii-cod.md) | Naming, stilizare, state management, gestionare erori |
| [docs/HARTA_APLICATIE.md](docs/HARTA_APLICATIE.md) | Viziunea produsului: module, restricții business, plan 5 faze |
| [docs/ARHITECTURA_COMPETITII.md](docs/ARHITECTURA_COMPETITII.md) | Tipuri competiții QwanKiDo, probe, categorii, reguli oficiale |
| [docs/RAG_IMPLEMENTARE.md](docs/RAG_IMPLEMENTARE.md) | AI Assistant: Gemini embeddings + pgvector + Claude API |
