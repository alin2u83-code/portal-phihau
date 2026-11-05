import React, { useEffect, useState } from 'react';
import { Button, Card, Input, Select } from '../ui';
import { incarcaCluburiPublice, trimiteCerereAcces } from '../../services/accesExternService';

interface SolicitaContFormProps {
    competitieId: string;
    emailInitial?: string;
    onTrimis: () => void;
    onInapoi: () => void;
}

const MESAJE_EROARE: Record<string, string> = {
    date_invalide: 'Verifică datele introduse.',
    competitie_indisponibila: 'Această competiție nu mai primește cereri.',
    club_invalid: 'Alege un club din listă.',
    prea_multe_cereri: 'Prea multe cereri în așteptare. Încearcă mai târziu.',
};

export const SolicitaContForm: React.FC<SolicitaContFormProps> = ({ competitieId, emailInitial = '', onTrimis, onInapoi }) => {
    const [email, setEmail] = useState(emailInitial);
    const [nume, setNume] = useState('');
    const [clubId, setClubId] = useState('');
    const [mesaj, setMesaj] = useState('');
    const [cluburi, setCluburi] = useState<{ id: string; nume: string }[]>([]);
    const [seIncarca, setSeIncarca] = useState(true);
    const [loading, setLoading] = useState(false);
    const [eroare, setEroare] = useState<string | null>(null);
    const [trimis, setTrimis] = useState(false);

    useEffect(() => {
        incarcaCluburiPublice().then(({ data }) => { setCluburi(data); setSeIncarca(false); });
    }, []);

    const trimite = async () => {
        const numeCurat = nume.trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) || numeCurat.length < 2 || numeCurat.length > 120 || mesaj.length > 500) {
            setEroare(MESAJE_EROARE.date_invalide); return;
        }
        if (!clubId) { setEroare(MESAJE_EROARE.club_invalid); return; }
        setLoading(true); setEroare(null);
        const rez = await trimiteCerereAcces({ competitieId, email: email.trim(), nume: numeCurat, clubId, mesaj });
        setLoading(false);
        // Același ecran pentru cerere nouă și existentă: serverul întoarce 'ok' în ambele cazuri.
        if (rez === 'ok') { setTrimis(true); onTrimis(); return; }
        setEroare(MESAJE_EROARE[rez] ?? 'Nu am putut trimite cererea. Încearcă din nou.');
    };

    if (trimis) {
        return (
            <Card className="max-w-md mx-auto space-y-4">
                <p className="text-sm text-[var(--t-text)]">
                    Cererea a fost trimisă federației. După aprobare poți intra cu adresa ta de email (primești un cod pe email).
                </p>
                <Button variant="secondary" onClick={onInapoi}>Înapoi la autentificare</Button>
            </Card>
        );
    }

    return (
        <Card className="max-w-md mx-auto space-y-4">
            <h2 className="text-lg font-bold text-[var(--t-text)]">Solicită acces</h2>
            <Input id="acx-s-email" label="Email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
            <Input id="acx-s-nume" label="Nume complet" autoComplete="name" maxLength={120} value={nume} onChange={e => setNume(e.target.value)} />
            <Select id="acx-s-club" label="Club" value={clubId} onChange={e => setClubId(e.target.value)} disabled={seIncarca}>
                <option value="">{seIncarca ? 'Se încarcă...' : 'Alege clubul'}</option>
                {cluburi.map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
            </Select>
            <div className="w-full">
                <label htmlFor="acx-s-mesaj" className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">Mesaj (opțional)</label>
                <textarea id="acx-s-mesaj" rows={3} maxLength={500} value={mesaj} onChange={e => setMesaj(e.target.value)}
                    className="w-full bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-xl px-4 py-3 text-base sm:text-sm text-[var(--t-text)] focus:outline-none focus:ring-2" />
            </div>
            {eroare && <p className="text-sm text-rose-400" role="alert">{eroare}</p>}
            <Button className="w-full" isLoading={loading} onClick={trimite}>Trimite cererea</Button>
            <Button variant="secondary" className="w-full" onClick={onInapoi}>Înapoi la autentificare</Button>
        </Card>
    );
};
