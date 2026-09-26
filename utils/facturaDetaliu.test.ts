/**
 * Test colocat pentru utils/facturaDetaliu.ts
 *
 * NOTĂ: Proiectul nu are vitest/jest configurat (doar Playwright E2E).
 * Testul este scris ca funcții exportabile cu asserții simple.
 * Rulare: `npx tsx utils/facturaDetaliu.test.ts`
 * Convenție: vezi utils/perioadaGratie.test.ts.
 */

import {
  calculeazaSumarFactura,
  construiesteIstoricTranzactii,
  planificaAchitareRapida,
  construiestePayloadEditareFactura,
} from './facturaDetaliu';
import type { Tranzactie, VizualizarePlata } from '../types';

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

  // ── calculeazaSumarFactura ──────────────────────────────────────────────

  run('T1: sumar Achitat Parțial cu suma_initiala', () => {
    const r = calculeazaSumarFactura({ suma: 100, suma_initiala: 150, status: 'Achitat Parțial' }, 1);
    assert(r.sumaFacturata === 150, `sumaFacturata asteptat 150, primit ${r.sumaFacturata}`);
    assert(r.restDePlata === 100, `restDePlata asteptat 100, primit ${r.restDePlata}`);
    assert(r.totalIncasat === 50, `totalIncasat asteptat 50, primit ${r.totalIncasat}`);
    assert(r.avertizare === null, `avertizare asteptata null, primit ${r.avertizare}`);
  });

  run('T2: sumar fara suma_initiala (null) → sumaFacturata = suma', () => {
    const r = calculeazaSumarFactura({ suma: 120, suma_initiala: null, status: 'Neachitat' }, 0);
    assert(r.sumaFacturata === 120, `sumaFacturata asteptat 120, primit ${r.sumaFacturata}`);
    assert(r.totalIncasat === 0, `totalIncasat asteptat 0, primit ${r.totalIncasat}`);
  });

  run('T3: sumar Achitat cu rest > 0 si 0 tranzactii → avertizare nenula', () => {
    const r = calculeazaSumarFactura({ suma: 100, suma_initiala: 100, status: 'Achitat' }, 0);
    assert(!!r.avertizare, `avertizare asteptata nenula, primit ${r.avertizare}`);
  });

  // ── construiesteIstoricTranzactii ──────────────────────────────────────

  run('T4: tranzactie cu plata_ids [A] → 1 rand sursa tranzactii', () => {
    const tranzactii: Tranzactie[] = [
      { id: 'T1', plata_ids: ['A'], sportiv_id: null, familie_id: null, suma: 50, data_platii: '2026-09-01', metoda_plata: 'Cash' },
    ];
    const r = construiesteIstoricTranzactii('A', tranzactii, []);
    assert(r.length === 1, `lungime asteptata 1, primit ${r.length}`);
    assert(r[0].sursa === 'tranzactii', `sursa asteptata tranzactii, primit ${r[0].sursa}`);
    assert(r[0].nrFacturiAcoperite === 1, `nrFacturiAcoperite asteptat 1, primit ${r[0].nrFacturiAcoperite}`);
    assert(r[0].metoda === 'Cash', `metoda asteptata Cash, primit ${r[0].metoda}`);
  });

  run('T5: tranzactie cu plata_ids [A,B] → nrFacturiAcoperite 2', () => {
    const tranzactii: Tranzactie[] = [
      { id: 'T1', plata_ids: ['A', 'B'], sportiv_id: null, familie_id: null, suma: 50, data_platii: '2026-09-01', metoda_plata: 'Cash' },
    ];
    const r = construiesteIstoricTranzactii('A', tranzactii, []);
    assert(r[0].nrFacturiAcoperite === 2, `nrFacturiAcoperite asteptat 2, primit ${r[0].nrFacturiAcoperite}`);
  });

  run('T6: vizualizare cu tranzactie_id ce exista in tranzactii cu plata_ids [] → 1 rand sursa vizualizare', () => {
    const tranzactii: Tranzactie[] = [
      { id: 'T2', plata_ids: [], sportiv_id: null, familie_id: null, suma: 40, data_platii: '2026-09-02', metoda_plata: 'Transfer Bancar' },
    ];
    const vizualizari: VizualizarePlata[] = [
      { plata_id: 'A', sportiv_id: 's1', nume_complet: 'X', club_id: 'c1', data_emitere: '2026-09-01', descriere: 'd', suma_datorata: 40, status: 'Achitat', tranzactie_id: 'T2', data_plata: '2026-09-02', suma_incasata: 40 },
    ];
    const r = construiesteIstoricTranzactii('A', tranzactii, vizualizari);
    assert(r.length === 1, `lungime asteptata 1, primit ${r.length}`);
    assert(r[0].sursa === 'vizualizare', `sursa asteptata vizualizare, primit ${r[0].sursa}`);
    assert(r[0].suma === 40, `suma asteptata 40, primit ${r[0].suma}`);
    assert(r[0].metoda === 'Transfer Bancar', `metoda asteptata din tranzactia T2, primit ${r[0].metoda}`);
  });

  run('T7: aceeasi tranzactie in ambele surse → 1 singur rand sursa ambele, suma din vizualizare', () => {
    const tranzactii: Tranzactie[] = [
      { id: 'T1', plata_ids: ['A'], sportiv_id: null, familie_id: null, suma: 50, data_platii: '2026-09-01', metoda_plata: 'Cash' },
    ];
    const vizualizari: VizualizarePlata[] = [
      { plata_id: 'A', sportiv_id: 's1', nume_complet: 'X', club_id: 'c1', data_emitere: '2026-09-01', descriere: 'd', suma_datorata: 50, status: 'Achitat', tranzactie_id: 'T1', data_plata: '2026-09-01', suma_incasata: 45 },
    ];
    const r = construiesteIstoricTranzactii('A', tranzactii, vizualizari);
    assert(r.length === 1, `lungime asteptata 1, primit ${r.length}`);
    assert(r[0].sursa === 'ambele', `sursa asteptata ambele, primit ${r[0].sursa}`);
    assert(r[0].suma === 45, `suma asteptata 45 (din vizualizare), primit ${r[0].suma}`);
  });

  run('T8: vizualizare cu tranzactie_id null si randuri pentru alta plata → ignorate', () => {
    const vizualizari: VizualizarePlata[] = [
      { plata_id: 'A', sportiv_id: 's1', nume_complet: 'X', club_id: 'c1', data_emitere: '2026-09-01', descriere: 'd', suma_datorata: 50, status: 'Achitat', tranzactie_id: null, data_plata: null, suma_incasata: null },
      { plata_id: 'B', sportiv_id: 's1', nume_complet: 'X', club_id: 'c1', data_emitere: '2026-09-01', descriere: 'd', suma_datorata: 50, status: 'Achitat', tranzactie_id: 'T9', data_plata: '2026-09-01', suma_incasata: 50 },
    ];
    const r = construiesteIstoricTranzactii('A', [], vizualizari);
    assert(r.length === 0, `lungime asteptata 0, primit ${r.length}`);
  });

  run('T9: sortare descrescatoare dupa data, randurile fara data la final', () => {
    const tranzactii: Tranzactie[] = [
      { id: 'T1', plata_ids: ['A'], sportiv_id: null, familie_id: null, suma: 10, data_platii: '2026-09-01', metoda_plata: 'Cash' },
      { id: 'T2', plata_ids: ['A'], sportiv_id: null, familie_id: null, suma: 20, data_platii: '2026-09-15', metoda_plata: 'Cash' },
      { id: 'T3', plata_ids: ['A'], sportiv_id: null, familie_id: null, suma: 30, data_platii: null as any, metoda_plata: 'Cash' },
    ];
    const r = construiesteIstoricTranzactii('A', tranzactii, []);
    assert(r.map(x => x.tranzactieId).join(',') === 'T2,T1,T3', `ordine asteptata T2,T1,T3, primit ${r.map(x => x.tranzactieId).join(',')}`);
  });

  // ── planificaAchitareRapida ─────────────────────────────────────────────

  run('T10: status Achitat → invalid', () => {
    const r = planificaAchitareRapida({ suma: 100, suma_initiala: 100, status: 'Achitat' }, 100);
    assert(r.tip === 'invalid', `tip asteptat invalid, primit ${r.tip}`);
  });

  run('T11: status Anulat → invalid', () => {
    const r = planificaAchitareRapida({ suma: 100, suma_initiala: 100, status: 'Anulat' }, 100);
    assert(r.tip === 'invalid', `tip asteptat invalid, primit ${r.tip}`);
  });

  run('T12: suma NaN → invalid', () => {
    const r = planificaAchitareRapida({ suma: 100, suma_initiala: 100, status: 'Neachitat' }, NaN);
    assert(r.tip === 'invalid', `tip asteptat invalid, primit ${r.tip}`);
  });

  run('T13: suma 0 → invalid', () => {
    const r = planificaAchitareRapida({ suma: 100, suma_initiala: 100, status: 'Neachitat' }, 0);
    assert(r.tip === 'invalid', `tip asteptat invalid, primit ${r.tip}`);
  });

  run('T14: suma negativa → invalid', () => {
    const r = planificaAchitareRapida({ suma: 100, suma_initiala: 100, status: 'Neachitat' }, -5);
    assert(r.tip === 'invalid', `tip asteptat invalid, primit ${r.tip}`);
  });

  run('T15: suma == rest → direct', () => {
    const r = planificaAchitareRapida({ suma: 100, suma_initiala: 100, status: 'Neachitat' }, 100);
    assert(r.tip === 'direct', `tip asteptat direct, primit ${r.tip}`);
    assert((r as any).sumaIncasata === 100, `sumaIncasata asteptata 100, primit ${(r as any).sumaIncasata}`);
  });

  run('T16: suma cu toleranta 0.01 → direct 100', () => {
    const r = planificaAchitareRapida({ suma: 100, suma_initiala: 100, status: 'Neachitat' }, 100.005);
    assert(r.tip === 'direct', `tip asteptat direct, primit ${r.tip}`);
    assert((r as any).sumaIncasata === 100, `sumaIncasata asteptata 100, primit ${(r as any).sumaIncasata}`);
  });

  run('T17: suma > rest → invalid (depaseste restul)', () => {
    const r = planificaAchitareRapida({ suma: 100, suma_initiala: 100, status: 'Neachitat' }, 150);
    assert(r.tip === 'invalid', `tip asteptat invalid, primit ${r.tip}`);
  });

  run('T18: suma < rest → cu_corectie', () => {
    const r = planificaAchitareRapida({ suma: 150, suma_initiala: 150, status: 'Neachitat' }, 100);
    assert(r.tip === 'cu_corectie', `tip asteptat cu_corectie, primit ${r.tip}`);
    assert((r as any).sumaIncasata === 100, `sumaIncasata asteptata 100, primit ${(r as any).sumaIncasata}`);
    assert((r as any).sumaInitialaVeche === 150, `sumaInitialaVeche asteptata 150, primit ${(r as any).sumaInitialaVeche}`);
    assert((r as any).sumaInitialaNoua === 100, `sumaInitialaNoua asteptata 100, primit ${(r as any).sumaInitialaNoua}`);
  });

  run('T19: cu_corectie cu suma_initiala diferita de rest', () => {
    const r = planificaAchitareRapida({ suma: 100, suma_initiala: 150, status: 'Neachitat' }, 80);
    assert(r.tip === 'cu_corectie', `tip asteptat cu_corectie, primit ${r.tip}`);
    assert((r as any).sumaInitialaNoua === 130, `sumaInitialaNoua asteptata 130, primit ${(r as any).sumaInitialaNoua}`);
  });

  run('T20: suma_initiala null → direct cand egaleaza suma', () => {
    const r = planificaAchitareRapida({ suma: 120, suma_initiala: null, status: 'Neachitat' }, 120);
    assert(r.tip === 'direct', `tip asteptat direct, primit ${r.tip}`);
    assert((r as any).sumaIncasata === 120, `sumaIncasata asteptata 120, primit ${(r as any).sumaIncasata}`);
  });

  run('T21: rotunjire la 2 zecimale in cu_corectie', () => {
    const r = planificaAchitareRapida({ suma: 99.99, suma_initiala: 99.99, status: 'Neachitat' }, 33.33);
    assert(r.tip === 'cu_corectie', `tip asteptat cu_corectie, primit ${r.tip}`);
    assert((r as any).sumaInitialaNoua === 33.33, `sumaInitialaNoua asteptata 33.33, primit ${(r as any).sumaInitialaNoua}`);
  });

  // ── construiestePayloadEditareFactura ───────────────────────────────────

  run('T22: whitelist exacta — exclude club_nume/descriereDetaliata/reducereDetalii/id', () => {
    const form: any = {
      descriere: 'Test',
      data: '2026-09-26',
      suma_initiala: 100,
      suma: 50,
      status: 'Achitat Parțial',
      club_nume: 'Club X',
      descriereDetaliata: { extra: true },
      reducereDetalii: { nume: 'reducere' },
      id: 'abc-123',
    };
    const { payload, eroare } = construiestePayloadEditareFactura(form);
    assert(eroare === null, `eroare asteptata null, primit ${eroare}`);
    assert(!!payload, 'payload asteptat nenul');
    const chei = Object.keys(payload!).sort().join(',');
    assert(chei === 'data,descriere,status,suma,suma_initiala', `chei asteptate data,descriere,status,suma,suma_initiala, primit ${chei}`);
  });

  run('T23: suma_initiala cu virgula acceptata', () => {
    const { payload, eroare } = construiestePayloadEditareFactura({
      descriere: 'Test', data: '2026-09-26', suma_initiala: '12,5', suma: 0, status: 'Achitat',
    });
    assert(eroare === null, `eroare asteptata null, primit ${eroare}`);
    assert(payload!.suma_initiala === 12.5, `suma_initiala asteptata 12.5, primit ${payload!.suma_initiala}`);
  });

  run('T24: suma > suma_initiala → eroare', () => {
    const { eroare } = construiestePayloadEditareFactura({
      descriere: 'Test', data: '2026-09-26', suma_initiala: 50, suma: 100, status: 'Neachitat',
    });
    assert(!!eroare, `eroare asteptata nenula, primit ${eroare}`);
  });

  run('T25: suma negativa → eroare', () => {
    const { eroare } = construiestePayloadEditareFactura({
      descriere: 'Test', data: '2026-09-26', suma_initiala: 50, suma: -1, status: 'Neachitat',
    });
    assert(!!eroare, `eroare asteptata nenula, primit ${eroare}`);
  });

  run('T26: suma text invalid → eroare', () => {
    const { eroare } = construiestePayloadEditareFactura({
      descriere: 'Test', data: '2026-09-26', suma_initiala: 50, suma: 'abc', status: 'Neachitat',
    });
    assert(!!eroare, `eroare asteptata nenula, primit ${eroare}`);
  });

  run('T27: status Anulat → eroare (flux dedicat)', () => {
    const { eroare } = construiestePayloadEditareFactura({
      descriere: 'Test', data: '2026-09-26', suma_initiala: 50, suma: 50, status: 'Anulat',
    });
    assert(!!eroare, `eroare asteptata nenula, primit ${eroare}`);
  });

  run('T28: status necunoscut → eroare', () => {
    const { eroare } = construiestePayloadEditareFactura({
      descriere: 'Test', data: '2026-09-26', suma_initiala: 50, suma: 50, status: 'Ceva',
    });
    assert(!!eroare, `eroare asteptata nenula, primit ${eroare}`);
  });

  run('T29: status Achitat cu suma 20 → eroare', () => {
    const { eroare } = construiestePayloadEditareFactura({
      descriere: 'Test', data: '2026-09-26', suma_initiala: 50, suma: 20, status: 'Achitat',
    });
    assert(!!eroare, `eroare asteptata nenula, primit ${eroare}`);
  });

  run('T30: status Neachitat cu suma 0 → eroare', () => {
    const { eroare } = construiestePayloadEditareFactura({
      descriere: 'Test', data: '2026-09-26', suma_initiala: 50, suma: 0, status: 'Neachitat',
    });
    assert(!!eroare, `eroare asteptata nenula, primit ${eroare}`);
  });

  run('T31: descriere goala → eroare', () => {
    const { eroare } = construiestePayloadEditareFactura({
      descriere: '   ', data: '2026-09-26', suma_initiala: 50, suma: 50, status: 'Achitat',
    });
    assert(!!eroare, `eroare asteptata nenula, primit ${eroare}`);
  });

  run('T32: data cu timestamp trunchiata la YYYY-MM-DD', () => {
    const { payload, eroare } = construiestePayloadEditareFactura({
      descriere: 'Test', data: '2026-09-26T10:00:00', suma_initiala: 50, suma: 50, status: 'Achitat',
    });
    assert(eroare === null, `eroare asteptata null, primit ${eroare}`);
    assert(payload!.data === '2026-09-26', `data asteptata 2026-09-26, primit ${payload!.data}`);
  });

  run('T33: data invalida → eroare', () => {
    const { eroare } = construiestePayloadEditareFactura({
      descriere: 'Test', data: 'abc', suma_initiala: 50, suma: 50, status: 'Achitat',
    });
    assert(!!eroare, `eroare asteptata nenula, primit ${eroare}`);
  });

  return { passed, failed, errors };
}

// ─────────────────────────────────────────────
// Auto-run dacă acest fișier e executat direct
// ─────────────────────────────────────────────
if (process.argv[1]?.endsWith('facturaDetaliu.test.ts') || process.argv[1]?.endsWith('facturaDetaliu.test.js')) {
  const { passed, failed, errors } = runTests();
  console.log(`\nRezultat: ${passed} PASS, ${failed} FAIL`);
  if (errors.length > 0) {
    console.error('Erori:', errors);
    process.exit(1);
  }
}
