import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Card, Badge } from './ui';
import { getStatisticiEmailuriAuth } from '../services/authEmailAuditService';
import { calculeazaNivelPrag, calculeazaProcentPrag, nivelMaxim, ETICHETE_TIP_EMAIL_AUTH, NivelPrag } from '../utils/pragEmailuriAuth';
import type { TipEmailAuth } from '../types';

const CULOARE_BADGE: Record<NivelPrag, 'green' | 'amber' | 'red'> = {
    normal: 'green',
    atentie: 'amber',
    depasit: 'red',
};

const ETICHETA_NIVEL: Record<NivelPrag, string> = {
    normal: 'Normal',
    atentie: 'Atenție',
    depasit: 'Depășit',
};

export const MonitorEmailuriAuth: React.FC<{ mod: 'alerta' | 'complet' }> = ({ mod }) => {
    const { data, error, isLoading } = useQuery({
        queryKey: ['auth-email-statistici'],
        queryFn: async () => {
            const { data, error } = await getStatisticiEmailuriAuth();
            if (error) throw error;
            return data;
        },
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: false,
    });

    if (mod === 'alerta') {
        if (isLoading || error || !data) return null;

        const nivelOra = calculeazaNivelPrag(data.trimise_ultima_ora, data.prag_ora);
        const nivelZi = calculeazaNivelPrag(data.trimise_ultimele_24h, data.prag_zi);
        const nivel = nivelMaxim(nivelOra, nivelZi);

        if (nivel === 'normal') return null;

        const esteDepasit = nivel === 'depasit';

        return (
            <Card className={`mb-4 flex items-start gap-3 ${esteDepasit ? 'border-red-500/40 bg-red-500/10' : 'border-amber-500/40 bg-amber-500/10'}`}>
                <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${esteDepasit ? 'text-red-400' : 'text-amber-400'}`} />
                <div>
                    <p className={`font-semibold ${esteDepasit ? 'text-red-300' : 'text-amber-300'}`}>
                        {esteDepasit ? 'Limita emailurilor Auth a fost atinsă' : 'Emailuri Auth aproape de limită'}
                    </p>
                    <p className="text-sm text-slate-300">
                        Ultima oră: {data.trimise_ultima_ora}/{data.prag_ora} ({calculeazaProcentPrag(data.trimise_ultima_ora, data.prag_ora)}%) · Ultimele 24h: {data.trimise_ultimele_24h}/{data.prag_zi} ({calculeazaProcentPrag(data.trimise_ultimele_24h, data.prag_zi)}%)
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        Resetările de parolă, confirmările de cont și codurile MFA pot întârzia sau eșua. Detalii în Jurnal Audit.
                    </p>
                </div>
            </Card>
        );
    }

    // mod === 'complet'
    if (isLoading) {
        return <Card><p className="text-slate-400 text-sm">Se încarcă...</p></Card>;
    }

    if (error || !data) {
        return <Card><p className="text-red-400 text-sm">Statisticile emailurilor Auth nu au putut fi încărcate.</p></Card>;
    }

    const nivelOra = calculeazaNivelPrag(data.trimise_ultima_ora, data.prag_ora);
    const nivelZi = calculeazaNivelPrag(data.trimise_ultimele_24h, data.prag_zi);
    const nivel = nivelMaxim(nivelOra, nivelZi);
    const procentOra = calculeazaProcentPrag(data.trimise_ultima_ora, data.prag_ora);
    const procentZi = calculeazaProcentPrag(data.trimise_ultimele_24h, data.prag_zi);

    return (
        <Card>
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">Emailuri Auth (SMTP)</h3>
                <Badge variant={CULOARE_BADGE[nivel]}>{ETICHETA_NIVEL[nivel]}</Badge>
            </div>

            <div className="space-y-3">
                <div>
                    <div className="flex justify-between text-sm text-slate-300 mb-1">
                        <span>Ultima oră</span>
                        <span>{data.trimise_ultima_ora} / {data.prag_ora} ({procentOra}%)</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2">
                        <div className={`h-2 rounded-full ${CULOARE_BADGE[nivelOra] === 'red' ? 'bg-red-500' : CULOARE_BADGE[nivelOra] === 'amber' ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(procentOra, 100)}%` }} />
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-sm text-slate-300 mb-1">
                        <span>Ultimele 24h</span>
                        <span>{data.trimise_ultimele_24h} / {data.prag_zi} ({procentZi}%)</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2">
                        <div className={`h-2 rounded-full ${CULOARE_BADGE[nivelZi] === 'red' ? 'bg-red-500' : CULOARE_BADGE[nivelZi] === 'amber' ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(procentZi, 100)}%` }} />
                    </div>
                </div>

                <p className="text-sm text-slate-400">Eșuate în ultimele 24h: {data.esuate_ultimele_24h}</p>

                <div className="text-sm text-slate-300">
                    <p className="text-slate-400 mb-1">Pe tip (ultimele 24h):</p>
                    <ul className="space-y-0.5">
                        {(Object.keys(ETICHETE_TIP_EMAIL_AUTH) as TipEmailAuth[]).map(tip => (
                            <li key={tip} className="flex justify-between">
                                <span>{ETICHETE_TIP_EMAIL_AUTH[tip]}</span>
                                <span>{data.pe_tip_24h[tip] ?? 0}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="text-xs text-slate-500 pt-2 border-t border-slate-700/50">
                    Pragurile se configurează în tabela auth_email_praguri — vezi docs/auth-configurare-supabase.md.
                </p>
            </div>
        </Card>
    );
};
