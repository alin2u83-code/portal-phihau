import React, { useState, useMemo, useEffect } from 'react';
import { User, InscriereExamen, SesiuneExamen, Grad, PretConfig, Plata, Locatie } from '../types';
import { Button, Card, Select, Input } from './ui';
import { ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { getPretProdus } from '../utils/pricing';

interface IstoricExameneSportivProps {
    viewedUser: User;
    participari: InscriereExamen[];
    sesiuni: SesiuneExamen[];
    grade: Grad[];
    onBack: () => void;
    isAdmin: boolean;
    preturiConfig: PretConfig[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    setInscrieri: React.Dispatch<React.SetStateAction<InscriereExamen[]>>;
    allInscrieri: InscriereExamen[];
    locatii: Locatie[];
}

// Helper function
const getAgeOnDate = (birthDateStr: string, onDateStr: string): number => {
    if (!birthDateStr || !onDateStr) return 0;
    const onDate = new Date(onDateStr);
    const birthDate = new Date(birthDateStr);
    let age = onDate.getFullYear() - birthDate.getFullYear();
    const m = onDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && onDate.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};


export const IstoricExameneSportiv: React.FC<IstoricExameneSportivProps> = ({ viewedUser, participari, sesiuni, grade, onBack, isAdmin, preturiConfig, setPlati, setInscrieri, allInscrieri, locatii }) => {

    const userParticipari = useMemo(() => {
        return participari
            .map(p => {
                const sesiune = sesiuni.find(s => s.id === p.sesiune_id);
                const grad = grade.find(g => g.id === p.grad_vizat_id);
                return { ...p, data_examen: sesiune?.data || 'N/A', nume_grad: grad?.nume || 'N/A' };
            })
            .sort((a, b) => new Date(b.data_examen).getTime() - new Date(a.data_examen).getTime());
    }, [participari, sesiuni, grade]);

    // --- State for Registration Module ---
    const [sesiuneSelectataId, setSesiuneSelectataId] = useState('');
    const [gradVizatId, setGradVizatId] = useState('');
    const [varstaCalculata, setVarstaCalculata] = useState<number | null>(null);
    const [taxaCalculata, setTaxaCalculata] = useState<number | null>(null);
    const [loadingInscriere, setLoadingInscriere] = useState(false);
    const { showError, showSuccess } = useError();

    const sesiuniViitoare = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return sesiuni
            .filter(s => s.data >= today)
            .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    }, [sesiuni]);
    
    const sortedGrades = useMemo(() => [...grade].sort((a,b) => a.ordine - b.ordine), [grade]);

    // Effect to calculate age and propose grade
    useEffect(() => {
        if (!sesiuneSelectataId) {
             setVarstaCalculata(null); setGradVizatId(''); return;
        }
        const sesiune = sesiuni.find(s => s.id === sesiuneSelectataId);
        if (!sesiune) return;

        const age = getAgeOnDate(viewedUser.data_nasterii, sesiune.data);
        setVarstaCalculata(age);

        let proposedGradId = '';
        const currentGrad = grade.find(g => g.id === viewedUser.grad_actual_id);
        
        if (currentGrad) {
            const nextGrad = sortedGrades.find(g => g.ordine === currentGrad.ordine + 1);
            if (nextGrad) proposedGradId = nextGrad.id;
        } else {
            const beginnerGrades = sortedGrades.filter(g => !g.grad_start_id).sort((a,b) => b.varsta_minima - a.varsta_minima);
            const suitableGrade = beginnerGrades.find(g => age >= g.varsta_minima);
            if (suitableGrade) proposedGradId = suitableGrade.id;
        }
        setGradVizatId(proposedGradId);
    }, [sesiuneSelectataId, viewedUser, grade, sesiuni, sortedGrades]);

    // Effect to calculate fee
    useEffect(() => {
        if (!gradVizatId || !sesiuneSelectataId) { setTaxaCalculata(null); return; }
        const sesiune = sesiuni.find(s => s.id === sesiuneSelectataId);
        const grad = grade.find(g => g.id === gradVizatId);
        if (!grad || !sesiune) return;

        const pretConfig = getPretProdus(preturiConfig, 'Taxa Examen', grad.nume, { dataReferinta: sesiune.data });
        setTaxaCalculata(pretConfig?.suma ?? null);
    }, [gradVizatId, sesiuneSelectataId, grade, preturiConfig, sesiuni]);

    const handleInscriere = async () => {
        if (!sesiuneSelectataId || !gradVizatId || varstaCalculata === null) {
            showError("Date Incomplete", "Vă rugăm selectați sesiunea și gradul.");
            return;
        }
        if (taxaCalculata === null && !window.confirm("Atenție: Nu s-a putut calcula taxa de examen. Doriți să continuați fără a genera o factură?")) {
            return;
        }

        setLoadingInscriere(true);
        try {
            const { data: inscriere, error: iError } = await supabase.from('inscrieri_examene')
                .insert({
                    sportiv_id: viewedUser.id,
                    sesiune_id: sesiuneSelectataId,
                    grad_vizat_id: gradVizatId,
                    grad_actual_id: viewedUser.grad_actual_id || null,
                    varsta_la_examen: varstaCalculata,
                    rezultat: 'Neprezentat'
                }).select('*, sportivi:sportiv_id(*), grade:grad_vizat_id(*)').single();
            if (iError) throw iError;

            if (taxaCalculata !== null) {
                const { error: pError } = await supabase.from('plati').insert({
                    sportiv_id: viewedUser.id,
                    familie_id: viewedUser.familie_id,
                    suma: taxaCalculata,
                    data: sesiuni.find(s => s.id === sesiuneSelectataId)!.data,
                    status: 'Neachitat',
                    descriere: `Taxa examen ${grade.find(g => g.id === gradVizatId)!.nume}`,
                    tip: 'Taxa Examen',
                    observatii: 'Generat automat la înscriere.'
                });
                if (pError) throw pError;
                // Fetch updated payments to reflect in UI
                const { data: updatedPlati } = await supabase.from('plati').select('*');
                if (updatedPlati) setPlati(updatedPlati);
            }
            
            setInscrieri(prev => [...prev, inscriere]);
            showSuccess("Succes!", `${viewedUser.nume} a fost înscris la examen.`);
            setSesiuneSelectataId('');
        } catch (err: any) {
            showError("Eroare la înscriere", err);
        } finally {
            setLoadingInscriere(false);
        }
    };

    const renderInscriereModule = () => {
        if (!isAdmin) return null;
        const dejaInscris = allInscrieri.some(i => i.sportiv_id === viewedUser.id && i.sesiune_id === sesiuneSelectataId);
        const sesiuneSelectata = sesiuni.find(s => s.id === sesiuneSelectataId);
        
        return (
            <Card className="border-l-4 border-brand-secondary">
                <h2 className="text-xl font-bold text-white mb-4">Înscriere la Examen Viitor</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <Select label="1. Alege Sesiunea" value={sesiuneSelectataId} onChange={e => setSesiuneSelectataId(e.target.value)}>
                        <option value="">Selectează...</option>
                        {sesiuniViitoare.map(s => <option key={s.id} value={s.id}>{new Date(s.data+'T00:00:00').toLocaleDateString('ro-RO')} - {locatii.find(l=>l.id===s.locatie_id)?.nume}</option>)}
                    </Select>
                    {sesiuneSelectataId && (<>
                        <Input label="Vârsta la Examen" value={varstaCalculata !== null ? `${varstaCalculata} ani` : ''} disabled />
                        <Select label="2. Alege Gradul" value={gradVizatId} onChange={e => setGradVizatId(e.target.value)}>
                            <option value="">Selectează manual...</option>
                            {sortedGrades.map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}
                        </Select>
                        <div className="flex flex-col">
                            <Button onClick={handleInscriere} variant="success" isLoading={loadingInscriere} disabled={dejaInscris || !gradVizatId}>
                                {dejaInscris ? 'Deja Înscris' : 'Confirmă Înscrierea'}
                            </Button>
                             <span className="text-center text-sm font-bold text-slate-300 mt-1">{taxaCalculata !== null ? `Taxă: ${taxaCalculata} RON` : 'Taxă N/A'}</span>
                        </div>
                    </>)}
                </div>
            </Card>
        );
    };

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi</Button>
            <header className="text-left">
                 <h1 className="text-3xl font-bold text-white">Istoric & Înscriere Examene</h1>
                 <p className="text-lg text-slate-300">{viewedUser.nume} {viewedUser.prenume}</p>
            </header>
            
            {renderInscriereModule()}

            <Card className="p-0 overflow-hidden">
                <h2 className="text-xl font-bold text-white p-4">Istoric Participări</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-700/50"><tr><th className="p-3 font-semibold">Data Examen</th><th className="p-3 font-semibold">Grad Susținut</th><th className="p-3 font-semibold text-center">Rezultat</th><th className="p-3 font-semibold">Observații</th></tr></thead>
                        <tbody className="divide-y divide-slate-700">{userParticipari.map(p => (
                            <tr key={p.id} className="hover:bg-slate-700/30">
                                <td className="p-3 whitespace-nowrap">{new Date(p.data_examen + 'T00:00:00').toLocaleDateString('ro-RO')}</td>
                                <td className="p-3 font-semibold text-white">{p.nume_grad}</td>
                                <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${p.rezultat === 'Admis' ? 'bg-green-600/20 text-green-400 border-green-600/50' : p.rezultat === 'Respins' ? 'bg-red-600/20 text-red-400 border-red-600/50' : 'bg-slate-600/20 text-slate-400 border-slate-600/50'}`}>{p.rezultat}</span></td>
                                <td className="p-3 text-slate-400">{p.observatii || '-'}</td>
                            </tr>
                        ))}{userParticipari.length === 0 && <tr><td colSpan={4}><p className="p-8 text-center text-slate-500 italic">Niciun istoric de examinare.</p></td></tr>}</tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
