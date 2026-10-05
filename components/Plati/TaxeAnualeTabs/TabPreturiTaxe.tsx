import React, { useMemo, useState } from 'react';
import { Badge, Button, Card, Input, Select } from '../../ui';
import { useData } from '../../../contexts/DataContext';
import { useError } from '../../ErrorProvider';
import { useReincarcaTaxe } from '../../../hooks/useReincarcaTaxe';
import { salveazaPretTaxa } from '../../../services/taxeAnualeService';
import { numarTaxeInAsteptare, pretTaxa } from '../../../utils/taxeAnuale';
import { getPerioadaTaxa, formatPerioadaTaxa } from '../../../utils/anFiscal';
import type { TipTaxaFederala, TaxaAnualaFederatieConfig, VizaSportiv } from '../../../types';

const MESAJ_SUMA = 'Suma trebuie să fie mai mare decât 0.';

const parseSuma = (v: string): number => parseFloat(v.replace(',', '.'));

interface SectiunePretProps {
    tip: TipTaxaFederala;
    titlu: string;
    descriere: string;
    config: TaxaAnualaFederatieConfig[];
    vize: VizaSportiv[];
    reincarca: ReturnType<typeof useReincarcaTaxe>;
}

const SectiunePret: React.FC<SectiunePretProps> = ({ tip, titlu, descriere, config, vize, reincarca }) => {
    const { showError, showSuccess } = useError();
    const curenta = getPerioadaTaxa(tip);
    const eticheta = tip === 'FRAM' ? 'Anul' : 'Sezonul';

    const configTip = useMemo(
        () => config.filter(c => c.tip === tip).sort((a, b) => b.an_fiscal - a.an_fiscal),
        [config, tip]
    );

    const perioadeDisponibile = useMemo(() => {
        const deja = new Set(configTip.map(c => c.an_fiscal));
        return [curenta - 1, curenta, curenta + 1, curenta + 2].filter(p => !deja.has(p));
    }, [configTip, curenta]);

    // Perioade cu taxe in asteptare dar fara pret configurat
    const perioadeFaraPret = useMemo(() => {
        const deja = new Set(configTip.map(c => c.an_fiscal));
        const map = new Map<number, number>();
        vize.forEach(v => {
            if (v.tip !== tip || v.plata_id || v.scutit || deja.has(v.an)) return;
            map.set(v.an, (map.get(v.an) ?? 0) + 1);
        });
        return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
    }, [vize, configTip, tip]);

    const [anNou, setAnNou] = useState<number | null>(null);
    const [sumaNoua, setSumaNoua] = useState('');
    const [eroareNoua, setEroareNoua] = useState<string | null>(null);
    const [seSalveaza, setSeSalveaza] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [editSuma, setEditSuma] = useState('');
    const [eroareEdit, setEroareEdit] = useState<string | null>(null);
    const [seSalveazaEdit, setSeSalveazaEdit] = useState(false);

    const anSelectat = anNou != null && perioadeDisponibile.includes(anNou) ? anNou : (perioadeDisponibile.includes(curenta) ? curenta : perioadeDisponibile[0] ?? null);
    const inAsteptareSelectat = anSelectat != null ? numarTaxeInAsteptare(vize, tip, anSelectat) : 0;

    const salveaza = async (an: number, suma: number, id: string | null) => {
        const inainte = numarTaxeInAsteptare(vize, tip, an);
        const { error } = await salveazaPretTaxa({ id, tip, an, suma });
        if (error) {
            showError('Preț taxă', error);
            return false;
        }
        const rez = await reincarca();
        if (rez) {
            const k = Math.max(0, inainte - numarTaxeInAsteptare(rez.vize, tip, an));
            showSuccess('Preț taxă', `Prețul a fost salvat. ${k} taxe în așteptare au fost facturate automat.`);
        } else {
            showSuccess('Preț taxă', 'Prețul a fost salvat.');
        }
        return true;
    };

    const handleAdauga = async () => {
        if (anSelectat == null) return;
        const suma = parseSuma(sumaNoua);
        if (!Number.isFinite(suma) || suma <= 0) {
            setEroareNoua(MESAJ_SUMA);
            return;
        }
        setEroareNoua(null);
        setSeSalveaza(true);
        const ok = await salveaza(anSelectat, suma, null);
        setSeSalveaza(false);
        if (ok) {
            setSumaNoua('');
            setAnNou(null);
        }
    };

    const handleSalveazaEdit = async (c: TaxaAnualaFederatieConfig) => {
        const suma = parseSuma(editSuma);
        if (!Number.isFinite(suma) || suma <= 0) {
            setEroareEdit(MESAJ_SUMA);
            return;
        }
        setEroareEdit(null);
        setSeSalveazaEdit(true);
        const ok = await salveaza(c.an_fiscal, suma, c.id);
        setSeSalveazaEdit(false);
        if (ok) setEditId(null);
    };

    return (
        <div className="space-y-4">
            <Card className="bg-[var(--t-surface-2)] border-[var(--t-border)]">
                <h3 className="text-base font-black text-white">{titlu}</h3>
                <p className="text-sm text-slate-300 mt-2">{descriere}</p>
                <p className="text-xs text-slate-500 mt-2">
                    Dacă prețul lipsește, taxa rămâne „în așteptare” și se facturează automat la setarea prețului.
                </p>
            </Card>

            <Card className="bg-[var(--t-surface-2)] border-[var(--t-border)]">
                <h4 className="text-sm font-bold uppercase text-slate-400 mb-3">Setează prețul</h4>
                {perioadeDisponibile.length === 0 ? (
                    <p className="text-sm text-slate-400">Toate perioadele din fereastră au deja preț. Corectează prețurile din lista de mai jos.</p>
                ) : (
                    <>
                        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                            <Select
                                label="Perioada"
                                id={`pret-perioada-${tip}`}
                                value={anSelectat ?? ''}
                                onChange={e => setAnNou(Number(e.target.value))}
                            >
                                {perioadeDisponibile.map(p => (
                                    <option key={p} value={p}>
                                        {eticheta} {formatPerioadaTaxa(tip, p)}
                                    </option>
                                ))}
                            </Select>
                            <Input
                                label="Sumă (lei)"
                                id={`pret-suma-${tip}`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={sumaNoua}
                                onChange={e => setSumaNoua(e.target.value)}
                                error={eroareNoua ?? undefined}
                            />
                            <Button variant="primary" onClick={handleAdauga} isLoading={seSalveaza} className="sm:mb-0 whitespace-nowrap">
                                Setează prețul
                            </Button>
                        </div>
                        {anSelectat != null && (
                            <p className="text-xs text-slate-400 mt-3">
                                Se setează prețul pentru <span className="font-bold text-white">{eticheta.toLowerCase()} {formatPerioadaTaxa(tip, anSelectat)}</span>.{' '}
                                {inAsteptareSelectat > 0
                                    ? <span className="text-amber-400 font-semibold">{inAsteptareSelectat} taxe în așteptare vor fi facturate automat la salvare.</span>
                                    : 'Nicio taxă în așteptare pentru această perioadă.'}
                            </p>
                        )}
                    </>
                )}
            </Card>

            {perioadeFaraPret.length > 0 && (
                <Card className="bg-[var(--t-surface-2)] border-amber-500/30">
                    <h4 className="text-sm font-bold uppercase text-amber-400 mb-2">Perioade fără preț cu taxe în așteptare</h4>
                    <ul className="space-y-1 text-sm text-slate-300">
                        {perioadeFaraPret.map(([an, n]) => (
                            <li key={an}>
                                {eticheta} <span className="font-bold text-white">{formatPerioadaTaxa(tip, an)}</span>: {n} taxe în așteptare
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            <div className="space-y-3">
                {configTip.length === 0 && (
                    <p className="text-sm text-slate-500 italic">Nicio perioadă configurată încă pentru {tip}.</p>
                )}
                {configTip.map(c => {
                    const n = numarTaxeInAsteptare(vize, tip, c.an_fiscal);
                    const editeaza = editId === c.id;
                    return (
                        <Card key={c.id} className="bg-[var(--t-surface-2)] border-[var(--t-border)]">
                            <div className="flex justify-between items-start gap-2 flex-wrap">
                                <h4 className="text-lg font-bold text-white">{formatPerioadaTaxa(tip, c.an_fiscal)}</h4>
                                <div className="flex gap-2 flex-wrap">
                                    {c.an_fiscal === curenta && <Badge variant="green">Curent</Badge>}
                                    {n > 0 && <Badge variant="amber">În așteptare: {n}</Badge>}
                                </div>
                            </div>
                            <div className="mt-3">
                                {editeaza ? (
                                    <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                                        <Input
                                            label="Sumă (lei)"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={editSuma}
                                            onChange={e => setEditSuma(e.target.value)}
                                            error={eroareEdit ?? undefined}
                                        />
                                        <Button variant="secondary" size="sm" onClick={() => { setEditId(null); setEroareEdit(null); }}>Anulează</Button>
                                        <Button variant="success" size="sm" onClick={() => handleSalveazaEdit(c)} isLoading={seSalveazaEdit}>Salvează</Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-2xl font-black text-white">{Number(c.suma).toFixed(2)} lei</p>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => { setEditId(c.id); setEditSuma(String(c.suma)); setEroareEdit(null); }}
                                        >
                                            Modifică
                                        </Button>
                                    </div>
                                )}
                            </div>
                            {editeaza && (
                                <p className="text-xs text-slate-500 mt-2">
                                    Modificarea prețului nu schimbă facturile deja emise; se aplică taxelor în așteptare și celor generate de acum înainte.
                                </p>
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

/** Ecranul unic de preturi pentru taxele federatiei (FRQKD pe sezon + FRAM pe an). Doar SUPER_ADMIN_FEDERATIE (RLS). */
export const TabPreturiTaxe: React.FC<{}> = () => {
    const { taxaAnualaFederatieConfig, vizeSportivi } = useData();
    const reincarca = useReincarcaTaxe();
    const config = taxaAnualaFederatieConfig || [];
    const vize = vizeSportivi || [];

    const acum = new Date();
    const anFram = getPerioadaTaxa('FRAM', acum);
    const sezon = getPerioadaTaxa('FRQKD', acum);
    const lipsaFram = pretTaxa(config, 'FRAM', anFram) == null;
    const lipsaFrqkd = pretTaxa(config, 'FRQKD', sezon) == null;
    const inTermenFram = acum.getMonth() <= 1; // ianuarie, februarie

    return (
        <div className="space-y-6">
            {lipsaFram && (
                inTermenFram ? (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 font-semibold">
                        Prețul FRAM {anFram} trebuie setat până la sfârșitul lunii februarie.
                    </div>
                ) : (
                    <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 font-semibold">
                        Prețul FRAM {anFram} nu este setat (termen: februarie). Taxele FRAM rămân în așteptare.
                    </div>
                )
            )}
            {lipsaFrqkd && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 font-semibold">
                    Sezonul {formatPerioadaTaxa('FRQKD', sezon)} nu are preț FRQKD — taxele rămân în așteptare până la setare.
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <SectiunePret
                    tip="FRQKD"
                    titlu="FRQKD — Federația QwanKiDo (sezon fiscal 1 sept – 31 aug)"
                    descriere="Taxa FRQKD se activează la prima participare a sportivului din sezon (examen, stagiu sau competiție) și se plătește o singură dată per sportiv per sezon."
                    config={config}
                    vize={vize}
                    reincarca={reincarca}
                />
                <SectiunePret
                    tip="FRAM"
                    titlu="FRAM — viza anuală (an calendaristic)"
                    descriere="Viza FRAM se activează la prima participare a sportivului din anul calendaristic și se plătește o singură dată per sportiv per an."
                    config={config}
                    vize={vize}
                    reincarca={reincarca}
                />
            </div>

            <p className="text-xs text-slate-500 italic">Prețul unei perioade se corectează, nu se șterge.</p>
        </div>
    );
};
