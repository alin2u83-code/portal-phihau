import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Plata, Sportiv, TipAbonament, Familie, Tranzactie, Reducere, User, Club, Permissions, InscriereExamen, Grad } from '../types';
import { Button, Input, Select, Card, Modal } from './ui';
import { EditIcon, ArrowLeftIcon, TrashIcon, BanknotesIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { FEDERATIE_ID, FEDERATIE_NAME } from '../constants';

interface PlatiScadenteProps { 
    plati: Plata[]; 
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>; 
    sportivi: Sportiv[]; 
    familii: Familie[]; 
    tipuriAbonament: TipAbonament[];
    tranzactii: Tranzactie[];
    reduceri: Reducere[];
    onIncaseazaMultiple: (plati: Plata[]) => void;
    onBack: () => void;
    onViewSportiv: (sportiv: Sportiv) => void;
    currentUser: User;
    clubs: Club[];
    permissions: Permissions;
    inscrieriExamene: InscriereExamen[];
    grade: Grad[];
}

const initialFilters = { sportiv: '', tip: '', status: 'scadent', clubId: '' };

export const PlatiScadente: React.FC<PlatiScadenteProps> = ({ plati, setPlati, sportivi, familii, tipuriAbonament, tranzactii, reduceri, onIncaseazaMultiple, onBack, onViewSportiv, currentUser, clubs, permissions, inscrieriExamene, grade }) => {
    const [filter, setFilter] = useLocalStorage('phi-hau-plati-scadente-filter', initialFilters);
    const [editingPlata, setEditingPlata] = useState<Plata | null>(null);
    const [plataToDelete, setPlataToDelete] = useState<Plata | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const { showError, showSuccess } = useError();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [viewingHistoryFor, setViewingHistoryFor] = useState<Plata | null>(null);

    const balances = useMemo(() => {
        const famBalances = new Map<string, number>();
        const indivBalances = new Map<string, number>();

        (familii || []).forEach(f => famBalances.set(f.id, 0));
        (sportivi || []).forEach(s => indivBalances.set(s.id, 0));

        (tranzactii || []).forEach(t => {
            if (t.familie_id) {
                famBalances.set(t.familie_id, (famBalances.get(t.familie_id) || 0) + t.suma);
            } else if (t.sportiv_id) {
                indivBalances.set(t.sportiv_id, (indivBalances.get(t.sportiv_id) || 0) + t.suma);
            }
        });

        (plati || []).forEach(p => {
            if (p.familie_id) {
                famBalances.set(p.familie_id, (famBalances.get(p.familie_id) || 0) - p.suma);
            } else if (p.sportiv_id) {
                indivBalances.set(p.sportiv_id, (indivBalances.get(p.sportiv_id) || 0) - p.suma);
            }
        });

        return { famBalances, indivBalances };
    }, [familii, sportivi, plati, tranzactii]);

    const handleGenerateSubscriptions = async () => {
        // ... (existing implementation)
    };

    const handleSaveEdit = async () => {
        if (!editingPlata || !supabase) return;
        setIsSaving(true);
        const { id, ...updates } = editingPlata;
        const { error } = await supabase.from('plati').update(updates).eq('id', id);
        setIsSaving(false);
        if(error) { showError("Eroare la Salvare", error.message); }
        else { setPlati(prev => prev.map(p => p.id === id ? editingPlata : p)); setEditingPlata(null); }
    };
    
    const confirmDelete = async (id: string) => {
        if(!supabase) return;
        setIsDeleting(true);
        const { error } = await supabase.from('plati').delete().eq('id', id);
        setIsDeleting(false);
        if(error) { showError("Eroare la Ștergere", error.message); }
        else { setPlati(prev => prev.filter(p => p.id !== id)); }
        setPlataToDelete(null);
    };
    
    const filteredPlati = useMemo(() => {
        return (plati || []).filter(p => {
            const sportivPlata = p.sportiv_id ? (sportivi || []).find(s => s.id === p.sportiv_id) : null;
            const familiePlata = p.familie_id ? (familii || []).find(f => f.id === p.familie_id) : null;
            let clubId = sportivPlata?.club_id;
            if (!clubId && familiePlata) {
                const firstMember = (sportivi || []).find(s => s.familie_id === familiePlata.id);
                clubId = firstMember?.club_id;
            }

            if (filter.clubId && clubId !== filter.clubId) return false;
            
            let statusMatch = true;
            if (filter.status === 'scadent') {
                statusMatch = p.status === 'Neachitat' || p.status === 'Achitat Parțial';
            } else if (filter.status) {
                statusMatch = p.status === filter.status;
            }
            if (!statusMatch) return false;

            if (filter.tip && p.tip !== filter.tip) return false;
            if (filter.sportiv && p.sportiv_id !== filter.sportiv) return false;
            return true;
        }).sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    }, [plati, sportivi, familii, filter]);

    const platiCuDetalii = useMemo(() => {
        if (!filteredPlati) return [];
        return filteredPlati.map(plata => {
            let descriereDetaliata = plata.descriere;
            let reducereDetalii = null;

            if (plata.tip === 'Taxa Examen') {
                const inscriere = (inscrieriExamene || []).find(i => i.plata_id === plata.id);
                const grad = inscriere ? (grade || []).find(g => g.id === inscriere.grad_vizat_id) : null;
                if (grad) {
                    descriereDetaliata = `Taxă Examen - ${grad.nume}`;
                }
            }
            
            if (plata.reducere_id && plata.suma_initiala && plata.suma_initiala > plata.suma) {
                const reducere = (reduceri || []).find(r => r.id === plata.reducere_id);
                if (reducere) {
                    const valoareReducere = plata.suma_initiala - plata.suma;
                    reducereDetalii = {
                        nume: reducere.nume,
                        valoare: valoareReducere,
                    };
                }
            }
            
            return {
                ...plata,
                descriereDetaliata,
                reducereDetalii
            };
        });
    }, [filteredPlati, inscrieriExamene, grade, reduceri]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(platiCuDetalii.map(p => p.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectRow = (id: string) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedIds(newSelection);
    };

    const handleIncasareClick = () => {
        const selected = platiCuDetalii.filter(p => selectedIds.has(p.id));
        onIncaseazaMultiple(selected);
    };

    const getEntityName = (plata: Plata) => {
        if (plata.familie_id) {
            const familie = (familii || []).find(f => f.id === plata.familie_id);
            return `Familia ${familie?.nume || 'N/A'}`;
        }
        if (plata.sportiv_id) {
            const s = (sportivi || []).find(sp => sp.id === plata.sportiv_id);
            return s ? `${s.nume} ${s.prenume}` : 'Sportiv Șters';
        }
        return 'N/A';
    };
    
    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
            <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Management Facturi & Plăți</h1>

             <Card className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {permissions.isSuperAdmin && (
                    <Select label="Filtrează Club" name="clubId" value={filter.clubId} onChange={e => setFilter(p => ({...p, clubId: e.target.value}))}>
                        <option value="">Toate Cluburile</option>
                        {(clubs || []).map(c => <option key={c.id} value={c.id}>{c.id === FEDERATIE_ID ? FEDERATIE_NAME : c.nume}</option>)}
                    </Select>
                )}
                 <Select label="Status" name="status" value={filter.status} onChange={e => setFilter(p => ({...p, status: e.target.value}))}>
                    <option value="scadent">Scadent (Neachitat/Parțial)</option>
                    <option value="Neachitat">Doar Neachitat</option>
                    <option value="Achitat Parțial">Doar Achitat Parțial</option>
                    <option value="Achitat">Achitat</option>
                    <option value="">Toate</option>
                </Select>
                <Select label="Tip Plată" name="tip" value={filter.tip} onChange={e => setFilter(p => ({...p, tip: e.target.value}))}>
                     <option value="">Toate Tipurile</option>
                     {[...new Set((plati || []).map(p=>p.tip))].sort().map(tip => <option key={tip} value={tip}>{tip}</option>)}
                </Select>
                <Select label="Sportiv" name="sportiv" value={filter.sportiv} onChange={e => setFilter(p => ({...p, sportiv: e.target.value}))}>
                    <option value="">Toți Sportivii</option>
                    {(sportivi || []).sort((a,b)=>a.nume.localeCompare(b.nume)).map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>)}
                </Select>
            </Card>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                 <Button onClick={handleGenerateSubscriptions} variant="info" isLoading={isGenerating}>Generează Abonamente Luna Curentă</Button>
                {selectedIds.size > 0 && (
                    <Button onClick={handleIncasareClick} variant="success">
                        <BanknotesIcon className="w-5 h-5 mr-2"/>
                        Încasează {selectedIds.size} facturi selectate
                    </Button>
                )}
            </div>

            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-700/50">
                            <tr>
                                <th className="p-3"><input type="checkbox" onChange={handleSelectAll} className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-brand-secondary focus:ring-brand-secondary" /></th>
                                <th className="p-3">Data</th><th className="p-3">Plătitor</th><th className="p-3">Descriere</th>
                                <th className="p-3 text-right">Sumă</th><th className="p-3 text-center">Status</th><th className="p-3 text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {platiCuDetalii.map(p => (
                                <tr key={p.id} className={`${selectedIds.has(p.id) ? 'bg-brand-primary/20' : ''}`}>
                                    <td className="p-3"><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => handleSelectRow(p.id)} className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-brand-secondary focus:ring-brand-secondary" /></td>
                                    <td className="p-3">{new Date(p.data).toLocaleDateString('ro-RO')}</td>
                                    <td className="p-3 font-medium text-white hover:text-brand-primary hover:underline cursor-pointer" onClick={() => { if(p.sportiv_id) onViewSportiv(sportivi.find(s=>s.id === p.sportiv_id)!) }}>{getEntityName(p)}</td>
                                    <td className="p-3"><div className="font-medium text-white">{p.descriereDetaliata}</div>{p.reducereDetalii && <div className="text-xs text-slate-400">Aplicat: {p.reducereDetalii.nume}</div>}</td>
                                    <td className="p-3 text-right">
                                        <div className="font-bold text-white">{p.suma.toFixed(2)} RON</div>
                                        {p.reducereDetalii && p.suma_initiala && (
                                            <div className="text-xs text-slate-400">
                                                <span className="line-through">{p.suma_initiala.toFixed(2)}</span>
                                                <span className="text-red-400 ml-1">(-{p.reducereDetalii.valoare.toFixed(2)})</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ p.status === 'Achitat' ? 'bg-green-100 text-green-800' : p.status === 'Achitat Parțial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{p.status}</span></td>
                                    <td className="p-3 text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="secondary" onClick={() => setEditingPlata(p)}><EditIcon className="w-4 h-4"/></Button><Button size="sm" variant="danger" onClick={() => setPlataToDelete(p)}><TrashIcon className="w-4 h-4"/></Button></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {platiCuDetalii.length === 0 && <p className="p-12 text-center text-slate-500 italic">Nicio factură de afișat conform filtrelor.</p>}
                </div>
            </Card>
            
            {editingPlata && (
                <Modal isOpen={!!editingPlata} onClose={() => setEditingPlata(null)} title="Editează Plată">
                    <div className="space-y-4"><Input label="Descriere" value={editingPlata.descriere} onChange={e => setEditingPlata({...editingPlata, descriere: e.target.value})} /><Input label="Sumă" type="number" value={editingPlata.suma} onChange={e => setEditingPlata({...editingPlata, suma: parseFloat(e.target.value) || 0})} /><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEditingPlata(null)}>Anulează</Button><Button variant="success" onClick={handleSaveEdit} isLoading={isSaving}>Salvează</Button></div></div>
                </Modal>
            )}
            <ConfirmDeleteModal isOpen={!!plataToDelete} onClose={() => setPlataToDelete(null)} onConfirm={() => { if(plataToDelete) confirmDelete(plataToDelete.id) }} tableName="Plată" isLoading={isDeleting} />
        </div>
    );
};
