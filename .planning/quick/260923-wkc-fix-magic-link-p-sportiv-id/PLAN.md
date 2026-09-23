---
quick_id: 260923-wkc
slug: fix-magic-link-p-sportiv-id
date: 2026-09-23
---

Fix bug in api/genereaza-magic-link.ts: RPC call to refactor_create_user_account
was missing p_sportiv_id, so it always took the INSERT branch (provisional email
is always new) instead of UPDATE for an existing sportiv -> duplicate row or
unique_sportiv_phi_hau conflict. Follow-up to quick task 260923-upx.

## Task

1. Add `p_sportiv_id: sportiv_id` to the RPC call (line ~82), matching the
   pattern from commit ba9cc75 (api/creare-cont.ts).
2. Check the error of the later `.update({user_id, email}).eq('id', sportiv_id)`
   call instead of ignoring it silently.
3. Verify the import flow (components/Sportivi/ImportSportiviPage/Pas2Raport.tsx)
   still calls the same endpoint/body shape.
