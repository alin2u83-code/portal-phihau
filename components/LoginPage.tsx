import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAuthForm } from '../hooks/useAuthForm';
import { Button, Card, Input } from './ui';
import { LogIn, Mail, Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabaseClient';

import { QwanKiDoLogo } from './Logo';

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { login, loading, error: authError, clearStates } = useAuth();
    const { formData, errors, handleChange, setErrors } = useAuthForm('login');
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotMessage, setForgotMessage] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        clearStates();

        const inputValue = formData.email?.trim() || '';
        if (!inputValue) {
            setErrors(prev => ({ ...prev, email: 'Email-ul sau username-ul este obligatoriu.' }));
            return;
        }
        if (!formData.parola) {
            setErrors(prev => ({ ...prev, parola: 'Parola este obligatorie.' }));
            return;
        }

        let emailToUse = inputValue;

        // Dacă inputul nu conține @, îl tratăm ca username
        if (!inputValue.includes('@')) {
            const { data: sportivData } = await supabase
                .from('sportivi')
                .select('email')
                .eq('username', inputValue)
                .maybeSingle();
            if (!sportivData?.email) {
                setErrors(prev => ({ ...prev, email: 'Username negăsit. Încearcă cu emailul.' }));
                return;
            }
            emailToUse = sportivData.email;
        }

        try {
            const data = await login(emailToUse, formData.parola || '');
            if (data?.user) {
                navigate('/');
            }
        } catch (err: any) {
            // Eroarea este deja gestionată în useAuth și expusă prin `authError`
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forgotEmail.trim()) return;
        setForgotLoading(true);
        try {
            await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
                redirectTo: window.location.origin + '/reset-password',
            });
            setForgotMessage('Email trimis dacă adresa există în sistem. Verifică și folderul Spam.');
        } catch {
            setForgotMessage('Email trimis dacă adresa există în sistem. Verifică și folderul Spam.');
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
            <div className="w-full max-w-md">
                <Card className="border-t-4 border-amber-500 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
                    <QwanKiDoLogo className="mx-auto mb-6 h-24 w-24 border-2" iconClassName="w-14 h-14" />
                    
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
                            <LogIn className="w-6 h-6 text-amber-500" />
                            Autentificare
                        </h1>
                        <p className="text-slate-400 mt-2 font-medium italic">
                            ”Drumul e lung, rădăcinile sunt amare, dar fructul este dulce.” 
                            <br /> Pham Xuan Tong
                        </p>
                    </div>

                    {authError && (
                        <div className="flex items-start gap-3 p-4 rounded-xl mb-6 border animate-in fade-in slide-in-from-top-2 duration-300 bg-red-500/10 border-red-500/20 text-red-400">
                            <div className="mt-0.5">
                                <ShieldCheck className="w-5 h-5 shrink-0 opacity-70" />
                            </div>
                            <p className="text-sm font-medium leading-relaxed">
                                {authError}
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="relative">
                            <Input
                                label="Email / Username"
                                name="email"
                                type="text"
                                value={formData.email || ''}
                                onChange={(e) => { handleChange(e); clearStates(); }}
                                required
                                placeholder="exemplu@email.com sau username"
                                className={`pl-10 ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                            />
                            <Mail className="absolute left-3 top-[34px] w-4 h-4 text-slate-500" />
                            {errors.email && <p className="text-xs text-red-400 mt-1 ml-1">{errors.email}</p>}
                        </div>

                        <div className="relative">
                            <Input
                                label="Parolă"
                                name="parola"
                                type={showPassword ? 'text' : 'password'}
                                value={formData.parola || ''}
                                onChange={(e) => { handleChange(e); clearStates(); }}
                                required
                                placeholder="••••••••"
                                className={`pl-10 pr-12 ${errors.parola ? 'border-red-500 focus:ring-red-500' : ''}`}
                            />
                            <Lock className="absolute left-3 top-[34px] w-4 h-4 text-slate-500" />
                            <button
                                type="button"
                                onClick={() => setShowPassword(prev => !prev)}
                                className="absolute right-3 top-[30px] p-1 text-slate-400 hover:text-white active:text-amber-400 transition-colors touch-manipulation"
                                aria-label={showPassword ? 'Ascunde parola' : 'Arată parola'}
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                            {errors.parola && <p className="text-xs text-red-400 mt-1 ml-1">{errors.parola}</p>}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-800 rounded"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-400">
                                    Ține-mă minte
                                </label>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setShowForgotPassword(true); setForgotMessage(''); }}
                                className="text-sm text-amber-400 hover:text-amber-300 transition-colors touch-manipulation"
                            >
                                Ai uitat parola?
                            </button>
                        </div>

                        <Button
                            type="submit"
                            className="w-full py-6 text-lg font-bold bg-amber-600 hover:bg-amber-500 text-white border-b-4 border-amber-800 active:border-b-0 active:translate-y-1 transition-all"
                            isLoading={loading}
                        >
                            Intră în cont
                        </Button>
                    </form>

                    {showForgotPassword && (
                        <div className="mt-6 p-4 bg-slate-800/60 border border-slate-700 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                                <Lock className="w-4 h-4 text-amber-500" />
                                Resetare Parolă
                            </h3>
                            {forgotMessage ? (
                                <div className="text-green-400 text-sm bg-green-900/20 border border-green-700/50 p-3 rounded-lg">
                                    {forgotMessage}
                                </div>
                            ) : (
                                <form onSubmit={handleForgotPassword} className="space-y-3">
                                    <Input
                                        label="Email cont"
                                        name="forgot_email"
                                        type="email"
                                        value={forgotEmail}
                                        onChange={e => setForgotEmail(e.target.value)}
                                        placeholder="adresa@email.com"
                                        required
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => setShowForgotPassword(false)}
                                            className="flex-1"
                                        >
                                            Anulează
                                        </Button>
                                        <Button
                                            type="submit"
                                            size="sm"
                                            isLoading={forgotLoading}
                                            className="flex-1 bg-amber-600 hover:bg-amber-500"
                                        >
                                            Trimite link reset
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}

                </Card>
                
                <div className="mt-8 text-center space-y-1">
                    <p className="text-slate-600 text-xs uppercase tracking-widest font-bold">
                        Qwan Ki Do - România
                    </p>
                    <p className="text-slate-700 text-[10px] tracking-wide">
                        Realizat cu <span className="text-amber-700">AI</span> de <span className="text-slate-500 font-semibold">Alin Lungu</span>
                    </p>
                </div>
            </div>
        </div>
    );
};
