# Phase 45 - deferred items

## 45-03: ratchet ACL pica pe o functie din afara fazei

- Gasit la: `npx tsx tests/acl_definer_faza37.ts` (19.11.2026, dupa aplicarea 20261118i).
- Rezultat: 28/30. FAIL 1 = "nicio functie SECURITY DEFINER noua expusa (noi=get_my_grupa_id())"; FAIL 2 = self-check de sensibilitate (consecinta: mutatia da 2 detectari in loc de 1).
- Cauza: `get_my_grupa_id()` vine din `supabase/migrations/20261117a_grupe_sportiv_select_propria_grupa.sql` (commit 8297e723, quick 261117-kiq), SECURITY DEFINER expusa lui `authenticated`, necuprinsa in `tests/acl_definer_faza37.allowlist.json`. Nu are legatura cu `competitie_cloneaza`, care e deja in allowlist (45-01) si NU e semnalata.
- Actiune necesara (decizie user, triaj): fie intrare in allowlist `authenticated` pentru `get_my_grupa_id()` (e un helper RLS apelat din politici, probabil legitim), fie REVOKE explicit. Neatins in 45-03 (in afara scopului).
