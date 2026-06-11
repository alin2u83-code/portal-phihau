/**
 * Script diagnostic: citește XLS examen Fălticeni + verifică matching sportivi în DB
 * Rulează: node .playwright-mcp/debug-match-sportivi.mjs
 */
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

import { readFileSync as _readEnv } from 'fs';
// Încarcă .env manual (fără dotenv dependency)
try {
    _readEnv('../.env', 'utf8').split('\n').forEach(line => {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    });
} catch {}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const XLS_PATH = process.argv[2] || 'C:\\Users\\lungu\\Downloads\\lista EXAMEN FALTICENI  14.01.2026.xls';

// ─── normalizeStr (identic cu serviciul) ────────────────────────────────────
function normalizeStr(s) {
    return (s || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// ─── Levenshtein similarity (identic cu serviciul) ──────────────────────────
function similarity(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    const la = a.length, lb = b.length;
    const dp = Array.from({ length: la + 1 }, (_, i) =>
        Array.from({ length: lb + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= la; i++)
        for (let j = 1; j <= lb; j++)
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    return 1 - dp[la][lb] / Math.max(la, lb);
}

// ─── matchSportiv (identic cu serviciul) ────────────────────────────────────
function matchSportiv(numeComplet, sportivi) {
    const normInput = normalizeStr(numeComplet);
    let bestScore = 0;
    let bestMatch;
    const candidates = [];

    for (const s of sportivi) {
        const numeDB1 = normalizeStr(`${s.nume} ${s.prenume}`);
        const numeDB2 = normalizeStr(`${s.prenume} ${s.nume}`);
        const score = Math.max(similarity(normInput, numeDB1), similarity(normInput, numeDB2));
        if (score >= 0.7) candidates.push({ sportiv: s, score });
        if (score > bestScore) { bestScore = score; bestMatch = s; }
    }

    candidates.sort((a, b) => b.score - a.score);
    const top = candidates[0];

    if (!top || top.score < 0.7) return { score: bestScore, status: 'nou', bestMatch, alternatives: [] };
    if (top.score >= 0.95) return { sportiv: top.sportiv, score: top.score, status: 'exact', alternatives: [] };
    return {
        sportiv: top.sportiv,
        score: top.score,
        status: 'fuzzy',
        alternatives: candidates.slice(1, 4).map(c => c.sportiv),
    };
}

async function main() {
    console.log('📂 Citesc XLS:', XLS_PATH);
    const buf = readFileSync(XLS_PATH);
    const wb = XLSX.read(buf, { type: 'buffer' });

    console.log('📋 Sheet-uri găsite:', wb.SheetNames.join(', '));

    // Detectare sheet
    const targetSheet = wb.SheetNames.includes('T Ex locale') ? 'T Ex locale' : wb.SheetNames[0];
    console.log('✅ Sheet folosit:', targetSheet);

    const ws = wb.Sheets[targetSheet];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Găsire header
    let headerRow = -1;
    for (let r = 0; r < rows.length; r++) {
        const joined = rows[r].join(' ').toLowerCase();
        if (joined.includes('nr') && (joined.includes('grad') || joined.includes('admis'))) {
            headerRow = r;
            break;
        }
    }

    if (headerRow === -1) {
        console.error('❌ Nu s-a găsit rândul header!');
        console.log('Primele 10 rânduri:');
        rows.slice(0, 10).forEach((r, i) => console.log(`  Row ${i}:`, r));
        return;
    }

    console.log(`\n📍 Header la rândul ${headerRow}:`, rows[headerRow]);

    // Detectare coloane
    const headerCells = rows[headerRow].map(c => normalizeStr(String(c)));
    const colNume = headerCells.findIndex(c => c.includes('num') || c.includes('prenume') || c.includes('sportiv'));
    const colGrad = headerCells.findIndex(c => c.includes('grad'));
    const colRez  = headerCells.findIndex(c => c.includes('admis') || c.includes('respins') || c.includes('rezultat'));
    const iNume    = colNume >= 0 ? colNume : 1;
    const iGrad    = colGrad >= 0 ? colGrad : 3;
    const iRez     = colRez  >= 0 ? colRez  : 4;

    console.log(`   Coloane detectate: Nume=${iNume}, Grad=${iGrad}, Rez=${iRez}`);

    // Extrage toate numele din XLS
    const numeXLS = [];
    for (let r = headerRow + 1; r < rows.length; r++) {
        const row = rows[r];
        const nr = row[0];
        if (!nr || typeof nr !== 'number') continue;
        const numeRaw = String(row[iNume] || '').trim();
        if (!numeRaw) continue;
        const gradNume = String(row[iGrad] || '').trim();
        const rez = String(row[iRez] || '').trim();
        numeXLS.push({ nr, numeRaw, gradNume, rez });
    }

    console.log(`\n📊 Total sportivi în XLS: ${numeXLS.length}`);
    console.log('\nToți sportivii din XLS:');
    numeXLS.forEach(({ nr, numeRaw, gradNume, rez }) => {
        console.log(`  ${nr}. "${numeRaw}" | Grad: ${gradNume} | Rez: ${rez || '(gol)'}`);
    });

    // Fetch sportivi din Supabase
    console.log('\n🔌 Conectez la Supabase...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: sportivi, error } = await supabase
        .from('sportivi')
        .select('id, nume, prenume, club_id, status')
        .eq('status', 'Activ');

    if (error) {
        console.error('❌ Eroare Supabase:', error.message);
        return;
    }

    console.log(`✅ Sportivi activi în DB: ${sportivi.length}`);

    // Fetch cluburi pentru context
    const { data: clubs } = await supabase.from('cluburi').select('id, nume');
    const clubMap = {};
    (clubs || []).forEach(c => clubMap[c.id] = c.nume);

    // Rulează matching
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('REZULTATE MATCHING:');
    console.log('═══════════════════════════════════════════════════════════════\n');

    let countExact = 0, countFuzzy = 0, countNou = 0;
    const problematici = [];

    for (const { nr, numeRaw, gradNume, rez } of numeXLS) {
        const result = matchSportiv(numeRaw, sportivi);
        const icon = result.status === 'exact' ? '✅' : result.status === 'fuzzy' ? '⚠️' : '❌';

        if (result.status === 'exact') {
            countExact++;
            const s = result.sportiv;
            const club = clubMap[s.club_id] || s.club_id;
            console.log(`${icon} ${nr}. "${numeRaw}" → EXACT: ${s.nume} ${s.prenume} (${club}) score=${result.score.toFixed(3)}`);
        } else if (result.status === 'fuzzy') {
            countFuzzy++;
            const s = result.sportiv;
            const club = clubMap[s.club_id] || s.club_id;
            console.log(`${icon} ${nr}. "${numeRaw}" → FUZZY: ${s.nume} ${s.prenume} (${club}) score=${result.score.toFixed(3)}`);
            problematici.push({ nr, numeRaw, result });
        } else {
            countNou++;
            const bestMatch = result.bestMatch;
            const best = bestMatch ? `${bestMatch.nume} ${bestMatch.prenume} (${clubMap[bestMatch.club_id] || '?'}) score=${result.score.toFixed(3)}` : 'niciun candidat';
            console.log(`${icon} ${nr}. "${numeRaw}" → INEXISTENT (cel mai bun: ${best})`);
            console.log(`       Normat input: "${normalizeStr(numeRaw)}"`);
            if (bestMatch) {
                console.log(`       Normat DB: "${normalizeStr(`${bestMatch.nume} ${bestMatch.prenume}`)}" / "${normalizeStr(`${bestMatch.prenume} ${bestMatch.nume}`)}"`);
            }
            problematici.push({ nr, numeRaw, result });
        }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`SUMAR: ✅ Exact=${countExact}  ⚠️ Fuzzy=${countFuzzy}  ❌ Inexistent=${countNou}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (problematici.length > 0) {
        console.log('\n🔍 ANALIZA DETALIATĂ — Sportivi problemati:');
        for (const { nr, numeRaw, result } of problematici) {
            console.log(`\n[${nr}] "${numeRaw}" (normat: "${normalizeStr(numeRaw)}")`);
            if (result.status === 'nou') {
                // Caută manual în DB după primul cuvânt (nume familie)
                const parts = numeRaw.split(' ');
                const numeFamilie = normalizeStr(parts[0]);
                const candidatiManual = sportivi.filter(s =>
                    normalizeStr(s.nume).includes(numeFamilie) ||
                    normalizeStr(s.prenume).includes(numeFamilie) ||
                    numeFamilie.includes(normalizeStr(s.nume).slice(0, 4))
                );
                if (candidatiManual.length > 0) {
                    console.log(`   Candidati manuali (căutare după "${numeFamilie}"):`);
                    candidatiManual.slice(0, 5).forEach(s => {
                        const scoreAB = similarity(normalizeStr(numeRaw), normalizeStr(`${s.nume} ${s.prenume}`));
                        const scoreBA = similarity(normalizeStr(numeRaw), normalizeStr(`${s.prenume} ${s.nume}`));
                        console.log(`     - ${s.nume} ${s.prenume} (club: ${clubMap[s.club_id] || '?'}) scores: AB=${scoreAB.toFixed(3)} BA=${scoreBA.toFixed(3)}`);
                    });
                } else {
                    console.log(`   Niciun candidat manual pentru "${numeFamilie}" — sportivul chiar nu există în DB`);
                }
            }
        }
    }
}

main().catch(console.error);
