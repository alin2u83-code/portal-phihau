import React from 'react';
import { Button, Select } from '../../ui';
import type { TipTaxaFederala } from '../../../types';
import { getPerioadaTaxa, formatPerioadaTaxa } from '../../../utils/anFiscal';

interface SelectorPerioadaTaxaProps {
    tip: TipTaxaFederala;
    an: number;
    onChange: (tip: TipTaxaFederala, an: number) => void;
    className?: string;
}

/** Selector comun tip taxa (FRQKD sezon / FRAM an) + perioada, folosit de toate tab-urile taxelor anuale. */
export const SelectorPerioadaTaxa: React.FC<SelectorPerioadaTaxaProps> = ({ tip, an, onChange, className }) => {
    const curenta = getPerioadaTaxa(tip);
    const perioade = [curenta + 1, curenta, curenta - 1, curenta - 2];
    // Daca perioada selectata e in afara ferestrei, o pastram in lista ca sa nu dispara din select
    if (!perioade.includes(an)) perioade.push(an);

    return (
        <div className={`flex flex-col sm:flex-row sm:items-end gap-3 ${className ?? ''}`}>
            <div className="flex gap-2">
                <Button
                    variant={tip === 'FRQKD' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => onChange('FRQKD', getPerioadaTaxa('FRQKD'))}
                >
                    FRQKD (sezon)
                </Button>
                <Button
                    variant={tip === 'FRAM' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => onChange('FRAM', getPerioadaTaxa('FRAM'))}
                >
                    FRAM (an)
                </Button>
            </div>
            <div className="sm:w-56">
                <Select
                    id="selector-perioada-taxa"
                    aria-label="Perioada taxei"
                    value={an}
                    onChange={e => onChange(tip, Number(e.target.value))}
                >
                    {perioade.map(p => (
                        <option key={p} value={p}>
                            {tip === 'FRAM' ? 'Anul ' : 'Sezonul '}
                            {formatPerioadaTaxa(tip, p)}
                        </option>
                    ))}
                </Select>
            </div>
        </div>
    );
};
