---
quick_id: 260923-wkc
slug: fix-magic-link-p-sportiv-id
status: complete
date: 2026-09-23
commit: 96cbe79
---

Added `p_sportiv_id: sportiv_id` to the `refactor_create_user_account` RPC call
in `api/genereaza-magic-link.ts` (was missing, causing the RPC to always take
the INSERT branch instead of UPDATE for an existing sportiv — duplicate row or
`unique_sportiv_phi_hau` conflict). Same pattern as ba9cc75 (`api/creare-cont.ts`).

Also made the later `.update({user_id, email}).eq('id', sportiv_id)` call check
and log its error instead of ignoring it silently (pattern from creare-cont.ts).

Verified `components/Sportivi/ImportSportiviPage/Pas2Raport.tsx` calls the same
endpoint with an unchanged body shape — no changes needed there.

`tsc --noEmit` shows no errors on the modified file.

Commit: 96cbe79
