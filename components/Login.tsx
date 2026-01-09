import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button, Card, Input } from './ui';
import { logoBase64 } from '../assets/logo';

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
            setError('Clientul Supabase nu este initializat. Verifică variabilele de mediu.');
            setLoading(false);
            return;
        }

        let emailToAuth = identifier.trim();
        
        // Dacă nu conține '@', tratăm input-ul ca pe un username.
        if (!emailToAuth.includes('@')) {
            // Curățăm username-ul la fel cum o facem la salvare pentru a asigura potrivirea.
            const cleanedUsername = emailToAuth.toLowerCase().replace(/\s/g, '');

            const { data, error: usernameError } = await supabase
                .from('sportivi')
                .select('email')
                .eq('username', cleanedUsername)
                .single();
            
            // Dacă găsim utilizatorul și are un email valid, îl folosim pentru autentificare.
            if (!usernameError && data && data.email) {
                emailToAuth = data.email;
            }
            // Dacă nu-l găsim, lăsăm 'emailToAuth' ca fiind username-ul introdus,
            // iar supabase.auth.signInWithPassword va eșua, declanșând eroarea noastră generică.
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: emailToAuth,
            password: parola,
        });

        if (signInError) {
            // Afișăm un mesaj generic pentru securitate, indiferent de tipul erorii.
            setError('Date de autentificare invalide. Verificați email/utilizator și parola.');
        } 
        // Nu este nevoie de `else`, onAuthStateChange din App.tsx va prelua controlul la succes.
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-primary p-4">
            <div className="w-full max-w-md">
                <Card>
                    <div className="text-center mb-8">
                        <img src={logoBase64} alt="Logo" className="w-20 h-20 mx-auto mb-4" />
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