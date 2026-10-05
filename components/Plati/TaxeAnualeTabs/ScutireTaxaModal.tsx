import React, { useEffect, useState } from 'react';
import type { TipTaxaFederala } from '../../../types';
import { Modal, Button } from '../../ui';
import { formatPerioadaTaxa } from '../../../utils/anFiscal';

const MAX_MOTIV = 500;

interface ScutireTaxaModalProps {
    isOpen: boolean;
    onClose: () => void;
    numeSportiv: string;
    tip: TipTaxaFederala;
    an: number;
    scutitAcum: boolean;
    motivCurent?: string | null;
    onConfirm: (motiv: string) => Promise<boolean>;
}

/** Marcheaza (cu motiv obligatoriu) sau anuleaza scutirea unui sportiv de o taxa anuala. */
export const ScutireTaxaModal: React.FC<ScutireTaxaModalProps> = ({
    isOpen,
    onClose,
    numeSportiv,
    tip,
    an,
    scutitAcum,
    motivCurent,
    onConfirm,
}) => {
    const [motiv, setMotiv] = useState('');
    const [seIncarca, setSeIncarca] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setMotiv('');
            setSeIncarca(false);
        }
    }, [isOpen]);

    const perioada = formatPerioadaTaxa(tip, an);
    const titlu = scutitAcum ? `Anulează scutirea — taxă ${tip} ${perioada}` : `Scutire taxă ${tip} ${perioada}`;

    const handleConfirm = async () => {
        setSeIncarca(true);
        try {
            const ok = await onConfirm(scutitAcum ? '' : motiv.trim());
            if (ok) onClose();
        } finally {
            setSeIncarca(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={seIncarca ? () => {} : onClose} title={titlu}>
            <div className="space-y-4">
                <p className="text-sm text-[var(--t-text)]">
                    Sportiv: <span className="font-semibold">{numeSportiv}</span>
                </p>

                {scutitAcum ? (
                    <>
                        <div className="rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] p-3">
                            <p className="text-xs uppercase font-bold text-slate-400 mb-1">Motiv scutire</p>
                            <p className="text-sm text-[var(--t-text)] whitespace-pre-wrap break-words">{motivCurent || '—'}</p>
                        </div>
                        <p className="text-sm text-[var(--t-text-muted)]">
                            Taxa va fi facturată din nou (sau rămâne în așteptare dacă prețul nu e setat).
                        </p>
                    </>
                ) : (
                    <div>
                        <label htmlFor="motiv-scutire-taxa" className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">
                            Motiv (obligatoriu)
                        </label>
                        <textarea
                            id="motiv-scutire-taxa"
                            rows={4}
                            maxLength={MAX_MOTIV}
                            value={motiv}
                            onChange={e => setMotiv(e.target.value)}
                            className="w-full bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-xl px-3 py-2 text-sm text-[var(--t-text)] focus:outline-none focus:ring-2 focus:border-[var(--t-input-focus-ring)] transition-all"
                            style={{ '--tw-ring-color': 'var(--t-input-focus-ring)' } as React.CSSProperties}
                            placeholder="Ex: sportiv de performanță, scutire aprobată de comitet"
                        />
                        <p className="text-xs text-slate-500 text-right mt-1">
                            {motiv.length}/{MAX_MOTIV}
                        </p>
                    </div>
                )}

                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose} disabled={seIncarca}>
                        Renunță
                    </Button>
                    <Button
                        variant={scutitAcum ? 'warning' : 'primary'}
                        onClick={handleConfirm}
                        isLoading={seIncarca}
                        disabled={seIncarca || (!scutitAcum && motiv.trim().length === 0)}
                    >
                        {scutitAcum ? 'Anulează scutirea' : 'Marchează scutit'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
