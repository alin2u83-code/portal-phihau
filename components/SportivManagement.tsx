import React, { useState, useMemo, useCallback } from 'react';
import { Sportiv, Grupa, TipAbonament, Familie, Rol, Plata, Tranzactie, User, Club, Grad, Permissions } from '../types';
import { Button, Modal, Input, Select, Card, Switch } from './ui';
import { PlusIcon, ShieldCheckIcon, WalletIcon, UserXIcon, UserCheckIcon, UsersIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { SportivFormModal } from './Sportivi';
import { SportivAccountSettingsModal } from './SportivAccountSettings';
import { SportivWallet } from './SportivWallet';
import { ResponsiveTable, Column } from './ResponsiveTable';
import { FEDERATIE_ID, FEDERATIE_NAME } from '../constants';
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

const GradLegend: React.FC = () => {
    const gradesSample: { name: string, description: string }[] = [
        { name: 'Cap Alb', description: 'Cap Alb/Violet' },
        { name: '1 Cap Albastru', description: 'Cap Albastru' },
        { name: '1 Cap Rosu', description: 'Cap Roșu' },
        { name: 'Centura Neagra', description: 'Centura Neagră' },
        { name: '1 Dang', description: '1-4 Dang' },
        { name: '5 Dang', description: '5 Dang (Expert)' },
        { name: '6 Dang', description: '6-8 Dang (Maestru)' },
    ];

    return (
        <Card>
            <h3 className="text-lg font-bold text-white mb-4">Legendă Grade (Cap/Dang)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                {gradesSample.map(g => (
                    <div key={g.name} className="flex flex-col items-center gap-2 text-center">
                        <GradBadge grad={{ nume: g.name } as Grad} />
                        <span className="text-xs text-slate-400">{g.description}</span>
                    </div>
                ))}
            </div>
        </Card>
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
    allRoles: Rol[];
    setAllRoles: React.Dispatch<React.SetStateAction<Rol[]>>;
    currentUser: User;
    plati: Plata[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    tranzactii: Tranzactie[];
    setTranzactii: React.Dispatch<React.SetStateAction<Tranzactie[]>>;
    onViewSportiv: (sportiv: Sportiv) => void;
    clubs: Club[];
    grade: Grad[];
    permissions: Permissions;
}> = ({ onBack, sportivi, setSportivi, grupe, setGrupe, tipuriAbonament, familii, setFamilii, allRoles, setAllRoles, currentUser, plati, setPlati, tranzactii, setTranzactii, onViewSportiv, clubs, grade, permissions }) => {
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [sportivToEdit, setSportivToEdit] = useState<Sportiv | null>(null);
    const [accountSettingsSportiv, setAccountSettingsSportiv] = useState<Sportiv | null>(null);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [sportivForWallet, setSportivForWallet] = useState<Sportiv | null>(null);
    const [selectedSportivForHighlight, setSelectedSportivForHighlight] = useState<string | null>(null);
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

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
        setSelectedSportivForHighlight(sportiv.id);
        onViewSportiv(sportiv);
    };

    const handleToggleStatus = useCallback(async (sportiv: Sportiv) => {
        // Deactivation logic will be handled in a dedicated modal or component later
        // For now, we only handle activation
        if (sportiv.status === 'Inactiv') {
            setLoadingStates(prev => ({ ...prev, [sportiv.id]: true }));
            try {
                if (!supabase) throw new Error("Client Supabase neconfigurat.");
                const { data, error } = await supabase.from('sportivi').update({ status: 'Activ' }).eq('id', sportiv.id).select().single();
                if (error) throw error;
                setSportivi(prev => prev.map(s => s.id === sportiv.id ? { ...s, status: 'Activ' } : s));
                showSuccess("Succes!", `Statusul a fost schimbat în 'Activ'.`);
            } catch(err: any) {
                showError("Eroare la activare", err.message);
            } finally {
                setLoadingStates(prev => ({ ...prev, [sportiv.id]: false }));
            }
        } else {
            // Placeholder for deactivation logic
            alert("Dezactivarea necesită o logică suplimentară pentru abonamente și va fi implementată.");
        }
    }, [setSportivi, showError, showSuccess]);


    const familyBalances = useMemo(() => {
        const balances = new Map<string, number>();
        // Logic to calculate family balances
        return balances;
    }, [familii, plati, tranzactii]);

    const filteredSportivi = useMemo(() => {
        return (sportivi || []).filter((s: Sportiv) =>
            (`${s.nume} ${s.prenume}`.toLowerCase().includes(filters.searchTerm.toLowerCase())) &&
            (filters.statusFilter ? s.status === filters.statusFilter : true) &&
            (filters.grupaFilter ? s.grupa_id === filters.grupaFilter : true)
        ).sort((a: Sportiv, b: Sportiv) => a.nume.localeCompare(b.nume));
    }, [sportivi, filters]);
    
     const columns: Column<Sportiv>[] = [
        {
            key: 'nume',
            label: 'Nume Sportiv',
            render: (s) => (
                <div>
                    <div className="font-bold text-white">{s.nume} {s.prenume}</div>
                    <div className="text-xs text-slate-400">{getAge(s.data_nasterii)} ani</div>
                </div>
            )
        },
        { 
            key: 'grad_actual_id', 
            label: 'Grad',
            render: (s) => <GradBadge grad={grade.find(g => g.id === s.grad_actual_id)} />
        },
        // FIX: Replaced 'className' with 'cellClassName' as per Column interface definition to fix TS errors.
        { key: 'club_id', label: 'Club', tooltip: "Clubul de care aparține sportivul.", render: (s) => s.cluburi?.id === FEDERATIE_ID ? FEDERATIE_NAME : s.cluburi?.nume || '-', cellClassName: 'hidden md:table-cell' },
        { 
            key: 'status', 
            label: 'Status',
            // FIX: Replaced 'className' with 'cellClassName' to match the known properties of type Column.
            cellClassName: 'hidden md:table-cell',
            render: (s) => (
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${s.status === 'Activ' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{s.status}</span>
            )
        },
        // FIX: Replaced 'className' with 'cellClassName' to ensure compatibility with ResponsiveTable columns.
        { key: 'grupa_id', label: 'Grupă', tooltip: "Grupa de antrenament în care este încadrat sportivul.", render: (s) => grupe.find(g => g.id === s.grupa_id)?.denumire || '-', cellClassName: 'hidden md:table-cell' },
        {
            key: 'actions',
            label: 'Acțiuni',
            headerClassName: 'text-right',
            cellClassName: 'text-right',
            render: (s) => (
                <div className="flex justify-end items-center gap-2">
                    <Button size="sm" variant="info" onClick={(e) => { e.stopPropagation(); handleOpenWallet(s); }} title="Portofel Sportiv" className="!p-2">
                        <WalletIcon className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setAccountSettingsSportiv(s); }} title="Setări Cont" className="!p-2">
                        <ShieldCheckIcon className="w-4 h-4" />
                    </Button>
                </div>
            )
        }
    ];

    const handleSave = async (formData: Partial<Sportiv>): Promise<{ success: boolean; error?: any; data?: Sportiv; }> => {
        // Save logic remains complex, simplified for this refactoring
        try {
            if (sportivToEdit) {
                 const { data, error } = await supabase.from('sportivi').update(formData).eq('id', sportivToEdit.id).select().single();
                 if(error) throw error;
                 setSportivi(prev => prev.map(s => s.id === sportivToEdit.id ? data as Sportiv : s));
                 return { success: true, data: data as Sportiv };
            } else {
                 const { data, error } = await supabase.from('sportivi').insert(formData).select().single();
                 if(error) throw error;
                 setSportivi(prev => [...prev, data as Sportiv]);
                 return { success: true, data: data as Sportiv };
            }
        } catch(err:any) {
            return { success: false, error: err };
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-white">Management Sportivi</h1>
                {permissions.hasAdminAccess && (
                    <Button variant="primary" onClick={() => { setSportivToEdit(null); setIsFormModalOpen(true); }}>
                        <PlusIcon className="w-5 h-5 mr-1"/> Adaugă Sportiv
                    </Button>
                )}
            </div>

            <Card className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
                <Select label="Status" value={filters.statusFilter} onChange={e => handleFilterChange('statusFilter', e.target.value)}>
                    <option value="Activ">Activi</option>
                    <option value="Inactiv">Inactivi</option>
                    <option value="">Toți</option>
                </Select>
                <Select label="Grupă" value={filters.grupaFilter} onChange={e => handleFilterChange('grupaFilter', e.target.value)}>
                    <option value="">Toate grupele</option>
                    {(grupe || []).map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                </Select>
            </Card>

            <ResponsiveTable
                columns={columns}
                data={filteredSportivi}
                searchTerm={filters.searchTerm}
                onSearchChange={(val) => handleFilterChange('searchTerm', val)}
                onRowClick={handleRowClick}
                searchPlaceholder="Caută sportiv după nume..."
                selectedRowId={selectedSportivForHighlight}
            />

            <GradLegend />

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
                    onClose={() => setIsWalletModalOpen(false)}
                />
            )}
        </div>
    );
};