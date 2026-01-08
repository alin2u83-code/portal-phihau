import React, { useMemo, useState } from 'react';
import { Sportiv, Participare, Examen, Grad, Prezenta, Grupa, Plata, Eveniment, Rezultat, PretConfig } from '../types';
import { Button, Card } from './ui';
import { getPretValabil } from '../utils/pricing';
import { supabase } from '../supabaseClient';

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
    const [loading, setLoading] = useState<{[key: string]: boolean}>({});
    
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
    
    const handleInscriereStagiu = async (eveniment: Eveniment) => {
        if (!window.confirm(`Confirmați înscrierea la "${eveniment.denumire}"? Se va genera automat o taxă de plată.`)) return;

        setLoading(prev => ({ ...prev, [eveniment.id]: true }));
        const pretStagiuConfig = getPretValabil(preturiConfig, 'Taxa Stagiu', eveniment.data);
        if (!pretStagiuConfig) {
            alert("Eroare: Configurația de preț pentru stagii nu este disponibilă. Vă rugăm contactați administratorul.");
            setLoading(prev => ({ ...prev, [eveniment.id]: false }));
            return;
        }

        const { data: rezultatData, error: rezultatError } = await supabase.from('rezultate').insert({ sportivId: sportiv.id, evenimentId: eveniment.id, rezultat: 'Înscris' }).select().single();

        if (rezultatError) {
            alert(`Eroare la înscriere: ${rezultatError.message}`);
            setLoading(prev => ({ ...prev, [eveniment.id]: false }));
            return;
        }

        const newPlata: Omit<Plata, 'id'> = {
            sportivId: sportiv.id, familieId: sportiv.familieId, suma: pretStagiuConfig.suma,
            data: new Date().toISOString().split('T')[0], status: 'Neachitat',
            descriere: `Taxa ${eveniment.denumire}`, tip: 'Taxa Stagiu', metodaPlata: null, dataPlatii: null,
            observatii: `Înscriere automată din portal.`,
        };
        const { data: plataData, error: plataError } = await supabase.from('plati').insert(newPlata).select().single();

        if (plataError) {
            alert(`Înscriere reușită, dar eroare la generare taxă: ${plataError.message}. Contactați administratorul.`);
        }

        if(rezultatData) setRezultate(prev => [...prev, rezultatData as Rezultat]);
        if(plataData) setPlati(prev => [...prev, plataData as Plata]);
        
        setShowSuccess("Înscriere realizată cu succes! Verificați secțiunea financiară.");
        setTimeout(() => setShowSuccess(null), 5000);
        setLoading(prev => ({ ...prev, [eveniment.id]: false }));
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-200">
             {/* ... Header remains the same ... */}
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* ... Main content JSX remains the same, but the button will be disabled when loading ... */}
                {unregisteredUpcomingEvents.map(ev => (
                    // ... inside the map ...
                    <Button onClick={() => handleInscriereStagiu(ev)} variant="success" size="sm" disabled={loading[ev.id]}>
                        {loading[ev.id] ? 'Se înscrie...' : 'Înscrie-te'}
                    </Button>
                ))}
            </main>
        </div>
    );
};