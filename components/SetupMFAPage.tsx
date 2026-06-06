import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigation } from '../contexts/NavigationContext';
import { Button, Card } from './ui';

export function SetupMFAPage() {
    const { navigateTo } = useNavigation();
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [factorId, setFactorId] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'enroll' | 'verify'>('enroll');

    async function enrollTOTP() {
        setLoading(true);
        setError(null);
        const { data, error: enrollError } = await supabase!.auth.mfa.enroll({
            factorType: 'totp',
            issuer: 'Portal PhiHau',
        });
        if (enrollError) {
            setError(enrollError.message);
        } else {
            setQrCode(data.totp.qr_code);
            setFactorId(data.id);
            setStep('verify');
        }
        setLoading(false);
    }

    useEffect(() => {
        let mounted = true;

        async function run() {
            setLoading(true);
            setError(null);
            const { data, error: enrollError } = await supabase!.auth.mfa.enroll({
                factorType: 'totp',
                issuer: 'Portal PhiHau',
            });
            if (!mounted) return;
            if (enrollError) {
                setError(enrollError.message);
            } else {
                setQrCode(data.totp.qr_code);
                setFactorId(data.id);
                setStep('verify');
            }
            setLoading(false);
        }

        run();
        return () => { mounted = false; };
    }, []);

    async function verifyTOTP() {
        if (!factorId || code.length !== 6) return;
        setLoading(true);
        setError(null);

        const { data: challengeData, error: challengeError } = await supabase!.auth.mfa.challenge({ factorId });
        if (challengeError) {
            setError(challengeError.message);
            setLoading(false);
            return;
        }

        const { error: verifyError } = await supabase!.auth.mfa.verify({
            factorId,
            challengeId: challengeData.id,
            code,
        });

        if (verifyError) {
            setError('Cod invalid. Verifică ora dispozitivului și încearcă din nou.');
        } else {
            navigateTo('dashboard');
        }
        setLoading(false);
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <Card className="w-full max-w-md space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-2">
                        <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-white">Configurare autentificare în doi pași</h1>
                    <p className="text-sm text-slate-400">
                        Contul tău de administrator necesită autentificare cu doi factori (2FA) pentru securitate sporită.
                    </p>
                </div>

                {/* Eroare */}
                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
                        <p className="text-sm text-rose-400">{error}</p>
                    </div>
                )}

                {/* Pasul enroll — loading QR */}
                {step === 'enroll' && loading && (
                    <div className="flex items-center justify-center py-8">
                        <svg className="animate-spin h-8 w-8 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                    </div>
                )}

                {/* Pasul verify — QR + input */}
                {step === 'verify' && (
                    <div className="space-y-5">
                        {/* Instrucțiuni */}
                        <ol className="space-y-2 text-sm text-slate-300">
                            <li className="flex gap-2">
                                <span className="shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-bold">1</span>
                                <span>Instalează o aplicație de autentificare (Google Authenticator, Authy etc.)</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-bold">2</span>
                                <span>Scanează codul QR de mai jos</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-bold">3</span>
                                <span>Introdu codul de 6 cifre generat de aplicație</span>
                            </li>
                        </ol>

                        {/* QR Code */}
                        {qrCode && (
                            <div className="flex justify-center">
                                <div className="bg-white p-3 rounded-xl">
                                    <img
                                        src={qrCode}
                                        alt="QR Code pentru autentificare 2FA"
                                        className="w-48 h-48"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Input cod */}
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Cod de verificare
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                onKeyDown={(e) => e.key === 'Enter' && verifyTOTP()}
                                placeholder="000000"
                                className="w-full bg-slate-700/60 border border-slate-600 rounded-xl px-4 py-3 text-white text-center text-2xl font-mono tracking-[0.5em] placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-colors"
                                autoFocus
                                autoComplete="one-time-code"
                            />
                        </div>

                        {/* Buton verificare */}
                        <Button
                            onClick={verifyTOTP}
                            disabled={code.length !== 6 || loading}
                            isLoading={loading}
                            className="w-full"
                        >
                            Activează autentificarea în doi pași
                        </Button>
                    </div>
                )}

                {/* Eroare enroll cu retry */}
                {step === 'enroll' && !loading && error && (
                    <Button variant="secondary" onClick={enrollTOTP} className="w-full">
                        Încearcă din nou
                    </Button>
                )}

                {/* Footer informativ */}
                <p className="text-xs text-slate-500 text-center">
                    Această măsură de securitate este obligatorie pentru conturile de administrator.
                </p>
            </Card>
        </div>
    );
}
