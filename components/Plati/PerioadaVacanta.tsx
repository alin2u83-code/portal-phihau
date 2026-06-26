import React, { useState, useEffect, useCallback } from 'react';
import { PerioadaVacanta, ParticipareVacanta } from '../../types';
import { Button, Card, Input, Modal } from '../ui';
import {
    ArrowLeftIcon, PlusIcon, TrashIcon, EditIcon,
    ChevronDownIcon, ChevronUpIcon, XIcon, SearchIcon, UsersIcon,
} from '../icons';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { useData } from '../../contexts/DataContext';
import { usePermissions } from '../../hooks/usePermissions';

// Helper formatare dată în format românesc: "01 Ian 2026"
function formatDataRo(dateStr: string): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const months = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}

interface PerioadaVacantaViewProps {
    onBack: () => void;
}

// ─── Modal CRUD Perioadă ──────────────────────────────────────────────────────

interface CrudModalProps {
    mode: 'add' | 'edit';
    item?: PerioadaVacanta;
    onClose: () => void;
    onSave: (values: { denumire: string; data_start: string; data_end: string }) => Promise<void>;
    isSaving: boolean;
}

const CrudModal: React.FC<CrudModalProps> = ({ mode, item, onClose, onSave, isSaving }) => {
    const [denumire, setDenumire] = useState(item?.denumire ?? '');
    const [dataStart, setDataStart] = useState(item?.data_start ?? '');
    const [dataEnd, setDataEnd] = useState(item?.data_end ?? '');
    const [dateError, setDateError] = useState('');

    const handleSave = async () => {
        if (!denumire.trim()) return;
        if (!dataStart || !dataEnd) return;
        if (dataEnd < dataStart) {
            setDateError('Data de sfârșit trebuie să fie >= data de start.');
            return;
        }
        setDateError('');
        await onSave({ denumire: denumire.trim(), data_start: dataStart, data_end: dataEnd });
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={mode === 'add' ? 'Adaugă Perioadă' : 'Editează Perioadă'}
        >
            <div className="space-y-4">
                <Input
                    label="Denumire *"
                    value={denumire}
                    onChange={e => setDenumire(e.target.value)}
                    placeholder="ex: Vacanță de vară 2026"
                />
                <Input
                    label="Data Start *"
                    type="date"
                    value={dataStart}
                    onChange={e => setDataStart(e.target.value)}
                />
                <Input
                    label="Data Sfârșit *"
                    type="date"
                    value={dataEnd}
                    onChange={e => setDataEnd(e.target.value)}
                    error={dateError || undefined}
                />
            </div>
            <div className="mt-6 flex justify-end gap-3">
                <Button variant="secondary" onClick={onClose} disabled={isSaving}>
                    Anulează
                </Button>
                <Button
                    variant="primary"
                    onClick={handleSave}
                    isLoading={isSaving}
                    disabled={!denumire.trim() || !dataStart || !dataEnd}
                >
                    Salvează
                </Button>
            </div>
        </Modal>
    );
};

// ─── Modal Adaugă Participanți ────────────────────────────────────────────────

interface AdaugaParticipantiModalProps {
    perioadaId: string;
    existingIds: Set<string>;
    onClose: () => void;
    onSaved: () => void;
}

const AdaugaParticipantiModal: React.FC<AdaugaParticipantiModalProps> = ({
    perioadaId,
    existingIds,
    onClose,
    onSaved,
}) => {
    const { filteredData } = useData();
    const { showError } = useError();
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Sportivi activi din club care nu sunt deja participanți
    const disponibili = filteredData.sportivi.filter(
        s => s.status === 'Activ' && !existingIds.has(s.id)
    );

    const rezultateCautare = disponibili.filter(s => {
        const q = searchTerm.toLowerCase();
        return `${s.prenume} ${s.nume}`.toLowerCase().includes(q);
    });

    const toggleSportiv = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === rezultateCautare.length && rezultateCautare.length > 0) {
            setSelected(new Set());
        } else {
            setSelected(new Set(rezultateCautare.map(s => s.id)));
        }
    };

    const handleSave = async () => {
        if (selected.size === 0) return;
        setIsSaving(true);
        const rows = Array.from(selected).map(sid => ({
            perioada_id: perioadaId,
            sportiv_id: sid,
        }));
        const { error } = await supabase.from('participare_vacanta').insert(rows);
        if (error) {
            showError('Eroare adăugare participanți', error);
            setIsSaving(false);
        } else {
            onSaved();
            onClose(); // component unmounts — no further state updates after this
        }
    };

    const allSelected = rezultateCautare.length > 0 && selected.size === rezultateCautare.length;

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={`Adaugă Participanți${selected.size > 0 ? ` (${selected.size} selectați)` : ''}`}
        >
            <div className="space-y-3">
                {/* Search input — plain HTML pentru că nu necesită label */}
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Caută sportiv..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                </div>

                <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>{rezultateCautare.length} disponibili</span>
                    <button
                        type="button"
                        onClick={toggleAll}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        {allSelected ? 'Deselectează tot' : 'Selectează tot'}
                    </button>
                </div>

                <div className="max-h-64 overflow-y-auto rounded border border-slate-700">
                    {rezultateCautare.length === 0 ? (
                        <p className="text-center text-sm text-slate-500 py-6">
                            {searchTerm ? 'Niciun sportiv găsit.' : 'Toți sportivii activi sunt deja adăugați.'}
                        </p>
                    ) : (
                        rezultateCautare.map(s => {
                            const isSelected = selected.has(s.id);
                            return (
                                <div
                                    key={s.id}
                                    onClick={() => toggleSportiv(s.id)}
                                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors select-none ${
                                        isSelected
                                            ? 'bg-blue-900/40 text-blue-200'
                                            : 'hover:bg-slate-700/50 text-slate-300'
                                    }`}
                                >
                                    <div className={`h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center ${
                                        isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-500'
                                    }`}>
                                        {isSelected && (
                                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 12 12">
                                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className="text-sm">{s.prenume} {s.nume}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
                <Button variant="secondary" onClick={onClose} disabled={isSaving}>
                    Anulează
                </Button>
                <Button
                    variant="primary"
                    onClick={handleSave}
                    isLoading={isSaving}
                    disabled={selected.size === 0}
                >
                    Adaugă ({selected.size})
                </Button>
            </div>
        </Modal>
    );
};

// ─── View Principal ───────────────────────────────────────────────────────────

export const PerioadaVacantaView: React.FC<PerioadaVacantaViewProps> = ({ onBack }) => {
    const { filteredData, activeRoleContext } = useData();
    const { showError } = useError();
    const permissions = usePermissions(activeRoleContext);

    const clubId = activeRoleContext?.club_id;
    const isAdmin = permissions.isAdminClub || permissions.isFederationAdmin;

    // State principal
    const [perioade, setPerioade] = useState<PerioadaVacanta[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [participari, setParticipari] = useState<Record<string, ParticipareVacanta[]>>({});
    const [loadingParticipari, setLoadingParticipari] = useState<Record<string, boolean>>({});

    // State modals
    const [modalState, setModalState] = useState<{ mode: 'add' | 'edit'; item?: PerioadaVacanta } | null>(null);
    const [perioadaToDelete, setPerioadaToDelete] = useState<PerioadaVacanta | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [adaugaParticipantiPerioadaId, setAdaugaParticipantiPerioadaId] = useState<string | null>(null);

    // Fetch perioade pentru clubul activ
    const fetchPerioade = useCallback(async () => {
        if (!clubId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('perioade_vacanta')
            .select('*')
            .eq('club_id', clubId)
            .order('data_start', { ascending: false });
        if (error) showError('Eroare la încărcare', error);
        else setPerioade(data ?? []);
        setLoading(false);
    }, [clubId]);

    useEffect(() => { fetchPerioade(); }, [fetchPerioade]);

    // Fetch participanți la expand
    const fetchParticipanti = useCallback(async (perioadaId: string) => {
        setLoadingParticipari(prev => ({ ...prev, [perioadaId]: true }));
        const { data, error } = await supabase
            .from('participare_vacanta')
            .select('*, sportivi(id, nume, prenume, grad_actual_id, status)')
            .eq('perioada_id', perioadaId);
        if (error) {
            showError('Eroare la încărcarea participanților', error);
        } else {
            setParticipari(prev => ({ ...prev, [perioadaId]: data ?? [] }));
        }
        setLoadingParticipari(prev => ({ ...prev, [perioadaId]: false }));
    }, [showError]);

    const handleToggleExpand = (id: string) => {
        if (expandedId === id) { setExpandedId(null); return; }
        setExpandedId(id);
        if (!participari[id]) fetchParticipanti(id);
    };

    // CRUD perioadă
    const handleSavePeriada = async (values: { denumire: string; data_start: string; data_end: string }) => {
        if (!clubId) return;
        setIsSaving(true);
        try {
            if (modalState?.mode === 'edit' && modalState.item) {
                const { error } = await supabase
                    .from('perioade_vacanta')
                    .update(values)
                    .eq('id', modalState.item.id)
                    .eq('club_id', clubId);
                if (error) showError('Eroare la actualizare', error);
                else { await fetchPerioade(); setModalState(null); }
            } else {
                const { error } = await supabase
                    .from('perioade_vacanta')
                    .insert({ ...values, club_id: clubId });
                if (error) showError('Eroare la creare', error);
                else { await fetchPerioade(); setModalState(null); }
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePeriada = async () => {
        if (!perioadaToDelete) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('perioade_vacanta')
                .delete()
                .eq('id', perioadaToDelete.id)
                .eq('club_id', clubId);
            if (error) {
                showError('Eroare la ștergere', error);
            } else {
                await fetchPerioade();
                if (expandedId === perioadaToDelete.id) setExpandedId(null);
                setParticipari(prev => {
                    const next = { ...prev };
                    delete next[perioadaToDelete.id];
                    return next;
                });
            }
        } finally {
            setIsDeleting(false);
            setPerioadaToDelete(null);
        }
    };

    // Scoatere participant individual
    const handleRemoveParticipant = async (participareId: string, perioadaId: string) => {
        const { error } = await supabase
            .from('participare_vacanta')
            .delete()
            .eq('id', participareId);
        if (error) showError('Eroare la scoatere participant', error);
        else await fetchParticipanti(perioadaId);
    };

    // Mesaj confirmare ștergere cu număr participanți
    const deleteMessage = perioadaToDelete
        ? (() => {
            const count = (participari[perioadaToDelete.id] ?? []).length;
            return `Perioadă "${perioadaToDelete.denumire}" va fi ștearsă${count > 0 ? ` împreună cu ${count} participanți` : ''}.`;
        })()
        : '';

    // Acțiune ștergere — fetch participanți dacă nu avem count înainte de modal
    const handleInitiateDelete = async (p: PerioadaVacanta) => {
        if (!participari[p.id]) {
            await fetchParticipanti(p.id);
        }
        setPerioadaToDelete(p);
    };

    if (!clubId) {
        return (
            <div className="p-4 md:p-6">
                <p className="text-slate-400">Selectează un club activ pentru a gestiona perioadele de vacanță.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <Button variant="secondary" size="sm" onClick={onBack} ghost>
                    <ArrowLeftIcon className="h-4 w-4" />
                </Button>
                <h1 className="text-xl font-semibold text-white flex-1">Vacanțe Antrenamente</h1>
                {isAdmin && (
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setModalState({ mode: 'add' })}
                        leftIcon={<PlusIcon className="h-4 w-4" />}
                    >
                        Adaugă Perioadă
                    </Button>
                )}
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-center py-12 text-slate-400">Se încarcă...</div>
            ) : perioade.length === 0 ? (
                <Card className="text-center py-12">
                    <UsersIcon className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Nicio perioadă de vacanță definită.</p>
                    {isAdmin && (
                        <Button
                            variant="primary"
                            size="sm"
                            className="mt-4"
                            onClick={() => setModalState({ mode: 'add' })}
                            leftIcon={<PlusIcon className="h-4 w-4" />}
                        >
                            Adaugă prima perioadă
                        </Button>
                    )}
                </Card>
            ) : (
                <div className="space-y-3">
                    {perioade.map(p => {
                        const isExpanded = expandedId === p.id;
                        const listaParticipanti = participari[p.id] ?? [];
                        const isLoadingP = loadingParticipari[p.id] ?? false;

                        return (
                            <Card key={p.id} className="overflow-hidden">
                                {/* Card header */}
                                <div className="flex flex-wrap items-center gap-2 p-4">
                                    {/* Info stânga */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-white truncate">{p.denumire}</p>
                                        <p className="text-sm text-slate-400 mt-0.5">
                                            {formatDataRo(p.data_start)} — {formatDataRo(p.data_end)}
                                        </p>
                                    </div>

                                    {/* Badge participanți (afișat doar dacă avem datele fetch-uite) */}
                                    {participari[p.id] !== undefined && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-700 px-2.5 py-0.5 text-xs text-slate-300">
                                            <UsersIcon className="h-3 w-3" />
                                            {listaParticipanti.length}
                                        </span>
                                    )}

                                    {/* Butoane admin */}
                                    {isAdmin && (
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="secondary"
                                                size="xs"
                                                ghost
                                                onClick={() => setModalState({ mode: 'edit', item: p })}
                                                title="Editează"
                                            >
                                                <EditIcon className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="danger"
                                                size="xs"
                                                ghost
                                                onClick={() => handleInitiateDelete(p)}
                                                title="Șterge"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}

                                    {/* Expand/collapse */}
                                    <Button
                                        variant="secondary"
                                        size="xs"
                                        ghost
                                        onClick={() => handleToggleExpand(p.id)}
                                        title={isExpanded ? 'Restrânge' : 'Extinde'}
                                    >
                                        {isExpanded
                                            ? <ChevronUpIcon className="h-4 w-4" />
                                            : <ChevronDownIcon className="h-4 w-4" />
                                        }
                                    </Button>
                                </div>

                                {/* Lista participanți (expandată) */}
                                {isExpanded && (
                                    <div className="border-t border-slate-700 px-4 pb-4 pt-3">
                                        {isLoadingP ? (
                                            <p className="text-sm text-slate-400 py-3">Se încarcă participanții...</p>
                                        ) : listaParticipanti.length === 0 ? (
                                            <p className="text-sm text-slate-500 py-3">Niciun participant adăugat.</p>
                                        ) : (
                                            <ul className="space-y-1 mb-3">
                                                {listaParticipanti.map(lp => {
                                                    const s = lp.sportivi;
                                                    const numeSportiv = s
                                                        ? `${s.prenume} ${s.nume}`
                                                        : lp.sportiv_id;
                                                    return (
                                                        <li key={lp.id} className="flex items-center justify-between gap-2 py-1">
                                                            <span className="text-sm text-slate-300">{numeSportiv}</span>
                                                            {isAdmin && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveParticipant(lp.id, p.id)}
                                                                    className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                                                                    title="Scoate din perioadă"
                                                                >
                                                                    <XIcon className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}

                                        {isAdmin && (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => setAdaugaParticipantiPerioadaId(p.id)}
                                                leftIcon={<PlusIcon className="h-4 w-4" />}
                                            >
                                                Adaugă Participanți
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Modal CRUD Perioadă */}
            {modalState && (
                <CrudModal
                    mode={modalState.mode}
                    item={modalState.item}
                    onClose={() => setModalState(null)}
                    onSave={handleSavePeriada}
                    isSaving={isSaving}
                />
            )}

            {/* Modal Adaugă Participanți */}
            {adaugaParticipantiPerioadaId && (
                <AdaugaParticipantiModal
                    perioadaId={adaugaParticipantiPerioadaId}
                    existingIds={new Set((participari[adaugaParticipantiPerioadaId] ?? []).map(lp => lp.sportiv_id))}
                    onClose={() => setAdaugaParticipantiPerioadaId(null)}
                    onSaved={() => fetchParticipanti(adaugaParticipantiPerioadaId)}
                />
            )}

            {/* Confirmare ștergere perioadă */}
            <ConfirmDeleteModal
                isOpen={perioadaToDelete !== null}
                onClose={() => setPerioadaToDelete(null)}
                onConfirm={handleDeletePeriada}
                tableName="perioade_vacanta"
                isLoading={isDeleting}
                customMessage={deleteMessage}
            />
        </div>
    );
};
