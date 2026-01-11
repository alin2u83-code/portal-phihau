import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Sportiv, Grupa, Plata, Antrenament, Prezenta, Orar } from '../types';
import { Button, Card, Select } from './ui';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { AlertTriangleIcon } from './icons';

interface PrezentaManagementProps {
    sportivi: Sportiv[];
    grupe: Grupa[];
    plati: Plata[];
    antrenamente: Antrenament[];
    setAntrenamente: React.Dispatch<React.SetStateAction<Antrenament[]>>;
    prezenta: Prezenta[];
    setPrezenta: React.Dispatch<React.SetStateAction<Prezenta[]>>;
    orar: Orar[];
}

export const PrezentaManagement: React.FC<PrezentaManagementProps> = ({ sportivi, grupe, plati, antrenamente, setAntrenamente, prezenta, setPrezenta, orar }) => {
    const [selectedGrupaId, setSelectedGrupaId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const { showError } = useError();
    const today = useMemo(() => new Date().toISOString().split('T')[0], []);

    const antrenamenteAziPtGrupa = useMemo(() => {
        return antrenamente
            .filter(a => a.grupa_id === selectedGrupaId && a.data === today)
            .sort((a,b) => a.ora_start.localeCompare(b.ora_start));
    }, [antrenamente, selectedGrupaId, today]);

    const membriGrupa = useMemo(() => {
        return sportivi.filter(s => s.grupa_id === selectedGrupaId && s.status === 'Activ')
            .sort((a,b) => a.nume.localeCompare(b.nume) || a.prenume.localeCompare(b.prenume));
    }, [sportivi, selectedGrupaId]);
    
    const platiRestanteMap = useMemo(() => {
        const map = new Map<string, boolean>();
        plati.forEach(p => {
            if (p.status !== 'Achitat' && p.tip === 'Abonament') {
                if(p.sportiv_id) map.set(p.sportiv_id, true);
                if(p.familie_id) {
                    sportivi.forEach(s => {
                        if(s.familie_id === p.familie_id) map.set(s.id, true);
                    })
                }
            }
        });
        return map;
    }, [plati, sportivi]);

    const handleGenerateAntrenamente = useCallback(async (grupaId: string) => {
        if (!grupaId || !supabase) return;
        setLoading(true);
        try {
            const grupaOrar = orar.filter(o => o.grupa_id === grupaId);
            const todayDayName = new Date().toLocaleDateString('ro-RO', { weekday: 'long' });
            const todayDayNameCapitalized = todayDayName.charAt(0).toUpperCase() + todayDayName.slice(1);

            const orarPentruAzi = grupaOrar.filter(o => o.ziua === todayDayNameCapitalized);
            const antrenamenteDeCreat: Omit<Antrenament, 'id' | 'sportivi_prezenti_ids'>[] = [];
            
            for (const orarItem of orarPentruAzi) {
                const existaDeja = antrenamente.some(a => a.data === today && a.grupa_id === grupaId && a.ora_start === orarItem.ora_start);
                if (!existaDeja) {
                    antrenamenteDeCreat.push({
                        data: today,
                        grupa_id: grupaId,
                        ora_start: orarItem.ora_start,
                        ora_sfarsit: orarItem.ora_sfarsit,
                        orar_id: orarItem.id,
                        status: 'Programat',
                        is_recurent: orarItem.is_recurent,
                        recurent_group_id: orarItem.recurent_group_id,
                    });
                }
            }
            
            if (antrenamenteDeCreat.length > 0) {
                const { data, error } = await supabase.from('antrenamente').insert(antrenamenteDeCreat).select();
                if (error) throw error;
                if (data) {
                    const newAntrenamente = data.map(a => ({...a, sportivi_prezenti_ids: []}));
                    setAntrenamente(prev => [...prev, ...newAntrenamente]);
                }
            }
        } catch (err) {
            showError("Eroare la generarea automată a antrenamentelor", err);
        } finally {
            setLoading(false);
        }
    }, [orar, antrenamente, today, showError, setAntrenamente]);

    useEffect(() => {
        if (selectedGrupaId) {
            handleGenerateAntrenamente(selectedGrupaId);
        }
    }, [selectedGrupaId, handleGenerateAntrenamente]);


    // FIX: Rewrote function to be more robust, use the correct table name, and handle state updates safely.
    const handleTogglePrezenta = async (antrenamentId: string, sportivId: string) => {
        if (!supabase) return;
        const prezentaRecord = prezenta.find(p => p.antrenament_id === antrenamentId && p.sportiv_id === sportivId);
        
        if (prezentaRecord) {
            // Optimistic delete
            const originalPrezenta = [...prezenta];
            setPrezenta(prev => prev.filter(p => p.id !== prezentaRecord.id));
            try {
                const { error } = await supabase.from('prezenta_antrenament').delete().eq('id', prezentaRecord.id);
                if (error) {
                    showError("Eroare la ștergerea prezenței", error);
                    setPrezenta(originalPrezenta); // Revert on failure
                }
            } catch (err) {
                 showError("Eroare la ștergerea prezenței", err);
                 setPrezenta(originalPrezenta); // Revert
            }
        } else {
            // Insert and then update state to ensure we have the full object with ID
            try {
                const { data, error } = await supabase
                    .from('prezenta_antrenament')
                    .insert({ antrenament_id: antrenamentId, sportiv_id: sportivId, status: 'prezent' })
                    .select()
                    .single();
                if (error) throw error;

                if (data) {
                    setPrezenta(prev => [...prev, data as Prezenta]);
                }
            } catch(err) {
                 showError("Eroare la salvarea prezenței", err);
            }
        }
    };
    
    return (
        <div className="space-y-4">
            <h1 className="text-3xl font-bold text-white">Prezență Rapidă - {new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}</h1>
            <Card>
                <div className="max-w-md">
                    <Select label="Selectează Grupa" value={selectedGrupaId} onChange={e => setSelectedGrupaId(e.target.value)}>
                        <option value="">Alege o grupă...</option>
                        {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                    </Select>
                </div>
            </Card>

            {loading && <p className="text-center text-slate-400 py-4">Se încarcă...</p>}
            
            {!loading && selectedGrupaId && antrenamenteAziPtGrupa.length === 0 && (
                <Card className="text-center text-slate-400">Niciun antrenament programat pentru această grupă astăzi.</Card>
            )}

            {antrenamenteAziPtGrupa.map(antrenament => (
                <Card key={antrenament.id}>
                    <h2 className="text-xl font-bold text-white mb-4">Antrenament {antrenament.ora_start} - {antrenament.ora_sfarsit}</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left table-auto text-[13px]">
                            <thead className="bg-slate-700/50 text-xs uppercase text-slate-400">
                                <tr>
                                    <th className="py-1 px-2">Sportiv</th>
                                    <th className="py-1 px-2 text-center w-32">Status Prezență</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {membriGrupa.map(sportiv => {
                                    const estePrezent = prezenta.some(p => p.antrenament_id === antrenament.id && p.sportiv_id === sportiv.id);
                                    return (
                                        <tr key={sportiv.id} className="hover:bg-slate-700/30">
                                            <td className="py-1 px-2">
                                                <div className="flex items-center gap-2">
                                                    {platiRestanteMap.has(sportiv.id) && <AlertTriangleIcon className="w-4 h-4 text-red-500" title="Plată restantă!" />}
                                                    <span className="font-semibold">{sportiv.nume} {sportiv.prenume}</span>
                                                </div>
                                            </td>
                                            <td className="py-1 px-2 text-center">
                                                 <button 
                                                    onClick={() => handleTogglePrezenta(antrenament.id, sportiv.id)}
                                                    className={`w-20 py-1 text-xs font-bold rounded-md transition-colors ${estePrezent ? 'bg-brand-primary text-white shadow' : 'bg-slate-600 hover:bg-slate-500 text-slate-300'}`}
                                                 >
                                                    {estePrezent ? 'Prezent' : 'Absent'}
                                                 </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        {membriGrupa.length === 0 && <p className="text-center text-slate-400 py-4">Niciun sportiv activ în această grupă.</p>}
                    </div>
                </Card>
            ))}
        </div>
    );
};