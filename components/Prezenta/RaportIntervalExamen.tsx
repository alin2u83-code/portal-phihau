import React, { useMemo, useState } from 'react';
import { Sportiv, IstoricGrade, Grad } from '../../types';
import { Card, Button, Select } from '../ui';
import { ArrowLeftIcon, DocumentArrowDownIcon } from '../icons';
import { useData } from '../../contexts/DataContext';
import { usePermissions } from '../../hooks/usePermissions';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const exportToCsv = (filename: string, rows: object[]) => {
    if (!rows || rows.length === 0) {
        alert('Nu există date de exportat.');
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

// ─── Funcție pură: calcul intervale grad ────────────────────────────────────

interface IntervalGrad {
    period: string;
    count: number;
    date: string;
}

/**
 * Calculează numărul absolut de prezențe per interval delimitat de examene de grad.
 * Algoritmul reproduce logica din useAttendanceStats.gradeStats.
 *
 * @param istoricPrezenta - lista antrenamentelor cu data și status ('prezent'|altceva)
 * @param sortedGrades    - istoricul de grade al sportivului, sortat cronologic
 * @param grade           - nomenclatorul de grade (pentru a obține numele gradului)
 * @returns lista de intervale în ordine descrescătoare (cel mai recent primul), fără procente
 */
export function calculateGradeIntervals(
    istoricPrezenta: { data: string; status: string }[],
    sortedGrades: IstoricGrade[],
    grade: Grad[]
): IntervalGrad[] {
    if (!istoricPrezenta || !sortedGrades || !grade) return [];

    const stats: IntervalGrad[] = [];
    const sorted = [...sortedGrades].sort(
        (a, b) =>
            new Date((a.data_obtinere || '').toString().slice(0, 10)).getTime() -
            new Date((b.data_obtinere || '').toString().slice(0, 10)).getTime()
    );

    // 1. Început -> primul examen
    if (sorted.length > 0) {
        const firstExamDate = new Date((sorted[0].data_obtinere || '').toString().slice(0, 10));
        const count = istoricPrezenta.filter(
            p =>
                p.status?.toLowerCase() === 'prezent' &&
                new Date((p.data || '').toString().slice(0, 10)) < firstExamDate
        ).length;
        const gradName = grade.find(g => g.id === sorted[0].grad_id)?.nume || 'Primul Examen';
        stats.push({
            period: `Început -> ${gradName}`,
            count,
            date: sorted[0].data_obtinere,
        });
    }

    // 2. Între examene consecutive
    for (let i = 0; i < sorted.length - 1; i++) {
        const currentExamDate = new Date((sorted[i].data_obtinere || '').toString().slice(0, 10));
        const nextExamDate = new Date((sorted[i + 1].data_obtinere || '').toString().slice(0, 10));

        const count = istoricPrezenta.filter(p => {
            const d = new Date((p.data || '').toString().slice(0, 10));
            return p.status?.toLowerCase() === 'prezent' && d >= currentExamDate && d < nextExamDate;
        }).length;

        const currentGradName = grade.find(g => g.id === sorted[i].grad_id)?.nume || 'Examen';
        const nextGradName = grade.find(g => g.id === sorted[i + 1].grad_id)?.nume || 'Examen';

        stats.push({
            period: `${currentGradName} -> ${nextGradName}`,
            count,
            date: sorted[i + 1].data_obtinere,
        });
    }

    // 3. Ultimul examen -> Prezent
    if (sorted.length > 0) {
        const lastExamDate = new Date(
            (sorted[sorted.length - 1].data_obtinere || '').toString().slice(0, 10)
        );
        const count = istoricPrezenta.filter(p => {
            const d = new Date((p.data || '').toString().slice(0, 10));
            return p.status?.toLowerCase() === 'prezent' && d >= lastExamDate;
        }).length;
        const lastGradName =
            grade.find(g => g.id === sorted[sorted.length - 1].grad_id)?.nume || 'Ultimul Examen';
        stats.push({
            period: `${lastGradName} -> Prezent`,
            count,
            date: new Date().toISOString(),
        });
    } else {
        // Sportiv fără niciun examen
        const totalPrezent = istoricPrezenta.filter(
            p => p.status?.toLowerCase() === 'prezent'
        ).length;
        stats.push({
            period: 'Început -> Prezent',
            count: totalPrezent,
            date: new Date().toISOString(),
        });
    }

    return stats.reverse(); // cel mai recent interval primul
}

// ─── Tipuri interne ──────────────────────────────────────────────────────────

interface SportivIntervalReport {
    sportiv: Sportiv;
    intervale: IntervalGrad[];
}

interface RaportIntervalExamenProps {
    onBack: () => void;
    onViewSportiv?: (s: Sportiv) => void;
}

// ─── Componentă principală ──────────────────────────────────────────────────

export const RaportIntervalExamen: React.FC<RaportIntervalExamenProps> = ({
    onBack,
    onViewSportiv,
}) => {
    const { filteredData, grade, activeRoleContext } = useData();
    const permissions = usePermissions(activeRoleContext);

    const sportivi = filteredData.sportivi;
    const antrenamente = filteredData.antrenamente;
    const grupe = filteredData.grupe;
    const istoricGrade = filteredData.istoricGrade;

    // ── Filtru opțional pe grupă ─────────────────────────────────────────────
    const [grupaIdFilter, setGrupaIdFilter] = useState<string>('');

    // ── Grade per sportiv (din cache DataContext) ─────────────────────────────
    const gradesBySportiv = useMemo(
        () =>
            new Map(
                sportivi.map(s => [
                    s.id,
                    istoricGrade
                        .filter(g => g.sportiv_id === s.id)
                        .sort((a, b) =>
                            a.data_obtinere.localeCompare(b.data_obtinere)
                        ),
                ])
            ),
        [sportivi, istoricGrade]
    );

    // ── Prezențe per sportiv (din filteredData.antrenamente) ─────────────────
    const prezenteBySportiv = useMemo(() => {
        const map = new Map<string, { data: string; status: string }[]>();
        antrenamente.forEach(ant => {
            (ant.prezenta || []).forEach(p => {
                if (!p.status?.este_prezent) return;
                const entries = map.get(p.sportiv_id) || [];
                entries.push({ data: ant.data, status: 'prezent' });
                map.set(p.sportiv_id, entries);
            });
        });
        return map;
    }, [antrenamente]);

    // ── Filtrare sportivi pe grupă ────────────────────────────────────────────
    const sportiviFiltered = useMemo(() => {
        if (!grupaIdFilter) return sportivi.filter(s => s.status === 'Activ');
        return sportivi.filter(
            s => s.status === 'Activ' && s.grupa_id === grupaIdFilter
        );
    }, [sportivi, grupaIdFilter]);

    // ── Date raport ──────────────────────────────────────────────────────────
    const reportData = useMemo<SportivIntervalReport[]>(() => {
        return sportiviFiltered.map(s => {
            const istoricPrezenta = prezenteBySportiv.get(s.id) || [];
            const sortedGrades = gradesBySportiv.get(s.id) || [];
            const intervale = calculateGradeIntervals(istoricPrezenta, sortedGrades, grade);
            return { sportiv: s, intervale };
        });
    }, [sportiviFiltered, prezenteBySportiv, gradesBySportiv, grade]);

    // ── Export CSV ───────────────────────────────────────────────────────────
    const handleExport = () => {
        const rows = reportData.flatMap(({ sportiv, intervale }) =>
            intervale.map(interval => ({
                'Nume Sportiv': `${sportiv.nume} ${sportiv.prenume}`,
                Interval: interval.period,
                'Prezențe (nr.)': interval.count,
            }))
        );
        exportToCsv('raport-interval-examen.csv', rows);
    };

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <Button variant="secondary" size="sm" onClick={onBack}>
                        <ArrowLeftIcon className="w-4 h-4" />
                    </Button>
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Raport Prezență per Interval Examen
                    </h1>
                </div>
                <Button variant="secondary" size="sm" onClick={handleExport}>
                    <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
                    Export CSV
                </Button>
            </div>

            {/* Filtru grupă */}
            <Card className="p-4">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="w-64">
                        <Select
                            label="Filtrează după grupă"
                            id="grupaIdFilter"
                            value={grupaIdFilter}
                            onChange={e => setGrupaIdFilter(e.target.value)}
                        >
                            <option value="">Toate grupele</option>
                            {grupe.map(g => (
                                <option key={g.id} value={g.id}>
                                    {g.denumire}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-5">
                        {reportData.length} sportivi
                    </div>
                </div>
            </Card>

            {/* Listă sportivi */}
            {reportData.length === 0 ? (
                <Card className="p-8 text-center text-gray-500 dark:text-gray-400">
                    Nu există sportivi activi pentru criteriile selectate.
                </Card>
            ) : (
                <div className="space-y-3">
                    {reportData.map(({ sportiv, intervale }) => (
                        <Card key={sportiv.id} className="p-4">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                {/* Nume sportiv */}
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => onViewSportiv?.(sportiv)}
                                        className={`text-base font-medium ${
                                            onViewSportiv
                                                ? 'text-amber-600 dark:text-amber-400 hover:underline cursor-pointer'
                                                : 'text-gray-900 dark:text-gray-100 cursor-default'
                                        }`}
                                    >
                                        {sportiv.nume} {sportiv.prenume}
                                    </button>
                                </div>

                                {/* Intervale */}
                                <div className="flex flex-wrap gap-2">
                                    {intervale.length === 0 ? (
                                        <span className="text-sm text-gray-400 dark:text-gray-500 italic">
                                            Fără date
                                        </span>
                                    ) : (
                                        intervale.map((interval, idx) => (
                                            <div
                                                key={idx}
                                                className="flex flex-col items-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 min-w-[110px]"
                                            >
                                                <span className="text-xs text-gray-500 dark:text-gray-400 text-center leading-snug">
                                                    {interval.period}
                                                </span>
                                                <span className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">
                                                    {interval.count}
                                                </span>
                                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                                    prezențe
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
