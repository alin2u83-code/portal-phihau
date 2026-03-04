import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Button, Input } from './ui';
import { LogIn, AlertCircle, Lock, Mail } from 'lucide-react';

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (!supabase) throw new Error('Clientul Supabase nu este inițializat.');

            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                if (authError.message === 'Invalid login credentials') {
                    throw new Error('Email sau parolă incorectă.');
                }
                throw authError;
            }

            if (data.user) {
                // Navigarea către pagina principală
                navigate('/');
            }
        } catch (err: any) {
            setError(err.message || 'A apărut o eroare la autentificare.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white p-4">
            <div className="w-full max-w-md space-y-8">
                {/* Header Section */}
                <div className="text-center">
                    <div className="mx-auto h-20 w-20 bg-[#8B00FF]/10 rounded-full flex items-center justify-center mb-6">
                        <LogIn className="h-10 w-10 text-[#8B00FF]" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                        Bine ai revenit!
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Autentifică-te în contul tău CS Phi Hau
                    </p>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-red-700 font-medium">{error}</p>
                    </div>
                )}

                {/* Login Form */}
                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="space-y-5">
                        <div className="relative">
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8B00FF] focus:border-transparent transition-all sm:text-sm"
                                    placeholder="nume@exemplu.com"
                                />
                            </div>
                        </div>

                        <div className="relative">
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Parolă
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8B00FF] focus:border-transparent transition-all sm:text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                name="remember-me"
                                type="checkbox"
                                className="h-4 w-4 text-[#8B00FF] focus:ring-[#8B00FF] border-gray-300 rounded"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                                Ține-mă minte
                            </label>
                        </div>

                        <div className="text-sm">
                            <a href="#" className="font-medium text-[#8B00FF] hover:text-[#7000CC] transition-colors">
                                Ai uitat parola?
                            </a>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-[#8B00FF] hover:bg-[#7000CC] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B00FF] disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#8B00FF]/30 hover:shadow-[#8B00FF]/40 active:scale-[0.98]"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Se autentifică...
                                </span>
                            ) : (
                                'Autentificare'
                            )}
                        </button>
                    </div>
                </form>

                {/* Footer */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        Nu ai un cont încă?{' '}
                        <Link to="/register" className="font-bold text-[#8B00FF] hover:text-[#7000CC] transition-colors">
                            Înregistrează-te acum
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
