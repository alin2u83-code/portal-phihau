import React, { useState, useEffect, useMemo } from 'react';
import { SesiuneExamen, InscriereExamen, Sportiv, Grad } from '../types';
import { Button, Card, Switch } from './ui';
import { ArrowLeftIcon, ShieldCheckIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface ParticipantStatus extends InscriereExamen {
    numeComplet: string;
    numeGrad: string;
    isAdmis: boolean;
}

interface FinalizeExamProps {
    sesiune: SesiuneExamen;
    inscrieriSesiune: InscriereExamen[];
    sportivi: Sportiv[];
    grade: Grad[];
    setInscrieri: React.Dispatch<React.SetStateAction<InscriereExamen[]>>;
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    onBack: () => void;
}

export const FinalizeExam: React.FC<FinalizeExamProps> = ({ sesiune, inscrieriSesiune, sportivi, grade, setInscrieri, setSportivi, onBack }) => {
    const { showError, showSuccess } = useError();
    const [participants, setParticipants] = useState<ParticipantStatus[]>([]);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const enhancedParticipants = inscrieriSesiune.map(inscriere => {
            const sportiv = sportivi.find(s => s.id === inscriere.sportiv_id);
            const grad = grade.find(g => g.id === inscriere.grad_vizat_id);
            return {
                ...inscriere,
                numeComplet: sportiv ? `${sportiv.nume} ${sportiv.prenume}` : 'N/A',
                numeGrad: grad?.nume || 'N/A',
                isAdmis: inscriere.rezultat === 'Admis' || (!inscriere.rezultat && (inscriere.media_generala || 0) >= 5)
            };
        }).sort((a,b) => a.numeComplet.localeCompare(b.numeComplet));
        setParticipants(enhancedParticipants);
    }, [inscrieriSesiune, sportivi, grade]);
    
    const handleStatusChange = (id: string, isAdmis: boolean) => {
        setParticipants(prev => prev.map(p => p.id === id ? { ...p, isAdmis } : p));
    };

    const handleFinalize = async () => {
        setIsConfirmModalOpen(false);
        setLoading(true);

        const sportiviAdmis = participants.filter(p => p.isAdmis);

        const inscrieriUpdates = participants.map(p => ({
            id: p.id,
            rezultat: p.isAdmis ? 'Admis' as const : 'Respins' as const,
        }));
        
        const sportiviUpdates = sportiviAdmis.map(p => ({
            id: p.sportiv_id,
            grad_actual_id: p.grad_vizat_id,
        }));
        
        const istoricInserts = sportiviAdmis.map(p => ({
            sportiv_id: p.sportiv_id,
            grad_id: p.grad_vizat_id,
            data_obtinere: sesiune.data,
            sesiune_examen_id: sesiune.id,
        }));

        try {
            // NOTE: Aceste operațiuni ar trebui ideal să fie într-o tranzacție (RPC).
            // Le executăm secvențial pentru a asigura o consistență mai bună în caz de eroare.
            if(inscrieriUpdates.length > 0) {
                const { error } = await supabase.from('inscrieri_examene').upsert(inscrieriUpdates);
                if(error) throw error;
            }
            if(sportiviUpdates.length > 0) {
                // Supabase upsert doesn't work well for batch updates on different rows, so we use RPC or loop
                for (const update of sportiviUpdates) {
                    const { error } = await supabase.from('sportivi').update({ grad_actual_id: update.grad_actual_id }).eq('id', update.id);
                    if (error) throw new Error(`Eroare la actualizarea sportivului ${update.id}: ${error.message}`);
                }
            }
            if(istoricInserts.length > 0) {
                const { error } = await supabase.from('istoric_grade').insert(istoricInserts);
                if(error) throw error;
            }

            // Update local state
            setInscrieri(prev => prev.map(i => {
                const update = inscrieriUpdates.find(u => u.id === i.id);
                return update ? { ...i, rezultat: update.rezultat } : i;
            }));
            setSportivi(prev => prev.map(s => {
                const update = sportiviUpdates.find(u => u.id === s.id);
                return update ? { ...s, grad_actual_id: update.grad_actual_id } : s;
            }));

            showSuccess("Examen Finalizat!", `${sportiviAdmis.length} sportivi au fost promovați cu succes.`);
            onBack();

        } catch (err: any) {
            showError("Eroare la Finalizare", err);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-4"><ArrowLeftIcon /> Înapoi la detalii</Button>
            <Card>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Finalizare Examen & Promovare</h2>
                        <p className="text-slate-400">Sesiunea din {new Date(sesiune.data + 'T00:00:00').toLocaleDateString('ro-RO')}</p>
                    </div>
                     <Button variant="success" onClick={() => setIsConfirmModalOpen(true)} isLoading={loading}>
                        <ShieldCheckIcon className="w-5 h-5 mr-2" />
                        Finalizează Examen
                    </Button>
                </div>

                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-700/50">
                            <tr>
                                <th className="p-2 font-semibold">Nume Sportiv</th>
                                <th className="p-2 font-semibold">Grad Susținut</th>
                                <th className="p-2 font-semibold text-center">Medie Generală</th>
                                <th className="p-2 font-semibold text-center">Status Final (Admis)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {participants.map(p => (
                                <tr key={p.id} className="hover:bg-slate-700/20">
                                    <td className="p-2 font-medium">{p.numeComplet}</td>
                                    <td className="p-2">{p.numeGrad}</td>
                                    <td className={`p-2 text-center font-bold ${ (p.media_generala || 0) >= 5 ? 'text-green-400' : 'text-red-400'}`}>
                                        {p.media_generala?.toFixed(2) ?? 'N/A'}
                                    </td>
                                    <td className="p-2 text-center">
                                         <Switch label="" name={`admis-${p.id}`} checked={p.isAdmis} onChange={e => handleStatusChange(p.id, e.target.checked)} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </Card>

            <ConfirmDeleteModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleFinalize}
                tableName="examen"
                isLoading={loading}
                title="Confirmare Finalizare"
                customMessage={`Sunteți sigur că doriți să finalizați examenul? Această acțiune va actualiza gradele pentru ${participants.filter(p => p.isAdmis).length} sportivi și nu poate fi anulată.`}
                confirmButtonText="Da, finalizează"
                confirmButtonVariant="success"
                icon={ShieldCheckIcon}
            />
        </div>
    );
};
