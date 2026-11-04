import React, { useEffect, useState } from 'react';
import { Button, Card, Input } from '../ui';
import { trimiteCodAcces, verificaCodAcces } from '../../services/accesExternService';

interface LoginOtpProps {
    emailInitial?: string;
    onAutentificat: (user: any) => void;
    onFaraCont: (email: string) => void;
    onSolicita: (email: string) => void;
}

const COOLDOWN_SECUNDE = 60; // cooldown-ul GoTrue între două coduri

export const LoginOtp: React.FC<LoginOtpProps> = ({ emailInitial = '', onAutentificat, onFaraCont, onSolicita }) => {
    const [pas, setPas] = useState<'email' | 'cod'>('email');
    const [email, setEmail] = useState(emailInitial);
    const [cod, setCod] = useState('');
    const [loading, setLoading] = useState(false);
    const [eroare, setEroare] = useState<string | null>(null);
    const [asteptare, setAsteptare] = useState(0);

    useEffect(() => {
        if (asteptare <= 0) return;
        const t = setTimeout(() => setAsteptare(a => a - 1), 1000);
        return () => clearTimeout(t);
    }, [asteptare]);

    const trimiteCod = async () => {
        const adresa = email.trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adresa)) { setEroare('Introdu o adresă de email validă.'); return; }
        setLoading(true); setEroare(null);
        const { tip } = await trimiteCodAcces(adresa);
        setLoading(false);
        if (tip === 'ok') { setCod(''); setPas('cod'); setAsteptare(COOLDOWN_SECUNDE); }
        else if (tip === 'fara_cont') onFaraCont(adresa);
        else if (tip === 'limita') setEroare('Prea multe cereri de cod. Încearcă din nou mai târziu.');
        else setEroare('Nu am putut trimite codul. Încearcă din nou.');
    };

    const verifica = async () => {
        setLoading(true); setEroare(null);
        const { user, error } = await verificaCodAcces(email, cod);
        setLoading(false);
        if (error || !user) { setEroare('Cod incorect sau expirat. Verifică emailul sau retrimite codul.'); return; }
        onAutentificat(user);
    };

    const lipesteCod = async () => {
        try {
            const text = (await navigator.clipboard.readText()).replace(/\D/g, '').slice(0, 8);
            if (text) setCod(text); else setEroare('Nu am găsit niciun cod în clipboard. Copiază codul din email și încearcă din nou.');
        } catch {
            setEroare('Browserul nu permite citirea clipboard-ului. Lipește codul manual în câmp.');
        }
    };

    return (
        <Card className="max-w-md mx-auto space-y-4">
            {pas === 'email' ? (
                <>
                    <h2 className="text-lg font-bold text-[var(--t-text)]">Autentificare</h2>
                    <p className="text-sm text-slate-400">Introdu adresa de email. Îți trimitem un cod de 8 cifre (nu un link).</p>
                    <Input id="acx-email" label="Email" type="email" autoComplete="email" value={email}
                        onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') trimiteCod(); }} />
                    {eroare && <p className="text-sm text-rose-400" role="alert">{eroare}</p>}
                    <Button className="w-full" isLoading={loading} onClick={trimiteCod}>Trimite codul</Button>
                </>
            ) : (
                <>
                    <h2 className="text-lg font-bold text-[var(--t-text)]">Introdu codul</h2>
                    <p className="text-sm text-slate-400">
                        Am trimis un cod de 8 cifre la <strong>{email.trim()}</strong>. Emailul conține doar codul, nu un link.
                    </p>
                    <Input id="acx-cod" label="Cod din email" inputMode="numeric" autoComplete="one-time-code" maxLength={8}
                        value={cod} onChange={e => setCod(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        onKeyDown={e => { if (e.key === 'Enter' && cod.length === 8) verifica(); }} />
                    <Button variant="secondary" size="sm" onClick={lipesteCod}>Lipește codul copiat din email</Button>
                    {eroare && <p className="text-sm text-rose-400" role="alert">{eroare}</p>}
                    <Button className="w-full" isLoading={loading} disabled={cod.length !== 8} onClick={verifica}>Verifică și intră</Button>
                    <div className="flex items-center justify-between text-sm">
                        <button type="button" className="text-slate-400 hover:text-[var(--t-text)]" onClick={() => { setPas('email'); setEroare(null); }}>Schimbă emailul</button>
                        <button type="button" className="text-[var(--t-text)] disabled:text-slate-500" disabled={asteptare > 0 || loading} onClick={trimiteCod}>
                            {asteptare > 0 ? `Retrimite codul (${asteptare}s)` : 'Retrimite codul'}
                        </button>
                    </div>
                </>
            )}
            <button type="button" className="text-sm underline text-[var(--t-text)]" onClick={() => onSolicita(email.trim())}>
                Nu ai cont? Solicită acces
            </button>
        </Card>
    );
};
