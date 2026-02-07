import React, { useState, useMemo, useEffect } from 'react';
import { SesiuneExamen, Sportiv, InscriereExamen, Grad, Plata, PretConfig, IstoricGrade } from '../types';
import { Button, Input, Modal, Select, Card } from './ui';
import { TrashIcon, PlusIcon, EditIcon, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { getPretProdus } from '../utils/pricing';
import { calculateEligibleGrade } from '../utils/eligibility';

interface BulkAddSportiviModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (selections: { sportiv_id: string; grad_vizat_id: string }[]) => Promise<void>;
    sportivi: Sportiv[];
    grade: Grad[];
    sesiune: SesiuneExamen;
    inscrisiIds: Set<string>;
}

const BulkAddSportiviModal: React.FC<BulkAddSportiviModalProps> = ({ isOpen, onClose, onSave, sportivi, grade, sesiune, inscrisiIds }) => {
    const [selections, setSelections] = useState<Map<string, string>>(new Map());
    const [filterTerm, setFilterTerm] = useState('');
    const [loading, setLoading] = useState(false);

    const availableSportivi = useMemo(() => {
        return (sportivi || [])
            .filter(s => s.status === 'Activ' && !inscrisiIds.has(s.id))
            .map(s => {
                const eligibility = calculateEligibleGrade(s, sesiune, grade);
                return {
                    ...s,
                    recommendedGradeId: eligibility.recommendedGrade?.id || '',
                    eligibilityMessage: eligibility.message
                };
            })
            .sort((a, b) => a.nume.localeCompare(b.nume));
    }, [sportivi, grade, inscrisiIds, sesiune]);
    
    const handleSelect = (sportivId: string, gradId: string, isChecked: boolean) => {
        setSelections(prev => {
            const next = new Map(prev);
            if (isChecked) next.set(sportivId, gradId);
            else next.delete(sportivId);
            return next;
        });
    };

    const handleSaveClick = async () => {
        setLoading(true);
        const arr = Array.from(selections.entries()).map(([sportiv_id, grad_vizat_id]) => ({ sportiv_id, grad_vizat_id }));
        await onSave(arr);
        setLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Înscriere Lot Examen">
            <div className="space-y-4">
                <input
                    placeholder="Caută în lotul sportiv..."
                    value={filterTerm}
                    onChange={e => setFilterTerm(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none"
                />
                <div className="max-h-96 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                   {availableSportivi.filter(s => `${s.nume} ${s.prenume}`.toLowerCase().includes(filterTerm.toLowerCase())).map(s => {
                       const isSelected = selections.has(s.id);
                       return (
                           <div key={s.id} className={`p-4 rounded-xl border transition-all ${isSelected ? 'bg-blue-600/10 border-blue-500' : 'bg-slate-800/40 border-slate-700'}`}>
                               <div className="flex items-center gap-4">
                                   <input
                                       type="checkbox"
                                       checked={isSelected}
                                       onChange={(e) => handleSelect(s.id, selections.get(s.id) || s.recommendedGradeId, e.target.checked)}
                                       className="h-5 w-5 rounded border-slate-500 bg-slate-900 text-blue-500"
                                   />
                                   <div className="flex-grow">
                                       <p className="font-black text-white uppercase text-sm tracking-tight">{s.nume} {s.prenume}</p>
                                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.eligibilityMessage}</p>
                                   </div>
                                   <div className="w-40">
                                       <Select
                                           label=""
                                           value={selections.get(s.id) || s.recommendedGradeId}
                                           onChange={(e) => handleSelect(s.id, e.target.value, true)}
                                           disabled={!isSelected}
                                           className="!py-1 !text-xs !font-bold"
                                       >
                                           <option value="">Selectează Grad</option>
                                           {grade.map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}
                                       </Select>
                                   </div>
                               </div>
                           </div>
                       );
                   })}
                </div>
                <div className="flex justify-end pt-4 gap-2 border-t border-slate-800">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button variant="primary" onClick={handleSaveClick} isLoading={loading} disabled={selections.size === 0}>
                        Înscrie {selections.size} Sportivi
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export const ManagementInscrieri: React.FC<{
    sesiune: SesiuneExamen;
    sportivi: Sportiv[];
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    allInscrieri: InscriereExamen[];
    grade: Grad[];
    setInscrieri: React.Dispatch<React.SetStateAction<InscriereExamen[]>>;
    plati: Plata[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    preturiConfig: PretConfig[];
    onViewSportiv: (sportiv: Sportiv) => void;
}> = ({ sesiune, sportivi, setSportivi, allInscrieri, grade, setInscrieri, plati, setPlati, preturiConfig, onViewSportiv }) => {
    const { showError, showSuccess } = useError();
    const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [inscriereToDelete, setInscriereToDelete] = useState<InscriereExamen | null>(null);

    const participantiInscrisi = useMemo(() => {
        return (allInscrieri || []).filter(i => i.sesiune_id === sesiune.id);
    }, [allInscrieri, sesiune.id]);

    const handleBulkSave = async (selections: { sportiv_id: string; grad_vizat_id: string }[]) => {
        try {
            const newInscrieri: InscriereExamen[] = [];
            const newPlati: Plata[] = [];

            for (const item of selections) {
                const sportiv = sportivi.find(s => s.id === item.sportiv_id)!;
                const grad = grade.find(g => g.id === item.grad_vizat_id)!;
                
                // 1. Calcul preț pe baza gradului vizat
                const taxa = getPretProdus(preturiConfig, 'Taxa Examen', grad.nume, { dataReferinta: sesiune.data });
                let plataId = null;

                if (taxa) {
                    const { data: pData, error: pError } = await supabase.from('plati').insert({
                        sportiv_id: sportiv.id,
                        suma: taxa.suma,
                        data: sesiune.data,
                        status: 'Neachitat',
                        descriere: `Taxă Examen ${grad.nume} - ${sesiune.data}`,
                        tip: 'Taxa Examen'
                    }).select().single();
                    if (pError) throw pError;
                    plataId = pData.id;
                    newPlati.push(pData as Plata);
                }

                // 2. Inserare înscriere
                const { data: iData, error: iError } = await supabase.from('inscrieri_examene').insert({
                    sportiv_id: sportiv.id,
                    sesiune_id: sesiune.id,
                    grad_vizat_id: grad.id,
                    plata_id: plataId,
                    rezultat: 'Neprezentat'
                }).select('*, sportivi:sportiv_id(*), grades:grad_vizat_id(*)').single();

                if (iError) throw iError;
                newInscrieri.push(iData as InscriereExamen);
            }

            setPlati(prev => [...prev, ...newPlati]);
            setInscrieri(prev => [...prev, ...newInscrieri]);
            showSuccess("Succes", `${selections.length} sportivi au fost înscriși.`);
            setIsBulkAddModalOpen(false);
        } catch (err: any) {
            showError("Eroare la înscriere", err.message);
        }
    };

    const handleWithdraw = async () => {
        if (!inscriereToDelete) return;
        setIsDeleting(true);
        try {
            // Ștergem și factura dacă nu a fost achitată
            if (inscriereToDelete.plata_id) {
                const plata = plati.find(p => p.id === inscriereToDelete.plata_id);
                if (plata && plata.status === 'Neachitat') {
                    await supabase.from('plati').delete().eq('id', plata.id);
                    setPlati(prev => prev.filter(p => p.id !== plata.id));
                }
            }
            const { error } = await supabase.from('inscrieri_examene').delete().eq('id', inscriereToDelete.id);
            if (error) throw error;
            setInscrieri(prev => prev.filter(i => i.id !== inscriereToDelete.id));
            showSuccess("Succes", "Sportiv retras.");
            setInscriereToDelete(null);
        } catch (err: any) {
            showError("Eroare", err.message);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Lista Participanților ({participantiInscrisi.length})</h3>
                <Button onClick={() => setIsBulkAddModalOpen(true)} variant="primary" className="w-full sm:w-auto btn-primary">
                    <PlusIcon className="w-4 h-4" /> Înscrie Lot Sportiv
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {participantiInscrisi.map(i => (
                    <Card key={i.id} className="glass-card p-5 group relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-grow">
                                <h4 className="font-black text-white uppercase text-lg leading-tight truncate">{i.sportivi.nume} {i.sportivi.prenume}</h4>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Înscris pentru: <span className="text-blue-400">{i.grades.nume}</span></p>
                            </div>
                            <Button 
                                variant="danger" 
                                size="sm" 
                                onClick={() => setInscriereToDelete(i)}
                                className="!p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800">
                             <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-slate-600 uppercase">Factură Examen</span>
                                <span className={`text-xs font-bold ${plati.find(p => p.id === i.plata_id)?.status === 'Achitat' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {plati.find(p => p.id === i.plata_id)?.status || 'Fără Factură'}
                                </span>
                             </div>
                             <Button size="sm" variant="secondary" onClick={() => onViewSportiv(i.sportivi)}>Profil Complet</Button>
                        </div>
                    </Card>
                ))}
            </div>

            {participantiInscrisi.length === 0 && (
                <div className="p-16 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                    <p className="text-slate-500 font-bold uppercase italic tracking-widest">Lotul nu a fost încă înscris</p>
                </div>
            )}

            <BulkAddSportiviModal
                isOpen={isBulkAddModalOpen}
                onClose={() => setIsBulkAddModalOpen(false)}
                onSave={handleBulkSave}
                sportivi={sportivi}
                grade={grade}
                sesiune={sesiune}
                inscrisiIds={new Set(participantiInscrisi.map(i => i.sportiv_id))}
            />

            <ConfirmDeleteModal 
                isOpen={!!inscriereToDelete}
                onClose={() => setInscriereToDelete(null)}
                onConfirm={handleWithdraw}
                tableName="înscriere"
                isLoading={isDeleting}
                customMessage={`Retrageți sportivul ${inscriereToDelete?.sportivi.nume} de la examen? Factura neachitată va fi ștearsă.`}
            />
        </div>
    );
};
