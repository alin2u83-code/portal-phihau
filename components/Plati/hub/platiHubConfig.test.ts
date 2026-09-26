/**
 * Test colocat pentru components/Plati/hub/platiHubConfig.ts
 *
 * NOTĂ: Proiectul nu are vitest/jest configurat (doar Playwright E2E).
 * Testul este scris ca funcții exportabile cu asserții simple.
 * Rulare: `npx tsx components/Plati/hub/platiHubConfig.test.ts`
 * Model exact: utils/perioadaGratie.test.ts.
 */

import {
    rezolvaPozitieHub,
    VEDERI_HUB,
    esteVedereHub,
    esteTabHub,
    esteSectiuneHub,
    SECTIUNI_PE_TAB,
    TAB_PENTRU_SECTIUNE,
    SECTIUNE_IMPLICITA,
    ETICHETE_TABURI,
    ETICHETE_SECTIUNI,
    TABURI_HUB,
    type SectiuneHub,
} from './platiHubConfig';

function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(`FAIL: ${message}`);
    }
    console.log(`PASS: ${message}`);
}

function assertPozitie(rezultat: { tab: string; sectiune: string }, asteptat: { tab: string; sectiune: string }, mesaj: string) {
    assert(
        rezultat.tab === asteptat.tab && rezultat.sectiune === asteptat.sectiune,
        `${mesaj} — asteptat {tab:'${asteptat.tab}', sectiune:'${asteptat.sectiune}'}, primit {tab:'${rezultat.tab}', sectiune:'${rezultat.sectiune}'}`
    );
}

/** Harta asteptata D-01..D-04, scrisa explicit (nu derivata din codul testat). */
const HARTA_ASTEPTATA_SECTIUNE_TAB: Record<SectiuneHub, string> = {
    'plati-scadente': 'facturi',
    'gestiune-facturi': 'facturi',
    'facturi-fara-prezenta': 'facturi',
    'jurnal-incasari': 'incasari',
    'istoric-plati': 'incasari',
    'raport-financiar': 'rapoarte',
    'financial-dashboard': 'rapoarte',
    'tipuri-abonament': 'configurare',
    'configurare-preturi': 'configurare',
    'reduceri': 'configurare',
    'taxe-anuale': 'configurare',
    'nomenclatoare': 'configurare',
};

/**
 * Rulează toate testele și returnează { passed, failed, errors }
 */
export function runTests(): { passed: number; failed: number; errors: string[] } {
    const errors: string[] = [];
    let passed = 0;
    let failed = 0;

    const run = (name: string, fn: () => void) => {
        try {
            fn();
            passed++;
        } catch (e: any) {
            failed++;
            errors.push(`${name}: ${e.message}`);
            console.error(`FAIL: ${name} — ${e.message}`);
        }
    };

    // ─────────────────────────────────────────────
    run('T1: plati-hub + viewParams null → facturi/plati-scadente (implicit)', () => {
        const r = rezolvaPozitieHub('plati-hub' as any, null, true);
        assertPozitie(r, { tab: 'facturi', sectiune: 'plati-scadente' }, 'T1');
    });

    run('T2: plati-hub + { tab: rapoarte } → rapoarte/raport-financiar (implicit tab)', () => {
        const r = rezolvaPozitieHub('plati-hub' as any, { tab: 'rapoarte' }, true);
        assertPozitie(r, { tab: 'rapoarte', sectiune: 'raport-financiar' }, 'T2');
    });

    run('T3: plati-hub + { tab: incasari, sectiune: jurnal-incasari } → incasari/jurnal-incasari', () => {
        const r = rezolvaPozitieHub('plati-hub' as any, { tab: 'incasari', sectiune: 'jurnal-incasari' }, true);
        assertPozitie(r, { tab: 'incasari', sectiune: 'jurnal-incasari' }, 'T3');
    });

    run('T4: sectiunea castiga peste tab-ul din viewParams (tab=facturi, sectiune=raport-financiar)', () => {
        const r = rezolvaPozitieHub('plati-hub' as any, { tab: 'facturi', sectiune: 'raport-financiar' }, true);
        assertPozitie(r, { tab: 'rapoarte', sectiune: 'raport-financiar' }, 'T4');
    });

    run('T5: sectiune invalida in viewParams → fallback implicit facturi/plati-scadente', () => {
        const r = rezolvaPozitieHub('plati-hub' as any, { sectiune: 'inexistent' }, true);
        assertPozitie(r, { tab: 'facturi', sectiune: 'plati-scadente' }, 'T5');
    });

    run('T6: literal vechi gestiune-facturi + viewParams straine (sportivId) → facturi/gestiune-facturi', () => {
        const r = rezolvaPozitieHub('gestiune-facturi' as any, { sportivId: 'x' }, true);
        assertPozitie(r, { tab: 'facturi', sectiune: 'gestiune-facturi' }, 'T6');
    });

    run('T7: viewParams castiga peste literalul vechi din activeView', () => {
        const r = rezolvaPozitieHub('plati-scadente' as any, { tab: 'rapoarte', sectiune: 'financial-dashboard' }, true);
        assertPozitie(r, { tab: 'rapoarte', sectiune: 'financial-dashboard' }, 'T7');
    });

    run('T8: literal vechi istoric-plati, fara viewParams → incasari/istoric-plati', () => {
        const r = rezolvaPozitieHub('istoric-plati' as any, null, true);
        assertPozitie(r, { tab: 'incasari', sectiune: 'istoric-plati' }, 'T8');
    });

    run('T9: literal vechi nomenclatoare, fara viewParams → configurare/nomenclatoare', () => {
        const r = rezolvaPozitieHub('nomenclatoare' as any, null, true);
        assertPozitie(r, { tab: 'configurare', sectiune: 'nomenclatoare' }, 'T9');
    });

    run('T10: literal vechi taxe-anuale, poateVedeaTaxeAnuale=true → configurare/taxe-anuale', () => {
        const r = rezolvaPozitieHub('taxe-anuale' as any, null, true);
        assertPozitie(r, { tab: 'configurare', sectiune: 'taxe-anuale' }, 'T10');
    });

    run('T11: literal vechi taxe-anuale, poateVedeaTaxeAnuale=false → fallback configurare/tipuri-abonament', () => {
        const r = rezolvaPozitieHub('taxe-anuale' as any, null, false);
        assertPozitie(r, { tab: 'configurare', sectiune: 'tipuri-abonament' }, 'T11');
    });

    run('T12: activeView necunoscut hub-ului (dashboard) → fallback implicit facturi/plati-scadente', () => {
        const r = rezolvaPozitieHub('dashboard' as any, null, true);
        assertPozitie(r, { tab: 'facturi', sectiune: 'plati-scadente' }, 'T12');
    });

    run('T13: TAB_PENTRU_SECTIUNE respecta gruparea D-01..D-04 pentru toate cele 12 sectiuni', () => {
        const chei = Object.keys(HARTA_ASTEPTATA_SECTIUNE_TAB) as SectiuneHub[];
        assert(chei.length === 12, `asteptate 12 sectiuni in harta de test, gasite ${chei.length}`);
        for (const sectiune of chei) {
            const tabAsteptat = HARTA_ASTEPTATA_SECTIUNE_TAB[sectiune];
            const tabReal = TAB_PENTRU_SECTIUNE[sectiune];
            assert(tabReal === tabAsteptat, `sectiunea '${sectiune}' asteptata pe tab '${tabAsteptat}', gasita pe '${tabReal}'`);
        }
    });

    run('T14: VEDERI_HUB are exact 13 elemente si include plati-hub', () => {
        assert(VEDERI_HUB.length === 13, `asteptate 13 elemente in VEDERI_HUB, gasite ${VEDERI_HUB.length}`);
        assert((VEDERI_HUB as readonly string[]).includes('plati-hub'), 'VEDERI_HUB trebuie sa contina plati-hub');
    });

    run('T15: esteVedereHub respinge familii si deconturi-federatie (D-05), accepta plati-hub', () => {
        assert(esteVedereHub('familii') === false, "esteVedereHub('familii') trebuie sa fie false");
        assert(esteVedereHub('deconturi-federatie') === false, "esteVedereHub('deconturi-federatie') trebuie sa fie false");
        assert(esteVedereHub('plati-hub') === true, "esteVedereHub('plati-hub') trebuie sa fie true");
    });

    run('T16: esteTabHub si esteSectiuneHub disting corect valori valide de invalide', () => {
        assert(esteTabHub('facturi') === true, "esteTabHub('facturi') trebuie sa fie true");
        assert(esteTabHub('inexistent') === false, "esteTabHub('inexistent') trebuie sa fie false");
        assert(esteSectiuneHub('nomenclatoare') === true, "esteSectiuneHub('nomenclatoare') trebuie sa fie true");
        assert(esteSectiuneHub('familii') === false, "esteSectiuneHub('familii') trebuie sa fie false");
    });

    run('T17: TABURI_HUB are exact 4 tab-uri, in ordinea Facturi/Incasari/Rapoarte/Configurare', () => {
        assert(
            JSON.stringify(TABURI_HUB) === JSON.stringify(['facturi', 'incasari', 'rapoarte', 'configurare']),
            `ordine neasteptata TABURI_HUB: ${JSON.stringify(TABURI_HUB)}`
        );
    });

    run('T18: SECTIUNE_IMPLICITA e primul element din SECTIUNI_PE_TAB pentru fiecare tab', () => {
        for (const tab of TABURI_HUB) {
            assert(
                SECTIUNE_IMPLICITA[tab] === SECTIUNI_PE_TAB[tab][0],
                `SECTIUNE_IMPLICITA['${tab}'] trebuie sa fie '${SECTIUNI_PE_TAB[tab][0]}', gasit '${SECTIUNE_IMPLICITA[tab]}'`
            );
        }
    });

    run('T19: ETICHETE_TABURI si ETICHETE_SECTIUNI au etichete non-goale pentru toate cheile', () => {
        for (const tab of TABURI_HUB) {
            assert(!!ETICHETE_TABURI[tab], `ETICHETE_TABURI['${tab}'] nu trebuie sa fie gol`);
        }
        for (const sectiune of Object.keys(TAB_PENTRU_SECTIUNE) as SectiuneHub[]) {
            assert(!!ETICHETE_SECTIUNI[sectiune], `ETICHETE_SECTIUNI['${sectiune}'] nu trebuie sa fie gol`);
        }
    });

    return { passed, failed, errors };
}

// ─────────────────────────────────────────────
// Auto-run dacă acest fișier e executat direct
// ─────────────────────────────────────────────
if (process.argv[1]?.endsWith('platiHubConfig.test.ts') || process.argv[1]?.endsWith('platiHubConfig.test.js')) {
    const { passed, failed, errors } = runTests();
    console.log(`\nRezultat: ${passed} PASS, ${failed} FAIL`);
    if (errors.length > 0) {
        console.error('Erori:', errors);
        process.exit(1);
    }
}
