import React, { useState, useMemo } from 'react';
import { SesiuneExamen, Sportiv, InscriereExamen, Grad } from '../types';
import { Button, Input } from './ui';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { TrashIcon } from './icons';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

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
    const [inscriereToDelete, setInscriereToDelete] = useState<InscriereExamen | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const inscrisiInSesiuneIds = useMemo(() => {
        return new Set(allInscrieri.filter(i => i.sesiune_id === sesiune.id).map(i => i.sportiv_id));
    }, [allInscrieri, sesiune.id]);

    const inscrieriSesiune = useMemo(() => {
        return allInscrieri
            .filter(i => i.sesiune_id === sesiune.id)
            .sort((a,b) => (a.sportivi?.nume || '').localeCompare(b.sportivi?.nume || ''));
    }, [allInscrieri, sesiune.id]);
    
    const sortedGrades = useMemo(() => [...grade].sort((a,b) => a.ordine - b.ordine), [grade]);

    const sportiviDisponibiliData = useMemo(() => {
        return sportivi
            .filter(s => 
                s.status === 'Activ' && 
                !inscrisiInSesiuneIds.has(s.id) &&
                `${s.nume} ${s.prenume}`.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map(s => {
                const gradActual = getGrad(s.grad_actual_id, grade);
                let gradVizat: Grad | undefined;
                if (!gradActual) {
                    gradVizat = sortedGrades[0];
                } else {
                    gradVizat = sortedGrades.find(g => g.ordine === gradActual.ordine + 1);
                }
                
                return { sportiv: s, gradActual, gradVizat };
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

    const confirmAnulareInscriere = async () => {
        if (!inscriereToDelete) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase.from('inscrieri_examene').delete().eq('id', inscriereToDelete.id);
            if (error) throw error;

            setInscrieri(prev => prev.filter(i => i.id !== inscriereToDelete.id));
            showSuccess("Succes", "Înscrierea a fost anulată.");
        } catch (err: any) {
            showError("Eroare la anulare", err);
        } finally {
            setIsDeleting(false);
            setInscriereToDelete(null);
        }
    };

    return (
        <div className="space-y-6" style={{minWidth: '600px'}}>
            <div>
                <h3 className="text-lg font-bold text-white mb-2">Participanți Înscriși ({inscrieriSesiune.length})</h3>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                    {inscrieriSesiune.length > 0 ? (
                        inscrieriSesiune.map(inscriere => (
                            <div key={inscriere.id} className="bg-slate-700/50 p-2 pl-4 rounded-md flex justify-between items-center">
                                <div>
                                    <p className="font-medium">{inscriere.sportivi?.nume} {inscriere.sportivi?.prenume}</p>
                                    <p className="text-xs text-slate-400">Vizează: <span className="font-semibold">{inscriere.grade?.nume}</span></p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => setInscriereToDelete(inscriere)}
                                    className="!p-2 h-auto"
                                    title="Anulează înscrierea"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </Button>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-slate-500 italic text-center py-4">Niciun sportiv înscris.</p>
                    )}
                </div>
            </div>

            <div>
                 <h3 className="text-lg font-bold text-white mb-2">Înscrie Sportivi Noi</h3>
                <Input label="" placeholder="Caută sportiv de înscris..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <div className="max-h-[40vh] overflow-y-auto mt-2">
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
                            {sportiviDisponibiliData.map(({ sportiv, gradActual, gradVizat }) => (
                                <tr key={sportiv.id} className="hover:bg-slate-700/30">
                                    <td className="p-2 font-medium">{sportiv.nume} {sportiv.prenume}</td>
                                    <td className="p-2 text-slate-400">{gradActual?.nume || 'Începător'}</td>
                                    <td className="p-2 font-semibold text-brand-secondary">{gradVizat?.nume || 'N/A'}</td>
                                    <td className="p-2 text-right">
                                        <Button 
                                            size="sm"
                                            variant='info'
                                            onClick={() => handleInscriere(sportiv, gradVizat)}
                                            disabled={!gradVizat}
                                            isLoading={loadingStates[sportiv.id]}
                                        >
                                            Înscrie
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {sportiviDisponibiliData.length === 0 && <p className="p-8 text-center text-slate-500 italic">Toți sportivii activi sunt înscriși sau nu corespund căutării.</p>}
                </div>
            </div>
            
            <ConfirmDeleteModal
                isOpen={!!inscriereToDelete}
                onClose={() => setInscriereToDelete(null)}
                onConfirm={confirmAnulareInscriere}
                tableName="înscriere"
                isLoading={isDeleting}
                customMessage="Ești sigur? Această acțiune va anula înscrierea și va șterge factura de taxă examen aferentă."
            />
        </div>
    );
};