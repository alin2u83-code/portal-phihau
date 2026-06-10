import React, { useState } from 'react';
import { TipAbonament, User, Club, Permissions } from '../../types';
import { Button, Input, Card, Select, ConfirmModal } from '../ui';
import { PlusIcon, TrashIcon, ArrowLeftIcon } from '../icons';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { useIsMobile } from '../../hooks/useIsMobile';

interface TipuriAbonamentManagementProps {
    tipuriAbonament: TipAbonament[];
    setTipuriAbonament: React.Dispatch<React.SetStateAction<TipAbonament[]>>;
    onBack: () => void;
    currentUser: User | null;
    clubs: Club[];
    activeRoleContext?: any;
    permissions?: Permissions;
}

export const TipuriAbonamentManagement: React.FC<TipuriAbonamentManagementProps> = ({ tipuriAbonament, setTipuriAbonament, onBack, currentUser, clubs, activeRoleContext, permissions }) => {
    const [newDenumire, setNewDenumire] = useState('');
    const [newPret, setNewPret] = useState<number | string>('');
    const [newNrMembri, setNewNrMembri] = useState<number | string>(1);
    const [newClubId, setNewClubId] = useState('');
    const [loading, setLoading] = useState(false);
    const [toDelete, setToDelete] = useState<TipAbonament | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { showError, showSuccess } = useError();
    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; message: string; title?: string; confirmLabel?: string; variant?: 'danger' | 'warning' | 'info'; onConfirm: () => void }>({ open: false, message: '', onConfirm: () => {} });
    const openConfirm = (message: string, onConfirm: () => void, opts?: { title?: string; confirmLabel?: string; variant?: 'danger' | 'warning' | 'info' }) => setConfirmDialog({ open: true, message, onConfirm, ...opts });

    const isMobile = useIsMobile();
    const isFederationAdmin = permissions?.isFederationAdmin ?? currentUser?.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'ADMIN');
    // Club ID for club admins: from activeRoleContext or currentUser
    const effectiveClubId = activeRoleContext?.club_id || activeRoleContext?.club?.id || currentUser?.club_id;

    const doAdd = async (pretNum: number, nrMembriNum: number) => {
        const newAbonament: Omit<TipAbonament, 'id'> & { club_id?: string | null } = {
            denumire: newDenumire.trim(),
            pret: pretNum,
            numar_membri: nrMembriNum
        };

        if (isFederationAdmin) {
            newAbonament.club_id = newClubId || null;
        } else if (effectiveClubId) {
            newAbonament.club_id = effectiveClubId;
        }

        setLoading(true);
        const { data, error: insertError } = await supabase.from('tipuri_abonament').insert(newAbonament).select().single();
        setLoading(false);

        if (insertError) { showError("Eroare la adăugare", insertError); }
        else if (data) {
            setTipuriAbonament(prev => [...prev, data as TipAbonament]);
            setNewDenumire(''); setNewPret(''); setNewNrMembri(1); setNewClubId('');
            showSuccess("Succes", "Tipul de abonament a fost adăugat.");
        }
    };

    const handleAdd = () => {
        if (!supabase) { showError("Eroare Configurare", "Client Supabase neinițializat."); return; }

        const pretNum = typeof newPret === 'string' ? parseFloat(newPret) : newPret;
        const nrMembriNum = typeof newNrMembri === 'string' ? parseInt(newNrMembri) : newNrMembri;

        if (!newDenumire.trim()) { showError("Validare Eșuată", "Denumirea abonamentului este obligatorie."); return; }
        if (isNaN(pretNum) || pretNum <= 0) { showError("Validare Eșuată", "Prețul trebuie să fie un număr pozitiv valid."); return; }
        if (isNaN(nrMembriNum) || nrMembriNum <= 0) { showError("Validare Eșuată", "Numărul de membri trebuie să fie cel puțin 1."); return; }

        if (nrMembriNum > 1 && !newDenumire.toLowerCase().includes('familie')) {
            openConfirm("Ați introdus mai mult de 1 membru, dar denumirea nu conține 'Familie'. Doriți să continuați?", () => doAdd(pretNum, nrMembriNum), { title: 'Verificare denumire', confirmLabel: 'Continuă', variant: 'warning' });
            return;
        }

        doAdd(pretNum, nrMembriNum);
    };

    const handleEdit = async (id: string, field: keyof TipAbonament, value: string | number) => {
        if(!supabase) return;
        
        let finalValue = value;
        if (field === 'pret' || field === 'numar_membri') {
            const num = typeof value === 'string' ? (field === 'pret' ? parseFloat(value) : parseInt(value, 10)) : value as number;
            finalValue = isNaN(num) || num < 0 ? 0 : num;
        }

        const { error } = await supabase.from('tipuri_abonament').update({ [field]: finalValue }).eq('id', id);
        if (error) { showError("Eroare la salvare", error); } 
        else { setTipuriAbonament(prev => prev.map(ab => (ab.id === id ? { ...ab, [field]: finalValue } : ab))); }
    };

    const confirmDelete = async (id: string) => {
        if(!supabase) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase.from('tipuri_abonament').delete().eq('id', id);
            if (error) throw error;
            setTipuriAbonament(prev => prev.filter(ab => ab.id !== id));
            showSuccess('Succes', 'Tipul de abonament a fost șters.');
        } catch (err: any) {
            showError('Eroare la ștergere', err);
        } finally {
            setIsDeleting(false);
            setToDelete(null);
        }
    };
    
    const sortedAbonamente = [...tipuriAbonament].sort((a,b) => a.numar_membri - b.numar_membri);

    return (
        <div className="max-w-5xl mx-auto">
             <Button onClick={onBack} variant="secondary" className="mb-6">
                <ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu
             </Button>
            
            <h1 className="text-3xl font-bold text-white mb-6">Management Tipuri Abonament</h1>
            
            <Card className="mb-8 border-l-4 border-brand-secondary">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <PlusIcon className="w-5 h-5 text-brand-secondary" /> Definește Abonament Nou
                </h3>
                
                <div className={`grid grid-cols-1 md:grid-cols-${isFederationAdmin ? 5 : 4} gap-4 items-end`}>
                    {isFederationAdmin && (
                         <Select label="Club" value={newClubId} onChange={e => setNewClubId(e.target.value)}>
                            <option value="">Federație (General)</option>
                            {clubs.map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
                        </Select>
                    )}
                    <div className="md:col-span-2">
                        <Input label="Denumire (ex: Individual, Familie 2)" value={newDenumire} onChange={e => setNewDenumire(e.target.value)} placeholder="Introduceți numele..."/>
                    </div>
                    <Input label="Preț (RON)" type="number" step="0.01" value={newPret} onChange={e => setNewPret(e.target.value)} />
                    <Input label="Nr. Membri" type="number" min="1" value={newNrMembri} onChange={e => setNewNrMembri(e.target.value)} />
                </div>

                <div className="flex justify-end mt-6">
                    <Button onClick={handleAdd} variant="info" className="px-8 shadow-lg shadow-cyan-900/20" isLoading={loading}>
                        <PlusIcon className="w-5 h-5 mr-2"/> Adaugă în Listă
                    </Button>
                </div>
            </Card>

            <Card className="overflow-hidden p-0">
                <div className="bg-[var(--t-surface-2)] p-4 border-b border-[var(--t-border)]">
                    <h3 className="font-bold text-white">Nomenclator Abonamente Active</h3>
                </div>

                {/* Mobile/Tablet: Cards */}
                {isMobile ? (
                    <div className="p-3 space-y-3">
                        {sortedAbonamente.map(ab => (
                            <div key={ab.id} className="bg-[var(--t-surface-2)] rounded-xl border border-[var(--t-border)] p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <Input label="Denumire" value={ab.denumire}
                                            onBlur={e => handleEdit(ab.id, 'denumire', e.target.value)}
                                            onChange={e => setTipuriAbonament(prev => prev.map(a => a.id === ab.id ? {...a, denumire: e.target.value} : a))}
                                            className="bg-transparent border-slate-700 focus:bg-slate-700 font-semibold"/>
                                    </div>
                                    <Button onClick={() => setToDelete(ab)} variant="danger" size="sm" className="mt-5 flex-shrink-0">
                                        <TrashIcon className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Input label="Preț (RON)" type="number" step="0.01" value={ab.pret}
                                            onBlur={e => handleEdit(ab.id, 'pret', e.target.value)}
                                            onChange={e => setTipuriAbonament(prev => prev.map(a => a.id === ab.id ? {...a, pret: parseFloat(e.target.value) || 0} : a))}
                                            className="bg-transparent border-slate-700 text-brand-secondary font-bold"/>
                                    </div>
                                    <div>
                                        <Input label="Nr. Membri" type="number" min="1" value={ab.numar_membri}
                                            onBlur={e => handleEdit(ab.id, 'numar_membri', e.target.value)}
                                            onChange={e => setTipuriAbonament(prev => prev.map(a => a.id === ab.id ? {...a, numar_membri: parseInt(e.target.value) || 1} : a))}
                                            className="bg-transparent border-slate-700 text-center"/>
                                    </div>
                                </div>
                                {isFederationAdmin && (
                                    <p className="text-xs text-slate-400">
                                        Club: <span className="text-white font-medium">{clubs.find(c => c.id === ab.club_id)?.nume || 'Federație'}</span>
                                    </p>
                                )}
                            </div>
                        ))}
                        {tipuriAbonament.length === 0 && (
                            <div className="p-8 text-center text-slate-500 italic">Nu există tipuri de abonament definite.</div>
                        )}
                    </div>
                ) : (
                    /* Desktop: Table */
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[700px]">
                            <thead className="bg-slate-700/30 text-slate-400 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="p-4 font-semibold">Denumire</th>
                                    {isFederationAdmin && <th className="p-4 font-semibold">Club</th>}
                                    <th className="p-4 font-semibold text-center">Membri Alocați</th>
                                    <th className="p-4 font-semibold">Tarif Lunar</th>
                                    <th className="p-4 font-semibold text-right">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {sortedAbonamente.map(ab => (
                                    <tr key={ab.id} className="hover:bg-slate-700/20 transition-colors">
                                        <td className="p-3">
                                            <Input label="" value={ab.denumire} onBlur={e => handleEdit(ab.id, 'denumire', e.target.value)} onChange={e => setTipuriAbonament(prev => prev.map(a => a.id === ab.id ? {...a, denumire: e.target.value} : a))} className="bg-transparent border-slate-700 focus:bg-slate-700"/>
                                        </td>
                                        {isFederationAdmin && (
                                            <td className="p-3 text-xs">
                                                {clubs.find(c => c.id === ab.club_id)?.nume || 'Federație'}
                                            </td>
                                        )}
                                        <td className="p-3">
                                            <Input label="" type="number" min="1" value={ab.numar_membri} onBlur={e => handleEdit(ab.id, 'numar_membri', e.target.value)} onChange={e => setTipuriAbonament(prev => prev.map(a => a.id === ab.id ? {...a, numar_membri: parseInt(e.target.value) || 1} : a))} className="w-24 mx-auto text-center bg-transparent border-slate-700"/>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <Input label="" type="number" step="0.01" value={ab.pret} onBlur={e => handleEdit(ab.id, 'pret', e.target.value)} onChange={e => setTipuriAbonament(prev => prev.map(a => a.id === ab.id ? {...a, pret: parseFloat(e.target.value) || 0} : a))} className="w-32 bg-transparent border-slate-700 text-brand-secondary font-bold"/>
                                                <span className="text-slate-500 text-xs">RON</span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-right w-32">
                                            <Button onClick={() => setToDelete(ab)} variant="danger" size="sm" className="opacity-60 hover:opacity-100 transition-opacity" title="Șterge acest tip">
                                                <TrashIcon className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {tipuriAbonament.length === 0 && <div className="p-12 text-center text-[var(--t-text-muted)] italic bg-[var(--t-surface-2)]">Nu există tipuri de abonament definite. Folosiți formularul de mai sus pentru a începe.</div>}
                    </div>
                )}
            </Card>

            <div className="mt-8 bg-[var(--t-surface-2)] p-4 rounded-lg border border-[var(--t-border)]">
                <h4 className="text-sm font-bold text-slate-400 uppercase mb-2">Ghid de utilizare</h4>
                <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
                    <li>Abonamentele <strong>Individuale</strong> trebuie să aibă Nr. Membri setat la <strong>1</strong>.</li>
                    <li>Abonamentele de <strong>Familie</strong> trebuie să aibă Nr. Membri setat la <strong>2 sau mai mult</strong>.</li>
                    <li>Sistemul de generare automată a plăților folosește aceste configurații pentru a calcula restanțele lunare.</li>
                </ul>
            </div>
            <ConfirmDeleteModal isOpen={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => { if(toDelete) confirmDelete(toDelete.id) }} tableName="Tipuri Abonament" isLoading={isDeleting} />
            <ConfirmModal
                isOpen={confirmDialog.open}
                onClose={() => setConfirmDialog(d => ({ ...d, open: false }))}
                onConfirm={confirmDialog.onConfirm}
                message={confirmDialog.message}
                title={confirmDialog.title}
                confirmLabel={confirmDialog.confirmLabel}
                variant={confirmDialog.variant}
            />
        </div>
    );
};