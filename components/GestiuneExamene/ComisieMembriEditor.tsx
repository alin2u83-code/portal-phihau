import React, { useState, useEffect, useRef } from 'react';
import { Button, Input } from '../ui';
import { PlusIcon, TrashIcon } from '../icons';
import { CandidatComisie, ComisieMembru } from '../../types';
import { supabase } from '../../supabaseClient';

export type ComisieEntry = Pick<ComisieMembru, 'user_id' | 'nume_afisat'>;

export const ComisieMembriEditor: React.FC<{
    entries: ComisieEntry[];
    setEntries: (entries: ComisieEntry[]) => void;
}> = ({ entries, setEntries }) => {
    const [manualInput, setManualInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<CandidatComisie[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        if (!searchQuery.trim() || !supabase) {
            setSearchResults([]);
            return;
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setIsSearching(true);
            const { data, error } = await supabase.rpc('cauta_utilizatori_comisie', { p_query: searchQuery.trim() });
            setIsSearching(false);
            if (!error && data) setSearchResults(data as CandidatComisie[]);
        }, 300);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [searchQuery]);

    const handleAddManual = () => {
        const trimmed = manualInput.trim();
        if (trimmed && !entries.some(e => e.nume_afisat === trimmed)) {
            setEntries([...entries, { user_id: null, nume_afisat: trimmed }]);
            setManualInput('');
        }
    };

    const handleAddCandidat = (candidat: CandidatComisie) => {
        if (entries.some(e => e.user_id === candidat.user_id)) return;
        const numeComplet = `${candidat.nume} ${candidat.prenume}${candidat.club_nume ? ` (${candidat.club_nume})` : ''}`;
        setEntries([...entries, { user_id: candidat.user_id, nume_afisat: numeComplet }]);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleRemove = (index: number) => {
        setEntries(entries.filter((_, i) => i !== index));
    };

    return (
        <div>
            <label className="block text-[11px] uppercase font-bold text-slate-400 mb-2 ml-1">Membri Comisie</label>

            <div className="space-y-2 mb-3">
                {entries.map((entry, index) => (
                    <div key={`${entry.user_id || 'manual'}-${index}`} className="bg-slate-700/50 p-2 rounded-md flex justify-between items-center text-sm">
                        <span className="font-medium text-white">
                            {entry.nume_afisat}
                            {!entry.user_id && <span className="ml-2 text-[10px] uppercase text-slate-500">manual</span>}
                        </span>
                        <Button type="button" size="sm" variant="danger" onClick={() => handleRemove(index)} className="!p-1.5 h-auto" title={`Elimină pe ${entry.nume_afisat}`}>
                            <TrashIcon className="w-4 h-4" />
                        </Button>
                    </div>
                ))}
                {entries.length === 0 && <p className="text-xs text-slate-500 italic text-center py-2">Niciun membru adăugat.</p>}
            </div>

            <div className="space-y-2">
                <div className="relative">
                    <Input
                        label=""
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="🔍 Caută instructor/admin (orice club)..."
                    />
                    {isSearching && <p className="text-xs text-slate-500 mt-1">Se caută...</p>}
                    {searchResults.length > 0 && (
                        <div className="mt-1 bg-slate-800 border border-slate-600 rounded-lg overflow-hidden">
                            {searchResults.map(candidat => (
                                <button
                                    type="button"
                                    key={candidat.sportiv_id}
                                    onClick={() => handleAddCandidat(candidat)}
                                    className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 flex flex-col"
                                >
                                    <span className="font-medium">{candidat.nume} {candidat.prenume}</span>
                                    <span className="text-xs text-slate-400">{candidat.club_nume || 'Federație'} · {candidat.rol_denumire}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-end gap-2">
                    <div className="flex-grow">
                        <Input label="" value={manualInput} onChange={e => setManualInput(e.target.value)} placeholder="Sau adaugă nume manual (fără cont)..."
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddManual(); } }} />
                    </div>
                    <Button type="button" variant="info" onClick={handleAddManual} className="h-[50px] w-[50px] !p-0 flex items-center justify-center flex-shrink-0" title="Adaugă membru manual">
                        <PlusIcon className="w-6 h-6" />
                    </Button>
                </div>
            </div>
        </div>
    );
};
