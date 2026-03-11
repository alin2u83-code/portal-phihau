import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAuthForm } from '../hooks/useAuthForm';
import { Button, Card, Input } from './ui';
import { LogIn, Mail, Lock, ShieldCheck, ArrowRight } from 'lucide-react';

const QwanKiDoLogo: React.FC = () => (
    <div className="mx-auto mb-6 h-24 w-24 flex items-center justify-center rounded-full bg-slate-800 border-2 border-amber-500 shadow-lg shadow-amber-500/20">
        <svg viewBox="0 0 100 100" className="w-14 h-14 text-amber-500">
            <path d="M50 10 L90 50 L50 90 L10 50 Z" stroke="currentColor" strokeWidth="6" fill="none" />
            <circle cx="50" cy="50" r="12" fill="currentColor" />
            <path d="M30 50 L70 50 M50 30 L50 70" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
        </svg>
    </div>
);

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { login, loading, error: authError, clearStates } = useAuth();
    const { formData, errors, handleChange, validate, resetForm } = useAuthForm('login');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        
        clearStates();

        try {
            const data = await login(formData.email || '', formData.parola || '');
            if (data?.user) {
                navigate('/');
            }
        } catch (err: any) {
            // Eroarea este deja gestionată în useAuth și expusă prin `authError`
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
            <div className="w-full max-w-md">
                <Card className="border-t-4 border-amber-500 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
                    <QwanKiDoLogo />
                    
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
                                label="Email" 
                                name="email" 
                                type="email" 
                                value={formData.email || ''} 
                                onChange={(e) => { handleChange(e); clearStates(); }} 
                                required 
                                placeholder="exemplu@email.com"
                                className={`pl-10 ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                            />
                            <Mail className="absolute left-3 top-[34px] w-4 h-4 text-slate-500" />
                            {errors.email && <p className="text-xs text-red-400 mt-1 ml-1">{errors.email}</p>}
                        </div>

                        <div className="relative">
                            <Input 
                                label="Parolă" 
                                name="parola" 
                                type="password" 
                                value={formData.parola || ''} 
                                onChange={(e) => { handleChange(e); clearStates(); }} 
                                required 
                                placeholder="••••••••"
                                className={`pl-10 ${errors.parola ? 'border-red-500 focus:ring-red-500' : ''}`}
                            />
                            <Lock className="absolute left-3 top-[34px] w-4 h-4 text-slate-500" />
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
                        </div>

                        <Button 
                            type="submit" 
                            className="w-full py-6 text-lg font-bold bg-amber-600 hover:bg-amber-500 text-white border-b-4 border-amber-800 active:border-b-0 active:translate-y-1 transition-all" 
                            isLoading={loading}
                        >
                            Intră în cont
                        </Button>
                    </form>

                </Card>
                
                <div className="mt-8 text-center">
                    <p className="text-slate-600 text-xs uppercase tracking-widest font-bold">
                        Qwan Ki Do - România
                    </p>
                </div>
            </div>
        </div>
    );
};
