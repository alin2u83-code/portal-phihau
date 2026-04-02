import React, { useState, useMemo } from 'react';
import { Plata, Sportiv, Permissions, Club } from '../types';
import { Button, Input, Select, Card, Modal, SearchInput, ClubSelect } from './ui';
import { EditIcon, ArrowLeftIcon, TrashIcon, BanknotesIcon, BellIcon, WalletIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { sendBulkNotifications } from '../utils/notifications';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { FEDERATIE_ID, FEDERATIE_NAME } from '../constants';
import { useData } from '../contexts/DataContext';

interface PlatiScadenteProps { 
    onIncaseazaMultiple: (plati: Plata[]) => void;
    onBack: () => void;
    onViewSportiv: (sportiv: Sportiv) => void;
    permissions: Permissions;
}

const initialFilters = { sportiv: '', tip: '', status: '', clubId: '' };

export const PlatiScadente: React.FC<PlatiScadenteProps> = ({ onIncaseazaMultiple, onBack, onViewSportiv, permissions }) => {
    const { filteredData, setPlati, currentUser, clubs, grade } = useData();
    const plati = filteredData.plati;
    const sportivi = filteredData.sportivi;
    const familii = filteredData.familii;
    const tipuriAbonament = filteredData.tipuriAbonament;
    const tranzactii = filteredData.tranzactii;
    const reduceri = filteredData.reduceri;
    const inscrieriExamene = filteredData.inscrieriExamene;
    const grupe = filteredData.grupe;

    const [filter, setFilter] = useLocalStorage('phi-hau-plati-scadente-filter', initialFilters);
    const [editingPlata, setEditingPlata] = useState<Plata | null>(null);
    const [plataToDelete, setPlataToDelete] = useState<Plata | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const { showError, showSuccess } = useError();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [plataForPayment, setPlataForPayment] = useState<Plata | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Transfer Bancar'>('Cash');
    const [isPaymentLoading, setIsPaymentLoading] = useState(false);

    const balances = useMemo(() => {
        const famBalances = new Map<string, number>();
        const indivBalances = new Map<string, number>();

        (familii || []).forEach(f => famBalances.set(f.id, 0));
        (sportivi || []).forEach(s => indivBalances.set(s.id, 0));

        (tranzactii || []).forEach(t => {
            if (t.familie_id) {
                famBalances.set(t.familie_id, (famBalances.get(t.familie_id) || 0) + t.suma);
            } else if (t.sportiv_id) {
                indivBalances.set(t.sportiv_id, (indivBalances.get(t.sportiv_id) || 0) + t.suma);
            }
        });

        (plati || []).forEach(p => {
            if (p.familie_id) {
                famBalances.set(p.familie_id, (famBalances.get(p.familie_id) || 0) - p.suma);
            } else if (p.sportiv_id) {
                indivBalances.set(p.sportiv_id, (indivBalances.get(p.sportiv_id) || 0) - p.suma);
            }
        });

        return { famBalances, indivBalances };
    }, [familii, sportivi, plati, tranzactii]);

    const handleGenerateSubscriptions = async () => {
        if (!supabase) return;
        
        setIsGenerating(true);
        try {
            if (permissions.isFederationAdmin) {
                throw new Error("Adminii de federație nu pot genera abonamente la nivel de club. Această acțiune aparține adminului de club.");
            }

            const clubId = currentUser?.club_id;
            if (!clubId) {
                throw new Error("Nu este asociat niciun club contului tău. Contactează un super admin.");
            }

            const sportiviQuery = supabase
                .from('sportivi')
                .select('*')
                .eq('status', 'Activ')
                .eq('club_id', clubId);

            const { data: sportiviActiviBrut, error } = await sportiviQuery;

            if (error) {
                console.error('DETALII EROARE:', JSON.stringify(error, null, 2));
                throw error;
            }

            // Excludem sportivii din grupe cu "retras" în denumire
            const grupeRetrasi = new Set(
                (grupe || [])
                    .filter(g => g.denumire.toLowerCase().includes('retras'))
                    .map(g => g.id)
            );
            const sportiviActivi = sportiviActiviBrut.filter(
                s => !s.grupa_id || !grupeRetrasi.has(s.grupa_id)
            );

            const today = new Date();
            const dataCurenta = today.toISOString().split('T')[0];
            const lunaText = today.toLocaleString('ro-RO', { month: 'long', year: 'numeric'});
            const lunaCurentaIdx = today.getMonth();
            const anulCurent = today.getFullYear();
            
            const platiToInsert: (Omit<Plata, 'id' | 'club_id'> & { club_id?: string | null })[] = [];
            const sportiviProcesati = new Set<string>();
    
            const familyIdsInClub = new Set(sportiviActivi.map(s => s.familie_id).filter(Boolean));
            const relevantFamilies = familii.filter(f => familyIdsInClub.has(f.id));
            
            relevantFamilies.forEach(familie => {
                const membriActiviInFamilie = sportiviActivi.filter(s => s.familie_id === familie.id);
                if (membriActiviInFamilie.length === 0) return;
    
                const exists = (plati || []).some(p => 
                    p.familie_id === familie.id && 
                    p.tip === 'Abonament' && 
                    new Date((p.data || '').toString().slice(0, 10)).getMonth() === lunaCurentaIdx && 
                    new Date((p.data || '').toString().slice(0, 10)).getFullYear() === anulCurent
                );
                if (exists) {
                    membriActiviInFamilie.forEach(m => sportiviProcesati.add(m.id));
                    return;
                }
    
                const nrMembri = membriActiviInFamilie.length;
                let abonamentConfig = (tipuriAbonament || []).find(ab => ab.numar_membri === nrMembri);
                if (!abonamentConfig && nrMembri > 1) {
                    abonamentConfig = [...(tipuriAbonament || [])].filter(ab => ab.numar_membri > 1).sort((a, b) => b.numar_membri - a.numar_membri)[0];
                }
    
                if (abonamentConfig) {
                    const creditFamilie = balances.famBalances.get(familie.id) || 0;
                    let sumaDeFacturat = abonamentConfig.pret;
                    let status: Plata['status'] = 'Neachitat';
                    let observatii = `Abonament pt: ${membriActiviInFamilie.map(m => m.prenume).join(', ')}.`;
                    if (creditFamilie >= sumaDeFacturat) { status = 'Achitat'; observatii += ` Stins automat din credit.`; } 
                    else if (creditFamilie > 0) { sumaDeFacturat -= creditFamilie; observatii += ` Parțial stins din credit.`; }
    
                    platiToInsert.push({ sportiv_id: null, familie_id: familie.id, suma: sumaDeFacturat, data: dataCurenta, status: status, descriere: `Abonament Familie ${lunaText}`, tip: 'Abonament', observatii: observatii, club_id: membriActiviInFamilie[0]?.club_id });
                    membriActiviInFamilie.forEach(m => sportiviProcesati.add(m.id));
                }
            });
    
            sportiviActivi.forEach(sportiv => {
                if (sportiviProcesati.has(sportiv.id) || sportiv.familie_id) return;
                const exists = (plati || []).some(p => p.sportiv_id === sportiv.id && p.tip === 'Abonament' && new Date((p.data || '').toString().slice(0, 10)).getMonth() === lunaCurentaIdx && new Date((p.data || '').toString().slice(0, 10)).getFullYear() === anulCurent);
                if (exists) return;
                const abonamentConfig = (tipuriAbonament || []).find(ab => ab.id === sportiv.tip_abonament_id)
                    || (tipuriAbonament || []).find(ab => ab.numar_membri === 1);
                if (abonamentConfig) {
                    const creditSportiv = balances.indivBalances.get(sportiv.id) || 0;
                    let sumaDeFacturat = abonamentConfig.pret;
                    let status: Plata['status'] = 'Neachitat';
                    let observatii = 'Generat automat.';
                    if (creditSportiv >= sumaDeFacturat) { status = 'Achitat'; observatii += ' Stins automat din credit.'; } 
                    else if (creditSportiv > 0) { sumaDeFacturat -= creditSportiv; observatii += ' Parțial stins din credit.'; }
                    platiToInsert.push({ sportiv_id: sportiv.id, familie_id: null, suma: sumaDeFacturat, data: dataCurenta, status: status, descriere: `Abonament ${lunaText}`, tip: 'Abonament', observatii: observatii, club_id: sportiv.club_id });
                }
            });
    
            if (platiToInsert.length > 0) {
                const { data, error: insertError } = await supabase.from('plati').insert(platiToInsert).select();
                if (insertError) { throw insertError; } 
                else if (data) { setPlati(prev => [...prev, ...data]); showSuccess("Generare Finalizată", `${data.length} facturi noi au fost generate.`); }
            } else {
                showSuccess("Info", "Nicio factură nouă de generat pentru luna curentă pentru sportivii din acest club.");
            }
    
        } catch (err: any) {
            console.error('DETALII EROARE:', JSON.stringify(err, null, 2));
            showError("Eroare la generare", err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingPlata || !supabase) return;
        setIsSaving(true);
        const { id, ...updates } = editingPlata;
        const { error } = await supabase.from('plati').update(updates).eq('id', id);
        setIsSaving(false);
        if(error) { 
            console.error('DETALII EROARE:', JSON.stringify(error, null, 2));
            showError("Eroare la Salvare", error.message); 
        }
        else { setPlati(prev => prev.map(p => p.id === id ? editingPlata : p)); setEditingPlata(null); }
    };
    
    const handleProcessPayment = async () => {
        if (!plataForPayment || !supabase) return;
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            showError("Sumă Invalidă", "Vă rugăm introduceți o sumă validă.");
            return;
        }

        setIsPaymentLoading(true);
        try {
            const { data, error } = await supabase.rpc('proceseaza_plata_factura', {
                p_plata_id: plataForPayment.id,
                p_suma_incasata: amount,
                p_metoda_plata: paymentMethod,
                p_data_plata: new Date().toISOString().split('T')[0]
            });

            if (error) throw error;
            
            const result = data as any;
            if (result && result.success) {
                showSuccess("Plată Procesată", "Plata a fost înregistrată cu succes.");
                
                // Update local plati state
                setPlati(prev => prev.map(p => p.id === plataForPayment.id ? { ...p, status: result.status_nou } : p));
                
                // We don't have setTranzactii here directly, but DataContext will handle it on next refresh
                // or we could use useData() to get setTranzactii if we really want to update it locally
                
                setPlataForPayment(null);
                setPaymentAmount('');
            } else {
                showError("Eroare", result?.error || "A apărut o eroare necunoscută.");
            }
        } catch (err: any) {
            console.error('DETALII EROARE:', JSON.stringify(err, null, 2));
            showError("Eroare la procesare", err.message);
        } finally {
            setIsPaymentLoading(false);
        }
    };

    const confirmDelete = async (id: string) => {
        if(!supabase) return;
        setIsDeleting(true);
        const { error } = await supabase.from('plati').delete().eq('id', id);
        setIsDeleting(false);
        if(error) { 
            console.error('DETALII EROARE:', JSON.stringify(error, null, 2));
            showError("Eroare la Ștergere", error.message); 
        }
        else { setPlati(prev => prev.filter(p => p.id !== id)); }
        setPlataToDelete(null);
    };
    
    const filteredPlati = useMemo(() => {
        const query = (filter.sportiv || '').toLowerCase().trim();
        
        let relevantFamilyIds = new Set<string>();
        let relevantSportivIds = new Set<string>();

        if (query) {
            (familii || []).forEach(f => {
                if (f.nume.toLowerCase().includes(query)) {
                    relevantFamilyIds.add(f.id);
                }
            });

            (sportivi || []).forEach(s => {
                const fullName = `${s.nume} ${s.prenume}`.toLowerCase();
                if (fullName.includes(query)) {
                    relevantSportivIds.add(s.id);
                    if (s.familie_id) {
                        relevantFamilyIds.add(s.familie_id);
                    }
                }
            });

            (sportivi || []).forEach(s => {
                if (s.familie_id && relevantFamilyIds.has(s.familie_id)) {
                    relevantSportivIds.add(s.id);
                }
            });
        }

        return (plati || []).filter(p => {
            const sportivPlata = p.sportiv_id ? (sportivi || []).find(s => s.id === p.sportiv_id) : null;
            const familiePlata = p.familie_id ? (familii || []).find(f => f.id === p.familie_id) : null;
            let clubId = sportivPlata?.club_id;
            if (!clubId && familiePlata) {
                const firstMember = (sportivi || []).find(s => s.familie_id === familiePlata.id);
                clubId = firstMember?.club_id;
            }

            if (filter.clubId && clubId !== filter.clubId) return false;
            
            let statusMatch = true;
            if (filter.status === 'scadent') {
                statusMatch = p.status === 'Neachitat' || p.status === 'Achitat Parțial';
            } else if (filter.status) {
                statusMatch = p.status === filter.status;
            }
            if (!statusMatch) return false;

            if (filter.tip && p.tip !== filter.tip) return false;
            
            if (query) {
                const isRelevantSportiv = p.sportiv_id && relevantSportivIds.has(p.sportiv_id);
                const isRelevantFamily = p.familie_id && relevantFamilyIds.has(p.familie_id);
                if (!isRelevantSportiv && !isRelevantFamily) return false;
            }

            return true;
        }).sort((a,b) => new Date((b.data || '').toString().slice(0, 10)).getTime() - new Date((a.data || '').toString().slice(0, 10)).getTime());
    }, [plati, sportivi, familii, filter]);

    const platiCuDetalii = useMemo(() => {
        if (!filteredPlati) return [];
        return filteredPlati.map(plata => {
            let descriereDetaliata = plata.descriere;
            let reducereDetalii = null;

            if (plata.tip === 'Taxa Examen') {
                const inscriere = (inscrieriExamene || []).find(i => i.plata_id === plata.id);
                const grad = inscriere ? (grade || []).find(g => g.id === inscriere.grad_sustinut_id) : null;
                if (grad) {
                    descriereDetaliata = `Taxă Examen - ${grad.nume}`;
                }
            }
            
            if (plata.reducere_id && plata.suma_initiala && plata.suma_initiala > plata.suma) {
                const reducere = (reduceri || []).find(r => r.id === plata.reducere_id);
                if (reducere) {
                    const valoareReducere = plata.suma_initiala - plata.suma;
                    reducereDetalii = {
                        nume: plata.reducere_detalii || reducere.nume,
                        valoare: valoareReducere,
                    };
                } else if (plata.reducere_detalii) {
                     reducereDetalii = {
                        nume: plata.reducere_detalii,
                        valoare: plata.suma_initiala - plata.suma,
                    };
                }
            }
            
            return {
                ...plata,
                descriereDetaliata,
                reducereDetalii
            };
        });
    }, [filteredPlati, inscrieriExamene, grade, reduceri]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(platiCuDetalii.map(p => p.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectRow = (id: string) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedIds(newSelection);
    };

    const handleIncasareClick = () => {
        const selected = platiCuDetalii.filter(p => selectedIds.has(p.id));
        onIncaseazaMultiple(selected);
    };

    const getEntityName = (plata: Plata) => {
        if (plata.familie_id) {
            const familie = (familii || []).find(f => f.id === plata.familie_id);
            return `Familia ${familie?.nume || 'N/A'}`;
        }
        if (plata.sportiv_id) {
            const s = (sportivi || []).find(sp => sp.id === plata.sportiv_id);
            return s ? `${s.nume} ${s.prenume}` : 'Sportiv Șters';
        }
        return 'N/A';
    };
    
    const handleNotifyOverdue = async () => {
        if (selectedIds.size === 0) return;
        setIsGenerating(true); // Reuse loading state
        
        try {
            const selectedPlati = platiCuDetalii.filter(p => selectedIds.has(p.id));
            const notifications = selectedPlati.map(p => {
                const sportiv = sportivi.find(s => s.id === p.sportiv_id);
                if (!sportiv?.user_id) return null;
                return {
                    recipient_user_id: sportiv.user_id,
                    title: 'Plată Scadentă',
                    body: `Ai o plată restantă: ${p.descriereDetaliata} în valoare de ${p.suma.toFixed(2)} RON. Te rugăm să achiți cât mai curând.`,
                    type: 'plata'
                };
            }).filter((n): n is NonNullable<typeof n> => n !== null);

            if (notifications.length > 0) {
                const result = await sendBulkNotifications(notifications);
                if (result.success) {
                    showSuccess("Succes", `Au fost trimise ${notifications.length} notificări către debitori.`);
                    setSelectedIds(new Set());
                } else {
                    throw new Error(result.error);
                }
            } else {
                showError("Eroare", "Niciunul dintre sportivii selectați nu are un cont de utilizator asociat pentru a primi notificări.");
            }
        } catch (err: any) {
            showError("Eroare la notificare", err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-4 md:space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
            <h1 className="text-xl md:text-2xl font-bold text-white uppercase tracking-tight">Management Facturi & Plăți</h1>

             <Card className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {permissions.isSuperAdmin && (
                    <ClubSelect
                        clubs={clubs || []}
                        value={filter.clubId}
                        onChange={e => setFilter(p => ({...p, clubId: e.target.value}))}
                        label="Filtrează Club"
                        renderOption={(c: Club) => c.id === FEDERATIE_ID ? FEDERATIE_NAME : c.nume}
                    />
                )}
                 <Select label="Status" name="status" value={filter.status} onChange={e => setFilter(p => ({...p, status: e.target.value}))}>
                    <option value="">Toate Statusurile</option>
                    <option value="scadent">Scadent (Neachitat/Parțial)</option>
                    <option value="Neachitat">Doar Neachitat</option>
                    <option value="Achitat Parțial">Doar Achitat Parțial</option>
                    <option value="Achitat">Achitat</option>
                </Select>
                <Select label="Tip Plată" name="tip" value={filter.tip} onChange={e => setFilter(p => ({...p, tip: e.target.value}))}>
                     <option value="">Toate Tipurile</option>
                     {[...new Set((plati || []).map(p=>p.tip))].sort().map(tip => <option key={tip || 'fara-tip'} value={tip || ''}>{tip || 'Fără tip'}</option>)}
                </Select>
                
                <SearchInput
                    label="Caută Sportiv / Familie"
                    value={filter.sportiv}
                    onChange={e => setFilter(p => ({...p, sportiv: e.target.value}))}
                    placeholder="Nume sportiv sau familie..."
                />

                <div className="flex items-end">
                    <Button variant="secondary" onClick={() => setFilter(initialFilters)} className="w-full">Resetează Filtre</Button>
                </div>
            </Card>

            <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                    {permissions.isAdminClub && <Button onClick={handleGenerateSubscriptions} variant="info" size="sm" isLoading={isGenerating} className="flex-1 sm:flex-none justify-center">Generează Abonamente</Button>}
                    {permissions.canManageFinances && selectedIds.size > 0 && (
                        <Button onClick={handleNotifyOverdue} variant="warning" size="sm" isLoading={isGenerating} className="flex-1 sm:flex-none justify-center">
                            <BellIcon className="w-4 h-4 mr-1"/>
                            Notifică {selectedIds.size} debitori
                        </Button>
                    )}
                </div>
                {permissions.canManageFinances && selectedIds.size > 0 && (
                    <Button onClick={handleIncasareClick} variant="success" className="w-full sm:w-auto justify-center font-bold bg-green-800 hover:bg-green-700">
                        <BanknotesIcon className="w-5 h-5 mr-2"/>
                        Încasează {selectedIds.size} facturi selectate
                    </Button>
                )}
            </div>

            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-700/50">
                            <tr>
                                <th className="p-3"><input type="checkbox" onChange={handleSelectAll} className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-brand-secondary focus:ring-brand-secondary" /></th>
                                <th className="p-3">Data</th><th className="p-3">Plătitor</th><th className="p-3">Descriere</th>
                                <th className="p-3 text-right">Sumă</th><th className="p-3 text-center">Status</th><th className="p-3 text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {platiCuDetalii.map(p => (
                                <tr key={p.id} className={`${selectedIds.has(p.id) ? 'bg-brand-primary/20' : ''}`}>
                                    <td className="p-3"><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => handleSelectRow(p.id)} className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-brand-secondary focus:ring-brand-secondary" /></td>
                                    <td className="p-3">{new Date((p.data || '').toString().slice(0, 10)).toLocaleDateString('ro-RO')}</td>
                                    <td className="p-3 font-medium text-white hover:text-brand-primary hover:underline cursor-pointer" onClick={() => { if(p.sportiv_id) onViewSportiv(sportivi.find(s=>s.id === p.sportiv_id)!) }}>{getEntityName(p)}</td>
                                    <td className="p-3"><div className="font-medium text-white">{p.descriereDetaliata}</div>{p.reducereDetalii && <div className="text-xs text-slate-400">Aplicat: {p.reducereDetalii.nume}</div>}</td>
                                    <td className="p-3 text-right">
                                        <div className="font-bold text-white">{p.suma.toFixed(2)} RON</div>
                                        {p.reducereDetalii && p.suma_initiala && (
                                            <div className="text-xs text-slate-400">
                                                <span className="line-through">{p.suma_initiala.toFixed(2)}</span>
                                                <span className="text-red-400 ml-1">(-{p.reducereDetalii.valoare.toFixed(2)})</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ p.status === 'Achitat' ? 'bg-green-100 text-green-800' : p.status === 'Achitat Parțial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{p.status}</span></td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            {p.status !== 'Achitat' && (
                                                <Button size="sm" variant="success" onClick={() => {
                                                    setPlataForPayment(p);
                                                    setPaymentAmount(p.suma.toString());
                                                }} title="Încasează Rapid">
                                                    <WalletIcon className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <Button size="sm" variant="secondary" onClick={() => setEditingPlata(p)}><EditIcon className="w-4 h-4"/></Button>
                                            <Button size="sm" variant="danger" onClick={() => setPlataToDelete(p)}><TrashIcon className="w-4 h-4"/></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {platiCuDetalii.length === 0 && (
                        <div className="p-12 text-center text-slate-500 italic">
                            <p>Nicio factură de afișat conform filtrelor.</p>
                            {(plati || []).length > 0 && <p className="text-xs mt-2">Există {(plati || []).length} plăți în total, dar sunt ascunse de filtre.</p>}
                        </div>
                     )}
                </div>
            </Card>
            
            {plataForPayment && (
                <Modal isOpen={!!plataForPayment} onClose={() => setPlataForPayment(null)} title="Procesează Plată Factură">
                    <div className="space-y-4">
                        <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                            <p className="text-sm text-slate-400">Factură: <span className="text-white font-medium">{plataForPayment.descriere}</span></p>
                            <p className="text-sm text-slate-400">Total de plată: <span className="text-white font-bold">{plataForPayment.suma.toFixed(2)} RON</span></p>
                        </div>

                        <Input 
                            label="Sumă Încasată (RON)" 
                            type="number" 
                            step="0.01" 
                            value={paymentAmount} 
                            onChange={e => setPaymentAmount(e.target.value)} 
                            required 
                        />

                        <Select label="Metodă Plată" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)}>
                            <option value="Cash">Cash</option>
                            <option value="Transfer Bancar">Transfer Bancar</option>
                        </Select>

                        <div className="flex justify-end pt-4 gap-2 border-t border-slate-700">
                            <Button variant="secondary" onClick={() => setPlataForPayment(null)} disabled={isPaymentLoading}>Anulează</Button>
                            <Button variant="success" onClick={handleProcessPayment} isLoading={isPaymentLoading}>Înregistrează Plata</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {editingPlata && (
                <Modal isOpen={!!editingPlata} onClose={() => setEditingPlata(null)} title="Editează Plată">
                    <div className="space-y-4"><Input label="Descriere" value={editingPlata.descriere} onChange={e => setEditingPlata({...editingPlata, descriere: e.target.value})} /><Input label="Sumă" type="number" value={editingPlata.suma} onChange={e => setEditingPlata({...editingPlata, suma: parseFloat(e.target.value) || 0})} /><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEditingPlata(null)}>Anulează</Button><Button variant="success" onClick={handleSaveEdit} isLoading={isSaving}>Salvează</Button></div></div>
                </Modal>
            )}
            <ConfirmDeleteModal isOpen={!!plataToDelete} onClose={() => setPlataToDelete(null)} onConfirm={() => { if(plataToDelete) confirmDelete(plataToDelete.id) }} tableName="Plată" isLoading={isDeleting} />
        </div>
    );
};