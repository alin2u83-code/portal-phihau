import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { useData } from '../../../contexts/DataContext';
import { useError } from '../../ErrorProvider';
import { Card, Button } from '../../ui';
import {
    ArrowLeftIcon,
    CheckIcon,
    SearchIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
} from '../../icons';
import { PereacheDuplicat, SportivCard } from './types';
import { detecteazaLocalDuplicate } from './utils';
import { CardPereache } from './CardPereache';
import { ModalConfirmareFuzionare } from './ModalConfirmareFuzionare';

export const DeduplicareSportivi: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { setSportivi } = useData();
    const { showError, showSuccess } = useError();

    const [perechi, setPerechi] = useState<PereacheDuplicat[]>([]);
    const [gradeMap, setGradeMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [modRPC, setModRPC] = useState(true);

    const [primarMap, setPrimarMap] = useState<Record<string, string>>({});
    const [ignorate, setIgnorate] = useState<Set<string>>(new Set());
    const [fuzionate, setFuzionate] = useState<Set<string>>(new Set());
    const [inProgres, setInProgres] = useState<Set<string>>(new Set());

    const [modalPereche, setModalPereche] = useState<PereacheDuplicat | null>(null);
    const [modalInProgres, setModalInProgres] = useState(false);

    const [cautare, setCautare] = useState('');
    const [afiseazaIgnorate, setAfiseazaIgnorate] = useState(false);

    const incarcaDate = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);
        try {
            const { data: gr } = await supabase.from('grade').select('id, nume');
            const gm: Record<string, string> = {};
            (gr || []).forEach((g: any) => { gm[g.id] = g.nume; });
            setGradeMap(gm);

            const { data: rpcData, error: rpcErr } = await supabase.rpc('find_similar_sportivi');

            if (!rpcErr && rpcData) {
                const perecheRPC: PereacheDuplicat[] = (rpcData as any[]).map((r) => ({
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

    const getPrimarDefault = (p: PereacheDuplicat): string => {
        if (p.sportiv_a.user_id && !p.sportiv_b.user_id) return p.sportiv_a.id;
        if (p.sportiv_b.user_id && !p.sportiv_a.user_id) return p.sportiv_b.id;
        return p.sportiv_a.data_inscrierii <= p.sportiv_b.data_inscrierii
            ? p.sportiv_a.id
            : p.sportiv_b.id;
    };

    const getPrimar = (p: PereacheDuplicat): string =>
        primarMap[p.id] ?? getPrimarDefault(p);

    const selecteazaPrimar = (perecheId: string, sportvId: string) => {
        setPrimarMap(prev => ({ ...prev, [perecheId]: sportvId }));
    };

    const toggleIgnora = (perecheId: string) => {
        setIgnorate(prev => {
            const next = new Set(prev);
            if (next.has(perecheId)) next.delete(perecheId);
            else next.add(perecheId);
            return next;
        });
    };

    const deschideModalFuzionare = (p: PereacheDuplicat) => {
        setModalPereche(p);
    };

    const inchideModal = () => {
        if (!modalInProgres) setModalPereche(null);
    };

    const executaFuzionare = async () => {
        if (!supabase || !modalPereche) return;

        const primarId   = getPrimar(modalPereche);
        const secundarId = modalPereche.sportiv_a.id === primarId
            ? modalPereche.sportiv_b.id
            : modalPereche.sportiv_a.id;

        setModalInProgres(true);
        setInProgres(prev => new Set(prev).add(modalPereche.id));

        try {
            if (modRPC) {
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
                const TABELE_REFERINTA = [
                    'inscrieri_examene', 'plati', 'istoric_grade', 'prezenta_antrenament',
                    'anunturi_prezenta', 'vize_medicale', 'sportivi_grupe_secundare',
                    'echipa_sportivi', 'utilizator_roluri_multicont', 'decont_sportivi',
                    'vize_sportivi', 'rezultate',
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

                const completari: Record<string, any> = {};
                if (!primar.cnp && secundar.cnp) completari.cnp = secundar.cnp;
                if (!primar.email && secundar.email) completari.email = secundar.email;
                if (!primar.data_nasterii && secundar.data_nasterii) completari.data_nasterii = secundar.data_nasterii;
                if (!primar.grad_actual_id && secundar.grad_actual_id) completari.grad_actual_id = secundar.grad_actual_id;
                if (Object.keys(completari).length > 0) {
                    await supabase.from('sportivi').update(completari).eq('id', primarId);
                }

                await supabase.from('sportivi')
                    .update({ status: 'Inactiv' })
                    .eq('id', secundarId);
            }

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

    const perechiFiltrate = useMemo(() => {
        let lista = perechi.filter(p => !fuzionate.has(p.id));
        if (!afiseazaIgnorate) lista = lista.filter(p => !ignorate.has(p.id));
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

            {!modRPC && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm">
                    <ExclamationTriangleIcon className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <span className="font-semibold text-amber-300">Mod detectare locala</span>
                        <span className="text-amber-400/80 ml-1">
                            — Functia SQL <code className="font-mono text-xs bg-slate-800 px-1 rounded">find_similar_sportivi()</code> nu este disponibila.
                            Activati extensia <strong>pg_trgm</strong> in Supabase si rulati migratia
                            <code className="font-mono text-xs bg-slate-800 px-1 ml-1 rounded">add_deduplicare_sportivi.sql</code>
                            pentru detectare mai precisa.
                        </span>
                    </div>
                </div>
            )}

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
