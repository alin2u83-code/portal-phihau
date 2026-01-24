import React, { useState, useMemo } from 'react';
import { Sportiv, Grupa, TipAbonament, Familie, Rol, Plata, Tranzactie, User, Club } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
import { PlusIcon, ArrowLeftIcon, ShieldCheckIcon, WalletIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { SportivFormModal } from './Sportivi';
import { SportivAccountSettingsModal } from './SportivAccountSettings';
import { SportivWallet } from './SportivWallet';

const formatHeader = (key: string): string => {
    if (key === 'numeComplet') return 'Nume Complet';
    if (key === 'grupa_id') return 'Grupă';
    if (key === 'club_id') return 'Club';
    if (key === 'actiuni') return 'Acțiuni';
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const RoleBadge: React.FC<{ role: Rol }> = ({ role }) => {
    const colorClasses: Record<Rol['nume'], string> = { Admin: 'bg-red-600 text-white', 'Super Admin': 'bg-red-800 text-white', 'Admin Club': 'bg-blue-600 text-white', Instructor: 'bg-sky-600 text-white', Sportiv: 'bg-slate-600 text-slate-200' };
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
}> = ({ onBack, sportivi, setSportivi, grupe, setGrupe, tipuriAbonament, familii, setFamilii, allRoles, setAllRoles, currentUser, plati, tranzactii, setTranzactii, onViewSportiv, clubs }) => {
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [sportivToEdit, setSportivToEdit] = useState<Sportiv | null>(null);
    const [accountSettingsSportiv, setAccountSettingsSportiv] = useState<Sportiv | null>(null);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [sportivForWallet, setSportivForWallet] = useState<Sportiv | null>(null);

    const { showError } = useError();

    const [filters, setFilters] = useLocalStorage('phi-hau-sportivi-filters', {
        searchTerm: '',
        statusFilter: 'Activ',
        grupaFilter: '',
        rolFilter: '',
    });
    
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleOpenWallet = (sportiv: Sportiv) => {
        setSportivForWallet(sportiv);
        setIsWalletModalOpen(true);
    };

    const familyBalances = useMemo(() => {
        const balances = new Map<string, number>();
        if (!familii || !plati || !tranzactii) return balances;
        familii.forEach(f => balances.set(f.id, 0));
        tranzactii.forEach(t => { if (t.familie_id) balances.set(t.familie_id, (balances.get(t.familie_id) || 0) + t.suma); });
        plati.forEach(p => { if (p.familie_id) balances.set(p.familie_id, (balances.get(p.familie_id) || 0) - p.suma); });
        return balances;
    }, [familii, plati, tranzactii]);

    const filteredSportivi = useMemo(() => {
        return sportivi.filter((s: Sportiv) =>
            (`${s.nume} ${s.prenume}`.toLowerCase().includes(filters.searchTerm.toLowerCase())) &&
            (filters.statusFilter ? s.status === filters.statusFilter : true) &&
            (filters.grupaFilter ? s.grupa_id === filters.grupaFilter : true) &&
            (filters.rolFilter ? s.roluri.some(r => r.id === filters.rolFilter) : true)
        ).sort((a: Sportiv, b: Sportiv) => a.nume.localeCompare(b.nume));
    }, [sportivi, filters]);

    const finalColumns = useMemo(() => {
        return ['numeComplet', 'club_id', 'roluri', 'status', 'grupa_id', 'actiuni'];
    }, []);
    
    const renderCellContent = (s: Sportiv, columnKey: string) => {
        switch (columnKey) {
            case 'numeComplet': {
                const familie = s.familie_id ? familii.find(f => f.id === s.familie_id) : null;
                const familieBalance = s.familie_id ? familyBalances.get(s.familie_id) : undefined;
                return (
                    <>
                        <div className="hover:text-brand-secondary">{s.nume} {s.prenume}</div>
                         {familie && familieBalance !== undefined && (
                            <div className="text-xs font-normal text-slate-400" style={{fontSize: '11px'}}>
                                Familia {familie.nume}
                                <span className={`ml-2 font-bold ${familieBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    Sold: {familieBalance >= 0 ? '+' : ''}{familieBalance.toFixed(2)} lei
                                </span>
                            </div>
                        )}
                    </>
                );
            }
            case 'roluri':
                return (
                    <div className="flex flex-wrap gap-1">
                        {s.roluri.length > 0 
                            ? s.roluri.map(r => <RoleBadge key={r.id} role={r}/>)
                            : <span className="text-slate-500 italic">N/A</span>
                        }
                    </div>
                );
            case 'status':
                return (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === 'Activ' ? 'bg-green-600/20 text-green-400 border border-green-600/50' : 'bg-red-600/20 text-red-400 border border-red-600/50'}`}>
                        {s.status}
                    </span>
                );
            case 'club_id':
                return clubs.find(c => c.id === s.club_id)?.nume || '-';
            case 'grupa_id':
                return grupe.find(g => g.id === s.grupa_id)?.denumire || '-';
            case 'actiuni':
                 return (
                    <div className="flex justify-end items-center gap-2">
                        <Button size="sm" variant="info" onClick={() => handleOpenWallet(s)} title="Portofel Sportiv">
                            <WalletIcon className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setAccountSettingsSportiv(s)} title="Setări Cont de Acces">
                            <ShieldCheckIcon className="w-4 h-4" />
                        </Button>
                    </div>
                );
            default:
                const value = s[columnKey] as React.ReactNode;
                return (typeof value === 'boolean') ? (value ? 'Da' : 'Nu') : (value || '-');
        }
    };

    const handleSave = async (formData: Partial<Sportiv>) => {
        const { roluri, ...sportivData } = formData;
        try {
            if (sportivToEdit) {
                const { data, error } = await supabase.from('sportivi').update(sportivData).eq('id', sportivToEdit.id).select('*, roluri(id, nume)').single();
                if (error) throw error;
                const updatedSportiv = { ...data, roluri: data.roluri || [] };
                setSportivi(prev => prev.map(s => s.id === sportivToEdit.id ? updatedSportiv : s));
            } else {
                const dataToSave = { ...sportivData };
                if (!dataToSave.familie_id) {
                    const individualSubscription = tipuriAbonament.find(ab => ab.numar_membri === 1);
                    if (individualSubscription) {
                        dataToSave.tip_abonament_id = individualSubscription.id;
                    }
                }

                const { data, error } = await supabase.from('sportivi').insert(dataToSave).select().single();
                if (error) throw error;

                let newSportiv = { ...data, roluri: [] } as Sportiv;
                const sportivRole = allRoles.find(r => r.nume === 'Sportiv');
                if (sportivRole) {
                    const { error: roleError } = await supabase.from('sportivi_roluri').insert({ sportiv_id: data.id, rol_id: sportivRole.id });
                    if (roleError) {
                        showError("Utilizator creat, dar eroare la asignarea rolului", roleError);
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
                <Button variant="primary" onClick={() => { setSportivToEdit(null); setIsFormModalOpen(true); }}>
                    <PlusIcon className="w-5 h-5 mr-1"/> Adaugă Sportiv
                </Button>
            </div>

            <Card className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Caută Sportiv" name="searchTerm" value={filters.searchTerm} onChange={handleFilterChange} placeholder="Nume sau prenume..." />
                <Select label="Status" name="statusFilter" value={filters.statusFilter} onChange={handleFilterChange}>
                    <option value="Activ">Activi</option>
                    <option value="Inactiv">Inactivi</option>
                    <option value="">Toți</option>
                </Select>
                <Select label="Grupă" name="grupaFilter" value={filters.grupaFilter} onChange={handleFilterChange}>
                    <option value="">Toate grupele</option>
                    {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                </Select>
                <Select label="Rol" name="rolFilter" value={filters.rolFilter} onChange={handleFilterChange}>
                    <option value="">Toate rolurile</option>
                    {allRoles.map(r => <option key={r.id} value={r.id}>{r.nume}</option>)}
                </Select>
            </Card>

            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm table-auto">
                        <thead className="bg-slate-700/50">
                            <tr>
                                {finalColumns.map(key => (
                                    <th key={key} className="p-3 font-bold uppercase text-[10px] whitespace-nowrap">{formatHeader(key)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                             {filteredSportivi.map((s: Sportiv) => (
                                <tr key={s.id} className="hover:bg-brand-secondary/10 transition-all duration-200 ease-in-out hover:scale-[1.02]">
                                    {finalColumns.map((key) => {
                                        const isNameColumn = key === 'numeComplet';
                                        return (
                                            <td 
                                                key={key} 
                                                className={`p-3 text-xs align-top ${isNameColumn ? 'font-semibold text-white cursor-pointer' : 'text-slate-400'}`}
                                                onClick={isNameColumn ? () => onViewSportiv(s) : undefined}
                                                style={{ minWidth: isNameColumn ? '200px' : 'auto' }}
                                            >
                                                {renderCellContent(s, key)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredSportivi.length === 0 && <p className="p-8 text-center text-slate-500 italic">Niciun sportiv găsit.</p>}
                </div>
            </Card>

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