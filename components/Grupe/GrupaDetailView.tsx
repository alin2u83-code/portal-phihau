import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Grupa as GrupaType, ProgramItem } from '../../types';
import { Button, Card, Input } from '../ui';
import { ArrowLeftIcon, PlusIcon, TrashIcon, CheckCircleIcon, CogIcon } from '../icons';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import { clearCache } from '../../utils/cache';

interface GrupaWithDetails extends GrupaType {
    sportivi: { count: number }[];
    program: ProgramItem[];
}

type TabId = 'antrenamente' | 'orar' | 'sportivi';

interface GrupaDetailViewProps {
    grupa: GrupaWithDetails;
    onBack: () => void;
    onOpenAdaugaSportivi: (g: GrupaWithDetails) => void;
}

// Tab Antrenamente — placeholder (D-10, pregătit pentru calendarul din Phase 3)
const TabAntrenamente: React.FC = () => (
    <div className="flex items-center justify-center py-12">
        <div className="border-dashed border-2 border-slate-700 rounded-xl py-12 px-8 text-center max-w-md">
            <h3 className="text-base font-bold text-white mb-2">
                Calendar antrenamente — disponibil în curând
            </h3>
            <p className="text-sm text-slate-400">
                Gestionarea completă a antrenamentelor va fi disponibilă în faza următoare.
                Folosește tab-ul Orar pentru a configura programul recurent.
            </p>
        </div>
    </div>
);

// Tab Orar — logică copiată din OrarEditorModal cu adaptări D-02/D-03/D-04
const TabOrar: React.FC<{ grupa: GrupaWithDetails }> = ({ grupa }) => {
    const [program, setProgram] = useState<ProgramItem[]>(grupa.program || []);
    const [loading, setLoading] = useState(false);
    const { showError, showSuccess } = useError();
    const queryClient = useQueryClient();
    const zileSaptamana: ProgramItem['ziua'][] = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

    // Reset când se schimbă grupa — dependency pe grupa.id (string), NU pe grupa (obiect) — Pitfall 2
    React.useEffect(() => {
        setProgram(grupa.program || []);
    }, [grupa.id]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await supabase.from('orar_saptamanal').delete().eq('grupa_id', grupa.id);
            const toInsert = program.map(({ id, ...rest }) => ({
                ...rest,
                grupa_id: grupa.id,
                club_id: grupa.club_id,
            }));
            if (toInsert.length > 0) {
                const { error } = await supabase.from('orar_saptamanal').insert(toInsert);
                if (error) throw error;
            }
            // clearCache ÎNAINTE de invalidateQueries — Pitfall 3
            Object.keys(localStorage)
                .filter(k => k.startsWith('cache_grupe_'))
                .forEach(k => clearCache(k));
            await queryClient.invalidateQueries({ queryKey: ['grupe'] });
            showSuccess('Succes', 'Orarul a fost salvat.');
            // D-04: NU apelăm onClose() — rămânem pe tab după salvare
        } catch (error: any) {
            showError('Eroare la salvare orar', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = (zi: ProgramItem['ziua'] = 'Luni') =>
        setProgram(p => [...p, { id: `new-${Date.now()}`, ziua: zi, ora_start: '18:00', ora_sfarsit: '19:30', is_activ: true }]);

    const handleRemoveItem = (id: string) => setProgram(p => p.filter(item => item.id !== id));

    const handleItemChange = (id: string, field: keyof ProgramItem, value: any) =>
        setProgram(p => p.map(item => item.id === id ? { ...item, [field]: value } : item));

    const programByDay = useMemo(() => {
        const grouped: Record<string, ProgramItem[]> = {};
        zileSaptamana.forEach(zi => (grouped[zi] = program.filter(p => p.ziua === zi)));
        return grouped;
    }, [program]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
                <CogIcon className="w-4 h-4 text-indigo-400" />
                <span>Definește șablonul recurent al antrenamentelor pentru această grupă.</span>
            </div>

            <div className="space-y-6">
                {zileSaptamana.map(zi => (
                    <div key={zi} className="group">
                        <div className="flex items-center justify-between mb-3 border-b border-slate-700/50 pb-2">
                            <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                {zi}
                            </h3>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleAddItem(zi)}
                                className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity touch-manipulation min-h-[36px]"
                            >
                                <PlusIcon className="w-3 h-3 mr-1" /> Adaugă Interval
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {programByDay[zi].length > 0 ? (
                                programByDay[zi].map(item => (
                                    <div
                                        key={item.id}
                                        className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center bg-slate-800/30 p-3 rounded-xl border border-slate-700/50 hover:border-indigo-500/30 transition-all"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider w-12">Start</span>
                                            <Input
                                                label=""
                                                type="time"
                                                value={item.ora_start}
                                                onChange={e => handleItemChange(item.id, 'ora_start', e.target.value)}
                                                className="flex-grow"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider w-12">Sfârșit</span>
                                            <Input
                                                label=""
                                                type="time"
                                                value={item.ora_sfarsit}
                                                onChange={e => handleItemChange(item.id, 'ora_sfarsit', e.target.value)}
                                                className="flex-grow"
                                            />
                                        </div>
                                        <div className="flex justify-end">
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => handleRemoveItem(item.id)}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div
                                    onClick={() => handleAddItem(zi)}
                                    className="py-3 px-4 border-2 border-dashed border-slate-800 rounded-xl text-center text-slate-500 hover:border-slate-700 hover:text-slate-400 cursor-pointer transition-all"
                                >
                                    <p className="text-sm italic">Niciun antrenament pentru {zi.toLowerCase()}.</p>
                                    <p className="text-xs mt-1">Apasă pentru a adăuga primul interval.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-slate-700">
                <Button variant="secondary" onClick={() => setProgram(grupa.program || [])} disabled={loading}
                    className="w-full sm:w-auto touch-manipulation">
                    Resetează
                </Button>
                <Button variant="success" onClick={handleSave} isLoading={loading}
                    className="w-full sm:w-auto touch-manipulation">
                    <CheckCircleIcon className="w-4 h-4 mr-2" /> Salvează Orar
                </Button>
            </div>
        </div>
    );
};

// Tab Sportivi — query read-only per grupă + buton Adaugă Sportivi (D-05, D-06)
const TabSportivi: React.FC<{ grupa: GrupaWithDetails; onOpenAdaugaSportivi: (g: GrupaWithDetails) => void }> = ({ grupa, onOpenAdaugaSportivi }) => {
    const { data: sportivi = [], isLoading, error } = useQuery({
        queryKey: ['sportivi-grupa', grupa.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sportivi')
                .select('id, nume, prenume, grad_actual_id, grade:grad_actual_id(denumire)')
                .eq('grupa_id', grupa.id)
                .eq('status', 'Activ');
            if (error) throw error;
            return data ?? [];
        },
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) return <div className="text-center py-8 text-slate-400">Se încarcă...</div>;
    if (error) return <div className="text-center py-8 text-rose-400">Nu s-au putut încărca datele. Verifică conexiunea și încearcă din nou.</div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {sportivi.length} sportivi activi
                </h3>
                <Button
                    variant="info"
                    size="sm"
                    onClick={() => onOpenAdaugaSportivi(grupa)}
                    className="min-h-[40px] touch-manipulation"
                >
                    Adaugă Sportivi
                </Button>
            </div>

            {sportivi.length === 0 ? (
                <Card className="text-center py-8">
                    <p className="text-sm font-semibold text-slate-300">Niciun sportiv în această grupă</p>
                    <p className="text-xs text-slate-400 mt-1">Adaugă primul sportiv folosind butonul de mai jos.</p>
                </Card>
            ) : (
                <div className="space-y-2">
                    {sportivi.map((s: any) => (
                        <div
                            key={s.id}
                            className="flex items-center gap-3 py-2 px-3 rounded-lg bg-slate-800/30 border border-slate-700/50"
                        >
                            <span className="text-sm text-slate-300">
                                {(s.prenume || '')} {(s.nume || '')}
                            </span>
                            {s.grade?.denumire && (
                                <span className="text-xs text-slate-500 ml-auto">{s.grade.denumire}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const GrupaDetailView: React.FC<GrupaDetailViewProps> = ({ grupa, onBack, onOpenAdaugaSportivi }) => {
    const [activeTab, setActiveTab] = useState<TabId>('antrenamente');

    const sportiviCount = grupa.sportivi?.[0]?.count ?? 0;

    return (
        <div>
            {/* Header row */}
            <div className="flex items-center justify-between py-4 border-b border-slate-700 flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={onBack}>
                    <ArrowLeftIcon className="w-4 h-4 mr-1.5" />
                    Înapoi la Grupe
                </Button>
                <div className="text-right">
                    <h1 className="text-xl font-bold text-white">{grupa.denumire}</h1>
                    <p className="text-sm text-slate-400">Sala: {grupa.sala || 'Nespecificată'} · {sportiviCount} sportivi activi</p>
                </div>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-slate-700 gap-1">
                {(['antrenamente', 'orar', 'sportivi'] as TabId[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`h-10 px-4 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                            activeTab === tab
                                ? 'border-indigo-500 text-white'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        {tab === 'antrenamente' ? 'Antrenamente' : tab === 'orar' ? 'Orar' : 'Sportivi'}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="py-6 overflow-y-auto">
                {activeTab === 'antrenamente' && <TabAntrenamente />}
                {activeTab === 'orar' && <TabOrar grupa={grupa} />}
                {activeTab === 'sportivi' && <TabSportivi grupa={grupa} onOpenAdaugaSportivi={onOpenAdaugaSportivi} />}
            </div>
        </div>
    );
};
