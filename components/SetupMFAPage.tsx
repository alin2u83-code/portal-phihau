import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigation } from '../contexts/NavigationContext';
import { Button, Card } from './ui';

type Step = 'loading' | 'send-code' | 'enter-code';

export function SetupMFAPage() {
    const { navigateTo } = useNavigation();
    const [step, setStep] = useState<Step>('loading');
    const [factorId, setFactorId] = useState<string | null>(null);
    const [challengeId, setChallengeId] = useState<string | null>(null);
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

            // Caută factor verificat (orice tip)
            const allFactors = [
                ...(factors?.totp ?? []),
                ...((factors as any)?.email ?? []),
                ...(factors?.phone ?? []),
            ];
            const verified = allFactors.find(f => f.status === 'verified');
            if (verified) {
                setFactorId(verified.id);
                setStep('send-code');
                return;
            }

            // Unenroll factori neverificați (curăță starea)
            const unverified = allFactors.filter(f => f.status === 'unverified');
            for (const f of unverified) {
                await supabase!.auth.mfa.unenroll({ factorId: f.id });
            }

            // Enrollează factor email
            const { data, error: enrollErr } = await supabase!.auth.mfa.enroll({
                factorType: 'email' as any,
            });
            if (!mounted) return;
            if (enrollErr) { setError(enrollErr.message); return; }

            setFactorId(data.id);
            setStep('send-code');
        }

        init();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        if (step === 'enter-code') {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [step]);

    async function sendCode() {
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
            setError('Cod incorect sau expirat. Solicită un cod nou.');
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

                {/* Pasul 1: trimite cod */}
                {step === 'send-code' && (
                    <div className="space-y-4">
                        <div className="bg-slate-700/40 border border-slate-600/50 rounded-xl px-4 py-3 text-sm text-slate-300">
                            Îți trimitem un cod de verificare pe adresa de email. Introdu codul în pasul următor.
                        </div>
                        <Button
                            onClick={sendCode}
                            disabled={loading}
                            isLoading={loading}
                            className="w-full"
                        >
                            Trimite cod pe email
                        </Button>
                    </div>
                )}

                {/* Pasul 2: introdu codul */}
                {step === 'enter-code' && (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-300 text-center">
                            Cod trimis pe email. Verifică inbox-ul (și folderul Spam).
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
                        <button
                            onClick={sendCode}
                            disabled={loading}
                            className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            Nu ai primit codul? Trimite din nou
                        </button>
                    </div>
                )}

                <p className="text-xs text-slate-600 text-center">
                    Măsură de securitate obligatorie pentru conturile de administrator.
                </p>
            </Card>
        </div>
    );
}
