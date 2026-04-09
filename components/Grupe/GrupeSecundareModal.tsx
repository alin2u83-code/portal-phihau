import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Sportiv, Grupa as GrupaType, ProgramItem, SportivGrupaSecundara } from '../../types';
import { Button } from '../ui';
import { XIcon, SearchIcon, UserPlusIcon, CheckIcon, TrashIcon, UsersIcon } from '../icons';
import { supabase } from '../../supabaseClient';

// Normalizare nume la majuscule — consistent cu AdaugaSportiviModal
function numeAfisat(sportiv: { nume: string; prenume: string }): string {
    return `${(sportiv.nume || '').toUpperCase()} ${(sportiv.prenume || '').toUpperCase()}`;
}

interface GrupaWithDetails extends GrupaType {
    sportivi: { count: number }[];
    program: ProgramItem[];
}

interface SportivSecundarRow {
    sportiv_id: string;
    este_activ: boolean;
    sportivi: {
        id: string;
        nume: string;
        prenume: string;
        grad_actual_id: string | null;
    } | null;
}

interface GrupeSecundareModalProps {
    isOpen: boolean;
    onClose: () => void;
    grupa: GrupaWithDetails;
    totiSportivii: Sportiv[];
    toateGrupele: GrupaWithDetails[];
    onChanged?: () => void;
}

export const GrupeSecundareModal: React.FC<GrupeSecundareModalProps> = ({
    isOpen,
    onClose,
    grupa,
    totiSportivii,
    toateGrupele,
    onChanged,
}) => {
    // Tab-uri: 'vedere' = sportivi secundari ai acestei grupe, 'adauga' = adaugă sportiv secundar
    const [tab, setTab] = useState<'vedere' | 'adauga'>('vedere');

    // Lista sportivilor secundari ai grupei curente
    const [sportiviSecundari, setSportiviSecundari] = useState<SportivSecundarRow[]>([]);
    const [loadingSecundari, setLoadingSecundari] = useState(false);

    // Stare pentru adăugare
    const [search, setSearch] = useState('');
    const [selectedSportivId, setSelectedSportivId] = useState<string | null>(null);
    const [savingAdd, setSavingAdd] = useState(false);

    // Stare pentru eliminare
    const [removingId, setRemovingId] = useState<string | null>(null);

    const [error, setError] = useState<string | null>(null);

    // Fetch sportivi secundari la deschidere sau schimb grup
    useEffect(() => {
        if (!isOpen) return;
        fetchSecundari();
        // Reset stare la redeschidere
        setTab('vedere');
        setSearch('');
        setSelectedSportivId(null);
        setError(null);
    }, [isOpen, grupa.id]);

    const fetchSecundari = async () => {
        setLoadingSecundari(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('sportivi_grupe_secundare')
                .select('sportiv_id, este_activ, sportivi(id, nume, prenume, grad_actual_id)')
                .eq('grupa_id', grupa.id)
                .eq('este_activ', true);

            if (fetchError) {
                console.error('Eroare fetch sportivi secundari:', fetchError);
                setError('Nu s-au putut încărca sportivii secundari.');
            } else {
                setSportiviSecundari((data as unknown as SportivSecundarRow[]) || []);
            }
        } finally {
            setLoadingSecundari(false);
        }
    };

    // Set-ul de IDs deja secundari în această grupă
    const secundariIds = useMemo(
        () => new Set(sportiviSecundari.map(r => r.sportiv_id)),
        [sportiviSecundari]
    );

    // Sportivii eligibili pentru adăugare ca secundari:
    // - activi, din același club
    // - nu au această grupă ca principală (sportiv.grupa_id !== grupa.id)
    // - nu sunt deja secundari în această grupă
    const sportiviEligibili = useMemo(() => {
        return totiSportivii.filter(s => {
            const dinClub = s.club_id === grupa.club_id;
            const esteActiv = s.status === 'Activ';
            const nuEPrincipal = s.grupa_id !== grupa.id;
            const nuESecundar = !secundariIds.has(s.id);
            return dinClub && esteActiv && nuEPrincipal && nuESecundar;
        });
    }, [totiSportivii, grupa.club_id, grupa.id, secundariIds]);

    const rezultateCautare = useMemo(() => {
        if (!search.trim()) return sportiviEligibili;
        const q = search.toLowerCase();
        return sportiviEligibili.filter(s =>
            `${s.nume} ${s.prenume}`.toLowerCase().includes(q) ||
            `${s.prenume} ${s.nume}`.toLowerCase().includes(q)
        );
    }, [sportiviEligibili, search]);

    // Obține denumirea grupei principale a unui sportiv
    const getGrupaPrincipala = (sportivId: string): string | null => {
        const sportiv = totiSportivii.find(s => s.id === sportivId);
        if (!sportiv?.grupa_id) return null;
        const g = toateGrupele.find(gr => gr.id === sportiv.grupa_id);
        return g?.denumire ?? null;
    };

    const handleAdauga = async () => {
        if (!selectedSportivId || !grupa.club_id) return;
        setSavingAdd(true);
        setError(null);
        try {
            const { error: insertError } = await supabase
                .from('sportivi_grupe_secundare')
                .upsert(
                    {
                        sportiv_id: selectedSportivId,
                        grupa_id: grupa.id,
                        club_id: grupa.club_id,
                        este_activ: true,
                    },
                    { onConflict: 'sportiv_id,grupa_id' }
                );

            if (insertError) {
                console.error('Eroare adăugare grupă secundară:', insertError);
                setError('Eroare la adăugarea sportivului ca secundar.');
                return;
            }

            // Refresh lista
            await fetchSecundari();
            setSelectedSportivId(null);
            setSearch('');
            setTab('vedere');
            onChanged?.();
        } finally {
            setSavingAdd(false);
        }
    };

    const handleElimina = async (sportivId: string) => {
        setRemovingId(sportivId);
        setError(null);
        try {
            const { error: deleteError } = await supabase
                .from('sportivi_grupe_secundare')
                .update({ este_activ: false })
                .eq('sportiv_id', sportivId)
                .eq('grupa_id', grupa.id);

            if (deleteError) {
                console.error('Eroare eliminare grupă secundară:', deleteError);
                setError('Eroare la eliminarea sportivului.');
                return;
            }

            setSportiviSecundari(prev => prev.filter(r => r.sportiv_id !== sportivId));
            onChanged?.();
        } finally {
            setRemovingId(null);
        }
    };

    const handleClose = () => {
        if (savingAdd || removingId) return;
        setSearch('');
        setSelectedSportivId(null);
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={handleClose}
        >
            <div
                className="bg-slate-900 border border-slate-700/80 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
                style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-700/80 bg-slate-800/60 rounded-t-2xl">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-purple-500/10 shrink-0">
                            <UsersIcon className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-lg font-bold text-white truncate">
                                Sportivi Secundari
                            </h2>
                            <p className="text-xs text-slate-400 truncate">{grupa.denumire}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={!!savingAdd || !!removingId}
                        className="p-2 -mr-1 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-colors active:scale-95 touch-manipulation shrink-0"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Tab-uri */}
                <div className="flex border-b border-slate-700/60 px-4 pt-3 gap-1 bg-slate-800/30">
                    <button
                        onClick={() => setTab('vedere')}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                            tab === 'vedere'
                                ? 'text-purple-300 border-b-2 border-purple-400 bg-purple-500/5'
                                : 'text-slate-400 hover:text-slate-300'
                        }`}
                    >
                        Lista ({sportiviSecundari.length})
                    </button>
                    <button
                        onClick={() => { setTab('adauga'); setSearch(''); setSelectedSportivId(null); }}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${
                            tab === 'adauga'
                                ? 'text-purple-300 border-b-2 border-purple-400 bg-purple-500/5'
                                : 'text-slate-400 hover:text-slate-300'
                        }`}
                    >
                        <UserPlusIcon className="w-3.5 h-3.5" />
                        Adaugă Secundar
                    </button>
                </div>

                {/* Eroare globală */}
                {error && (
                    <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                        {error}
                    </div>
                )}

                {/* Conținut tab Vedere */}
                {tab === 'vedere' && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain">
                        {loadingSecundari ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : sportiviSecundari.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                                <div className="p-4 rounded-full bg-slate-700/50 mb-4">
                                    <UsersIcon className="w-8 h-8 text-slate-500" />
                                </div>
                                <p className="text-slate-400 font-medium">
                                    Niciun sportiv secundar
                                </p>
                                <p className="text-slate-500 text-sm mt-1">
                                    Sportivii secundari participă la antrenamentele acestei grupe fără a-și schimba grupa principală.
                                </p>
                                <button
                                    onClick={() => setTab('adauga')}
                                    className="mt-4 text-sm text-purple-400 hover:text-purple-300 font-medium transition-colors"
                                >
                                    + Adaugă primul sportiv secundar
                                </button>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-700/50">
                                {sportiviSecundari.map(row => {
                                    const sportiv = row.sportivi;
                                    if (!sportiv) return null;
                                    const grupaPrincipala = getGrupaPrincipala(row.sportiv_id);
                                    const esteEliminating = removingId === row.sportiv_id;

                                    return (
                                        <li key={row.sportiv_id} className="flex items-center gap-3 px-4 py-3">
                                            {/* Avatar */}
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                {(sportiv.nume?.[0] || '').toUpperCase()}
                                                {(sportiv.prenume?.[0] || '').toUpperCase()}
                                            </div>

                                            {/* Info sportiv */}
                                            <div className="min-w-0 flex-1">
                                                {/* Rând 1: Nume + badge SECUNDAR (inline pe md+, sub nume pe mobile) */}
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <p className="text-sm font-semibold text-white">
                                                        {numeAfisat(sportiv)}
                                                    </p>
                                                    <span className="inline-flex items-center bg-purple-500/20 text-purple-400 border border-purple-500/50 text-xs px-2 py-0.5 rounded font-medium">
                                                        SECUNDAR
                                                    </span>
                                                </div>
                                                {/* Grupa principală */}
                                                {grupaPrincipala && (
                                                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                                                        Principala: {grupaPrincipala}
                                                    </p>
                                                )}
                                                {!grupaPrincipala && (
                                                    <p className="text-xs text-slate-600 mt-0.5">
                                                        Fără grupă principală
                                                    </p>
                                                )}
                                            </div>

                                            {/* Buton Elimină — min h-10 pentru touch */}
                                            <button
                                                onClick={() => handleElimina(row.sportiv_id)}
                                                disabled={esteEliminating}
                                                className="h-10 w-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors touch-manipulation shrink-0 disabled:opacity-50"
                                                title="Elimină din grupa secundară"
                                            >
                                                {esteEliminating ? (
                                                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <TrashIcon className="w-4 h-4" />
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                )}

                {/* Conținut tab Adaugă */}
                {tab === 'adauga' && (
                    <>
                        <div className="p-4 border-b border-slate-700/50">
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Caută sportiv..."
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setSelectedSportivId(null); }}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                />
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                                {rezultateCautare.length} sportiv{rezultateCautare.length !== 1 ? 'i' : ''} eligibil{rezultateCautare.length !== 1 ? 'i' : ''}
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain">
                            {sportiviEligibili.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                                    <div className="p-4 rounded-full bg-slate-700/50 mb-4">
                                        <UserPlusIcon className="w-8 h-8 text-slate-500" />
                                    </div>
                                    <p className="text-slate-400 font-medium">
                                        Niciun sportiv disponibil
                                    </p>
                                    <p className="text-slate-500 text-sm mt-1">
                                        Toți sportivii activi sunt deja în această grupă (principal sau secundar).
                                    </p>
                                </div>
                            ) : rezultateCautare.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                                    <p className="text-slate-400 font-medium">
                                        Niciun rezultat pentru "{search}"
                                    </p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-slate-700/50">
                                    {rezultateCautare.map(sportiv => {
                                        const esteSelectat = selectedSportivId === sportiv.id;
                                        const grupaPrincipala = sportiv.grupa_id
                                            ? toateGrupele.find(g => g.id === sportiv.grupa_id)?.denumire
                                            : null;

                                        return (
                                            <li key={sportiv.id}>
                                                <button
                                                    onClick={() => setSelectedSportivId(esteSelectat ? null : sportiv.id)}
                                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors touch-manipulation ${
                                                        esteSelectat
                                                            ? 'bg-purple-500/10 hover:bg-purple-500/15'
                                                            : 'hover:bg-slate-800/60'
                                                    }`}
                                                >
                                                    {/* Checkbox vizual */}
                                                    <div
                                                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                                                            esteSelectat
                                                                ? 'bg-purple-500 border-purple-500'
                                                                : 'border-slate-600 bg-transparent'
                                                        }`}
                                                    >
                                                        {esteSelectat && (
                                                            <CheckIcon className="w-3 h-3 text-white" />
                                                        )}
                                                    </div>

                                                    {/* Avatar */}
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                        {(sportiv.nume?.[0] || '').toUpperCase()}
                                                        {(sportiv.prenume?.[0] || '').toUpperCase()}
                                                    </div>

                                                    {/* Nume + grupă principală */}
                                                    <div className="min-w-0 flex-1">
                                                        <p className={`text-sm font-semibold truncate ${esteSelectat ? 'text-purple-300' : 'text-white'}`}>
                                                            {numeAfisat(sportiv)}
                                                        </p>
                                                        {grupaPrincipala ? (
                                                            <p className="text-xs text-slate-500 truncate">
                                                                Principala: {grupaPrincipala}
                                                            </p>
                                                        ) : (
                                                            <p className="text-xs text-slate-600 truncate">
                                                                Fără grupă principală
                                                            </p>
                                                        )}
                                                    </div>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {/* Footer adaugă */}
                        <div className="p-4 border-t border-slate-700/80 bg-slate-800/40 rounded-b-2xl">
                            {selectedSportivId && (
                                <p className="text-xs text-center text-purple-400 font-medium mb-3">
                                    {numeAfisat(
                                        totiSportivii.find(s => s.id === selectedSportivId) || { nume: '', prenume: '' }
                                    )} va fi adăugat ca sportiv secundar
                                </p>
                            )}
                            <div className="flex gap-3">
                                <Button
                                    variant="secondary"
                                    onClick={() => { setTab('vedere'); setSearch(''); setSelectedSportivId(null); }}
                                    disabled={savingAdd}
                                    className="flex-1"
                                >
                                    Înapoi
                                </Button>
                                <Button
                                    variant="info"
                                    onClick={handleAdauga}
                                    disabled={!selectedSportivId}
                                    isLoading={savingAdd}
                                    className="flex-1 bg-purple-600 hover:bg-purple-700 border-purple-600"
                                >
                                    {savingAdd ? 'Se salvează...' : 'Adaugă ca Secundar'}
                                </Button>
                            </div>
                        </div>
                    </>
                )}

                {/* Footer vedere */}
                {tab === 'vedere' && (
                    <div className="p-4 border-t border-slate-700/80 bg-slate-800/40 rounded-b-2xl">
                        <Button
                            variant="secondary"
                            onClick={handleClose}
                            className="w-full"
                        >
                            Închide
                        </Button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
