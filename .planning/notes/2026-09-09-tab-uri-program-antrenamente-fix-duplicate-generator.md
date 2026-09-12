---
date: "2026-09-09 20:52"
promoted: false
---

Feature: tab-uri Luna curenta/Viitor/Arhiva pe Program Antrenamente (components/Grupe/ProgramAntrenamenteManagement.tsx) - tabel grupat pe zi in loc de grid carduri. Testat Playwright desktop/tableta/mobil, fix overflow-x mobil. Bug conex gasit si rezolvat: GeneratorProgramMasiv insera fara verificare existenta -> duplicate antrenamente (60 randuri sterse din DB pe 2 cluburi), fix idempotenta + guard re-entrancy + tratare unique_violation 23505 la 6 locuri de insert, constraint UNIQUE adaugat in program_antrenamente(club_id, grupa_id, data, ora_start). Deja comis si pushed: commit 7f56ae9 pe main. Raport playwright: .playwright-mcp/reports/raport-program-antrenamente-2026-09-09.md. Debug session arhivat: .planning/debug/resolved/program-antrenamente-duplicate.md
