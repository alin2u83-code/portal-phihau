import React, { useMemo, useState } from 'react';
import { Modal, Button, Select, Input, Badge, EmptyState } from '../../ui';
import { UploadCloudIcon } from '../../icons';
import { useData } from '../../../contexts/DataContext';
import { useError } from '../../ErrorProvider';
import type { Sportiv, Plata, TipTaxaFederala, MetodaPlataDecont } from '../../../types';
import { construiesteSituatieTaxe, eligibiliPlataFederatie, sumaPlataFederatie } from '../../../utils/taxeAnuale';
import { formatPerioadaTaxa } from '../../../utils/anFiscal';
import { formatNume } from '../../../utils/formatareSportiv';
import { incarcaDovadaPlataFederatie, inregistreazaPlataFederatie } from '../../../services/taxeAnualeService';

const METODE_PLATA: MetodaPlataDecont[] = ['Cash', 'Transfer Bancar', 'Revolut'];
const MAX_OBSERVATII = 1000;

const azi = (): string => {
    const d = new Date();
    const luna = String(d.getMonth() + 1).padStart(2, '0');
    const zi = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${luna}-${zi}`;
};

interface PlataFederatieModalProps {
    isOpen: boolean;
    onClose: () => void;
    clubId: string;
    tip: TipTaxaFederala;
    an: number;
    sportivi: Sportiv[];
    plati: Plata[];
    onSaved: () => Promise<void> | void;
}

export const PlataFederatieModal: React.FC<PlataFederatieModalProps> = ({
    isOpen,
    onClose,
    clubId,
    tip,
    an,
    sportivi,
    plati,
    onSaved,
}) => {
    const { vizeSportivi, decontSportivi } = useData();
    const { showError, showSuccess } = useError();

    const [selectie, setSelectie] = useState<Set<string>>(new Set());
    const [metoda, setMetoda] = useState<MetodaPlataDecont | ''>('');
    const [dataPlata, setDataPlata] = useState<string>(azi());
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [observatii, setObservatii] = useState('');
    const [loading, setLoading] = useState(false);

    const perioada = formatPerioadaTaxa(tip, an);

    const situatie = useMemo(
        () =>
            construiesteSituatieTaxe({
                sportivi,
                vize: vizeSportivi || [],
                plati,
                decontSportivi: decontSportivi || [],
                tip,
                an,
                clubId,
            }),
        [sportivi, vizeSportivi, plati, decontSportivi, tip, an, clubId]
    );
    const eligibili = useMemo(() => eligibiliPlataFederatie(situatie), [situatie]);
    const scutiti = useMemo(() => situatie.filter(s => s.stare === 'scutit'), [situatie]);
    const inAsteptare = useMemo(() => situatie.filter(s => s.stare === 'in_asteptare'), [situatie]);

    const total = useMemo(() => sumaPlataFederatie(situatie, selectie), [situatie, selectie]);
    const nrBifati = useMemo(() => eligibili.filter(s => selectie.has(s.sportivId)).length, [eligibili, selectie]);

    const numeSportiv = (s: { sportiv: Sportiv | null }) => (s.sportiv ? formatNume(s.sportiv) : '—');

    const toggle = (id: string) => {
        setSelectie(prev => {
            const urm = new Set(prev);
            if (urm.has(id)) urm.delete(id);
            else urm.add(id);
            return urm;
        });
    };

    const toti = eligibili.length > 0 && nrBifati === eligibili.length;
    const toggleToti = () => {
        setSelectie(toti ? new Set() : new Set(eligibili.map(s => s.sportivId)));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);
        if (f.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(f);
        } else {
            setPreview(null);
        }
    };

    const handleSave = async () => {
        if (nrBifati === 0 || !metoda) return;
        setLoading(true);
        try {
            let dovadaPath: string | null = null;
            if (file) {
                const up = await incarcaDovadaPlataFederatie(clubId, file);
                if (up.error || !up.data) {
                    showError('Dovada plății', up.error ?? 'Dovada nu a putut fi încărcată.');
                    return;
                }
                dovadaPath = up.data;
            }

            const { data, error } = await inregistreazaPlataFederatie({
                clubId,
                tip,
                an,
                sportivIds: eligibili.filter(s => selectie.has(s.sportivId)).map(s => s.sportivId),
                metoda,
                dataPlata,
                dovadaPath,
                observatii: observatii.trim() ? observatii.trim().slice(0, MAX_OBSERVATII) : null,
            });
            if (error || !data) {
                const nota = dovadaPath ? ' Fișierul dovadă a fost încărcat, dar a rămas nelegat de nicio plată.' : '';
                showError('Plată către federație', (error ?? 'Plata nu a putut fi înregistrată.') + nota);
                return;
            }

            showSuccess(
                'Plată către federație',
                `Plata de ${data.suma_totala} lei către federație a fost înregistrată pentru ${data.nr_participanti} sportivi.`
            );
            await onSaved();
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Plată către federație — ${tip} ${perioada}`}>
            <div className="space-y-4">
                {eligibili.length === 0 ? (
                    <EmptyState title="Nu există taxe facturate și nevirate pentru această perioadă." />
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-slate-300">
                                Sportivi de virat ({eligibili.length})
                            </label>
                            <Button size="sm" variant="secondary" onClick={toggleToti} disabled={loading}>
                                {toti ? 'Deselectează' : 'Selectează toți'}
                            </Button>
                        </div>
                        <div className="max-h-64 overflow-y-auto rounded-lg border border-[var(--t-border)] bg-[var(--t-surface-2)] divide-y divide-[var(--t-border)]">
                            {eligibili.map(s => {
                                const achitat = s.stare === 'achitat';
                                return (
                                    <label
                                        key={s.sportivId}
                                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-white/5"
                                    >
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 accent-[var(--t-input-focus-ring)]"
                                            checked={selectie.has(s.sportivId)}
                                            onChange={() => toggle(s.sportivId)}
                                            disabled={loading}
                                        />
                                        <span className="flex-1 text-sm text-[var(--t-text)]">{numeSportiv(s)}</span>
                                        <Badge variant={achitat ? 'green' : 'amber'}>
                                            {achitat ? 'Achitat la club' : 'Neachitat la club'}
                                        </Badge>
                                        <span className="text-sm font-semibold text-white w-24 text-right">
                                            {(s.suma ?? 0).toFixed(2)} lei
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}

                {scutiti.length > 0 && (
                    <div className="rounded-lg border border-[var(--t-border)] p-3 text-sm space-y-1">
                        <p className="font-semibold text-slate-300">Scutiți (nu se virează): {scutiti.length}</p>
                        <ul className="text-slate-400 space-y-0.5">
                            {scutiti.map(s => (
                                <li key={s.sportivId}>
                                    {numeSportiv(s)}
                                    {s.viza?.motiv_scutire ? ` — ${s.viza.motiv_scutire}` : ''}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {inAsteptare.length > 0 && (
                    <div className="rounded-lg border border-[var(--t-border)] p-3 text-sm space-y-1">
                        <p className="font-semibold text-slate-300">
                            În așteptare (fără preț / nefacturate): {inAsteptare.length}
                        </p>
                        <ul className="text-slate-400 space-y-0.5">
                            {inAsteptare.map(s => (
                                <li key={s.sportivId}>{numeSportiv(s)}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="flex items-center justify-between rounded-lg bg-brand-primary/10 border border-brand-primary/30 px-4 py-3">
                    <span className="text-sm font-bold uppercase text-slate-400">Total de virat</span>
                    <span className="text-3xl font-black text-white">{total.toFixed(2)} lei</span>
                </div>

                <Select
                    id="plata-federatie-metoda"
                    label="Metoda plății"
                    value={metoda}
                    onChange={e => setMetoda(e.target.value as MetodaPlataDecont | '')}
                    disabled={loading}
                >
                    <option value="">Alege metoda...</option>
                    {METODE_PLATA.map(m => (
                        <option key={m} value={m}>
                            {m}
                        </option>
                    ))}
                </Select>

                <Input
                    id="plata-federatie-data"
                    label="Data plății"
                    type="date"
                    value={dataPlata}
                    max={azi()}
                    onChange={e => setDataPlata(e.target.value || azi())}
                    disabled={loading}
                />

                <div>
                    <span className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">
                        Dovadă (opțional)
                    </span>
                    <label htmlFor="plata-federatie-dovada" className="cursor-pointer block">
                        <div
                            className={`p-4 border-2 border-dashed rounded-lg text-center transition-colors ${
                                file ? 'border-green-500 bg-green-900/20' : 'border-slate-600 hover:border-brand-primary hover:bg-brand-primary/10'
                            }`}
                        >
                            {preview ? (
                                <img src={preview} alt="Previzualizare dovadă" className="max-h-40 mx-auto rounded-md" />
                            ) : (
                                <div className="flex flex-col items-center">
                                    <UploadCloudIcon className="w-8 h-8 text-slate-400 mb-1" />
                                    <span className="font-semibold text-brand-primary">
                                        {file ? file.name : 'Alege un fișier'}
                                    </span>
                                    <p className="text-xs text-slate-500">PNG, JPG, PDF (MAX. 5MB)</p>
                                </div>
                            )}
                        </div>
                    </label>
                    <input
                        id="plata-federatie-dovada"
                        type="file"
                        className="sr-only"
                        onChange={handleFileChange}
                        accept="image/png, image/jpeg, application/pdf"
                        disabled={loading}
                    />
                    {file && <p className="text-xs text-center text-slate-400 mt-1">Fișier selectat: {file.name}</p>}
                </div>

                <div>
                    <label
                        htmlFor="plata-federatie-observatii"
                        className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide"
                    >
                        Observații (opțional)
                    </label>
                    <textarea
                        id="plata-federatie-observatii"
                        value={observatii}
                        maxLength={MAX_OBSERVATII}
                        rows={2}
                        onChange={e => setObservatii(e.target.value)}
                        disabled={loading}
                        className="w-full bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-xl px-4 py-3 text-base sm:text-sm text-[var(--t-text)] placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-[var(--t-input-focus-ring)] transition-all"
                        style={{ '--tw-ring-color': 'var(--t-input-focus-ring)' } as React.CSSProperties}
                    />
                </div>

                <div className="flex justify-end pt-4 gap-2 border-t border-[var(--t-border)]">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>
                        Anulează
                    </Button>
                    <Button
                        variant="success"
                        onClick={handleSave}
                        isLoading={loading}
                        disabled={nrBifati === 0 || !metoda}
                    >
                        {`Înregistrează plata (${nrBifati} sportivi · ${total.toFixed(2)} lei)`}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
