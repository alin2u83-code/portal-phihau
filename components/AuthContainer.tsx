import React, { useEffect, useReducer } from 'react';
import { supabase } from '../supabaseClient';
import { Button, Card, Input } from './ui';
import { useSearchParams } from 'react-router-dom';

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
            dispatch({ type: 'SET_MESSAGE', payload: { type: 'error', text: 'Date de autentificare invalide. Verificați email/utilizator și parola.' } });
            dispatch({ type: 'SET_LOADING', payload: false });
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

        const { data: { user }, error: signUpError } = await supabase.auth.signUp({
            email: form.email,
            password: form.parola,
            options: {
                data: {
                    nume: form.nume,
                    prenume: form.prenume,
                    full_name: `${form.prenume} ${form.nume}`
                }
            }
        });

        if (signUpError) {
            dispatch({ type: 'SET_MESSAGE', payload: { type: 'error', text: signUpError.message } });
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
        }

        if (!user) {
            dispatch({ type: 'SET_MESSAGE', payload: { type: 'error', text: 'Nu s-a putut crea contul. Vă rugăm reîncercați.' } });
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
        }

        dispatch({ type: 'SET_MESSAGE', payload: { type: 'success', text: 'Cont creat cu succes! Vă rugăm să verificați email-ul pentru a vă confirma contul.' } });
        dispatch({ type: 'SET_LOADING', payload: false });
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
                        <div className="space-y-4">
                            <form onSubmit={handleLogin} className="space-y-4">
                                <Input label="Email sau Nume Utilizator" name="email" type="text" value={form.email} onChange={handleChange} required autoComplete="username" />
                                <Input label="Parolă" name="parola" type="password" value={form.parola} onChange={handleChange} required autoComplete="current-password" />
                                <Button type="submit" className="w-full !mt-6" size="md" isLoading={loading} variant="primary">Autentificare</Button>
                            </form>
                            <div className="text-center mt-4">
                                <button onClick={() => toggleView('signup')} className="text-sm text-amber-400 hover:text-amber-300 font-medium transition-colors">
                                    Nu ai cont? Înregistrează-te aici
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
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
                            <div className="text-center mt-4">
                                <button onClick={() => toggleView('login')} className="text-sm text-amber-400 hover:text-amber-300 font-medium transition-colors">
                                    Ai deja cont? Autentifică-te aici
                                </button>
                            </div>
                        </div>
                    )}
                    

                </Card>
            </div>
        </div>
    );
};