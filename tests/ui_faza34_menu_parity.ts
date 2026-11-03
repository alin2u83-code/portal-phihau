// Faza 34 (plan 13): paritate meniu/hub, accesibilitate view-uri, contrast 20 teme.
// Rulare: npx tsx tests/ui_faza34_menu_parity.ts  (iese 1 daca pica Testele 1-4; Testul 5 doar raporteaza)
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { adminMenu, adminClubMenu, instructorMenu, sportivMenu, type MenuItem } from '../components/menuConfig';
import { SPORTIVI_HUB, EXAMENE_HUB, COMPETITII_HUB, FISA_HUB, type HubDef } from '../components/layout/HubTabs';
import { ACTIVITATE_SALA_GRUPURI } from '../components/ActivitateSalaTabs';
import { SECTIUNI_PE_TAB } from '../components/Plati/hub/platiHubConfig';
import { PREDEFINED_THEMES, QWANKIDO_BLUE } from '../lib/themes';

const root = process.cwd(); // se ruleaza din radacina repo
const citeste = (rel: string) => readFileSync(join(root, rel), 'utf8');
let esecuri = 0;
const rezultat = (nume: string, erori: string[]) => {
    if (erori.length) { esecuri++; console.log(`FAIL ${nume}`); erori.forEach(e => console.log(`   - ${e}`)); }
    else console.log(`OK   ${nume}`);
};

// uniunea View din types.ts
const viewLinie = citeste('types.ts').split('\n').find(l => l.startsWith('export type View ='))!;
const VIEW = new Set([...viewLinie.matchAll(/'([a-z0-9-]+)'/g)].map(m => m[1]));

const viewuriDinMeniu = (menu: MenuItem[]): Set<string> => {
    const s = new Set<string>();
    for (const i of menu) {
        if (i.view) s.add(i.view);
        i.aliases?.forEach(a => s.add(a));
        for (const sm of i.submenu ?? []) { s.add(sm.view); sm.aliases?.forEach(a => s.add(a)); }
    }
    return s;
};
const viewuriItem = (i: MenuItem) => viewuriDinMeniu([i]);

const MENIURI: Record<string, MenuItem[]> = { adminMenu, adminClubMenu, instructorMenu, sportivMenu };

// Test 1: 8/8/8/4
{
    const asteptat: Record<string, number> = { adminMenu: 8, adminClubMenu: 8, instructorMenu: 8, sportivMenu: 4 };
    rezultat('1. numar intrari nivel 1 (8/8/8/4)',
        Object.entries(MENIURI).filter(([k, m]) => m.length !== asteptat[k]).map(([k, m]) => `${k}: ${m.length} != ${asteptat[k]}`));
}

// Test 2: view-uri valide
{
    const erori: string[] = [];
    for (const [k, m] of Object.entries(MENIURI)) for (const v of viewuriDinMeniu(m)) if (!VIEW.has(v)) erori.push(`${k}: '${v}' nu e in uniunea View`);
    rezultat('2. view/aliases valide in types.ts View', erori);
}

// Test 3b: Stagii separat + Plati simplu + hub Plati acoperit (UAT 34)
{
    const erori: string[] = [];
    for (const nume of ['adminMenu', 'adminClubMenu', 'instructorMenu']) {
        const menu = MENIURI[nume];
        if (!menu.some(i => i.view === 'stagii')) erori.push(`${nume}: lipseste intrarea de nivel 1 'stagii'`);
        const comp = menu.find(i => i.view === 'competitii');
        if (comp && viewuriItem(comp).has('stagii')) erori.push(`${nume}: Competitii acopera inca 'stagii'`);
    }
    if (COMPETITII_HUB.tabs.some(t => t.view === 'stagii')) erori.push("COMPETITII_HUB contine inca tab 'stagii'");
    const sectiuniView = Object.values(SECTIUNI_PE_TAB).flat().filter(s => s !== 'sumar-incasari');
    for (const nume of ['adminMenu', 'adminClubMenu']) {
        const plati = MENIURI[nume].find(i => i.view === 'plati-hub');
        if (!plati) { erori.push(`${nume}: lipseste intrarea de nivel 1 'plati-hub'`); continue; }
        if (plati.submenu?.length) erori.push(`${nume}: intrarea Plati are inca submeniu`);
        const acoperite = viewuriItem(plati);
        for (const s of sectiuniView) if (!acoperite.has(s)) erori.push(`${nume}: Plati nu acopera '${s}'`);
    }
    for (const [nume, menu] of Object.entries(MENIURI))
        if (menu.some(i => i.label === 'Financiar')) erori.push(`${nume}: mai are intrare 'Financiar'`);
    rezultat('3b. Stagii separat + Plati simplu + hub Plati acoperit', erori);
}

// Test 3: paritate hub <-> meniu
{
    const erori: string[] = [];
    const hubPeMeniu: [HubDef, string[]][] = [
        [SPORTIVI_HUB, ['adminMenu', 'adminClubMenu']],
        [EXAMENE_HUB, ['adminMenu', 'adminClubMenu']],
        [COMPETITII_HUB, ['adminMenu', 'adminClubMenu', 'instructorMenu']],
        [FISA_HUB, ['sportivMenu']],
    ];
    for (const [hub, meniuri] of hubPeMeniu) for (const nume of meniuri) {
        const rolClubAdmin = nume !== 'instructorMenu';
        for (const t of hub.tabs) {
            if (t.minRole === 'clubAdmin' && !rolClubAdmin) continue; // tab invizibil instructorului
            const acoperit = MENIURI[nume].some(i => viewuriItem(i).has(t.view));
            if (!acoperit) erori.push(`${hub.id}/${t.view} neacoperit de ${nume}`);
        }
    }
    for (const nume of ['adminClubMenu', 'instructorMenu']) {
        const intrare = MENIURI[nume].find(i => i.label === 'Antrenamente');
        if (!intrare) { erori.push(`${nume}: lipseste 'Antrenamente'`); continue; }
        const vv = viewuriItem(intrare);
        const instr = nume === 'instructorMenu';
        for (const g of ACTIVITATE_SALA_GRUPURI) for (const t of g.taburi) {
            if (instr && (t.adminOnly || t.hideForInstructor)) continue;
            if (!instr && t.instructorOnly && vv.has('prezenta')) { /* 'prezenta' acopera aceeasi pozitie */ }
            if (!vv.has(t.view)) erori.push(`ActivitateSala/${t.view} neacoperit de ${nume}`);
        }
    }
    rezultat('3. paritate HubTabs/ActivitateSalaTabs <-> menuConfig', erori);
}

// Test 4: accesibilitate view-uri vechi
{
    const VECHI = [
        'dashboard', 'sportivi', 'familii', 'legitimatii', 'cereri-inscriere', 'cereri-gdpr', 'import-sportivi', 'deduplicare-sportivi',
        'examene', 'rapoarte-examen', 'audit-grade', 'competitii', 'stagii', 'activitati-nationale', 'template-probe',
        'plati-hub', 'plati-scadente', 'gestiune-facturi', 'facturi-fara-prezenta', 'jurnal-incasari', 'raport-financiar',
        'financial-dashboard', 'tipuri-abonament', 'configurare-preturi', 'reduceri', 'taxe-anuale', 'nomenclatoare',
        'perioade-vacanta', 'deconturi-federatie', 'cluburi', 'grade', 'user-management', 'structura-federatie', 'setari-club',
        'data-maintenance', 'inlantuiri-admin', 'account-settings', 'protectia-datelor', 'jurnal-audit', 'rapoarte', 'notificari',
        'admin-sms', 'istoric-activitate', 'admin-dashboard', 'button-catalog', 'grupe', 'sezoane', 'prezenta', 'prezenta-instructor',
        'program-antrenamente', 'calendar', 'raport-prezenta', 'raport-lunar-prezenta', 'activitati', 'produse', 'vanzari-produse',
        'my-portal', 'istoric-prezenta', 'istoric-plati', 'fisa-digitala', 'fisa-competitie', 'anunturi-federatie',
    ];
    const accesibile = new Set<string>();
    Object.values(MENIURI).forEach(m => viewuriDinMeniu(m).forEach(v => accesibile.add(v)));
    [SPORTIVI_HUB, EXAMENE_HUB, COMPETITII_HUB, FISA_HUB].forEach(h => h.tabs.forEach(t => accesibile.add(t.view)));
    ACTIVITATE_SALA_GRUPURI.forEach(g => g.taburi.forEach(t => accesibile.add(t.view)));

    // UserMenu + butoane dashboard: extrase din cod
    const surse = ['components/UserMenu.tsx', 'components/DeRezolvatCard.tsx', 'components/QuickAccess.tsx', 'components/AdminDashboard.tsx',
        'components/AdminMasterMap.tsx', 'components/UnifiedDashboard.tsx', 'components/SportivDashboard/index.tsx',
        ...readdirSync(join(root, 'components')).filter(f => /^FederationDashboard.*\.tsx$/.test(f)).map(f => `components/${f}`)];
    const rx = /(?:handleNavigate|setActiveView|navigate|onNavigate)\(\s*'([a-z0-9-]+)'|view:\s*'([a-z0-9-]+)'/g;
    for (const f of surse) for (const m of citeste(f).matchAll(rx)) { const v = m[1] ?? m[2]; if (VIEW.has(v)) accesibile.add(v); }

    rezultat(`4. accesibilitate ${VECHI.length} view-uri vechi`, VECHI.filter(v => !accesibile.has(v)).map(v => `'${v}' inaccesibil`));

    // ruta stearsa din AppRouter?
    const router = citeste('components/AppRouter.tsx');
    rezultat('4b. view-uri vechi inca prezente in AppRouter', VECHI.filter(v => !router.includes(`'${v}'`)).map(v => `'${v}' lipseste din AppRouter`));
}

// Test 5: contrast (doar raport)
{
    const lum = (hex: string) => {
        const h = hex.replace('#', '');
        const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
        const [r, g, b] = [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) / 255)
            .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const esteHex = (v: unknown): v is string => typeof v === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
    const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const teme = [QWANKIDO_BLUE, ...PREDEFINED_THEMES.filter(t => t.name !== QWANKIDO_BLUE.name)];
    const slabe: string[] = [];
    for (const t of teme as any[]) {
        for (const [fg, bg] of [['sidebarText', 'sidebarBg'], ['sidebarActiveFg', 'sidebarActive']]) {
            if (!esteHex(t[fg]) || !esteHex(t[bg])) { console.log(`WARN ${t.name}: ${fg}/${bg} non-hex, ignorat`); continue; }
            const c = contrast(t[fg], t[bg]);
            if (c < 4.5) slabe.push(`${t.name}: ${fg}/${bg} = ${c.toFixed(2)}:1`);
        }
    }
    console.log(`INFO 5. contrast pe ${teme.length} teme: ${slabe.length} perechi sub 4,5:1 (raport, nu pica)`);
    slabe.forEach(s => console.log(`   - ${s}`));
}

console.log(esecuri ? `\n${esecuri} test(e) esuate` : '\nToate testele 1-4 OK');
process.exit(esecuri ? 1 : 0);
