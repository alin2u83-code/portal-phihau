import React, { useEffect, useState } from 'react';
import type { NotificareTaxaAnuala } from '../../../types';
import { Modal, Button, Badge, EmptyState } from '../../ui';
import { ChatBubbleLeftEllipsisIcon, CopyIcon, CheckIcon, ExclamationTriangleIcon } from '../../icons';
import { useError } from '../../ErrorProvider';
import { formateazaSumaLei, construiesteLinkWhatsApp } from '../../../utils/notificariRestantieri';

interface NotificariTaxeAnualeModalProps {
    isOpen: boolean;
    onClose: () => void;
    titlu: string;
    notificari: NotificareTaxaAnuala[];
}

const eticheteSursa: Record<string, string> = {
    sportiv: 'tel. sportiv',
    reprezentant_familie: 'tel. reprezentant familie',
    membru_familie: 'tel. alt membru familie',
};

/**
 * Lista de notificari WhatsApp semi-automate pentru taxele anuale (generare / restante).
 * Primeste lista deja calculata; mesajele se trimit manual (link wa.me sau copiere), fara trimitere automata.
 */
export const NotificariTaxeAnualeModal: React.FC<NotificariTaxeAnualeModalProps> = ({ isOpen, onClose, titlu, notificari }) => {
    const { showError } = useError();
    const [mesajeEditate, setMesajeEditate] = useState<Record<string, string>>({});
    const [deschise, setDeschise] = useState<Set<string>>(new Set());
    const [copiatCheie, setCopiatCheie] = useState<string | null>(null);

    // La fiecare deschidere se reseteaza starea locala.
    useEffect(() => {
        if (!isOpen) return;
        setMesajeEditate({});
        setDeschise(new Set());
        setCopiatCheie(null);
    }, [isOpen]);

    const copiazaText = (text: string, cheie: string) => {
        // Fara await: setState-ul pentru "Copiat!" trebuie sa ruleze sincron cu gestul utilizatorului.
        navigator.clipboard.writeText(text).catch(() => {
            showError('Copiere eșuată', 'Browserul nu a permis accesul la clipboard — selectează textul manual din căsuță.');
        });
        setCopiatCheie(cheie);
        setDeschise(prev => new Set(prev).add(cheie));
        setTimeout(() => setCopiatCheie(prev => (prev === cheie ? null : prev)), 2000);
    };

    const totalLei = notificari.reduce((sum, n) => sum + n.suma, 0);
    const faraTelefon = notificari.filter(n => !n.telefonWa).length;
    const numarDeschise = notificari.filter(n => deschise.has(n.cheie)).length;

    const copiazaToate = () => {
        const text = notificari
            .map(n => {
                const mesaj = mesajeEditate[n.cheie] ?? n.mesaj;
                const antet = `${n.telefonAfisat ?? 'FĂRĂ TELEFON'} — ${n.numeSportivi.join(', ')}`;
                return `${antet}\n${mesaj}`;
            })
            .join('\n\n');
        copiazaText(text, '__toate__');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={titlu}>
            <div className="space-y-4">
                <div className="flex justify-end">
                    <Button variant="secondary" size="sm" onClick={copiazaToate} disabled={notificari.length === 0}>
                        {copiatCheie === '__toate__' ? (
                            <><CheckIcon className="w-4 h-4 mr-1" /> Copiat!</>
                        ) : (
                            <><CopyIcon className="w-4 h-4 mr-1" /> Copiază toate</>
                        )}
                    </Button>
                </div>

                <p className="text-sm text-[var(--t-text-muted)]">
                    {notificari.length} destinatari · {formateazaSumaLei(totalLei)} lei
                    {faraTelefon > 0 && <> · {faraTelefon} fără telefon valid</>}
                    {notificari.length > 0 && <> · {numarDeschise}/{notificari.length} deschise</>}
                </p>
                <p className="text-xs text-slate-500">Mesajele se trimit manual — aplicația nu trimite nimic automat.</p>

                {notificari.length === 0 ? (
                    <EmptyState
                        icon={<ChatBubbleLeftEllipsisIcon className="w-10 h-10 text-slate-500" />}
                        title="Nicio notificare de trimis"
                        description="Nu există destinatari pentru această listă."
                    />
                ) : (
                    <div className="space-y-2">
                        {notificari.map(n => {
                            const mesajCurent = mesajeEditate[n.cheie] ?? n.mesaj;
                            const esteDeschisa = deschise.has(n.cheie);
                            return (
                                <div
                                    key={n.cheie}
                                    className={`rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] p-3 space-y-2 ${esteDeschisa ? 'opacity-60' : ''}`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {esteDeschisa && <CheckIcon className="w-4 h-4 text-green-500 shrink-0" />}
                                            <span className="font-semibold text-white truncate">{n.numeSportivi.join(', ')}</span>
                                        </div>
                                        <span className="font-bold text-white shrink-0">{formateazaSumaLei(n.suma)} lei</span>
                                    </div>

                                    {n.telefonWa ? (
                                        <p className="text-xs text-slate-400">
                                            {n.telefonAfisat}{' '}
                                            {n.sursaTelefon && (
                                                <span className="text-slate-500">({eticheteSursa[n.sursaTelefon] ?? n.sursaTelefon})</span>
                                            )}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-red-400 flex items-center gap-1">
                                            <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                                            Fără telefon valid
                                            {n.telefonAfisat && <> — număr invalid: {n.telefonAfisat}</>}
                                        </p>
                                    )}

                                    {n.areAchitariPartiale && <Badge variant="amber">Achitat parțial — verifică suma</Badge>}

                                    <textarea
                                        rows={3}
                                        className="w-full bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-xl px-3 py-2 text-sm text-[var(--t-text)] focus:outline-none focus:ring-2 focus:border-[var(--t-input-focus-ring)] transition-all"
                                        style={{ '--tw-ring-color': 'var(--t-input-focus-ring)' } as React.CSSProperties}
                                        value={mesajCurent}
                                        onChange={e => setMesajeEditate(prev => ({ ...prev, [n.cheie]: e.target.value }))}
                                    />

                                    <div className="flex flex-wrap gap-2">
                                        <Button variant="secondary" size="sm" onClick={() => copiazaText(mesajCurent, n.cheie)}>
                                            {copiatCheie === n.cheie ? (
                                                <><CheckIcon className="w-4 h-4 mr-1" /> Copiat!</>
                                            ) : (
                                                <><CopyIcon className="w-4 h-4 mr-1" /> Copiază mesaj</>
                                            )}
                                        </Button>
                                        {n.telefonWa && (
                                            <a
                                                href={construiesteLinkWhatsApp(n.telefonWa, mesajCurent)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={() => setDeschise(prev => new Set(prev).add(n.cheie))}
                                                className="bg-green-700 hover:bg-green-600 text-white text-sm font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"
                                            >
                                                <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
                                                WhatsApp
                                            </a>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Modal>
    );
};
