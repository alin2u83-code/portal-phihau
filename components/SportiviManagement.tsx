import React, { useState, useMemo } from 'react';
import { Sportiv, Grupa, TipAbonament, Familie, Rol, Plata, Tranzactie, User, Club, Grad, Permissions, VizualizarePlata } from '../types';
import { Button } from './ui';
import { PlusIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { MartialArtsSkeleton } from './MartialArtsSkeleton';
import { SportiviFilter } from './SportiviFilter';
import { SportiviTable } from './SportiviTable';
import { SportiviMobileList } from './SportiviMobileList';
import { SportivModals } from './SportivModals';
import { useIsMobile } from '../hooks/useIsMobile';
import { useRoleAssignment } from '../hooks/useRoleAssignment';

const getAge = (dateString: string | null | undefined): number => {
    if (!dateString) return 0;
    const today = new Date();
    const birthDate = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
    if (isNaN(birthDate.getTime())) { return 0; }
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
    return age;
};





// --- Componenta Management Principală ---
export const SportiviManagement: React.FC<{
    sportivi: Sportiv[];
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    grupe: Grupa[];
    setGrupe: React.Dispatch<React.SetStateAction<Grupa[]>>;
    tipuriAbonament: TipAbonament[];
    familii: Familie[];
    setFamilii: React.Dispatch<React.SetStateAction<Familie[]>>;
    currentUser: User;
    plati: Plata[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    tranzactii: Tranzactie[];
    setTranzactii: React.Dispatch<React.SetStateAction<Tranzactie[]>>;
    onViewSportiv: (sportiv: Sportiv) => void;
    clubs: Club[];
    grade: Grad[];
    permissions: Permissions;
    allRoles: Rol[];
    setAllRoles: React.Dispatch<React.SetStateAction<Rol[]>>;
    vizualizarePlati: VizualizarePlata[];
    loading?: boolean;
    onBack: () => void;
}> = (props) => {
    const { 
        sportivi = [], 
        setSportivi, 
        grupe = [], 
        setGrupe, 
        tipuriAbonament = [], 
        familii = [], 
        setFamilii, 
        currentUser, 
        plati = [], 
        setPlati, 
        tranzactii = [], 
        setTranzactii, 
        onViewSportiv, 
        clubs = [], 
        grade = [], 
        permissions, 
        allRoles = [], 
        setAllRoles, 
        vizualizarePlati = [], 
        loading 
    } = props;
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [sportivToEdit, setSportivToEdit] = useState<Sportiv | null>(null);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [sportivForWallet, setSportivForWallet] = useState<Sportiv | null>(null);
    const [selectedSportivForHighlight, setSelectedSportivForHighlight] = useState<Sportiv | null>(null);
    const [accountSettingsSportiv, setAccountSettingsSportiv] = useState<Sportiv | null>(null);
    const [sportivToDelete, setSportivToDelete] = useState<Sportiv | null>(null);
    
    // Stări noi pentru modalul de creare cont
    const [sportivForAccountCreation, setSportivForAccountCreation] = useState<Sportiv | null>(null);
    const [createAccountForm, setCreateAccountForm] = useState({ email: '', username: '', parola: '' });
    const [createAccountError, setCreateAccountError] = useState('');
    const [createAccountLoading, setCreateAccountLoading] = useState(false);
    
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'nume', direction: 'asc' });

    const { showError, showSuccess } = useError();
    const isMobile = useIsMobile();
    
    const [filters, setFilters] = useLocalStorage('phi-hau-sportivi-filters', {
        searchTerm: '',
        statusFilter: 'Activ',
        grupaFilter: '',
        rolFilter: '',
        gradFilter: '',
    });
    
    const handleFilterChange = (name: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    
    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleOpenWallet = (sportiv: Sportiv) => {
        setSportivForWallet(sportiv);
        setIsWalletModalOpen(true);
    };

    const handleRowClick = (sportiv: Sportiv) => {
        setSelectedSportivForHighlight(sportiv);
        onViewSportiv(sportiv);
    };

    const handleDeactivate = async (sportivToDeactivate: Sportiv) => {
        if (!sportivToDeactivate) return;
        const { error } = await supabase.from('sportivi').update({ status: 'Inactiv' }).eq('id', sportivToDeactivate.id);
        if(error) {
            showError("Eroare", error.message);
        } else {
            setSportivi(prev => prev.map(s => s.id === sportivToDeactivate.id ? { ...s, status: 'Inactiv'} : s));
            showSuccess("Succes", "Sportivul a fost marcat ca inactiv.");
        }
    };
    
    const handleDelete = async (sportivToDelete: Sportiv) => {
        if (!sportivToDelete) return;
        const { error } = await supabase.from('sportivi').delete().eq('id', sportivToDelete.id);
        if(error) {
            showError("Eroare", error.message);
        } else {
            setSportivi(prev => prev.filter(s => s.id !== sportivToDelete.id));
            showSuccess("Succes", "Sportivul a fost șters definitiv.");
        }
    };

    const familyBalances = useMemo(() => {
        const balances = new Map<string, number>();
        if (!familii || !plati || !tranzactii) return balances;
        (familii || []).forEach(f => balances.set(f.id, 0));
        (tranzactii || []).forEach(t => { if (t.familie_id) balances.set(t.familie_id, (balances.get(t.familie_id) || 0) + t.suma); });
        (plati || []).forEach(p => { if (p.familie_id) balances.set(p.familie_id, (balances.get(p.familie_id) || 0) - p.suma); });
        return balances;
    }, [familii, plati, tranzactii]);
    
    const individualBalances = useMemo(() => {
        const balances = new Map<string, number>();
        if (!sportivi || !plati || !tranzactii) return balances;
        (sportivi || []).forEach(s => { if (!s.familie_id) balances.set(s.id, 0); });
        (tranzactii || []).forEach(t => { if (t.sportiv_id && !t.familie_id && balances.has(t.sportiv_id)) balances.set(t.sportiv_id, (balances.get(t.sportiv_id) || 0) + t.suma); });
        (plati || []).forEach(p => { if (p.sportiv_id && !p.familie_id && balances.has(p.sportiv_id)) balances.set(p.sportiv_id, (balances.get(p.sportiv_id) || 0) - p.suma); });
        return balances;
    }, [sportivi, plati, tranzactii]);

    const filteredSportivi = useMemo(() => {
        return (sportivi || []).filter((s: Sportiv) =>
            (`${s.nume} ${s.prenume}`.toLowerCase().includes(filters.searchTerm.toLowerCase())) &&
            (filters.statusFilter ? s.status === filters.statusFilter : true) &&
            (filters.grupaFilter ? s.grupa_id === filters.grupaFilter : true) &&
            (filters.rolFilter ? (s.roluri || []).some(r => r.id === filters.rolFilter) : true) &&
            (filters.gradFilter ? (filters.gradFilter === 'null' ? !s.grad_actual_id : s.grad_actual_id === filters.gradFilter) : true)
        );
    }, [sportivi, filters]);
    
    const sortedAndFilteredSportivi = useMemo(() => {
        let sortableItems = [...filteredSportivi];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                if (sortConfig.key === 'grad_actual_id') {
                    const gradA = grade.find(g => g.id === a.grad_actual_id);
                    const gradB = grade.find(g => g.id === b.grad_actual_id);
                    const ordineA = gradA ? gradA.ordine : -1;
                    const ordineB = gradB ? gradB.ordine : -1;
                    if (ordineA < ordineB) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (ordineA > ordineB) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                }
                const aVal = a[sortConfig.key as keyof Sportiv] as any;
                const bVal = b[sortConfig.key as keyof Sportiv] as any;
                if (aVal < bVal) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aVal > bVal) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredSportivi, sortConfig, grade]);



    const { createAccountAndAssignRole } = useRoleAssignment(currentUser, allRoles);

    const handleSave = async (formData: Partial<Sportiv>): Promise<{ success: boolean; error?: any; data?: Sportiv; }> => {
        try {
            if (sportivToEdit) {
                const { roluri, cluburi, ...sportivData } = formData;
                const { data, error } = await supabase.from('sportivi').update(sportivData).eq('id', sportivToEdit.id).select('*, cluburi(*)').single();
                if (error) throw error;
    
                // Preserve existing roles since we don't update them here yet
                const updatedSportiv = { ...data, roluri: sportivToEdit.roluri };
    
                setSportivi(prev => prev.map(s => s.id === sportivToEdit.id ? updatedSportiv : s));
                showSuccess('Succes', 'Sportiv actualizat!');
                return { success: true, data: updatedSportiv };
            } else {
                const { email, parola, roluri, cluburi, ...profileData } = formData;
                if (!email || !parola) throw new Error("Emailul și parola sunt obligatorii pentru crearea unui cont nou.");
                if (!profileData.club_id) { profileData.club_id = currentUser?.club_id; }
                if (!profileData.club_id) throw new Error("Clubul este obligatoriu la adăugarea unui sportiv nou.");

                const sportivRole = allRoles.find(r => r.nume === 'SPORTIV');
                if (!sportivRole) throw new Error("Rolul de bază 'SPORTIV' nu a fost găsit.");

                const result = await createAccountAndAssignRole(
                    email,
                    parola,
                    profileData,
                    [sportivRole]
                );

                if (!result.success || !result.sportiv) {
                    throw new Error(result.error || "A apărut o eroare la crearea contului.");
                }

                setSportivi(prev => [...prev, result.sportiv!]);
                showSuccess('Succes', `Sportivul a fost adăugat cu succes. Username generat: ${result.sportiv?.username}`);
                return { success: true, data: result.sportiv! };
            }
        } catch (err: any) {
            if (err.message && (err.message.includes('duplicate key value violates unique constraint') || err.message.includes('unique_sportiv_phi_hau'))) {
                showError("Eroare Duplicat", "Un sportiv cu același nume, prenume și dată de naștere există deja în sistem.");
            } else {
                showError("Eroare la Salvare", err.message);
            }
            return { success: false, error: err };
        }
    };

    const handleOpenCreateAccountModal = (user: Sportiv) => {
        setSportivForAccountCreation(user);
        const sanitize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
        const emailPrefix = `${sanitize(user.nume)}.${sanitize(user.prenume)}`;
        setCreateAccountForm({
            email: user.email || `${emailPrefix}@phihau.ro`,
            username: user.username || emailPrefix,
            parola: 'Parola123!'
        });
        setCreateAccountError('');
        setIsFormModalOpen(true); // Re-use the form modal for this purpose. Let's make a dedicated one.
    };

    const handleCreateAccountFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCreateAccountForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase || !sportivForAccountCreation) return;
        setCreateAccountLoading(true);
        setCreateAccountError('');
        
        try {
            const sportivRole = allRoles.find(r => r.nume === 'SPORTIV');
            if (!sportivRole) throw new Error("Rolul 'SPORTIV' nu a fost găsit.");

            const result = await createAccountAndAssignRole(
                createAccountForm.email,
                createAccountForm.parola,
                { ...sportivForAccountCreation, username: createAccountForm.username },
                [sportivRole]
            );

            if (!result.success || !result.sportiv) {
                throw new Error(result.error || 'A apărut o eroare la crearea contului.');
            }
    
            showSuccess("Cont Creat", `Contul pentru ${sportivForAccountCreation.nume} a fost creat cu succes. Reîncărcați pagina.`);
            setTimeout(() => window.location.reload(), 1500);
    
        } catch (err: any) {
            setCreateAccountError(err.message);
        } finally {
            setCreateAccountLoading(false);
        }
    };


    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center gap-4">
                <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Management Sportivi</h1>
                {permissions.hasAdminAccess && (
                    <Button variant="primary" onClick={() => { setSportivToEdit(null); setIsFormModalOpen(true); }}>
                        <PlusIcon className="w-5 h-5 mr-1"/> Adaugă Sportiv
                    </Button>
                )}
            </div>

            <SportiviFilter 
                filters={filters}
                onFilterChange={handleFilterChange}
                grupe={grupe}
                allRoles={allRoles}
                grade={grade}
            />

            {loading ? (
                <MartialArtsSkeleton count={8} />
            ) : isMobile ? (
                <SportiviMobileList
                    sportivi={sortedAndFilteredSportivi}
                    onRowClick={handleRowClick}
                    onOpenWallet={handleOpenWallet}
                    families={familii}
                    familyBalances={familyBalances}
                    individualBalances={individualBalances}
                    grupe={grupe}
                    grade={grade}
                />
            ) : (
                <SportiviTable
                    sportivi={sortedAndFilteredSportivi}
                    grupe={grupe}
                    grade={grade}
                    onRowClick={handleRowClick}
                    onEdit={(s) => { setSportivToEdit(s); setIsFormModalOpen(true); }}
                    onOpenWallet={handleOpenWallet}
                    onOpenAccountSettings={setAccountSettingsSportiv}
                    onDelete={setSportivToDelete}
                    requestSort={requestSort}
                />
            )}

            <SportivModals
                isFormModalOpen={isFormModalOpen}
                onCloseFormModal={() => setIsFormModalOpen(false)}
                onSaveSportiv={handleSave}
                sportivToEdit={sportivToEdit}
                grupe={grupe}
                setGrupe={setGrupe}
                grade={grade}
                familii={familii}
                setFamilii={setFamilii}
                tipuriAbonament={tipuriAbonament}
                clubs={clubs}
                currentUser={currentUser}
                accountSettingsSportiv={accountSettingsSportiv}
                onCloseAccountSettings={() => setAccountSettingsSportiv(null)}
                setSportivi={setSportivi}
                allRoles={allRoles}
                onOpenCreateAccount={(user) => {
                    setSportivForAccountCreation(user);
                    const sanitize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
                    const emailPrefix = `${sanitize(user.nume)}.${sanitize(user.prenume)}`;
                    setCreateAccountForm({ email: user.email || `${emailPrefix}@phihau.ro`, username: user.username || emailPrefix, parola: 'Parola123!' });
                    setCreateAccountError('');
                }}
                sportivForAccountCreation={sportivForAccountCreation}
                onCloseCreateAccount={() => setSportivForAccountCreation(null)}
                createAccountForm={createAccountForm}
                onCreateAccountFormChange={handleCreateAccountFormChange}
                onCreateAccount={handleCreateAccount}
                createAccountError={createAccountError}
                createAccountLoading={createAccountLoading}
                isWalletModalOpen={isWalletModalOpen}
                onCloseWalletModal={() => {
                    setIsWalletModalOpen(false);
                    setSportivForWallet(null);
                }}
                sportivForWallet={sportivForWallet}
                allSportivi={sportivi}
                vizualizarePlati={vizualizarePlati}
                plati={plati}
                setPlati={setPlati}
                setTranzactii={setTranzactii}
                sportivToDelete={sportivToDelete}
                onCloseDeleteModal={() => setSportivToDelete(null)}
                onDeactivate={handleDeactivate}
                onDelete={handleDelete}
            />
        </div>
    );
};
