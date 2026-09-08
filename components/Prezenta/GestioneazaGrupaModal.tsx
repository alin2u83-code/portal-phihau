import React, { useState, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';
import { Modal, Button } from '../ui';
import { SearchIcon, CheckIcon } from '../icons';
import { useData } from '../../contexts/DataContext';
import { useError } from '../ErrorProvider';
import { mutaInGrupa, scoateDinGrupa } from '../../services/grupeIstoricService';

interface Props {
    grupaId: string;
    grupaDenumire: string;
    clubId: string | null;
    onClose: () => void;
    onSaved: () => void;
}

export const GestioneazaGrupaModal: React.FC<Props> = ({ grupaId, grupaDenumire, clubId, onClose, onSaved }) => {
    const { filteredData, grade, currentUser } = useData();
    const { showError, showSuccess } = useError();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);

    // Sursa de adevar pentru diff, calculata o singura data la montare
    const initialeRef = useRef<Set<string>>(
        new Set((filteredData.sportivi || []).filter(s => s.grupa_id === grupaId).map(s => s.id))
    );
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(initialeRef.current));

    const gradeById = useMemo(() => Object.fromEntries((grade || []).map(g => [g.id, g])), [grade]);

    const candidati = useMemo(() => {
        const q = search.toLowerCase().trim();
        return (filteredData.sportivi || [])
            .filter(s => s.status === 'Activ')
            .filter(s => !clubId || s.club_id === clubId)
            .filter(s => !q || `${s.nume} ${s.prenume}`.toLowerCase().includes(q))
            .sort((a, b) => a.nume.localeCompare(b.nume, 'ro-RO') || a.prenume.localeCompare(b.prenume, 'ro-RO'));
    }, [filteredData.sportivi, clubId, search]);

    const toggleSelected = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleSave = async () => {
        const initiali = initialeRef.current;
        const deAdaugat = [...selectedIds].filter(id => !initiali.has(id));
        const deEliminat = [...initiali].filter(id => !selectedIds.has(id));

        if (deAdaugat.length === 0 && deEliminat.length === 0) {
            onClose();
            return;
        }

        setSaving(true);

        if (deAdaugat.length > 0) {
            const { error } = await supabase.from('sportivi').update({ grupa_id: grupaId }).in('id', deAdaugat);
            if (error) {
                showError('Eroare', error.message);
                setSaving(false);
                return;
            }
        }

        if (deEliminat.length > 0) {
            const { error } = await supabase.from('sportivi').update({ grupa_id: null }).in('id', deEliminat);
            if (error) {
                showError('Eroare', error.message);
                setSaving(false);
                return;
            }
        }

        if (deAdaugat.length > 0 && clubId) {
            await mutaInGrupa(deAdaugat, grupaId, grupaDenumire, clubId, currentUser?.user_id || null);
        }
        if (deEliminat.length > 0) {
            await scoateDinGrupa(deEliminat, currentUser?.user_id || null);
        }

        queryClient.invalidateQueries({ queryKey: ['sportivi'] });
        queryClient.invalidateQueries({ queryKey: ['grupe'] });

        showSuccess('Succes', `${deAdaugat.length} adaugati, ${deEliminat.length} eliminati din grupa ${grupaDenumire}.`);

        setSaving(false);
        onSaved();
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Gestioneaza grupa ${grupaDenumire}`}>
            <p className="text-xs text-slate-400 mb-3">Bifat = in grupa, debifat = scos din grupa.</p>

            <div className="relative mb-3">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                    autoFocus
                    type="text"
                    placeholder="Cauta sportiv..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
            </div>

            <p className="text-xs text-slate-500 mb-2">
                {selectedIds.size} selectati din {candidati.length} sportivi activi
            </p>

            <div className="max-h-[50vh] overflow-y-auto space-y-1">
                {candidati.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-4 italic">Niciun sportiv activ gasit.</p>
                ) : candidati.map(s => {
                    const isSelected = selectedIds.has(s.id);
                    const gradS = s.grad_actual_id ? gradeById[s.grad_actual_id] : null;
                    const grupaCurentaAlta = s.grupa_id && s.grupa_id !== grupaId;
                    const denumireAltaGrupa = grupaCurentaAlta
                        ? (filteredData.grupe || []).find(g => g.id === s.grupa_id)?.denumire || 'alta grupa'
                        : null;
                    return (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleSelected(s.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                                isSelected ? 'bg-amber-500/10 hover:bg-amber-500/15' : 'hover:bg-slate-800/40'
                            }`}
                        >
                            <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                                isSelected ? 'bg-amber-500 border-amber-500' : 'border-slate-600 bg-transparent'
                            }`}>
                                {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                            </span>
                            <span className="flex-1 min-w-0">
                                <span className="block text-sm font-medium text-slate-200 truncate">{s.nume} {s.prenume}</span>
                                {grupaCurentaAlta && (
                                    <span className="block text-[10px] text-amber-500/70">momentan in {denumireAltaGrupa}</span>
                                )}
                            </span>
                            <span className="text-xs text-slate-500 shrink-0">
                                {gradS?.nume || <span className="text-slate-700">—</span>}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-slate-800">
                <Button variant="secondary" onClick={onClose} disabled={saving}>Anuleaza</Button>
                <Button variant="primary" onClick={handleSave} isLoading={saving}>Salveaza</Button>
            </div>
        </Modal>
    );
};
