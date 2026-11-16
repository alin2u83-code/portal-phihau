import React, { useEffect, useState } from 'react';
import { Button, Card, Input } from '../ui';
import { loginParolaAcces } from '../../services/accesExternService';
import { trimiteCodResetParola, reseteazaParolaCuCod } from '../../services/authService';
import { citestePreferintaRamaneConectat, seteazaRamaneConectat } from '../../services/emailMfaService';
import { clasificaEroareAuth } from '../../utils/accesExtern';
import { valideazaParola, MESAJ_CERINTE_PAROLA } from '../../utils/parola';
import { checkLeakedPassword } from '../../utils/checkLeakedPassword';

interface LoginParolaProps {
    onAutentificat: (user: any) => void;
    onSolicita: (email: string) => void;
}

const COOLDOWN_SECUNDE = 60; // cooldown-ul GoTrue între două coduri
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Faza 43 (DEC-EXT): email + parolă; prima autentificare / parolă uitată = cod de 8 cifre pe email (DEC-COD), apoi intră direct.
export const LoginParola: React.FC<LoginParolaProps> = ({ onAutentificat, onSolicita }) => {
    const [pas, setPas] = useState<'login' | 'trimite' | 'cod'>('login');
    const [email, setEmail] = useState('');
    const [parola, setParola] = useState('');
    const [cod, setCod] = useState('');
    const [parolaNoua, setParolaNoua] = useState('');
    const [bifa, setBifa] = useState(citestePreferintaRamaneConectat()); // Q3: implicit bifat
    const [loading, setLoading] = useState(false);
    const [eroare, setEroare] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [asteptare, setAsteptare] = useState(0);

    useEffect(() => {
        if (asteptare <= 0) return;
        const t = setTimeout(() => setAsteptare(a => a - 1), 1000);
        return () => clearTimeout(t);
    }, [asteptare]);

    const mergiLa = (p: 'login' | 'trimite' | 'cod') => { setPas(p); setEroare(null); setInfo(null); };

    const emailValid = (): boolean => {
        if (EMAIL_RE.test(email.trim())) return true;
        setEroare('Introdu o adresă de email validă.');
        return false;
    };

    const intra = async () => {
        if (!emailValid()) return;
        if (!parola) { setEroare('Introdu parola.'); return; }
        setLoading(true); setEroare(null);
        const { user, tip } = await loginParolaAcces(email, parola);
        setLoading(false);
        if (tip === 'ok' && user) { seteazaRamaneConectat(bifa); onAutentificat(user); return; }
        if (tip === 'credentiale') setEroare('Email sau parolă incorecte. Dacă intri prima dată, folosește „Prima autentificare sau ai uitat parola?”.');
        else if (tip === 'limita') setEroare('Prea multe încercări. Încearcă din nou mai târziu.');
        else setEroare('Nu am putut contacta serverul. Încearcă din nou.');
    };

    const trimiteCod = async () => {
        if (!emailValid()) return;
        setLoading(true); setEroare(null);
        const { error } = await trimiteCodResetParola(email.trim());
        setLoading(false);
        if (clasificaEroareAuth(error) === 'limita') { setEroare('Prea multe cereri de cod. Încearcă din nou mai târziu.'); return; }
        // orice altă eroare arată același ecran neutru: nu dezvăluim dacă emailul are cont
        setCod(''); setParolaNoua(''); setPas('cod'); setAsteptare(COOLDOWN_SECUNDE);
        setInfo(`Dacă adresa ${email.trim()} are cont, vei primi un cod de 8 cifre. Verifică și folderul Spam.`);
    };

    const seteazaParola = async () => {
        const v = valideazaParola(parolaNoua);
        if (!v.valid) { setEroare(v.mesaj ?? MESAJ_CERINTE_PAROLA); return; }
        setLoading(true); setEroare(null);
        const scurgere = await checkLeakedPassword(parolaNoua);
        if (scurgere.leaked) {
            setLoading(false);
            setEroare(`Această parolă a apărut în ${scurgere.count} breșe de securitate cunoscute. Alege alta.`);
            return;
        }
        const { user, error, etapa } = await reseteazaParolaCuCod(email.trim(), cod, parolaNoua);
        setLoading(false);
        if (!error && user) { seteazaRamaneConectat(bifa); onAutentificat(user); return; }
        if (etapa === 'parola') setEroare('Parola nu a putut fi setată (poate fi identică cu cea veche). Alege alta și cere un cod nou.');
        else setEroare('Cod incorect sau expirat. Cere un cod nou.');
    };

    const lipesteCod = async () => {
        try {
            const text = (await navigator.clipboard.readText()).replace(/\D/g, '').slice(0, 8);
            if (text) setCod(text); else setEroare('Nu am găsit niciun cod în clipboard. Copiază codul din email și încearcă din nou.');
        } catch {
            setEroare('Browserul nu permite citirea clipboard-ului. Lipește codul manual în câmp.');
        }
    };

    const campEmail = (
        <Input id="acx-email" label="Email" type="email" autoComplete="email" value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { if (pas === 'login') intra(); else if (pas === 'trimite') trimiteCod(); } }} />
    );
    const campBifa = (
        <label className="flex items-center gap-2 text-sm text-[var(--t-text)]">
            <input id="acx-dispozitiv" type="checkbox" checked={bifa} onChange={e => setBifa(e.target.checked)} />
            Dispozitiv personal — rămân conectat
        </label>
    );
    const mesajeStare = (
        <>
            {info && <p className="text-sm text-slate-400">{info}</p>}
            {eroare && <p className="text-sm text-rose-400" role="alert">{eroare}</p>}
        </>
    );
    const inapoi = (
        <button type="button" className="text-sm text-slate-400 hover:text-[var(--t-text)]" onClick={() => mergiLa('login')}>Înapoi la autentificare</button>
    );

    return (
        <Card className="max-w-md mx-auto space-y-4">
            {pas === 'login' && (
                <>
                    <h2 className="text-lg font-bold text-[var(--t-text)]">Autentificare</h2>
                    {campEmail}
                    <Input id="acx-parola" label="Parolă" type="password" autoComplete="current-password" value={parola}
                        onChange={e => setParola(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') intra(); }} />
                    {campBifa}
                    {mesajeStare}
                    <Button className="w-full" isLoading={loading} onClick={intra}>Intră</Button>
                    <button type="button" className="text-sm underline text-[var(--t-text)]" onClick={() => mergiLa('trimite')}>
                        Prima autentificare sau ai uitat parola?
                    </button>
                </>
            )}
            {pas === 'trimite' && (
                <>
                    <h2 className="text-lg font-bold text-[var(--t-text)]">Setează parola</h2>
                    <p className="text-sm text-slate-400">Prima autentificare sau parolă uitată: îți trimitem pe email un cod de 8 cifre (doar codul, fără link). Cu el îți setezi parola.</p>
                    {campEmail}
                    {mesajeStare}
                    <Button className="w-full" isLoading={loading} onClick={trimiteCod}>Trimite codul</Button>
                    {inapoi}
                </>
            )}
            {pas === 'cod' && (
                <>
                    <h2 className="text-lg font-bold text-[var(--t-text)]">Setează parola</h2>
                    <Input id="acx-cod" label="Cod din email" inputMode="numeric" autoComplete="one-time-code" maxLength={8}
                        value={cod} onChange={e => setCod(e.target.value.replace(/\D/g, '').slice(0, 8))} />
                    <Button variant="secondary" size="sm" onClick={lipesteCod}>Lipește codul copiat din email</Button>
                    <Input id="acx-parola-noua" label="Parolă nouă" type="password" autoComplete="new-password" value={parolaNoua}
                        onChange={e => setParolaNoua(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && cod.length === 8 && parolaNoua) seteazaParola(); }} />
                    <p className="text-xs text-slate-400">{MESAJ_CERINTE_PAROLA}</p>
                    {campBifa}
                    {mesajeStare}
                    <Button className="w-full" isLoading={loading} disabled={cod.length !== 8 || !parolaNoua} onClick={seteazaParola}>Setează parola și intră</Button>
                    <div className="flex items-center justify-between">
                        {inapoi}
                        <button type="button" className="text-sm text-[var(--t-text)] disabled:text-slate-500" disabled={asteptare > 0 || loading} onClick={trimiteCod}>
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
