// Faza 36 (plan 12): zona externa /competitie/<uuid> pe build-ul de productie (npm run build && preview, vezi playwright.config.ts).
// Date efemere ZZ_TEST_FAZA36_UI_* / zztest_faza36ui_* pe DB live; cleanup in afterAll. Output fara PII.
// Sesiunea EXT_A se obtine ca in tests/acces_extern_aprobare_faza36.ts (generateLink -> email_otp -> verifyOtp), nu prin email real.
import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync } from 'node:fs';

const URL_SB = process.env.VITE_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON = process.env.VITE_SUPABASE_ANON_KEY!;
const CLUB_A = '83e7f771-46cf-4c4e-b70f-356d7b0bff06';
const CLUB_B = 'cbb0b228-b3e0-4735-9658-70999eb256c6';
const PREFIX = 'ZZ_TEST_FAZA36_UI_';
const RUN = Date.now();
const EMAIL_EXT = `zztest_faza36ui_${RUN}_ext@example.test`;
const EMAIL_CERERE = `zztest_faza36ui_${RUN}_cerere@example.test`;
const SCREENS = '.planning/phases/36-acces-extern-competitie-prin-link-login-email-otp-doar-zona-/screens';
const REF = URL_SB ? new URL(URL_SB).hostname.split('.')[0] : '';
const CHEIE_SESIUNE = `sb-${REF}-auth-token`;
const CHEIE_CONTEXT = 'phi-hau-active-role-context-id';

const admin = SERVICE && URL_SB ? createClient(URL_SB, SERVICE) : (null as any);
let C1 = '';
let CDRAFT = '';
let SP_B = '';
let ROL_EXT = '';
let CLUB_A_NUME = '';
const competitii: string[] = [];
const userIds: string[] = [];

// sesiune noua per test: "Deconectare" revoca global sesiunile utilizatorului
async function sesiuneNoua() {
    const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: EMAIL_EXT });
    const otp = data?.properties?.email_otp;
    if (error || !otp) throw new Error('generateLink esuat');
    const c = createClient(URL_SB, ANON);
    const v = await c.auth.verifyOtp({ email: EMAIL_EXT, token: otp, type: 'email' });
    if (v.error || !v.data.session) throw new Error('verifyOtp esuat');
    return v.data.session;
}

async function injecteaza(page: Page) {
    const sesiune = await sesiuneNoua();
    await page.addInitScript(([k, s, kc, ctx]) => {
        if (sessionStorage.getItem('__acx_inj')) return; // doar la prima incarcare: dupa Deconectare (reload) sesiunea nu se reinjecteaza
        sessionStorage.setItem('__acx_inj', '1');
        localStorage.setItem(k as string, JSON.stringify(s));
        localStorage.setItem(kc as string, JSON.stringify(ctx));
    }, [CHEIE_SESIUNE, sesiune, CHEIE_CONTEXT, ROL_EXT]);
}

const nuAscuns = async (page: Page) =>
    expect(await page.evaluate(() => document.hidden), 'tab ascuns: testul ar fi fals').toBe(false);

const cereriDate = (page: Page) => {
    const urls: string[] = [];
    page.on('request', r => { if (/\/rest\/v1\/(sportivi|inscrieri_competitie)/.test(r.url())) urls.push(r.url().split('?')[0]); });
    return urls;
};

test.beforeAll(async () => {
    test.skip(!admin || !ANON, 'SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_* lipsesc din .env');
    const mkComp = async (suffix: string, status: string) => {
        const { data, error } = await admin.from('competitii').insert({
            denumire: `${PREFIX}${suffix}_${RUN}`, tip: 'tehnica', data_inceput: '2027-06-01', data_sfarsit: '2027-06-02',
            locatie: 'Test', status, deadline_inscrieri: '2027-06-01', // NOT NULL din Faza 40 (D-14)
        }).select('id').single();
        if (error || !data) throw new Error(`competitie ${suffix}: ${error?.message}`);
        competitii.push(data.id);
        return data.id as string;
    };
    C1 = await mkComp('C1', 'inscrieri_deschise');
    CDRAFT = await mkComp('DRAFT', 'draft');
    const cat = await admin.from('categorii_competitie').insert({ competitie_id: C1, denumire: `${PREFIX}cat_${RUN}`, varsta_min: 8, gen: 'Mixt' }).select('id').single();
    if (cat.error || !cat.data) throw new Error(`categorie: ${cat.error?.message}`);

    const { data: anF } = await admin.rpc('an_fiscal_federatie', { p_data: new Date().toISOString().slice(0, 10) });
    const an = typeof anF === 'number' ? anF : new Date().getFullYear();
    const { data: viz } = await admin.from('vize_sportivi').select('sportiv_id, sportivi!inner(club_id)')
        .eq('an', an).eq('tip', 'FRQKD').eq('sportivi.club_id', CLUB_B).limit(1);
    SP_B = viz?.[0]?.sportiv_id;
    if (!SP_B) throw new Error('OPRIT: lipseste sportiv cu viza FRQKD in clubul B');
    const ins = await admin.from('inscrieri_competitie').insert({ competitie_id: C1, categorie_id: cat.data.id, club_id: CLUB_B, sportiv_id: SP_B });
    if (ins.error) throw new Error(`inscriere: ${ins.error.message}`);

    const u = await admin.auth.admin.createUser({ email: EMAIL_EXT, email_confirm: true });
    if (u.error || !u.data.user) throw new Error(`user: ${u.error?.message}`);
    userIds.push(u.data.user.id);
    const rol = await admin.from('utilizator_roluri_multicont')
        .insert({ user_id: u.data.user.id, rol_denumire: 'REPREZENTANT_COMPETITIE', club_id: null, is_primary: true }).select('id').single();
    if (rol.error || !rol.data) throw new Error(`rol: ${rol.error?.message}`);
    ROL_EXT = rol.data.id;
    const gr = await admin.from('acces_competitie_extern').insert({
        user_id: u.data.user.id, competitie_id: C1, club_id: CLUB_A, email: EMAIL_EXT, nume: 'ZZ Test UI', activ: true });
    if (gr.error) throw new Error(`grant: ${gr.error.message}`);
    CLUB_A_NUME = (await admin.from('cluburi').select('nume').eq('id', CLUB_A).single()).data?.nume ?? '';
    mkdirSync(SCREENS, { recursive: true });
});

test.afterAll(async () => {
    if (!admin) return;
    await admin.from('cereri_acces_competitie').delete().like('email', `zztest_faza36ui_${RUN}_%`);
    if (userIds.length) {
        await admin.from('acces_competitie_extern').delete().in('user_id', userIds);
        await admin.from('utilizator_roluri_multicont').delete().in('user_id', userIds);
    }
    if (competitii.length) {
        await admin.from('inscrieri_competitie').delete().in('competitie_id', competitii);
        await admin.from('categorii_competitie').delete().in('competitie_id', competitii);
        await admin.from('acces_competitie_extern').delete().in('competitie_id', competitii);
        await admin.from('competitii').delete().in('id', competitii);
    }
    for (const id of userIds) await admin.auth.admin.deleteUser(id);
    const rez = (await admin.from('competitii').select('id').like('denumire', `${PREFIX}%`)).data?.length ?? -1;
    const rezCer = (await admin.from('cereri_acces_competitie').select('id').like('email', 'zztest_faza36ui_%')).data?.length ?? -1;
    console.log(`Reziduuri UI: competitii=${rez}, cereri=${rezCer}`);
    expect(rez).toBe(0);
    expect(rezCer).toBe(0);
});

test('1. link invalid / inexistent / draft -> acelasi mesaj generic, fara login', async ({ page }) => {
    const mesaj = 'Link invalid sau competiție indisponibilă';
    for (const cale of ['/competitie/abc', `/competitie/${crypto.randomUUID()}`, `/competitie/${CDRAFT}`]) {
        await page.goto(cale);
        await nuAscuns(page);
        await expect(page.getByText(mesaj)).toBeVisible({ timeout: 15_000 });
        await expect(page.locator('#acx-email')).toHaveCount(0);
    }
});

test('2. anonim: teaser + login + Solicita acces, fara sidebar si fara cereri de date', async ({ page }) => {
    const cereriDeDate = cereriDate(page);
    await page.goto(`/competitie/${C1}`);
    await nuAscuns(page);
    await expect(page.getByText(`${PREFIX}C1_${RUN}`)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#acx-email')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Trimite codul' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Solicită acces/ })).toBeVisible();
    expect(await page.locator('[data-tutorial="sidebar"]').count()).toBe(0);
    expect(cereriDeDate, 'anonimul nu trebuie sa citeasca sportivi/inscrieri').toEqual([]);
});

test('3. Solicita acces -> confirmare + rand in_asteptare', async ({ page }) => {
    await page.goto(`/competitie/${C1}`);
    await nuAscuns(page);
    await page.getByRole('button', { name: /Solicită acces/ }).click();
    await page.locator('#acx-s-email').fill(EMAIL_CERERE);
    await page.locator('#acx-s-nume').fill('ZZ Test Cerere UI');
    await expect(page.locator(`#acx-s-club option[value="${CLUB_A}"]`)).toHaveCount(1, { timeout: 15_000 });
    await page.locator('#acx-s-club').selectOption(CLUB_A);
    await page.getByRole('button', { name: 'Trimite cererea' }).click();
    await expect(page.getByText(/Cererea a fost trimisă/)).toBeVisible({ timeout: 15_000 });
    const { data } = await admin.from('cereri_acces_competitie').select('status').eq('email', EMAIL_CERERE).eq('competitie_id', C1);
    expect(data?.length).toBe(1);
    expect(data?.[0].status).toBe('in_asteptare');
});

test('4. extern autentificat: doar 4 file, fara sidebar, fara scurgere de date straine', async ({ page }) => {
    await injecteaza(page);
    const corpuri: { url: string; text: string }[] = [];
    page.on('response', async r => {
        if (!r.url().startsWith(URL_SB)) return;
        try { corpuri.push({ url: r.url(), text: await r.text() }); } catch { /* redirect/preflight fara corp */ }
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/competitie/${C1}`);
    await nuAscuns(page);
    await expect(page.getByRole('button', { name: /^Înscrieri/ })).toBeVisible({ timeout: 30_000 });
    if (CLUB_A_NUME) await expect(page.getByText(CLUB_A_NUME).first()).toBeVisible();

    const taburi = (await page.locator('.scrollbar-hide button').allInnerTexts()).map(t => t.trim().replace(/\s*\(\d+\)$/, ''));
    expect(taburi, 'filele vizibile').toEqual(['Înscrieri', 'Categorii', 'Taxe', 'Detalii']);
    for (const t of ['Admin', 'Financiar', 'Raport', 'Template-uri', 'Cereri inter-club', 'Acces extern']) {
        await expect(page.getByText(t, { exact: true }), `text interzis: ${t}`).toHaveCount(0);
    }
    expect(await page.locator('[data-tutorial="sidebar"]').count()).toBe(0);
    // lasam si celelalte file sa-si faca incarcarile inainte de verificarea scurgerii
    for (const t of ['Categorii', 'Taxe', 'Detalii', 'Înscrieri']) {
        await page.getByRole('button', { name: new RegExp(`^${t}`) }).click();
        await page.waitForTimeout(700);
    }

    expect(corpuri.length, 'au existat raspunsuri Supabase').toBeGreaterThan(0);
    const scurs = corpuri.filter(c => c.text.includes(SP_B));
    expect(scurs.map(c => c.url.split('?')[0]), 'id SP_B nu apare in niciun raspuns').toEqual([]);
    for (const c of corpuri.filter(c => /\/rest\/v1\/(sportivi|inscrieri_competitie)\b/.test(c.url))) {
        let rows: any[] = [];
        try { const j = JSON.parse(c.text); rows = Array.isArray(j) ? j : []; } catch { /* non-json */ }
        expect(rows.filter(r => r?.club_id === CLUB_B).length, `rand cu club B in ${c.url.split('?')[0]}`).toBe(0);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENS}/36-12-extern-mobil.png`, fullPage: false });
});

test('5. garda portalului: cont extern pe "/" vede Acces limitat', async ({ page }) => {
    await injecteaza(page);
    const cereriDeDate = cereriDate(page);
    await page.goto('/');
    await nuAscuns(page);
    await expect(page.getByText('Acces limitat')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Deconectare' })).toBeVisible();
    expect(await page.locator('[data-tutorial="sidebar"]').count()).toBe(0);
    expect(cereriDeDate, 'portalul nu trebuie sa incarce sportivi/inscrieri').toEqual([]);
});

test('6. Deconectare din shell -> revine pe login pe linkul competitiei', async ({ page }) => {
    await injecteaza(page);
    await page.goto(`/competitie/${C1}`);
    await nuAscuns(page);
    await page.getByRole('button', { name: 'Deconectare' }).first().click();
    await expect(page.locator('#acx-email')).toBeVisible({ timeout: 15_000 });
    expect(page.url()).toContain(`/competitie/${C1}`);
    expect(await page.evaluate(k => localStorage.getItem(k), CHEIE_SESIUNE)).toBeNull();
});
