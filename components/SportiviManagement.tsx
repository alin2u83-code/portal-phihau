import React, { useState, useMemo } from 'react';
import { Sportiv, Grupa, TipAbonament, Familie, Rol, Plata, Tranzactie, User, Club, Grad, Permissions, VizualizarePlata } from '../types';
import { Button, Input, Select, Card, RoleBadge } from './ui';
import { PlusIcon, WalletIcon, UserXIcon, UserCheckIcon, SearchIcon, ShieldCheckIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { SportivFormModal } from './Sportivi';
import { SportivWallet } from './SportivWallet';
import { ResponsiveTable, Column } from './ResponsiveTable';
import { FEDERATIE_ID, FEDERATIE_NAME } from '../constants';
import { useIsMobile } from '../hooks/useIsMobile';
import { SportivAccountSettingsModal } from './SportivAccountSettings';

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
}> = ({ sportiv, onRowClick, onOpenWallet, familie, familyBalance, individualBalance, grupa }) => {
    return (
        <Card onClick={() => onRowClick(sportiv)} className={`border-l-4 ${sportiv.status === 'Activ' ? 'border-green-500' : 'border-slate-600'}`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold text-white text-lg">{sportiv.nume} {sportiv.prenume}</p>
                    <p className="text-sm text-slate-400">{getAge(sportiv.data_nasterii)} ani - {grupa?.denumire || 'Fără grupă'}</p>
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
        ).sort((a: Sportiv, b: Sportiv) => a.nume.localeCompare(b.nume));
    }, [sportivi, filters]);
    
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

    const handleSave = async (formData: Partial<Sportiv>): Promise<{ success: boolean; error?: any; data?: Sportiv; }> => {
        try {
            if (sportivToEdit) {
                const { roluri, ...sportivData } = formData;
                const { data, error } = await supabase.from('sportivi').update(sportivData).eq('id', sportivToEdit.id).select('*, cluburi(*), roles:utilizator_roluri_multicont(rol_denumire)').single();
                if (error) throw error;
    
                const updatedRoles = (data.roles || []).map((r: any) => allRoles.find(role => role.nume === r.rol_denumire)).filter(Boolean);
                const updatedSportiv = { ...data, roluri: updatedRoles };
                delete (updatedSportiv as any).roles;
    
                setSportivi(prev => prev.map(s => s.id === sportivToEdit.id ? updatedSportiv : s));
                showSuccess('Succes', 'Sportiv actualizat!');
                return { success: true, data: updatedSportiv };
            } else {
                const { email, parola, roluri, ...profileData } = formData;
                if (!email || !parola) throw new Error("Emailul și parola sunt obligatorii pentru crearea unui cont nou.");
                if (!profileData.club_id) throw new Error("Clubul este obligatoriu la adăugarea unui sportiv nou.");
                
                const { data: { user }, error: authError } = await supabase.auth.signUp({ email, password: parola });
                if (authError) throw authError;
                if (!user) throw new Error("Nu s-a putut crea contul de autentificare.");

                const finalProfileData = { ...profileData, user_id: user.id, email, status_viza_medicala: 'Expirat' as const };
                
                let newProfile;
                try {
                    const { data, error: profileError } = await supabase.from('sportivi').insert(finalProfileData).select('*, cluburi(*)').single();
                    if (profileError) throw profileError;
                    newProfile = data;
                } catch (profileError: any) {
                    await supabase.auth.admin.deleteUser(user.id);
                    throw profileError;
                }

                const sportivRole = allRoles.find(r => r.nume === 'Sportiv');
                if (!sportivRole) throw new Error("Rolul de bază 'Sportiv' nu a fost găsit.");

                const { error: roleError } = await supabase.from('utilizator_roluri_multicont').insert({ user_id: user.id, rol_denumire: 'Sportiv', club_id: newProfile.club_id, sportiv_id: newProfile.id, is_primary: true });
                if (roleError) throw new Error(`Profilul a fost creat, dar rolul nu a putut fi atribuit: ${roleError.message}`);

                const newSportiv = { ...newProfile, roluri: [sportivRole] };
                setSportivi(prev => [...prev, newSportiv]);
                showSuccess('Succes', 'Sportivul a fost adăugat cu succes.');
                return { success: true, data: newSportiv };
            }
        } catch (err: any) {
            showError("Eroare la Salvare", err.message);
            return { success: false, error: err };
        }
    };

    return (
        <div className="space-y-6">
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
                    {filteredSportivi.map(s => (
                        <SportivCardMobile
                            key={s.id}
                            sportiv={s}
                            onRowClick={handleRowClick}
                            onOpenWallet={handleOpenWallet}
                            familie={familii.find(f => f.id === s.familie_id)}
                            familyBalance={familyBalances.get(s.familie_id!)}
                            individualBalance={individualBalances.get(s.id)}
                            grupa={grupe.find(g => g.id === s.grupa_id)}
                        />
                    ))}
                </div>
            ) : (
                <ResponsiveTable
                    columns={columns}
                    data={filteredSportivi}
                    onRowClick={handleRowClick}
                    selectedRowId={selectedSportivForHighlight?.id}
                    rowClassName={(sportiv) => !sportiv.user_id ? 'bg-red-900/20 hover:bg-red-900/40 !border-l-2 !border-red-500' : ''}
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
        </div>
    );
};