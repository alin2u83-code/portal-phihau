import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Sportiv, Grupa as GrupaType, ProgramItem } from '../../types';
import { Button } from '../ui';
import { XIcon, SearchIcon, UserPlusIcon, CheckIcon } from '../icons';

// Normalizează un string din DB (poate fi ALL CAPS) la Title Case
function toTitleCase(str: string): string {
    if (!str) return str;
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function numeAfisat(sportiv: Sportiv): string {
    return `${toTitleCase(sportiv.nume)} ${toTitleCase(sportiv.prenume)}`;
}

interface GrupaWithDetails extends GrupaType {
    sportivi: { count: number }[];
    program: ProgramItem[];
}

interface AdaugaSportiviModalProps {
    isOpen: boolean;
    onClose: () => void;
    grupa: GrupaWithDetails;
    totiSportivii: Sportiv[];
    sportiviInGrupa: Sportiv[];
    onSave: (sportiviIds: string[]) => Promise<void>;
}

export const AdaugaSportiviModal: React.FC<AdaugaSportiviModalProps> = ({
    isOpen,
    onClose,
    grupa,
    totiSportivii,
    sportiviInGrupa,
    onSave,
}) => {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [filtrFaraGrupa, setFiltrFaraGrupa] = useState(false);

    const sportiviInGrupaIds = useMemo(
        () => new Set(sportiviInGrupa.map(s => s.id)),
        [sportiviInGrupa]
    );

    // Sportivi disponibili = activi, din același club, care nu sunt deja în grupă
    const sportiviDisponibili = useMemo(() => {
        const filtered = totiSportivii.filter(s => {
            const esteDinClub = s.club_id === grupa.club_id;
            const nuEInGrupa = !sportiviInGrupaIds.has(s.id);
            const esteActiv = s.status === 'Activ';
            return esteDinClub && nuEInGrupa && esteActiv;
        });

        if (filtrFaraGrupa) {
            // Cei fără grupă apar primii, restul după
            const faraGrupa = filtered.filter(s => !s.grupa_id);
            const cuGrupa = filtered.filter(s => s.grupa_id);
            return [...faraGrupa, ...cuGrupa];
        }

        return filtered;
    }, [totiSportivii, sportiviInGrupaIds, grupa.club_id, filtrFaraGrupa]);

    const rezultateCautare = useMemo(() => {
        if (!search.trim()) return sportiviDisponibili;
        const q = search.toLowerCase();
        return sportiviDisponibili.filter(s =>
            `${s.nume} ${s.prenume}`.toLowerCase().includes(q) ||
            `${s.prenume} ${s.nume}`.toLowerCase().includes(q)
        );
    }, [sportiviDisponibili, search]);

    const toggleSportiv = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === rezultateCautare.length && rezultateCautare.length > 0) {
            setSelected(new Set());
        } else {
            setSelected(new Set(rezultateCautare.map(s => s.id)));
        }
    };

    const handleSave = async () => {
        if (selected.size === 0) return;
        setLoading(true);
        try {
            await onSave(Array.from(selected));
            setSelected(new Set());
            setSearch('');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (loading) return;
        setSelected(new Set());
        setSearch('');
        onClose();
    };

    if (!isOpen) return null;

    const toateSuntSelectate =
        rezultateCautare.length > 0 && selected.size === rezultateCautare.length;

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
                        <div className="p-2 rounded-lg bg-sky-500/10 shrink-0">
                            <UserPlusIcon className="w-5 h-5 text-sky-400" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-lg font-bold text-white truncate">
                                Adaugă Sportivi
                            </h2>
                            <p className="text-xs text-slate-400 truncate">
                                {grupa.denumire}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={loading}
                        className="p-2 -mr-1 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-colors active:scale-95 touch-manipulation shrink-0"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-slate-700/50">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Caută sportiv..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                        />
                    </div>

                    {/* Toggle: Fără grupă mai întâi */}
                    <button
                        onClick={() => setFiltrFaraGrupa(prev => !prev)}
                        className={`mt-3 flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all w-full ${
                            filtrFaraGrupa
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300 hover:border-slate-600'
                        }`}
                    >
                        <span
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                                filtrFaraGrupa
                                    ? 'bg-emerald-500 border-emerald-500'
                                    : 'border-slate-500 bg-transparent'
                            }`}
                        >
                            {filtrFaraGrupa && <CheckIcon className="w-2.5 h-2.5 text-white" />}
                        </span>
                        Fără grupă mai întâi
                    </button>

                    {sportiviDisponibili.length > 0 && (
                        <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-slate-400">
                                {rezultateCautare.length} sportiv
                                {rezultateCautare.length !== 1 ? 'i' : ''} disponibil
                                {rezultateCautare.length !== 1 ? 'i' : ''}
                            </span>
                            {rezultateCautare.length > 0 && (
                                <button
                                    onClick={toggleAll}
                                    className="text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors"
                                >
                                    {toateSuntSelectate ? 'Deselectează tot' : 'Selectează tot'}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Lista */}
                <div className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain">
                    {sportiviDisponibili.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                            <div className="p-4 rounded-full bg-slate-700/50 mb-4">
                                <UserPlusIcon className="w-8 h-8 text-slate-500" />
                            </div>
                            <p className="text-slate-400 font-medium">
                                Toți sportivii activi sunt deja în această grupă
                            </p>
                            <p className="text-slate-500 text-sm mt-1">
                                sau nu există sportivi activi în club
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
                                const esteSelectat = selected.has(sportiv.id);
                                return (
                                    <li key={sportiv.id}>
                                        <button
                                            onClick={() => toggleSportiv(sportiv.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors touch-manipulation ${
                                                esteSelectat
                                                    ? 'bg-sky-500/10 hover:bg-sky-500/15'
                                                    : 'hover:bg-slate-800/60'
                                            }`}
                                        >
                                            {/* Checkbox vizual */}
                                            <div
                                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                                                    esteSelectat
                                                        ? 'bg-sky-500 border-sky-500'
                                                        : 'border-slate-600 bg-transparent'
                                                }`}
                                            >
                                                {esteSelectat && (
                                                    <CheckIcon className="w-3 h-3 text-white" />
                                                )}
                                            </div>

                                            {/* Avatar */}
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                {(sportiv.nume?.[0] || '').toUpperCase()}
                                                {(sportiv.prenume?.[0] || '').toUpperCase()}
                                            </div>

                                            {/* Nume */}
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-sm font-semibold truncate ${esteSelectat ? 'text-sky-300' : 'text-white'}`}>
                                                    {numeAfisat(sportiv)}
                                                </p>
                                                {sportiv.grupa_id && (
                                                    <p className="text-xs text-amber-400/80 truncate">
                                                        Deja în altă grupă
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

                {/* Footer */}
                <div className="p-4 border-t border-slate-700/80 bg-slate-800/40 rounded-b-2xl">
                    {selected.size > 0 && (
                        <p className="text-xs text-center text-sky-400 font-medium mb-3">
                            {selected.size} sportiv{selected.size !== 1 ? 'i' : ''} selectat
                            {selected.size !== 1 ? 'i' : ''}
                        </p>
                    )}
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={handleClose}
                            disabled={loading}
                            className="flex-1"
                        >
                            Anulează
                        </Button>
                        <Button
                            variant="info"
                            onClick={handleSave}
                            disabled={selected.size === 0}
                            isLoading={loading}
                            className="flex-1"
                        >
                            {loading
                                ? 'Se salvează...'
                                : `Adaugă ${selected.size > 0 ? `(${selected.size})` : ''}`}
                        </Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
