import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigation } from '../contexts/NavigationContext';
import { Button, Card } from './ui';

type Step = 'loading' | 'scan-qr' | 'enter-code';

export function SetupMFAPage() {
    const { navigateTo } = useNavigation();
    const [step, setStep] = useState<Step>('loading');
    const [factorId, setFactorId] = useState<string | null>(null);
    const [challengeId, setChallengeId] = useState<string | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [secret, setSecret] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let mounted = true;

        async function init() {
            setError(null);

            const { data: factors, error: listErr } = await supabase!.auth.mfa.listFactors();
            if (!mounted) return;
            if (listErr) { setError(listErr.message); return; }

            // Caută factor verificat (totp sau phone) — `.totp`/`.phone` conțin doar factori 'verified' per tipul SDK-ului
            const verifiedFactors = [
                ...(factors?.totp ?? []),
                ...(factors?.phone ?? []),
            ];
            const verified = verifiedFactors[0];
            if (verified) {
                setFactorId(verified.id);
                await startChallenge(verified.id);
                return;
            }

            // Unenroll factori neverificați (curăță starea) — `.all` conține atât verified cât și unverified
            const unverified = (factors?.all ?? []).filter(f => f.status === 'unverified');
            for (const f of unverified) {
                await supabase!.auth.mfa.unenroll({ factorId: f.id });
            }

            // Enrollează factor TOTP
            const { data, error: enrollErr } = await supabase!.auth.mfa.enroll({
                factorType: 'totp',
                issuer: 'PhiHau',
            });
            if (!mounted) return;
            if (enrollErr) { setError(enrollErr.message); return; }

            setFactorId(data.id);
            const rawQrCode = data.totp.qr_code;
            setQrCode(rawQrCode.startsWith('data:') ? rawQrCode : `data:image/svg+xml;utf-8,${rawQrCode}`);
            setSecret(data.totp.secret);
            setStep('scan-qr');
        }

        async function startChallenge(id: string) {
            const { data, error: challengeErr } = await supabase!.auth.mfa.challenge({ factorId: id });
            if (!mounted) return;
            if (challengeErr) { setError(challengeErr.message); return; }
            setChallengeId(data.id);
            setCode('');
            setStep('enter-code');
        }

        init();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        if (step === 'enter-code') {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [step]);

    async function continueToVerify() {
        if (!factorId) return;
        setLoading(true);
        setError(null);

        const { data, error: challengeErr } = await supabase!.auth.mfa.challenge({ factorId });
        if (challengeErr) {
            setError(challengeErr.message);
        } else {
            setChallengeId(data.id);
            setCode('');
            setStep('enter-code');
        }
        setLoading(false);
    }

    async function verifyCode() {
        if (!factorId || !challengeId || code.length !== 6) return;
        setLoading(true);
        setError(null);

        const { error: verifyErr } = await supabase!.auth.mfa.verify({
            factorId,
            challengeId,
            code,
        });

        if (verifyErr) {
            setError('Cod incorect sau expirat. Reintrodu codul din aplicația de autentificare.');
        } else {
            navigateTo('dashboard');
        }
        setLoading(false);
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <Card className="w-full max-w-sm space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-2">
                        <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-white">Verificare identitate</h1>
                    <p className="text-sm text-slate-400">
                        Contul de administrator necesită un pas suplimentar de securitate.
                    </p>
                </div>

                {/* Eroare */}
                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
                        <p className="text-sm text-rose-400">{error}</p>
                    </div>
                )}

                {/* Loading inițial */}
                {step === 'loading' && !error && (
                    <div className="flex items-center justify-center py-6">
                        <svg className="animate-spin h-7 w-7 text-amber-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                    </div>
                )}

                {/* Pasul 1: scanează codul QR */}
                {step === 'scan-qr' && (
                    <div className="space-y-4">
                        <div className="bg-slate-700/40 border border-slate-600/50 rounded-xl px-4 py-3 text-sm text-slate-300 space-y-3">
                            <p>Scanează codul QR cu o aplicație de autentificare (Google Authenticator, Authy) și introdu codul de 6 cifre generat.</p>
                            {qrCode && (
                                <div className="flex justify-center bg-white rounded-lg p-3">
                                    <img src={qrCode} alt="Cod QR pentru configurare autentificare în doi pași" className="w-40 h-40" />
                                </div>
                            )}
                            {secret && (
                                <div className="space-y-1">
                                    <p className="text-xs text-slate-400">Nu poți scana codul? Introdu manual cheia:</p>
                                    <p className="font-mono text-xs text-slate-200 break-all bg-slate-800/60 rounded px-2 py-1">{secret}</p>
                                </div>
                            )}
                        </div>
                        <Button
                            onClick={continueToVerify}
                            disabled={loading}
                            isLoading={loading}
                            className="w-full"
                        >
                            Am scanat codul, continuă
                        </Button>
                    </div>
                )}

                {/* Pasul 2: introdu codul */}
                {step === 'enter-code' && (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-300 text-center">
                            Introdu codul de 6 cifre din aplicația de autentificare.
                        </p>
                        <input
                            ref={inputRef}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            value={code}
                            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            onKeyDown={e => e.key === 'Enter' && verifyCode()}
                            placeholder="000000"
                            className="w-full bg-slate-700/60 border border-slate-600 rounded-xl px-4 py-3 text-white text-center text-2xl font-mono tracking-[0.5em] placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-colors"
                            autoComplete="one-time-code"
                        />
                        <Button
                            onClick={verifyCode}
                            disabled={code.length !== 6 || loading}
                            isLoading={loading}
                            className="w-full"
                        >
                            Verifică și intră în cont
                        </Button>
                        {qrCode && (
                            <button
                                onClick={() => setStep('scan-qr')}
                                disabled={loading}
                                className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors"
                            >
                                Înapoi la codul QR
                            </button>
                        )}
                    </div>
                )}

                <p className="text-xs text-slate-600 text-center">
                    Măsură de securitate obligatorie pentru conturile de administrator.
                </p>
            </Card>
        </div>
    );
}
