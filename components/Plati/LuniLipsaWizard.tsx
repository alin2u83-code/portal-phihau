import React, { useMemo, useState } from 'react';
import type { Sportiv, Plata, TipAbonament } from '../../types';
import { Modal, Button, Input } from '../ui';
import { ExclamationTriangleIcon, CheckCircleIcon } from '../icons';
import { calculeazaLuniLipsa, formatLuna } from '../../utils/luniLipsa';
import { genereazaFacturaAbonament } from '../../services/facturaService';
import { useDataStartFacturare } from '../../hooks/useDataStartFacturare';
import { useError } from '../ErrorProvider';

interface LuniLipsaWizardProps {
    sportiv: Sportiv;
    plati: Plata[];
    tipuriAbonament: TipAbonament[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    onClose: () => void;
}

/**
 * Wizard detectare + generare bulk luni lipsă (PLF-03).
 *
 * Flux:
 * 1. Citește data_start_facturare via useDataStartFacturare (fetch izolat).
 * 2. Dacă null → cere adminului să seteze data.
 * 3. Dacă setat → calculează lunile lipsă cu calculeazaLuniLipsa (useMemo, nu render loop).
 * 4. Afișează lista cu checkbox-uri (bifate default).
 * 5. handleGenereazaBulk: pentru fiecare lună selectată apelează genereazaFacturaAbonament.
 *    - Suma calculată din tipuriAbonament (familie → nr membri activi, altfel tip_abonament_id).
 *    - Duplicate returnate de serviciu sunt sărite (error.message logat).
 *    - La succes actualizează setPlati cu fiecare Plata nouă.
 *    - isGenerating blochează dublu-click (T-14-10).
 */
export const LuniLipsaWizard: React.FC<LuniLipsaWizardProps> = ({
    sportiv,
    plati,
    tipuriAbonament,
    setPlati,
    onClose,
}) => {
    const { showSuccess, showError } = useError();
    const { dataStartFacturare, isLoading: isLoadingData, setDataStartFacturare, isSaving } = useDataStartFacturare(sportiv.id);

    // Câmp local pentru setare data_start_facturare (dacă lipsește)
    const [dataStartLocal, setDataStartLocal] = useState('');

    // Plăți filtrate ale acestui sportiv (stabile pentru useMemo)
    const platiSportiv = useMemo(() => plati.filter(p => p.sportiv_id === sportiv.id), [plati, sportiv.id]);

    // Calcul luni lipsă — restrâns la sportivi activi (guard suplimentar conform spec)
    const luniLipsa = useMemo(() => {
        if (sportiv.status !== 'Activ') return [];
        return calculeazaLuniLipsa(dataStartFacturare, platiSportiv);
    }, [dataStartFacturare, platiSportiv, sportiv.status]);

    // Checkbox state — toate bifate implicit
    const [checked, setChecked] = useState<Record<string, boolean>>({});

    // La prima calculare a luniLipsa, bifăm toate
    const luniCuBifa = useMemo(() => {
        const result: Record<string, boolean> = {};
        luniLipsa.forEach(({ luna, an }) => {
            const key = `${an}-${luna}`;
            result[key] = checked[key] !== undefined ? checked[key] : true;
        });
        return result;
    }, [luniLipsa]); // eslint-disable-line react-hooks/exhaustive-deps

    const [isGenerating, setIsGenerating] = useState(false);

    const toggleLuna = (key: string) => {
        setChecked(prev => ({ ...prev, [key]: !(luniCuBifa[key] ?? true) }));
    };

    const luniSelectate = luniLipsa.filter(({ luna, an }) => {
        const key = `${an}-${luna}`;
        return luniCuBifa[key] !== false;
    });

    // Calculul sumei abonament per sportiv (refolosit din GestiuneFacturi liniile 97-106)
    const calculeazaSuma = (): number => {
        if (sportiv.familie_id) {
            // Familie: preț bazat pe numărul de membri activi din familie
            // Nu avem acces la sportivi din acest context, deci folosim tip_abonament_id
            // ca fallback (același pattern ca GestiuneFacturi)
            const config = tipuriAbonament.find(ab => ab.id === sportiv.tip_abonament_id)
                ?? tipuriAbonament.find(ab => ab.numar_membri === 1);
            return config?.pret ?? 0;
        }
        const config = tipuriAbonament.find(ab => ab.id === sportiv.tip_abonament_id)
            ?? tipuriAbonament.find(ab => ab.numar_membri === 1);
        return config?.pret ?? 0;
    };

    const handleGenereazaBulk = async () => {
        if (isGenerating || luniSelectate.length === 0) return;
        setIsGenerating(true);

        const suma = calculeazaSuma();
        let nrGenerate = 0;
        let nrSarite = 0;

        for (const { luna, an } of luniSelectate) {
            const { data, error } = await genereazaFacturaAbonament({
                sportiv,
                luna,
                an,
                suma,
                descriere: `Abonament ${formatLuna(luna, an)}`,
                observatii: 'Generat bulk din wizard luni lipsă',
            });

            if (data) {
                setPlati(prev => [data, ...prev]);
                nrGenerate++;
            } else {
                // Duplicat sau altă eroare — sărind
                console.warn('[LuniLipsaWizard] skiped:', error?.message);
                nrSarite++;
            }
        }

        setIsGenerating(false);

        if (nrGenerate > 0) {
            showSuccess(
                'Generare finalizată',
                `${nrGenerate} ${nrGenerate === 1 ? 'factură generată' : 'facturi generate'}.${nrSarite > 0 ? ` ${nrSarite} sărite (duplicate).` : ''}`
            );
            onClose();
        } else {
            showError('Nimic de generat', 'Toate lunile selectate au deja facturi sau au apărut erori.');
        }
    };

    const handleSalveazaDataStart = () => {
        if (!dataStartLocal) return;
        setDataStartFacturare(dataStartLocal);
    };

    return (
        <Modal isOpen onClose={onClose} title={`Luni fără factură — ${sportiv.nume} ${sportiv.prenume}`}>
            <div className="space-y-4">
                {/* Guard: sportiv inactiv */}
                {sportiv.status !== 'Activ' && (
                    <div className="flex items-center gap-2 p-3 bg-slate-700/40 border border-slate-600 rounded-xl text-slate-400 text-sm">
                        <ExclamationTriangleIcon className="w-4 h-4 shrink-0 text-amber-400" />
                        Sportivul este inactiv. Calculul lunilor lipsă se aplică doar sportivilor activi.
                    </div>
                )}

                {/* Loading */}
                {isLoadingData && sportiv.status === 'Activ' && (
                    <p className="text-slate-400 text-sm animate-pulse">Se încarcă data de start...</p>
                )}

                {/* Lipsă data_start_facturare — cerere setare */}
                {!isLoadingData && !dataStartFacturare && sportiv.status === 'Activ' && (
                    <div className="space-y-3">
                        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-sm">
                            <ExclamationTriangleIcon className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                            <span>Setează mai întâi data de start facturare pentru a putea calcula lunile lipsă.</span>
                        </div>
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <Input
                                    label="Data start facturare"
                                    type="date"
                                    value={dataStartLocal}
                                    onChange={e => setDataStartLocal(e.target.value)}
                                />
                            </div>
                            <Button
                                variant="primary"
                                onClick={handleSalveazaDataStart}
                                isLoading={isSaving}
                                disabled={!dataStartLocal || isSaving}
                                className="shrink-0 mb-0"
                            >
                                Salvează
                            </Button>
                        </div>
                    </div>
                )}

                {/* Lista luni lipsă */}
                {!isLoadingData && dataStartFacturare && sportiv.status === 'Activ' && (
                    <>
                        {luniLipsa.length === 0 ? (
                            <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm">
                                <CheckCircleIcon className="w-5 h-5 shrink-0 text-emerald-400" />
                                Toate lunile sunt acoperite. Nicio factură lipsă.
                            </div>
                        ) : (
                            <>
                                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                                    {luniLipsa.length} {luniLipsa.length === 1 ? 'lună lipsă' : 'luni lipsă'} — bifează cele pe care vrei să le generezi
                                </div>

                                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                                    {luniLipsa.map(({ luna, an }) => {
                                        const key = `${an}-${luna}`;
                                        const isBifat = luniCuBifa[key] !== false;
                                        return (
                                            <label
                                                key={key}
                                                className="flex items-center gap-3 px-3 py-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-lg cursor-pointer hover:bg-[var(--t-surface-2)] transition-colors"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isBifat}
                                                    onChange={() => toggleLuna(key)}
                                                    className="w-4 h-4 rounded accent-indigo-500"
                                                />
                                                <span className="text-sm text-white capitalize">
                                                    {formatLuna(luna, an)}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-[var(--t-border)]">
                                    <span className="text-xs text-slate-400">
                                        {luniSelectate.length} din {luniLipsa.length} selectate
                                    </span>
                                    <div className="flex gap-2">
                                        <Button variant="secondary" onClick={onClose} disabled={isGenerating}>
                                            Anulează
                                        </Button>
                                        <Button
                                            variant="primary"
                                            onClick={handleGenereazaBulk}
                                            isLoading={isGenerating}
                                            disabled={isGenerating || luniSelectate.length === 0}
                                        >
                                            Generează {luniSelectate.length > 0 ? `${luniSelectate.length} ${luniSelectate.length === 1 ? 'factură' : 'facturi'}` : ''}
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* Buton închidere când nu e nimic de făcut */}
                {(sportiv.status !== 'Activ' || (!isLoadingData && dataStartFacturare && luniLipsa.length === 0)) && (
                    <div className="flex justify-end pt-2 border-t border-[var(--t-border)]">
                        <Button variant="secondary" onClick={onClose}>Închide</Button>
                    </div>
                )}
            </div>
        </Modal>
    );
};
