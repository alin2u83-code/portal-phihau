import React, { useState, useMemo, useCallback } from 'react';
import { Sportiv, Grupa, TipAbonament, Familie, Rol, Plata, Tranzactie, User, Club, Grad, Permissions } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
// FIX: Added missing ShieldCheckIcon import
import { PlusIcon, ArrowLeftIcon, WalletIcon, UserXIcon, UserCheckIcon, ShieldCheckIcon } from './icons';
import { supabase } from './supabaseClient';
import { useError } from './ErrorProvider';
import { useLocalStorage } from './hooks/useLocalStorage';
import { SportivFormModal } from './Sportivi';
import { SportivWallet } from './SportivWallet';
import { ResponsiveTable, Column } from './ResponsiveTable';
import { FEDERATIE_ID, FEDERATIE_NAME } from '../constants';
// FIX: Added missing SportivAccountSettingsModal import
import { SportivAccountSettingsModal } from './SportivAccountSettingsModal';

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

const RoleBadge: React.FC<{ role: Rol }> = ({ role }) => {
    // FIX: Corrected key from 'Super Admin' to 'SUPER_ADMIN_FEDERATIE' to match the 'Rol' type definition.
    // FIX: Completed the color mapping to include all roles.
    // FIX: Corrected object keys to match the exact string literals in the `Rol['nume']` type definition.
    const colorClasses: Record<Rol['nume'], string> = {
        'ADMIN': 'bg-red-600 text-white',
        'SUPER_ADMIN_FEDERATIE': 'bg-red-800 text-white',
        'ADMIN_CLUB': 'bg-blue-600 text-white',
        'INSTRUCTOR': 'bg-sky-600 text-white',
        'SPORTIV': 'bg-slate-600 text-slate-200'
    };
    return <span className={`px-2 py-1 text-[10px] font-semibold rounded-full ${colorClasses[role.nume] || 'bg-gray-500 text-white'}`}>{role.nume}</span>;
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
    allRoles: Rol[];
    setAllRoles: React.Dispatch<React.SetStateAction<Rol[]>>;
    currentUser: User;
    plati: Plata[];
    tranzactii: Tranzactie[];
    setTranzactii: React.Dispatch<React.SetStateAction<Tranzactie[]>>;
    onViewSportiv: (sportiv: Sportiv) => void;
    clubs: Club[];
    grade: Grad[];
    permissions: Permissions;
}> = ({ onBack, sportivi, setSportivi, grupe, setGrupe, tipuriAbonament, familii, setFamilii, allRoles, setAllRoles, currentUser, plati, tranzactii, setTranzactii, onViewSportiv, clubs, grade, permissions }) => {
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [sportivToEdit, setSportivToEdit] = useState<Sportiv | null>(null);
    const [accountSettingsSportiv, setAccountSettingsSportiv] = useState<Sportiv | null>(null);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [sportivForWallet, setSportivForWallet] = useState<Sportiv | null>(null);
    const [selectedSportivForHighlight, setSelectedSportivForHighlight] = useState<Sportiv | null>(null);

    const { showError } = useError();
    
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

    const sortedGrade = useMemo(() => [...grade].sort((a, b) => a.ordine - b.ordine), [grade]);

    const filteredSportivi = useMemo(() => {
        return (sportivi || []).filter((s: Sportiv) =>
            (`${s.nume} ${s.prenume}`.toLowerCase().includes(filters.searchTerm.toLowerCase())) &&
            (filters.statusFilter ? s.status === filters.statusFilter : true) &&
            (filters.grupaFilter ? s.grupa_id === filters.grupaFilter : true) &&
            (filters.rolFilter ? s.roluri.some(r => r.id === filters.rolFilter) : true) &&
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
                    {s.roluri.length > 0 
                        ? s.roluri.map(r => <RoleBadge key={r.id} role={r}/>)
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
            key: 'actions',
            label: 'Acțiuni',
            tooltip: "Acțiuni rapide: gestionează portofelul sau setările contului.",
            headerClassName: 'text-right',
            cellClassName: 'text-right',
            render: (s) => (
                <div className="flex justify-end items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="info" onClick={() => handleOpenWallet(s)} title="Portofel Sportiv" className="!p-2">
                        <WalletIcon className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setAccountSettingsSportiv(s)} title="Setări Cont de Acces" className="!p-2">
                        <ShieldCheckIcon className="w-4 h-4" />
                    </Button>
                </div>
            )
        }
    ];

    const handleSave = async (formData: Partial<Sportiv>) => {
        const { roluri, ...sportivData } = formData;
        try {
            if (sportivToEdit) {
                const { data, error } = await supabase.from('sportivi').update(sportivData).eq('id', sportivToEdit.id).select('*, roluri(id, nume)');
                if (error) throw error;
                const updatedData = data?.[0];
                if (!updatedData) throw new Error('Sportivul nu a fost găsit după actualizare.');
                const updatedSportiv = { ...updatedData, roluri: updatedData.roluri || [] };
                setSportivi(prev => prev.map(s => s.id === sportivToEdit.id ? updatedSportiv : s));
            } else {
                const dataToSave = { ...sportivData };
                if (!dataToSave.familie_id) {
                    const individualSubscription = tipuriAbonament.find(ab => ab.numar_membri === 1);
                    if (individualSubscription) {
                        dataToSave.tip_abonament_id = individualSubscription.id;
                    }
                }

                const { data, error } = await supabase.from('sportivi').insert(dataToSave).select();
                if (error) throw error;
                const insertedData = data?.[0];
                if (!insertedData) throw new Error('Eroare la crearea sportivului.');

                let newSportiv = { ...insertedData, roluri: [] } as Sportiv;
                const sportivRole = allRoles.find(r => r.nume === 'SPORTIV'); // Corrected to match Rol['nume'] type
                if (sportivRole) {
                    const { error: roleError } = await supabase.from('sportivi_roluri').insert({ sportiv_id: insertedData.id, rol_id: sportivRole.id });
                    if (roleError) {
                        showError("Utilizator creat, dar eroare la asignarea rolului", roleError.message);
                    } else {
                        newSportiv.roluri = [sportivRole];
                    }
                }
                setSportivi(prev => [...prev, newSportiv]);
            }
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err };
        }
    };

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
                    {sortedGrade.map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}
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
                    onClose={() => setIsFormModalOpen(false)}
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

            <SportivAccountSettingsModal
                isOpen={!!accountSettingsSportiv}
                onClose={() => setAccountSettingsSportiv(null)}
                sportiv={accountSettingsSportiv}
                setSportivi={setSportivi}
                allRoles={allRoles}
                setAllRoles={setAllRoles}
                currentUser={currentUser}
            />

            {isWalletModalOpen && sportivForWallet && (
                <SportivWallet
                    sportiv={sportivForWallet}
                    familie={familii.find(f => f.id === sportivForWallet.familie_id)}
                    allPlati={plati}
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