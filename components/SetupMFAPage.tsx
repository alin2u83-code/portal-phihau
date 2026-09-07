import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigation } from '../contexts/NavigationContext';
import { trimiteCodMfaEmail, verificaCodMfaEmail } from '../services/emailMfaService';
import { Button, Card } from './ui';

type Step = 'loading' | 'cod-trimis';

export function SetupMFAPage() {
    const { navigateTo } = useNavigation();
    const [step, setStep] = useState<Step>('loading');
    const [email, setEmail] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [retrimisLa, setRetrimisLa] = useState<number>(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let mounted = true;

        async function init() {
            setError(null);
            const { data, error: userErr } = await supabase!.auth.getUser();
            if (!mounted) return;
            if (userErr || !data.user?.email) {
                setError(userErr?.message ?? 'Nu s-a putut identifica adresa de email a contului.');
                return;
            }
            setEmail(data.user.email);
            const { error: sendErr } = await trimiteCodMfaEmail(data.user.email);
            if (!mounted) return;
            if (sendErr) { setError(sendErr.message); return; }
            setRetrimisLa(Date.now());
            setStep('cod-trimis');
        }

        init();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        if (step === 'cod-trimis') {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [step]);

    async function retrimiteCod() {
        if (!email) return;
        setLoading(true);
        setError(null);
        const { error: sendErr } = await trimiteCodMfaEmail(email);
        if (sendErr) {
            setError(sendErr.message);
        } else {
            setRetrimisLa(Date.now());
            setCode('');
        }
        setLoading(false);
    }

    async function verifyCode() {
        if (!email || code.length !== 8) return;
        setLoading(true);
        setError(null);

        const { error: verifyErr } = await verificaCodMfaEmail(email, code);

        if (verifyErr) {
            setError('Cod incorect sau expirat. Verifică emailul sau retrimite codul.');
        } else {
            navigateTo('dashboard');
        }
        setLoading(false);
    }

    const poateRetrimite = Date.now() - retrimisLa > 30_000;

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <Card className="w-full max-w-sm space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-2">
                        <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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

                {/* Introdu codul primit pe email */}
                {step === 'cod-trimis' && (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-300 text-center">
                            Am trimis un cod de verificare la <span className="text-white font-medium">{email}</span>.
                            Introdu-l mai jos.
                        </p>
                        <input
                            ref={inputRef}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={8}
                            value={code}
                            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                            onKeyDown={e => e.key === 'Enter' && verifyCode()}
                            placeholder="00000000"
                            className="w-full bg-slate-700/60 border border-slate-600 rounded-xl px-4 py-3 text-white text-center text-2xl font-mono tracking-[0.3em] placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-colors"
                            autoComplete="one-time-code"
                        />
                        <Button
                            onClick={verifyCode}
                            disabled={code.length !== 8 || loading}
                            isLoading={loading}
                            className="w-full"
                        >
                            Verifică și intră în cont
                        </Button>
                        <button
                            onClick={retrimiteCod}
                            disabled={loading || !poateRetrimite}
                            className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
                        >
                            {poateRetrimite ? 'Retrimite codul' : 'Retrimite codul (așteaptă 30s)'}
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
