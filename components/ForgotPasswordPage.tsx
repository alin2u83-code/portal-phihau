import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Button, Card, Input } from './ui';
import { Mail, ArrowLeft } from 'lucide-react';
import { useError } from './ErrorProvider';

export const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const { showError } = useError();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        // Construct the redirect URL for password reset
        const redirectTo = `${window.location.origin}/reset-password`;

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo,
        });

        if (error) {
            showError("Eroare", error.message);
        } else {
            setSubmitted(true);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a]">
            <Card className="w-full max-w-md p-8 bg-slate-900/80 border-t-4 border-amber-500">
                <h2 className="text-2xl font-bold text-white mb-6">Recuperare parolă</h2>
                {submitted ? (
                    <div className="text-slate-300">
                        <p>Am trimis un email la <strong>{email}</strong> cu instrucțiuni pentru resetarea parolei.</p>
                        <Link to="/login" className="mt-6 block text-amber-500 hover:text-amber-400 font-bold">Înapoi la autentificare</Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input 
                            label="Email" 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                            placeholder="exemplu@email.com"
                        />
                        <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-500" isLoading={loading}>
                            Trimite instrucțiuni
                        </Button>
                        <Link to="/login" className="flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-4 h-4" /> Înapoi la autentificare
                        </Link>
                    </form>
                )}
            </Card>
        </div>
    );
};
