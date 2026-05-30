import React, { useState, useMemo, useEffect } from 'react';
import { Sportiv, Grupa, Antrenament, Grad } from '../../types';
import { Card, Select, Button } from '../ui';
import { ArrowLeftIcon, DocumentArrowDownIcon, ExclamationTriangleIcon, ChevronDownIcon, ChevronRightIcon } from '../icons';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useData } from '../../contexts/DataContext';
import { usePermissions } from '../../hooks/usePermissions';
import { supabase } from '../../supabaseClient';

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const exportToCsv = (filename: string, rows: object[]) => {
    if (!rows || rows.length === 0) {
        alert("Nu existÄƒ date de exportat.");
        return;
    }
    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent =
        'ï»¿' +
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

const fmtDate = (d: string | null | undefined) => {
    if (!d) return 'â€”';
    return new Date(d.slice(0, 10) + 'T00:00:00').toLocaleDateString('ro-RO');
};

// â”€â”€â”€ Tipuri â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface GrupaBreakdown {
    grupaId: string;
    grupaDenumire: string;
    tip: 'principala' | 'secundara';
    totalTrainings: number;
    attendedTrainings: number;
}

interface ReportRow {
    sportivId: string;
    nume: string;
    grad: string;
    // Luna curentÄƒ
    totalTrainings: number;
    attendedTrainings: number;
    // PerioadÄƒ examen
    perioadaStart: string | null;
    perioadaEnd: string | null;
    totalPerioadaExamen: number;
    attendedPerioadaExamen: number;
    // Breakdown per grupÄƒ (luna curentÄƒ)
    grupeBreakdown: GrupaBreakdown[];
}

interface SesiuneExamenMinim {
    id: string;
    data: string;
    club_id?: string | null;
}

interface RaportLunarPrezentaProps {
    onBack: () => void;
}

// â”€â”€â”€ ComponentÄƒ principalÄƒ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const RaportLunarPrezenta: React.FC<RaportLunarPrezentaProps> = ({ onBack }) => {
    const { filteredData, grade, activeRoleContext } = useData();
    const permissions = usePermissions(activeRoleContext);
    const sportivi = filteredData.sportivi;
    const grupe = filteredData.grupe;
    const antrenamente = filteredData.antrenamente;

    const clubId = permissions.isFederationLevel ? null : (activeRoleContext?.club_id ?? null);

    // â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const [grupeSecundareMap, setGrupeSecundareMap] = useState<Map<string, Set<string>>>(new Map());
    const [sesiuniExamene, setSesiuniExamene] = useState<SesiuneExamenMinim[]>([]);
    const [loadingExamene, setLoadingExamene] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const today = new Date();
    const [filters, setFilters] = useLocalStorage('phi-hau-raport-lunar-filters', {
        month: today.getMonth(),
        year: today.getFullYear(),
        grupaId: '',
    });

    // â”€â”€ Fetch grupe secundare â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    useEffect(() => {
        const fetchGrupeSecundare = async () => {
            let query = supabase
                .from('sportivi_grupe_secundare')
                .select('sportiv_id, grupa_id')
                .eq('este_activ', true);

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

    // â”€â”€ Fetch sesiuni examene â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    useEffect(() => {
        const fetchExamene = async () => {
            setLoadingExamene(true);
            let query = supabase
                .from('sesiuni_examene')
                .select('id, data, club_id')
                .order('data', { ascending: true });

            if (clubId) {
                query = query.eq('club_id', clubId);
            }

            const { data, error } = await query;
            setLoadingExamene(false);
            if (error) {
                console.error('Eroare fetch sesiuni examene (raport lunar):', error.message);
                return;
            }
            setSesiuniExamene(data || []);
        };
        fetchExamene();
    }, [clubId]);

    // â”€â”€ CalculeazÄƒ intervalul perioadei de examen (din perspectiva lunii selectate) â”€
    const perioadaExamen = useMemo(() => {
        // LuÄƒm data de referinÈ›Äƒ = prima zi a lunii selectate
        const refDate = new Date(filters.year, filters.month, 1);
        const todayStr = today.toISOString().slice(0, 10);

        const sortedDates = sesiuniExamene
            .map(s => (s.data || '').slice(0, 10))
            .filter(d => !!d)
            .sort();

        if (sortedDates.length === 0) {
            // Nu existÄƒ examene Ã®n DB â€” perioada = de la data_inscrierii sau 2024-01-01 pÃ¢nÄƒ azi
            return { start: null, end: todayStr };
        }

        // Ultimul examen ÃŽNAINTE SAU ÃŽN luna selectatÄƒ
        const refStr = refDate.toISOString().slice(0, 10);
        const trecut = sortedDates.filter(d => d <= refStr);
        const viitor = sortedDates.filter(d => d > refStr);

        const start = trecut.length > 0 ? trecut[trecut.length - 1] : null;
        const end = viitor.length > 0 ? viitor[0] : todayStr;

        return { start, end };
    }, [sesiuniExamene, filters.year, filters.month, today]);

    // â”€â”€ Toggle expand row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const toggleExpand = (sportivId: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(sportivId)) next.delete(sportivId);
            else next.add(sportivId);
            return next;
        });
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: name === 'grupaId' ? value : parseInt(value, 10) }));
    };

    // â”€â”€ Calcul date raport â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const reportData = useMemo((): ReportRow[] => {
        const { month, year, grupaId } = filters;

        // Filtrare sportivi
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

        // Antrenamente Ã®n luna selectatÄƒ
        const antrenamenteInLuna = antrenamente.filter(a => {
            const date = new Date((a.data || '').toString().slice(0, 10));
            return date.getFullYear() === year && date.getMonth() === month;
        });

        // Antrenamente Ã®n perioada examen
        const { start: periStart, end: periEnd } = perioadaExamen;
        const antrenamentePerioadaExamen = antrenamente.filter(a => {
            const d = (a.data || '').toString().slice(0, 10);
            if (!d) return false;
            if (periStart && d <= periStart) return false; // strict dupÄƒ ultimul examen
            if (d > periEnd) return false;
            return true;
        });

        // Map grupÄƒ id â†’ denumire
        const grupeMap = new Map(grupe.map(g => [g.id, g.denumire]));

        return sportiviFiltrati.map(sportiv => {
            const toateGrupeleSportiv = new Set<string>();
            if (sportiv.grupa_id) toateGrupeleSportiv.add(sportiv.grupa_id);
            grupeSecundareMap.get(sportiv.id)?.forEach(gid => toateGrupeleSportiv.add(gid));

            const grupeDeContorizat = grupaId
                ? new Set([String(grupaId)])
                : toateGrupeleSportiv;

            const grupaSportivExista = sportiv.grupa_id && grupe.find(g => g.id === sportiv.grupa_id);
            if (!grupaSportivExista && !grupaId && grupeDeContorizat.size === 0) return null;

            // â”€â”€ PrezenÈ›e luna curentÄƒ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            const antrenamenteGrupaLuna = antrenamenteInLuna.filter(
                a => a.grupa_id && grupeDeContorizat.has(a.grupa_id)
            );
            const totalTrainings = antrenamenteGrupaLuna.length;
            const attendedTrainings = antrenamenteGrupaLuna.filter(a =>
                (a.prezenta || []).some((p: any) => p.sportiv_id === sportiv.id && p.status?.este_prezent === true)
            ).length;

            // â”€â”€ PrezenÈ›e perioadÄƒ examen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            const antrenamenteGrupaPeriodaExamen = antrenamentePerioadaExamen.filter(
                a => a.grupa_id && grupeDeContorizat.has(a.grupa_id)
            );
            const totalPerioadaExamen = antrenamenteGrupaPeriodaExamen.length;
            const attendedPerioadaExamen = antrenamenteGrupaPeriodaExamen.filter(a =>
                (a.prezenta || []).some((p: any) => p.sportiv_id === sportiv.id && p.status?.este_prezent === true)
            ).length;

            // â”€â”€ Breakdown per grupÄƒ (luna curentÄƒ) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            const grupeBreakdown: GrupaBreakdown[] = [];
            grupeDeContorizat.forEach(gid => {
                const antTrGrupa = antrenamenteInLuna.filter(a => a.grupa_id === gid);
                if (antTrGrupa.length === 0) return;
                grupeBreakdown.push({
                    grupaId: gid,
                    grupaDenumire: grupeMap.get(gid) ?? gid,
                    tip: sportiv.grupa_id === gid ? 'principala' : 'secundara',
                    totalTrainings: antTrGrupa.length,
                    attendedTrainings: antTrGrupa.filter(a =>
                        (a.prezenta || []).some((p: any) => p.sportiv_id === sportiv.id && p.status?.este_prezent === true)
                    ).length,
                });
            });
            grupeBreakdown.sort((a, b) => {
                if (a.tip === 'principala' && b.tip !== 'principala') return -1;
                if (b.tip === 'principala' && a.tip !== 'principala') return 1;
                return a.grupaDenumire.localeCompare(b.grupaDenumire);
            });

            const gradActual = grade.find(g => g.id === sportiv.grad_actual_id)?.nume || 'ÃŽncepÄƒtor';

            return {
                sportivId: sportiv.id,
                nume: `${sportiv.nume} ${sportiv.prenume}`,
                grad: gradActual,
                totalTrainings,
                attendedTrainings,
                perioadaStart: perioadaExamen.start,
                perioadaEnd: perioadaExamen.end,
                totalPerioadaExamen,
                attendedPerioadaExamen,
                grupeBreakdown,
            };
        }).filter((row): row is ReportRow => row !== null && (grupaId ? true : row.totalTrainings > 0))
          .sort((a, b) => a.nume.localeCompare(b.nume));

    }, [filters, sportivi, grupe, antrenamente, grade, grupeSecundareMap, perioadaExamen]);

    // â”€â”€ Export CSV â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleExport = () => {
        const dataToExport = reportData.map(d => ({
            "Nume Sportiv": d.nume,
            "Grad Actual": d.grad,
            "Planificate (luna)": d.totalTrainings,
            "PrezenÈ›e (luna)": d.attendedTrainings,
            "Procentaj (luna)": d.totalTrainings > 0 ? `${Math.round((d.attendedTrainings / d.totalTrainings) * 100)}%` : 'N/A',
            "Planificate (perioadÄƒ examen)": d.totalPerioadaExamen,
            "PrezenÈ›e (perioadÄƒ examen)": d.attendedPerioadaExamen,
            "PerioadÄƒ Start": d.perioadaStart ? fmtDate(d.perioadaStart) : 'ÃŽnceput',
            "PerioadÄƒ End": fmtDate(d.perioadaEnd),
            "Grupe": d.grupeBreakdown.map(g => `${g.grupaDenumire}: ${g.attendedTrainings}/${g.totalTrainings}`).join(' | '),
        }));
        const monthName = new Date(filters.year, filters.month).toLocaleString('ro-RO', { month: 'long' });
        exportToCsv(`raport_prezenta_${monthName}_${filters.year}.csv`, dataToExport);
    };

    const months = Array.from({ length: 12 }, (_, i) => ({
        value: i,
        label: new Date(0, i).toLocaleString('ro-RO', { month: 'long' })
    }));
    const years = [2024, 2025, 2026];

    // â”€â”€ Randare perioadÄƒ examen header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const perioadaLabel = useMemo(() => {
        const { start, end } = perioadaExamen;
        const startStr = start ? `dupÄƒ ${fmtDate(start)}` : 'De la Ã®nceput';
        const endStr = end === today.toISOString().slice(0, 10) ? 'azi' : `pÃ¢nÄƒ la ${fmtDate(end)}`;
        return `${startStr} â€” ${endStr}`;
    }, [perioadaExamen]);

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="secondary" onClick={onBack} className="shrink-0">
                    <ArrowLeftIcon className="w-5 h-5 mr-2" />ÃŽnapoi
                </Button>
                <h1 className="text-xl md:text-3xl font-bold text-white truncate">Raport Lunar PrezenÈ›Äƒ</h1>
            </div>

            {/* Filtre */}
            <Card className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                <Select label="An" name="year" value={String(filters.year)} onChange={handleFilterChange}>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </Select>
                <Select label="LunÄƒ" name="month" value={String(filters.month)} onChange={handleFilterChange}>
                    {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </Select>
                <Select label="GrupÄƒ" name="grupaId" value={filters.grupaId} onChange={handleFilterChange}>
                    <option value="">Toate Grupele</option>
                    {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                </Select>
            </Card>

            {/* Banner perioadÄƒ examen */}
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-900/30 border border-indigo-700/40 text-indigo-300 text-sm">
                <span className="font-semibold shrink-0">PerioadÄƒ examen:</span>
                <span className="truncate">{loadingExamene ? 'Se Ã®ncarcÄƒ...' : perioadaLabel}</span>
            </div>

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
                        Niciun sportiv de afiÈ™at conform filtrelor.
                    </p>
                ) : (
                    <>
                        {/* â”€â”€ Tabel desktop â”€â”€ */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-800 text-slate-400">
                                    <tr>
                                        <th className="p-3 font-semibold w-6"></th>
                                        <th className="p-3 font-semibold">Nume Sportiv</th>
                                        <th className="p-3 font-semibold">Grad</th>
                                        <th className="p-3 font-semibold text-center" colSpan={3}>
                                            <span className="text-slate-300">Luna curentÄƒ</span>
                                        </th>
                                        <th className="p-3 font-semibold text-center border-l border-slate-700" colSpan={2}>
                                            <span className="text-indigo-300">PerioadÄƒ examen</span>
                                        </th>
                                    </tr>
                                    <tr className="text-xs">
                                        <th className="pb-2"></th>
                                        <th className="pb-2"></th>
                                        <th className="pb-2"></th>
                                        <th className="pb-2 text-center">Planificate</th>
                                        <th className="pb-2 text-center">PrezenÈ›e</th>
                                        <th className="pb-2 text-center">%</th>
                                        <th className="pb-2 text-center border-l border-slate-700">PrezenÈ›e</th>
                                        <th className="pb-2 text-center">din</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {reportData.map(row => {
                                        const percentage = row.totalTrainings > 0
                                            ? Math.round((row.attendedTrainings / row.totalTrainings) * 100)
                                            : 0;
                                        const atRisk = row.attendedTrainings < 5;
                                        const isExpanded = expandedRows.has(row.sportivId);
                                        const hasMultiGrupe = row.grupeBreakdown.length > 1;

                                        return (
                                            <React.Fragment key={row.sportivId}>
                                                <tr className={`${percentage < 50 ? 'bg-red-900/10' : ''} hover:bg-slate-700/30`}>
                                                    <td className="p-3 w-6">
                                                        {hasMultiGrupe && (
                                                            <button
                                                                onClick={() => toggleExpand(row.sportivId)}
                                                                className="text-slate-400 hover:text-white transition-colors"
                                                                title={isExpanded ? 'Ascunde grupe' : 'AfiÈ™eazÄƒ breakdown per grupÄƒ'}
                                                            >
                                                                {isExpanded
                                                                    ? <ChevronDownIcon className="w-4 h-4" />
                                                                    : <ChevronRightIcon className="w-4 h-4" />}
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="p-3 font-medium text-white">
                                                        <div className="flex items-center gap-2">
                                                            {percentage < 50 && (
                                                                <span title="PrezenÈ›Äƒ sub 50%">
                                                                    <ExclamationTriangleIcon className="w-4 h-4 text-red-500 shrink-0" />
                                                                </span>
                                                            )}
                                                            {row.nume}
                                                            {hasMultiGrupe && (
                                                                <span className="text-xs text-slate-500 font-normal">
                                                                    ({row.grupeBreakdown.length} grupe)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-slate-300">{row.grad}</td>
                                                    <td className="p-3 text-center text-slate-300">{row.totalTrainings}</td>
                                                    <td className={`p-3 text-center font-bold ${atRisk ? 'text-red-400' : 'text-white'}`}>
                                                        {row.attendedTrainings}
                                                    </td>
                                                    <td className={`p-3 text-center font-bold ${percentage < 50 ? 'text-red-400' : 'text-green-400'}`}>
                                                        {percentage}%
                                                    </td>
                                                    <td className="p-3 text-center border-l border-slate-700">
                                                        <span className="font-bold text-indigo-300">
                                                            {row.attendedPerioadaExamen}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-center text-slate-400 text-xs">
                                                        {row.totalPerioadaExamen}
                                                    </td>
                                                </tr>

                                                {/* Breakdown per grupÄƒ (expandat) */}
                                                {isExpanded && hasMultiGrupe && (
                                                    <tr className="bg-slate-800/60">
                                                        <td colSpan={8} className="px-8 py-2">
                                                            <div className="flex flex-wrap gap-2">
                                                                {row.grupeBreakdown.map(gb => (
                                                                    <div
                                                                        key={gb.grupaId}
                                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border ${
                                                                            gb.tip === 'principala'
                                                                                ? 'bg-slate-700/60 border-slate-600 text-slate-200'
                                                                                : 'bg-purple-900/20 border-purple-700/40 text-purple-300'
                                                                        }`}
                                                                    >
                                                                        <span className="font-semibold">{gb.grupaDenumire}</span>
                                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                                                            gb.tip === 'principala'
                                                                                ? 'bg-slate-600 text-slate-300'
                                                                                : 'bg-purple-800/50 text-purple-400'
                                                                        }`}>
                                                                            {gb.tip === 'principala' ? 'principalÄƒ' : 'secundarÄƒ'}
                                                                        </span>
                                                                        <span className="font-bold text-white">
                                                                            {gb.attendedTrainings}/{gb.totalTrainings}
                                                                        </span>
                                                                        <span className={`font-medium ${
                                                                            gb.totalTrainings > 0 && gb.attendedTrainings / gb.totalTrainings < 0.5
                                                                                ? 'text-red-400'
                                                                                : 'text-green-400'
                                                                        }`}>
                                                                            {gb.totalTrainings > 0
                                                                                ? `${Math.round((gb.attendedTrainings / gb.totalTrainings) * 100)}%`
                                                                                : 'â€”'}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* â”€â”€ Carduri mobile â”€â”€ */}
                        <div className="md:hidden divide-y divide-slate-700/50">
                            {reportData.map(row => {
                                const percentage = row.totalTrainings > 0
                                    ? Math.round((row.attendedTrainings / row.totalTrainings) * 100)
                                    : 0;
                                const atRisk = percentage < 50;
                                const barWidth = Math.min(percentage, 100);
                                const isExpanded = expandedRows.has(row.sportivId);
                                const hasMultiGrupe = row.grupeBreakdown.length > 1;

                                return (
                                    <div
                                        key={row.sportivId}
                                        className={`p-3 ${atRisk ? 'bg-red-900/10' : ''}`}
                                    >
                                        {/* Header card */}
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

                                        {/* BarÄƒ progres */}
                                        <div className="w-full bg-slate-700 rounded-full h-1.5 mb-2">
                                            <div
                                                className={`h-1.5 rounded-full transition-all ${atRisk ? 'bg-red-500' : 'bg-green-500'}`}
                                                style={{ width: `${barWidth}%` }}
                                            />
                                        </div>

                                        {/* Stats luna */}
                                        <div className="flex gap-4 text-xs text-slate-400 mb-2">
                                            <span>
                                                <span className="text-slate-500">Planificate: </span>
                                                <span className="text-slate-200 font-medium">{row.totalTrainings}</span>
                                            </span>
                                            <span>
                                                <span className="text-slate-500">PrezenÈ›e: </span>
                                                <span className={`font-medium ${row.attendedTrainings < 5 ? 'text-red-400' : 'text-slate-200'}`}>
                                                    {row.attendedTrainings}
                                                </span>
                                            </span>
                                        </div>

                                        {/* Stats perioadÄƒ examen */}
                                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-indigo-900/20 border border-indigo-800/30 text-xs mb-2">
                                            <span className="text-indigo-400 font-semibold shrink-0">PerioadÄƒ examen:</span>
                                            <span className="text-indigo-200 font-bold">{row.attendedPerioadaExamen}</span>
                                            <span className="text-indigo-500">din</span>
                                            <span className="text-indigo-300">{row.totalPerioadaExamen}</span>
                                        </div>

                                        {/* Breakdown grupe (mobile) */}
                                        {hasMultiGrupe && (
                                            <button
                                                onClick={() => toggleExpand(row.sportivId)}
                                                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors mb-1"
                                            >
                                                {isExpanded
                                                    ? <ChevronDownIcon className="w-3 h-3" />
                                                    : <ChevronRightIcon className="w-3 h-3" />}
                                                <span>{isExpanded ? 'Ascunde' : 'AfiÈ™eazÄƒ'} breakdown grupe ({row.grupeBreakdown.length})</span>
                                            </button>
                                        )}
                                        {isExpanded && hasMultiGrupe && (
                                            <div className="flex flex-col gap-1 mt-1 pl-2 border-l-2 border-slate-700">
                                                {row.grupeBreakdown.map(gb => (
                                                    <div key={gb.grupaId} className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${gb.tip === 'principala' ? 'bg-slate-400' : 'bg-purple-400'}`} />
                                                            <span className="text-slate-300">{gb.grupaDenumire}</span>
                                                        </div>
                                                        <span className={`font-medium ${
                                                            gb.totalTrainings > 0 && gb.attendedTrainings / gb.totalTrainings < 0.5
                                                                ? 'text-red-400'
                                                                : 'text-slate-200'
                                                        }`}>
                                                            {gb.attendedTrainings}/{gb.totalTrainings}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
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

