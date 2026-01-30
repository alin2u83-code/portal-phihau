import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Plata, Sportiv, TipAbonament, Familie, Tranzactie, Reducere, User, Club } from '../types';
import { Button, Input, Select, Card, Modal } from './ui';
import { EditIcon, ArrowLeftIcon, TrashIcon, BanknotesIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { Permissions } from '../hooks/usePermissions';
import { FEDERATIE_ID, FEDERATIE_NAME } from '../constants';

interface PlatiScadenteProps { 
    plati: Plata[]; 
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>; 
    sportivi: Sportiv[]; 
    familii: Familie[]; 
    tipuriAbonament: TipAbonament[];
    tranzactii: Tranzactie[];
    reduceri: Reducere[];
    onIncaseazaMultiple: (plati: Plata[]) => void;
    onBack: () => void;
    onViewSportiv: (sportiv: Sportiv) => void;
    currentUser: User;
    clubs: Club[];
    permissions: Permissions;
}

const initialFilters = { sportiv: '', tip: '', status: 'Neachitat', clubId: '' };

export const PlatiScadente: React.FC<PlatiScadenteProps> = ({ plati, setPlati, sportivi, familii, tipuriAbonament, tranzactii, reduceri, onIncaseazaMultiple, onBack, onViewSportiv, currentUser, clubs, permissions }) => {
    const [filter, setFilter] = useLocalStorage('phi-hau-plati-scadente-filter', initialFilters);
    const [editingPlata, setEditingPlata] = useState<Plata | null>(null);
    const [plataToDelete, setPlataToDelete] = useState<Plata | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const { showError, showSuccess } = useError();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [viewingHistoryFor, setViewingHistoryFor] = useState<Plata | null>(null);

    useEffect(() => {
        if (currentUser) {
            console.log("[DEBUG] Verificare roluri utilizator în Plăți Scadente:", {
                roluri: currentUser.roluri.map(r => r.nume)
            });
            
            const hasAdminAccess = currentUser.roluri.some(r => r.nume === 'Admin Club' || r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'Admin');
            
            if (!hasAdminAccess) {
                console.warn(`[DEBUG] Utilizatorul nu are un rol de admin necesar. Datele afișate pot fi incomplete din cauza politicilor RLS. Se recomandă re-autentificarea pentru a reîmprospăta sesiunea dacă rolurile sunt incorecte.`);
            }
        }
    }, [currentUser]);

    // Calculăm soldul curent pentru fiecare familie și sportiv individual
    const balances = useMemo(() => {
        const famBalances = new Map<string, number>();
        const indivBalances = new Map<string, number>();

        familii.forEach(f => famBalances.set(f.id, 0));
        sportivi.forEach(s => indivBalances.set(s.id, 0));

        // Adunăm încasările
        tranzactii.forEach(t => {
            if (t.familie_id) {
                famBalances.set(t.familie_id, (famBalances.get(t.familie_id) || 0) + t.suma);
            } else if (t.sportiv_id) {
                indivBalances.set(t.sportiv_id, (indivBalances.get(t.sportiv_id) || 0) + t.suma);
            }
        });

        // Scădem datoriile existente
        plati.forEach(p => {
            if (p.familie_id) {
                famBalances.set(p.familie_id, (famBalances.get(p.familie_id) || 0) - p.suma);
            } else if (p.sportiv_id) {
                indivBalances.set(p.sportiv_id, (indivBalances.get(p.sportiv_id) || 0) - p.suma);
            }
        });

        return { famBalances, indivBalances };
    }, [familii, sportivi, plati, tranzactii]);

    const handleGenerateSubscriptions = async () => {
        if (!supabase) return;
        
        setIsGenerating(true);
        const today = new Date();
        const dataCurenta = today.toISOString().split('T')[0];
        const lunaText = today.toLocaleString('ro-RO', { month: 'long', year: 'numeric'});
        const lunaCurentaIdx = today.getMonth();
        const anulCurent = today.getFullYear();
        
        const sportiviActivi = sportivi.filter(s => s.status === 'Activ');
        const platiToInsert: Omit<Plata, 'id'>[] = [];
        const sportiviProcesati = new Set<string>();

        // 1. Procesăm familiile
        familii.forEach(familie => {
            const membriActiviInFamilie = sportiviActivi.filter(s => s.familie_id === familie.id);
            if (membriActiviInFamilie.length === 0) return;

            // Verificăm dacă există deja factură de abonament pe luna curentă pentru această familie
            const exists = plati.some(p => 
                p.familie_id === familie.id && 
                p.tip === 'Abonament' && 
                new Date(p.data).getMonth() === lunaCurentaIdx && 
                new Date(p.data).getFullYear() === anulCurent
            );

            if (exists) {
                membriActiviInFamilie.forEach(m => sportiviProcesati.add(m.id));
                return;
            }

            const nrMembri = membriActiviInFamilie.length;
            let abonamentConfig;
            
            if (familie.tip_abonament_id) {
                abonamentConfig = tipuriAbonament.find(ab => ab.id === familie.tip_abonament_id);
            } else {
                abonamentConfig = tipuriAbonament.find(ab => ab.numar_membri === nrMembri);
                
                // Fallback pentru familii numeroase
                if (!abonamentConfig && nrMembri > 1) {
                    abonamentConfig = [...tipuriAbonament]
                        .filter(ab => ab.numar_membri > 1)
                        .sort((a, b) => b.numar_membri - a.numar_membri)[0];
                }
            }

            if (abonamentConfig) {
                const creditFamilie = balances.famBalances.get(familie.id) || 0;
                let sumaDeFacturat = abonamentConfig.pret;
                let status: Plata['status'] = 'Neachitat';
                let observatii = `Abonament pt: ${membriActiviInFamilie.map(m => m.prenume).join(', ')}.`;
                
                if (creditFamilie >= sumaDeFacturat) {
                    status = 'Achitat';
                    observatii += ` Stins automat din creditul familiei.`;
                } else if (creditFamilie > 0) {
                    sumaDeFacturat -= creditFamilie;
                    observatii += ` Parțial stins din creditul familiei.`;
                }

                platiToInsert.push({
                    sportiv_id: null,
                    familie_id: familie.id,
                    suma: sumaDeFacturat,
                    data: dataCurenta,
                    status: status,
                    descriere: `Abonament Familie ${lunaText}`,
                    tip: 'Abonament',
                    observatii: observatii,
                });
                
                membriActiviInFamilie.forEach(m => sportiviProcesati.add(m.id));
            }
        });

        // 2. Procesăm sportivii individuali rămași
        sportiviActivi.forEach(sportiv => {
            if (sportiviProcesati.has(sportiv.id) || sportiv.familie_id) return;
            
            const exists = plati.some(p => 
                p.sportiv_id === sportiv.id && 
                p.tip === 'Abonament' && 
                new Date(p.data).getMonth() === lunaCurentaIdx && 
                new Date(p.data).getFullYear() === anulCurent
            );
            if (exists) return;

            const abonamentConfig = tipuriAbonament.find(ab => ab.id === sportiv.tip_abonament_id) || tipuriAbonament.find(ab => ab.numar_membri === 1);
            if (abonamentConfig) {
                 const creditSportiv = balances.indivBalances.get(sportiv.id) || 0;
                 let sumaDeFacturat = abonamentConfig.pret;
                 let status: Plata['status'] = 'Neachitat';
                 let observatii = 'Generat automat.';

                 if (creditSportiv >= sumaDeFacturat) {
                     status = 'Achitat';
                     observatii += ' Stins automat din credit.';
                 } else if (creditSportiv > 0) {
                     sumaDeFacturat -= creditSportiv;
                     observatii += ' Parțial stins din credit.';
                 }

                platiToInsert.push({
                    sportiv_id: sportiv.id,
                    familie_id: null,
                    suma: sumaDeFacturat,
                    data: dataCurenta,
                    status: status,
                    descriere: `Abonament ${lunaText}`,
                    tip: 'Abonament',
                    observatii: observatii,
                });
            }
        });

        // 3. Salvăm în baza de date
        if (platiToInsert.length > 0) {
            const { data, error } = await supabase.from('plati').insert(platiToInsert).select();
            if (error) {
                showError("Eroare la generare", `A apărut o eroare la salvarea facturilor: ${error.message}`);
            } else if (data) {
                setPlati(prev => [...prev, ...data]);
                showSuccess("Generare Finalizată", `${data.length} facturi noi au fost generate cu succes.`);
            }
        } else {
            showSuccess("Info", "Nicio factură nouă de generat pentru luna curentă.");
        }
        setIsGenerating(false);
    };

    const handleSaveEdit = async () => {
        if (!editingPlata || !supabase) return;
        setIsSaving(true);
        const { id, ...updates } = editingPlata;
        const { error } = await supabase.from('plati').update(updates).eq('id', id);
        setIsSaving(false);
        if(error) { showError("Eroare la Salvare", error.message); }
        else { setPlati(prev => prev.map(p => p.id === id ? editingPlata : p)); setEditingPlata(null); }
    };
    
    const confirmDelete = async (id: string) => {
        if(!supabase) return;
        setIsDeleting(true);
        const { error } = await supabase.from('plati').delete().eq('id', id);
        setIsDeleting(false);
        if(error) { showError("Eroare la Ștergere", error.message); }
        else { setPlati(prev => prev.filter(p => p.id !== id)); }
        setPlataToDelete(null);
    };
    
    const filteredPlati = useMemo(() => {
        return plati.filter(p => {
            const sportivPlata = p.sportiv_id ? sportivi.find(s => s.id === p.sportiv_id) : null;
            const familiePlata = p.familie_id ? familii.find(f => f.id === p.familie_id) : null;
            let clubId = sportivPlata?.club_id;
            if (!clubId && familiePlata) {
                const firstMember = sportivi.find(s => s.familie_id === familiePlata.id);
                clubId = firstMember?.club_id;
            }

            if (filter.clubId && clubId !== filter.clubId) return false;
            if (filter.status && p.status !== filter.status) return false;
            if (filter.tip && p.tip !== filter.tip) return false;
            if (filter.sportiv && p.sportiv_id !== filter.sportiv) return false;
            return true;
        }).sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    }, [plati, sportivi, familii, filter]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(filteredPlati.map(p => p.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectRow = (id: string) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedIds(newSelection);
    };

    const handleIncasareClick = () => {
        const selected = filteredPlati.filter(p => selectedIds.has(p.id));
        onIncaseazaMultiple(selected);
    };

    const getEntityName = (plata: Plata) => {
        if (plata.familie_id) {
            const familie = familii.find(f => f.id === plata.familie_id);
            return `Familia ${familie?.nume || 'N/A'}`;
        }
        if (plata.sportiv_id) {
            const s = sportivi.find(sp => sp.id === plata.sportiv_id);
            return s ? `${s.nume} ${s.prenume}` : 'Sportiv Șters';
        }
        return 'N/A';
    };
    
    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
            <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Management Facturi & Plăți</h1>

             <Card className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {permissions.isSuperAdmin && (
                    <Select label="Filtrează Club" name="clubId" value={filter.clubId} onChange={e => setFilter(p => ({...p, clubId: e.target.value}))}>
                        <option value="">Toate Cluburile</option>
                        {clubs.map(c => <option key={c.id} value={c.id}>{c.id === FEDERATIE_ID ? FEDERATIE_NAME : c.nume}</option>)}
                    </Select>
                )}
                 <Select label="Status" name="status" value={filter.status} onChange={e => setFilter(p => ({...p, status: e.target.value}))}>
                    <option value="">Toate</option>
                    <option value="Neachitat">Neachitat</option>
                    <option value="Achitat Parțial">Achitat Parțial</option>
                    <option value="Achitat">Achitat</option>
                </Select>
                <Select label="Tip Plată" name="tip" value={filter.tip} onChange={e => setFilter(p => ({...p, tip: e.target.value}))}>
                     <option value="">Toate Tipurile</option>
                     {[...new Set(plati.map(p=>p.tip))].sort().map(tip => <option key={tip} value={tip}>{tip}</option>)}
                </Select>
                <Select label="Sportiv" name="sportiv" value={filter.sportiv} onChange={e => setFilter(p => ({...p, sportiv: e.target.value}))}>
                    <option value="">Toți Sportivii</option>
                    {sportivi.sort((a,b)=>a.nume.localeCompare(b.nume)).map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>)}
                </Select>
            </Card>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                 <Button onClick={handleGenerateSubscriptions} variant="info" isLoading={isGenerating}>Generează Abonamente Luna Curentă</Button>
                {selectedIds.size > 0 && (
                    <Button onClick={handleIncasareClick} variant="success">
                        <BanknotesIcon className="w-5 h-5 mr-2"/>
                        Încasează {selectedIds.size} facturi selectate
                    </Button>
                )}
            </div>

            {/* Aici începe tabelul */}
            
            {editingPlata && (
                <Modal isOpen={!!editingPlata} onClose={() => setEditingPlata(null)} title="Editează Plată">
                    <div className="space-y-4"><Input label="Descriere" value={editingPlata.descriere} onChange={e => setEditingPlata({...editingPlata, descriere: e.target.value})} /><Input label="Sumă" type="number" value={editingPlata.suma} onChange={e => setEditingPlata({...editingPlata, suma: parseFloat(e.target.value) || 0})} /><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEditingPlata(null)}>Anulează</Button><Button variant="success" onClick={handleSaveEdit} isLoading={isSaving}>Salvează</Button></div></div>
                </Modal>
            )}
            <ConfirmDeleteModal isOpen={!!plataToDelete} onClose={() => setPlataToDelete(null)} onConfirm={() => { if(plataToDelete) confirmDelete(plataToDelete.id) }} tableName="Plată" isLoading={isDeleting} />
        </div>
    );
};
