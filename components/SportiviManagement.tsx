import React, { useState, useMemo, useCallback } from 'react';
import { Sportiv, Grupa, TipAbonament, Familie, Rol, Plata, Tranzactie, User, Club, Grad, Permissions } from '../types';
import { Button, Modal, Input, Select, Card, Switch } from './ui';
import { PlusIcon, ArrowLeftIcon, ShieldCheckIcon, WalletIcon, UserXIcon, UserCheckIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { SportivFormModal } from './Sportivi';
import { SportivAccountSettingsModal } from './SportivAccountSettings';
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

const getGradStyle = (gradName: string): string => {
    const name = gradName.toLowerCase();
    if (name.includes('dang')) {
        if (name.includes('5')) return 'bg-black text-white border-2 border-yellow-400';
        if (name.includes('6') || name.includes('7')) return 'bg-white text-red-600 border-2 border-red-600';
        return 'bg-black text-white border-2 border-red-600';
    }
    if (name.includes('neagră')) return 'bg-black text-white';
    if (name.includes('violet')) return 'bg-violet-600 text-white';
    if (name.includes('roșu')) return 'bg-red-600 text-white';
    if (name.includes('albastru')) return 'bg-white text-blue-600 border border-blue-600';
    if (name.includes('galben')) return 'bg-yellow-400 text-black';
    return 'bg-slate-600 text-white'; // Default
};

const GradBadge: React.FC<{ grad: Grad | null | undefined }> = ({ grad }) => {
    if (!grad) return <span className="px-2 py-1 text-[10px] font-semibold rounded-full bg-slate-600 text-white">Începător</span>;
    return (
        <span className={`px-2 py-1 text-[10px] font-bold rounded-full whitespace-nowrap ${getGradStyle(grad.nume)}`}>
            {grad.nume}
        </span>
    );
};

const RoleBadge: React.FC<{ role: Rol }> = ({ role }) => {
    const colorClasses: Record<Rol['nume'], string> = { 
        Admin: 'bg-red-600 text-white', 
        'SUPER_ADMIN_FEDERATIE': 'bg-red-800 text-white', 
        'Admin Club': 'bg-blue-600 text-white', 
        Instructor: 'bg-sky-600 text-white', 
        Sportiv: 'bg-slate-600 text-slate-200' 
    };
    return <span className={`px-2 py-1 text-[10px] font-semibold rounded-full ${colorClasses[role.nume] || 'bg-gray-500 text-white'}`}>{role.nume}</span>;
};

const DeactivationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    sportiv: Sportiv | null;
    sportivi: Sportiv[];
    plati: Plata[];
    tipuriAbonament: TipAbonament[];
    onConfirm: (action: 'none' | 'cancel' | 'update', invoiceToUpdate?: Plata, newPrice?: number) => void;
}> = ({ isOpen, onClose, sportiv, sportivi, plati, tipuriAbonament, onConfirm }) => {
    const [loading, setLoading] = useState(false);

    const deactivationInfo = useMemo(() => {
        if (!sportiv) return null;

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const findRelevantInvoice = (entityId: string, isFamily: boolean) => {
            return plati.find(p => 
                (isFamily ? p.familie_id === entityId : p.sportiv_id === entityId) &&
                p.tip === 'Abonament' &&
                (p.status === 'Neachitat' || p.status === 'Achitat Parțial') &&
                new Date(p.data).getMonth() === currentMonth &&
                new Date(p.data).getFullYear() === currentYear
            );
        };

        if (sportiv.familie_id) {
            const familyInvoice = findRelevantInvoice(sportiv.familie_id, true);
            if (!familyInvoice) return { scenario: 'no_invoice' as const };
            
            const familyMembers = sportivi.filter(s => s.familie_id === sportiv.familie_id && s.status === 'Activ');
            const newMemberCount = familyMembers.length - 1;

            if (newMemberCount <= 0) {
                return { scenario: 'cancel_family' as const, invoice: familyInvoice };
            }

            let newSubscription = tipuriAbonament.find(t => t.numar_membri === newMemberCount);
            if (!newSubscription) {
                 newSubscription = tipuriAbonament.find(t => t.numar_membri === 1);
            }
            if (newSubscription && newSubscription.pret !== familyInvoice.suma) {
                return { scenario: 'update_family' as const, invoice: familyInvoice, newPrice: newSubscription.pret, newCount: newMemberCount };
            } else {
                return { scenario: 'no_invoice' as const }; // Price is the same, no action needed
            }
        } else {
            const individualInvoice = findRelevantInvoice(sportiv.id, false);
            if (individualInvoice) {
                return { scenario: 'cancel_individual' as const, invoice: individualInvoice };
            }
        }
        return { scenario: 'no_invoice' as const };
    }, [sportiv, plati, sportivi, tipuriAbonament]);

    const handleConfirm = async (action: 'none' | 'cancel' | 'update') => {
        setLoading(true);
        await onConfirm(action, deactivationInfo?.invoice, deactivationInfo?.scenario === 'update_family' ? deactivationInfo.newPrice : undefined);
        setLoading(false);
    };
    
    if (!isOpen || !sportiv || !deactivationInfo) return null;
    
    let title = "Confirmare Dezactivare";
    let content = <p>Sunteți sigur că doriți să dezactivați sportivul <strong>{sportiv.nume} {sportiv.prenume}</strong>?</p>;
    let actions = (
        <>
            <Button variant="secondary" onClick={onClose}>Anulează</Button>
            <Button variant="warning" onClick={() => handleConfirm('none')} isLoading={loading}>Dezactivează</Button>
        </>
    );

    switch(deactivationInfo.scenario) {
        case 'cancel_individual':
            title = "Abonament Individual Neachitat";
            content = (
                <div className="space-y-2">
                    <p>Sportivul <strong>{sportiv.nume} {sportiv.prenume}</strong> are un abonament individual de <strong>{deactivationInfo.invoice?.suma} RON</strong> neachitat pentru luna curentă.</p>
                    <p>Doriți să anulați această factură odată cu dezactivarea?</p>
                </div>
            );
            actions = (
                <>
                    <Button variant="secondary" onClick={() => handleConfirm('none')} isLoading={loading}>Păstrează Factura</Button>
                    <Button variant="danger" onClick={() => handleConfirm('cancel')} isLoading={loading}>Anulează Factura și Dezactivează</Button>
                </>
            );
            break;
        case 'cancel_family':
             title = "Ultimul Membru al Familiei";
            content = <p>Acesta este ultimul membru activ al familiei. Prin dezactivare, factura de familie de <strong>{deactivationInfo.invoice?.suma} RON</strong> va fi anulată automat.</p>;
            actions = <Button variant="danger" onClick={() => handleConfirm('cancel')} isLoading={loading}>Anulează Factura și Dezactivează</Button>;
            break;
        case 'update_family':
            title = "Abonament de Familie Neachitat";
            content = (
                 <div className="space-y-2">
                    <p>Sportivul face parte dintr-o familie. Prin dezactivare, numărul de membri activi se reduce la <strong>{deactivationInfo.newCount}</strong>.</p>
                    <p>Prețul abonamentului ar trebui ajustat de la <strong>{deactivationInfo.invoice?.suma} RON</strong> la <strong>{deactivationInfo.newPrice} RON</strong>. Doriți să actualizați factura?</p>
                </div>
            );
            actions = (
                <>
                    <Button variant="secondary" onClick={() => handleConfirm('none')} isLoading={loading}>Păstrează Factura Actuală</Button>
                    <Button variant="primary" onClick={() => handleConfirm('update')} isLoading={loading}>Actualizează Factura și Dezactivează</Button>
                </>
            );
            break;
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="text-sm text-slate-300 mb-6">{content}</div>
            <div className="flex justify-end gap-2">{actions}</div>
        </Modal>
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
    const [selectedSportivForHighlight, setSelectedSportivForHighlight] = useState<Sportiv | null>(null);
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
    const [sportivToDeactivate, setSportivToDeactivate] = useState<Sportiv | null>(null);

    const { showError, showSuccess } = useError();
    
    const [filters, setFilters] = useLocalStorage('phi-hau-sportivi-filters', {
        searchTerm: '',
        statusFilter: 'Activ',
        grupaFilter: '',
        rolFilter: '',
        gradFilter: '',
        showExpiredVizaOnly: false,
    });
    
    const handleFilterChange = (name: keyof typeof filters, value: string | boolean) => {
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

    const handleToggleStatus = useCallback(async (sportiv: Sportiv) => {
        const newStatus = sportiv.status === 'Activ' ? 'Inactiv' : 'Activ';
        
        if (newStatus === 'Inactiv') {
            setSportivToDeactivate(sportiv);
        } else { // Activating
            setLoadingStates(prev => ({ ...prev, [sportiv.id]: true }));
            try {
                if (!supabase) throw new Error("Client Supabase neconfigurat.");
                const { data, error } = await supabase.from('sportivi').update({ status: 'Activ' }).eq('id', sportiv.id).select('*, cluburi(*), sportivi_roluri(roluri(id, nume))').single();
                if (error) throw error;
                const updatedSportiv = { ...data, roluri: (((data as any).sportivi_roluri?.map((sr: any) => sr.roluri)) || []).filter(Boolean) };
                delete (updatedSportiv as any).sportivi_roluri;
                setSportivi(prev => prev.map(s => s.id === sportiv.id ? updatedSportiv as Sportiv : s));
                showSuccess("Succes!", `Statusul a fost schimbat în 'Activ'.`);
            } catch(err: any) {
                showError("Eroare la activare", err.message);
            } finally {
                setLoadingStates(prev => ({ ...prev, [sportiv.id]: false }));
            }
        }
    }, [setSportivi, showError, showSuccess]);

    const handleConfirmDeactivation = async (
        action: 'none' | 'cancel' | 'update', 
        invoiceToUpdate?: Plata, 
        newPrice?: number
    ) => {
        if (!sportivToDeactivate || !supabase) return;
        setLoadingStates(prev => ({ ...prev, [sportivToDeactivate.id]: true }));

        try {
            if (action === 'cancel' && invoiceToUpdate) {
                const { error } = await supabase.from('plati').delete().eq('id', invoiceToUpdate.id);
                if (error) throw new Error(`Eroare la anularea facturii: ${error.message}`);
                setPlati(prev => prev.filter(p => p.id !== invoiceToUpdate.id));
            } else if (action === 'update' && invoiceToUpdate && newPrice !== undefined) {
                const { data, error } = await supabase.from('plati').update({ suma: newPrice }).eq('id', invoiceToUpdate.id).select().single();
                if (error) throw new Error(`Eroare la actualizarea facturii: ${error.message}`);
                setPlati(prev => prev.map(p => p.id === invoiceToUpdate.id ? data as Plata : p));
            }

            const { data, error } = await supabase.from('sportivi').update({ status: 'Inactiv' }).eq('id', sportivToDeactivate.id).select('*, cluburi(*), sportivi_roluri(roluri(id, nume))').single();
            if (error) throw error;
            
            const updatedSportiv = { ...data, roluri: (((data as any).sportivi_roluri?.map((sr: any) => sr.roluri)) || []).filter(Boolean) };
            delete (updatedSportiv as any).sportivi_roluri;
            setSportivi(prev => prev.map(s => s.id === sportivToDeactivate.id ? updatedSportiv as Sportiv : s));
            
            showSuccess("Succes", `${sportivToDeactivate.nume} a fost dezactivat.`);
        } catch(err: any) {
            showError("Eroare la dezactivare", err.message);
        } finally {
            setLoadingStates(prev => ({ ...prev, [sportivToDeactivate.id]: false }));
            setSportivToDeactivate(null);
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

    const filteredSportivi = useMemo(() => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const seasonStartYear = currentMonth >= 8 ? currentYear : currentYear - 1;

        const sportiviCuVizaValida = new Set(
            (plati || [])
                .filter(p => {
                    if (p.tip !== 'Taxa Anuala' || p.status !== 'Achitat') return false;
                    const paymentDate = new Date(p.data);
                    return paymentDate.getFullYear() > seasonStartYear || (paymentDate.getFullYear() === seasonStartYear && paymentDate.getMonth() >= 8);
                })
                .map(p => p.sportiv_id)
        );

        return (sportivi || []).filter((s: Sportiv) => {
            if (filters.showExpiredVizaOnly && (s.status !== 'Activ' || sportiviCuVizaValida.has(s.id))) {
                return false;
            }
            return (
                (`${s.nume} ${s.prenume}`.toLowerCase().includes(filters.searchTerm.toLowerCase())) &&
                (filters.statusFilter ? s.status === filters.statusFilter : true) &&
                (filters.grupaFilter ? s.grupa_id === filters.grupaFilter : true) &&
                (filters.rolFilter ? s.roluri.some(r => r.id === filters.rolFilter) : true) &&
                (filters.gradFilter ? (filters.gradFilter === 'null' ? !s.grad_actual_id : s.grad_actual_id === filters.gradFilter) : true)
            );
        }).sort((a: Sportiv, b: Sportiv) => a.nume.localeCompare(b.nume));
    }, [sportivi, filters, plati]);
    
     const columns: Column<Sportiv>[] = [
        {
            key: 'nume',
            label: 'Nume Complet',
            tooltip: "Numele complet al sportivului. Dacă face parte dintr-o familie, este afișat și soldul familiei.",
            render: (s) => {
                const familie = s.familie_id ? (familii || []).find(f => f.id === s.familie_id) : null;
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
        {
            key: 'grad_actual_id',
            label: 'Grad Actual',
            tooltip: "Gradul actual al sportivului.",
            render: (s) => {
                const currentGrade = (grade || []).find(g => g.id === s.grad_actual_id);
                return <GradBadge grad={currentGrade} />;
            },
            className: 'hidden md:table-cell'
        },
        { key: 'club_id', label: 'Club', tooltip: "Clubul de care aparține sportivul.", render: (s) => s.cluburi?.id === FEDERATIE_ID ? FEDERATIE_NAME : s.cluburi?.nume || '-', className: 'hidden md:table-cell' },
        { 
            key: 'roluri', 
            label: 'Roluri', 
            tooltip: "Rolurile de acces ale utilizatorului în aplicație.",
            render: (s) => (
                <div className="flex flex-wrap gap-1">
                    {(s.roluri || []).length > 0 
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
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === 'Activ' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{s.status}</span>
            )
        },
        { key: 'grupa_id', label: 'Grupă', tooltip: "Grupa de antrenament în care este încadrat sportivul.", render: (s) => (grupe || []).find(g => g.id === s.grupa_id)?.denumire || '-', className: 'hidden md:table-cell' },
        {
            key: 'actions',
            label: 'Acțiuni',
            tooltip: "Acțiuni rapide: gestionează portofelul sau setările contului.",
            headerClassName: 'text-right',
            cellClassName: 'text-right',
            render: (s) => (
                <div className="flex justify-end items-center gap-2">
                    <Button size="sm" variant="info" onClick={(e) => { e.stopPropagation(); handleOpenWallet(s); }} title="Portofel Sportiv" className="!p-2">
                        <WalletIcon className="w-4 h-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant={s.status === 'Activ' ? 'warning' : 'success'}
                        onClick={(e) => { e.stopPropagation(); handleToggleStatus(s); }}
                        title={s.status === 'Activ' ? 'Dezactivează sportiv' : 'Activează sportiv'}
                        className="!p-2"
                        isLoading={loadingStates[s.id]}
                    >
                        {s.status === 'Activ' ? <UserXIcon className="w-4 h-4" /> : <UserCheckIcon className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setAccountSettingsSportiv(s); }} title="Setări Cont de Acces" className="!p-2">
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
                const { data, error } = await supabase.from('sportivi').update(sportivData).eq('id', sportivToEdit.id).select('*, roluri(id, nume)').single();
                if (error) throw error;
                const updatedSportiv = { ...data, roluri: data.roluri || [] };
                setSportivi(prev => prev.map(s => s.id === sportivToEdit.id ? updatedSportiv : s));
            } else {
                const dataToSave = { ...sportivData };
                if (!dataToSave.familie_id) {
                    const individualSubscription = (tipuriAbonament || []).find(ab => ab.numar_membri === 1);
                    if (individualSubscription) {
                        dataToSave.tip_abonament_id = individualSubscription.id;
                    }
                }

                const { data, error } = await supabase.from('sportivi').insert(dataToSave).select().single();
                if (error) throw error;

                let newSportiv = { ...data, roluri: [] } as Sportiv;
                const sportivRole = (allRoles || []).find(r => r.nume === 'Sportiv');
                if (sportivRole) {
                    const { error: roleError } = await supabase.from('sportivi_roluri').insert({ sportiv_id: data.id, rol_id: sportivRole.id });
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

            <Card className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-center">
                <Select label="Status" value={filters.statusFilter} onChange={e => handleFilterChange('statusFilter', e.target.value)}>
                    <option value="Activ">Activi</option>
                    <option value="Inactiv">Inactivi</option>
                    <option value="">Toți</option>
                </Select>
                <Select label="Grupă" value={filters.grupaFilter} onChange={e => handleFilterChange('grupaFilter', e.target.value)}>
                    <option value="">Toate grupele</option>
                    {(grupe || []).map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                </Select>
                <Select label="Grad" value={filters.gradFilter} onChange={e => handleFilterChange('gradFilter', e.target.value)}>
                    <option value="">Toate gradele</option>
                    <option value="null">Începător (fără grad)</option>
                    {(grade || []).sort((a,b) => a.ordine - b.ordine).map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}
                </Select>
                <Select label="Rol" value={filters.rolFilter} onChange={e => handleFilterChange('rolFilter', e.target.value)}>
                    <option value="">Toate rolurile</option>
                    {(allRoles || []).map(r => <option key={r.id} value={r.id}>{r.nume}</option>)}
                </Select>
                <div className="pt-5">
                    <Switch 
                        label="Doar cu viza medicală expirată" 
                        name="showExpiredVizaOnly"
                        checked={filters.showExpiredVizaOnly}
                        onChange={(e) => handleFilterChange('showExpiredVizaOnly', e.target.checked)}
                    />
                </div>
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
            
            <DeactivationModal
                isOpen={!!sportivToDeactivate}
                onClose={() => setSportivToDeactivate(null)}
                sportiv={sportivToDeactivate}
                sportivi={sportivi}
                plati={plati}
                tipuriAbonament={tipuriAbonament}
                onConfirm={handleConfirmDeactivation}
            />

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