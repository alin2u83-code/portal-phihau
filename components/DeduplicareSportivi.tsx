import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useData } from '../contexts/DataContext';
import { useError } from './ErrorProvider';
import { Card, Button, Modal } from './ui';
import {
    ArrowLeftIcon,
    TrashIcon,
    CheckIcon,
    SearchIcon,
    ExclamationTriangleIcon,
    UserCheckIcon,
    UserXIcon,
    XIcon,
    CheckCircleIcon,
    TransferIcon,
} from './icons';

// ─── Tipuri ───────────────────────────────────────────────────────────────────

interface SportivCard {
    id: string;
    nume: string;
    prenume: string;
    data_nasterii: string | null;
    email: string | null;
    cnp: string | null;
    club_id: string | null;
    grad_actual_id: string | null;
    data_inscrierii: string;
    status: 'Activ' | 'Inactiv';
    user_id: string | null;
}

interface PereacheDuplicat {
    id: string;                   // cheie UI unică
    sportiv_a: SportivCard;
    sportiv_b: SportivCard;
    similarity_score: number;     // 0.0 – 1.0
    motiv: string;
    sursa: 'rpc' | 'local';       // de unde a venit potrivirea
}

// ─── Helpers client-side (fallback fără pg_trgm) ──────────────────────────────

const normalizeazaNume = (s: string): string =>
    s.toLowerCase()
     .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
     .replace(/\s+/g, ' ').trim();

/**
 * Distanță Levenshtein simplă pentru typo detection client-side.
 * Folosit ca fallback dacă RPC-ul pg_trgm nu e disponibil.
 */
const levenshtein = (a: string, b: string): number => {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
        Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    return dp[m][n];
};

const suntSimilare = (a: SportivCard, b: SportivCard): { similar: boolean; score: number; motiv: string } => {
    const na = normalizeazaNume(`${a.prenume} ${a.nume}`);
    const nb = normalizeazaNume(`${b.prenume} ${b.nume}`);
    const naInv = normalizeazaNume(`${a.nume} ${a.prenume}`);

    // CNP identic — certitudine maximă
    if (a.cnp && b.cnp && a.cnp === b.cnp)
        return { similar: true, score: 1.0, motiv: 'CNP identic' };

    // Exact match (normalizat)
    if (na === nb) {
        if (a.data_nasterii && b.data_nasterii && a.data_nasterii === b.data_nasterii)
            return { similar: true, score: 0.98, motiv: 'Nume identic + dată naștere identică' };
        if (!a.data_nasterii || !b.data_nasterii)
            return { similar: true, score: 0.95, motiv: 'Nume identic (dată naștere lipsă)' };
        return { similar: true, score: 0.94, motiv: 'Nume identic, date naștere diferite' };
    }

    // Ordine inversată
    if (naInv === nb)
        return { similar: true, score: 0.90, motiv: 'Posibil prenume/nume inversate' };

    // Typo: distanță Levenshtein ≤ 2 pe numele complet
    const dist = levenshtein(na, nb);
    const maxLen = Math.max(na.length, nb.length);
    if (dist <= 2 && maxLen >= 5) {
        const score = parseFloat((1 - dist / maxLen).toFixed(3));
        return { similar: true, score, motiv: `Nume similare (${dist} caracter${dist > 1 ? 'e' : ''} diferit${dist > 1 ? 'e' : ''})` };
    }

    return { similar: false, score: 0, motiv: '' };
};

/**
 * Detectare locală duplicate — fallback când RPC-ul pg_trgm nu e disponibil.
 * Complexitate O(n²), acceptabilă pentru <2000 sportivi per club.
 */
const detecteazaLocalDuplicate = (sportivi: SportivCard[]): PereacheDuplicat[] => {
    const perechi: PereacheDuplicat[] = [];
    const procesati = new Set<string>();

    for (let i = 0; i < sportivi.length; i++) {
        for (let j = i + 1; j < sportivi.length; j++) {
            const cheie = `${sportivi[i].id}_${sportivi[j].id}`;
            if (procesati.has(cheie)) continue;

            const { similar, score, motiv } = suntSimilare(sportivi[i], sportivi[j]);
            if (similar) {
                procesati.add(cheie);
                perechi.push({
                    id: cheie,
                    sportiv_a: sportivi[i],
                    sportiv_b: sportivi[j],
                    similarity_score: score,
                    motiv,
                    sursa: 'local',
                });
            }
        }
    }

    return perechi.sort((a, b) => b.similarity_score - a.similarity_score);
};

// ─── Sub-componentă: Card sportiv individual ─────────────────────────────────

const SportivInfoCard: React.FC<{
    sportiv: SportivCard;
    esteSelectat: boolean;
    eticheta: 'PRIMAR' | 'SECUNDAR';
    gradeMap: Record<string, string>;
    onClick: () => void;
    disabled?: boolean;
}> = ({ sportiv, esteSelectat, eticheta, gradeMap, onClick, disabled }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={esteSelectat}
        className={`
            w-full text-left p-3 sm:p-4 rounded-xl border-2 transition-all
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500
            ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}
            ${esteSelectat
                ? 'border-emerald-500/70 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                : 'border-slate-600/60 bg-slate-800/50 hover:border-slate-500'
            }
        `}
    >
        {/* Antet card */}
        <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base font-bold text-white leading-tight">
                    {sportiv.prenume} {sportiv.nume}
                </p>
                {sportiv.data_nasterii ? (
                    <p className="text-xs text-slate-400 mt-0.5">
                        Nascut: {sportiv.data_nasterii}
                    </p>
                ) : (
                    <p className="text-xs text-slate-500 italic mt-0.5">fara data nastere</p>
                )}
            </div>
            <span className={`
                shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg border leading-none
                ${esteSelectat
                    ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50'
                    : 'bg-slate-700/60 text-slate-400 border-slate-600/50'
                }
            `}>
                {eticheta}
            </span>
        </div>

        {/* Detalii */}
        <div className="space-y-1">
            {sportiv.email && (
                <p className="text-xs text-slate-400 truncate">{sportiv.email}</p>
            )}
            {sportiv.cnp && (
                <p className="text-xs text-slate-500">CNP: {sportiv.cnp}</p>
            )}
            {sportiv.grad_actual_id && (
                <p className="text-xs text-sky-400 font-medium">
                    Grad: {gradeMap[sportiv.grad_actual_id] || '—'}
                </p>
            )}
            <div className="flex items-center justify-between mt-1.5">
                <p className="text-[10px] text-slate-600">
                    Inscris: {sportiv.data_inscrierii}
                </p>
                <div className="flex items-center gap-1.5">
                    {sportiv.user_id && (
                        <span className="text-[10px] text-emerald-400 font-medium">cont activ</span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium
                        ${sportiv.status === 'Activ'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-700 text-slate-500'
                        }
                    `}>
                        {sportiv.status}
                    </span>
                </div>
            </div>
        </div>
    </button>
);

// ─── Sub-componentă: Card pereche duplicat ────────────────────────────────────

const CardPereache: React.FC<{
    pereche: PereacheDuplicat;
    ignorata: boolean;
    fuzionata: boolean;
    inProgres: boolean;
    primarId: string;
    gradeMap: Record<string, string>;
    onSelectPrimar: (id: string) => void;
    onIgnora: () => void;
    onFuzioneaza: () => void;
}> = ({
    pereche, ignorata, fuzionata, inProgres, primarId,
    gradeMap, onSelectPrimar, onIgnora, onFuzioneaza,
}) => {
    const scoreColor =
        pereche.similarity_score >= 0.95 ? 'text-rose-400 bg-rose-500/15 border-rose-500/30' :
        pereche.similarity_score >= 0.85 ? 'text-amber-400 bg-amber-500/15 border-amber-500/30' :
                                           'text-blue-400 bg-blue-500/15 border-blue-500/30';

    if (fuzionata) return null; // ascundem cardurile fuzionate

    return (
        <Card className={`
            p-4 sm:p-5 border transition-all
            ${ignorata
                ? 'opacity-40 border-slate-700/40 hover:opacity-70'
                : 'border-amber-500/20 hover:border-amber-500/30'
            }
        `}>
            {/* Header pereche */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-lg border ${scoreColor}`}>
                        {pereche.motiv}
                    </span>
                    <span className="text-xs text-slate-500">
                        Scor: {(pereche.similarity_score * 100).toFixed(0)}%
                    </span>
                    {pereche.sursa === 'local' && (
                        <span className="text-[10px] text-slate-600 italic">detectat local</span>
                    )}
                    {ignorata && (
                        <span className="text-xs text-slate-500 italic">— ignorat</span>
                    )}
                </div>

                {/* Butoane acțiune */}
                {!ignorata && (
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={onIgnora}
                            title="Nu sunt duplicate — ignoră această pereche"
                            className="
                                text-xs text-slate-400 hover:text-slate-200 transition-colors
                                px-3 py-1.5 rounded-lg border border-slate-600 hover:border-slate-500
                                flex items-center gap-1.5 active:scale-95
                            "
                        >
                            <XIcon className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Nu sunt duplicate</span>
                            <span className="sm:hidden">Ignora</span>
                        </button>
                        <Button
                            size="sm"
                            variant="warning"
                            onClick={onFuzioneaza}
                            isLoading={inProgres}
                            disabled={inProgres}
                        >
                            <TransferIcon className="h-3.5 w-3.5 mr-1.5" />
                            Fuzioneaza
                        </Button>
                    </div>
                )}

                {ignorata && (
                    <button
                        type="button"
                        onClick={onIgnora}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline"
                    >
                        Anuleaza ignorare
                    </button>
                )}
            </div>

            {/* Carduri sportivi — 2 coloane pe desktop, stivuite pe mobil */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SportivInfoCard
                    sportiv={pereche.sportiv_a}
                    esteSelectat={primarId === pereche.sportiv_a.id}
                    eticheta={primarId === pereche.sportiv_a.id ? 'PRIMAR' : 'SECUNDAR'}
                    gradeMap={gradeMap}
                    onClick={() => onSelectPrimar(pereche.sportiv_a.id)}
                    disabled={inProgres}
                />
                <SportivInfoCard
                    sportiv={pereche.sportiv_b}
                    esteSelectat={primarId === pereche.sportiv_b.id}
                    eticheta={primarId === pereche.sportiv_b.id ? 'PRIMAR' : 'SECUNDAR'}
                    gradeMap={gradeMap}
                    onClick={() => onSelectPrimar(pereche.sportiv_b.id)}
                    disabled={inProgres}
                />
            </div>

            {/* Instrucțiune mică */}
            {!ignorata && (
                <p className="text-[11px] text-slate-600 mt-3 italic">
                    Click pe un sportiv pentru a-l marca ca Primar (se pastreaza).
                    Cel secundar va fi dezactivat dupa fuzionare.
                </p>
            )}
        </Card>
    );
};

// ─── Modal confirmare fuzionare ───────────────────────────────────────────────

const ModalConfirmareFuzionare: React.FC<{
    isOpen: boolean;
    pereche: PereacheDuplicat | null;
    primarId: string;
    gradeMap: Record<string, string>;
    onConfirma: () => void;
    onAnuleaza: () => void;
    inProgres: boolean;
}> = ({ isOpen, pereche, primarId, gradeMap, onConfirma, onAnuleaza, inProgres }) => {
    if (!pereche) return null;

    const primar  = pereche.sportiv_a.id === primarId ? pereche.sportiv_a : pereche.sportiv_b;
    const secundar = pereche.sportiv_a.id === primarId ? pereche.sportiv_b : pereche.sportiv_a;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onAnuleaza}
            title="Confirmare fuzionare conturi"
            persistent={inProgres}
        >
            <div className="space-y-5">
                {/* Avertisment */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-amber-300">Actiune ireversibila</p>
                        <p className="text-xs text-amber-400/80 mt-1">
                            Toate relatiile (plati, examene, prezente, grade etc.) vor fi transferate
                            la contul primar. Contul secundar va fi dezactivat.
                        </p>
                    </div>
                </div>

                {/* Contul primar */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <UserCheckIcon className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                            Contul primar (se pastreaza)
                        </span>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                        <p className="text-sm font-bold text-white">{primar.prenume} {primar.nume}</p>
                        <p className="text-xs text-slate-400 mt-1">
                            {primar.data_nasterii || 'fara data nastere'} · {primar.email || 'fara email'}
                        </p>
                        {primar.grad_actual_id && (
                            <p className="text-xs text-sky-400 mt-1">
                                Grad: {gradeMap[primar.grad_actual_id] || '—'}
                            </p>
                        )}
                        {primar.user_id && (
                            <p className="text-xs text-emerald-400 mt-1">Are cont de autentificare activ</p>
                        )}
                    </div>
                </div>

                {/* Contul secundar */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <UserXIcon className="h-4 w-4 text-rose-400" />
                        <span className="text-xs font-bold text-rose-400 uppercase tracking-wide">
                            Contul secundar (se dezactiveaza)
                        </span>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                        <p className="text-sm font-bold text-white">{secundar.prenume} {secundar.nume}</p>
                        <p className="text-xs text-slate-400 mt-1">
                            {secundar.data_nasterii || 'fara data nastere'} · {secundar.email || 'fara email'}
                        </p>
                        {secundar.grad_actual_id && (
                            <p className="text-xs text-sky-400 mt-1">
                                Grad: {gradeMap[secundar.grad_actual_id] || '—'}
                            </p>
                        )}
                    </div>
                </div>

                {/* Notita despre datele completate */}
                <div className="p-3 rounded-xl bg-slate-700/40 border border-slate-600/40 text-xs text-slate-400">
                    Datele lipsa din contul primar (CNP, email, data nasterii, telefon, grad etc.)
                    vor fi completate automat din contul secundar.
                </div>

                {/* Butoane */}
                <div className="flex gap-3 pt-1">
                    <button
                        type="button"
                        onClick={onAnuleaza}
                        disabled={inProgres}
                        className="
                            flex-1 py-2.5 px-4 rounded-xl border border-slate-600 text-slate-300
                            hover:border-slate-500 hover:text-white transition-colors text-sm font-medium
                            disabled:opacity-50 disabled:cursor-not-allowed
                        "
                    >
                        Anuleaza
                    </button>
                    <Button
                        variant="warning"
                        onClick={onConfirma}
                        isLoading={inProgres}
                        disabled={inProgres}
                        className="flex-1"
                    >
                        <TransferIcon className="h-4 w-4 mr-2" />
                        Confirma fuzionarea
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

// ─── Componenta principala ────────────────────────────────────────────────────

export const DeduplicareSportivi: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { setSportivi } = useData();
    const { showError, showSuccess } = useError();

    // ─ State ──────────────────────────────────────────────────────────────────
    const [perechi, setPerechi] = useState<PereacheDuplicat[]>([]);
    const [gradeMap, setGradeMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [modRPC, setModRPC] = useState(true); // false = fallback local

    // Per pereche: ID-ul sportivului selectat ca primar
    const [primarMap, setPrimarMap] = useState<Record<string, string>>({});
    // Perechi ignorate ("nu sunt duplicate")
    const [ignorate, setIgnorate] = useState<Set<string>>(new Set());
    // Perechi fuzionate cu succes
    const [fuzionate, setFuzionate] = useState<Set<string>>(new Set());
    // Perechi în curs de procesare
    const [inProgres, setInProgres] = useState<Set<string>>(new Set());

    // Modal confirmare
    const [modalPereche, setModalPereche] = useState<PereacheDuplicat | null>(null);
    const [modalInProgres, setModalInProgres] = useState(false);

    // Filtrare
    const [cautare, setCautare] = useState('');
    const [afiseazaIgnorate, setAfiseazaIgnorate] = useState(false);

    // ─ Fetch ──────────────────────────────────────────────────────────────────

    const incarcaDate = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);
        try {
            // 1. Grade map
            const { data: gr } = await supabase.from('grade').select('id, nume');
            const gm: Record<string, string> = {};
            (gr || []).forEach((g: any) => { gm[g.id] = g.nume; });
            setGradeMap(gm);

            // 2. Încearcă RPC pg_trgm
            const { data: rpcData, error: rpcErr } = await supabase.rpc('find_similar_sportivi');

            if (!rpcErr && rpcData) {
                // RPC disponibil — mapăm răspunsul
                const perecheRPC: PereacheDuplicat[] = (rpcData as any[]).map((r, idx) => ({
                    id: `rpc-${r.sportiv_a_id}-${r.sportiv_b_id}`,
                    sportiv_a: r.sportiv_a_json as SportivCard,
                    sportiv_b: r.sportiv_b_json as SportivCard,
                    similarity_score: parseFloat(r.similarity_score),
                    motiv: r.motiv,
                    sursa: 'rpc' as const,
                }));
                setPerechi(perecheRPC);
                setModRPC(true);
            } else {
                // Fallback: detectare locală cu Levenshtein
                console.warn('[DeduplicareSportivi] RPC find_similar_sportivi indisponibil, folosim detectare locala:', rpcErr?.message);
                setModRPC(false);

                const { data: sp, error: spErr } = await supabase
                    .from('sportivi')
                    .select('id, nume, prenume, data_nasterii, email, cnp, club_id, grad_actual_id, data_inscrierii, status, user_id')
                    .order('nume').order('prenume');
                if (spErr) throw spErr;

                const local = detecteazaLocalDuplicate((sp || []) as SportivCard[]);
                setPerechi(local);
            }
        } catch (err: any) {
            showError('Eroare incarcare', err.message);
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => { incarcaDate(); }, [incarcaDate]);

    // ─ Logica selecție primar ─────────────────────────────────────────────────

    /**
     * Implicit: sportivul cu cont activ (user_id) sau cel mai vechi (data_inscrierii min).
     */
    const getPrimarDefault = (p: PereacheDuplicat): string => {
        if (p.sportiv_a.user_id && !p.sportiv_b.user_id) return p.sportiv_a.id;
        if (p.sportiv_b.user_id && !p.sportiv_a.user_id) return p.sportiv_b.id;
        // Ambii sau niciunul nu au cont — cel mai vechi
        return p.sportiv_a.data_inscrierii <= p.sportiv_b.data_inscrierii
            ? p.sportiv_a.id
            : p.sportiv_b.id;
    };

    const getPrimar = (p: PereacheDuplicat): string =>
        primarMap[p.id] ?? getPrimarDefault(p);

    const selecteazaPrimar = (perecheId: string, sportvId: string) => {
        setPrimarMap(prev => ({ ...prev, [perecheId]: sportvId }));
    };

    // ─ Ignorare ───────────────────────────────────────────────────────────────

    const toggleIgnora = (perecheId: string) => {
        setIgnorate(prev => {
            const next = new Set(prev);
            if (next.has(perecheId)) next.delete(perecheId);
            else next.add(perecheId);
            return next;
        });
    };

    // ─ Fuzionare ─────────────────────────────────────────────────────────────

    const deschideModalFuzionare = (p: PereacheDuplicat) => {
        setModalPereche(p);
    };

    const inchideModal = () => {
        if (!modalInProgres) setModalPereche(null);
    };

    const executaFuzionare = async () => {
        if (!supabase || !modalPereche) return;

        const primarId  = getPrimar(modalPereche);
        const secundarId = modalPereche.sportiv_a.id === primarId
            ? modalPereche.sportiv_b.id
            : modalPereche.sportiv_a.id;

        setModalInProgres(true);
        setInProgres(prev => new Set(prev).add(modalPereche.id));

        try {
            if (modRPC) {
                // ── Modul RPC: apelăm funcția SQL atomică ───────────────────
                const { data, error } = await supabase.rpc('merge_sportivi', {
                    p_primar_id:   primarId,
                    p_secundar_id: secundarId,
                });
                if (error) throw error;

                const rezultat = data as any;
                if (!rezultat?.success) {
                    throw new Error('Fuzionarea a esuat fara detalii suplimentare.');
                }
            } else {
                // ── Modul local: actualizări directe (același comportament ca versiunea anterioară) ───
                const TABELE_REFERINTA = [
                    'inscrieri_examene',
                    'plati',
                    'istoric_grade',
                    'prezenta_antrenament',
                    'anunturi_prezenta',
                    'vize_medicale',
                    'sportivi_grupe_secundare',
                    'echipa_sportivi',
                    'utilizator_roluri_multicont',
                    'decont_sportivi',
                    'vize_sportivi',
                    'rezultate',
                ];

                const primar   = modalPereche.sportiv_a.id === primarId ? modalPereche.sportiv_a : modalPereche.sportiv_b;
                const secundar = modalPereche.sportiv_a.id === primarId ? modalPereche.sportiv_b : modalPereche.sportiv_a;

                for (const tabel of TABELE_REFERINTA) {
                    const { error } = await supabase
                        .from(tabel)
                        .update({ sportiv_id: primarId })
                        .eq('sportiv_id', secundarId);

                    if (error?.code === '23505') {
                        await supabase.from(tabel).delete().eq('sportiv_id', secundarId);
                    }
                }

                // Completăm câmpurile lipsă la primar
                const completari: Record<string, any> = {};
                if (!primar.cnp && secundar.cnp) completari.cnp = secundar.cnp;
                if (!primar.email && secundar.email) completari.email = secundar.email;
                if (!primar.data_nasterii && secundar.data_nasterii) completari.data_nasterii = secundar.data_nasterii;
                if (!primar.grad_actual_id && secundar.grad_actual_id) completari.grad_actual_id = secundar.grad_actual_id;
                if (Object.keys(completari).length > 0) {
                    await supabase.from('sportivi').update(completari).eq('id', primarId);
                }

                // Dezactivăm contul secundar
                await supabase.from('sportivi')
                    .update({ status: 'Inactiv' })
                    .eq('id', secundarId);
            }

            // ── Actualizăm state-ul global ──────────────────────────────────
            setSportivi(prev => prev.filter(s => s.id !== secundarId));
            setFuzionate(prev => new Set(prev).add(modalPereche.id));
            setModalPereche(null);

            const numePrimar = `${modalPereche.sportiv_a.id === primarId ? modalPereche.sportiv_a.prenume : modalPereche.sportiv_b.prenume} ${modalPereche.sportiv_a.id === primarId ? modalPereche.sportiv_a.nume : modalPereche.sportiv_b.nume}`;
            showSuccess('Fuzionat cu succes', `Contul duplicat a fost dezactivat. Profilul principal: ${numePrimar}.`);
        } catch (err: any) {
            showError('Eroare la fuzionare', err.message ?? String(err));
        } finally {
            setModalInProgres(false);
            setInProgres(prev => { const n = new Set(prev); n.delete(modalPereche?.id ?? ''); return n; });
        }
    };

    // ─ Filtrare / afișare ─────────────────────────────────────────────────────

    const perechiFiltrate = useMemo(() => {
        let lista = perechi.filter(p => !fuzionate.has(p.id));

        if (!afiseazaIgnorate) {
            lista = lista.filter(p => !ignorate.has(p.id));
        }

        if (cautare.trim()) {
            const q = cautare.toLowerCase();
            lista = lista.filter(p =>
                `${p.sportiv_a.prenume} ${p.sportiv_a.nume}`.toLowerCase().includes(q) ||
                `${p.sportiv_b.prenume} ${p.sportiv_b.nume}`.toLowerCase().includes(q)
            );
        }

        return lista;
    }, [perechi, fuzionate, ignorate, afiseazaIgnorate, cautare]);

    const nrIgnorate = useMemo(
        () => perechi.filter(p => ignorate.has(p.id) && !fuzionate.has(p.id)).length,
        [perechi, ignorate, fuzionate]
    );

    const nrRamase = useMemo(
        () => perechi.filter(p => !ignorate.has(p.id) && !fuzionate.has(p.id)).length,
        [perechi, ignorate, fuzionate]
    );

    // ─ Render ─────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <Card className="p-8 sm:p-12 text-center">
                <div className="animate-spin h-9 w-9 border-2 border-sky-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-slate-300 font-medium">Se cauta duplicate...</p>
                <p className="text-slate-500 text-sm mt-1">
                    {modRPC ? 'Analiza fuzzy via baza de date' : 'Analiza locala cu Levenshtein'}
                </p>
            </Card>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in-down">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button variant="secondary" size="sm" onClick={onBack}>
                        <ArrowLeftIcon className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white">
                            Deduplicare Sportivi
                        </h1>
                        <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                            {nrRamase > 0
                                ? `${nrRamase} pereche${nrRamase !== 1 ? 'i' : ''} de potential duplicate`
                                : 'Niciun duplicat detectat'
                            }
                            {nrIgnorate > 0 && (
                                <span className="text-slate-600 ml-2">
                                    ({nrIgnorate} ignorate)
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Indicator mod detectare */}
                <div className={`
                    flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border self-start sm:self-auto
                    ${modRPC
                        ? 'text-sky-400 bg-sky-500/10 border-sky-500/30'
                        : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                    }
                `}>
                    {modRPC
                        ? <><CheckCircleIcon className="h-3.5 w-3.5" /> Detectare fuzzy (pg_trgm)</>
                        : <><ExclamationTriangleIcon className="h-3.5 w-3.5" /> Detectare locala (Levenshtein)</>
                    }
                </div>
            </div>

            {/* ── Bannere stare ── */}
            {!modRPC && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm">
                    <ExclamationTriangleIcon className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <span className="font-semibold text-amber-300">Mod detectare locala</span>
                        <span className="text-amber-400/80 ml-1">
                            — Functia SQL <code className="font-mono text-xs bg-slate-800 px-1 rounded">find_similar_sportivi()</code> nu este disponibila.
                            Activati extensia <strong>pg_trgm</strong> in Supabase si rulati migratia
                            <code className="font-mono text-xs bg-slate-800 px-1 ml-1 rounded">add_deduplicare_sportivi.sql</code>
                            pentru detectare mai precisa (include typo-uri care difera cu 1-2 caractere).
                        </span>
                    </div>
                </div>
            )}

            {/* ── Bara căutare + toggle ignorate ── */}
            {(perechi.length - fuzionate.size) > 0 && (
                <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={cautare}
                            onChange={e => setCautare(e.target.value)}
                            placeholder="Filtreaza dupa nume..."
                            className="
                                w-full bg-slate-800 border border-slate-600 rounded-xl
                                pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500
                                focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500
                            "
                        />
                    </div>
                    {nrIgnorate > 0 && (
                        <button
                            type="button"
                            onClick={() => setAfiseazaIgnorate(v => !v)}
                            className={`
                                shrink-0 text-xs px-3 py-2.5 rounded-xl border transition-colors
                                ${afiseazaIgnorate
                                    ? 'border-slate-500 text-slate-300 bg-slate-700'
                                    : 'border-slate-600 text-slate-500 hover:border-slate-500 hover:text-slate-400'
                                }
                            `}
                        >
                            {afiseazaIgnorate ? 'Ascunde ignorate' : `Arata ignorate (${nrIgnorate})`}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={incarcaDate}
                        title="Reimprospateaza lista"
                        className="shrink-0 text-xs px-3 py-2.5 rounded-xl border border-slate-600 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors"
                    >
                        Reimprospateaza
                    </button>
                </div>
            )}

            {/* ── Lista perechi ── */}
            {perechiFiltrate.length === 0 ? (
                <Card className="p-8 sm:p-12 text-center">
                    <CheckIcon className="h-12 w-12 sm:h-14 sm:w-14 text-emerald-400 mx-auto mb-4" />
                    <p className="text-white font-semibold text-lg">
                        {nrRamase === 0 && nrIgnorate > 0
                            ? 'Toate perechile au fost ignorate'
                            : fuzionate.size > 0 && nrRamase === 0
                            ? 'Toate duplicatele au fost eliminate'
                            : 'Niciun duplicat detectat'
                        }
                    </p>
                    <p className="text-slate-400 text-sm mt-1">
                        {nrRamase === 0 && nrIgnorate > 0
                            ? `${nrIgnorate} pereche${nrIgnorate !== 1 ? 'i' : ''} marcate ca "nu sunt duplicate".`
                            : 'Baza de date este curata.'
                        }
                    </p>
                    {nrIgnorate > 0 && !afiseazaIgnorate && (
                        <button
                            type="button"
                            onClick={() => setAfiseazaIgnorate(true)}
                            className="mt-3 text-sm text-sky-400 hover:text-sky-300 underline"
                        >
                            Afiseaza perechile ignorate
                        </button>
                    )}
                </Card>
            ) : (
                <div className="space-y-3 sm:space-y-4">
                    {perechiFiltrate.map(p => (
                        <CardPereache
                            key={p.id}
                            pereche={p}
                            ignorata={ignorate.has(p.id)}
                            fuzionata={fuzionate.has(p.id)}
                            inProgres={inProgres.has(p.id)}
                            primarId={getPrimar(p)}
                            gradeMap={gradeMap}
                            onSelectPrimar={id => selecteazaPrimar(p.id, id)}
                            onIgnora={() => toggleIgnora(p.id)}
                            onFuzioneaza={() => deschideModalFuzionare(p)}
                        />
                    ))}
                </div>
            )}

            {/* ── Modal confirmare ── */}
            <ModalConfirmareFuzionare
                isOpen={modalPereche !== null}
                pereche={modalPereche}
                primarId={modalPereche ? getPrimar(modalPereche) : ''}
                gradeMap={gradeMap}
                onConfirma={executaFuzionare}
                onAnuleaza={inchideModal}
                inProgres={modalInProgres}
            />
        </div>
    );
};
