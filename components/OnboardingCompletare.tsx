import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button, Card, Input } from './ui';
import { User } from '../types';
import { useError } from './ErrorProvider';
import { getAuthErrorMessage } from '../utils/error';
import { checkLeakedPassword } from '../utils/checkLeakedPassword';
import { QwanKiDoLogo } from './Logo';
import { Mail, KeyRound, ShieldCheck, Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface OnboardingCompletareProps {
    currentUser: User;
    onCompleted: () => void;
}

type Step = 'email' | 'cod' | 'parola';

export const OnboardingCompletare: React.FC<OnboardingCompletareProps> = ({ currentUser, onCompleted }) => {
    const [step, setStep] = useState<Step>('email');
    const [emailReal, setEmailReal] = useState('');
    const [cod, setCod] = useState('');
    const [parola, setParola] = useState('');
    const [confirmaParola, setConfirmaParola] = useState('');
    const [showParola, setShowParola] = useState(false);
    const [showConfirma, setShowConfirma] = useState(false);
    const [loading, setLoading] = useState(false);
    const { showError, showSuccess } = useError();

    const handleTrimiteCod = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailReal.trim() || !emailReal.includes('@') || emailReal.endsWith('@frqkd.ro')) {
            showError("Email invalid", "Introdu o adresă de email reală, nu una provizorie.");
            return;
        }
        if (!supabase) return;

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ email: emailReal.trim() });
            if (error) throw error;
            setStep('cod');
        } catch (err: any) {
            showError("Eroare", getAuthErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleVerificaCod = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cod.trim().length < 6) {
            showError("Cod invalid", "Introdu codul de 6 cifre primit pe email.");
            return;
        }
        if (!supabase) return;

        setLoading(true);
        try {
            const { error } = await supabase.auth.verifyOtp({
                email: emailReal.trim(),
                token: cod.trim(),
                type: 'email_change',
            });
            if (error) throw error;
            setStep('parola');
        } catch (err: any) {
            showError("Cod incorect", "Codul introdus nu este valid sau a expirat. Încearcă din nou.");
        } finally {
            setLoading(false);
        }
    };

    const handleSalveazaParola = async (e: React.FormEvent) => {
        e.preventDefault();
        if (parola.length < 8) {
            showError("Parolă invalidă", "Parola trebuie să conțină cel puțin 8 caractere.");
            return;
        }
        if (!/\d/.test(parola)) {
            showError("Parolă invalidă", "Parola trebuie să conțină cel puțin o cifră.");
            return;
        }
        if (parola !== confirmaParola) {
            showError("Parolele nu se potrivesc", "Introdu aceeași parolă în ambele câmpuri.");
            return;
        }
        if (!supabase) return;

        setLoading(true);
        try {
            const { leaked, count } = await checkLeakedPassword(parola);
            if (leaked) {
                showError("Parolă compromisă", `Această parolă a apărut în ${count.toLocaleString()} breșe cunoscute. Alege alta.`);
                setLoading(false);
                return;
            }

            const { error: passError } = await supabase.auth.updateUser({ password: parola });
            if (passError) throw passError;

            const { error: dbError } = await supabase
                .from('sportivi')
                .update({ trebuie_schimbata_parola: false, email: emailReal.trim() })
                .eq('user_id', currentUser.user_id);

            if (dbError) {
                console.warn('Parola schimbată dar DB update eșuat:', dbError.message);
            }

            showSuccess("Cont activat!", "Email și parolă setate cu succes. Bun venit!");
            setTimeout(onCompleted, 1500);
        } catch (err: any) {
            showError("Eroare", getAuthErrorMessage(err));
            setLoading(false);
        }
    };

    const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
        { key: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
        { key: 'cod', label: 'Verificare', icon: <ShieldCheck className="w-4 h-4" /> },
        { key: 'parola', label: 'Parolă', icon: <KeyRound className="w-4 h-4" /> },
    ];

    const stepIndex = steps.findIndex(s => s.key === step);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
            <div className="w-full max-w-md">
                <Card className="border-t-4 border-amber-500 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
                    <QwanKiDoLogo className="mx-auto mb-6 h-20 w-20 border-2" iconClassName="w-12 h-12" />

                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-white">Activează contul</h1>
                        <p className="text-slate-400 mt-1 text-sm">Bun venit, {currentUser.prenume}! Completează datele pentru a accesa portalul.</p>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center justify-between mb-8 px-2">
                        {steps.map((s, i) => (
                            <React.Fragment key={s.key}>
                                <div className="flex flex-col items-center gap-1">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                                        i < stepIndex
                                            ? 'bg-green-600 border-green-600 text-white'
                                            : i === stepIndex
                                            ? 'bg-amber-500 border-amber-500 text-white'
                                            : 'bg-slate-800 border-slate-600 text-slate-500'
                                    }`}>
                                        {i < stepIndex ? <ShieldCheck className="w-4 h-4" /> : s.icon}
                                    </div>
                                    <span className={`text-xs font-medium ${i === stepIndex ? 'text-amber-400' : i < stepIndex ? 'text-green-400' : 'text-slate-500'}`}>
                                        {s.label}
                                    </span>
                                </div>
                                {i < steps.length - 1 && (
                                    <div className={`flex-1 h-0.5 mx-2 ${i < stepIndex ? 'bg-green-600' : 'bg-slate-700'}`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Avertisment cont provizoriu */}
                    {step === 'email' && (
                        <div className="flex items-start gap-3 p-3 mb-5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                            <span>Contul tău are o adresă provizorie <strong>@frqkd.ro</strong>. Introdu emailul tău real pentru a activa contul și a primi un cod de verificare.</span>
                        </div>
                    )}

                    {/* Pas 1: Email */}
                    {step === 'email' && (
                        <form onSubmit={handleTrimiteCod} className="space-y-5">
                            <div className="relative">
                                <Input
                                    label="Adresa ta de email reală"
                                    name="email"
                                    type="email"
                                    value={emailReal}
                                    onChange={e => setEmailReal(e.target.value)}
                                    placeholder="exemplu@gmail.com"
                                    required
                                    className="pl-10"
                                />
                                <Mail className="absolute left-3 top-[34px] w-4 h-4 text-slate-500" />
                            </div>
                            <p className="text-xs text-slate-500 pl-1">
                                Vei primi un cod de 6 cifre la această adresă. Asigură-te că ai acces la ea.
                            </p>
                            <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white" isLoading={loading}>
                                Trimite codul de verificare
                            </Button>
                        </form>
                    )}

                    {/* Pas 2: Cod OTP */}
                    {step === 'cod' && (
                        <form onSubmit={handleVerificaCod} className="space-y-5">
                            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm flex items-start gap-3">
                                <Mail className="w-5 h-5 shrink-0 mt-0.5" />
                                <span>Am trimis un cod de verificare la <strong>{emailReal}</strong>. Verifică și folderul Spam dacă nu apare.</span>
                            </div>
                            <div className="relative">
                                <Input
                                    label="Cod de verificare (6 cifre)"
                                    name="cod"
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={cod}
                                    onChange={e => setCod(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    required
                                    className="pl-10 text-center text-2xl tracking-widest font-mono"
                                />
                                <ShieldCheck className="absolute left-3 top-[34px] w-4 h-4 text-slate-500" />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => { setStep('email'); setCod(''); }}
                                    disabled={loading}
                                >
                                    Schimbă emailul
                                </Button>
                                <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-500 text-white" isLoading={loading}>
                                    Verifică codul
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* Pas 3: Parolă */}
                    {step === 'parola' && (
                        <form onSubmit={handleSalveazaParola} className="space-y-4">
                            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300 text-sm flex items-start gap-3">
                                <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                                <span>Email verificat cu succes! Acum setează o parolă sigură pentru contul tău.</span>
                            </div>
                            <div className="relative">
                                <Input
                                    label="Parolă nouă"
                                    name="parola"
                                    type={showParola ? 'text' : 'password'}
                                    value={parola}
                                    onChange={e => setParola(e.target.value)}
                                    required
                                    className="pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowParola(p => !p)}
                                    className="absolute right-3 top-[30px] p-1 text-slate-400 hover:text-white transition-colors touch-manipulation"
                                    aria-label={showParola ? 'Ascunde parola' : 'Arată parola'}
                                >
                                    {showParola ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            <div className="relative">
                                <Input
                                    label="Confirmă parola"
                                    name="confirmaParola"
                                    type={showConfirma ? 'text' : 'password'}
                                    value={confirmaParola}
                                    onChange={e => setConfirmaParola(e.target.value)}
                                    required
                                    className="pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirma(p => !p)}
                                    className="absolute right-3 top-[30px] p-1 text-slate-400 hover:text-white transition-colors touch-manipulation"
                                    aria-label={showConfirma ? 'Ascunde parola' : 'Arată parola'}
                                >
                                    {showConfirma ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 pl-1">* Minim 8 caractere, cel puțin o cifră.</p>
                            <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white !mt-6" isLoading={loading}>
                                Activează contul
                            </Button>
                        </form>
                    )}
                </Card>

                <div className="mt-6 text-center">
                    <p className="text-slate-700 text-xs">Qwan Ki Do România • Portal Federație</p>
                </div>
            </div>
        </div>
    );
};
