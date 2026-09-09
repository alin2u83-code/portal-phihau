import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Sezon } from '../../types';
import { Button, Card, Badge, EmptyState, ConfirmModal } from '../ui';
import { ArrowLeftIcon, PlusIcon, EditIcon, TrashIcon, CalendarDaysIcon } from '../icons';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { useData } from '../../contexts/DataContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useSezonActiv } from '../../hooks/useSezoane';
import { clearCache } from '../../utils/cache';
import { SezonFormModal } from './SezonFormModal';

// Helper formatare dată în format românesc: "01 Ian 2026" (identic cu PerioadaVacanta.tsx)
function formatDataRo(dateStr: string): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const months = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}

interface SezoaneViewProps {
    onBack: () => void;
}

export const SezoaneView: React.FC<SezoaneViewProps> = ({ onBack }) => {
    const { activeRoleContext } = useData();
    const permissions = usePermissions(activeRoleContext);
    const isAdmin = permissions.isAdminClub || permissions.isFederationAdmin;
    const clubId = activeRoleContext?.club_id ?? null;
    const { sezoane, sezonActiv, isLoading } = useSezonActiv(clubId);
    const { navigateTo } = useNavigation();
    const queryClient = useQueryClient();
    const { showError, showSuccess } = useError();

    const [modalState, setModalState] = useState<{ mode: 'add' | 'edit'; item: Sezon | null } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [sezonToDelete, setSezonToDelete] = useState<Sezon | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [sezonToActivate, setSezonToActivate] = useState<Sezon | null>(null);
    const [isActivating, setIsActivating] = useState(false);

    const invalidateSezoane = () => queryClient.invalidateQueries({ queryKey: ['sezoane'] });

    const invalidateGrupeSiCache = () => {
        Object.keys(localStorage)
            .filter(k => k.startsWith('cache_grupe_'))
            .forEach(k => clearCache(k));
        queryClient.invalidateQueries({ queryKey: ['grupe'] });
    };

    const arhiveazaGrupePerSezon = async (sezonAnteriorId: string): Promise<number> => {
        if (!clubId) return 0;
        const { data, error } = await supabase
            .from('grupe')
            .update({ arhivat: true })
            .eq('club_id', clubId)
            .eq('tip_grupa', 'per_sezon')
            .eq('sezon_id', sezonAnteriorId)
            .eq('arhivat', false)
            .select('id');
        if (error) {
            showError('Eroare la arhivare grupe', error);
            return 0;
        }
        return (data ?? []).length;
    };

    const handleSave = async (values: { denumire: string; data_start: string; data_final: string; activ: boolean }) => {
        if (!clubId || !modalState) return;
        setIsSaving(true);
        try {
            if (modalState.mode === 'edit' && modalState.item) {
                const { error } = await supabase
                    .from('sezoane')
                    .update(values)
                    .eq('id', modalState.item.id)
                    .eq('club_id', clubId);
                if (error) { showError('Eroare la actualizare sezon', error); return; }
                invalidateSezoane();
                setModalState(null);
                return;
            }

            const sezonAnteriorId = sezonActiv?.id ?? null;

            if (values.activ) {
                const { error: errDezactivare } = await supabase
                    .from('sezoane')
                    .update({ activ: false })
                    .eq('club_id', clubId)
                    .eq('activ', true);
                if (errDezactivare) { showError('Eroare la dezactivare sezon curent', errDezactivare); return; }
            }

            const { error: errInsert } = await supabase
                .from('sezoane')
                .insert({ ...values, club_id: clubId });
            if (errInsert) {
                if ((errInsert as any).code === '23505') {
                    showError('Activarea a eșuat', new Error('Activarea a eșuat — este posibil ca alt admin să fi activat deja un sezon în același timp. Reîmprospătați lista și încercați din nou.'));
                } else {
                    showError('Eroare la creare sezon', errInsert);
                }
                invalidateSezoane();
                return;
            }

            invalidateSezoane();
            setModalState(null);

            if (values.activ && sezonAnteriorId) {
                const nrArhivate = await arhiveazaGrupePerSezon(sezonAnteriorId);
                invalidateGrupeSiCache();
                showSuccess('Sezon activat', `Sezonul a fost activat. ${nrArhivate} grupă/grupe per-sezon din sezonul anterior au fost arhivate.`);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleActivare = async () => {
        if (!sezonToActivate || !clubId) return;
        setIsActivating(true);
        try {
            const sezonAnteriorId = sezonActiv?.id ?? null;

            const { error: errDezactivare } = await supabase
                .from('sezoane')
                .update({ activ: false })
                .eq('club_id', clubId)
                .eq('activ', true);
            if (errDezactivare) { showError('Eroare la dezactivare sezon curent', errDezactivare); return; }

            const { error: errActivare } = await supabase
                .from('sezoane')
                .update({ activ: true })
                .eq('id', sezonToActivate.id)
                .eq('club_id', clubId);
            if (errActivare) {
                if ((errActivare as any).code === '23505') {
                    showError('Activarea a eșuat', new Error('Activarea a eșuat — este posibil ca alt admin să fi activat deja un sezon în același timp. Reîmprospătați lista și încercați din nou.'));
                } else {
                    showError('Eroare la activare sezon', errActivare);
                }
                invalidateSezoane();
                return;
            }

            let nrArhivate = 0;
            if (sezonAnteriorId) {
                nrArhivate = await arhiveazaGrupePerSezon(sezonAnteriorId);
            }

            invalidateSezoane();
            invalidateGrupeSiCache();
            showSuccess('Sezon activat', `Sezonul a fost activat. ${nrArhivate} grupă/grupe per-sezon din sezonul anterior au fost arhivate.`);
        } finally {
            setIsActivating(false);
            setSezonToActivate(null);
        }
    };

    const handleDelete = async () => {
        if (!sezonToDelete || !clubId) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('sezoane')
                .delete()
                .eq('id', sezonToDelete.id)
                .eq('club_id', clubId);
            if (error) {
                showError('Eroare la ștergere sezon', error);
            } else {
                invalidateSezoane();
                invalidateGrupeSiCache();
            }
        } finally {
            setIsDeleting(false);
            setSezonToDelete(null);
        }
    };

    if (!isAdmin) {
        return (
            <div className="p-4 sm:p-6 space-y-4">
                <Button variant="secondary" onClick={onBack} leftIcon={<ArrowLeftIcon className="h-4 w-4" />}>
                    Înapoi
                </Button>
                <EmptyState
                    icon={<CalendarDaysIcon className="w-10 h-10 text-[var(--t-text-muted)]" />}
                    title="Acces restricționat"
                    description="Doar administratorii de club pot gestiona sezoanele."
                />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={onBack} leftIcon={<ArrowLeftIcon className="h-4 w-4" />}>
                        Înapoi
                    </Button>
                    <h1 className="text-xl sm:text-2xl font-semibold text-white">Sezoane</h1>
                </div>
                <Button
                    variant="info"
                    leftIcon={<PlusIcon className="h-4 w-4" />}
                    onClick={() => setModalState({ mode: 'add', item: null })}
                >
                    Adaugă Sezon
                </Button>
            </div>

            {!isLoading && sezoane.length === 0 ? (
                <EmptyState
                    icon={<CalendarDaysIcon className="w-10 h-10 text-[var(--t-text-muted)]" />}
                    title="Niciun sezon definit"
                    description="Adaugă primul sezon al clubului cu un interval de date liber (de exemplu 1 Sep 2026 — 30 Iun 2027). Sezonul activ determină ce grupe per-sezon și ce tipuri de abonament sunt vizibile ca fiind curente."
                    actionLabel="Adaugă primul sezon"
                    onAction={() => setModalState({ mode: 'add', item: null })}
                />
            ) : (
                <div className="space-y-3">
                    {sezoane.map(s => (
                        <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                            <button
                                type="button"
                                onClick={() => navigateTo('grupe', { sezonId: s.id, sezonDenumire: s.denumire })}
                                className="flex-1 min-w-0 text-left rounded-lg -m-1 p-1 hover:bg-[var(--t-content-bg,rgba(255,255,255,0.04))] transition-colors"
                                title="Vezi grupele acestui sezon"
                            >
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-semibold text-white truncate">{s.denumire}</p>
                                    {s.activ ? <Badge variant="green">Activ</Badge> : <Badge variant="slate">Arhivat</Badge>}
                                </div>
                                <p className="text-sm text-[var(--t-text-muted)] mt-0.5">
                                    {formatDataRo(s.data_start)} — {formatDataRo(s.data_final)}
                                </p>
                            </button>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                {!s.activ && (
                                    <Button variant="secondary" size="sm" onClick={() => setSezonToActivate(s)}>
                                        Activează
                                    </Button>
                                )}
                                <Button
                                    variant="secondary"
                                    size="xs"
                                    ghost
                                    title="Editează"
                                    onClick={() => setModalState({ mode: 'edit', item: s })}
                                >
                                    <EditIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="danger"
                                    size="xs"
                                    ghost
                                    title="Șterge"
                                    onClick={() => setSezonToDelete(s)}
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {modalState && (
                <SezonFormModal
                    mode={modalState.mode}
                    item={modalState.item}
                    isFirstSezon={sezoane.length === 0}
                    isSaving={isSaving}
                    onClose={() => setModalState(null)}
                    onSave={handleSave}
                />
            )}

            {sezonToActivate && (
                <ConfirmModal
                    isOpen={true}
                    onClose={() => setSezonToActivate(null)}
                    onConfirm={handleActivare}
                    variant="warning"
                    title="Activează sezon nou"
                    confirmLabel="Activează Sezonul"
                    message={`Sezonul '${sezonActiv?.denumire ?? '—'}' va fi dezactivat și '${sezonToActivate.denumire}' va deveni sezonul activ al clubului. Grupele per sezon din sezonul vechi vor fi arhivate automat. Continuați?`}
                />
            )}

            <ConfirmDeleteModal
                isOpen={!!sezonToDelete}
                onClose={() => setSezonToDelete(null)}
                onConfirm={handleDelete}
                isLoading={isDeleting}
                tableName="sezoane"
                customMessage={sezonToDelete ? `Sezonul '${sezonToDelete.denumire}' va fi șters. Grupele și tipurile de abonament legate de acest sezon NU se șterg — rămân ca istoric fără sezon activ.` : undefined}
            />
        </div>
    );
};
