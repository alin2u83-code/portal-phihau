import React, { useMemo, useState } from 'react';
import { Sportiv } from '../../types';
import { Card, Button, Badge, SearchInput, ClubSelect } from '../ui';
import { ArrowLeftIcon, ExclamationTriangleIcon } from '../icons';
import { useData } from '../../contexts/DataContext';
import { usePermissions } from '../../hooks/usePermissions';
import { computeAnomaliiGrade, AnomalieGrad, TipAnomalieGrad } from '../../utils/auditGrade';

interface AuditGradeProps {
    onBack: () => void;
    onViewSportiv?: (s: Sportiv, tab?: 'profil' | 'contact' | 'grade' | 'financiar' | 'familie' | 'grupe-istoric') => void;
}

const ETICHETE_TIP: Record<TipAnomalieGrad, string> = {
    varsta_debut: 'Vârstă debut',
    distanta_insuficienta: 'Distanță insuficientă',
    varsta_sub_minim: 'Vârstă sub minim',
    grad_sarit: 'Grad sărit',
    incompatibil_varsta_grad: 'Incompatibilitate vârstă-grad',
};

export const AuditGrade: React.FC<AuditGradeProps> = ({ onBack, onViewSportiv }) => {
    const { filteredData, grade, clubs, activeRoleContext } = useData();
    const permissions = usePermissions(activeRoleContext);

    const sportivi = filteredData.sportivi;
    const istoricGrade = filteredData.istoricGrade;
    const sesiuniExamene = filteredData.sesiuniExamene;

    const [clubIdFilter, setClubIdFilter] = useState('');
    const [cautare, setCautare] = useState('');
    const [severitateFilter, setSeveritateFilter] = useState<'toate' | 'critic' | 'atentie'>('toate');

    const toateAnomaliile = useMemo(
        () => computeAnomaliiGrade(sportivi, istoricGrade, grade, sesiuniExamene),
        [sportivi, istoricGrade, grade, sesiuniExamene]
    );

    const anomaliiFiltrate = useMemo(() => {
        return toateAnomaliile.filter(a => {
            if (clubIdFilter && a.club_id !== clubIdFilter) return false;
            if (severitateFilter !== 'toate' && a.severitate !== severitateFilter) return false;
            if (cautare.trim() && !a.sportiv_nume.toLowerCase().includes(cautare.trim().toLowerCase())) return false;
            return true;
        });
    }, [toateAnomaliile, clubIdFilter, severitateFilter, cautare]);

    const grupatPeSportiv = useMemo(() => {
        const map = new Map<string, AnomalieGrad[]>();
        for (const a of anomaliiFiltrate) {
            if (!map.has(a.sportiv_id)) map.set(a.sportiv_id, []);
            map.get(a.sportiv_id)!.push(a);
        }
        return Array.from(map.entries()).map(([sportiv_id, anomalii]) => ({
            sportiv: sportivi.find(s => s.id === sportiv_id),
            anomalii,
        })).filter(g => !!g.sportiv);
    }, [anomaliiFiltrate, sportivi]);

    const anomaliiPeClubSiCautare = useMemo(() => {
        return toateAnomaliile.filter(a => {
            if (clubIdFilter && a.club_id !== clubIdFilter) return false;
            if (cautare.trim() && !a.sportiv_nume.toLowerCase().includes(cautare.trim().toLowerCase())) return false;
            return true;
        });
    }, [toateAnomaliile, clubIdFilter, cautare]);

    const nrCritice = anomaliiPeClubSiCautare.filter(a => a.severitate === 'critic').length;
    const nrAtentie = anomaliiPeClubSiCautare.filter(a => a.severitate === 'atentie').length;

    return (
        <div className="p-3 sm:p-4 lg:p-6 space-y-4">
            <div className="flex items-center gap-3">
                <Button variant="secondary" size="sm" onClick={onBack} className="shrink-0">
                    <ArrowLeftIcon className="w-4 h-4" />
                </Button>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white flex items-center gap-2 min-w-0">
                    <ExclamationTriangleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0" />
                    <span className="truncate">Audit Grade</span>
                </h1>
            </div>
            <p className="text-sm text-slate-400">
                Scanare a istoricului de grade pentru abateri: vârstă necorespunzătoare, distanță insuficientă
                între examene și grade sărite din secvență.
            </p>

            <Card className="p-3 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 lg:items-end">
                    <SearchInput
                        label="Caută sportiv"
                        placeholder="Nume sportiv..."
                        value={cautare}
                        onChange={e => setCautare(e.target.value)}
                    />
                    {permissions.isFederationAdmin ? (
                        <ClubSelect
                            clubs={clubs}
                            value={clubIdFilter}
                            onChange={e => setClubIdFilter(e.target.value)}
                        />
                    ) : (
                        <div className="hidden lg:block" />
                    )}
                    <div className="grid grid-cols-3 sm:flex gap-2">
                        {(['toate', 'critic', 'atentie'] as const).map(sev => (
                            <Button
                                key={sev}
                                size="sm"
                                variant={severitateFilter === sev ? 'primary' : 'secondary'}
                                onClick={() => setSeveritateFilter(sev)}
                                className="w-full sm:w-auto"
                            >
                                {sev === 'toate' ? 'Toate' : sev === 'critic' ? 'Critice' : 'Atenționări'}
                            </Button>
                        ))}
                    </div>
                    <div className="flex gap-2 text-sm sm:justify-end">
                        <Badge variant="red">{nrCritice} critice</Badge>
                        <Badge variant="amber">{nrAtentie} atenționări</Badge>
                    </div>
                </div>
            </Card>

            {grupatPeSportiv.length === 0 ? (
                <Card className="p-8 text-center text-slate-400">
                    Nicio anomalie găsită pentru criteriile selectate.
                </Card>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {grupatPeSportiv.map(({ sportiv, anomalii }) => (
                        <Card key={sportiv!.id} className="p-3 sm:p-4">
                            <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                                <button
                                    type="button"
                                    onClick={() => onViewSportiv?.(sportiv!, 'grade')}
                                    className={`text-base font-semibold break-words ${onViewSportiv ? 'text-amber-400 hover:underline cursor-pointer' : 'text-white cursor-default'}`}
                                >
                                    {sportiv!.nume} {sportiv!.prenume}
                                </button>
                                <span className="text-xs text-slate-500 shrink-0">{anomalii.length} anomalie(i)</span>
                            </div>
                            <div className="space-y-2">
                                {anomalii.map((a, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-2.5 sm:p-3 rounded-md border text-sm ${a.severitate === 'critic' ? 'border-red-500 bg-red-900/20 text-red-300' : 'border-amber-500 bg-amber-900/20 text-amber-300'}`}
                                    >
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <Badge variant={a.severitate === 'critic' ? 'red' : 'amber'}>{ETICHETE_TIP[a.tip]}</Badge>
                                            <span className="text-xs text-slate-500">
                                                {new Date(a.data_relevanta).toLocaleDateString('ro-RO')}
                                            </span>
                                        </div>
                                        <p className="break-words">{a.mesaj}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
