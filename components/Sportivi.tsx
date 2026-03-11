import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Sportiv, Grupa, TipAbonament, Familie, Rol, Plata, Tranzactie, User, Club, Grad, Permissions, VizualizarePlata } from '../types';
import { Button } from './ui';
import { PlusIcon, UploadCloudIcon } from './icons';
import { adaugaSportiv, actualizeazaSportiv } from '../services/sportivService';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { MartialArtsSkeleton } from './MartialArtsSkeleton';
import { SportiviFilter } from './Sportivi/SportiviFilter';
import { SportiviTable } from './Sportivi/SportiviTable';
import { SportiviMobileList } from './Sportivi/SportiviMobileList';
import { SportivModals } from './Sportivi/SportivModals';
import { ImportCsvModal } from './Sportivi/ImportCsvModal';
import { SportivFormModal } from './Sportivi/SportivFormModal';
import { ExportSportiviTable } from './Sportivi/ExportSportiviTable';
import { useIsMobile } from '../hooks/useIsMobile';
import { useRoleAssignment } from '../hooks/useRoleAssignment';
import { useSportivi } from '../hooks/useSportivi';
import { useData } from '../contexts/DataContext';
import { useFamilyManager } from '../hooks/useFamilyManager';

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
export const Sportivi: React.FC<{
    onViewSportiv: (sportiv: Sportiv) => void;
    permissions: Permissions;
    onBack: () => void;
}> = (props) => {
    const { 
        onViewSportiv, 
        permissions, 
        onBack 
    } = props;

    const {
        setGrupe,
        setFamilii,
        currentUser,
        setPlati,
        setTranzactii,
        setSportivi,
        clubs = [],
        grade = [],
        allRoles = [], setAllRoles,
        filteredData,
        familii = [],
        plati = [],
        tranzactii = [],
        tipuriAbonament = [],
        vizualizarePlati = [],
    } = useData();

    const { showError, showSuccess } = useError();
    const isMobile = useIsMobile();
    const grupe = filteredData?.grupe || [];

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }[]>([]);
    const [sportivForWallet, setSportivForWallet] = useState<Sportiv | null>(null);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [selectedSportivForHighlight, setSelectedSportivForHighlight] = useState<Sportiv | null>(null);
    const [sportivToEdit, setSportivToEdit] = useState<Sportiv | null>(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [sportivForAccountCreation, setSportivForAccountCreation] = useState<Sportiv | null>(null);
    const [createAccountForm, setCreateAccountForm] = useState({ email: '', username: '', parola: '' });
    const [createAccountLoading, setCreateAccountLoading] = useState(false);
    const [createAccountError, setCreateAccountError] = useState('');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isExportTableOpen, setIsExportTableOpen] = useState(false);
    const [accountSettingsSportiv, setAccountSettingsSportiv] = useState<Sportiv | null>(null);
    const [sportivToDelete, setSportivToDelete] = useState<Sportiv | null>(null);

    const handleOpenAddSportiv = () => {
        setSportivToEdit(null);
        setIsFormModalOpen(true);
    };

    const handleOpenEditSportiv = (sportiv: Sportiv) => {
        setSportivToEdit(sportiv);
        setIsFormModalOpen(true);
    };

    const handleCloseFormModal = () => {
        setIsFormModalOpen(false);
        setSportivToEdit(null);
    };

    const [filters, setFilters] = useLocalStorage('phi-hau-sportivi-filters', {
        searchTerm: '',
        statusFilter: 'Activ',
        grupaFilter: '',
        rolFilter: '',
        gradFilter: '',
        clubFilter: permissions.isFederationAdmin ? '' : (currentUser.club_id || ''),
    });

    // Ensure clubFilter is correct if user is not admin
    React.useEffect(() => {
        if (!permissions.isFederationAdmin && currentUser?.club_id && filters.clubFilter !== currentUser.club_id) {
            setFilters(prev => ({ ...prev, clubFilter: currentUser.club_id || '' }));
        }
        setPage(1); // Reset page on filter change
    }, [permissions.isFederationAdmin, currentUser?.club_id, filters.clubFilter, setFilters, filters.searchTerm, filters.statusFilter, filters.grupaFilter, filters.rolFilter, filters.gradFilter]);

    const [page, setPage] = useState(1);
    const pageSize = 50;

    const { data: sportiviData, isLoading: sportiviLoading, error: sportiviError, count: totalSportivi } = useSportivi({
        clubId: filters.clubFilter,
        status: filters.statusFilter,
        gradId: filters.gradFilter !== 'null' ? filters.gradFilter : undefined,
        rolId: filters.rolFilter,
        searchTerm: filters.searchTerm,
        grupaId: filters.grupaFilter
    }, { page, pageSize });
    
    const sportivi = sportiviData || [];
    const hasMore = sportivi.length < totalSportivi;
    
    const {
        loading: familyLoading,
        familyBalances,
        individualBalances,
    } = useFamilyManager(
        familii,
        setFamilii,
        sportiviData || [],
        setSportivi,
        plati,
        tranzactii
    );

    const loading = sportiviLoading || familyLoading;
    
    const handleFilterChange = (name: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSearchChange = (value: string) => {
        handleFilterChange('searchTerm', value);
    };
    
    const requestSort = (key: string) => {
        setSortConfig(prev => {
            const existing = prev.find(s => s.key === key);
            if (existing) {
                if (existing.direction === 'asc') {
                    return prev.map(s => s.key === key ? { ...s, direction: 'desc' } : s);
                } else {
                    return prev.filter(s => s.key !== key);
                }
            } else {
                return [...prev, { key, direction: 'asc' }];
            }
        });
    };

    const handleOpenWallet = (sportiv: Sportiv) => {
        setSportivForWallet(sportiv);
        setIsWalletModalOpen(true);
    };

    const handleRowClick = (sportiv: Sportiv) => {
        setSelectedSportivForHighlight(sportiv);
        onViewSportiv(sportiv);
    };

    const queryClient = useQueryClient();

    const handleDeactivate = async (sportivToDeactivate: Sportiv) => {
        if (!sportivToDeactivate) return;
        const { error } = await supabase.from('sportivi').update({ status: 'Inactiv' }).eq('id', sportivToDeactivate.id);
        if(error) {
            showError("Eroare", error.message);
        } else {
            setSportivi(prev => prev.map(s => s.id === sportivToDeactivate.id ? { ...s, status: 'Inactiv'} : s));
            queryClient.invalidateQueries({ queryKey: ['sportivi'] });
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
            queryClient.invalidateQueries({ queryKey: ['sportivi'] });
            showSuccess("Succes", "Sportivul a fost șters definitiv.");
        }
    };

    const sortedAndFilteredSportivi = useMemo(() => {
        let sortableItems = [...sportivi];
        if (sortConfig.length > 0) {
            sortableItems.sort((a, b) => {
                for (const { key, direction } of sortConfig) {
                    let aVal: any, bVal: any;
                    
                    if (key === 'grad_actual_id') {
                        const gradA = grade.find(g => g.id === a.grad_actual_id);
                        const gradB = grade.find(g => g.id === b.grad_actual_id);
                        aVal = gradA ? gradA.ordine : -1;
                        bVal = gradB ? gradB.ordine : -1;
                    } else {
                        aVal = a[key as keyof Sportiv] as any;
                        bVal = b[key as keyof Sportiv] as any;
                    }

                    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
                    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [sportivi, sortConfig, grade]);



    const { createAccountAndAssignRole } = useRoleAssignment(currentUser, allRoles);

    const handleSave = async (formData: Partial<Sportiv>): Promise<{ success: boolean; error?: any; data?: Sportiv; }> => {
        try {
            if (sportivToEdit) {
                const result = await actualizeazaSportiv(sportivToEdit.id, formData);
                if (!result.success) throw result.error;
    
                // Preserve existing roles since we don't update them here yet
                const updatedSportiv = { ...result.data!, roluri: sportivToEdit.roluri };
    
                setSportivi(prev => prev.map(s => s.id === sportivToEdit.id ? updatedSportiv : s));
                queryClient.invalidateQueries({ queryKey: ['sportivi'] });
                showSuccess('Succes', 'Sportiv actualizat!');
                handleCloseFormModal();
                return { success: true, data: updatedSportiv };
            } else {
                const { email, parola, roluri, cluburi, ...profileData } = formData;
                if (!email || !parola) throw new Error("Emailul și parola sunt obligatorii pentru crearea unui cont nou.");
                
                // 1. Verificare prealabilă: Caută după email
                const { data: existingSportiv, error: checkError } = await supabase
                    .from('sportivi')
                    .select('id, club_id')
                    .eq('email', email)
                    .maybeSingle();
                
                if (checkError) throw checkError;

                let targetClubId = profileData.club_id || filters.clubFilter || currentUser?.club_id;
                if (!targetClubId) throw new Error("Clubul este obligatoriu la adăugarea unui sportiv nou.");

                if (existingSportiv) {
                    if (existingSportiv.club_id !== targetClubId) {
                        const confirmTransfer = window.confirm("Acest sportiv este înregistrat la un alt club. Doriți să îl transferați în clubul dumneavoastră?");
                        if (!confirmTransfer) return { success: false, error: "Transfer anulat." };
                        
                        // Transfer logic: update club_id
                        const { error: updateError } = await supabase
                            .from('sportivi')
                            .update({ club_id: targetClubId })
                            .eq('id', existingSportiv.id);
                        if (updateError) throw updateError;
                    }
                    // For existing sportiv, we skip the account creation if it already has a user_id
                    // Or we just assign the role if it doesn't have one
                    // This is handled by createAccountAndAssignRole or a separate logic
                }

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
                queryClient.invalidateQueries({ queryKey: ['sportivi'] });
                showSuccess('Succes', `Sportivul a fost adăugat cu succes. Username generat: ${result.sportiv?.username}`);
                handleCloseFormModal();
                return { success: true, data: result.sportiv! };
            }
        } catch (err: any) {
            // ErrorProvider handles the error message formatting, but we can pass it here
            showError("Eroare la Salvare", err);
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


    if (isExportTableOpen) {
        return <ExportSportiviTable onClose={() => setIsExportTableOpen(false)} />;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center gap-4">
                <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Management Sportivi</h1>
                {permissions.hasAdminAccess && (
                    <div className="flex gap-2">
                        <Button 
                            variant="secondary" 
                            onClick={() => setIsExportTableOpen(true)}
                            style={{ backgroundColor: currentUser?.cluburi?.theme_config?.bg_card, color: currentUser?.cluburi?.theme_config?.accent_color }}
                        >
                            Export / Editare
                        </Button>
                        <Button 
                            variant="secondary" 
                            onClick={() => setIsImportModalOpen(true)}
                            style={{ backgroundColor: currentUser?.cluburi?.theme_config?.bg_card, color: currentUser?.cluburi?.theme_config?.accent_color }}
                        >
                            <UploadCloudIcon className="w-5 h-5 mr-1"/> Import CSV
                        </Button>
                        <Button 
                            variant="primary" 
                            onClick={handleOpenAddSportiv}
                            style={{ backgroundColor: currentUser?.cluburi?.theme_config?.accent_color, color: '#ffffff' }}
                        >
                            <PlusIcon className="w-5 h-5 mr-1"/> Adaugă Sportiv
                        </Button>
                    </div>
                )}
            </div>

            <SportiviFilter 
                filters={filters}
                onFilterChange={handleFilterChange}
                grupe={grupe}
                allRoles={allRoles}
                grade={grade}
                clubs={clubs}
                permissions={permissions}
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
                    requestSort={requestSort}
                    sortConfig={sortConfig}
                />
            ) : (
                <SportiviTable
                    sportivi={sortedAndFilteredSportivi}
                    grupe={grupe}
                    grade={grade}
                    onRowClick={handleRowClick}
                    onEdit={handleOpenEditSportiv}
                    onOpenWallet={handleOpenWallet}
                    onOpenAccountSettings={setAccountSettingsSportiv}
                    onDelete={setSportivToDelete}
                    requestSort={requestSort}
                    sortConfig={sortConfig}
                    searchTerm={filters.searchTerm}
                    onSearchChange={handleSearchChange}
                />
            )}

            {hasMore && (
                <div className="flex justify-center mt-4">
                    <Button variant="secondary" onClick={() => setPage(p => p + 1)} isLoading={sportiviLoading}>
                        Încarcă mai mult
                    </Button>
                </div>
            )}

            <ImportCsvModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImportComplete={() => {
                    setIsImportModalOpen(false);
                    window.location.reload();
                }}
            />

            <SportivFormModal
                isOpen={isFormModalOpen}
                onClose={handleCloseFormModal}
                onSave={handleSave}
                sportivToEdit={sportivToEdit}
                grupe={grupe}
                setGrupe={setGrupe}
                grade={grade}
                familii={familii}
                setFamilii={setFamilii}
                tipuriAbonament={tipuriAbonament}
                clubs={clubs}
                currentUser={currentUser}
                clubFilter={filters.clubFilter}
            />

            <SportivModals
                isFormModalOpen={false}
                onCloseFormModal={handleCloseFormModal}
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
                clubFilter={filters.clubFilter}
                accountSettingsSportiv={accountSettingsSportiv}
                onCloseAccountSettings={() => setAccountSettingsSportiv(null)}
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
