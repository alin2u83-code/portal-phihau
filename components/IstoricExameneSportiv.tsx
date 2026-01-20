import React, { useState, useMemo, useEffect } from 'react';
import { User, InscriereExamen, SesiuneExamen, Grad, PretConfig, Plata, Locatie } from '../types';
import { Button, Card, Select, Input } from './ui';
import { ArrowLeftIcon, PlusIcon } from './icons';
import { getPretProdus } from '../utils/pricing';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

// --- UTILITIES ---
const getAgeOnDate = (birthDateStr: string, onDateStr: string) => { const onDate = new Date(onDateStr); const birthDate = new Date(birthDateStr); let age = onDate.getFullYear() - birthDate.getFullYear(); const m = onDate.getMonth() - birthDate.getMonth(); if (m < 0 || (m === 0 && onDate.getDate() < birthDate.getDate())) { age--; } return age; };
const parseDurationToMonths = (durationStr: string): number => { if (!durationStr) return 0; const parts = durationStr.split(' '); if (parts.length < 2) return 0; const value = parseInt(parts[0], 10); const unit = parts[1].toLowerCase(); if (unit.startsWith('lun')) return value; if (unit.startsWith('an')) return value * 12; return 0; };
const getGrad = (gradId: string | null, allGrades: Grad[]) => gradId ? allGrades.find(g => g.id === gradId) : null;

const DataField: React.FC<{label: string, value: React.ReactNode, className?: string}> = ({label, value, className}) => (
    <div className={className}>
        <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="font-semibold text-white">{value}</p>
    </div>
);

// --- PROPS ---
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

export const IstoricExameneSportiv: React.FC<IstoricExameneSportivProps> = ({ viewedUser, participari, sesiuni, grade, onBack, isAdmin, preturiConfig, setPlati, setInscrieri, allInscrieri, locatii }) => {
    const { showError, showSuccess } = useError();
    const [loading, setLoading] = useState(false);
    
    // --- Enrollment State ---
    const [selectedSesiuneId, setSelectedSesiuneId] = useState('');
    const [selectedGradId, setSelectedGradId] = useState<string | null>(null);

    const viitoareSesiuni = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return sesiuni.filter(s => s.data >= today).sort((a,b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    }, [sesiuni]);

    const sortedGrades = useMemo(() => [...grade].sort((a,b) => a.ordine - b.ordine), [grade]);

    const enrollmentData = useMemo(() => {
        if (!selectedSesiuneId) return null;
        const sesiune = viitoareSesiuni.find(s => s.id === selectedSesiuneId);
        if (!sesiune) return null;

        const varstaLaExamen = getAgeOnDate(viewedUser.data_nasterii, sesiune.data);
        const admittedInscrieri = allInscrieri.filter(i => i.sportiv_id === viewedUser.id && i.rezultat === 'Admis').sort((a, b) => (getGrad(b.grad_sustinut_id, grade)?.ordine ?? 0) - (getGrad(a.grad_sustinut_id, grade)?.ordine ?? 0));
        const gradActual = getGrad(admittedInscrieri[0]?.grad_sustinut_id, grade);

        let gradVizatAutomat: Grad | undefined;
        let eligibilityMessage = "";
        
        if (!gradActual) { // Modul Primul Examen
            if (varstaLaExamen >= 5 && varstaLaExamen <= 6) gradVizatAutomat = sortedGrades.find(g => g.nume.toLowerCase().includes('galben'));
            else if (varstaLaExamen >= 7 && varstaLaExamen <= 12) gradVizatAutomat = sortedGrades.find(g => g.nume.toLowerCase().includes('roș'));
            else gradVizatAutomat = sortedGrades.find(g => g.nume.toLowerCase().includes('albastr'));
            eligibilityMessage = `Primul examen, propunere bazată pe vârsta de ${varstaLaExamen} ani.`;
        } else { // Progresie normală
            gradVizatAutomat = sortedGrades.find(g => g.ordine === gradActual.ordine + 1);
            if (gradVizatAutomat) {
                const lastExamDate = new Date(sesiuni.find(s => s.id === admittedInscrieri[0].sesiune_id)!.data);
                const monthsToWait = parseDurationToMonths(gradVizatAutomat.timp_asteptare);
                const eligibilityDate = new Date(lastExamDate);
                eligibilityDate.setMonth(eligibilityDate.getMonth() + monthsToWait);
                eligibilityMessage = new Date() < eligibilityDate
                    ? `Timp așteptare: ${gradVizatAutomat.timp_asteptare}. Devine eligibil după ${eligibilityDate.toLocaleDateString('ro-RO')}.`
                    : `Timp așteptare (${gradVizatAutomat.timp_asteptare}) îndeplinit.`;
            } else {
                eligibilityMessage = "Grad maxim atins.";
            }
        }

        const gradVizatFinal = selectedGradId ? sortedGrades.find(g => g.id === selectedGradId) : gradVizatAutomat;
        const taxa = gradVizatFinal ? getPretProdus(preturiConfig, 'Taxa Examen', gradVizatFinal.nume, { dataReferinta: sesiune.data })?.suma : null;
        
        return { sesiune, gradActual, gradVizatAutomat, varstaLaExamen, eligibilityMessage, taxa };
    }, [viewedUser, selectedSesiuneId, allInscrieri, grade, sortedGrades, preturiConfig, viitoareSesiuni, selectedGradId]);
    
    useEffect(() => {
        setSelectedGradId(enrollmentData?.gradVizatAutomat?.id || null);
    }, [enrollmentData?.gradVizatAutomat]);

    const handleEnroll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!enrollmentData || !selectedGradId) { showError("Date Invalide", "Sesiunea sau gradul vizat nu sunt valide."); return; }
        
        const { sesiune, gradActual, varstaLaExamen, taxa } = enrollmentData;
        const gradVizat = sortedGrades.find(g => g.id === selectedGradId);
        if (!gradVizat) return;

        if (participari.some(p => p.sesiune_id === sesiune.id)) { showError("Conflict", "Acest sportiv este deja înscris la această sesiune."); return; }
        
        setLoading(true);
        try {
            const newInscriere = { sesiune_id: sesiune.id, sportiv_id: viewedUser.id, grad_actual_id: gradActual?.id || null, grad_sustinut_id: gradVizat.id, varsta_la_examen: varstaLaExamen, rezultat: 'Neprezentat' as const, observatii: '' };
            const { data: iData, error: iError } = await supabase.from('inscrieri_examene').insert(newInscriere).select().single();
            if (iError) throw iError;
            setInscrieri(prev => [...prev, iData as InscriereExamen]);

            if (taxa) {
                const newPlata = { sportiv_id: viewedUser.id, familie_id: viewedUser.familie_id, suma: taxa, data: sesiune.data, status: 'Neachitat' as const, descriere: `Taxa examen grad ${gradVizat.nume}`, tip: 'Taxa Examen' as const, observatii: `Generată la înscriere.` };
                const { data: pData, error: pError } = await supabase.from('plati').insert(newPlata).select().single();
                if (pError) throw pError;
                setPlati(prev => [...prev, pData as Plata]);
            }
            showSuccess("Succes", `Sportivul a fost înscris și taxa generată.`);
            setSelectedSesiuneId('');
        } catch(err) {
            showError("Eroare la înscriere", err);
        } finally {
            setLoading(false);
        }
    };
    
    // --- History Data ---
    const userParticipari = useMemo(() => {
        return participari.map(p => {
                const sesiune = sesiuni.find(s => s.id === p.sesiune_id);
                const grad = grade.find(g => g.id === p.grad_sustinut_id);
                return { ...p, data_examen: sesiune?.data || 'N/A', nume_grad: grad?.nume || 'N/A' };
            })
            .sort((a, b) => new Date(b.data_examen).getTime() - new Date(a.data_examen).getTime());
    }, [participari, sesiuni, grade]);

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Portal</Button>
            
            <header className="text-left"><h1 className="text-3xl font-bold text-white">Istoric & Înscriere Examene</h1><p className="text-lg text-slate-300">{viewedUser.nume} {viewedUser.prenume}</p></header>

            {isAdmin && (
                <Card>
                    <h2 className="text-xl font-bold text-white mb-4">Înscrie la un Examen Viitor</h2>
                    <form onSubmit={handleEnroll} className="space-y-4">
                        <Select label="1. Selectează Sesiunea de Examen" value={selectedSesiuneId} onChange={e => setSelectedSesiuneId(e.target.value)}>
                            <option value="">Alege o sesiune...</option>
                            {viitoareSesiuni.map(s => <option key={s.id} value={s.id}>{new Date(s.data+'T00:00:00').toLocaleDateString('ro-RO')} - {locatii.find(l=>l.id===s.locatie_id)?.nume}</option>)}
                        </Select>
                        {enrollmentData && (<div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-4 animate-fade-in-down">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                <div className="text-center md:text-left order-2 md:order-1">
                                    <p className="text-xs text-slate-400">Propunere Grad (Automat)</p>
                                    <p className="text-3xl md:text-4xl font-bold text-brand-secondary">{enrollmentData.gradVizatAutomat?.nume || 'N/A'}</p>
                                    <p className="text-xs text-slate-500 mt-1 hidden md:block">{enrollmentData.eligibilityMessage}</p>
                                </div>
                                <div className="space-y-3 order-1 md:order-2">
                                    <Select label="2. Grad Susținut (Confirmă sau Modifică)" value={selectedGradId || ''} onChange={(e) => setSelectedGradId(e.target.value)}>
                                        {sortedGrades.map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}
                                    </Select>
                                    <div className="grid grid-cols-2 gap-2 text-sm pt-2">
                                        <DataField label="Vârsta la Examen" value={`${enrollmentData.varstaLaExamen} ani`} />
                                        <DataField label="Taxă Examen" value={enrollmentData.taxa ? `${enrollmentData.taxa.toFixed(2)} RON` : 'N/A'} className="text-right md:text-left" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-center md:justify-end pt-4 border-t border-slate-700">
                                <Button type="submit" variant="info" isLoading={loading} disabled={!selectedGradId} className="w-full md:w-auto"><PlusIcon className="w-5 h-5 mr-2" />Înscrie și Generează Factură</Button>
                            </div>
                        </div>)}
                    </form>
                </Card>
            )}

            <Card className="p-0 overflow-hidden">
                <h2 className="text-xl font-bold text-white p-4">Istoric Participări</h2>
                {/* Mobile View */}
                <div className="md:hidden p-4 space-y-4">{userParticipari.map(p => (
                    <Card key={p.id} className="bg-slate-700/50">
                        <div className="flex justify-between items-start"><div><p className="font-bold text-white">{p.nume_grad}</p><p className="text-xs text-slate-400">{new Date(p.data_examen + 'T00:00:00').toLocaleDateString('ro-RO')}</p></div><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${p.rezultat === 'Admis' ? 'bg-green-600/30 text-green-400' : 'bg-red-600/30 text-red-400'}`}>{p.rezultat}</span></div>
                        {p.media_generala && <div className="mt-3 pt-3 border-t border-slate-600 text-center"><p className="text-xs text-slate-400">Media Generală</p><p className="text-2xl font-bold text-brand-secondary">{p.media_generala.toFixed(2)}</p></div>}
                    </Card>
                ))}{userParticipari.length === 0 && <p className="p-8 text-center text-slate-500 italic">Niciun istoric.</p>}</div>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto"><table className="w-full text-left text-sm">
                    <thead className="bg-slate-700/50"><tr><th className="p-3 font-semibold">Data</th><th className="p-3 font-semibold">Grad Susținut</th><th className="p-3 font-semibold text-center">Thao Quyen</th><th className="p-3 font-semibold text-center">Song Doi</th><th className="p-3 font-semibold text-center">Media</th><th className="p-3 font-semibold text-center">Rezultat</th><th className="p-3 font-semibold">Observații</th></tr></thead>
                    <tbody className="divide-y divide-slate-700">{userParticipari.map(p => (
                        <tr key={p.id} className="hover:bg-slate-700/30">
                            <td className="p-3 whitespace-nowrap">{new Date(p.data_examen + 'T00:00:00').toLocaleDateString('ro-RO')}</td>
                            <td className="p-3 font-semibold text-white">{p.nume_grad}</td>
                            <td className="p-3 text-center font-mono">{p.nota_thao_quyen?.toFixed(2) || '-'}</td>
                            <td className="p-3 text-center font-mono">{p.nota_song_doi?.toFixed(2) || '-'}</td>
                            <td className="p-3 text-center font-bold text-brand-secondary font-mono">{p.media_generala?.toFixed(2) || '-'}</td>
                            <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${p.rezultat==='Admis' ? 'bg-green-600/20 text-green-400 border-green-600/50' : p.rezultat==='Respins' ? 'bg-red-600/20 text-red-400 border-red-600/50' : 'bg-slate-600/20 text-slate-400 border-slate-600/50'}`}>{p.rezultat}</span></td>
                            <td className="p-3 text-slate-400">{p.observatii || '-'}</td>
                        </tr>
                    ))}{userParticipari.length === 0 && <tr><td colSpan={7}><p className="p-8 text-center text-slate-500 italic">Nu ai participat la niciun examen încă.</p></td></tr>}</tbody>
                </table></div>
            </Card>
        </div>
    );
};
