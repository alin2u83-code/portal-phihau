
import React, { useMemo, useState } from 'react';
import { Sportiv, Participare, Examen, Grad, Prezenta, Grupa, Plata, Eveniment, Rezultat, PretConfig } from '../types';
import { Button, Card } from './ui';
import { getPretValabil } from '../utils/pricing';

const getGrad = (gradId: string, allGrades: Grad[]) => allGrades.find(g => g.id === gradId);
const getAge = (dateString: string) => { const today = new Date(); const birthDate = new Date(dateString); let age = today.getFullYear() - birthDate.getFullYear(); const m = today.getMonth() - birthDate.getMonth(); if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; } return age; };
const parseDurationToMonths = (durationStr: string): number => { const parts = durationStr.split(' '); if (parts.length < 2) return 0; const value = parseInt(parts[0], 10); const unit = parts[1].toLowerCase(); if (unit.startsWith('lun')) return value; if (unit.startsWith('an')) return value * 12; return 0; };

interface PortalSportivProps {
  sportiv: Sportiv;
  onLogout: () => void;
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
}

export const PortalSportiv: React.FC<PortalSportivProps> = ({ sportiv, onLogout, participari, examene, grade, prezente, grupe, plati, setPlati, evenimente, rezultate, setRezultate, preturiConfig }) => {
    const [showSuccess, setShowSuccess] = useState<string|null>(null);
    
    const sportivParticipari = useMemo(() => participari.filter(p => p.sportivId === sportiv.id), [participari, sportiv.id]);
    const sportivPrezente = useMemo(() => prezente.filter(p => p.sportiviPrezentiIds.includes(sportiv.id)), [prezente, sportiv.id]);
    const sportivPlati = useMemo(() => plati.filter(p => p.sportivId === sportiv.id || (p.familieId && p.familieId === sportiv.familieId)), [plati, sportiv.id, sportiv.familieId]);
    const sportivRezultate = useMemo(() => rezultate.filter(r => r.sportivId === sportiv.id), [rezultate, sportiv.id]);
    
    const admittedParticipations = useMemo(() => sportivParticipari.filter(p => p.rezultat === 'Admis').sort((a, b) => (getGrad(b.gradSustinutId, grade)?.ordine ?? 0) - (getGrad(a.gradSustinutId, grade)?.ordine ?? 0)), [sportivParticipari, grade]);
    const currentGrad = useMemo(() => getGrad(admittedParticipations[0]?.gradSustinutId, grade), [admittedParticipations, grade]);
    const grupaCurenta = useMemo(() => grupe.find(g => g.id === sportiv.grupaId), [grupe, sportiv.grupaId]);

    const eligibility = useMemo(() => {
        const nextGrad = grade.find(g => g.ordine === (currentGrad?.ordine ?? 0) + 1);
        if (!nextGrad) return { eligible: false, message: "Ați atins gradul maxim.", nextGrad: null };

        const age = getAge(sportiv.dataNasterii);
        if (age < nextGrad.varstaMinima) return { eligible: false, message: `Vârsta minimă necesară: ${nextGrad.varstaMinima} ani (aveți ${age} ani).`, nextGrad };

        const lastExamParticipation = admittedParticipations[0];
        const startDate = lastExamParticipation ? new Date(examene.find(e => e.id === lastExamParticipation.examenId)!.data) : new Date(sportiv.dataInscrierii);
        
        const monthsToWait = parseDurationToMonths(nextGrad.timpAsteptare);
        const eligibilityDate = new Date(startDate);
        eligibilityDate.setMonth(eligibilityDate.getMonth() + monthsToWait);

        if (new Date() < eligibilityDate) return { eligible: false, message: `Timp de așteptare insuficient. Veți fi eligibil după: ${eligibilityDate.toLocaleDateString('ro-RO')}.`, nextGrad };

        return { eligible: true, message: "Sunteți eligibil pentru examinare.", nextGrad };
    }, [currentGrad, grade, sportiv, examene, admittedParticipations]);

    const prezenteLunaCurenta = useMemo(() => {
        const lunaCurenta = new Date().getMonth();
        const anulCurent = new Date().getFullYear();
        return sportivPrezente.filter(p => { const d = new Date(p.data); return d.getMonth() === lunaCurenta && d.getFullYear() === anulCurent; }).length;
    }, [sportivPrezente]);

    const unregisteredUpcomingEvents = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcomingEvents = evenimente.filter(ev => new Date(ev.data) >= today);
        const registeredEventIds = new Set(sportivRezultate.map(r => r.evenimentId));
        return upcomingEvents.filter(ev => !registeredEventIds.has(ev.id)).sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    }, [evenimente, sportivRezultate]);
    
    const handleInscriereStagiu = (eveniment: Eveniment) => {
        if (!window.confirm(`Confirmați înscrierea la "${eveniment.denumire}"? Se va genera automat o taxă de plată.`)) return;

        setRezultate(prev => [...prev, { id: new Date().toISOString(), sportivId: sportiv.id, evenimentId: eveniment.id, rezultat: 'Înscris' }]);

        const pretStagiuConfig = getPretValabil(preturiConfig, 'Taxa Stagiu', eveniment.data);
        if (!pretStagiuConfig) {
            alert("Eroare: Configurația de preț pentru stagii nu este disponibilă. Vă rugăm contactați administratorul.");
            setRezultate(prev => prev.filter(r => r.evenimentId !== eveniment.id || r.sportivId !== sportiv.id));
            return;
        }

        const newPlata: Plata = {
            id: new Date().toISOString(),
            sportivId: sportiv.id,
            familieId: sportiv.familieId,
            suma: pretStagiuConfig.suma,
            data: new Date().toISOString().split('T')[0],
            status: 'Neachitat',
            descriere: `Taxa ${eveniment.denumire}`,
            tip: 'Taxa Stagiu',
            metodaPlata: null,
            dataPlatii: null,
            observatii: `Înscriere automată din portal.`,
        };
        setPlati(prev => [...prev, newPlata]);
        
        setShowSuccess("Înscriere realizată cu succes! Verificați secțiunea financiară.");
        setTimeout(() => setShowSuccess(null), 5000);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-200">
             <header className="bg-slate-800 shadow-md">
                <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <span className="font-bold text-xl text-white">Portal Sportiv</span>
                        <div className="flex items-center gap-4">
                            <span className="text-slate-300">Bun venit, {sportiv.prenume}!</span>
                             <Button onClick={onLogout} variant="secondary" size="sm">Logout</Button>
                        </div>
                    </div>
                </nav>
            </header>

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                
                {showSuccess && <div className="bg-green-600/50 text-white p-3 rounded-md mb-4 text-center font-semibold">{showSuccess}</div>}

                <Card>
                    <h2 className="text-2xl font-bold text-white mb-4">Profil Personal</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div><p className="text-sm text-slate-400">Nume</p><p className="font-semibold text-lg">{sportiv.nume} {sportiv.prenume}</p></div>
                        <div><p className="text-sm text-slate-400">Grad Actual</p><p className="font-semibold text-lg">{currentGrad?.nume || 'Debutant'}</p></div>
                        <div><p className="text-sm text-slate-400">Grupă</p><p className="font-semibold text-lg">{grupaCurenta?.denumire || 'N/A'}</p>
                            <div className="text-sm text-slate-400 flex flex-wrap gap-x-2">
                                {grupaCurenta?.program.map((p, i) => <span key={i}>{p.ziua} {p.oraStart}-{p.oraSfarsit}</span>)}
                            </div>
                        </div>
                    </div>
                </Card>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <h2 className="text-2xl font-bold text-white mb-4">Monitorizare Prezență</h2>
                        <p className="text-3xl font-bold text-sky-400 mb-4">{prezenteLunaCurenta} <span className="text-lg font-normal text-slate-300">prezențe luna aceasta</span></p>
                        <h3 className="text-lg font-semibold mb-2">Istoric recent:</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                         {sportivPrezente.slice(0, 10).map(p => <div key={p.id} className="flex justify-between bg-slate-700 p-2 rounded-md text-sm"><span>{new Date(p.data).toLocaleDateString('ro-RO')}</span><span className="font-semibold text-green-400">Prezent</span></div>)}
                         {sportivPrezente.length === 0 && <p className="text-slate-400">Nicio prezență înregistrată.</p>}
                        </div>
                    </Card>
                    <Card>
                        <h2 className="text-2xl font-bold text-white mb-4">Progres Tehnic</h2>
                         <div className={`p-4 rounded-lg ${eligibility.eligible ? 'bg-green-800/50' : 'bg-slate-700'}`}>
                            <p className="font-bold text-lg">{eligibility.nextGrad ? `Următorul grad: ${eligibility.nextGrad.nume}` : 'N/A'}</p>
                            <p className={`font-semibold mt-1 ${eligibility.eligible ? 'text-green-300' : 'text-slate-300'}`}>{eligibility.message}</p>
                        </div>
                    </Card>
                 </div>

                <Card>
                    <h2 className="text-2xl font-bold text-white mb-4">Situație Financiară</h2>
                     <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {sportivPlati.sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime()).map(plata => (
                            <div key={plata.id} className="bg-slate-700 p-3 rounded-md grid grid-cols-3 gap-4 text-sm items-center">
                                <span className="font-semibold">{plata.descriere}</span>
                                <span className="text-center font-bold">{plata.suma} RON</span>
                                <span className={`font-semibold text-right ${plata.status === 'Achitat' ? 'text-green-400' : 'text-red-400'}`}>{plata.status}</span>
                            </div>
                        ))}
                        {sportivPlati.length === 0 && <p className="text-slate-400">Nicio plată înregistrată.</p>}
                    </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <h2 className="text-2xl font-bold text-white mb-4">Istoric Evenimente</h2>
                         <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {sportivRezultate.length > 0 ? (
                                sportivRezultate.map(item => { 
                                    const ev = evenimente.find(e => e.id === item.evenimentId); 
                                    if (!ev) return null; 
                                    return ( 
                                    <div key={item.id} className="bg-slate-700 p-3 rounded-md flex justify-between items-center">
                                        <div>
                                            <span className={`font-semibold text-white`}>{ev.denumire}</span>
                                            <span className="text-slate-400 ml-4 text-sm">{item.rezultat}</span>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${ev.tip === 'Stagiu' ? 'bg-sky-700' : 'bg-purple-700'}`}>{ev.tip.toUpperCase()}</span>
                                    </div> 
                                    );
                                })
                            ) : (
                                <p className="text-slate-400">Niciun eveniment în istoric.</p>
                            )}
                         </div>
                    </Card>
                    <Card>
                        <h2 className="text-2xl font-bold text-white mb-4">Evenimente Viitoare Disponibile</h2>
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {unregisteredUpcomingEvents.length > 0 ? (
                                unregisteredUpcomingEvents.map(ev => (
                                    <div key={ev.id} className="bg-slate-700 p-3 rounded-md">
                                        <div className="flex justify-between items-start">
                                            <span className="font-semibold text-white">{ev.denumire}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${ev.tip === 'Stagiu' ? 'bg-sky-700' : 'bg-purple-700'}`}>{ev.tip.toUpperCase()}</span>
                                        </div>
                                        <div className="text-sm text-slate-400 mt-1">
                                            <span>{new Date(ev.data).toLocaleDateString('ro-RO')}</span>
                                            <span className="mx-2">|</span>
                                            <span>{ev.locatie}</span>
                                        </div>
                                        {ev.tip === 'Stagiu' && (
                                            <div className="text-right mt-2">
                                                 <Button onClick={() => handleInscriereStagiu(ev)} variant="success" size="sm">Înscrie-te</Button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-slate-400">Niciun eveniment viitor disponibil pentru înscriere.</p>
                            )}
                        </div>
                    </Card>
                </div>

            </main>
        </div>
    );
};