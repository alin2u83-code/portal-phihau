import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { View } from '../types';
import { useData } from '../contexts/DataContext';
import {
    SparklesIcon, BotIcon, CalendarDaysIcon, GraduationCapIcon,
    BanknotesIcon, UsersIcon, BellIcon, CheckCircleIcon,
    ExclamationTriangleIcon, AlertCircleIcon, ChartBarIcon,
    ArrowLeftIcon, ClockIcon, UserXIcon, CreditCardIcon,
} from './icons';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type WorkflowPhase = 'idle' | 'collecting' | 'crossdomain' | 'synthesizing' | 'complete';
type AgentStatus = 'waiting' | 'running' | 'done';
type AlertLevel = 'critical' | 'warning' | 'info';

interface MetricItem { label: string; value: string; color: string; }
interface AlertItem  { level: AlertLevel; text: string; }
interface RiskSportiv { id: string; name: string; score: number; tags: string[]; }

interface AgentResult {
    metrics: MetricItem[];
    alerts: AlertItem[];
    insights: string[];
}

interface AgentDef {
    id: string;
    name: string;
    subtitle: string;
    icon: React.ElementType;
    color: string;
    border: string;
    glow: string;
    logMessages: string[];
    durationMs: number;
}

// ─────────────────────────────────────────────
// AGENT DEFINITIONS
// ─────────────────────────────────────────────
const AGENTS: AgentDef[] = [
    {
        id: 'prezenta',
        name: 'Prezență Monitor',
        subtitle: 'ANALIZĂ PARTICIPARE',
        icon: CalendarDaysIcon,
        color: 'text-amber-400',
        border: 'border-amber-500/40',
        glow: 'shadow-amber-500/20',
        logMessages: ['Scanez antrenamentele din ultimele 30 zile...', 'Calculez rata de participare per sportiv...', 'Identific absențe repetate...', 'Generez alerte...'],
        durationMs: 2800,
    },
    {
        id: 'examene',
        name: 'Examene Tracker',
        subtitle: 'PROGRES GRADE',
        icon: GraduationCapIcon,
        color: 'text-violet-400',
        border: 'border-violet-500/40',
        glow: 'shadow-violet-500/20',
        logMessages: ['Încarc sesiunile programate...', 'Verific eligibilitatea sportivilor...', 'Analizez rezultatele anterioare...', 'Calculez recomandări grad...'],
        durationMs: 3200,
    },
    {
        id: 'financiar',
        name: 'Financiar Analyst',
        subtitle: 'SITUAȚIE PLĂȚI',
        icon: BanknotesIcon,
        color: 'text-emerald-400',
        border: 'border-emerald-500/40',
        glow: 'shadow-emerald-500/20',
        logMessages: ['Scanez plățile neachitate...', 'Calculez sumele restante...', 'Identific restanțe > 30 zile...', 'Compilez situația financiară...'],
        durationMs: 2400,
    },
    {
        id: 'sportivi',
        name: 'Sportivi Profiler',
        subtitle: 'DATE MEMBRI',
        icon: UsersIcon,
        color: 'text-sky-400',
        border: 'border-sky-500/40',
        glow: 'shadow-sky-500/20',
        logMessages: ['Analizez profilurile sportivilor activi...', 'Verific grupele asignate...', 'Detectez date de contact lipsă...', 'Identific inconsistențe status...'],
        durationMs: 2600,
    },
    {
        id: 'alerta',
        name: 'Alertă Manager',
        subtitle: 'RISC COMBINAT',
        icon: BellIcon,
        color: 'text-rose-400',
        border: 'border-rose-500/40',
        glow: 'shadow-rose-500/20',
        logMessages: ['Agreghez datele tuturor agenților...', 'Calculez scorul de risc combinat...', 'Prioritizez alertele cross-domain...', 'Generez raportul final...'],
        durationMs: 1800,
    },
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const alertIcon = (level: AlertLevel) => {
    if (level === 'critical') return <AlertCircleIcon className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />;
    if (level === 'warning')  return <ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />;
    return <CheckCircleIcon className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />;
};

const levelBadge: Record<AlertLevel, string> = {
    critical: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
    warning:  'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    info:     'bg-sky-500/20 text-sky-300 border border-sky-500/40',
};

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────
const PhaseStep: React.FC<{ label: string; step: number; current: number }> = ({ label, step, current }) => {
    const done    = current > step;
    const active  = current === step;
    return (
        <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-500
                ${done   ? 'bg-emerald-500 border-emerald-400 text-white' : ''}
                ${active ? 'bg-indigo-600 border-indigo-400 text-white animate-pulse' : ''}
                ${!done && !active ? 'bg-slate-800 border-slate-600 text-slate-500' : ''}`}>
                {done ? '✓' : step}
            </div>
            <span className={`text-xs font-medium tracking-wider uppercase transition-colors duration-500
                ${done ? 'text-emerald-400' : active ? 'text-indigo-300' : 'text-slate-600'}`}>
                {label}
            </span>
        </div>
    );
};

const AgentCard: React.FC<{
    agent: AgentDef;
    status: AgentStatus;
    progress: number;
    logLine: string;
    result: AgentResult | null;
    phase: WorkflowPhase;
}> = ({ agent, status, progress, logLine, result, phase }) => {
    const Icon = agent.icon;
    const isComplete = phase === 'complete';

    return (
        <div className={`rounded-xl border bg-slate-900/80 backdrop-blur-sm transition-all duration-500 overflow-hidden
            ${status === 'running' ? `${agent.border} shadow-lg ${agent.glow}` : ''}
            ${status === 'done'    ? 'border-slate-700/60' : ''}
            ${status === 'waiting' ? 'border-slate-800/60 opacity-60' : ''}`}>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg bg-slate-800 ${agent.color}`}>
                        <Icon className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-100">{agent.name}</p>
                        <p className={`text-[10px] font-bold tracking-widest ${agent.color} opacity-80`}>{agent.subtitle}</p>
                    </div>
                </div>
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider
                    ${status === 'waiting' ? 'bg-slate-800 text-slate-500' : ''}
                    ${status === 'running' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 animate-pulse' : ''}
                    ${status === 'done'    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : ''}`}>
                    {status === 'waiting' ? 'AȘTEPT' : status === 'running' ? 'ACTIV' : 'GATA'}
                </div>
            </div>

            {/* Progress bar */}
            {status !== 'waiting' && (
                <div className="h-0.5 bg-slate-800">
                    <div
                        className={`h-full transition-all duration-300 ${status === 'done' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            {/* Body */}
            <div className="p-4 min-h-[90px]">
                {status === 'waiting' && (
                    <p className="text-xs text-slate-600 italic">În așteptare...</p>
                )}
                {status === 'running' && (
                    <p className="text-xs text-slate-400 font-mono animate-pulse">▶ {logLine}</p>
                )}
                {status === 'done' && result && (
                    <div className="space-y-2">
                        {/* Metrici */}
                        <div className="grid grid-cols-2 gap-1.5">
                            {result.metrics.slice(0, isComplete ? 4 : 2).map((m, i) => (
                                <div key={i} className="bg-slate-800/60 rounded-lg px-2 py-1.5">
                                    <p className="text-[10px] text-slate-500 leading-tight">{m.label}</p>
                                    <p className={`text-sm font-bold ${m.color}`}>{m.value}</p>
                                </div>
                            ))}
                        </div>
                        {/* Alerte compacte */}
                        {isComplete && (
                            <div className="space-y-1 mt-2">
                                {result.alerts.slice(0, 2).map((a, i) => (
                                    <div key={i} className="flex items-start gap-1.5">
                                        {alertIcon(a.level)}
                                        <p className="text-[11px] text-slate-400 leading-tight">{a.text}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
interface AgentiWorkflowProps {
    onBack: () => void;
    onNavigate: (view: View) => void;
}

export const AgentiWorkflow: React.FC<AgentiWorkflowProps> = ({ onBack, onNavigate }) => {
    const { filteredData, grade } = useData();
    const [phase, setPhase] = useState<WorkflowPhase>('idle');
    const [statuses, setStatuses] = useState<Record<string, AgentStatus>>(() =>
        Object.fromEntries(AGENTS.map(a => [a.id, 'waiting']))
    );
    const [progress, setProgress] = useState<Record<string, number>>(() =>
        Object.fromEntries(AGENTS.map(a => [a.id, 0]))
    );
    const [logLines, setLogLines] = useState<Record<string, string>>(() =>
        Object.fromEntries(AGENTS.map(a => [a.id, '']))
    );
    const [results, setResults] = useState<Record<string, AgentResult | null>>(() =>
        Object.fromEntries(AGENTS.map(a => [a.id, null]))
    );
    const [synthText, setSynthText] = useState<string[]>([]);
    const [riskSportivi, setRiskSportivi] = useState<RiskSportiv[]>([]);
    const synthRef = useRef(0);

    // ── Calculele reale (sincrone, useMemo) ──
    const computedResults = useMemo<Record<string, AgentResult>>(() => {
        const sportivi = filteredData.sportivi || [];
        const antrenamente = filteredData.antrenamente || [];
        const inscrieri = filteredData.inscrieriExamene || [];
        const sesiuni = filteredData.sesiuniExamene || [];
        const plati = filteredData.plati || [];
        const grupe = filteredData.grupe || [];

        const today = new Date();
        const ago30 = new Date(today); ago30.setDate(today.getDate() - 30);
        const ago30str = ago30.toISOString().split('T')[0];

        const sportiviActivi = sportivi.filter(s => s.status === 'Activ');

        // ── AGENT PREZENTA ──
        const antRecente = antrenamente.filter(a => (a.data || '') >= ago30str);
        const prezentaMap: Record<string, number> = {};
        const totalMap: Record<string, number> = {};
        antRecente.forEach(ant => {
            const prez: any[] = (ant as any).prezenta || [];
            sportiviActivi.forEach(s => {
                totalMap[s.id] = (totalMap[s.id] || 0) + 1;
                const found = prez.find((p: any) => p.sportiv_id === s.id);
                if (found && found.status === 'Prezent') {
                    prezentaMap[s.id] = (prezentaMap[s.id] || 0) + 1;
                }
            });
        });
        const sub50 = sportiviActivi.filter(s => {
            const total = totalMap[s.id] || 0;
            if (total === 0) return false;
            return (prezentaMap[s.id] || 0) / total < 0.5;
        });
        const zero = sportiviActivi.filter(s => totalMap[s.id] > 0 && !(prezentaMap[s.id]));
        const rataGlobal = sportiviActivi.length > 0
            ? Math.round(sportiviActivi.reduce((acc, s) => {
                const t = totalMap[s.id] || 0;
                return acc + (t > 0 ? ((prezentaMap[s.id] || 0) / t) : 0);
            }, 0) / sportiviActivi.length * 100) : 0;

        const prezentaResult: AgentResult = {
            metrics: [
                { label: 'Antrenamente 30 zile', value: String(antRecente.length), color: 'text-amber-300' },
                { label: 'Rată globală', value: `${rataGlobal}%`, color: rataGlobal >= 70 ? 'text-emerald-400' : 'text-rose-400' },
                { label: 'Sub 50% prezență', value: String(sub50.length), color: sub50.length > 0 ? 'text-amber-400' : 'text-emerald-400' },
                { label: 'Zero prezențe', value: String(zero.length), color: zero.length > 0 ? 'text-rose-400' : 'text-emerald-400' },
            ],
            alerts: [
                ...(zero.length > 0 ? [{ level: 'critical' as AlertLevel, text: `${zero.length} sportivi cu zero prezențe în ultimele 30 zile` }] : []),
                ...(sub50.length > 0 ? [{ level: 'warning' as AlertLevel, text: `${sub50.length} sportivi sub 50% participare` }] : []),
                ...(rataGlobal >= 70 ? [{ level: 'info' as AlertLevel, text: `Rată globală ${rataGlobal}% — satisfăcătoare` }] : [{ level: 'warning' as AlertLevel, text: `Rată globală sub 70% (${rataGlobal}%)` }]),
            ],
            insights: [`${antRecente.length} antrenamente analizate`, `${sub50.length} sportivi necesită atenție`, `Rată medie ${rataGlobal}%`],
        };

        // ── AGENT EXAMENE ──
        const sesiuniViitoare = sesiuni.filter(s => s.status === 'Programat' && (s.data || '') >= today.toISOString().split('T')[0]);
        const inscrieriViitoare = inscrieri.filter(i => sesiuniViitoare.some(s => s.id === i.sesiune_id));
        const respinsi = inscrieri.filter(i => i.rezultat === 'Respins');
        const faraGrad = sportiviActivi.filter(s => !s.grad_actual_id);

        const exameneResult: AgentResult = {
            metrics: [
                { label: 'Sesiuni programate', value: String(sesiuniViitoare.length), color: 'text-violet-300' },
                { label: 'Sportivi înscriși', value: String(inscrieriViitoare.length), color: 'text-violet-300' },
                { label: 'Fără grad', value: String(faraGrad.length), color: faraGrad.length > 0 ? 'text-amber-400' : 'text-emerald-400' },
                { label: 'Respinși anterior', value: String(respinsi.length), color: respinsi.length > 0 ? 'text-rose-400' : 'text-emerald-400' },
            ],
            alerts: [
                ...(sesiuniViitoare.length > 0 ? [{ level: 'info' as AlertLevel, text: `${sesiuniViitoare.length} sesion${sesiuniViitoare.length > 1 ? 'i' : 'e'} de examen programat${sesiuniViitoare.length > 1 ? 'e' : 'ă'}` }] : []),
                ...(respinsi.length > 0 ? [{ level: 'warning' as AlertLevel, text: `${respinsi.length} sportivi respinși — necesită reexaminare` }] : []),
                ...(faraGrad.length > 0 ? [{ level: 'info' as AlertLevel, text: `${faraGrad.length} sportivi fără grad asignat` }] : []),
            ],
            insights: [`${sesiuniViitoare.length} sesiuni viitoare`, `${inscrieriViitoare.length} înscriși activi`, `${respinsi.length} respinși de recontactat`],
        };

        // ── AGENT FINANCIAR ──
        const restante = plati.filter(p => p.status === 'Neachitat' || p.status === 'Achitat Partial' || p.status === 'Achitat Parțial');
        const sumaRestanta = restante.reduce((acc, p) => acc + (p.suma || 0), 0);
        const sportiviCuRestante = new Set(restante.map(p => p.sportiv_id)).size;
        const luna = today.getMonth(); const an = today.getFullYear();
        const incasariLuna = plati
            .filter(p => p.status === 'Achitat' && p.data && new Date(p.data).getMonth() === luna && new Date(p.data).getFullYear() === an)
            .reduce((acc, p) => acc + (p.suma || 0), 0);

        const financiarResult: AgentResult = {
            metrics: [
                { label: 'Total restanțe', value: `${sumaRestanta.toFixed(0)} RON`, color: sumaRestanta > 0 ? 'text-rose-400' : 'text-emerald-400' },
                { label: 'Sportivi restanțieri', value: String(sportiviCuRestante), color: sportiviCuRestante > 0 ? 'text-amber-400' : 'text-emerald-400' },
                { label: 'Încasări luna curentă', value: `${incasariLuna.toFixed(0)} RON`, color: 'text-emerald-300' },
                { label: 'Plăți neachitate', value: String(restante.length), color: restante.length > 0 ? 'text-amber-400' : 'text-emerald-400' },
            ],
            alerts: [
                ...(sumaRestanta > 500 ? [{ level: 'critical' as AlertLevel, text: `${sumaRestanta.toFixed(0)} RON restanțe neachitate` }] : sumaRestanta > 0 ? [{ level: 'warning' as AlertLevel, text: `${sumaRestanta.toFixed(0)} RON restanțe în urmărire` }] : []),
                ...(sportiviCuRestante > 0 ? [{ level: 'warning' as AlertLevel, text: `${sportiviCuRestante} sportivi cu plăți restante` }] : []),
                { level: 'info', text: `${incasariLuna.toFixed(0)} RON încasați în luna curentă` },
            ],
            insights: [`${sumaRestanta.toFixed(0)} RON de recuperat`, `${sportiviCuRestante} debitori activi`, `${incasariLuna.toFixed(0)} RON încasați/lună`],
        };

        // ── AGENT SPORTIVI ──
        const faraGrupa = sportiviActivi.filter(s => !s.grupa_id);
        const faraContact = sportiviActivi.filter(s => !s.email && !(s as any).telefon);
        const inactivi = sportivi.filter(s => s.status === 'Inactiv');

        const sportiviResult: AgentResult = {
            metrics: [
                { label: 'Sportivi activi', value: String(sportiviActivi.length), color: 'text-sky-300' },
                { label: 'Fără grupă', value: String(faraGrupa.length), color: faraGrupa.length > 0 ? 'text-rose-400' : 'text-emerald-400' },
                { label: 'Date contact lipsă', value: String(faraContact.length), color: faraContact.length > 0 ? 'text-amber-400' : 'text-emerald-400' },
                { label: 'Inactivi', value: String(inactivi.length), color: 'text-slate-400' },
            ],
            alerts: [
                ...(faraGrupa.length > 0 ? [{ level: 'critical' as AlertLevel, text: `${faraGrupa.length} sportivi activi fără grupă asignată` }] : []),
                ...(faraContact.length > 0 ? [{ level: 'warning' as AlertLevel, text: `${faraContact.length} sportivi fără date de contact` }] : []),
                { level: 'info', text: `${sportiviActivi.length} sportivi activi în ${grupe.length} grupe` },
            ],
            insights: [`${sportiviActivi.length} activi`, `${faraGrupa.length} nealocați`, `${faraContact.length} fără contact`],
        };

        // ── AGENT ALERTA (cross-domain) ──
        const totalAlerte = [prezentaResult, exameneResult, financiarResult, sportiviResult]
            .flatMap(r => r.alerts).filter(a => a.level !== 'info').length;
        const critice = [prezentaResult, exameneResult, financiarResult, sportiviResult]
            .flatMap(r => r.alerts).filter(a => a.level === 'critical').length;
        const scorRisc = Math.min(100, critice * 25 + (totalAlerte - critice) * 10);

        // Top sportivi risc combinat
        const riskMap: Record<string, { name: string; score: number; tags: string[] }> = {};
        zero.forEach(s => {
            riskMap[s.id] = riskMap[s.id] || { name: `${s.prenume} ${s.nume}`, score: 0, tags: [] };
            riskMap[s.id].score += 40; riskMap[s.id].tags.push('Absențe');
        });
        restante.forEach(p => {
            if (!p.sportiv_id) return;
            riskMap[p.sportiv_id] = riskMap[p.sportiv_id] || { name: sportiviActivi.find(s => s.id === p.sportiv_id)?.nume || p.sportiv_id, score: 0, tags: [] };
            if (!riskMap[p.sportiv_id].tags.includes('Restanță')) { riskMap[p.sportiv_id].score += 30; riskMap[p.sportiv_id].tags.push('Restanță'); }
        });
        faraGrupa.forEach(s => {
            riskMap[s.id] = riskMap[s.id] || { name: `${s.prenume} ${s.nume}`, score: 0, tags: [] };
            riskMap[s.id].score += 20; riskMap[s.id].tags.push('Fără grupă');
        });

        const topRisk: RiskSportiv[] = Object.entries(riskMap)
            .map(([id, v]) => ({ id, name: v.name, score: v.score, tags: v.tags }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        const alertaResult: AgentResult = {
            metrics: [
                { label: 'Scor risc global', value: `${scorRisc}/100`, color: scorRisc > 50 ? 'text-rose-400' : scorRisc > 25 ? 'text-amber-400' : 'text-emerald-400' },
                { label: 'Alerte critice', value: String(critice), color: critice > 0 ? 'text-rose-400' : 'text-emerald-400' },
                { label: 'Total avertismente', value: String(totalAlerte), color: totalAlerte > 3 ? 'text-amber-400' : 'text-emerald-400' },
                { label: 'Sportivi cu risc', value: String(topRisk.length), color: topRisk.length > 0 ? 'text-rose-400' : 'text-emerald-400' },
            ],
            alerts: [
                ...(critice > 0 ? [{ level: 'critical' as AlertLevel, text: `${critice} probleme critice necesită acțiune imediată` }] : []),
                ...(totalAlerte > 0 ? [{ level: 'warning' as AlertLevel, text: `${totalAlerte} avertismente cross-domain detectate` }] : []),
                { level: 'info', text: `Analiză completă: ${sportiviActivi.length} sportivi, ${antRecente.length} antrenamente` },
            ],
            insights: [`Scor risc: ${scorRisc}/100`, `${critice} critice`, `${topRisk.length} sportivi expuși`],
        };

        return { prezenta: prezentaResult, examene: exameneResult, financiar: financiarResult, sportivi: sportiviResult, alerta: alertaResult };
    }, [filteredData, grade]);

    // ── Animare faze ──
    const animateAgent = useCallback((agentId: string, def: AgentDef, computed: AgentResult, onDone: () => void) => {
        setStatuses(p => ({ ...p, [agentId]: 'running' }));
        let msgIdx = 0;
        const msgInterval = def.durationMs / def.logMessages.length;

        const logCycle = () => {
            setLogLines(p => ({ ...p, [agentId]: def.logMessages[msgIdx] }));
            msgIdx = Math.min(msgIdx + 1, def.logMessages.length - 1);
        };
        logCycle();
        const li = setInterval(logCycle, msgInterval);

        let prog = 0;
        const progInterval = def.durationMs / 40;
        const pi = setInterval(() => {
            prog = Math.min(100, prog + 100 / 40);
            setProgress(p => ({ ...p, [agentId]: prog }));
            if (prog >= 100) { clearInterval(pi); }
        }, progInterval);

        setTimeout(() => {
            clearInterval(li);
            setStatuses(p => ({ ...p, [agentId]: 'done' }));
            setProgress(p => ({ ...p, [agentId]: 100 }));
            setResults(p => ({ ...p, [agentId]: computed }));
            onDone();
        }, def.durationMs);
    }, []);

    const handleLaunch = useCallback(() => {
        setPhase('collecting');
        setStatuses(Object.fromEntries(AGENTS.map(a => [a.id, 'waiting'])));
        setProgress(Object.fromEntries(AGENTS.map(a => [a.id, 0])));
        setResults(Object.fromEntries(AGENTS.map(a => [a.id, null])));
        setSynthText([]);
        setRiskSportivi([]);
        synthRef.current = 0;

        // Agenții 1-4 pornesc simultan
        let doneCnt = 0;
        const firstFour = AGENTS.slice(0, 4);
        firstFour.forEach(def => {
            animateAgent(def.id, def, computedResults[def.id], () => {
                doneCnt++;
                if (doneCnt === firstFour.length) {
                    // Cross-domain
                    setTimeout(() => {
                        setPhase('crossdomain');
                        setTimeout(() => {
                            setPhase('synthesizing');
                            const alertaDef = AGENTS[4];
                            animateAgent(alertaDef.id, alertaDef, computedResults[alertaDef.id], () => {
                                // Sinteză text
                                const lines = [
                                    '● Toate datele colectate și cross-validate...',
                                    '● Calculez scorul de risc combinat per sportiv...',
                                    '● Prioritizez recomandările de acțiune...',
                                    '● Raportul final este gata.',
                                ];
                                lines.forEach((line, i) => {
                                    setTimeout(() => {
                                        setSynthText(p => [...p, line]);
                                        if (i === lines.length - 1) {
                                            // Top risc
                                            const riskMap: Record<string, { name: string; score: number; tags: string[] }> = {};
                                            (filteredData.antrenamente || []).forEach(ant => {
                                                /* scor din computedResults */
                                            });
                                            // Extragem din computedResults.alerta
                                            setTimeout(() => {
                                                setPhase('complete');
                                            }, 400);
                                        }
                                    }, i * 450);
                                });
                            });
                        }, 1200);
                    }, 600);
                }
            });
        });
    }, [animateAgent, computedResults, filteredData]);

    const phaseNum = { idle: 0, collecting: 1, crossdomain: 2, synthesizing: 2, complete: 3 }[phase];

    const allInsights = useMemo(() => {
        if (phase !== 'complete') return [];
        return [
            ...computedResults.prezenta.insights,
            ...computedResults.examene.insights,
            ...computedResults.financiar.insights,
            ...computedResults.sportivi.insights,
        ];
    }, [phase, computedResults]);

    // ── RENDER ──
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
            {/* Nav */}
            <div className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
                    <ArrowLeftIcon className="w-4 h-4" /> Înapoi
                </button>
                <div className="flex items-center gap-2">
                    <BotIcon className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-slate-300 tracking-wider uppercase">Workflow Multi-Agent</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold tracking-wider uppercase">
                    <span className="text-indigo-400">{AGENTS.length} AGENȚI</span>
                    <span>·</span>
                    <span>3 FAZE</span>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 pt-8 space-y-8">

                {/* Hero Title */}
                <div className="text-center space-y-2">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                        Analiză <span className="text-indigo-400">Orchestrată</span>
                    </h1>
                    <p className="text-slate-400 max-w-lg mx-auto text-sm">
                        {AGENTS.length} agenți specializați lucrează în paralel, fac brainstorming cross-domain
                        și produc un raport de acțiune pentru sala ta.
                    </p>
                </div>

                {/* Phase Indicator */}
                <div className="flex items-center justify-center gap-4 flex-wrap">
                    <PhaseStep label="Colectare Date" step={1} current={phaseNum} />
                    <div className={`h-px w-8 transition-colors duration-500 ${phaseNum >= 2 ? 'bg-indigo-500' : 'bg-slate-700'}`} />
                    <PhaseStep label="Analiză Cross-Domain" step={2} current={phaseNum} />
                    <div className={`h-px w-8 transition-colors duration-500 ${phaseNum >= 3 ? 'bg-indigo-500' : 'bg-slate-700'}`} />
                    <PhaseStep label="Raport Final" step={3} current={phaseNum} />
                </div>

                {/* IDLE: Start screen */}
                {phase === 'idle' && (
                    <div className="text-center space-y-6 py-8">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
                            {[
                                { icon: CalendarDaysIcon, label: 'Faza 1', desc: 'Cei 4 agenți colectează date în paralel', color: 'text-amber-400' },
                                { icon: SparklesIcon,     label: 'Faza 2', desc: 'Brainstorming cross-domain și corelații', color: 'text-indigo-400' },
                                { icon: ChartBarIcon,     label: 'Faza 3', desc: 'Sinteză finală cu scor de risc și recomandări', color: 'text-emerald-400' },
                            ].map((f, i) => (
                                <div key={i} className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 flex items-start gap-3">
                                    <f.icon className={`w-5 h-5 ${f.color} shrink-0 mt-0.5`} />
                                    <div>
                                        <p className={`text-xs font-bold tracking-wider uppercase ${f.color}`}>{f.label}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={handleLaunch}
                            className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-white transition-all duration-200 text-lg shadow-lg shadow-indigo-900/50 hover:shadow-indigo-900/70 hover:-translate-y-0.5"
                        >
                            <SparklesIcon className="w-5 h-5" />
                            Lansează Analiza
                        </button>
                    </div>
                )}

                {/* COLLECTING / CROSSDOMAIN / SYNTHESIZING / COMPLETE */}
                {phase !== 'idle' && (
                    <div className="space-y-6">
                        {/* Agent Grid (4 agenți principali) */}
                        <div>
                            {phase === 'collecting' && (
                                <p className="text-[10px] font-bold text-amber-400 tracking-widest uppercase mb-3">
                                    ↓ Faza 1 — Colectare Date
                                </p>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {AGENTS.slice(0, 4).map(def => (
                                    <AgentCard
                                        key={def.id}
                                        agent={def}
                                        status={statuses[def.id]}
                                        progress={progress[def.id]}
                                        logLine={logLines[def.id]}
                                        result={results[def.id]}
                                        phase={phase}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Cross-domain connector */}
                        {(phase === 'crossdomain' || phase === 'synthesizing' || phase === 'complete') && (
                            <div className="text-center py-2 space-y-1">
                                <div className="w-px h-6 bg-rose-500/60 mx-auto" />
                                <p className="text-[10px] font-bold text-rose-400 tracking-widest uppercase">
                                    Brainstorming — Cross-Domain
                                </p>
                                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                    Agenții corelează descoperirile și trimit sugestii interdisciplinare
                                </p>
                            </div>
                        )}

                        {/* Agent 5: Alertă Manager */}
                        {(phase === 'synthesizing' || phase === 'complete') && (
                            <div>
                                {phase === 'synthesizing' && (
                                    <p className="text-[10px] font-bold text-rose-400 tracking-widest uppercase mb-3">
                                        ↓ Faza 2 — Sinteză Finală
                                    </p>
                                )}
                                <AgentCard
                                    agent={AGENTS[4]}
                                    status={statuses['alerta']}
                                    progress={progress['alerta']}
                                    logLine={logLines['alerta']}
                                    result={results['alerta']}
                                    phase={phase}
                                />
                                {synthText.length > 0 && (
                                    <div className="mt-3 bg-slate-900/60 rounded-lg border border-rose-500/20 p-3 font-mono text-xs text-slate-400 space-y-1">
                                        {synthText.map((t, i) => <p key={i} className="animate-fade-in-down">{t}</p>)}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* RAPORT FINAL */}
                        {phase === 'complete' && results['alerta'] && (
                            <div className="space-y-6">
                                <div className="w-px h-6 bg-emerald-500/60 mx-auto" />
                                <p className="text-center text-[10px] font-bold text-emerald-400 tracking-widest uppercase">
                                    ↓ Faza Finală — Raport & Recomandări
                                </p>

                                {/* Severity badges */}
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {(['critical', 'warning', 'info'] as AlertLevel[]).map(level => {
                                        const cnt = Object.values(computedResults).flatMap(r => r.alerts).filter(a => a.level === level).length;
                                        if (cnt === 0) return null;
                                        return (
                                            <span key={level} className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase ${levelBadge[level]}`}>
                                                {level === 'critical' ? 'CRITIC' : level === 'warning' ? 'ATENȚIE' : 'INFO'} ({cnt})
                                            </span>
                                        );
                                    })}
                                </div>

                                {/* Insights grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(['prezenta', 'examene', 'financiar', 'sportivi'] as const).map(id => {
                                        const def = AGENTS.find(a => a.id === id)!;
                                        const res = computedResults[id];
                                        return (
                                            <div key={id} className={`rounded-xl border ${def.border} bg-slate-900/60 p-4 space-y-3`}>
                                                <div className="flex items-center gap-2">
                                                    <def.icon className={`w-4 h-4 ${def.color}`} />
                                                    <span className={`text-xs font-bold tracking-wider uppercase ${def.color}`}>{def.name}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {res.metrics.map((m, i) => (
                                                        <div key={i} className="bg-slate-800/60 rounded-lg px-2 py-1.5">
                                                            <p className="text-[10px] text-slate-500">{m.label}</p>
                                                            <p className={`text-sm font-bold ${m.color}`}>{m.value}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="space-y-1">
                                                    {res.alerts.map((a, i) => (
                                                        <div key={i} className="flex items-start gap-2">
                                                            {alertIcon(a.level)}
                                                            <p className="text-[11px] text-slate-400 leading-tight">{a.text}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Alerta Manager full */}
                                <div className="rounded-xl border border-rose-500/40 bg-slate-900/80 p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <BellIcon className="w-5 h-5 text-rose-400" />
                                            <span className="font-bold text-rose-300 tracking-wider uppercase text-sm">Alertă Manager — Risc Combinat</span>
                                        </div>
                                        <span className={`text-lg font-black ${computedResults.alerta.metrics[0].color}`}>
                                            {computedResults.alerta.metrics[0].value}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {computedResults.alerta.metrics.map((m, i) => (
                                            <div key={i} className="bg-slate-800/60 rounded-lg px-2 py-1.5">
                                                <p className="text-[10px] text-slate-500">{m.label}</p>
                                                <p className={`text-sm font-bold ${m.color}`}>{m.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="space-y-1.5">
                                        {computedResults.alerta.alerts.map((a, i) => (
                                            <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg ${levelBadge[a.level]}`}>
                                                {alertIcon(a.level)}
                                                <p className="text-xs leading-tight">{a.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div className="flex flex-wrap gap-3 justify-center pt-2">
                                    <button onClick={() => onNavigate('prezenta')}
                                        className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-lg text-sm font-medium transition-colors">
                                        <CalendarDaysIcon className="w-4 h-4" /> Înregistrare Prezențe
                                    </button>
                                    <button onClick={() => onNavigate('plati-scadente')}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-lg text-sm font-medium transition-colors">
                                        <CreditCardIcon className="w-4 h-4" /> Facturi & Plăți
                                    </button>
                                    <button onClick={() => onNavigate('sportivi')}
                                        className="flex items-center gap-2 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 rounded-lg text-sm font-medium transition-colors">
                                        <UsersIcon className="w-4 h-4" /> Sportivi
                                    </button>
                                    <button onClick={handleLaunch}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-colors">
                                        <SparklesIcon className="w-4 h-4" /> Rulează Din Nou
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
