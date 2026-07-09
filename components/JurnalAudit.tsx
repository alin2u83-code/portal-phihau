import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useData } from '../contexts/DataContext';
import { fetchAuditLog, AuditLogFilters } from '../services/auditLogService';
import { useAuditUserNames } from '../hooks/useAuditUserNames';
import type { AuditLogEntry } from '../types';
import { Card, Button, Input, Select, Badge, SearchableSelect } from './ui';
import { ArrowLeftIcon, ShieldCheckIcon, ClockIcon } from './icons';

const PAGE_SIZE = 50;

const OPERATII: { label: string; value: string }[] = [
    { label: 'Toate operațiile', value: '' },
    { label: 'INSERT', value: 'INSERT' },
    { label: 'UPDATE', value: 'UPDATE' },
    { label: 'DELETE', value: 'DELETE' },
    { label: 'SELECT_SENSIBIL', value: 'SELECT_SENSIBIL' },
    { label: 'LOGIN', value: 'LOGIN' },
    { label: 'LOGOUT', value: 'LOGOUT' },
    { label: 'ROL_SCHIMBAT', value: 'ROL_SCHIMBAT' },
];

const VARIANTA_OPERATIE: Record<string, 'green' | 'red' | 'amber' | 'blue' | 'slate'> = {
    INSERT: 'green',
    UPDATE: 'blue',
    DELETE: 'red',
    SELECT_SENSIBIL: 'amber',
    LOGIN: 'green',
    LOGOUT: 'slate',
    ROL_SCHIMBAT: 'amber',
};

const formateazaDataOra = (iso: string): string => {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('ro-RO', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    } catch { return iso; }
};

export const JurnalAudit: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { clubs } = useData();
    const clubMap = useMemo(() => Object.fromEntries(clubs.map(c => [c.id, c.nume])), [clubs]);
    const { nameMap, options: userOptions } = useAuditUserNames();

    const [clubId, setClubId] = useState('');
    const [operatie, setOperatie] = useState('');
    const [userId, setUserId] = useState('');
    const [dataStart, setDataStart] = useState('');
    const [dataEnd, setDataEnd] = useState('');
    const [pagina, setPagina] = useState(0);

    const filters: AuditLogFilters = {
        clubId: clubId || undefined,
        operatie: operatie || undefined,
        userId: userId || undefined,
        dataStart: dataStart || undefined,
        dataEnd: dataEnd ? `${dataEnd}T23:59:59` : undefined,
        limit: PAGE_SIZE,
        offset: pagina * PAGE_SIZE,
    };

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['jurnal-audit', clubId, operatie, userId, dataStart, dataEnd, pagina],
        queryFn: async () => {
            const { data, error } = await fetchAuditLog(filters);
            if (error) throw new Error(typeof error === 'string' ? error : error.message || 'Eroare la încărcarea jurnalului');
            return data;
        },
        staleTime: 60_000,
    });

    const inregistrari: AuditLogEntry[] = data ?? [];

    const resetFiltre = () => {
        setClubId('');
        setOperatie('');
        setUserId('');
        setDataStart('');
        setDataEnd('');
        setPagina(0);
    };

    const schimbaFiltru = (setter: (v: string) => void) => (v: string) => {
        setter(v);
        setPagina(0);
    };

    return (
        <div className="space-y-4 animate-fade-in-down">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="secondary" size="sm" onClick={onBack}>
                    <ArrowLeftIcon className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="h-6 w-6 text-sky-400" />
                    <div>
                        <h1 className="text-2xl font-bold text-white">Jurnal Audit</h1>
                        <p className="text-slate-400 text-sm">Istoric complet al operațiilor din baza de date — acces exclusiv Super Admin</p>
                    </div>
                </div>
            </div>

            {/* Filtre */}
            <Card className="p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <Select
                        label="Club"
                        value={clubId}
                        onChange={e => schimbaFiltru(setClubId)(e.target.value)}
                    >
                        <option value="">Toate cluburile</option>
                        {clubs.map(c => (
                            <option key={c.id} value={c.id}>{c.nume}</option>
                        ))}
                    </Select>
                    <Select
                        label="Operație"
                        value={operatie}
                        onChange={e => schimbaFiltru(setOperatie)(e.target.value)}
                    >
                        {OPERATII.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </Select>
                    <SearchableSelect
                        label="Utilizator"
                        value={userId}
                        onChange={schimbaFiltru(setUserId)}
                        options={userOptions}
                        emptyLabel="Toți utilizatorii"
                        placeholder="Caută utilizator..."
                    />
                    <Input
                        label="De la data"
                        type="date"
                        value={dataStart}
                        onChange={e => schimbaFiltru(setDataStart)(e.target.value)}
                    />
                    <Input
                        label="Până la data"
                        type="date"
                        value={dataEnd}
                        onChange={e => schimbaFiltru(setDataEnd)(e.target.value)}
                    />
                </div>
                <div className="flex justify-end mt-3">
                    <Button variant="secondary" size="sm" onClick={resetFiltre}>Resetează filtrele</Button>
                </div>
            </Card>

            {/* Tabel */}
            {isLoading ? (
                <Card className="p-8 text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-sky-500 border-t-transparent rounded-full mx-auto mb-3" />
                    <p className="text-slate-400">Se încarcă jurnalul de audit...</p>
                </Card>
            ) : error ? (
                <Card className="p-6 border-red-500/30">
                    <p className="text-red-400 text-sm">{(error as Error).message}</p>
                    <Button size="sm" className="mt-3" onClick={() => refetch()}>Reîncearcă</Button>
                </Card>
            ) : inregistrari.length === 0 ? (
                <Card className="p-8 text-center">
                    <ClockIcon className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Nicio înregistrare găsită pentru filtrele selectate.</p>
                </Card>
            ) : (
                <Card className="p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-800/70 text-slate-400 text-xs uppercase">
                                <tr>
                                    <th className="text-left px-3 py-2 font-semibold">Data</th>
                                    <th className="text-left px-3 py-2 font-semibold">Operație</th>
                                    <th className="text-left px-3 py-2 font-semibold">Tabel</th>
                                    <th className="text-left px-3 py-2 font-semibold">Club</th>
                                    <th className="text-left px-3 py-2 font-semibold">Utilizator</th>
                                    <th className="text-left px-3 py-2 font-semibold">Sursă</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {inregistrari.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-3 py-2 whitespace-nowrap text-slate-300">{formateazaDataOra(item.created_at)}</td>
                                        <td className="px-3 py-2">
                                            <Badge variant={VARIANTA_OPERATIE[item.operatie] || 'slate'}>{item.operatie}</Badge>
                                        </td>
                                        <td className="px-3 py-2 text-slate-300">{item.tabel}</td>
                                        <td className="px-3 py-2 text-slate-400">{item.club_id ? (clubMap[item.club_id] || item.club_id) : '—'}</td>
                                        <td className="px-3 py-2 text-slate-400" title={item.user_id || ''}>
                                            {item.user_id && nameMap[item.user_id] ? (
                                                <span>{nameMap[item.user_id]}</span>
                                            ) : (
                                                <span className="font-mono text-xs text-slate-500">{item.user_id || '—'}</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-slate-400">{item.sursa}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Paginare */}
            {!isLoading && !error && (
                <div className="flex items-center justify-between pb-4">
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={pagina === 0}
                        onClick={() => setPagina(p => Math.max(0, p - 1))}
                    >
                        Pagina anterioară
                    </Button>
                    <span className="text-xs text-slate-500">Pagina {pagina + 1} · {inregistrari.length} înregistrări</span>
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={inregistrari.length < PAGE_SIZE}
                        onClick={() => setPagina(p => p + 1)}
                    >
                        Pagina următoare
                    </Button>
                </div>
            )}
        </div>
    );
};
