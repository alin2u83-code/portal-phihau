import React, { useMemo, useState } from 'react';
import { Sportiv, Participare, Examen, Grad, Prezenta, Grupa, Plata, Eveniment, Rezultat, PretConfig, User } from '../types';
import { Button, Card, Input } from './ui';
import { getPretValabil } from '../utils/pricing';
import { supabase } from '../supabaseClient';

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
  setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export const PortalSportiv: React.FC<PortalSportivProps> = ({ sportiv, onLogout, participari, examene, grade, prezente, grupe, plati, setPlati, evenimente, rezultate, setRezultate, preturiConfig, setSportivi, setCurrentUser }) => {
    const [showSuccess, setShowSuccess] = useState<string|null>(null);
    const [loading, setLoading] = useState<{[key: string]: boolean}>({});

    // State for profile editing
    const [profileFormData, setProfileFormData] = useState({
        nume: sportiv.nume,
        prenume: sportiv.prenume,
        email: sportiv.email,
        username: sportiv.username || '',
        parola: '',
        confirmParola: ''
    });
    const [profileSuccessMessage, setProfileSuccessMessage] = useState('');
    const [profileErrorMessage, setProfileErrorMessage] = useState('');
    const [profileLoading, setProfileLoading] = useState(false);

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfileFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleProfileSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) {
            setProfileErrorMessage("Eroare de configurare: Conexiunea la baza de date nu a putut fi stabilită.");
            return;
        }
        if (profileFormData.parola && profileFormData.parola !== profileFormData.confirmParola) {
            setProfileErrorMessage("Parolele nu se potrivesc.");
            return;
        }
        
        setProfileLoading(true);
        setProfileErrorMessage('');
        setProfileSuccessMessage('');

        if (profileFormData.username && profileFormData.username !== sportiv.username) {
            const { data: existingUser, error: checkError } = await supabase.from('sportivi').select('id').eq('username', profileFormData.username).not('id', 'eq', sportiv.id).limit(1);
            if (checkError) { setProfileErrorMessage(`Eroare la verificare: ${checkError.message}`); setProfileLoading(false); return; }
            if (existingUser && existingUser.length > 0) { setProfileErrorMessage('Numele de utilizator este deja folosit.'); setProfileLoading(false); return; }
        }

        const authUpdates: any = {};
        if (profileFormData.email !== sportiv.email) authUpdates.email = profileFormData.email;
        if (profileFormData.parola) authUpdates.password = profileFormData.parola;
        if (Object.keys(authUpdates).length > 0) {
            const { error: authError } = await supabase.auth.updateUser(authUpdates);
            if (authError) { setProfileErrorMessage(`Eroare la actualizarea autentificării: ${authError.message}`); setProfileLoading(false); return; }
        }

        const profileUpdates = { nume: profileFormData.nume, prenume: profileFormData.prenume, email: profileFormData.email, username: profileFormData.username };
        const { data, error } = await supabase.from('sportivi').update(profileUpdates).eq('user_id', sportiv.user_id).select().single();

        if (error) { setProfileErrorMessage(`Eroare la actualizarea profilului: ${error.message}`); setProfileLoading(false); return; }

        if(data) {
            const updatedUser = data as User;
            setSportivi(prev => prev.map(s => s.id === sportiv.id ? updatedUser : s));
            setCurrentUser(updatedUser);
        }
        
        setProfileSuccessMessage("Profilul a fost actualizat cu succes!");
        setProfileFormData(prev => ({ ...prev, parola: '', confirmParola: '' }));
        setTimeout(() => setProfileSuccessMessage(''), 3000);
        setProfileLoading(false);
    };
    
    const sportivParticipari = useMemo(() => participari.filter(p => p.sportiv_id === sportiv.id), [participari, sportiv.id]);
    const sportivPrezente = useMemo(() => prezente.filter(p => p.sportivi_prezenti_ids.includes(sportiv.id)), [prezente, sportiv.id]);
    const sportivPlati = useMemo(() => plati.filter(p => p.sportiv_id === sportiv.id || (p.familie_id && p.familie_id === sportiv.familie_id)), [plati, sportiv.id, sportiv.familie_id]);
    const sportivRezultate = useMemo(() => rezultate.filter(r => r.sportiv_id === sportiv.id), [rezultate, sportiv.id]);
    
    const admittedParticipations = useMemo(() => sportivParticipari.filter(p => p.rezultat === 'Admis').sort((a, b) => (getGrad(b.grad_sustinut_id, grade)?.ordine ?? 0) - (getGrad(a.grad_sustinut_id, grade)?.ordine ?? 0)), [sportivParticipari, grade]);
    const currentGrad = useMemo(() => getGrad(admittedParticipations[0]?.grad_sustinut_id, grade), [admittedParticipations, grade]);
    const grupaCurenta = useMemo(() => grupe.find(g => g.id === sportiv.grupa_id), [grupe, sportiv.grupa_id]);

    const eligibility = useMemo(() => {
        const nextGrad = grade.find(g => g.ordine === (currentGrad?.ordine ?? 0) + 1);
        if (!nextGrad) return { eligible: false, message: "Ați atins gradul maxim.", nextGrad: null };

        const age = getAge(sportiv.data_nasterii);
        if (age < nextGrad.varsta_minima) return { eligible: false, message: `Vârsta minimă necesară: ${nextGrad.varsta_minima} ani (aveți ${age} ani).`, nextGrad };

        const lastExamParticipation = admittedParticipations[0];
        const startDate = lastExamParticipation ? new Date(examene.find(e => e.id === lastExamParticipation.examen_id)!.data) : new Date(sportiv.data_inscrierii);
        
        const monthsToWait = parseDurationToMonths(nextGrad.timp_asteptare);
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
        const registeredEventIds = new Set(sportivRezultate.map(r => r.eveniment_id));
        return upcomingEvents.filter(ev => !registeredEventIds.has(ev.id)).sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    }, [evenimente, sportivRezultate]);
    
    const handleInscriereStagiu = async (eveniment: Eveniment) => {
        if (!supabase) {
            alert("Eroare de configurare: Conexiunea la baza de date nu a putut fi stabilită.");
            return;
        }
        if (!window.confirm(`Confirmați înscrierea la "${eveniment.denumire}"? Se va genera automat o taxă de plată.`)) return;

        setLoading(prev => ({ ...prev, [eveniment.id]: true }));
        const pretStagiuConfig = getPretValabil(preturiConfig, 'Taxa Stagiu', eveniment.data);
        if (!pretStagiuConfig) {
            alert("Eroare: Configurația de preț pentru stagii nu este disponibilă. Vă rugăm contactați administratorul.");
            setLoading(prev => ({ ...prev, [eveniment.id]: false }));
            return;
        }

        const { data: rezultatData, error: rezultatError } = await supabase.from('rezultate').insert({ sportiv_id: sportiv.id, eveniment_id: eveniment.id, rezultat: 'Înscris' }).select().single();

        if (rezultatError) {
            alert(`Eroare la înscriere: ${rezultatError.message}`);
            setLoading(prev => ({ ...prev, [eveniment.id]: false }));
            return;
        }

        const newPlata: Omit<Plata, 'id'> = {
            sportiv_id: sportiv.id, familie_id: sportiv.familie_id, suma: pretStagiuConfig.suma,
            data: new Date().toISOString().split('T')[0], status: 'Neachitat',
            descriere: `Taxa ${eveniment.denumire}`, tip: 'Taxa Stagiu', metoda_plata: null, data_platii: null,
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
             <header className="bg-slate-800 shadow-md">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
                    <h1 className="font-bold text-xl text-white">Portal Sportiv</h1>
                    <Button onClick={onLogout} variant="danger" size="sm">Logout</Button>
                </div>
            </header>
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                 <Card>
                    <h2 className="text-3xl font-bold text-white">Bun venit, {sportiv.prenume}!</h2>
                    <p className="text-slate-400">Acesta este panoul tău personal.</p>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <h3 className="text-xl font-bold text-white mb-4">Progresul Meu</h3>
                        <DataField label="Grad Actual" value={currentGrad?.nume || 'Niciun grad'} />
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
                               <div key={p.id} className="flex justify-between items-center bg-slate-700/50 p-2 rounded-md">
                                   <span>{p.descriere}</span>
                                   <span className="font-bold text-red-400">{p.suma.toFixed(2)} RON</span>
                               </div>
                           ))}
                           {sportivPlati.filter(p => p.status !== 'Achitat').length === 0 && <p className="text-slate-400">Nicio datorie restantă.</p>}
                        </div>
                    </Card>
                </div>

                <Card>
                    <h3 className="text-xl font-bold text-white mb-4">Evenimente Viitoare & Înscrieri</h3>
                    {showSuccess && <p className="text-green-400 bg-green-900/50 p-2 rounded-md mb-4 text-center">{showSuccess}</p>}
                    <div className="space-y-3">
                        {unregisteredUpcomingEvents.length > 0 ? unregisteredUpcomingEvents.map(ev => (
                            <div key={ev.id} className="bg-slate-700 p-3 rounded-md">
                                <div className="flex justify-between items-start flex-wrap gap-2">
                                    <div>
                                        <p className="font-bold">{ev.denumire} <span className={`text-xs px-2 py-0.5 rounded-full text-white ${ev.tip === 'Stagiu' ? 'bg-sky-600' : 'bg-purple-600'}`}>{ev.tip}</span></p>
                                        <p className="text-sm text-slate-400">{new Date(ev.data).toLocaleDateString('ro-RO')} - {ev.locatie}</p>
                                    </div>
                                    {ev.tip === 'Stagiu' && (
                                        <div className="text-right mt-2 md:mt-0">
                                            <Button onClick={() => handleInscriereStagiu(ev)} variant="success" size="sm" disabled={loading[ev.id]}>
                                                {loading[ev.id] ? 'Se înscrie...' : 'Înscrie-te'}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )) : <p className="text-slate-400">Niciun eveniment viitor disponibil pentru înscriere.</p>}
                    </div>
                </Card>

                <Card>
                    <h2 className="text-2xl font-bold text-white mb-4">Profil & Securitate</h2>
                    <form onSubmit={handleProfileSave} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Nume" name="nume" value={profileFormData.nume} onChange={handleProfileChange} required />
                            <Input label="Prenume" name="prenume" value={profileFormData.prenume} onChange={handleProfileChange} required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Email (Login)" name="email" type="email" value={profileFormData.email} onChange={handleProfileChange} required />
                            <Input label="Nume Utilizator" name="username" type="text" value={profileFormData.username} onChange={handleProfileChange} placeholder="ex: ion.popescu"/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Parolă Nouă (lasă gol pentru a o păstra)" name="parola" type="password" value={profileFormData.parola} onChange={handleProfileChange} />
                            <Input label="Confirmă Parola Nouă" name="confirmParola" type="password" value={profileFormData.confirmParola} onChange={handleProfileChange} />
                        </div>
                        {profileErrorMessage && <p className="text-red-400 text-sm text-center">{profileErrorMessage}</p>}
                        <div className="flex justify-end items-center gap-4 pt-2">
                            {profileSuccessMessage && <p className="text-green-400 text-sm font-semibold">{profileSuccessMessage}</p>}
                            <Button type="submit" variant="success" disabled={profileLoading}>{profileLoading ? 'Se salvează...' : 'Salvează Modificările'}</Button>
                        </div>
                    </form>
                </Card>
            </main>
        </div>
    );
};