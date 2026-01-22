import React, { useState, useMemo } from 'react';
import { SesiuneExamen, Sportiv, InscriereExamen, Grad } from '../types';
import { Button, Input, Modal, Select } from './ui';
import { CheckIcon } from './icons';
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
    const [searchTerm, setSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [sportivPentruInscriere, setSportivPentruInscriere] = useState<Sportiv | null>(null);
    const [gradSustinutId, setGradSustinutId] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    const inscrisiInSesiuneIds = useMemo(() => {
        return new Set(allInscrieri.filter(i => i.sesiune_id === sesiune.id).map(i => i.sportiv_id));
    }, [allInscrieri, sesiune.id]);
    
    const sortedGrades = useMemo(() => [...grade].sort((a,b) => a.ordine - b.ordine), [grade]);

    const filteredSportivi = useMemo(() => {
        return sportivi
            .filter(s => 
                s.status === 'Activ' && 
                `${s.nume} ${s.prenume}`.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => a.nume.localeCompare(b.nume));
    }, [sportivi, searchTerm]);

    const handleOpenModal = (sportiv: Sportiv) => {
        setSportivPentruInscriere(sportiv);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSportivPentruInscriere(null);
        setGradSustinutId('');
    };

    const handleSaveInscriere = async () => {
        if (!sportivPentruInscriere || !gradSustinutId) {
            showError("Date lipsă", "Vă rugăm selectați un grad pentru care sportivul va susține examenul.");
            return;
        }

        setIsSaving(true);
        try {
            const varstaLaExamen = getAgeOnDate(sportivPentruInscriere.data_nasterii, sesiune.data);
            const newInscriere = { 
                sportiv_id: sportivPentruInscriere.id, 
                sesiune_id: sesiune.id, 
                grad_actual_id: sportivPentruInscriere.grad_actual_id || null,
                grad_vizat_id: gradSustinutId,
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
            showSuccess("Succes", `${sportivPentruInscriere.nume} a fost înscris.`);
            handleCloseModal();

        } catch (err: any) {
            showError("Eroare la Înscriere", err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4" style={{minWidth: '600px'}}>
            <h3 className="text-lg font-bold text-white mb-2">Înscriere Sportivi la Examen</h3>
            <Input label="" placeholder="Caută sportiv..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <div className="max-h-[50vh] overflow-y-auto mt-2">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-700/50 sticky top-0">
                        <tr>
                            <th className="p-2 font-semibold">Sportiv</th>
                            <th className="p-2 font-semibold">Grad Actual</th>
                            <th className="p-2 font-semibold text-right">Acțiuni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {filteredSportivi.map(sportiv => {
                            const isInscris = inscrisiInSesiuneIds.has(sportiv.id);
                            const gradActual = getGrad(sportiv.grad_actual_id, grade);
                            return (
                                <tr key={sportiv.id} className={`hover:bg-slate-700/30 transition-colors ${isInscris ? 'bg-slate-700/20' : ''}`}>
                                    <td className="p-2 font-medium">{sportiv.nume} {sportiv.prenume}</td>
                                    <td className="p-2 text-slate-400">{gradActual?.nume || 'Începător'}</td>
                                    <td className="p-2 text-right">
                                        {isInscris ? (
                                            <Button size="sm" variant="success" disabled className="!cursor-default opacity-80">
                                                <CheckIcon className="w-4 h-4 mr-1"/> Înscris
                                            </Button>
                                        ) : (
                                            <Button 
                                                size="sm"
                                                variant='info'
                                                onClick={() => handleOpenModal(sportiv)}
                                            >
                                                Înscrie
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredSportivi.length === 0 && <p className="p-8 text-center text-slate-500 italic">Niciun sportiv activ nu corespunde căutării.</p>}
            </div>

            {sportivPentruInscriere && (
                <Modal 
                    isOpen={isModalOpen} 
                    onClose={handleCloseModal} 
                    title={`Înscriere Examen: ${sportivPentruInscriere.nume} ${sportivPentruInscriere.prenume}`}
                >
                    <div className="space-y-4">
                        <Select
                            label="Selectează gradul pentru care va susține examenul"
                            value={gradSustinutId}
                            onChange={(e) => setGradSustinutId(e.target.value)}
                            required
                        >
                            <option value="">Alege un grad...</option>
                            {sortedGrades.map(g => (
                                <option key={g.id} value={g.id}>{g.nume} (ord. {g.ordine})</option>
                            ))}
                        </Select>
                        <div className="flex justify-end pt-4 gap-2 border-t border-slate-700">
                            <Button variant="secondary" onClick={handleCloseModal} disabled={isSaving}>Anulează</Button>
                            <Button variant="primary" onClick={handleSaveInscriere} isLoading={isSaving} disabled={!gradSustinutId}>
                                Salvează Înscrierea
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};