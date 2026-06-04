# TESTING.md — Portal PhiHau

**Mapped:** 2026-06-04 | **Focus:** quality/testing

---

## Summary

**Fără framework de testare instalat.** Nu există Jest, Vitest, Playwright, Cypress sau similar în `package.json`.

## Ce Există

### `tests/` directory

Conține exclusiv verificări RLS (Row Level Security) Supabase — nu unit/integration tests:

```
tests/
  rls/         # SQL queries pentru verificat politici RLS manual
```

### Verificare Manuală

Testarea se face manual în browser + Supabase Studio pentru:
- Politici RLS pe fiecare rol
- Fluxuri de autentificare
- Permisiuni per modul

## Riscuri

- Zero coverage automat — orice regresie detectată manual
- RLS-ul e critic (multi-tenant) dar testat doar ad-hoc
- Nu există smoke tests pentru deploy

## Recomandări Viitoare

Dacă se adaugă teste:
- **Vitest** (compatibil Vite, zero config)
- **MSW** pentru mock Supabase în unit tests
- **Playwright** pentru E2E critice (login, plăți, examene)

## Type Safety ca "Test"

TypeScript (chiar fără strict mode) oferă siguranță la compilare. Tipurile din `types.ts` servesc ca documentație și validare statică a contractelor între module.
