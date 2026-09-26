/**
 * Test colocat pentru utils/notificariRestantieri.ts
 *
 * NOTĂ: Proiectul nu are vitest/jest configurat (doar Playwright E2E).
 * Testul este scris ca funcții exportabile cu asserții simple.
 * Rulare: `npx tsx utils/notificariRestantieri.test.ts`
 * Pattern identic cu utils/perioadaGratie.test.ts.
 */

import type { Plata, Sportiv, Familie } from '../types';
import { formatLuna } from './luniLipsa';
import {
    normalizeazaTelefonWa,
    formateazaSumaLei,
    construiesteMesajRestanta,
    construiesteLinkWhatsApp,
    genereazaNotificariRestantieri,
    luniCuAbonamenteRestante,
} from './notificariRestantieri';

function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(`FAIL: ${message}`);
    }
    console.log(`PASS: ${message}`);
}

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
    // normalizeazaTelefonWa
    // ─────────────────────────────────────────────
    run("normalizeazaTelefonWa('0722 123 456') === '40722123456'", () => {
        assert(normalizeazaTelefonWa('0722 123 456') === '40722123456', 'format local cu spatii');
    });
    run("normalizeazaTelefonWa('+40 722-123-456') === '40722123456'", () => {
        assert(normalizeazaTelefonWa('+40 722-123-456') === '40722123456', 'format international cu +');
    });
    run("normalizeazaTelefonWa('0040722123456') === '40722123456'", () => {
        assert(normalizeazaTelefonWa('0040722123456') === '40722123456', 'prefix 00');
    });
    run("normalizeazaTelefonWa('722123456') === '40722123456'", () => {
        assert(normalizeazaTelefonWa('722123456') === '40722123456', '9 cifre incepe cu 7');
    });
    run("normalizeazaTelefonWa('0722123456 / 0733111222') === '40722123456' (primul numar)", () => {
        assert(normalizeazaTelefonWa('0722123456 / 0733111222') === '40722123456', 'ia primul numar din mai multe');
    });
    run("normalizeazaTelefonWa('+39 333 1234567') === '393331234567'", () => {
        assert(normalizeazaTelefonWa('+39 333 1234567') === '393331234567', 'numar strain, deja international');
    });
    run('normalizeazaTelefonWa(null/undefined/gol/invalid) === null', () => {
        assert(normalizeazaTelefonWa(null) === null, 'null');
        assert(normalizeazaTelefonWa(undefined) === null, 'undefined');
        assert(normalizeazaTelefonWa('') === null, 'string gol');
        assert(normalizeazaTelefonWa('123') === null, 'prea scurt');
        assert(normalizeazaTelefonWa('abc') === null, 'fara cifre');
    });

    // ─────────────────────────────────────────────
    // formateazaSumaLei
    // ─────────────────────────────────────────────
    run("formateazaSumaLei(150) === '150'", () => {
        assert(formateazaSumaLei(150) === '150', `primit '${formateazaSumaLei(150)}'`);
    });
    run("formateazaSumaLei(150.5) === '150,50'", () => {
        assert(formateazaSumaLei(150.5) === '150,50', `primit '${formateazaSumaLei(150.5)}'`);
    });

    // ─────────────────────────────────────────────
    // construiesteMesajRestanta
    // ─────────────────────────────────────────────
    run('construiesteMesajRestanta cu 1 nume', () => {
        const expected = `Bună ziua! Popescu Ana are de achitat taxa lunară 150 lei pentru ${formatLuna(9, 2026)}. Mulțumim!`;
        const rezultat = construiesteMesajRestanta(['Popescu Ana'], 150, 9, 2026);
        assert(rezultat === expected, `asteptat '${expected}', primit '${rezultat}'`);
    });
    run('construiesteMesajRestanta cu 2 nume contine "și" si "au"', () => {
        const rezultat = construiesteMesajRestanta(['Popescu Ana', 'Popescu Ion'], 300, 9, 2026);
        assert(
            rezultat.includes('Popescu Ana și Popescu Ion au de achitat taxa lunară 300 lei'),
            `mesaj neasteptat: '${rezultat}'`
        );
    });
    run('construiesteMesajRestanta cu 3 nume: "A, B și C au de achitat"', () => {
        const rezultat = construiesteMesajRestanta(['A', 'B', 'C'], 100, 9, 2026);
        assert(rezultat.includes('A, B și C au de achitat'), `mesaj neasteptat: '${rezultat}'`);
    });

    // ─────────────────────────────────────────────
    // construiesteLinkWhatsApp
    // ─────────────────────────────────────────────
    run('construiesteLinkWhatsApp incepe cu prefixul corect si roundtrip decode', () => {
        const mesaj = 'Bună ziua! A & B?';
        const link = construiesteLinkWhatsApp('40722123456', mesaj);
        assert(link.startsWith('https://wa.me/40722123456?text='), `link: '${link}'`);
        const partea = link.split('?text=')[1];
        assert(!partea.includes(' ') && !partea.includes('&'), 'text-ul encodat nu trebuie sa contina spatii sau & neencodate');
        assert(decodeURIComponent(partea) === mesaj, `decode: '${decodeURIComponent(partea)}' !== '${mesaj}'`);
    });

    // ─────────────────────────────────────────────
    // Fixtures comune pentru genereazaNotificariRestantieri
    // ─────────────────────────────────────────────
    const sportivAna = {
        id: 's1', nume: 'Popescu', prenume: 'Ana', status: 'Activ',
        club_id: 'club-1', familie_id: null, telefon: '0722123456',
    };
    const sportivIon = {
        id: 's2', nume: 'Popescu', prenume: 'Ion', status: 'Activ',
        club_id: 'club-1', familie_id: null, telefon: '+40722123456', // acelasi numar, scris diferit
    };
    const sportivFaraTelefon1 = {
        id: 's3', nume: 'Ionescu', prenume: 'Mara', status: 'Activ',
        club_id: 'club-1', familie_id: null, telefon: null,
    };
    const sportivFaraTelefon2 = {
        id: 's4', nume: 'Vasilescu', prenume: 'Dan', status: 'Activ',
        club_id: 'club-1', familie_id: null, telefon: null,
    };
    const sportivAltClub = {
        id: 's5', nume: 'Georgescu', prenume: 'Vlad', status: 'Activ',
        club_id: 'club-2', familie_id: null, telefon: '0733111222',
    };
    const membruFamilie1 = {
        id: 's6', nume: 'Dumitrescu', prenume: 'Radu', status: 'Activ',
        club_id: 'club-1', familie_id: 'fam-1', telefon: '0744555666',
    };
    const membruFamilie2 = {
        id: 's7', nume: 'Dumitrescu', prenume: 'Sara', status: 'Activ',
        club_id: 'club-1', familie_id: 'fam-1', telefon: null,
    };
    const reprezentantFaraTelefon = {
        id: 's8', nume: 'Dumitrescu', prenume: 'Parinte', status: 'Activ',
        club_id: 'club-1', familie_id: 'fam-1', telefon: null,
    };

    const sportivi = [
        sportivAna, sportivIon, sportivFaraTelefon1, sportivFaraTelefon2,
        sportivAltClub, membruFamilie1, membruFamilie2, reprezentantFaraTelefon,
    ] as Sportiv[];

    const familii = [
        { id: 'fam-1', nume: 'Dumitrescu', club_id: 'club-1', reprezentant_id: 's8' },
    ] as Familie[];

    // ─────────────────────────────────────────────
    // Excludere: status Achitat/Anulat, tip diferit, alta luna/an, alt club
    // ─────────────────────────────────────────────
    run('genereazaNotificariRestantieri exclude Achitat/Anulat/alt tip/alta luna/alt club', () => {
        const plati = [
            { id: 'p1', sportiv_id: 's1', familie_id: null, club_id: 'club-1', suma: 150, data: '2026-09-05', status: 'Achitat', tip: 'Abonament', luna: 9, an: 2026 },
            { id: 'p2', sportiv_id: 's1', familie_id: null, club_id: 'club-1', suma: 150, data: '2026-09-05', status: 'Anulat', tip: 'Abonament', luna: 9, an: 2026 },
            { id: 'p3', sportiv_id: 's1', familie_id: null, club_id: 'club-1', suma: 150, data: '2026-09-05', status: 'Neachitat', tip: 'Taxa Examen', luna: 9, an: 2026 },
            { id: 'p4', sportiv_id: 's1', familie_id: null, club_id: 'club-1', suma: 150, data: '2026-08-05', status: 'Neachitat', tip: 'Abonament', luna: 8, an: 2026 },
            { id: 'p5', sportiv_id: 's5', familie_id: null, club_id: 'club-2', suma: 150, data: '2026-09-05', status: 'Neachitat', tip: 'Abonament', luna: 9, an: 2026 },
        ] as Plata[];

        const rezultat = genereazaNotificariRestantieri({ plati, sportivi, familii, luna: 9, an: 2026, clubId: 'club-1' });
        assert(rezultat.length === 0, `asteptat 0 notificari, primit ${rezultat.length}: ${JSON.stringify(rezultat)}`);
    });

    // ─────────────────────────────────────────────
    // Include: Neachitat individual (sursa 'sportiv') + Achitat Parțial (areAchitariPartiale)
    // ─────────────────────────────────────────────
    run('genereazaNotificariRestantieri include Neachitat individual + Achitat Parțial', () => {
        const plati = [
            { id: 'p1', sportiv_id: 's3', familie_id: null, club_id: 'club-1', suma: 150, data: '2026-09-05', status: 'Neachitat', tip: 'Abonament', luna: 9, an: 2026 },
            { id: 'p2', sportiv_id: 's4', familie_id: null, club_id: 'club-1', suma: 150, data: '2026-09-05', status: 'Achitat Parțial', tip: 'Abonament', luna: 9, an: 2026 },
        ] as Plata[];

        const rezultat = genereazaNotificariRestantieri({ plati, sportivi, familii, luna: 9, an: 2026, clubId: 'club-1' });
        assert(rezultat.length === 2, `asteptat 2 notificari, primit ${rezultat.length}`);

        const notifPartiala = rezultat.find(n => n.plataIds.includes('p2'));
        assert(!!notifPartiala && notifPartiala.areAchitariPartiale === true, 'areAchitariPartiale trebuie true pt p2');

        const notifNeachitata = rezultat.find(n => n.plataIds.includes('p1'));
        assert(!!notifNeachitata && notifNeachitata.telefonWa === null, 'sportiv fara telefon -> telefonWa null');
        assert(!!notifNeachitata && notifNeachitata.sursaTelefon === 'sportiv', 'factura individuala: sursaTelefon ramane "sportiv" (sursa datelor), chiar daca telefonul e invalid/lipsa');
    });

    // ─────────────────────────────────────────────
    // Factura de familie: reprezentant cu telefon valid
    // ─────────────────────────────────────────────
    run('genereazaNotificariRestantieri factura de familie foloseste telefonul reprezentantului', () => {
        const familiiCuReprezentantValid = [
            { id: 'fam-2', nume: 'Ionescu', club_id: 'club-1', reprezentant_id: 's-rep' },
        ] as Familie[];
        const sportiviFam = [
            { id: 's-rep', nume: 'Ionescu', prenume: 'Parinte', status: 'Activ', club_id: 'club-1', familie_id: 'fam-2', telefon: '0755123456' },
            { id: 's-copil1', nume: 'Ionescu', prenume: 'Copil1', status: 'Activ', club_id: 'club-1', familie_id: 'fam-2', telefon: null },
        ] as Sportiv[];
        const plati = [
            { id: 'p1', sportiv_id: null, familie_id: 'fam-2', club_id: 'club-1', suma: 200, data: '2026-09-05', status: 'Neachitat', tip: 'Abonament', luna: 9, an: 2026 },
        ] as Plata[];

        const rezultat = genereazaNotificariRestantieri({ plati, sportivi: sportiviFam, familii: familiiCuReprezentantValid, luna: 9, an: 2026 });
        assert(rezultat.length === 1, `asteptat 1 notificare, primit ${rezultat.length}`);
        assert(rezultat[0].sursaTelefon === 'reprezentant_familie', `sursa: ${rezultat[0].sursaTelefon}`);
        assert(rezultat[0].telefonWa === '40755123456', `telefonWa: ${rezultat[0].telefonWa}`);
    });

    // ─────────────────────────────────────────────
    // Factura de familie: reprezentant FARA telefon valid -> fallback primul membru cu telefon
    // ─────────────────────────────────────────────
    run('genereazaNotificariRestantieri familie: reprezentant fara telefon -> fallback membru', () => {
        const plati = [
            { id: 'p1', sportiv_id: null, familie_id: 'fam-1', club_id: 'club-1', suma: 200, data: '2026-09-05', status: 'Neachitat', tip: 'Abonament', luna: 9, an: 2026 },
        ] as Plata[];

        const rezultat = genereazaNotificariRestantieri({ plati, sportivi, familii, luna: 9, an: 2026, clubId: 'club-1' });
        assert(rezultat.length === 1, `asteptat 1 notificare, primit ${rezultat.length}`);
        assert(rezultat[0].sursaTelefon === 'membru_familie', `sursa: ${rezultat[0].sursaTelefon}`);
        assert(rezultat[0].telefonWa === '40744555666', `telefonWa: ${rezultat[0].telefonWa}`);
        // 3 membri activi in fam-1: membruFamilie1, membruFamilie2 si reprezentantul insusi
        // (reprezentant_id e id-ul unui SPORTIV membru al familiei — deci apare si in lista de membri)
        assert(rezultat[0].numeSportivi.length === 3, `numeSportivi (membri activi): ${JSON.stringify(rezultat[0].numeSportivi)}`);
    });

    // ─────────────────────────────────────────────
    // Grupare: doua facturi individuale, acelasi telefon (scris diferit) -> 1 notificare
    // ─────────────────────────────────────────────
    run('genereazaNotificariRestantieri grupeaza 2 facturi cu acelasi telefon (format diferit)', () => {
        const plati = [
            { id: 'p1', sportiv_id: 's1', familie_id: null, club_id: 'club-1', suma: 150, data: '2026-09-05', status: 'Neachitat', tip: 'Abonament', luna: 9, an: 2026 },
            { id: 'p2', sportiv_id: 's2', familie_id: null, club_id: 'club-1', suma: 150, data: '2026-09-05', status: 'Neachitat', tip: 'Abonament', luna: 9, an: 2026 },
        ] as Plata[];

        const rezultat = genereazaNotificariRestantieri({ plati, sportivi, familii, luna: 9, an: 2026, clubId: 'club-1' });
        assert(rezultat.length === 1, `asteptat 1 notificare grupata, primit ${rezultat.length}`);
        assert(rezultat[0].suma === 300, `suma totala: ${rezultat[0].suma}`);
        assert(rezultat[0].numeSportivi.length === 2, `numeSportivi: ${JSON.stringify(rezultat[0].numeSportivi)}`);
        assert(rezultat[0].mesaj.includes(' au de achitat'), `mesaj: ${rezultat[0].mesaj}`);
    });

    // ─────────────────────────────────────────────
    // Doua facturi fara telefon -> DOUA notificari separate
    // ─────────────────────────────────────────────
    run('genereazaNotificariRestantieri 2 facturi fara telefon -> 2 notificari separate', () => {
        const plati = [
            { id: 'p1', sportiv_id: 's3', familie_id: null, club_id: 'club-1', suma: 150, data: '2026-09-05', status: 'Neachitat', tip: 'Abonament', luna: 9, an: 2026 },
            { id: 'p2', sportiv_id: 's4', familie_id: null, club_id: 'club-1', suma: 150, data: '2026-09-05', status: 'Neachitat', tip: 'Abonament', luna: 9, an: 2026 },
        ] as Plata[];

        const rezultat = genereazaNotificariRestantieri({ plati, sportivi, familii, luna: 9, an: 2026, clubId: 'club-1' });
        assert(rezultat.length === 2, `asteptat 2 notificari separate, primit ${rezultat.length}`);
        assert(rezultat.every(n => n.telefonWa === null), 'ambele fara telefonWa');
        assert(new Set(rezultat.map(n => n.cheie)).size === 2, 'cheile trebuie sa fie distincte');
    });

    // ─────────────────────────────────────────────
    // Factura fara luna/an dar cu data '2026-09-05' -> tratata ca luna 9 / an 2026
    // ─────────────────────────────────────────────
    run("genereazaNotificariRestantieri: factura fara luna/an, data '2026-09-05' -> luna 9/an 2026", () => {
        const plati = [
            { id: 'p1', sportiv_id: 's1', familie_id: null, club_id: 'club-1', suma: 150, data: '2026-09-05', status: 'Neachitat', tip: 'Abonament', luna: null, an: null },
        ] as unknown as Plata[];

        const rezultat = genereazaNotificariRestantieri({ plati, sportivi, familii, luna: 9, an: 2026, clubId: 'club-1' });
        assert(rezultat.length === 1, `asteptat 1 notificare (fallback din data), primit ${rezultat.length}`);
        assert(rezultat[0].luna === 9 && rezultat[0].an === 2026, `luna/an: ${rezultat[0].luna}/${rezultat[0].an}`);
    });

    // ─────────────────────────────────────────────
    // luniCuAbonamenteRestante: perechi distincte, sortate descrescator
    // ─────────────────────────────────────────────
    run('luniCuAbonamenteRestante returneaza perechi distincte sortate descrescator', () => {
        const plati = [
            { id: 'p1', sportiv_id: 's1', familie_id: null, club_id: 'club-1', suma: 150, data: '2026-07-05', status: 'Neachitat', tip: 'Abonament', luna: 7, an: 2026 },
            { id: 'p2', sportiv_id: 's2', familie_id: null, club_id: 'club-1', suma: 150, data: '2026-09-05', status: 'Neachitat', tip: 'Abonament', luna: 9, an: 2026 },
            { id: 'p3', sportiv_id: 's3', familie_id: null, club_id: 'club-1', suma: 150, data: '2026-09-05', status: 'Neachitat', tip: 'Abonament', luna: 9, an: 2026 }, // duplicat luna/an
            { id: 'p4', sportiv_id: 's1', familie_id: null, club_id: 'club-1', suma: 150, data: '2026-08-05', status: 'Achitat', tip: 'Abonament', luna: 8, an: 2026 }, // achitat, ignorat
            { id: 'p5', sportiv_id: 's1', familie_id: null, club_id: 'club-1', suma: 150, data: '2026-06-05', status: 'Neachitat', tip: 'Taxa Examen', luna: 6, an: 2026 }, // alt tip, ignorat
        ] as Plata[];

        const rezultat = luniCuAbonamenteRestante(plati);
        assert(rezultat.length === 2, `asteptat 2 perechi distincte, primit ${rezultat.length}: ${JSON.stringify(rezultat)}`);
        assert(rezultat[0].luna === 9 && rezultat[0].an === 2026, 'prima pereche (cea mai recenta) trebuie sa fie 9/2026');
        assert(rezultat[1].luna === 7 && rezultat[1].an === 2026, 'a doua pereche trebuie sa fie 7/2026');
    });

    return { passed, failed, errors };
}

// ─────────────────────────────────────────────
// Auto-run dacă acest fișier e executat direct
// ─────────────────────────────────────────────
if (process.argv[1]?.endsWith('notificariRestantieri.test.ts') || process.argv[1]?.endsWith('notificariRestantieri.test.js')) {
    const { passed, failed, errors } = runTests();
    console.log(`\nRezultat: ${passed} PASS, ${failed} FAIL`);
    if (errors.length > 0) {
        console.error('Erori:', errors);
        process.exit(1);
    }
}
