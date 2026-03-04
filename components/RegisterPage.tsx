import React, { useState } from 'react';
import { createAccount } from '../services/authService';
import { Button, Card, Input } from './ui';
import { Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, ShieldCheck, ArrowRight } from 'lucide-react';

const QwanKiDoLogo: React.FC = () => (
    <div className="mx-auto mb-6 h-24 w-24 flex items-center justify-center rounded-full bg-slate-800 border-2 border-amber-500 shadow-lg shadow-amber-500/20">
        <svg viewBox="0 0 100 100" className="w-14 h-14 text-amber-500">
            <path d="M50 10 L90 50 L50 90 L10 50 Z" stroke="currentColor" strokeWidth="6" fill="none" />
            <circle cx="50" cy="50" r="12" fill="currentColor" />
            <path d="M30 50 L70 50 M50 30 L50 70" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
        </svg>
    </div>
);

export const RegisterPage: React.FC = () => {
    const [formData, setFormData] = useState({
        nume: '',
        prenume: '',
        email: '',
        parola: '',
        confirmParola: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (formData.parola !== formData.confirmParola) {
            setMessage({ type: 'error', text: 'Parolele nu se potrivesc.' });
            return;
        }

        if (formData.parola.length < 6) {
            setMessage({ type: 'error', text: 'Parola trebuie să aibă cel puțin 6 caractere.' });
            return;
        }

        setLoading(true);

        try {
            const result = await createAccount({
                email: formData.email,
                parola: formData.parola,
                nume: formData.nume,
                prenume: formData.prenume
            });

            if (!result.success) {
                throw new Error(result.error);
            }

            setMessage({ 
                type: 'success', 
                text: 'Cont creat cu succes! Vă rugăm să verificați email-ul pentru confirmare.' 
            });
            setFormData({
                nume: '',
                prenume: '',
                email: '',
                parola: '',
                confirmParola: ''
            });

        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'A apărut o eroare la înregistrare.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
            <div className="w-full max-w-md">
                <Card className="border-t-4 border-amber-500 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
                    <QwanKiDoLogo />
                    
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
                            <UserPlus className="w-6 h-6 text-amber-500" />
                            Înregistrare Qwan Ki Do
                        </h1>
                        <p className="text-slate-400 mt-2 font-medium italic">
                            "Calea disciplinei și a respectului."
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
                                    <ShieldCheck className="w-5 h-5 shrink-0 opacity-70" />
                                ) : (
                                    <ShieldCheck className="w-5 h-5 shrink-0 opacity-70" />
                                )}
                            </div>
                            <p className="text-sm font-medium leading-relaxed">
                                {message.text}
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleSignUp} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <Input 
                                    label="Nume" 
                                    name="nume" 
                                    type="text" 
                                    value={formData.nume} 
                                    onChange={handleChange} 
                                    required 
                                    placeholder="Popescu"
                                    className="pl-10"
                                />
                                <User className="absolute left-3 top-[34px] w-4 h-4 text-slate-500" />
                            </div>
                            <div className="relative">
                                <Input 
                                    label="Prenume" 
                                    name="prenume" 
                                    type="text" 
                                    value={formData.prenume} 
                                    onChange={handleChange} 
                                    required 
                                    placeholder="Ion"
                                    className="pl-10"
                                />
                                <User className="absolute left-3 top-[34px] w-4 h-4 text-slate-500" />
                            </div>
                        </div>

                        <div className="relative">
                            <Input 
                                label="Email" 
                                name="email" 
                                type="email" 
                                value={formData.email} 
                                onChange={handleChange} 
                                required 
                                placeholder="exemplu@email.com"
                                className="pl-10"
                            />
                            <Mail className="absolute left-3 top-[34px] w-4 h-4 text-slate-500" />
                        </div>

                        <div className="relative">
                            <Input 
                                label="Parolă" 
                                name="parola" 
                                type="password" 
                                value={formData.parola} 
                                onChange={handleChange} 
                                required 
                                placeholder="••••••••"
                                className="pl-10"
                            />
                            <Lock className="absolute left-3 top-[34px] w-4 h-4 text-slate-500" />
                        </div>

                        <div className="relative">
                            <Input 
                                label="Confirmă Parola" 
                                name="confirmParola" 
                                type="password" 
                                value={formData.confirmParola} 
                                onChange={handleChange} 
                                required 
                                placeholder="••••••••"
                                className="pl-10"
                            />
                            <Lock className="absolute left-3 top-[34px] w-4 h-4 text-slate-500" />
                        </div>

                        <Button 
                            type="submit" 
                            className="w-full py-6 text-lg font-bold bg-amber-600 hover:bg-amber-500 text-white border-b-4 border-amber-800 active:border-b-0 active:translate-y-1 transition-all" 
                            isLoading={loading}
                        >
                            Creează Cont Sportiv
                        </Button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                        <p className="text-slate-500 text-sm">
                            Ai deja un cont?{' '}
                            <Link to="/login" className="text-amber-500 hover:text-amber-400 font-bold inline-flex items-center gap-1 transition-colors">
                                Autentifică-te <ArrowRight className="w-3 h-3" />
                            </Link>
                        </p>
                    </div>
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
