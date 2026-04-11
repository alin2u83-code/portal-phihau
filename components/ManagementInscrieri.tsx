import React, { useState, useMemo, useEffect, useCallback, useTransition } from 'react';
import { SesiuneExamen, Sportiv, InscriereExamen, Grad, Plata, PretConfig, IstoricGrade } from '../types';
import { Button, Input, Modal, Select, Card } from './ui';
import { TrashIcon, PlusIcon, EditIcon, XCircleIcon, CheckCircleIcon } from './icons';
import { AlertTriangle, Loader2, Save } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { getPretProdus } from '../utils/pricing';
import { getEligibleGrade } from '../utils/eligibility';
import { sendBulkNotifications } from '../utils/notifications';
import { ResponsiveTable, Column } from './ResponsiveTable';

import { useData } from '../contexts/DataContext';

// Helper functions
/**
 * Calculează vârsta unui sportiv la o anumită dată.
 */
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

/**
 * Returnează gradul imediat următor bazat pe coloana 'ordine' din tabelul grade.
 * Aceasta este logica standard de progresie.
 */
const getDefaultNextGradeId = (sportiv: Sportiv, allGrades: Grad[]): string => {
    const currentGrade = allGrades.find(g => g.id === sportiv.grad_actual_id);
    const currentOrder = currentGrade ? currentGrade.ordine : -1;
    const sortedGrades = [...allGrades].sort((a,b) => a.ordine - b.ordine);
    const nextGrade = sortedGrades.find(g => g.ordine === currentOrder + 1);
    return nextGrade ? nextGrade.id : '';
};

/**
 * Sugerează un grad bazat pe vârstă pentru sportivii noi sau pentru tranziții specifice.
 * Include constrângeri de vârstă: sub 12 ani nu pot accesa grade de tip "Dang".
 * 
 * NOTĂ CAZURI EXCEPȚIONALE:
 * Sportivii care vin din alte stiluri cu grade echivalate sunt gestionați manual prin 
 * setarea gradului actual în profilul lor. Sistemul va sugera apoi gradul următor 
 * conform ordinii standard. Dacă echivalarea nu se potrivește perfect, instructorul 
 * poate suprascrie manual gradul vizat în momentul înscrierii.
 */
const getAgeBasedSuggestion = (sportiv: Sportiv, sesiuneData: string, grade: Grad[]): string | null => {
    const age = getAgeOnDate(sportiv.data_nasterii, sesiuneData);
    
    // Constrângere: Sub 12 ani nu pot susține examene de Dang (Centură Neagră)
    const isDangGrade = (g: Grad) => g.nume.toLowerCase().includes('dang');
    
    if (age < 12) {
        // Dacă sistemul ar sugera un Dang, îl limităm la ultimul grad de copii/juniori disponibil
        // (Această logică va fi aplicată și în RPC-ul de pe server, dar o dublăm aici pentru UX)
    }

    if (age >= 13) {
        const albastru = grade.find(g => g.nume.toLowerCase().includes('albastru') && !isDangGrade(g));
        return albastru ? albastru.id : null;
    } else if (age >= 7) {
        const rosu = grade.find(g => g.nume.toLowerCase().includes('roșu') || g.nume.toLowerCase().includes('rosu'));
        return rosu ? rosu.id : null;
    }
    return null;
};

interface SingleAddInscriereModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (selections: { sportiv_id: string; grad_sustinut_id: string }[]) => Promise<void>;
    sportivi: Sportiv[];
    grade: Grad[];
    sesiuneData: string;
    inscrisiIds: Set<string>;
}

const SingleAddInscriereModal: React.FC<SingleAddInscriereModalProps> = ({ isOpen, onClose, onSave, sportivi, grade, sesiuneData, inscrisiIds }) => {
    const { vizeSportivi } = useData();
    const [selectedSportivId, setSelectedSportivId] = useState('');
    const [gradVizatId, setGradVizatId] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggesting, setSuggesting] = useState(false);
    const { showError } = useError();

    const selectedSportiv = useMemo(() => sportivi.find(s => s.id === selectedSportivId), [sportivi, selectedSportivId]);

    const ageAtExam = useMemo(() => {
        if (!selectedSportiv || !sesiuneData) return null;
        return getAgeOnDate(selectedSportiv.data_nasterii, sesiuneData);
    }, [selectedSportiv, sesiuneData]);

    const hasVisa = useMemo(() => {
        if (!selectedSportivId || !sesiuneData) return false;
        const year = new Date(sesiuneData).getFullYear();
        return vizeSportivi.some(v => v.sportiv_id === selectedSportivId && v.an === year && v.status_viza === 'Activ');
    }, [selectedSportivId, sesiuneData, vizeSportivi]);

    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            setSelectedSportivId('');
            setGradVizatId('');
        }
    }, [isOpen]);

    useEffect(() => {
        const fetchSuggestion = async () => {
            if (!selectedSportivId || !sesiuneData) return;
            setSuggesting(true);
            try {
                // 1. Check age-based suggestion first
                const ageSuggestion = getAgeBasedSuggestion(selectedSportiv!, sesiuneData, grade);
                
                // 2. If no age-based suggestion, call RPC
                if (ageSuggestion) {
                    setGradVizatId(ageSuggestion);
                } else {
                    const { data, error } = await supabase.rpc('sugereaza_grad_examen', {
                        p_sportiv_id: selectedSportivId,
                        p_data_examen: sesiuneData
                    });
                    if (error) throw error;
                    setGradVizatId(data || getDefaultNextGradeId(selectedSportiv!, grade));
                }
            } catch (err: any) {
                console.error("Error suggesting grade:", err);
                setGradVizatId(getDefaultNextGradeId(selectedSportiv!, grade));
            } finally {
                setSuggesting(false);
            }
        };

        if (isOpen && selectedSportivId) {
            fetchSuggestion();
        }
    }, [selectedSportivId, sesiuneData, isOpen, grade, selectedSportiv]);

    const handleSave = async () => {
        if (!selectedSportivId || !gradVizatId) return;
        setLoading(true);
        await onSave([{ sportiv_id: selectedSportivId, grad_sustinut_id: gradVizatId }]);
        setLoading(false);
        onClose();
    };

    const availableSportivi = useMemo(() => {
        return (sportivi || []).filter(s => s.status === 'Activ' && !inscrisiIds.has(s.id));
    }, [sportivi, inscrisiIds]);

    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const filteredSportivi = useMemo(() => {
        if (!searchTerm) return availableSportivi;
        const term = searchTerm.toLowerCase();
        return availableSportivi.filter(s => 
            s.nume.toLowerCase().includes(term) || s.prenume.toLowerCase().includes(term)
        );
    }, [availableSportivi, searchTerm]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Înscriere Individuală la Examen">
            <div className="space-y-4">
                <div className="relative">
                    <Input
                        label="Caută Sportiv"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setIsDropdownOpen(true);
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        placeholder="Nume sau prenume..."
                    />
                    {isDropdownOpen && searchTerm && (
                        <div className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                            {filteredSportivi.length > 0 ? (
                                filteredSportivi.map(s => (
                                    <button
                                        key={s.id}
                                        className="w-full text-left px-4 py-2 hover:bg-slate-800 text-white"
                                        onClick={() => {
                                            setSelectedSportivId(s.id);
                                            setSearchTerm(`${s.nume} ${s.prenume}`);
                                            setIsDropdownOpen(false);
                                        }}
                                    >
                                        {s.nume} {s.prenume}
                                    </button>
                                ))
                            ) : (
                                <div className="px-4 py-2 text-slate-500">Nu am găsit sportivi.</div>
                            )}
                        </div>
                    )}
                </div>

                {selectedSportiv && (
                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-2">
                        <p className="text-sm text-slate-300">
                            <span className="font-bold">Vârsta la examen:</span> {ageAtExam} ani
                        </p>
                        <p className="text-sm text-slate-300">
                            <span className="font-bold">Grad actual:</span> {grade.find(g => g.id === selectedSportiv.grad_actual_id)?.nume || 'Începător'}
                        </p>
                        {!hasVisa && (
                            <div className="mt-2 p-2 bg-red-900/30 border border-red-700/50 rounded text-red-400 text-xs font-bold flex items-center gap-2">
                                <XCircleIcon className="w-4 h-4" /> LIPSĂ VIZĂ ANUALĂ {new Date(sesiuneData).getFullYear()}
                            </div>
                        )}
                    </div>
                )}

                <Select
                    label="Grad Vizat"
                    value={gradVizatId}
                    onChange={(e) => setGradVizatId(e.target.value)}
                    required
                    disabled={suggesting}
                >
                    <option value="">{suggesting ? 'Se calculează sugestia...' : 'Alege grad...'}</option>
                    {grade.sort((a,b) => a.ordine - b.ordine)
                        .filter(g => {
                            if (!selectedSportiv) return true;
                            const age = getAgeOnDate(selectedSportiv.data_nasterii, sesiuneData);
                            if (age < 12 && g.nume.toLowerCase().includes('dang')) return false;
                            return true;
                        })
                        .map(g => (
                            <option key={g.id} value={g.id}>{g.nume}</option>
                        ))}
                </Select>

                <div className="flex justify-end pt-4 gap-2 border-t border-slate-700">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button variant="primary" onClick={handleSave} isLoading={loading} disabled={!selectedSportivId || !gradVizatId || !hasVisa}>
                        Înscrie Sportiv
                    </Button>
                </div>
            </div>
        </Modal>
    );
};


interface BulkAddSportiviModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (selections: { sportiv_id: string; grad_sustinut_id: string }[]) => Promise<void>;
    sportivi: Sportiv[];
    grade: Grad[];
    istoricGrade: IstoricGrade[];
    inscrisiIds: Set<string>;
}

const BulkAddSportiviModal: React.FC<BulkAddSportiviModalProps & { sesiuneData: string }> = ({ isOpen, onClose, onSave, sportivi, grade, istoricGrade, inscrisiIds, sesiuneData }) => {
    const { vizeSportivi } = useData();
    const [selections, setSelections] = useState<Map<string, string>>(new Map());
    const [suggestions, setSuggestions] = useState<Map<string, string>>(new Map());
    const [filterTerm, setFilterTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingSuggestions, setFetchingSuggestions] = useState(false);

    const sesiuneYear = useMemo(() => new Date(sesiuneData).getFullYear(), [sesiuneData]);

    const availableSportivi = useMemo(() => {
        return (sportivi || [])
            .filter(s => s.status === 'Activ' && !inscrisiIds.has(s.id))
            .map(s => {
                const lastPromotion = (istoricGrade || [])
                    .filter(ig => ig.sportiv_id === s.id)
                    .sort((a, b) => new Date(b.data_obtinere).getTime() - new Date(a.data_obtinere).getTime())[0];

                const lastPromotionDate = lastPromotion ? new Date(lastPromotion.data_obtinere) : new Date(s.data_inscrierii);
                
                // Check for valid visa
                const hasVisa = vizeSportivi.some(v => v.sportiv_id === s.id && v.an === sesiuneYear && v.status_viza === 'Activ');
                const isEligible = true; // Restricțiile au fost eliminate conform cerinței

                return {
                    ...s,
                    defaultNextGradeId: getDefaultNextGradeId(s, grade),
                    isEligible: isEligible,
                    hasVisa: hasVisa,
                    lastPromotionDate: lastPromotionDate.toLocaleDateString('ro-RO')
                };
            })
            .sort((a, b) => a.nume.localeCompare(b.nume));
    }, [sportivi, grade, inscrisiIds, istoricGrade, vizeSportivi, sesiuneYear]);
    
    const filteredSportivi = useMemo(() => {
        if (!filterTerm) return availableSportivi;
        return availableSportivi.filter(s => 
            `${s.nume} ${s.prenume}`.toLowerCase().includes(filterTerm.toLowerCase())
        );
    }, [availableSportivi, filterTerm]);

    const handleSelect = async (sportivId: string, isChecked: boolean) => {
        if (isChecked) {
            let gradVizatId = suggestions.get(sportivId);
            if (!gradVizatId) {
                setFetchingSuggestions(true);
                try {
                    const sportiv = availableSportivi.find(s => s.id === sportivId);
                    // 1. Check age-based suggestion first
                    const ageSuggestion = sportiv ? getAgeBasedSuggestion(sportiv, sesiuneData, grade) : null;
                    
                    if (ageSuggestion) {
                        gradVizatId = ageSuggestion;
                    } else {
                        // 2. If no age-based suggestion, call RPC
                        const { data, error } = await supabase.rpc('sugereaza_grad_examen', {
                            p_sportiv_id: sportivId,
                            p_data_examen: sesiuneData
                        });
                        if (error) throw error;
                        gradVizatId = data || sportiv?.defaultNextGradeId || '';
                    }
                    setSuggestions(prev => new Map(prev.set(sportivId, gradVizatId!)));
                } catch (err) {
                    console.error("Error suggesting grade:", err);
                    gradVizatId = availableSportivi.find(s => s.id === sportivId)?.defaultNextGradeId || '';
                } finally {
                    setFetchingSuggestions(false);
                }
            }
            setSelections(prev => new Map(prev.set(sportivId, gradVizatId!)));
        } else {
            setSelections(prev => {
                const next = new Map(prev);
                next.delete(sportivId);
                return next;
            });
        }
    };

    const handleGradeChange = (sportivId: string, newGradId: string) => {
        setSelections(prev => new Map(prev.set(sportivId, newGradId)));
    };
    
    const handleSaveClick = async () => {
        setLoading(true);
        const selectionsArray = Array.from(selections.entries()).map(([sportiv_id, grad_sustinut_id]) => ({
            sportiv_id,
            grad_sustinut_id,
        }));
        await onSave(selectionsArray);
        setLoading(false);
    };

    // Selectare / deselectare toți sportivii filtrați (fără viză exclusă dacă isEligible)
    const handleSelectAll = (checked: boolean) => {
        if (!checked) {
            // Deselectăm pe toți cei filtrați
            const filteredIds = new Set(filteredSportivi.map(s => s.id));
            setSelections(prev => {
                const next = new Map(prev);
                filteredIds.forEach(id => next.delete(id));
                return next;
            });
            return;
        }
        // Selectăm toți eligibili din filtrare (fără să așteptăm sugestiile — le setăm din defaultNextGradeId)
        setSelections(prev => {
            const next = new Map(prev);
            filteredSportivi.forEach(s => {
                if (s.isEligible && !next.has(s.id)) {
                    next.set(s.id, suggestions.get(s.id) || s.defaultNextGradeId || '');
                }
            });
            return next;
        });
    };

    const allFilteredEligibleSelected = filteredSportivi.length > 0 &&
        filteredSportivi.filter(s => s.isEligible).every(s => selections.has(s.id));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Adaugă Participanți la Examen">
            <div className="space-y-4">
                {/* Bara de filtrare + selectare totală */}
                <div className="flex gap-2 items-center">
                    <div className="flex-grow">
                        <Input
                            label=""
                            placeholder="Caută după nume sau prenume..."
                            value={filterTerm}
                            onChange={e => setFilterTerm(e.target.value)}
                        />
                    </div>
                    {filteredSportivi.some(s => s.isEligible) && (
                        <button
                            type="button"
                            onClick={() => handleSelectAll(!allFilteredEligibleSelected)}
                            className="flex-shrink-0 text-xs px-3 py-2 rounded-lg border border-slate-600 text-slate-300 hover:border-brand-secondary hover:text-brand-secondary transition-colors"
                            title={allFilteredEligibleSelected ? 'Deselectează toți' : 'Selectează toți eligibilii'}
                        >
                            {allFilteredEligibleSelected ? 'Deselectează toți' : 'Selectează toți'}
                        </button>
                    )}
                </div>

                {/* Contoare */}
                {selections.size > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-brand-secondary/10 border border-brand-secondary/30 rounded-lg">
                        <CheckCircleIcon className="w-4 h-4 text-brand-secondary flex-shrink-0" />
                        <span className="text-sm text-brand-secondary font-semibold">
                            {selections.size} {selections.size === 1 ? 'sportiv selectat' : 'sportivi selectați'}
                        </span>
                        {Array.from(selections.values()).some(v => !v) && (
                            <span className="ml-auto text-xs text-amber-400 font-bold">
                                Grad neales la {Array.from(selections.values()).filter(v => !v).length}
                            </span>
                        )}
                    </div>
                )}

                <div className="max-h-[420px] overflow-y-auto space-y-2 p-2 bg-slate-900/50 rounded-lg border border-slate-700">
                    {filteredSportivi.length === 0 && (
                        <p className="text-center text-slate-500 py-8 text-sm">
                            {filterTerm ? 'Niciun sportiv găsit pentru filtrul aplicat.' : 'Toți sportivii activi sunt deja înscriși.'}
                        </p>
                    )}
                   {(filteredSportivi || []).map(s => {
                       const isSelected = selections.has(s.id);
                       const { isEligible, hasVisa } = s;
                       const gradSelectat = selections.get(s.id) || '';
                       const gradSelectatNume = grade.find(g => g.id === gradSelectat)?.nume;
                       return (
                           <div
                               key={s.id}
                               className={`p-3 rounded-lg border transition-all ${
                                   isSelected
                                       ? 'bg-brand-secondary/15 border-brand-secondary/40'
                                       : isEligible
                                           ? 'bg-slate-700/40 border-slate-700/60 hover:border-slate-600'
                                           : 'bg-red-900/10 border-red-900/30 opacity-60'
                               }`}
                           >
                               <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                   {/* Checkbox + info sportiv */}
                                   <div className="flex items-start gap-3 flex-grow min-w-0">
                                       <input
                                           type="checkbox"
                                           checked={isSelected}
                                           onChange={(e) => handleSelect(s.id, e.target.checked)}
                                           className="mt-0.5 h-5 w-5 rounded border-slate-500 bg-slate-900 text-brand-secondary focus:ring-brand-secondary focus:ring-offset-slate-800 flex-shrink-0 cursor-pointer"
                                           disabled={!isEligible || fetchingSuggestions}
                                       />
                                       <div className="flex-grow min-w-0">
                                           <p className={`font-semibold truncate ${!isEligible ? 'text-slate-400' : 'text-white'}`}>
                                               {s.nume} {s.prenume}
                                           </p>
                                           <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                                               <span className="text-xs text-slate-400">
                                                   Grad actual: <span className="text-slate-300">{grade.find(g => g.id === s.grad_actual_id)?.nume || 'Începător'}</span>
                                               </span>
                                               <span className="text-xs text-brand-secondary/80">
                                                   {getAgeOnDate(s.data_nasterii, sesiuneData)} ani
                                               </span>
                                               {!hasVisa && (
                                                   <span className="text-xs text-red-400 font-bold uppercase">
                                                       Fără viză {sesiuneYear}
                                                   </span>
                                               )}
                                           </div>
                                           {/* Afișare grad selectat pe mobil */}
                                           {isSelected && gradSelectatNume && (
                                               <p className="sm:hidden text-xs text-brand-secondary font-semibold mt-1">
                                                   Grad vizat: {gradSelectatNume}
                                               </p>
                                           )}
                                       </div>
                                   </div>
                                   {/* Select grad — vizibil mereu dar disabled dacă nu e selectat */}
                                   <div className="w-full sm:w-52 pl-8 sm:pl-0 flex-shrink-0">
                                       <Select
                                           label=""
                                           value={selections.get(s.id) || ''}
                                           onChange={(e) => handleGradeChange(s.id, e.target.value)}
                                           disabled={!isSelected || !isEligible}
                                           className={`!py-1.5 text-sm w-full ${isSelected && !gradSelectat ? 'border-amber-500/60' : ''}`}
                                       >
                                           <option value="">
                                               {fetchingSuggestions && isSelected ? 'Se calculează...' : 'Alege grad...'}
                                           </option>
                                           {(grade || [])
                                                .sort((a, b) => a.ordine - b.ordine)
                                                .filter(g => {
                                                    const age = getAgeOnDate(s.data_nasterii, sesiuneData);
                                                    if (age < 12 && g.nume.toLowerCase().includes('dang')) return false;
                                                    return true;
                                                })
                                                .map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}
                                       </Select>
                                   </div>
                               </div>
                           </div>
                       );
                   })}
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center pt-4 gap-3 border-t border-slate-700">
                    <Button variant="secondary" onClick={onClose} disabled={loading} className="sm:w-auto">
                        Anulează
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSaveClick}
                        isLoading={loading}
                        disabled={selections.size === 0 || fetchingSuggestions || Array.from(selections.values()).some(v => !v)}
                        className="sm:w-auto"
                    >
                        {loading ? 'Se înscriu...' : selections.size > 0
                            ? `Înscrie ${selections.size} ${selections.size === 1 ? 'Sportiv' : 'Sportivi'}`
                            : 'Selectează sportivi'}
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
    detailsHeight?: number;
}

export const ManagementInscrieri: React.FC<ManagementInscrieriProps> = ({ sesiune, sportivi, setSportivi, allInscrieri, grade, istoricGrade, setInscrieri, plati, setPlati, preturiConfig, onViewSportiv, isReadOnly = false, detailsHeight = 0 }) => {
    const { showError, showSuccess } = useError();
    const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
    const [isSingleAddModalOpen, setIsSingleAddModalOpen] = useState(false);

    // State for EDIT modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [inscriereToEdit, setInscriereToEdit] = useState<InscriereExamen | null>(null);
    const [gradSustinutId, setGradSustinutId] = useState<string>('');
    const [noteLocale, setNoteLocale] = useState<Record<string, number>>({});
    const [rezultatEdit, setRezultatEdit] = useState<'Admis' | 'Respins' | 'Neprezentat'>('Neprezentat');
    const [overrideManual, setOverrideManual] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const valideazaPromovare = (note: Record<string, number>): boolean => {
        const values = Object.values(note);
        if (values.length === 0) return false;
        return values.every(v => v >= 7);
    };
    
    // State for deletion confirmation
    const [inscriereToDelete, setInscriereToDelete] = useState<InscriereExamen | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState('');

    // State for results
    const [rezultateLocale, setRezultateLocale] = useState<Record<string, 'Admis' | 'Respins' | 'Neprezentat'>>({});
    const [isSavingResults, setIsSavingResults] = useState(false);
    const [showAdmitAllConfirm, setShowAdmitAllConfirm] = useState(false);
    const [, startTransition] = useTransition();
    
    const inscrisiInSesiuneIds = useMemo(() => {
        return new Set((allInscrieri || []).filter(i => i.sesiune_id === sesiune.id).map(i => i.sportiv_id));
    }, [allInscrieri, sesiune.id]);
    
    const [sortConfigs, setSortConfigs] = useState<Array<{ key: keyof InscriereExamen | 'nume_sportiv' | 'grad_actual' | 'grad_vizat', direction: 'asc' | 'desc' }>>([]);

    const requestSort = (key: keyof InscriereExamen | 'nume_sportiv' | 'grad_actual' | 'grad_vizat', shiftKey: boolean) => {
        setSortConfigs(prev => {
            const existing = prev.find(c => c.key === key);
            let next: Array<{ key: keyof InscriereExamen | 'nume_sportiv' | 'grad_actual' | 'grad_vizat', direction: 'asc' | 'desc' }> = [];
            
            if (shiftKey) {
                // Multi-sort
                if (existing) {
                    if (existing.direction === 'asc') {
                        next = prev.map(c => c.key === key ? { ...c, direction: 'desc' } : c);
                    } else {
                        next = prev.filter(c => c.key !== key);
                    }
                } else {
                    next = [...prev, { key, direction: 'asc' }];
                }
            } else {
                // Single sort
                if (existing && existing.direction === 'asc') {
                    next = [{ key, direction: 'desc' }];
                } else {
                    next = [{ key, direction: 'asc' }];
                }
            }
            return next;
        });
    };

    const getGradOrdine = (i: InscriereExamen) => i.grades?.ordine ?? (i as any).grad_ordine ?? 0;

    const participantiInscrisi = useMemo(() => {
        let data = (allInscrieri || []).filter(i => i.sesiune_id === sesiune.id && i.grad_sustinut_id != null);

        if (sortConfigs.length > 0) {
            data.sort((a, b) => {
                for (const sort of sortConfigs) {
                    let aVal: any;
                    let bVal: any;

                    if (sort.key === 'nume_sportiv') {
                        aVal = (a.sportiv_nume || a.sportivi?.nume || '') + ' ' + (a.sportiv_prenume || a.sportivi?.prenume || '');
                        bVal = (b.sportiv_nume || b.sportivi?.nume || '') + ' ' + (b.sportiv_prenume || b.sportivi?.prenume || '');
                    } else if (sort.key === 'grad_actual') {
                        aVal = a.nume_grad_actual || '';
                        bVal = b.nume_grad_actual || '';
                    } else if (sort.key === 'grad_vizat') {
                        aVal = getGradOrdine(a);
                        bVal = getGradOrdine(b);
                    } else {
                        aVal = a[sort.key as keyof InscriereExamen];
                        bVal = b[sort.key as keyof InscriereExamen];
                    }

                    if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
                    if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
                }

                // --- MODIFICARE AICI: Tie-breaker alfabetic ---
                // Dacă execuția ajunge aici, înseamnă că criteriile de sortare de mai sus sunt egale
                const numeA = (a.sportiv_nume || a.sportivi?.nume || '').toLowerCase();
                const numeB = (b.sportiv_nume || b.sportivi?.nume || '').toLowerCase();
                return numeA.localeCompare(numeB);
            });
        } else {
            // Sortarea implicită (deja include tie-breaker)
            data.sort((a, b) => {
                const gradeA = getGradOrdine(a);
                const gradeB = getGradOrdine(b);
                if (gradeA !== gradeB) return gradeB - gradeA;
                const numeA = (a.sportiv_nume || a.sportivi?.nume || '').toLowerCase();
                const numeB = (b.sportiv_nume || b.sportivi?.nume || '').toLowerCase();
                return numeA.localeCompare(numeB);
            });
        }
        return data.map(i => ({
            ...i,
            status_plata: i.plata_id
                ? (plati.find(p => p.id === i.plata_id)?.status || 'Neachitat')
                : 'Neachitat'
        }));
    }, [allInscrieri, sesiune.id, sortConfigs, plati]);

    const initialRezultate = useMemo(() => {
        const initial: Record<string, 'Admis' | 'Respins' | 'Neprezentat'> = {};
        participantiInscrisi.forEach(i => {
            initial[i.id] = i.rezultat || 'Neprezentat';
        });
        return initial;
    }, [participantiInscrisi]);

    useEffect(() => {
        // Merge: add new entries from DB but keep any locally-set values
        // This prevents saves from being overwritten when participantiInscrisi recomputes
        setRezultateLocale(prev => {
            const next = { ...initialRezultate };
            Object.keys(prev).forEach(id => {
                if (id in next) next[id] = prev[id];
            });
            return next;
        });
    }, [initialRezultate]);

    const sortedGrades = useMemo(() => [...(grade || [])].sort((a,b) => a.ordine - b.ordine), [grade]);

    const handleOpenEditModal = async (inscriere: InscriereExamen) => {
        setInscriereToEdit(inscriere);
        setRezultatEdit(inscriere.rezultat || 'Neprezentat');
        setOverrideManual(false);
        
        // Initialize notes from inscriere or defaults for Phi Hau
        const initialNotes = inscriere.note_detaliate || {
            "tehnica": 0,
            "thao_quyen": 0,
            "song_doi": 0
        };
        setNoteLocale(initialNotes);
        setIsEditModalOpen(true);
        
        // Fetch suggestion for the current sportiv and exam date
        try {
            const { data, error } = await supabase.rpc('sugereaza_grad_examen', {
                p_sportiv_id: inscriere.sportiv_id,
                p_data_examen: sesiune.data
            });
            if (error) throw error;
            
            // Validate that the suggested grade exists in our grade list
            const isValid = grade.some(g => g.id === data);
            setGradSustinutId(isValid ? data : inscriere.grad_sustinut_id);
        } catch (err) {
            console.error("Error fetching suggestion:", err);
            setGradSustinutId(inscriere.grad_sustinut_id);
        }
    };

    const handleNoteChange = (key: string, value: string) => {
        const numValue = parseFloat(value) || 0;
        const updatedNotes = { ...noteLocale, [key]: numValue };
        setNoteLocale(updatedNotes);
        
        if (!overrideManual) {
            const isPromovat = valideazaPromovare(updatedNotes);
            setRezultatEdit(isPromovat ? 'Admis' : 'Respins');
        }
    };

    const handleOverrideChange = (checked: boolean) => {
        setOverrideManual(checked);
        if (!checked) {
            const isPromovat = valideazaPromovare(noteLocale);
            setRezultatEdit(isPromovat ? 'Admis' : 'Respins');
        }
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setInscriereToEdit(null);
        setGradSustinutId('');
    };
    
    const handleBulkSave = async (selections: { sportiv_id: string; grad_sustinut_id: string }[]) => {
        setIsSaving(true);
        let newPlati: Plata[] = [];
        let newInscrieri: InscriereExamen[] = [];
        let errorCount = 0;

        // Set local pentru a preveni duplicate în cadrul aceluiași batch
        const addedInBatch = new Set<string>();
        let skipCount = 0;
        for (const selection of selections) {
            await new Promise(r => setTimeout(r, 0)); // yield to browser between iterations
            const { sportiv_id, grad_sustinut_id } = selection;
            const sportiv = (sportivi || []).find(s => s.id === sportiv_id);
            const grad = (grade || []).find(g => g.id === grad_sustinut_id);

            if (!sportiv || !grad) {
                errorCount++;
                continue;
            }

            // Skip silently if sportiv is already registered for this session (din DB sau din batch-ul curent)
            const alreadyRegistered = inscrisiInSesiuneIds.has(sportiv_id) || addedInBatch.has(sportiv_id);
            if (alreadyRegistered) {
                skipCount++;
                continue;
            }

            // Verificare: sportivul nu încearcă să susțină un grad pe care îl are deja în istoric
            const areGradulDeja = (istoricGrade || []).some(
                ig => ig.sportiv_id === sportiv_id && ig.grad_id === grad_sustinut_id
            );
            if (areGradulDeja) {
                showError(
                    `Grad deja obținut — ${sportiv.nume} ${sportiv.prenume}`,
                    `Sportivul are deja gradul "${grad.nume}" în istoric. Înscrierea a fost ignorată.`
                );
                skipCount++;
                continue;
            }

            try {
                let plataId: string | null = null;
                
                // 1. Get registration details (fee and suggested grade) from RPC
                // Fallback graceful: dacă RPC nu există sau returnează eroare, continuăm fără taxă
                let taxaSuma = 0;
                let gradSugeratNume = grad.nume;
                try {
                    const { data: regDetails, error: regError } = await supabase.rpc('get_registration_details', {
                        p_sportiv_id: sportiv.id
                    });
                    if (!regError && regDetails?.[0]) {
                        taxaSuma = regDetails[0].taxa_suma || 0;
                        gradSugeratNume = regDetails[0].grad_sugerat_nume || grad.nume;
                    }
                } catch {
                    // RPC indisponibil — continuăm fără taxă automată
                    console.warn(`[ManagementInscrieri] get_registration_details indisponibil pentru ${sportiv.id}, continuăm fără taxă.`);
                }

                // 2. Generate automatic invoice
                if (taxaSuma > 0) {
                    const plataData = {
                        sportiv_id: sportiv.id,
                        familie_id: sportiv.familie_id,
                        suma: taxaSuma,
                        data: sesiune.data,
                        status: 'Neachitat' as const,
                        descriere: `Taxa examen ${gradSugeratNume}`,
                        tip: 'Taxa Examen' as const,
                        observatii: `Generat automat la înscriere examen (Vârstă: ${getAgeOnDate(sportiv.data_nasterii, sesiune.data)} ani).`,
                        club_id: sportiv.club_id
                    };
                    const { data: pData, error: pError } = await supabase.from('plati').insert(plataData).select().maybeSingle();
                    if (pError) throw new Error(`Factura pt ${sportiv.nume} nu a putut fi generată: ${pError.message}`);
                    if (!pData) throw new Error(`Factura pt ${sportiv.nume} nu a putut fi generată (nicio dată returnată).`);
                    plataId = pData.id;
                    newPlati.push(pData as Plata);
                }

                const varstaLaExamen = getAgeOnDate(sportiv.data_nasterii, sesiune.data);
                const inscriereData = {
                    sportiv_id: sportiv.id, 
                    sesiune_id: sesiune.id, 
                    plata_id: plataId,
                    grad_actual_id: sportiv.grad_actual_id || null, 
                    grad_sustinut_id: grad_sustinut_id, // Populăm automat cu gradul vizat
                    club_id: sportiv.club_id, // Adăugat club_id conform cerințelor
                    varsta_la_examen: varstaLaExamen, 
                    rezultat: 'Neprezentat' as const
                };
                
                const { data: iData, error: iError } = await supabase.from('inscrieri_examene').insert(inscriereData).select().maybeSingle();
                if (iError) throw iError;
                if (!iData) throw new Error("Înscrierea nu a returnat date.");

                const { data: viewData, error: viewError } = await supabase.from('vedere_detalii_examen').select('*').eq('inscriere_id', iData.id).maybeSingle();
                if (viewError) throw viewError;
                if (!viewData) throw new Error("Nu s-au putut prelua detaliile înscrierii din vedere.");

                newInscrieri.push(viewData as InscriereExamen);
                addedInBatch.add(sportiv_id);
            } catch (err: any) {
                errorCount++;
                showError(`Eroare la înscrierea lui ${sportiv.nume} ${sportiv.prenume}`, err.message);
                // Rollback payment if enrollment fails
                if (newPlati.length > 0) {
                    const lastPlata = newPlati[newPlati.length - 1];
                    if (lastPlata && lastPlata.sportiv_id === sportiv.id) {
                        newPlati.pop();
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
            const grad = grade.find(g => g.id === inscriere.grad_sustinut_id);
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

        const successCount = selections.length - errorCount - skipCount;
        if (successCount > 0) {
            showSuccess("Înscriere finalizată", `${successCount} sportivi au fost înscriși cu succes.`);
        }
        if (skipCount > 0) {
            showError("Deja înscriși", `${skipCount} sportivi erau deja înscriși la această sesiune și au fost ignorați.`);
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
            const notesChanged = JSON.stringify(noteLocale) !== JSON.stringify(inscriereToEdit.note_detaliate || {});
            const resultChanged = rezultatEdit !== inscriereToEdit.rezultat;
            const gradChanged = gradSustinutId !== inscriereToEdit.grad_sustinut_id;

            if (!gradChanged && !notesChanged && !resultChanged) { 
                showSuccess("Info", "Nicio modificare detectată."); 
                handleCloseEditModal(); 
                return; 
            }

            const plataAsociata = (plati || []).find(p => p.id === inscriereToEdit.plata_id);

            if (gradChanged && plataAsociata && plataAsociata.status !== 'Neachitat') {
                throw new Error("Nu se poate modifica gradul deoarece factura asociată a fost deja achitată. Retrageți înscrierea și adăugați-o din nou.");
            }
            
            let newPlataId: string | null = inscriereToEdit.plata_id;
            let facturaMessage = '';
            let plataResult: { action: 'add' | 'update' | 'delete', data: Plata } | null = null;

            if (gradChanged) {
                const gradSustinut = (grade || []).find(g => g.id === gradSustinutId);
                const taxaConfig = getPretProdus(preturiConfig, 'Taxa Examen', gradSustinut?.nume || '', { dataReferinta: sesiune.data });

                if (taxaConfig) {
                    const descriereFactura = `Taxa examen ${gradSustinut?.nume}`;
                    if (plataAsociata) {
                        const { data: pData, error: pError } = await supabase.from('plati').update({ suma: taxaConfig.suma, descriere: descriereFactura }).eq('id', plataAsociata.id).select().maybeSingle();
                        if (pError) throw pError;
                        if (!pData) throw new Error("Factura nu a putut fi actualizată.");
                        plataResult = { action: 'update', data: pData as Plata };
                        facturaMessage = ' și factura a fost actualizată';
                    } else {
                        const sportiv = sportivi.find(s => s.id === inscriereToEdit.sportiv_id);
                        const plataData: Omit<Plata, 'id'> = {
                            sportiv_id: inscriereToEdit.sportiv_id, familie_id: sportiv?.familie_id || null, suma: taxaConfig.suma, data: sesiune.data, status: 'Neachitat',
                            descriere: descriereFactura, tip: 'Taxa Examen', observatii: 'Generat automat la modificare înscriere.',
                            club_id: sportiv?.club_id || null
                        };
                        const { data: pData, error: pError } = await supabase.from('plati').insert(plataData).select().maybeSingle();
                        if (pError) throw pError;
                        if (!pData) throw new Error("Factura nouă nu a putut fi generată.");
                        plataResult = { action: 'add', data: pData as Plata };
                        newPlataId = pData.id;
                        facturaMessage = ' și o factură nouă a fost generată';
                    }
                } else {
                    if (plataAsociata) {
                        // Dezleagă mai întâi FK-ul din inscrieri_examene înainte de a șterge plata,
                        // altfel Postgres refuză cu FK violation (inscrieri_examene_plata_id_fkey)
                        const { error: nullifyError } = await supabase
                            .from('inscrieri_examene')
                            .update({ plata_id: null })
                            .eq('id', inscriereToEdit.inscriere_id || inscriereToEdit.id);
                        if (nullifyError) throw nullifyError;
                        const { error: pError } = await supabase.from('plati').delete().eq('id', plataAsociata.id);
                        if (pError) throw pError;
                        plataResult = { action: 'delete', data: plataAsociata };
                        newPlataId = null;
                        facturaMessage = ' și factura asociată a fost ștearsă (noul grad nu are taxă)';
                    } else {
                        facturaMessage = ', iar noul grad selectat nu are o taxă configurată';
                    }
                }
            }

            const updatePayload = { 
                grad_sustinut_id: gradSustinutId, 
                plata_id: newPlataId,
                note_detaliate: noteLocale,
                rezultat: rezultatEdit
            };

            const { data: updatedInscriere, error: updateError } = await supabase.from('inscrieri_examene').update(updatePayload).eq('id', inscriereToEdit.inscriere_id || inscriereToEdit.id).select().maybeSingle();
            if (updateError) throw updateError;
            if (!updatedInscriere) throw new Error("Înscrierea nu a putut fi actualizată.");
            
            const { data: viewData, error: viewError } = await supabase.from('vedere_detalii_examen').select('*, id:inscriere_id').eq('inscriere_id', updatedInscriere.id).maybeSingle();
            if (viewError) throw viewError;
            if (!viewData) throw new Error("Nu s-au putut prelua detaliile actualizate din vedere.");
            
            if (viewData) {
                setInscrieri(prev => prev.map(i => i.id === viewData.id ? viewData as InscriereExamen : i));
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
        const nume = inscriere.sportiv_nume || inscriere.sportivi?.nume || '';
        const prenume = inscriere.sportiv_prenume || inscriere.sportivi?.prenume || '';
        const fullName = `${nume} ${prenume}`.trim() || 'Necunoscut';
        setDeleteMessage(`Sunteți sigur că doriți să retrageți înscrierea sportivului ${fullName}? Factura asociată (dacă există și este neachitată) va fi de asemenea ștearsă.`);
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

    const handleUpdateStatus = async (inscriereId: string, status: 'Validat' | 'In asteptare') => {
        if (!supabase) return;
        try {
            const { error } = await supabase.from('inscrieri_examene').update({ status_inscriere: status }).eq('id', inscriereId);
            if (error) throw error;
            setInscrieri(prev => prev.map(i => i.id === inscriereId ? { ...i, status_inscriere: status } : i));
            showSuccess("Succes", `Statusul înscrierii a fost actualizat la ${status}.`);
        } catch (err: any) {
            showError("Eroare la Actualizare Status", err.message);
        }
    };

    const handleResultChange = async (inscriereId: string, newResult: 'Admis' | 'Respins' | 'Neprezentat') => {
        if (!supabase) return;
        
        // Optimistic update
        const oldResult = rezultateLocale[inscriereId];
        setRezultateLocale(prev => ({ ...prev, [inscriereId]: newResult }));
        
        const inscriere = participantiInscrisi.find(i => i.id === inscriereId || i.inscriere_id === inscriereId);
        if (!inscriere) return;
        
        const targetId = inscriere.inscriere_id || inscriere.id;
        
        try {
            const allPromises: any[] = [];
            const sportiviUpdatesLocal: Partial<Sportiv>[] = [];

            // 1. Update the result in inscrieri_examene by record id
            allPromises.push(
                supabase.from('inscrieri_examene')
                    .update({ rezultat: newResult, status_inscriere: 'Validat' })
                    .eq('id', targetId)
            );
            
            // 2. Handle grade promotion if Admis
            if (newResult === 'Admis') {
                const newGradId = inscriere.grad_sustinut_id;
                allPromises.push(
                    supabase.from('istoric_grade').upsert(
                        { sportiv_id: inscriere.sportiv_id, grad_id: newGradId, data_obtinere: sesiune.data, sesiune_examen_id: sesiune.id },
                        { onConflict: 'sportiv_id,grad_id', ignoreDuplicates: true }
                    )
                );
                sportiviUpdatesLocal.push({ id: inscriere.sportiv_id, grad_actual_id: newGradId });
            } 
            // 3. Revert if it was previously Admis and now it's not
            else if (oldResult === 'Admis') {
                allPromises.push(supabase.from('istoric_grade').delete().match({ sportiv_id: inscriere.sportiv_id, sesiune_examen_id: sesiune.id }));
                sportiviUpdatesLocal.push({ id: inscriere.sportiv_id, grad_actual_id: inscriere.grad_actual_id });
            }

            const results = await Promise.all(allPromises);
            const anyError = results.find(res => res.error);
            if (anyError) throw anyError.error;

            // Update local state
            setInscrieri(prev => prev.map(i => i.id === inscriereId ? { ...i, rezultat: newResult } : i));
            if (sportiviUpdatesLocal.length > 0) {
                setSportivi(prev => {
                    const updatesMap = new Map(sportiviUpdatesLocal.map(u => [u.id, u]));
                    return prev.map(sportiv => {
                        const update = updatesMap.get(sportiv.id);
                        if (update) return { ...sportiv, ...update };
                        return sportiv;
                    });
                });
            }
            
            showSuccess("Rezultat Salvat", "Modificarea a fost salvată automat.");
        } catch (err: any) {
            // Revert optimistic update
            setRezultateLocale(prev => ({ ...prev, [inscriereId]: oldResult }));
            showError("Eroare la Salvare", err.message);
        }
    };

    const handleAdmitAll = () => {
        const neadmisi = participantiInscrisi.filter(i => (rezultateLocale[i.id] || i.rezultat) !== 'Admis');
        if (neadmisi.length === 0) {
            showSuccess("Info", "Toți participanții sunt deja marcați ca Admiși.");
            return;
        }
        setShowAdmitAllConfirm(true);
    };

    const handleAdmitAllConfirmed = async () => {
        if (!supabase) return;
        setShowAdmitAllConfirm(false);

        const neadmisi = participantiInscrisi.filter(i => (rezultateLocale[i.id] || i.rezultat) !== 'Admis');
        if (neadmisi.length === 0) return;

        // Aplica optimistic update si starea de loading imediat
        const optimisticUpdate: Record<string, 'Admis' | 'Respins' | 'Neprezentat'> = {};
        neadmisi.forEach(i => { optimisticUpdate[i.id] = 'Admis'; });
        setRezultateLocale(prev => ({ ...prev, ...optimisticUpdate }));
        setIsSavingResults(true);

        // Construieste operatiile DB
        const sportiviUpdates: { id: string; grad_actual_id: string }[] = [];
        const allPromises: any[] = [];
        for (const inscriere of neadmisi) {
            const recordId = inscriere.inscriere_id || inscriere.id;
            allPromises.push(
                supabase.from('inscrieri_examene')
                    .update({ rezultat: 'Admis', status_inscriere: 'Validat' })
                    .eq('id', recordId)
            );
            if (inscriere.grad_sustinut_id) {
                allPromises.push(
                    supabase.from('istoric_grade').upsert(
                        { sportiv_id: inscriere.sportiv_id, grad_id: inscriere.grad_sustinut_id, data_obtinere: sesiune.data, sesiune_examen_id: sesiune.id },
                        { onConflict: 'sportiv_id,grad_id', ignoreDuplicates: true }
                    )
                );
                sportiviUpdates.push({ id: inscriere.sportiv_id, grad_actual_id: inscriere.grad_sustinut_id });
            }
        }

        try {
            const results = await Promise.all(allPromises);
            const anyError = results.find(r => r.error);
            if (anyError) throw anyError.error;

            setInscrieri(prev => prev.map(i => {
                const wasUpdated = neadmisi.find(n => n.id === i.id);
                return wasUpdated ? { ...i, rezultat: 'Admis' } : i;
            }));
            setSportivi(prev => {
                const map = new Map(sportiviUpdates.map(u => [u.id, u.grad_actual_id]));
                return prev.map(s => map.has(s.id) ? { ...s, grad_actual_id: map.get(s.id)! } : s);
            });
            showSuccess("Admis Toți", `${neadmisi.length} participanți marcați ca Admiși.`);
        } catch (err: any) {
            startTransition(() => {
                setRezultateLocale(prev => {
                    const reverted = { ...prev };
                    neadmisi.forEach(i => { reverted[i.id] = i.rezultat || 'Neprezentat'; });
                    return reverted;
                });
            });
            showError("Eroare la Salvare", err.message);
        } finally {
            setIsSavingResults(false);
        }
    };

    const desyncedInscrieri = useMemo(() => {
        return participantiInscrisi.filter(i => {
            const rezultat = rezultateLocale[i.id] || i.rezultat;
            if (rezultat !== 'Admis') return false;
            
            const sportiv = sportivi.find(s => s.id === i.sportiv_id);
            if (!sportiv) return false;
            
            const expectedGradId = i.grad_sustinut_id;
            return sportiv.grad_actual_id !== expectedGradId;
        });
    }, [participantiInscrisi, sportivi, rezultateLocale]);

    const handleForceSync = async () => {
        if (!supabase) return;
        if (!sesiune.id || !sesiune.data) {
            showError("Eroare Validare", "Sesiunea curentă nu are un ID sau o dată validă setată.");
            return;
        }

        setIsSavingResults(true);
        const syncPromises: any[] = [];
        const sportiviUpdatesLocal: Partial<Sportiv>[] = [];

        for (const inscriere of desyncedInscrieri) {
            const newGradId = inscriere.grad_sustinut_id;
            syncPromises.push(
                supabase.from('istoric_grade').upsert(
                    { sportiv_id: inscriere.sportiv_id, grad_id: newGradId, data_obtinere: sesiune.data, sesiune_examen_id: sesiune.id },
                    { onConflict: 'sportiv_id,grad_id', ignoreDuplicates: true }
                )
            );
            sportiviUpdatesLocal.push({ id: inscriere.sportiv_id, grad_actual_id: newGradId });
        }

        try {
            const results = await Promise.all(syncPromises);
            const anyError = results.find(res => res.error);
            if (anyError) throw anyError.error;

            setSportivi(prev => {
                const updatesMap = new Map(sportiviUpdatesLocal.map(u => [u.id, u]));
                return prev.map(sportiv => {
                    const update = updatesMap.get(sportiv.id);
                    if (update) return { ...sportiv, ...update };
                    return sportiv;
                });
            });
            showSuccess("Sincronizare Reușită", `${desyncedInscrieri.length} sportivi au fost sincronizați.`);
        } catch (err: any) {
            showError("Eroare Sincronizare", err.message);
        } finally {
            setIsSavingResults(false);
        }
    };

    const columns: Column<InscriereExamen>[] = [
        {
            key: 'nume_sportiv',
            label: 'Nume Sportiv',
            render: (inscriere) => {
                const sportiv = sportivi.find(s => s.id === inscriere.sportiv_id);
                const nume = inscriere.sportiv_nume || inscriere.sportivi?.nume || '';
                const prenume = inscriere.sportiv_prenume || inscriere.sportivi?.prenume || '';
                const fullName = `${nume} ${prenume}`.trim() || 'Necunoscut';
                return (
                    <p 
                        className="font-medium text-white hover:text-brand-primary hover:underline cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); if(sportiv) onViewSportiv(sportiv); }}
                    >
                        {fullName}
                    </p>
                );
            }
        },
        {
            key: 'grad_actual',
            label: 'Grad Actual',
            render: (inscriere) => {
                const gradAnterior = grade.find(g => g.id === inscriere.grad_actual_id);
                return <span className="text-slate-400 text-sm">{inscriere.nume_grad_actual || gradAnterior?.nume || 'Fără grad'}</span>;
            }
        },
        {
            key: 'grad_vizat',
            label: 'Grad Vizat',
            render: (inscriere) => <span className="text-brand-secondary font-semibold">{inscriere.grad_sustinut || inscriere.grades?.nume || 'Necunoscut'}</span>
        },
        {
            key: 'status_plata',
            label: 'Status Plată',
            headerClassName: 'text-center',
            cellClassName: 'text-center',
            render: (inscriere) => (
                <div className="flex justify-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${inscriere.status_plata === 'Achitat' ? 'bg-green-900/40 text-green-400 border-green-700/50' : 'bg-amber-900/40 text-amber-400 border-amber-700/50'}`}>
                        {inscriere.status_plata || 'Necunoscut'}
                    </span>
                </div>
            )
        },
        {
            key: 'rezultat',
            label: 'Rezultat',
            headerClassName: 'text-center',
            cellClassName: 'text-center',
            render: (inscriere) => {
                const rezultat = rezultateLocale[inscriere.id] || inscriere.rezultat || 'Neprezentat';
                let statusColorClass = '';
                if (rezultat === 'Admis') statusColorClass = 'bg-green-900/40 text-green-300';
                else if (rezultat === 'Respins') statusColorClass = 'bg-red-900/40 text-red-300';

                return (
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
                );
            }
        },
        {
            key: 'actions',
            label: 'Acțiuni',
            headerClassName: 'text-right',
            cellClassName: 'text-right',
            render: (inscriere) => !isReadOnly && (
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
            )
        }
    ];

    const renderMobileItem = (inscriere: InscriereExamen) => {
        const rezultat = rezultateLocale[inscriere.id] || inscriere.rezultat || 'Neprezentat';
        let statusColorClass = '';
        if (rezultat === 'Admis') statusColorClass = 'bg-green-900/40 text-green-300';
        else if (rezultat === 'Respins') statusColorClass = 'bg-red-900/40 text-red-300';

        const sportiv = sportivi.find(s => s.id === inscriere.sportiv_id);
        const nume = inscriere.sportiv_nume || inscriere.sportivi?.nume || '';
        const prenume = inscriere.sportiv_prenume || inscriere.sportivi?.prenume || '';
        const fullName = `${nume} ${prenume}`.trim() || 'Necunoscut';

        const gradActualNume = grade.find(g => g.id === inscriere.grad_actual_id)?.nume;
        const gradVizatNume = inscriere.grad_sustinut || inscriere.grades?.nume;

        return (
            <Card className={`mb-3 border-l-4 ${
                rezultat === 'Admis' ? 'border-emerald-500' :
                rezultat === 'Respins' ? 'border-red-500' :
                'border-brand-primary'
            }`}>
                {/* Header card */}
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-grow min-w-0">
                        <p
                            className="font-bold text-white text-base leading-tight cursor-pointer hover:text-brand-primary transition-colors"
                            onClick={() => { if(sportiv) onViewSportiv(sportiv); }}
                        >
                            {fullName}
                        </p>
                        {/* Grade: actual → vizat */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-slate-400">
                                {gradActualNume || inscriere.nume_grad_actual || 'Fără grad'}
                            </span>
                            <span className="text-slate-600 text-xs">→</span>
                            <span className="text-xs font-bold text-brand-secondary">
                                {gradVizatNume || 'Necunoscut'}
                            </span>
                        </div>
                    </div>
                    <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        inscriere.status_plata === 'Achitat'
                            ? 'bg-green-900/40 text-green-400 border-green-700/50'
                            : 'bg-amber-900/40 text-amber-400 border-amber-700/50'
                    }`}>
                        {inscriere.status_plata === 'Achitat' ? 'Achitat' : 'Neachitat'}
                    </span>
                </div>

                {/* Rezultat */}
                <div className="space-y-3">
                    <div>
                        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 block">Rezultat</label>
                        <Select
                            label=""
                            value={rezultat}
                            onChange={(e) => handleResultChange(inscriere.id, e.target.value as any)}
                            className={`!py-2 w-full text-sm ${statusColorClass}`}
                            disabled={isReadOnly}
                        >
                            <option value="Neprezentat">In așteptare</option>
                            <option value="Admis">Admis</option>
                            <option value="Respins">Respins</option>
                        </Select>
                    </div>

                    {!isReadOnly && (
                        <div className="flex gap-2 pt-2 border-t border-slate-700/60">
                            <Button size="sm" variant="secondary" onClick={() => handleOpenEditModal(inscriere)} className="flex-1 justify-center">
                                <EditIcon className="w-3.5 h-3.5 mr-1.5" /> Editează
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => handleInitiateDelete(inscriere)} className="flex-1 justify-center">
                                <TrashIcon className="w-3.5 h-3.5 mr-1.5" /> Retrage
                            </Button>
                        </div>
                    )}
                </div>
            </Card>
        );
    };

    // Statistici rapide
    const statsAdmis = participantiInscrisi.filter(i => (rezultateLocale[i.id] || i.rezultat) === 'Admis').length;
    const statsRespins = participantiInscrisi.filter(i => (rezultateLocale[i.id] || i.rezultat) === 'Respins').length;
    const statsAsteptare = participantiInscrisi.filter(i => !i.rezultat || i.rezultat === 'Neprezentat').length;

    return (
        <div className="space-y-5">
            {/* ── Card Înscriere ── */}
            {!isReadOnly && (
                <Card>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div>
                            <h3 className="text-base font-bold text-white">Înscriere Participanți</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Adaugă sportivi individual sau selectează mai mulți odată</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button onClick={() => setIsSingleAddModalOpen(true)} variant="primary" className="w-full justify-center">
                            <PlusIcon className="w-4 h-4 mr-2" /> Adaugă Individual
                        </Button>
                        <Button onClick={() => setIsBulkAddModalOpen(true)} variant="info" className="w-full justify-center">
                            <PlusIcon className="w-4 h-4 mr-2" /> Adaugă Multipli
                        </Button>
                    </div>
                </Card>
            )}

            {/* ── Statistici rezultate (afișate doar dacă există participanți) ── */}
            {participantiInscrisi.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-emerald-400">{statsAdmis}</p>
                        <p className="text-xs text-emerald-300 mt-0.5 uppercase tracking-wide">Admiși</p>
                    </div>
                    <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-amber-400">{statsAsteptare}</p>
                        <p className="text-xs text-amber-300 mt-0.5 uppercase tracking-wide">În așteptare</p>
                    </div>
                    <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-red-400">{statsRespins}</p>
                        <p className="text-xs text-red-300 mt-0.5 uppercase tracking-wide">Respinși</p>
                    </div>
                </div>
            )}

            <Card>
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <h3 className="text-base font-bold text-white">
                        Participanți Înscriși
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 text-xs font-normal">
                            {participantiInscrisi.length}
                        </span>
                    </h3>
                    {!isReadOnly && (
                        <div className="flex flex-wrap gap-2">
                            {participantiInscrisi.some(i => (rezultateLocale[i.id] || i.rezultat) !== 'Admis') && (
                                <Button
                                    variant="success"
                                    onClick={handleAdmitAll}
                                    disabled={isSavingResults}
                                    size="sm"
                                    title="Marchează toți participanții ca Admiși"
                                >
                                    Admite Toți
                                </Button>
                            )}
                            {desyncedInscrieri.length > 0 && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="border-amber-500 text-amber-500 hover:bg-amber-500/10"
                                    onClick={handleForceSync}
                                    disabled={isSavingResults}
                                >
                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                    Sincronizare ({desyncedInscrieri.length})
                                </Button>
                            )}
                        </div>
                    )}
                </div>
                <ResponsiveTable 
                    columns={columns}
                    data={participantiInscrisi}
                    renderMobileItem={renderMobileItem}
                    onSort={requestSort}
                    sortConfig={sortConfigs}
                    detailsHeight={detailsHeight}
                />
            </Card>

            {isEditModalOpen && inscriereToEdit && (
                <Modal 
                    isOpen={isEditModalOpen} 
                    onClose={handleCloseEditModal} 
                    title={`Evaluare: ${((inscriereToEdit.sportiv_nume || inscriereToEdit.sportivi?.nume || '') + ' ' + (inscriereToEdit.sportiv_prenume || inscriereToEdit.sportivi?.prenume || '')).trim() || 'Necunoscut'}`}
                >
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                            <Select label="Grad Vizat" value={gradSustinutId} onChange={(e) => setGradSustinutId(e.target.value)} required>
                                <option value="">Alege un grad...</option>
                                {sortedGrades.map(g => (<option key={g.id} value={g.id}>{g.nume}</option>))}
                            </Select>
                        </div>

                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-4">
                            <h4 className="text-sm font-bold text-brand-secondary uppercase tracking-wider">Note Detaliate</h4>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(noteLocale).map(([key, value]) => (
                                    <div key={key}>
                                        <label className="text-xs text-slate-400 mb-1 block capitalize">{key.replace(/_/g, ' ')}</label>
                                        <Input 
                                            label=""
                                            type="number" 
                                            step="0.5" 
                                            min="0" 
                                            max="10" 
                                            value={value} 
                                            onChange={(e) => handleNoteChange(key, e.target.value)}
                                            className="!py-1.5"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3 bg-slate-800/30 p-3 rounded-lg border border-slate-700/50">
                                <input 
                                    type="checkbox" 
                                    id="override" 
                                    checked={overrideManual} 
                                    onChange={(e) => handleOverrideChange(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-brand-primary focus:ring-brand-primary"
                                />
                                <label htmlFor="override" className="text-sm text-slate-300 cursor-pointer">
                                    Override Manual (Ignoră validarea automată)
                                </label>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-white">Rezultat Final</label>
                                <Select 
                                    label="" 
                                    value={rezultatEdit} 
                                    onChange={(e) => setRezultatEdit(e.target.value as any)}
                                    disabled={!overrideManual}
                                    className={`!py-1.5 min-w-[120px] ${rezultatEdit === 'Admis' ? 'text-green-400' : rezultatEdit === 'Respins' ? 'text-red-400' : ''}`}
                                >
                                    <option value="Neprezentat">În așteptare</option>
                                    <option value="Admis">Admis</option>
                                    <option value="Respins">Respins</option>
                                </Select>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 gap-2 border-t border-slate-700">
                            <Button variant="secondary" onClick={handleCloseEditModal} disabled={isSaving}>Anulează</Button>
                            <Button variant="primary" onClick={handleSaveInscriereEdit} isLoading={isSaving} disabled={!gradSustinutId}>Salvează Modificări</Button>
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
                sesiuneData={sesiune.data}
            />

            <SingleAddInscriereModal
                isOpen={isSingleAddModalOpen}
                onClose={() => setIsSingleAddModalOpen(false)}
                onSave={handleBulkSave}
                sportivi={sportivi}
                grade={grade}
                sesiuneData={sesiune.data}
                inscrisiIds={inscrisiInSesiuneIds}
            />

            <Modal isOpen={showAdmitAllConfirm} onClose={() => setShowAdmitAllConfirm(false)} title="Confirmare Admitere">
                <div className="space-y-5">
                    <p className="text-slate-300">
                        Ești sigur că vrei să marchezi toți participanții neadmiși ca <span className="text-emerald-400 font-semibold">ADMIȘI</span>?
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button variant="secondary" onClick={() => setShowAdmitAllConfirm(false)} className="flex-1">
                            Anulează
                        </Button>
                        <Button variant="success" onClick={handleAdmitAllConfirmed} className="flex-1">
                            Da, admite toți
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};