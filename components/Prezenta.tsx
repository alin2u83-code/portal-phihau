
import React, { useState, useEffect, useMemo } from 'react';
import { Prezenta, Sportiv, Grupa, Plata } from '../types';
import { Button, Card, Input, Select } from './ui';
import { PlusIcon, ArrowLeftIcon } from './icons';

interface PrezentaManagementProps {
    sportivi: Sportiv[];
    prezente: Prezenta[];
    setPrezente: React.Dispatch<React.SetStateAction<Prezenta[]>>;
    grupe: Grupa[];
    plati: Plata[];
    onBack: () => void;
}

export const PrezentaManagement: React.FC<PrezentaManagementProps> = ({ sportivi, prezente, setPrezente, grupe, plati, onBack }) => {
    const [dataSelectata, setDataSelectata] = useState(new Date().toISOString().split('T')[0]);
    const [oraSelectata, setOraSelectata] = useState('18:00');
    const [grupaSelectataId, setGrupaSelectataId] = useState<string>(grupe[0]?.id || '');
    const [tipAntrenament, setTipAntrenament] = useState<'Normal' | 'Vacanta'>('Normal');
    const [filtruVacanta, setFiltruVacanta] = useState(false);

    const [sportiviPrezenti, setSportiviPrezenti] = useState<Set<string>>(new Set());
    const [extraSportiviIds, setExtraSportiviIds] = useState<Set<string>>(new Set());
    const [addSportivId, setAddSportivId] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const platiRestante = useMemo(() => {
        const lunaCurenta = new Date(dataSelectata).getMonth();
        const anulCurent = new Date(dataSelectata).getFullYear();
        const sportiviCuRestante = new Set<string>();

        sportivi.forEach(s => {
            if (s.status !== 'Activ') return;
            let areAbonamentPlatit = false;
            if (s.familieId) {
                areAbonamentPlatit = plati.some(p => p.familieId === s.familieId && p.tip === 'Abonament' && p.status === 'Achitat' && new Date(p.data).getMonth() === lunaCurenta && new Date(p.data).getFullYear() === anulCurent);
            } else {
                areAbonamentPlatit = plati.some(p => p.sportivId === s.id && p.tip === 'Abonament' && p.status === 'Achitat' && new Date(p.data).getMonth() === lunaCurenta && new Date(p.data).getFullYear() === anulCurent);
            }
            if (!areAbonamentPlatit) { sportiviCuRestante.add(s.id); }
        });
        return sportiviCuRestante;
    }, [sportivi, plati, dataSelectata]);

    useEffect(() => { if (grupe.length > 0 && !grupaSelectataId) { setGrupaSelectataId(grupe[0].id); } }, [grupe, grupaSelectataId]);

    useEffect(() => {
        const idPrezenta = `${dataSelectata}-${oraSelectata}-${grupaSelectataId}-${tipAntrenament}`;
        const prezentaExistenta = prezente.find(p => p.id === idPrezenta);
        
        const sportiviGrupaCurenta = sportivi.filter(s => s.grupaId === grupaSelectataId).map(s => s.id);

        if (prezentaExistenta) {
            setSportiviPrezenti(new Set(prezentaExistenta.sportiviPrezentiIds));
            const extra = prezentaExistenta.sportiviPrezentiIds.filter(id => !sportiviGrupaCurenta.includes(id));
            setExtraSportiviIds(new Set(extra));
        } else {
            setSportiviPrezenti(new Set());
            setExtraSportiviIds(new Set());
        }
    }, [dataSelectata, oraSelectata, grupaSelectataId, tipAntrenament, prezente, sportivi]);

    const handleTogglePrezenta = (sportivId: string) => { setSportiviPrezenti(prev => { const newSet = new Set(prev); if (newSet.has(sportivId)) { newSet.delete(sportivId); } else { newSet.add(sportivId); } return newSet; }); };

    const handleSavePrezente = () => {
        if (!grupaSelectataId && !filtruVacanta) {
            alert("Vă rugăm selectați o grupă.");
            return;
        }
    
        // Construiește un ID unic pentru sesiunea de antrenament curentă (dată, oră, grupă, tip).
        const idPrezenta = `${dataSelectata}-${oraSelectata}-${filtruVacanta ? 'vacanta' : grupaSelectataId}-${tipAntrenament}`;
    
        // Pregătește noua stare a prezenței pe baza selecțiilor curente.
        const updatedPrezenta: Prezenta = {
            id: idPrezenta,
            data: dataSelectata,
            ora: oraSelectata,
            grupaId: filtruVacanta ? 'vacanta' : grupaSelectataId,
            sportiviPrezentiIds: Array.from(sportiviPrezenti),
            tip: tipAntrenament
        };
    
        // Actualizează starea globală a prezențelor.
        // Această logică va înlocui o intrare existentă (editare) sau va adăuga una nouă (creare).
        setPrezente(prevPrezente => {
            const existingIndex = prevPrezente.findIndex(p => p.id === idPrezenta);
    
            if (existingIndex > -1) {
                // S-a găsit o intrare existentă. O actualizăm.
                const newPrezenteList = [...prevPrezente];
                newPrezenteList[existingIndex] = updatedPrezenta;
                return newPrezenteList;
            } else {
                // Nu s-a găsit o intrare. O adăugăm.
                return [...prevPrezente, updatedPrezenta];
            }
        });
    
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };
    
    const sportiviAfisati = useMemo(() => {
        if(filtruVacanta) {
            return sportivi.filter(s => s.status === 'Activ' && s.participaVacanta);
        }
        const sportiviGrupa = sportivi.filter(s => s.status === 'Activ' && s.grupaId === grupaSelectataId);
        const extraSportivi = Array.from(extraSportiviIds).map(id => sportivi.find(s => s.id === id)).filter(Boolean) as Sportiv[];
        return [...sportiviGrupa, ...extraSportivi].filter((s, i, arr) => arr.findIndex(t => t.id === s.id) === i);
    }, [sportivi, grupaSelectataId, extraSportiviIds, filtruVacanta]);
    
    const adaugaSportivSuplimentar = () => { if(addSportivId && !extraSportiviIds.has(addSportivId)) { setExtraSportiviIds(prev => new Set(prev).add(addSportivId)); setAddSportivId(''); } };
    const potentialExtraSportivi = sportivi.filter(s => s.status === 'Activ' && s.grupaId !== grupaSelectataId && !extraSportiviIds.has(s.id));

    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            <h1 className="text-3xl font-bold text-white mb-6">Prezență Antrenament</h1>
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-slate-700/50 rounded-lg items-end">
                    <Input label="Data" type="date" value={dataSelectata} onChange={e => setDataSelectata(e.target.value)} />
                    <Input label="Ora" type="time" value={oraSelectata} onChange={e => setOraSelectata(e.target.value)} />
                     <Select label="Tip Antrenament" name="tipAntrenament" value={tipAntrenament} onChange={e => setTipAntrenament(e.target.value as any)}>
                        <option value="Normal">Normal</option>
                        <option value="Vacanta">Vacanță</option>
                    </Select>
                </div>

                <div className="p-4 rounded-lg bg-slate-700/50">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-semibold">Listă Sportivi</h3>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" className="h-5 w-5 rounded border-slate-500 bg-slate-800 text-primary-600 focus:ring-primary-500" checked={filtruVacanta} onChange={e => setFiltruVacanta(e.target.checked)}/>
                            <span className="font-semibold">Afișează doar sportivii de vacanță</span>
                        </label>
                    </div>

                    {!filtruVacanta && (
                        <Select label="Selectează Grupa" value={grupaSelectataId} onChange={e => setGrupaSelectataId(e.target.value)} className="mt-4">
                            {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                        </Select>
                    )}
                    
                    <div className="space-y-3 mt-4">
                        {sportiviAfisati.length > 0 ? sportiviAfisati.map(sportiv => (
                            <div key={sportiv.id} className="flex items-center justify-between bg-slate-700 p-3 rounded-md">
                                <label htmlFor={`check-${sportiv.id}`} className="font-medium cursor-pointer flex items-center">
                                    {platiRestante.has(sportiv.id) && <span className="w-3 h-3 bg-red-500 rounded-full mr-3" title="Abonament neachitat"></span>}
                                    {sportiv.nume} {sportiv.prenume} 
                                    {!filtruVacanta && extraSportiviIds.has(sportiv.id) && <span className="ml-2 text-xs bg-sky-500 text-white px-2 py-0.5 rounded-full">Ad-hoc</span>}
                                </label>
                                <input id={`check-${sportiv.id}`} type="checkbox" className="h-6 w-6 rounded border-slate-500 bg-slate-800 text-primary-600 focus:ring-primary-500 cursor-pointer" checked={sportiviPrezenti.has(sportiv.id)} onChange={() => handleTogglePrezenta(sportiv.id)}/>
                            </div>
                        )) : <p className="text-slate-400 text-center py-4">Niciun sportiv de afișat conform filtrelor.</p>}
                    </div>
                </div>

                {!filtruVacanta && (
                    <Card className="mt-6 bg-slate-900/50">
                        <h4 className="font-semibold mb-2">Adaugă sportiv ad-hoc</h4>
                        <div className="flex gap-4">
                            <Select label="" value={addSportivId} onChange={e => setAddSportivId(e.target.value)} className="flex-grow">
                                <option value="">Selectează un sportiv...</option>
                                {potentialExtraSportivi.map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume} ({grupe.find(g=>g.id === s.grupaId)?.denumire})</option>)}
                            </Select>
                            <Button onClick={adaugaSportivSuplimentar} disabled={!addSportivId} variant='info' size="md"><PlusIcon className="w-5 h-5"/></Button>
                        </div>
                    </Card>
                )}

                <div className="mt-6 flex justify-end items-center gap-4">
                    {showSuccess && <p className="text-green-400 font-semibold">Datele au fost salvate cu succes în baza de date!</p>}
                    <Button onClick={handleSavePrezente} variant="success">Salvează Prezențele</Button>
                </div>
            </Card>
        </div>
    );
};