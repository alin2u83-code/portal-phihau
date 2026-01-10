import React, { useState, useMemo, useEffect } from 'react';
import { Plata, Sportiv, PretConfig, TipAbonament, Tranzactie, Familie } from '../types';
import { Button, Input, Select, Card } from './ui';
import { getPretValabil, getPretProdus } from '../utils/pricing';
import { ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

interface JurnalIncasariProps {
    plati: Plata[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    sportivi: Sportiv[];
    familii: Familie[];
    preturiConfig: PretConfig[];
    tipuriAbonament: TipAbonament[];
    setTranzactii: React.Dispatch<React.SetStateAction<Tranzactie[]>>;
    plataInitiala: Plata | null;
    onIncasareProcesata: () => void;
    onBack: () => void;
}

const emptyIncasareState: Omit<Plata, 'id' | 'status' | 'data'> = {
    sportiv_id: '',
    familie_id: null,
    suma: 0,
    metoda_plata: 'Cash',
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

export const JurnalIncasari: React.FC<JurnalIncasariProps> = ({ plati, setPlati, sportivi, familii, preturiConfig, tipuriAbonament, setTranzactii, plataInitiala, onIncasareProcesata, onBack }) => {
    const [formState, setFormState] = useState(emptyIncasareState);
    const [selectedEchipament, setSelectedEchipament] = useState('');
    const [selectedMarimeId, setSelectedMarimeId] = useState('');
    const [showSuccess, setShowSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { showError } = useError();

    const echipamenteDisponibile = useMemo(() => [...new Set(preturiConfig.filter(p => p.categorie === 'Echipament').map(p => p.denumire_serviciu))], [preturiConfig]);
    const marimiDisponibile = useMemo(() => preturiConfig.filter(p => p.categorie === 'Echipament' && p.denumire_serviciu === selectedEchipament), [preturiConfig, selectedEchipament]);

    useEffect(() => {
        if (plataInitiala) {
            setFormState({
                sportiv_id: plataInitiala.sportiv_id,
                familie_id: plataInitiala.familie_id,
                suma: plataInitiala.suma,
                metoda_plata: 'Cash',
                data_platii: new Date().toISOString().split('T')[0],
                tip: plataInitiala.tip,
                descriere: plataInitiala.descriere,
                observatii: ''
            });
        }
    }, [plataInitiala]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'tip' && value !== 'Echipament') setSelectedEchipament('');
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    // Auto-selectează mărimea și prețul pe baza înălțimii sportivului
    useEffect(() => {
        if (formState.tip === 'Echipament' && formState.sportiv_id && selectedEchipament) {
            const sportiv = sportivi.find(s => s.id === formState.sportiv_id);
            if (sportiv?.inaltime) {
                const pretConfigPotrivit = getPretProdus(
                    preturiConfig,
                    'Echipament',
                    selectedEchipament,
                    { inaltime: sportiv.inaltime }
                );

                if (pretConfigPotrivit) {
                    setSelectedMarimeId(pretConfigPotrivit.id);
                }
            }
        }
    }, [formState.sportiv_id, selectedEchipament, formState.tip, sportivi, preturiConfig]);

    useEffect(() => {
        if (plataInitiala) return; // Nu recalcula daca e pre-populat

        const sportiv = sportivi.find(s => s.id === formState.sportiv_id);
        if (!sportiv) { setFormState(prev => ({...prev, suma: 0, descriere: ''})); return; }

        const lunaText = new Date(formState.data_platii || new Date()).toLocaleString('ro-RO', { month: 'long', year: 'numeric'});

        if (formState.tip === 'Abonament') {
            let abonamentConfig;
            if (sportiv.familie_id) {
                const membriFamilie = sportivi.filter(s => s.familie_id === sportiv.familie_id && s.status === 'Activ').length;
                abonamentConfig = tipuriAbonament.find(ab => ab.numar_membri === membriFamilie) || (membriFamilie >= 3 ? tipuriAbonament.sort((a,b) => b.numar_membri - a.numar_membri)[0] : undefined);
            } else {
                abonamentConfig = tipuriAbonament.find(ab => ab.id === sportiv.tip_abonament_id);
            }
            setFormState(prev => ({ ...prev, suma: abonamentConfig?.pret || 0, descriere: abonamentConfig ? `Abonament ${abonamentConfig.denumire} ${lunaText}`:'' }));
        
        } else if (formState.tip === 'Echipament') {
            if (selectedMarimeId) {
                const pretConfig = preturiConfig.find(p => p.id === selectedMarimeId);
                if (pretConfig) {
                    setFormState(prev => ({...prev, suma: pretConfig.suma, descriere: `${pretConfig.denumire_serviciu} (${formatMarime(pretConfig)})`}));
                }
            } else {
                 setFormState(prev => ({...prev, suma: 0, descriere: ''}));
            }
        } else if (['Taxa Examen', 'Taxa Stagiu', 'Taxa Competitie'].includes(formState.tip)) {
             const pretConfig = getPretValabil(preturiConfig, formState.tip as any, formState.data_platii!);
             setFormState(prev => ({ ...prev, suma: pretConfig?.suma || 0, descriere: pretConfig?.denumire_serviciu || '' }));
        }
    }, [formState.sportiv_id, formState.tip, selectedEchipament, selectedMarimeId, formState.data_platii, sportivi, preturiConfig, tipuriAbonament, plataInitiala]);

    const handleSaveIncasare = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) {
            showError("Eroare Configurare", "Clientul Supabase nu a putut fi stabilit.");
            return;
        }

        const sumaPlatita = formState.suma;
        if ((!formState.sportiv_id && !plataInitiala?.familie_id) || sumaPlatita <= 0 || !formState.data_platii) {
            showError("Date Incomplete", "Sportivul/Familia, suma și data încasării sunt obligatorii.");
            return;
        }

        setLoading(true);
        const sportiv = sportivi.find(s => s.id === formState.sportiv_id);
        
        // Scenario 1: Paying off an existing debt
        if (plataInitiala) {
            const restDePlata = plataInitiala.suma - sumaPlatita;

            // 1. Insert transaction
            const { data: tranzactieData, error: tranzactieError } = await supabase
                .from('tranzactii')
                .insert({
                    plata_ids: [plataInitiala.id],
                    sportiv_id: plataInitiala.sportiv_id,
                    familie_id: plataInitiala.familie_id,
                    suma: sumaPlatita,
                    data_platii: formState.data_platii!,
                    metoda_plata: formState.metoda_plata!
                })
                .select()
                .single();

            if (tranzactieError) {
                showError("Eroare Salvare Tranzacție", tranzactieError);
                setLoading(false);
                return;
            }

            // 2. Update payment
            let plataUpdate: Partial<Plata>;
            if (restDePlata > 0.01) {
                plataUpdate = {
                    status: 'Achitat Parțial',
                    suma: restDePlata,
                    observatii: `${plataInitiala.observatii || ''}\nPlătit ${sumaPlatita.toFixed(2)} RON la data de ${new Date(formState.data_platii!).toLocaleDateString('ro-RO')}.`.trim()
                };
            } else {
                plataUpdate = {
                    status: 'Achitat',
                    metoda_plata: formState.metoda_plata,
                    data_platii: formState.data_platii,
                    observatii: formState.observatii
                };
            }

            const { data: plataData, error: plataError } = await supabase
                .from('plati')
                .update(plataUpdate)
                .eq('id', plataInitiala.id)
                .select()
                .single();
            
            if (plataError) {
                showError("Eroare Actualizare Plată", plataError);
                showError("Inconsistență Date", "Tranzacția a fost salvată, dar datoria nu a putut fi actualizată. Vă rugăm să actualizați manual statusul plății pentru a evita dubla taxare.");
                setLoading(false);
                return;
            }

            // 3. Update local state
            setTranzactii(prev => [...prev, tranzactieData as Tranzactie]);
            setPlati(prev => prev.map(p => p.id === plataInitiala.id ? plataData as Plata : p));

            const numeEntitate = plataInitiala.familie_id ? `Familia ${familii.find(f => f.id === plataInitiala.familie_id)?.nume}` : sportiv ? `${sportiv.nume} ${sportiv.prenume}` : 'N/A';
            setShowSuccess(`Încasarea pentru ${numeEntitate} a fost înregistrată!`);

            onIncasareProcesata();
            setTimeout(() => onBack(), 1500);

        } else { // Scenario 2: New on-the-spot payment
            if (!sportiv) {
                showError("Eroare", "Nu a fost selectat un sportiv valid.");
                setLoading(false);
                return;
            }

            // 1. Insert new payment (Plata) with status 'Achitat'
            const newPlataData: Omit<Plata, 'id'> = {
                sportiv_id: sportiv.id,
                familie_id: sportiv.familie_id,
                suma: sumaPlatita,
                data: formState.data_platii!,
                status: 'Achitat',
                descriere: formState.descriere,
                tip: formState.tip,
                metoda_plata: formState.metoda_plata,
                data_platii: formState.data_platii,
                observatii: formState.observatii
            };

            const { data: plataData, error: plataError } = await supabase
                .from('plati')
                .insert(newPlataData)
                .select()
                .single();

            if (plataError || !plataData) {
                showError("Eroare Salvare Plată", plataError || new Error("Nu s-au putut salva datele plății."));
                setLoading(false);
                return;
            }

            // 2. Insert new transaction
            const newTranzactieData: Omit<Tranzactie, 'id'> = {
                plata_ids: [plataData.id],
                sportiv_id: sportiv.id,
                familie_id: sportiv.familie_id,
                suma: sumaPlatita,
                data_platii: formState.data_platii!,
                metoda_plata: formState.metoda_plata!
            };

            const { data: tranzactieData, error: tranzactieError } = await supabase
                .from('tranzactii')
                .insert(newTranzactieData)
                .select()
                .single();

            if (tranzactieError) {
                showError("Eroare Salvare Tranzacție", tranzactieError);
                showError("Inconsistență Date", "Plata a fost salvată, dar tranzacția nu. Vă rugăm să ștergeți manual plata și să reîncercați.");
                setLoading(false);
                return;
            }
            
            // 3. Update local state
            setPlati(prev => [...prev, plataData as Plata]);
            setTranzactii(prev => [...prev, tranzactieData as Tranzactie]);

            setShowSuccess(`Încasarea pentru ${sportiv.nume} ${sportiv.prenume} a fost înregistrată!`);
            setTimeout(() => setShowSuccess(null), 4000);
            
            // Reset form
            setFormState(emptyIncasareState);
            setSelectedEchipament('');
            setSelectedMarimeId('');
        }
        setLoading(false);
    };


    const platiAchitate = useMemo(() => plati.filter(p => p.status === 'Achitat').sort((a,b) => new Date(b.data_platii!).getTime() - new Date(a.data_platii!).getTime()), [plati]);
    const getSportivName = (id: string | null) => { if(!id) return 'N/A'; const s = sportivi.find(s=>s.id === id); return s ? `${s.nume} ${s.prenume}` : 'N/A'; };
    const getEntityName = (plata: Plata) => {
        if (plata.familie_id) {
            return `Familia ${familii.find(f => f.id === plata.familie_id)?.nume || 'N/A'}`;
        }
        return getSportivName(plata.sportiv_id);
    };

    return ( <div><Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi</Button><h1 className="text-3xl font-bold text-white mb-6">Jurnal Încasări</h1> <Card className="mb-6"> <h3 className="text-xl font-bold text-white mb-4">{plataInitiala ? `Încasare Datorie: ${plataInitiala.descriere}` : "Adaugă Încasare Nouă"}</h3> <form onSubmit={handleSaveIncasare} className="space-y-4"> <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"> <Input label="Data Încasării" type="date" name="data_platii" value={formState.data_platii!} onChange={handleFormChange} required /> <Select label="Sportiv (Reprezentant)" name="sportiv_id" value={formState.sportiv_id || ''} onChange={handleFormChange} required disabled={!!plataInitiala}> <option value="">Selectează...</option> {sportivi.filter(s => s.status === 'Activ').map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>)} </Select> <Select label="Metodă Plată" name="metoda_plata" value={formState.metoda_plata!} onChange={handleFormChange}> <option value="Cash">Cash</option> <option value="Transfer Bancar">Transfer Bancar</option> </Select> </div> <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"> <Select label="Categorie" name="tip" value={formState.tip} onChange={handleFormChange} disabled={!!plataInitiala}> <option value="Abonament">Abonament</option> <option value="Taxa Examen">Taxa Examen</option> <option value="Echipament">Echipament</option> <option value="Taxa Stagiu">Taxa Stagiu</option> <option value="Taxa Competitie">Taxa Competiție</option> </Select> {formState.tip === 'Echipament' && (<> <Select label="Produs" value={selectedEchipament} onChange={e => {setSelectedEchipament(e.target.value); setSelectedMarimeId('');}} disabled={!!plataInitiala}> <option value="">Selectează...</option> {echipamenteDisponibile.map(item => <option key={item} value={item}>{item}</option>)} </Select> <Select label="Mărime" value={selectedMarimeId} onChange={e => setSelectedMarimeId(e.target.value)} disabled={!selectedEchipament || !!plataInitiala}> <option value="">Selectează...</option> {marimiDisponibile.map(item => <option key={item.id} value={item.id}>{formatMarime(item)}</option>)} </Select> </>) } <Input label="Sumă (RON)" name="suma" type="number" step="0.01" value={formState.suma} onChange={handleFormChange} required className={formState.tip === 'Echipament' ? '' : 'md:col-start-4'}/> </div> <Input label="Descriere" name="descriere" value={formState.descriere} onChange={handleFormChange} required placeholder="Se va pre-completa..." disabled={!!plataInitiala} /> <Input label="Observații" name="observatii" value={formState.observatii} onChange={handleFormChange} placeholder="Opțional (ex: referință plată, etc.)" /> <div className="flex justify-end pt-2"> <Button type="submit" variant="success" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează Încasarea'}</Button> </div> </form> </Card> {showSuccess && <div className="bg-green-600/50 text-white p-3 rounded-md mb-4 text-center font-semibold">{showSuccess}</div>} <Card> <h3 className="text-xl font-bold text-white mb-4">Istoric Încasări Recente</h3> <div className="bg-slate-800 rounded-lg shadow-lg overflow-x-auto"> <table className="w-full text-left min-w-[800px]"> <thead className="bg-slate-700"><tr><th className="p-4 font-semibold">Data</th><th className="p-4 font-semibold">Sportiv/Familie</th><th className="p-4 font-semibold">Descriere</th><th className="p-4 font-semibold">Metodă</th><th className="p-4 font-semibold text-right">Sumă</th></tr></thead> <tbody> {platiAchitate.slice(0, 10).map(plata => ( <tr key={plata.id} className="border-b border-slate-700"> <td className="p-4">{new Date(plata.data_platii!).toLocaleDateString('ro-RO')}</td> <td className="p-4 font-medium">{getEntityName(plata)}</td> <td className="p-4">{plata.descriere}</td> <td className="p-4">{plata.metoda_plata}</td> <td className="p-4 text-right font-semibold text-green-400">{plata.suma.toFixed(2)} RON</td> </tr> ))} </tbody> </table> {platiAchitate.length === 0 && <p className="p-4 text-center text-slate-400">Nicio încasare înregistrată.</p>} </div> </Card> </div> );
};
