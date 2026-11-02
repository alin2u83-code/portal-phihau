import React from 'react';
import { View, Sportiv, Grupa, Plata, TipAbonament, Grad } from '../types';
import { Card, Button } from './ui';
import { ExclamationTriangleIcon } from './icons';
import { useSezonActivCurent } from '../hooks/useSezoane';
import { filtreazaTipuriSezon } from '../utils/abonamente';
import { calculeazaVarstaLaData, gradTintaLaVarsta } from '../utils/eligibilitateCompetitie';

export interface ProblemaDeRezolvat {
    id: string;
    titlu: string;
    detaliu: string;
    actiune: string;
    view: View;
}

interface DeRezolvatCardProps {
    sportivi?: Sportiv[];
    grupe?: Grupa[];
    plati?: Plata[];
    tipuriAbonament?: TipAbonament[];
    grade?: Grad[];
    // Cand e furnizat, inlocuieste lista calculata intern (calea SUPER_ADMIN_FEDERATIE).
    probleme?: ProblemaDeRezolvat[];
    onNavigate: (view: View) => void;
}

// Card "De rezolvat": setup lipsa + sportivi activi fara grupa / factura pe luna curenta.
// Calcul client-side pe datele deja incarcate (fara query-uri noi).
export const DeRezolvatCard: React.FC<DeRezolvatCardProps> = ({ sportivi, grupe, plati, tipuriAbonament, grade, probleme: problemeExterne, onNavigate }) => {
    const { sezonActivId } = useSezonActivCurent();

    const problemeCalculate = React.useMemo<ProblemaDeRezolvat[]>(() => {
        const rez: ProblemaDeRezolvat[] = [];
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

        // Minor care a implinit 7 ani (galben -> rosu) sau 13 ani (rosu/violet -> 1 Cap Albastru) si inca nu a promovat
        const laExamen = activi.filter(s => {
            const curent = (grade || []).find(g => g.id === s.grad_actual_id);
            if (!curent || !s.data_nasterii) return false;
            return !!gradTintaLaVarsta(curent, calculeazaVarstaLaData(s.data_nasterii, acum.toISOString().slice(0, 10)), grade || []);
        });
        if (laExamen.length > 0) {
            rez.push({
                id: 'varsta-examen',
                titlu: `${laExamen.length} sportivi au împlinit vârsta pentru schimbarea gradului (7/13 ani)`,
                detaliu: laExamen.slice(0, 3).map(s => `${s.nume} ${s.prenume}`).join(', ') + (laExamen.length > 3 ? '…' : ''),
                actiune: 'Programează examen',
                view: 'examene',
            });
        }
        return rez;
    }, [sportivi, grupe, plati, tipuriAbonament, grade, sezonActivId]);

    const probleme = problemeExterne ?? problemeCalculate;

    if (probleme.length === 0) {
        return (
            <Card role="status" className="md:p-6">
                <p className="text-base font-semibold text-[var(--t-text)]">Totul e la zi</p>
                <p className="text-sm text-[var(--t-text-muted)] mt-1">Nu ai nimic de rezolvat acum. Verifică din nou după următoarea prezență.</p>
            </Card>
        );
    }

    return (
        <Card className="md:p-6">
            <section aria-label="De rezolvat">
                <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--t-text)]">
                    <ExclamationTriangleIcon className="w-5 h-5 text-[var(--t-text-muted)]" /> De rezolvat ({probleme.length})
                </h2>
                <ul className="mt-3 divide-y divide-[var(--t-border)]">
                    {probleme.map(p => (
                        <li key={p.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-[var(--t-text)]">{p.titlu}</p>
                                <p className="text-xs text-[var(--t-text-muted)] truncate">{p.detaliu}</p>
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                ghost
                                size="sm"
                                title={p.actiune}
                                onClick={() => onNavigate(p.view)}
                                className="shrink-0"
                            >
                                Rezolvă problema
                            </Button>
                        </li>
                    ))}
                </ul>
            </section>
        </Card>
    );
};
