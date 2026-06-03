import React from 'react';
import { Card, Button } from '../../ui';
import { XIcon, TransferIcon } from '../../icons';
import { PereacheDuplicat } from './types';
import { SportivInfoCard } from './SportivInfoCard';

export const CardPereache: React.FC<{
    pereche: PereacheDuplicat;
    ignorata: boolean;
    fuzionata: boolean;
    inProgres: boolean;
    primarId: string;
    gradeMap: Record<string, string>;
    onSelectPrimar: (id: string) => void;
    onIgnora: () => void;
    onFuzioneaza: () => void;
}> = ({
    pereche, ignorata, fuzionata, inProgres, primarId,
    gradeMap, onSelectPrimar, onIgnora, onFuzioneaza,
}) => {
    const scoreColor =
        pereche.similarity_score >= 0.95 ? 'text-rose-400 bg-rose-500/15 border-rose-500/30' :
        pereche.similarity_score >= 0.85 ? 'text-amber-400 bg-amber-500/15 border-amber-500/30' :
                                           'text-blue-400 bg-blue-500/15 border-blue-500/30';

    if (fuzionata) return null;

    return (
        <Card className={`
            p-4 sm:p-5 border transition-all
            ${ignorata
                ? 'opacity-40 border-slate-700/40 hover:opacity-70'
                : 'border-amber-500/20 hover:border-amber-500/30'
            }
        `}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-lg border ${scoreColor}`}>
                        {pereche.motiv}
                    </span>
                    <span className="text-xs text-slate-500">
                        Scor: {(pereche.similarity_score * 100).toFixed(0)}%
                    </span>
                    {pereche.sursa === 'local' && (
                        <span className="text-[10px] text-slate-600 italic">detectat local</span>
                    )}
                    {ignorata && (
                        <span className="text-xs text-slate-500 italic">— ignorat</span>
                    )}
                </div>

                {!ignorata && (
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={onIgnora}
                            title="Nu sunt duplicate — ignoră această pereche"
                            className="
                                text-xs text-slate-400 hover:text-slate-200 transition-colors
                                px-3 py-1.5 rounded-lg border border-slate-600 hover:border-slate-500
                                flex items-center gap-1.5 active:scale-95
                            "
                        >
                            <XIcon className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Nu sunt duplicate</span>
                            <span className="sm:hidden">Ignora</span>
                        </button>
                        <Button
                            size="sm"
                            variant="warning"
                            onClick={onFuzioneaza}
                            isLoading={inProgres}
                            disabled={inProgres}
                        >
                            <TransferIcon className="h-3.5 w-3.5 mr-1.5" />
                            Fuzioneaza
                        </Button>
                    </div>
                )}

                {ignorata && (
                    <button
                        type="button"
                        onClick={onIgnora}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline"
                    >
                        Anuleaza ignorare
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SportivInfoCard
                    sportiv={pereche.sportiv_a}
                    esteSelectat={primarId === pereche.sportiv_a.id}
                    eticheta={primarId === pereche.sportiv_a.id ? 'PRIMAR' : 'SECUNDAR'}
                    gradeMap={gradeMap}
                    onClick={() => onSelectPrimar(pereche.sportiv_a.id)}
                    disabled={inProgres}
                />
                <SportivInfoCard
                    sportiv={pereche.sportiv_b}
                    esteSelectat={primarId === pereche.sportiv_b.id}
                    eticheta={primarId === pereche.sportiv_b.id ? 'PRIMAR' : 'SECUNDAR'}
                    gradeMap={gradeMap}
                    onClick={() => onSelectPrimar(pereche.sportiv_b.id)}
                    disabled={inProgres}
                />
            </div>

            {!ignorata && (
                <p className="text-[11px] text-slate-600 mt-3 italic">
                    Click pe un sportiv pentru a-l marca ca Primar (se pastreaza).
                    Cel secundar va fi dezactivat dupa fuzionare.
                </p>
            )}
        </Card>
    );
};
