import React, { useState, useMemo, useEffect } from 'react';
import { Sportiv, Grupa, Antrenament, Grad } from '../types';
import { Card, Select, Button } from './ui';
import { ArrowLeftIcon, DocumentArrowDownIcon, ExclamationTriangleIcon } from './icons';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useData } from '../contexts/DataContext';
import { usePermissions } from '../hooks/usePermissions';
import { supabase } from '../supabaseClient';

const exportToCsv = (filename: string, rows: object[]) => {
    if (!rows || rows.length === 0) {
        alert("Nu există date de exportat.");
        return;
    }
    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent =
        '﻿' +
        keys.join(separator) +
        '\n' +
        rows.map(row => {
            return keys.map(k => {
                let cell = (row as any)[k] === null || (row as any)[k] === undefined ? '' : String((row as any)[k]);
                cell = cell.replace(/"/g, '""');
                if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
                return cell;
            }).join(separator);
        }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};

interface ReportRow {
    sportivId: string;
    nume: string;
    grad: string;
    totalTrainings: number;
    attendedTrainings: number;
}

interface RaportLunarPrezentaProps {
    onBack: () => void;
}

export const RaportLunarPrezenta: React.FC<RaportLunarPrezentaProps> = ({ onBack }) => {
    const { filteredData, grade, activeRoleContext } = useData();
    const permissions = usePermissions(activeRoleContext);
    const sportivi = filteredData.sportivi;
    const grupe = filteredData.grupe;
    const antrenamente = filteredData.antrenamente;

    const clubId = permissions.isFederationLevel ? null : (activeRoleContext?.club_id ?? null);

    const [grupeSecundareMap, setGrupeSecundareMap] = useState<Map<string, Set<string>>>(new Map());

    useEffect(() => {
        const fetchGrupeSecundare = async () => {
            let query = supabase
                .from('sportivi_grupe_secundare')
                .select('sportiv_id, grupa_id')
                .eq('este_activ', true);

            // Filtrare pe club: includem doar grupele secundare ale clubului activ
            const grupeIds = grupe.map(g => g.id);
            if (!permissions.isFederationLevel && grupeIds.length > 0) {
                query = query.in('grupa_id', grupeIds);
            }

            const { data, error } = await query;
            if (error) {
                console.error('Eroare fetch grupe secundare (raport lunar):', error.message);
                return;
            }
            const map = new Map<string, Set<string>>();
            (data || []).forEach((row: { sportiv_id: string; grupa_id: string }) => {
                if (!map.has(row.sportiv_id)) map.set(row.sportiv_id, new Set());
                map.get(row.sportiv_id)!.add(row.grupa_id);
            });
            setGrupeSecundareMap(map);
        };
        fetchGrupeSecundare();
    }, [grupe, permissions.isFederationLevel]);

    const today = new Date();
    const [filters, setFilters] = useLocalStorage('phi-hau-raport-lunar-filters', {
        month: today.getMonth(),
        year: today.getFullYear(),
        grupaId: '',
    });

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: name === 'grupaId' ? value : parseInt(value, 10) }));
    };

    const reportData = useMemo((): ReportRow[] => {
        const { month, year, grupaId } = filters;

        let sportiviFiltrati: Sportiv[];
        if (grupaId) {
            const idGrupa = String(grupaId);
            const principali = sportivi.filter(s => s.status === 'Activ' && s.grupa_id === idGrupa);
            const idPrincipali = new Set(principali.map(s => s.id));
            const secundari = sportivi.filter(s =>
                s.status === 'Activ' &&
                !idPrincipali.has(s.id) &&
                grupeSecundareMap.get(s.id)?.has(idGrupa)
            );
            sportiviFiltrati = [...principali, ...secundari];
        } else {
            sportiviFiltrati = sportivi.filter(s => s.status === 'Activ');
        }

        const antrenamenteInLuna = antrenamente.filter(a => {
            const date = new Date((a.data || '').toString().slice(0, 10));
            return date.getFullYear() === year && date.getMonth() === month;
        });

        return sportiviFiltrati.map(sportiv => {
            const toateGrupeleSportiv = new Set<string>();
            if (sportiv.grupa_id) toateGrupeleSportiv.add(sportiv.grupa_id);
            grupeSecundareMap.get(sportiv.id)?.forEach(gid => toateGrupeleSportiv.add(gid));

            const grupeDeContorizat = grupaId
                ? new Set([String(grupaId)])
                : toateGrupeleSportiv;

            const grupaSportivExista = sportiv.grupa_id && grupe.find(g => g.id === sportiv.grupa_id);
            if (!grupaSportivExista && !grupaId && grupeDeContorizat.size === 0) return null;

            const antrenamenteGrupa = antrenamenteInLuna.filter(a => a.grupa_id && grupeDeContorizat.has(a.grupa_id));
            const totalTrainings = antrenamenteGrupa.length;

            const attendedTrainings = antrenamenteGrupa.filter(a =>
                (a.prezenta || []).some((p: any) => p.sportiv_id === sportiv.id && p.status?.este_prezent === true)
            ).length;

            const gradActual = grade.find(g => g.id === sportiv.grad_actual_id)?.nume || 'Începător';

            return {
                sportivId: sportiv.id,
                nume: `${sportiv.nume} ${sportiv.prenume}`,
                grad: gradActual,
                totalTrainings,
                attendedTrainings,
            };
        }).filter((row): row is ReportRow => row !== null && (grupaId ? true : row.totalTrainings > 0))
          .sort((a, b) => a.nume.localeCompare(b.nume));

    }, [filters, sportivi, grupe, antrenamente, grade, grupeSecundareMap]);

    const handleExport = () => {
        const dataToExport = reportData.map(d => ({
            "Nume Sportiv": d.nume,
            "Grad Actual": d.grad,
            "Antrenamente Planificate": d.totalTrainings,
            "Prezențe Efective": d.attendedTrainings,
            "Procentaj": d.totalTrainings > 0 ? `${Math.round((d.attendedTrainings / d.totalTrainings) * 100)}%` : 'N/A',
        }));
        const monthName = new Date(filters.year, filters.month).toLocaleString('ro-RO', { month: 'long' });
        exportToCsv(`raport_prezenta_${monthName}_${filters.year}.csv`, dataToExport);
    };

    const months = Array.from({ length: 12 }, (_, i) => ({
        value: i,
        label: new Date(0, i).toLocaleString('ro-RO', { month: 'long' })
    }));
    const years = [2024, 2025, 2026];

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="secondary" onClick={onBack} className="shrink-0">
                    <ArrowLeftIcon className="w-5 h-5 mr-2" />Înapoi
                </Button>
                <h1 className="text-xl md:text-3xl font-bold text-white truncate">Raport Lunar Prezență</h1>
            </div>

            {/* Filtre */}
            <Card className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                <Select label="An" name="year" value={String(filters.year)} onChange={handleFilterChange}>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </Select>
                <Select label="Lună" name="month" value={String(filters.month)} onChange={handleFilterChange}>
                    {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </Select>
                <Select label="Grupă" name="grupaId" value={filters.grupaId} onChange={handleFilterChange}>
                    <option value="">Toate Grupele</option>
                    {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                </Select>
            </Card>

            {/* Rezultate */}
            <Card className="p-0 overflow-hidden">
                <div className="p-3 md:p-4 bg-slate-700/50 flex justify-between items-center gap-2">
                    <h3 className="font-bold text-white text-sm md:text-base">
                        Rezultate
                        <span className="ml-2 text-slate-400 font-normal text-xs md:text-sm">
                            ({reportData.length} sportivi)
                        </span>
                    </h3>
                    <Button onClick={handleExport} variant="primary" size="sm" className="shrink-0">
                        <DocumentArrowDownIcon className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">Export CSV</span>
                    </Button>
                </div>

                {reportData.length === 0 ? (
                    <p className="p-12 text-center text-slate-500 italic text-sm">
                        Niciun sportiv de afișat conform filtrelor.
                    </p>
                ) : (
                    <>
                        {/* Tabel desktop */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-800 text-slate-400">
                                    <tr>
                                        <th className="p-3 font-semibold">Nume Sportiv</th>
                                        <th className="p-3 font-semibold">Grad</th>
                                        <th className="p-3 font-semibold text-center">Planificate</th>
                                        <th className="p-3 font-semibold text-center">Prezențe</th>
                                        <th className="p-3 font-semibold text-center">Procentaj</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {reportData.map(row => {
                                        const percentage = row.totalTrainings > 0
                                            ? Math.round((row.attendedTrainings / row.totalTrainings) * 100)
                                            : 0;
                                        const atRisk = row.attendedTrainings < 5;
                                        return (
                                            <tr key={row.sportivId} className={`${percentage < 50 ? 'bg-red-900/10' : ''} hover:bg-slate-700/30`}>
                                                <td className="p-3 font-medium text-white flex items-center gap-2">
                                                    {percentage < 50 && (
                                                        <span title="Prezență sub 50%">
                                                            <ExclamationTriangleIcon className="w-4 h-4 text-red-500 shrink-0" />
                                                        </span>
                                                    )}
                                                    {row.nume}
                                                </td>
                                                <td className="p-3 text-slate-300">{row.grad}</td>
                                                <td className="p-3 text-center text-slate-300">{row.totalTrainings}</td>
                                                <td className={`p-3 text-center font-bold ${atRisk ? 'text-red-400' : 'text-white'}`}>
                                                    {row.attendedTrainings}
                                                </td>
                                                <td className={`p-3 text-center font-bold ${percentage < 50 ? 'text-red-400' : 'text-green-400'}`}>
                                                    {percentage}%
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Carduri mobile */}
                        <div className="md:hidden divide-y divide-slate-700/50">
                            {reportData.map(row => {
                                const percentage = row.totalTrainings > 0
                                    ? Math.round((row.attendedTrainings / row.totalTrainings) * 100)
                                    : 0;
                                const atRisk = percentage < 50;
                                const barWidth = Math.min(percentage, 100);

                                return (
                                    <div
                                        key={row.sportivId}
                                        className={`p-3 ${atRisk ? 'bg-red-900/10' : ''}`}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                {atRisk && (
                                                    <ExclamationTriangleIcon className="w-4 h-4 text-red-500 shrink-0" />
                                                )}
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-white truncate">{row.nume}</p>
                                                    <p className="text-xs text-slate-400">{row.grad}</p>
                                                </div>
                                            </div>
                                            <span className={`text-lg font-bold shrink-0 ${atRisk ? 'text-red-400' : 'text-green-400'}`}>
                                                {percentage}%
                                            </span>
                                        </div>

                                        {/* Bară progres */}
                                        <div className="w-full bg-slate-700 rounded-full h-1.5 mb-2">
                                            <div
                                                className={`h-1.5 rounded-full transition-all ${atRisk ? 'bg-red-500' : 'bg-green-500'}`}
                                                style={{ width: `${barWidth}%` }}
                                            />
                                        </div>

                                        <div className="flex gap-4 text-xs text-slate-400">
                                            <span>
                                                <span className="text-slate-500">Planificate: </span>
                                                <span className="text-slate-200 font-medium">{row.totalTrainings}</span>
                                            </span>
                                            <span>
                                                <span className="text-slate-500">Prezențe: </span>
                                                <span className={`font-medium ${row.attendedTrainings < 5 ? 'text-red-400' : 'text-slate-200'}`}>
                                                    {row.attendedTrainings}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
};
