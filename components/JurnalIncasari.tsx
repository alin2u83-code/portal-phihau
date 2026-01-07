
import React, { useState, useMemo, useEffect } from 'react';
import { Plata, Sportiv, PretConfig, TipAbonament, Tranzactie } from '../types';
import { Button, Input, Select, Card } from './ui';
import { getPretValabil, getPretProdus } from '../utils/pricing';
import { ArrowLeftIcon } from './icons';

interface JurnalIncasariProps {
    plati: Plata[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    sportivi: Sportiv[];
    preturiConfig: PretConfig[];
    tipuriAbonament: TipAbonament[];
    setTranzactii: React.Dispatch<React.SetStateAction<Tranzactie[]>>;
    plataInitiala: Plata | null;
    onIncasareProcesata: () => void;
    onBack: () => void;
}

const emptyIncasareState: Omit<Plata, 'id' | 'status' | 'data'> = {
    sportivId: '',
    familieId: null,
    suma: 0,
    metodaPlata: 'Cash',
    dataPlatii: new Date().toISOString().split('T')[0],
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

export const JurnalIncasari: React.FC<JurnalIncasariProps> = ({ plati, setPlati, sportivi, preturiConfig, tipuriAbonament, setTranzactii, plataInitiala, onIncasareProcesata, onBack }) => {
    const [formState, setFormState] = useState(emptyIncasareState);
    const [selectedEchipament, setSelectedEchipament] = useState('');
    const [selectedMarimeId, setSelectedMarimeId] = useState('');
    const [showSuccess, setShowSuccess] = useState<string | null>(null);

    const echipamenteDisponibile = useMemo(() => [...new Set(preturiConfig.filter(p => p.categorie === 'Echipament').map(p => p.denumireServiciu))], [preturiConfig]);
    const marimiDisponibile = useMemo(() => preturiConfig.filter(p => p.categorie === 'Echipament' && p.denumireServiciu === selectedEchipament), [preturiConfig, selectedEchipament]);

    useEffect(() => {
        if (plataInitiala) {
            setFormState({
                sportivId: plataInitiala.sportivId,
                familieId: plataInitiala.familieId,
                suma: plataInitiala.suma,
                metodaPlata: 'Cash',
                dataPlatii: new Date().toISOString().split('T')[0],
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
        if (formState.tip === 'Echipament' && formState.sportivId && selectedEchipament) {
            const sportiv = sportivi.find(s => s.id === formState.sportivId);
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
    }, [formState.sportivId, selectedEchipament, formState.tip, sportivi, preturiConfig]);

    useEffect(() => {
        if (plataInitiala) return; // Nu recalcula daca e pre-populat

        const sportiv = sportivi.find(s => s.id === formState.sportivId);
        if (!sportiv) { setFormState(prev => ({...prev, suma: 0, descriere: ''})); return; }

        const lunaText = new Date(formState.dataPlatii || new Date()).toLocaleString('ro-RO', { month: 'long', year: 'numeric'});

        if (formState.tip === 'Abonament') {
            let abonamentConfig;
            if (sportiv.familieId) {
                const membriFamilie = sportivi.filter(s => s.familieId === sportiv.familieId && s.status === 'Activ').length;
                abonamentConfig = tipuriAbonament.find(ab => ab.numarMembri === membriFamilie) || (membriFamilie >= 3 ? tipuriAbonament.sort((a,b) => b.numarMembri - a.numarMembri)[0] : undefined);
            } else {
                abonamentConfig = tipuriAbonament.find(ab => ab.id === sportiv.tipAbonamentId);
            }
            setFormState(prev => ({ ...prev, suma: abonamentConfig?.pret || 0, descriere: abonamentConfig ? `Abonament ${abonamentConfig.denumire} ${lunaText}`:'' }));
        
        } else if (formState.tip === 'Echipament') {
            if (selectedMarimeId) {
                const pretConfig = preturiConfig.find(p => p.id === selectedMarimeId);
                if (pretConfig) {
                    setFormState(prev => ({...prev, suma: pretConfig.suma, descriere: `${pretConfig.denumireServiciu} (${formatMarime(pretConfig)})`}));
                }
            } else {
                 setFormState(prev => ({...prev, suma: 0, descriere: ''}));
            }
        } else if (['Taxa Examen', 'Taxa Stagiu', 'Taxa Competitie'].includes(formState.tip)) {
             const pretConfig = getPretValabil(preturiConfig, formState.tip as any, formState.dataPlatii!);
             setFormState(prev => ({ ...prev, suma: pretConfig?.suma || 0, descriere: pretConfig?.denumireServiciu || '' }));
        }
    }, [formState.sportivId, formState.tip, selectedEchipament, selectedMarimeId, formState.dataPlatii, sportivi, preturiConfig, tipuriAbonament, plataInitiala]);


    const handleSaveIncasare = (e: React.FormEvent) => {
        e.preventDefault();
        const sumaPlatita = formState.suma;
        if ((!formState.sportivId && !plataInitiala?.familieId) || sumaPlatita <= 0 || !formState.dataPlatii) { alert("Toate câmpurile marcate sunt obligatorii."); return; }

        const sportiv = sportivi.find(s => s.id === formState.sportivId);
        const numeSportiv = sportiv ? `${sportiv.nume} ${sportiv.prenume}` : `Familia ${sportivi.find(s => s.familieId === plataInitiala?.familieId)?.nume}`;

        if (plataInitiala) {
            const restDePlata = plataInitiala.suma - sumaPlatita;

            setTranzactii(prev => [...prev, {id: new Date().toISOString(), plataIds: [plataInitiala.id], sportivId: plataInitiala.sportivId, familieId: plataInitiala.familieId, suma: sumaPlatita, dataPlatii: formState.dataPlatii!, metodaPlata: formState.metodaPlata!}]);

            if (restDePlata > 0.01) {
                setPlati(prev => prev.map(p => p.id === plataInitiala.id ? { ...p, status: 'Achitat Parțial', suma: restDePlata, observatii: `${p.observatii || ''}\nPlătit ${sumaPlatita} RON la data de ${formState.dataPlatii}.` } : p));
            } else {
                setPlati(prev => prev.map(p => p.id === plataInitiala.id ? { ...p, status: 'Achitat', suma: sumaPlatita, metodaPlata: formState.metodaPlata, dataPlatii: formState.dataPlatii, observatii: formState.observatii } : p));
            }
            onIncasareProcesata();
        } else {
            if(!sportiv) return;
            const newPlata: Plata = { id: new Date().toISOString(), sportivId: sportiv.id, familieId: sportiv.familieId, suma: sumaPlatita, data: formState.dataPlatii!, status: 'Achitat', descriere: formState.descriere, tip: formState.tip, metodaPlata: formState.metodaPlata, dataPlatii: formState.dataPlatii, observatii: formState.observatii };
            setPlati(prev => [...prev, newPlata]);
            setTranzactii(prev => [...prev, {id: new Date().toISOString(), plataIds: [newPlata.id], sportivId: sportiv.id, familieId: sportiv.familieId, suma: sumaPlatita, dataPlatii: formState.dataPlatii!, metodaPlata: formState.metodaPlata!}]);
        }
        
        setShowSuccess(`Încasarea pentru ${numeSportiv} a fost înregistrată cu succes!`);
        setTimeout(() => setShowSuccess(null), 4000);
        setFormState(emptyIncasareState);
        setSelectedEchipament('');
        setSelectedMarimeId('');
    };

    const platiAchitate = useMemo(() => plati.filter(p => p.status === 'Achitat').sort((a,b) => new Date(b.dataPlatii!).getTime() - new Date(a.dataPlatii!).getTime()), [plati]);
    const getSportivName = (id: string) => { const s = sportivi.find(s=>s.id === id); return s ? `${s.nume} ${s.prenume}` : 'N/A'; };

    return ( <div><Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button><h1 className="text-3xl font-bold text-white mb-6">Jurnal Încasări</h1> <Card className="mb-6"> <h3 className="text-xl font-bold text-white mb-4">{plataInitiala ? `Încasare Datorie: ${plataInitiala.descriere}` : "Adaugă Încasare Nouă"}</h3> <form onSubmit={handleSaveIncasare} className="space-y-4"> <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"> <Input label="Data Încasării" type="date" name="dataPlatii" value={formState.dataPlatii!} onChange={handleFormChange} required /> <Select label="Sportiv (Reprezentant)" name="sportivId" value={formState.sportivId || ''} onChange={handleFormChange} required disabled={!!plataInitiala}> <option value="">Selectează...</option> {sportivi.filter(s => s.status === 'Activ').map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>)} </Select> <Select label="Sursă Plată" name="metodaPlata" value={formState.metodaPlata!} onChange={handleFormChange}> <option value="Cash">Cash</option> <option value="Transfer Bancar">Transfer Bancar</option> </Select> </div> <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"> <Select label="Categorie" name="tip" value={formState.tip} onChange={handleFormChange} disabled={!!plataInitiala}> <option value="Abonament">Abonament</option> <option value="Taxa Examen">Taxa Examen</option> <option value="Echipament">Echipament</option> <option value="Taxa Stagiu">Taxa Stagiu</option> <option value="Taxa Competitie">Taxa Competiție</option> </Select> {formState.tip === 'Echipament' && (<> <Select label="Produs" value={selectedEchipament} onChange={e => {setSelectedEchipament(e.target.value); setSelectedMarimeId('');}} disabled={!!plataInitiala}> <option value="">Selectează...</option> {echipamenteDisponibile.map(item => <option key={item} value={item}>{item}</option>)} </Select> <Select label="Mărime" value={selectedMarimeId} onChange={e => setSelectedMarimeId(e.target.value)} disabled={!selectedEchipament || !!plataInitiala}> <option value="">Selectează...</option> {marimiDisponibile.map(item => <option key={item.id} value={item.id}>{formatMarime(item)}</option>)} </Select> </>) } <Input label="Sumă (RON)" name="suma" type="number" step="0.01" value={formState.suma} onChange={handleFormChange} required className={formState.tip === 'Echipament' ? '' : 'md:col-start-4'}/> </div> <Input label="Descriere" name="descriere" value={formState.descriere} onChange={handleFormChange} required placeholder="Se va pre-completa..." disabled={!!plataInitiala} /> <Input label="Observații" name="observatii" value={formState.observatii} onChange={handleFormChange} placeholder="Opțional (ex: referință plată, etc.)" /> <div className="flex justify-end pt-2"> <Button type="submit" variant="success">Salvează Încasarea</Button> </div> </form> </Card> {showSuccess && <div className="bg-green-600/50 text-white p-3 rounded-md mb-4 text-center font-semibold">{showSuccess}</div>} <Card> <h3 className="text-xl font-bold text-white mb-4">Istoric Încasări</h3> <div className="bg-slate-800 rounded-lg shadow-lg overflow-x-auto"> <table className="w-full text-left min-w-[800px]"> <thead className="bg-slate-700"><tr><th className="p-4 font-semibold">Data</th><th className="p-4 font-semibold">Sportiv/Familie</th><th className="p-4 font-semibold">Descriere</th><th className="p-4 font-semibold">Metodă</th><th className="p-4 font-semibold text-right">Sumă</th></tr></thead> <tbody> {platiAchitate.map(plata => ( <tr key={plata.id} className="border-b border-slate-700"> <td className="p-4">{new Date(plata.dataPlatii!).toLocaleDateString('ro-RO')}</td> <td className="p-4 font-medium">{plata.sportivId ? getSportivName(plata.sportivId) : 'Familie'}</td> <td className="p-4">{plata.descriere}</td> <td className="p-4">{plata.metodaPlata}</td> <td className="p-4 text-right font-semibold text-green-400">{plata.suma.toFixed(2)} RON</td> </tr> ))} </tbody> </table> {platiAchitate.length === 0 && <p className="p-4 text-center text-slate-400">Nicio încasare înregistrată.</p>} </div> </Card> </div> );
};