import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Modal } from '../ui';
import { incarcaInstructoriClub, deschideSesiuneActor } from '../../services/autorModificariService';
import type { SesiuneActor } from '../../types';

const ROL_LABEL = { INSTRUCTOR: 'Instructor', ADMIN_CLUB: 'Administrator club' } as const;
const ALTCINEVA = '__altcineva__';
const NUME_MIN = 2;
const NUME_MAX = 120;

interface Props {
    isOpen: boolean;
    /** La intrarea în competiție dialogul nu se poate închide fără alegere (D-19). */
    obligatoriu: boolean;
    competitieId: string;
    onAles: (s: SesiuneActor) => void;
    onClose: () => void;
}

export const AlegeActorModal: React.FC<Props> = ({ isOpen, obligatoriu, competitieId, onAles, onClose }) => {
    const [ales, setAles] = useState<string>('');
    const [numeLiber, setNumeLiber] = useState('');
    const [eroare, setEroare] = useState('');
    const [seTrimite, setSeTrimite] = useState(false);

    const { data: persoane = [], isLoading } = useQuery({
        queryKey: ['extern', 'instructori-club'],
        queryFn: async () => (await incarcaInstructoriClub()).data,
        enabled: isOpen,
    });

    const liber = ales === ALTCINEVA;
    const numeCurat = numeLiber.trim();
    const valid = liber ? numeCurat.length >= NUME_MIN && numeCurat.length <= NUME_MAX : !!ales;

    const continua = async () => {
        if (!valid || seTrimite) return;
        setSeTrimite(true);
        setEroare('');
        const { data, error } = await deschideSesiuneActor(
            liber ? { competitieId, actorNume: numeCurat } : { competitieId, actorUserId: ales },
        );
        setSeTrimite(false);
        if (error || !data) { setEroare('Nu am putut salva alegerea. Încearcă din nou.'); return; }
        onAles(data);
    };

    return (
        <Modal isOpen={isOpen} persistent={obligatoriu} onClose={onClose} title="Cine lucrează?">
            <div className="space-y-3">
                <p className="text-sm">
                    Alegerea este declarativă și nu este verificată. Numele ales apare în jurnalul modificărilor ca autor al înscrierilor,
                    echipelor și schimbărilor de grad făcute din acest cont. O persoană aleasă «Altcineva» este marcată ca nume liber.
                </p>
                {isLoading && <p className="text-sm opacity-70">Se încarcă persoanele clubului...</p>}
                {!isLoading && persoane.length === 0 && (
                    <p className="text-sm opacity-70">Clubul nu are instructori înregistrați în aplicație.</p>
                )}
                <div className="space-y-2" role="radiogroup" aria-label="Cine lucrează">
                    {persoane.map(p => (
                        <label key={p.user_id} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="radio" name="actor" checked={ales === p.user_id} onChange={() => setAles(p.user_id)} />
                            <span>{p.nume} · {ROL_LABEL[p.rol] ?? p.rol}</span>
                        </label>
                    ))}
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="actor" checked={liber} onChange={() => setAles(ALTCINEVA)} />
                        <span>Altcineva</span>
                    </label>
                </div>
                {liber && (
                    <Input
                        label="Nume și prenume"
                        value={numeLiber}
                        maxLength={NUME_MAX}
                        onChange={e => setNumeLiber(e.target.value)}
                        error={numeLiber.length > 0 && numeCurat.length < NUME_MIN ? `Minim ${NUME_MIN} caractere` : undefined}
                    />
                )}
                {eroare && <p className="text-sm text-red-500" role="alert">{eroare}</p>}
                <div className="flex justify-end gap-2">
                    {!obligatoriu && <Button variant="secondary" onClick={onClose}>Anulează</Button>}
                    <Button onClick={() => { void continua(); }} disabled={!valid} isLoading={seTrimite}>Continuă</Button>
                </div>
            </div>
        </Modal>
    );
};
