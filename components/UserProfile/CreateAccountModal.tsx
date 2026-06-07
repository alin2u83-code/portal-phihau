import React, { useState, useEffect } from 'react';
import { Sportiv, User, Rol } from '../../types';
import { Modal, Input, Button, CredentialeContModal } from '../ui';
import { useError } from '../ErrorProvider';
import { useRoleAssignment } from '../../hooks/useRoleAssignment';
import { Link, Copy, Check, Wand2, KeyRound } from 'lucide-react';

type Metoda = 'parola' | 'magic-link';

export const CreateAccountModal: React.FC<{
    sportiv: Sportiv;
    onClose: () => void;
    onAccountCreated: () => void;
    currentUser: User;
    allRoles: Rol[];
}> = ({ sportiv, onClose, onAccountCreated, currentUser, allRoles }) => {
    const { showError } = useError();
    const [metoda, setMetoda] = useState<Metoda>('magic-link');
    const [form, setForm] = useState({ email: '', parola: '' });
    const [credentiale, setCredentiale] = useState<{ email: string; parola: string } | null>(null);
    const [magicLink, setMagicLink] = useState<{ link: string; username: string; tempEmail: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const [loadingMagic, setLoadingMagic] = useState(false);
    const { createAccountAndAssignRole, loading } = useRoleAssignment(currentUser, allRoles);

    useEffect(() => {
        const sanitize = (str: string) => (str || '').toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, '');
        const nume = sanitize(sportiv.nume);
        const prenume = sanitize(sportiv.prenume);
        const defaultEmail = sportiv.email || `${nume}.${prenume}@phihau.ro`;
        const defaultPassword = `${nume}.1234!`;
        setForm({ email: defaultEmail, parola: defaultPassword });
    }, [sportiv]);

    const handleSaveParola = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.email || !form.parola) {
            showError("Date Incomplete", "Emailul și parola sunt obligatorii.");
            return;
        }

        const sportivRole = allRoles.find(r => r.nume === 'SPORTIV');
        if (!sportivRole) {
            showError("Eroare", "Rolul 'SPORTIV' nu a fost găsit.");
            return;
        }

        const result = await createAccountAndAssignRole(form.email, form.parola, sportiv, [sportivRole]);
        if (result.success) {
            onAccountCreated();
            setCredentiale({ email: form.email, parola: result.generatedPassword ?? form.parola });
        } else {
            showError("Eroare", result.error || "A apărut o eroare la crearea contului.");
        }
    };

    const handleGenerareMagicLink = async () => {
        setLoadingMagic(true);
        try {
            const response = await fetch('/api/genereaza-magic-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sportiv_id: sportiv.id, roles: ['SPORTIV'] }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Eroare la generare.');
            setMagicLink({ link: result.link, username: result.username, tempEmail: result.tempEmail });
            onAccountCreated();
        } catch (err: any) {
            showError("Eroare", err.message);
        } finally {
            setLoadingMagic(false);
        }
    };

    const handleCopyLink = () => {
        if (!magicLink?.link) return;
        navigator.clipboard.writeText(magicLink.link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    if (credentiale) {
        return (
            <CredentialeContModal
                isOpen={true}
                onClose={() => { setCredentiale(null); onClose(); }}
                email={credentiale.email}
                parola={credentiale.parola}
                numeSportiv={`${sportiv.prenume} ${sportiv.nume}`}
            />
        );
    }

    return (
        <Modal isOpen={true} onClose={onClose} title={`Generează Cont — ${sportiv.prenume} ${sportiv.nume}`}>
            {/* Selector metodă */}
            <div className="flex gap-2 mb-6">
                <button
                    type="button"
                    onClick={() => setMetoda('magic-link')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                        metoda === 'magic-link'
                            ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                            : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                    }`}
                >
                    <Wand2 className="w-4 h-4" />
                    Link Magic
                    <span className="text-xs opacity-70">(recomandat)</span>
                </button>
                <button
                    type="button"
                    onClick={() => setMetoda('parola')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                        metoda === 'parola'
                            ? 'border-slate-400 bg-slate-700/50 text-slate-300'
                            : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                    }`}
                >
                    <KeyRound className="w-4 h-4" />
                    Email + Parolă
                </button>
            </div>

            {/* Magic Link */}
            {metoda === 'magic-link' && !magicLink && (
                <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm space-y-2">
                        <p className="font-semibold flex items-center gap-2"><Wand2 className="w-4 h-4" />Cum funcționează:</p>
                        <ul className="space-y-1 text-xs text-blue-200/80 list-disc list-inside">
                            <li>Se creează un cont provizoriu cu email <strong>@frqkd.ro</strong></li>
                            <li>Primești un link unic de conectare — trimite-l sportivului pe WhatsApp</li>
                            <li>La prima deschidere, sportivul setează emailul real și parola</li>
                            <li>Contul devine permanent după verificarea emailului</li>
                        </ul>
                    </div>
                    <Button
                        type="button"
                        className="w-full bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center gap-2"
                        isLoading={loadingMagic}
                        onClick={handleGenerareMagicLink}
                    >
                        <Wand2 className="w-4 h-4" />
                        Generează Link Magic
                    </Button>
                </div>
            )}

            {/* Magic Link generat — afișare și copiere */}
            {metoda === 'magic-link' && magicLink && (
                <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300 text-sm space-y-1">
                        <p className="font-semibold">Cont creat cu succes!</p>
                        <p className="text-xs text-green-200/70">Username: <strong>{magicLink.username}</strong></p>
                        <p className="text-xs text-green-200/70">Email provizoriu: <strong>{magicLink.tempEmail}</strong></p>
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm text-slate-300 font-medium flex items-center gap-2">
                            <Link className="w-4 h-4 text-amber-400" />
                            Link de conectare (trimite pe WhatsApp)
                        </p>
                        <div className="flex gap-2">
                            <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono truncate">
                                {magicLink.link}
                            </div>
                            <Button
                                type="button"
                                variant={copied ? 'success' : 'secondary'}
                                size="sm"
                                onClick={handleCopyLink}
                                className="shrink-0 flex items-center gap-1"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copiat!' : 'Copiază'}
                            </Button>
                        </div>
                        <p className="text-xs text-slate-500">
                            Link-ul expiră în 24 de ore. Sportivul va fi ghidat să seteze emailul real și parola la prima conectare.
                        </p>
                    </div>

                    <Button type="button" variant="secondary" className="w-full" onClick={onClose}>
                        Închide
                    </Button>
                </div>
            )}

            {/* Email + Parolă (clasic) */}
            {metoda === 'parola' && (
                <form onSubmit={handleSaveParola} className="space-y-4">
                    <Input label="Email de Autentificare" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
                    <Input label="Parolă Inițială" value={form.parola} onChange={e => setForm(p => ({ ...p, parola: e.target.value }))} required />
                    <div className="flex justify-end pt-4 gap-2 border-t border-slate-700">
                        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                        <Button type="submit" variant="success" isLoading={loading}>Generează și Asociază</Button>
                    </div>
                </form>
            )}
        </Modal>
    );
};
