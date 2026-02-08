import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Button, Card, Input } from './ui';
import { User } from '../types';
import { useSearchParams } from 'react-router-dom';

const QwanKiDoLogo: React.FC = () => (
    <div className="mx-auto mb-6 h-20 w-20 flex items-center justify-center rounded-full bg-slate-700 border-2 border-slate-600">
        <svg viewBox="0 0 100 100" className="w-12 h-12 text-amber-400">
            <path d="M50 10 L90 50 L50 90 L10 50 Z" stroke="currentColor" strokeWidth="8" fill="none" />
            <circle cx="50" cy="50" r="15" fill="currentColor" />
        </svg>
    </div>
);

export const AuthContainer: React.FC = () => {
    const [view, setView] = useState<'login' | 'signup'>('login');
    const [form, setForm] = useState({
        nume: '',
        prenume: '',
        email: '',
        parola: '',
        confirmParola: ''
    });
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const error = searchParams.get('error');
        if (error === 'no-roles') {
            setMessage({
                type: 'error',
                text: 'Contul dumneavoastră a fost autentificat, dar nu are niciun rol asignat. Accesul a fost revocat. Vă rugăm contactați un administrator.'
            });
        }
    }, [searchParams]);

    const PHI_HAU_IASI_CLUB_ID = 'cbb0b228-b3e0-4735-9658-70999eb256c6';
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setLoading(true);

        if (!supabase) {
            setMessage({ type: 'error', text: 'Clientul bazei de date nu este configurat.' });
            setLoading(false);
            return;
        }

        // 1. Autentifică utilizatorul
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: form.email,
            password: form.parola,
        });

        if (signInError) {
            setMessage({ type: 'error', text: 'Date de autentificare invalide. Verificați email/utilizator și parola.' });
            setLoading(false);
            return;
        }

        // 2. Dacă autentificarea reușește, verifică rolurile folosind o funcție RPC
        //    care are permisiuni superioare pentru a ocoli potențialele probleme RLS la logare.
        if (signInData.user) {
            const { data: rolesData, error: rpcError } = await supabase.rpc('get_user_login_data');

            if (rpcError) {
                setMessage({ type: 'error', text: `Eroare la verificarea rolurilor: ${rpcError.message}` });
                await supabase.auth.signOut(); // Deconectează utilizatorul dacă verificarea eșuează
                setLoading(false);
                return;
            }

            // 3. Dacă funcția RPC nu returnează niciun rol, blochează accesul și deconectează.
            if (!rolesData || (Array.isArray(rolesData) && rolesData.length === 0)) {
                setMessage({ type: 'error', text: 'Contul nu are niciun rol asignat. Acces revocat.' });
                await supabase.auth.signOut();
                setLoading(false);
                return;
            }
        }
        
        // 4. Dacă rolurile există, nu mai face nimic. Listener-ul onAuthStateChange din App.tsx va
        //    prelua controlul, va încărca toate datele și va naviga la dashboard. Starea de 'loading'
        //    se va opri natural la demontarea componentei.
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (form.parola.length < 6) {
            setMessage({ type: 'error', text: 'Parola trebuie să aibă cel puțin 6 caractere.' });
            return;
        }
        if (form.parola !== form.confirmParola) {
            setMessage({ type: 'error', text: 'Parolele nu se potrivesc.' });
            return;
        }
        if (!PHI_HAU_IASI_CLUB_ID) {
            setMessage({ type: 'error', text: 'Eroare de configurare a sistemului. Vă rugăm contactați administratorul.' });
            return;
        }

        setLoading(true);

        const { data: { user }, error: signUpError } = await supabase.auth.signUp({
            email: form.email,
            password: form.parola,
        });

        if (signUpError) {
            setMessage({ type: 'error', text: signUpError.message });
            setLoading(false);
            return;
        }

        if (!user) {
            setMessage({ type: 'error', text: 'Nu s-a putut crea contul. Vă rugăm reîncercați.' });
            setLoading(false);
            return;
        }

        const { data: newProfile, error: profileError } = await supabase
            .from('sportivi')
            .insert({
                user_id: user.id,
                nume: form.nume,
                prenume: form.prenume,
                email: form.email,
                club_id: PHI_HAU_IASI_CLUB_ID,
                data_nasterii: '1900-01-01',
                data_inscrierii: new Date().toISOString().split('T')[0],
                status: 'Activ',
                trebuie_schimbata_parola: true,
            }).select().single();

        if (profileError) {
             setMessage({ type: 'error', text: `Contul a fost creat, dar profilul nu a putut fi salvat: ${profileError.message}` });
             setLoading(false);
             return;
        }
        
        const { error: roleError } = await supabase.from('utilizator_roluri_multicont').insert({
            user_id: user.id,
            rol_denumire: 'Sportiv',
            club_id: PHI_HAU_IASI_CLUB_ID,
            sportiv_id: newProfile.id,
            is_primary: true
        });
        
        if (roleError) {
             setMessage({ type: 'error', text: `Profilul a fost creat, dar rolul nu a putut fi atribuit: ${roleError.message}` });
             setLoading(false);
             return;
        }
        
        setMessage({ type: 'success', text: 'Cont creat cu succes! Vă rugăm să verificați email-ul pentru a vă confirma contul.' });
        
        setLoading(false);
    };

    const toggleView = (v: 'login' | 'signup') => {
        setView(v);
        setMessage(null);
        setForm({ nume: '', prenume: '', email: '', parola: '', confirmParola: '' });
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-main)]">
            <div className="w-full max-w-md">
                <Card className="border-t-4 border-amber-400">
                    <QwanKiDoLogo />
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-white">
                            {view === 'login' ? 'Portal Phi Hau Iași' : 'Creează Cont Nou'}
                        </h1>
                        <p className="text-slate-400 mt-1">
                            {view === 'login' ? 'Calea disciplinei începe aici.' : 'Alătură-te familiei noastre.'}
                        </p>
                    </div>

                    {message && (
                        <p className={`text-sm text-center p-3 rounded-md mb-4 ${message.type === 'error' ? 'bg-red-900/40 text-red-300' : 'bg-green-900/40 text-green-300'}`}>
                            {message.text}
                        </p>
                    )}

                    {view === 'login' ? (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <Input label="Email sau Nume Utilizator" name="email" type="text" value={form.email} onChange={handleChange} required autoComplete="username" />
                            <Input label="Parolă" name="parola" type="password" value={form.parola} onChange={handleChange} required autoComplete="current-password" />
                            <Button type="submit" className="w-full !mt-6" size="md" isLoading={loading} variant="primary">Autentificare</Button>
                        </form>
                    ) : (
                        <form onSubmit={handleSignUp} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Nume" name="nume" type="text" value={form.nume} onChange={handleChange} required autoComplete="family-name" />
                                <Input label="Prenume" name="prenume" type="text" value={form.prenume} onChange={handleChange} required autoComplete="given-name" />
                            </div>
                            <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} required autoComplete="email" />
                            <Input label="Parolă" name="parola" type="password" value={form.parola} onChange={handleChange} required autoComplete="new-password" />
                            <Input label="Confirmă Parola" name="confirmParola" type="password" value={form.confirmParola} onChange={handleChange} required autoComplete="new-password" />
                            <Button type="submit" className="w-full !mt-6" size="md" isLoading={loading} variant="primary">Creează Cont</Button>
                        </form>
                    )}
                    
                    <div className="text-center mt-6">
                        <button onClick={() => toggleView(view === 'login' ? 'signup' : 'login')} className="text-sm text-slate-400 hover:text-white hover:underline transition-colors">
                            {view === 'login' ? 'Nu ai cont? Creează unul acum.' : 'Ai deja cont? Autentifică-te.'}
                        </button>
                    </div>
                </Card>
            </div>
        </div>
    );
};