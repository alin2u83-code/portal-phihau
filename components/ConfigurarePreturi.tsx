import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ArrowLeftIcon } from './icons';
import { Button } from './ui';

// Simple interface for the raw data
interface RawGradePrice {
    id: string;
    grad_id: string;
    suma: number;
    data_activare: string;
    is_activ: boolean;
}

// Keep the props simple, only need onBack for navigation
interface ConfigurarePreturiTestProps {
    onBack: () => void;
}

export const ConfigurarePreturi: React.FC<ConfigurarePreturiTestProps> = ({ onBack }) => {
    const [data, setData] = useState<RawGradePrice[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!supabase) {
                setError(new Error("Clientul Supabase nu a putut fi stabilit."));
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            // Simple select as requested
            const { data: fetchedData, error: fetchError } = await supabase
                .from('grade_preturi_config') // Assuming the user meant grade_preturi_config
                .select('*');

            if (fetchError) {
                setError(fetchError);
            } else {
                setData(fetchedData || []);
            }

            setLoading(false);
        };

        fetchData();
    }, []);

    if (loading) {
        return <div>Se încarcă datele de test...</div>;
    }

    if (error) {
        return <h1>EROARE: {error.message}</h1>;
    }

    if (data.length === 0) {
        return <h1>TABELUL ESTE GOL</h1>;
    }

    // If data exists, render a simple table to show it
    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6">
                <ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu
            </Button>
            <h1 className="text-3xl font-bold text-white mb-4">Versiune de Test - ConfigurarePreturi.tsx</h1>
            <p className="text-slate-400 mb-6">Acesta este un test de citire direct din tabelul `grade_preturi_config`.</p>
            
            <div className="bg-slate-800 rounded-lg shadow-lg overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-700">
                        <tr>
                            <th className="p-4 font-semibold">ID</th>
                            <th className="p-4 font-semibold">Grad ID (UUID)</th>
                            <th className="p-4 font-semibold">Sumă</th>
                            <th className="p-4 font-semibold">Data Activare</th>
                            <th className="p-4 font-semibold">Este Activ?</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {data.map(item => (
                            <tr key={item.id}>
                                <td className="p-4 text-xs font-mono">{item.id}</td>
                                <td className="p-4 text-xs font-mono">{item.grad_id}</td>
                                <td className="p-4 font-bold text-brand-secondary">{item.suma.toFixed(2)} RON</td>
                                <td className="p-4">{new Date(item.data_activare).toLocaleDateString('ro-RO')}</td>
                                <td className="p-4">{item.is_activ ? 'DA' : 'NU'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};