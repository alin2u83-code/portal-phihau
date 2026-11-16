// Faza 43 (plan 05): login extern cu parola pe build-ul de productie (npm run build && preview, vezi playwright.config.ts).
// Date efemere zztest_faza43ui_* (fara roluri, fara conturi de club) pe DB live; cleanup in afterAll. Output fara PII.
// Fara email real: /auth/v1/recover e interceptat (page.route), iar codul vine din admin.generateLink (nu trimite email).
import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

const URL_SB = process.env.VITE_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON = process.env.VITE_SUPABASE_ANON_KEY!;
const RUN = Date.now();
const U1 = `zztest_faza43ui_${RUN}_p@example.test`; // cont cu parola
const U2 = `zztest_faza43ui_${RUN}_n@example.test`; // cont fara parola (prima autentificare)
const U_INEXISTENT = `zztest_faza43ui_${RUN}_x@example.test`;
const parolaAleatoare = () => randomBytes(12).toString('base64url') + 'Aa1';
const P1 = parolaAleatoare();
const P2 = parolaAleatoare();
const PAROLA_GRESITA = parolaAleatoare();
const FARA_CONT = 'Contul tău nu are un cont de competiție';

const admin = SERVICE && URL_SB ? createClient(URL_SB, SERVICE) : (null as any);
const userIds: string[] = [];

const nuAscuns = async (page: Page) =>
    expect(await page.evaluate(() => document.hidden), 'tab ascuns: testul ar fi fals').toBe(false);

test.beforeAll(async () => {
    test.skip(!admin || !ANON, 'SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_* lipsesc din .env');
    const u1 = await admin.auth.admin.createUser({ email: U1, password: P1, email_confirm: true });
    if (u1.error || !u1.data.user) throw new Error('creare user cu parola esuata');
    userIds.push(u1.data.user.id);
    const u2 = await admin.auth.admin.createUser({ email: U2, email_confirm: true });
    if (u2.error || !u2.data.user) throw new Error('creare user fara parola esuata');
    userIds.push(u2.data.user.id);
});

test.afterAll(async () => {
    if (!admin) return;
    let stersi = 0;
    let erori = 0;
    for (const id of userIds) {
        const { error } = await admin.auth.admin.deleteUser(id);
        if (error) erori++; else stersi++;
    }
    console.log(`Cleanup faza43 UI: useri stersi=${stersi}, erori=${erori}`);
    expect(erori).toBe(0);
});

test('1. formular parola: email, parola, bifa implicit bifata, fara cod la login', async ({ page }) => {
    await page.goto('/competitie');
    await nuAscuns(page);
    await expect(page.locator('#acx-email')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#acx-parola')).toBeVisible();
    await expect(page.locator('#acx-dispozitiv')).toBeChecked();
    await expect(page.getByRole('button', { name: 'Intră', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Trimite codul' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Prima autentificare sau ai uitat parola?' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Solicită acces/ })).toBeVisible();
});

test('2. parola gresita si email inexistent -> acelasi mesaj', async ({ page }) => {
    await page.goto('/competitie');
    await nuAscuns(page);
    const incearca = async (email: string) => {
        await page.locator('#acx-email').fill(email);
        await page.locator('#acx-parola').fill(PAROLA_GRESITA);
        await page.getByRole('button', { name: 'Intră', exact: true }).click();
        const alerta = page.getByRole('alert');
        await expect(alerta).toContainText('Email sau parolă incorecte', { timeout: 15_000 });
        return (await alerta.textContent()) ?? '';
    };
    const m1 = await incearca(U1);
    await page.reload(); // mesajul vechi dispare, ca sa nu comparam textul cu el insusi
    await expect(page.locator('#acx-email')).toBeVisible({ timeout: 15_000 });
    const m2 = await incearca(U_INEXISTENT);
    expect(m2).toBe(m1);
});

test('3. login corect cu bifa debifata -> intra, sesiune temporara', async ({ page }) => {
    await page.goto('/competitie');
    await nuAscuns(page);
    await page.locator('#acx-dispozitiv').uncheck();
    await page.locator('#acx-email').fill(U1);
    await page.locator('#acx-parola').fill(P1);
    await page.getByRole('button', { name: 'Intră', exact: true }).click();
    await expect(page.getByText(FARA_CONT)).toBeVisible({ timeout: 30_000 });
    expect(await page.evaluate(() => localStorage.getItem('phi-hau-sesiune-temporara'))).toBe('1');
});

test('4. prima autentificare: cod din email + parola noua -> intra', async ({ page }) => {
    await page.route('**/auth/v1/recover**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await page.goto('/competitie');
    await nuAscuns(page);
    await page.getByRole('button', { name: 'Prima autentificare sau ai uitat parola?' }).click();
    await page.locator('#acx-email').fill(U2);
    await page.getByRole('button', { name: 'Trimite codul' }).click();
    await expect(page.locator('#acx-cod')).toBeVisible({ timeout: 15_000 });

    await page.locator('#acx-cod').fill('00000000');
    await page.locator('#acx-parola-noua').fill(P2);
    await page.getByRole('button', { name: 'Setează parola și intră' }).click();
    await expect(page.getByText('Cod incorect sau expirat')).toBeVisible({ timeout: 15_000 });

    const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email: U2 });
    const otp = data?.properties?.email_otp;
    if (error || !otp) throw new Error('generateLink recovery esuat');
    await page.locator('#acx-cod').fill(otp);
    await page.locator('#acx-parola-noua').fill(P2);
    await page.getByRole('button', { name: 'Setează parola și intră' }).click();
    await expect(page.getByText(FARA_CONT)).toBeVisible({ timeout: 30_000 });

    const anon = createClient(URL_SB, ANON);
    const login = await anon.auth.signInWithPassword({ email: U2, password: P2 });
    expect(login.error).toBeNull();
});
