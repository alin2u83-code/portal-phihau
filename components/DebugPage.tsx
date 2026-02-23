import React from 'react';
import { useDataProvider } from '../hooks/useDataProvider';
import { Card } from './ui';

const DataRow: React.FC<{ label: string; value: React.ReactNode; isError?: boolean }> = ({ label, value, isError }) => (
    <div className={`flex justify-between items-center p-3 border-b border-slate-700 ${isError ? 'bg-red-900/30' : ''}`}>
        <span className="text-slate-300 font-medium">{label}</span>
        <span className={`font-mono text-lg font-bold ${isError ? 'text-red-400' : 'text-white'}`}>
            {value}
        </span>
    </div>
);

export const DebugPage: React.FC = () => {
    const {
        activeRoleContext,
        sportivi,
        plati,
        antrenamente
    } = useDataProvider();

    const activeRole = activeRoleContext?.roluri?.nume || 'N/A';

    const renderCount = (data: any[] | null | undefined) => {
        if (data === undefined || data === null) {
            return <span className="text-red-400">Eroare RLS: Acces Refuzat</span>;
        }
        return data.length;
    };

    return (
        <div className="p-4 bg-slate-900 min-h-screen text-white">
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-center text-amber-400">Debug Info</h1>
                <p className="text-center text-slate-400">Starea curentă a datelor aplicației.</p>
            </header>
            <Card className="bg-slate-800 border-slate-700">
                <DataRow label="Rol Activ Curent" value={activeRole} />
                <DataRow label="# Sportivi Încărcați" value={renderCount(sportivi)} isError={sportivi == null} />
                <DataRow label="# Plăți Încărcate" value={renderCount(plati)} isError={plati == null} />
                <DataRow label="# Antrenamente Încărcate" value={renderCount(antrenamente)} isError={antrenamente == null} />
            </Card>
        </div>
    );
};
