import React, { useState, useMemo, useEffect } from 'react';
import { Plata, IstoricPlataDetaliat, Sportiv, User, TipPlata, Familie, Tranzactie, Reducere, PretConfig, TipAbonament } from '../../types';
import { Button, Card, Input, Select, Modal, SearchInput } from '../ui';
import { ArrowLeftIcon, PlusIcon, EditIcon, TrashIcon, WalletIcon, CheckCircleIcon, EyeIcon } from '../icons';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { ResponsiveTable, Column } from '../ResponsiveTable';
import { useData } from '../../contexts/DataContext';
import { getPretValabil, getPretProdus } from '../../utils/pricing';
import { formatNume } from '../../utils/formatareSportiv';
import { getDisplayStatus, STATUS_DISPLAY_CONFIG } from '../../utils/paymentStatus';
import { PeriodFilterBar } from './PeriodFilterBar';
import { FacturaChitantaModal } from './FacturaChitantaModal';

interface GestiuneFacturiProps {
    onBack: () => void;
    currentUser: User;
    sportivi: Sportiv[];
    plati: Plata[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    setTranzactii?: React.Dispatch<React.SetStateAction<Tranzactie[]>>;
    tipuriPlati: TipPlata[];
    familii: Familie[];
    onViewSportiv?: (sportiv: Sportiv) => void;
}

const initialFormState = {
    sportiv_id: '',
    suma: '',
    suma_initiala: '',
    reducere_id: '',
    descriere: '',
    tip: 'Abonament',
    data: new Date().toISOString().split('T')[0],
    isDirectPayment: false,
    metoda_plata: 'Cash' as 'Cash' | 'Transfer Bancar',
};

export const GestiuneFacturi: React.FC<GestiuneFacturiProps> = ({ onBack, currentUser, sportivi, plati, setPlati, setTranzactii, tipuriPlati, familii, onViewSportiv }) => {
    const { showError, showSuccess } = useError();
    const { preturiConfig, tipuriAbonament, reduceri } = useData();
    const [formState, setFormState] = useState(initialFormState);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [selectedEchipament, setSelectedEchipament] = useState('');
    const [selectedMarimeId, setSelectedMarimeId] = useState('');

    const [plataToEdit, setPlataToEdit] = useState<Plata | null>(null);
    const [editStatus, setEditStatus] = useState<Plata['status']>('Neachitat');
    const [editSumaTotal, setEditSumaTotal] = useState('');
    const [editSumaRamasa, setEditSumaRamasa] = useState('');
    const [isEditLoading, setIsEditLoading] = useState(false);

    const [plataToDelete, setPlataToDelete] = useState<Plata | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [plataForPayment, setPlataForPayment] = useState<Plata | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Transfer Bancar'>('Cash');
    const [isPaymentLoading, setIsPaymentLoading] = useState(false);

    const [plataForView, setPlataForView] = useState<Plata | null>(null);
    const [periodFilter, setPeriodFilter] = useState({ startDate: '', endDate: '' });

    const clubSportivi = useMemo(() => [...sportivi].sort((a, b) => a.nume.localeCompare(b.nume, 'ro-RO')), [sportivi]);
    
    const clubPlati = useMemo(() => {
        return [...plati].sort((a, b) => new Date((b.data || '').toString().slice(0, 10)).getTime() - new Date((a.data || '').toString().slice(0, 10)).getTime());
    }, [plati]);

    const echipamenteDisponibile = useMemo(() => [...new Set(preturiConfig.filter(p => p.categorie === 'Echipament').map(p => p.denumire_serviciu))], [preturiConfig]);
    const marimiDisponibile = useMemo(() => preturiConfig.filter(p => p.categorie === 'Echipament' && p.denumire_serviciu === selectedEchipament), [preturiConfig, selectedEchipament]);

    // Auto-calculation logic (similar to JurnalIncasari)
    useEffect(() => {
        const sportiv = sportivi.find(s => s.id === formState.sportiv_id);
        if (!sportiv) return;

        const lunaText = new Date(formState.data).toLocaleString('ro-RO', { month: 'long', year: 'numeric'});
        const systemTypes: PretConfig['categorie'][] = ['Taxa Examen', 'Taxa Stagiu', 'Taxa Competitie', 'Echipament'];
        
        let calculatedPrice = 0;
        let description = '';

        if (formState.tip === 'Abonament') {
            let config;
            if (sportiv.familie_id) {
                const nr = sportivi.filter(s => s.familie_id === sportiv.familie_id && s.status === 'Activ').length;
                config = tipuriAbonament.find(ab => ab.numar_membri === nr) || tipuriAbonament.find(ab => ab.numar_membri === 1);
            } else {
                config = tipuriAbonament.find(ab => ab.id === sportiv.tip_abonament_id);
            }
            calculatedPrice = config?.pret || 0;
            description = config ? `Abonament ${config.denumire} ${lunaText}` : '';
        } else if (formState.tip === 'Echipament' && selectedMarimeId) {
            const config = preturiConfig.find(p => p.id === selectedMarimeId);
            if (config) {
                calculatedPrice = config.suma;
                description = `${config.denumire_serviciu}`;
            }
        } else if (systemTypes.includes(formState.tip as any)) {
            const config = getPretValabil(preturiConfig, formState.tip as any, formState.data);
            calculatedPrice = config?.suma || 0;
            description = config?.denumire_serviciu || '';
        }

        // Apply automatic discount if available
        const activeDiscounts = reduceri.filter(r => r.este_activa && (r.categorie_aplicabila === formState.tip || r.categorie_aplicabila === 'Toate'));
        let finalPrice = calculatedPrice;
        let reducereId = '';

        if (activeDiscounts.length > 0) {
            const discount = activeDiscounts[0];
            reducereId = discount.id;
            if (discount.tip === 'procent') {
                finalPrice = calculatedPrice * (1 - discount.valoare / 100);
            } else {
                finalPrice = Math.max(0, calculatedPrice - discount.valoare);
            }
        }

        setFormState(prev => ({
            ...prev,
            suma: finalPrice.toString(),
            suma_initiala: calculatedPrice.toString(),
            reducere_id: reducereId,
            descriere: prev.descriere || description
        }));

    }, [formState.sportiv_id, formState.tip, formState.data, selectedMarimeId, sportivi, preturiConfig, tipuriAbonament, reduceri]);

    const getEntityName = (plata: Plata) => {
        if (plata.familie_id) {
            const familie = (familii || []).find(f => f.id === plata.familie_id);
            return `Familia ${familie?.nume || 'N/A'}`;
        }
        if (plata.sportiv_id) {
            const s = sportivi.find(sp => sp.id === plata.sportiv_id);
            if (s) return formatNume(s);
            if (plata.sportiv_nume) return `${plata.sportiv_nume} ${plata.sportiv_prenume || ''}`.trim();
            return 'Sportiv Șters';
        }
        return 'N/A';
    };

    const filteredPlati = useMemo(() => {
        const query = searchQuery.toLowerCase();
        const { startDate, endDate } = periodFilter;
        return clubPlati.filter(p => {
            const entityName = getEntityName(p).toLowerCase();
            const desc = p.descriere.toLowerCase();
            if (!entityName.includes(query) && !desc.includes(query)) return false;
            if (startDate || endDate) {
                const d = p.data ? new Date(p.data.toString().slice(0, 10)) : null;
                if (!d || isNaN(d.getTime())) return false;
                if (startDate && d < new Date(startDate)) return false;
                if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59, 999); if (d > e) return false; }
            }
            return true;
        });
    }, [clubPlati, searchQuery, sportivi, familii, periodFilter]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormState(prev => ({ ...prev, [name]: val }));
    };

    const handleAddFactura = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) { showError("Eroare", "Client Supabase neconfigurat."); return; }
        
        const sumaNum = parseFloat(formState.suma);
        const sumaInitNum = parseFloat(formState.suma_initiala) || sumaNum;

        if (!formState.sportiv_id || !formState.descriere || isNaN(sumaNum) || sumaNum < 0) {
            showError("Date Invalide", "Vă rugăm completați toate câmpurile cu date valide.");
            return;
        }

        const sportivSelectat = sportivi.find(s => s.id === formState.sportiv_id);
        if (!sportivSelectat) {
             showError("Eroare", "Sportivul selectat nu a fost găsit.");
            return;
        }

        setLoading(true);
        try {
            const reducere = reduceri.find(r => r.id === formState.reducere_id);
            
            const newPlata: Omit<Plata, 'id' | 'club_id'> & { club_id?: string | null } = {
                sportiv_id: formState.sportiv_id,
                familie_id: sportivSelectat.familie_id,
                club_id: sportivSelectat.club_id || currentUser.club_id,
                suma: sumaNum,
                suma_initiala: sumaInitNum,
                reducere_id: formState.reducere_id || null,
                reducere_detalii: reducere?.nume || null,
                data: formState.data,
                status: formState.isDirectPayment ? 'Achitat' : 'Neachitat',
                descriere: formState.descriere,
                tip: formState.tip,
                observatii: formState.isDirectPayment ? 'Încasat direct la emitere' : 'Generat manual de admin'
            };

            const { data: plataData, error: plataError } = await supabase.from('plati').insert(newPlata).select().maybeSingle();
            
            if (plataError) throw plataError;
            if (!plataData) throw new Error("Nu s-a putut crea factura.");

            if (formState.isDirectPayment && plataData) {
                // Create transaction as well
                const { error: txError } = await supabase.from('tranzactii').insert({
                    plata_ids: [plataData.id],
                    sportiv_id: plataData.sportiv_id,
                    familie_id: plataData.familie_id,
                    suma: sumaNum,
                    data_platii: formState.data,
                    metoda_plata: formState.metoda_plata,
                    descriere: `Încasare directă: ${plataData.descriere}`,
                    club_id: plataData.club_id
                });
                if (txError) throw txError;
            }

            setPlati(prev => [plataData, ...prev]);
            setFormState(initialFormState);
            setSelectedEchipament('');
            setSelectedMarimeId('');
            showSuccess("Succes", formState.isDirectPayment ? "Factura a fost emisă și încasată." : "Factura a fost adăugată.");
        } catch (error: any) {
            console.error('DETALII EROARE:', JSON.stringify(error, null, 2));
            showError("Eroare", error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEdit = (plata: Plata) => {
        setPlataToEdit(plata);
        setEditStatus(plata.status);
        setEditSumaTotal((plata.suma_initiala ?? plata.suma).toFixed(2));
        setEditSumaRamasa(plata.suma.toFixed(2));
    };

    const handleSaveEdit = async () => {
        if (!plataToEdit || !supabase) return;
        const sumaTotal = parseFloat(editSumaTotal);
        const sumaRamasa = parseFloat(editSumaRamasa);
        if (isNaN(sumaTotal) || sumaTotal < 0 || isNaN(sumaRamasa) || sumaRamasa < 0) {
            showError("Sume invalide", "Introduceți valori numerice pozitive.");
            return;
        }
        if (sumaRamasa > sumaTotal) {
            showError("Sumă invalidă", "Suma rămasă nu poate depăși suma totală.");
            return;
        }
        setIsEditLoading(true);
        const { data, error } = await supabase.from('plati').update({
            status: editStatus,
            suma_initiala: sumaTotal,
            suma: sumaRamasa,
        }).eq('id', plataToEdit.id).select().maybeSingle();
        setIsEditLoading(false);

        if (error) {
            console.error('DETALII EROARE:', JSON.stringify(error, null, 2));
            showError("Eroare la modificare", error.message);
        } else if (data) {
            setPlati(prev => prev.map(p => p.id === data.id ? data : p));
            setPlataToEdit(null);
            showSuccess("Succes", "Factura a fost actualizată.");
        }
    };

    const handleDelete = async () => {
        if (!plataToDelete || !supabase) return;
        setIsDeleting(true);

        // Verifică dacă plata este referențiată de înscrieri la examene
        const { data: inscrieri, error: inscrieriError } = await supabase
            .from('inscrieri_examene')
            .select('id')
            .eq('plata_id', plataToDelete.id)
            .limit(1);
        if (inscrieriError) {
            setIsDeleting(false);
            console.error('DETALII EROARE:', JSON.stringify(inscrieriError, null, 2));
            showError("Eroare la ștergere", inscrieriError.message);
            return;
        }
        if (inscrieri && inscrieri.length > 0) {
            setIsDeleting(false);
            showError(
                "Ștergere imposibilă",
                "Plata nu poate fi ștearsă — este asociată cu înscrieri la examene. Modificați sau retrageți înscrierea înainte de a șterge factura."
            );
            return;
        }

        const { error } = await supabase.from('plati').delete().eq('id', plataToDelete.id);
        setIsDeleting(false);

        if (error) {
            console.error('DETALII EROARE:', JSON.stringify(error, null, 2));
            showError("Eroare la ștergere", error.message);
        } else {
            setPlati(prev => prev.filter(p => p.id !== plataToDelete.id));
            setPlataToDelete(null);
            showSuccess("Succes", "Factura a fost ștearsă.");
        }
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
                
                // Update local tranzactii state if setter is provided
                if (setTranzactii && result.tranzactie_id) {
                    // We need to fetch the full transaction or construct it
                    const { data: newTranzactie } = await supabase.from('tranzactii').select('*').eq('id', result.tranzactie_id).maybeSingle();
                    if (newTranzactie) {
                        setTranzactii(prev => [newTranzactie, ...prev]);
                    }
                }

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

    const columns: Column<Plata>[] = [
        {
            key: 'data',
            label: 'Data',
            render: (p) => <span className="text-slate-300">{new Date((p.data || '').toString().slice(0, 10)).toLocaleDateString('ro-RO')}</span>
        },
        {
            key: 'sportiv_id',
            label: 'Sportiv/Familie',
            render: (p) => {
                if (p.sportiv_id && onViewSportiv) {
                    const s = sportivi.find(sp => sp.id === p.sportiv_id);
                    return (
                        <button type="button" className="font-medium text-white hover:text-brand-primary hover:underline cursor-pointer text-left" onClick={() => { if (s) onViewSportiv(s); }}>
                            {getEntityName(p)}
                        </button>
                    );
                }
                return <span className="font-medium text-white">{getEntityName(p)}</span>;
            }
        },
        {
            key: 'descriere',
            label: 'Descriere',
            render: (p) => <span className="text-slate-400">{p.descriere}</span>
        },
        {
            key: 'suma',
            label: 'Sumă / Rest',
            headerClassName: 'text-right',
            cellClassName: 'text-right',
            render: (p) => (
                <div className="text-right">
                    <div className="font-bold text-white">{p.suma.toFixed(2)} lei</div>
                    {p.suma_initiala && p.suma_initiala > p.suma && (
                        <div className="text-[10px] text-slate-400 line-through">
                            {p.suma_initiala.toFixed(2)} lei
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'incasat',
            label: 'Încasat',
            headerClassName: 'text-right',
            cellClassName: 'text-right',
            render: (p) => {
                const incasat = (p.suma_initiala || p.suma) - p.suma;
                return (
                    <div className="text-right font-medium text-emerald-400">
                        {incasat.toFixed(2)} lei
                    </div>
                );
            }
        },
        {
            key: 'status',
            label: 'Status',
            headerClassName: 'text-center',
            cellClassName: 'text-center',
            render: (p) => {
                const ds = getDisplayStatus(p);
                const cfg = STATUS_DISPLAY_CONFIG[ds];
                return (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cfg.cls}`}>
                        {cfg.label}
                    </span>
                );
            }
        },
        {
            key: 'actions',
            label: 'Acțiuni',
            headerClassName: 'text-right',
            cellClassName: 'text-right',
            render: (p) => (
                <div className="flex justify-end gap-2">
                    {p.status !== 'Achitat' && (
                        <Button size="sm" variant="success" onClick={() => {
                            setPlataForPayment(p);
                            setPaymentAmount(p.suma.toString());
                        }} title="Încasează">
                            <WalletIcon className="w-4 h-4" />
                        </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => setPlataForView(p)} title="Vizualizează factura"><EyeIcon className="w-4 h-4" /></Button>
                    <Button size="sm" variant="secondary" onClick={() => handleOpenEdit(p)} title="Editează"><EditIcon className="w-4 h-4" /></Button>
                    <Button size="sm" variant="danger" onClick={() => setPlataToDelete(p)} title="Șterge"><TrashIcon className="w-4 h-4" /></Button>
                </div>
            )
        }
    ];

    const renderMobileItem = (p: Plata) => (
        <Card className="mb-4 border-l-4 border-indigo-500">
            <div className="flex justify-between items-start mb-2">
                <div>
                    {p.sportiv_id && onViewSportiv ? (
                        <button type="button" className="font-bold text-white text-lg hover:text-brand-primary hover:underline cursor-pointer text-left" onClick={() => { const s = sportivi.find(sp => sp.id === p.sportiv_id); if (s) onViewSportiv(s); }}>{getEntityName(p)}</button>
                    ) : (
                        <p className="font-bold text-white text-lg">{getEntityName(p)}</p>
                    )}
                    <p className="text-sm text-slate-400">{new Date((p.data || '').toString().slice(0, 10)).toLocaleDateString('ro-RO')}</p>
                </div>
                {(() => { const ds = getDisplayStatus(p); const cfg = STATUS_DISPLAY_CONFIG[ds]; return (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cfg.cls}`}>
                        {cfg.label}
                    </span>
                ); })()}
            </div>
            
            <div className="mt-2 grid grid-cols-2 gap-2">
                <p className="text-sm text-slate-300"><span className="text-slate-500">Descriere:</span> {p.descriere}</p>
                <p className="text-sm font-bold text-white text-right"><span className="text-slate-500 font-normal">Rest:</span> {p.suma.toFixed(2)} lei</p>
                <p className="text-sm text-slate-300"><span className="text-slate-500">Tip:</span> {p.tip}</p>
                <p className="text-sm font-bold text-emerald-400 text-right"><span className="text-slate-500 font-normal">Încasat:</span> {((p.suma_initiala || p.suma) - p.suma).toFixed(2)} lei</p>
            </div>

            <div className="flex flex-wrap justify-end gap-2 mt-4 pt-2 border-t border-slate-700">
                {p.status !== 'Achitat' && (
                    <Button size="sm" variant="success" onClick={() => {
                        setPlataForPayment(p);
                        setPaymentAmount(p.suma.toString());
                    }} className="flex-1 justify-center">
                        <WalletIcon className="w-4 h-4 mr-2" /> Încasează
                    </Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => setPlataForView(p)} className="flex-1 justify-center"><EyeIcon className="w-4 h-4 mr-2" /> Vizualizează</Button>
                <Button size="sm" variant="secondary" onClick={() => handleOpenEdit(p)} className="flex-1 justify-center"><EditIcon className="w-4 h-4 mr-2" /> Editează</Button>
                <Button size="sm" variant="danger" onClick={() => setPlataToDelete(p)} className="flex-1 justify-center"><TrashIcon className="w-4 h-4 mr-2" /> Șterge</Button>
            </div>
        </Card>
    );

    return (
        <div className="space-y-4 md:space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
            <h1 className="text-xl md:text-2xl font-bold text-white uppercase tracking-tight">Gestiune Facturi Manuale</h1>

            <Card className="p-6 border-brand-primary/20 bg-slate-800/50">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <PlusIcon className="w-5 h-5 text-brand-primary" />
                    Adaugă Factură Nouă
                </h2>
                <form onSubmit={handleAddFactura} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Select label="Sportiv" name="sportiv_id" value={formState.sportiv_id} onChange={handleFormChange} required>
                        <option value="">Selectează Sportiv</option>
                        {clubSportivi.map(s => <option key={s.id} value={s.id}>{formatNume(s)}</option>)}
                    </Select>
                    
                    <Select label="Tip Factură" name="tip" value={formState.tip} onChange={handleFormChange} required>
                        <option value="Abonament">Abonament</option>
                        <option value="Taxa Examen">Taxă Examen</option>
                        <option value="Taxa Stagiu">Taxă Stagiu</option>
                        <option value="Taxa Competitie">Taxă Competiție</option>
                        <option value="Echipament">Echipament</option>
                        <option value="Altele">Altele</option>
                    </Select>

                    {formState.tip === 'Echipament' && (
                        <>
                            <Select label="Echipament" value={selectedEchipament} onChange={e => setSelectedEchipament(e.target.value)}>
                                <option value="">Selectează Echipament</option>
                                {echipamenteDisponibile.map(e => <option key={e} value={e}>{e}</option>)}
                            </Select>
                            <Select label="Mărime" value={selectedMarimeId} onChange={e => setSelectedMarimeId(e.target.value)} disabled={!selectedEchipament}>
                                <option value="">Selectează Mărime</option>
                                {marimiDisponibile.map(m => <option key={m.id} value={m.id}>{m.specificatii?.marime || m.specificatii?.inaltimeMin + 'cm'}</option>)}
                            </Select>
                        </>
                    )}

                    <Input label="Data" name="data" type="date" value={formState.data} onChange={handleFormChange} required />
                    
                    <div className="grid grid-cols-2 gap-2">
                        <Input label="Sumă Listă" name="suma_initiala" type="number" step="0.01" value={formState.suma_initiala} onChange={handleFormChange} required />
                        <Input label="Sumă Finală" name="suma" type="number" step="0.01" value={formState.suma} onChange={handleFormChange} required />
                    </div>

                    <Select label="Reducere Aplicată" name="reducere_id" value={formState.reducere_id} onChange={handleFormChange}>
                        <option value="">Fără Reducere</option>
                        {reduceri.filter(r => r.este_activa).map(r => <option key={r.id} value={r.id}>{r.nume} ({r.tip === 'procent' ? `-${r.valoare}%` : `-${r.valoare} RON`})</option>)}
                    </Select>

                    <div className="lg:col-span-2">
                        <Input label="Descriere Factură" name="descriere" value={formState.descriere} onChange={handleFormChange} placeholder="Ex: Abonament Octombrie 2023" required />
                    </div>

                    <div className="lg:col-span-3 p-4 bg-slate-700/30 rounded-lg border border-slate-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formState.isDirectPayment ? 'bg-brand-primary border-brand-primary' : 'border-slate-500 group-hover:border-brand-primary'}`}>
                                    {formState.isDirectPayment && <CheckCircleIcon className="w-4 h-4 text-white" />}
                                    <input type="checkbox" name="isDirectPayment" checked={formState.isDirectPayment} onChange={handleFormChange} className="hidden" />
                                </div>
                                <span className="text-sm font-medium text-white">Încasează pe loc (Generează și Tranzacție)</span>
                            </label>

                            {formState.isDirectPayment && (
                                <Select label="" name="metoda_plata" value={formState.metoda_plata} onChange={handleFormChange} className="!mt-0 min-w-[150px]">
                                    <option value="Cash">Cash</option>
                                    <option value="Transfer Bancar">Transfer Bancar</option>
                                </Select>
                            )}
                        </div>
                        <Button type="submit" variant="success" isLoading={loading} className="w-full md:w-auto">
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Emite Factura
                        </Button>
                    </div>
                </form>
            </Card>

            <Card className="p-0 overflow-hidden">
                <div className="p-4 bg-slate-700/50 flex flex-col gap-3">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <span className="font-bold text-white">Facturi Recente</span>
                        <SearchInput
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Caută după nume sau descriere..."
                            containerClassName="w-full md:w-64"
                        />
                    </div>
                    <PeriodFilterBar
                        startDate={periodFilter.startDate}
                        endDate={periodFilter.endDate}
                        onChange={(startDate, endDate) => setPeriodFilter({ startDate, endDate })}
                    />
                </div>
                <div className="overflow-x-auto max-h-[60vh]">
                    <ResponsiveTable
                        columns={columns}
                        data={filteredPlati}
                        renderMobileItem={renderMobileItem}
                    />
                    {filteredPlati.length === 0 && <p className="p-12 text-center text-slate-500 italic">Nicio factură găsită.</p>}
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

            {plataToEdit && (
                <Modal isOpen={!!plataToEdit} onClose={() => setPlataToEdit(null)} title="Editează Factură">
                    <div className="space-y-4">
                        <p className="text-slate-300 text-sm">Factură: <strong className="text-white">{plataToEdit.descriere}</strong></p>

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Sumă Totală Factură (RON)"
                                type="number"
                                step="0.01"
                                min="0"
                                value={editSumaTotal}
                                onChange={e => setEditSumaTotal(e.target.value)}
                            />
                            <Input
                                label="Sumă Rămasă de Plată (RON)"
                                type="number"
                                step="0.01"
                                min="0"
                                value={editSumaRamasa}
                                onChange={e => setEditSumaRamasa(e.target.value)}
                            />
                        </div>
                        <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700 text-sm text-slate-400 flex justify-between">
                            <span>Suma încasată (calculat):</span>
                            <span className="text-emerald-400 font-bold">
                                {Math.max(0, (parseFloat(editSumaTotal) || 0) - (parseFloat(editSumaRamasa) || 0)).toFixed(2)} RON
                            </span>
                        </div>

                        <Select label="Status" value={editStatus} onChange={e => setEditStatus(e.target.value as Plata['status'])}>
                            <option value="Neachitat">Neachitat</option>
                            <option value="Achitat Parțial">Achitat Parțial</option>
                            <option value="Achitat">Achitat</option>
                        </Select>

                        <div className="flex justify-end pt-4 gap-2 border-t border-slate-700">
                            <Button variant="secondary" onClick={() => setPlataToEdit(null)} disabled={isEditLoading}>Anulează</Button>
                            <Button variant="success" onClick={handleSaveEdit} isLoading={isEditLoading}>Salvează Modificările</Button>
                        </div>
                    </div>
                </Modal>
            )}

            <ConfirmDeleteModal
                isOpen={!!plataToDelete}
                onClose={() => setPlataToDelete(null)}
                onConfirm={handleDelete}
                tableName="factură"
                isLoading={isDeleting}
            />

            {plataForView && (() => {
                const s = sportivi.find(sp => sp.id === plataForView.sportiv_id);
                const f = familii.find(fam => fam.id === plataForView.familie_id);
                const entityName = s ? formatNume(s) : f ? `Familia ${f.nume}` : plataForView.sportiv_nume ? `${plataForView.sportiv_nume} ${plataForView.sportiv_prenume || ''}`.trim() : '—';
                const sumaTotal = plataForView.suma_initiala ?? plataForView.suma;
                const incasat = sumaTotal - plataForView.suma;
                const plataIstoric: IstoricPlataDetaliat = {
                    plata_id: plataForView.id,
                    sportiv_id: plataForView.sportiv_id,
                    familie_id: plataForView.familie_id,
                    nume_complet_sportiv: entityName,
                    descriere: plataForView.descriere,
                    suma_datorata: sumaTotal,
                    status: plataForView.status,
                    data_emitere: plataForView.data,
                    total_incasat: incasat,
                    rest_de_plata: plataForView.suma,
                    tranzactie_id: null,
                    data_plata_string: null,
                    suma_incasata: incasat > 0 ? incasat : null,
                    metoda_plata: null,
                };
                return (
                    <FacturaChitantaModal
                        mode="factura"
                        plata={plataIstoric}
                        sportiv={s}
                        familie={f}
                        onClose={() => setPlataForView(null)}
                    />
                );
            })()}
        </div>
    );
};