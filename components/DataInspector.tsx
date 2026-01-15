import React, { useMemo } from 'react';
import { Antrenament } from '../types';
import { Card, Button } from './ui';
import { ArrowLeftIcon } from './icons';

interface DataInspectorProps {
    antrenamente: Antrenament[];
    rawPrezente: any[];
    onBack: () => void;
}

const StatCard: React.FC<{ label: string; value: string | number; colorClass: string }> = ({ label, value, colorClass }) => (
    <div className="bg-slate-700 p-4 rounded-lg text-center">
        <div className={`text-4xl font-bold ${colorClass}`}>{value}</div>
        <div className="text-sm text-slate-400 mt-1">{label}</div>
    </div>
);

export const DataInspector: React.FC<DataInspectorProps> = ({ antrenamente, rawPrezente, onBack }) => {

    const stats = useMemo(() => {
        const totalAntrenamente = antrenamente.length;
        const totalPrezenteRecords = rawPrezente.length;
        const cuPrezentiProcesati = antrenamente.filter(a => a.sportivi_prezenti_ids?.length > 0).length;
        const exempluCuDate = antrenamente.find(a => a.sportivi_prezenti_ids?.length > 0) || null;
        const exempluFaraDate = antrenamente.find(a => !a.sportivi_prezenti_ids || a.sportivi_prezenti_ids.length === 0) || null;

        return { totalAntrenamente, totalPrezenteRecords, cuPrezentiProcesati, exempluCuDate, exempluFaraDate };
    }, [antrenamente, rawPrezente]);

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
                    <StatCard label="Total Antrenamente Încărcate" value={stats.totalAntrenamente} colorClass="text-white" />
                    <StatCard label="Total Înregistrări Prezență Primite" value={stats.totalPrezenteRecords} colorClass="text-purple-400" />
                    <StatCard label="Antrenamente cu Prezenți Procesate" value={stats.cuPrezentiProcesati} colorClass="text-green-400" />
                </div>
                 <div className="mt-4 text-sm text-slate-300">
                    <ul className="space-y-1">
                        <li>• <strong>Total Antrenamente:</strong> Numărul de înregistrări din `program_antrenamente`.</li>
                        <li>• <strong className="text-purple-300">Total Înregistrări Prezență Primite:</strong> Numărul de rânduri primite direct din tabelul `prezenta_antrenament`. <strong>Dacă acest număr este 0, problema este 100% politica de Row Level Security (RLS) a acestui tabel, care blochează vizibilitatea datelor.</strong></li>
                        <li>• <strong>Cu Prezenți Procesate:</strong> Numărul de antrenamente unde `sportivi_prezenti_ids` are cel puțin un ID după procesarea datelor.</li>
                    </ul>
                </div>
            </Card>

            <Card>
                <h2 className="text-xl font-bold text-white mb-4">Date Brute 'prezenta_antrenament' (JSON)</h2>
                <p className="text-sm text-slate-400 mb-2">Acesta este conținutul exact al tabelului `prezenta_antrenament` așa cum este primit de la baza de date. Dacă acest tabel este gol, înseamnă că politica de Row Level Security (RLS) a tabelului `prezenta_antrenament` blochează accesul la date pentru utilizatorul curent.</p>
                <pre className="bg-slate-900 p-4 rounded max-h-96 overflow-auto text-xs font-mono">
                    <code>
                        {JSON.stringify(rawPrezente, null, 2)}
                    </code>
                </pre>
            </Card>

            <Card>
                <h2 className="text-xl font-bold text-white mb-4">Date Brute Antrenamente (JSON Final, după procesare)</h2>
                <pre className="bg-slate-900 p-4 rounded max-h-96 overflow-auto text-xs font-mono">
                    <code>
                        {JSON.stringify(antrenamente, null, 2)}
                    </code>
                </pre>
            </Card>
        </div>
    );
};