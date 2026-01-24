import React, { useState, useMemo, useEffect } from 'react';
import { Plata, Sportiv, PretConfig, TipAbonament, Tranzactie, Familie, Reducere, TipPlata, User } from '../types';
import { Button, Input, Select, Card, Modal } from './ui';
import { getPretValabil, getPretProdus } from '../utils/pricing';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

const QuickAddTipPlataModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (name: string) => Promise<any>; 
}> = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const { showError } = useError();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        setLoading(true);
        try {
            await onSave(trimmed);
            setName('');
            onClose();
        } catch (err) {
            showError("Eroare Adăugare", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Adaugă Tip de Plată Nou">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Nume Tip Plată" value={name} onChange={e => setName(e.target.value)} required disabled={loading} />
                <div className="flex justify-end pt-2 gap-2">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button type="submit" variant="primary" isLoading={loading}>Adaugă</Button>
                </div>
            </form>
        </Modal>
    );
};

interface JurnalIncasariProps {
    currentUser: User;
    plati: Plata[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    sportivi: Sportiv[];
    familii: Familie[];
    preturiConfig: PretConfig[];
    tipuriAbonament: TipAbonament[];
    tipuriPlati: TipPlata[];
    setTipuriPlati: React.Dispatch<React.SetStateAction<TipPlata[]>>;
    tranzactii: Tranzactie[];
    setTranzactii: React.Dispatch<React.SetStateAction<Tranzactie[]>>;
    platiInitiale: Plata[];
    onIncasareProcesata: () => void;
    onBack: () => void;
    reduceri: Reducere[];
}

const emptyIncasareState = {
    sportiv_id: '',
    familie_id: null,
    suma: 0,
    suma_initiala: 0,
    reducere_id: null as string | null,
    metoda_plata: 'Cash' as 'Cash' | 'Transfer Bancar',
    data_platii: new Date().toISOString().split('T')[0],
    tip: 'Abonament',
    descriere: '',
    observatii: ''
};

const formatMarime = (pret: PretConfig) => {
    if (!pret.specificatii) return 'Mărime Standard';
    if (pret.specificatii.marime) return pret.specificatii.marime;
    if (pret.specificatii.inaltimeMin && pret.specificatii.inaltimeMax) return `${pret.specificatii.inaltimeMin}-${pret.specificatii.inaltimeMax}cm`;
    if (pret.specificatii.inaltimeMin) return `> ${pret.specificatii.inaltimeMin}cm`;
    return 'Mărime Standard';
};

const AdaugaAvans: React.FC<{
    sportivi: Sportiv[];
    familii: Familie[];
    setTranzactii: React.Dispatch<React.SetStateAction<Tranzactie[]>>;
}> = ({ sportivi, familii, setTranzactii }) => {
    const [familieId, setFamilieId] = useState('');
    const [suma, setSuma] = useState<number | string>('');
    const [metodaPlata, setMetodaPlata] = useState<'Cash' | 'Transfer Bancar'>('Cash');
    const [dataPlatii, setDataPlatii] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const { showError, showSuccess } = useError();

    const handleSaveAvans = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!familieId || !suma || +suma <= 0) {
            showError("Date Incomplete", "Vă rugăm selectați familia și introduceți o sumă validă.");
            return;
        }

        const familieSelectata = familii.find(f => f.id === familieId);
        if (!familieSelectata) return;

        setLoading(true);
        const newTranzactie: Omit<Tranzactie, 'id'> = {
            plata_ids: [],
            sportiv_id: null,
            familie_id: familieId,
            suma: +suma,
            data_platii: dataPlatii,
            metoda_plata: metodaPlata,
            descriere: `Plată în avans Familia ${familieSelectata.nume}`
        };

        const { data, error } = await supabase.from('tranzactii').insert(newTranzactie).select().single();
        setLoading(false);

        if (error) {
            showError("Eroare la Salvare", error);
        } else if (data) {
            setTranzactii(prev => [...prev, data as Tranzactie]);
            showSuccess("Succes!", "Plata în avans a fost înregistrată.");
            setFamilieId('');
            setSuma('');
        }
    };

    return (
        <Card className="bg-navy-card-mobile md:bg-light-navy">
            <h3 className="text-xl font-bold text-white mb-4">Adaugă Sumă în Avans</h3>
            <form onSubmit={handleSaveAvans} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select label="Pentru Familia" value={familieId} onChange={e => setFamilieId(e.target.value)} required>
                        <option value="">Selectează...</option>
                        {familii.map(f => <option key={f.id} value={f.id}>{f.nume}</option>)}
                    </Select>
                    <Input label="Sumă Avans (RON)" type="number" step="0.01" value={suma} onChange={e => setSuma(e.target.value)} required />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Data Plății" type="date" value={dataPlatii} onChange={e => setDataPlatii(e.target.value)} required />
                    <Select label="Metoda de Plată" value={metodaPlata} onChange={e => setMetodaPlata(e.target.value as any)}>
                         <option value="Cash">Cash</option>
                         <option value="Transfer Bancar">Transfer Bancar</option>
                    </Select>
                </div>
                <div className="flex justify-end pt-2">
                    <Button type="submit" variant="success" isLoading={loading}><PlusIcon className="w-5 h-5 mr-2" /> Înregistrează Avans</Button>
                </div>
            </form>
        </Card>
    );
};


export const JurnalIncasari: React.FC<JurnalIncasariProps> = ({ currentUser, plati, setPlati, sportivi, familii, preturiConfig, tipuriAbonament, tipuriPlati, setTipuriPlati, tranzactii, setTranzactii, reduceri, platiInitiale, onIncasareProcesata, onBack }) => {
    const [formState, setFormState] = useState(emptyIncasareState);
    const [selectedEchipament, setSelectedEchipament] = useState('');
    const [selectedMarimeId, setSelectedMarimeId] = useState('');
    const [loading, setLoading] = useState(false);
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const { showError, showSuccess } = useError();
    const [tranzactieToDelete, setTranzactieToDelete] = useState<Tranzactie | null>(null);

    const isMultiple = platiInitiale.length > 1;

    const echipamenteDisponibile = useMemo(() => [...new Set(preturiConfig.filter(p => p.categorie === 'Echipament').map(p => p.denumire_serviciu))], [preturiConfig]);
    const marimiDisponibile = useMemo(() => preturiConfig.filter(p => p.categorie === 'Echipament' && p.denumire_serviciu === selectedEchipament), [preturiConfig, selectedEchipament]);
    const reducereAplicata = useMemo(() => formState.reducere_id ? reduceri.find(r => r.id === formState.reducere_id) : null, [formState.reducere_id, reduceri]);


    useEffect(() => {
        if (platiInitiale.length > 0) {
            const totalSuma = platiInitiale.reduce((acc, p) => acc + p.suma, 0);
            const commonDesc = isMultiple ? `Încasare multiplă (${platiInitiale.length} elemente)` : platiInitiale[0].descriere;
            
            setFormState({
                ...emptyIncasareState,
                sportiv_id: platiInitiale[0].sportiv_id || '',
                familie_id: platiInitiale[0].familie_id,
                suma: totalSuma,
                suma_initiala: totalSuma,
                tip: platiInitiale[0].tip,
                descriere: commonDesc,
            });
        } else {
            setFormState(emptyIncasareState);
        }
    }, [platiInitiale, isMultiple]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'tip' && value !== 'Echipament') setSelectedEchipament('');
        setFormState(prev => ({ ...prev, [name]: value as any }));
    };

    const handleQuickAddTipPlata = async (nume: string) => {
        const { data, error } = await supabase.from('tipuri_plati').insert({ nume, is_system_type: false }).select().single();
        if (error) throw error;
        setTipuriPlati(prev => [...prev, data as TipPlata]);
        setFormState(p => ({ ...p, tip: data.nume }));
    };

    useEffect(() => {
        if (formState.tip === 'Echipament' && formState.sportiv_id && selectedEchipament && !isMultiple) {
            const sportiv = sportivi.find(s => s.id === formState.sportiv_id);
            if (sportiv?.inaltime) {
                const pretConfigPotrivit = getPretProdus(preturiConfig, 'Echipament', selectedEchipament, { inaltime: sportiv.inaltime });
                if (pretConfigPotrivit) setSelectedMarimeId(pretConfigPotrivit.id);
            }
        }
    }, [formState.sportiv_id, selectedEchipament, formState.tip, sportivi, preturiConfig, isMultiple]);

    useEffect(() => {
        if (platiInitiale.length > 0) return; 

        const sportiv = sportivi.find(s => s.id === formState.sportiv_id);
        if (!sportiv) { setFormState(prev => ({...prev, suma: 0, suma_initiala: 0, reducere_id: null, descriere: ''})); return; }
        
        const lunaText = new Date(formState.data_platii || new Date()).toLocaleString('ro-RO', { month: 'long', year: 'numeric'});
        const systemTypesForAutoCalc: PretConfig['categorie'][] = ['Taxa Examen', 'Taxa Stagiu', 'Taxa Competitie', 'Echipament'];
        let calculatedPrice = 0;
        let description = '';

        if (formState.tip === 'Abonament') {
            let config;
            if (sportiv.familie_id) {
                const nr = sportivi.filter(s => s.familie_id === sportiv.familie_id && s.status === 'Activ').length;
                config = tipuriAbonament.find(ab => ab.numar_membri === nr) || tipuriAbonament.find(ab => ab.numar_membri === 1);
            } else {
                config = tipuriAbonament.find(ab => ab.id === sportiv.tip_abonament_id);
            }
            calculatedPrice = config?.pret || 0;
            description = config ? `Abonament ${config.denumire} ${lunaText}` : '';
        } else if (formState.tip === 'Echipament' && selectedMarimeId) {
            const config = preturiConfig.find(p => p.id === selectedMarimeId);
            if (config) {
                calculatedPrice = config.suma;
                description = `${config.denumire_serviciu} (${formatMarime(config)})`;
            }
        } else if (systemTypesForAutoCalc.includes(formState.tip as any)) {
            const config = getPretValabil(preturiConfig, formState.tip as any, formState.data_platii!);
            calculatedPrice = config?.suma || 0;
            description = config?.denumire_serviciu || '';
        }
        
        // --- NOU: Calcul Reducere ---
        let appliedDiscount: Reducere | null = null;
        let finalPrice = calculatedPrice;

        const activeDiscounts = reduceri.filter(r => r.este_activa && (r.categorie_aplicabila === formState.tip || r.categorie_aplicabila === 'Toate'));
        if (activeDiscounts.length > 0) {
            appliedDiscount = activeDiscounts[0]; // Simplificare: luăm prima reducere aplicabilă
            if (appliedDiscount.tip === 'procent') {
                finalPrice = calculatedPrice * (1 - appliedDiscount.valoare / 100);
            } else { // suma_fixa
                finalPrice = Math.max(0, calculatedPrice - appliedDiscount.valoare);
            }
        }
        
        setFormState(prev => ({ 
            ...prev, 
            suma: finalPrice, 
            suma_initiala: calculatedPrice,
            reducere_id: appliedDiscount?.id || null,
            descriere: description,
        }));

    }, [formState.sportiv_id, formState.tip, selectedMarimeId, formState.data_platii, sportivi, preturiConfig, tipuriAbonament, platiInitiale, reduceri]);

    const handleSaveIncasare = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;
        setLoading(true);
        let tranzactieId: string | null = null;
        let newPlataId: string | null = null;

        try {
            if (platiInitiale.length > 0) {
                const idsToUpdate = platiInitiale.map(p => p.id);

                const { data: currentPlati, error: fetchError } = await supabase.from('plati').select('id, descriere, status').in('id', idsToUpdate);
                if (fetchError) throw new Error("Nu am putut verifica statusul curent al facturilor.");

                const alreadyPaid = currentPlati?.filter(p => p.status === 'Achitat');
                if (alreadyPaid && alreadyPaid.length > 0) {
                    throw new Error(`Plată Blocată: Factura "${alreadyPaid[0].descriere}" este deja achitată.`);
                }
                
                const { data: tx, error: txError } = await supabase.from('tranzactii').insert({ plata_ids: idsToUpdate, sportiv_id: formState.sportiv_id || platiInitiale[0]?.sportiv_id, familie_id: formState.familie_id || platiInitiale[0]?.familie_id, suma: formState.suma, data_platii: formState.data_platii!, metoda_plata: formState.metoda_plata! }).select().single();
                if (txError) throw txError;
                tranzactieId = (tx as Tranzactie).id;
                const { error: updateError } = await supabase.from('plati').update({ status: 'Achitat' }).in('id', idsToUpdate);
                if (updateError) throw updateError;
                setPlati(prevPlati => prevPlati.map(plata => idsToUpdate.includes(plata.id) ? { ...plata, status: 'Achitat' } : plata));
                setTranzactii(prev => [...prev, tx as Tranzactie]);
                showSuccess('Succes', `Încasare confirmată! ${idsToUpdate.length} datorii stinse.`);
            } else {
                const sportiv = sportivi.find(s => s.id === formState.sportiv_id);
                const { data: newPlata, error: plataError } = await supabase.from('plati').insert({ sportiv_id: formState.sportiv_id, familie_id: sportiv?.familie_id, suma: formState.suma, suma_initiala: formState.suma_initiala > 0 ? formState.suma_initiala : null, reducere_id: formState.reducere_id, data: formState.data_platii!, status: 'Achitat', descriere: formState.descriere, tip: formState.tip, observatii: formState.observatii }).select().single();
                if (plataError) throw plataError;
                newPlataId = (newPlata as Plata).id;
                const { data: tx, error: txError } = await supabase.from('tranzactii').insert({ plata_ids: [newPlataId], sportiv_id: formState.sportiv_id, familie_id: sportiv?.familie_id, suma: formState.suma, data_platii: formState.data_platii!, metoda_plata: formState.metoda_plata! }).select().single();
                if (txError) throw txError;
                tranzactieId = (tx as Tranzactie).id;
                setPlati(prev => [...prev, newPlata as Plata]);
                setTranzactii(prev => [...prev, tx as Tranzactie]);
                showSuccess('Succes', `Încasare directă de ${formState.suma.toFixed(2)} RON înregistrată.`);
            }
            onIncasareProcesata();
            setTimeout(() => onBack(), 1500);
        } catch (err: any) {
            let detailedMessage = err.message || err;
            if (String(detailedMessage).includes('plati_tip_check')) { detailedMessage = `Tipul de plată selectat ('${formState.tip}') nu este permis. Actualizați constrângerea bazei de date. (${detailedMessage})`; }
            showError("Eroare la procesarea încasării", detailedMessage);
            if (tranzactieId) { await supabase.from('tranzactii').delete().eq('id', tranzactieId); }
            if (newPlataId) { await supabase.from('plati').delete().eq('id', newPlataId); }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTranzactie = async () => {
        if (!tranzactieToDelete || !supabase) return;
        setLoading(true);

        try {
            const { plata_ids, id: tranzactieId } = tranzactieToDelete;
            if (plata_ids && plata_ids.length > 0) {
                const { error: updateError } = await supabase.from('plati').update({ status: 'Neachitat' }).in('id', plata_ids);
                if (updateError) throw updateError;
            }
            const { error: deleteError } = await supabase.from('tranzactii').delete().eq('id', tranzactieId);
            if (deleteError) throw deleteError;

            setTranzactii(prev => prev.filter(t => t.id !== tranzactieId));
            if (plata_ids && plata_ids.length > 0) {
                setPlati(prev => prev.map(p => plata_ids.includes(p.id) ? { ...p, status: 'Neachitat' } : p));
            }
            showSuccess("Succes", "Tranzacția a fost ștearsă și facturile asociate au fost actualizate.");
        } catch (err: any) {
            showError("Eroare la ștergere", err);
        } finally {
            setLoading(false);
            setTranzactieToDelete(null);
        }
    };
    
    const getEntityName = (transactie: Pick<Tranzactie, 'sportiv_id' | 'familie_id'>) => {
        if (transactie.familie_id) { const familie = familii.find(f => f.id === transactie.familie_id); return familie ? `Familia ${familie.nume}` : 'Familie N/A'; }
        if (transactie.sportiv_id) {  const s = sportivi.find(s=>s.id === transactie.sportiv_id); return s ? `${s.nume} ${s.prenume}` : 'Sportiv N/A'; }
        return 'N/A';
    };

    const getDescriereTranzactie = (tranzactie: Tranzactie) => {
        if (tranzactie.descriere) return tranzactie.descriere;
        if (tranzactie.plata_ids.length === 0) return 'Încasare goală';
        const primaPlata = plati.find(p => p.id === tranzactie.plata_ids[0]);
        if (tranzactie.plata_ids.length > 1) { return `${primaPlata?.descriere || 'Plată'} (+${tranzactie.plata_ids.length - 1} altele)`; }
        return primaPlata?.descriere || 'N/A';
    };

    const sortedTranzactii = useMemo(() => [...tranzactii].sort((a,b) => new Date(b.data_platii).getTime() - new Date(a.data_platii).getTime()), [tranzactii]);

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi</Button>
            <AdaugaAvans sportivi={sportivi} familii={familii} setTranzactii={setTranzactii} />
            <Card className="bg-navy-card-mobile md:bg-light-navy">
                <h3 className="text-xl font-bold text-white mb-4">{platiInitiale.length > 0 ? (isMultiple ? `Încasare Colectivă (${platiInitiale.length} facturi)` : "Încasare Datorie") : "Încasare Directă Nouă (Generează Factură & Încasare)"}</h3>
                <form onSubmit={handleSaveIncasare} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Data Încasării" type="date" name="data_platii" value={formState.data_platii!} onChange={handleFormChange} required />
                        <Select label="Plătitor Principal" name="sportiv_id" value={formState.sportiv_id || ''} onChange={handleFormChange} disabled={platiInitiale.length > 0} required>
                            <option value="">Selectează...</option>
                            {sportivi.filter(s => s.status === 'Activ').map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>)}
                        </Select>
                        <Select label="Metodă Plată" name="metoda_plata" value={formState.metoda_plata!} onChange={handleFormChange}><option value="Cash">Cash</option><option value="Transfer Bancar">Transfer Bancar</option></Select>
                    </div>
                    {isMultiple && (<div className="p-3 bg-slate-700/50 rounded-md border border-slate-600"><p className="text-sm font-semibold mb-2">Facturi selectate pentru stingere:</p><ul className="text-xs space-y-1 text-slate-300">{platiInitiale.map(p => <li key={p.id}>• {p.descriere} - <strong>{p.suma.toFixed(2)} RON</strong></li>)}</ul></div>)}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="flex gap-1 items-end">
                            <Select label="Categorie" name="tip" value={formState.tip} onChange={handleFormChange} disabled={platiInitiale.length > 0}>
                                {tipuriPlati.sort((a,b) => a.nume.localeCompare(b.nume)).map(tp => <option key={tp.id} value={tp.nume}>{tp.nume}</option>)}
                            </Select>
                            <Button type="button" variant="secondary" size="sm" onClick={() => setIsQuickAddOpen(true)} className="h-[34px]"><PlusIcon className="w-4 h-4"/></Button>
                        </div>
                        {formState.tip === 'Echipament' && !isMultiple && (
                            <div className="grid grid-cols-2 gap-2">
                                <Select label="Produs" value={selectedEchipament} onChange={e => setSelectedEchipament(e.target.value)}><option value="">Alege...</option>{echipamenteDisponibile.map(e => <option key={e} value={e}>{e}</option>)}</Select>
                                <Select label="Mărime" value={selectedMarimeId} onChange={e => setSelectedMarimeId(e.target.value)}><option value="">Alege...</option>{marimiDisponibile.map(m => <option key={m.id} value={m.id}>{formatMarime(m)}</option>)}</Select>
                            </div>
                        )}
                    </div>
                    <Input label="Descriere Tranzacție" name="descriere" value={formState.descriere} onChange={handleFormChange} required />
                    
                    {!isMultiple && reducereAplicata && (
                        <div className="p-3 bg-green-900/40 rounded-lg text-center border border-green-700/50 animate-fade-in-down">
                            <p className="text-sm text-green-300">Reducere aplicată: <strong>{reducereAplicata.nume}</strong></p>
                            <p className="text-sm text-orange-300">(-{(formState.suma_initiala - formState.suma).toFixed(2)} RON)</p>
                            <p className="text-xs text-slate-400">Sumă inițială: <span className="line-through">{formState.suma_initiala.toFixed(2)} RON</span></p>
                        </div>
                    )}
                    
                    <div className="p-4 bg-light-navy rounded-lg text-center">
                        <label className="text-sm uppercase text-slate-400">Sumă Finală de Plată</label>
                        <p className="text-4xl font-bold text-brand-secondary mt-1">{formState.suma.toFixed(2)} RON</p>
                    </div>

                    <div className="flex justify-end pt-4"><Button type="submit" variant="success" className="px-10" disabled={loading}>{loading ? 'Se procesează...' : 'Finalizează Încasarea'}</Button></div>
                </form>
            </Card>
            <Card className="p-0 overflow-hidden bg-navy-card-mobile md:bg-light-navy">
                <div className="bg-slate-700/50 p-4 border-b border-slate-600 font-bold">Istoric Încasări Recente</div>
                <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-800 text-xs text-slate-400 uppercase"><tr><th className="p-4">Data</th><th className="p-4">Plătit de</th><th className="p-4">Descriere</th><th className="p-4 text-right">Sumă</th><th className="p-4 text-right">Acțiuni</th></tr></thead><tbody className="divide-y divide-slate-700">{sortedTranzactii.slice(0, 10).map(t => (<tr key={t.id} className="hover:bg-slate-700/20"><td className="p-4 text-sm">{new Date(t.data_platii).toLocaleDateString('ro-RO')}</td><td className="p-4 font-medium">{getEntityName(t)}</td><td className="p-4 text-sm text-slate-400">{getDescriereTranzactie(t)}</td><td className="p-4 text-right font-bold text-green-400">{t.suma.toFixed(2)} RON</td><td className="p-4 text-right"><Button size="sm" variant="danger" onClick={() => setTranzactieToDelete(t)}><TrashIcon className="w-4 h-4"/></Button></td></tr>))}</tbody></table></div>
            </Card>
            <QuickAddTipPlataModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} onSave={handleQuickAddTipPlata} />
            <ConfirmDeleteModal isOpen={!!tranzactieToDelete} onClose={() => setTranzactieToDelete(null)} onConfirm={handleDeleteTranzactie} tableName="Tranzacție" isLoading={loading} customMessage="Sunteți sigur că doriți să ștergeți această încasare? Statusul facturilor asociate va fi resetat." />
        </div>
    );
};