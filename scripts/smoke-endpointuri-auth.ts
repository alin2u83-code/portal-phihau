/**
 * Smoke test fără DB pentru endpoint-urile securizate în Faza 32 (D-04/D-07):
 * reset-parola-sportiv, account, genereaza-magic-link. Nu atinge rețeaua —
 * toate cazurile se opresc înainte de `auth.getUser` (405/401) sau înainte
 * de orice apel Supabase (429, rate-limitat local).
 *
 * Rulare: `node --import tsx scripts/smoke-endpointuri-auth.ts`
 */

process.env.VITE_SUPABASE_URL = 'https://smoke.invalid.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'smoke';

function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(`FAIL: ${message}`);
    }
    console.log(`PASS: ${message}`);
}

function creazaRes() {
    const stare: { statusCode: number | null; body: any; headers: Record<string, string> } = {
        statusCode: null,
        body: null,
        headers: {},
    };
    const res: any = {
        status(code: number) {
            stare.statusCode = code;
            return res;
        },
        json(body: any) {
            stare.body = body;
            return res;
        },
        setHeader(k: string, v: string) {
            stare.headers[k] = v;
        },
    };
    return { res, stare };
}

function creazaReq(overrides: Partial<{ method: string; headers: Record<string, string>; body: any; query: Record<string, string> }>) {
    return {
        method: 'POST',
        headers: {},
        body: {},
        query: {},
        ...overrides,
    } as any;
}

async function ruleaza() {
    let passed = 0;
    let failed = 0;
    const errors: string[] = [];

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

    const { default: resetParolaHandler } = await import('../api/reset-parola-sportiv.js');
    const { default: accountHandler } = await import('../api/account.js');
    const { default: magicLinkHandler } = await import('../api/genereaza-magic-link.js');

    const endpoints: { nume: string; handler: any; extraQuery?: Record<string, string> }[] = [
        { nume: 'reset-parola-sportiv', handler: resetParolaHandler },
        { nume: 'account', handler: accountHandler, extraQuery: { action: 'email' } },
        { nume: 'genereaza-magic-link', handler: magicLinkHandler },
    ];

    let ipCounter = 0;
    const ipUnic = () => `10.0.0.${++ipCounter}`;

    for (const ep of endpoints) {
        await run(`GET pe ${ep.nume} -> 405`, async () => {
            const { res, stare } = creazaRes();
            await ep.handler(creazaReq({ method: 'GET', headers: { 'x-forwarded-for': ipUnic() }, query: ep.extraQuery }), res);
            assert(stare.statusCode === 405, `primit ${stare.statusCode}`);
        });
    }

    for (const ep of endpoints) {
        await run(`POST fara Authorization pe ${ep.nume} -> 401`, async () => {
            const { res, stare } = creazaRes();
            await ep.handler(creazaReq({ headers: { 'x-forwarded-for': ipUnic() }, query: ep.extraQuery }), res);
            assert(stare.statusCode === 401, `primit ${stare.statusCode}, body ${JSON.stringify(stare.body)}`);
        });
    }

    for (const ep of endpoints) {
        await run(`POST cu Authorization: Basic abc pe ${ep.nume} -> 401`, async () => {
            const { res, stare } = creazaRes();
            await ep.handler(creazaReq({ headers: { 'x-forwarded-for': ipUnic(), authorization: 'Basic abc' }, query: ep.extraQuery }), res);
            assert(stare.statusCode === 401, `primit ${stare.statusCode}`);
        });
    }

    await run('11 POST-uri fara Authorization de pe acelasi IP catre reset-parola-sportiv -> al 11-lea = 429', async () => {
        const ip = ipUnic();
        let ultimStare: any = null;
        for (let i = 0; i < 11; i++) {
            const { res, stare } = creazaRes();
            await resetParolaHandler(creazaReq({ headers: { 'x-forwarded-for': ip } }), res);
            ultimStare = stare;
        }
        assert(ultimStare.statusCode === 429, `primit ${ultimStare.statusCode}`);
        assert(Number(ultimStare.headers['Retry-After']) >= 1, `Retry-After numeric >= 1, primit ${ultimStare.headers['Retry-After']}`);
    });

    await run('121 POST-uri de pe acelasi IP catre genereaza-magic-link -> al 121-lea = 429', async () => {
        const ip = ipUnic();
        let ultimStare: any = null;
        for (let i = 0; i < 121; i++) {
            const { res, stare } = creazaRes();
            await magicLinkHandler(creazaReq({ headers: { 'x-forwarded-for': ip } }), res);
            ultimStare = stare;
        }
        assert(ultimStare.statusCode === 429, `primit ${ultimStare.statusCode}`);
        assert(ultimStare.body?.reincercabil === true, `reincercabil true, primit ${JSON.stringify(ultimStare.body)}`);
    });

    console.log(`\nRezultat: ${passed} PASS, ${failed} FAIL`);
    if (errors.length > 0) {
        console.error('Erori:', errors);
        process.exit(1);
    }
}

ruleaza();
