/**
 * Faza 38: incarcare la pornire fara furtuna de cereri.
 * Functii pure, fara import React/Supabase (testabile cu `npx tsx utils/incarcareDate.test.ts`).
 */

/**
 * Ruleaza sarcinile cu cel mult `limita` in zbor. result[i] corespunde sarcini[i].
 * Sarcinile sunt thunk-uri: query builder-ele supabase-js sunt thenable lazy, pornesc la await.
 */
export async function ruleazaCuLimita<T>(
  sarcini: Array<() => PromiseLike<T>>,
  limita: number,
): Promise<PromiseSettledResult<T>[]> {
  const rezultate: PromiseSettledResult<T>[] = new Array(sarcini.length);
  let urmatoarea = 0;
  const lucrator = async () => {
    while (urmatoarea < sarcini.length) {
      const i = urmatoarea++;
      try {
        rezultate[i] = { status: 'fulfilled', value: await sarcini[i]() };
      } catch (reason) {
        rezultate[i] = { status: 'rejected', reason };
      }
    }
  };
  const nrLucratori = Math.max(1, Math.min(limita, sarcini.length));
  await Promise.all(Array.from({ length: sarcini.length ? nrLucratori : 0 }, lucrator));
  return rezultate;
}

/** 57014 = statement timeout, PGRST003 = pool timeout. */
export function esteTimeoutStatement(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const { code, message } = err as { code?: unknown; message?: unknown };
  if (code === '57014' || code === 'PGRST003') return true;
  return typeof message === 'string' && /statement timeout|canceling statement/i.test(message);
}

/** Regula `retry` React Query (v5: nrEsecuri incepe de la 0): fara reincercare pe timeout, maxim una in rest (D-04). */
export function trebuieReincercat(nrEsecuri: number, err: unknown): boolean {
  return !esteTimeoutStatement(err) && nrEsecuri < 1;
}

const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Fereastra implicita de prezenta (D-03): azi-90 .. azi+30, date calendaristice locale. */
export function fereastraPrezenta(azi: Date): { from: string; to: string } {
  const y = azi.getFullYear(), m = azi.getMonth(), d = azi.getDate();
  return { from: ymd(new Date(y, m, d - 90)), to: ymd(new Date(y, m, d + 30)) };
}

/** Felii consecutive de lungime `marime` (ultima poate fi mai scurta), ca URL-urile .in() sa nu creasca nelimitat. */
export function imparteInBucati<T>(lista: T[], marime: number): T[][] {
  const bucati: T[][] = [];
  for (let i = 0; i < lista.length; i += marime) bucati.push(lista.slice(i, i + marime));
  return bucati;
}

/** PostgREST limiteaza la 1000 de randuri: paginam cu .range() pana cand o pagina vine incompleta. La eroare intoarce randurile de pana atunci + eroarea. */
export async function incarcaToatePaginile<R>(
  construiesteInterogare: (from: number, to: number) => PromiseLike<{ data: R[] | null; error: any }>,
  marimePagina = 1000,
): Promise<{ data: R[]; error: any }> {
  let randuri: R[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await construiesteInterogare(from, from + marimePagina - 1);
    if (error) return { data: randuri, error };
    randuri = randuri.concat(data || []);
    if (!data || data.length < marimePagina) break;
    from += marimePagina;
  }
  return { data: randuri, error: null };
}
