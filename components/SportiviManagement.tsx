import React, { useState, useMemo, useCallback } from 'react';
import { Sportiv, Grupa, TipAbonament, Familie, Rol, Plata, Tranzactie, User, Club, Grad, Permissions } from '../types';
import { Button, Modal, Input, Select, Card, Switch, RoleBadge } from './ui';
import { PlusIcon, ArrowLeftIcon, ShieldCheckIcon, WalletIcon, UserXIcon, UserCheckIcon, EditIcon, TrashIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { SportivFormModal } from './Sportivi';
import { SportivAccountSettingsModal } from './SportivAccountSettings';
import { SportivWallet } from './SportivWallet';
import { ResponsiveTable, Column } from './ResponsiveTable';
import { FEDERATIE_ID, FEDERATIE_NAME } from '../constants';
import { GradBadge } from '../utils/grades';
import { DeleteAuditModal } from './DeleteAuditModal';

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

const GradLegend: React.FC = () => {
    const mockGrades: { name: string, description: string }[] = [
        { name: 'Cap Alb', description: 'Violet / Cap Alb' },
        { name: '1 Cap Albastru', description: 'Cap Albastru' },
        { name: '1 Cap Rosu', description: 'Cap Roșu' },
        { name: 'Centura Neagra', description: 'Centura Neagră' },
        { name: '1 Dang', description: '1-4 Dang' },
        { name: '5 Dang', description: '5 Dang' },
        { name: '6 Dang', description: '6-8 Dang' },
    ];

    return (
        <Card className="mt-8">
            <h3 className="text-xl font-bold text-white mb-4">Legendă Culori Grade</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {mockGrades.map(g => (
                    <div key={g.name} className="flex flex-col items-center gap-2 text-center">
                        <GradBadge grad={{ nume: g.name, ordine: 0 } as Grad} className="text-[10px]" />
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
    const [selectedSportivForHighlight, setSelectedSportivForHighlight] = useState<Sportiv | null>(null);
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
    const [sportivToDeactivate, setSportivToDeactivate] = useState<Sportiv | null>(null);
    const [sportivForAudit, setSportivForAudit] = useState<Sportiv | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'nume', direction: 'asc' });

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

    const requestSort = (key: string) => {
        if (key === 'actions') return;
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
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

    const handleDeactivate = async () => {
        if (!sportivForAudit) return;
        setLoadingStates(prev => ({...prev, [sportivForAudit.id]: true}));
        const { error } = await supabase.from('sportivi').update({ status: 'Inactiv' }).eq('id', sportivForAudit.id);
        if(error) showError("Eroare", error.message);
        else { setSportivi(prev => prev.map(s => s.id === sportivForAudit!.id ? { ...s, status: 'Inactiv'} : s)); showSuccess("Succes", "Sportivul a fost marcat ca inactiv."); }
        setLoadingStates(prev => ({...prev, [sportivForAudit.id]: false}));
        setSportivForAudit(null);
    };

    const handleDelete = async () => {
        if (!sportivForAudit) return;
        setLoadingStates(prev => ({...prev, [sportivForAudit.id]: true}));
        const { error } = await supabase.from('sportivi').delete().eq('id', sportivForAudit.id);
        if(error) showError("Eroare", error.message);
        else { setSportivi(prev => prev.filter(s => s.id !== sportivForAudit!.id)); showSuccess("Succes", "Sportivul a fost șters definitiv."); }
        setLoadingStates(prev => ({...prev, [sportivForAudit.id]: false}));
        setSportivForAudit(null);
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

    const sortedAndFilteredSportivi = useMemo(() => {
        if (!permissions.hasAdminAccess) {
            return sportivi.filter(s => s.id === currentUser.id);
        }
        
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const seasonStartYear = currentMonth >= 8 ? currentYear : currentYear - 1;
        const sportiviCuVizaValida = new Set((plati || []).filter(p => { if (p.tip !== 'Taxa Anuala' || p.status !== 'Achitat') return false; const paymentDate = new Date(p.data); return paymentDate.getFullYear() > seasonStartYear || (paymentDate.getFullYear() === seasonStartYear && paymentDate.getMonth() >= 8); }).map(p => p.sportiv_id));

        let filtered = (sportivi || []).filter(s => {
            if (filters.showExpiredVizaOnly && (s.status !== 'Activ' || sportiviCuVizaValida.has(s.id))) return false;
            return (`${s.nume} ${s.prenume}`.toLowerCase().includes(filters.searchTerm.toLowerCase())) && (filters.statusFilter ? s.status === filters.statusFilter : true) && (filters.grupaFilter ? s.grupa_id === filters.grupaFilter : true) && (filters.rolFilter ? s.roluri.some(r => r.id === filters.rolFilter) : true) && (filters.gradFilter ? (filters.gradFilter === 'null' ? !s.grad_actual_id : s.grad_actual_id === filters.gradFilter) : true);
        });

        const sortableItems = [...filtered];
        sortableItems.sort((a, b) => {
            const key = sortConfig.key;
            const direction = sortConfig.direction === 'asc' ? 1 : -1;
            if (key === 'grad_actual_id') { const gradA = (grade || []).find(g => g.id === a.grad_actual_id)?.ordine ?? -1; const gradB = (grade || []).find(g => g.id === b.grad_actual_id)?.ordine ?? -1; if (gradA < gradB) return -1 * direction; if (gradA > gradB) return 1 * direction; return 0; }
            if (key === 'grupa_id') { const grupaA = (grupe || []).find(g => g.id === a.grupa_id)?.denumire ?? ''; const grupaB = (grupe || []).find(g => g.id === b.grupa_id)?.denumire ?? ''; return grupaA.localeCompare(grupaB) * direction; }
            if (key === 'roluri') { const rolA = a.roluri?.[0]?.nume ?? ''; const rolB = b.roluri?.[0]?.nume ?? ''; return rolA.localeCompare(rolB) * direction; }
            if (key === 'nume') { const nameA = `${a.nume} ${a.prenume}`; const nameB = `${b.nume} ${b.prenume}`; return nameA.localeCompare(nameB) * direction; }
            if (key === 'club_id') { const clubA = a.cluburi?.nume ?? ''; const clubB = b.cluburi?.nume ?? ''; return clubA.localeCompare(clubB) * direction; }
            
            const valA = a[key as keyof Sportiv]; const valB = b[key as keyof Sportiv];
            if (valA === null || valA === undefined) return 1 * direction; if (valB === null || valB === undefined) return -1 * direction;
            if (typeof valA === 'string' && typeof valB === 'string') return valA.localeCompare(valB) * direction;
            if (valA < valB) return -1 * direction; if (valA > valB) return 1 * direction;
            return 0;
        });

        return sortableItems;
    }, [sportivi, filters, plati, grade, grupe, sortConfig, permissions, currentUser.id]);
    
     const columns: Column<Sportiv>[] = useMemo(() => {
        const baseColumns: Column<Sportiv>[] = [
            { key: 'nume', label: 'Nume Complet', tooltip: "Numele complet al sportivului.", render: (s) => { const familie = s.familie_id ? (familii || []).find(f => f.id === s.familie_id) : null; const familieBalance = s.familie_id ? familyBalances.get(s.familie_id) : undefined; return (<div><div className="font-bold text-white hover:text-brand-primary">{s.nume} {s.prenume} <span className="text-slate-400 font-normal">({getAge(s.data_nasterii)} ani)</span></div>{familie && familieBalance !== undefined && (<div className="text-xs text-slate-300 mt-1">Familia {familie.nume}<span className={`ml-2 font-bold ${familieBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>Sold: {familieBalance >= 0 ? '+' : ''}{familieBalance.toFixed(2)} lei</span></div>)}</div>); }, },
            { key: 'grad_actual_id', label: 'Grad Actual', tooltip: "Gradul actual al sportivului.", render: (s) => <GradBadge grad={(grade || []).find(g => g.id === s.grad_actual_id)} className="text-[10px]" />, className: 'hidden md:table-cell' },
            { key: 'club_id', label: 'Club', tooltip: "Clubul de care aparține sportivul.", render: (s) => s.cluburi?.id === FEDERATIE_ID ? FEDERATIE_NAME : s.cluburi?.nume || '-', className: 'hidden md:table-cell' },
            { key: 'roluri', label: 'Roluri', tooltip: "Rolurile de acces ale utilizatorului în aplicație.", render: (s) => (<div className="flex flex-wrap gap-1">{(s.roluri || []).length > 0 ? s.roluri.map(r => <RoleBadge key={r.id} role={r}/>) : <span className="text-slate-500 italic">N/A</span>}</div>) },
            { key: 'status', label: 'Status', tooltip: "Indică dacă sportivul este activ sau inactiv.", className: 'hidden md:table-cell', render: (s) => (<span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === 'Activ' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{s.status}</span>) },
            { key: 'grupa_id', label: 'Grupă', tooltip: "Grupa de antrenament în care este încadrat sportivul.", render: (s) => (grupe || []).find(g => g.id === s.grupa_id)?.denumire || '-', className: 'hidden md:table-cell' },
        ];

        if (permissions.hasAdminAccess) {
            return [
                ...baseColumns,
                { key: 'cnp', label: 'CNP', tooltip: "Cod Numeric Personal.", render: (s) => s.cnp || '-', className: 'hidden lg:table-cell' },
                { key: 'actions', label: 'Acțiuni', tooltip: "Acțiuni rapide: gestionează portofelul sau setările contului.", headerClassName: 'text-right', cellClassName: 'text-right', render: (s) => (<div className="flex justify-end items-center gap-2"><Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); setSportivToEdit(s); setIsFormModalOpen(true); }} title="Editează Profil" className="!p-2"><EditIcon className="w-4 h-4" /></Button><Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setSportivForAudit(s); }} title="Dezactivează sau Șterge" className="!p-2"><TrashIcon className="w-4 h-4" /></Button><Button size="sm" variant="info" onClick={(e) => { e.stopPropagation(); handleOpenWallet(s); }} title="Portofel Sportiv" className="!p-2"><WalletIcon className="w-4 h-4" /></Button><Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setAccountSettingsSportiv(s); }} title="Setări Cont de Acces" className="!p-2"><ShieldCheckIcon className="w-4 h-4" /></Button></div>) }
            ];
        }

        return baseColumns;
     }, [permissions.hasAdminAccess, familii, familyBalances, grade, grupe, clubs, loadingStates, handleToggleStatus, handleOpenWallet]);
    
    const handleSave = async (formData: Partial<Sportiv>): Promise<{ success: boolean; error?: any; data?: Sportiv; }> => {
        const { roluri, ...sportivData } = formData;
        try {
            if (sportivToEdit) {
                const { data, error } = await supabase.from('sportivi').update(sportivData).eq('id', sportivToEdit.id).select('*, roluri(id, nume)').single();
                if (error) throw error;
                const updatedSportiv = { ...data, roluri: data.roluri || [] };
                setSportivi(prev => prev.map(s => s.id === sportivToEdit.id ? updatedSportiv : s));
                return { success: true, data: updatedSportiv };
            } else {
                 // --- VERIFICARE DUPLICATE ---
                const { nume, prenume, data_nasterii, club_id } = sportivData;
                if (nume && prenume && data_nasterii) {
                    let query = supabase.from('sportivi').select('id', { count: 'exact', head: true })
                        .eq('nume', nume.trim())
                        .eq('prenume', prenume.trim())
                        .eq('data_nasterii', data_nasterii);

                    if (!permissions.isFederationAdmin) {
                        query = query.eq('club_id', currentUser.club_id);
                    } else if (club_id) {
                         query = query.eq('club_id', club_id);
                    }

                    const { error: checkError, count } = await query;
                    
                    if (checkError) {
                        return { success: false, error: `Eroare la verificarea duplicatelor: ${checkError.message}` };
                    }
                    if (count && count > 0) {
                        return { success: false, error: `Un sportiv cu același nume, prenume și dată de naștere există deja.` };
                    }
                }
                // --- SFÂRȘIT VERIFICARE ---
                const dataToSave = { ...sportivData };
                if (!dataToSave.familie_id) {
                    const individualSubscription = (tipuriAbonament || []).find(ab => ab.numar_membri === 1);
                    if (individualSubscription) dataToSave.tip_abonament_id = individualSubscription.id;
                }
                const { data, error } = await supabase.from('sportivi').insert(dataToSave).select().single();
                if (error) throw error;
                let newSportiv = { ...data, roluri: [] } as Sportiv;
                const sportivRole = (allRoles || []).find(r => r.nume === 'Sportiv');
                if (sportivRole) {
                    const { error: roleError } = await supabase.from('sportivi_roluri').insert({ sportiv_id: data.id, rol_id: sportivRole.id });
                    if (roleError) showError("Utilizator creat, dar eroare la asignarea rolului", roleError.message);
                    else newSportiv.roluri = [sportivRole];
                }
                setSportivi(prev => [...prev, newSportiv]);
                return { success: true, data: newSportiv };
            }
        } catch (err: any) {
            return { success: false, error: err };
        }
    };

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary" className="mb-2"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
            
            <div className="flex justify-between items-center gap-4">
                <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Management Sportivi</h1>
                {permissions.hasAdminAccess && (<Button variant="primary" onClick={() => { setSportivToEdit(null); setIsFormModalOpen(true); }}><PlusIcon className="w-5 h-5 mr-1"/> Adaugă Sportiv</Button>)}
            </div>

            {permissions.hasAdminAccess && (
                <Card className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-center">
                    <Select label="Status" value={filters.statusFilter} onChange={e => handleFilterChange('statusFilter', e.target.value)}><option value="Activ">Activi</option><option value="Inactiv">Inactivi</option><option value="">Toți</option></Select>
                    <Select label="Grupă" value={filters.grupaFilter} onChange={e => handleFilterChange('grupaFilter', e.target.value)}><option value="">Toate grupele</option>{(grupe || []).map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}</Select>
                    <Select label="Grad" value={filters.gradFilter} onChange={e => handleFilterChange('gradFilter', e.target.value)}><option value="">Toate gradele</option><option value="null">Începător (fără grad)</option>{(grade || []).sort((a,b) => a.ordine - b.ordine).map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}</Select>
                    <Select label="Rol" value={filters.rolFilter} onChange={e => handleFilterChange('rolFilter', e.target.value)}><option value="">Toate rolurile</option>{(allRoles || []).map(r => <option key={r.id} value={r.id}>{r.nume}</option>)}</Select>
                    <div className="pt-5"><Switch label="Doar cu viza medicală expirată" name="showExpiredVizaOnly" checked={filters.showExpiredVizaOnly} onChange={(e) => handleFilterChange('showExpiredVizaOnly', e.target.checked)}/></div>
                </Card>
            )}

            <div className="text-slate-900">
                <ResponsiveTable data={sortedAndFilteredSportivi} columns={columns} searchTerm={filters.searchTerm} onSearchChange={(val) => handleFilterChange('searchTerm', val)} onRowClick={handleRowClick} searchPlaceholder="Caută sportiv după nume..." selectedRowId={selectedSportivForHighlight?.id} rowClassName={(sportiv) => !sportiv.user_id ? 'bg-red-900/20 hover:bg-red-900/40 !border-l-2 !border-red-500' : ''} onSort={requestSort} sortConfig={sortConfig} />
            </div>
            
            {permissions.hasAdminAccess && <GradLegend />}

            {isFormModalOpen && (<SportivFormModal isOpen={isFormModalOpen} onClose={(savedSportiv?: Sportiv) => { setIsFormModalOpen(false); if (savedSportiv && !sportivToEdit) { onViewSportiv(savedSportiv); } }} onSave={handleSave} sportivToEdit={sportivToEdit} grupe={grupe} setGrupe={setGrupe} familii={familii} setFamilii={setFamilii} tipuriAbonament={tipuriAbonament} clubs={clubs} currentUser={currentUser} />)}
            
            {sportivForAudit && <DeleteAuditModal isOpen={!!sportivForAudit} onClose={() => setSportivForAudit(null)} sportiv={sportivForAudit} onDeactivate={handleDeactivate} onDelete={handleDelete} />}

            <SportivAccountSettingsModal isOpen={!!accountSettingsSportiv} onClose={() => setAccountSettingsSportiv(null)} sportiv={accountSettingsSportiv} setSportivi={setSportivi} allRoles={allRoles} setAllRoles={setAllRoles} currentUser={currentUser} />
            
            {isWalletModalOpen && sportivForWallet && (<SportivWallet sportiv={sportivForWallet} familie={familii.find(f => f.id === sportivForWallet.familie_id)} allPlati={plati} allTranzactii={tranzactii} setTranzactii={setTranzactii} onClose={() => { setIsWalletModalOpen(false); setSportivForWallet(null); }} />)}
        </div>
    );
};