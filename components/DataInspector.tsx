import React, { useMemo } from 'react';
import { Antrenament } from '../types';
import { Card, Button } from './ui';
import { ArrowLeftIcon } from './icons';

interface DataInspectorProps {
    antrenamente: Antrenament[];
    onBack: () => void;
}

const StatCard: React.FC<{ label: string; value: string | number; colorClass: string }> = ({ label, value, colorClass }) => (
    <div className="bg-slate-700 p-4 rounded-lg text-center">
        <div className={`text-4xl font-bold ${colorClass}`}>{value}</div>
        <div className="text-sm text-slate-400 mt-1">{label}</div>
    </div>
);

export const DataInspector: React.FC<DataInspectorProps> = ({ antrenamente, onBack }) => {

    const stats = useMemo(() => {
        const total = antrenamente.length;
        // The `prezenta_antrenament` raw property is mapped to `sportivi_prezenti_ids` and then removed.
        // So, we can't check for the raw join property here.
        // Instead, we check the result of that mapping.
        const cuPrezentiProcesati = antrenamente.filter(a => a.sportivi_prezenti_ids?.length > 0).length;

        return { total, cuPrezentiProcesati };
    }, [antrenamente]);

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi</Button>
            <h1 className="text-3xl font-bold text-white">Inspector Date (Debug)</h1>

            <Card className="border-l-4 border-amber-400">
                <h2 className="text-xl font-bold text-white mb-4">Analiză Antrenamente & Prezență</h2>
                <p className="text-sm text-slate-400 mb-6">
                    Această pagină afișează datele procesate pentru a verifica dacă informațiile despre prezență sunt încărcate corect.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StatCard label="Total Antrenamente Încărcate" value={stats.total} colorClass="text-white" />
                    <StatCard label="Antrenamente cu Prezenți" value={stats.cuPrezentiProcesati} colorClass="text-green-400" />
                </div>
                 <div className="mt-4 text-sm text-slate-300">
                    <p>Dacă numărul de "Antrenamente cu Prezenți" este 0, deși ați înregistrat prezențe, problema este cel mai probabil o politică de securitate (RLS) pe tabelul `prezenta_antrenament` care blochează citirea datelor.</p>
                </div>
            </Card>

            <Card>
                <h2 className="text-xl font-bold text-white mb-4">Date Brute Antrenamente (JSON Final, după procesare)</h2>
                 <p className="text-sm text-slate-400 mb-2">Acestea sunt datele așa cum ajung în componentele aplicației. Verificați dacă `sportivi_prezenti_ids` este populat.</p>
                <pre className="bg-slate-900 p-4 rounded max-h-96 overflow-auto text-xs font-mono">
                    <code>
                        {JSON.stringify(antrenamente, null, 2)}
                    </code>
                </pre>
            </Card>
        </div>
    );
};