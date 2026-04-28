import React, { useState, useMemo, useTransition, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Sportiv, Grupa, TipAbonament, Familie, Rol, Plata, Tranzactie, User, Club, Grad, Permissions, VizualizarePlata, ProgramItem } from '../types';
import { Button, Modal, Input, CredentialeContModal } from './ui';
import { PlusIcon, UploadCloudIcon, ArrowLeftIcon } from './icons';
import { ProgramEditor } from './Grupe/ProgramEditor';
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
import { getAge } from '../utils/date';
import { TourOverlay, TourButton, TOURS } from './GhidUtilizator';





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
        activeRoleContext,
    } = useData();

    const { showError, showSuccess } = useError();
    const isMobile = useIsMobile();
    const grupe = filteredData?.grupe || [];

    const [, startTransition] = useTransition();
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }[]>([]);
    const [selectedSportivIds, setSelectedSportivIds] = useState<Set<string>>(new Set());
    const [bulkGrupaId, setBulkGrupaId] = useState('');
    const [bulkLoading, setBulkLoading] = useState(false);
    const [showNewGrupaModal, setShowNewGrupaModal] = useState(false);
    const [newGrupaDenumire, setNewGrupaDenumire] = useState('');
    const [newGrupaProgram, setNewGrupaProgram] = useState<ProgramItem[]>([]);
    const [sportivForWallet, setSportivForWallet] = useState<Sportiv | null>(null);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [selectedSportivForHighlight, setSelectedSportivForHighlight] = useState<Sportiv | null>(null);
    const [sportivToEdit, setSportivToEdit] = useState<Sportiv | null>(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [sportivForAccountCreation, setSportivForAccountCreation] = useState<Sportiv | null>(null);
    const [createAccountForm, setCreateAccountForm] = useState({ email: '', username: '', parola: '' });
    const [createAccountLoading, setCreateAccountLoading] = useState(false);
    const [createAccountError, setCreateAccountError] = useState('');
    const [credentialeModal, setCredentialeModal] = useState<{ email: string; parola: string; numeSportiv: string } | null>(null);
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

    // Filtrare grupe după club: federation admin folosește clubFilter, ceilalți folosesc clubul din contextul activ
    const grupeFiltrateClub = useMemo(() => {
        const clubIdActiv = permissions.isFederationAdmin
            ? filters.clubFilter || ''
            : activeRoleContext?.club_id || currentUser?.club_id || '';
        // Dacă clubIdActiv e gol: federation admin fără filtru club vede toate grupele;
        // admin club fără club_id în context returnează [] (nu ar trebui să se întâmple în practică)
        if (!clubIdActiv) return permissions.isFederationAdmin ? grupe : [];
        return grupe.filter(g => g.club_id === clubIdActiv);
    }, [grupe, permissions.isFederationAdmin, filters.clubFilter, activeRoleContext?.club_id, currentUser?.club_id]);

    const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
    const PAGE_SIZE_LS_KEY = 'phi-hau-sportivi-page-size';

    // Preferința de page size persistă în localStorage
    const [savedPageSize, setSavedPageSize] = useLocalStorage<number>(PAGE_SIZE_LS_KEY, 25);

    // Cheie sessionStorage pentru salvarea stării de paginare + scroll
    const PAGINATION_STORAGE_KEY = 'phi-hau-sportivi-pagination-state';

    // Citim starea salvată o singură dată la montare folosind un ref lazy init
    // useRef cu funcție lazy asigură că citim sessionStorage o singură dată, indiferent de re-render-uri
    type SavedPaginationState = { page: number; pageSize: number; loadAll: boolean; scrollY: number; sportivId?: string; fromProfile: true };
    const restoredStateRef = useRef<SavedPaginationState | null>(null);
    if (restoredStateRef.current === null) {
        // Se execută o singură dată (primul render); dacă nu există cheie, rămâne null
        try {
            const raw = sessionStorage.getItem(PAGINATION_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.fromProfile) {
                    restoredStateRef.current = parsed as SavedPaginationState;
                    sessionStorage.removeItem(PAGINATION_STORAGE_KEY);
                }
            }
        } catch {}
    }
    const restoredState = restoredStateRef.current;

    const [page, setPage] = useState(restoredState?.page ?? 1);
    // Prioritate: stare restaurată din sessionStorage (revenire din profil) > preferință localStorage > default 25
    const [pageSize, setPageSize] = useState(restoredState?.pageSize ?? savedPageSize);
    const [loadAll, setLoadAll] = useState(restoredState?.loadAll ?? false);
    const [showMutaGrupaModal, setShowMutaGrupaModal] = useState(false);

    // Ref pentru a sări peste reset-ul paginării la primul efect (când restaurăm din sessionStorage)
    const isRestoringRef = useRef(!!restoredState);

    // Ref pentru scroll restaurat — se setează true după prima restaurare
    const scrollRestoredRef = useRef(false);

    // Reset page si loadAll la schimbarea filtrelor
    // Excepție: nu resetăm dacă tocmai am restaurat starea din sessionStorage
    React.useEffect(() => {
        if (isRestoringRef.current) {
            isRestoringRef.current = false;
            return;
        }
        setPage(1);
        setLoadAll(false);
    }, [filters.searchTerm, filters.statusFilter, filters.grupaFilter, filters.rolFilter, filters.gradFilter, setFilters]);

    const handlePageSizeChange = (newSize: number) => {
        if (newSize === 0) {
            // Valoarea 0 = "Toți"
            setLoadAll(true);
            setPage(1);
        } else {
            setPageSize(newSize);
            setSavedPageSize(newSize); // persită în localStorage
            setLoadAll(false);
            setPage(1);
        }
    };

    const handleLoadAll = () => {
        setLoadAll(true);
        setPage(1);
    };

    const handleResetPagination = () => {
        setLoadAll(false);
        setPage(1);
    };

    // Pentru non-federation admin, filtrul de club e fixat la clubul activ (server-side)
    // Federation admin poate filtra prin filters.clubFilter (UI)
    const sportiviClubIdFilter = permissions.isFederationAdmin
        ? (filters.clubFilter || undefined)
        : (activeRoleContext?.club_id || currentUser?.club_id || undefined);

    const { data: sportiviData, isLoading: sportiviLoading, error: sportiviError, count: totalSportivi } = useSportivi({
        status: filters.statusFilter,
        gradId: filters.gradFilter !== 'null' ? filters.gradFilter : undefined,
        rolId: filters.rolFilter,
        searchTerm: filters.searchTerm,
        grupaId: filters.grupaFilter,
        clubId: sportiviClubIdFilter
    }, loadAll ? undefined : { page, pageSize }, undefined, activeRoleContext?.id, loadAll);

    const sportivi = sportiviData || [];
    const totalPages = Math.ceil(totalSportivi / pageSize);
    
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

    // Restaurează poziția după ce datele s-au încărcat
    // Dublu RAF: primul frame React a comis DOM-ul, al doilea frame browserul a pictat
    useEffect(() => {
        if (sportiviLoading) return;
        if (scrollRestoredRef.current) return;
        if (!restoredState) return;
        scrollRestoredRef.current = true;

        const doScroll = () => {
            const sportivId = restoredState.sportivId;
            if (sportivId) {
                const el = document.getElementById(`row-${sportivId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' });
                    return;
                }
            }
            // fallback: scroll la poziția salvată
            const scrollTarget = restoredState.scrollY;
            if (scrollTarget) {
                try {
                    window.scrollTo({ top: scrollTarget, left: 0, behavior: 'instant' as ScrollBehavior });
                } catch {
                    window.scrollTo(0, scrollTarget);
                }
            }
        };

        // Dublu RAF: asigură că browserul a pictat DOM-ul înainte de scroll
        let raf2: number;
        const raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(doScroll);
        });
        return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sportiviLoading]);

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

    const handleBulkAssignGroup = async (overrideGrupaId?: string | null, overrideGrupaName?: string) => {
        if (!supabase || selectedSportivIds.size === 0) return;
        if (bulkGrupaId === '__new__' && overrideGrupaId === undefined) {
            setShowNewGrupaModal(true);
            return;
        }
        setBulkLoading(true);
        const ids = Array.from(selectedSportivIds);
        const resolvedGrupaId = overrideGrupaId !== undefined ? overrideGrupaId : (bulkGrupaId || null);
        const grupaName = overrideGrupaName || (resolvedGrupaId ? grupe.find(g => g.id === resolvedGrupaId)?.denumire || 'grupă' : 'fără grupă');

        const { error } = await supabase.from('sportivi').update({ grupa_id: resolvedGrupaId }).in('id', ids);
        setBulkLoading(false);
        if (error) {
            showError('Eroare', error.message);
        } else {
            queryClient.invalidateQueries({ queryKey: ['sportivi'] });
            showSuccess('Succes', `${ids.length} sportivi mutați în ${grupaName}.`);
            setSelectedSportivIds(new Set());
            setBulkGrupaId('');
            setShowMutaGrupaModal(false);
        }
    };

    const handleSaveNewGrupa = async () => {
        if (!supabase) return;
        const denumire = newGrupaDenumire.trim();
        if (!denumire) { showError('Eroare', 'Introduceți o denumire pentru grupă.'); return; }
        setBulkLoading(true);
        const clubId = activeRoleContext?.club_id || currentUser?.club_id;
        const { data: nouaGrupa, error: grupaError } = await supabase
            .from('grupe')
            .insert({ denumire, club_id: clubId })
            .select()
            .single();
        if (grupaError || !nouaGrupa) {
            showError('Eroare', grupaError?.message || 'Nu s-a putut crea grupa.');
            setBulkLoading(false);
            return;
        }
        if (newGrupaProgram.length > 0) {
            const programToInsert = newGrupaProgram.map(({ id: _id, ...rest }) => ({ ...rest, grupa_id: nouaGrupa.id, club_id: nouaGrupa.club_id }));
            await supabase.from('orar_saptamanal').insert(programToInsert);
        }
        setGrupe(prev => [...prev, { ...nouaGrupa, program: newGrupaProgram }]);
        setShowNewGrupaModal(false);
        setNewGrupaDenumire('');
        setNewGrupaProgram([]);
        setBulkGrupaId('');
        await handleBulkAssignGroup(nouaGrupa.id, nouaGrupa.denumire);
    };

    const handleOpenWallet = (sportiv: Sportiv) => {
        // startTransition defers the heavy render (SportivWallet useMemo on vizualizarePlati)
        // so the browser can paint the button press before React renders the modal
        startTransition(() => {
            setSportivForWallet(sportiv);
            setIsWalletModalOpen(true);
        });
    };

    const handleRowClick = (sportiv: Sportiv) => {
        try {
            const state = {
                page,
                pageSize,
                loadAll,
                scrollY: window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0,
                sportivId: sportiv.id,
                fromProfile: true,
            };
            sessionStorage.setItem(PAGINATION_STORAGE_KEY, JSON.stringify(state));
        } catch {}
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
        // ON DELETE CASCADE pe FK gestionează automat utilizator_roluri_multicont
        const { error } = await supabase.from('sportivi').delete().eq('id', sportivToDelete.id);
        if (error) {
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



    const { createAccountAndAssignRole, updateRoles } = useRoleAssignment(currentUser, allRoles);

    const handleSave = async (formData: Partial<Sportiv>): Promise<{ success: boolean; error?: any; data?: Sportiv; }> => {
        try {
            if (sportivToEdit) {
                const result = await actualizeazaSportiv(sportivToEdit.id, formData);
                if (!result.success) throw result.error;
    
                // Update roles if they changed
                const currentRoleIds = (sportivToEdit.roluri || []).map(r => r.id).sort().join(',');
                const newRoleIds = (formData.roluri || []).map(r => r.id).sort().join(',');
                
                let finalRoles = sportivToEdit.roluri;
                if (currentRoleIds !== newRoleIds) {
                    const roleIds = (formData.roluri || []).map(r => r.id);
                    const updatedRoles = await updateRoles(sportivToEdit, roleIds);
                    if (updatedRoles) {
                        finalRoles = updatedRoles;
                    }
                }
    
                const updatedSportiv = { ...result.data!, roluri: finalRoles };
    
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
                }

                // Use selected roles or default to SPORTIV
                let rolesToAssign = roluri || [];
                if (rolesToAssign.length === 0) {
                    // 1. Caută în contextul curent
                    let sportivRole = allRoles.find(r => r.nume === 'SPORTIV');
                    // 2. Fallback: fetch direct din DB dacă allRoles e gol (race condition / cache corupt)
                    if (!sportivRole) {
                        const { data: rolesData } = await supabase
                            .from('roluri').select('id, nume').eq('nume', 'SPORTIV').maybeSingle();
                        if (rolesData) {
                            sportivRole = rolesData as typeof sportivRole;
                            setAllRoles(prev => prev.some(r => r.nume === 'SPORTIV') ? prev : [...prev, rolesData as any]);
                        }
                    }
                    // 3. Fallback final: obiect sintetic — API-ul folosește doar .nume, nu .id
                    if (!sportivRole) {
                        sportivRole = { id: 'sportiv-role', nume: 'SPORTIV' } as typeof sportivRole;
                    }
                    rolesToAssign = [sportivRole];
                }

                const result = await createAccountAndAssignRole(
                    email,
                    parola,
                    profileData,
                    rolesToAssign
                );

                if (!result.success || !result.sportiv) {
                    throw new Error(result.error || "A apărut o eroare la crearea contului.");
                }

                setSportivi(prev => [...prev, result.sportiv!]);
                queryClient.invalidateQueries({ queryKey: ['sportivi'] });
                handleCloseFormModal();
                setCredentialeModal({
                    email,
                    parola: result.generatedPassword ?? parola,
                    numeSportiv: `${profileData.prenume || ''} ${profileData.nume || ''}`.trim(),
                });
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
            let sportivRole = allRoles.find(r => r.nume === 'SPORTIV');
            if (!sportivRole) {
                const { data: rolesData } = await supabase
                    .from('roluri').select('id, nume').eq('nume', 'SPORTIV').maybeSingle();
                sportivRole = (rolesData as typeof sportivRole) ?? ({ id: 'sportiv-role', nume: 'SPORTIV' } as typeof sportivRole);
            }

            const result = await createAccountAndAssignRole(
                createAccountForm.email,
                createAccountForm.parola,
                { ...sportivForAccountCreation, username: createAccountForm.username },
                [sportivRole]
            );

            if (!result.success || !result.sportiv) {
                throw new Error(result.error || 'A apărut o eroare la crearea contului.');
            }

            setIsFormModalOpen(false);
            setSportivForAccountCreation(null);
            setCredentialeModal({
                email: createAccountForm.email,
                parola: result.generatedPassword ?? createAccountForm.parola,
                numeSportiv: `${sportivForAccountCreation.prenume || ''} ${sportivForAccountCreation.nume || ''}`.trim(),
            });
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
            {credentialeModal && (
                <CredentialeContModal
                    isOpen={true}
                    onClose={() => setCredentialeModal(null)}
                    email={credentialeModal.email}
                    parola={credentialeModal.parola}
                    numeSportiv={credentialeModal.numeSportiv}
                />
            )}
            {/* Header */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <Button variant="secondary" size="sm" onClick={onBack}>
                        <ArrowLeftIcon className="w-4 h-4 mr-1" />
                        Înapoi
                    </Button>
                    <h1 className="text-lg md:text-2xl font-bold text-white uppercase tracking-tight">Management Sportivi</h1>
                </div>
                {permissions.hasAdminAccess && (
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsExportTableOpen(true)}
                            style={{ backgroundColor: currentUser?.cluburi?.theme_config?.bg_card, color: currentUser?.cluburi?.theme_config?.accent_color }}
                        >
                            Export / Editare
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsImportModalOpen(true)}
                            style={{ backgroundColor: currentUser?.cluburi?.theme_config?.bg_card, color: currentUser?.cluburi?.theme_config?.accent_color }}
                        >
                            <UploadCloudIcon className="w-4 h-4 mr-1"/> Import CSV
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleOpenAddSportiv}
                            style={{ backgroundColor: currentUser?.cluburi?.theme_config?.accent_color, color: '#ffffff' }}
                            data-tour="sportivi-adauga"
                        >
                            <PlusIcon className="w-4 h-4 mr-1"/> Adaugă Sportiv
                        </Button>
                    </div>
                )}
            </div>

            <SportiviFilter
                filters={filters}
                onFilterChange={handleFilterChange}
                grupe={grupeFiltrateClub}
                allRoles={allRoles}
                grade={grade}
                clubs={clubs}
                permissions={permissions}
            />

            {selectedSportivIds.size > 0 && (
                <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-brand-primary/10 border border-brand-primary/30 rounded-lg">
                    <span className="text-sm font-semibold text-brand-primary shrink-0">
                        {selectedSportivIds.size} {selectedSportivIds.size === 1 ? 'sportiv selectat' : 'sportivi selectați'}
                    </span>
                    <div className="flex gap-2 ml-auto">
                        <Button variant="primary" size="sm" onClick={() => setShowMutaGrupaModal(true)}>
                            Mută în grupă
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setSelectedSportivIds(new Set())}>
                            Anulează selecția
                        </Button>
                    </div>
                </div>
            )}

            {/* Ancora de tour: banda subtire invizibila plasata la inceputul tabelului.
                Pasul 4 din ghid tinteste aceasta ancora in loc de intregul div al tabelului,
                care poate depasi inaltimea viewport-ului si cauza pozitionare incorecta a spotlight-ului.
                Banda are 4px inaltime — suficient pentru spotlight, invizibila vizual. */}
            <div data-tour="sportivi-tabel-ancora" aria-hidden="true" className="h-1 w-full" />

            <div data-tour="sportivi-tabel">
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
                    selectedIds={selectedSportivIds}
                    onSelectionChange={setSelectedSportivIds}
                />
            )}
            </div>

            {/* Paginare */}
            {!loadAll ? (
                <div data-tour="sportivi-paginare" className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-700/50">
                    {/* Stânga: info + selector per pagina + incarca toti */}
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
                        <span>
                            {totalSportivi === 0
                                ? 'Niciun sportiv'
                                : `${Math.min((page - 1) * pageSize + 1, totalSportivi)}–${Math.min(page * pageSize, totalSportivi)} din ${totalSportivi}`}
                        </span>
                        <span className="text-slate-600">|</span>
                        <label className="flex items-center gap-1 text-slate-400 text-sm">
                            Afișează
                            <select
                                value={pageSize}
                                onChange={e => handlePageSizeChange(Number(e.target.value))}
                                className="bg-slate-800 border border-slate-600 text-white rounded-md px-2 py-1 text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-primary"
                            >
                                {PAGE_SIZE_OPTIONS.map(n => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                                {(permissions.isAdminClub || permissions.isFederationAdmin) && (
                                    <option value={0}>Toți ({totalSportivi})</option>
                                )}
                            </select>
                            / pagină
                        </label>
                    </div>
                    {/* Dreapta: butoane navigare */}
                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                                    page <= 1
                                        ? 'border-slate-700 text-slate-600 opacity-50 cursor-not-allowed bg-slate-800/50'
                                        : 'border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white bg-slate-800 cursor-pointer'
                                }`}
                            >
                                Anterior
                            </button>
                            <span className="text-sm text-slate-400 select-none px-1">
                                Pagina {page} din {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                                    page >= totalPages
                                        ? 'border-slate-700 text-slate-600 opacity-50 cursor-not-allowed bg-slate-800/50'
                                        : 'border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white bg-slate-800 cursor-pointer'
                                }`}
                            >
                                Următor
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-700/50">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
                        <span>
                            {sportiviLoading
                                ? 'Se încarcă toți sportivii...'
                                : `Afișând toți ${totalSportivi} sportivii`}
                        </span>
                        <span className="text-slate-600">|</span>
                        <label className="flex items-center gap-1 text-sm">
                            Afișează
                            <select
                                value={0}
                                onChange={e => handlePageSizeChange(Number(e.target.value))}
                                className="bg-slate-800 border border-slate-600 text-white rounded-md px-2 py-1 text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-primary"
                            >
                                {PAGE_SIZE_OPTIONS.map(n => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                                <option value={0}>Toți ({totalSportivi})</option>
                            </select>
                            / pagină
                        </label>
                    </div>
                </div>
            )}

            <SportivModals
                isImportModalOpen={isImportModalOpen}
                onCloseImportModal={() => setIsImportModalOpen(false)}
                onImportComplete={() => {
                    setIsImportModalOpen(false);
                    window.location.reload();
                }}
                activeClubId={currentUser?.club_id || ''}
                defaultGrupaId={grupe[0]?.id || ''}
                isFormModalOpen={isFormModalOpen}
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

            {/* Modal: Mută în grupă */}
            <Modal isOpen={showMutaGrupaModal} onClose={() => { setShowMutaGrupaModal(false); setBulkGrupaId(''); }} title={`Mută ${selectedSportivIds.size} ${selectedSportivIds.size === 1 ? 'sportiv' : 'sportivi'} în grupă`}>
                <div className="space-y-4">
                    <p className="text-sm text-slate-400">
                        Selectează grupa în care vrei să muți sportivii selectați. Grupele fără selecție vor fi setate la "Fără grupă".
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Grupă destinație</label>
                        <select
                            value={bulkGrupaId}
                            onChange={e => setBulkGrupaId(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            autoFocus
                        >
                            <option value="">Fără grupă (elimină din grupă)</option>
                            {grupeFiltrateClub.map(g => (
                                <option key={g.id} value={g.id}>{g.denumire}</option>
                            ))}
                            <option value="__new__">+ Grupă nouă...</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" onClick={() => { setShowMutaGrupaModal(false); setBulkGrupaId(''); }}>
                            Anulează
                        </Button>
                        <Button variant="primary" onClick={() => handleBulkAssignGroup()} isLoading={bulkLoading}>
                            Confirmă mutarea
                        </Button>
                    </div>
                </div>
            </Modal>

            <TourOverlay steps={TOURS.sportivi} pageKey="sportivi" />
            <TourButton steps={TOURS.sportivi} pageKey="sportivi" />

            <Modal isOpen={showNewGrupaModal} onClose={() => { setShowNewGrupaModal(false); setBulkGrupaId(''); }} title="Grupă nouă">
                <div className="space-y-4">
                    <Input
                        label="Denumire grupă"
                        value={newGrupaDenumire}
                        onChange={e => setNewGrupaDenumire(e.target.value)}
                        placeholder="ex: Copii Avansați"
                        autoFocus
                    />
                    <ProgramEditor program={newGrupaProgram} setProgram={setNewGrupaProgram} />
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" onClick={() => { setShowNewGrupaModal(false); setBulkGrupaId(''); }}>Anulează</Button>
                        <Button variant="success" onClick={handleSaveNewGrupa} isLoading={bulkLoading}>
                            Creează și mută {selectedSportivIds.size > 0 ? `(${selectedSportivIds.size})` : ''}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
