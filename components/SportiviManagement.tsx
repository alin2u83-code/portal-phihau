import React, { useState, useMemo, useCallback } from 'react';
import { Sportiv, Grupa, TipAbonament, Familie, Rol, Plata, Tranzactie, User, Club, Grad, Permissions } from '../types';
import { Button, Modal, Input, Select, Card, RoleBadge } from './ui';
// FIX: Removed unused ShieldCheckIcon
import { PlusIcon, ArrowLeftIcon, WalletIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { SportivFormModal } from './Sportivi';
import { SportivWallet } from './SportivWallet';
import { ResponsiveTable, Column } from './ResponsiveTable';
import { FEDERATIE_ID, FEDERATIE_NAME } from '../constants';

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

// --- NOU: Componentă pentru vizualizarea familiei ---
const FamilyView: React.FC<{
    currentUser: User;
    sportivi: Sportiv[];
    plati: Plata[];
    tranzactii: Tranzactie[];
    familii: Familie[];
    grade: Grad[];
    onViewSportiv: (sportiv: Sportiv) => void;
}> = ({ currentUser, sportivi, plati, tranzactii, familii, grade, onViewSportiv }) => {
    
    const familyMembers = useMemo(() => {
        if (!currentUser?.familie_id) return [currentUser];
        return sportivi.filter(s => s.familie_id === currentUser.familie_id);
    }, [currentUser, sportivi]);

    const familyInfo = useMemo(() => {
        if (!currentUser?.familie_id) return null;
        return familii.find(f => f.id === currentUser.familie_id);
    }, [currentUser, familii]);

    const { familyBalance, lastPaymentDate } = useMemo(() => {
        const familyId = currentUser?.familie_id;
        if (!familyId) return { familyBalance: 0, lastPaymentDate: null };

        const relevantPlati = (plati || []).filter(p => p.familie_id === familyId);
        const relevantTranzactii = (tranzactii || []).filter(t => t.familie_id === familyId);

        const totalDatorii = relevantPlati.reduce((sum, p) => sum + p.suma, 0);
        const totalIncasari = relevantTranzactii.reduce((sum, t) => sum + t.suma, 0);
        
        const lastPayment = [...relevantTranzactii].sort((a,b) => new Date(b.data_platii).getTime() - new Date(a.data_platii).getTime())[0];

        return {
            familyBalance: totalIncasari - totalDatorii,
            lastPaymentDate: lastPayment ? new Date(lastPayment.data_platii).toLocaleDateString('ro-RO') : null,
        };
    }, [currentUser, plati, tranzactii]);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Portalul Familiei {familyInfo?.nume || currentUser.nume}</h1>
            <Card className="border-l-4 border-brand-secondary">
                <h2 className="text-lg font-bold text-slate-300 mb-2">Situație Financiară</h2>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <p className="text-sm text-slate-400">Sold Curent</p>
                        <p className={`text-4xl font-black ${familyBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{familyBalance.toFixed(2)} RON</p>
                    </div>
                    {lastPaymentDate && (
                        <div className="text-right">
                            <p className="text-sm text-slate-400">Ultima Plată</p>
                            <p className="text-lg font-bold text-white">{lastPaymentDate}</p>
                        </div>
                    )}
                </div>
            </Card>

            <Card>
                <h2 className="text-lg font-bold text-white mb-4">Membrii Familiei</h2>
                <div className="space-y-3">
                    {familyMembers.map(member => {
                        const grad = grade.find(g => g.id === member.grad_actual_id);
                        return (
                            <div key={member.id} className="bg-slate-700/50 p-3 rounded-md flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-white">{member.nume} {member.prenume}</p>
                                    <p className="text-sm text-slate-400">{grad?.nume || 'Începător'} - {getAge(member.data_nasterii)} ani</p>
                                </div>
                                <Button size="sm" variant="info" onClick={() => onViewSportiv(member)}>Detalii</Button>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
};


// --- Componenta Management Principală ---
export const SportiviManagement: React.FC<{
    onBack: () => void;
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
}> = (props) => {
    const { onBack, sportivi, setSportivi, grupe, setGrupe, tipuriAbonament, familii, setFamilii, currentUser, plati, setPlati, tranzactii, setTranzactii, onViewSportiv, clubs, grade, permissions, allRoles, setAllRoles } = props;
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [sportivToEdit, setSportivToEdit] = useState<Sportiv | null>(null);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [sportivForWallet, setSportivForWallet] = useState<Sportiv | null>(null);
    const [selectedSportivForHighlight, setSelectedSportivForHighlight] = useState<Sportiv | null>(null);

    const { showError, showSuccess } = useError();
    
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
    
    const handleOpenWallet = (sportiv: Sportiv) => {
        setSportivForWallet(sportiv);
        setIsWalletModalOpen(true);
    };

    const handleRowClick = (sportiv: Sportiv) => {
        setSelectedSportivForHighlight(sportiv);
        onViewSportiv(sportiv);
    };

    const familyBalances = useMemo(() => {
        const balances = new Map<string, number>();
        if (!familii || !plati || !tranzactii) return balances;
        familii.forEach(f => balances.set(f.id, 0));
        tranzactii.forEach(t => { if (t.familie_id) balances.set(t.familie_id, (balances.get(t.familie_id) || 0) + t.suma); });
        plati.forEach(p => { if (p.familie_id) balances.set(p.familie_id, (balances.get(p.familie_id) || 0) - p.suma); });
        return balances;
    }, [familii, plati, tranzactii]);
    
    const { individualBalances, lastIndividualTransactions } = useMemo(() => {
        const balances = new Map<string, number>();
        const lastTx = new Map<string, string>();

        if (!sportivi || !plati || !tranzactii) {
            return { individualBalances: balances, lastIndividualTransactions: lastTx };
        }

        sportivi.forEach(s => {
            if (!s.familie_id) {
                balances.set(s.id, 0);
            }
        });

        tranzactii.forEach(t => {
            if (t.sportiv_id && !t.familie_id && balances.has(t.sportiv_id)) {
                balances.set(t.sportiv_id, (balances.get(t.sportiv_id) || 0) + t.suma);
                const existingDate = lastTx.get(t.sportiv_id);
                if (!existingDate || new Date(t.data_platii) > new Date(existingDate)) {
                    lastTx.set(t.sportiv_id, t.data_platii);
                }
            }
        });

        plati.forEach(p => {
            if (p.sportiv_id && !p.familie_id && balances.has(p.sportiv_id)) {
                balances.set(p.sportiv_id, (balances.get(p.sportiv_id) || 0) - p.suma);
            }
        });

        return { individualBalances: balances, lastIndividualTransactions: lastTx };
    }, [sportivi, plati, tranzactii]);

    const filteredSportivi = useMemo(() => {
        return (sportivi || []).filter((s: Sportiv) =>
            (`${s.nume} ${s.prenume}`.toLowerCase().includes(filters.searchTerm.toLowerCase())) &&
            (filters.statusFilter ? s.status === filters.statusFilter : true) &&
            (filters.grupaFilter ? s.grupa_id === filters.grupaFilter : true) &&
            (filters.rolFilter ? (s.roluri || []).some(r => r.id === filters.rolFilter) : true) &&
            (filters.gradFilter ? (filters.gradFilter === 'null' ? !s.grad_actual_id : s.grad_actual_id === filters.gradFilter) : true)
        ).sort((a: Sportiv, b: Sportiv) => a.nume.localeCompare(b.nume));
    }, [sportivi, filters]);
    
     const columns: Column<Sportiv>[] = [
        {
            key: 'nume',
            label: 'Nume Complet',
            tooltip: "Numele complet al sportivului. Dacă face parte dintr-o familie, este afișat și soldul familiei.",
            render: (s) => {
                const familie = s.familie_id ? familii.find(f => f.id === s.familie_id) : null;
                const familieBalance = s.familie_id ? familyBalances.get(s.familie_id) : undefined;
                return (
                    <div>
                        <div className="font-bold text-white hover:text-brand-primary">{s.nume} {s.prenume} <span className="text-slate-400 font-normal">({getAge(s.data_nasterii)} ani)</span></div>
                        {familie && familieBalance !== undefined && (
                            <div className="text-xs text-slate-300 mt-1">
                                Familia {familie.nume}
                                <span className={`ml-2 font-bold ${familieBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    Sold: {familieBalance >= 0 ? '+' : ''}{familieBalance.toFixed(2)} lei
                                </span>
                            </div>
                        )}
                    </div>
                );
            },
        },
        { key: 'club_id', label: 'Club', tooltip: "Clubul de care aparține sportivul.", render: (s) => s.cluburi?.id === FEDERATIE_ID ? FEDERATIE_NAME : s.cluburi?.nume || '-', className: 'hidden md:table-cell' },
        { 
            key: 'roluri', 
            label: 'Roluri', 
            tooltip: "Rolurile de acces ale utilizatorului în aplicație.",
            render: (s) => (
                <div className="flex flex-wrap gap-1">
                    {(s.roluri || []).length > 0 
                        ? (s.roluri || []).map(r => <RoleBadge key={r.id} role={r}/>)
                        : <span className="text-slate-500 italic">N/A</span>
                    }
                </div>
            )
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
        { key: 'grupa_id', label: 'Grupă', tooltip: "Grupa de antrenament în care este încadrat sportivul.", render: (s) => grupe.find(g => g.id === s.grupa_id)?.denumire || '-', className: 'hidden md:table-cell' },
        {
            key: 'situatie_financiara' as any,
            label: 'Situație Financiară',
            tooltip: "Soldul individual al sportivului. Se aplică doar sportivilor neasociați unei familii.",
            render: (s) => {
                if (s.familie_id) {
                    return <span className="text-slate-500 italic text-xs">În familie</span>;
                }
                const balance = individualBalances.get(s.id);
                if (balance === undefined) return <span className="text-slate-500 italic text-xs">Acces limitat</span>;

                const lastTxDate = lastIndividualTransactions.get(s.id);
                let hasRecentPayment = false;
                if (lastTxDate) {
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    if (new Date(lastTxDate) >= thirtyDaysAgo) {
                        hasRecentPayment = true;
                    }
                }
                
                const isRestanta = balance < 0 && !hasRecentPayment;

                return (
                    <div className="flex flex-col items-end">
                        <span className={`font-bold text-sm ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {balance.toFixed(2)} lei
                        </span>
                        {isRestanta && (
                             <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-600/30 text-amber-400 mt-1">
                                Restanță
                            </span>
                        )}
                    </div>
                );
            },
            cellClassName: 'text-right',
            headerClassName: 'text-right'
        },
        {
            key: 'actions',
            label: 'Acțiuni',
            tooltip: "Acțiuni rapide: gestionează portofelul sportivului.",
            headerClassName: 'text-right',
            cellClassName: 'text-right',
            render: (s) => (
                <div className="flex justify-end items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="info" onClick={() => handleOpenWallet(s)} title="Portofel Sportiv" className="!p-2">
                        <WalletIcon className="w-4 h-4" />
                    </Button>
                </div>
            )
        }
    ];

    const handleSave = async (formData: Partial<Sportiv>): Promise<{ success: boolean; error?: any; data?: Sportiv; }> => {
        const { roluri, ...sportivData } = formData;
        try {
            if (sportivToEdit) {
                // UPDATE logic
                const { data, error } = await supabase.from('sportivi').update(sportivData).eq('id', sportivToEdit.id).select('*, cluburi(*), roles:utilizator_roluri_multicont(rol_denumire)').single();
                if (error) throw error;
    
                const updatedRoles = (data.roles || []).map((r: any) => allRoles.find(role => role.nume === r.rol_denumire)).filter(Boolean);
                const updatedSportiv = { ...data, roluri: updatedRoles };
                delete (updatedSportiv as any).roles;
    
                setSportivi(prev => prev.map(s => s.id === sportivToEdit.id ? updatedSportiv : s));
                showSuccess('Succes', 'Sportiv actualizat!');
                return { success: true, data: updatedSportiv };
            } else {
                // CREATE logic
                const { email, parola, ...profileData } = sportivData;

                if (!email || !parola) {
                    throw new Error("Emailul și parola sunt obligatorii pentru crearea unui cont nou.");
                }

                const { data: authData, error: authError } = await supabase.functions.invoke('create-user-admin', {
                    body: { email, password: parola },
                });

                if (authError || authData.error) {
                    const errorMessage = authError?.message || authData?.error;
                    if (String(errorMessage).includes('User already exists')) {
                         throw new Error(`Un utilizator cu email-ul ${email} există deja. Folosiți panoul de administrare staff pentru a asocia contul.`);
                    }
                    throw new Error(errorMessage || 'A apărut o eroare la crearea contului de autentificare.');
                }

                const newAuthUser = authData.user;
                if (!newAuthUser || !newAuthUser.id) {
                    throw new Error('Funcția de creare a utilizatorului nu a returnat un ID valid.');
                }

                const { data: newSportivData, error: profileError } = await supabase
                    .from('sportivi')
                    .insert({
                        ...profileData,
                        user_id: newAuthUser.id,
                        email: email,
                        trebuie_schimbata_parola: true
                    })
                    .select('*, cluburi(*)')
                    .single();

                if (profileError) {
                    throw new Error(`Contul de autentificare a fost creat, dar profilul nu. Ștergeți manual utilizatorul Auth (${email}) și reîncercați. Eroare: ${profileError.message}`);
                }

                const sportivRole = allRoles.find(r => r.nume === 'Sportiv');
                let finalRoles: Rol[] = [];
                if (sportivRole) {
                    const { error: roleError } = await supabase.from('utilizator_roluri_multicont').insert({
                        user_id: newAuthUser.id,
                        rol_denumire: 'Sportiv',
                        club_id: newSportivData.club_id,
                        sportiv_id: newSportivData.id,
                        is_primary: true
                    });
                    if (roleError) {
                         showError("Avertisment Rol", `Profilul a fost creat, dar rolul 'Sportiv' nu a putut fi atribuit. Eroare: ${roleError.message}`);
                    } else {
                        finalRoles = [sportivRole];
                    }
                }

                const finalSportivObject: Sportiv = { ...newSportivData, roluri: finalRoles };
                setSportivi(prev => [...prev, finalSportivObject]);
                showSuccess('Succes', 'Sportiv adăugat și cont de acces creat!');
                return { success: true, data: finalSportivObject };
            }
        } catch (err: any) {
            showError("Eroare la Salvare", err.message);
            return { success: false, error: err };
        }
    };

    if (permissions?.isSportiv && !permissions.hasAdminAccess) {
        return <FamilyView {...props} />;
    }

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary" className="mb-2"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
            
            <div className="flex justify-between items-center gap-4">
                <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Management Sportivi</h1>
                {permissions.hasAdminAccess && (
                    <Button variant="primary" onClick={() => { setSportivToEdit(null); setIsFormModalOpen(true); }}>
                        <PlusIcon className="w-5 h-5 mr-1"/> Adaugă Sportiv
                    </Button>
                )}
            </div>

            <Card className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

            <div className="text-slate-900">
                <ResponsiveTable
                    columns={columns}
                    data={filteredSportivi}
                    searchTerm={filters.searchTerm}
                    onSearchChange={(val) => handleFilterChange('searchTerm', val)}
                    onRowClick={handleRowClick}
                    searchPlaceholder="Caută sportiv după nume..."
                    selectedRowId={selectedSportivForHighlight?.id}
                    rowClassName={(sportiv) => !sportiv.user_id ? 'bg-red-900/20 hover:bg-red-900/40 !border-l-2 !border-red-500' : ''}
                />
            </div>

            {isFormModalOpen && (
                 <SportivFormModal 
                    isOpen={isFormModalOpen}
                    onClose={(savedSportiv?: Sportiv) => {
                        setIsFormModalOpen(false);
                        if (savedSportiv && !sportivToEdit) {
                            onViewSportiv(savedSportiv);
                        }
                    }}
                    onSave={handleSave}
                    sportivToEdit={sportivToEdit}
                    grupe={grupe}
                    setGrupe={setGrupe}
                    familii={familii}
                    setFamilii={setFamilii}
                    tipuriAbonament={tipuriAbonament}
                    clubs={clubs}
                    currentUser={currentUser}
                />
            )}

            {isWalletModalOpen && sportivForWallet && (
                <SportivWallet
                    sportiv={sportivForWallet}
                    familie={familii.find(f => f.id === sportivForWallet.familie_id)}
                    allPlati={plati}
                    setPlati={setPlati}
                    allTranzactii={tranzactii}
                    setTranzactii={setTranzactii}
                    onClose={() => {
                        setIsWalletModalOpen(false);
                        setSportivForWallet(null);
                    }}
                />
            )}
        </div>
    );
};