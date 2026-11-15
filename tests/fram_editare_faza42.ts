// tests/fram_editare_faza42.ts
//
// Faza 42 - Plan 04. Dovedeste LIVE regulile din migrarea 20261115b_competitie_fram_editare.sql:
//   D-01..D-03 fram_obligatoriu (doar super admin, doar draft, doar fara participanti), D-04..D-06 FRAM la inscriere /
//   reactivare / membru de echipa (+ exceptie super admin auditata), D-07 poarta de inchidere (RLS) si inghetarea
//   dupa 'finalizata' (cascada si taxa_achitata raman permise), D-08 compatibilitate la schimbarea categoriei,
//   D-10 audit pe editari, sursa de date D-09 (audit mutari categorie) si sursa UI vize_club_competitie.
//
// Siguranta date reale: competitii efemere ZZ_TEST_FAZA42_*; EXCLUSIV sportivi care au deja viza FRQKD (an fiscal curent)
// si FRAM (an calendaristic curent) achitata/scutita, deci triggerul trg_taxa_anuala_inscrieri_competitie e no-op
// (verificat la check 15). Parola utilizatorilor temporari = UUID aleator, nu se tipareste.
// GDPR: se tiparesc doar numaratori si UUID-uri; mesajele de refuz (contin numele sportivului) se potrivesc, nu se tiparesc.
// finally: sterge competitiile (CASCADE) si utilizatorii temporari; audit_log nu are DELETE (se raporteaza numarul).
//
// Rulare: npx tsx tests/fram_editare_faza42.ts   (cod 1 = cel putin un FAIL, cod 2 = precondiții nesigure)

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import 'dotenv/config';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey) {
  console.error('Lipsesc VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const PREFIX = 'ZZ_TEST_FAZA42_';
const EMAIL_PREFIX = 'zztest_faza42_';
const RUN_ID = Date.now();
const admin = createClient(url, serviceKey);

type Check = { name: string; passed: boolean; detail?: string };
const results: Check[] = [];
const record = (name: string, passed: boolean, detail?: string) => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} - ${name}${detail ? ` (${detail})` : ''}`);
};

// "respins" = eroare RLS/trigger SAU niciun rand afectat; "reusit" = fara eroare si cel putin un rand
const respins = (r: { data: any; error: any }) => !!r.error || !r.data || (Array.isArray(r.data) && r.data.length === 0);
const reusit = (r: { data: any; error: any }) => !r.error && !!r.data && (!Array.isArray(r.data) || r.data.length > 0);
const msg = (r: { error: any }) => (r.error?.message ?? '') as string;
const det = (r: { data: any; error: any }) => r.error ? `code=${r.error.code}` : `rows=${Array.isArray(r.data) ? r.data.length : r.data ? 1 : 0}`;

async function clientFor(email: string, parola: string, contextId: string): Promise<SupabaseClient> {
  const c = createClient(url!, anonKey!, { global: { headers: { 'active-role-context-id': contextId } } });
  const { error } = await c.auth.signInWithPassword({ email, password: parola });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return c;
}

async function fetchAll<T = any>(mk: (from: number, to: number) => any): Promise<T[]> {
  const out: T[] = [];
  for (let f = 0; ; f += 1000) {
    const { data, error } = await mk(f, f + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  return out;
}

class Precond extends Error {}

async function main() {
  const competitii: string[] = [];
  const userIds: string[] = [];
  const parola = `${randomUUID()}aA1!`;
  const startTs = new Date().toISOString();
  let sportivi: string[] = [];
  let auditCount: number | string = 'n/a';

  try {
    // ── precondiții: an fiscal / an calendaristic, club + 3 sportivi cu FRQKD(F) si FRAM(Y) achitat ──────────
    const Y = new Date().getFullYear();
    const { data: anF } = await admin.rpc('an_fiscal_federatie', { p_data: new Date().toISOString().slice(0, 10) });
    const F = typeof anF === 'number' ? anF : Y;

    const framY = await fetchAll((f, t) => admin.from('vize_sportivi')
      .select('sportiv_id, scutit, plati(status), sportivi!inner(club_id)').eq('tip', 'FRAM').eq('an', Y).order('id').range(f, t));
    const frqkdF = new Set((await fetchAll((f, t) => admin.from('vize_sportivi')
      .select('sportiv_id').eq('tip', 'FRQKD').eq('an', F).order('id').range(f, t))).map((x: any) => x.sportiv_id));
    const framY1 = new Set((await fetchAll((f, t) => admin.from('vize_sportivi')
      .select('sportiv_id').eq('tip', 'FRAM').eq('an', Y + 1).order('id').range(f, t))).map((x: any) => x.sportiv_id));

    const perClub = new Map<string, string[]>();
    for (const v of framY as any[]) {
      const platit = !!v.scutit || v.plati?.status === 'Achitat';
      if (!platit || !frqkdF.has(v.sportiv_id) || framY1.has(v.sportiv_id)) continue;
      const club = v.sportivi?.club_id as string;
      if (!club) continue;
      const l = perClub.get(club) ?? [];
      if (!l.includes(v.sportiv_id)) l.push(v.sportiv_id);
      perClub.set(club, l);
    }
    const best = [...perClub.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    if (!best || best[1].length < 3) throw new Precond(`mai putin de 3 sportivi cu FRQKD an=${F} + FRAM an=${Y} achitat (si fara FRAM ${Y + 1}) intr-un club`);
    const CLUB = best[0];
    const [s1, s2, s3] = best[1];
    sportivi = [s1, s2, s3];

    // ── setup (service role) ────────────────────────────────────────────────
    const nextDay = (d: string) => new Date(Date.parse(d) + 86400000).toISOString().slice(0, 10);
    const mkComp = async (suffix: string, status: string, data: string) => {
      const { data: row, error } = await admin.from('competitii').insert({
        denumire: `${PREFIX}${suffix}_${RUN_ID}`, tip: 'tehnica', data_inceput: data, data_sfarsit: nextDay(data),
        locatie: 'Test', status, deadline_inscrieri: data,
      }).select('id, fram_obligatoriu').single();
      if (error || !row) throw new Error(`competitie ${suffix}: ${error?.message}`);
      competitii.push(row.id);
      return row as { id: string; fram_obligatoriu: boolean };
    };
    const mkCat = async (comp: string, suffix: string, nr: number, tip = 'individual') => {
      const { data, error } = await admin.from('categorii_competitie').insert({
        competitie_id: comp, denumire: `${PREFIX}${suffix}_${RUN_ID}`, varsta_min: 0, gen: 'Mixt',
        tip_participare: tip, numar_categorie: nr, ordine_afisare: nr,
      }).select('id').single();
      if (error || !data) throw new Error(`categorie ${suffix}: ${error?.message}`);
      return data.id as string;
    };
    const mkIns = async (comp: string, cat: string, sp: string, extra: Record<string, any> = {}) => {
      const { data, error } = await admin.from('inscrieri_competitie').insert({
        competitie_id: comp, categorie_id: cat, club_id: CLUB, sportiv_id: sp, ...extra,
      }).select('id').single();
      if (error || !data) throw new Error(`inscriere: ${error?.message}`);
      return data.id as string;
    };
    const mkEchipa = async (comp: string, cat: string, suffix: string) => {
      const { data, error } = await admin.from('echipe_competitie').insert({
        competitie_id: comp, categorie_id: cat, club_id: CLUB, denumire_echipa: `${PREFIX}${suffix}_${RUN_ID}`,
      }).select('id').single();
      if (error || !data) throw new Error(`echipa ${suffix}: ${error?.message}`);
      return data.id as string;
    };
    const count = async (table: string, col: string, id: string) =>
      (await admin.from(table).select('id', { count: 'exact', head: true }).eq(col, id)).count ?? 0;
    const flag = async (id: string) => (await admin.from('competitii').select('fram_obligatoriu').eq('id', id).single()).data?.fram_obligatoriu as boolean;

    const D_Y = `${Y}-12-31`;
    const D_Y1 = `${Y + 1}-06-01`;
    const Cdraft = await mkComp('DRAFT', 'draft', D_Y);
    const Cok = await mkComp('OK', 'inscrieri_deschise', D_Y);
    const Clipsa = await mkComp('LIPSA', 'inscrieri_deschise', D_Y1);
    const Coff = await mkComp('OFF', 'inscrieri_deschise', D_Y1);
    const Cinchis = await mkComp('INCHIS', 'inscrieri_deschise', D_Y);
    const Cfed = await mkComp('FEDDRAFT', 'draft', D_Y);
    const d1 = await mkCat(Cdraft.id, 'd1', 1);
    const ok1 = await mkCat(Cok.id, 'ok1', 1);
    const ok2 = await mkCat(Cok.id, 'ok2', 2);
    const okT = await mkCat(Cok.id, 'okT', 3, 'echipa');
    const l1 = await mkCat(Clipsa.id, 'l1', 1);
    const lT = await mkCat(Clipsa.id, 'lT', 2, 'echipa');
    const f1 = await mkCat(Coff.id, 'f1', 1);
    const i1 = await mkCat(Cinchis.id, 'i1', 1);

    // ── utilizatori + roluri efemere ────────────────────────────────────────
    const mkUser = async (tag: string, rol: string, club: string | null, soft = false) => {
      const email = `${EMAIL_PREFIX}${tag}_${RUN_ID}@example.com`;
      const { data, error } = await admin.auth.admin.createUser({ email, password: parola, email_confirm: true });
      if (error || !data.user) throw new Error(`user ${tag}: ${error?.message}`);
      userIds.push(data.user.id);
      const { data: rolRow, error: re } = await admin.from('utilizator_roluri_multicont')
        .insert({ user_id: data.user.id, rol_denumire: rol, club_id: club, is_primary: true }).select('id').single();
      if (re || !rolRow) {
        if (soft) return null;
        throw new Error(`rol ${tag}: ${re?.message}`);
      }
      return clientFor(email, parola, rolRow.id);
    };
    const sup = (await mkUser('sup', 'SUPER_ADMIN_FEDERATIE', null))!;
    const adm = (await mkUser('adm', 'ADMIN_CLUB', CLUB))!;
    const fed = await mkUser('fed', 'ADMIN', null, true);

    let r: any;

    // 1: default false (D-01)
    record('1 competitie noua are fram_obligatoriu=false (D-01 default)', Cdraft.fram_obligatoriu === false, `valoare=${Cdraft.fram_obligatoriu}`);

    // 2: sup seteaza pe draft; refuzat pe inscrieri_deschise (D-02)
    r = await sup.from('competitii').update({ fram_obligatoriu: true }).eq('id', Cdraft.id).select('id');
    const okDraft = reusit(r) && (await flag(Cdraft.id)) === true;
    const r2b: any = await sup.from('competitii').update({ fram_obligatoriu: true }).eq('id', Cok.id).select('id');
    record('2 super admin seteaza FRAM pe draft; pe inscrieri_deschise refuzat (mesaj schiță)',
      okDraft && !!r2b.error && msg(r2b).includes('schiță') && (await flag(Cok.id)) === false, `draft:${det(r)} deschisa:${r2b.error?.code}`);

    // 3: participant activ blocheaza schimbarea (D-03)
    await mkIns(Cdraft.id, d1, s1);
    r = await sup.from('competitii').update({ fram_obligatoriu: false }).eq('id', Cdraft.id).select('id');
    record('3 cu participant activ, dezactivarea FRAM pe draft refuzata (mesaj participanți)',
      !!r.error && msg(r).includes('participanți') && (await flag(Cdraft.id)) === true, det(r));

    // 4: ADMIN (nu super admin) nu poate schimba flagul (D-01)
    if (!fed) {
      console.log('INFO - check 4 omis: randul de rol ADMIN nu a putut fi creat');
    } else {
      r = await fed.from('competitii').update({ fram_obligatoriu: true }).eq('id', Cfed.id).select('id');
      record('4 ADMIN (non super admin) nu poate seta FRAM; flagul ramane false',
        respins(r) && (await flag(Cfed.id)) === false, `${det(r)} (42501 = trigger; rows=0 = RLS)`);
    }

    // 5: service activeaza regula; adm inscrie s1 cu FRAM Y achitat (D-06)
    for (const c of [Cok.id, Clipsa.id, Cinchis.id]) {
      const { error } = await admin.from('competitii').update({ fram_obligatoriu: true }).eq('id', c);
      if (error) throw new Error(`service fram: ${error.message}`);
    }
    r = await adm.from('inscrieri_competitie').insert({ competitie_id: Cok.id, categorie_id: ok1, club_id: CLUB, sportiv_id: s1 }).select('id');
    const idCok = r.data?.[0]?.id as string | undefined;
    record(`5 regula activa: ADMIN_CLUB inscrie sportiv cu FRAM ${Y} achitat`, reusit(r), det(r));

    // 6: adm refuzat pentru FRAM Y+1 lipsa (D-04)
    r = await adm.from('inscrieri_competitie').insert({ competitie_id: Clipsa.id, categorie_id: l1, club_id: CLUB, sportiv_id: s2 }).select('id');
    const n6 = (await admin.from('inscrieri_competitie').select('id', { count: 'exact', head: true }).eq('competitie_id', Clipsa.id).eq('sportiv_id', s2)).count ?? 0;
    record(`6 ADMIN_CLUB refuzat fara FRAM ${Y + 1} (mesaj FRAM + an), niciun rand`,
      !!r.error && msg(r).includes('FRAM') && msg(r).includes(String(Y + 1)) && n6 === 0, `${det(r)} randuri=${n6}`);

    // 7: sup inscrie fara FRAM + audit cu marker (D-05)
    r = await sup.from('inscrieri_competitie').insert({ competitie_id: Clipsa.id, categorie_id: l1, club_id: CLUB, sportiv_id: s2 }).select('id');
    const id7 = r.data?.[0]?.id as string | undefined;
    let marker7 = 0;
    if (id7) {
      const a: any = await admin.from('audit_log').select('id, date_noi').eq('rand_id', id7).eq('tabel', 'inscrieri_competitie');
      marker7 = (a.data ?? []).filter((x: any) => x.date_noi?.exceptie_fram === true || x.date_noi?.exceptie_fram === 'true').length;
    }
    record('7 super admin inscrie fara FRAM; audit_log are randul cu marker exceptie_fram', reusit(r) && marker7 >= 1, `${det(r)} marker=${marker7}`);

    // 8: reactivare refuzata (D-04)
    const id8 = await mkIns(Clipsa.id, l1, s3, { status: 'retras' });
    r = await adm.from('inscrieri_competitie').update({ status: 'inscris' }).eq('id', id8).select('id');
    const st8 = (await admin.from('inscrieri_competitie').select('status').eq('id', id8).single()).data?.status;
    record('8 ADMIN_CLUB nu poate reactiva (retras -> inscris) fara FRAM', respins(r) && st8 === 'retras', `${det(r)} status=${st8}`);

    // 9: membru de echipa (D-04, D-05)
    const echL = await mkEchipa(Clipsa.id, lT, 'echL');
    r = await adm.from('echipa_sportivi').insert({ echipa_id: echL, sportiv_id: s3, rol: 'titular' }).select('id');
    const rAdm9 = r;
    r = await sup.from('echipa_sportivi').insert({ echipa_id: echL, sportiv_id: s3, rol: 'titular' }).select('id');
    const id9 = r.data?.[0]?.id as string | undefined;
    let marker9 = 0;
    if (id9) {
      const a: any = await admin.from('audit_log').select('id, date_noi').eq('rand_id', id9).eq('tabel', 'echipa_sportivi');
      marker9 = (a.data ?? []).filter((x: any) => x.date_noi?.exceptie_fram === true || x.date_noi?.exceptie_fram === 'true').length;
    }
    record('9 membru fara FRAM: ADMIN_CLUB refuzat, super admin permis + audit marker exceptie_fram',
      respins(rAdm9) && reusit(r) && marker9 >= 1, `adm:${det(rAdm9)} sup:${det(r)} marker=${marker9}`);

    // 10: regula oprita -> comportament neschimbat
    r = await adm.from('inscrieri_competitie').insert({ competitie_id: Coff.id, categorie_id: f1, club_id: CLUB, sportiv_id: s3 }).select('id');
    record('10 regula oprita: ADMIN_CLUB inscrie normal (fara FRAM Y+1)', reusit(r), det(r));

    // 11: compatibilitate la schimbarea categoriei (D-08)
    let ok11 = false;
    let d11 = 'fara rand s1';
    if (idCok) {
      const a: any = await adm.from('inscrieri_competitie').update({ categorie_id: ok2 }).eq('id', idCok).select('id');
      const b: any = await adm.from('inscrieri_competitie').update({ categorie_id: okT }).eq('id', idCok).select('id');
      const c: any = await sup.from('inscrieri_competitie').update({ categorie_id: okT }).eq('id', idCok).select('id');
      const d: any = await adm.from('inscrieri_competitie').update({ categorie_id: l1 }).eq('id', idCok).select('id');
      const cat = (await admin.from('inscrieri_competitie').select('categorie_id').eq('id', idCok).single()).data?.categorie_id;
      ok11 = reusit(a) && !!b.error && msg(b).includes('compatibil') && !!c.error && msg(c).includes('compatibil') && respins(d) && cat === ok2;
      d11 = `ok1->ok2:${det(a)} ok2->okT adm:${b.error?.code} sup:${c.error?.code} ok2->l1:${det(d)} final=${cat === ok2 ? 'ok2' : 'ALTA'}`;
    }
    record('11 mutare compatibila permisa; spre echipa refuzata (adm + sup, mesaj compatibil); spre alta competitie refuzata', ok11, d11);

    // 12: poarta de inchidere (D-07)
    const id12 = await mkIns(Cinchis.id, i1, s1);
    await admin.from('competitii').update({ status: 'inscrieri_inchise' }).eq('id', Cinchis.id);
    const a12: any = await adm.from('inscrieri_competitie').update({ inlantuire_id_2: null }).eq('id', id12).select('id');
    const b12: any = await sup.from('inscrieri_competitie').update({ inlantuire_id_2: null }).eq('id', id12).select('id');
    record('12 dupa inchidere: ADMIN_CLUB 0 randuri, super admin 1 rand (D-07 RLS)',
      respins(a12) && !a12.error?.message?.includes('finalizat') && reusit(b12) && (b12.data?.length ?? 0) === 1, `adm:${det(a12)} sup:${det(b12)}`);

    // 13: audit pe editare (D-10)
    if (idCok) {
      const a: any = await admin.from('audit_log').select('id').eq('rand_id', idCok).eq('tabel', 'inscrieri_competitie').eq('operatie', 'UPDATE');
      record('13 audit_log are randul UPDATE pentru mutarea categoriei (D-10)', (a.data?.length ?? 0) >= 1, `randuri=${a.data?.length ?? a.error?.message}`);
    } else record('13 audit pe editare', false, 'fara rand s1 din check 5');

    // 14: sursa UI vize_club_competitie (42-08)
    r = await adm.rpc('vize_club_competitie', { p_competitie: Cok.id, p_club: CLUB }).eq('tip', 'FRAM').eq('an', Y);
    const v14: any[] = r.data ?? [];
    record(`14 vize_club_competitie FRAM ${Y}: contine s1 achitat, doar tip FRAM si an ${Y}`,
      !r.error && v14.some((x) => x.sportiv_id === s1 && x.achitata === true) && v14.every((x) => x.tip === 'FRAM' && x.an === Y),
      r.error ? `code=${r.error.code}` : `randuri=${v14.length}`);

    // 16: inghetare dupa finalizata (D-07 limita superioara)
    const Cfin = await mkComp('FINAL', 'inscrieri_deschise', D_Y);
    const n1 = await mkCat(Cfin.id, 'n1', 1);
    const n2 = await mkCat(Cfin.id, 'n2', 2);
    const nT = await mkCat(Cfin.id, 'nT', 3, 'echipa');
    const nT2 = await mkCat(Cfin.id, 'nT2', 4, 'echipa');
    const id16 = await mkIns(Cfin.id, n1, s1);
    const echF = await mkEchipa(Cfin.id, nT, 'echF');
    const { data: mem, error: me } = await admin.from('echipa_sportivi').insert({ echipa_id: echF, sportiv_id: s2, rol: 'titular' }).select('id').single();
    if (me || !mem) throw new Error(`membru Cfin: ${me?.message}`);
    await admin.from('competitii').update({ status: 'finalizata' }).eq('id', Cfin.id);
    const fin = (x: any) => !!x.error && msg(x).includes('finalizat');
    const t: boolean[] = [];
    t.push(fin(await sup.from('inscrieri_competitie').insert({ competitie_id: Cfin.id, categorie_id: n1, club_id: CLUB, sportiv_id: s3 }).select('id')));
    t.push(fin(await sup.from('inscrieri_competitie').update({ categorie_id: n2 }).eq('id', id16).select('id')));
    t.push(fin(await sup.from('inscrieri_competitie').update({ inlantuire_id_2: null }).eq('id', id16).select('id')));
    t.push(fin(await sup.from('inscrieri_competitie').delete().eq('id', id16).select('id')));
    t.push(fin(await sup.from('echipa_sportivi').insert({ echipa_id: echF, sportiv_id: s3, rol: 'titular' }).select('id')));
    t.push(fin(await sup.from('echipa_sportivi').update({ rol: 'rezerva' }).eq('id', mem.id).select('id')));
    t.push(fin(await sup.from('echipa_sportivi').delete().eq('id', mem.id).select('id')));
    t.push(fin(await sup.from('echipe_competitie').update({ categorie_id: nT2 }).eq('id', echF).select('id')));
    const intact =
      (await count('inscrieri_competitie', 'competitie_id', Cfin.id)) === 1 &&
      (await admin.from('inscrieri_competitie').select('categorie_id').eq('id', id16).single()).data?.categorie_id === n1 &&
      (await admin.from('echipa_sportivi').select('rol').eq('id', mem.id).single()).data?.rol === 'titular' &&
      (await count('echipa_sportivi', 'echipa_id', echF)) === 1 &&
      (await admin.from('echipe_competitie').select('categorie_id').eq('id', echF).single()).data?.categorie_id === nT;
    record('16 finalizata: super admin refuzat la insert/update/delete pe inscriere, membru, echipa (8 operatii), nimic schimbat',
      t.every(Boolean) && intact, `refuzuri=${t.map((x) => (x ? 'ok' : 'NU')).join('/')} intact=${intact}`);

    r = await sup.from('inscrieri_competitie').update({ taxa_achitata: true }).eq('id', id16).select('id');
    record('16b finalizata: marcarea taxa_achitata ramane permisa (1 rand)', reusit(r) && (r.data?.length ?? 0) === 1, det(r));

    // 16c: repoint sportiv_id permis pe finalizata (merge_sportivi), apoi restaurat
    r = await sup.from('inscrieri_competitie').update({ sportiv_id: s3 }).eq('id', id16).select('id');
    const dupa = (await admin.from('inscrieri_competitie').select('sportiv_id').eq('id', id16).single()).data?.sportiv_id;
    const rBack: any = await sup.from('inscrieri_competitie').update({ sportiv_id: s1 }).eq('id', id16).select('id');
    const restaurat = (await admin.from('inscrieri_competitie').select('sportiv_id').eq('id', id16).single()).data?.sportiv_id === s1;
    record('16c finalizata: repoint sportiv_id (s1->s3) permis, apoi restaurat (UPDATE OF sportiv_id neinghetat)',
      reusit(r) && dupa === s3 && reusit(rBack) && restaurat, `repoint:${det(r)} restaurare:${det(rBack)}`);

    // 17: stergere competitie finalizata (cascada trece)
    r = await sup.from('competitii').delete().eq('id', Cfin.id).select('id');
    const ramase = (await count('inscrieri_competitie', 'competitie_id', Cfin.id)) + (await count('echipe_competitie', 'competitie_id', Cfin.id))
      + (await count('echipa_sportivi', 'echipa_id', echF)) + (await count('categorii_competitie', 'competitie_id', Cfin.id));
    record('17 super admin sterge competitia finalizata; inscrieri/echipe/membri/categorii dispar (cascada)', reusit(r) && ramase === 0, `${det(r)} ramase=${ramase}`);

    // 18: sursa D-09
    r = await sup.from('audit_log').select('rand_id, tabel, created_at, cat_veche:date_vechi->>categorie_id, cat_noua:date_noi->>categorie_id')
      .eq('competitie_id', Cok.id).in('tabel', ['inscrieri_competitie', 'echipe_competitie']).eq('operatie', 'UPDATE');
    const a18: any[] = r.data ?? [];
    record('18 sursa D-09: super admin vede in audit_log mutarea s1 ok1 -> ok2 (cat_veche/cat_noua)',
      !r.error && a18.some((x) => x.rand_id === idCok && x.cat_veche === ok1 && x.cat_noua === ok2),
      r.error ? `code=${r.error.code}` : `randuri=${a18.length}`);

    // audit_log: se numara inainte de stergerea utilizatorilor
    const aud = await admin.from('audit_log').select('id', { count: 'exact', head: true }).in('user_id', userIds).gte('created_at', startTs);
    auditCount = aud.error ? `n/a (${aud.error.message})` : (aud.count ?? 0);
  } catch (e) {
    if (e instanceof Precond) {
      console.error(`PRECONDITIE NESIGURA: ${e.message}`);
      await cleanup(competitii, userIds);
      process.exit(2);
    }
    record('executie fara exceptii', false, e instanceof Error ? e.message : String(e));
  }

  // ── cleanup + check 15 + reziduuri ────────────────────────────────────────
  await cleanup(competitii, userIds);
  let platiNoi = 0;
  let vizeNoi = 0;
  if (sportivi.length) {
    const p = await admin.from('plati').select('id', { count: 'exact', head: true }).in('sportiv_id', sportivi).gte('created_at', startTs);
    const v = await admin.from('vize_sportivi').select('id', { count: 'exact', head: true }).in('sportiv_id', sportivi).gte('created_at', startTs);
    platiNoi = p.count ?? 0;
    vizeNoi = v.count ?? 0;
  }
  record('15 fara efecte de taxa anuala: plati noi=0, vize noi=0', platiNoi === 0 && vizeNoi === 0, `plati=${platiNoi} vize=${vizeNoi}`);
  const { count: rc } = await admin.from('competitii').select('id', { count: 'exact', head: true }).like('denumire', `${PREFIX}%`);
  record('reziduuri: competitii ZZ_TEST_FAZA42_ = 0', (rc ?? 0) === 0, `competitii=${rc}`);
  console.log(`INFO audit_log randuri create de utilizatorii de test (nu se pot sterge): ${auditCount}`);

  const fail = results.filter((x) => !x.passed);
  console.log(`\n${results.length - fail.length}/${results.length} verificari trecute`);
  if (fail.length) {
    console.error('ESUATE:\n' + fail.map((x) => ` - ${x.name}${x.detail ? ` (${x.detail})` : ''}`).join('\n'));
    process.exit(1);
  }
}

async function cleanup(competitii: string[], userIds: string[]) {
  if (competitii.length) await admin.from('competitii').delete().in('id', competitii);
  await admin.from('competitii').delete().like('denumire', `${PREFIX}${'%'}_${RUN_ID}`);
  for (const id of userIds) {
    await admin.from('utilizator_roluri_multicont').delete().eq('user_id', id);
    await admin.auth.admin.deleteUser(id);
  }
}

main();
