// Faza 34 (plan 13): comportamentul shell-ului (sidebar/header/bottom nav) pe build de productie.
// Strict read-only: doar login + navigare/deschis sertar. MFA nu se ocoleste (test.skip cu motiv).
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { PREDEFINED_THEMES, QWANKIDO_BLUE } from '../lib/themes';

const TEST_EMAIL = process.env.TEST_EMAIL!;
const TEST_PASSWORD = process.env.TEST_PASSWORD!;
const SCREENS = '.planning/phases/34-simplificare-ui-unificare-stil-sidebar-dashboard-4-roluri-de/screens';
mkdirSync(SCREENS, { recursive: true });

const LAVENDER = PREDEFINED_THEMES.find(t => t.name === 'Lavender Light')!;
const TEME = [LAVENDER, QWANKIDO_BLUE];
const VIEWPORTS = [
    { nume: 'desktop', width: 1280, height: 800 },
    { nume: 'mobil', width: 390, height: 844 },
];

// applyTheme din lib/themes.ts, replicat in pagina: tema din DB a contului de test suprascrie localStorage dupa login
const aplicaTema = (page: Page, tema: Record<string, string>) => page.evaluate(t => {
    for (const [k, v] of Object.entries(t)) {
        if (typeof v === 'string' && k !== 'name') document.documentElement.style.setProperty('--t-' + k.replace(/[A-Z0-9]/g, c => '-' + c.toLowerCase()), v);
    }
}, tema as any);

for (const vp of VIEWPORTS) for (const tema of TEME) {
    test(`shell ${vp.nume} / ${tema.name}`, async ({ page }) => {
        test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'TEST_EMAIL/TEST_PASSWORD lipsesc din .env');
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.addInitScript(t => localStorage.setItem('phihau-theme', JSON.stringify(t)), tema as any);
        const erori: string[] = [];
        page.on('pageerror', e => erori.push(e.message));

        await page.goto('/');
        expect(await page.evaluate(() => document.hidden), 'tab ascuns: testul ar fi fals').toBe(false);
        await page.waitForSelector('input[name="email"]');
        await page.locator('input[name="email"]').fill(TEST_EMAIL);
        await page.locator('input[name="parola"]').fill(TEST_PASSWORD);
        await page.getByRole('button', { name: 'Intră în cont' }).click();

        const header = page.locator('[data-tutorial="header"]');
        const rol = page.getByText('Selectează Contextul');
        await expect(header.or(rol).or(page.getByText(/cod|MFA|verificare/i).first())).toBeVisible({ timeout: 30_000 });
        if (await rol.isVisible()) await page.locator('button:has(p.font-semibold)').first().click();
        const ajuns = await header.waitFor({ timeout: 20_000 }).then(() => true, () => false);
        if (!ajuns) {
            // Skip doar cand MFA e vizibil; orice alt motiv (login esuat, atribut redenumit, crash) pica testul.
            const mfa = await page.getByText(/cod de verificare|autentificare în doi pași|MFA/i).first().isVisible().catch(() => false);
            test.skip(mfa, 'MFA cerut: MFA nu se ocoleste');
            await expect(header, 'Header-ul nu apare dupa login (nu e MFA)').toBeVisible({ timeout: 1_000 });
        }

        await aplicaTema(page, tema as any);
        await page.waitForTimeout(500);
        const bg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--t-bg').trim());
        const desktop = vp.nume === 'desktop';

        // (1) sidebar exista; pe desktop sidebar/header fara box-shadow
        const sidebar = page.locator('[data-tutorial="sidebar"]:visible').first();
        if (desktop) {
            await expect(sidebar).toBeVisible();
            const umbre = await page.evaluate(() => ['[data-tutorial="sidebar"]', '[data-tutorial="header"]']
                .map(s => { const e = [...document.querySelectorAll(s)].find(x => x.getClientRects().length > 0 && getComputedStyle(x).visibility !== "hidden") as HTMLElement | undefined; return e ? getComputedStyle(e).boxShadow : 'lipsa'; }));
            expect(umbre, 'box-shadow sidebar/header').toEqual(['none', 'none']);
        } else {
            expect(await page.locator('[data-tutorial="sidebar"]').count()).toBeGreaterThan(0);
        }

        // (2) niciun animate-ping in header/aside/nav
        expect(await page.locator('header .animate-ping, aside .animate-ping, nav .animate-ping').count()).toBe(0);

        // (4) bottom nav
        const bottom = page.locator('nav[aria-label="Navigare rapidă"]');
        if (desktop) {
            await expect(bottom).not.toBeVisible();
        } else {
            await expect(bottom).toBeVisible();
            const butoane = bottom.locator('button');
            expect(await butoane.count()).toBe(4);
            for (let i = 0; i < 4; i++) expect((await butoane.nth(i).boundingBox())!.height).toBeGreaterThanOrEqual(44);
            await expect(page.locator('footer')).toBeHidden();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'scroll orizontal').toBe(true);
            await bottom.getByRole('button', { name: 'Meniu' }).click();
        }

        // (3) 7 intrari de nivel 1 (admin/instructor) sau 4 (sportiv)
        const nav = page.locator('nav[aria-label="Navigare principală"]:visible').first();
        await expect(nav).toBeVisible();
        const sportiv = await nav.getByText('Portalul Meu').count() > 0;
        const intrari = await nav.locator(':scope > *').count();
        expect(intrari, `intrari nivel 1 (${sportiv ? 'rol SPORTIV' : 'rol admin/instructor'})`).toBe(sportiv ? 4 : 7);

        // (5) fara pageerror
        expect(erori, 'pageerror').toEqual([]);

        // (6) captura
        await page.screenshot({ path: `${SCREENS}/${vp.nume}-${tema.name.replace(/\s+/g, '-').toLowerCase()}.png` });
        test.info().annotations.push({ type: 'rol-testat', description: `${sportiv ? 'SPORTIV' : 'admin/instructor'}; --t-bg=${bg}` });
    });
}
