# Quick 261117-kiq: SPORTIV citeste propria grupa (RLS grupe)
Cauza: pe `grupe` exista doar politica staff -> SportivDashboard arata "Grupa necunoscuta".
Fix: functie SECURITY DEFINER `get_my_grupa_id()` + politica SELECT "Sportiv - citeste propria grupa".
Migrare: supabase/migrations/20261117a_grupe_sportiv_select_propria_grupa.sql (aplicata live).
