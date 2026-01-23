import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SesiuneExamen, Sportiv, InscriereExamen, Grad, Plata, PretConfig } from '../types';
import { Button, Input, Modal, Select, Card } from './ui';
import { TrashIcon, PlusIcon, EditIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { getPretProdus } from '../utils/pricing';
import { QuickAddSportivExamenModal } from './QuickAddSportivExamenModal';

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
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    allInscrieri: InscriereExamen[];
    grade: Grad[];
    setInscrieri: React.Dispatch<React.SetStateAction<InscriereExamen[]>>;
    plati: Plata[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    preturiConfig: PretConfig[];
}

export const ManagementInscrieri: React.FC<ManagementInscrieriProps> = ({ sesiune, sportivi, setSportivi, allInscrieri, grade, setInscrieri, plati, setPlati, preturiConfig }) => {
    const { showError, showSuccess } = useError();
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);

    // State for modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSportiv, setSelectedSportiv] = useState<Sportiv | null>(null);
    const [gradSustinutId, setGradSustinutId] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [inscriereToEdit, setInscriereToEdit] = useState<InscriereExamen | null>(null);
    
    // State for deletion confirmation
    const [inscriereToDelete, setInscriereToDelete] = useState<InscriereExamen | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCheckingDelete, setIsCheckingDelete] = useState<string | null>(null); // store inscriere.id
    const [deleteMessage, setDeleteMessage] = useState('');

    // State for results
    const [rezultateLocale, setRezultateLocale] = useState<Record<string, 'Admis' | 'Respins' | 'Neprezentat'>>({});
    const [isSavingResults, setIsSavingResults] = useState(false);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsDropdownVisible(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const inscrisiInSesiuneIds = useMemo(() => {
        return new Set(allInscrieri.filter(i => i.sesiune_id === sesiune.id).map(i => i.sportiv_id));
    }, [allInscrieri, sesiune.id]);
    
    const participantiInscrisi = useMemo(() => {
        return allInscrieri
            .filter(i => i.sesiune_id === sesiune.id)
            .sort((a, b) => {
                const gradeOrderDiff = (b.grade?.ordine ?? 0) - (a.grade?.ordine ?? 0);
                if (gradeOrderDiff !== 0) return gradeOrderDiff;
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

    const sportiviDisponibili = useMemo(() => {
        if (searchTerm.length === 0) return [];
        return sportivi
            .filter(s => 
                s.status === 'Activ' && 
                !inscrisiInSesiuneIds.has(s.id) &&
                `${s.nume} ${s.prenume}`.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => a.nume.localeCompare(b.nume));
    }, [sportivi, inscrisiInSesiuneIds, searchTerm]);

    const sortedGrades = useMemo(() => [...grade].sort((a,b) => a.ordine - b.ordine), [grade]);
    
    const isAlreadyEnrolled = !inscriereToEdit && selectedSportiv && inscrisiInSesiuneIds.has(selectedSportiv.id);

    const handleOpenModal = (sportiv: Sportiv) => {
        setSelectedSportiv(sportiv);
        setInscriereToEdit(null); // Ensure edit mode is off
        const currentGrade = grade.find(g => g.id === sportiv.grad_actual_id);
        const currentOrder = currentGrade ? currentGrade.ordine : 0;
        const nextGrade = sortedGrades.find(g => g.ordine === currentOrder + 1);
        setGradSustinutId(nextGrade ? nextGrade.id : '');
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (inscriere: InscriereExamen) => {
        setInscriereToEdit(inscriere);
        setSelectedSportiv(inscriere.sportivi);
        setGradSustinutId(inscriere.grad_vizat_id);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedSportiv(null);
        setInscriereToEdit(null); // Reset edit state
        setGradSustinutId('');
    };
    
    const handleQuickAddSuccess = (newSportiv: Sportiv) => {
        setSportivi(prev => [...prev, newSportiv]);
        setIsQuickAddModalOpen(false);
        // Use a small timeout to allow state to update before opening the next modal
        setTimeout(() => {
            handleOpenModal(newSportiv);
        }, 100);
    };

    const handleSaveInscriere = async () => {
        if (!selectedSportiv || !gradSustinutId) {
            showError("Date lipsă", "Vă rugăm selectați un grad.");
            return;
        }
    
        setIsSaving(true);
        try {
            if (inscriereToEdit) {
                // --- UPDATE LOGIC ---
                if (gradSustinutId === inscriereToEdit.grad_vizat_id) {
                    showSuccess("Info", "Nicio modificare detectată.");
                    handleCloseModal();
                    return;
                }
    
                const referenceId = `Ref Inscriere: ${inscriereToEdit.id}`;
                const plataAsociata = plati.find(p => p.observatii?.includes(referenceId));
    
                if (plataAsociata && plataAsociata.status !== 'Neachitat') {
                    throw new Error("Nu se poate modifica gradul deoarece factura asociată a fost deja achitată (parțial sau total). Retrageți înscrierea și adăugați-o din nou dacă este necesar.");
                }
    
                const { data: updatedInscriere, error: updateError } = await supabase
                    .from('inscrieri_examene').update({ grad_vizat_id: gradSustinutId }).eq('id', inscriereToEdit.id)
                    .select('*, sportivi:sportiv_id(*), grade:grad_vizat_id(*)').single();
                
                if (updateError) throw updateError;
                
                let facturaMessage = '';
                let plataResult: { action: 'add' | 'update' | 'delete', data: Plata } | null = null;
                
                const gradSustinut = grade.find(g => g.id === gradSustinutId);
                const taxaConfig = getPretProdus(preturiConfig, 'Taxa Examen', gradSustinut?.nume || '', { dataReferinta: sesiune.data });
    
                if (taxaConfig) {
                    const descriereFactura = `Taxa examen ${gradSustinut?.nume}`;
                    if (plataAsociata) {
                        // Update existing invoice
                        const { data: pData, error: pError } = await supabase.from('plati')
                            .update({ suma: taxaConfig.suma, descriere: descriereFactura }).eq('id', plataAsociata.id).select().single();
                        if (pError) throw pError;
                        plataResult = { action: 'update', data: pData as Plata };
                        facturaMessage = ' și factura a fost actualizată';
                    } else {
                        // Create new invoice because one didn't exist before
                        const plataData: Omit<Plata, 'id'> = {
                            sportiv_id: selectedSportiv.id, familie_id: selectedSportiv.familie_id, suma: taxaConfig.suma, data: sesiune.data, status: 'Neachitat',
                            descriere: descriereFactura, tip: 'Taxa Examen', observatii: `Generat automat la modificare înscriere. Ref Inscriere: ${updatedInscriere.id}`
                        };
                        const { data: pData, error: pError } = await supabase.from('plati').insert(plataData).select().single();
                        if (pError) throw pError;
                        plataResult = { action: 'add', data: pData as Plata };
                        facturaMessage = ' și o factură nouă a fost generată';
                    }
                } else {
                    // No price for the new grade, so delete the old invoice if it exists
                    if (plataAsociata) {
                        const { error: pError } = await supabase.from('plati').delete().eq('id', plataAsociata.id);
                        if (pError) throw pError;
                        plataResult = { action: 'delete', data: plataAsociata };
                        facturaMessage = ' și factura asociată a fost ștearsă (noul grad nu are taxă)';
                    } else {
                        facturaMessage = ', iar noul grad selectat nu are o taxă configurată';
                    }
                }
                
                setInscrieri(prev => prev.map(i => i.id === updatedInscriere.id ? updatedInscriere : i));
                
                if (plataResult) {
                    if (plataResult.action === 'delete') {
                        setPlati(prev => prev.filter(p => p.id !== plataResult!.data.id));
                    } else if (plataResult.action === 'add') {
                        setPlati(prev => [...prev, plataResult!.data]);
                    } else { // update
                        setPlati(prev => prev.map(p => p.id === plataResult!.data.id ? plataResult!.data : p));
                    }
                }
                
                showSuccess("Succes", `Înscrierea a fost modificată${facturaMessage}.`);
            } else {
                // --- INSERT LOGIC ---
                const varstaLaExamen = getAgeOnDate(selectedSportiv.data_nasterii, sesiune.data);
                const newInscriereData = { 
                    sportiv_id: selectedSportiv.id, sesiune_id: sesiune.id, grad_actual_id: selectedSportiv.grad_actual_id || null,
                    grad_vizat_id: gradSustinutId, varsta_la_examen: varstaLaExamen, rezultat: 'Neprezentat' as const
                };
    
                const { data: iData, error: iError } = await supabase
                    .from('inscrieri_examene').insert(newInscriereData).select('*, sportivi:sportiv_id(*), grade:grad_vizat_id(*)').single();
    
                if (iError) throw iError;
                
                const gradSustinut = grade.find(g => g.id === gradSustinutId);
                let newPlata: Plata | null = null;
                let facturaMessage = '';
        
                if (gradSustinut) {
                    const taxaConfig = getPretProdus(preturiConfig, 'Taxa Examen', gradSustinut.nume, { dataReferinta: sesiune.data });
        
                    if (taxaConfig) {
                        const plataData: Omit<Plata, 'id'> = {
                            sportiv_id: selectedSportiv.id, familie_id: selectedSportiv.familie_id, suma: taxaConfig.suma, data: sesiune.data, status: 'Neachitat',
                            descriere: `Taxa examen ${gradSustinut.nume}`, tip: 'Taxa Examen', observatii: `Generat automat. Ref Inscriere: ${iData.id}`
                        };
        
                        const { data: pData, error: pError } = await supabase.from('plati').insert(plataData).select().single();
                        
                        if (pError) {
                            showError("Eroare Critică Facturare", `Factura nu a putut fi generată. Se anulează înscrierea... Detalii: ${pError.message}`);
                            await supabase.from('inscrieri_examene').delete().eq('id', iData.id);
                            throw new Error(`Factura nu a putut fi generată. Înscrierea pentru ${selectedSportiv.nume} a fost anulată automat.`);
                        } else {
                            newPlata = pData as Plata;
                            facturaMessage = ' și factura a fost generată';
                        }
                    } else {
                        facturaMessage = ', dar ATENȚIE: nu s-a găsit o configurație de preț pentru a genera factura';
                    }
                }
                
                setInscrieri(prev => [...prev, iData as InscriereExamen]);
                if (newPlata) {
                    setPlati(prev => [...prev, newPlata]);
                }
                showSuccess("Succes", `${selectedSportiv.nume} a fost înscris${facturaMessage}.`);
            }
    
            handleCloseModal();
        } catch (err: any) {
            showError(inscriereToEdit ? "Eroare la Modificare" : "Eroare la Înscriere", err.message);
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
                throw error;
            }

            // Database operation was successful, now update UI.
            setInscrieri(prev => prev.filter(i => i.id !== inscriereToDelete.id));
            
            // The RPC function returns the ID of the deleted payment, if any.
            if (data && data.deleted_plata_id) {
                setPlati(prev => prev.filter(p => p.id !== data.deleted_plata_id));
            }
            
            showSuccess("Succes", data.message || "Înscrierea a fost retrasă cu succes din baza de date.");

        } catch (err: any) {
            showError("Eroare la Retragere", err.message);
        } finally {
            setIsDeleting(false);
            setInscriereToDelete(null);
        }
    };

    const handleResultChange = (inscriereId: string, newResult: 'Admis' | 'Respins' | 'Neprezentat') => {
        setRezultateLocale(prev => ({ ...prev, [inscriereId]: newResult }));
    };

    const handleSaveResults = async () => {
        if (!supabase) {
            showError("Eroare de configurare", "Clientul Supabase nu este inițializat.");
            return;
        }
        setIsSavingResults(true);
        const changes = Object.entries(rezultateLocale)
            .filter(([id, rezultat]) => rezultat !== initialRezultate[id]);

        if (changes.length === 0) {
            showSuccess("Info", "Nicio modificare de salvat.");
            setIsSavingResults(false);
            return;
        }

        const allPromises: Promise<any>[] = [];
        const sportiviUpdatesLocal: Partial<Sportiv>[] = [];

        for (const [id, rezultat] of changes) {
            const inscriere = participantiInscrisi.find(i => i.id === id);
            if (!inscriere) continue;

            allPromises.push(
                supabase.from('inscrieri_examene').update({ rezultat }).eq('id', id)
            );

            if (rezultat === 'Admis') {
                allPromises.push(
                    supabase.from('sportivi').update({ grad_actual_id: inscriere.grad_vizat_id }).eq('id', inscriere.sportiv_id)
                );
                allPromises.push(
                    supabase.from('istoric_grade').insert({
                        sportiv_id: inscriere.sportiv_id,
                        grad_id: inscriere.grad_vizat_id,
                        data_obtinere: sesiune.data,
                        sesiune_examen_id: sesiune.id
                    })
                );
                sportiviUpdatesLocal.push({ id: inscriere.sportiv_id, grad_actual_id: inscriere.grad_vizat_id });
            } else if (initialRezultate[id] === 'Admis') {
                allPromises.push(
                    supabase.from('sportivi').update({ grad_actual_id: inscriere.grad_actual_id }).eq('id', inscriere.sportiv_id)
                );
                allPromises.push(
                    supabase.from('istoric_grade').delete().match({ sportiv_id: inscriere.sportiv_id, sesiune_examen_id: sesiune.id })
                );
                sportiviUpdatesLocal.push({ id: inscriere.sportiv_id, grad_actual_id: inscriere.grad_actual_id });
            }
        }

        try {
            const results = await Promise.all(allPromises);
            const anyError = results.find(res => res.error);
            if (anyError) throw anyError.error;

            setInscrieri(prev => {
                const changesMap = new Map(changes);
                return prev.map(i => {
                    if (changesMap.has(i.id)) {
                        return { ...i, rezultat: changesMap.get(i.id) as any };
                    }
                    return i;
                });
            });
            
            setSportivi(prev => {
                const updatedSportiviMap = new Map(prev.map(s => [s.id, s]));
                sportiviUpdatesLocal.forEach(update => {
                    const existing = updatedSportiviMap.get(update.id!);
                    if (existing) {
                        updatedSportiviMap.set(update.id!, { ...existing, ...update });
                    }
                });
                return Array.from(updatedSportiviMap.values());
            });

            showSuccess("Succes", `${changes.length} rezultate au fost salvate cu succes!`);

        } catch (err: any) {
            showError("Eroare la Salvare", `Una sau mai multe operațiuni au eșuat. Detalii: ${err.message}`);
        } finally {
            setIsSavingResults(false);
        }
    };


    return (
        <div className="space-y-6">
             <Card>
                <h3 className="text-lg font-bold text-white mb-2">Adaugă Participant</h3>
                <div className="flex items-end gap-2">
                    <div className="relative flex-grow" ref={searchContainerRef}>
                        <Input
                            label=""
                            placeholder="Caută sportiv activ..."
                            value={searchTerm}
                            onChange={e => {
                                setSearchTerm(e.target.value);
                                setIsDropdownVisible(e.target.value.length > 0);
                            }}
                            onFocus={() => {
                                if (searchTerm.length > 0) setIsDropdownVisible(true);
                            }}
                        />
                        {isDropdownVisible && sportiviDisponibili.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {sportiviDisponibili.map(sportiv => (
                                    <div
                                        key={sportiv.id}
                                        className="p-2 hover:bg-brand-secondary/20 cursor-pointer border-b border-slate-700 last:border-b-0"
                                        onMouseDown={() => {
                                            handleOpenModal(sportiv);
                                            setSearchTerm('');
                                            setIsDropdownVisible(false);
                                        }}
                                    >
                                        <p className="font-medium">{sportiv.nume} {sportiv.prenume}</p>
                                        <p className="text-xs text-slate-400">{getGrad(sportiv.grad_actual_id, grade)?.nume || 'Începător'}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {isDropdownVisible && searchTerm.length > 0 && sportiviDisponibili.length === 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg p-3 text-sm text-slate-400 italic">Niciun sportiv disponibil găsit.</div>
                        )}
                    </div>
                    <Button variant="info" onClick={() => setIsQuickAddModalOpen(true)} title="Adaugă un sportiv nou">
                        <PlusIcon className="w-5 h-5 sm:mr-1"/> <span className="hidden sm:inline">Sportiv Nou</span>
                    </Button>
                </div>
            </Card>

            <Card>
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-white">Participanți Înscriși ({participantiInscrisi.length})</h3>
                    <Button onClick={handleSaveResults} variant="success" size="sm" isLoading={isSavingResults} disabled={Object.entries(rezultateLocale).every(([id, res]) => res === initialRezultate[id])}>
                        Salvează Rezultate
                    </Button>
                </div>
                <div className="max-h-96 overflow-y-auto pr-2">
                    {participantiInscrisi.length > 0 ? (
                        <table className="w-full text-left text-sm min-w-[700px]">
                            <thead className="bg-slate-700/50 sticky top-0">
                                <tr>
                                    <th className="p-2 font-semibold">Nume Sportiv</th>
                                    <th className="p-2 font-semibold">Grad Vizat</th>
                                    <th className="p-2 font-semibold w-56 text-center">Rezultat</th>
                                    <th className="p-2 font-semibold text-right">Acțiuni</th>
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
                                                <p className="font-medium text-white">
                                                    {inscriere.sportivi.nume} {inscriere.sportivi.prenume}
                                                </p>
                                            </td>
                                            <td className="p-2 text-brand-secondary font-semibold">{inscriere.grade.nume}</td>
                                            <td className="p-2 text-center">
                                                <Select 
                                                    label="" 
                                                    value={rezultat}
                                                    onChange={(e) => handleResultChange(inscriere.id, e.target.value as any)}
                                                    className={`!py-1 ${statusColorClass}`}
                                                >
                                                    <option value="Neprezentat">În așteptare</option>
                                                    <option value="Admis">Admis</option>
                                                    <option value="Respins">Respins</option>
                                                </Select>
                                            </td>
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
                                                        isLoading={isCheckingDelete === inscriere.id}
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
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

            {isModalOpen && selectedSportiv && (
                <Modal 
                    isOpen={isModalOpen} 
                    onClose={handleCloseModal} 
                    title={inscriereToEdit ? `Modifică Grad Vizat: ${selectedSportiv.nume} ${selectedSportiv.prenume}` : `Înscriere: ${selectedSportiv.nume} ${selectedSportiv.prenume}`}
                >
                    <div className="space-y-4">
                        {isAlreadyEnrolled ? (
                            <div className="text-center p-4 bg-amber-900/50 border border-amber-500 rounded-md">
                                <p className="font-bold text-amber-300">Sportiv Deja Înscris</p>
                                <p className="text-sm text-amber-200 mt-1">Acest sportiv este deja pe listă!</p>
                            </div>
                        ) : (
                            <Select label="Selectează gradul vizat pentru examen" value={gradSustinutId} onChange={(e) => setGradSustinutId(e.target.value)} required>
                                <option value="">Alege un grad...</option>
                                {sortedGrades.map(g => (<option key={g.id} value={g.id}>{g.nume}</option>))}
                            </Select>
                        )}
                        <div className="flex justify-end pt-4 gap-2 border-t border-slate-700">
                            <Button variant="secondary" onClick={handleCloseModal} disabled={isSaving}>Anulează</Button>
                            <Button variant="primary" onClick={handleSaveInscriere} isLoading={isSaving} disabled={!gradSustinutId || isAlreadyEnrolled}>Salvează</Button>
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

            <QuickAddSportivExamenModal
                isOpen={isQuickAddModalOpen}
                onClose={() => setIsQuickAddModalOpen(false)}
                grades={grade}
                onSaveSuccess={handleQuickAddSuccess}
            />
        </div>
    );
};