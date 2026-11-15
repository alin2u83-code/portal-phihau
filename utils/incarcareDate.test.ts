/**
 * Test colocat pentru utils/incarcareDate.ts (Faza 38: incarcare fara furtuna de cereri).
 * Rulare: npx tsx utils/incarcareDate.test.ts ; iesire non-zero la esec.
 */
import {
  ruleazaCuLimita, esteTimeoutStatement, trebuieReincercat, fereastraPrezenta, imparteInBucati, incarcaToatePaginile,
} from './incarcareDate';

let esecuri = 0;
async function test(nume: string, fn: () => void | Promise<void>): Promise<void> {
  try { await fn(); console.log(`PASS: ${nume}`); } catch (e: any) { esecuri++; console.log(`FAIL: ${nume} -> ${e?.message ?? e}`); }
}
function assert(cond: boolean, msg: string): void { if (!cond) throw new Error(msg); }
function egal(a: unknown, b: unknown, msg: string): void {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
}
const asteapta = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

async function main() {
  // ---------- ruleazaCuLimita ----------
  await test('ruleazaCuLimita: maxim 2 in zbor, ordinea rezultatelor pastrata', async () => {
    let activ = 0, varf = 0;
    const intarzieri = [30, 5, 20, 1, 15, 3];
    const sarcini = intarzieri.map((ms, i) => async () => {
      activ++; varf = Math.max(varf, activ);
      await asteapta(ms);
      activ--;
      return i;
    });
    const rez = await ruleazaCuLimita(sarcini, 2);
    assert(varf <= 2, `varf ${varf} > 2`);
    egal(rez.map(r => (r.status === 'fulfilled' ? r.value : 'x')), [0, 1, 2, 3, 4, 5], 'ordine');
  });
  await test('ruleazaCuLimita: o sarcina care arunca -> doar slotul ei e rejected', async () => {
    const rez = await ruleazaCuLimita([async () => 1, async () => { throw new Error('boom'); }, async () => 3], 2);
    egal(rez.map(r => r.status), ['fulfilled', 'rejected', 'fulfilled'], 'statusuri');
    assert((rez[1] as PromiseRejectedResult).reason.message === 'boom', 'reason');
  });
  await test('ruleazaCuLimita: limita mai mare decat nr. sarcini', async () => {
    const rez = await ruleazaCuLimita([async () => 'a', async () => 'b'], 10);
    egal(rez.map(r => (r as PromiseFulfilledResult<string>).value), ['a', 'b'], 'valori');
  });
  await test('ruleazaCuLimita: [] -> []', async () => {
    egal(await ruleazaCuLimita([], 3), [], 'gol');
  });
  await test('ruleazaCuLimita: thunk sincron care arunca devine rejected', async () => {
    const rez = await ruleazaCuLimita([(() => { throw new Error('sync'); }) as any, async () => 2], 1);
    egal(rez.map(r => r.status), ['rejected', 'fulfilled'], 'statusuri');
  });

  // ---------- esteTimeoutStatement ----------
  await test('esteTimeoutStatement: 57014', () => assert(esteTimeoutStatement({ code: '57014' }) === true, 'x'));
  await test('esteTimeoutStatement: PGRST003', () => assert(esteTimeoutStatement({ code: 'PGRST003' }) === true, 'x'));
  await test('esteTimeoutStatement: mesaj', () => assert(esteTimeoutStatement({ message: 'canceling statement due to statement timeout' }) === true, 'x'));
  await test('esteTimeoutStatement: 42501 false', () => assert(esteTimeoutStatement({ code: '42501' }) === false, 'x'));
  await test('esteTimeoutStatement: null false', () => assert(esteTimeoutStatement(null) === false, 'x'));
  await test('esteTimeoutStatement: string false', () => assert(esteTimeoutStatement('text') === false, 'x'));

  // ---------- trebuieReincercat ----------
  await test('trebuieReincercat: timeout nu se reincearca', () => assert(trebuieReincercat(0, { code: '57014' }) === false, 'x'));
  await test('trebuieReincercat: alta eroare, prima esec -> da', () => assert(trebuieReincercat(0, { code: '500' }) === true, 'x'));
  await test('trebuieReincercat: a doua esec -> nu', () => assert(trebuieReincercat(1, { code: '500' }) === false, 'x'));
  await test('trebuieReincercat: Error de retea, prima -> da', () => assert(trebuieReincercat(0, new Error('Failed to fetch')) === true, 'x'));

  // ---------- fereastraPrezenta ----------
  await test('fereastraPrezenta: 15 noiembrie 2026', () => egal(fereastraPrezenta(new Date(2026, 10, 15)), { from: '2026-08-17', to: '2026-12-15' }, 'fereastra'));
  await test('fereastraPrezenta: trecere de an', () => egal(fereastraPrezenta(new Date(2026, 0, 10)), { from: '2025-10-12', to: '2026-02-09' }, 'fereastra'));
  await test('fereastraPrezenta: zi cu schimbare de ora', () => assert(fereastraPrezenta(new Date(2026, 2, 29)).from === '2025-12-29', 'from'));

  // ---------- imparteInBucati ----------
  await test('imparteInBucati: 250/100 -> [100,100,50] in ordine', () => {
    const lista = Array.from({ length: 250 }, (_, i) => i);
    const b = imparteInBucati(lista, 100);
    egal(b.map(x => x.length), [100, 100, 50], 'lungimi');
    egal(b.flat(), lista, 'ordine');
  });
  await test('imparteInBucati: [] -> []', () => egal(imparteInBucati([], 100), [], 'gol'));
  await test('imparteInBucati: 3 elemente / 100 -> o bucata', () => egal(imparteInBucati([1, 2, 3], 100), [[1, 2, 3]], 'o bucata'));

  // ---------- incarcaToatePaginile ----------
  const builderCu = (total: number, esueazaLaApel = -1) => {
    const apeluri: Array<[number, number]> = [];
    const construieste = async (from: number, to: number) => {
      apeluri.push([from, to]);
      if (apeluri.length - 1 === esueazaLaApel) return { data: null, error: { code: 'X' } };
      const n = Math.max(0, Math.min(to + 1, total) - from);
      return { data: Array.from({ length: n }, (_, i) => from + i), error: null };
    };
    return { construieste, apeluri };
  };
  await test('incarcaToatePaginile: 2500 randuri -> 3 apeluri', async () => {
    const { construieste, apeluri } = builderCu(2500);
    const r = await incarcaToatePaginile(construieste);
    egal(apeluri, [[0, 999], [1000, 1999], [2000, 2999]], 'intervale');
    assert(r.data.length === 2500 && r.error === null, 'randuri/eroare');
  });
  await test('incarcaToatePaginile: eroare la a doua pagina -> 1000 randuri + eroare', async () => {
    const { construieste } = builderCu(2500, 1);
    const r = await incarcaToatePaginile(construieste);
    assert(r.data.length === 1000 && r.error?.code === 'X', 'partial');
  });
  await test('incarcaToatePaginile: exact 1000 -> a doua cerere goala apoi stop', async () => {
    const { construieste, apeluri } = builderCu(1000);
    const r = await incarcaToatePaginile(construieste);
    assert(apeluri.length === 2 && r.data.length === 1000 && r.error === null, 'exact');
  });

  if (esecuri > 0) { console.log(`\n${esecuri} teste au esuat`); process.exit(1); }
  console.log('\nToate testele au trecut');
}
main();
