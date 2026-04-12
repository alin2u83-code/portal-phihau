import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { User, Sportiv, Plata, TaxaAnualeConfig, VizaSportiv } from '../types';
import { Button, Card, Input, Modal, Select } from './ui';
import { ArrowLeftIcon, CogIcon, BanknotesIcon, PlusIcon, CheckCircleIcon, XCircleIcon, SearchIcon, TrashIcon, CalendarIcon, DownloadIcon, PrinterIcon } from './icons';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { useData } from '../contexts/DataContext';
import { ResponsiveTable, Column } from './ResponsiveTable';

interface TaxeAnualeProps {
    onBack: () => void;
    currentUser: User;
    sportivi: Sportiv[];
    plati: Plata[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
}

// Formatare dată în format românesc: "01 Ian 2026"
function formatDataRo(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Titlu sigur pentru o taxă — evită "undefined" când câmpul `an` lipsește
function getTitluTaxa(taxa: TaxaAnualeConfig): string {
    if (taxa.descriere && taxa.descriere.trim() !== '') return taxa.descriere;
    if (taxa.an != null) return `Taxă Anuală ${taxa.an}`;
    return 'Taxă Anuală';
}

const TaxaCard: React.FC<{
    taxa: TaxaAnualeConfig;
    onUpdate: (id: string, updates: Partial<TaxaAnualeConfig>) => void;
    onDelete: (taxa: TaxaAnualeConfig) => void;
    onGenerate: (taxa: TaxaAnualeConfig) => void;
    onViewStatus: (taxa: TaxaAnualeConfig) => void;
    canManage: boolean;   // SUPER_ADMIN_FEDERATIE: poate edita/șterge/adăuga
    canGenerate: boolean; // ADMIN_CLUB + SUPER_ADMIN: poate genera facturi
}> = ({ taxa, onUpdate, onDelete, onGenerate, onViewStatus, canManage, canGenerate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editState, setEditState] = useState(taxa);
    const { showError } = useError();

    const handleSave = () => {
        if (editState.suma <= 0) {
            showError("Valoare Invalidă", "Suma trebuie să fie un număr pozitiv.");
            return;
        }
        onUpdate(taxa.id, editState);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditState(taxa);
        setIsEditing(false);
    };

    const perioadaText = useMemo(() => {
        if (!taxa.data_inceput && !taxa.data_sfarsit) return null;
        const start = formatDataRo(taxa.data_inceput);
        const end = formatDataRo(taxa.data_sfarsit);
        if (start && end) return `${start} – ${end}`;
        if (start) return `Din ${start}`;
        if (end) return `Până la ${end}`;
        return null;
    }, [taxa.data_inceput, taxa.data_sfarsit]);

    return (
        <Card className="flex flex-col bg-slate-800/50 border-slate-700 hover:border-brand-secondary transition-colors">
            <div className="flex justify-between items-start gap-2">
                <div className="flex-grow min-w-0">
                    {isEditing ? (
                        <Input label="Descriere" value={editState.descriere || ''} onChange={e => setEditState({...editState, descriere: e.target.value})} />
                    ) : (
                        <h3 className="text-xl font-bold text-white break-words">{getTitluTaxa(taxa)}</h3>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-primary/20 text-brand-secondary border border-brand-secondary/30">
                            Anul {taxa.an ?? '—'}
                        </span>
                        {taxa.club_id ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30 uppercase">Club Specific</span>
                        ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 uppercase">Federat</span>
                        )}
                    </div>

                    {/* Perioadă de validitate */}
                    {!isEditing && perioadaText && (
                        <div className="flex items-center gap-1.5 mt-2">
                            <CalendarIcon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                            <span className="text-xs text-slate-400">Valabilă: {perioadaText}</span>
                        </div>
                    )}

                    {/* Câmpuri editare perioadă — doar SUPER_ADMIN */}
                    {isEditing && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <Input
                                label="Dată început"
                                type="date"
                                value={editState.data_inceput || ''}
                                onChange={e => setEditState({...editState, data_inceput: e.target.value || null})}
                            />
                            <Input
                                label="Dată sfârșit"
                                type="date"
                                value={editState.data_sfarsit || ''}
                                onChange={e => setEditState({...editState, data_sfarsit: e.target.value || null})}
                            />
                        </div>
                    )}
                </div>

                {/* Butoane editare/ștergere — doar SUPER_ADMIN_FEDERATIE */}
                {canManage && (
                    <div className="flex gap-2 flex-shrink-0">
                        {isEditing ? (
                            <>
                                <Button variant="secondary" size="sm" onClick={handleCancel}>Anulează</Button>
                                <Button variant="success" size="sm" onClick={handleSave}>Salvează</Button>
                            </>
                        ) : (
                            <div className="flex gap-1">
                                <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                                    <CogIcon className="w-4 h-4" />
                                </Button>
                                <Button variant="danger" size="sm" onClick={() => onDelete(taxa)}>
                                    <TrashIcon className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-6 flex items-end justify-between">
                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-tighter mb-1">Valoare Taxă</label>
                    {isEditing ? (
                        <Input label="" type="number" value={editState.suma} onChange={e => setEditState({...editState, suma: parseFloat(e.target.value) || 0})} />
                    ) : (
                        <p className="text-3xl font-black text-white">{taxa.suma.toFixed(2)} <span className="text-sm font-medium text-slate-400">RON</span></p>
                    )}
                </div>
                <Button variant="secondary" size="sm" onClick={() => onViewStatus(taxa)}>
                    Vezi Status
                </Button>
            </div>

            {/* Buton generare facturi — ADMIN_CLUB și SUPER_ADMIN_FEDERATIE */}
            {canGenerate && (
                <div className="mt-6 pt-4 border-t border-slate-700/50 flex gap-2">
                    <Button variant="info" size="sm" className="flex-1" onClick={() => onGenerate(taxa)}>
                        <BanknotesIcon className="w-4 h-4 mr-2" /> Generează Facturi
                    </Button>
                </div>
            )}
        </Card>
    );
};

export const TaxeAnuale: React.FC<TaxeAnualeProps> = ({ onBack, currentUser, sportivi, plati, setPlati }) => {
    const { taxeAnualeConfig, vizeSportivi, setTaxeAnualeConfig, setVizeSportivi, loading } = useData();
    const [taxaToGenerate, setTaxaToGenerate] = useState<TaxaAnualeConfig | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedTaxaForStatus, setSelectedTaxaForStatus] = useState<TaxaAnualeConfig | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTaxa, setNewTaxa] = useState<Partial<TaxaAnualeConfig>>({
        an: new Date().getFullYear(),
        suma: 0,
        descriere: 'Taxă Anuală',
        data_inceput: `${new Date().getFullYear()}-01-01`,
        data_sfarsit: `${new Date().getFullYear()}-12-31`,
    });

    const [taxaToDelete, setTaxaToDelete] = useState<TaxaAnualeConfig | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'Toate' | 'Activ' | 'Neplătit'>('Toate');

    const { showError, showSuccess } = useError();

    // SUPER_ADMIN_FEDERATIE: poate adăuga/edita/șterge configurații de taxe
    const canManage = useMemo(() =>
        currentUser.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE'),
        [currentUser.roluri]
    );

    // ADMIN_CLUB și SUPER_ADMIN_FEDERATIE: pot genera facturi pentru sportivii lor
    const canGenerate = useMemo(() =>
        currentUser.roluri.some(r =>
            r.nume === 'ADMIN_CLUB' ||
            r.nume === 'SUPER_ADMIN_FEDERATIE' ||
            r.nume === 'ADMIN'
        ),
        [currentUser.roluri]
    );

    const handleDeleteTaxa = async () => {
        if (!taxaToDelete || !supabase) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase.from('taxe_anuale_config').delete().eq('id', taxaToDelete.id);
            if (error) throw error;
            setTaxeAnualeConfig(prev => prev.filter(t => t.id !== taxaToDelete.id));
            showSuccess("Succes", "Configurarea a fost ștearsă.");
        } catch (err: any) {
            showError("Eroare la ștergere", err.message || "Asigurați-vă că nu există vize sau plăți asociate acestei taxe.");
        } finally {
            setIsDeleting(false);
            setTaxaToDelete(null);
        }
    };

    const handleUpdate = async (id: string, updates: Partial<TaxaAnualeConfig>) => {
        if (!supabase) return;
        const { data, error } = await supabase.from('taxe_anuale_config').update(updates).eq('id', id).select().single();
        if (error) {
            showError("Eroare la salvare", error);
        } else if (data) {
            setTaxeAnualeConfig(prev => prev.map(t => t.id === id ? data : t));
            showSuccess("Succes", "Configurarea a fost salvată.");
        }
    };

    const handleAddTaxa = async () => {
        if (!supabase) return;
        if (!newTaxa.an || !newTaxa.suma) {
            showError("Date Incomplete", "Anul și suma sunt obligatorii.");
            return;
        }

        const payload = {
            ...newTaxa,
            club_id: currentUser.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE') ? null : currentUser.club_id
        };

        const { data, error } = await supabase.from('taxe_anuale_config').insert(payload).select().single();
        if (error) {
            showError("Eroare la adăugare", error);
        } else if (data) {
            setTaxeAnualeConfig(prev => [...prev, data]);
            showSuccess("Succes", "Taxa a fost adăugată.");
            setShowAddModal(false);
            setNewTaxa({
                an: new Date().getFullYear(),
                suma: 0,
                descriere: 'Taxă Anuală',
                data_inceput: `${new Date().getFullYear()}-01-01`,
                data_sfarsit: `${new Date().getFullYear()}-12-31`,
            });
        }
    };

    const handleGenerareMasiva = async () => {
        if (!taxaToGenerate || !supabase) return;

        setIsGenerating(true);
        const sportiviActivi = sportivi.filter(s => s.status === 'Activ');

        const descriereFactura = `${getTitluTaxa(taxaToGenerate)} ${taxaToGenerate.an ?? ''}`.trim();

        const newPlati = sportiviActivi.map(s => ({
            sportiv_id: s.id,
            familie_id: s.familie_id,
            club_id: s.club_id,
            an: taxaToGenerate.an,
            suma: taxaToGenerate.suma,
            data: new Date().toISOString().split('T')[0],
            status: 'Neachitat',
            descriere: descriereFactura,
            tip: 'Taxa Anuala',
            observatii: 'Generat automat'
        }));

        const { data, error } = await supabase
            .from('plati')
            .upsert(newPlati, { onConflict: 'sportiv_id,an', ignoreDuplicates: true })
            .select();

        setIsGenerating(false);
        setTaxaToGenerate(null);

        if (error) {
            showError("Eroare la generarea facturilor", error);
        } else {
            const generated = data ?? [];
            if (generated.length > 0) {
                setPlati(prev => [...prev, ...generated]);
                showSuccess("Operațiune finalizată", `${generated.length} facturi noi au fost generate.`);
            } else {
                showSuccess("Info", "Toți sportivii activi au deja o taxă anuală generată pentru acest an.");
            }
        }
    };

    const statusList = useMemo(() => {
        if (!selectedTaxaForStatus) return [];

        return sportivi
            .filter(s => s.status === 'Activ')
            .map(s => {
                const viza = vizeSportivi.find(v => v.sportiv_id === s.id && v.an === selectedTaxaForStatus.an);
                return {
                    ...s,
                    vizaStatus: viza?.status_viza || 'Neplătit',
                    dataPlatii: viza?.data_platii
                };
            })
            .filter(s => {
                const matchesSearch = s.nume.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                     s.prenume.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesFilter = statusFilter === 'Toate' ||
                                     (statusFilter === 'Activ' && s.vizaStatus === 'Activ') ||
                                     (statusFilter === 'Neplătit' && s.vizaStatus === 'Neplătit');
                return matchesSearch && matchesFilter;
            });
    }, [selectedTaxaForStatus, sportivi, vizeSportivi, searchTerm, statusFilter]);

    const handleExportCSV = () => {
        if (!selectedTaxaForStatus) return;
        const sportiviActivi = statusList.filter(s => s.vizaStatus === 'Activ');
        const rows = [
            ['Nr.', 'Nume', 'Prenume', 'Data Plății'],
            ...sportiviActivi.map((s, i) => [
                i + 1,
                s.nume,
                s.prenume,
                s.dataPlatii ? new Date(s.dataPlatii).toLocaleDateString('ro-RO') : '-'
            ])
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vize_active_${selectedTaxaForStatus.an}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64 text-slate-400">Se încarcă datele...</div>;
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Button onClick={onBack} variant="secondary" size="sm" className="mb-2">
                        <ArrowLeftIcon className="w-4 h-4 mr-2" /> Înapoi
                    </Button>
                    <h1 className="text-4xl font-black text-white tracking-tighter">TAXE ANUALE & VIZE</h1>
                    <p className="text-slate-400 text-sm">Gestionarea taxelor de federație și club pentru eligibilitatea la examene.</p>
                </div>

                <div className="flex flex-col items-start md:items-end gap-1">
                    {/* Rol vizibil pentru ADMIN_CLUB — informare clară */}
                    {canGenerate && !canManage && (
                        <p className="text-xs text-amber-400/80 bg-amber-400/10 border border-amber-400/20 px-2 py-1 rounded-md">
                            Admin Club: poți genera facturi, dar nu poți modifica taxele federale.
                        </p>
                    )}
                    {/* Buton adăugare — doar SUPER_ADMIN_FEDERATIE */}
                    {canManage && (
                        <Button variant="primary" onClick={() => setShowAddModal(true)}>
                            <PlusIcon className="w-5 h-5 mr-2" /> Adaugă Configurare
                        </Button>
                    )}
                </div>
            </div>

            {/* Grid responsive: 1 col mobil, 2 col tablet, 3 col desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {taxeAnualeConfig.length > 0 ? (
                    taxeAnualeConfig
                        .slice()
                        .sort((a, b) => (b.an ?? 0) - (a.an ?? 0))
                        .map(taxa => (
                            <TaxaCard
                                key={taxa.id}
                                taxa={taxa}
                                onUpdate={handleUpdate}
                                onDelete={setTaxaToDelete}
                                onGenerate={setTaxaToGenerate}
                                onViewStatus={setSelectedTaxaForStatus}
                                canManage={canManage}
                                canGenerate={canGenerate}
                            />
                        ))
                ) : (
                    <Card className="col-span-full text-center py-12 bg-slate-800/30 border-dashed border-slate-700">
                        <BanknotesIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400 font-medium">Nicio taxă anuală configurată.</p>
                        {canManage && (
                            <Button variant="secondary" size="sm" className="mt-4" onClick={() => setShowAddModal(true)}>
                                Configurează Prima Taxă
                            </Button>
                        )}
                    </Card>
                )}
            </div>

            {/* Modal Status Vize */}
            <Modal
                isOpen={!!selectedTaxaForStatus}
                onClose={() => {
                    setSelectedTaxaForStatus(null);
                    setStatusFilter('Toate');
                    setSearchTerm('');
                }}
                title={`Status Vize - Anul ${selectedTaxaForStatus?.an ?? '—'}`}
            >
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-grow">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                                label=""
                                placeholder="Caută sportiv..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="w-full sm:w-48">
                            <Select
                                label=""
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value as any)}
                            >
                                <option value="Toate">Toate Statusurile</option>
                                <option value="Activ">Active</option>
                                <option value="Neplătit">Neplătite</option>
                            </Select>
                        </div>
                    </div>

                    {/* Export / Print — vizibil doar când există sportivi cu viză activă */}
                    {statusList.some(s => s.vizaStatus === 'Activ') && (
                        <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
                            <p className="text-xs text-slate-400">
                                <span className="font-bold text-emerald-400">{statusList.filter(s => s.vizaStatus === 'Activ').length}</span> sportivi cu viză activă — pot fi exportați pentru federație
                            </p>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button variant="secondary" size="sm" className="flex-1 sm:flex-none" onClick={handleExportCSV}>
                                    <DownloadIcon className="w-4 h-4 mr-1.5" /> Export CSV
                                </Button>
                                <Button variant="secondary" size="sm" className="flex-1 sm:flex-none" onClick={handlePrint}>
                                    <PrinterIcon className="w-4 h-4 mr-1.5" /> Tipărește
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-700">
                        <ResponsiveTable
                            data={statusList}
                            columns={[
                                { label: 'Sportiv', key: 'nume', render: (s) => <span className="font-bold text-white">{s.nume} {s.prenume}</span> },
                                {
                                    label: 'Status Viză',
                                    key: 'vizaStatus',
                                    render: (s) => (
                                        <div className="flex items-center gap-2">
                                            {s.vizaStatus === 'Activ' ? (
                                                <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
                                                    <CheckCircleIcon className="w-3 h-3" /> ACTIVĂ
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-red-400 text-xs font-bold bg-red-400/10 px-2 py-1 rounded-full border border-red-400/20">
                                                    <XCircleIcon className="w-3 h-3" /> NEPLĂTITĂ
                                                </span>
                                            )}
                                        </div>
                                    )
                                },
                                {
                                    label: 'Data Plății',
                                    key: 'dataPlatii',
                                    render: (s) => <span className="text-xs text-slate-400">{s.dataPlatii ? new Date(s.dataPlatii).toLocaleDateString('ro-RO') : '-'}</span>
                                }
                            ]}
                        />
                    </div>
                </div>
            </Modal>

            {/* Modal Adaugă Taxă — doar SUPER_ADMIN_FEDERATIE */}
            {canManage && (
                <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Adaugă Configurare Taxă">
                    <div className="space-y-4">
                        <Input label="Anul" type="number" value={newTaxa.an} onChange={e => setNewTaxa({...newTaxa, an: parseInt(e.target.value)})} />
                        <Input label="Suma (RON)" type="number" value={newTaxa.suma} onChange={e => setNewTaxa({...newTaxa, suma: parseFloat(e.target.value)})} />
                        <Input label="Descriere (ex: Taxă Federală)" value={newTaxa.descriere} onChange={e => setNewTaxa({...newTaxa, descriere: e.target.value})} />
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                label="Dată început valabilitate"
                                type="date"
                                value={newTaxa.data_inceput || ''}
                                onChange={e => setNewTaxa({...newTaxa, data_inceput: e.target.value || null})}
                            />
                            <Input
                                label="Dată sfârșit valabilitate"
                                type="date"
                                value={newTaxa.data_sfarsit || ''}
                                onChange={e => setNewTaxa({...newTaxa, data_sfarsit: e.target.value || null})}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Anulează</Button>
                            <Button variant="primary" onClick={handleAddTaxa}>Adaugă Taxă</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Confirmare generare facturi */}
            <ConfirmDeleteModal
                isOpen={!!taxaToGenerate}
                onClose={() => setTaxaToGenerate(null)}
                onConfirm={handleGenerareMasiva}
                title="Confirmare Generare Facturi"
                tableName=""
                isLoading={isGenerating}
                customMessage={`Sigur dorești să generezi facturi pentru "${taxaToGenerate ? getTitluTaxa(taxaToGenerate) : ''} (${taxaToGenerate?.an ?? ''})" pentru TOȚI sportivii activi care nu au deja această factură?`}
                confirmButtonText="Da, generează"
                confirmButtonVariant="success"
                icon={BanknotesIcon}
            />

            {/* Confirmare ștergere taxă — doar SUPER_ADMIN_FEDERATIE ajunge aici */}
            <ConfirmDeleteModal
                isOpen={!!taxaToDelete}
                onClose={() => setTaxaToDelete(null)}
                onConfirm={handleDeleteTaxa}
                title="Șterge Configurare Taxă"
                tableName="Configurare Taxă Anuală"
                isLoading={isDeleting}
                customMessage={`Sigur dorești să ștergi configurarea pentru anul ${taxaToDelete?.an ?? '—'}? Această acțiune va eșua dacă există deja vize generate pe baza acestei configurări.`}
            />
        </div>
    );
};
