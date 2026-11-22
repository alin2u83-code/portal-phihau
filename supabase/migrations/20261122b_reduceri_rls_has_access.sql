-- 20261122b — Corectie RLS reduceri / reduceri_sportiv
-- 20261122a folosea este_staff_autorizat(), care intoarce false si pentru ADMIN_CLUB cu header valid
-- (get_active_role_context() nu e comparabil cu club_id) -> staff-ul nu vedea nicio reducere.
-- has_access_to_club(club_id) e helper-ul pe care se bazeaza celelalte politici (header active-role-context-id;
-- SUPER_ADMIN_FEDERATIE/ADMIN = tot, ADMIN_CLUB/INSTRUCTOR = clubul lor).
--
-- ROLLBACK: reface politicile din 20261122a (cu este_staff_autorizat()).

drop policy if exists reduceri_club_select on public.reduceri;
drop policy if exists reduceri_club_write on public.reduceri;
create policy reduceri_club_select on public.reduceri for select to authenticated
  using (public.has_access_to_club(club_id));
create policy reduceri_club_write on public.reduceri for all to authenticated
  using (public.has_access_to_club(club_id))
  with check (public.has_access_to_club(club_id));

drop policy if exists reduceri_sportiv_club on public.reduceri_sportiv;
create policy reduceri_sportiv_club on public.reduceri_sportiv for all to authenticated
  using (exists (select 1 from public.sportivi s where s.id = sportiv_id and public.has_access_to_club(s.club_id)))
  with check (
    exists (select 1 from public.sportivi s join public.reduceri r on r.id = reducere_id
            where s.id = sportiv_id and s.club_id = r.club_id and public.has_access_to_club(s.club_id))
  );
