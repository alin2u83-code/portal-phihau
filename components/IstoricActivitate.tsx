import React, { useState, useEffect, useRef } from 'react';
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
    data: string;
    sportivNume: string;
    titlu: string;
    descriere: string;
    extra?: string;
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

const FILTRE: { label: string; value: TipActivitate | 'toate' }[] = [
    { label: 'Toate', value: 'toate' },
    { label: 'Sportivi noi', value: 'sportiv_nou' },
    { label: 'Promovări', value: 'promotie_grad' },
    { label: 'Înscrieri', value: 'inscriere_examen' },
    { label: 'Rezultate', value: 'rezultat_examen' },
    { label: 'Plăți', value: 'plata' },
];

const formateazaData = (iso: string): string => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return iso; }
};

const formateazaRelativ = (iso: string): string => {
    if (!iso) return '';
    const zile = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (zile === 0) return 'azi';
    if (zile === 1) return 'ieri';
    if (zile < 7) return `acum ${zile} zile`;
    if (zile < 30) return `acum ${Math.floor(zile / 7)} săpt.`;
    return `acum ${Math.floor(zile / 30)} luni`;
};

const dataLimitaISO = (zile: number) => {
    const d = new Date();
    d.setDate(d.getDate() - zile);
    return d.toISOString().split('T')[0];
};

// ─── Componentă ──────────────────────────────────────────────────────────────

export const IstoricActivitate: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { currentUser, grade, loading: dataLoading } = useData();
    const [items, setItems] = useState<ItemActivitate[]>([]);
    const [loading, setLoading] = useState(true);
    const [eroare, setEroare] = useState<string | null>(null);
    const [filtruActiv, setFiltruActiv] = useState<TipActivitate | 'toate'>('toate');
    const [cautare, setCautare] = useState('');
    const [limitaZile, setLimitaZile] = useState(365);

    const gradeMap = Object.fromEntries(grade.map(g => [g.id, g.nume]));
    const fetchedRef = useRef(false);

    useEffect(() => {
        if (dataLoading) return; // așteptăm să se termine încărcarea contextului
        if (!supabase || !currentUser) { setLoading(false); return; }

        fetchedRef.current = false;
        incarcaDate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataLoading, currentUser?.id, limitaZile]);

    const incarcaDate = async () => {
        if (!supabase || !currentUser) return;
        setLoading(true);
        setEroare(null);

        try {
            const limitaISO = dataLimitaISO(limitaZile);
            const rezultate: ItemActivitate[] = [];

            // Determinăm club_id-urile relevante
            const clubId = (currentUser as any).club_id || null;

            // ── 1. Sportivi noi ───────────────────────────────────────────
            let qSportivi = supabase
                .from('sportivi')
                .select('id, nume, prenume, data_inscrierii, grad_actual_id')
                .gte('data_inscrierii', limitaISO)
                .order('data_inscrierii', { ascending: false })
                .limit(200);
            if (clubId) qSportivi = qSportivi.eq('club_id', clubId);

            const { data: sportiviNoi, error: eSp } = await qSportivi;
            if (eSp) console.error('Sportivi fetch error:', eSp.message);

            const sportiviIds = (sportiviNoi || []).map(s => s.id);
            const sportiviMap: Record<string, string> = {};
            (sportiviNoi || []).forEach(s => {
                sportiviMap[s.id] = `${s.prenume} ${s.nume}`;
            });

            (sportiviNoi || []).forEach(s => {
                rezultate.push({
                    id: `sportiv-${s.id}`,
                    tip: 'sportiv_nou',
                    data: s.data_inscrierii,
                    sportivNume: `${s.prenume} ${s.nume}`,
                    titlu: `${s.prenume} ${s.nume}`,
                    descriere: `Sportiv nou înregistrat — grad inițial: ${gradeMap[s.grad_actual_id] || 'Debutant'}`,
                });
            });

            // ── 2. Promovări grade ────────────────────────────────────────
            // Luăm toți sportivii clubului pentru filtrarea grade-urilor
            let sportiviIdsClub = sportiviIds;
            if (sportiviIdsClub.length === 0 && clubId) {
                const { data: allSp } = await supabase
                    .from('sportivi')
                    .select('id, nume, prenume')
                    .eq('club_id', clubId)
                    .limit(1000);
                (allSp || []).forEach(s => {
                    sportiviIdsClub.push(s.id);
                    sportiviMap[s.id] = `${s.prenume} ${s.nume}`;
                });
            }

            if (sportiviIdsClub.length > 0) {
                // Împărțim în batch-uri de 100 pentru a evita URL prea lung
                const batchSize = 100;
                for (let i = 0; i < sportiviIdsClub.length; i += batchSize) {
                    const batch = sportiviIdsClub.slice(i, i + batchSize);

                    const { data: promotii, error: eGr } = await supabase
                        .from('istoric_grade')
                        .select('id, sportiv_id, grad_id, data_obtinere, observatii')
                        .in('sportiv_id', batch)
                        .gte('data_obtinere', limitaISO)
                        .order('data_obtinere', { ascending: false })
                        .limit(200);
                    if (eGr) console.error('Grade fetch error:', eGr.message);

                    (promotii || []).forEach(p => {
                        const numeS = sportiviMap[p.sportiv_id] || 'Sportiv';
                        const numeG = gradeMap[p.grad_id] || 'grad necunoscut';
                        const obs = p.observatii && !['Import inițial', 'Import CSV', 'Înregistrare inițială'].includes(p.observatii)
                            ? ` (${p.observatii})` : '';
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

                    // ── 3. Înscrieri & rezultate examene ─────────────────
                    const { data: inscrieri, error: eIns } = await supabase
                        .from('inscrieri_examene')
                        .select('id, sportiv_id, rezultat, status_inscriere, sesiune_id')
                        .in('sportiv_id', batch)
                        .limit(500);
                    if (eIns) console.error('Inscrieri fetch error:', eIns.message);

                    if ((inscrieri || []).length > 0) {
                        // Luăm sesiunile unice
                        const sesiuniIds = [...new Set((inscrieri || []).map((i: any) => i.sesiune_id).filter(Boolean))];
                        const { data: sesiuni } = await supabase
                            .from('sesiuni_examene')
                            .select('id, data, nume')
                            .in('id', sesiuniIds);
                        const sesiuniMap: Record<string, { data: string; nume: string }> = {};
                        (sesiuni || []).forEach((s: any) => { sesiuniMap[s.id] = s; });

                        (inscrieri || []).forEach((ins: any) => {
                            const ses = sesiuniMap[ins.sesiune_id];
                            if (!ses || !ses.data || ses.data < limitaISO) return;
                            const numeS = sportiviMap[ins.sportiv_id] || 'Sportiv';
                            const sesDen = `${ses.nume || ''} ${formateazaData(ses.data)}`.trim();

                            if (ins.rezultat && ins.rezultat !== 'Neprezentat') {
                                rezultate.push({
                                    id: `rez-${ins.id}`,
                                    tip: 'rezultat_examen',
                                    data: ses.data,
                                    sportivNume: numeS,
                                    titlu: numeS,
                                    descriere: `Rezultat examen ${sesDen}`,
                                    extra: ins.rezultat,
                                });
                            } else {
                                rezultate.push({
                                    id: `ins-${ins.id}`,
                                    tip: 'inscriere_examen',
                                    data: ses.data,
                                    sportivNume: numeS,
                                    titlu: numeS,
                                    descriere: `Înscris la examenul ${sesDen}`,
                                    extra: ins.status_inscriere,
                                });
                            }
                        });
                    }

                    // ── 4. Plăți ──────────────────────────────────────────
                    const { data: platiRecente, error: ePl } = await supabase
                        .from('plati')
                        .select('id, sportiv_id, suma, data, status, descriere, tip')
                        .in('sportiv_id', batch)
                        .gte('data', limitaISO)
                        .order('data', { ascending: false })
                        .limit(200);
                    if (ePl) console.error('Plati fetch error:', ePl.message);

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
                }
            }

            // Deduplicare + sortare
            const unice = Array.from(new Map(rezultate.map(i => [i.id, i])).values());
            unice.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
            setItems(unice);
        } catch (err: any) {
            console.error('IstoricActivitate error:', err);
            setEroare(err.message || 'Eroare la încărcarea datelor');
        } finally {
            setLoading(false);
        }
    };

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
                            <div className="text-2xl font-bold">{loading ? '…' : (numerePerTip[tip] || 0)}</div>
                        </button>
                    );
                })}
            </div>

            {/* Controale */}
            <Card className="p-3">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            value={cautare}
                            onChange={e => setCautare(e.target.value)}
                            placeholder="Caută sportiv sau activitate..."
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                    </div>
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
            {loading || dataLoading ? (
                <Card className="p-8 text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-sky-500 border-t-transparent rounded-full mx-auto mb-3" />
                    <p className="text-slate-400">Se încarcă activitatea...</p>
                </Card>
            ) : eroare ? (
                <Card className="p-6 border-red-500/30">
                    <p className="text-red-400 text-sm">{eroare}</p>
                    <Button size="sm" className="mt-3" onClick={incarcaDate}>Reîncearcă</Button>
                </Card>
            ) : grupeZi.length === 0 ? (
                <Card className="p-8 text-center">
                    <ClockIcon className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Nicio activitate găsită în intervalul selectat.</p>
                    {limitaZile < 365 && (
                        <button onClick={() => setLimitaZile(365)} className="mt-2 text-sky-400 text-sm hover:underline">
                            Încearcă cu „Ultimul an"
                        </button>
                    )}
                </Card>
            ) : (
                <div className="space-y-6">
                    {grupeZi.map(grup => (
                        <div key={grup.data}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-px flex-1 bg-slate-700/60" />
                                <span className="text-xs font-semibold text-slate-400 bg-slate-900 px-2">
                                    {formateazaData(grup.data)}
                                    <span className="ml-1.5 text-slate-500">({formateazaRelativ(grup.data)})</span>
                                </span>
                                <div className="h-px flex-1 bg-slate-700/60" />
                            </div>
                            <div className="space-y-2">
                                {grup.items.map(item => {
                                    const Icon = ICOANE[item.tip];
                                    return (
                                        <div key={item.id} className="flex items-start gap-3 bg-slate-800/50 hover:bg-slate-800 transition-colors rounded-xl p-3 border border-slate-700/50">
                                            <div className={`mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${CULORI[item.tip]}`}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-semibold text-white truncate">{item.titlu}</span>
                                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${CULORI[item.tip]}`}>
                                                        {ETICHETE[item.tip]}
                                                    </span>
                                                    {item.extra && <ExtraBadge value={item.extra} />}
                                                </div>
                                                <p className="text-xs text-slate-400 mt-0.5">{item.descriere}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && !dataLoading && itemsFiltrate.length > 0 && (
                <p className="text-center text-xs text-slate-500 pb-4">{itemsFiltrate.length} înregistrări afișate</p>
            )}
        </div>
    );
};

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
            {(value === 'Admis' || value === 'Achitat') && <CheckCircleIcon className="h-2.5 w-2.5" />}
            {(value === 'Respins' || value === 'Neachitat') && <XCircleIcon className="h-2.5 w-2.5" />}
            {value}
        </span>
    );
};
