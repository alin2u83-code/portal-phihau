import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useData } from '../contexts/DataContext';
import { Card, Button } from './ui';
import {
    UserPlusIcon, GraduationCapIcon, TrophyIcon, BanknotesIcon,
    ClockIcon, ArrowLeftIcon, SearchIcon, CheckCircleIcon, XCircleIcon,
} from './icons';

// ─── Tipuri ──────────────────────────────────────────────────────────────────

type TipActivitate = 'sportiv_nou' | 'promotie_grad' | 'inscriere_examen' | 'rezultat_examen' | 'plata';

interface ItemActivitate {
    id: string;
    tip: TipActivitate;
    data: string;           // ISO date string pentru sortare
    sportivNume: string;
    titlu: string;
    descriere: string;
    extra?: string;         // badge suplimentar (ex: "Admis", "Neachitat")
}

const CULORI: Record<TipActivitate, string> = {
    sportiv_nou:      'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    promotie_grad:    'bg-violet-500/20 text-violet-300 border-violet-500/40',
    inscriere_examen: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    rezultat_examen:  'bg-amber-500/20 text-amber-300 border-amber-500/40',
    plata:            'bg-slate-500/20 text-slate-300 border-slate-500/40',
};

const ETICHETE: Record<TipActivitate, string> = {
    sportiv_nou:      'Sportiv nou',
    promotie_grad:    'Promovare grad',
    inscriere_examen: 'Înscris la examen',
    rezultat_examen:  'Rezultat examen',
    plata:            'Plată',
};

const ICOANE: Record<TipActivitate, React.ElementType> = {
    sportiv_nou:      UserPlusIcon,
    promotie_grad:    GraduationCapIcon,
    inscriere_examen: TrophyIcon,
    rezultat_examen:  TrophyIcon,
    plata:            BanknotesIcon,
};

const CULORI_DOT: Record<TipActivitate, string> = {
    sportiv_nou:      'bg-emerald-400',
    promotie_grad:    'bg-violet-400',
    inscriere_examen: 'bg-sky-400',
    rezultat_examen:  'bg-amber-400',
    plata:            'bg-slate-400',
};

const FILTRE: { label: string; value: TipActivitate | 'toate' }[] = [
    { label: 'Toate', value: 'toate' },
    { label: 'Sportivi noi', value: 'sportiv_nou' },
    { label: 'Promovări', value: 'promotie_grad' },
    { label: 'Înscrieri', value: 'inscriere_examen' },
    { label: 'Rezultate', value: 'rezultat_examen' },
    { label: 'Plăți', value: 'plata' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formateazaData = (iso: string): string => {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
};

const formateazaRelativ = (iso: string): string => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const zile = Math.floor(diff / 86400000);
    if (zile === 0) return 'azi';
    if (zile === 1) return 'ieri';
    if (zile < 7) return `acum ${zile} zile`;
    if (zile < 30) return `acum ${Math.floor(zile / 7)} săpt.`;
    return `acum ${Math.floor(zile / 30)} luni`;
};

// ─── Componentă principală ───────────────────────────────────────────────────

export const IstoricActivitate: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { filteredData, grade } = useData();
    const [items, setItems] = useState<ItemActivitate[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtruActiv, setFiltruActiv] = useState<TipActivitate | 'toate'>('toate');
    const [cautare, setCautare] = useState('');
    const [limitaZile, setLimitaZile] = useState(30);

    const sportiviIds = filteredData.sportivi.map(s => s.id);
    const sportiviMap = Object.fromEntries(
        filteredData.sportivi.map(s => [s.id, `${s.prenume} ${s.nume}`])
    );
    const gradeMap = Object.fromEntries(grade.map(g => [g.id, g.nume]));

    const incarcaDate = useCallback(async () => {
        if (!supabase || sportiviIds.length === 0) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const dataLimita = new Date();
        dataLimita.setDate(dataLimita.getDate() - limitaZile);
        const limitaISO = dataLimita.toISOString().split('T')[0];

        const rezultate: ItemActivitate[] = [];

        // 1. Sportivi noi
        const { data: sportiviNoi } = await supabase
            .from('sportivi')
            .select('id, nume, prenume, data_inscrierii, grad_actual_id')
            .in('id', sportiviIds)
            .gte('data_inscrierii', limitaISO)
            .order('data_inscrierii', { ascending: false })
            .limit(100);

        (sportiviNoi || []).forEach(s => {
            const gradNume = gradeMap[s.grad_actual_id] || 'Debutant';
            rezultate.push({
                id: `sportiv-${s.id}`,
                tip: 'sportiv_nou',
                data: s.data_inscrierii,
                sportivNume: `${s.prenume} ${s.nume}`,
                titlu: `${s.prenume} ${s.nume}`,
                descriere: `Sportiv nou înregistrat — grad inițial: ${gradNume}`,
            });
        });

        // 2. Promovări grade
        const { data: promotii } = await supabase
            .from('istoric_grade')
            .select('id, sportiv_id, grad_id, data_obtinere, observatii')
            .in('sportiv_id', sportiviIds)
            .gte('data_obtinere', limitaISO)
            .order('data_obtinere', { ascending: false })
            .limit(100);

        (promotii || []).forEach(p => {
            const numeS = sportiviMap[p.sportiv_id] || 'Sportiv';
            const numeG = gradeMap[p.grad_id] || 'grad necunoscut';
            const obs = p.observatii && p.observatii !== 'Import inițial' ? ` (${p.observatii})` : '';
            rezultate.push({
                id: `grad-${p.id}`,
                tip: 'promotie_grad',
                data: p.data_obtinere,
                sportivNume: numeS,
                titlu: numeS,
                descriere: `A promovat la ${numeG}${obs}`,
                extra: numeG,
            });
        });

        // 3. Înscrieri & rezultate examene
        const { data: inscrieri } = await supabase
            .from('inscrieri_examene')
            .select('id, sportiv_id, rezultat, status_inscriere, sesiune:sesiuni_examene(id, data, nume)')
            .in('sportiv_id', sportiviIds)
            .order('sesiune(data)', { ascending: false })
            .limit(200);

        (inscrieri || []).forEach((ins: any) => {
            const numeS = sportiviMap[ins.sportiv_id] || 'Sportiv';
            const sesData = ins.sesiune?.data;
            if (!sesData || sesData < limitaISO) return;

            const sesDenumire = `${ins.sesiune?.nume || ''} ${formateazaData(sesData)}`.trim();

            if (ins.rezultat && ins.rezultat !== 'Neprezentat') {
                // Rezultat final
                const esteAdmis = ins.rezultat === 'Admis';
                rezultate.push({
                    id: `rez-${ins.id}`,
                    tip: 'rezultat_examen',
                    data: sesData,
                    sportivNume: numeS,
                    titlu: numeS,
                    descriere: `Rezultat examen ${sesDenumire}`,
                    extra: ins.rezultat,
                });
            } else {
                // Doar înscris
                rezultate.push({
                    id: `ins-${ins.id}`,
                    tip: 'inscriere_examen',
                    data: sesData,
                    sportivNume: numeS,
                    titlu: numeS,
                    descriere: `Înscris la examenul ${sesDenumire}`,
                    extra: ins.status_inscriere,
                });
            }
        });

        // 4. Plăți
        const { data: platiRecente } = await supabase
            .from('plati')
            .select('id, sportiv_id, suma, data, status, descriere, tip')
            .in('sportiv_id', sportiviIds)
            .gte('data', limitaISO)
            .order('data', { ascending: false })
            .limit(100);

        (platiRecente || []).forEach(p => {
            const numeS = sportiviMap[p.sportiv_id] || 'Sportiv';
            rezultate.push({
                id: `plata-${p.id}`,
                tip: 'plata',
                data: p.data,
                sportivNume: numeS,
                titlu: numeS,
                descriere: `${p.descriere || p.tip || 'Plată'} — ${p.suma} RON`,
                extra: p.status,
            });
        });

        // Sortare descrescătoare după dată
        rezultate.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        setItems(rezultate);
        setLoading(false);
    }, [sportiviIds.join(','), limitaZile]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        incarcaDate();
    }, [incarcaDate]);

    const itemsFiltrate = items.filter(item => {
        if (filtruActiv !== 'toate' && item.tip !== filtruActiv) return false;
        if (cautare) {
            const q = cautare.toLowerCase();
            if (!item.sportivNume.toLowerCase().includes(q) && !item.descriere.toLowerCase().includes(q)) return false;
        }
        return true;
    });

    // Grupare pe zile
    const grupeZi: { data: string; items: ItemActivitate[] }[] = [];
    itemsFiltrate.forEach(item => {
        const ziua = item.data.slice(0, 10);
        const grup = grupeZi.find(g => g.data === ziua);
        if (grup) grup.items.push(item);
        else grupeZi.push({ data: ziua, items: [item] });
    });

    const numerePerTip: Record<string, number> = {};
    items.forEach(i => { numerePerTip[i.tip] = (numerePerTip[i.tip] || 0) + 1; });

    return (
        <div className="space-y-4 animate-fade-in-down">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={onBack}>
                    <ArrowLeftIcon className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-white">Istoric Activitate</h1>
                    <p className="text-slate-400 text-sm">Modificările recente din baza de date</p>
                </div>
            </div>

            {/* Sumar carduri */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {(Object.keys(ETICHETE) as TipActivitate[]).map(tip => {
                    const Icon = ICOANE[tip];
                    return (
                        <button
                            key={tip}
                            onClick={() => setFiltruActiv(prev => prev === tip ? 'toate' : tip)}
                            className={`rounded-xl p-3 border text-left transition-all ${CULORI[tip]} ${filtruActiv === tip ? 'ring-2 ring-white/30' : 'opacity-80 hover:opacity-100'}`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Icon className="h-4 w-4" />
                                <span className="text-xs font-medium">{ETICHETE[tip]}</span>
                            </div>
                            <div className="text-2xl font-bold">{numerePerTip[tip] || 0}</div>
                        </button>
                    );
                })}
            </div>

            {/* Controale */}
            <Card className="p-3">
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Căutare */}
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            value={cautare}
                            onChange={e => setCautare(e.target.value)}
                            placeholder="Caută sportiv sau activitate..."
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                    </div>
                    {/* Filtru categorie */}
                    <div className="flex gap-1.5 flex-wrap">
                        {FILTRE.map(f => (
                            <button
                                key={f.value}
                                onClick={() => setFiltruActiv(f.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtruActiv === f.value ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    {/* Interval */}
                    <select
                        value={limitaZile}
                        onChange={e => setLimitaZile(Number(e.target.value))}
                        className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                        <option value={7}>Ultimele 7 zile</option>
                        <option value={30}>Ultimele 30 zile</option>
                        <option value={90}>Ultimele 3 luni</option>
                        <option value={365}>Ultimul an</option>
                    </select>
                </div>
            </Card>

            {/* Feed */}
            {loading ? (
                <Card className="p-8 text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-sky-500 border-t-transparent rounded-full mx-auto mb-3" />
                    <p className="text-slate-400">Se încarcă activitatea...</p>
                </Card>
            ) : grupeZi.length === 0 ? (
                <Card className="p-8 text-center">
                    <ClockIcon className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Nicio activitate găsită în intervalul selectat.</p>
                </Card>
            ) : (
                <div className="space-y-6">
                    {grupeZi.map(grup => (
                        <div key={grup.data}>
                            {/* Separator zi */}
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-px flex-1 bg-slate-700/60" />
                                <span className="text-xs font-semibold text-slate-400 bg-slate-900 px-2">
                                    {formateazaData(grup.data)}
                                    <span className="ml-1.5 text-slate-500">({formateazaRelativ(grup.data)})</span>
                                </span>
                                <div className="h-px flex-1 bg-slate-700/60" />
                            </div>

                            {/* Items */}
                            <div className="space-y-2">
                                {grup.items.map(item => {
                                    const Icon = ICOANE[item.tip];
                                    return (
                                        <div
                                            key={item.id}
                                            className="flex items-start gap-3 bg-slate-800/50 hover:bg-slate-800 transition-colors rounded-xl p-3 border border-slate-700/50"
                                        >
                                            {/* Dot + Icon */}
                                            <div className={`mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${CULORI[item.tip]}`}>
                                                <Icon className="h-4 w-4" />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-semibold text-white truncate">{item.titlu}</span>
                                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${CULORI[item.tip]}`}>
                                                        {ETICHETE[item.tip]}
                                                    </span>
                                                    {item.extra && (
                                                        <ExtraBadge value={item.extra} />
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400 mt-0.5 truncate">{item.descriere}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && itemsFiltrate.length > 0 && (
                <p className="text-center text-xs text-slate-500 pb-4">
                    {itemsFiltrate.length} înregistrări afișate
                </p>
            )}
        </div>
    );
};

// Badge colorat pentru "extra" (Admis/Respins/status plată etc.)
const ExtraBadge: React.FC<{ value: string }> = ({ value }) => {
    const culori: Record<string, string> = {
        'Admis': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        'Respins': 'bg-red-500/20 text-red-300 border-red-500/40',
        'Neprezentat': 'bg-slate-500/20 text-slate-400 border-slate-500/40',
        'Achitat': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        'Neachitat': 'bg-red-500/20 text-red-300 border-red-500/40',
        'Achitat Parțial': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        'Validat': 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        'In asteptare': 'bg-slate-500/20 text-slate-400 border-slate-500/40',
    };
    const cls = culori[value] || 'bg-slate-500/20 text-slate-400 border-slate-500/40';
    return (
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${cls} flex items-center gap-1`}>
            {value === 'Admis' || value === 'Achitat' ? <CheckCircleIcon className="h-2.5 w-2.5" /> : null}
            {value === 'Respins' || value === 'Neachitat' ? <XCircleIcon className="h-2.5 w-2.5" /> : null}
            {value}
        </span>
    );
};
