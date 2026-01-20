import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Grad } from '../types';
import { Button, Card, Input } from './ui';
import { ArrowLeftIcon, EditIcon, SaveIcon, XIcon } from './icons';
import { useError } from './ErrorProvider';

interface RawGradePrice {
    id: string;
    grad_id: string;
    suma: number;
    data_activare: string;
    is_activ: boolean;
}

interface DisplayPriceData extends RawGradePrice {
    gradNume: string;
    gradOrdine: number;
}

interface ConfigurarePreturiProps {
    grade: Grad[];
    onBack: () => void;
}

export const ConfigurarePreturi: React.FC<ConfigurarePreturiProps> = ({ grade, onBack }) => {
    const [prices, setPrices] = useState<RawGradePrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editSuma, setEditSuma] = useState<string | number>('');

    const { showError, showSuccess } = useError();

    const fetchPrices = useCallback(async () => {
        if (!supabase) {
            setError("Clientul Supabase nu a putut fi stabilit.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase.from('grade_preturi_config').select('*');
        if (fetchError) {
            setError(fetchError.message);
            showError("Eroare la preluarea prețurilor", fetchError);
        } else {
            setPrices(data || []);
        }
        setLoading(false);
    }, [showError]);

    useEffect(() => {
        fetchPrices();
    }, [fetchPrices]);

    const handlePopulateDefaults = async () => {
        if (!supabase) return;
        setLoading(true);

        const gradesToPrice = grade.filter(g => g.ordine >= 1 && g.ordine <= 18);
        if (gradesToPrice.length === 0) {
            showError('Date Lipsă', 'Nu s-au găsit grade eligibile (ordine între 1 și 18) pentru inițializare.');
            setLoading(false);
            return;
        }

        const newPricesToInsert = gradesToPrice.map(g => ({
            grad_id: g.id,
            suma: 100,
            data_activare: new Date().toISOString(),
            is_activ: true
        }));
        
        const { error: insertError } = await supabase.from('grade_preturi_config').insert(newPricesToInsert);

        if (insertError) {
            showError("EROARE LA INSERARE", insertError);
        } else {
            showSuccess("Succes", `${newPricesToInsert.length} prețuri standard au fost adăugate.`);
            await fetchPrices();
        }
        setLoading(false);
    };

    const handleEditClick = (price: DisplayPriceData) => {
        setEditingRowId(price.id);
        setEditSuma(price.suma);
    };

    const handleCancelClick = () => {
        setEditingRowId(null);
        setEditSuma('');
    };

    const handleSaveClick = async (oldPrice: RawGradePrice) => {
        if (!supabase) return;

        const sumaNum = parseFloat(String(editSuma));
        if (isNaN(sumaNum) || sumaNum <= 0) {
            showError('Valoare Invalidă', 'Suma trebuie să fie un număr pozitiv.');
            return;
        }

        setLoading(true);

        // Pas 1: Dezactivează prețul vechi
        const { error: updateError } = await supabase.from('grade_preturi_config').update({ is_activ: false }).eq('id', oldPrice.id);
        if (updateError) {
            showError("Eroare la dezactivarea prețului vechi", updateError);
            setLoading(false);
            return;
        }

        // Pas 2: Inserează prețul nou
        const newPriceRecord = {
            grad_id: oldPrice.grad_id,
            suma: sumaNum,
            data_activare: new Date().toISOString().split('T')[0],
            is_activ: true
        };
        const { error: insertError } = await supabase.from('grade_preturi_config').insert(newPriceRecord);
        
        if (insertError) {
            showError("Eroare critică la salvare", "Prețul nou nu a putut fi salvat. Se încearcă reactivarea prețului vechi...");
            await supabase.from('grade_preturi_config').update({ is_activ: true }).eq('id', oldPrice.id);
            setLoading(false);
            return;
        }

        showSuccess("Succes", "Prețul a fost actualizat.");
        setEditingRowId(null);
        await fetchPrices();
    };
    
    const activePrices = useMemo((): DisplayPriceData[] => {
        const activeMap = new Map<string, RawGradePrice>();
        prices
            .filter(p => p.is_activ)
            .sort((a, b) => new Date(b.data_activare).getTime() - new Date(a.data_activare).getTime())
            .forEach(p => {
                if (!activeMap.has(p.grad_id)) {
                    activeMap.set(p.grad_id, p);
                }
            });

        return Array.from(activeMap.values()).map(price => {
            const gradInfo = grade.find(g => g.id === price.grad_id);
            return {
                ...price,
                gradNume: gradInfo?.nume || 'Grad Necunoscut',
                gradOrdine: gradInfo?.ordine || 999
            };
        }).sort((a, b) => a.gradOrdine - b.gradOrdine);
    }, [prices, grade]);

    if (loading && prices.length === 0) {
        return <div className="text-center p-8">Se încarcă configurația de prețuri...</div>;
    }

    if (prices.length === 0 && !error) {
        return (
            <div className="text-center p-8">
                <h1 className="text-2xl font-bold mb-4 text-white">TABELUL DE PREȚURI PENTRU GRADE ESTE GOL</h1>
                <p className="text-slate-400 mb-8">Nicio configurație de preț pentru examene nu a fost găsită.</p>
                <Button onClick={handlePopulateDefaults} isLoading={loading} variant="success" className="px-8 py-3 text-base">
                    Populează tabel cu prețuri default (100 lei)
                </Button>
            </div>
        );
    }
    
    return (
        <div className="space-y-6" style={{fontSize: '13px'}}>
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            <h1 className="text-3xl font-bold text-white">Configurare Prețuri Grade</h1>
            
            {error && (
                <div className="p-3 mb-4 text-center font-semibold text-white bg-red-600/50 border border-red-500 rounded-lg">
                    EROARE: {error}
                </div>
            )}
            
            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-slate-700/50">
                            <tr>
                                <th className="p-3 font-semibold">Grad</th>
                                <th className="p-3 font-semibold text-center">Preț Activ (RON)</th>
                                <th className="p-3 font-semibold text-center">Data Activării</th>
                                <th className="p-3 font-semibold text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {activePrices.map(price => {
                                const isEditing = editingRowId === price.id;
                                const isBlueBelt = price.gradOrdine >= 15 && price.gradOrdine <= 18;
                                return (
                                <tr key={price.id} className={`${isBlueBelt ? 'bg-sky-900/40 hover:bg-sky-900/60' : 'hover:bg-slate-700/20'} ${isEditing ? 'bg-slate-700' : ''}`}>
                                    <td className="p-3 font-semibold">{price.gradNume}</td>
                                    <td className="p-3 text-center">
                                        {isEditing ? (
                                            <Input
                                                label=""
                                                type="number"
                                                step="1"
                                                value={editSuma}
                                                onChange={(e) => setEditSuma(e.target.value)}
                                                className="!py-1 text-center max-w-[120px] mx-auto"
                                                autoFocus
                                            />
                                        ) : (
                                            <span className="font-bold text-brand-secondary">{price.suma.toFixed(2)}</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-center text-slate-400">{new Date(price.data_activare).toLocaleDateString('ro-RO')}</td>
                                    <td className="p-3 text-right">
                                        {isEditing ? (
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" variant="success" onClick={() => handleSaveClick(price)} isLoading={loading}><SaveIcon className="w-4 h-4" /></Button>
                                                <Button size="sm" variant="secondary" onClick={handleCancelClick} disabled={loading}><XIcon className="w-4 h-4" /></Button>
                                            </div>
                                        ) : (
                                            <Button size="sm" variant="secondary" onClick={() => handleEditClick(price)}>
                                                <EditIcon className="w-4 h-4 mr-1"/> Editare
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};