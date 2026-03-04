import React from 'react';
import { Card } from '../ui';
import { ShieldCheckIcon } from '../icons';
import { Plata } from '../../types';

export const VizaMedicalaCard: React.FC<{ plati: Plata[], sportivId: string }> = ({ plati, sportivId }) => {
    const vizaPlati = plati.filter(p => p.sportiv_id === sportivId && p.tip.toLowerCase().includes('viza') && p.status === 'Achitat');
    const hasValidViza = vizaPlati.length > 0; // Simplified logic

    return (
        <Card>
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${hasValidViza ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    <ShieldCheckIcon className="w-8 h-8" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Viza Medicală</h3>
                    <p className={`text-sm font-medium ${hasValidViza ? 'text-green-400' : 'text-red-400'}`}>
                        {hasValidViza ? 'Valabilă' : 'Expirată sau Inexistentă'}
                    </p>
                </div>
            </div>
        </Card>
    );
};
