import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Grad } from '../types';
import { Button, Card, Input, Modal } from './ui';
import { ArrowLeftIcon, EditIcon, SaveIcon } from './icons';
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

const EditPriceModal: React.FC<{
    priceData: DisplayPriceData | null;
    onClose: () => void;
    onSave: (oldPrice: RawGradePrice, newSuma: number) => Promise<void>;
}> = ({ priceData, onClose, onSave }) => {
    const [newSuma, setNewSuma] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (priceData) {
            setNewSuma(String(priceData.suma));
        }
    }, [priceData]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!priceData) return;
        const sumaNum = parseFloat(newSuma);
        if (isNaN(sumaNum) || sumaNum <= 0) {
            alert('Suma trebuie să fie un număr pozitiv.');
            return;
        }

        setLoading(true);
        await onSave(priceData, sumaNum);
        setLoading(false);
    };

    if (!priceData) return null;

    return (
        <Modal isOpen={true} onClose={onClose} title={`Editează Preț - ${priceData.gradNume}`}>
            <form onSubmit={handleSave} className="space-y-4" style={{fontSize: '13px'}}>
                <p className="text-sm text-slate-400">
                    Modificarea prețului va dezactiva intrarea curentă și va crea una nouă cu valoarea actualizată, păstrând istoricul.
                </p>
                <Input
                    label={`Preț nou pentru ${priceData.gradNume} (RON)`}
                    type="number"
                    step="1"
                    value={newSuma}
                    onChange={(e) => setNewSuma(e.target.value)}
                    required
                />
                <div className="flex justify-end pt-4 space-x-2 border-t border-slate-700">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button type="submit" variant="success" isLoading={loading}><SaveIcon className="w-4 h-4 mr-2" /> Salvează</Button>
                </div>
            </form>
        </Modal>
    );
};


export const ConfigurarePreturi: React.FC<ConfigurarePreturiProps> = ({ grade, onBack }) => {
    const [prices, setPrices] = useState<RawGradePrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingPrice, setEditingPrice] = useState<DisplayPriceData | null>(null);
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

        const gradesToPrice = grade.filter(g => g.ordine >= 2 && g.ordine <= 18);
        if (gradesToPrice.length === 0) {
            showError('Date Lipsă', 'Nu s-au găsit grade eligibile (ordine între 2 și 18) pentru inițializare.');
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

    const handleSave = async (oldPrice: RawGradePrice, newSuma: number) => {
        if (!supabase) return;

        // Pas 1: Dezactivează prețul vechi
        const { error: updateError } = await supabase.from('grade_preturi_config').update({ is_activ: false }).eq('id', oldPrice.id);
        if (updateError) {
            showError("Eroare la dezactivarea prețului vechi", updateError);
            return;
        }

        // Pas 2: Inserează prețul nou
        const newPriceRecord = {
            grad_id: oldPrice.grad_id,
            suma: newSuma,
            data_activare: new Date().toISOString().split('T')[0],
            is_activ: true
        };
        const { error: insertError } = await supabase.from('grade_preturi_config').insert(newPriceRecord);
        
        if (insertError) {
            showError("Eroare critică la salvare", "Prețul nou nu a putut fi salvat. Se încearcă reactivarea prețului vechi...");
            // Rollback attempt
            await supabase.from('grade_preturi_config').update({ is_activ: true }).eq('id', oldPrice.id);
            return;
        }

        showSuccess("Succes", "Prețul a fost actualizat.");
        setEditingPrice(null);
        await fetchPrices(); // Reîmprospătează datele
    };
    
    const activePrices = useMemo((): DisplayPriceData[] => {
        const activeMap = new Map<string, RawGradePrice>();
        // Găsește cel mai recent preț activ pentru fiecare grad
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

    if (loading) {
        return <div className="text-center p-8">Se încarcă configurația de prețuri...</div>;
    }

    if (error) {
        return <div className="text-center p-8 text-red-400">EROARE: {error}</div>;
    }

    if (prices.length === 0) {
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
                            {activePrices.map(price => (
                                <tr key={price.id}>
                                    <td className="p-3 font-semibold">{price.gradNume}</td>
                                    <td className="p-3 text-center font-bold text-brand-secondary">{price.suma.toFixed(2)}</td>
                                    <td className="p-3 text-center text-slate-400">{new Date(price.data_activare).toLocaleDateString('ro-RO')}</td>
                                    <td className="p-3 text-right">
                                        <Button size="sm" variant="secondary" onClick={() => setEditingPrice(price)}>
                                            <EditIcon className="w-4 h-4 mr-1"/> Editare
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <EditPriceModal
                priceData={editingPrice}
                onClose={() => setEditingPrice(null)}
                onSave={handleSave}
            />
        </div>
    );
};