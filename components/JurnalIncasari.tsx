import React, { useState, useMemo, useEffect } from 'react';
import { Plata, Sportiv, PretConfig, TipAbonament, Tranzactie, Familie, Reducere } from '../types';
import { Button, Input, Select, Card } from './ui';
import { getPretValabil, getPretProdus } from '../utils/pricing';
import { ArrowLeftIcon, PlusIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

interface JurnalIncasariProps {
    plati: Plata[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    sportivi: Sportiv[];
    familii: Familie[];
    preturiConfig: PretConfig[];
    tipuriAbonament: TipAbonament[];
    tranzactii: Tranzactie[];
    setTranzactii: React.Dispatch<React.SetStateAction<Tranzactie[]>>;
    platiInitiale: Plata[];
    onIncasareProcesata: () => void;
    onBack: () => void;
    // FIX: Add 'reduceri' prop to fix type error in App.tsx
    reduceri: Reducere[];
}

const emptyIncasareState = {
    sportiv_id: '',
    familie_id: null,
    suma: 0,
    metoda_plata: 'Cash' as 'Cash' | 'Transfer Bancar',
    data_platii: new Date().toISOString().split('T')[0],
    tip: 'Abonament' as Plata['tip'],
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
        <Card>
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


export const JurnalIncasari: React.FC<JurnalIncasariProps> = ({ plati, setPlati, sportivi, familii, preturiConfig, tipuriAbonament, tranzactii, setTranzactii, reduceri, platiInitiale, onIncasareProcesata, onBack }) => {
    const [formState, setFormState] = useState(emptyIncasareState);
    const [selectedEchipament, setSelectedEchipament] = useState('');
    const [selectedMarimeId, setSelectedMarimeId] = useState('');
    const [loading, setLoading] = useState(false);
    const { showError, showSuccess } = useError();

    const isMultiple = platiInitiale.length > 1;

    const echipamenteDisponibile = useMemo(() => [...new Set(preturiConfig.filter(p => p.categorie === 'Echipament').map(p => p.denumire_serviciu))], [preturiConfig]);
    const marimiDisponibile = useMemo(() => preturiConfig.filter(p => p.categorie === 'Echipament' && p.denumire_serviciu === selectedEchipament), [preturiConfig, selectedEchipament]);

    useEffect(() => {
        if (platiInitiale.length > 0) {
            const totalSuma = platiInitiale.reduce((acc, p) => acc + p.suma, 0);
            const commonDesc = isMultiple ? `Încasare multiplă (${platiInitiale.length} elemente)` : platiInitiale[0].descriere;
            
            setFormState({
                sportiv_id: platiInitiale[0].sportiv_id || '',
                familie_id: platiInitiale[0].familie_id,
                suma: totalSuma,
                metoda_plata: 'Cash',
                data_platii: new Date().toISOString().split('T')[0],
                tip: platiInitiale[0].tip,
                descriere: commonDesc,
                observatii: ''
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
        if (platiInitiale.length > 0) return; // Nu calcula automat dacă se stinge o datorie
        const sportiv = sportivi.find(s => s.id === formState.sportiv_id);
        if (!sportiv) { setFormState(prev => ({...prev, suma: 0, descriere: ''})); return; }
        const lunaText = new Date(formState.data_platii || new Date()).toLocaleString('ro-RO', { month: 'long', year: 'numeric'});
        
        if (formState.tip === 'Abonament') {
            let config;
            if (sportiv.familie_id) {
                const nr = sportivi.filter(s => s.familie_id === sportiv.familie_id && s.status === 'Activ').length;
                config = tipuriAbonament.find(ab => ab.numar_membri === nr) || tipuriAbonament.find(ab => ab.numar_membri === 1);
            } else {
                config = tipuriAbonament.find(ab => ab.id === sportiv.tip_abonament_id);
            }
            setFormState(prev => ({ ...prev, suma: config?.pret || 0, descriere: config ? `Abonament ${config.denumire} ${lunaText}` : '' }));
        } else if (formState.tip === 'Echipament' && selectedMarimeId) {
            const config = preturiConfig.find(p => p.id === selectedMarimeId);
            if (config) setFormState(prev => ({...prev, suma: config.suma, descriere: `${config.denumire_serviciu} (${formatMarime(config)})`}));
        } else if (['Taxa Examen', 'Taxa Stagiu', 'Taxa Competitie'].includes(formState.tip)) {
            const config = getPretValabil(preturiConfig, formState.tip as any, formState.data_platii!);
            setFormState(prev => ({ ...prev, suma: config?.suma || 0, descriere: config?.denumire_serviciu || '' }));
        }
    }, [formState.sportiv_id, formState.tip, selectedMarimeId, formState.data_platii, sportivi, preturiConfig, tipuriAbonament, platiInitiale]);

    const handleSaveIncasare = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;
        setLoading(true);
        let tranzactieId: string | null = null;
        let newPlataId: string | null = null;

        try {
            // Case 1: Paying existing debts
            if (platiInitiale.length > 0) {
                const idsToUpdate = platiInitiale.map(p => p.id);

                const { data: tx, error: txError } = await supabase.from('tranzactii').insert({
                    plata_ids: idsToUpdate,
                    sportiv_id: formState.sportiv_id || platiInitiale[0]?.sportiv_id,
                    familie_id: formState.familie_id || platiInitiale[0]?.familie_id,
                    suma: formState.suma,
                    data_platii: formState.data_platii!,
                    metoda_plata: formState.metoda_plata!
                }).select().single();

                if (txError) throw txError;
                tranzactieId = (tx as Tranzactie).id;

                const { error: updateError } = await supabase.from('plati').update({
                    status: 'Achitat'
                }).in('id', idsToUpdate);

                if (updateError) throw updateError;
                
                // Actualizează starea locală pentru a reflecta imediat modificarea
                setPlati(prevPlati => 
                    prevPlati.map(plata => 
                        idsToUpdate.includes(plata.id) ? { ...plata, status: 'Achitat' } : plata
                    )
                );

                setTranzactii(prev => [...prev, tx as Tranzactie]);
                showSuccess('Succes', `Încasare confirmată! ${idsToUpdate.length} datorii stinse.`);
            } else { // Case 2: New direct payment
                const sportiv = sportivi.find(s => s.id === formState.sportiv_id);
                const { data: newPlata, error: plataError } = await supabase.from('plati').insert({
                    sportiv_id: formState.sportiv_id,
                    familie_id: sportiv?.familie_id,
                    suma: formState.suma,
                    data: formState.data_platii!,
                    status: 'Achitat',
                    descriere: formState.descriere,
                    tip: formState.tip,
                    observatii: formState.observatii
                }).select().single();

                if (plataError) throw plataError;
                newPlataId = (newPlata as Plata).id;

                const { data: tx, error: txError } = await supabase.from('tranzactii').insert({
                    plata_ids: [newPlataId],
                    sportiv_id: formState.sportiv_id,
                    familie_id: sportiv?.familie_id,
                    suma: formState.suma,
                    data_platii: formState.data_platii!,
                    metoda_plata: formState.metoda_plata!
                }).select().single();
                
                if (txError) throw txError;
                tranzactieId = (tx as Tranzactie).id; // Set for potential rollback

                setPlati(prev => [...prev, newPlata as Plata]);
                setTranzactii(prev => [...prev, tx as Tranzactie]);
                showSuccess('Succes', `Încasare directă de ${formState.suma.toFixed(2)} RON înregistrată.`);
            }

            onIncasareProcesata();
            setTimeout(() => onBack(), 1500);

        } catch (err: any) {
            showError("Eroare la procesarea încasării", err);
            // Compensating actions
            if (tranzactieId) {
                await supabase.from('tranzactii').delete().eq('id', tranzactieId);
            }
            if (newPlataId) {
                 await supabase.from('plati').delete().eq('id', newPlataId);
            }
        } finally {
            setLoading(false);
        }
    };
    
    const getEntityName = (transactie: Pick<Tranzactie, 'sportiv_id' | 'familie_id'>) => {
        if (transactie.familie_id) {
            const familie = familii.find(f => f.id === transactie.familie_id);
            return familie ? `Familia ${familie.nume}` : 'Familie N/A';
        }
        if (transactie.sportiv_id) { 
            const s = sportivi.find(s=>s.id === transactie.sportiv_id); 
            return s ? `${s.nume} ${s.prenume}` : 'Sportiv N/A'; 
        }
        return 'N/A';
    };

    const getDescriereTranzactie = (tranzactie: Tranzactie) => {
        if (tranzactie.descriere) return tranzactie.descriere;
        if (tranzactie.plata_ids.length === 0) return 'Încasare goală';
        const primaPlata = plati.find(p => p.id === tranzactie.plata_ids[0]);
        if (tranzactie.plata_ids.length > 1) {
            return `${primaPlata?.descriere || 'Plată'} (+${tranzactie.plata_ids.length - 1} altele)`;
        }
        return primaPlata?.descriere || 'N/A';
    };

    const sortedTranzactii = useMemo(() => [...tranzactii].sort((a,b) => new Date(b.data_platii).getTime() - new Date(a.data_platii).getTime()), [tranzactii]);

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi</Button>
            
            <AdaugaAvans sportivi={sportivi} familii={familii} setTranzactii={setTranzactii} />

            <Card>
                <h3 className="text-xl font-bold text-white mb-4">
                    {platiInitiale.length > 0 ? (isMultiple ? `Încasare Colectivă (${platiInitiale.length} facturi)` : "Încasare Datorie") : "Încasare Directă Nouă (Generează Factură & Încasare)"}
                </h3>
                <form onSubmit={handleSaveIncasare} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Data Încasării" type="date" name="data_platii" value={formState.data_platii!} onChange={handleFormChange} required />
                        <Select label="Plătitor Principal" name="sportiv_id" value={formState.sportiv_id || ''} onChange={handleFormChange} disabled={platiInitiale.length > 0} required>
                            <option value="">Selectează...</option>
                            {sportivi.filter(s => s.status === 'Activ').map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>)}
                        </Select>
                        <Select label="Metodă Plată" name="metoda_plata" value={formState.metoda_plata!} onChange={handleFormChange}>
                            <option value="Cash">Cash</option>
                            <option value="Transfer Bancar">Transfer Bancar</option>
                        </Select>
                    </div>
                    
                    {isMultiple && (
                        <div className="p-3 bg-slate-700/50 rounded-md border border-slate-600">
                            <p className="text-sm font-semibold mb-2">Facturi selectate pentru stingere:</p>
                            <ul className="text-xs space-y-1 text-slate-300">
                                {platiInitiale.map(p => <li key={p.id}>• {p.descriere} - <strong>{p.suma.toFixed(2)} RON</strong></li>)}
                            </ul>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                         <Select label="Categorie" name="tip" value={formState.tip} onChange={handleFormChange} disabled={platiInitiale.length > 0}>
                            <option value="Abonament">Abonament</option>
                            <option value="Echipament">Echipament</option>
                            <option value="Taxa Examen">Taxa Examen</option>
                            <option value="Taxa Stagiu">Taxa Stagiu</option>
                            <option value="Taxa Competitie">Taxa Competiție</option>
                        </Select>
                        {formState.tip === 'Echipament' && !isMultiple && (
                            <>
                                <Select label="Produs" value={selectedEchipament} onChange={e => setSelectedEchipament(e.target.value)}>
                                    <option value="">Alege...</option>
                                    {echipamenteDisponibile.map(e => <option key={e} value={e}>{e}</option>)}
                                </Select>
                                <Select label="Mărime" value={selectedMarimeId} onChange={e => setSelectedMarimeId(e.target.value)}>
                                    <option value="">Alege...</option>
                                    {marimiDisponibile.map(m => <option key={m.id} value={m.id}>{formatMarime(m)}</option>)}
                                </Select>
                            </>
                        )}
                        <Input label="Sumă Totală (RON)" type="number" step="0.01" name="suma" value={formState.suma} onChange={handleFormChange} required />
                    </div>
                    <Input label="Descriere Tranzacție" name="descriere" value={formState.descriere} onChange={handleFormChange} required />
                    <div className="flex justify-end pt-4">
                        <Button type="submit" variant="success" className="px-10" disabled={loading}>{loading ? 'Se procesează...' : 'Finalizează Încasarea'}</Button>
                    </div>
                </form>
            </Card>

            <Card className="p-0 overflow-hidden">
                <div className="bg-slate-700/50 p-4 border-b border-slate-600 font-bold">Istoric Încasări Recente</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-800 text-xs text-slate-400 uppercase">
                            <tr>
                                <th className="p-4">Data</th>
                                <th className="p-4">Plătit de</th>
                                <th className="p-4">Descriere</th>
                                <th className="p-4 text-right">Sumă</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {sortedTranzactii.slice(0, 10).map(t => (
                                <tr key={t.id} className="hover:bg-slate-700/20">
                                    <td className="p-4 text-sm">{new Date(t.data_platii).toLocaleDateString('ro-RO')}</td>
                                    <td className="p-4 font-medium">{getEntityName(t)}</td>
                                    <td className="p-4 text-sm text-slate-400">{getDescriereTranzactie(t)}</td>
                                    <td className="p-4 text-right font-bold text-green-400">{t.suma.toFixed(2)} RON</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};