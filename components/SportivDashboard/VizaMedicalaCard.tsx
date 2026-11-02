import React from 'react';
import { Card, Badge } from '../ui';
import { ShieldCheckIcon } from '../icons';
import { Plata } from '../../types';

// Logica simplificata: viza e valida daca exista o plata de tip viza Achitata.
export const areVizaValida = (plati: Plata[], sportivId: string): boolean =>
    plati.some(p => p.sportiv_id === sportivId && p.tip.toLowerCase().includes('viza') && p.status === 'Achitat');

export const VizaMedicalaCard: React.FC<{ plati: Plata[], sportivId: string }> = ({ plati, sportivId }) => {
    if (areVizaValida(plati, sportivId)) return null;

    return (
        <Card className="md:p-6">
            <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-base font-semibold text-[var(--t-text)] flex items-center gap-2">
                    <ShieldCheckIcon className="w-5 h-5 text-[var(--t-text-muted)]" />
                    Viză medicală
                </h3>
                <Badge variant="red">Expirată sau inexistentă</Badge>
            </div>
            <p className="text-sm text-[var(--t-text-muted)]">Nu există o viză medicală achitată pentru acest sportiv.</p>
        </Card>
    );
};
