/**
 * Templates pentru generarea automată a categoriilor
 * pe tipuri de competiție Qwan Ki Do
 */
import { TipProba } from '../types';

export interface TemplateCategorieInput {
  numar_categorie: number;
  varsta_min: number;
  varsta_max: number | null;
  gen: 'Feminin' | 'Masculin' | 'Mixt';
  grad_min_ordine: number | null;
  grad_max_ordine: number | null;
  arma: string | null;
  tip_participare: 'individual' | 'pereche' | 'echipa';
  sportivi_per_echipa_min: number;
  sportivi_per_echipa_max: number;
  rezerve_max: number;
  max_echipe_per_club: number;
  min_participanti_start: number;
  tip_proba: TipProba;
}

/**
 * Generează denumirea automată a unei categorii
 */
export function buildCategorieDenumire(cat: Omit<TemplateCategorieInput, 'tip_proba'>): string {
  const varstaStr = cat.varsta_max
    ? `${cat.varsta_min}-${cat.varsta_max} ani`
    : `Peste ${cat.varsta_min} ani`;

  const gradStr = buildGradStr(cat.grad_min_ordine, cat.grad_max_ordine);
  const armaStr = cat.arma ? ` / ${cat.arma}` : '';

  return `${varstaStr} / ${cat.gen} / ${gradStr}${armaStr}`;
}

function buildGradStr(min: number | null, max: number | null): string {
  if (min === null && max === null) return 'Orice grad';
  if (min !== null && max === null) return `min ${ordineToLabel(min)}`;
  if (min !== null && max !== null) {
    if (min === max) return ordineToLabel(min);
    return `${ordineToLabel(min)} - ${ordineToLabel(max)}`;
  }
  return '';
}

export function ordineToLabel(ordine: number): string {
  const labels: Record<number, string> = {
    1: '1 CAP', 2: '2 CAP', 3: '3 CAP', 4: '4 CAP',
    5: 'C.N.', 6: 'CN 1 Dang', 7: 'CN 2 Dang', 8: 'CN 3 Dang',
    9: 'CN 4 Dang', 10: 'CN 5 Dang',
  };
  return labels[ordine] ?? `Ordine ${ordine}`;
}

// -----------------------------------------------
// TEMPLATE: CN Copii si Juniori (Tehnica)
// 121 categorii (Thao Quyen Individual + Sincron + Song Luyen)
// -----------------------------------------------
export function generateTemplateTehnnica(): TemplateCategorieInput[] {
  // Grade: 1-10 (1=1CAP albastru ... 4=4CAP ... 5=CN ... 10=CN5Dang)
  // Grupele de vârstă și grade conform circular Onești 2026
  const categories: TemplateCategorieInput[] = [];
  let nr = 1;

  // Helper
  const add = (
    varsta_min: number, varsta_max: number | null,
    gen: 'Feminin' | 'Masculin' | 'Mixt',
    grad_min: number | null, grad_max: number | null,
    tip_participare: 'individual' | 'pereche' | 'echipa' = 'individual',
    tip_proba: TipProba = 'thao_quyen_individual',
    sportivi_min = 1, sportivi_max = 1, rezerve = 0, max_echipe = 1
  ) => {
    categories.push({
      numar_categorie: nr++,
      varsta_min, varsta_max, gen,
      grad_min_ordine: grad_min, grad_max_ordine: grad_max,
      arma: null,
      tip_participare,
      sportivi_per_echipa_min: sportivi_min,
      sportivi_per_echipa_max: sportivi_max,
      rezerve_max: rezerve,
      max_echipe_per_club: max_echipe,
      min_participanti_start: 3,
      tip_proba,
    });
  };

  // === THAO QUYEN INDIVIDUAL ===
  // 7-8 ani
  add(7, 8, 'Feminin', 1, 2);
  add(7, 8, 'Masculin', 1, 2);
  add(7, 8, 'Feminin', 3, 4);
  add(7, 8, 'Masculin', 3, 4);
  add(7, 8, 'Feminin', 5, null);  // centura neagra+
  add(7, 8, 'Masculin', 5, null);

  // 9-10 ani
  add(9, 10, 'Feminin', 1, 2);
  add(9, 10, 'Masculin', 1, 2);
  add(9, 10, 'Feminin', 3, 4);
  add(9, 10, 'Masculin', 3, 4);
  add(9, 10, 'Feminin', 5, null);
  add(9, 10, 'Masculin', 5, null);

  // 11-12 ani
  add(11, 12, 'Feminin', 1, 2);
  add(11, 12, 'Masculin', 1, 2);
  add(11, 12, 'Feminin', 3, 4);
  add(11, 12, 'Masculin', 3, 4);
  add(11, 12, 'Feminin', 5, null);
  add(11, 12, 'Masculin', 5, null);

  // 13-15 ani
  add(13, 15, 'Feminin', 1, 1);
  add(13, 15, 'Masculin', 1, 1);
  add(13, 15, 'Feminin', 2, 4);
  add(13, 15, 'Masculin', 2, 4);
  add(13, 15, 'Feminin', 5, null);
  add(13, 15, 'Masculin', 5, null);

  // 16-17 ani
  add(16, 17, 'Feminin', 1, 2);
  add(16, 17, 'Masculin', 1, 2);
  add(16, 17, 'Feminin', 3, 4);
  add(16, 17, 'Masculin', 3, 4);
  add(16, 17, 'Feminin', 5, null);
  add(16, 17, 'Masculin', 5, null);

  // 18-39 ani
  add(18, 39, 'Feminin', 1, 2);
  add(18, 39, 'Masculin', 1, 2);
  add(18, 39, 'Feminin', 3, 4);
  add(18, 39, 'Masculin', 3, 4);
  add(18, 39, 'Feminin', 5, null);
  add(18, 39, 'Masculin', 5, null);

  // 40+ ani
  add(40, null, 'Feminin', 1, 4);
  add(40, null, 'Masculin', 1, 4);
  add(40, null, 'Feminin', 5, null);
  add(40, null, 'Masculin', 5, null);

  // === SINCRON (perechi) ===
  const sincronGroups: Array<[number, number | null, 'Feminin' | 'Masculin' | 'Mixt', number | null, number | null]> = [
    [7, 10, 'Feminin', 1, 4],
    [7, 10, 'Masculin', 1, 4],
    [7, 10, 'Mixt', 1, 4],
    [11, 12, 'Feminin', 1, 4],
    [11, 12, 'Masculin', 1, 4],
    [11, 12, 'Mixt', 1, 4],
    [13, 15, 'Feminin', 1, 4],
    [13, 15, 'Masculin', 1, 4],
    [13, 15, 'Mixt', 1, 4],
    [16, 17, 'Feminin', 1, 4],
    [16, 17, 'Masculin', 1, 4],
    [16, 17, 'Mixt', 1, 4],
    [18, 39, 'Feminin', 1, null],
    [18, 39, 'Masculin', 1, null],
    [18, 39, 'Mixt', 1, null],
    [40, null, 'Feminin', 1, null],
    [40, null, 'Masculin', 1, null],
    [40, null, 'Mixt', 1, null],
  ];
  for (const [vmin, vmax, gen, gmin, gmax] of sincronGroups) {
    add(vmin, vmax, gen, gmin, gmax, 'pereche', 'sincron', 2, 2, 0, 1);
  }

  // === SONG LUYEN (perechi) ===
  const songGroups: Array<[number, number | null, 'Feminin' | 'Masculin' | 'Mixt', number | null, number | null]> = [
    [7, 10, 'Feminin', 1, 4],
    [7, 10, 'Masculin', 1, 4],
    [7, 10, 'Mixt', 1, 4],
    [11, 12, 'Feminin', 1, 4],
    [11, 12, 'Masculin', 1, 4],
    [11, 12, 'Mixt', 1, 4],
    [13, 15, 'Feminin', 1, 4],
    [13, 15, 'Masculin', 1, 4],
    [13, 15, 'Mixt', 1, 4],
    [16, 17, 'Feminin', 1, 4],
    [16, 17, 'Masculin', 1, 4],
    [16, 17, 'Mixt', 1, 4],
    [18, 39, 'Feminin', 1, null],
    [18, 39, 'Masculin', 1, null],
    [18, 39, 'Mixt', 1, null],
    [40, null, 'Feminin', 1, null],
    [40, null, 'Masculin', 1, null],
    [40, null, 'Mixt', 1, null],
  ];
  for (const [vmin, vmax, gen, gmin, gmax] of songGroups) {
    add(vmin, vmax, gen, gmin, gmax, 'pereche', 'song_luyen', 2, 2, 0, 1);
  }

  return categories;
}

// -----------------------------------------------
// TEMPLATE: CN Giao Dau (Lupte pe echipe/perechi)
// Copii 7-8 ani, Juniori Mici 9-12 ani, Juniori II 13-15 ani
// -----------------------------------------------
export function generateTemplateGiaoDau(): TemplateCategorieInput[] {
  const categories: TemplateCategorieInput[] = [];
  let nr = 1;

  const add = (
    varsta_min: number, varsta_max: number | null,
    gen: 'Feminin' | 'Masculin',
    grad_min: number | null, grad_max: number | null
  ) => {
    categories.push({
      numar_categorie: nr++,
      varsta_min, varsta_max, gen,
      grad_min_ordine: grad_min, grad_max_ordine: grad_max,
      arma: null,
      tip_participare: 'pereche',
      sportivi_per_echipa_min: 2,
      sportivi_per_echipa_max: 2,
      rezerve_max: 2,
      max_echipe_per_club: 1,
      min_participanti_start: 3,
      tip_proba: 'giao_dau',
    });
  };

  // Copii 7-8 ani
  add(7, 8, 'Feminin', 1, 2);   // A
  add(7, 8, 'Masculin', 1, 2);  // B
  add(7, 8, 'Feminin', 3, 4);   // C
  add(7, 8, 'Masculin', 3, 4);  // D

  // Juniori Mici 9-10 ani
  add(9, 10, 'Feminin', 1, 2);  // E
  add(9, 10, 'Masculin', 1, 2); // F
  add(9, 10, 'Feminin', 3, 4);  // G
  add(9, 10, 'Masculin', 3, 4); // H
  add(9, 10, 'Feminin', 5, null);  // I (minim CN)
  add(9, 10, 'Masculin', 5, null); // J

  // Juniori Mici 11-12 ani
  add(11, 12, 'Feminin', 1, 2);  // K
  add(11, 12, 'Masculin', 1, 2); // L
  add(11, 12, 'Feminin', 3, 4);  // M
  add(11, 12, 'Masculin', 3, 4); // N
  add(11, 12, 'Feminin', 5, null);  // O
  add(11, 12, 'Masculin', 5, null); // P

  // Juniori II 13-15 ani
  add(13, 15, 'Feminin', 1, 1);  // Q
  add(13, 15, 'Masculin', 1, 1); // R
  add(13, 15, 'Feminin', 2, 4);  // S
  add(13, 15, 'Masculin', 2, 4); // T

  return categories;
}

// -----------------------------------------------
// TEMPLATE: CN CVD - Arme Tradiționale
// Grade + Centuri Negre: Thao Lo Individual, Song Luyen, Giao Dau
// -----------------------------------------------
export function generateTemplateCVD(): TemplateCategorieInput[] {
  const categories: TemplateCategorieInput[] = [];
  let nr = 1;

  // Thao Lo Individual - Grade (sambata)
  const gradeThaoLo: Array<{
    vmin: number; vmax: number | null;
    gen: 'Feminin' | 'Masculin';
    gmin: number; gmax: number;
    arma: string;
  }> = [
    { vmin: 13, vmax: 15, gen: 'Feminin', gmin: 1, gmax: 1, arma: 'Bong' },
    { vmin: 13, vmax: 15, gen: 'Masculin', gmin: 1, gmax: 1, arma: 'Bong' },
    { vmin: 13, vmax: 15, gen: 'Feminin', gmin: 2, gmax: 4, arma: 'Bong' },
    { vmin: 13, vmax: 15, gen: 'Masculin', gmin: 2, gmax: 4, arma: 'Bong' },
    { vmin: 13, vmax: 15, gen: 'Feminin', gmin: 1, gmax: 4, arma: 'Long Gian / Song Cot / Moc Can' },
    { vmin: 13, vmax: 15, gen: 'Masculin', gmin: 1, gmax: 4, arma: 'Long Gian / Song Cot / Moc Can' },
    { vmin: 16, vmax: 17, gen: 'Feminin', gmin: 1, gmax: 2, arma: 'Bong' },
    { vmin: 16, vmax: 17, gen: 'Masculin', gmin: 1, gmax: 2, arma: 'Bong' },
    { vmin: 16, vmax: 17, gen: 'Feminin', gmin: 3, gmax: 4, arma: 'Bong' },
    { vmin: 16, vmax: 17, gen: 'Masculin', gmin: 3, gmax: 4, arma: 'Bong' },
    { vmin: 16, vmax: 17, gen: 'Feminin', gmin: 1, gmax: 4, arma: 'Long Gian / Song Cot / Moc Can' },
    { vmin: 16, vmax: 17, gen: 'Masculin', gmin: 1, gmax: 4, arma: 'Long Gian / Song Cot / Moc Can' },
    { vmin: 18, vmax: 39, gen: 'Feminin', gmin: 1, gmax: 4, arma: 'Bong' },
    { vmin: 18, vmax: 39, gen: 'Masculin', gmin: 1, gmax: 4, arma: 'Bong' },
    { vmin: 18, vmax: 39, gen: 'Feminin', gmin: 1, gmax: 4, arma: 'Long Gian / Song Cot / Moc Can' },
    { vmin: 18, vmax: 39, gen: 'Masculin', gmin: 1, gmax: 4, arma: 'Long Gian / Song Cot / Moc Can' },
    { vmin: 40, vmax: null, gen: 'Feminin', gmin: 1, gmax: 4, arma: 'Bong / Long Gian / Song Cot / Moc Can' },
    { vmin: 40, vmax: null, gen: 'Masculin', gmin: 1, gmax: 4, arma: 'Bong / Long Gian / Song Cot / Moc Can' },
  ];

  for (const g of gradeThaoLo) {
    categories.push({
      numar_categorie: nr++, varsta_min: g.vmin, varsta_max: g.vmax,
      gen: g.gen, grad_min_ordine: g.gmin, grad_max_ordine: g.gmax,
      arma: g.arma, tip_participare: 'individual',
      sportivi_per_echipa_min: 1, sportivi_per_echipa_max: 1,
      rezerve_max: 0, max_echipe_per_club: 99, min_participanti_start: 3,
      tip_proba: 'thao_lo_individual',
    });
  }

  // Song Luyen pe echipe - Grade
  const songGrade: Array<{ vmin: number; vmax: number | null; gen: 'Feminin' | 'Masculin' | 'Mixt'; arma: string }> = [
    { vmin: 13, vmax: 15, gen: 'Feminin', arma: 'Bong / Song Cot / Moc Can' },
    { vmin: 13, vmax: 15, gen: 'Masculin', arma: 'Bong / Song Cot / Moc Can' },
    { vmin: 13, vmax: 15, gen: 'Mixt', arma: 'Bong / Song Cot / Moc Can' },
    { vmin: 16, vmax: 17, gen: 'Feminin', arma: 'Bong / Song Cot / Moc Can' },
    { vmin: 16, vmax: 17, gen: 'Masculin', arma: 'Bong / Song Cot / Moc Can' },
    { vmin: 16, vmax: 17, gen: 'Mixt', arma: 'Bong / Song Cot / Moc Can' },
    { vmin: 18, vmax: 39, gen: 'Feminin', arma: 'Bong / Song Cot / Moc Can' },
    { vmin: 18, vmax: 39, gen: 'Masculin', arma: 'Bong / Song Cot / Moc Can' },
    { vmin: 18, vmax: 39, gen: 'Mixt', arma: 'Bong / Song Cot / Moc Can' },
    { vmin: 40, vmax: null, gen: 'Feminin', arma: 'Bong / Song Cot / Moc Can' },
    { vmin: 40, vmax: null, gen: 'Masculin', arma: 'Bong / Song Cot / Moc Can' },
    { vmin: 40, vmax: null, gen: 'Mixt', arma: 'Bong / Song Cot / Moc Can' },
  ];

  for (const g of songGrade) {
    categories.push({
      numar_categorie: nr++, varsta_min: g.vmin, varsta_max: g.vmax,
      gen: g.gen, grad_min_ordine: 1, grad_max_ordine: 4,
      arma: g.arma, tip_participare: 'pereche',
      sportivi_per_echipa_min: 2, sportivi_per_echipa_max: 2,
      rezerve_max: 0, max_echipe_per_club: 1, min_participanti_start: 3,
      tip_proba: 'song_luyen',
    });
  }

  // Thao Lo Individual - Centuri Negre (duminica)
  const cnThaoLo: Array<{
    vmin: number; vmax: number | null;
    gen: 'Feminin' | 'Masculin';
    gmin: number; gmax: number;
    arma: string;
  }> = [
    { vmin: 18, vmax: 39, gen: 'Feminin', gmin: 5, gmax: 5, arma: 'Bong' },
    { vmin: 18, vmax: 39, gen: 'Masculin', gmin: 5, gmax: 5, arma: 'Bong' },
    { vmin: 18, vmax: 39, gen: 'Feminin', gmin: 6, gmax: 9, arma: 'Bong' },
    { vmin: 18, vmax: 39, gen: 'Masculin', gmin: 6, gmax: 9, arma: 'Bong' },
    { vmin: 18, vmax: 39, gen: 'Feminin', gmin: 5, gmax: 9, arma: 'Long Gian / Song Cot / Moc Can' },
    { vmin: 18, vmax: 39, gen: 'Masculin', gmin: 5, gmax: 9, arma: 'Long Gian / Song Cot / Moc Can' },
    { vmin: 18, vmax: 39, gen: 'Feminin', gmin: 5, gmax: 9, arma: 'Moc Guom' },
    { vmin: 18, vmax: 39, gen: 'Masculin', gmin: 5, gmax: 9, arma: 'Moc Guom' },
    { vmin: 18, vmax: 39, gen: 'Feminin', gmin: 5, gmax: 9, arma: 'Song Diep Dao / Yen Dao / Ma Dao / Dai Dao' },
    { vmin: 18, vmax: 39, gen: 'Masculin', gmin: 5, gmax: 9, arma: 'Song Diep Dao / Yen Dao / Ma Dao / Dai Dao' },
    { vmin: 18, vmax: 39, gen: 'Feminin', gmin: 5, gmax: 9, arma: '2 Long Gian / Tam Thiet Gian / Nhuyen Tien' },
    { vmin: 18, vmax: 39, gen: 'Masculin', gmin: 5, gmax: 9, arma: '2 Long Gian / Tam Thiet Gian / Nhuyen Tien' },
    // 40-49 ani CN
    { vmin: 40, vmax: 49, gen: 'Feminin', gmin: 5, gmax: 5, arma: 'Bong' },
    { vmin: 40, vmax: 49, gen: 'Masculin', gmin: 5, gmax: 6, arma: 'Bong' },
    { vmin: 40, vmax: 49, gen: 'Feminin', gmin: 6, gmax: 10, arma: 'Bong' },
    { vmin: 40, vmax: 49, gen: 'Masculin', gmin: 7, gmax: 10, arma: 'Bong' },
    { vmin: 40, vmax: 49, gen: 'Feminin', gmin: 5, gmax: 10, arma: 'Long Gian / Song Cot / Moc Can' },
    { vmin: 40, vmax: 49, gen: 'Masculin', gmin: 5, gmax: 10, arma: 'Long Gian / Song Cot / Moc Can' },
    { vmin: 40, vmax: 49, gen: 'Feminin', gmin: 5, gmax: 10, arma: 'Moc Guom' },
    { vmin: 40, vmax: 49, gen: 'Masculin', gmin: 5, gmax: 10, arma: 'Moc Guom' },
    { vmin: 40, vmax: 49, gen: 'Feminin', gmin: 5, gmax: 10, arma: 'Arme cu lamă și articulate' },
    { vmin: 40, vmax: 49, gen: 'Masculin', gmin: 5, gmax: 10, arma: 'Arme cu lamă și articulate' },
    // Peste 50 ani
    { vmin: 50, vmax: null, gen: 'Feminin', gmin: 5, gmax: 10, arma: 'Bong / Long Gian / Song Cot / Moc Guom' },
    { vmin: 50, vmax: null, gen: 'Masculin', gmin: 5, gmax: 10, arma: 'Bong / Long Gian / Song Cot / Moc Guom' },
    { vmin: 50, vmax: null, gen: 'Feminin', gmin: 5, gmax: 10, arma: 'Arme cu lamă și articulate' },
    { vmin: 50, vmax: null, gen: 'Masculin', gmin: 5, gmax: 10, arma: 'Arme cu lamă și articulate' },
  ];

  for (const g of cnThaoLo) {
    categories.push({
      numar_categorie: nr++, varsta_min: g.vmin, varsta_max: g.vmax,
      gen: g.gen, grad_min_ordine: g.gmin, grad_max_ordine: g.gmax,
      arma: g.arma, tip_participare: 'individual',
      sportivi_per_echipa_min: 1, sportivi_per_echipa_max: 1,
      rezerve_max: 0, max_echipe_per_club: 99, min_participanti_start: 3,
      tip_proba: 'thao_lo_individual',
    });
  }

  // Song Luyen pe echipe - CN
  const songCN = [
    { vmin: 18, vmax: 39, gmin: 5, gmax: 9, arma: 'Bong / Song Cot / Moc Can' },
    { vmin: 18, vmax: 39, gmin: 5, gmax: 9, arma: 'Arme cu lamă și articulate' },
    { vmin: 40, vmax: null, gmin: 5, gmax: 10, arma: 'Bong / Song Cot / Moc Can' },
    { vmin: 40, vmax: null, gmin: 5, gmax: 10, arma: 'Arme cu lamă și articulate' },
  ];
  for (const g of songCN) {
    for (const gen of ['Feminin', 'Masculin', 'Mixt'] as const) {
      categories.push({
        numar_categorie: nr++, varsta_min: g.vmin, varsta_max: g.vmax,
        gen, grad_min_ordine: g.gmin, grad_max_ordine: g.gmax,
        arma: g.arma, tip_participare: 'pereche',
        sportivi_per_echipa_min: 2, sportivi_per_echipa_max: 2,
        rezerve_max: 0, max_echipe_per_club: 1, min_participanti_start: 3,
        tip_proba: 'song_luyen',
      });
    }
  }

  // Giao Dau individual - Grade
  const giaoDauGrade = [
    [13, 14, 'Feminin', 2, 4], [13, 14, 'Masculin', 2, 4],
    [15, 15, 'Feminin', 2, 4], [15, 15, 'Masculin', 2, 4],
    [16, 16, 'Feminin', 2, 4], [16, 16, 'Masculin', 2, 4],
    [17, 17, 'Feminin', 2, 4], [17, 17, 'Masculin', 2, 4],
    [18, 39, 'Feminin', 2, 4], [18, 39, 'Masculin', 2, 4],
    [40, 49, 'Feminin', 2, 4], [40, 49, 'Masculin', 2, 4],
  ] as const;

  for (const [vmin, vmax, gen, gmin, gmax] of giaoDauGrade) {
    categories.push({
      numar_categorie: nr++, varsta_min: vmin, varsta_max: vmax,
      gen, grad_min_ordine: gmin, grad_max_ordine: gmax,
      arma: null, tip_participare: 'individual',
      sportivi_per_echipa_min: 1, sportivi_per_echipa_max: 1,
      rezerve_max: 0, max_echipe_per_club: 99, min_participanti_start: 3,
      tip_proba: 'giao_dau',
    });
  }

  // Giao Dau individual - CN
  const giaoDauCN = [
    [18, 24, 'Feminin', 5, 7], [18, 24, 'Masculin', 5, 7],
    [25, 39, 'Feminin', 5, 9], [25, 39, 'Masculin', 5, 9],
    [40, 49, 'Feminin', 5, 10], [40, 49, 'Masculin', 5, 10],
    [50, 59, 'Feminin', 5, 10], [50, 59, 'Masculin', 5, 10],
  ] as const;

  for (const [vmin, vmax, gen, gmin, gmax] of giaoDauCN) {
    categories.push({
      numar_categorie: nr++, varsta_min: vmin, varsta_max: vmax,
      gen, grad_min_ordine: gmin, grad_max_ordine: gmax,
      arma: null, tip_participare: 'individual',
      sportivi_per_echipa_min: 1, sportivi_per_echipa_max: 1,
      rezerve_max: 0, max_echipe_per_club: 99, min_participanti_start: 3,
      tip_proba: 'giao_dau',
    });
  }

  return categories;
}

export const TIP_PROBA_LABELS: Record<TipProba, string> = {
  thao_quyen_individual: 'Thao Quyen Individual',
  sincron: 'Sincron (perechi)',
  song_luyen: 'Song Luyen (perechi)',
  giao_dau: 'Giao Dau (lupte)',
  thao_lo_individual: 'Thao Lo Individual (arme)',
};

export const TIP_COMPETITIE_LABELS = {
  tehnica: 'CN Tehnica (Quyen / Kata)',
  giao_dau: 'CN Giao Dau (Lupte)',
  cvd: 'CN Co Vo Dao (Arme)',
};

export const DEFAULT_PROBE_PER_TIP: Record<string, Array<{ tip_proba: TipProba; denumire: string }>> = {
  tehnica: [
    { tip_proba: 'thao_quyen_individual', denumire: 'Thao Quyen Individual' },
    { tip_proba: 'sincron', denumire: 'Sincron (perechi)' },
    { tip_proba: 'song_luyen', denumire: 'Song Luyen (perechi)' },
  ],
  giao_dau: [
    { tip_proba: 'giao_dau', denumire: 'Giao Dau (lupte)' },
  ],
  cvd: [
    { tip_proba: 'thao_lo_individual', denumire: 'Thao Lo Individual (arme)' },
    { tip_proba: 'song_luyen', denumire: 'Song Luyen pe Echipe (arme)' },
    { tip_proba: 'giao_dau', denumire: 'Giao Dau Individual (arme)' },
  ],
};
