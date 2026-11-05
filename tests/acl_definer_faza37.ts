// tests/acl_definer_faza37.ts
//
// Faza 37 (37-01) — plasa de regresie ACL: functiile SECURITY DEFINER din `public` apelabile de
// anon / authenticated trebuie sa fie in allowlist (tests/acl_definer_faza37.allowlist.json).
// Pica daca apare o functie definer noua expusa. Citeste doar catalogul (acl_functii_snapshot, service_role).
// Output: doar semnaturi de functii si numaratori (fara date personale).
//
// Rulare:            npx tsx tests/acl_definer_faza37.ts
// Baseline (o data): npx tsx tests/acl_definer_faza37.ts --write-baseline   (NU ruleaza verificarile)

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey) {
  console.error('Lipsesc VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const ALLOWLIST_PATH = join(dirname(fileURLToPath(import.meta.url)), 'acl_definer_faza37.allowlist.json');

type Rand = { semnatura: string; nume: string; definer: boolean; tip_retur: string; anon: boolean; authenticated: boolean; service_role: boolean };
type Allowlist = {
  nota: string;
  exceptii_prefix: { anon: string[]; authenticated: string[] };
  anon: string[];
  authenticated: string[];
  anon_obligatoriu: string[];
};
type Rol = 'anon' | 'authenticated';

const results: { name: string; passed: boolean }[] = [];
const record = (name: string, passed: boolean, detail?: string) => {
  results.push({ name, passed });
  console.log(`${passed ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
};
const info = (name: string, detail: string) => console.log(`INFO — ${name} (${detail})`);

const admin = createClient(url, serviceKey);
const anon = createClient(url, anonKey);

async function snapshot(): Promise<Rand[]> {
  const { data, error } = await admin.rpc('acl_functii_snapshot');
  if (error) throw new Error(`acl_functii_snapshot: ${error.message}`);
  return (data as Rand[]) ?? [];
}

const prefixat = (nume: string, prefixe: string[]) => prefixe.some((p) => nume.startsWith(p));

// Functii definer expuse rolului, care nu sunt nici in allowlist, nici sub un prefix exceptie.
function neincluse(rows: Rand[], al: Allowlist, rol: Rol): string[] {
  const permise = new Set(al[rol]);
  return rows
    .filter((r) => r.definer && r[rol] && !permise.has(r.semnatura) && !prefixat(r.nume, al.exceptii_prefix[rol]))
    .map((r) => r.semnatura);
}

async function scrieBaseline() {
  const rows = await snapshot();
  let existent: Partial<Allowlist> = {};
  try { existent = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8')); } catch { /* prima rulare */ }
  const prefixe = existent.exceptii_prefix ?? { anon: ['scoala_ioncreanga_'], authenticated: ['scoala_ioncreanga_'] };
  const al: Allowlist = {
    nota: existent.nota ?? 'Baseline = starea expusa la momentul 37-01 (inainte de REVOKE). Ratchet: se micsoreaza manual in 37-03/37-05 conform 37-TRIAJ.md. scoala_ioncreanga_* = aplicatie separata, exceptie documentata (decizie 5.11.2026), nu se modifica.',
    exceptii_prefix: prefixe,
    anon: rows.filter((r) => r.definer && r.anon && !prefixat(r.nume, prefixe.anon)).map((r) => r.semnatura),
    authenticated: rows.filter((r) => r.definer && r.authenticated && !prefixat(r.nume, prefixe.authenticated)).map((r) => r.semnatura),
    anon_obligatoriu: existent.anon_obligatoriu ?? [],
  };
  writeFileSync(ALLOWLIST_PATH, JSON.stringify(al, null, 2) + '\n');
  console.log(`Baseline scris: anon=${al.anon.length}, authenticated=${al.authenticated.length}, prefixe exceptie=${prefixe.anon.join(',')}`);
}

async function main() {
  if (process.argv.includes('--write-baseline')) {
    await scrieBaseline();
    return;
  }

  const rows = await snapshot();
  const al: Allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));

  // (1) snapshot nevid si cu semnaturi unice
  record('snapshot nevid (> 100 functii)', rows.length > 100, `n=${rows.length}`);
  record('semnaturi unice in snapshot', new Set(rows.map((r) => r.semnatura)).size === rows.length);
  info('functii definer', `total=${rows.filter((r) => r.definer).length}, anon=${rows.filter((r) => r.definer && r.anon).length}, authenticated=${rows.filter((r) => r.definer && r.authenticated).length}`);

  // (2) verificarea principala, per rol
  for (const rol of ['anon', 'authenticated'] as Rol[]) {
    const noi = neincluse(rows, al, rol);
    record(`${rol}: nicio functie SECURITY DEFINER noua expusa`, noi.length === 0, noi.length ? `noi=${noi.join(' | ')}` : undefined);
    if (noi.length) console.log('  -> adauga in allowlist DOAR dupa triaj, sau fa REVOKE/GRANT explicit (ALTER DEFAULT PRIVILEGES nu mai acorda anon implicit)');
  }

  // (3) functii care trebuie sa ramana apelabile de anon
  const dupaSemn = new Map(rows.map((r) => [r.semnatura, r]));
  const lipsa = al.anon_obligatoriu.filter((s) => !dupaSemn.get(s)?.anon);
  record('anon_obligatoriu inca apelabile de anon', lipsa.length === 0, lipsa.length ? `lipsa=${lipsa.join(' | ')}` : `n=${al.anon_obligatoriu.length}`);

  // (4) intrari invechite: doar informativ (ratchet)
  for (const rol of ['anon', 'authenticated'] as Rol[]) {
    const invechite = al[rol].filter((s) => !(dupaSemn.get(s)?.definer && dupaSemn.get(s)?.[rol]));
    if (invechite.length) info(`${rol}: intrari invechite in allowlist (pot fi scoase)`, invechite.join(' | '));
  }

  // (5) proba functionala: anon nu poate apela functia de snapshot
  const { data: dAnon, error: eAnon } = await anon.rpc('acl_functii_snapshot');
  const respins = !!eAnon && !(Array.isArray(dAnon) && dAnon.length > 0);
  record('anon respins pe acl_functii_snapshot', respins, eAnon ? `cod=${eAnon.code ?? eAnon.message}` : 'a primit date!');

  // (6) self-check de sensibilitate: scoate un nume apelabil din allowlist-ul authenticated; trebuie detectat
  const mutat: Allowlist = { ...al, authenticated: [...al.authenticated] };
  const tinta = mutat.authenticated.find((s) => dupaSemn.get(s)?.definer && dupaSemn.get(s)?.authenticated);
  if (!tinta) {
    record('self-check sensibilitate (exista o tinta in allowlist)', false, 'allowlist authenticated gol sau fara functii apelabile');
  } else {
    mutat.authenticated = mutat.authenticated.filter((s) => s !== tinta);
    const detectate = neincluse(rows, mutat, 'authenticated');
    record('self-check sensibilitate: mutatia e detectata', detectate.length === 1 && detectate[0] === tinta, `tinta=${tinta}`);
  }

  const esuate = results.filter((r) => !r.passed).length;
  console.log(`\n${results.length - esuate}/${results.length} PASS`);
  process.exit(esuate ? 1 : 0);
}

main().catch((e) => {
  console.error('EROARE test:', e.message);
  process.exit(1);
});
