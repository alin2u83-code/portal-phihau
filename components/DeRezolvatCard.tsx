import React from 'react';
import { View, Sportiv, Grupa, Plata, TipAbonament } from '../types';
import { ExclamationTriangleIcon, CheckCircleIcon } from './icons';
import { useSezonActivCurent } from '../hooks/useSezoane';
import { filtreazaTipuriSezon } from '../utils/abonamente';

interface DeRezolvatCardProps {
    sportivi: Sportiv[];
    grupe: Grupa[];
    plati: Plata[];
    tipuriAbonament: TipAbonament[];
    onNavigate: (view: View) => void;
}

interface Problema {
    id: string;
    titlu: string;
    detaliu: string;
    actiune: string;
    view: View;
}

// Card "De rezolvat" pentru ADMIN_CLUB: setup lipsa + sportivi activi fara grupa / factura pe luna curenta.
// Calcul client-side pe datele deja incarcate (fara query-uri noi).
export const DeRezolvatCard: React.FC<DeRezolvatCardProps> = ({ sportivi, grupe, plati, tipuriAbonament, onNavigate }) => {
    const { sezonActivId } = useSezonActivCurent();

    const probleme = React.useMemo<Problema[]>(() => {
        const rez: Problema[] = [];
        const acum = new Date();
        const luna = acum.getMonth() + 1;
        const an = acum.getFullYear();

        const tipuriSezon = filtreazaTipuriSezon(tipuriAbonament || [], sezonActivId);
        if (!tipuriSezon.some(t => t.numar_membri === 1)) {
            rez.push({
                id: 'tip-individual',
                titlu: 'Lipsește tipul de abonament „Individual”',
                detaliu: 'Fără el nu se pot genera facturi automate la înscriere sau lunare.',
                actiune: 'Configurează abonament',
                view: 'tipuri-abonament',
            });
        }

        const grupeActive = (grupe || []).filter(g => !g.arhivat && (g.tip_grupa !== 'per_sezon' || !sezonActivId || g.sezon_id === sezonActivId));
        if (grupeActive.length === 0) {
            rez.push({
                id: 'fara-grupe',
                titlu: 'Nicio grupă activă',
                detaliu: 'Clubul nu are grupe pentru sezonul curent.',
                actiune: 'Creează grupă',
                view: 'grupe',
            });
        }

        const activi = (sportivi || []).filter(s => s.status === 'Activ' && (!s.status_aprobare || s.status_aprobare === 'aprobat'));

        const faraGrupa = activi.filter(s => !s.grupa_id);
        if (faraGrupa.length > 0) {
            rez.push({
                id: 'fara-grupa',
                titlu: `${faraGrupa.length} sportivi activi fără grupă`,
                detaliu: faraGrupa.slice(0, 3).map(s => `${s.nume} ${s.prenume}`).join(', ') + (faraGrupa.length > 3 ? '…' : ''),
                actiune: 'Alocă în grupe',
                view: 'sportivi',
            });
        }

        const facturate = new Set<string>();
        (plati || []).forEach(p => {
            if (p.tip === 'Abonament' && p.luna === luna && p.an === an && p.status !== 'Anulat') {
                if (p.sportiv_id) facturate.add(p.sportiv_id);
                if (p.familie_id) facturate.add(`fam:${p.familie_id}`);
            }
        });
        const faraFactura = activi.filter(s => !facturate.has(s.id) && !(s.familie_id && facturate.has(`fam:${s.familie_id}`)));
        if (faraFactura.length > 0) {
            rez.push({
                id: 'fara-factura',
                titlu: `${faraFactura.length} sportivi activi fără factură pe luna curentă`,
                detaliu: faraFactura.slice(0, 3).map(s => `${s.nume} ${s.prenume}`).join(', ') + (faraFactura.length > 3 ? '…' : ''),
                actiune: 'Generează facturi',
                view: 'plati-hub',
            });
        }
        return rez;
    }, [sportivi, grupe, plati, tipuriAbonament, sezonActivId]);

    if (probleme.length === 0) {
        return (
            <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                <CheckCircleIcon className="w-4 h-4 shrink-0" /> Clubul e configurat, nimic de rezolvat.
            </div>
        );
    }

    return (
        <section aria-label="De rezolvat" className="rounded-xl border border-amber-600/40 bg-amber-950/20 p-4 space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-400">
                <ExclamationTriangleIcon className="w-5 h-5" /> De rezolvat ({probleme.length})
            </h2>
            <ul className="space-y-2">
                {probleme.map(p => (
                    <li key={p.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg bg-slate-800/60 border border-slate-700/50 px-3 py-2">
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-100">{p.titlu}</p>
                            <p className="text-xs text-slate-400 truncate">{p.detaliu}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => onNavigate(p.view)}
                            className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-md bg-amber-500 text-slate-900 hover:bg-amber-400 transition-colors"
                        >
                            {p.actiune}
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
};
