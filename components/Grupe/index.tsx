import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Grupa as GrupaType, ProgramItem, User, Club, Sportiv, Locatie } from '../../types';
import { Button, Modal, Input, Select, CalendarQuickLink, EmptyState, ConfirmModal } from '../ui';
import { PlusIcon, TrashIcon, EditIcon, ArrowLeftIcon, UsersIcon } from '../icons';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import { clearCache } from '../../utils/cache';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { useData } from '../../contexts/DataContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useGrupe } from '../../hooks/useGrupe';
import { usePermissions } from '../../hooks/usePermissions';
import { useSezonActiv } from '../../hooks/useSezoane';

import { GrupaFormModal } from './GrupaFormModal';
import { GrupaCard } from './GrupaCard';
import { GrupaDetailView } from './GrupaDetailView';
import { AdaugaSportiviModal } from './AdaugaSportiviModal';
import { OrarEditorModal } from './OrarEditorModal';
import { OrarModificareModal } from './OrarModificareModal';
import { GrupeSecundareModal } from './GrupeSecundareModal';
import { GenerareAntrenamenteModal } from './GenerareAntrenamenteModal';
import { TourOverlay, TourButton, TOURS } from '../GhidUtilizator';
import { mutaInGrupa, scoateDinGrupa } from '../../services/grupeIstoricService';
import { useRegisterRefresh } from '../../contexts/RefreshContext';
import { filtreazaTipuriSezon, gasesteTipDupaId, esteTipDinSezonArhivat } from '../../utils/abonamente';

// Interfață extinsă pentru datele aduse din Supabase
interface GrupaWithDetails extends GrupaType {
    sportivi: { count: number }[];
    program: ProgramItem[];
}

// Componenta Principală
interface GrupeManagementProps {
    onBack: () => void;
    onNavigate?: (view: any) => void;
}
export const Grupe: React.FC<GrupeManagementProps> = ({ onBack, onNavigate }) => {
    const { currentUser, clubs, setGrupe, locatii, setLocatii, activeRoleContext, sportivi, setSportivi, tipuriAbonament } = useData();
    const { viewParams, setViewParams } = useNavigation();

    // Fetch grupe direct — nu prin context (evită probleme de timing/cache la nivel de provider)
    const permissions = usePermissions(activeRoleContext);
    const grupeClubId = permissions.isFederationLevel ? null : (activeRoleContext?.club_id ?? null);
    const { data: grupeData, isLoading: grupeLoading, refetch: refetchGrupe } = useGrupe(activeRoleContext?.id, grupeClubId);
    // Filtrare client-side ca plasă de siguranță — protejează dacă cache-ul conține date neexpirate fără filtru
    const grupeClub = (grupeData || []).filter(g => !grupeClubId || g.club_id === grupeClubId);

    // Filtru sezon: activ doar când se ajunge din Sezoane cu un sezonId în viewParams
    const sezonFiltruId: string | null = viewParams?.sezonId ?? null;
    const sezonFiltruDenumire: string | undefined = viewParams?.sezonDenumire;
    const [filtruSezonDezactivat, setFiltruSezonDezactivat] = useState(false);
    const filtruSezonActiv = !!sezonFiltruId && !filtruSezonDezactivat;
    const grupe = filtruSezonActiv
        ? grupeClub.filter(g => (g as any).tip_grupa === 'permanent' || (g as any).sezon_id === sezonFiltruId)
        : grupeClub;
    // Grupele arhivate apar ultimele, păstrând ordinea relativă existentă
    const grupeAfisate = [...grupe].sort((a, b) => Number((a as any).arhivat ?? false) - Number((b as any).arhivat ?? false));

    const sezonClubId = grupeClubId ?? activeRoleContext?.club_id ?? null;
    const { sezonActiv } = useSezonActiv(sezonClubId);

    // Nr. sportivi individuali (fără familie) al căror tip de abonament lipsește sau
    // aparține unui sezon arhivat — semnal rapid pe cardul grupei, aceeași regulă ca
    // în PlatiScadente. Simplificare: nu recalculăm cazul de familie aici (necesită
    // gruparea pe familie_id, făcută deja corect în modulul Plăți).
    const nrFaraAbonamentValidPerGrupa = useMemo(() => {
        const map = new Map<string, number>();
        const sezonId = sezonActiv?.id ?? null;
        (sportivi || []).forEach((s: any) => {
            if (s.status !== 'Activ' || !s.grupa_id || s.familie_id) return;
            const tipuriClub = (tipuriAbonament || []).filter((t: any) => t.club_id === s.club_id);
            const tipuriSezonClub = filtreazaTipuriSezon(tipuriClub, sezonId);
            const tip = gasesteTipDupaId(tipuriAbonament || [], s.tip_abonament_id) || tipuriSezonClub.find((t: any) => t.numar_membri === 1);
            const invalid = !tip || esteTipDinSezonArhivat(tip, sezonId);
            if (invalid) map.set(s.grupa_id, (map.get(s.grupa_id) || 0) + 1);
        });
        return map;
    }, [sportivi, tipuriAbonament, sezonActiv?.id]);
    const [grupaToClone, setGrupaToClone] = useState<GrupaWithDetails | null>(null);
    const [isCloning, setIsCloning] = useState(false);

    useRegisterRefresh(refetchGrupe);

    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [grupaToEdit, setGrupaToEdit] = useState<GrupaWithDetails | null>(null);
    const [grupaToDelete, setGrupaToDelete] = useState<GrupaWithDetails | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [grupaForAdaugaSportivi, setGrupaForAdaugaSportivi] = useState<GrupaWithDetails | null>(null);
    const [grupaForOrar, setGrupaForOrar] = useState<GrupaWithDetails | null>(null);
    const [grupaForModificareOrar, setGrupaForModificareOrar] = useState<GrupaWithDetails | null>(null);
    const [grupaForSecundari, setGrupaForSecundari] = useState<GrupaWithDetails | null>(null);
    const [grupaForGenerare, setGrupaForGenerare] = useState<GrupaWithDetails | null>(null);
    const [grupaSelectedForDetail, setGrupaSelectedForDetail] = useState<GrupaWithDetails | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { showError, showSuccess } = useError();
    const queryClient = useQueryClient();

    // Redeschide aceeași grupă la revenire (ex: din "Activează abonament" via goBack) —
    // grupaId e păstrat în viewParams, nu în state local care se pierde la demontare.
    useEffect(() => {
        if (!grupaSelectedForDetail && viewParams?.grupaId && grupeAfisate.length > 0) {
            const g = grupeAfisate.find(gr => gr.id === viewParams.grupaId);
            if (g) setGrupaSelectedForDetail(g as GrupaWithDetails);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewParams?.grupaId, grupeAfisate.length]);

    const handleOpenGrupaDetail = (g: GrupaWithDetails) => {
        setGrupaSelectedForDetail(g);
        setViewParams((prev: any) => ({ ...(prev || {}), grupaId: g.id }));
    };

    const handleCloseGrupaDetail = () => {
        setGrupaSelectedForDetail(null);
        setViewParams((prev: any) => {
            if (!prev) return prev;
            const { grupaId, ...rest } = prev;
            return rest;
        });
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            // Șterge cache localStorage + invalidează React Query + re-fetch direct
            Object.keys(localStorage)
                .filter(k => k.startsWith('cache_grupe_'))
                .forEach(k => clearCache(k));
            await queryClient.invalidateQueries({ queryKey: ['grupe'] });
            await refetchGrupe();
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleLocatieAdded = (locatie: Locatie) => {
        if (setLocatii) {
            setLocatii((prev: Locatie[]) => [...prev, locatie]);
        }
    };

    // Remove useEffect for fetching grupe, as it's now in DataContext

    const handleSave = async (grupaData: GrupaWithDetails) => {
        const { program, sportivi, ...grupaInfo } = grupaData;
        const { id: grupaId, ...grupaDbPayload } = grupaInfo;

        if (grupaToEdit) { // UPDATE
            const { data: updatedGrupa, error: grupaError } = await supabase.from('grupe').update(grupaDbPayload).eq('id', grupaToEdit.id).select().single();
            if (grupaError) { 
                console.error('DETALII EROARE:', JSON.stringify(grupaError, null, 2));
                showError("Eroare la actualizarea grupei", grupaError); 
                return; 
            }
            await supabase.from('orar_saptamanal').delete().eq('grupa_id', grupaToEdit.id);
            if (program.length > 0) {
                const programToInsert = program.map(({ id, ...rest }) => ({ ...rest, grupa_id: grupaToEdit.id, club_id: grupaToEdit.club_id }));
                const { error: insertError } = await supabase.from('orar_saptamanal').insert(programToInsert);
                if (insertError) { 
                    console.error('DETALII EROARE:', JSON.stringify(insertError, null, 2));
                    showError("Eroare la sincronizarea programului", insertError); 
                    return; 
                }
            }
            const { data: newProgramItems } = await supabase.from('orar_saptamanal').select('*').eq('grupa_id', grupaToEdit.id);
            if (updatedGrupa) setGrupe(prev => (prev as GrupaWithDetails[]).map(g => g.id === grupaToEdit.id ? { ...g, ...updatedGrupa, program: newProgramItems || [] } : g));
            // BUG-4 fix (vezi ramura CREATE mai jos): queryFn din useGrupe.ts citeste
            // intai cache-ul localStorage (cache_grupe_*, TTL 10 min) INAINTE sa
            // interogheze Supabase — invalidateQueries marcheaza query-ul stale si
            // declanseaza refetch, dar queryFn tot serveste datele vechi din
            // localStorage daca TTL-ul nu a expirat, asa ca grupa editata apare
            // neschimbata in UI desi update-ul a reusit in DB (esec "silentios").
            // Golim cache-ul local, la fel ca la CREATE si handleRefresh, apoi
            // refetch explicit ca editarea sa apara imediat.
            Object.keys(localStorage)
                .filter(k => k.startsWith('cache_grupe_'))
                .forEach(k => clearCache(k));
            queryClient.invalidateQueries({ queryKey: ['grupe'] });
            await refetchGrupe();
            showSuccess("Succes", "Grupa a fost actualizată.");
        } else { // CREATE
            const { data: newGrupa, error: grupaError } = await supabase.from('grupe').insert(grupaDbPayload).select().single();
            if (grupaError) { 
                console.error('DETALII EROARE:', JSON.stringify(grupaError, null, 2));
                showError("Eroare la adăugarea grupei", grupaError); 
                return; 
            }
            if (newGrupa && program.length > 0) {
                const programToInsert = program.map(({id, ...rest}) => ({ ...rest, grupa_id: newGrupa.id, club_id: newGrupa.club_id }));
                await supabase.from('orar_saptamanal').insert(programToInsert);
            }
            if (newGrupa) {
                const { data: finalGrupa } = await supabase.from('grupe').select('*, sportivi!grupa_id(count), program:orar_saptamanal!grupa_id(*)').eq('id', newGrupa.id).single();
                setGrupe(prev => [...(prev as GrupaWithDetails[]), finalGrupa as GrupaWithDetails]);
                // BUG-4 fix: invalidateQueries nu forțează un refetch real dacă cache-ul
                // localStorage (cache_grupe_*, TTL 10 min în hooks/useGrupe.ts) e încă valid —
                // queryFn îl întoarce direct, fără să mai interogheze Supabase. Golim cache-ul
                // local, la fel ca în handleRefresh, ca grupa nou creată să apară imediat în listă.
                Object.keys(localStorage)
                    .filter(k => k.startsWith('cache_grupe_'))
                    .forEach(k => clearCache(k));
                queryClient.invalidateQueries({ queryKey: ['grupe'] });
                showSuccess("Succes", "Grupa a fost creată.");
            }
        }
    };

    const handleDubleaza = async () => {
        if (isCloning || !grupaToClone || !sezonActiv) return;
        setIsCloning(true);
        try {
            const { data: newGrupa, error: grupaError } = await supabase
                .from('grupe')
                .insert({
                    denumire: grupaToClone.denumire,
                    sala: grupaToClone.sala,
                    club_id: grupaToClone.club_id,
                    locatie_id: (grupaToClone as any).locatie_id ?? null,
                    tip_grupa: 'per_sezon',
                    sezon_id: sezonActiv.id,
                    arhivat: false,
                })
                .select()
                .single();
            if (grupaError) { showError("Eroare la dublarea grupei", grupaError); return; }

            if (newGrupa && grupaToClone.program.length > 0) {
                const programToInsert = grupaToClone.program.map(p => ({
                    ziua: p.ziua,
                    ora_start: p.ora_start,
                    ora_sfarsit: p.ora_sfarsit,
                    is_activ: p.is_activ ?? true,
                    grupa_id: newGrupa.id,
                    club_id: newGrupa.club_id,
                }));
                const { error: programError } = await supabase.from('orar_saptamanal').insert(programToInsert);
                if (programError) showError("Eroare la copierea programului", programError);
            }

            Object.keys(localStorage)
                .filter(k => k.startsWith('cache_grupe_'))
                .forEach(k => clearCache(k));
            queryClient.invalidateQueries({ queryKey: ['grupe'] });
            await refetchGrupe();

            showSuccess("Grupă dublată", `Grupa '${grupaToClone.denumire}' a fost creată în sezonul '${sezonActiv.denumire}'. Adaugă sportivii manual din Detalii → Adaugă Sportivi.`);
        } finally {
            setIsCloning(false);
            setGrupaToClone(null);
        }
    };

    const handleOpenAdd = () => { setGrupaToEdit(null); setIsModalOpen(true); };
    const handleOpenEdit = (grupa: GrupaWithDetails) => { setGrupaToEdit(grupa); setIsModalOpen(true); };

    const handleAdaugaSportiviInGrupa = async (sportiviIds: string[]) => {
        if (!grupaForAdaugaSportivi || sportiviIds.length === 0) return;
        const { error } = await supabase
            .from('sportivi')
            .update({ grupa_id: grupaForAdaugaSportivi.id })
            .in('id', sportiviIds);
        if (error) {
            showError("Eroare la adăugarea sportivilor", error);
            return;
        }
        // Tracking istoric grupe
        await mutaInGrupa(
            sportiviIds,
            grupaForAdaugaSportivi.id,
            grupaForAdaugaSportivi.denumire,
            grupaForAdaugaSportivi.club_id,
            currentUser?.user_id || null
        );
        // Actualizăm starea locală a sportivilor
        setSportivi(prev =>
            prev.map(s =>
                sportiviIds.includes(s.id)
                    ? { ...s, grupa_id: grupaForAdaugaSportivi.id }
                    : s
            )
        );
        // Actualizăm numărul de sportivi din grupă local
        setGrupe(prev =>
            (prev as GrupaWithDetails[]).map(g =>
                g.id === grupaForAdaugaSportivi.id
                    ? {
                        ...g,
                        sportivi: [{ count: (g.sportivi?.[0]?.count ?? 0) + sportiviIds.length }],
                    }
                    : g
            )
        );
        queryClient.invalidateQueries({ queryKey: ['sportivi'] });
        queryClient.invalidateQueries({ queryKey: ['grupe'] });
        // WR-02: invalidăm și cache-ul per-grupă folosit de TabSportivi din GrupaDetailView
        // fără acest apel, lista de sportivi din tab rămâne stale până la 5 minute
        queryClient.invalidateQueries({ queryKey: ['sportivi-grupa', grupaForAdaugaSportivi.id] });
        showSuccess(
            "Succes",
            `${sportiviIds.length} sportiv${sportiviIds.length !== 1 ? 'i adăugați' : ' adăugat'} în ${grupaForAdaugaSportivi.denumire}.`
        );
    };
    
    const handleScoateSportivDinGrupa = async (sportiviId: string) => {
        const { error } = await supabase.from('sportivi').update({ grupa_id: null }).eq('id', sportiviId);
        if (error) { showError('Eroare', error); return; }
        // Tracking istoric grupe
        await scoateDinGrupa([sportiviId], currentUser?.user_id || null);
        setSportivi(prev => (prev as Sportiv[]).map(s => s.id === sportiviId ? { ...s, grupa_id: null } : s));
        queryClient.invalidateQueries({ queryKey: ['grupe'] });
        queryClient.invalidateQueries({ queryKey: ['grupe-istoric-sportiv', sportiviId] });
        await refetchGrupe();
    };

    const confirmDelete = async (grupaId: string) => {
        const grupa = (grupe as GrupaWithDetails[]).find(g => g.id === grupaId);
        if ((grupa?.sportivi?.[0]?.count ?? 0) > 0) {
            showError("Ștergere Blocată", "Grupa are sportivi activi și nu poate fi ștearsă.");
            setGrupaToDelete(null);
            return;
        }
        setIsDeleting(true);
        await supabase.from('orar_saptamanal').delete().eq('grupa_id', grupaId);
        const { error: grupaError } = await supabase.from('grupe').delete().eq('id', grupaId);
        if (grupaError) { 
            console.error('DETALII EROARE:', JSON.stringify(grupaError, null, 2));
            showError("Eroare la ștergerea grupei", grupaError); 
        }
        else {
            setGrupe(prev => (prev as GrupaWithDetails[]).filter(g => g.id !== grupaId));
            // BUG-4 fix (vezi ramura UPDATE din handleSave): fara golirea cache-ului
            // localStorage cache_grupe_*, grupa stearsa reapare vizual la refetch
            // pentru ca queryFn din useGrupe.ts serveste datele vechi din cache (TTL 10 min).
            Object.keys(localStorage)
                .filter(k => k.startsWith('cache_grupe_'))
                .forEach(k => clearCache(k));
            queryClient.invalidateQueries({ queryKey: ['grupe'] });
            await refetchGrupe();
            showSuccess("Succes", "Grupa a fost ștearsă.");
        }
        setIsDeleting(false);
        setGrupaToDelete(null);
    };

    if (grupeLoading) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" onClick={onBack}><ArrowLeftIcon className="w-5 h-5 mr-2" />Înapoi</Button>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white">Management Grupe & Orar</h1>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-slate-800 rounded-xl p-6 animate-pulse">
                            <div className="h-6 bg-slate-700 rounded w-2/3 mb-4"></div>
                            <div className="h-4 bg-slate-700 rounded w-1/2 mb-2"></div>
                            <div className="h-4 bg-slate-700 rounded w-1/3"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {grupaSelectedForDetail ? (
                <GrupaDetailView
                    grupa={grupaSelectedForDetail}
                    onBack={handleCloseGrupaDetail}
                    onOpenAdaugaSportivi={(g) => setGrupaForAdaugaSportivi(g)}
                />
            ) : (
                <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <Button variant="secondary" onClick={onBack}><ArrowLeftIcon className="w-5 h-5 mr-2" />Înapoi</Button>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white">Management Grupe & Orar</h1>
                            <CalendarQuickLink onNavigate={onNavigate} />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                                variant="secondary"
                                onClick={handleRefresh}
                                isLoading={isRefreshing}
                                title="Reîncarcă datele (util dacă alți admini au făcut modificări)"
                                className="flex-1 sm:flex-none"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                Actualizează
                            </Button>
                            <Button onClick={handleOpenAdd} variant="info" className="flex-1 sm:flex-none" data-tour="grupe-adauga"><PlusIcon className="w-5 h-5 mr-2" />Adaugă Grupă</Button>
                        </div>
                    </div>
                    {filtruSezonActiv && (
                        <div className="flex flex-wrap items-center gap-2 text-sm bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2">
                            <span className="text-slate-300">
                                Filtrat după sezon: <strong className="text-white">{sezonFiltruDenumire || '—'}</strong> (+ grupe permanente)
                            </span>
                            <button
                                type="button"
                                onClick={() => setFiltruSezonDezactivat(true)}
                                className="text-blue-400 hover:text-blue-300 underline ml-auto"
                            >
                                Vezi toate grupele
                            </button>
                        </div>
                    )}
                    {grupe.length > 0 ? (
                        <div data-tour="grupe-lista" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(grupeAfisate as GrupaWithDetails[]).map(grupa => (
                                <GrupaCard key={grupa.id} grupa={grupa} onEdit={handleOpenEdit} onDelete={setGrupaToDelete} onDetalii={handleOpenGrupaDetail} onModificareOrar={setGrupaForModificareOrar} onGestionareSecundari={setGrupaForSecundari} onGenerareAntrenamente={setGrupaForGenerare} sezonActivId={sezonActiv?.id ?? null} onDubleaza={setGrupaToClone} nrFaraAbonamentValid={nrFaraAbonamentValidPerGrupa.get(grupa.id) || 0} />
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={<UsersIcon className="w-10 h-10 text-[var(--t-text-muted)]" />}
                            title="Nicio grupă creată încă"
                            description="Grupele organizează sportivii pe zile și ore de antrenament, iar prezența se ia pe grupă. Creează prima grupă pentru a începe."
                            actionLabel="Adaugă Grupă"
                            onAction={handleOpenAdd}
                        />
                    )}
                </>
            )}

            <TourOverlay steps={TOURS.grupe} pageKey="grupe" />
            <TourButton steps={TOURS.grupe} pageKey="grupe" />
            <GrupaFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} grupaToEdit={grupaToEdit} currentUser={currentUser} clubs={clubs} locatii={locatii} onLocatieAdded={handleLocatieAdded} />
            <ConfirmDeleteModal isOpen={!!grupaToDelete} onClose={() => setGrupaToDelete(null)} onConfirm={() => { if(grupaToDelete) confirmDelete(grupaToDelete.id) }} tableName="Grupe" isLoading={isDeleting} />
            {grupaToClone && (
                <ConfirmModal
                    isOpen={true}
                    onClose={() => setGrupaToClone(null)}
                    onConfirm={handleDubleaza}
                    variant="info"
                    title="Dublează în sezon nou"
                    confirmLabel="Dublează"
                    message={`Se va crea o grupă nouă '${grupaToClone.denumire}' legată de sezonul '${sezonActiv?.denumire ?? '—'}', fără sportivi asignați — sportivii se re-asignează manual după clonare.`}
                />
            )}
            {grupaForOrar && (
                <OrarEditorModal
                    isOpen={!!grupaForOrar}
                    onClose={() => setGrupaForOrar(null)}
                    grupa={grupaForOrar}
                    setGrupe={setGrupe}
                />
            )}
            {grupaForModificareOrar && (
                <OrarModificareModal
                    isOpen={!!grupaForModificareOrar}
                    onClose={() => setGrupaForModificareOrar(null)}
                    grupa={grupaForModificareOrar}
                    currentUserId={currentUser?.id ?? ''}
                    onSaved={handleRefresh}
                />
            )}
            {grupaForAdaugaSportivi && (
                <AdaugaSportiviModal
                    isOpen={!!grupaForAdaugaSportivi}
                    onClose={() => setGrupaForAdaugaSportivi(null)}
                    grupa={grupaForAdaugaSportivi}
                    totiSportivii={sportivi as Sportiv[]}
                    sportiviInGrupa={(sportivi as Sportiv[]).filter(s => s.grupa_id === grupaForAdaugaSportivi.id)}
                    onSave={handleAdaugaSportiviInGrupa}
                    onRemove={handleScoateSportivDinGrupa}
                />
            )}
            {grupaForSecundari && (
                <GrupeSecundareModal
                    isOpen={!!grupaForSecundari}
                    onClose={() => setGrupaForSecundari(null)}
                    grupa={grupaForSecundari}
                    totiSportivii={sportivi as Sportiv[]}
                    toateGrupele={grupeClub as GrupaWithDetails[]}
                    onChanged={handleRefresh}
                />
            )}
            {grupaForGenerare && (
                <GenerareAntrenamenteModal
                    isOpen={!!grupaForGenerare}
                    onClose={() => setGrupaForGenerare(null)}
                    grupa={grupaForGenerare}
                />
            )}
        </div>
    );
};
