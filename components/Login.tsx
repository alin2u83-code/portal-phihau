import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button, Card, Input } from './ui';

interface LoginProps {}

export const Login: React.FC<LoginProps> = () => {
    const [identifier, setIdentifier] = useState('');
    const [parola, setParola] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!supabase) {
            const msg = 'Clientul Supabase nu este initializat. Verifică variabilele de mediu.';
            console.error("DEBUG:", msg);
            setError(msg);
            setLoading(false);
            return;
        }

        let emailToAuth = identifier.trim();
        
        if (!emailToAuth.includes('@')) {
            const cleanedUsername = emailToAuth.toLowerCase().replace(/\s/g, '');

            const { data, error: usernameError } = await supabase
                .from('sportivi')
                .select('email')
                .eq('username', cleanedUsername)
                .single();
            
            if (!usernameError && data && data.email) {
                emailToAuth = data.email;
            }
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: emailToAuth,
            password: parola,
        });

        if (signInError) {
            console.error("DEBUG:", signInError);
            setError('Date de autentificare invalide. Verificați email/utilizator și parola.');
        } 
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-primary p-4">
            <div className="w-full max-w-md">
                <Card>
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white">Portal Phi Hau Iași</h1>
                        <p className="text-slate-400 mt-2">Autentificare în cont</p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            label="Email sau Nume Utilizator"
                            id="identifier"
                            name="identifier"
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            required
                            autoComplete="username"
                        />
                        <Input
                            label="Parolă"
                            id="password"
                            name="password"
                            type="password"
                            value={parola}
                            onChange={(e) => setParola(e.target.value)}
                            required
                            autoComplete="current-password"
                        />

                        {error && (
                            <p className="text-sm text-red-400 bg-red-900/40 p-3 rounded-md text-center">{error}</p>
                        )}
                        
                        <Button type="submit" className="w-full" size="md" disabled={loading} variant="primary">
                            {loading ? 'Se autentifică...' : 'Autentificare'}
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
};