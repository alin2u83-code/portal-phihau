import React, { useEffect, useState } from 'react';
import { Grupa as GrupaType, ProgramItem } from '../../types';
import { Button, Card } from '../ui';
import { TrashIcon, UsersIcon, UserPlusIcon, CogIcon, CalendarIcon, ExclamationTriangleIcon, SparklesIcon } from '../icons';
import { sortProgram } from './ProgramEditor';
import { formatTime } from '../../utils/date';
import { supabase } from '../../supabaseClient';

interface GrupaWithDetails extends GrupaType {
    sportivi: { count: number }[];
    program: ProgramItem[];
}

interface ExceptieActiva {
    id: string;
    tip: string;
    este_anulat: boolean;
    data_inceput: string;
    data_sfarsit: string | null;
}

// Returnează excepțiile active pentru ziua de azi
function calculeazaBadge(exceptii: ExceptieActiva[]): { programModificat: boolean; anulatAzi: boolean } {
    const azi = new Date().toISOString().split('T')[0];
    let programModificat = false;
    let anulatAzi = false;

    for (const e of exceptii) {
        const inInterval = e.data_inceput <= azi && (e.data_sfarsit == null || e.data_sfarsit >= azi);
        const schimbareViitoare = e.tip === 'schimbare_permanenta' && e.data_inceput >= azi;

        if (inInterval || schimbareViitoare) {
            if (e.este_anulat && e.data_inceput <= azi && (e.data_sfarsit == null || e.data_sfarsit >= azi)) {
                anulatAzi = true;
            } else {
                programModificat = true;
            }
        }
    }
    return { programModificat, anulatAzi };
}

export const GrupaCard: React.FC<{
    grupa: GrupaWithDetails;
    onEdit: (g: GrupaWithDetails) => void;
    onDelete: (g: GrupaWithDetails) => void;
    onAdaugaSportivi: (g: GrupaWithDetails) => void;
    onConfigurareOrar: (g: GrupaWithDetails) => void;
    onModificareOrar?: (g: GrupaWithDetails) => void;
    onGestionareSecundari?: (g: GrupaWithDetails) => void;
    onGenerareAntrenamente?: (g: GrupaWithDetails) => void;
    nrSecundari?: number;
}> = ({
    grupa,
    onEdit,
    onDelete,
    onAdaugaSportivi,
    onConfigurareOrar,
    onModificareOrar,
    onGestionareSecundari,
    onGenerareAntrenamente,
    nrSecundari,
}) => {
    const sportiviCount = grupa.sportivi?.[0]?.count ?? 0;
    const [exceptii, setExceptii] = useState<ExceptieActiva[]>([]);

    useEffect(() => {
        const azi = new Date().toISOString().split('T')[0];
        supabase
            .from('orar_exceptii')
            .select('id, tip, este_anulat, data_inceput, data_sfarsit')
            .eq('grupa_id', grupa.id)
            .or(
                // excepții active azi sau în viitor (schimbare permanentă)
                `and(data_inceput.lte.${azi},or(data_sfarsit.is.null,data_sfarsit.gte.${azi})),and(tip.eq.schimbare_permanenta,data_inceput.gte.${azi})`
            )
            .then(({ data }) => {
                if (data) setExceptii(data as ExceptieActiva[]);
            });
    }, [grupa.id]);

    const { programModificat, anulatAzi } = calculeazaBadge(exceptii);

    return (
        <Card className="flex flex-col h-full group">
            <div className="flex-grow">
                <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-xl font-bold text-white">{grupa.denumire}</h3>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                        {anulatAzi && (
                            <span className="inline-flex items-center gap-1 bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs px-2 py-0.5 rounded-full font-medium">
                                <ExclamationTriangleIcon className="w-3 h-3" />
                                Anulat azi
                            </span>
                        )}
                        {programModificat && !anulatAzi && (
                            <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs px-2 py-0.5 rounded-full font-medium">
                                <CalendarIcon className="w-3 h-3" />
                                Program modificat
                            </span>
                        )}
                    </div>
                </div>
                <p className="text-sm text-slate-400 mb-4">{grupa.sala || 'Sală nespecificată'}</p>
                <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
                    <div className="flex items-center gap-2 text-green-400">
                        <UsersIcon className="w-4 h-4"/>
                        <span>{sportiviCount} Sportivi Activi</span>
                    </div>
                    {nrSecundari !== undefined && nrSecundari > 0 && (
                        <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center bg-purple-500/20 text-purple-400 border border-purple-500/50 text-xs px-2 py-0.5 rounded font-medium">
                                {nrSecundari} SECUNDAR{nrSecundari !== 1 ? 'I' : ''}
                            </span>
                        </div>
                    )}
                </div>
                <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Orar</h4>
                <div className="space-y-1">
                    {sortProgram(grupa.program).map(p => (
                        <div key={p.id} className="text-xs font-semibold bg-slate-700/50 px-2 py-1 rounded-full text-slate-300">
                            {p.ziua}: {formatTime(p.ora_start)} - {formatTime(p.ora_sfarsit)}
                        </div>
                    ))}
                    {grupa.program.length === 0 && <p className="text-xs italic text-slate-500">Niciun program.</p>}
                </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-700 flex flex-wrap justify-end gap-2">
                <Button size="sm" variant="danger" onClick={() => onDelete(grupa)}><TrashIcon className="w-4 h-4"/></Button>
                <Button size="sm" variant="info" onClick={() => onAdaugaSportivi(grupa)}>
                    <UserPlusIcon className="w-4 h-4 mr-1.5" />
                    Sportivi
                </Button>
                {onGestionareSecundari && (
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onGestionareSecundari(grupa)}
                        className="border-purple-500/40 text-purple-400 hover:bg-purple-500/10 hover:border-purple-400"
                        title="Gestionează sportivii secundari"
                    >
                        <UsersIcon className="w-4 h-4 mr-1.5" />
                        Secundari
                        {nrSecundari !== undefined && nrSecundari > 0 && (
                            <span className="ml-1 bg-purple-500/30 text-purple-300 text-xs px-1.5 py-0.5 rounded-full font-bold">
                                {nrSecundari}
                            </span>
                        )}
                    </Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => onConfigurareOrar(grupa)}>
                    <CogIcon className="w-4 h-4 mr-1.5" />
                    Orar
                </Button>
                {onModificareOrar && (
                    <Button
                        size="sm"
                        variant="warning"
                        onClick={() => onModificareOrar(grupa)}
                        title="Înregistrează o excepție sau schimbare permanentă de orar"
                    >
                        <CalendarIcon className="w-4 h-4 mr-1.5" />
                        Modifică Program
                    </Button>
                )}
                {onGenerareAntrenamente && (
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onGenerareAntrenamente(grupa)}
                        className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-400"
                        title="Generează antrenamente pe o perioadă din orarul săptămânal"
                    >
                        <SparklesIcon className="w-4 h-4 mr-1.5" />
                        Generează
                    </Button>
                )}
                <Button size="sm" variant="primary" onClick={() => onEdit(grupa)}>Gestionează</Button>
            </div>
        </Card>
    );
};
