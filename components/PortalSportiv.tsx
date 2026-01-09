import React, { useMemo, useState } from 'react';
import { Sportiv, Participare, Examen, Grad, Prezenta, Grupa, Plata, Eveniment, Rezultat, PretConfig, User, Familie } from '../types';
import { Button, Card } from './ui';
import { getPretValabil } from '../utils/pricing';
import { supabase } from '../supabaseClient';
import { UsersIcon, ShieldCheckIcon } from './icons';

const getGrad = (gradId: string, allGrades: Grad[]) => allGrades.find(g => g.id === gradId);
const getAge = (dateString: string) => { const today = new Date(); const birthDate = new Date(dateString); let age = today.getFullYear() - birthDate.getFullYear(); const m = today.getMonth() - birthDate.getMonth(); if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; } return age; };
const parseDurationToMonths = (durationStr: string): number => { const parts = durationStr.split(' '); if (parts.length < 2) return 0; const value = parseInt(parts[0], 10); const unit = parts[1].toLowerCase(); if (unit.startsWith('lun')) return value; if (unit.startsWith('an')) return value * 12; return 0; };

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
  sportivi: Sportiv[];
  familii: Familie[];
  onNavigateToDashboard: () => void;
}

export const PortalSportiv: React.FC<PortalSportivProps> = ({ currentUser, viewedUser, onSwitchView, participari, examene, grade, prezente, grupe, plati, setPlati, evenimente, rezultate, setRezultate, preturiConfig, onNavigateToEditProfil, sportivi, familii, onNavigateToDashboard }) => {
    const [showSuccess, setShowSuccess] = useState<string|null>(null);
    const [loading, setLoading] = useState<{[key: string]: boolean}>({});
    
    const sportivParticipari = useMemo(() => participari.filter(p => p.sportiv_id === viewedUser.id), [participari, viewedUser.id]);
    const sportivPrezente = useMemo(() => prezente.filter(p => p.sportivi_prezenti_ids.includes(viewedUser.id)), [prezente, viewedUser.id]);
    const sportivPlati = useMemo(() => plati.filter(p => p.sportiv_id === viewedUser.id || (p.familie_id && p.familie_id === viewedUser.familie_id)), [plati, viewedUser.id, viewedUser.familie_id]);
    const sportivRezultate = useMemo(() => rezultate.filter(r => r.sportiv_id === viewedUser.id), [rezultate, viewedUser.id]);
    
    const admittedParticipations = useMemo(() => sportivParticipari.filter(p => p.rezultat === 'Admis').sort((a, b) => (getGrad(b.grad_sustinut_id, grade)?.ordine ?? 0) - (getGrad(a.grad_sustinut_id, grade)?.ordine ?? 0)), [sportivParticipari, grade]);
    const currentGrad = useMemo(() => getGrad(admittedParticipations[0]?.grad_sustinut_id, grade), [admittedParticipations, grade]);
    const grupaCurenta = useMemo(() => grupe.find(g => g.id === viewedUser.grupa_id), [grupe, viewedUser.grupa_id]);

    const isAdmin = useMemo(() => currentUser.roluri.some(r => r.nume === 'Admin'), [currentUser.roluri]);
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
    
    const handleInscriereStagiu = async (eveniment: Eveniment) => {
        if (!supabase) { alert("Eroare de configurare: Conexiunea la baza de date nu a putut fi stabilită."); return; }
        if (!window.confirm(`Confirmați înscrierea la "${eveniment.denumire}"? Se va genera automat o taxă de plată.`)) return;
        setLoading(prev => ({ ...prev, [eveniment.id]: true }));
        const pretStagiuConfig = getPretValabil(preturiConfig, 'Taxa Stagiu', eveniment.data);
        if (!pretStagiuConfig) { alert("Eroare: Configurația de preț pentru stagii nu este disponibilă. Vă rugăm contactați administratorul."); setLoading(prev => ({ ...prev, [eveniment.id]: false })); return; }
        const { data: rezultatData, error: rezultatError } = await supabase.from('rezultate').insert({ sportiv_id: viewedUser.id, eveniment_id: eveniment.id, rezultat: 'Înscris' }).select().single();
        if (rezultatError) { alert(`Eroare la înscriere: ${rezultatError.message}`); setLoading(prev => ({ ...prev, [eveniment.id]: false })); return; }
        const newPlata: Omit<Plata, 'id'> = { sportiv_id: viewedUser.id, familie_id: viewedUser.familie_id, suma: pretStagiuConfig.suma, data: new Date().toISOString().split('T')[0], status: 'Neachitat', descriere: `Taxa ${eveniment.denumire}`, tip: 'Taxa Stagiu', metoda_plata: null, data_platii: null, observatii: `Înscriere automată din portal.`, };
        const { data: plataData, error: plataError } = await supabase.from('plati').insert(newPlata).select().single();
        if (plataError) { alert(`Înscriere reușită, dar eroare la generare taxă: ${plataError.message}. Contactați administratorul.`); }
        if(rezultatData) setRezultate(prev => [...prev, rezultatData as Rezultat]);
        if(plataData) setPlati(prev => [...prev, plataData as Plata]);
        setShowSuccess("Înscriere realizată cu succes! Verificați secțiunea financiară.");
        setTimeout(() => setShowSuccess(null), 5000);
        setLoading(prev => ({ ...prev, [eveniment.id]: false }));
    };

    return (
        <div className="space-y-6">
            {isAdmin && !isViewingOwnProfile && (
                <Card className="bg-amber-600/10 border border-amber-500/30">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <ShieldCheckIcon className="w-8 h-8 text-amber-400"/>
                            <div>
                                <h3 className="font-bold text-white">Mod Vizualizare Sportiv (Admin)</h3>
                                <p className="text-sm text-amber-300">Vizualizați profilul lui {viewedUser.nume} {viewedUser.prenume}.</p>
                            </div>
                        </div>
                        <Button onClick={onNavigateToDashboard} variant="secondary" className="bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-900/20 border-none">
                            Panou de Administrare
                        </Button>
                    </div>
                </Card>
            )}

            {!isViewingOwnProfile && !isAdmin && (
                 <Card className="bg-blue-900/50 border border-blue-500/30">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <UsersIcon className="w-8 h-8 text-blue-400"/>
                            <div>
                                <h3 className="font-bold text-white">Vizualizați profilul lui {viewedUser.nume} {viewedUser.prenume}</h3>
                                <p className="text-sm text-blue-300">Acesta este un profil de membru al familiei.</p>
                            </div>
                        </div>
                        <Button onClick={() => onSwitchView(currentUser.id)} variant="secondary" className="bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-900/20 border-none">
                            Înapoi la Profilul Meu
                        </Button>
                    </div>
                </Card>
            )}

            <Card>
                <h2 className="text-3xl font-bold text-white">Bun venit, {currentUser.prenume}!</h2>
                <p className="text-slate-400">{isViewingOwnProfile ? "Acesta este panoul tău personal de control." : `Vizualizați detaliile pentru ${viewedUser.prenume}.`}</p>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <h3 className="text-xl font-bold text-white mb-4">Progresul Meu</h3>
                    <DataField label="Grad Actual" value={currentGrad?.nume || <span className="text-sky-400 italic">Începător</span>} />
                    <div className="mt-4 pt-4 border-t border-slate-700">
                        <DataField label="Următorul Grad" value={eligibility.nextGrad?.nume || 'Maxim atins'} />
                        <p className={`text-sm mt-1 ${eligibility.eligible ? 'text-green-400' : 'text-yellow-400'}`}>{eligibility.message}</p>
                    </div>
                </Card>
                 <Card>
                    <h3 className="text-xl font-bold text-white mb-4">Activitate</h3>
                    <DataField label="Grupă" value={grupaCurenta?.denumire || 'Neatribuit'} />
                    <div className="mt-4 pt-4 border-t border-slate-700">
                         <DataField label="Prezențe Luna Curentă" value={`${prezenteLunaCurenta} antrenamente`} />
                    </div>
                </Card>
                 <Card>
                    <h3 className="text-xl font-bold text-white mb-4">Financiar</h3>
                     <p className="text-sm text-slate-400 mb-2">Datorii neachitate:</p>
                    <div className="space-y-2">
                       {sportivPlati.filter(p => p.status !== 'Achitat').map(p => (
                           <div key={p.id} className="flex justify-between items-center bg-slate-700/50 p-2 rounded-md text-sm">
                               <span>{p.descriere}</span>
                               <span className="font-bold text-red-400">{p.suma.toFixed(2)} RON</span>
                           </div>
                       ))}
                       {sportivPlati.filter(p => p.status !== 'Achitat').length === 0 && <p className="text-slate-400 text-sm italic">Nicio datorie restantă.</p>}
                    </div>
                </Card>
            </div>

            {viewedUser.familie_id && (
                <Card>
                    <div className="flex items-center gap-3 mb-4">
                        <UsersIcon className="w-6 h-6 text-brand-secondary" />
                        <h3 className="text-xl font-bold text-white">Familia {familieNume}</h3>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">Comutați între profilurile membrilor familiei pentru a vedea detaliile fiecăruia.</p>
                    <div className="space-y-2">
                        {membriFamilie.map(membru => (
                            <Button key={membru.id} onClick={() => onSwitchView(membru.id)} disabled={membru.id === viewedUser.id} className={`w-full justify-start text-left !p-3 ${membru.id === viewedUser.id ? 'bg-brand-primary text-white ring-2 ring-brand-secondary' : 'bg-slate-700/50 hover:bg-slate-700'}`} variant='secondary'>
                                <div className="flex justify-between items-center w-full">
                                    <span className="font-semibold">{membru.nume} {membru.prenume}</span>
                                    {membru.id === currentUser.id && <span className="text-xs text-brand-secondary font-bold">(Profilul Meu)</span>}
                                </div>
                            </Button>
                        ))}
                    </div>
                </Card>
            )}

            <Card>
                <h3 className="text-xl font-bold text-white mb-4">Evenimente Viitoare & Înscrieri</h3>
                {showSuccess && <p className="text-green-400 bg-green-900/50 p-2 rounded-md mb-4 text-center text-sm font-semibold">{showSuccess}</p>}
                <div className="space-y-3">
                    {unregisteredUpcomingEvents.length > 0 ? unregisteredUpcomingEvents.map(ev => (
                        <div key={ev.id} className="bg-slate-700 p-3 rounded-md border border-slate-600">
                            <div className="flex justify-between items-start flex-wrap gap-2">
                                <div>
                                    <p className="font-bold">{ev.denumire} <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full text-white ${ev.tip === 'Stagiu' ? 'bg-sky-600' : 'bg-purple-600'}`}>{ev.tip}</span></p>
                                    <p className="text-xs text-slate-400">{new Date(ev.data).toLocaleDateString('ro-RO')} - {ev.locatie}</p>
                                </div>
                                {ev.tip === 'Stagiu' && isViewingOwnProfile && (
                                    <div className="text-right">
                                        <Button onClick={() => handleInscriereStagiu(ev)} variant="success" size="sm" disabled={loading[ev.id]} className="text-xs">
                                            {loading[ev.id] ? 'Se înscrie...' : 'Înscrie-te'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )) : <p className="text-slate-400 text-sm italic">Niciun eveniment viitor disponibil pentru înscriere în acest moment.</p>}
                </div>
            </Card>

            {isViewingOwnProfile && (
                <Card className="border border-slate-700 bg-slate-800/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Profil & Securitate</h2>
                            <p className="text-slate-400 text-sm">Gestionează datele tale personale, numele de utilizator și parola.</p>
                        </div>
                        <Button onClick={onNavigateToEditProfil} variant="info" className="whitespace-nowrap">
                            Modifică Datele Contului
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
};