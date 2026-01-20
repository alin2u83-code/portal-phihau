import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { User, Sportiv, Plata } from '../types';
import { Button, Card, Input } from './ui';
import { ArrowLeftIcon, CogIcon, BanknotesIcon } from './icons';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface TaxaAnualaConfig {
    id: string;
    nume: string;
    suma: number;
    data_inceput: string;
    data_sfarsit: string;
    is_activ: boolean;
    created_at: string;
}

interface TaxeAnualeProps {
    onBack: () => void;
    currentUser: User;
    sportivi: Sportiv[];
    plati: Plata[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
}

const TaxaCard: React.FC<{
    taxa: TaxaAnualaConfig;
    onUpdate: (id: string, updates: Partial<Omit<TaxaAnualaConfig, 'id' | 'created_at'>>) => void;
    onGenerate: (taxa: TaxaAnualaConfig) => void;
    isAdmin: boolean;
}> = ({ taxa, onUpdate, onGenerate, isAdmin }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editState, setEditState] = useState(taxa);
    const { showError } = useError();

    const descrierePerioada = useMemo(() => {
        const anInceput = new Date(taxa.data_inceput).getFullYear();
        const anSfarsit = new Date(taxa.data_sfarsit).getFullYear();
        return anInceput === anSfarsit ? `Anul ${anInceput}` : `Sezonul ${anInceput}-${anSfarsit}`;
    }, [taxa.data_inceput, taxa.data_sfarsit]);

    const handleSave = () => {
        if (editState.suma <= 0) {
            showError("Valoare Invalidă", "Suma trebuie să fie un număr pozitiv.");
            return;
        }
        onUpdate(taxa.id, editState);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditState(taxa);
        setIsEditing(false);
    };

    return (
        <Card className="flex flex-col">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-bold text-white">{taxa.nume}</h3>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-600 text-slate-200 mt-1 inline-block">
                        {descrierePerioada}
                    </span>
                </div>
                {!isEditing ? (
                    <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                        <CogIcon className="w-4 h-4 mr-2" /> Configurează
                    </Button>
                ) : (
                    <div className="flex gap-2">
                         <Button variant="secondary" size="sm" onClick={handleCancel}>Anulează</Button>
                         <Button variant="success" size="sm" onClick={handleSave}>Salvează</Button>
                    </div>
                )}
            </div>
            <div className="mt-4 space-y-3 flex-grow">
                <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Sumă</label>
                    {isEditing ? (
                        <Input type="number" value={editState.suma} onChange={e => setEditState({...editState, suma: parseFloat(e.target.value) || 0})} />
                    ) : (
                        <p className="text-2xl font-bold text-brand-secondary">{taxa.suma.toFixed(2)} RON</p>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">Valabil de la</label>
                        {isEditing ? (
                            <Input type="date" value={editState.data_inceput || ''} onChange={e => setEditState({...editState, data_inceput: e.target.value})} />
                        ) : (
                            <p className="font-semibold">{taxa.data_inceput ? new Date(taxa.data_inceput + 'T00:00:00').toLocaleDateString('ro-RO') : 'N/A'}</p>
                        )}
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">Până la</label>
                        {isEditing ? (
                            <Input type="date" value={editState.data_sfarsit || ''} onChange={e => setEditState({...editState, data_sfarsit: e.target.value})} />
                        ) : (
                            <p className="font-semibold">{taxa.data_sfarsit ? new Date(taxa.data_sfarsit + 'T00:00:00').toLocaleDateString('ro-RO') : 'N/A'}</p>
                        )}
                    </div>
                </div>
            </div>
            {isAdmin && (
                <div className="mt-6 pt-4 border-t border-slate-700">
                    <Button variant="info" className="w-full" onClick={() => onGenerate(taxa)}>Generează Facturi Sportivi</Button>
                </div>
            )}
        </Card>
    );
};

export const TaxeAnuale: React.FC<TaxeAnualeProps> = ({ onBack, currentUser, sportivi, plati, setPlati }) => {
    const [taxe, setTaxe] = useState<TaxaAnualaConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [taxaToGenerate, setTaxaToGenerate] = useState<TaxaAnualaConfig | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const { showError, showSuccess } = useError();

    const isAdmin = useMemo(() => currentUser.roluri.some(r => r.nume === 'Admin'), [currentUser.roluri]);

    const fetchTaxe = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);
        const { data, error } = await supabase.from('taxe_anuale_config').select('*').eq('is_activ', true);
        if (error) {
            showError("Eroare la încărcare", error);
        } else {
            setTaxe(data || []);
        }
        setLoading(false);
    }, [showError]);

    useEffect(() => {
        fetchTaxe();
    }, [fetchTaxe]);

    const handleUpdate = async (id: string, updates: Partial<Omit<TaxaAnualaConfig, 'id' | 'created_at'>>) => {
        if(!supabase) return;
        const { data, error } = await supabase.from('taxe_anuale_config').update(updates).eq('id', id).select().single();
        if(error) {
            showError("Eroare la salvare", error);
        } else if(data) {
            setTaxe(prev => prev.map(t => t.id === id ? data : t));
            showSuccess("Succes", "Configurarea a fost salvată.");
        }
    };

    const confirmGenerateInvoices = async () => {
        if (!taxaToGenerate || !supabase) return;

        setIsGenerating(true);
        const sportiviActivi = sportivi.filter(s => s.status === 'Activ');
        
        const anInceput = new Date(taxaToGenerate.data_inceput).getFullYear();
        const anSfarsit = new Date(taxaToGenerate.data_sfarsit).getFullYear();
        const perioada = anInceput === anSfarsit ? `Anul ${anInceput}` : `Sezonul ${anInceput}-${anSfarsit}`;
        const descriereFactura = `${taxaToGenerate.nume} ${perioada}`;

        const existingPlatiDesc = new Set(
            plati.filter(p => p.descriere === descriereFactura).map(p => p.sportiv_id)
        );
        const sportiviDeFacturat = sportiviActivi.filter(s => !existingPlatiDesc.has(s.id));

        if (sportiviDeFacturat.length === 0) {
            showSuccess("Info", "Toți sportivii activi au deja o factură generată pentru această taxă.");
            setIsGenerating(false);
            setTaxaToGenerate(null);
            return;
        }

        const newPlati: Omit<Plata, 'id'>[] = sportiviDeFacturat.map(s => ({
            sportiv_id: s.id,
            familie_id: s.familie_id,
            suma: taxaToGenerate.suma,
            data: new Date().toISOString().split('T')[0],
            status: 'Neachitat',
            descriere: descriereFactura,
            tip: 'Taxa Anuala',
            observatii: 'Generat automat'
        }));

        const { data, error } = await supabase.from('plati').insert(newPlati).select();
        
        setIsGenerating(false);
        setTaxaToGenerate(null);

        if (error) {
            let detailedMessage = error.message;
            if (error.message.includes('plati_tip_check')) {
                detailedMessage = `Tipul de plată 'Taxa Anuala' nu este permis de baza de date. Vă rugăm să rulați cel mai recent script 'rls_policies.sql' în editorul SQL Supabase pentru a actualiza constrângerile. (${error.message})`;
            }
            showError("Eroare la generarea facturilor", detailedMessage);
        } else if (data) {
            setPlati(prev => [...prev, ...data]);
            const skippedCount = sportiviActivi.length - sportiviDeFacturat.length;
            let successMessage = `${data.length} facturi noi au fost generate.`;
            if (skippedCount > 0) {
                successMessage += ` ${skippedCount} sportivi au fost omiși deoarece aveau deja o factură.`
            }
            showSuccess("Operațiune finalizată", successMessage);
        }
    };

    if (loading) {
        return <div className="text-center p-8">Se încarcă...</div>;
    }

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            <h1 className="text-3xl font-bold text-white">Configurare Taxe Anuale</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {taxe.length > 0 ? (
                    taxe.map(taxa => (
                        <TaxaCard
                            key={taxa.id}
                            taxa={taxa}
                            onUpdate={handleUpdate}
                            onGenerate={setTaxaToGenerate}
                            isAdmin={isAdmin}
                        />
                    ))
                ) : (
                    <Card className="md:col-span-2 text-center">
                        <p className="text-slate-400">Nicio taxă anuală activă configurată. Vă rugăm adăugați-le în baza de date (tabel: `taxe_anuale_config`).</p>
                        <p className="text-xs text-slate-500 mt-2">Exemplu: (nume: 'Taxa FRQKD', suma: 170, data_inceput: '2024-09-01', data_sfarsit: '2025-08-31')</p>
                    </Card>
                )}
            </div>

            <ConfirmDeleteModal
                isOpen={!!taxaToGenerate}
                onClose={() => setTaxaToGenerate(null)}
                onConfirm={confirmGenerateInvoices}
                title="Confirmare Generare Facturi"
                tableName=""
                isLoading={isGenerating}
                customMessage={`Sigur dorești să generezi facturi pentru "${taxaToGenerate?.nume}" pentru TOȚI sportivii activi care nu au deja această factură?`}
                confirmButtonText="Da, generează"
                confirmButtonVariant="success"
                icon={BanknotesIcon}
            />
        </div>
    );
};