import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { User, Sportiv, Familie, TipAbonament, Grad } from '../../types';
import { Card, Button, Modal } from '../ui';
import { UsersIcon, WalletIcon, ChevronRightIcon, CheckCircleIcon, ExclamationTriangleIcon } from '../icons';
import { GradBadge } from '../../utils/grades';
import { useError } from '../ErrorProvider';

interface FamilieWidgetProps {
    currentUser: User;
    isViewingOwnProfile: boolean;
    grade: Grad[];
}

interface FamilieState {
    familie: Familie | null;
    membri: Sportiv[];
    tipuriFamilie: TipAbonament[];
    tipuriIndividuale: TipAbonament[];
}

interface SiblingDetail extends Sportiv {
    plati_restante?: number;
    prezente_total?: number;
}

export const FamilieWidget: React.FC<FamilieWidgetProps> = ({ currentUser, isViewingOwnProfile, grade }) => {
    const { showSuccess, showError } = useError();
    const [state, setState] = useState<FamilieState>({ familie: null, membri: [], tipuriFamilie: [], tipuriIndividuale: [] });
    const [loading, setLoading] = useState(true);
    const [selectedSibling, setSelectedSibling] = useState<SiblingDetail | null>(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [loadingSibling, setLoadingSibling] = useState(false);

    useEffect(() => {
        if (!currentUser.familie_id) { setLoading(false); return; }

        const fetchFamilieData = async () => {
            setLoading(true);
            try {
                const [familieRes, membriiRes, tipuriRes] = await Promise.all([
                    supabase.from('familii').select('*').eq('id', currentUser.familie_id!).maybeSingle(),
                    supabase.from('sportivi').select('id, nume, prenume, foto_url, grad_actual_id, tip_abonament_id, familie_id, status').eq('familie_id', currentUser.familie_id!),
                    supabase.from('tipuri_abonament').select('*').order('numar_membri').order('pret'),
                ]);

                const toateTipurile: TipAbonament[] = tipuriRes.data || [];
                setState({
                    familie: familieRes.data || null,
                    membri: membriiRes.data || [],
                    tipuriFamilie: toateTipurile.filter(t => t.numar_membri >= 2),
                    tipuriIndividuale: toateTipurile.filter(t => t.numar_membri < 2),
                });
            } finally {
                setLoading(false);
            }
        };

        fetchFamilieData();
    }, [currentUser.familie_id, currentUser.club_id]);

    const handleOpenSibling = async (sibling: Sportiv) => {
        setLoadingSibling(true);
        setSelectedSibling(sibling as SiblingDetail);
        try {
            const [platiRes, prezenteRes] = await Promise.all([
                supabase.from('plati').select('id, status').eq('sportiv_id', sibling.id),
                supabase.from('vedere_prezenta_sportiv').select('id, status').eq('sportiv_id', sibling.id),
            ]);
            const restante = (platiRes.data || []).filter(p => p.status === 'Neachitat').length;
            const prezente = (prezenteRes.data || []).filter(p => p.status?.toLowerCase() === 'prezent').length;
            setSelectedSibling({ ...sibling, plati_restante: restante, prezente_total: prezente });
        } catch {
            // Statistici indisponibile din cauza RLS — afișăm ce avem
        } finally {
            setLoadingSibling(false);
        }
    };

    const handleUpgradeAbonament = async () => {
        if (!selectedPlanId || !state.familie) return;
        setSaving(true);
        const { error } = await supabase
            .from('familii')
            .update({ tip_abonament_id: selectedPlanId })
            .eq('id', currentUser.familie_id!);
        setSaving(false);
        if (error) {
            showError('Eroare', 'Nu s-a putut actualiza abonamentul. Contactați administratorul.');
        } else {
            const planNou = state.tipuriFamilie.find(t => t.id === selectedPlanId);
            showSuccess('Abonament actualizat', `Familia ${state.familie.nume} are acum: ${planNou?.denumire}`);
            setState(prev => ({
                ...prev,
                familie: prev.familie ? { ...prev.familie, tip_abonament_id: selectedPlanId } : null,
            }));
            setShowUpgradeModal(false);
            setSelectedPlanId('');
        }
    };

    if (!currentUser.familie_id) return null;
    if (loading) return (
        <Card className="border border-slate-800 bg-slate-900/50 animate-pulse">
            <div className="h-4 w-32 bg-slate-700 rounded mb-3" />
            <div className="space-y-2">
                <div className="h-10 bg-slate-800 rounded-xl" />
                <div className="h-10 bg-slate-800 rounded-xl" />
            </div>
        </Card>
    );
    if (!state.familie && state.membri.length === 0) return null;

    const { familie, membri, tipuriFamilie } = state;
    const isRepresentative = familie?.reprezentant_id === currentUser.id;
    const planFamilie = tipuriFamilie.find(t => t.id === familie?.tip_abonament_id) ?? null;
    const arePlanFamilie = !!familie?.tip_abonament_id && planFamilie !== null;
    const siblings = membri.filter(m => m.id !== currentUser.id);
    const areAbonamenteIndividuale = !arePlanFamilie && membri.length >= 2;

    return (
        <>
            <Card className="border border-slate-800 bg-slate-900/50">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <UsersIcon className="w-4 h-4 text-violet-400" />
                        Familia {familie?.nume ?? ''}
                    </h3>
                    {arePlanFamilie && planFamilie ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">
                            <CheckCircleIcon className="w-3 h-3" />
                            {planFamilie.denumire}
                        </span>
                    ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400">
                            Abonamente individuale
                        </span>
                    )}
                </div>

                {/* Membrii familie */}
                <div className="space-y-2">
                    {membri.map(member => {
                        const isSelf = member.id === currentUser.id;
                        const isRep = familie?.reprezentant_id === member.id;
                        const gradMember = grade.find(g => g.id === member.grad_actual_id) ?? null;
                        return (
                            <div
                                key={member.id}
                                onClick={() => !isSelf && handleOpenSibling(member)}
                                className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${
                                    isSelf
                                        ? 'border-sky-500/30 bg-sky-500/5 cursor-default'
                                        : 'border-slate-700/40 bg-slate-800/30 cursor-pointer hover:bg-slate-700/40 active:scale-[0.99]'
                                }`}
                            >
                                {/* Avatar */}
                                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden text-xs font-bold text-slate-300 ring-2 ring-slate-600/50">
                                    {member.foto_url ? (
                                        <img src={member.foto_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                        `${member.nume?.[0] ?? ''}${member.prenume?.[0] ?? ''}`
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <p className="text-sm font-semibold text-white truncate">
                                            {member.nume} {member.prenume}
                                        </p>
                                        {isSelf && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400">Tu</span>
                                        )}
                                        {isRep && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">Reprezentant</span>
                                        )}
                                    </div>
                                    {gradMember && (
                                        <div className="mt-0.5">
                                            <GradBadge grad={gradMember} gradName={gradMember.nume} />
                                        </div>
                                    )}
                                </div>

                                {!isSelf && (
                                    <ChevronRightIcon className="w-4 h-4 text-slate-500 shrink-0" />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Banner upgrade la plan familie */}
                {isViewingOwnProfile && areAbonamenteIndividuale && tipuriFamilie.length > 0 && (
                    <div className="mt-4 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                        <div className="flex items-start gap-2 mb-2">
                            <ExclamationTriangleIcon className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-violet-300">
                                Familia are {membri.length} membri cu abonamente individuale.
                                Abonamentul de familie poate fi mai avantajos financiar.
                            </p>
                        </div>
                        {isRepresentative ? (
                            <Button
                                size="sm"
                                variant="primary"
                                className="w-full bg-violet-600 hover:bg-violet-700 border-none text-white"
                                onClick={() => setShowUpgradeModal(true)}
                            >
                                <WalletIcon className="w-3.5 h-3.5 mr-1.5" />
                                Configurează Abonament Familie
                            </Button>
                        ) : (
                            <p className="text-[11px] text-slate-400 italic">
                                Reprezentantul familiei sau administratorul clubului poate schimba abonamentul.
                            </p>
                        )}
                    </div>
                )}

                {/* Buton schimbare plan (dacă deja are plan familie și e reprezentant) */}
                {isViewingOwnProfile && arePlanFamilie && isRepresentative && tipuriFamilie.length > 1 && (
                    <Button
                        size="sm"
                        variant="secondary"
                        className="w-full mt-4 text-slate-300"
                        onClick={() => {
                            setSelectedPlanId(familie?.tip_abonament_id ?? '');
                            setShowUpgradeModal(true);
                        }}
                    >
                        Schimbă planul de familie
                    </Button>
                )}
            </Card>

            {/* ── MODAL: Detalii frate/soră ────────────────────────── */}
            {selectedSibling && (
                <Modal
                    isOpen={true}
                    onClose={() => setSelectedSibling(null)}
                    title={`${selectedSibling.nume} ${selectedSibling.prenume}`}
                >
                    <div className="space-y-4">
                        {/* Avatar + Info */}
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center text-xl font-bold text-slate-300 shrink-0 overflow-hidden">
                                {selectedSibling.foto_url ? (
                                    <img src={selectedSibling.foto_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                    `${selectedSibling.nume?.[0] ?? ''}${selectedSibling.prenume?.[0] ?? ''}`
                                )}
                            </div>
                            <div>
                                <p className="text-lg font-bold text-white">
                                    {selectedSibling.nume} {selectedSibling.prenume}
                                </p>
                                <p className="text-sm text-slate-400">Membru familia {familie?.nume}</p>
                                {(() => {
                                    const g = grade.find(gr => gr.id === selectedSibling.grad_actual_id) ?? null;
                                    return g ? (
                                        <div className="mt-1">
                                            <GradBadge grad={g} gradName={g.nume} />
                                        </div>
                                    ) : null;
                                })()}
                            </div>
                        </div>

                        {/* Stats */}
                        {loadingSibling ? (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="h-16 bg-slate-800 rounded-xl animate-pulse" />
                                <div className="h-16 bg-slate-800 rounded-xl animate-pulse" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col items-center p-3 bg-slate-800/50 rounded-xl border border-slate-700/40">
                                    <span className="text-xs text-slate-500 mb-1">Prezențe</span>
                                    <span className="text-2xl font-black text-sky-400">
                                        {selectedSibling.prezente_total ?? '—'}
                                    </span>
                                </div>
                                <div className={`flex flex-col items-center p-3 rounded-xl border ${
                                    (selectedSibling.plati_restante ?? 0) > 0
                                        ? 'bg-rose-950/30 border-rose-500/30'
                                        : 'bg-emerald-950/20 border-emerald-500/20'
                                }`}>
                                    <span className="text-xs text-slate-500 mb-1">Plăți</span>
                                    <span className={`text-sm font-bold ${
                                        (selectedSibling.plati_restante ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
                                    }`}>
                                        {selectedSibling.plati_restante === undefined
                                            ? '—'
                                            : selectedSibling.plati_restante > 0
                                                ? `${selectedSibling.plati_restante} restanță`
                                                : 'La zi'
                                        }
                                    </span>
                                </div>
                            </div>
                        )}

                        {familie?.reprezentant_id === selectedSibling.id && (
                            <p className="text-xs text-amber-400 text-center">
                                Reprezentant familie
                            </p>
                        )}

                        <Button variant="secondary" onClick={() => setSelectedSibling(null)} className="w-full">
                            Închide
                        </Button>
                    </div>
                </Modal>
            )}

            {/* ── MODAL: Upgrade / Schimbare abonament familie ─────── */}
            {showUpgradeModal && isRepresentative && (
                <Modal
                    isOpen={true}
                    onClose={() => { setShowUpgradeModal(false); setSelectedPlanId(''); }}
                    title="Abonament Familie"
                >
                    <div className="space-y-4">
                        <p className="text-sm text-slate-400">
                            Selectați tipul de abonament pentru familia <span className="text-white font-semibold">{familie?.nume}</span>:
                        </p>

                        <div className="space-y-2">
                            {tipuriFamilie.map(tip => (
                                <div
                                    key={tip.id}
                                    onClick={() => setSelectedPlanId(tip.id)}
                                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                        selectedPlanId === tip.id
                                            ? 'border-violet-500 bg-violet-500/10'
                                            : 'border-slate-700/40 bg-slate-800/30 hover:border-slate-500/60'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-semibold text-white">{tip.denumire}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {tip.numar_membri} membri • {tip.pret} RON / lună
                                            </p>
                                        </div>
                                        {selectedPlanId === tip.id && (
                                            <CheckCircleIcon className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2 pt-1">
                            <Button
                                variant="secondary"
                                className="flex-1"
                                onClick={() => { setShowUpgradeModal(false); setSelectedPlanId(''); }}
                            >
                                Anulează
                            </Button>
                            <Button
                                variant="primary"
                                className="flex-1 bg-violet-600 hover:bg-violet-700 border-none"
                                disabled={!selectedPlanId || saving}
                                onClick={handleUpgradeAbonament}
                            >
                                {saving ? 'Se salvează...' : 'Salvează'}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};
