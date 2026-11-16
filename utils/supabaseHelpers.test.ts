/**
 * Test colocat pentru utils/supabaseHelpers.ts (processSettledQueries, Faza 38).
 * Rulare: npx tsx utils/supabaseHelpers.test.ts ; iesire non-zero la esec.
 */
import { processSettledQueries } from './supabaseHelpers';

let esecuri = 0;
function test(nume: string, fn: () => void): void {
  try { fn(); console.log(`PASS: ${nume}`); } catch (e: any) { esecuri++; console.log(`FAIL: ${nume} -> ${e?.message ?? e}`); }
}
function egal(a: unknown, b: unknown, msg: string): void {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
}
const ok = (value: any): any => ({ status: 'fulfilled', value });
const respins = (reason: any): any => ({ status: 'rejected', reason });

// reduce zgomotul din consola in rularea testului
console.warn = () => {}; console.error = () => {};

test('fulfilled cu date -> data[k]', () => {
  const r = processSettledQueries([ok({ data: [1, 2], error: null })], ['k']);
  egal(r.data, { k: [1, 2] }, 'data'); egal(r.erori, [], 'erori'); egal(r.rlsErrors, [], 'rls');
});
test('fulfilled data null fara eroare -> []', () => {
  egal(processSettledQueries([ok({ data: null, error: null })], ['k']).data, { k: [] }, 'data');
});
test('42501 -> [] si rlsErrors', () => {
  const r = processSettledQueries([ok({ data: null, error: { code: '42501' } })], ['k']);
  egal(r.data, { k: [] }, 'data'); egal(r.rlsErrors, ['k'], 'rls'); egal(r.erori, [], 'erori');
});
test('57014 -> cheia lipseste din data, in erori', () => {
  const r = processSettledQueries([ok({ data: null, error: { code: '57014' } })], ['k']);
  egal('k' in r.data, false, 'k in data'); egal(r.erori, ['k'], 'erori');
});
test('rejected -> cheia lipseste din data, in erori', () => {
  const r = processSettledQueries([respins(new Error('x'))], ['k']);
  egal('k' in r.data, false, 'k in data'); egal(r.erori, ['k'], 'erori');
});
test('fulfilled fara valoare -> eroare, NU rls, nu goleste (WR-05)', () => {
  const r = processSettledQueries([{ status: 'fulfilled' } as any], ['k']);
  egal('k' in r.data, false, 'k in data'); egal(r.erori, ['k'], 'erori'); egal(r.rlsErrors, [], 'rls');
});
test('lot mixt: rezultate independente per cheie', () => {
  const r = processSettledQueries(
    [ok({ data: [1], error: null }), ok({ data: null, error: { code: '42501' } }), ok({ data: null, error: { code: '57014' } }), respins('r')],
    ['a', 'b', 'c', 'd'],
  );
  egal(r.data, { a: [1], b: [] }, 'data'); egal(r.rlsErrors, ['b'], 'rls'); egal(r.erori, ['c', 'd'], 'erori');
});

if (esecuri > 0) { console.log(`\n${esecuri} teste au esuat`); process.exit(1); }
console.log('\nToate testele au trecut');
