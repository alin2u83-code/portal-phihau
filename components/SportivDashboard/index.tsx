import React, { useState, useMemo, useEffect } from 'react';
import { Sportiv, InscriereExamen, Grad, Grupa, Plata, User, View, AnuntPrezenta, SesiuneExamen, Antrenament, Permissions, Rol, IstoricGrade, Produs, ProdusVanzare, ProdusVariantaDB, CerereProdusFull } from '../../types';
import { fetchProduse, fetchVanzariSportiv } from '../../services/produseService';
import { fetchCereriSportiv, createCerere, fetchAdminClubUserIds } from '../../services/comenziService';
import { Card, Button, Modal, Select, Badge, Accordion, AccordionItem } from '../ui';
import toast from 'react-hot-toast';
import { useError } from '../ErrorProvider';
import { supabase } from '../../supabaseClient';
import { TrophyIcon, CalendarDaysIcon, ChartBarIcon } from '../icons';
import { Loader2 } from 'lucide-react';
import { restDePlata } from '../../utils/paymentStatus';
import { AntrenamenteViitoare } from '../AntrenamenteViitoare';
import { UpcomingTrainingsWidget } from '../UpcomingTrainingsWidget';
import { SportivProgressChart } from '../Sportivi/SportivProgressChart';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell } from 'recharts';
import { useDataProvider } from '../../hooks/useDataProvider';
import { useAttendanceStats } from '../../hooks/useAttendanceStats';
import { useDashboardPermissions } from '../../hooks/useDashboardPermissions';
import { VizaMedicalaCard, areVizaValida } from './VizaMedicalaCard';
import { TrainingActionCard, AnuntStatus } from './TrainingActionCard';
import { HistoryModal } from './HistoryModal';
import { FamilieWidget } from './FamilieWidget';
import { EvenimenteWidget } from '../EvenimenteWidget';
import { SportivPassport } from '../Sportivi/SportivPassport';

const getGrad = (gradId: string | null, allGrades: Grad[]) =>
    gradId ? allGrades.find(g => g.id === gradId) ?? null : null;

interface SportivDashboardProps {
    currentUser: User;
    viewedUser: User;
    participari: InscriereExamen[];
    examene: SesiuneExamen[];
    grade: Grad[];
    istoricGrade: IstoricGrade[];
    grupe: Grupa[];
    plati: Plata[];
    onNavigate: (view: View) => void;
    antrenamente: Antrenament[];
    anunturi: AnuntPrezenta[];
    setAnunturi: React.Dispatch<React.SetStateAction<AnuntPrezenta[]>>;
    sportivi: Sportiv[];
    permissions: Permissions;
    canSwitchRoles: boolean;
    activeRole: Rol['nume'];
    onSwitchRole: (roleName: Rol['nume']) => void;
    isSwitchingRole: boolean;
    isAdminView?: boolean;
}

export const SportivDashboard: React.FC<SportivDashboardProps> = ({
    currentUser, viewedUser, participari, examene, grade, istoricGrade, grupe,
    plati, onNavigate, antrenamente, anunturi, setAnunturi, sportivi,
    permissions, canSwitchRoles, activeRole, onSwitchRole, isSwitchingRole,
    isAdminView = false
}) => {
    const { showSuccess, showError } = useError();
    const { istoricPrezenta, fetchIstoricVedere, loadingIstoric } = useDataProvider();
    const { isViewingOwnProfile } = useDashboardPermissions(currentUser, viewedUser, permissions);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [openSection, setOpenSection] = useState<string>('');
    const toggleSection = (id: string) => setOpenSection(prev => prev === id ? '' : id);

    // Echipamente state
    const [produseCatalog, setProduseCatalog] = useState<Produs[]>([]);
    const [vanzariMele, setVanzariMele] = useState<ProdusVanzare[]>([]);
    const [loadingProduse, setLoadingProduse] = useState(false);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'echipamente'>('dashboard');

    // Comenzile mele state (CMD-02)
    const [cereriMele, setCereriMele] = useState<CerereProdusFull[]>([]);
    const [cerereModalOpen, setCerereModalOpen] = useState(false);
    const [selectedProdusId, setSelectedProdusId] = useState<string>('');
    const [selectedVariantaId, setSelectedVariantaId] = useState<string>('');
    const [cantitate, setCantitate] = useState<string>('1');
    const [submittingCerere, setSubmittingCerere] = useState(false);

    // Fix: dacă grupe din context e gol (RLS sportiv), fetch direct grupa sportivului
    const [grupaName, setGrupaName] = useState<string>('');
    const [grupaLoading, setGrupaLoading] = useState(false);

    useEffect(() => {
        if (viewedUser?.id) fetchIstoricVedere(viewedUser.id);
    }, [viewedUser?.id, fetchIstoricVedere]);

    useEffect(() => {
        if (!viewedUser.grupa_id) { setGrupaName('Fără grupă'); return; }
        const found = grupe.find(g => g.id === viewedUser.grupa_id);
        if (found) { setGrupaName(found.denumire); return; }
        // Grupe array gol (RLS sportiv) → fetch direct
        setGrupaLoading(true);
        const fetchGrupa = async () => {
            const { data } = await supabase.from('grupe').select('denumire').eq('id', viewedUser.grupa_id!).maybeSingle();
            setGrupaName(data?.denumire || 'Grupă necunoscută');
            setGrupaLoading(false);
        };
        fetchGrupa();
    }, [viewedUser.grupa_id, grupe]);

    // Fetch echipamente pentru tab Echipamente
    useEffect(() => {
        if (!viewedUser?.id) return;
        setLoadingProduse(true);
        Promise.all([
            fetchProduse(),
            fetchVanzariSportiv(viewedUser.id),
        ]).then(([p, v]) => {
            setProduseCatalog(p.filter(p2 => p2.activ));
            setVanzariMele(v);
            setLoadingProduse(false);
        }).catch(() => setLoadingProduse(false));
    }, [viewedUser.id]);

    // Fetch cereri proprii (CMD-02) — silent catch (tab secundar)
    const fetchCereriMele = () => {
        if (!viewedUser?.id) return;
        fetchCereriSportiv(viewedUser.id).then(setCereriMele).catch(() => {});
    };

    useEffect(() => {
        fetchCereriMele();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewedUser.id]);

    const todayString = useMemo(() => {
        const d = new Date();
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    }, []);

    const todaysTrainings = useMemo(() =>
        (antrenamente || [])
            .filter(a =>
                (a.data || '').toString().slice(0, 10) === todayString &&
                (a.grupa_id === currentUser.grupa_id || (currentUser.participa_vacanta && a.grupa_id === null))
            )
            .sort((a, b) => a.ora_start.localeCompare(b.ora_start)),
        [antrenamente, todayString, currentUser]
    );

    // Handler plasare cerere echipament (CMD-02)
    // Guard: numai dacă e profilul propriu al sportivului
    const handlePlasareCerere = async () => {
        if (!isViewingOwnProfile || !viewedUser.id || !viewedUser.club_id) return;
        if (!selectedVariantaId || parseInt(cantitate) < 1) {
            toast.error('Selectați un produs, o variantă și o cantitate validă.');
            return;
        }
        setSubmittingCerere(true);
        try {
            const adminIds = await fetchAdminClubUserIds(viewedUser.club_id);
            await createCerere({
                club_id: viewedUser.club_id,
                sportiv_id: viewedUser.id,
                varianta_id: selectedVariantaId,
                cantitate: parseInt(cantitate) || 1,
                adminClubUserIds: adminIds,
            });
            toast.success('Cererea a fost trimisă adminului clubului.');
            setCerereModalOpen(false);
            setSelectedProdusId('');
            setSelectedVariantaId('');
            setCantitate('1');
            fetchCereriMele();
        } catch (err: any) {
            toast.error(err?.message ?? 'Eroare la trimiterea cererii.');
        } finally {
            setSubmittingCerere(false);
        }
    };

    const handleStatusChange = async (trainingId: string, status: AnuntStatus) => {
        if (!currentUser?.id || !currentUser.user_id || !currentUser.club_id) {
            showError("Sesiune invalidă", "Profilul tău nu este complet încărcat.");
            return;
        }
        try {
            const existingAnunt = (anunturi || []).find(a => a.antrenament_id === trainingId && a.sportiv_id === currentUser.id);
            const upsertData: Omit<AnuntPrezenta, 'id'> & { id?: string } = {
                id: existingAnunt?.id,
                antrenament_id: trainingId,
                sportiv_id: currentUser.id,
                club_id: currentUser.club_id,
                status,
                detalii: null
            };
            const { data, error } = await supabase
                .from('anunturi_prezenta')
                .upsert(upsertData, { onConflict: 'antrenament_id, sportiv_id' })
                .select().maybeSingle();
            if (error) throw error;
            if (data) {
                showSuccess("Status actualizat", `Ai anunțat: ${status}`);
                setAnunturi(prev => {
                    const idx = prev.findIndex(a => a.id === data.id || (a.antrenament_id === data.antrenament_id && a.sportiv_id === data.sportiv_id));
                    if (idx > -1) { const n = [...prev]; n[idx] = data; return n; }
                    return [...prev, data as AnuntPrezenta];
                });
            }
        } catch (error: any) {
            if (error.code === '42501' || error.message?.includes('violates row-level security policy')) {
                showError("Lipsă permisiuni", "Nu aveți permisiunea de a înregistra prezența.");
            } else {
                showError("Eroare", error.message);
            }
        }
    };

    const currentGrad = useMemo(() => {
        const official = getGrad(viewedUser.grad_actual_id ?? null, grade);
        if (official) return official;
        const admitted = (participari || [])
            .filter(p => p.sportiv_id === viewedUser.id && p.rezultat === 'Admis')
            .map(p => ({ ...p, examen: (examene || []).find(e => e.id === p.sesiune_id) }))
            .sort((a, b) => new Date((b.examen?.data || '').toString().slice(0, 10) || 0).getTime() - new Date((a.examen?.data || '').toString().slice(0, 10) || 0).getTime());
        return getGrad(admitted[0]?.grad_sustinut_id || null, grade);
    }, [participari, viewedUser.grad_actual_id, viewedUser.id, grade, examene]);

    const gradeHistoryData = useMemo(() => {
        if (!participari || !grade || !examene || !istoricGrade) return [];
        const examGrades = (participari || [])
            .filter(p => p.sportiv_id === viewedUser.id && p.rezultat === 'Admis')
            .map(p => {
                const examen = (examene || []).find(e => e.id === p.sesiune_id);
                const grad = (grade || []).find(g => g.id === p.grad_sustinut_id);
                if (!examen || !grad) return null;
                return { source: 'examen', date: new Date((examen.data || '').toString().slice(0, 10)).getTime(), rankName: grad.nume, rank: grad.ordine };
            })
            .filter((p): p is NonNullable<typeof p> => p !== null);
        const manualGrades = (istoricGrade || [])
            .filter(hg => hg.sportiv_id === viewedUser.id && !hg.sesiune_examen_id)
            .map(hg => {
                const grad = (grade || []).find(g => g.id === hg.grad_id);
                if (!grad) return null;
                return { source: 'manual', date: new Date((hg.data_obtinere || '').toString().slice(0, 10)).getTime(), rankName: grad.nume, rank: grad.ordine };
            })
            .filter((g): g is NonNullable<typeof g> => g !== null);
        return [...examGrades, ...manualGrades].sort((a, b) => a.date - b.date).map(item => ({
            date: new Date(item.date).toLocaleDateString('ro-RO'),
            rankOrder: item.rank,
            rankName: item.rankName,
            timestamp: item.date,
            source: item.source
        }));
    }, [participari, examene, grade, istoricGrade, viewedUser.id]);

    const totalPrezente = useMemo(() =>
        istoricPrezenta.filter(p => p.status?.toLowerCase() === 'prezent').length,
        [istoricPrezenta]
    );

    const neachitate = useMemo(() =>
        (plati || []).filter(p => p.sportiv_id === viewedUser.id && p.status === 'Neachitat'),
        [plati, viewedUser.id]
    );
    const statusPlati: 'RESTANTA' | 'LA ZI' = neachitate.length > 0 ? 'RESTANTA' : 'LA ZI';
    const sumaRestanta = neachitate.reduce((acc, p) => acc + restDePlata(p), 0);
    const vizaValida = areVizaValida(plati || [], viewedUser.id);

    const { attendanceStats, gradeStats } = useAttendanceStats(istoricPrezenta, istoricGrade, grade);

    return (
        <div className="space-y-6 pb-28 md:pb-24">

            {/* ── MINI TABS ───────────────────────────────────────────── */}
            <div className="flex gap-1 bg-[var(--t-surface-2)] p-1 rounded-xl border border-[var(--t-border)]">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                        activeTab === 'dashboard'
                            ? 'bg-[var(--accent)] text-white shadow'
                            : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
                    }`}
                >
                    Dashboard
                </button>
                <button
                    onClick={() => setActiveTab('echipamente')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                        activeTab === 'echipamente'
                            ? 'bg-[var(--accent)] text-white shadow'
                            : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
                    }`}
                >
                    Echipamente
                </button>
            </div>

            {/* ── TAB ECHIPAMENTE ─────────────────────────────────────── */}
            {activeTab === 'echipamente' && (
                <div className="space-y-6">

                    {/* ── COMENZILE MELE (CMD-02) ─────────────────────── */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-bold text-white">Comenzile mele</h3>
                            {isViewingOwnProfile && viewedUser.club_id && (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => setCerereModalOpen(true)}
                                >
                                    Solicită produs
                                </Button>
                            )}
                        </div>
                        {cereriMele.length === 0 ? (
                            <div className="text-slate-400 text-sm py-4 text-center bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl">
                                Nicio cerere plasată
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {cereriMele.map(c => (
                                    <div key={c.id} className="bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl px-4 py-3">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="min-w-0">
                                                <div className="text-white font-medium text-sm truncate">
                                                    {c.varianta?.produs?.denumire ?? 'Produs necunoscut'}
                                                </div>
                                                <div className="text-slate-400 text-xs mt-0.5">
                                                    {[c.varianta?.culoare, c.varianta?.marime].filter(Boolean).join(' · ') || 'Variantă standard'}
                                                    {' · '}Cant. {c.cantitate}
                                                </div>
                                                <div className="text-slate-500 text-xs mt-0.5">
                                                    {new Date(c.created_at).toLocaleDateString('ro-RO')}
                                                </div>
                                            </div>
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                                c.stare_cerere === 'SOLICITATA' ? 'bg-amber-500/15 text-amber-400' :
                                                c.stare_cerere === 'CONFIRMATA' ? 'bg-sky-500/15 text-sky-400' :
                                                c.stare_cerere === 'PLASATA' ? 'bg-indigo-500/15 text-indigo-400' :
                                                c.stare_cerere === 'SOSITA' ? 'bg-emerald-500/15 text-emerald-400' :
                                                c.stare_cerere === 'PREDATA' ? 'bg-green-500/15 text-green-400' :
                                                c.stare_cerere === 'PLATITA' ? 'bg-green-600/15 text-green-300' :
                                                'bg-rose-500/15 text-rose-400'
                                            }`}>
                                                {c.stare_cerere}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Modal plasare cerere */}
                    <Modal
                        isOpen={cerereModalOpen}
                        onClose={() => {
                            setCerereModalOpen(false);
                            setSelectedProdusId('');
                            setSelectedVariantaId('');
                            setCantitate('1');
                        }}
                        title="Solicită produs"
                    >
                        <div className="space-y-4">
                            <Select
                                label="Produs"
                                value={selectedProdusId}
                                onChange={e => {
                                    setSelectedProdusId(e.target.value);
                                    setSelectedVariantaId('');
                                }}
                            >
                                <option value="">— Selectați produsul —</option>
                                {produseCatalog.filter(p => (p.tip_produs ?? 'per_sportiv') === 'per_sportiv').map(p => (
                                    <option key={p.id} value={p.id}>{p.denumire}</option>
                                ))}
                            </Select>
                            {selectedProdusId && (
                                <Select
                                    label="Variantă"
                                    value={selectedVariantaId}
                                    onChange={e => setSelectedVariantaId(e.target.value)}
                                >
                                    <option value="">— Selectați varianta —</option>
                                    {(produseCatalog.find(p => p.id === selectedProdusId)?.variante ?? [])
                                        .filter((v: ProdusVariantaDB) => v.activa)
                                        .map((v: ProdusVariantaDB) => (
                                            <option key={v.id} value={v.id}>
                                                {[v.culoare, v.marime].filter(Boolean).join(' ') || 'Standard'} — {v.pret_vanzare.toFixed(2)} RON
                                            </option>
                                        ))}
                                </Select>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">Cantitate</label>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={cantitate}
                                    onChange={e => setCantitate(e.target.value)}
                                    className="w-full bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-xl px-4 py-3 text-sm text-[var(--t-text)] focus:outline-none focus:ring-2 transition-all"
                                />
                            </div>
                            <div className="flex justify-end gap-3 border-t border-[var(--t-border)] pt-4">
                                <Button
                                    variant="secondary"
                                    onClick={() => setCerereModalOpen(false)}
                                    disabled={submittingCerere}
                                >
                                    Anulează
                                </Button>
                                <Button
                                    onClick={handlePlasareCerere}
                                    isLoading={submittingCerere}
                                    disabled={!selectedVariantaId || parseInt(cantitate) < 1}
                                >
                                    Trimite cerere
                                </Button>
                            </div>
                        </div>
                    </Modal>

                    {/* Istoricul achizițiilor */}
                    <div>
                        <h3 className="text-base font-bold text-white mb-3">Achizițiile mele</h3>
                        {loadingProduse ? (
                            <div className="text-slate-400 text-sm">Se încarcă...</div>
                        ) : vanzariMele.length === 0 ? (
                            <div className="text-slate-400 text-sm py-4 text-center">Nicio achiziție înregistrată</div>
                        ) : (
                            <div className="space-y-2">
                                {vanzariMele.map(v => (
                                    <div key={v.id} className="bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl px-4 py-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="text-white font-medium text-sm">
                                                    {v.detalii.map(d => d.denumire_snapshot).join(', ')}
                                                </div>
                                                <div className="text-slate-400 text-xs mt-1">
                                                    {new Date(v.data_vanzare).toLocaleDateString('ro-RO')} · {v.detalii.length} produse
                                                </div>
                                            </div>
                                            <span className="text-white font-bold text-sm shrink-0">{v.total_vanzare.toFixed(2)} RON</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Catalog produse disponibile */}
                    <div>
                        <h3 className="text-base font-bold text-white mb-3">Produse disponibile</h3>
                        {loadingProduse ? (
                            <div className="text-slate-400 text-sm">Se încarcă...</div>
                        ) : produseCatalog.length === 0 ? (
                            <div className="text-slate-400 text-sm py-4 text-center">Niciun produs în catalog</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {produseCatalog.map(p => {
                                    const varianteActive = p.variante.filter(v => v.activa);
                                    const preturi = varianteActive.map(v => v.pret_vanzare);
                                    const pretMin = preturi.length > 0 ? Math.min(...preturi) : 0;
                                    const pretMax = preturi.length > 0 ? Math.max(...preturi) : 0;
                                    return (
                                        <div key={p.id} className="bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl px-4 py-3">
                                            <div className="text-white font-medium text-sm">{p.denumire}</div>
                                            <div className="text-slate-400 text-xs mt-1">{p.categorie?.denumire}</div>
                                            <div className="text-slate-300 text-sm font-bold mt-2">
                                                {varianteActive.length === 0 ? 'Indisponibil' :
                                                    pretMin === pretMax ? `${pretMin.toFixed(2)} RON` :
                                                    `${pretMin.toFixed(2)} – ${pretMax.toFixed(2)} RON`
                                                }
                                            </div>
                                            {varianteActive.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {varianteActive.map(v => (
                                                        <span key={v.id} className="text-xs bg-slate-700 text-slate-300 rounded px-2 py-0.5">
                                                            {[v.culoare, v.marime].filter(Boolean).join(' ') || 'Standard'}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── CONȚINUT DASHBOARD ──────────────────────────────────── */}
            {activeTab === 'dashboard' && <>

            {/* ── 1. SALUT ────────────────────────────────────────────── */}
            <div>
                <h2 className="text-2xl font-semibold leading-tight text-[var(--t-text)]">
                    {isViewingOwnProfile ? `Bună ziua, ${viewedUser.prenume}` : `${viewedUser.nume} ${viewedUser.prenume}`}
                </h2>
                <p className="text-sm text-[var(--t-text-muted)] mt-1">
                    {currentGrad?.nume ?? 'Fără grad'} · {grupaLoading ? 'Se încarcă…' : grupaName}
                </p>
            </div>

            {/* ── 2. ANTRENAMENT ──────────────────────────────────────── */}
            {isViewingOwnProfile && (todaysTrainings.length > 0 ? (
                <div className="space-y-4">
                    {todaysTrainings.map(training => (
                        <TrainingActionCard
                            key={training.id}
                            training={training}
                            anunt={(anunturi || []).find(a => a.antrenament_id === training.id && a.sportiv_id === currentUser.id)}
                            onStatusChange={handleStatusChange}
                            currentUser={currentUser}
                            onNavigate={onNavigate}
                        />
                    ))}
                </div>
            ) : (
                <Card className="md:p-6">
                    <h3 className="text-base font-semibold text-[var(--t-text)]">Niciun antrenament programat</h3>
                    <p className="text-sm text-[var(--t-text-muted)] mt-1">Când instructorul adaugă un orar, îl vei vedea aici.</p>
                </Card>
            ))}

            {/* ── 3. PLĂȚI + VIZĂ MEDICALĂ ────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <Card className={`md:p-6 ${vizaValida ? 'md:col-span-2' : ''}`}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <h3 className="text-base font-semibold text-[var(--t-text)]">Plăți</h3>
                        <Badge variant={statusPlati === 'RESTANTA' ? 'red' : 'green'}>
                            {statusPlati === 'RESTANTA' ? `${neachitate.length} restante` : 'La zi'}
                        </Badge>
                    </div>
                    <p
                        className="text-2xl font-semibold text-[var(--t-text)]"
                        style={statusPlati === 'RESTANTA' ? { color: 'var(--t-status-danger)' } : undefined}
                    >
                        {sumaRestanta.toFixed(2)} RON
                    </p>
                    {isViewingOwnProfile && (
                        <Button variant="secondary" ghost size="sm" className="mt-3" onClick={() => onNavigate('istoric-plati')}>
                            Vezi detalii plăți
                        </Button>
                    )}
                </Card>
                <VizaMedicalaCard plati={plati} sportivId={viewedUser.id} />
            </div>

            {/* ── 4. EVENIMENTE + PROGRES ─────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <EvenimenteWidget sportivId={viewedUser.id} clubId={viewedUser.club_id} />
                <Card className="md:p-6 overflow-hidden">
                    <h3 className="text-base font-semibold text-[var(--t-text)] mb-3">Progres</h3>
                    <div className="h-44">
                        <SportivProgressChart
                            data={gradeHistoryData}
                            themeColor={getComputedStyle(document.documentElement).getPropertyValue('--t-primary').trim() || '#3b82f6'}
                        />
                    </div>
                    {isViewingOwnProfile && (
                        <Button variant="secondary" ghost size="sm" className="mt-3" onClick={() => setIsHistoryOpen(true)}>
                            Istoric prezențe
                        </Button>
                    )}
                </Card>
            </div>

            {/* ── 5. FAMILIE ──────────────────────────────────────────── */}
            {viewedUser.familie_id && (
                <FamilieWidget
                    currentUser={viewedUser}
                    isViewingOwnProfile={isViewingOwnProfile}
                    grade={grade}
                />
            )}

            {/* ── DETALII (acordeon, închis implicit) ─────────────────── */}
            <Accordion>
                <AccordionItem id="prezente" title="Prezențe" icon={ChartBarIcon} isOpen={openSection === 'prezente'} onToggle={toggleSection}>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-semibold text-[var(--t-text)]">Prezențe recente</h3>
                                <span className="text-base font-semibold text-[var(--t-text)]">{loadingIstoric ? '...' : totalPrezente}</span>
                            </div>
                            {loadingIstoric ? (
                                <div className="h-40 flex items-center justify-center">
                                    <Loader2 className="w-5 h-5 animate-spin text-[var(--t-text-muted)]" />
                                </div>
                            ) : totalPrezente === 0 ? (
                                <div className="h-40 flex flex-col items-center justify-center text-[var(--t-text-muted)] bg-[var(--t-surface-2)] rounded-xl border border-[var(--t-border)]">
                                    <CalendarDaysIcon className="w-5 h-5 mb-2" />
                                    <p className="text-xs">Nicio prezență înregistrată.</p>
                                </div>
                            ) : (
                                <div className="h-40 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={attendanceStats.recent} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                                            <XAxis dataKey="month" stroke="var(--t-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="var(--t-text-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                            <RechartsTooltip
                                                cursor={{ fill: 'var(--t-surface-2)' }}
                                                contentStyle={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: '8px', color: 'var(--t-text)', fontSize: 12 }}
                                                formatter={(value: number) => [`${value} prezențe`, '']}
                                            />
                                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                                {attendanceStats.recent.map((_, i) => (
                                                    <Cell key={i} fill={i === attendanceStats.recent.length - 1 ? 'var(--t-primary)' : 'var(--t-border)'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        {gradeStats.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-[var(--t-text)] mb-3">Prezențe pe intervale de grad</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {gradeStats.map((stat, idx) => (
                                        <div key={`${stat.period}-${idx}`} className="flex flex-col p-3 bg-[var(--t-surface-2)] rounded-xl border border-[var(--t-border)]">
                                            <span className="text-xs text-[var(--t-text-muted)] mb-1 truncate">{stat.period}</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-base font-semibold text-[var(--t-text)]">{stat.count}</span>
                                                <span className="text-xs text-[var(--t-text-muted)]">prez.</span>
                                            </div>
                                            <span className="text-xs text-[var(--t-text-muted)] mt-1">până la {new Date(stat.date).toLocaleDateString('ro-RO')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </AccordionItem>

                <AccordionItem id="pasaport" title="Pașaport virtual" icon={TrophyIcon} isOpen={openSection === 'pasaport'} onToggle={toggleSection}>
                    <SportivPassport
                        viewedUser={viewedUser}
                        grade={grade}
                        participari={participari}
                        examene={examene}
                        istoricGrade={istoricGrade}
                        plati={plati}
                    />
                </AccordionItem>

                <AccordionItem id="antrenamente" title="Antrenamente viitoare" icon={CalendarDaysIcon} isOpen={openSection === 'antrenamente'} onToggle={toggleSection}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <AntrenamenteViitoare currentUser={viewedUser} antrenamente={antrenamente} grupe={grupe} anunturi={anunturi} />
                        <UpcomingTrainingsWidget currentUser={viewedUser} grupe={grupe} />
                    </div>
                </AccordionItem>
            </Accordion>

            <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} istoric={istoricPrezenta} />

            </> /* end activeTab === 'dashboard' */}
        </div>
    );
};
