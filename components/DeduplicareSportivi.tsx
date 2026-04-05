import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useData } from '../contexts/DataContext';
import { useError } from './ErrorProvider';
import { Card, Button } from './ui';
import { ArrowLeftIcon, TrashIcon, CheckIcon, SearchIcon } from './icons';

// ─── Tipuri ──────────────────────────────────────────────────────────────────

interface SportivSimple {
    id: string;
    nume: string;
    prenume: string;
    data_nasterii: string | null;
    email: string | null;
    cnp: string | null;
    data_inscrierii: string;
    club_id: string | null;
    grad_actual_id: string | null;
    user_id: string | null;
}

interface GrupaDuplicat {
    id: string;
    sportivi: SportivSimple[];
    motiv: string; // "Nume identic" | "Nume + dată naștere"
}

// Tabele cu referință sportiv_id — în ordinea în care le actualizăm
const TABELE_REFERINTA = [
    'inscrieri_examene',
    'plati',
    'istoric_grade',
    'prezenta_antrenament',
    'anunturi_prezenta',
    'vize_medicale',
    'echipa_sportivi',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const normalizeazaNume = (s: string) =>
    s.toLowerCase()
     .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
     .replace(/\s+/g, ' ').trim();

const areNumeSimilare = (a: SportivSimple, b: SportivSimple): boolean => {
    const na = normalizeazaNume(`${a.nume} ${a.prenume}`);
    const nb = normalizeazaNume(`${b.nume} ${b.prenume}`);
    if (na === nb) return true;
    // Permite ordine inversată (prenume/nume schimbate)
    const naInv = normalizeazaNume(`${a.prenume} ${a.nume}`);
    return naInv === nb;
};

const detecteazaDuplicate = (sportivi: SportivSimple[]): GrupaDuplicat[] => {
    const grupe: GrupaDuplicat[] = [];
    const procesati = new Set<string>();

    for (let i = 0; i < sportivi.length; i++) {
        if (procesati.has(sportivi[i].id)) continue;
        const grup: SportivSimple[] = [sportivi[i]];
        let motiv = '';

        for (let j = i + 1; j < sportivi.length; j++) {
            if (procesati.has(sportivi[j].id)) continue;
            const a = sportivi[i];
            const b = sportivi[j];
            const numeSimilare = areNumeSimilare(a, b);
            const aceeasiData = a.data_nasterii && b.data_nasterii && a.data_nasterii === b.data_nasterii;
            const acelaCNP = a.cnp && b.cnp && a.cnp === b.cnp;

            if (acelaCNP) {
                grup.push(b);
                motiv = 'CNP identic';
                procesati.add(b.id);
            } else if (numeSimilare && aceeasiData) {
                grup.push(b);
                motiv = 'Nume + dată naștere identice';
                procesati.add(b.id);
            } else if (numeSimilare && !a.data_nasterii && !b.data_nasterii) {
                grup.push(b);
                motiv = 'Nume identic (fără dată naștere)';
                procesati.add(b.id);
            }
        }

        if (grup.length > 1) {
            procesati.add(sportivi[i].id);
            grupe.push({
                id: `grup-${i}`,
                sportivi: grup,
                motiv,
            });
        }
    }

    return grupe;
};

// ─── Componentă principală ───────────────────────────────────────────────────

export const DeduplicareSportivi: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { setSportivi } = useData();
    const { showError, showSuccess } = useError();
    const [toateSportiviClub, setToateSportiviClub] = useState<SportivSimple[]>([]);
    const [loading, setLoading] = useState(true);
    const [grupeSelectate, setGrupeSelectate] = useState<Record<string, string>>({}); // grupId → id sportiv de păstrat
    const [inProgres, setInProgres] = useState<Set<string>>(new Set());
    const [fuzionatGrupe, setFuzionatGrupe] = useState<Set<string>>(new Set());
    const [cautare, setCautare] = useState('');
    const [gradeMap, setGradeMap] = useState<Record<string, string>>({});

    useEffect(() => {
        incarcaDate();
    }, []);

    const incarcaDate = async () => {
        if (!supabase) return;
        setLoading(true);
        try {
            // Luăm sportivii din clubul curent (via RLS)
            const { data: sp, error: spErr } = await supabase
                .from('sportivi')
                .select('id, nume, prenume, data_nasterii, email, cnp, data_inscrierii, club_id, grad_actual_id, user_id')
                .order('nume').order('prenume');
            if (spErr) throw spErr;

            const { data: gr } = await supabase.from('grade').select('id, nume');
            const gm: Record<string, string> = {};
            (gr || []).forEach((g: any) => { gm[g.id] = g.nume; });
            setGradeMap(gm);
            setToateSportiviClub((sp || []) as SportivSimple[]);
        } catch (err: any) {
            showError('Eroare', err.message);
        } finally {
            setLoading(false);
        }
    };

    const grupe = useMemo(() => {
        const toate = detecteazaDuplicate(toateSportiviClub);
        if (!cautare) return toate;
        const q = cautare.toLowerCase();
        return toate.filter(g =>
            g.sportivi.some(s =>
                `${s.nume} ${s.prenume}`.toLowerCase().includes(q)
            )
        );
    }, [toateSportiviClub, cautare]);

    // Sportivul "de păstrat" pentru un grup — default: cel cu user_id sau cel mai vechi
    const getDefault = (g: GrupaDuplicat) => {
        const cuUser = g.sportivi.find(s => s.user_id);
        if (cuUser) return cuUser.id;
        // Cel mai vechi (data_inscrierii minimă)
        return g.sportivi.reduce((min, s) =>
            s.data_inscrierii < min.data_inscrierii ? s : min
        ).id;
    };

    const getPastrat = (g: GrupaDuplicat) => grupeSelectate[g.id] || getDefault(g);

    const selecteaza = (grupId: string, sportvId: string) => {
        setGrupeSelectate(prev => ({ ...prev, [grupId]: sportvId }));
    };

    const fuzioneaza = async (g: GrupaDuplicat) => {
        if (!supabase) return;
        const pastratId = getPastrat(g);
        const deSters = g.sportivi.filter(s => s.id !== pastratId);

        setInProgres(prev => new Set(prev).add(g.id));
        try {
            for (const duplicat of deSters) {
                // 1. Mută referințele din fiecare tabel
                for (const tabel of TABELE_REFERINTA) {
                    const { error } = await supabase
                        .from(tabel)
                        .update({ sportiv_id: pastratId })
                        .eq('sportiv_id', duplicat.id);

                    if (error) {
                        // Conflict de unicitate — înregistrarea duplicat există deja la sportivul păstrat → ștergem duplicatul
                        if (error.code === '23505') {
                            await supabase
                                .from(tabel)
                                .delete()
                                .eq('sportiv_id', duplicat.id);
                        }
                        // Alte erori — ignorăm și continuăm (tabelul poate să nu aibă coloana)
                    }
                }

                // 2. Completăm câmpurile lipsă pe sportivul păstrat
                const pastrat = g.sportivi.find(s => s.id === pastratId)!;
                const completari: Record<string, any> = {};
                if (!pastrat.cnp && duplicat.cnp) completari.cnp = duplicat.cnp;
                if (!pastrat.email && duplicat.email) completari.email = duplicat.email;
                if (!pastrat.data_nasterii && duplicat.data_nasterii) completari.data_nasterii = duplicat.data_nasterii;
                if (!pastrat.grad_actual_id && duplicat.grad_actual_id) completari.grad_actual_id = duplicat.grad_actual_id;
                if (Object.keys(completari).length > 0) {
                    await supabase.from('sportivi').update(completari).eq('id', pastratId);
                }

                // 3. Șterge duplicatul
                const { error: delErr } = await supabase.from('sportivi').delete().eq('id', duplicat.id);
                if (delErr) throw new Error(`Nu s-a putut șterge duplicatul ${duplicat.prenume} ${duplicat.nume}: ${delErr.message}`);
            }

            // Actualizăm state-ul global
            const idsSterse = new Set(deSters.map(s => s.id));
            setSportivi(prev => prev.filter(s => !idsSterse.has(s.id)));
            setToateSportiviClub(prev => prev.filter(s => !idsSterse.has(s.id)));
            setFuzionatGrupe(prev => new Set(prev).add(g.id));
            showSuccess('Fuzionat', `${deSters.length} duplicat(e) eliminate pentru ${g.sportivi[0].prenume} ${g.sportivi[0].nume}.`);
        } catch (err: any) {
            showError('Eroare la fuzionare', err.message);
        } finally {
            setInProgres(prev => { const n = new Set(prev); n.delete(g.id); return n; });
        }
    };

    const fuzioneazaTot = async () => {
        const grupeRamase = grupe.filter(g => !fuzionatGrupe.has(g.id));
        for (const g of grupeRamase) {
            await fuzioneaza(g);
        }
    };

    if (loading) {
        return (
            <Card className="p-8 text-center">
                <div className="animate-spin h-8 w-8 border-2 border-sky-500 border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-slate-400">Se caută duplicate...</p>
            </Card>
        );
    }

    const grupeRamase = grupe.filter(g => !fuzionatGrupe.has(g.id));

    return (
        <div className="space-y-4 animate-fade-in-down">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={onBack}>
                        <ArrowLeftIcon className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Deduplicare Sportivi</h1>
                        <p className="text-slate-400 text-sm">
                            {grupeRamase.length > 0
                                ? `${grupeRamase.length} grup(uri) de duplicate detectate`
                                : 'Nicio duplicat detectat'}
                        </p>
                    </div>
                </div>
                {grupeRamase.length > 1 && (
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={fuzioneazaTot}
                        disabled={inProgres.size > 0}
                    >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        Fuzionează toate ({grupeRamase.length})
                    </Button>
                )}
            </div>

            {/* Căutare */}
            {grupe.length > 3 && (
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        value={cautare}
                        onChange={e => setCautare(e.target.value)}
                        placeholder="Filtrează după nume..."
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                </div>
            )}

            {grupeRamase.length === 0 ? (
                <Card className="p-8 text-center">
                    <CheckIcon className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                    <p className="text-white font-semibold text-lg">Niciun duplicat detectat</p>
                    <p className="text-slate-400 text-sm mt-1">Baza de date este curată.</p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {grupeRamase.map(g => {
                        const pastratId = getPastrat(g);
                        const eInProgres = inProgres.has(g.id);

                        return (
                            <Card key={g.id} className="p-4 border border-amber-500/20">
                                {/* Titlu grup */}
                                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                    <div>
                                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                            {g.motiv}
                                        </span>
                                        <span className="text-slate-400 text-xs ml-2">{g.sportivi.length} înregistrări</span>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="danger"
                                        onClick={() => fuzioneaza(g)}
                                        isLoading={eInProgres}
                                        disabled={eInProgres}
                                    >
                                        <TrashIcon className="h-3.5 w-3.5 mr-1" />
                                        Fuzionează
                                    </Button>
                                </div>

                                {/* Sportivi în grup */}
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {g.sportivi.map(s => {
                                        const estePastrat = s.id === pastratId;
                                        return (
                                            <button
                                                key={s.id}
                                                onClick={() => selecteaza(g.id, s.id)}
                                                className={`text-left p-3 rounded-lg border transition-all ${
                                                    estePastrat
                                                        ? 'border-emerald-500/60 bg-emerald-500/10 ring-1 ring-emerald-500/40'
                                                        : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-white truncate">
                                                            {s.prenume} {s.nume}
                                                        </p>
                                                        <p className="text-xs text-slate-400 mt-0.5">
                                                            {s.data_nasterii || <span className="italic text-slate-500">fără dată naștere</span>}
                                                        </p>
                                                        {s.email && (
                                                            <p className="text-xs text-slate-500 truncate">{s.email}</p>
                                                        )}
                                                        {s.cnp && (
                                                            <p className="text-xs text-slate-500">CNP: {s.cnp}</p>
                                                        )}
                                                        {s.grad_actual_id && (
                                                            <p className="text-xs text-sky-400 mt-1">
                                                                {gradeMap[s.grad_actual_id] || 'grad necunoscut'}
                                                            </p>
                                                        )}
                                                        <p className="text-[10px] text-slate-600 mt-1">
                                                            Înscris: {s.data_inscrierii}
                                                        </p>
                                                    </div>
                                                    <div className="shrink-0">
                                                        {estePastrat ? (
                                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-500/50">
                                                                DE PĂSTRAT
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                                                DUPLICAT
                                                            </span>
                                                        )}
                                                        {s.user_id && (
                                                            <div className="mt-1 text-[10px] text-emerald-400 text-right">cont activ</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <p className="text-[11px] text-slate-500 mt-2 italic">
                                    Click pe un sportiv pentru a-l marca ca „de păstrat". Datele lipsă vor fi completate automat din duplicat.
                                </p>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
