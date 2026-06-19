import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Antrenament, Sportiv, Grupa, ProgramItem } from '../../types';
import { Button } from '../ui';
import { ArrowLeftIcon, CalendarDaysIcon, UsersIcon, SparklesIcon, ClockIcon, PlusIcon, ChevronDownIcon, XIcon } from '../icons';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import { ListaPrezentaAntrenament, FormularPrezenta } from './ListaPrezentaAntrenament';
import { useAttendance } from '../../hooks/useAttendance';
import { useStatusePrezenta } from '../../hooks/useStatusePrezenta';
import { GeneratorProgramMasiv } from '../Grupe/GeneratorProgramMasiv';
import { useData } from '../../contexts/DataContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { usePermissions } from '../../hooks/usePermissions';

import { TourOverlay, TourButton, TOURS } from '../GhidUtilizator';
import { DashboardPrezentaAzi } from './DashboardPrezentaAzi';
import { CalendarActivitati } from './CalendarActivitati';
import { OrarEditor } from './OrarEditor';
import { GrupeList } from './GrupeList';
import { IstoricPrezentaGlobal } from './IstoricPrezentaGlobal';
import { PrezentaRapida } from './PrezentaRapida';

// --- Modal adaugare sedinta ad-hoc ---
const SediintaAziModal: React.FC<{
    grupe: (Grupa & { program: ProgramItem[]; sportivi_count: { count: number }[] })[];
    clubId: string | null;
    today: string;
    onClose: () => void;
    onSaved: () => void;
}> = ({ grupe, clubId, today, onClose, onSaved }) => {
    const [grupaId, setGrupaId] = useState('');
    const [oraStart, setOraStart] = useState('18:00');
    const [oraSfarsit, setOraSfarsit] = useState('19:30');
    const [tip, setTip] = useState<'regular' | 'stagiu'>('regular');
    const [saving, setSaving] = useState(false);
    const { showError } = useError();

    const handleSave = async () => {
        if (!grupaId) return;
        setSaving(true);
        const { error } = await supabase.from('program_antrenamente').insert({
            data: today,
            ora_start: oraStart,
            ora_sfarsit: oraSfarsit,
            grupa_id: grupaId,
            club_id: clubId,
            tip_antrenament: tip,
            is_recurent: false,
        });
        if (error) showError('Eroare la salvare', error.message);
        else { onSaved(); onClose(); }
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <div>
                        <h3 className="font-bold text-white text-sm">Ședință azi</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{today}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-4 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Grupă</label>
                        <select
                            value={grupaId}
                            onChange={e => setGrupaId(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Alege grupă...</option>
                            {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Oră start</label>
                            <input
                                type="time"
                                value={oraStart}
                                onChange={e => setOraStart(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Oră stop</label>
                            <input
                                type="time"
                                value={oraSfarsit}
                                onChange={e => setOraSfarsit(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Tip</label>
                        <div className="flex gap-2">
                            {(['regular', 'stagiu'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTip(t)}
                                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors border ${
                                        tip === t
                                            ? 'bg-indigo-600 border-indigo-500 text-white'
                                            : 'border-slate-700 text-slate-400 hover:border-slate-600'
                                    }`}
                                >
                                    {t === 'regular' ? 'Regular' : 'Special'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-4 pt-0 flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 text-sm text-slate-400 border border-slate-700 rounded-xl hover:border-slate-600 transition-colors"
                    >
                        Anulează
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!grupaId || saving}
                        className="flex-1 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
                    >
                        {saving ? 'Se salvează...' : 'Adaugă ședință'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Bara de shortcut-uri contextuale ---
const ShortcutBar: React.FC<{
    shortcuts: { label: string; icon: React.ReactNode; onClick: () => void }[];
}> = ({ shortcuts }) => (
    <div className="flex gap-2 flex-wrap pb-1">
        {shortcuts.map((s, i) => (
            <button
                key={i}
                onClick={s.onClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs text-slate-400 hover:text-white hover:border-slate-600 hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
                {s.icon}
                {s.label}
            </button>
        ))}
    </div>
);

type Tab = 'rapid' | 'grupe' | 'istoric';
type View = 'azi' | 'rapid' | 'grupe' | 'orar' | 'calendar' | 'prezenta' | 'prezenta-grupe' | 'istoric' | 'generator';
interface ViewState { view: View; id: string | null; }

const TAB_ROOTS: Record<Tab, View> = {
    rapid: 'rapid',
    grupe: 'grupe',
    istoric: 'istoric',
};

// --- Componenta Principală de Navigare ---
export const Prezenta: React.FC<{ onBack: () => void; onViewSportiv?: (s: Sportiv) => void }> = ({ onBack, onViewSportiv }) => {
    const { currentUser, activeRoleContext } = useData();
    const { navigateTo: navTo } = useNavigation();
    const permissions = usePermissions(activeRoleContext);
    const canAdd = permissions.isAdminClub || permissions.isInstructor || permissions.isFederationAdmin;
    const { byId: statusById } = useStatusePrezenta();
    const [activeTab, setActiveTab] = useState<Tab>('rapid');
    const [viewStack, setViewStack] = useState<ViewState[]>([{ view: 'rapid', id: null }]);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [showSediintaModal, setShowSediintaModal] = useState(false);
    const addMenuRef = useRef<HTMLDivElement>(null);
    const today = new Date().toLocaleDateString('sv-SE');
    const [grupe, setGrupe] = useState<(Grupa & { program: ProgramItem[], sportivi_count: {count: number}[] })[]>([]);
    const [antrenamentDetaliu, setAntrenamentDetaliu] = useState<(Antrenament & { grupe: Grupa & { sportivi: Sportiv[] }}) | null>(null);
    const [loading, setLoading] = useState(true);
    const { showError } = useError();
    const { saveAttendance } = useAttendance();

    useEffect(() => {
        if (!showAddMenu) return;
        const handler = (e: MouseEvent) => {
            if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
                setShowAddMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showAddMenu]);

    useEffect(() => {
        const fetchGrupe = async () => {
            setLoading(true);
            const activeRole = activeRoleContext?.roluri?.nume || activeRoleContext?.rol_denumire;
            const isFederationLevel = activeRole === 'SUPER_ADMIN_FEDERATIE' || activeRole === 'ADMIN';
            const clubId = isFederationLevel ? null : (activeRoleContext?.club_id ?? currentUser?.club_id ?? null);

            let query = supabase.from('grupe').select('*, program:orar_saptamanal(*), sportivi_count:sportivi!grupa_id(count)');
            if (clubId) {
                query = query.eq('club_id', clubId);
            }
            const { data, error } = await query;
            if (error) showError("Eroare la încărcarea grupelor", error.message);
            else setGrupe(data as any || []);
            setLoading(false);
        };
        fetchGrupe();
    }, [showError, activeRoleContext, currentUser?.club_id]);

    const switchTab = (tab: Tab) => {
        setActiveTab(tab);
        setViewStack([{ view: TAB_ROOTS[tab], id: null }]);
    };

    const navigateTo = (view: View, id: string | null) => setViewStack(prev => [...prev, { view, id }]);

    const navigateBack = () => {
        if (viewStack.length > 1) {
            setViewStack(prev => prev.slice(0, -1));
        } else {
            onBack();
        }
    };

    const handleSelectAntrenament = async (id: string) => {
        setLoading(true);
        const { data, error } = await supabase.from('program_antrenamente')
            .select('*, grupe(*, sportivi!grupa_id(id, nume, prenume, status, grad_actual_id)), prezenta:prezenta_antrenament(sportiv_id, status_id)')
            .eq('id', id).single();
        if (error) { showError("Eroare", error.message); }
        else if (data) {
            const enriched = {
                ...data,
                prezenta: (data.prezenta || []).map((p: any) => ({
                    ...p,
                    status: p.status_id ? (statusById[p.status_id] ?? null) : null,
                })),
            };
            setAntrenamentDetaliu(enriched as any);
            navigateTo('prezenta', id);
        }
        setLoading(false);
    };

    const currentView = viewStack[viewStack.length - 1];
    const selectedGrupa = useMemo(() => grupe.find(g => g.id === currentView.id), [grupe, currentView]);
    const isAtRoot = viewStack.length === 1;

    const renderContent = () => {
        switch (currentView.view) {
            case 'azi':
                return (
                    <DashboardPrezentaAzi
                        clubId={currentUser.club_id}
                        onSelectAntrenament={handleSelectAntrenament}
                        onMassGenerator={() => navigateTo('generator', null)}
                    />
                );
            case 'rapid':
                return (
                    <div className="space-y-3">
                        <ShortcutBar shortcuts={[
                            { label: 'Program antrenamente', icon: <CalendarDaysIcon className="w-3.5 h-3.5" />, onClick: () => navTo('program-antrenamente') },
                            { label: 'Grupe & Orar', icon: <UsersIcon className="w-3.5 h-3.5" />, onClick: () => switchTab('grupe') },
                        ]} />
                        <PrezentaRapida
                            onSelectFull={handleSelectAntrenament}
                            onAddSediinta={canAdd ? () => setShowSediintaModal(true) : undefined}
                        />
                    </div>
                );
            case 'grupe':
                return loading
                    ? <p className="text-white p-8 text-center">Se încarcă grupele...</p>
                    : (
                        <div className="space-y-3">
                            <ShortcutBar shortcuts={[
                                { label: 'Raport Prezențe', icon: <SparklesIcon className="w-3.5 h-3.5" />, onClick: () => navTo('raport-prezenta') },
                                { label: 'Raport Lunar', icon: <ClockIcon className="w-3.5 h-3.5" />, onClick: () => navTo('raport-lunar-prezenta') },
                            ]} />
                            <GrupeList
                                onSelect={id => navigateTo('orar', id)}
                                onSelectToday={id => navigateTo('prezenta-grupe', id)}
                                onGlobalHistory={() => switchTab('istoric')}
                                grupe={grupe}
                            />
                        </div>
                    );
            case 'orar':
                return selectedGrupa
                    ? <OrarEditor grupa={selectedGrupa} onNavigate={id => navigateTo('calendar', id)} onBack={navigateBack} setGrupe={setGrupe as any} />
                    : <p className="text-slate-400 p-8">Grupă negăsită.</p>;
            case 'calendar':
                return selectedGrupa
                    ? <CalendarActivitati grupa={selectedGrupa} onSelect={handleSelectAntrenament} onBack={navigateBack} grupe={grupe} />
                    : <p className="text-slate-400 p-8">Grupă negăsită.</p>;
            case 'prezenta':
                return antrenamentDetaliu
                    ? <FormularPrezenta antrenament={antrenamentDetaliu} onBack={navigateBack} saveAttendance={saveAttendance} onViewSportiv={onViewSportiv} />
                    : <p className="text-slate-400 p-8">Antrenament negăsit.</p>;
            case 'prezenta-grupe':
                return selectedGrupa
                    ? <ListaPrezentaAntrenament grupa={selectedGrupa} onBack={navigateBack} onViewSportiv={onViewSportiv} />
                    : <p className="text-slate-400 p-8">Grupă negăsită.</p>;
            case 'istoric':
                return (
                    <div className="space-y-3">
                        <ShortcutBar shortcuts={[
                            { label: 'Raport Lunar Prezențe', icon: <ClockIcon className="w-3.5 h-3.5" />, onClick: () => navTo('raport-lunar-prezenta') },
                        ]} />
                        <IstoricPrezentaGlobal onBack={navigateBack} onViewSportiv={onViewSportiv} />
                    </div>
                );
            case 'generator':
                return <GeneratorProgramMasiv onBack={navigateBack} clubId={currentUser.club_id} onNavigateToGrupe={() => switchTab('grupe')} />;
            default:
                return null;
        }
    };

    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: 'rapid', label: 'Rapid', icon: <SparklesIcon className="w-4 h-4" /> },
        { id: 'grupe', label: 'Grupe', icon: <UsersIcon className="w-4 h-4" /> },
        { id: 'istoric', label: 'Istoric', icon: <ClockIcon className="w-4 h-4" /> },
    ];

    return (
        <div className="space-y-4">
            {/* Top bar: back + tabs */}
            <div className="flex items-center gap-3">
                {!isAtRoot ? (
                    <button
                        onClick={navigateBack}
                        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors px-2 py-1.5 rounded-md hover:bg-slate-800 shrink-0"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Înapoi</span>
                    </button>
                ) : (
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors px-2 py-1.5 rounded-md hover:bg-slate-800 shrink-0"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Meniu</span>
                    </button>
                )}

                {/* Tab bar */}
                <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1 flex-1 sm:flex-none" style={{minWidth:0}}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => switchTab(tab.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex-1 sm:flex-none justify-center sm:justify-start whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                        >
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Buton adaugare — doar ADMIN/INSTRUCTOR */}
                {canAdd && isAtRoot && activeTab === 'rapid' && (
                    <div className="relative ml-auto shrink-0" ref={addMenuRef}>
                        <button
                            onClick={() => setShowAddMenu(v => !v)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Adaugă</span>
                            <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${showAddMenu ? 'rotate-180' : ''}`} />
                        </button>
                        {showAddMenu && (
                            <div className="absolute right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 min-w-[180px] overflow-hidden">
                                <button
                                    onClick={() => { setShowAddMenu(false); setShowSediintaModal(true); }}
                                    className="w-full text-left flex items-center gap-2.5 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
                                >
                                    <SparklesIcon className="w-4 h-4 text-amber-400 shrink-0" />
                                    <div>
                                        <div className="font-semibold">Ședință azi</div>
                                        <div className="text-xs text-slate-500">Sesiune ad-hoc, acum</div>
                                    </div>
                                </button>
                                <div className="h-px bg-slate-800" />
                                <button
                                    onClick={() => { setShowAddMenu(false); switchTab('grupe'); }}
                                    className="w-full text-left flex items-center gap-2.5 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
                                >
                                    <CalendarDaysIcon className="w-4 h-4 text-indigo-400 shrink-0" />
                                    <div>
                                        <div className="font-semibold">Adaugă la orar</div>
                                        <div className="text-xs text-slate-500">Configurare program grupă</div>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Content */}
            {renderContent()}

            {showSediintaModal && (
                <SediintaAziModal
                    grupe={grupe}
                    clubId={activeRoleContext?.club_id ?? currentUser?.club_id ?? null}
                    today={today}
                    onClose={() => setShowSediintaModal(false)}
                    onSaved={() => switchTab('rapid')}
                />
            )}

            <TourOverlay steps={TOURS.prezenta} pageKey="prezenta" />
            <TourButton steps={TOURS.prezenta} pageKey="prezenta" />
        </div>
    );
};
