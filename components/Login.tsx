
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button, Card, Input } from './ui';

interface LoginProps {}

export const Login: React.FC<LoginProps> = () => {
    const [email, setEmail] = useState('');
    const [parola, setParola] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: parola,
        });

        if (error) {
            setError('Email sau parolă incorectă. Vă rugăm să reîncercați.');
        } 
        // Nu este nevoie de else, onAuthStateChange din App.tsx va prelua controlul
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <div className="w-full max-w-md">
                <Card>
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white">Portal Phi Hau Iași</h1>
                        <p className="text-slate-400 mt-2">Autentificare în cont</p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            label="Adresă de Email"
                            id="email"
                            name="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
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
                            <p className="text-sm text-red-400 bg-red-800/50 p-3 rounded-md text-center">{error}</p>
                        )}
                        
                        <Button type="submit" className="w-full" size="md" disabled={loading}>
                            {loading ? 'Se autentifică...' : 'Autentificare'}
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
};