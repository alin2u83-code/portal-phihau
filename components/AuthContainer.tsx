import React, { useEffect, useReducer } from 'react';
import { supabase } from '../supabaseClient';
import { Button, Card, Input } from './ui';
import { useSearchParams, useNavigate } from 'react-router-dom';

const QwanKiDoLogo: React.FC = () => (
    <div className="mx-auto mb-6 h-20 w-20 flex items-center justify-center rounded-full bg-slate-700 border-2 border-slate-600">
        <svg viewBox="0 0 100 100" className="w-12 h-12 text-amber-400">
            <path d="M50 10 L90 50 L50 90 L10 50 Z" stroke="currentColor" strokeWidth="8" fill="none" />
            <circle cx="50" cy="50" r="15" fill="currentColor" />
        </svg>
    </div>
);

type AuthView = 'login' | 'signup';

interface AuthState {
    view: AuthView;
    form: {
        nume: string;
        prenume: string;
        email: string;
        parola: string;
        confirmParola: string;
    };
    message: { type: 'error' | 'success', text: string } | null;
    loading: boolean;
}

type AuthAction =
    | { type: 'SET_VIEW'; payload: AuthView }
    | { type: 'UPDATE_FORM'; payload: { name: string; value: string } }
    | { type: 'SET_MESSAGE'; payload: { type: 'error' | 'success'; text: string } | null }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'RESET_FORM' };

const initialState: AuthState = {
    view: 'login',
    form: {
        nume: '',
        prenume: '',
        email: '',
        parola: '',
        confirmParola: ''
    },
    message: null,
    loading: false,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
    switch (action.type) {
        case 'SET_VIEW':
            return {
                ...initialState,
                view: action.payload,
            };
        case 'UPDATE_FORM':
            return {
                ...state,
                form: { ...state.form, [action.payload.name]: action.payload.value }
            };
        case 'SET_MESSAGE':
            return { ...state, message: action.payload };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'RESET_FORM':
            return { ...state, form: initialState.form, message: null };
        default:
            return state;
    }
}

export const AuthContainer: React.FC = () => {
    const [state, dispatch] = useReducer(authReducer, initialState);
    const { view, form, message, loading } = state;
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const error = searchParams.get('error');
        if (error === 'no-roles') {
            dispatch({
                type: 'SET_MESSAGE',
                payload: {
                    type: 'error',
                    text: 'Contul dumneavoastră a fost autentificat, dar nu are niciun rol asignat. Accesul a fost revocat. Vă rugăm contactați un administrator.'
                }
            });
        }
    }, [searchParams]);

    const PHI_HAU_IASI_CLUB_ID = 'cbb0b228-b3e0-4735-9658-70999eb256c6';
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch({ type: 'UPDATE_FORM', payload: { name: e.target.name, value: e.target.value } });
    };

    const getErrorMessage = (error: any): string => {
        if (error.code === 'invalid_credentials') return 'Email sau parolă incorectă.';
        if (error.code === 'user_already_exists') return 'Acest email este deja înregistrat.';
        if (error.code === 'weak_password') return 'Parola este prea slabă.';
        if (error.message) return error.message;
        return 'A apărut o eroare neașteptată. Vă rugăm reîncercați.';
    };

    const [isResetModalOpen, setIsResetModalOpen] = React.useState(false);
    const [resetEmail, setResetEmail] = React.useState('');
    const [resetLoading, setResetLoading] = React.useState(false);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        setResetLoading(false);
        if (error) {
            dispatch({ type: 'SET_MESSAGE', payload: { type: 'error', text: getErrorMessage(error) } });
        } else {
            dispatch({ type: 'SET_MESSAGE', payload: { type: 'success', text: 'Email de resetare trimis!' } });
            setIsResetModalOpen(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        dispatch({ type: 'SET_MESSAGE', payload: null });
        dispatch({ type: 'SET_LOADING', payload: true });

        if (!supabase) {
            dispatch({ type: 'SET_MESSAGE', payload: { type: 'error', text: 'Clientul bazei de date nu este configurat.' } });
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
        }

        const { error } = await supabase.auth.signInWithPassword({
            email: form.email,
            password: form.parola,
        });

        if (error) {
            dispatch({ type: 'SET_MESSAGE', payload: { type: 'error', text: getErrorMessage(error) } });
            dispatch({ type: 'SET_LOADING', payload: false });
        } else {
            navigate('/');
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        dispatch({ type: 'SET_MESSAGE', payload: null });

        if (!supabase) {
            dispatch({ type: 'SET_MESSAGE', payload: { type: 'error', text: 'Clientul bazei de date nu este configurat.' } });
            return;
        }

        if (form.parola.length < 6) {
            dispatch({ type: 'SET_MESSAGE', payload: { type: 'error', text: 'Parola trebuie să aibă cel puțin 6 caractere.' } });
            return;
        }
        if (form.parola !== form.confirmParola) {
            dispatch({ type: 'SET_MESSAGE', payload: { type: 'error', text: 'Parolele nu se potrivesc.' } });
            return;
        }
        if (!PHI_HAU_IASI_CLUB_ID) {
            dispatch({ type: 'SET_MESSAGE', payload: { type: 'error', text: 'Eroare de configurare a sistemului. Vă rugăm contactați administratorul.' } });
            return;
        }

        dispatch({ type: 'SET_LOADING', payload: true });

        try {
            console.log('Începere proces înregistrare...');
            const { data: existingSportiv, error: sportivError } = await supabase
                .from('sportivi')
                .select('id, club_id')
                .eq('email', form.email)
                .maybeSingle();
            
            if (sportivError) {
                console.error('Eroare la interogarea sportivilor:', sportivError);
                throw sportivError;
            }
            console.log('Interogare sportivi reușită:', existingSportiv);

            const { data: { user }, error: signUpError } = await supabase.auth.signUp({
                email: form.email,
                password: form.parola,
            });

            if (signUpError) {
                console.error('Eroare la signUp:', signUpError);
                throw signUpError;
            }
            console.log('signUp reușit:', user);

            if (!user) {
                throw new Error('Nu s-a putut crea contul. Vă rugăm reîncercați.');
            }

            let profileId = existingSportiv?.id;
            let clubId = existingSportiv?.club_id || PHI_HAU_IASI_CLUB_ID;

            if (!existingSportiv) {
                const { data: newProfile, error: profileError } = await supabase
                    .from('sportivi')
                    .insert({
                        user_id: user.id,
                        nume: form.nume,
                        prenume: form.prenume,
                        email: form.email,
                        club_id: clubId,
                        data_nasterii: '1900-01-01',
                        data_inscrierii: new Date().toISOString().split('T')[0],
                        status: 'Activ',
                        trebuie_schimbata_parola: true,
                    }).select().maybeSingle();

                if (profileError) throw profileError;
                if (newProfile) {
                    profileId = newProfile.id;
                }
            } else {
                // Update existing sportiv with user_id
                const { error: updateError } = await supabase.from('sportivi').update({ user_id: user.id }).eq('id', existingSportiv.id);
                if (updateError) throw updateError;
            }
            
            const { error: roleError } = await supabase.from('utilizator_roluri_multicont').insert({
                user_id: user.id,
                rol_denumire: 'Sportiv',
                club_id: clubId,
                sportiv_id: profileId,
                is_primary: true
            });
            
            if (roleError) throw roleError;
            
            dispatch({ type: 'SET_MESSAGE', payload: { type: 'success', text: 'Cont creat cu succes! Vă rugăm să verificați email-ul pentru a vă confirma contul.' } });
            dispatch({ type: 'RESET_FORM' });
        } catch (error: any) {
            console.error('DEBUG: Eroare detaliată:', {
                message: error.message,
                stack: error.stack,
                name: error.name,
                cause: error.cause
            });
            dispatch({ type: 'SET_MESSAGE', payload: { type: 'error', text: getErrorMessage(error) } });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const toggleView = (v: AuthView) => {
        dispatch({ type: 'SET_VIEW', payload: v });
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
                        <div className={`flex items-start gap-3 p-4 rounded-xl mb-6 border animate-in fade-in slide-in-from-top-2 duration-300 ${
                            message.type === 'error' 
                                ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }`}>
                            <div className="mt-0.5">
                                {message.type === 'error' ? (
                                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                            </div>
                            <p className="text-sm font-medium leading-relaxed">
                                {message.text}
                            </p>
                        </div>
                    )}

                    {view === 'login' ? (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <Input label="Email sau Nume Utilizator" name="email" type="text" value={form.email} onChange={handleChange} required autoComplete="username" />
                            <Input label="Parolă" name="parola" type="password" value={form.parola} onChange={handleChange} required autoComplete="current-password" />
                            <div className="flex justify-end">
                                <button type="button" className="text-sm text-amber-400 hover:text-amber-300" onClick={() => setIsResetModalOpen(true)}>
                                    Am uitat parola
                                </button>
                            </div>
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
                    
                    {isResetModalOpen && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                            <Card className="w-full max-w-sm">
                                <h2 className="text-lg font-bold text-white mb-4">Resetare Parolă</h2>
                                <form onSubmit={handleResetPassword} className="space-y-4">
                                    <Input label="Email" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
                                    <div className="flex justify-end gap-2">
                                        <Button type="button" variant="secondary" onClick={() => setIsResetModalOpen(false)}>Anulează</Button>
                                        <Button type="submit" variant="primary" isLoading={resetLoading}>Trimite</Button>
                                    </div>
                                </form>
                            </Card>
                        </div>
                    )}
                    

                </Card>
            </div>
        </div>
    );
};