import React, { useMemo, useState } from 'react';
import { Sportiv, Participare, Examen, Grad, Prezenta, Grupa, Plata, Eveniment, Rezultat, PretConfig, User, Familie } from '../types';
import { Button, Card } from './ui';
import { getPretValabil } from '../utils/pricing';
import { supabase } from '../supabaseClient';
import { UsersIcon, ShieldCheckIcon, CalendarDaysIcon } from './icons';

const getGrad = (gradId: string, allGrades: Grad[]) => allGrades.find(g => g.id === gradId);
const getAge = (dateString: string) => { const today = new Date(); const birthDate = new Date(dateString); let age = today.getFullYear() - birthDate.getFullYear(); const m = today.getMonth() - birthDate.getMonth(); if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; } return age; };
const parseDurationToMonths = (durationStr: string): number => { const parts = durationStr.split(' '); if (parts.length < 2) return 0; const value = parseInt(parts[0], 10); const unit = parts[1].toLowerCase(); if (unit.startsWith('lun')) return value; if (unit.startsWith('an')) return value * 12; return 0; };
const formatDateRange = (start: string, end?: string | null) => {
    const startDate = new Date(start).toLocaleDateString('ro-RO');
    if (end && start !== end) {
        const endDate = new Date(end).toLocaleDateString('ro-RO');
        return `${startDate} - ${endDate}`;
    }
    return startDate;
};

const DataField: React.FC<{label: string, value: React.ReactNode}> = ({label, value}) => (
    <div>
        <dt className="text-sm font-medium text-slate-400">{label}</dt>
        <dd className="mt-1 text-md text-white font-semibold">{value || 'N/A'}</dd>
    </div>
);

interface PortalSportivProps {
  currentUser: User;
  viewedUser: User;
  onSwitchView: (memberId: string) => void;
  participari: Participare[];
  examene: Examen[];
  grade: Grad[];
  prezente: Prezenta[];
  grupe: Grupa[];
  plati: Plata[];
  setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
  evenimente: Eveniment[];
  rezultate: Rezultat[];
  setRezultate: React.Dispatch<React.SetStateAction<Rezultat[]>>;
  preturiConfig: PretConfig[];
  onNavigateToEditProfil: () => void;
  onNavigateToEvenimenteleMele: () => void;
  sportivi: Sportiv[];
  familii: Familie[];
  onNavigateToDashboard: () => void;
}

export const PortalSportiv: React.FC<PortalSportivProps> = ({ currentUser, viewedUser, onSwitchView, participari, examene, grade, prezente, grupe, plati, setPlati, evenimente, rezultate, setRezultate, preturiConfig, onNavigateToEditProfil, onNavigateToEvenimenteleMele, sportivi, familii, onNavigateToDashboard }) => {
    const [showSuccess, setShowSuccess] = useState<string|null>(null);
    const [loading, setLoading] = useState<{[key: string]: boolean}>({});
    
    const sportivParticipari = useMemo(() => participari.filter(p => p.sportiv_id === viewedUser.id), [participari, viewedUser.id]);
    const sportivPrezente = useMemo(() => prezente.filter(p => p.sportivi_prezenti_ids.includes(viewedUser.id)), [prezente, viewedUser.id]);
    const sportivPlati = useMemo(() => plati.filter(p => p.sportiv_id === viewedUser.id || (p.familie_id && p.familie_id === viewedUser.familie_id)), [plati, viewedUser.id, viewedUser.familie_id]);
    const sportivRezultate = useMemo(() => rezultate.filter(r => r.sportiv_id === viewedUser.id), [rezultate, viewedUser.id]);
    
    const admittedParticipations = useMemo(() => sportivParticipari.filter(p => p.rezultat === 'Admis').sort((a, b) => (getGrad(b.grad_sustinut_id, grade)?.ordine ?? 0) - (getGrad(a.grad_sustinut_id, grade)?.ordine ?? 0)), [sportivParticipari, grade]);
    const currentGrad = useMemo(() => getGrad(admittedParticipations[0]?.grad_sustinut_id, grade), [admittedParticipations, grade]);
    const grupaCurenta = useMemo(() => grupe.find(g => g.id === viewedUser.grupa_id), [grupe, viewedUser.grupa_id]);

    const isAdmin = useMemo(() => currentUser.roluri.some(r => r.nume === 'Admin' || r.nume === 'Instructor'), [currentUser.roluri]);
    const isViewingOwnProfile = currentUser.id === viewedUser.id;

    const eligibility = useMemo(() => {
        const sortedGrades = [...grade].sort((a, b) => a.ordine - b.ordine);
        const nextGrad = currentGrad ? sortedGrades.find(g => g.ordine === (currentGrad?.ordine ?? 0) + 1) : sortedGrades[0];
        if (!nextGrad) return { eligible: false, message: "Ați atins gradul maxim.", nextGrad: null };
        const age = getAge(viewedUser.data_nasterii);
        if (age < nextGrad.varsta_minima) return { eligible: false, message: `Vârsta minimă necesară: ${nextGrad.varsta_minima} ani (aveți ${age} ani).`, nextGrad };
        const lastExamParticipation = admittedParticipations[0];
        const startDate = lastExamParticipation ? new Date(examene.find(e => e.id === lastExamParticipation.examen_id)!.data) : new Date(viewedUser.data_inscrierii);
        const monthsToWait = parseDurationToMonths(nextGrad.timp_asteptare);
        const eligibilityDate = new Date(startDate);
        eligibilityDate.setMonth(eligibilityDate.getMonth() + monthsToWait);
        if (new Date() < eligibilityDate) return { eligible: false, message: `Timp de așteptare insuficient. Veți fi eligibil după: ${eligibilityDate.toLocaleDateString('ro-RO')}.`, nextGrad };
        return { eligible: true, message: "Sunteți eligibil pentru examinare.", nextGrad };
    }, [currentGrad, grade, viewedUser, examene, admittedParticipations]);

    const prezenteLunaCurenta = useMemo(() => {
        const lunaCurenta = new Date().getMonth();
        const anulCurent = new Date().getFullYear();
        return sportivPrezente.filter(p => { const d = new Date(p.data); return d.getMonth() === lunaCurenta && d.getFullYear() === anulCurent; }).length;
    }, [sportivPrezente]);

    const membriFamilie = useMemo(() => {
        if (!viewedUser.familie_id) return [];
        return sportivi.filter(s => s.familie_id === viewedUser.familie_id);
    }, [sportivi, viewedUser.familie_id]);

    const familieNume = useMemo(() => {
        if (!viewedUser.familie_id) return '';
        return familii.find(f => f.id === viewedUser.familie_id)?.nume || '';
    }, [familii, viewedUser.familie_id]);

    const unregisteredUpcomingEvents = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcomingEvents = evenimente.filter(ev => new Date(ev.data) >= today);
        const registeredEventIds = new Set(sportivRezultate.map(r => r.eveniment_id));
        return upcomingEvents.filter(ev => !registeredEventIds.has(ev.id)).sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    }, [evenimente, sportivRezultate]);
    
    const handleInscriereEveniment = async (eveniment: Eveniment) => {
        if (!supabase) { alert("Eroare de configurare: Conexiunea la baza de date nu a putut fi stabilită."); return; }
        if (!window.confirm(`Confirmați înscrierea la "${eveniment.denumire}"? Se va genera automat o taxă de plată.`)) return;
        setLoading(prev => ({ ...prev, [eveniment.id]: true }));
        
        const categorie: PretConfig['categorie'] = eveniment.tip === 'Stagiu' ? 'Taxa Stagiu' : 'Taxa Competitie';
        const pretConfig = getPretValabil(preturiConfig, categorie, eveniment.data);

        if (!pretConfig) { 
            alert(`Eroare: Configurația de preț pentru '${categorie}' nu este disponibilă. Vă rugăm contactați administratorul.`); 
            setLoading(prev => ({ ...prev, [eveniment.id]: false })); 
            return; 
        }
        
        const { data: rezultatData, error: rezultatError } = await supabase.from('rezultate').insert({ sportiv_id: viewedUser.id, eveniment_id: eveniment.id, rezultat: 'Înscris' }).select().single();
        if (rezultatError) { alert(`Eroare la înscriere: ${rezultatError.message}`); setLoading(prev => ({ ...prev, [eveniment.id]: false })); return; }
        
        const newPlata = { 
            sportiv_id: viewedUser.id, 
            familie_id: viewedUser.familie_id,
            suma: pretConfig.suma,
            data: eveniment.data,
            status: 'Neachitat' as const,
            descriere: `Taxa ${eveniment.denumire}`,
            tip: categorie,
            observatii: 'Înscriere din portal.'
        };
        const { data: plataData, error: plataError } = await supabase.from('plati').insert(newPlata).select().single();
        if (plataError) { 
            alert(`Înscriere efectuată, dar a apărut o eroare la generarea taxei: ${plataError.message}. Contactați administratorul.`);
        } else if (plataData) {
            setPlati(prev => [...prev, plataData as Plata]);
        }
        
        if (rezultatData) {
            setRezultate(prev => [...prev, rezultatData as Rezultat]);
        }

        setShowSuccess(`Înscrierea la "${eveniment.denumire}" a fost realizată cu succes!`);
        setTimeout(() => setShowSuccess(null), 4000);
        
        setLoading(prev => ({ ...prev, [eveniment.id]: false }));
    };

    return (
        <div className="space-y-8">
            {/* Header and Family Switcher */}
            <Card className="bg-slate-800/50">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-white">Portal Sportiv: {viewedUser.nume} {viewedUser.prenume}</h1>
                        <p className="text-slate-400 mt-1">Bun venit în spațiul personal!</p>
                    </div>
                    {isAdmin && !isViewingOwnProfile && (
                        <Button variant="secondary" onClick={onNavigateToDashboard}>&larr; Înapoi la Panou Admin</Button>
                    )}
                </div>
                {membriFamilie.length > 1 && (
                    <div className="mt-4 pt-4 border-t border-slate-700">
                        <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                           <UsersIcon className="w-5 h-5"/> Membrii familiei {familieNume}:
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {membriFamilie.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => onSwitchView(m.id)}
                                    className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${m.id === viewedUser.id ? 'bg-brand-secondary text-white shadow' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                                >
                                    {m.prenume}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </Card>

            {showSuccess && <div className="bg-green-600/50 text-white p-3 rounded-md text-center font-semibold">{showSuccess}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Main Info */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Grade Info */}
                    <Card>
                        <h2 className="text-2xl font-bold mb-4 text-white flex items-center gap-2"><ShieldCheckIcon className="text-brand-secondary"/> Progres Grad</h2>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                           <DataField label="Grad Actual" value={currentGrad ? <span className="px-2 py-1 bg-brand-primary rounded-md text-sm">{currentGrad.nume}</span> : 'Începător'} />
                           <DataField label="Vârstă" value={`${getAge(viewedUser.data_nasterii)} ani`} />
                           <DataField label="Următorul Grad" value={eligibility.nextGrad?.nume || 'N/A'}/>
                           <DataField label="Status Eligibilitate" value={
                               <span className={`font-bold ${eligibility.eligible ? 'text-green-400' : 'text-amber-400'}`}>
                                   {eligibility.message}
                               </span>
                           } />
                        </dl>
                    </Card>

                    {/* Attendance and Schedule */}
                    <Card>
                         <h2 className="text-2xl font-bold mb-4 text-white flex items-center gap-2"><CalendarDaysIcon className="text-brand-secondary"/> Antrenamente & Program</h2>
                         <dl className="grid grid-cols-2 gap-4 mb-4">
                            <DataField label="Prezențe Luna Curentă" value={<span className="text-2xl font-bold">{prezenteLunaCurenta}</span>} />
                            <DataField label="Grupă Curentă" value={grupaCurenta?.denumire || 'Neasignat'} />
                         </dl>
                         {grupaCurenta?.program && grupaCurenta.program.length > 0 && (
                            <div className="border-t border-slate-700 pt-4">
                               <h4 className="text-sm font-semibold text-slate-300 mb-2">Program grupă ({grupaCurenta.sala}):</h4>
                               <div className="flex flex-wrap gap-2">
                                   {grupaCurenta.program.map((p, i) => <span key={i} className="bg-slate-700 text-slate-200 text-xs font-semibold px-2 py-1 rounded-full">{p.ziua} {p.ora_start}-{p.ora_sfarsit}</span>)}
                               </div>
                            </div>
                         )}
                    </Card>

                     {/* Upcoming Events */}
                    {unregisteredUpcomingEvents.length > 0 && (
                        <Card>
                            <h2 className="text-2xl font-bold mb-4 text-white">Evenimente Viitoare</h2>
                            <div className="space-y-3">
                                {unregisteredUpcomingEvents.map(ev => (
                                    <div key={ev.id} className="bg-slate-700/50 p-3 rounded-md flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold">{ev.denumire} ({ev.tip})</p>
                                            <p className="text-sm text-slate-400">{formatDateRange(ev.data)} - {ev.locatie}</p>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            variant="info" 
                                            onClick={() => handleInscriereEveniment(ev)}
                                            disabled={loading[ev.id]}
                                        >
                                            {loading[ev.id] ? 'Se înscrie...' : 'Înscrie-te'}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
                
                {/* Right Column - Actions & Finances */}
                <div className="space-y-8">
                     {isViewingOwnProfile && (
                        <Card>
                            <h2 className="text-xl font-bold mb-4 text-white">Acțiuni Rapide</h2>
                            <div className="space-y-2">
                                <Button onClick={onNavigateToEditProfil} className="w-full justify-start">Editează Profil & Cont</Button>
                                <Button onClick={onNavigateToEvenimenteleMele} className="w-full justify-start">Vezi Evenimentele Mele</Button>
                            </div>
                        </Card>
                     )}
                     <Card>
                        <h2 className="text-xl font-bold mb-4 text-white">Situație Financiară</h2>
                        <div className="space-y-2">
                            {sportivPlati.filter(p => p.status !== 'Achitat').map(plata => (
                                <div key={plata.id} className="bg-red-900/40 p-3 rounded-md border border-red-500/30">
                                    <div className="flex justify-between items-center text-sm">
                                        <p className="font-semibold text-red-300">{plata.descriere}</p>
                                        <p className="font-bold text-red-200">{plata.suma.toFixed(2)} RON</p>
                                    </div>
                                    <p className="text-xs text-red-400">Scadent la: {new Date(plata.data).toLocaleDateString('ro-RO')}</p>
                                </div>
                            ))}
                            {sportivPlati.filter(p => p.status !== 'Achitat').length === 0 && (
                                <p className="text-green-400 text-center font-semibold bg-green-900/30 p-3 rounded-md">Sunteți cu plățile la zi!</p>
                            )}
                        </div>
                     </Card>
                </div>
            </div>
        </div>
    );
}