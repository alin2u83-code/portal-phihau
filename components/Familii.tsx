import React, { useState, useMemo } from 'react';
import { Familie, Sportiv, TipAbonament, User, Grupa } from '../types';
import { Button, Input, Card, Select } from './ui';
import { PlusIcon, TrashIcon, ArrowLeftIcon, EditIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

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
}

export const FamiliiManagement: React.FC<FamiliiManagementProps> = ({
    familii, setFamilii, sportivi, setSportivi, onBack, isEmbedded = false, tipuriAbonament, grupe, currentUser
}) => {
    const [newFamilyName, setNewFamilyName] = useState('');
    const [selectedSportiv1, setSelectedSportiv1] = useState('');
    const [selectedSportiv2, setSelectedSportiv2] = useState('');
    const [salaFilter, setSalaFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const [toDelete, setToDelete] = useState<Familie | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { showError, showSuccess } = useError();
    
    const sali = useMemo(() => [...new Set(grupe.map(g => g.sala).filter(Boolean))], [grupe]);

    const sportiviNeasignati = useMemo(() => {
        let unassigned = sportivi.filter(s => !s.familie_id);
        if (salaFilter) {
            const grupaIdsInSala = new Set(grupe.filter(g => g.sala === salaFilter).map(g => g.id));
            unassigned = unassigned.filter(s => s.grupa_id && grupaIdsInSala.has(s.grupa_id));
        }
        return unassigned;
    }, [sportivi, salaFilter, grupe]);

    const sportiviSelect2 = useMemo(() => {
        return sportiviNeasignati.filter(s => s.id !== selectedSportiv1);
    }, [sportiviNeasignati, selectedSportiv1]);
    
    const handleCreateFamilyFromGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) { showError("Eroare Configurare", "Baza de date nu este disponibilă."); return; }
        if (!newFamilyName.trim() || !selectedSportiv1 || !selectedSportiv2) {
            showError("Date Incomplete", "Vă rugăm selectați doi sportivi și introduceți un nume pentru familie."); return;
        }

        setLoading(true);
        try {
            const { data: newFamily, error: familyError } = await supabase.from('familii').insert({ nume: newFamilyName.trim() }).select().single();
            if (familyError) throw familyError;

            const { data: updatedSportivi, error: sportiviError } = await supabase.from('sportivi').update({ familie_id: newFamily.id }).in('id', [selectedSportiv1, selectedSportiv2]).select();
            if (sportiviError) throw sportiviError;

            setFamilii(prev => [...prev, newFamily as Familie]);
            setSportivi(prev => prev.map(s => {
                const updated = updatedSportivi.find(u => u.id === s.id);
                return updated ? { ...s, familie_id: newFamily.id } : s;
            }));
            
            showSuccess("Succes!", `Familia "${newFamily.nume}" a fost creată.`);
            setNewFamilyName('');
            setSelectedSportiv1('');
            setSelectedSportiv2('');
        } catch (err: any) {
            showError("Eroare la Creare", err);
        } finally {
            setLoading(false);
        }
    };
    
    const handleEdit = async (id: string, updates: Partial<Familie>) => {
        if (!supabase) { showError("Eroare", "Baza de date nu este disponibilă."); return; }
        const { error } = await supabase.from('familii').update(updates).eq('id', id);
        if (error) { showError("Eroare la Salvare", error); } 
        else { setFamilii(prev => prev.map(f => (f.id === id ? { ...f, ...updates } : f))); }
    };

    const confirmDelete = async (id: string) => {
        if (!supabase) return;
        const membri = sportivi.filter(s => s.familie_id === id);
        if (membri.length > 0) {
            showError("Ștergere Blocată", `Nu puteți șterge familia deoarece conține ${membri.length} membri.`);
            setToDelete(null);
            return;
        }
        setIsDeleting(true);
        try {
            const { error } = await supabase.from('familii').delete().eq('id', id);
            if (error) throw error;
            setFamilii(prev => prev.filter(f => f.id !== id));
            showSuccess('Succes', 'Familia a fost ștearsă.');
        } catch (err: any) { showError("Eroare la Ștergere", err); } 
        finally { setIsDeleting(false); setToDelete(null); }
    };

    return (
        <div className="space-y-6">
            {!isEmbedded && onBack && <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>}
            {!isEmbedded && <h1 className="text-3xl font-bold text-white">Management Familii</h1>}

            <Card>
                <h3 className="text-xl font-bold text-white mb-4">Creează Familie prin Grupare</h3>
                <form onSubmit={handleCreateFamilyFromGroup} className="space-y-4">
                    <Select label="Filtru Sală/Filială (Opțional)" value={salaFilter} onChange={e => setSalaFilter(e.target.value)} className="!bg-navy-card-mobile !text-white">
                        <option value="">Toate sălile</option>
                        {sali.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select label="Selectează Sportiv 1" value={selectedSportiv1} onChange={e => setSelectedSportiv1(e.target.value)} required>
                            <option value="">Alege...</option>
                            {sportiviNeasignati.map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>)}
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
                        return (
                        <Card key={f.id} className="bg-light-navy">
                            <h4 className="font-bold text-white text-lg">{f.nume}</h4>
                            <p className="text-sm text-slate-300">Abonament: <span className="font-semibold">{abonament?.denumire || 'Automat'}</span></p>
                            <div className="mt-3 pt-3 border-t border-slate-700">
                                <h5 className="text-xs uppercase font-bold text-slate-400 mb-1">Membri ({membri.length})</h5>
                                <ul className="text-sm text-slate-200 list-disc list-inside">{membri.map(m => <li key={m.id}>{m.nume} {m.prenume}</li>)}</ul>
                            </div>
                             <div className="mt-4 flex gap-2">
                                <Button size="sm" variant="danger" onClick={() => setToDelete(f)} className="min-h-[44px]"><TrashIcon className="w-4 h-4"/></Button>
                            </div>
                        </Card>
                    )})}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block bg-light-navy rounded-lg overflow-hidden border border-slate-700">
                    <table className="w-full text-left">
                        <thead className="bg-light-navy text-blue-400 font-bold uppercase text-xs">
                            <tr><th className="p-3">Nume Familie</th><th className="p-3">Membri</th><th className="p-3">Tip Abonament</th><th className="p-3 text-right">Acțiuni</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {familii.map(f => {
                                const membri = sportivi.filter(s => s.familie_id === f.id);
                                return (
                                <tr key={f.id} className="bg-deep-navy text-white">
                                    <td className="p-2 w-1/3"><Input label="" defaultValue={f.nume} onBlur={e => handleEdit(f.id, { nume: e.target.value })} className="!bg-deep-navy"/></td>
                                    <td className="p-3 text-sm">{membri.map(m => `${m.nume} ${m.prenume}`).join(', ')}</td>
                                    <td className="p-2 w-72">
                                        <Select label="" value={f.tip_abonament_id || ''} onChange={(e) => handleEdit(f.id, { tip_abonament_id: e.target.value || null })} className="!bg-deep-navy text-sm">
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

            <ConfirmDeleteModal isOpen={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => { if(toDelete) confirmDelete(toDelete.id) }} tableName="Familii" isLoading={isDeleting} />
        </div>
    );
};