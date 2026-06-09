---
slug: wizard-selectedsportivi-inp-fix
status: complete
completed: 2026-06-09
commits:
  - 78fe854
---

# Summary

| Task | Commit | Fișiere |
|------|--------|---------|
| selectedSportivi → Map per probă + eliminat echipieri din map | 78fe854 | InscriereClubWizard/index.tsx |
| startTransition pentru onRefresh la Retrage/Confirmă | 78fe854 | InscrieriView.tsx |

## Verificare

- `npm run lint` EXIT:0
- Thao Quyen pornește cu selecție izolată față de probe echipă
- Selecție per probă persistă la navigare înapoi
- Init din inscrieri existente restaurează corect per probaId
