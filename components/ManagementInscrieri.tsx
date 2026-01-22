import React, { useState, useMemo } from 'react';
import { SesiuneExamen, Sportiv, InscriereExamen, Grad } from '../types';
import { Button, Input } from './ui';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

// Helper functions
const getAgeOnDate = (birthDateStr: string, onDateStr: string): number => {
    if (!birthDateStr || !onDateStr) return 0;
    const onDate = new Date(onDateStr);
    const birthDate = new Date(birthDateStr);
    let age = onDate.getFullYear() - birthDate.getFullYear();
    const m = onDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && onDate.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};
const getGrad = (gradId: string | null, allGrades: Grad[]): Grad | null => gradId ? allGrades.find(g => g.id === gradId) || null : null;

interface ManagementInscrieriProps {
    sesiune: SesiuneExamen;
    sportivi: Sportiv[];
    allInscrieri: InscriereExamen[];
    grade: Grad[];
    setInscrieri: React.Dispatch<React.SetStateAction<InscriereExamen[]>>;
}

export const ManagementInscrieri: React.FC<ManagementInscrieriProps> = ({ sesiune, sportivi, allInscrieri, grade, setInscrieri }) => {
    const { showError, showSuccess } = useError();
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
    const [searchTerm, setSearchTerm] = useState('');

    const inscrisiInSesiuneIds = useMemo(() => {
        return new Set(allInscrieri.filter(i => i.sesiune_id === sesiune.id).map(i => i.sportiv_id));
    }, [allInscrieri, sesiune.id]);
    
    const sortedGrades = useMemo(() => [...grade].sort((a,b) => a.ordine - b.ordine), [grade]);

    const sportiviData = useMemo(() => {
        return sportivi
            .filter(s => s.status === 'Activ' && `${s.nume} ${s.prenume}`.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(s => {
                const gradActual = getGrad(s.grad_actual_id, grade);

                let gradVizat: Grad | undefined;
                if (!gradActual) {
                    gradVizat = sortedGrades[0];
                } else {
                    gradVizat = sortedGrades.find(g => g.ordine === gradActual.ordine + 1);
                }
                
                return {
                    sportiv: s,
                    gradActual,
                    gradVizat,
                    isEnrolled: inscrisiInSesiuneIds.has(s.id)
                };
            })
            .sort((a, b) => a.sportiv.nume.localeCompare(b.sportiv.nume));
    }, [sportivi, searchTerm, grade, sortedGrades, inscrisiInSesiuneIds]);

    const handleInscriere = async (sportiv: Sportiv, gradVizat: Grad | undefined) => {
        if (!gradVizat) {
            showError("Acțiune Imposibilă", "Nu s-a putut determina gradul vizat (posibil grad maxim atins).");
            return;
        }

        setLoadingStates(prev => ({ ...prev, [sportiv.id]: true }));

        try {
            const varstaLaExamen = getAgeOnDate(sportiv.data_nasterii, sesiune.data);
            const newInscriere = { 
                sportiv_id: sportiv.id, 
                sesiune_id: sesiune.id, 
                grad_actual_id: sportiv.grad_actual_id || null,
                grad_vizat_id: gradVizat.id,
                varsta_la_examen: varstaLaExamen,
                rezultat: 'Neprezentat' as const
            };

            const { data: iData, error: iError } = await supabase
                .from('inscrieri_examene')
                .insert(newInscriere)
                .select('*, sportivi:sportiv_id(*), grade:grad_vizat_id(*)')
                .single();

            if (iError) throw iError;
            
            setInscrieri(prev => [...prev, iData as InscriereExamen]);
            showSuccess("Succes", `${sportiv.nume} a fost înscris.`);

        } catch (err: any) {
            showError("Eroare la Înscriere", err.message);
        } finally {
            setLoadingStates(prev => ({ ...prev, [sportiv.id]: false }));
        }
    };

    return (
        <div className="space-y-4" style={{minWidth: '600px'}}>
            <Input label="" placeholder="Caută sportiv..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <div className="max-h-[60vh] overflow-y-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-700/50 sticky top-0">
                        <tr>
                            <th className="p-2 font-semibold">Sportiv</th>
                            <th className="p-2 font-semibold">Grad Actual</th>
                            <th className="p-2 font-semibold">Grad Vizat</th>
                            <th className="p-2 font-semibold text-right">Acțiuni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {sportiviData.map(({ sportiv, gradActual, gradVizat, isEnrolled }) => (
                            <tr key={sportiv.id} className="hover:bg-slate-700/30">
                                <td className="p-2 font-medium">{sportiv.nume} {sportiv.prenume}</td>
                                <td className="p-2 text-slate-400">{gradActual?.nume || 'Începător'}</td>
                                <td className="p-2 font-semibold text-brand-secondary">{gradVizat?.nume || 'N/A'}</td>
                                <td className="p-2 text-right">
                                    <Button 
                                        size="sm"
                                        variant={isEnrolled ? 'secondary' : 'info'}
                                        onClick={() => handleInscriere(sportiv, gradVizat)}
                                        disabled={isEnrolled || !gradVizat}
                                        isLoading={loadingStates[sportiv.id]}
                                    >
                                        {isEnrolled ? 'Înscris' : 'Înscrie'}
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {sportiviData.length === 0 && <p className="p-8 text-center text-slate-500 italic">Niciun sportiv activ găsit.</p>}
            </div>
        </div>
    );
};