import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { SesiuneExamen, Sportiv, InscriereExamen, Grad, Plata, PretConfig, IstoricGrade } from '../types';
import { Button, Input, Modal, Select, Card } from './ui';
import { TrashIcon, PlusIcon, EditIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { getPretProdus } from '../utils/pricing';
import { getEligibleGrade } from '../utils/eligibility';
import { sendBulkNotifications } from '../utils/notifications';

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

const getDefaultNextGradeId = (sportiv: Sportiv, allGrades: Grad[]): string => {
    const currentGrade = allGrades.find(g => g.id === sportiv.grad_actual_id);
    const currentOrder = currentGrade ? currentGrade.ordine : -1;
    const sortedGrades = [...allGrades].sort((a,b) => a.ordine - b.ordine);
    const nextGrade = sortedGrades.find(g => g.ordine === currentOrder + 1);
    return nextGrade ? nextGrade.id : '';
};

interface BulkAddSportiviModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (selections: { sportiv_id: string; grad_vizat_id: string }[]) => Promise<void>;
    sportivi: Sportiv[];
    grade: Grad[];
    istoricGrade: IstoricGrade[];
    inscrisiIds: Set<string>;
}

const BulkAddSportiviModal: React.FC<BulkAddSportiviModalProps> = ({ isOpen, onClose, onSave, sportivi, grade, istoricGrade, inscrisiIds }) => {
    const [selections, setSelections] = useState<Map<string, string>>(new Map());
    const [filterTerm, setFilterTerm] = useState('');
    const [loading, setLoading] = useState(false);

    const availableSportivi = useMemo(() => {
        return (sportivi || [])
            .filter(s => s.status === 'Activ' && !inscrisiIds.has(s.id))
            .map(s => {
                // Eligibility check logic
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

                const lastPromotion = (istoricGrade || [])
                    .filter(ig => ig.sportiv_id === s.id)
                    .sort((a, b) => new Date(b.data_obtinere).getTime() - new Date(a.data_obtinere).getTime())[0];

                const lastPromotionDate = lastPromotion ? new Date(lastPromotion.data_obtinere) : new Date(s.data_inscrierii);
                const isEligible = lastPromotionDate <= sixMonthsAgo;

                return {
                    ...s,
                    defaultNextGradeId: getDefaultNextGradeId(s, grade),
                    isEligible: isEligible,
                    lastPromotionDate: lastPromotionDate.toLocaleDateString('ro-RO')
                };
            })
            .sort((a, b) => a.nume.localeCompare(b.nume));
    }, [sportivi, grade, inscrisiIds, istoricGrade]);
    
    const filteredSportivi = useMemo(() => {
        if (!filterTerm) return availableSportivi;
        return availableSportivi.filter(s => 
            `${s.nume} ${s.prenume}`.toLowerCase().includes(filterTerm.toLowerCase())
        );
    }, [availableSportivi, filterTerm]);

    const handleSelect = (sportivId: string, gradVizatId: string, isChecked: boolean) => {
        setSelections(prev => {
            const next = new Map(prev);
            if (isChecked) {
                next.set(sportivId, gradVizatId);
            } else {
                next.delete(sportivId);
            }
            return next;
        });
    };

    const handleGradeChange = (sportivId: string, newGradId: string) => {
        setSelections(prev => {
            const next = new Map(prev);
            if (next.has(sportivId)) {
                next.set(sportivId, newGradId);
            }
            return next;
        });
    };
    
    const handleSaveClick = async () => {
        setLoading(true);
        const selectionsArray = Array.from(selections.entries()).map(([sportiv_id, grad_vizat_id]) => ({
            sportiv_id,
            grad_vizat_id,
        }));
        await onSave(selectionsArray);
        setLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Adaugă Participanți la Examen">
            <div className="space-y-4">
                <Input
                    label=""
                    placeholder="Filtrează sportivi..."
                    value={filterTerm}
                    onChange={e => setFilterTerm(e.target.value)}
                />
                <div className="max-h-96 overflow-y-auto space-y-2 p-2 bg-slate-900/50 rounded-lg border border-slate-700">
                   {(filteredSportivi || []).map(s => {
                       const isSelected = selections.has(s.id);
                       const { isEligible, lastPromotionDate } = s;
                       return (
                           <div key={s.id} className={`p-2 rounded-md transition-colors ${isSelected ? 'bg-brand-secondary/20' : (isEligible ? 'bg-slate-700/50' : 'bg-red-900/20 opacity-70')}`}>
                               <div className="flex items-center gap-3">
                                   <input
                                       type="checkbox"
                                       checked={isSelected}
                                       onChange={(e) => handleSelect(s.id, selections.get(s.id) || s.defaultNextGradeId, e.target.checked)}
                                       className="h-5 w-5 rounded border-slate-500 bg-slate-900 text-brand-secondary focus:ring-brand-secondary focus:ring-offset-slate-800"
                                       disabled={!isEligible}
                                   />
                                   <div className="flex-grow">
                                       <p className={`font-medium ${!isEligible ? 'text-slate-400' : 'text-white'}`}>{s.nume} {s.prenume}</p>
                                       {!isEligible ? (
                                            <p className="text-xs text-red-400">Ineligibil (Ultima promovare: {lastPromotionDate})</p>
                                       ) : (
                                            <p className="text-xs text-slate-400">Grad actual: {(grade || []).find(g=>g.id === s.grad_actual_id)?.nume || 'Începător'}</p>
                                       )}
                                   </div>
                                   <div className="w-48">
                                       <Select
                                           label=""
                                           value={selections.get(s.id) || s.defaultNextGradeId}
                                           onChange={(e) => handleGradeChange(s.id, e.target.value)}
                                           disabled={!isSelected || !isEligible}
                                           className="!py-1 text-xs"
                                       >
                                           <option value="">Alege grad...</option>
                                           {(grade || []).map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}
                                       </Select>
                                   </div>
                               </div>
                           </div>
                       );
                   })}
                </div>
                <div className="flex justify-end pt-4 gap-2 border-t border-slate-700">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button variant="primary" onClick={handleSaveClick} isLoading={loading} disabled={selections.size === 0}>
                        Adaugă {selections.size > 0 ? `${selections.size} Participanți` : ''}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};


interface ManagementInscrieriProps {
    sesiune: SesiuneExamen;
    sportivi: Sportiv[];
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    allInscrieri: InscriereExamen[];
    grade: Grad[];
    istoricGrade: IstoricGrade[];
    setInscrieri: React.Dispatch<React.SetStateAction<InscriereExamen[]>>;
    plati: Plata[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    preturiConfig: PretConfig[];
    onViewSportiv: (sportiv: Sportiv) => void;
    isReadOnly?: boolean;
}

export const ManagementInscrieri: React.FC<ManagementInscrieriProps> = ({ sesiune, sportivi, setSportivi, allInscrieri, grade, istoricGrade, setInscrieri, plati, setPlati, preturiConfig, onViewSportiv, isReadOnly = false }) => {
    const { showError, showSuccess } = useError();
    const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);

    // State for EDIT modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [inscriereToEdit, setInscriereToEdit] = useState<InscriereExamen | null>(null);
    const [gradSustinutId, setGradSustinutId] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    
    // State for deletion confirmation
    const [inscriereToDelete, setInscriereToDelete] = useState<InscriereExamen | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState('');

    // State for results
    const [rezultateLocale, setRezultateLocale] = useState<Record<string, 'Admis' | 'Respins' | 'Neprezentat'>>({});
    const [isSavingResults, setIsSavingResults] = useState(false);
    
    const inscrisiInSesiuneIds = useMemo(() => {
        return new Set((allInscrieri || []).filter(i => i.sesiune_id === sesiune.id).map(i => i.sportiv_id));
    }, [allInscrieri, sesiune.id]);
    
    const participantiInscrisi = useMemo(() => {
        return (allInscrieri || [])
            .filter(i => i.sesiune_id === sesiune.id)
            .sort((a, b) => {
                const gradesOrderDiff = (b.grades?.ordine ?? 0) - (a.grades?.ordine ?? 0);
                if (gradesOrderDiff !== 0) return gradesOrderDiff;
                return (a.sportivi?.nume || '').localeCompare(b.sportivi?.nume || '');
            });
    }, [allInscrieri, sesiune.id]);

    const initialRezultate = useMemo(() => {
        const initial: Record<string, 'Admis' | 'Respins' | 'Neprezentat'> = {};
        participantiInscrisi.forEach(i => {
            initial[i.id] = i.rezultat || 'Neprezentat';
        });
        return initial;
    }, [participantiInscrisi]);

    useEffect(() => {
        setRezultateLocale(initialRezultate);
    }, [initialRezultate]);

    const sortedGrades = useMemo(() => [...(grade || [])].sort((a,b) => a.ordine - b.ordine), [grade]);

    const handleOpenEditModal = (inscriere: InscriereExamen) => {
        setInscriereToEdit(inscriere);
        setGradSustinutId(inscriere.grad_vizat_id);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setInscriereToEdit(null);
        setGradSustinutId('');
    };
    
    const handleBulkSave = async (selections: { sportiv_id: string; grad_vizat_id: string }[]) => {
        setIsSaving(true);
        let newPlati: Plata[] = [];
        let newInscrieri: InscriereExamen[] = [];
        let errorCount = 0;
    
        for (const selection of selections) {
            const { sportiv_id, grad_vizat_id } = selection;
            const sportiv = (sportivi || []).find(s => s.id === sportiv_id);
            const grad = (grade || []).find(g => g.id === grad_vizat_id);
    
            if (!sportiv || !grad) {
                errorCount++;
                continue;
            }
    
            try {
                let plataId: string | null = null;
                const taxaConfig = getPretProdus(preturiConfig, 'Taxa Examen', grad.nume, { dataReferinta: sesiune.data });
    
                if (taxaConfig) {
                    const plataData = {
                        sportiv_id: sportiv.id, familie_id: sportiv.familie_id, suma: taxaConfig.suma, data: sesiune.data, status: 'Neachitat' as const,
                        descriere: `Taxa examen ${grad.nume}`, tip: 'Taxa Examen' as const, observatii: `Generat automat la înscriere examen.`
                    };
                    const { data: pData, error: pError } = await supabase.from('plati').insert(plataData).select().single();
                    if (pError) throw new Error(`Factura pt ${sportiv.nume} nu a putut fi generată: ${pError.message}`);
                    plataId = pData.id;
                    newPlati.push(pData as Plata);
                }
    
                const varstaLaExamen = getAgeOnDate(sportiv.data_nasterii, sesiune.data);
                const inscriereData = {
                    sportiv_id: sportiv.id, sesiune_id: sesiune.id, plata_id: plataId,
                    grad_actual_id: sportiv.grad_actual_id || null, grad_vizat_id: grad_vizat_id,
                    varsta_la_examen: varstaLaExamen, rezultat: 'Neprezentat' as const
                };
                
                const { data: iData, error: iError } = await supabase.from('inscrieri_examene').insert(inscriereData).select('*, sportivi:sportiv_id(*), grades:grad_vizat_id(*)').single();
                if (iError) throw iError;
    
                newInscrieri.push(iData as InscriereExamen);
            } catch (err: any) {
                errorCount++;
                showError(`Eroare la înscrierea lui ${sportiv.nume}`, err.message);
                // Rollback payment if enrollment fails
                if (newPlati.length > 0) {
                    const lastPlata = newPlati.pop();
                    if (lastPlata) {
                        await supabase.from('plati').delete().eq('id', lastPlata.id);
                    }
                }
            }
        }
    
        setPlati(prev => [...prev, ...newPlati]);
        setInscrieri(prev => [...prev, ...newInscrieri]);
    
        // Send notifications to sportivi
        const notifications = newInscrieri.map(inscriere => {
            const sportiv = sportivi.find(s => s.id === inscriere.sportiv_id);
            const grad = grade.find(g => g.id === inscriere.grad_vizat_id);
            if (!sportiv?.user_id) return null;
            return {
                recipient_user_id: sportiv.user_id,
                title: 'Înscriere Examen Nouă',
                body: `Ai fost înscris la examenul din data de ${new Date(sesiune.data).toLocaleDateString('ro-RO')} pentru gradul ${grad?.nume || 'necunoscut'}.`,
                type: 'examen'
            };
        }).filter((n): n is NonNullable<typeof n> => n !== null);

        if (notifications.length > 0) {
            await sendBulkNotifications(notifications);
        }

        const successCount = selections.length - errorCount;
        if (successCount > 0) {
            showSuccess("Înscriere finalizată", `${successCount} sportivi au fost înscriși cu succes.`);
        }
        if (errorCount > 0) {
            showError("Înscrieri eșuate", `${errorCount} sportivi nu au putut fi înscriși.`);
        }
    
        setIsSaving(false);
        setIsBulkAddModalOpen(false);
    };

    const handleSaveInscriereEdit = async () => {
        if (!inscriereToEdit || !gradSustinutId) return;
    
        setIsSaving(true);
        try {
            if (gradSustinutId === inscriereToEdit.grad_vizat_id) { showSuccess("Info", "Nicio modificare detectată."); handleCloseEditModal(); return; }

            const plataAsociata = (plati || []).find(p => p.id === inscriereToEdit.plata_id);

            if (plataAsociata && plataAsociata.status !== 'Neachitat') {
                throw new Error("Nu se poate modifica gradul deoarece factura asociată a fost deja achitată. Retrageți înscrierea și adăugați-o din nou.");
            }
            
            let newPlataId: string | null = inscriereToEdit.plata_id;
            let facturaMessage = '';
            let plataResult: { action: 'add' | 'update' | 'delete', data: Plata } | null = null;

            const gradSustinut = (grade || []).find(g => g.id === gradSustinutId);
            const taxaConfig = getPretProdus(preturiConfig, 'Taxa Examen', gradSustinut?.nume || '', { dataReferinta: sesiune.data });

            if (taxaConfig) {
                const descriereFactura = `Taxa examen ${gradSustinut?.nume}`;
                if (plataAsociata) {
                    const { data: pData, error: pError } = await supabase.from('plati').update({ suma: taxaConfig.suma, descriere: descriereFactura }).eq('id', plataAsociata.id).select().single();
                    if (pError) throw pError;
                    plataResult = { action: 'update', data: pData as Plata };
                    facturaMessage = ' și factura a fost actualizată';
                } else {
                    const plataData: Omit<Plata, 'id'> = {
                        sportiv_id: inscriereToEdit.sportiv_id, familie_id: inscriereToEdit.sportivi.familie_id, suma: taxaConfig.suma, data: sesiune.data, status: 'Neachitat',
                        descriere: descriereFactura, tip: 'Taxa Examen', observatii: 'Generat automat la modificare înscriere.'
                    };
                    const { data: pData, error: pError } = await supabase.from('plati').insert(plataData).select().single();
                    if (pError) throw pError;
                    plataResult = { action: 'add', data: pData as Plata };
                    newPlataId = pData.id;
                    facturaMessage = ' și o factură nouă a fost generată';
                }
            } else {
                if (plataAsociata) {
                    const { error: pError } = await supabase.from('plati').delete().eq('id', plataAsociata.id);
                    if (pError) throw pError;
                    plataResult = { action: 'delete', data: plataAsociata };
                    newPlataId = null;
                    facturaMessage = ' și factura asociată a fost ștearsă (noul grad nu are taxă)';
                } else {
                    facturaMessage = ', iar noul grad selectat nu are o taxă configurată';
                }
            }

            const { data: updatedInscriere, error: updateError } = await supabase.from('inscrieri_examene').update({ grad_vizat_id: gradSustinutId, plata_id: newPlataId }).eq('id', inscriereToEdit.id).select('*, sportivi:sportiv_id(*), grades:grad_vizat_id(*)').single();
            if (updateError) throw updateError;
            
            if (updatedInscriere) {
                setInscrieri(prev => prev.map(i => i.id === updatedInscriere.id ? updatedInscriere as InscriereExamen : i));
            }
            
            if (plataResult) {
                if (plataResult.action === 'delete') setPlati(prev => prev.filter(p => p.id !== plataResult!.data.id));
                else if (plataResult.action === 'add') setPlati(prev => [...prev, plataResult!.data]);
                else setPlati(prev => prev.map(p => p.id === plataResult!.data.id ? plataResult!.data : p));
            }
            showSuccess("Succes", `Înscrierea a fost modificată${facturaMessage}.`);
            handleCloseEditModal();
        } catch (err: any) {
            showError("Eroare la Modificare", err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleInitiateDelete = (inscriere: InscriereExamen) => {
        setDeleteMessage(`Sunteți sigur că doriți să retrageți înscrierea sportivului ${inscriere.sportivi?.nume} ${inscriere.sportivi?.prenume}? Factura asociată (dacă există și este neachitată) va fi de asemenea ștearsă.`);
        setInscriereToDelete(inscriere);
    };

    const handleWithdraw = async () => {
        if (!inscriereToDelete || !supabase) return;
        setIsDeleting(true);

        try {
            const { data, error } = await supabase.rpc('delete_exam_registration', {
                p_inscriere_id: inscriereToDelete.id
            });

            if (error) {
                // Aruncăm eroarea pentru a fi prinsă și gestionată centralizat în blocul catch.
                throw error;
            }

            // Calea de succes: actualizăm starea locală pentru feedback vizual instantaneu.
            setInscrieri(prev => prev.filter(i => i.id !== inscriereToDelete.id));
            if (data?.deleted_plata_id) {
                setPlati(prev => prev.filter(p => p.id !== data.deleted_plata_id));
            }
            showSuccess("Succes", data?.message || "Înscrierea a fost retrasă cu succes.");

        } catch (err: any) {
            // Gestionare centralizată a erorilor (RPC, rețea, etc.)
            const errorMessage = err?.message || 'A apărut o eroare necunoscută.';
            
            if (errorMessage.includes('function public.delete_exam_registration') || errorMessage.includes('Could not find the function')) {
                showError("Eroare de Configurare Bază de Date", "Funcția necesară ('delete_exam_registration') nu a fost găsită. Rulați scriptul SQL sau contactați administratorul.");
            } else {
                showError("Eroare la Retragere", errorMessage);
            }
        } finally {
            setIsDeleting(false);
            setInscriereToDelete(null);
        }
    };

    const handleResultChange = (inscriereId: string, newResult: 'Admis' | 'Respins' | 'Neprezentat') => {
        setRezultateLocale(prev => ({ ...prev, [inscriereId]: newResult }));
    };

    const handleSaveResults = async () => {
        if (!supabase) { showError("Eroare de configurare", "Clientul Supabase nu este inițializat."); return; }
        setIsSavingResults(true);
        const changes = Object.entries(rezultateLocale).filter(([id, rezultat]) => rezultat !== initialRezultate[id]);

        if (changes.length === 0) { showSuccess("Info", "Nicio modificare de salvat."); setIsSavingResults(false); return; }
        
        const allPromises: any[] = [];
        const sportiviUpdatesLocal: Partial<Sportiv>[] = [];

        for (const [id, rezultat] of changes) {
            const inscriere = participantiInscrisi.find(i => i.id === id);
            if (!inscriere) continue;
            allPromises.push(supabase.from('inscrieri_examene').update({ rezultat }).eq('id', id));
            if (rezultat === 'Admis') {
                allPromises.push(supabase.from('sportivi').update({ grad_actual_id: inscriere.grad_vizat_id }).eq('id', inscriere.sportiv_id));
                allPromises.push(supabase.from('istoric_grade').insert({ sportiv_id: inscriere.sportiv_id, grad_id: inscriere.grad_vizat_id, data_obtinere: sesiune.data, sesiune_examen_id: sesiune.id }));
                sportiviUpdatesLocal.push({ id: inscriere.sportiv_id, grad_actual_id: inscriere.grad_vizat_id });
            } else if (initialRezultate[id] === 'Admis') {
                allPromises.push(supabase.from('sportivi').update({ grad_actual_id: inscriere.grad_actual_id }).eq('id', inscriere.sportiv_id));
                allPromises.push(supabase.from('istoric_grade').delete().match({ sportiv_id: inscriere.sportiv_id, sesiune_examen_id: sesiune.id }));
                sportiviUpdatesLocal.push({ id: inscriere.sportiv_id, grad_actual_id: inscriere.grad_actual_id });
            }
        }

        try {
            const results = await Promise.all(allPromises);
            const anyError = results.find(res => res.error);
            if (anyError) throw anyError.error;

            setInscrieri(prev => { const changesMap = new Map(changes); return prev.map(i => changesMap.has(i.id) ? { ...i, rezultat: changesMap.get(i.id) as any } : i); });
            setSportivi(prev => {
                const updatesMap = new Map(sportiviUpdatesLocal.map(u => [u.id, u]));
                return prev.map(sportiv => {
                    const update = updatesMap.get(sportiv.id);
                    if (update) {
                        return { ...sportiv, ...update };
                    }
                    return sportiv;
                });
            });

            showSuccess("Succes", `${changes.length} rezultate au fost salvate!`);
        } catch (err: any) {
            showError("Eroare la Salvare", `Una sau mai multe operațiuni au eșuat. Detalii: ${err.message}`);
        } finally {
            setIsSavingResults(false);
        }
    };


    return (
        <div className="space-y-6">
             {!isReadOnly && (
                <Card>
                    <h3 className="text-lg font-bold text-white mb-2">Înscriere Participanți</h3>
                    <Button onClick={() => setIsBulkAddModalOpen(true)} variant="info" className="w-full">
                        <PlusIcon className="w-5 h-5 mr-2" /> Adaugă Participanți (Bulk)
                    </Button>
                </Card>
             )}

            <Card>
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-white">Participanți Înscriși ({participantiInscrisi.length})</h3>
                    {!isReadOnly && (
                        <Button onClick={handleSaveResults} variant="success" size="sm" isLoading={isSavingResults} disabled={Object.entries(rezultateLocale).every(([id, res]) => res === initialRezultate[id])}>
                            Salvează Rezultate
                        </Button>
                    )}
                </div>
                <div className="max-h-96 overflow-y-auto pr-2">
                    {participantiInscrisi.length > 0 ? (
                        <table className="w-full text-left text-sm min-w-[700px]">
                            <thead className="bg-slate-700/50 sticky top-0">
                                <tr>
                                    <th className="p-2 font-semibold">Nume Sportiv</th>
                                    <th className="p-2 font-semibold">Grad Vizat</th>
                                    <th className="p-2 font-semibold w-56 text-center">Rezultat</th>
                                    {!isReadOnly && <th className="p-2 font-semibold text-right">Acțiuni</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {participantiInscrisi.map(inscriere => {
                                    const rezultat = rezultateLocale[inscriere.id] || 'Neprezentat';
                                    let statusColorClass = '';
                                    if (rezultat === 'Admis') statusColorClass = 'bg-green-900/40 text-green-300';
                                    else if (rezultat === 'Respins') statusColorClass = 'bg-red-900/40 text-red-300';

                                    return (
                                        <tr key={inscriere.id} className="hover:bg-slate-700/20">
                                            <td className="p-2">
                                                <p 
                                                    className="font-medium text-white hover:text-brand-primary hover:underline cursor-pointer"
                                                    onClick={(e) => { e.stopPropagation(); onViewSportiv(inscriere.sportivi); }}
                                                >
                                                    {inscriere.sportivi.nume} {inscriere.sportivi.prenume}
                                                </p>
                                            </td>
                                            <td className="p-2 text-brand-secondary font-semibold">{inscriere.grades.nume}</td>
                                            <td className="p-2 text-center">
                                                <Select 
                                                    label="" 
                                                    value={rezultat}
                                                    onChange={(e) => handleResultChange(inscriere.id, e.target.value as any)}
                                                    className={`!py-1 ${statusColorClass}`}
                                                    disabled={isReadOnly}
                                                >
                                                    <option value="Neprezentat">În așteptare</option>
                                                    <option value="Admis">Admis</option>
                                                    <option value="Respins">Respins</option>
                                                </Select>
                                            </td>
                                            {!isReadOnly && (
                                                <td className="p-2">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button size="sm" variant="secondary" onClick={() => handleOpenEditModal(inscriere)} title="Modifică gradul vizat">
                                                            <EditIcon className="w-4 h-4" />
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant='danger' 
                                                            onClick={() => handleInitiateDelete(inscriere)} 
                                                            title="Retrage înscriere"
                                                            isLoading={false}
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <p className="p-4 text-center text-slate-500 italic">Niciun sportiv înscris la această sesiune.</p>
                    )}
                </div>
            </Card>

            {isEditModalOpen && inscriereToEdit && (
                <Modal 
                    isOpen={isEditModalOpen} 
                    onClose={handleCloseEditModal} 
                    title={`Modifică Grad Vizat: ${inscriereToEdit.sportivi.nume} ${inscriereToEdit.sportivi.prenume}`}
                >
                    <div className="space-y-4">
                        <Select label="Selectează gradul vizat pentru examen" value={gradSustinutId} onChange={(e) => setGradSustinutId(e.target.value)} required>
                            <option value="">Alege un grad...</option>
                            {sortedGrades.map(g => (<option key={g.id} value={g.id}>{g.nume}</option>))}
                        </Select>
                        <div className="flex justify-end pt-4 gap-2 border-t border-slate-700">
                            <Button variant="secondary" onClick={handleCloseEditModal} disabled={isSaving}>Anulează</Button>
                            <Button variant="primary" onClick={handleSaveInscriereEdit} isLoading={isSaving} disabled={!gradSustinutId}>Salvează</Button>
                        </div>
                    </div>
                </Modal>
            )}

            <ConfirmDeleteModal 
                isOpen={!!inscriereToDelete}
                onClose={() => setInscriereToDelete(null)}
                onConfirm={handleWithdraw}
                tableName="înscriere"
                isLoading={isDeleting}
                title="Confirmare Retragere"
                customMessage={deleteMessage}
                confirmButtonText="Da, retrage"
            />

            <BulkAddSportiviModal
                isOpen={isBulkAddModalOpen}
                onClose={() => setIsBulkAddModalOpen(false)}
                onSave={handleBulkSave}
                sportivi={sportivi}
                grade={grade}
                istoricGrade={istoricGrade}
                inscrisiIds={inscrisiInSesiuneIds}
            />
        </div>
    );
};