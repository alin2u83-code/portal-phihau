import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { ArrowLeftIcon } from './icons';
import { Button } from './ui';
import { Grad } from '../types';

// Simple interface for the raw data
interface RawGradePrice {
    id: string;
    grad_id: string;
    suma: number;
    data_activare: string;
    is_activ: boolean;
}

// Update props to accept grades
interface ConfigurarePreturiTestProps {
    grade: Grad[];
    onBack: () => void;
}

export const ConfigurarePreturi: React.FC<ConfigurarePreturiTestProps> = ({ grade, onBack }) => {
    const [data, setData] = useState<RawGradePrice[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [isInitializing, setIsInitializing] = useState(false);

    const fetchData = useCallback(async () => {
        if (!supabase) {
            setError(new Error("Clientul Supabase nu a putut fi stabilit."));
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const { data: fetchedData, error: fetchError } = await supabase
            .from('grade_preturi_config')
            .select('*');

        if (fetchError) {
            setError(fetchError);
        } else {
            setData(fetchedData || []);
        }

        setLoading(false);
    }, []);

    useEffect(() => {
        // As requested by user
        console.log('Tabelul `grade` primit ca prop:', grade);
        fetchData();
    }, [grade, fetchData]);
    
    const handleInitializePrices = async () => {
        if (!supabase) {
            alert("Client Supabase neconfigurat.");
            return;
        }

        setIsInitializing(true);
        
        const gradesToPrice = grade.filter(g => g.ordine >= 2 && g.ordine <= 18);

        if (gradesToPrice.length === 0) {
            alert('Nu s-au găsit grade eligibile (ordine între 2 și 18) pentru inițializare.');
            setIsInitializing(false);
            return;
        }

        const newPricesToInsert = gradesToPrice.map(g => ({
            grad_id: g.id,
            suma: 100,
            data_activare: new Date().toISOString(),
            is_activ: true
        }));
        
        // The user specified 'grade_preturi' but context implies 'grade_preturi_config'
        const { error: insertError } = await supabase
            .from('grade_preturi_config')
            .insert(newPricesToInsert);

        if (insertError) {
            alert(`EROARE LA INSERARE: ${insertError.message}`);
        } else {
            // Refresh data
            await fetchData();
        }

        setIsInitializing(false);
    };

    if (loading) {
        return <div>Se încarcă datele de test...</div>;
    }

    if (error) {
        return <h1>EROARE: {error.message}</h1>;
    }

    if (data.length === 0) {
        return (
            <div className="text-center p-8">
                <h1 className="text-2xl font-bold mb-4 text-white">TABELUL DE PREȚURI PENTRU GRADE ESTE GOL</h1>
                <p className="text-slate-400 mb-8">Nicio configurație de preț pentru examene nu a fost găsită.</p>
                <Button 
                    onClick={handleInitializePrices}
                    isLoading={isInitializing}
                    variant="success"
                    className="px-8 py-4 text-lg"
                >
                    Inițializează Prețuri Standard (100 RON)
                </Button>
            </div>
        );
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