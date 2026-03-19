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
    1:  'Debutant',
    2:  '1 Câp Galben',  3: '2 Câp Galben',  4: '3 Câp Galben',  5: '4 Câp Galben',
    6:  '1 Câp Roșu',    7: '2 Câp Roșu',    8: '3 Câp Roșu',    9: '4 Câp Roșu',
    10: 'Centura Violet',
    11: 'C.V. 1 Câp Alb', 12: 'C.V. 2 Câp Alb', 13: 'C.V. 3 Câp Alb', 14: 'C.V. 4 Câp Alb',
    15: '1 Câp Albastru', 16: '2 Câp Albastru', 17: '3 Câp Albastru', 18: '4 Câp Albastru',
    19: 'Centura Neagră',
    20: 'C.N. 1 Dang', 21: 'C.N. 2 Dang', 22: 'C.N. 3 Dang', 23: 'C.N. 4 Dang',
    24: 'C.N. 5 Dang', 25: 'C.N. 6 Dang', 26: 'C.N. 7 Dang',
  };
  return labels[ordine] ?? `Ordine ${ordine}`;
}

// -----------------------------------------------
// TEMPLATE: CN Copii si Juniori (Tehnica)
// 121 categorii (Thao Quyen Individual + Sincron + Song Luyen)
// -----------------------------------------------
export function generateTemplateTehnnica(): TemplateCategorieInput[] {
  // Grade ordine conform DB:
  // 6=1CâpRoșu 7=2CâpRoșu 8=3CâpRoșu 9=4CâpRoșu
  // 10=CenturaViolet 11=CV1CâpAlb 12=CV2CâpAlb 13=CV3CâpAlb 14=CV4CâpAlb
  // 15=1CâpAlbastru 16=2CâpAlbastru 17=3CâpAlbastru 18=4CâpAlbastru
  // 19=CenturaNeagră 20-26=CN1-7Dang
  const categories: TemplateCategorieInput[] = [];
  let nr = 1;

  // Helper cu numar explicit (pentru Thao Quyen Individual)
  const tq = (
    catNr: number, varsta: number,
    gen: 'Feminin' | 'Masculin',
    grad_min: number, grad_max: number
  ) => {
    categories.push({
      numar_categorie: catNr,
      varsta_min: varsta, varsta_max: varsta, gen,
      grad_min_ordine: grad_min, grad_max_ordine: grad_max,
      arma: null, tip_participare: 'individual',
      sportivi_per_echipa_min: 1, sportivi_per_echipa_max: 1,
      rezerve_max: 0, max_echipe_per_club: 1, min_participanti_start: 3,
      tip_proba: 'thao_quyen_individual',
    });
  };

  // Helper auto-increment (pentru Sincron/Song Luyen)
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
      arma: null, tip_participare,
      sportivi_per_echipa_min: sportivi_min, sportivi_per_echipa_max: sportivi_max,
      rezerve_max: rezerve, max_echipe_per_club: max_echipe,
      min_participanti_start: 3, tip_proba,
    });
  };

  // === THAO QUYEN INDIVIDUAL ===
  // Numerele categoriilor conform circular CN Copii și Juniori

  // 7 ani
  tq(1,  7, 'Feminin',  6, 6);   // 1 Câp Roșu
  tq(2,  7, 'Masculin', 6, 6);
  tq(3,  7, 'Feminin',  7, 8);   // 2-3 Câp Roșu
  tq(4,  7, 'Masculin', 7, 8);

  // 8 ani
  tq(5,  8, 'Feminin',  6, 6);   // 1 Câp Roșu
  tq(6,  8, 'Masculin', 6, 6);
  tq(7,  8, 'Feminin',  7, 7);   // 2 Câp Roșu
  tq(8,  8, 'Masculin', 7, 7);
  tq(9,  8, 'Feminin',  8, 8);   // 3 Câp Roșu
  tq(10, 8, 'Masculin', 8, 8);
  tq(11, 8, 'Feminin',  9, 9);   // 4 Câp Roșu
  tq(12, 8, 'Masculin', 9, 9);
  // cat 13-18: alte probe (Sincron/Song Luyen 7-8 ani)

  // 9 ani
  tq(19, 9, 'Feminin',  6, 6);
  tq(20, 9, 'Masculin', 6, 6);
  tq(21, 9, 'Feminin',  7, 7);
  tq(22, 9, 'Masculin', 7, 7);
  tq(23, 9, 'Feminin',  8, 8);
  tq(24, 9, 'Masculin', 8, 8);
  tq(25, 9, 'Feminin',  9, 9);
  tq(26, 9, 'Masculin', 9, 9);
  tq(27, 9, 'Feminin',  10, 11); // Centura Violet – C.V. 1 Câp Alb
  tq(28, 9, 'Masculin', 10, 11);

  // 10 ani
  tq(29, 10, 'Feminin',  6, 6);
  tq(30, 10, 'Masculin', 6, 6);
  tq(31, 10, 'Feminin',  7, 7);
  tq(32, 10, 'Masculin', 7, 7);
  tq(33, 10, 'Feminin',  8, 8);
  tq(34, 10, 'Masculin', 8, 8);
  tq(35, 10, 'Feminin',  9, 9);
  tq(36, 10, 'Masculin', 9, 9);
  tq(37, 10, 'Feminin',  10, 10); // Centura Violet
  tq(38, 10, 'Masculin', 10, 10);
  tq(39, 10, 'Feminin',  11, 12); // C.V. 1-2 Câp Alb
  tq(40, 10, 'Masculin', 11, 12);

  // 11 ani
  tq(41, 11, 'Feminin',  6, 6);
  tq(42, 11, 'Masculin', 6, 6);
  tq(43, 11, 'Feminin',  7, 7);
  tq(44, 11, 'Masculin', 7, 7);
  tq(45, 11, 'Feminin',  8, 8);
  tq(46, 11, 'Masculin', 8, 8);
  tq(47, 11, 'Feminin',  9, 9);
  tq(48, 11, 'Masculin', 9, 9);
  tq(49, 11, 'Feminin',  10, 10);
  tq(50, 11, 'Masculin', 10, 10);
  tq(51, 11, 'Feminin',  11, 11); // C.V. 1 Câp Alb
  tq(52, 11, 'Masculin', 11, 11);
  tq(53, 11, 'Feminin',  12, 13); // C.V. 2-3 Câp Alb
  tq(54, 11, 'Masculin', 12, 13);

  // 12 ani
  tq(55, 12, 'Feminin',  6, 6);
  tq(56, 12, 'Masculin', 6, 6);
  tq(57, 12, 'Feminin',  7, 7);
  tq(58, 12, 'Masculin', 7, 7);
  tq(59, 12, 'Feminin',  8, 8);
  tq(60, 12, 'Masculin', 8, 8);
  tq(61, 12, 'Feminin',  9, 9);
  tq(62, 12, 'Masculin', 9, 9);
  tq(63, 12, 'Feminin',  10, 10);
  tq(64, 12, 'Masculin', 10, 10);
  tq(65, 12, 'Feminin',  11, 11);
  tq(66, 12, 'Masculin', 11, 11);
  tq(67, 12, 'Feminin',  12, 12);
  tq(68, 12, 'Masculin', 12, 12);
  tq(69, 12, 'Feminin',  13, 14); // C.V. 3-4 Câp Alb
  tq(70, 12, 'Masculin', 13, 14);
  // cat 71-100: categorii nepublicate în circular (probabil grade superioare)

  // 13 ani
  tq(101, 13, 'Feminin',  15, 16); // 1-2 Câp Albastru
  tq(102, 13, 'Masculin', 15, 16);

  // 14 ani
  tq(103, 14, 'Feminin',  15, 15); // 1 Câp Albastru
  tq(104, 14, 'Masculin', 15, 15);
  tq(105, 14, 'Feminin',  16, 17); // 2-3 Câp Albastru
  tq(106, 14, 'Masculin', 16, 17);

  // 15 ani
  tq(107, 15, 'Feminin',  15, 15);
  tq(108, 15, 'Masculin', 15, 15);
  tq(109, 15, 'Feminin',  16, 16);
  tq(110, 15, 'Masculin', 16, 16);
  tq(111, 15, 'Feminin',  17, 18); // 3-4 Câp Albastru
  tq(112, 15, 'Masculin', 17, 18);

  // Sincron și Song Luyen continuă cu numerotare proprie
  nr = 113;

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
