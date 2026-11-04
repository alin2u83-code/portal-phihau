import React, { useState, useEffect } from 'react';
import { listeazaDispozitiveIncredere, revocaDispozitivIncredere, revocaDispozitiveIncredere, ZILE_DISPOZITIV_INCREDERE, type DispozitivIncredere } from '../services/emailMfaService';
import { User, Rol, Sportiv } from '../types';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { Button, Card, Input, Badge } from './ui';
import { ArrowLeftIcon, MailIcon, LockIcon, CheckCircleIcon } from './icons';
import { getRoleDisplayName, getRoleDescription, getRoleIcon } from '../hooks/useUserRoles';
import { getAuthErrorMessage } from '../utils/error';
import { checkLeakedPassword } from '../utils/checkLeakedPassword';
import { valideazaParola, MESAJ_CERINTE_PAROLA } from '../utils/parola';
import { inregistreazaEmailAuth } from '../services/authEmailAuditService';
import { NotificationPermissionWidget } from './NotificationPermissionWidget';

const DispozitiveIncredereCard: React.FC = () => {
    const [lista, setLista] = useState<DispozitivIncredere[] | null>(null);
    const [ocupat, setOcupat] = useState(false);
    const [eroare, setEroare] = useState<string | null>(null);
    const incarca = async (esteMontat: () => boolean = () => true) => {
        try {
            const l = await listeazaDispozitiveIncredere();
            if (esteMontat()) setLista(l);
        } catch {
            if (esteMontat()) setEroare('Nu am putut încărca lista de dispozitive. Reîncearcă mai târziu.');
        }
    };
    useEffect(() => {
        let montat = true;
        incarca(() => montat);
        return () => { montat = false; };
    }, []);

    const revoca = async (d: DispozitivIncredere) => {
        setOcupat(true);
        setEroare(null);
        try {
            const ok = await revocaDispozitivIncredere(d.id, d.curent);
            if (!ok) setEroare('Dispozitivul nu a putut fi eliminat. Încearcă din nou.');
            await incarca();
        } catch {
            setEroare('Dispozitivul nu a putut fi eliminat. Încearcă din nou.');
        } finally {
            setOcupat(false);
        }
    };
    const deconecteazaTot = async () => {
        if (!window.confirm('Te deconectezi de pe toate dispozitivele (inclusiv acesta). Continui?')) return;
        setOcupat(true);
        setEroare(null);
        try {
            await revocaDispozitiveIncredere();
            const { error } = await supabase.auth.signOut({ scope: 'global' });
            if (error) setEroare('Deconectarea de pe toate dispozitivele a eșuat. Încearcă din nou.');
        } catch {
            setEroare('Deconectarea de pe toate dispozitivele a eșuat. Încearcă din nou.');
        } finally {
            setOcupat(false);
        }
    };
    const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('ro-RO') : '—';

    return (
        <Card>
            <h2 className="text-base font-semibold text-[var(--t-text)] mb-1">Dispozitive de încredere</h2>
            <p className="text-xs text-[var(--t-text-muted,#94a3b8)] mb-4">
                Pe aceste dispozitive nu ți se cere cod {ZILE_DISPOZITIV_INCREDERE} de zile de la ultima folosire.
            </p>
            {eroare && <p className="text-sm text-red-500 mb-2" role="alert">{eroare}</p>}
            {lista && lista.length === 0 && !eroare && <p className="text-sm">Niciun dispozitiv de încredere.</p>}
            <ul className="space-y-2">
                {(lista ?? []).map(d => (
                    <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                        <span>
                            {d.eticheta || 'Dispozitiv'} {d.curent && <Badge variant="blue">acesta</Badge>}
                            <span className="block text-xs opacity-70">Ultima folosire: {fmt(d.ultima_folosire)} · valabil până: {fmt(d.expira_la)}</span>
                        </span>
                        <Button size="sm" variant="secondary" disabled={ocupat} onClick={() => revoca(d)}>Elimină</Button>
                    </li>
                ))}
            </ul>
            <Button className="mt-4" variant="danger" disabled={ocupat} onClick={deconecteazaTot}>Deconectează de pe toate dispozitivele</Button>
        </Card>
    );
};

interface AccountSettingsProps {
    currentUser: User;
    onBack: () => void;
    userRoles: any[];
    setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ currentUser, onBack, userRoles, setCurrentUser, setSportivi }) => {
    const { showError, showSuccess } = useError();
    
    // State combinat pentru datele personale și de securitate
    const [formData, setFormData] = useState({
        nume: currentUser.nume,
        prenume: currentUser.prenume,
        email: currentUser.email || '',
        parola: '',
        confirmParola: ''
    });
    const [loading, setLoading] = useState(false);
    
    const [roleLoading, setRoleLoading] = useState<string | null>(null);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) { showError("Eroare", "Client Supabase neinițializat."); return; }
        if (formData.parola && formData.parola !== formData.confirmParola) { showError("Eroare", "Parolele nu se potrivesc."); return; }
        if (formData.parola) {
            const validare = valideazaParola(formData.parola);
            if (!validare.valid) { showError("Eroare", validare.mesaj!); return; }
        }

        setLoading(true);

        try {
            if (formData.parola) {
                const { leaked, count } = await checkLeakedPassword(formData.parola);
                if (leaked) {
                    showError("Parolă Compromisă", `Această parolă a apărut în ${count.toLocaleString()} breșe de securitate cunoscute. Te rugăm să alegi o altă parolă.`);
                    setLoading(false);
                    return;
                }
            }

            // Pas 1: Actualizează datele de autentificare dacă este necesar
            const authUpdates: any = {};
            if (formData.email !== currentUser.email) authUpdates.email = formData.email;
            if (formData.parola) authUpdates.password = formData.parola;

            if (Object.keys(authUpdates).length > 0) {
                const { error: authError } = await supabase.auth.updateUser(authUpdates);
                if (authUpdates.email) inregistreazaEmailAuth('schimbare_email', !authError);
                if (authError) throw authError;
            }

            // Pas 2: Actualizează profilul în tabela 'sportivi'
            const profileUpdates = {
                nume: formData.nume,
                prenume: formData.prenume,
                email: formData.email,
            };
            const { data, error: profileError } = await supabase.from('sportivi').update(profileUpdates).eq('id', currentUser.id).select('*, cluburi(*)').single();
            if (profileError) throw profileError;

            // Pas 3: Actualizează starea globală a aplicației
            const updatedUser = { ...currentUser, ...data };

            setCurrentUser(updatedUser);
            setSportivi(prev => prev.map(s => s.id === currentUser.id ? updatedUser as Sportiv : s));
            
            showSuccess("Succes", "Profilul a fost actualizat.");
            setFormData(p => ({...p, parola: '', confirmParola: ''}));
        } catch (err: any) {
            showError("Eroare la actualizare", getAuthErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };
    
    const handleSetPrimaryRole = async (roleContext: any) => {
        if (!supabase) return;
        const contextKey = `${roleContext.sportiv_id}-${roleContext.rol_denumire}`;
        setRoleLoading(contextKey);

        const { error } = await supabase.rpc('switch_primary_context', {
            p_target_context_id: roleContext.id
        });

        if (error) {
            showError("Eroare la setarea rolului", error.message);
            setRoleLoading(null);
        } else {
            showSuccess("Rol Principal Actualizat", "Aplicația se va reîncărca pentru a aplica noul context.");
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        }
    };
    
    return (
        <div className="space-y-8 animate-fade-in-down">
            <header>
                <h1 className="text-2xl font-semibold text-[var(--t-text)]">Setări Cont & Profiluri</h1>
                <p className="text-sm text-[var(--t-text-muted)]">Actualizează-ți datele de securitate și gestionează profilurile de lucru.</p>
            </header>

            <Card>
                <form onSubmit={handleSaveProfile} className="space-y-6">
                    <h2 className="text-base font-semibold text-[var(--t-text)] mb-4">Date Personale & Securitate</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Nume" name="nume" value={formData.nume} onChange={handleFormChange} required/>
                        <Input label="Prenume" name="prenume" value={formData.prenume} onChange={handleFormChange} required/>
                    </div>
                    <div>
                        <Input label="Email de Autentificare" name="email" type="email" value={formData.email} onChange={handleFormChange} required/>
                        {formData.email !== (currentUser.email || '') && (
                            <p className="mt-1 text-xs text-amber-400">
                                Modificarea emailului va trimite un link de confirmare la noua adresă. Contul rămâne activ cu emailul vechi până la confirmare.
                            </p>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Parolă Nouă (lasă gol pentru a o păstra)" name="parola" type="password" value={formData.parola} onChange={handleFormChange}/>
                        <Input label="Confirmare Parolă Nouă" name="confirmParola" type="password" value={formData.confirmParola} onChange={handleFormChange}/>
                    </div>
                    <p className="text-xs text-[var(--t-text-muted)] pl-1">{MESAJ_CERINTE_PAROLA}</p>
                    <div className="flex justify-end pt-4">
                        <Button type="submit" variant="success" isLoading={loading}>Salvează Modificările</Button>
                    </div>
                </form>
            </Card>

            <Card>
                <h2 className="text-base font-semibold text-[var(--t-text)] mb-4">Profilurile Mele</h2>
                <p className="text-sm text-[var(--t-text-muted)] mb-6">Alege profilul principal pe care dorești să-l folosești la următoarea autentificare. Acesta va determina permisiunile și datele vizibile la pornirea aplicației.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(userRoles || []).map((role, index) => {
                        const Icon = getRoleIcon(role.rol_denumire);
                        const isPrimary = role.is_primary;
                        const contextKey = `${role.sportiv_id}-${role.rol_denumire}`;
                        return (
                            <div key={contextKey} className={`relative p-6 rounded-lg transition-all duration-300 ${isPrimary ? 'bg-[var(--t-surface-2)] border-2 border-[var(--t-primary)]' : 'bg-[var(--t-surface)] border border-[var(--t-border)]'}`}>
                                {isPrimary && <Badge variant="blue" className="absolute top-3 right-3">Principal</Badge>}
                                <div className="flex items-center gap-4">
                                    <Icon className={`w-10 h-10 shrink-0 ${isPrimary ? 'text-[var(--t-primary)]' : 'text-[var(--t-text-muted)]'}`} />
                                    <div>
                                        <h3 className="font-semibold text-base text-[var(--t-text)]">{getRoleDisplayName(role)}</h3>
                                        <p className="text-xs text-[var(--t-text-muted)]">{role.club?.nume || 'Federație'}</p>
                                    </div>
                                </div>
                                {!isPrimary && (
                                    <div className="mt-4 pt-4 border-t border-[var(--t-border)]">
                                        <Button 
                                            variant="primary" 
                                            className="w-full"
                                            onClick={() => handleSetPrimaryRole(role)}
                                            isLoading={roleLoading === contextKey}
                                            disabled={!!roleLoading}
                                        >
                                            Setează ca Principal
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </Card>

            <DispozitiveIncredereCard />

            <Card>
                <h2 className="text-base font-semibold text-[var(--t-text)] mb-4">Notificări push</h2>
                <NotificationPermissionWidget />
            </Card>
        </div>
    );
};
