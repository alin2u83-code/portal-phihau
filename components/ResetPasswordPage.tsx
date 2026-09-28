import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Button, Card, Input } from './ui';
import { useError } from './ErrorProvider';
import { checkLeakedPassword } from '../utils/checkLeakedPassword';
import { valideazaParola, MESAJ_CERINTE_PAROLA } from '../utils/parola';
import { Eye, EyeOff } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const { showError, showSuccess } = useError();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validare = valideazaParola(password);
        if (!validare.valid) {
            showError("Parolă Invalidă", validare.mesaj!);
            return;
        }
        setLoading(true);

        const { leaked, count } = await checkLeakedPassword(password);
        if (leaked) {
            showError("Parolă Compromisă", `Această parolă a apărut în ${count.toLocaleString()} breșe de securitate cunoscute. Te rugăm să alegi o altă parolă.`);
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.updateUser({
            password: password
        });

        if (error) {
            showError("Eroare", error.message);
        } else {
            showSuccess("Succes", "Parola a fost resetată cu succes!");
            navigate('/login');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a]">
            <Card className="w-full max-w-md p-8 bg-slate-900/80 border-t-4 border-amber-500">
                <h2 className="text-2xl font-bold text-white mb-6">Setează o parolă nouă</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <Input
                            label="Parolă nouă"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            className="pr-12"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(prev => !prev)}
                            className="absolute right-3 top-[34px] p-1 text-slate-400 hover:text-white active:text-amber-400 transition-colors touch-manipulation"
                            aria-label={showPassword ? 'Ascunde parola' : 'Arată parola'}
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 pl-1">{MESAJ_CERINTE_PAROLA}</p>
                    <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-500" isLoading={loading}>
                        Salvează parola
                    </Button>
                </form>
            </Card>
        </div>
    );
};
