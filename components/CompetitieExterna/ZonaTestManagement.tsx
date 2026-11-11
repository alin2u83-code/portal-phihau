import React, { useState } from 'react';
import { Badge, Button, Card } from '../ui';
import { CLUB_DEMO, SPORTIVI_DEMO, GRUPE_DEMO, PLATI_DEMO } from './dateDemoManagement';

type Tab = 'sportivi' | 'grupe' | 'plati';
const TABURI: { id: Tab; label: string }[] = [
    { id: 'sportivi', label: 'Sportivi' },
    { id: 'grupe', label: 'Grupe' },
    { id: 'plati', label: 'Plăți' },
];

const BADGE_PLATA = { 'Achitat': 'green', 'Neachitat': 'red', 'Parțial': 'amber' } as const;

/** Zona de test (D-05, D-17): arată cum arată managementul, doar cu date fictive statice, doar citire. */
export const ZonaTestManagement: React.FC<{ onInapoi: () => void }> = ({ onInapoi }) => {
    const [tab, setTab] = useState<Tab>('sportivi');
    const th = 'text-left text-xs uppercase tracking-wide opacity-70 py-2 pr-3';
    const td = 'py-2 pr-3 text-sm';

    return (
        <div className="space-y-4">
            <div role="status" className="rounded-lg border border-amber-400 bg-amber-100 text-amber-900 px-4 py-3 text-sm font-semibold">
                Demonstrație — date fictive. Cere acces de la proprietarul aplicației.
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold">{CLUB_DEMO.nume}</h2>
                <Button variant="secondary" size="sm" onClick={onInapoi}>Înapoi la competiții</Button>
            </div>
            <div className="flex gap-2" role="tablist">
                {TABURI.map(t => (
                    <Button key={t.id} role="tab" aria-selected={tab === t.id} size="sm" variant={tab === t.id ? 'primary' : 'secondary'} onClick={() => setTab(t.id)}>{t.label}</Button>
                ))}
            </div>
            <Card className="overflow-x-auto">
                {tab === 'sportivi' && (
                    <table className="w-full">
                        <thead><tr><th className={th}>Nume</th><th className={th}>Grad</th><th className={th}>Grupa</th><th className={th}>Status</th></tr></thead>
                        <tbody>
                            {SPORTIVI_DEMO.map(s => (
                                <tr key={`${s.nume}-${s.prenume}`} className="border-t border-[var(--t-border)]">
                                    <td className={td}>{s.nume} {s.prenume}</td>
                                    <td className={td}>{s.grad}</td>
                                    <td className={td}>{s.grupa}</td>
                                    <td className={td}><Badge variant={s.status === 'Activ' ? 'green' : 'slate'}>{s.status}</Badge></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {tab === 'grupe' && (
                    <table className="w-full">
                        <thead><tr><th className={th}>Grupa</th><th className={th}>Orar</th><th className={th}>Sportivi</th><th className={th}>Instructor</th></tr></thead>
                        <tbody>
                            {GRUPE_DEMO.map(g => (
                                <tr key={g.denumire} className="border-t border-[var(--t-border)]">
                                    <td className={td}>{g.denumire}</td>
                                    <td className={td}>{g.orar}</td>
                                    <td className={td}>{g.nrSportivi}</td>
                                    <td className={td}>{g.instructor}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {tab === 'plati' && (
                    <table className="w-full">
                        <thead><tr><th className={th}>Sportiv</th><th className={th}>Descriere</th><th className={th}>Sumă</th><th className={th}>Status</th></tr></thead>
                        <tbody>
                            {PLATI_DEMO.map(p => (
                                <tr key={p.sportiv} className="border-t border-[var(--t-border)]">
                                    <td className={td}>{p.sportiv}</td>
                                    <td className={td}>{p.descriere}</td>
                                    <td className={td}>{p.suma} lei</td>
                                    <td className={td}><Badge variant={BADGE_PLATA[p.status]}>{p.status}</Badge></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>
        </div>
    );
};
