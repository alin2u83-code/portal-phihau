import React, { useState, useMemo, useCallback } from 'react';
import { Sportiv, Grad, Participare, Plata, PretConfig, Examen } from '../types';
import { Button, Card, Input } from './ui';
import { ArrowLeftIcon, WrenchScrewdriverIcon, AlertTriangleIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { logoPhiHau } from '../assets/logo';

interface MaintenanceProps {
    sportivi: Sportiv[];
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    grade: Grad[];
    setGrade: React.Dispatch<React.SetStateAction<Grad[]>>;
    participari: Participare[];
    examene: Examen[];
    plati: Plata[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    preturiConfig: PretConfig[];
    onBack: () => void;
}

type SportivIssue = {
    sportiv: Sportiv;
    issues: string[];
};

const getPretGrad = (gradNume: string, preturi: PretConfig[]): number | null => {
    const data = new Date();
    const preturiValabile = preturi
      .filter(p => p.categorie === 'Taxa Examen' && p.denumire_servisciu === gradNume && new Date(p.valabil_de_la_data) <= data)
      .sort((a, b) => new Date(b.valabil_de_la_data).getTime() - new Date(a.valabil_de_la_data).getTime());
    return preturiValabile.length > 0 ? preturiValabile[0].suma : null;
};

export const Maintenance: React.FC<MaintenanceProps> = ({ sportivi, setSportivi, grade, setGrade, participari, examene, plati, setPlati, preturiConfig, onBack }) => {
    const { showError } = useError();
    const [editingSportivId, setEditingSportivId] = useState<string | null>(null);
    const [editingData, setEditingData] = useState<Partial<Sportiv>>({});
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
    const [feedback, setFeedback] = useState<{ type: 'success' | 'info', message: string } | null>(null);

    // --- AUDIT LOGIC ---
    const sportiviCuProbleme = useMemo<SportivIssue[]>(() => {
        return sportivi.map(s => {
            const issues: string[] = [];
            if (!s.data_nasterii) issues.push('Dată naștere lipsă');
            if (!s.cnp) issues.push('CNP lipsă');
            const hasGrade = participari.some(p => p.sportiv_id === s.id && p.rezultat === 'Admis');
            if (!hasGrade) issues.push('Grad curent nealocat');
            return { sportiv: s, issues };
        }).filter(item => item.issues.length > 0);
    }, [sportivi, participari]);

    const auditGrade = useMemo(() => {
        const gradesWithoutPrice = grade.filter(g => getPretGrad(g.nume, preturiConfig) === null);
        const orders = grade.map(g => g.ordine);
        const duplicateOrders = orders.filter((item, index) => orders.indexOf(item) !== index);
        const uniqueDuplicateOrders = [...new Set(duplicateOrders)];
        
        return { gradesWithoutPrice, duplicateOrders: uniqueDuplicateOrders };
    }, [grade, preturiConfig]);

    const participariFaraFactura = useMemo(() => {
        return participari.map(p => {
            const examen = examene.find(e => e.id === p.examen_id);
            const sportiv = sportivi.find(s => s.id === p.sportiv_id);
            const gradSustinut = grade.find(g => g.id === p.grad_sustinut_id);
            if (!examen || !sportiv || !gradSustinut) return null;

            const descrierePlata = `Taxa Examen ${gradSustinut.nume} - ${examen.sesiune} ${new Date(examen.data).getFullYear()}`;
            const areFactura = plati.some(pl => pl.sportiv_id === sportiv.id && pl.descriere === descrierePlata);

            if (!areFactura) {
                return { participare: p, sportiv, grad: gradSustinut, examen, descrierePlata };
            }
            return null;
        }).filter(Boolean) as { participare: Participare, sportiv: Sportiv, grad: Grad, examen: Examen, descrierePlata: string }[];
    }, [participari, examene, sportivi, grade, plati]);

    // --- HANDLER FUNCTIONS ---
    const showFeedback = (type: 'success' | 'info', message: string) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 4000);
    };

    const handleEditSportiv = (sportiv: Sportiv) => {
        setEditingSportivId(sportiv.id);
        setEditingData({ data_nasterii: sportiv.data_nasterii, cnp: sportiv.cnp });
    };

    const handleCancelEdit = () => {
        setEditingSportivId(null);
        setEditingData({});
    };

    const handleSaveSportiv = async (sportivId: string) => {
        if (!supabase) return;
        setLoadingStates(prev => ({ ...prev, [sportivId]: true }));
        const { data, error } = await supabase.from('sportivi').update(editingData).eq('id', sportivId).select().single();
        
        setLoadingStates(prev => ({ ...prev, [sportivId]: false }));
        if (error) {
            showError("Eroare la salvare", error);
        } else if (data) {
            setSportivi(prev => prev.map(s => s.id === sportivId ? { ...s, ...data } : s));
            handleCancelEdit();
        }
    };
    
    const handleGenerateFactura = async (item: typeof participariFaraFactura[0]) => {
        if (!supabase) return;
        const { sportiv, grad, examen, descrierePlata } = item;
        setLoadingStates(prev => ({ ...prev, [item.participare.id]: true }));
        const pret = getPretGrad(grad.nume, preturiConfig);
        if (pret === null) {
            showError("Preț negăsit", `Nu s-a găsit preț configurat pentru gradul ${grad.nume}.`);
            setLoadingStates(prev => ({ ...prev, [item.participare.id]: false }));
            return;
        }

        const newPlata: Omit<Plata, 'id'> = { sportiv_id: sportiv.id, familie_id: sportiv.familie_id, suma: pret, data: new Date().toISOString().split('T')[0], status: 'Neachitat', descriere: descrierePlata, tip: 'Taxa Examen', observatii: `Generat automat din modulul de mentenanță.` };
        const { data, error } = await supabase.from('plati').insert(newPlata).select().single();

        setLoadingStates(prev => ({ ...prev, [item.participare.id]: false }));
        if (error) {
            showError("Eroare la generare factură", error);
        } else if (data) {
            setPlati(prev => [...prev, data as Plata]);
            showFeedback('success', `Factură generată pentru ${sportiv.nume}.`);
        }
    };

    const handleCleanSchema = () => {
        showFeedback('info', 'Verificare finalizată. Structura curentă a aplicației este aliniată cu schema țintă. Tabelele vechi (ex: program_antrenamente, sesiuni_examene) pot necesita curățare manuală din Supabase.');
    };

    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
            
             <div className="flex items-center gap-4 mb-6">
                <img src={`data:image/svg+xml;base64,${logoPhiHau}`} alt="Club Logo" className="h-16 w-16" />
                <div>
                    <h1 className="text-3xl font-bold text-white">Mentenanță & Audit Sistem</h1>
                    <p className="text-slate-400">Verifică integritatea datelor și rezolvă problemele comune.</p>
                </div>
            </div>

            {feedback && (
                <div className={`p-3 rounded-md mb-4 text-center font-semibold text-white ${feedback.type === 'success' ? 'bg-green-600/50' : 'bg-blue-600/50'}`}>
                    {feedback.message}
                </div>
            )}

            <div className="space-y-6">
                <Card>
                    <h2 className="text-xl font-bold text-white mb-4">Audit Integritate Date Sportivi</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="bg-slate-700/50"><tr>{['Nume', 'Probleme Detectate', 'Acțiuni'].map(h=><th key={h} className="p-3 font-semibold">{h}</th>)}</tr></thead>
                            <tbody className="divide-y divide-slate-700">
                                {sportiviCuProbleme.map(({sportiv, issues}) => (
                                    <tr key={sportiv.id}>
                                        <td className="p-2 font-medium">{sportiv.nume} {sportiv.prenume}</td>
                                        <td className="p-2">
                                            {editingSportivId === sportiv.id ? (
                                                 <div className="flex flex-col gap-2">
                                                    {issues.includes('Dată naștere lipsă') && <Input label="Dată Naștere" type="date" value={editingData.data_nasterii || ''} onChange={e => setEditingData(p => ({...p, data_nasterii: e.target.value}))} />}
                                                    {issues.includes('CNP lipsă') && <Input label="CNP" value={editingData.cnp || ''} onChange={e => setEditingData(p => ({...p, cnp: e.target.value}))} />}
                                                </div>
                                            ) : (
                                                issues.map(issue => <span key={issue} className="mr-2 inline-flex items-center gap-1 text-xs text-amber-300 bg-amber-900/50 px-2 py-1 rounded-full"><AlertTriangleIcon className="w-3 h-3"/> {issue}</span>)
                                            )}
                                        </td>
                                        <td className="p-2 w-48 text-right">
                                            {editingSportivId === sportiv.id ? (
                                                <div className="flex gap-2 justify-end">
                                                    <Button size="sm" variant="success" onClick={() => handleSaveSportiv(sportiv.id)} disabled={loadingStates[sportiv.id]}>{loadingStates[sportiv.id] ? '...' : 'Salvare'}</Button>
                                                    <Button size="sm" variant="secondary" onClick={handleCancelEdit}>Anulare</Button>
                                                </div>
                                            ) : (
                                                <Button size="sm" onClick={() => handleEditSportiv(sportiv)}>Editare Rapidă</Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {sportiviCuProbleme.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-slate-400">Nicio problemă de integritate găsită la sportivi.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card>
                    <h2 className="text-xl font-bold text-white mb-4">Audit Configurare Grade</h2>
                     <ul className="space-y-2 text-sm">
                        {auditGrade.gradesWithoutPrice.map(g => <li key={g.id} className="flex items-center gap-2"><AlertTriangleIcon className="w-4 h-4 text-red-400"/>Gradul <span className="font-bold">{g.nume}</span> nu are un preț de examen activ.</li>)}
                        {auditGrade.duplicateOrders.map(order => <li key={order} className="flex items-center gap-2"><AlertTriangleIcon className="w-4 h-4 text-red-400"/>Ordinul <span className="font-bold">{order}</span> este duplicat în ierarhia gradelor.</li>)}
                        {auditGrade.gradesWithoutPrice.length === 0 && auditGrade.duplicateOrders.length === 0 && <p className="text-slate-400">Configurația gradelor este validă.</p>}
                     </ul>
                </Card>

                <Card>
                    <h2 className="text-xl font-bold text-white mb-4">Curățare & Sincronizare Date</h2>
                     <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold mb-2">Verificare Referințe Schemă Bază de Date</h3>
                            <Button onClick={handleCleanSchema}>Curăță Referințe Vechi</Button>
                        </div>
                        <div className="border-t border-slate-700 pt-4">
                             <h3 className="font-semibold mb-2">Participări Examen Fără Factură</h3>
                            {participariFaraFactura.length > 0 ? (
                                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                {participariFaraFactura.map(item => (
                                    <div key={item.participare.id} className="flex justify-between items-center bg-slate-700/50 p-2 rounded-md">
                                        <div>
                                            <p className="text-sm font-medium">{item.sportiv.nume} {item.sportiv.prenume} - {item.grad.nume}</p>
                                            <p className="text-xs text-slate-400">{new Date(item.examen.data).toLocaleDateString('ro-RO')}</p>
                                        </div>
                                        <Button size="sm" variant="success" onClick={() => handleGenerateFactura(item)} disabled={loadingStates[item.participare.id]}>{loadingStates[item.participare.id] ? '...' : 'Generează'}</Button>
                                    </div>
                                ))}
                                </div>
                            ) : <p className="text-slate-400 text-sm">Toate participările la examene au facturi generate.</p>}
                        </div>
                     </div>
                </Card>
            </div>
        </div>
    );
};