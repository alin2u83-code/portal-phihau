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
        const cuPrezentaJoin = antrenamente.filter(a => (a as any).prezenta_antrenament).length;
        const cuPrezentiProcesati = antrenamente.filter(a => a.sportivi_prezenti_ids?.length > 0).length;
        const exempluCuDate = antrenamente.find(a => a.sportivi_prezenti_ids?.length > 0) || null;
        const exempluFaraDate = antrenamente.find(a => !a.sportivi_prezenti_ids || a.sportivi_prezenti_ids.length === 0) || null;

        return { total, cuPrezentaJoin, cuPrezentiProcesati, exempluCuDate, exempluFaraDate };
    }, [antrenamente]);

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi</Button>
            <h1 className="text-3xl font-bold text-white">Inspector Date (Debug)</h1>

            <Card className="border-l-4 border-amber-400">
                <h2 className="text-xl font-bold text-white mb-4">Analiză Antrenamente & Prezență</h2>
                <p className="text-sm text-slate-400 mb-6">
                    Această pagină afișează datele brute primite de la Supabase pentru a verifica dacă informațiile despre prezență sunt încărcate corect.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard label="Total Antrenamente Încărcate" value={stats.total} colorClass="text-white" />
                    <StatCard label="Antrenamente cu Relație Prezență" value={stats.cuPrezentaJoin} colorClass="text-sky-400" />
                    <StatCard label="Antrenamente cu Prezenți Procesate" value={stats.cuPrezentiProcesati} colorClass="text-green-400" />
                </div>
                 <div className="mt-4 text-sm text-slate-300">
                    <ul>
                        <li>• <strong>Total Încărcate:</strong> Numărul total de înregistrări din `program_antrenamente` (cu `data` non-null).</li>
                        <li>• <strong>Cu Relație Prezență:</strong> Numărul de antrenamente la care Supabase a atașat un array `prezenta_antrenament` (poate fi gol `[]`). Dacă acest număr e 0, politica RLS sau interogarea blochează relația.</li>
                        <li>• <strong>Cu Prezenți Procesate:</strong> Numărul de antrenamente unde `sportivi_prezenti_ids` are cel puțin un ID. Dacă acest număr e 0, fie nimeni nu a fost la antrenamente, fie procesarea datelor a eșuat.</li>
                    </ul>
                </div>
            </Card>

            <Card>
                <h2 className="text-xl font-bold text-white mb-4">Exemple de Date</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                    <div>
                        <h3 className="font-semibold mb-2 text-slate-300">Exemplu Antrenament CU Date de Prezență:</h3>
                        <pre className="bg-slate-900 p-2 rounded max-h-48 overflow-auto">
                            <code>
                                {stats.exempluCuDate ? JSON.stringify(stats.exempluCuDate, null, 2) : "Niciunul găsit."}
                            </code>
                        </pre>
                    </div>
                     <div>
                        <h3 className="font-semibold mb-2 text-slate-300">Exemplu Antrenament FĂRĂ Date de Prezență:</h3>
                        <pre className="bg-slate-900 p-2 rounded max-h-48 overflow-auto">
                            <code>
                                {stats.exempluFaraDate ? JSON.stringify(stats.exempluFaraDate, null, 2) : "Toate au prezențe."}
                            </code>
                        </pre>
                    </div>
                </div>
            </Card>

            <Card>
                <h2 className="text-xl font-bold text-white mb-4">Date Brute Antrenamente (JSON)</h2>
                <pre className="bg-slate-900 p-4 rounded max-h-96 overflow-auto text-xs font-mono">
                    <code>
                        {JSON.stringify(antrenamente, null, 2)}
                    </code>
                </pre>
            </Card>
        </div>
    );
};
