-- MFA prin cod pe email (inlocuieste TOTP) pentru ADMIN_CLUB/SUPER_ADMIN_FEDERATIE.
-- Codul insusi e generat/trimis/verificat de Supabase Auth (signInWithOtp/verifyOtp);
-- acest tabel tine doar dovada ca verificarea a reusit, cu expirare.

create table if not exists public.mfa_email_verificari (
    user_id uuid primary key references auth.users(id) on delete cascade,
    verificat_pana timestamptz not null,
    creat_la timestamptz not null default now()
);

alter table public.mfa_email_verificari enable row level security;
alter table public.mfa_email_verificari force row level security;

drop policy if exists "mfa_email_verificari_select_own" on public.mfa_email_verificari;
create policy "mfa_email_verificari_select_own"
    on public.mfa_email_verificari for select
    using (user_id = auth.uid());

drop policy if exists "mfa_email_verificari_upsert_own" on public.mfa_email_verificari;
create policy "mfa_email_verificari_upsert_own"
    on public.mfa_email_verificari for insert
    with check (user_id = auth.uid());

drop policy if exists "mfa_email_verificari_update_own" on public.mfa_email_verificari;
create policy "mfa_email_verificari_update_own"
    on public.mfa_email_verificari for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
