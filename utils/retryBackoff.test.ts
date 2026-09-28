/**
 * Test colocat pentru utils/retryBackoff.ts
 * Rulare: `node --import tsx utils/retryBackoff.test.ts`
 * Fără sleep real — `asteapta` e injectat, doar înregistrează delay-urile.
 */

import { executaCuReincercare, calculeazaDelayReincercare, DELAY_PREVENTIV_MS, InfoReincercare } from './retryBackoff';

function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(`FAIL: ${message}`);
    }
    console.log(`PASS: ${message}`);
}

function raspuns(status: number, headers?: Record<string, string>): Response {
    return new Response(null, { status, headers });
}

export async function ruleazaTeste(): Promise<{ passed: number; failed: number; errors: string[] }> {
    const errors: string[] = [];
    let passed = 0;
    let failed = 0;

    const run = async (name: string, fn: () => Promise<void> | void) => {
        try {
            await fn();
            passed++;
        } catch (e: any) {
            failed++;
            errors.push(`${name}: ${e.message}`);
            console.error(`FAIL: ${name} — ${e.message}`);
        }
    };

    await run('T1: apel intoarce 200 -> incercari = 1, laReincercare nu e apelat', async () => {
        let apeluri = 0;
        let reincercariApelate = 0;
        const { response, incercari } = await executaCuReincercare(
            async () => { apeluri++; return raspuns(200); },
            { laReincercare: () => { reincercariApelate++; }, asteapta: async () => {} }
        );
        assert(response.status === 200, `status 200, primit ${response.status}`);
        assert(incercari === 1, `incercari=1, primit ${incercari}`);
        assert(apeluri === 1, `apeluri=1, primit ${apeluri}`);
        assert(reincercariApelate === 0, `laReincercare 0 apeluri, primit ${reincercariApelate}`);
    });

    await run('T2: 429, 429, 200 -> incercari = 3, delay-uri [1000, 3000]', async () => {
        const secventa = [429, 429, 200];
        let index = 0;
        const delaysAsteptate: number[] = [];
        const infoReincercari: InfoReincercare[] = [];
        const { response, incercari } = await executaCuReincercare(
            async () => raspuns(secventa[index++]),
            {
                laReincercare: (info) => infoReincercari.push(info),
                asteapta: async (ms) => { delaysAsteptate.push(ms); },
            }
        );
        assert(response.status === 200, `status final 200, primit ${response.status}`);
        assert(incercari === 3, `incercari=3, primit ${incercari}`);
        assert(JSON.stringify(delaysAsteptate) === JSON.stringify([1000, 3000]), `delay-uri [1000,3000], primit ${JSON.stringify(delaysAsteptate)}`);
        assert(infoReincercari.length === 2 && infoReincercari[0].reincercare === 1 && infoReincercari[1].reincercare === 2, `reincercare 1 si 2, primit ${JSON.stringify(infoReincercari)}`);
        assert(infoReincercari[0].totalReincercari === 3, `totalReincercari=3, primit ${infoReincercari[0].totalReincercari}`);
    });

    await run('T3: 429 de 4 ori -> incercari = 4, delay-uri [1000,3000,9000], status final 429', async () => {
        const delaysAsteptate: number[] = [];
        const { response, incercari } = await executaCuReincercare(
            async () => raspuns(429),
            { asteapta: async (ms) => { delaysAsteptate.push(ms); } }
        );
        assert(response.status === 429, `status final 429, primit ${response.status}`);
        assert(incercari === 4, `incercari=4, primit ${incercari}`);
        assert(JSON.stringify(delaysAsteptate) === JSON.stringify([1000, 3000, 9000]), `delay-uri [1000,3000,9000], primit ${JSON.stringify(delaysAsteptate)}`);
    });

    await run('T4: 400 -> incercari = 1 (fara reincercare)', async () => {
        const { response, incercari } = await executaCuReincercare(async () => raspuns(400), { asteapta: async () => {} });
        assert(response.status === 400 && incercari === 1, `primit status=${response.status} incercari=${incercari}`);
    });

    await run('T5: 500 -> incercari = 1', async () => {
        const { response, incercari } = await executaCuReincercare(async () => raspuns(500), { asteapta: async () => {} });
        assert(response.status === 500 && incercari === 1, `primit status=${response.status} incercari=${incercari}`);
    });

    await run("T6: 429 cu Retry-After '20', apoi 200 -> delay-uri [20000]", async () => {
        const secventa = [() => raspuns(429, { 'Retry-After': '20' }), () => raspuns(200)];
        let index = 0;
        const delaysAsteptate: number[] = [];
        await executaCuReincercare(async () => secventa[index++](), { asteapta: async (ms) => { delaysAsteptate.push(ms); } });
        assert(JSON.stringify(delaysAsteptate) === JSON.stringify([20000]), `primit ${JSON.stringify(delaysAsteptate)}`);
    });

    await run("T7: 429 cu Retry-After '999', apoi 200 -> delay-uri [60000] (plafon)", async () => {
        const secventa = [() => raspuns(429, { 'Retry-After': '999' }), () => raspuns(200)];
        let index = 0;
        const delaysAsteptate: number[] = [];
        await executaCuReincercare(async () => secventa[index++](), { asteapta: async (ms) => { delaysAsteptate.push(ms); } });
        assert(JSON.stringify(delaysAsteptate) === JSON.stringify([60000]), `primit ${JSON.stringify(delaysAsteptate)}`);
    });

    await run('T8: apel arunca TypeError -> promisiunea e respinsa, apel chemat o singura data', async () => {
        let apeluri = 0;
        let aAruncat = false;
        try {
            await executaCuReincercare(async () => { apeluri++; throw new TypeError('eroare de rețea'); }, { asteapta: async () => {} });
        } catch (e) {
            aAruncat = e instanceof TypeError;
        }
        assert(aAruncat, 'promisiunea trebuie respinsă cu TypeError');
        assert(apeluri === 1, `apel chemat o singură dată, primit ${apeluri}`);
    });

    await run('T9: calculeazaDelayReincercare(7, null) = 9000', () => {
        const d = calculeazaDelayReincercare(7, null);
        assert(d === 9000, `primit ${d}`);
    });

    await run("T10: calculeazaDelayReincercare(0, 'abc') = 1000", () => {
        const d = calculeazaDelayReincercare(0, 'abc');
        assert(d === 1000, `primit ${d}`);
    });

    await run('T11: DELAY_PREVENTIV_MS = 500', () => {
        assert(DELAY_PREVENTIV_MS === 500, `primit ${DELAY_PREVENTIV_MS}`);
    });

    return { passed, failed, errors };
}

if (process.argv[1]?.endsWith('retryBackoff.test.ts') || process.argv[1]?.endsWith('retryBackoff.test.js')) {
    ruleazaTeste().then(({ passed, failed, errors }) => {
        console.log(`\nRezultat: ${passed} PASS, ${failed} FAIL`);
        if (errors.length > 0) {
            console.error('Erori:', errors);
            process.exit(1);
        }
    });
}
