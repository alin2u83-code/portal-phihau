import React, { useState } from 'react';
import { Reducere } from '../../types';
import { Button, Input, Card, Select, Modal, SearchableSelect } from '../ui';
import { PlusIcon, TrashIcon, ArrowLeftIcon, EditIcon } from '../icons';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { useData } from '../../contexts/DataContext';
import { useReduceriSportiv } from '../../hooks/useReduceriSportiv';
import { seteazaReducereSportiv } from '../../services/reduceriSportivService';

interface ReduceriManagementProps {
    reduceri: Reducere[];
    setReduceri: React.Dispatch<React.SetStateAction<Reducere[]>>;
    onBack: () => void;
    /** Faza 31 — ascuns cand e montat in hub-ul Plăți & Facturi */
    hideBackButton?: boolean;
}

const initialFormState: Omit<Reducere, 'id'> = {
    nume: '',
    tip: 'procent',
    valoare: 0,
    este_activa: true,
    categorie_aplicabila: 'Toate'
};

export const ReduceriManagement: React.FC<ReduceriManagementProps> = ({ reduceri, setReduceri, onBack, hideBackButton }) => {
    const [formState, setFormState] = useState(initialFormState);
    const [editingReducere, setEditingReducere] = useState<Reducere | null>(null);
    const [toDelete, setToDelete] = useState<Reducere | null>(null);
    const [loading, setLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { showError, showSuccess } = useError();
    const { activeRoleContext, filteredData } = useData();
    const clubId: string | null = activeRoleContext?.club_id ?? null;
    const { reduceriPeSportiv, invalideaza } = useReduceriSportiv(clubId);
    const [sportivAles, setSportivAles] = useState('');
    const [reducereAleasa, setReducereAleasa] = useState('');
    const [atribuie, setAtribuie] = useState(false);

    const sportiviClub = (filteredData.sportivi || []).filter(s => s.status === 'Activ');
    const numeSportiv = (id: string) => { const s = (filteredData.sportivi || []).find(x => x.id === id); return s ? `${s.nume} ${s.prenume}` : id; };

    const handleAtribuie = async () => {
        if (!sportivAles || !reducereAleasa) { showError("Validare Eșuată", "Alege sportivul și reducerea."); return; }
        setAtribuie(true);
        const { error } = await seteazaReducereSportiv(sportivAles, reducereAleasa);
        setAtribuie(false);
        if (error) { showError("Eroare la atribuire", error); return; }
        invalideaza();
        setSportivAles(''); setReducereAleasa('');
        showSuccess("Succes", "Reducerea a fost atribuită sportivului.");
    };

    const handleScoate = async (sportivId: string) => {
        const { error } = await seteazaReducereSportiv(sportivId, null);
        if (error) { showError("Eroare la scoatere", error); return; }
        invalideaza();
        showSuccess("Succes", "Reducerea a fost scoasă.");
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
             const { checked } = e.target as HTMLInputElement;
             setFormState(p => ({ ...p, [name]: checked }));
        } else {
             setFormState(p => ({ ...p, [name]: (name === 'valoare' ? parseFloat(value) || 0 : value) }));
        }
    };
    
    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) { showError("Eroare Configurare", "Client Supabase neinițializat."); return; }
        if (!formState.nume.trim()) { showError("Validare Eșuată", "Numele este obligatoriu."); return; }
        
        if (!clubId) { showError("Club lipsă", "Reducerile se creează la nivel de club. Alege un context de club (ADMIN_CLUB)."); return; }

        setLoading(true);
        const { data, error } = await supabase.from('reduceri').insert({ ...formState, club_id: clubId }).select().single();
        setLoading(false);
        
        if(error) { showError("Eroare la adăugare", error); }
        else if (data) {
            setReduceri(prev => [...prev, data as Reducere]);
            setFormState(initialFormState);
            showSuccess("Succes", "Reducerea a fost adăugată.");
        }
    };
    
     const handleSaveEdit = async () => {
        if (!editingReducere || !supabase) return;
        setLoading(true);
        const { id, ...updates } = editingReducere;
        try {
            const { data, error } = await supabase.from('reduceri').update(updates).eq('id', id).select().single();
            if (error) throw error;
            if (data) {
                setReduceri(p => p.map(r => r.id === id ? data as Reducere : r));
                invalideaza();
                setEditingReducere(null);
                showSuccess("Succes", "Modificările au fost salvate.");
            }
        } catch (err) {
            showError("Eroare la salvare", err);
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = async (id: string) => {
        if(!supabase) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase.from('reduceri').delete().eq('id', id);
            if (error) throw error;
            setReduceri(prev => prev.filter(r => r.id !== id));
            invalideaza(); // atribuirile reducerii șterse dispar în cascadă (reduceri_sportiv)
            showSuccess('Succes', 'Reducerea a fost ștearsă.');
        } catch (err: any) {
            showError('Eroare la ștergere', err);
        } finally {
            setIsDeleting(false);
            setToDelete(null);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
             {!hideBackButton && (
                <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
             )}
            <h1 className="text-3xl font-bold text-white">Management Reduceri</h1>

            <Card className="border-l-4 border-brand-secondary">
                 <h3 className="text-xl font-bold text-white mb-4">Adaugă Reducere Nouă</h3>
                 <form onSubmit={handleAdd} className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Nume Reducere" name="nume" value={formState.nume} onChange={handleChange} placeholder="ex: Reducere Familie" required/>
                        <Select label="Tip Reducere" name="tip" value={formState.tip} onChange={handleChange}>
                            <option value="procent">Procent (%)</option>
                            <option value="suma_fixa">Sumă Fixă (RON)</option>
                        </Select>
                        <Input label="Valoare" type="number" name="valoare" value={formState.valoare} onChange={handleChange} required/>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                         <Select label="Se aplică la" name="categorie_aplicabila" value={formState.categorie_aplicabila} onChange={handleChange}>
                            <option value="Toate">Toate</option>
                            <option value="Abonament">Abonament</option>
                            <option value="Echipament">Echipament</option>
                        </Select>
                        <label className="flex items-center space-x-2 pt-5 cursor-pointer"><input type="checkbox" name="este_activa" checked={formState.este_activa} onChange={handleChange} className="h-4 w-4 rounded" /><span>Activă</span></label>
                        <Button type="submit" variant="info" isLoading={loading}><PlusIcon className="w-5 h-5 mr-2"/> Adaugă</Button>
                     </div>
                 </form>
            </Card>

            <Card className="p-0 overflow-hidden">
                <div className="p-4 bg-slate-700/50 font-bold text-white">Listă Reduceri Active</div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[700px] text-sm">
                        <thead className="bg-slate-700/30 text-slate-400 text-xs uppercase"><tr><th className="p-3">Nume</th><th className="p-3">Valoare</th><th className="p-3">Categorie</th><th className="p-3 text-center">Status</th><th className="p-3 text-right">Acțiuni</th></tr></thead>
                        <tbody className="divide-y divide-slate-700">
                            {reduceri.map(r => (
                                <tr key={r.id}>
                                    <td className="p-3 font-semibold">{r.nume}</td>
                                    <td className="p-3 font-bold text-brand-secondary">{r.tip === 'procent' ? `${r.valoare}%` : `${r.valoare.toFixed(2)} RON`}</td>
                                    <td className="p-3">{r.categorie_aplicabila}</td>
                                    <td className="p-3 text-center"><span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${r.este_activa ? 'bg-green-600/30 text-green-400' : 'bg-slate-600/30 text-slate-400'}`}>{r.este_activa ? 'Activă' : 'Inactivă'}</span></td>
                                    <td className="p-3 text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="secondary" onClick={() => setEditingReducere(r)}><EditIcon className="w-4 h-4"/></Button><Button size="sm" variant="danger" onClick={() => setToDelete(r)}><TrashIcon className="w-4 h-4"/></Button></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </Card>

            <Card className="border-l-4 border-brand-secondary">
                <h3 className="text-xl font-bold text-white mb-1">Reduceri atribuite sportivilor</h3>
                <p className="text-sm text-slate-400 mb-4">Reducerea atribuită se aplică automat la abonamentele noi ale sportivului (la abonament de familie, pe factura familiei). Un sportiv are cel mult o reducere activă.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <SearchableSelect
                        label="Sportiv"
                        value={sportivAles}
                        onChange={setSportivAles}
                        options={sportiviClub.map(s => ({ value: s.id, label: `${s.nume} ${s.prenume}` }))}
                        placeholder="Caută sportiv..."
                    />
                    <Select label="Reducere" value={reducereAleasa} onChange={e => setReducereAleasa(e.target.value)}>
                        <option value="">Alege reducerea</option>
                        {reduceri.filter(r => r.este_activa).map(r => <option key={r.id} value={r.id}>{r.nume} ({r.tip === 'procent' ? `${r.valoare}%` : `${r.valoare} RON`})</option>)}
                    </Select>
                    <Button type="button" variant="info" onClick={handleAtribuie} isLoading={atribuie}><PlusIcon className="w-5 h-5 mr-2"/> Atribuie</Button>
                </div>
                <div className="mt-4 divide-y divide-slate-700">
                    {[...reduceriPeSportiv.entries()].map(([sportivId, r]) => (
                        <div key={sportivId} className="flex items-center justify-between py-2 text-sm">
                            <span className="font-semibold text-white">{numeSportiv(sportivId)}</span>
                            <span className="text-brand-secondary font-bold">{r.nume} — {r.tip === 'procent' ? `${r.valoare}%` : `${r.valoare} RON`}</span>
                            <Button size="sm" variant="danger" onClick={() => handleScoate(sportivId)}><TrashIcon className="w-4 h-4"/></Button>
                        </div>
                    ))}
                    {reduceriPeSportiv.size === 0 && <p className="text-sm text-slate-500 py-2">Nicio reducere atribuită.</p>}
                </div>
            </Card>

            <Modal isOpen={!!editingReducere} onClose={() => setEditingReducere(null)} title="Editează reducerea">
                {editingReducere && (
                    <div className="space-y-4">
                        <Input label="Nume Reducere" value={editingReducere.nume} onChange={e => setEditingReducere({ ...editingReducere, nume: e.target.value })} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Select label="Tip Reducere" value={editingReducere.tip} onChange={e => setEditingReducere({ ...editingReducere, tip: e.target.value as Reducere['tip'] })}>
                                <option value="procent">Procent (%)</option>
                                <option value="suma_fixa">Sumă Fixă (RON)</option>
                            </Select>
                            <Input label="Valoare" type="number" value={editingReducere.valoare} onChange={e => setEditingReducere({ ...editingReducere, valoare: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <Select label="Se aplică la" value={editingReducere.categorie_aplicabila} onChange={e => setEditingReducere({ ...editingReducere, categorie_aplicabila: e.target.value as Reducere['categorie_aplicabila'] })}>
                            <option value="Toate">Toate</option>
                            <option value="Abonament">Abonament</option>
                            <option value="Echipament">Echipament</option>
                        </Select>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={editingReducere.este_activa} onChange={e => setEditingReducere({ ...editingReducere, este_activa: e.target.checked })} className="h-4 w-4 rounded" /><span>Activă</span></label>
                        <p className="text-xs text-slate-500">Modificarea afectează doar facturile noi; cele emise rămân neschimbate.</p>
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setEditingReducere(null)}>Anulează</Button>
                            <Button variant="success" onClick={handleSaveEdit} isLoading={loading}>Salvează</Button>
                        </div>
                    </div>
                )}
            </Modal>

            <ConfirmDeleteModal isOpen={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => { if(toDelete) confirmDelete(toDelete.id) }} tableName="Reducere" isLoading={isDeleting} />
        </div>
    );
};