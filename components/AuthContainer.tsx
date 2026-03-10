import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button, Card, Input } from './ui';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthForm } from '../hooks/useAuthForm';
import { getAuthErrorMessage } from '../utils/error';

const QwanKiDoLogo: React.FC = () => (
    <div className="mx-auto mb-6 h-20 w-20 flex items-center justify-center rounded-full bg-slate-700 border-2 border-slate-600">
        <svg viewBox="0 0 100 100" className="w-12 h-12 text-amber-400">
            <path d="M50 10 L90 50 L50 90 L10 50 Z" stroke="currentColor" strokeWidth="8" fill="none" />
            <circle cx="50" cy="50" r="15" fill="currentColor" />
        </svg>
    </div>
);

type AuthView = 'login' | 'signup';

export const AuthContainer: React.FC = () => {
    const [view, setView] = useState<AuthView>('login');
    const { formData, errors, handleChange, validate, resetForm, setErrors } = useAuthForm(view === 'login' ? 'login' : 'register');
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const [loading, setLoading] = useState(false);
    
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

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
            setMessage({ type: 'error', text: getAuthErrorMessage(error) });
        } else {
            setMessage({ type: 'success', text: 'Email de resetare trimis!' });
            setIsResetModalOpen(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        if (!validate()) return;
        
        setLoading(true);

        if (!supabase) {
            setMessage({ type: 'error', text: 'Clientul bazei de date nu este configurat.' });
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.signInWithPassword({
            email: formData.email || '',
            password: formData.parola || '',
        });

        if (error) {
            setMessage({ type: 'error', text: getAuthErrorMessage(error) });
            setLoading(false);
        } else {
            navigate('/');
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (!validate()) return;

        if (!supabase) {
            setMessage({ type: 'error', text: 'Clientul bazei de date nu este configurat.' });
            return;
        }

        if (!PHI_HAU_IASI_CLUB_ID) {
            setMessage({ type: 'error', text: 'Eroare de configurare a sistemului. Vă rugăm contactați administratorul.' });
            return;
        }

        setLoading(true);

        try {
            console.log('Începere proces înregistrare...');
            const { data: existingSportiv, error: sportivError } = await supabase
                .from('sportivi')
                .select('id, club_id, user_id')
                .eq('email', formData.email)
                .maybeSingle();
            
            if (sportivError) {
                console.error('Eroare la interogarea sportivilor:', sportivError);
                throw sportivError;
            }
            console.log('Interogare sportivi reușită:', existingSportiv);

            if (existingSportiv && existingSportiv.user_id) {
                throw new Error('Acest email este deja asociat unui cont activ.');
            }

            let clubId = existingSportiv?.club_id || PHI_HAU_IASI_CLUB_ID;
            let finalEmail = formData.email || '';

            if (existingSportiv) {
                // Temporary email trick to avoid unique constraint violation if trigger inserts
                const tempEmail = `temp_${Date.now()}_${finalEmail}`;
                await supabase.from('sportivi').update({ email: tempEmail }).eq('id', existingSportiv.id);
            }

            const { data: { user }, error: signUpError } = await supabase.auth.signUp({
                email: finalEmail,
                password: formData.parola || '',
                options: {
                    data: {
                        full_name: `${formData.nume} ${formData.prenume}`,
                        first_name: formData.nume,
                        last_name: formData.prenume,
                        nume: formData.nume,
                        prenume: formData.prenume,
                        username: finalEmail.split('@')[0],
                        club_id: clubId,
                        data_nasterii: '1900-01-01',
                        status: 'Activ',
                        data_inscrierii: new Date().toISOString().split('T')[0],
                        gen: 'Masculin'
                    }
                }
            });

            if (signUpError) {
                if (existingSportiv) {
                    // Revert email
                    await supabase.from('sportivi').update({ email: finalEmail }).eq('id', existingSportiv.id);
                }
                console.error('Eroare la signUp:', signUpError);
                throw signUpError;
            }
            console.log('signUp reușit:', user);

            if (!user) {
                if (existingSportiv) {
                    await supabase.from('sportivi').update({ email: finalEmail }).eq('id', existingSportiv.id);
                }
                throw new Error('Nu s-a putut crea contul. Vă rugăm reîncercați.');
            }

            let profileId = existingSportiv?.id;

            if (!existingSportiv) {
                // Check if trigger already created the profile
                const { data: triggerProfile } = await supabase
                    .from('sportivi')
                    .select('id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (triggerProfile) {
                    profileId = triggerProfile.id;
                } else {
                    const { data: newProfile, error: profileError } = await supabase
                        .from('sportivi')
                        .insert({
                            user_id: user.id,
                            nume: formData.nume,
                            prenume: formData.prenume,
                            email: finalEmail,
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
                }
            } else {
                // Update existing sportiv with user_id and revert email
                const { error: updateError } = await supabase.from('sportivi').update({ user_id: user.id, email: finalEmail }).eq('id', existingSportiv.id);
                if (updateError) throw updateError;
            }
            
            const { error: roleError } = await supabase.from('utilizator_roluri_multicont').insert({
                user_id: user.id,
                rol_denumire: 'Sportiv',
                club_id: clubId,
                sportiv_id: profileId
            });
            
            if (roleError) throw roleError;
            
            setMessage({ type: 'success', text: 'Cont creat cu succes! Vă rugăm să verificați email-ul pentru a vă confirma contul.' });
            resetForm();
        } catch (error: any) {
            console.error('DETALII EROARE:', JSON.stringify({
                message: error.message,
                stack: error.stack,
                name: error.name,
                cause: error.cause
            }, null, 2));
            setMessage({ type: 'error', text: getAuthErrorMessage(error) });
        } finally {
            setLoading(false);
        }
    };

    const toggleView = (v: AuthView) => {
        setView(v);
        resetForm();
        setMessage(null);
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
                            <div>
                                <Input label="Email sau Nume Utilizator" name="email" type="text" value={formData.email || ''} onChange={(e) => { handleChange(e); setMessage(null); }} required autoComplete="username" className={errors.email ? 'border-red-500' : ''} />
                                {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
                            </div>
                            <div>
                                <Input label="Parolă" name="parola" type="password" value={formData.parola || ''} onChange={(e) => { handleChange(e); setMessage(null); }} required autoComplete="current-password" className={errors.parola ? 'border-red-500' : ''} />
                                {errors.parola && <p className="text-xs text-red-400 mt-1">{errors.parola}</p>}
                            </div>
                            <div className="flex justify-between items-center">
                                <button type="button" className="text-sm text-amber-400 hover:text-amber-300" onClick={() => toggleView('signup')}>
                                    Creează cont
                                </button>
                                <button type="button" className="text-sm text-amber-400 hover:text-amber-300" onClick={() => setIsResetModalOpen(true)}>
                                    Am uitat parola
                                </button>
                            </div>
                            <Button type="submit" className="w-full !mt-6" size="md" isLoading={loading} variant="primary">Autentificare</Button>
                        </form>
                    ) : (
                        <form onSubmit={handleSignUp} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Input label="Nume" name="nume" type="text" value={formData.nume || ''} onChange={(e) => { handleChange(e); setMessage(null); }} required autoComplete="family-name" className={errors.nume ? 'border-red-500' : ''} />
                                    {errors.nume && <p className="text-xs text-red-400 mt-1">{errors.nume}</p>}
                                </div>
                                <div>
                                    <Input label="Prenume" name="prenume" type="text" value={formData.prenume || ''} onChange={(e) => { handleChange(e); setMessage(null); }} required autoComplete="given-name" className={errors.prenume ? 'border-red-500' : ''} />
                                    {errors.prenume && <p className="text-xs text-red-400 mt-1">{errors.prenume}</p>}
                                </div>
                            </div>
                            <div>
                                <Input label="Email" name="email" type="email" value={formData.email || ''} onChange={(e) => { handleChange(e); setMessage(null); }} required autoComplete="email" className={errors.email ? 'border-red-500' : ''} />
                                {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
                            </div>
                            <div>
                                <Input label="Parolă" name="parola" type="password" value={formData.parola || ''} onChange={(e) => { handleChange(e); setMessage(null); }} required autoComplete="new-password" className={errors.parola ? 'border-red-500' : ''} />
                                {errors.parola && <p className="text-xs text-red-400 mt-1">{errors.parola}</p>}
                            </div>
                            <div>
                                <Input label="Confirmă Parola" name="confirmParola" type="password" value={formData.confirmParola || ''} onChange={(e) => { handleChange(e); setMessage(null); }} required autoComplete="new-password" className={errors.confirmParola ? 'border-red-500' : ''} />
                                {errors.confirmParola && <p className="text-xs text-red-400 mt-1">{errors.confirmParola}</p>}
                            </div>
                            <div className="flex justify-end">
                                <button type="button" className="text-sm text-amber-400 hover:text-amber-300" onClick={() => toggleView('login')}>
                                    Înapoi la autentificare
                                </button>
                            </div>
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