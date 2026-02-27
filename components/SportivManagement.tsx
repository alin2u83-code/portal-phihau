import React, { useState, useMemo } from 'react';
import { Sportiv, Grupa, TipAbonament, Familie, Rol, Plata, Tranzactie, User, Club, Grad, Permissions, VizualizarePlata } from '../types';
import { Button, Input, Select, Card, RoleBadge, Modal } from './ui';
import { PlusIcon, WalletIcon, UserXIcon, UserCheckIcon, SearchIcon, ShieldCheckIcon, TrashIcon, EditIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { SportivFormModal } from './Sportivi';
import { SportivWallet } from './SportivWallet';
import { ResponsiveTable, Column } from './ResponsiveTable';
import { FEDERATIE_ID, FEDERATIE_NAME } from '../constants';
import { useIsMobile } from '../hooks/useIsMobile';
import { SportivAccountSettingsModal } from './SportivAccountSettings';
import { DeleteAuditModal } from './DeleteAuditModal';
import { GradBadge } from '../utils/grades';

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

// --- Mobile Card Component ---
const SportivCardMobile: React.FC<{
    sportiv: Sportiv;
    onRowClick: (item: Sportiv) => void;
    onOpenWallet: (item: Sportiv) => void;
    familie: Familie | undefined;
    familyBalance: number | undefined;
    individualBalance: number | undefined;
    grupa: Grupa | undefined;
    grade: Grad[];
}> = ({ sportiv, onRowClick, onOpenWallet, familie, familyBalance, individualBalance, grupa, grade }) => {
    const grad = grade.find(g => g.id === sportiv.grad_actual_id);
    return (
        <Card onClick={() => onRowClick(sportiv)} className={`border-l-4 ${sportiv.status === 'Activ' ? 'border-green-500' : 'border-slate-600'}`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold text-white text-lg mb-1">{sportiv.nume} {sportiv.prenume}</p>
                    <GradBadge grad={grad} />
                    <p className="text-sm text-slate-400 mt-2">{getAge(sportiv.data_nasterii)} ani - {grupa?.denumire || 'Fără grupă'}</p>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                    {(sportiv.roluri || []).map(r => <RoleBadge key={r.id} role={r} />)}
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700">
                {familie && familyBalance !== undefined ? (
                    <div className="text-xs">
                        <p className="text-slate-300">Familia {familie.nume}</p>
                        <p className={`font-bold ${familyBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>Sold: {familyBalance.toFixed(2)} lei</p>
                    </div>
                ) : individualBalance !== undefined ? (
                     <div className="text-xs">
                        <p className="text-slate-300">Sold Individual</p>
                        <p className={`font-bold ${individualBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{individualBalance.toFixed(2)} lei</p>
                    </div>
                ) : null}
            </div>
            <div className="mt-4 flex gap-2">
                <Button size="sm" variant="info" onClick={(e) => { e.stopPropagation(); onOpenWallet(sportiv); }} className="w-full">
                    <WalletIcon className="w-4 h-4 mr-2" /> Portofel
                </Button>
            </div>
        </Card>
    );
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
}> = (props) => {
    const { sportivi, setSportivi, grupe, setGrupe, tipuriAbonament, familii, setFamilii, currentUser, plati, setPlati, tranzactii, setTranzactii, onViewSportiv, clubs, grade, permissions, allRoles, setAllRoles, vizualizarePlati } = props;
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
        familii.forEach(f => balances.set(f.id, 0));
        tranzactii.forEach(t => { if (t.familie_id) balances.set(t.familie_id, (balances.get(t.familie_id) || 0) + t.suma); });
        plati.forEach(p => { if (p.familie_id) balances.set(p.familie_id, (balances.get(p.familie_id) || 0) - p.suma); });
        return balances;
    }, [familii, plati, tranzactii]);
    
    const individualBalances = useMemo(() => {
        const balances = new Map<string, number>();
        if (!sportivi || !plati || !tranzactii) return balances;
        sportivi.forEach(s => { if (!s.familie_id) balances.set(s.id, 0); });
        tranzactii.forEach(t => { if (t.sportiv_id && !t.familie_id && balances.has(t.sportiv_id)) balances.set(t.sportiv_id, (balances.get(t.sportiv_id) || 0) + t.suma); });
        plati.forEach(p => { if (p.sportiv_id && !p.familie_id && balances.has(p.sportiv_id)) balances.set(p.sportiv_id, (balances.get(p.sportiv_id) || 0) - p.suma); });
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

     const columns: Column<Sportiv>[] = [
        {
            key: 'nume',
            label: 'Nume Complet',
            tooltip: "Numele complet al sportivului.",
            render: (s) => (
                <div>
                    <div className="font-bold text-white hover:text-brand-primary">{s.nume} {s.prenume} <span className="text-slate-400 font-normal">({getAge(s.data_nasterii)} ani)</span></div>
                </div>
            ),
        },
        { 
            key: 'grad_actual_id', 
            label: 'Grad',
            tooltip: "Gradul actual al sportivului.",
            render: (s) => {
                const gradObj = grade.find(g => g.id === s.grad_actual_id);
                return <GradBadge grad={gradObj} />;
            }
        },
        { 
            key: 'status', 
            label: 'Status',
            tooltip: "Indică dacă sportivul este activ sau inactiv.",
            className: 'hidden md:table-cell',
            render: (s) => (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === 'Activ' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {s.status}
                </span>
            )
        },
        { key: 'grupa_id', label: 'Grupă', tooltip: "Grupa de antrenament.", render: (s) => grupe.find(g => g.id === s.grupa_id)?.denumire || '-', className: 'hidden md:table-cell' },
        {
            key: 'actions',
            label: 'Acțiuni',
            tooltip: "Acțiuni rapide: gestionează portofelul, setările contului sau șterge.",
            headerClassName: 'text-right',
            cellClassName: 'text-right',
            render: (s) => (
                <div className="flex justify-end items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="secondary" onClick={() => { setSportivToEdit(s); setIsFormModalOpen(true); }} title="Editează Profil" className="!p-2">
                        <EditIcon className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="info" onClick={() => handleOpenWallet(s)} title="Portofel Sportiv" className="!p-2 flex items-center gap-1">
                        <WalletIcon className="w-4 h-4" />
                        <span className="hidden lg:inline text-xs font-bold">Portofel</span>
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setAccountSettingsSportiv(s)} title="Setări Cont de Acces" className="!p-2">
                        <ShieldCheckIcon className="w-4 h-4" />
                    </Button>
                     <Button size="sm" variant="danger" onClick={() => setSportivToDelete(s)} title="Șterge Sportiv" className="!p-2">
                        <TrashIcon className="w-4 h-4" />
                    </Button>
                </div>
            )
        }
    ];

    const handleSave = async (formData: Partial<Sportiv>): Promise<{ success: boolean; error?: any; data?: Sportiv; }> => {
        try {
            if (sportivToEdit) {
                const { roluri, cluburi, ...sportivData } = formData;
                const { data, error } = await supabase.from('sportivi').update(sportivData).eq('id', sportivToEdit.id).select('*, cluburi(*), utilizator_roluri_multicont(rol_denumire)').maybeSingle();
                if (error) throw error;
                if (!data) throw new Error("Nu s-au putut prelua datele actualizate. Verificați permisiunile.");
    
                const updatedRoles = (data.utilizator_roluri_multicont || []).map((r: any) => allRoles.find(role => role.nume === r.rol_denumire)).filter(Boolean);
                const updatedSportiv = { ...data, roluri: updatedRoles };
                delete (updatedSportiv as any).utilizator_roluri_multicont;
    
                setSportivi(prev => prev.map(s => s.id === sportivToEdit.id ? updatedSportiv : s));
                showSuccess('Succes', 'Sportiv actualizat!');
                return { success: true, data: updatedSportiv };
            } else {
                const { email, parola, roluri, cluburi, ...profileData } = formData;
                if (!email || !parola) throw new Error("Emailul și parola sunt obligatorii pentru crearea unui cont nou.");
                if (!profileData.club_id) { profileData.club_id = currentUser?.club_id; }
                if (!profileData.club_id) throw new Error("Clubul este obligatoriu la adăugarea unui sportiv nou.");

                const { data: authData, error: authError } = await supabase.functions.invoke('create-user-admin', {
                    body: { email, password: parola }
                });
                if (authError || authData.error) throw new Error(authError?.message || authData.error);
                
                const user = authData.user;
                if (!user) throw new Error("Nu s-a putut crea contul de autentificare.");

                const finalProfileData = { ...profileData, user_id: user.id, email, status_viza_medicala: 'Expirat' as const };
                
                let newProfile;
                try {
                    const { data, error: profileError } = await supabase.from('sportivi').insert(finalProfileData).select('*, cluburi(*)').maybeSingle();
                    if (profileError) throw profileError;
                    if (!data) throw new Error("Profilul a fost creat, dar nu a putut fi recuperat. Verificați permisiunile.");
                    newProfile = data;
                } catch (profileError: any) {
                    await supabase.functions.invoke('delete-user-admin', { body: { user_id: user.id } });
                    throw profileError;
                }

                const sportivRole = allRoles.find(r => r.nume === 'SPORTIV');
                if (!sportivRole) throw new Error("Rolul de bază 'SPORTIV' nu a fost găsit.");

                const { error: roleError } = await supabase.from('utilizator_roluri_multicont').insert({ user_id: user.id, rol_denumire: 'SPORTIV', club_id: newProfile.club_id, sportiv_id: newProfile.id, is_primary: true });
                if (roleError) throw new Error(`Profilul a fost creat, dar rolul nu a putut fi atribuit: ${roleError.message}`);

                const newSportiv = { ...newProfile, roluri: [sportivRole] };
                setSportivi(prev => [...prev, newSportiv]);
                showSuccess('Succes', 'Sportivul a fost adăugat cu succes.');
                return { success: true, data: newSportiv };
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
            const { data: authData, error: authError } = await supabase.functions.invoke('create-user-admin', {
                body: { email: createAccountForm.email, password: createAccountForm.parola },
            });
    
            if (authError || authData.error) {
                const errorMessage = authError?.message || authData.error;
                if (String(errorMessage).includes('User already exists')) {
                     throw new Error('Un utilizator cu acest email există deja. Asociați-l manual dacă este necesar.');
                }
                throw new Error(errorMessage || 'A apărut o eroare la crearea contului.');
            }
    
            const authUser = authData.user;
            if (!authUser) throw new Error("Nu s-a putut crea contul de autentificare. Răspunsul de la server a fost gol.");
    
            const profileUpdates = { user_id: authUser.id, email: createAccountForm.email, username: createAccountForm.username };
            const { data, error } = await supabase.from('sportivi').update(profileUpdates).eq('id', sportivForAccountCreation.id).select('*, cluburi(*)').maybeSingle();
    
            if (error) throw new Error(`Cont Auth creat, dar eroare la legarea profilului: ${error.message}.`);
            if (!data) throw new Error(`Cont Auth creat, dar profilul nu a putut fi recuperat după legare. Verificați permisiunile.`);
            
            const { error: roleError } = await supabase.from('utilizator_roluri_multicont').insert({
                user_id: authUser.id,
                sportiv_id: sportivForAccountCreation.id,
                club_id: sportivForAccountCreation.club_id,
                rol_denumire: 'Sportiv',
                is_primary: true
            });
            if (roleError) throw new Error(`Profil legat, dar eroare la asignarea rolului 'Sportiv': ${roleError.message}`);
    
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

            <Card className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-1">
                     <div className="relative w-full">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                            label=""
                            type="text"
                            value={filters.searchTerm}
                            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                            placeholder="Caută sportiv..."
                            className="!pl-10"
                        />
                    </div>
                </div>
                <Select label="Status" value={filters.statusFilter} onChange={e => handleFilterChange('statusFilter', e.target.value)}>
                    <option value="Activ">Activi</option>
                    <option value="Inactiv">Inactivi</option>
                    <option value="">Toți</option>
                </Select>
                <Select label="Grupă" value={filters.grupaFilter} onChange={e => handleFilterChange('grupaFilter', e.target.value)}>
                    <option value="">Toate grupele</option>
                    {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                </Select>
                 <Select label="Grad" value={filters.gradFilter} onChange={e => handleFilterChange('gradFilter', e.target.value)}>
                    <option value="">Toate gradele</option>
                    <option value="null">Începător (fără grad)</option>
                    {grade.sort((a,b) => a.ordine - b.ordine).map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}
                </Select>
                 <Select label="Rol" value={filters.rolFilter} onChange={e => handleFilterChange('rolFilter', e.target.value)}>
                    <option value="">Toate rolurile</option>
                    {allRoles.map(r => <option key={r.id} value={r.id}>{r.nume}</option>)}
                </Select>
            </Card>

            {isMobile ? (
                <div className="space-y-3">
                    {sortedAndFilteredSportivi.map(s => (
                        <SportivCardMobile
                            key={s.id}
                            sportiv={s}
                            onRowClick={handleRowClick}
                            onOpenWallet={handleOpenWallet}
                            familie={familii.find(f => f.id === s.familie_id)}
                            familyBalance={familyBalances.get(s.familie_id!)}
                            individualBalance={individualBalances.get(s.id)}
                            grupa={grupe.find(g => g.id === s.grupa_id)}
                            grade={grade}
                        />
                    ))}
                </div>
            ) : (
                <ResponsiveTable
                    columns={columns}
                    data={sortedAndFilteredSportivi}
                    onRowClick={handleRowClick}
                    selectedRowId={selectedSportivForHighlight?.id}
                    rowClassName={(sportiv) => !sportiv.user_id ? 'bg-red-900/20 hover:bg-red-900/40 !border-l-2 !border-red-500' : ''}
                    onSort={requestSort}
                    sortConfig={sortConfig || undefined}
                />
            )}

            {isFormModalOpen && (
                 <SportivFormModal 
                    isOpen={isFormModalOpen}
                    onClose={() => setIsFormModalOpen(false)}
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
                />
            )}

            <SportivAccountSettingsModal
                isOpen={!!accountSettingsSportiv}
                onClose={() => setAccountSettingsSportiv(null)}
                sportiv={accountSettingsSportiv}
                setSportivi={setSportivi}
                allRoles={allRoles}
                currentUser={currentUser}
                onOpenCreateAccount={(user) => {
                    setSportivForAccountCreation(user);
                    const sanitize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
                    const emailPrefix = `${sanitize(user.nume)}.${sanitize(user.prenume)}`;
                    setCreateAccountForm({ email: user.email || `${emailPrefix}@phihau.ro`, username: user.username || emailPrefix, parola: 'Parola123!' });
                    setCreateAccountError('');
                }}
            />

            {sportivForAccountCreation && (
                <Modal isOpen={!!sportivForAccountCreation} onClose={() => setSportivForAccountCreation(null)} title={`Creează Cont pentru ${sportivForAccountCreation.nume}`}>
                    <form onSubmit={handleCreateAccount} className="space-y-4">
                        <Input label="Email (Login)" name="email" type="email" value={createAccountForm.email} onChange={handleCreateAccountFormChange} required />
                        <Input label="Parolă Inițială" name="parola" type="password" value={createAccountForm.parola} onChange={handleCreateAccountFormChange} required />
                        {createAccountError && <p className="text-red-400 text-sm text-center bg-red-900/50 p-2 rounded">{createAccountError}</p>}
                        <div className="flex justify-end pt-4 space-x-2">
                            <Button type="button" variant="secondary" onClick={() => setSportivForAccountCreation(null)} disabled={createAccountLoading}>Anulează</Button>
                            <Button type="submit" variant="success" disabled={createAccountLoading} isLoading={createAccountLoading}>Creează Cont</Button>
                        </div>
                    </form>
                </Modal>
            )}


            {isWalletModalOpen && sportivForWallet && (
                <SportivWallet
                    sportiv={sportivForWallet}
                    familie={familii.find(f => f.id === sportivForWallet.familie_id)}
                    allSportivi={sportivi}
                    vizualizarePlati={vizualizarePlati}
                    allPlati={plati}
                    setPlati={setPlati}
                    setTranzactii={setTranzactii}
                    onClose={() => {
                        setIsWalletModalOpen(false);
                        setSportivForWallet(null);
                    }}
                />
            )}
            
            {sportivToDelete && (
                <DeleteAuditModal
                    isOpen={!!sportivToDelete}
                    onClose={() => setSportivToDelete(null)}
                    sportiv={sportivToDelete}
                    onDeactivate={handleDeactivate}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
};