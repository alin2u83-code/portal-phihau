import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '../components/ui';
import { useAuthStore } from '../store/authStore';

const QwanKiDoLogo: React.FC = () => (
    <div className="mx-auto mb-6 h-20 w-20 flex items-center justify-center rounded-full bg-slate-700 border-2 border-slate-600">
        <svg viewBox="0 0 100 100" className="w-12 h-12 text-amber-400">
            <path d="M50 10 L90 50 L50 90 L10 50 Z" stroke="currentColor" strokeWidth="8" fill="none" />
            <circle cx="50" cy="50" r="15" fill="currentColor" />
        </svg>
    </div>
);

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, isLoading } = useAuthStore();
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        try {
            await login(email, password);
            navigate('/', { replace: true });
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Date de autentificare invalide.' });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-main)]">
            <div className="w-full max-w-md">
                <Card className="border-t-4 border-amber-400">
                    <QwanKiDoLogo />
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-white">Portal Phi Hau Iași</h1>
                        <p className="text-slate-400 mt-1">Calea disciplinei începe aici.</p>
                    </div>

                    {message && (
                        <p className={`text-sm text-center p-3 rounded-md mb-4 ${message.type === 'error' ? 'bg-red-900/40 text-red-300' : 'bg-green-900/40 text-green-300'}`}>
                            {message.text}
                        </p>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <Input label="Email sau Nume Utilizator" name="email" type="text" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username" />
                        <Input label="Parolă" name="parola" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                        <Button type="submit" className="w-full !mt-6" size="md" isLoading={isLoading} variant="primary">Autentificare</Button>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default Login;
