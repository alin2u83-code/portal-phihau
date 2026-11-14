/**
 * Faza 41: preview-uri pure (fără Supabase) pentru anulare / mutare / fuziune / împărțire categorii.
 * Calculate pe datele deja încărcate; RPC-ul categorii_aplica_operatie re-validează pe server (41-01).
 */
import { categorieActiva } from '../components/Competitii/constants';
import { verificaEligibilitate, gradEfectivLaData, calculeazaVarstaLaData } from './eligibilitateCompetitie';
import { calculeazaTaxaIndividuala, calculeazaTaxaEchipa } from './taxeCompetitie';
import { buildCategorieDenumire } from './competitiiTemplates';
import type {
  CategorieCompetitie, InscriereCompetitie, EchipaCompetitie, Grad, Competitie, Sportiv,
  OperatieCategorii, CategorieNouaInput, MutareCategorie,
} from '../types';

export interface ParticipantCategorie {
  tip: 'inscriere' | 'echipa';
  id: string;
  categorieId: string;
  clubId: string;
  nume: string;
  clubNume: string;
  gradNume: string;
  varsta: number | null;
  gen: 'Feminin' | 'Masculin' | null;
  quyen: string;
  taxaAchitata: boolean;
  sportivId: string | null;
  sportiv: Sportiv | null;
  membri: Sportiv[];
}

/** tinta: cheia unei categorii noi sau id-ul uneia existente; null = alegere manuală. */
export interface RandPlanCategorie extends ParticipantCategorie { tinta: string | null }

export interface PlanOperatieCategorii {
  operatie: OperatieCategorii;
  surse: string[];
  categoriiNoi: CategorieNouaInput[];
  randuri: RandPlanCategorie[];
  blocaje: string[];
  avertismente: string[];
  asteptat: number | null;
  taxe: { nrNeachitate: number; sumaNeachitata: number; nrAchitate: number; sumaAchitata: number } | null;
}

export interface RezultatMutari {
  mutari: MutareCategorie[];
  nealocate: number;
  blocaje: string[];
  avertismente: Record<string, string[]>;
}

export type CriteriuImpartire = 'varsta' | 'grad' | 'gen';

export interface CtxCategorii {
  categorii: CategorieCompetitie[];
  inscrieri: InscriereCompetitie[];
  echipe: EchipaCompetitie[];
  grade: Grad[];
  competitie: Competitie;
}

const NEDEFINIT = '—';
const retras = (s?: string | null) => /^retras/i.test(s ?? '');
const cmp = (a: string, b: string) => a.localeCompare(b, 'ro-RO');
const membriEchipa = (e: EchipaCompetitie) => e.echipa_sportivi ?? e.sportivi ?? [];

export const cheieRand = (r: { tip: string; id: string }): string => `${r.tip}:${r.id}`;

export function compatibile(a: CategorieCompetitie, b: CategorieCompetitie): boolean {
  return (a.proba_id ?? null) === (b.proba_id ?? null)
    && a.tip_participare === b.tip_participare
    && (a.arma ?? null) === (b.arma ?? null);
}

/** Categorie „virtuală” (încă neinserată) cu id = cheia ei, ca să se poată reutiliza verificaEligibilitate. */
export function categorieDinInput(sursa: CategorieCompetitie, n: CategorieNouaInput): CategorieCompetitie {
  return {
    ...sursa, id: n.cheie, denumire: n.denumire, varsta_min: n.varsta_min, varsta_max: n.varsta_max, gen: n.gen,
    grad_min_ordine: n.grad_min_ordine, grad_max_ordine: n.grad_max_ordine,
    status_categorie: 'activa', este_fuzionata: false, categorii_fuzionate_din: null,
  };
}

function gradNumePentru(sp: Sportiv | null | undefined, ctx: CtxCategorii): string {
  if (!sp) return NEDEFINIT;
  return gradEfectivLaData(sp, ctx.grade, ctx.competitie.data_inceput)?.nume ?? NEDEFINIT;
}

/** Rândurile active (ne-retrase) ale categoriilor date; sortate după club apoi nume. */
export function participanti(categorieIds: string[], ctx: CtxCategorii): ParticipantCategorie[] {
  const ids = new Set(categorieIds);
  const out: ParticipantCategorie[] = [];
  for (const i of ctx.inscrieri) {
    if (!ids.has(i.categorie_id) || retras(i.status)) continue;
    const sp = (i.sportiv as any) ?? null;
    out.push({
      tip: 'inscriere', id: i.id, categorieId: i.categorie_id, clubId: i.club_id,
      nume: sp ? `${String(sp.nume ?? '').toUpperCase()} ${sp.prenume ?? ''}`.trim() : i.sportiv_id,
      clubNume: sp?.cluburi?.nume ?? '',
      gradNume: gradNumePentru(sp, ctx),
      varsta: sp?.data_nasterii ? calculeazaVarstaLaData(sp.data_nasterii, ctx.competitie.data_inceput) : null,
      gen: sp?.gen ?? null,
      quyen: [i.inlantuire?.denumire, i.inlantuire_2?.denumire].filter(Boolean).join(' + ') || NEDEFINIT,
      taxaAchitata: !!i.taxa_achitata, sportivId: i.sportiv_id, sportiv: sp, membri: [],
    });
  }
  for (const e of ctx.echipe) {
    if (!ids.has(e.categorie_id) || retras(e.status)) continue;
    const membri = membriEchipa(e).filter(m => m.rol !== 'rezerva').map(m => m.sportiv).filter(Boolean) as Sportiv[];
    const gradMax = membri.map(m => gradEfectivLaData(m, ctx.grade, ctx.competitie.data_inceput))
      .filter(Boolean).sort((a, b) => b!.ordine - a!.ordine)[0];
    out.push({
      tip: 'echipa', id: e.id, categorieId: e.categorie_id, clubId: e.club_id,
      nume: e.denumire_echipa || 'Echipă',
      clubNume: (e as any).club?.nume ?? (membri[0] as any)?.cluburi?.nume ?? '',
      gradNume: gradMax?.nume ?? NEDEFINIT, varsta: null, gen: null,
      quyen: e.inlantuire?.denumire ?? NEDEFINIT,
      taxaAchitata: !!e.taxa_achitata, sportivId: null, sportiv: null, membri,
    });
  }
  return out.sort((a, b) => cmp(a.clubNume, b.clubNume) || cmp(a.nume, b.nume));
}

/** D-07: rândurile active rămase legate de o categorie ne-activă (anulată / fuzionată / împărțită). */
export function participantiFaraCategorie(ctx: CtxCategorii): ParticipantCategorie[] {
  return participanti(ctx.categorii.filter(c => !categorieActiva(c)).map(c => c.id), ctx);
}

export function sportiviInscrisi(categorieId: string, inscrieri: InscriereCompetitie[], echipe: EchipaCompetitie[]): string[] {
  const s = new Set<string>();
  inscrieri.filter(i => i.categorie_id === categorieId && !retras(i.status)).forEach(i => s.add(i.sportiv_id));
  echipe.filter(e => e.categorie_id === categorieId && !retras(e.status)).forEach(e => membriEchipa(e).forEach(m => s.add(m.sportiv_id)));
  return [...s];
}

const taxaRand = (r: ParticipantCategorie, cat: CategorieCompetitie, comp: Competitie) =>
  r.tip === 'inscriere' ? calculeazaTaxaIndividuala(comp, cat) : calculeazaTaxaEchipa(cat, comp);

/** Sportivii de verificat pentru eligibilitate: individul sau titularii echipei. */
const sportiviDeVerificat = (r: ParticipantCategorie): Sportiv[] => (r.tip === 'inscriere' ? (r.sportiv ? [r.sportiv] : []) : r.membri);

/** Blocaje (doar la mutare) + avertismente pentru mutarea unui rând în categoria `tinta`. */
export function verificaTinta(
  rand: ParticipantCategorie, tinta: CategorieCompetitie, ctx: CtxCategorii, operatie: OperatieCategorii,
): { blocaj: string | null; avertismente: string[] } {
  const curenta = ctx.categorii.find(c => c.id === rand.categorieId);
  let blocaj: string | null = null;
  if (operatie === 'mutare') {
    if (curenta && !compatibile(curenta, tinta)) blocaj = 'Categoria țintă nu este compatibilă (probă / tip / armă).';
    else if (tinta.id === rand.categorieId) blocaj = 'Categoria țintă este chiar categoria curentă.';
    else if (!categorieActiva(tinta)) blocaj = 'Categoria țintă nu este activă.';
    else if (rand.tip === 'inscriere') {
      const existent = ctx.inscrieri.find(i => i.categorie_id === tinta.id && i.sportiv_id === rand.sportivId);
      if (existent) {
        blocaj = retras(existent.status)
          ? 'Sportivul are un rând retras în categoria țintă (UNIQUE sportiv+categorie) — alege altă categorie țintă pentru acest rând.'
          : 'Sportivul are deja o înscriere în categoria țintă.';
      }
    }
  }
  const avertismente: string[] = [];
  if (rand.tip === 'inscriere') {
    const alta = ctx.inscrieri.some(i => {
      if (i.id === rand.id || i.sportiv_id !== rand.sportivId || retras(i.status)) return false;
      const c = ctx.categorii.find(k => k.id === i.categorie_id);
      return !!c && categorieActiva(c) && c.id !== tinta.id && (c.proba_id ?? null) === (tinta.proba_id ?? null);
    });
    if (alta) avertismente.push('Sportivul are deja altă înscriere activă la aceeași probă.');
  }
  const motive = new Set<string>();
  sportiviDeVerificat(rand).forEach(s => verificaEligibilitate(s, tinta, ctx.grade, ctx.competitie.data_inceput).motive.forEach(m => motive.add(m)));
  if (motive.size) avertismente.push(`Eligibilitate: ${[...motive].join('; ')}.`);
  if (rand.taxaAchitata && curenta) {
    const veche = taxaRand(rand, curenta, ctx.competitie), noua = taxaRand(rand, tinta, ctx.competitie);
    if (veche !== noua) avertismente.push(`Taxă achitată ${veche} lei; în categoria țintă ${noua} lei — diferența se reglează manual.`);
  }
  return { blocaj, avertismente };
}

/** Limitele din RPC categorii_aplica_operatie (20261114a): oglindite aici ca blocajul să apară în preview, nu la confirmare. */
export function blocajeDefinitie(noi: CategorieNouaInput[]): string[] {
  const out: string[] = [];
  for (const n of noi) {
    const e = (m: string) => out.push(`${n.denumire}: ${m}`);
    if (n.varsta_min < 0 || n.varsta_min > 120 || (n.varsta_max !== null && (n.varsta_max < n.varsta_min || n.varsta_max > 120))) e('interval de vârstă invalid (0–120).');
    for (const g of [n.grad_min_ordine, n.grad_max_ordine]) if (g !== null && (g < 1 || g > 100)) e(`ordinea gradului ${g} e în afara limitei 1–100.`);
    if (n.grad_min_ordine !== null && n.grad_max_ordine !== null && n.grad_min_ordine > n.grad_max_ordine) e('grad minim peste gradul maxim.');
  }
  return [...new Set(out)];
}

/** Intervale de vârstă necoperite între sursele unei fuziuni (sortate după vârsta minimă). */
export function goluriVarsta(surse: CategorieCompetitie[]): [number, number][] {
  const gol: [number, number][] = [];
  let acoperit: number | null = null; // null = încă nimic; Infinity = deschis
  for (const s of [...surse].sort((a, b) => a.varsta_min - b.varsta_min)) {
    if (acoperit !== null && s.varsta_min > acoperit + 1) gol.push([acoperit + 1, s.varsta_min - 1]);
    const sf = s.varsta_max ?? Infinity;
    acoperit = acoperit === null ? sf : Math.max(acoperit, sf);
  }
  return gol;
}

const SETARI_FUZIUNE: [keyof CategorieCompetitie, string][] = [
  ['doua_quyenuri', 'două quyenuri'], ['min_participanti_start', 'minim participanți start'], ['max_echipe_per_club', 'max echipe/club'],
  ['sportivi_per_echipa_min', 'sportivi/echipă min'], ['sportivi_per_echipa_max', 'sportivi/echipă max'], ['rezerve_max', 'rezerve max'],
];

/** Setările pe care categoria rezultată le preia doar de la prima sursă și la care sursele diferă. */
export function setariDiferiteFuziune(surse: CategorieCompetitie[]): string[] {
  return SETARI_FUZIUNE.filter(([k]) => new Set(surse.map(s => (k === 'doua_quyenuri' ? !!s[k] : (s[k] ?? null)))).size > 1).map(([, n]) => n);
}

export interface RandFaraCategorieClub {
  tip: 'inscriere' | 'echipa'; id: string; sportivId: string | null; probaId: string | null; arma: string | null;
  nume: string; categorieDenumire: string;
}

/** D-07: rândurile active ale unui club rămase pe o categorie ne-activă (anulată / fuzionată / împărțită). */
export function randuriFaraCategorieClub(
  categorii: CategorieCompetitie[], inscrieri: InscriereCompetitie[], echipe: EchipaCompetitie[], clubId: string,
): RandFaraCategorieClub[] {
  const inactive = new Map(categorii.filter(c => !categorieActiva(c)).map(c => [c.id, c]));
  const out: RandFaraCategorieClub[] = [];
  for (const i of inscrieri) {
    const c = inactive.get(i.categorie_id);
    if (!c || i.club_id !== clubId || retras(i.status)) continue;
    const sp = (i.sportiv as any) ?? null;
    out.push({
      tip: 'inscriere', id: i.id, sportivId: i.sportiv_id, probaId: c.proba_id ?? null, arma: c.arma ?? null,
      nume: sp ? `${String(sp.nume ?? '').toUpperCase()} ${sp.prenume ?? ''}`.trim() : i.sportiv_id, categorieDenumire: c.denumire ?? `Categoria ${c.numar_categorie}`,
    });
  }
  for (const e of echipe) {
    const c = inactive.get(e.categorie_id);
    if (!c || e.club_id !== clubId || retras(e.status)) continue;
    out.push({ tip: 'echipa', id: e.id, sportivId: null, probaId: c.proba_id ?? null, arma: c.arma ?? null, nume: e.denumire_echipa || 'Echipă', categorieDenumire: c.denumire ?? `Categoria ${c.numar_categorie}` });
  }
  return out;
}

/** Cheie `sportiv|proba|armă` pentru sportivii cu rând orfan: împiedică reînscrierea dublă la aceeași probă. */
export const cheieOrfan = (sportivId: string, probaId: string | null | undefined, arma: string | null | undefined) =>
  `${sportivId}|${probaId ?? ''}|${arma ?? ''}`;

const planGol = (operatie: OperatieCategorii): PlanOperatieCategorii =>
  ({ operatie, surse: [], categoriiNoi: [], randuri: [], blocaje: [], avertismente: [], asteptat: null, taxe: null });

/** D-04 / D-08: anularea lasă rândurile „Fără categorie”; taxele se raportează, nu se modifică. */
export function planAnulare(cat: CategorieCompetitie, ctx: CtxCategorii): PlanOperatieCategorii {
  const randuri = participanti([cat.id], ctx).map(r => ({ ...r, tinta: null }));
  const taxe = { nrNeachitate: 0, sumaNeachitata: 0, nrAchitate: 0, sumaAchitata: 0 };
  for (const r of randuri) {
    const t = taxaRand(r, cat, ctx.competitie);
    if (r.taxaAchitata) { taxe.nrAchitate++; taxe.sumaAchitata += t; } else { taxe.nrNeachitate++; taxe.sumaNeachitata += t; }
  }
  const blocaje = categorieActiva(cat) ? [] : ['Categoria nu este activă.'];
  const avertismente: string[] = [];
  if (randuri.length) avertismente.push(`${randuri.length} participanți rămân «Fără categorie» până la realocare.`);
  if (taxe.nrAchitate) avertismente.push(`${taxe.nrAchitate} taxe deja achitate (${taxe.sumaAchitata} lei) rămân marcate achitate: se reportează la realocare sau se returnează clubului.`);
  return { ...planGol('anulare'), surse: [cat.id], randuri, blocaje, avertismente, asteptat: randuri.length, taxe };
}

/** Realocare rânduri „Fără categorie” (sau mutare simplă): sugestie doar când există o singură țintă validă. */
export function planMutare(selectie: { tip: 'inscriere' | 'echipa'; id: string }[], ctx: CtxCategorii): PlanOperatieCategorii {
  const toate = participanti(ctx.categorii.map(c => c.id), ctx);
  const chei = new Set(selectie.map(cheieRand));
  const alese = toate.filter(r => chei.has(cheieRand(r)));
  const blocaje = alese.length < chei.size ? ['Unele înscrieri nu mai sunt disponibile; reîncarcă.'] : [];
  const randuri: RandPlanCategorie[] = alese.map(r => {
    const curenta = ctx.categorii.find(c => c.id === r.categorieId);
    const verificati = sportiviDeVerificat(r);
    const candidate = !curenta || !verificati.length ? [] : ctx.categorii.filter(c =>
      c.id !== curenta.id && categorieActiva(c) && compatibile(curenta, c)
      && verificaTinta(r, c, ctx, 'mutare').blocaj === null
      && verificati.every(s => verificaEligibilitate(s, c, ctx.grade, ctx.competitie.data_inceput).eligibil));
    return { ...r, tinta: candidate.length === 1 ? candidate[0].id : null };
  });
  return { ...planGol('mutare'), surse: [...new Set(randuri.map(r => r.categorieId))], randuri, blocaje };
}

/** Transformă planul + alegerile super adminului în payload-ul `p_mutari`. */
export function mutariDinPlan(plan: PlanOperatieCategorii, alegeri: Record<string, string>, ctx: CtxCategorii): RezultatMutari {
  const rez: RezultatMutari = { mutari: [], nealocate: 0, blocaje: [], avertismente: {} };
  if (plan.operatie === 'anulare') return rez;
  const prima = ctx.categorii.find(c => c.id === plan.surse[0]);
  const vazute = new Set<string>();
  for (const r of plan.randuri) {
    const k = cheieRand(r);
    const tinta = alegeri[k] ?? r.tinta;
    if (!tinta) { rez.nealocate++; continue; }
    rez.mutari.push({ tip: r.tip, id: r.id, tinta });
    const nou = plan.categoriiNoi.find(n => n.cheie === tinta);
    const cat = nou ? (prima ? categorieDinInput(prima, nou) : undefined) : ctx.categorii.find(c => c.id === tinta);
    if (!cat) { rez.blocaje.push(`${r.nume}: categoria țintă nu mai există.`); continue; }
    const v = verificaTinta(r, cat, ctx, plan.operatie);
    rez.avertismente[k] = v.avertismente;
    if (v.blocaj) rez.blocaje.push(`${r.nume}: ${v.blocaj}`);
    if (r.tip === 'inscriere') {
      const dup = `${r.sportivId}|${tinta}`;
      if (vazute.has(dup)) rez.blocaje.push(`${r.nume}: apare de două ori în categoria țintă.`);
      vazute.add(dup);
    }
  }
  if (rez.nealocate) rez.blocaje.push(`${rez.nealocate} participanți nealocați — alege categoria pe fiecare rând.`);
  return rez;
}

// ---------- fuziune / împărțire ----------
type Interval = Pick<CategorieNouaInput, 'varsta_min' | 'varsta_max' | 'gen' | 'grad_min_ordine' | 'grad_max_ordine'>;

const denumireNoua = (s: CategorieCompetitie, v: Interval): string => buildCategorieDenumire({
  ...v, arma: s.arma, tip_participare: s.tip_participare,
  sportivi_per_echipa_min: s.sportivi_per_echipa_min, sportivi_per_echipa_max: s.sportivi_per_echipa_max,
  rezerve_max: s.rezerve_max, max_echipe_per_club: s.max_echipe_per_club,
  min_participanti_start: s.min_participanti_start, numar_categorie: null as any,
});

const noua = (s: CategorieCompetitie, cheie: string, v: Interval): CategorieNouaInput => ({ cheie, denumire: denumireNoua(s, v), ...v });

/** Intervalul rezultat din unirea surselor; o margine deschisă (null) la oricare sursă rămâne deschisă. */
export function definitieFuziune(surse: CategorieCompetitie[]): CategorieNouaInput {
  const nul = (xs: (number | null)[]) => (xs.some(x => x === null) ? null : (xs as number[]));
  const gm = nul(surse.map(s => s.grad_min_ordine)), gM = nul(surse.map(s => s.grad_max_ordine)), vM = nul(surse.map(s => s.varsta_max));
  return noua(surse[0], 'N1', {
    varsta_min: Math.min(...surse.map(s => s.varsta_min)),
    varsta_max: vM === null ? null : Math.max(...vM),
    gen: new Set(surse.map(s => s.gen)).size === 1 ? surse[0].gen : 'Mixt',
    grad_min_ordine: gm === null ? null : Math.min(...gm),
    grad_max_ordine: gM === null ? null : Math.max(...gM),
  });
}

export function planFuziune(surse: CategorieCompetitie[], ctx: CtxCategorii): PlanOperatieCategorii {
  const plan = planGol('fuziune');
  if (surse.length < 2) return { ...plan, surse: surse.map(s => s.id), blocaje: ['Selectează cel puțin 2 categorii.'] };
  const ids = surse.map(s => s.id);
  const blocaje: string[] = [];
  if (!surse.every(categorieActiva)) blocaje.push('Toate categoriile selectate trebuie să fie active.');
  if (!surse.every(s => compatibile(surse[0], s))) blocaje.push('Categoriile selectate nu sunt compatibile (probă / tip / armă diferite).');
  const rows = participanti(ids, ctx);
  const vazuti = new Set<string>(), dubluri = new Set<string>();
  rows.filter(r => r.tip === 'inscriere').forEach(r => { if (vazuti.has(r.sportivId!)) dubluri.add(r.nume); vazuti.add(r.sportivId!); });
  dubluri.forEach(nume => blocaje.push(`${nume} este înscris activ în două dintre categoriile selectate.`));
  const def = definitieFuziune(surse);
  blocaje.push(...blocajeDefinitie([def]));
  const avertismente: string[] = [];
  const goluri = goluriVarsta(surse);
  if (goluri.length) avertismente.push(`Intervalele de vârstă nu sunt adiacente (lipsesc ${goluri.map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`)).join(', ')} ani) — categoria rezultată le acoperă pe toate.`);
  const diferite = setariDiferiteFuziune(surse);
  if (diferite.length) avertismente.push(`Sursele au setări diferite (${diferite.join(', ')}); categoria rezultată le preia de la prima sursă (#${surse[0].numar_categorie}).`);
  if (new Set(surse.map(s => s.gen)).size > 1) avertismente.push('Categoriile au gen diferit — categoria rezultată va fi Mixt.');
  if (rows.length < surse[0].min_participanti_start) avertismente.push(`Categoria rezultată are ${rows.length} participanți, sub minimul de ${surse[0].min_participanti_start}.`);
  const peClub = new Map<string, { nume: string; n: number }>();
  rows.filter(r => r.tip === 'echipa').forEach(r => peClub.set(r.clubId, { nume: r.clubNume, n: (peClub.get(r.clubId)?.n ?? 0) + 1 }));
  const max = surse[0].max_echipe_per_club;
  if (max > 0) peClub.forEach(c => { if (c.n > max) avertismente.push(`Clubul ${c.nume} are ${c.n} echipe, peste limita de ${max} per club.`); });
  return { ...plan, surse: ids, categoriiNoi: [def], randuri: rows.map(r => ({ ...r, tinta: def.cheie })), blocaje, avertismente };
}

/** Împarte intervalul sursei la praguri (valori de început ale copiilor); gen ignoră pragurile. */
export function copiiImpartire(sursa: CategorieCompetitie, criteriu: CriteriuImpartire, praguri: number[], areEchipeMixte: boolean): CategorieNouaInput[] {
  const baza: Interval = { varsta_min: sursa.varsta_min, varsta_max: sursa.varsta_max, gen: sursa.gen, grad_min_ordine: sursa.grad_min_ordine, grad_max_ordine: sursa.grad_max_ordine };
  if (criteriu === 'gen') {
    if (sursa.gen !== 'Mixt') return [];
    const gen: ('Feminin' | 'Masculin' | 'Mixt')[] = areEchipeMixte ? ['Feminin', 'Masculin', 'Mixt'] : ['Feminin', 'Masculin'];
    return gen.map((g, i) => noua(sursa, `N${i + 1}`, { ...baza, gen: g }));
  }
  const varsta = criteriu === 'varsta';
  const lo = varsta ? sursa.varsta_min : (sursa.grad_min_ordine ?? 1);
  const hi = varsta ? sursa.varsta_max : sursa.grad_max_ordine;
  const valide = [...new Set(praguri)].filter(p => p > lo && (hi === null || p <= hi)).sort((a, b) => a - b);
  if (!valide.length) return [];
  const start = [lo, ...valide];
  return start.map((s, i) => {
    const sfarsit = i < valide.length ? start[i + 1] - 1 : hi;
    const v: Interval = varsta
      ? { ...baza, varsta_min: s, varsta_max: sfarsit }
      : { ...baza, grad_min_ordine: i === 0 ? sursa.grad_min_ordine : s, grad_max_ordine: sfarsit };
    return noua(sursa, `N${i + 1}`, v);
  });
}

/** D-05 / D-10: sugestie per rând; echipele primesc țintă doar dacă toți titularii o indică. */
export function planImpartire(sursa: CategorieCompetitie, criteriu: CriteriuImpartire, praguri: number[], ctx: CtxCategorii): PlanOperatieCategorii {
  const rows = participanti([sursa.id], ctx);
  const gen = (m: Sportiv) => m.gen ?? null;
  const mixta = criteriu === 'gen' && sursa.tip_participare !== 'individual'
    && rows.some(r => r.tip === 'echipa' && new Set(r.membri.map(gen).filter(Boolean)).size > 1);
  const copii = copiiImpartire(sursa, criteriu, praguri, mixta);
  const virtuale = copii.map(c => categorieDinInput(sursa, c));
  const dataC = ctx.competitie.data_inceput;
  // cheia copilului potrivit pentru un sportiv (null = niciunul sau mai mulți)
  const copilPentru = (s: Sportiv): string | null => {
    if (criteriu === 'gen') return copii.find(c => c.gen === s.gen)?.cheie ?? null;
    const ok = virtuale.filter(c => verificaEligibilitate(s, c, ctx.grade, dataC).eligibil);
    return ok.length === 1 ? ok[0].id : null;
  };
  const tintaRand = (r: ParticipantCategorie): string | null => {
    if (r.tip === 'inscriere') return r.sportiv ? copilPentru(r.sportiv) : null;
    if (!r.membri.length) return null;
    if (criteriu === 'gen') {
      const g = new Set(r.membri.map(gen));
      if (g.has(null)) return null;
      return (g.size > 1 ? copii.find(c => c.gen === 'Mixt') : copii.find(c => c.gen === [...g][0]))?.cheie ?? null;
    }
    const t = new Set(r.membri.map(copilPentru));
    return t.size === 1 ? [...t][0] : null;
  };
  const randuri: RandPlanCategorie[] = rows.map(r => ({ ...r, tinta: copii.length ? tintaRand(r) : null }));
  const blocaje: string[] = [...blocajeDefinitie(copii)];
  if (!categorieActiva(sursa)) blocaje.push('Categoria nu este activă.');
  if (copii.length < 2) blocaje.push(criteriu === 'gen' && sursa.gen !== 'Mixt'
    ? 'Împărțirea pe gen se face doar pentru o categorie Mixt.' : 'Alege praguri care produc cel puțin 2 categorii.');
  const avertismente: string[] = [];
  const fara = randuri.filter(r => r.tinta === null).length;
  if (copii.length && fara) avertismente.push(`${fara} participanți fără sugestie (date lipsă sau neeligibili) — alege manual categoria.`);
  copii.forEach(c => { if (!randuri.some(r => r.tinta === c.cheie)) avertismente.push(`Categoria ${c.denumire} nu primește niciun participant sugerat.`); });
  return { ...planGol('impartire'), surse: [sursa.id], categoriiNoi: copii, randuri, blocaje, avertismente };
}
