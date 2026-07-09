import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSessionEvents, deriveSessions, deriveTrafic } from '../services/auditLogService';
import { Card, Badge } from './ui';
import { ClockIcon, UsersIcon } from './icons';

interface AuditSesiuniProps {
    userId?: string;
    dataStart?: string;
    dataEnd?: string;
    nameMap: Record<string, string>;
}

const formateazaDataOra = (iso: string | null): string => {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('ro-RO', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    } catch { return iso; }
};

const formateazaDurata = (secunde: number | null): string => {
    if (secunde == null) return 'necunoscută';
    if (secunde <= 0) return '—';
    const ore = Math.floor(secunde / 3600);
    const minute = Math.floor((secunde % 3600) / 60);
    if (ore === 0) return `${minute}m`;
    return `${ore}h ${minute}m`;
};

export const AuditSesiuni: React.FC<AuditSesiuniProps> = ({ userId, dataStart, dataEnd, nameMap }) => {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['jurnal-audit-sesiuni', userId, dataStart, dataEnd],
        queryFn: async () => {
            const { data, error } = await fetchSessionEvents({ userId, dataStart, dataEnd });
            if (error) throw new Error(typeof error === 'string' ? error : error.message || 'Eroare la încărcarea sesiunilor');
            return data;
        },
        staleTime: 60_000,
    });

    const evenimente = data ?? [];
    const sesiuni = useMemo(() => deriveSessions(evenimente), [evenimente]);
    const trafic = useMemo(() => deriveTrafic(sesiuni), [sesiuni]);

    if (isLoading) {
        return (
            <Card className="p-8 text-center">
                <div className="animate-spin h-8 w-8 border-2 border-sky-500 border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-slate-400">Se încarcă sesiunile...</p>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="p-6 border-red-500/30">
                <p className="text-red-400 text-sm">{(error as Error).message}</p>
                <button className="mt-3 text-sky-400 text-sm underline" onClick={() => refetch()}>Reîncearcă</button>
            </Card>
        );
    }

    if (sesiuni.length === 0) {
        return (
            <Card className="p-8 text-center">
                <ClockIcon className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Nicio sesiune găsită pentru filtrele selectate.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Trafic per profil */}
            <Card className="p-0 overflow-hidden">
                <div className="px-3 py-2 bg-slate-800/70 flex items-center gap-2">
                    <UsersIcon className="h-4 w-4 text-sky-400" />
                    <h2 className="text-sm font-semibold text-white">Trafic per profil</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                            <tr>
                                <th className="text-left px-3 py-2 font-semibold">Utilizator</th>
                                <th className="text-left px-3 py-2 font-semibold">Nr. sesiuni</th>
                                <th className="text-left px-3 py-2 font-semibold">Timp total activ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {trafic.map(t => (
                                <tr key={t.user_id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-3 py-2 text-slate-300" title={t.user_id}>
                                        {nameMap[t.user_id] || <span className="font-mono text-xs text-slate-500">{t.user_id}</span>}
                                    </td>
                                    <td className="px-3 py-2 text-slate-300">{t.nr_sesiuni}</td>
                                    <td className="px-3 py-2 text-slate-300">{t.timp_total_secunde > 0 ? formateazaDurata(t.timp_total_secunde) : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Sesiuni */}
            <Card className="p-0 overflow-hidden">
                <div className="px-3 py-2 bg-slate-800/70 flex items-center gap-2">
                    <ClockIcon className="h-4 w-4 text-sky-400" />
                    <h2 className="text-sm font-semibold text-white">Sesiuni</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                            <tr>
                                <th className="text-left px-3 py-2 font-semibold">Utilizator</th>
                                <th className="text-left px-3 py-2 font-semibold">Login</th>
                                <th className="text-left px-3 py-2 font-semibold">Logout</th>
                                <th className="text-left px-3 py-2 font-semibold">Durată</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {sesiuni.map((s, idx) => (
                                <tr key={`${s.user_id}-${s.login_at}-${idx}`} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-3 py-2 text-slate-300" title={s.user_id}>
                                        {nameMap[s.user_id] || <span className="font-mono text-xs text-slate-500">{s.user_id}</span>}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-slate-300">{formateazaDataOra(s.login_at)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-slate-300">
                                        {s.logout_at ? formateazaDataOra(s.logout_at) : <Badge variant="amber">în curs</Badge>}
                                    </td>
                                    <td className="px-3 py-2 text-slate-300">{formateazaDurata(s.durata_secunde)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
