import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Button, Card, Input } from './ui';
import { User } from '../types';

const QwanKiDoLogo: React.FC = () => (
    <div className="mx-auto mb-6 h-20 w-20 flex items-center justify-center rounded-full bg-slate-700 border-2 border-slate-600">
        <svg viewBox="0 0 100 100" className="w-12 h-12 text-amber-400">
            <path d="M50 10 L90 50 L50 90 L10 50 Z" stroke="currentColor" strokeWidth="8" fill="none" />
            <circle cx="50" cy="50" r="15" fill="currentColor" />
        </svg>
    </div>
);

// --- Componenta pentru selecția rolului ---
const RoleSelector: React.FC<{
    roles: any[];
    onSelect: (role: any) => void;
    loading: boolean;
}> = ({ roles, onSelect, loading }) => {

    const getRoleDisplayName = (role: any) => {
        switch(role.rol_denumire) {
            case 'SUPER_ADMIN_FEDERATIE':
                return 'Super Admin Federație';
            case 'Admin':
                return 'Admin General';
            case 'Admin Club':
                return `Admin - ${role.club?.nume || 'Club Nedefinit'}`;
            case 'Instructor':
                return `Instructor - ${role.club?.nume || 'Club Nedefinit'}`;
            case 'Sportiv':
                return `Sportiv - ${role.sportiv?.nume || ''} ${role.sportiv?.prenume || ''}`;
            default:
                return role.rol_denumire;
        }
    };

    return (
        <Card className="border-t-4 border-amber-400 animate-fade-in-down">
            <QwanKiDoLogo />
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-white">Selectează un Rol</h1>
                <p className="text-slate-400 mt-1">Contul tău are mai multe roluri. Alege contextul în care vrei să continui.</p>
            </div>

            <div className="space-y-3">
                {roles.map((role, index) => (
                    <button
                        key={index}
                        onClick={() => onSelect(role)}
                        disabled={loading}
                        className="w-full text-left p-4 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors disabled:opacity-50 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                    >
                        <p className="font-bold text-white">{getRoleDisplayName(role)}</p>
                    </button>
                ))}
            </div>
            {loading && <div className="text-center mt-4 text-slate-400 animate-pulse">Se configurează sesiunea...</div>}
        </Card>
    );
};


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
    const [roleSelection, setRoleSelection] = useState<any[] | null>(null);
    const [authUser, setAuthUser] = useState<any | null>(null);

    const PHI_HAU_IASI_CLUB_ID = 'cbb0b228-b3e0-4735-9658-70999eb256c6';
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleRoleSelect = async (role: any) => {
        if (!supabase || !authUser) return;
        setLoading(true);

        const { data: primaryProfile, error: profileError } = await supabase
            .from('sportivi')
            .select('id')
            .eq('user_id', authUser.id)
            .single();

        if (profileError || !primaryProfile) {
            setMessage({ type: 'error', text: `Nu s-a găsit profilul principal pentru a seta contextul. Eroare: ${profileError?.message}` });
            setLoading(false);
            return;
        }

        const { error } = await supabase
            .from('sportivi')
            .update({ rol_activ_context: role.rol_denumire })
            .eq('id', primaryProfile.id);

        if (error) {
            setMessage({ type: 'error', text: `Eroare la setarea rolului activ: ${error.message}` });
            setLoading(false);
        } else {
            window.location.reload();
        }
    };

    const processUserRoles = async (user: any) => {
        if (!supabase) return;

        const { data: roles, error: rolesError } = await supabase
            .from('utilizator_roluri_multicont')
            .select(`
                rol_denumire,
                sportiv_id,
                club_id,
                club:cluburi(nume),
                sportiv:sportivi(nume, prenume)
            `)
            .eq('user_id', user.id);
        
        if (rolesError) {
            setMessage({ type: 'error', text: `Eroare la preluarea rolurilor: ${rolesError.message}` });
            setLoading(false);
            await supabase.auth.signOut();
            return;
        }

        if (roles.length === 0) {
            setMessage({ type: 'error', text: 'Contul nu are niciun rol asignat. Contactați administratorul.' });
            setLoading(false);
            await supabase.auth.signOut();
            return;
        }

        if (roles.length === 1) {
            setAuthUser(user);
            await handleRoleSelect(roles[0]);
        } else {
            setRoleSelection(roles);
            setAuthUser(user);
            setLoading(false);
        }
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

        const { data, error } = await supabase.auth.signInWithPassword({
            email: form.email,
            password: form.parola,
        });

        if (error) {
            setMessage({ type: 'error', text: 'Date de autentificare invalide. Verificați email/utilizator și parola.' });
            setLoading(false);
        } else if (data.user) {
            await processUserRoles(data.user);
        } else {
             setMessage({ type: 'error', text: 'Autentificare eșuată. Utilizator negăsit.' });
             setLoading(false);
        }
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

    if (roleSelection) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-main)]">
                <div className="w-full max-w-md">
                    <RoleSelector roles={roleSelection} onSelect={handleRoleSelect} loading={loading} />
                </div>
            </div>
        );
    }

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
