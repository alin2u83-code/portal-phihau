import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useError } from '../components/ErrorProvider';
import { Button } from '../components/ui';

const QwanKiDoLogo: React.FC = () => (
    <div className="mx-auto mb-8 h-24 w-24 flex items-center justify-center rounded-full bg-slate-900/50 border-2 border-slate-700/50 shadow-xl">
        <svg viewBox="0 0 100 100" className="w-12 h-12 text-[var(--brand-secondary)]">
            <path d="M50 10 L90 50 L50 90 L10 50 Z" stroke="currentColor" strokeWidth="8" fill="none" />
            <circle cx="50" cy="50" r="15" fill="currentColor" />
        </svg>
    </div>
);

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const { showError } = useError();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!supabase) {
            showError('Eroare Configurare', 'Clientul bazei de date nu este configurat.');
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        setLoading(false);
        
        if (error) {
            showError('Autentificare Eșuată', 'Date de autentificare invalide. Verificați email/utilizator și parola.');
        } else {
            navigate('/', { replace: true });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-deep-navy">
            <div className="w-full max-w-md animate-fade-in-down">
                <div className="glass-card p-8 md:p-10">
                    <QwanKiDoLogo />
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-black text-white tracking-tighter">Portal C.S. Phi Hau</h1>
                        <p className="text-slate-400 mt-1">Calea disciplinei începe aici.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-bold text-slate-400 mb-2">Email</label>
                            <input id="email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" 
                                className="w-full bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
                        </div>
                        <div>
                            <label htmlFor="password"  className="block text-sm font-bold text-slate-400 mb-2">Parolă</label>
                            <input id="password" name="parola" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" 
                                className="w-full bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                            <label htmlFor="rememberMe" className="flex items-center gap-2 text-slate-400 cursor-pointer">
                                <input id="rememberMe" name="rememberMe" type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                                    className="h-4 w-4 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500" />
                                Ține-mă minte
                            </label>
                            <a href="#" className="font-medium text-blue-400 hover:text-blue-300">Am uitat parola</a>
                        </div>
                        
                        <Button type="submit" disabled={loading} 
                            className="w-full !mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center min-h-[48px]">
                            {loading ? 'Se autentifică...' : 'Autentificare'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
