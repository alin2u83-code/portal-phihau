import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { Card, Badge } from './ui';
import { getStatisticiAlerteSecuritate } from '../services/alertaSecuritateService';

export const MonitorAlerteSecuritate: React.FC = () => {
    const { data, error, isLoading } = useQuery({
        queryKey: ['alerte-securitate-statistici'],
        queryFn: async () => {
            const { data, error } = await getStatisticiAlerteSecuritate();
            if (error) throw error;
            return data;
        },
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: false,
    });

    if (isLoading) {
        return <Card><p className="text-slate-400 text-sm">Se încarcă...</p></Card>;
    }

    if (error || !data) {
        return <Card><p className="text-red-400 text-sm">Statisticile alertelor de securitate nu au putut fi încărcate.</p></Card>;
    }

    const areEsecuriTrimitere = data.alerte_esuate_trimitere_24h > 0;
    const areTentativeRecente = data.tentative_esuate_ultima_ora > 0;
    const variantBadge: 'green' | 'red' | 'amber' = areEsecuriTrimitere ? 'red' : areTentativeRecente ? 'amber' : 'green';
    const etichetaBadge = areEsecuriTrimitere ? 'Erori trimitere' : areTentativeRecente ? 'Activitate' : 'Normal';

    return (
        <Card>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-slate-300" />
                    <h3 className="font-semibold text-white">Alerte Securitate Admin</h3>
                </div>
                <Badge variant={variantBadge}>{etichetaBadge}</Badge>
            </div>

            <div className="space-y-1.5 text-sm text-slate-300">
                <p>Tentative eșuate: {data.tentative_esuate_ultima_ora} (ultima oră) / {data.tentative_esuate_ultimele_24h} (24h)</p>
                <p>Dispozitive noi detectate (24h): {data.dispozitive_noi_ultimele_24h}</p>
                <p>Alerte email trimise (24h): {data.alerte_trimise_24h}</p>
                <p className={data.alerte_esuate_trimitere_24h > 0 ? 'text-red-400' : ''}>
                    Alerte email eșuate la trimitere (24h): {data.alerte_esuate_trimitere_24h}
                </p>
            </div>

            <p className="text-xs text-slate-500 pt-2 mt-2 border-t border-slate-700/50">
                Praguri: 5 login-uri eșuate/15 min pe același cont, sau login admin de pe IP+dispozitiv necunoscut.
            </p>
        </Card>
    );
};
