import React, { useState, useEffect, useMemo } from 'react';
import { Prezenta, Sportiv, Grupa, Plata } from '../types';
import { Button, Card, Input, Select } from './ui';
import { PlusIcon, ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';

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
    
    const [sportiviPrezenti, setSportiviPrezenti] = useState<Set<string>>(new Set());
    const [extraSportiviIds, setExtraSportiviIds] = useState<Set<string>>(new Set());
    const [addSportivId, setAddSportivId] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const platiRestante = useMemo(() => {
        const lunaCurenta = new Date(dataSelectata).getMonth();
        const anulCurent = new Date(dataSelectata).getFullYear();
        const sportiviCuRestante = new Set<string>();

        sportivi.forEach(s => {
            if (s.status !== 'Activ') return;
            let areAbonamentPlatit = false;
            if (s.familie_id) {
                areAbonamentPlatit = plati.some(p => p.familie_id === s.familie_id && p.tip === 'Abonament' && p.status === 'Achitat' && new Date(p.data).getMonth() === lunaCurenta && new Date(p.data).getFullYear() === anulCurent);
            } else {
                areAbonamentPlatit = plati.some(p => p.sportiv_id === s.id && p.tip === 'Abonament' && p.status === 'Achitat' && new Date(p.data).getMonth() === lunaCurenta && new Date(p.data).getFullYear() === anulCurent);
            }
            if (!areAbonamentPlatit) { sportiviCuRestante.add(s.id); }
        });
        return sportiviCuRestante;
    }, [sportivi, plati, dataSelectata]);

    useEffect(() => { if (grupe.length > 0 && !grupaSelectataId) { setGrupaSelectataId(grupe[0].id); } }, [grupe, grupaSelectataId]);

    useEffect(() => {
        const grupaIdCurenta = tipAntrenament === 'Vacanta' ? null : grupaSelectataId;
        const prezentaExistenta = prezente.find(p => p.data === dataSelectata && p.ora === oraSelectata && p.grupa_id === grupaIdCurenta && p.tip === tipAntrenament);
        
        const sportiviGrupaCurenta = sportivi.filter(s => s.grupa_id === grupaSelectataId).map(s => s.id);

        if (prezentaExistenta) {
            setSportiviPrezenti(new Set(prezentaExistenta.sportivi_prezenti_ids));
            if (tipAntrenament !== 'Vacanta') {
                const extra = prezentaExistenta.sportivi_prezenti_ids.filter(id => !sportiviGrupaCurenta.includes(id));
                setExtraSportiviIds(new Set(extra));
            } else {
                setExtraSportiviIds(new Set());
            }
        } else {
            setSportiviPrezenti(new Set());
            setExtraSportiviIds(new Set());
        }
    }, [dataSelectata, oraSelectata, grupaSelectataId, tipAntrenament, prezente, sportivi]);

    const handleTogglePrezenta = (sportivId: string) => { setSportiviPrezenti(prev => { const newSet = new Set(prev); if (newSet.has(sportivId)) { newSet.delete(sportivId); } else { newSet.add(sportivId); } return newSet; }); };

    const handleSavePrezente = async () => {
        if (!supabase) { alert("Eroare de configurare Supabase."); return; }
        const grupaIdCurenta = tipAntrenament === 'Vacanta' ? null : grupaSelectataId;
        if (!grupaIdCurenta && tipAntrenament !== 'Vacanta') { alert("Vă rugăm selectați o grupă."); return; }
        setLoading(true);

        const prezentaRecordData = { data: dataSelectata, ora: oraSelectata, grupa_id: grupaIdCurenta, tip: tipAntrenament };
        const prezentaExistenta = prezente.find(p => p.data === dataSelectata && p.ora === oraSelectata && p.grupa_id === grupaIdCurenta && p.tip === tipAntrenament);

        let prezenta_id = prezentaExistenta?.id;
        let newPrezentaRecord: Prezenta | null = null;

        if (prezentaExistenta) {
            prezenta_id = prezentaExistenta.id;
        } else {
            const { data, error } = await supabase.from('prezente').insert(prezentaRecordData).select().single();
            if (error) { alert(`Eroare la salvarea prezenței: ${error.message}`); setLoading(false); return; }
            prezenta_id = data.id;
            newPrezentaRecord = { ...data, sportivi_prezenti_ids: [] };
        }

        if (!prezenta_id) { alert("ID-ul prezenței nu a putut fi determinat."); setLoading(false); return; }

        const { error: deleteError } = await supabase.from('prezente_sportivi').delete().eq('prezenta_id', prezenta_id);
        if (deleteError) { alert(`Eroare la actualizarea listei de prezență (pas 1): ${deleteError.message}`); setLoading(false); return; }

        const sportiviToInsert = [...sportiviPrezenti].map(sportiv_id => ({ prezenta_id, sportiv_id }));
        if (sportiviToInsert.length > 0) {
            const { error: insertError } = await supabase.from('prezente_sportivi').insert(sportiviToInsert);
            if (insertError) { alert(`Eroare la actualizarea listei de prezență (pas 2): ${insertError.message}`); setLoading(false); return; }
        }

        // FIX: Replaced Array.from with spread operator to ensure correct type inference.
        const finalSportiviPrezenti = [...sportiviPrezenti];
        setPrezente(prevPrezente => {
            if (prezentaExistenta) {
                return prevPrezente.map(p => p.id === prezenta_id ? { ...p, sportivi_prezenti_ids: finalSportiviPrezenti } : p);
            } else if (newPrezentaRecord) {
                newPrezentaRecord.sportivi_prezenti_ids = finalSportiviPrezenti;
                return [...prevPrezente, newPrezentaRecord];
            }
            return prevPrezente;
        });

        setLoading(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };
    
    const sportiviAfisati = useMemo(() => {
        if(tipAntrenament === 'Vacanta') {
            return sportivi.filter(s => s.status === 'Activ' && s.participa_vacanta);
        }
        const sportiviGrupa = sportivi.filter(s => s.status === 'Activ' && s.grupa_id === grupaSelectataId);
        const extraSportivi = Array.from(extraSportiviIds).map(id => sportivi.find(s => s.id === id)).filter(Boolean) as Sportiv[];
        return [...sportiviGrupa, ...extraSportivi].filter((s, i, arr) => arr.findIndex(t => t.id === s.id) === i);
    }, [sportivi, grupaSelectataId, extraSportiviIds, tipAntrenament]);
    
    const adaugaSportivSuplimentar = () => { if(addSportivId && !extraSportiviIds.has(addSportivId)) { setExtraSportiviIds(prev => new Set(prev).add(addSportivId)); setAddSportivId(''); } };
    const potentialExtraSportivi = sportivi.filter(s => s.status === 'Activ' && s.grupa_id !== grupaSelectataId && !extraSportiviIds.has(s.id));

    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            <h1 className="text-3xl font-bold text-slate-900 mb-6">Prezență Antrenament</h1>
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-slate-100 rounded-lg items-end border border-slate-200">
                    <Input label="Data" type="date" value={dataSelectata} onChange={e => setDataSelectata(e.target.value)} />
                    <Input label="Ora" type="time" value={oraSelectata} onChange={e => setOraSelectata(e.target.value)} />
                     <Select label="Tip Antrenament" name="tipAntrenament" value={tipAntrenament} onChange={e => setTipAntrenament(e.target.value as any)}>
                        <option value="Normal">Normal</option>
                        <option value="Vacanta">Vacanță</option>
                    </Select>
                </div>

                <div className="p-4 rounded-lg bg-slate-100 border border-slate-200">
                     <div className="flex justify-between items-center">
                        <h3 className="text-xl font-semibold text-slate-900">
                           {tipAntrenament === 'Vacanta' ? "Listă Sportivi de Vacanță" : "Listă Sportivi Grupă"}
                        </h3>
                    </div>

                    {tipAntrenament === 'Normal' && (
                        <Select label="Selectează Grupa" value={grupaSelectataId} onChange={e => setGrupaSelectataId(e.target.value)} className="mt-4">
                            {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                        </Select>
                    )}
                    
                    <div className="space-y-3 mt-4">
                        {sportiviAfisati.length > 0 ? sportiviAfisati.map(sportiv => (
                            <div key={sportiv.id} className="flex items-center justify-between bg-white p-3 rounded-md border border-slate-200">
                                <label htmlFor={`check-${sportiv.id}`} className="font-medium cursor-pointer flex items-center text-slate-800">
                                    {platiRestante.has(sportiv.id) && <span className="w-3 h-3 bg-red-500 rounded-full mr-3" title="Abonament neachitat"></span>}
                                    {sportiv.nume} {sportiv.prenume} 
                                    {tipAntrenament === 'Normal' && extraSportiviIds.has(sportiv.id) && <span className="ml-2 text-xs bg-sky-500 text-white px-2 py-0.5 rounded-full">Ad-hoc</span>}
                                </label>
                                <input id={`check-${sportiv.id}`} type="checkbox" className="h-6 w-6 rounded border-slate-400 text-brand-primary focus:ring-brand-secondary cursor-pointer" checked={sportiviPrezenti.has(sportiv.id)} onChange={() => handleTogglePrezenta(sportiv.id)}/>
                            </div>
                        )) : <p className="text-slate-500 text-center py-4">Niciun sportiv de afișat conform filtrelor.</p>}
                    </div>
                </div>

                {tipAntrenament === 'Normal' && (
                    <Card className="mt-6 bg-slate-50">
                        <h4 className="font-semibold mb-2 text-slate-900">Adaugă sportiv ad-hoc</h4>
                        <div className="flex gap-4">
                            <Select label="" value={addSportivId} onChange={e => setAddSportivId(e.target.value)} className="flex-grow">
                                <option value="">Selectează un sportiv...</option>
                                {potentialExtraSportivi.map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume} ({grupe.find(g=>g.id === s.grupa_id)?.denumire})</option>)}
                            </Select>
                            <Button onClick={adaugaSportivSuplimentar} disabled={!addSportivId} variant='info' size="md"><PlusIcon className="w-5 h-5"/></Button>
                        </div>
                    </Card>
                )}

                <div className="mt-6 flex justify-end items-center gap-4">
                    {showSuccess && <p className="text-green-600 font-semibold">Datele au fost salvate cu succes!</p>}
                    <Button onClick={handleSavePrezente} variant="success" disabled={loading}>
                        {loading ? 'Se salvează...' : 'Salvează Prezențele'}
                    </Button>
                </div>
            </Card>
        </div>
    );
};