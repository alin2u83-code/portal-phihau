import React, { useState, useMemo, useEffect } from 'react';
import { PretConfig, Sportiv, Grad } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon, SaveIcon, XIcon } from './icons';
import { getPretProdus } from '../utils/pricing';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

const emptyFormState: Omit<PretConfig, 'id' | 'valabil_de_la_data'> = { categorie: 'Taxa Examen', denumire_serviciu: '', suma: 0, specificatii: {} };

interface PretFormProps { isOpen: boolean; onClose: () => void; onSave: (pret: Omit<PretConfig, 'id'>, pretToEdit: PretConfig | null) => Promise<void>; pretToEdit: PretConfig | null; grade: Grad[]; }
const PretForm: React.FC<PretFormProps> = ({ isOpen, onClose, onSave, pretToEdit, grade }) => {
    const [formState, setFormState] = useState<Omit<PretConfig, 'id'>>({ ...emptyFormState, valabil_de_la_data: new Date().toISOString().split('T')[0] });
    const [loading, setLoading] = useState(false);
    
    React.useEffect(() => { 
        if (isOpen) {
            setFormState(pretToEdit ? { ...pretToEdit } : { ...emptyFormState, valabil_de_la_data: new Date().toISOString().split('T')[0] });
        }
    }, [pretToEdit, isOpen]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(p => ({ ...p, [name]: name === 'suma' ? parseFloat(value) : value }));
    };

    const handleSpecChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const isNumeric = name === 'inaltimeMin' || name === 'inaltimeMax';
        const processedValue = isNumeric ? (value ? parseInt(value) : undefined) : (value || undefined);
        
        setFormState(p => ({
            ...p,
            specificatii: { ...(p.specificatii || {}), [name]: processedValue }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => { 
        e.preventDefault(); 
        setLoading(true);
        await onSave(formState, pretToEdit);
        setLoading(false);
        onClose(); 
    };

    return ( <Modal isOpen={isOpen} onClose={onClose} title={pretToEdit ? "Editează Preț" : "Adaugă Preț Nou"}> <form onSubmit={handleSubmit} className="space-y-4"> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <Select label="Categorie" name="categorie" value={formState.categorie} onChange={handleChange} disabled={!!pretToEdit}> <option value="Taxa Examen">Taxa Examen</option> <option value="Taxa Stagiu">Taxa Stagiu</option> <option value="Taxa Competitie">Taxa Competiție</option> <option value="Echipament">Echipament</option> </Select> 
    {formState.categorie === 'Taxa Examen' ? (
        <Select label="Grad (Denumire Serviciu)" name="denumire_serviciu" value={formState.denumire_serviciu} onChange={handleChange} required>
            <option value="">Selectează grad...</option>
            {grade.sort((a, b) => a.ordine - b.ordine).map(g => <option key={g.id} value={g.nume}>{g.nume}</option>)}
        </Select>
    ) : (
        <Input label="Denumire Serviciu/Produs" name="denumire_serviciu" value={formState.denumire_serviciu} onChange={handleChange} required />
    )}
    </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <Input label="Sumă (RON)" name="suma" type="number" step="0.01" value={formState.suma} onChange={handleChange} required /> <Input label="Valabil de la Data" name="valabil_de_la_data" type="date" value={formState.valabil_de_la_data} onChange={handleChange} required /> </div> {formState.categorie === 'Echipament' && ( <div className="border-t border-slate-700 pt-4 mt-4"> <h3 className="text-lg font-semibold mb-2 text-white">Specificații Echipament</h3> <p className="text-sm text-slate-400 mb-4">Completați aceste câmpuri pentru a defini prețul pentru o anumită variantă de produs (interval de înălțime SAU mărime specifică).</p> <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <Input label="Înălțime Minimă (cm)" name="inaltimeMin" type="number" value={formState.specificatii?.inaltimeMin || ''} onChange={handleSpecChange} /> <Input label="Înălțime Maximă (cm)" name="inaltimeMax" type="number" value={formState.specificatii?.inaltimeMax || ''} onChange={handleSpecChange} /> <Select label="Mărime" name="marime" value={formState.specificatii?.marime || ''} onChange={handleSpecChange}> <option value="">N/A</option> <option value="S">S</option> <option value="M">M</option> <option value="L">L</option> <option value="XL">XL</option> </Select> </div> </div> )} <div className="flex justify-end pt-4 space-x-2"><Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button><Button variant="success" type="submit" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button></div> </form> </Modal> );
};

interface ConfigurarePreturiProps { preturi: PretConfig[]; setPreturi: React.Dispatch<React.SetStateAction<PretConfig[]>>; onBack: () => void; sportivi: Sportiv[]; grade: Grad[]; }
export const ConfigurarePreturi: React.FC<ConfigurarePreturiProps> = ({ preturi, setPreturi, onBack, sportivi, grade }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [pretToEditForAdd, setPretToEditForAdd] = useState<PretConfig | null>(null);
    const { showError, showSuccess } = useError();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingSuma, setEditingSuma] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [checkerSportivId, setCheckerSportivId] = useState('');
    const [checkerEchipament, setCheckerEchipament] = useState('');
    const [calculatedPriceInfo, setCalculatedPriceInfo] = useState<{ suma: number; marime: string } | null>(null);

    const handleSaveNew = async (pretData: Omit<PretConfig, 'id'>, pretToEdit: PretConfig | null) => {
        if (!supabase) { showError("Eroare Configurare", "Clientul Supabase nu a putut fi stabilit."); return; }
        let tableName: string;
        let dataToSave: any;
        const isTaxaExamen = pretData.categorie === 'Taxa Examen';

        if (isTaxaExamen) {
            tableName = 'grade_preturi_config';
            const grad = grade.find(g => g.nume === pretData.denumire_serviciu);
            if (!grad) { showError("Eroare", `Gradul "${pretData.denumire_serviciu}" nu a fost găsit.`); return; }
            dataToSave = { grad_id: grad.id, suma: pretData.suma, data_activare: pretData.valabil_de_la_data, is_activ: true };
        } else {
            tableName = 'preturi_config';
            dataToSave = pretData;
        }

        const { data, error } = await supabase.from(tableName).insert(dataToSave).select().single();
        if (error) { showError("Eroare la salvare", error); }
        else if (data) {
            const newPret = isTaxaExamen ? { ...pretData, id: data.id, suma: data.suma, valabil_de_la_data: data.data_activare } : data as PretConfig;
            setPreturi(prev => [...prev, newPret]);
            showSuccess("Succes", "Prețul a fost adăugat.");
        }
    };

    const handleEditClick = (pret: PretConfig) => {
        setEditingId(pret.id);
        setEditingSuma(String(pret.suma));
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingSuma('');
    };

    const handleSaveEdit = async (originalPret: PretConfig) => {
        if (!supabase) { showError("Eroare", "Client Supabase neinițializat."); return; }
        
        const newSuma = parseFloat(editingSuma);
        if (isNaN(newSuma) || newSuma < 0) {
            showError("Valoare invalidă", "Suma trebuie să fie un număr pozitiv.");
            return;
        }

        setIsSaving(true);
        try {
            if (originalPret.categorie === 'Taxa Examen') {
                const { error: updateError } = await supabase.from('grade_preturi_config').update({ is_activ: false }).eq('id', originalPret.id);
                if (updateError) throw updateError;

                const grad = grade.find(g => g.nume === originalPret.denumire_serviciu);
                if (!grad) throw new Error("Gradul asociat nu a fost găsit.");

                const { data: newPriceData, error: insertError } = await supabase.from('grade_preturi_config').insert({ grad_id: grad.id, suma: newSuma, data_activare: new Date().toISOString().split('T')[0], is_activ: true }).select().single();
                if (insertError) throw insertError;
                
                const newTransformedPrice: PretConfig = { id: newPriceData.id, categorie: 'Taxa Examen', denumire_serviciu: grad.nume, suma: newPriceData.suma, valabil_de_la_data: newPriceData.data_activare };
                setPreturi(prev => [...prev.filter(p => p.id !== originalPret.id), newTransformedPrice]);

            } else {
                const { data, error } = await supabase.from('preturi_config').update({ suma: newSuma }).eq('id', originalPret.id).select().single();
                if (error) throw error;
                setPreturi(prev => prev.map(p => (p.id === originalPret.id ? { ...p, suma: data.suma } : p)));
            }
            showSuccess("Succes", "Prețul a fost actualizat.");
            handleCancelEdit();
        } catch (err: any) {
            showError("Eroare la salvare", err);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async (id: string) => { 
        if(!supabase) return;
        const pretToDelete = preturi.find(p => p.id === id);
        if (!pretToDelete) { showError("Eroare", "Prețul de șters nu a fost găsit."); return; }

        if (window.confirm("Sunteți sigur că doriți să ștergeți această înregistrare? Acțiunea este ireversibilă.")) { 
            const tableName = pretToDelete.categorie === 'Taxa Examen' ? 'grade_preturi_config' : 'preturi_config';
            const { error } = await supabase.from(tableName).delete().eq('id', id);
            if(error) { showError(`Eroare la ștergere`, error); }
            else { 
                setPreturi(prev => prev.filter(p => p.id !== id)); 
                showSuccess("Succes", "Prețul a fost șters.");
            }
        } 
    };

    const formatSpecificatii = (s?: PretConfig['specificatii']) => {
        if (!s || Object.keys(s).length === 0) return 'N/A';
        const parts: string[] = [];
        if (s.inaltimeMin && s.inaltimeMax) parts.push(`${s.inaltimeMin}-${s.inaltimeMax}cm`);
        else if (s.inaltimeMin) parts.push(`> ${s.inaltimeMin}cm`);
        if (s.marime) parts.push(s.marime);
        return parts.join(', ') || 'Standard';
    };
    
    const echipamenteDisponibile = useMemo(() => [...new Set(preturi.filter(p => p.categorie === 'Echipament').map(p => p.denumire_serviciu))], [preturi]);

    useEffect(() => {
        if (checkerSportivId && checkerEchipament) {
            const sportiv = sportivi.find(s => s.id === checkerSportivId);
            if (sportiv && sportiv.inaltime) {
                const pretConfig = getPretProdus(preturi, 'Echipament', checkerEchipament, { inaltime: sportiv.inaltime });
                setCalculatedPriceInfo(pretConfig ? { suma: pretConfig.suma, marime: formatSpecificatii(pretConfig.specificatii) } : null);
            } else setCalculatedPriceInfo(null);
        } else setCalculatedPriceInfo(null);
    }, [checkerSportivId, checkerEchipament, sportivi, preturi]);
    
    const sortedTaxeExamen = useMemo(() => preturi.filter(p => p.categorie === 'Taxa Examen').sort((a,b) => (grade.find(g => g.nume === a.denumire_serviciu)?.ordine || 99) - (grade.find(g => g.nume === b.denumire_serviciu)?.ordine || 99)), [preturi, grade]);
    const sortedAltePreturi = useMemo(() => preturi.filter(p => p.categorie !== 'Taxa Examen').sort((a,b) => a.categorie.localeCompare(b.categorie) || a.denumire_serviciu.localeCompare(b.denumire_serviciu)), [preturi]);

    const renderPriceRow = (pret: PretConfig) => {
        const isEditing = editingId === pret.id;
        return (
            <tr key={pret.id} className="hover:bg-slate-700/50 transition-colors">
                <td className="p-3 font-medium text-white">{pret.denumire_serviciu}</td>
                <td className="p-3"><span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-600 text-slate-300">{pret.categorie}</span></td>
                <td className="p-3 text-slate-400">{formatSpecificatii(pret.specificatii)}</td>
                <td className="p-3 font-bold text-brand-secondary w-40">
                    {isEditing ? ( <Input type="number" value={editingSuma} onChange={e => setEditingSuma(e.target.value)} className="!py-1 w-28 bg-slate-900" autoFocus/> ) : ( `${pret.suma.toFixed(2)}` )}
                </td>
                <td className="p-3 text-slate-400">{new Date(pret.valabil_de_la_data).toLocaleDateString('ro-RO')}</td>
                <td className="p-3 text-right w-32">
                    <div className="flex items-center justify-end space-x-2">
                        {isEditing ? (
                            <>
                                <Button onClick={() => handleSaveEdit(pret)} variant="success" size="sm" isLoading={isSaving} title="Salvează"><SaveIcon className="w-4 h-4" /></Button>
                                <Button onClick={handleCancelEdit} variant="secondary" size="sm" title="Anulează"><XIcon className="w-4 h-4" /></Button>
                            </>
                        ) : (
                            <>
                                <Button onClick={() => handleEditClick(pret)} variant="primary" size="sm" title="Editează"><EditIcon className="w-4 h-4"/></Button>
                                <Button onClick={() => handleDelete(pret.id)} variant="danger" size="sm" title="Șterge"><TrashIcon className="w-4 h-4"/></Button>
                            </>
                        )}
                    </div>
                </td>
            </tr>
        );
    };

    return ( <div> <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
        <Card className="mb-6">
            <h3 className="text-xl font-bold text-white mb-2">Calculator Preț Echipament</h3>
            <p className="text-sm text-slate-400 mb-4">Selectează un sportiv și un produs pentru a vedea prețul calculat automat pe baza înălțimii din profil.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <Select label="Sportiv" value={checkerSportivId} onChange={e => setCheckerSportivId(e.target.value)}>
                    <option value="">Selectează sportiv...</option>
                    {sportivi.filter(s => s.status === 'Activ' && s.inaltime).map(s => (<option key={s.id} value={s.id}>{s.nume} {s.prenume} ({s.inaltime} cm)</option>))}
                </Select>
                <Select label="Produs Echipament" value={checkerEchipament} onChange={e => setCheckerEchipament(e.target.value)} disabled={!checkerSportivId}>
                    <option value="">Selectează produs...</option>
                    {echipamenteDisponibile.map(item => (<option key={item} value={item}>{item}</option>))}
                </Select>
                <div className="md:pl-4">
                    {calculatedPriceInfo ? ( <div><p className="text-sm text-slate-400">Preț Calculat:</p><p className="text-3xl font-bold text-green-400">{calculatedPriceInfo.suma.toFixed(2)} RON</p><p className="text-xs text-slate-400">Regula aplicată: {calculatedPriceInfo.marime}</p></div> ) : ( <p className="text-slate-400 text-sm">{checkerSportivId && checkerEchipament ? "Niciun preț găsit pentru înălțimea sportivului." : "Aștept selecție..."}</p> )}
                </div>
            </div>
        </Card>
    <div className="flex justify-between items-center mb-6"> <h1 className="text-3xl font-bold text-white">Configurare Prețuri</h1> <Button onClick={() => { setPretToEditForAdd(null); setIsFormOpen(true); }} variant="info"><PlusIcon className="w-5 h-5 mr-2" />Adaugă Preț</Button> </div> 
    <div className="bg-slate-800 rounded-lg shadow-lg overflow-x-auto">
        <table className="w-full text-left min-w-[800px] text-sm">
            <thead className="bg-slate-700 text-xs uppercase text-slate-400">
                <tr>
                    <th className="p-3 font-semibold">Denumire Serviciu</th>
                    <th className="p-3 font-semibold">Categorie</th>
                    <th className="p-3 font-semibold">Specificații</th>
                    <th className="p-3 font-semibold">Sumă (RON)</th>
                    <th className="p-3 font-semibold">Valabil De La</th>
                    <th className="p-3 font-semibold text-right">Acțiuni</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
                {sortedTaxeExamen.map(renderPriceRow)}
                {sortedTaxeExamen.length > 0 && sortedAltePreturi.length > 0 && (
                    <tr className="bg-slate-800/70"><td colSpan={6} className="py-2 px-3 text-xs font-bold text-slate-300 uppercase tracking-wider">Alte Categorii de Prețuri</td></tr>
                )}
                {sortedAltePreturi.map(renderPriceRow)}
                {(sortedTaxeExamen.length === 0 && sortedAltePreturi.length === 0) && <tr><td colSpan={6}><p className="p-4 text-center text-slate-400">Niciun preț configurat.</p></td></tr>}
            </tbody>
        </table>
    </div>
    <PretForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSaveNew} pretToEdit={pretToEditForAdd} grade={grade} /> 
    </div> );
};