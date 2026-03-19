import React, { useState, useMemo } from 'react';
import { Familie, Sportiv, TipAbonament, User, Grupa } from '../types';
import { Button, Input, Card, Select } from './ui';
import { PlusIcon, TrashIcon, ArrowLeftIcon, EditIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { useFamilyManager } from '../hooks/useFamilyManager';

interface FamiliiManagementProps {
    familii: Familie[];
    setFamilii: React.Dispatch<React.SetStateAction<Familie[]>>;
    sportivi: Sportiv[];
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    onBack?: () => void;
    isEmbedded?: boolean;
    tipuriAbonament: TipAbonament[];
    grupe: Grupa[];
    currentUser: User;
    onViewSportiv?: (sportiv: Sportiv) => void;
}

export const FamiliiManagement: React.FC<FamiliiManagementProps> = ({
    familii, setFamilii, sportivi, setSportivi, onBack, isEmbedded = false, tipuriAbonament, grupe, currentUser, onViewSportiv
}) => {
    const [newFamilyName, setNewFamilyName] = useState('');
    const [selectedSportiv1, setSelectedSportiv1] = useState('');
    const [selectedSportiv2, setSelectedSportiv2] = useState('');
    const [salaFilter, setSalaFilter] = useState('');
    const [toDelete, setToDelete] = useState<Familie | null>(null);
    const { showError, showSuccess } = useError();

    const {
        loading,
        unassignedSportivi,
        handleCreateFamily,
        handleUpdateFamily,
        handleDeleteFamily,
        handleSetRepresentative
    } = useFamilyManager(familii, setFamilii, sportivi, setSportivi);
    
    const sali = useMemo(() => [...new Set(grupe.map(g => g.sala).filter(Boolean))], [grupe]);

    const filteredUnassigned = useMemo(() => {
        let unassigned = unassignedSportivi;
        if (salaFilter) {
            const grupaIdsInSala = new Set(grupe.filter(g => g.sala === salaFilter).map(g => g.id));
            unassigned = unassigned.filter(s => s.grupa_id && grupaIdsInSala.has(s.grupa_id));
        }
        return unassigned;
    }, [unassignedSportivi, salaFilter, grupe]);

    const sportiviSelect2 = useMemo(() => {
        return filteredUnassigned.filter(s => s.id !== selectedSportiv1);
    }, [filteredUnassigned, selectedSportiv1]);
    
    const handleCreateFamilyFromGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFamilyName.trim() || !selectedSportiv1 || !selectedSportiv2) {
            showError("Date Incomplete", "Vă rugăm selectați doi sportivi și introduceți un nume pentru familie."); return;
        }

        const result = await handleCreateFamily(newFamilyName.trim(), [selectedSportiv1, selectedSportiv2], currentUser.club_id);
        if (result.success) {
            setNewFamilyName('');
            setSelectedSportiv1('');
            setSelectedSportiv2('');
        }
    };
    
    const handleEdit = async (id: string, updates: Partial<Familie>) => {
        await handleUpdateFamily(id, updates);
    };

    const confirmDelete = async (id: string) => {
        const result = await handleDeleteFamily(id);
        if (result.success) {
            setToDelete(null);
        }
    };

    return (
        <div className="space-y-6">
            {!isEmbedded && onBack && <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>}
            {!isEmbedded && <h1 className="text-3xl font-bold text-white">Management Familii</h1>}

            <Card>
                <h3 className="text-xl font-bold text-white mb-4">Creează Familie prin Grupare</h3>
                <form onSubmit={handleCreateFamilyFromGroup} className="space-y-4">
                    <Select label="Filtru Sală/Filială (Opțional)" value={salaFilter} onChange={e => setSalaFilter(e.target.value)} className="!bg-[var(--bg-card-hover)] !text-white">
                        <option value="">Toate sălile</option>
                        {sali.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select label="Selectează Sportiv 1" value={selectedSportiv1} onChange={e => setSelectedSportiv1(e.target.value)} required>
                            <option value="">Alege...</option>
                            {filteredUnassigned.map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>)}
                        </Select>
                        <Select label="Selectează Sportiv 2" value={selectedSportiv2} onChange={e => setSelectedSportiv2(e.target.value)} required disabled={!selectedSportiv1}>
                             <option value="">Alege...</option>
                            {sportiviSelect2.map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>)}
                        </Select>
                    </div>
                    <Input label="Nume Familie" value={newFamilyName} onChange={e => setNewFamilyName(e.target.value)} placeholder="Ex: Popescu" required/>
                    <div className="flex justify-end pt-2"><Button type="submit" variant="info" isLoading={loading}><PlusIcon className="w-5 h-5 mr-2"/> Creează Familie</Button></div>
                </form>
            </Card>

            <div>
                <h3 className="text-xl font-bold text-white mb-4">Listă Familii Existente</h3>
                
                {/* Mobile Cards View */}
                <div className="md:hidden space-y-4">
                    {familii.map(f => {
                        const membri = sportivi.filter(s => s.familie_id === f.id);
                        const abonament = tipuriAbonament.find(t => t.id === f.tip_abonament_id);
                        const reprezentant = membri.find(m => m.id === f.reprezentant_id);
                        return (
                        <Card key={f.id}>
                            <h4 className="font-bold text-white text-lg">{f.nume}</h4>
                            <p className="text-sm text-slate-300">Abonament: <span className="font-semibold">{abonament?.denumire || 'Automat'}</span></p>
                            <p className="text-sm text-slate-300">Reprezentant: <span className="font-semibold text-blue-400">{reprezentant ? `${reprezentant.nume} ${reprezentant.prenume}` : 'Nespecificat'}</span></p>
                            <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                                <h5 className="text-xs uppercase font-bold text-slate-400 mb-1">Membri ({membri.length})</h5>
                                <ul className="text-sm text-slate-200 list-disc list-inside">{membri.map(m => <li key={m.id}>{onViewSportiv ? <button type="button" className="hover:text-brand-primary hover:underline" onClick={() => onViewSportiv(m)}>{m.nume} {m.prenume}</button> : <>{m.nume} {m.prenume}</>}</li>)}</ul>
                            </div>
                             <div className="mt-4 flex gap-2">
                                <Button size="sm" variant="danger" onClick={() => setToDelete(f)} className="min-h-[44px]"><TrashIcon className="w-4 h-4"/></Button>
                            </div>
                        </Card>
                    )})}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block bg-[var(--bg-card)] rounded-lg overflow-hidden border border-[var(--border-color)]">
                    <table className="w-full text-left">
                        <thead className="bg-[var(--bg-table-header)] text-[var(--brand-secondary)] font-bold uppercase text-xs">
                            <tr>
                                <th className="p-3">Nume Familie</th>
                                <th className="p-3">Membri</th>
                                <th className="p-3">Reprezentant</th>
                                <th className="p-3">Tip Abonament</th>
                                <th className="p-3 text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {familii.map(f => {
                                const membri = sportivi.filter(s => s.familie_id === f.id);
                                return (
                                <tr key={f.id} className="text-white">
                                    <td className="p-2 w-1/4"><Input label="" defaultValue={f.nume} onBlur={e => handleEdit(f.id, { nume: e.target.value })} className="!bg-transparent"/></td>
                                    <td className="p-3 text-sm">
                                        {membri.map((m, idx) => (
                                            <span key={m.id}>
                                                {idx > 0 && ', '}
                                                {onViewSportiv ? (
                                                    <button type="button" className="hover:text-brand-primary hover:underline" onClick={() => onViewSportiv(m)}>{m.nume} {m.prenume}</button>
                                                ) : (
                                                    <>{m.nume} {m.prenume}</>
                                                )}
                                            </span>
                                        ))}
                                    </td>
                                    <td className="p-2 w-1/4">
                                        <Select label="" value={f.reprezentant_id || ''} onChange={(e) => handleSetRepresentative(f.id, e.target.value || null)} className="!bg-transparent text-sm">
                                            <option value="">Alege reprezentant...</option>
                                            {membri.map(m => <option key={m.id} value={m.id}>{m.nume} {m.prenume}</option>)}
                                        </Select>
                                    </td>
                                    <td className="p-2 w-1/4">
                                        <Select label="" value={f.tip_abonament_id || ''} onChange={(e) => handleEdit(f.id, { tip_abonament_id: e.target.value || null })} className="!bg-transparent text-sm">
                                            <option value="">Automat (după nr. membri)</option>
                                            {tipuriAbonament.filter(t => t.numar_membri > 1).map(t => <option key={t.id} value={t.id}>{t.denumire} ({t.numar_membri} membri)</option>)}
                                        </Select>
                                    </td>
                                    <td className="p-3 text-right"><Button onClick={() => setToDelete(f)} variant="danger" size="sm"><TrashIcon /></Button></td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmDeleteModal isOpen={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => { if(toDelete) confirmDelete(toDelete.id) }} tableName="Familii" isLoading={loading} />
        </div>
    );
};