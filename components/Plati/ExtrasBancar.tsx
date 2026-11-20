import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ExtrasBtParsat, Permissions, Plata, TipProbabilCredit, TranzactieBancara, User } from '../../types';
import { Badge, Button, Card, EmptyState, Input, Modal, Select } from '../ui';
import { ResponsiveTable, Column } from '../ResponsiveTable';
import { useData } from '../../contexts/DataContext';
import { useError } from '../ErrorProvider';
import { supabase } from '../../supabaseClient';
import { parseCSVWithEncoding } from '../../utils/csv';
import { parseazaExtrasBt, gasesteCandidati, facturiDeschisePentru, clasificaCredit } from '../../utils/extrasBt';
import { distribuieSumaPeFacturi, restDePlata } from '../../utils/paymentStatus';
import { calculeazaSold } from '../../services/soldService';
import { SELECT_TRANZACTIE_CU_ALOCARI, normalizeazaTranzactie } from '../../services/tranzactiiService';
import {
    importaRanduri, listaTranzactiiBancare, ignoraTranzactieBancara, reactiveazaTranzactieBancara,
    confirmaTranzactieBancara, listaMemorieIban, getIbanClub, setIbanClub,
} from '../../services/extrasBancarService';

// Extras bancar BT: import CSV (doar credite), potrivire SEMI-automată (adminul confirmă mereu),
// confirmare atomică prin RPC. Date bancare personale: fără console.log pe rânduri, fără AI/RAG.

interface ExtrasBancarProps {
    permissions: Permissions;
    currentUser: User | null;
}

const lei = (n: number) => `${(n ?? 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`;
const normIban = (s: string | null | undefined) => (s ?? '').replace(/\s/g, '').toUpperCase();

const ETICHETA_TIP: Record<TipProbabilCredit, string> = {
    cotizatie_probabila: 'Cotizație probabilă', numerar: 'Numerar (ATM)', pos: 'POS', firma: 'Firmă', altele: 'Altele',
};
const MOTIVE_RO: Record<string, string> = {
    nume_in_detalii: 'nume în detalii', prenume_detalii_nume_platitor: 'prenume în detalii + nume plătitor',
    nume_familie_detalii: 'familie în detalii', iban_memorat: 'IBAN folosit anterior',
    nume_platitor: 'nume plătitor', nume_familie_platitor: 'nume de familie plătitor',
};

function traduEroare(msg: string): string {
    if (msg.includes('alocare_depaseste_rest_factura')) return 'O alocare depășește restul de plată al facturii (factura s-a schimbat între timp — reîncarcă).';
    if (msg.includes('suma_alocata_depaseste')) return 'Suma alocată depășește suma din extras.';
    if (msg.includes('plata_duplicata')) return 'Aceeași factură apare de două ori.';
    if (msg.includes('42501') || msg.includes('acces_interzis')) return 'Acces interzis.';
    return msg;
}

const BadgeTip: React.FC<{ tb: TranzactieBancara }> = ({ tb }) => {
    const tip = clasificaCredit(tb);
    return <Badge variant={tip === 'cotizatie_probabila' ? 'green' : 'slate'}>{ETICHETA_TIP[tip]}</Badge>;
};

export const ExtrasBancar: React.FC<ExtrasBancarProps> = ({ permissions }) => {
    const { activeRoleContext, clubs, filteredData, setPlati, setTranzactii } = useData();
    const { showError, showSuccess } = useError();
    const queryClient = useQueryClient();

    const clubCtx: string | null = activeRoleContext?.club_id ?? null;
    const [clubAles, setClubAles] = useState('');
    const clubId = clubCtx ?? clubAles;
    const clubNume = clubs.find(c => c.id === clubId)?.nume ?? '';

    const [filtruStare, setFiltruStare] = useState<'noua' | 'ignorata' | 'confirmata' | 'toate'>('noua');
    const [previzualizare, setPrevizualizare] = useState<ExtrasBtParsat | null>(null);
    const [confirmClub, setConfirmClub] = useState(false);
    const [busy, setBusy] = useState(false);
    const [deschis, setDeschis] = useState<TranzactieBancara | null>(null);

    const lista = useQuery({ queryKey: ['tranzactii-bancare', clubId], enabled: !!clubId, queryFn: () => listaTranzactiiBancare(clubId) });
    const memorie = useQuery({ queryKey: ['memorie-iban', clubId], enabled: !!clubId, queryFn: () => listaMemorieIban(clubId) });
    const ibanQ = useQuery({ queryKey: ['iban-club', clubId], enabled: !!clubId, queryFn: () => getIbanClub(clubId) });

    const sportiviClub = useMemo(() => (filteredData.sportivi || []).filter(s => s.club_id === clubId), [filteredData.sportivi, clubId]);
    const familiiClub = useMemo(() => (filteredData.familii || []).filter(f => !f.club_id || f.club_id === clubId), [filteredData.familii, clubId]);
    const platiClub = useMemo(() => {
        const sp = new Set(sportiviClub.map(s => s.id));
        const fm = new Set(familiiClub.map(f => f.id));
        return (filteredData.plati || []).filter(p => p.club_id === clubId || (!!p.sportiv_id && sp.has(p.sportiv_id)) || (!!p.familie_id && fm.has(p.familie_id)));
    }, [filteredData.plati, sportiviClub, familiiClub, clubId]);

    const randuri = lista.data?.data ?? [];
    const memorieData = memorie.data?.data ?? [];
    const eroareCitire = lista.data?.error || memorie.data?.error || lista.error?.message || null;
    const vizibile = useMemo(() => randuri.filter(r => filtruStare === 'toate' || r.stare === filtruStare || (filtruStare === 'noua' && r.stare === 'potrivita')), [randuri, filtruStare]);

    const nrCandidati = useMemo(() => {
        const m = new Map<string, number>();
        for (const r of vizibile) if (r.stare === 'noua' || r.stare === 'potrivita') m.set(r.id, gasesteCandidati(r, { sportivi: sportiviClub, familii: familiiClub, plati: platiClub, memorie: memorieData }).length);
        return m;
    }, [vizibile, sportiviClub, familiiClub, platiClub, memorieData]);

    if (!permissions?.canManageFinances) {
        return <EmptyState title="Acces doar pentru administratorii clubului" />;
    }

    const refetchLista = () => queryClient.invalidateQueries({ queryKey: ['tranzactii-bancare', clubId] });

    const incarcaFisier = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setConfirmClub(false);
        parseCSVWithEncoding(file, { header: false, skipEmptyLines: true }, r => setPrevizualizare(parseazaExtrasBt(r.data as string[][])), () => showError('Fișier ilizibil', 'Nu am putut citi fișierul CSV.'));
    };

    const ibanClub = normIban(ibanQ.data?.data);
    const ibanCont = normIban(previzualizare?.iban_cont);
    const ibanOk = !!ibanClub && !!ibanCont && ibanClub === ibanCont;
    const totalCredite = previzualizare?.randuri.reduce((s, r) => s + r.suma, 0) ?? 0;
    const poateImporta = !!previzualizare && previzualizare.randuri.length > 0 && !busy && (ibanOk || confirmClub);

    const importa = async () => {
        if (!previzualizare || !clubId) return;
        setBusy(true);
        const { data, error } = await importaRanduri(clubId, previzualizare.randuri);
        setBusy(false);
        if (error || !data) { showError('Import eșuat', error ?? 'Eroare necunoscută.'); return; }
        showSuccess('Import extras', `${data.inserate} noi, ${data.duplicate} deja importate`);
        setPrevizualizare(null);
        refetchLista();
    };

    const salveazaIban = async () => {
        if (!previzualizare?.iban_cont || !clubId) return;
        const { error } = await setIbanClub(clubId, previzualizare.iban_cont);
        if (error) { showError('IBAN nesalvat', error); return; }
        queryClient.invalidateQueries({ queryKey: ['iban-club', clubId] });
    };

    const ignora = async (r: TranzactieBancara, motiv: string | null) => {
        const { error } = await ignoraTranzactieBancara(r.id, motiv);
        if (error) showError('Nu am putut ignora', error); else { setDeschis(null); refetchLista(); }
    };
    const reactiveaza = async (r: TranzactieBancara) => {
        const { error } = await reactiveazaTranzactieBancara(r.id);
        if (error) showError('Nu am putut reactiva', error); else refetchLista();
    };
    const ignoraRapid = (r: TranzactieBancara) => {
        const tip = clasificaCredit(r);
        return ignora(r, tip === 'cotizatie_probabila' ? null : ETICHETA_TIP[tip]);
    };

    const Actiuni: React.FC<{ r: TranzactieBancara }> = ({ r }) => {
        if (r.stare === 'confirmata') return <Badge variant="green">Confirmată</Badge>;
        if (r.stare === 'ignorata') return (
            <div className="flex flex-col gap-1 items-start">
                <span className="text-xs text-slate-400">Ignorată{r.motiv_ignorare ? `: ${r.motiv_ignorare}` : ''}</span>
                <Button size="sm" variant="secondary" className="min-h-10" onClick={() => reactiveaza(r)}>Reactivează</Button>
            </div>
        );
        return (
            <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="primary" className="min-h-10" onClick={() => setDeschis(r)}>Potrivește</Button>
                <Button size="sm" variant="secondary" className="min-h-10" onClick={() => ignoraRapid(r)}>Ignoră</Button>
            </div>
        );
    };

    const columns: Column<TranzactieBancara>[] = [
        { key: 'data_tranzactie', label: 'Data', render: r => r.data_tranzactie },
        { key: 'suma', label: 'Sumă', render: r => <span className="font-semibold">{lei(r.suma)}</span> },
        { key: 'platitor', label: 'Plătitor', render: r => r.platitor_nume ?? '—' },
        { key: 'detalii', label: 'Detalii', render: r => <span className="line-clamp-2">{r.detalii}</span> },
        { key: 'sugestie', label: 'Sugestie', render: r => <BadgeTip tb={r} /> },
        { key: 'candidati', label: 'Candidați', render: r => (r.stare === 'noua' || r.stare === 'potrivita' ? (nrCandidati.get(r.id) ?? 0) : '') },
        { key: 'actiuni', label: 'Acțiuni', stopRowClick: true, render: r => <Actiuni r={r} /> },
    ];

    return (
        <div className="space-y-4">
            {!clubCtx && (
                <Select label="Club" value={clubAles} onChange={e => setClubAles(e.target.value)}>
                    <option value="">Alege clubul...</option>
                    {clubs.map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
                </Select>
            )}
            {!clubId && <EmptyState title="Alege un club" description="Extrasul bancar se importă pentru un singur club." />}

            {clubId && (
                <>
                    <Card className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <Button as="label" htmlFor="extras-bt-file" variant="primary" className="min-h-10 cursor-pointer">Încarcă extras BT (CSV)</Button>
                            <input id="extras-bt-file" type="file" accept=".csv,text/csv" className="hidden" onChange={incarcaFisier} />
                            <span className="text-xs text-slate-400">Se importă doar creditele (încasările); debitele sunt ignorate.</span>
                        </div>

                        {previzualizare && (
                            <div className="space-y-3 border-t border-[var(--t-border)] pt-3">
                                <p className="text-sm text-[var(--t-text)]">
                                    {previzualizare.randuri.length} credite, total {lei(totalCredite)} · {previzualizare.debite_ignorate} debite ignorate
                                </p>
                                {previzualizare.erori.map((er, i) => <p key={i} className="text-sm text-rose-400">{er}</p>)}
                                {previzualizare.randuri.length > 0 && !ibanOk && (
                                    <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 space-y-2">
                                        <p className="text-sm text-amber-300">
                                            {!ibanClub
                                                ? 'Clubul nu are IBAN salvat — nu pot verifica dacă extrasul aparține acestui club.'
                                                : 'IBAN-ul din extras diferă de IBAN-ul clubului.'}
                                        </p>
                                        <label className="flex items-start gap-2 text-sm text-[var(--t-text)] min-h-10 cursor-pointer">
                                            <input type="checkbox" className="mt-1 h-4 w-4" checked={confirmClub} onChange={e => setConfirmClub(e.target.checked)} />
                                            <span>Confirm că extrasul aparține clubului {clubNume}</span>
                                        </label>
                                        {!ibanClub && previzualizare.iban_cont && (
                                            <Button size="sm" variant="secondary" className="min-h-10" onClick={salveazaIban}>
                                                Salvează {previzualizare.iban_cont} ca IBAN al clubului
                                            </Button>
                                        )}
                                    </div>
                                )}
                                <div className="flex gap-2 flex-wrap">
                                    <Button variant="success" className="min-h-10" disabled={!poateImporta} isLoading={busy} onClick={importa}>Importă</Button>
                                    <Button variant="secondary" className="min-h-10" onClick={() => setPrevizualizare(null)}>Renunță</Button>
                                </div>
                            </div>
                        )}
                    </Card>

                    {eroareCitire && <p className="text-sm text-rose-400">Nu am putut citi extrasele bancare: {eroareCitire}</p>}

                    <div className="max-w-xs">
                        <Select label="Stare" value={filtruStare} onChange={e => setFiltruStare(e.target.value as typeof filtruStare)}>
                            <option value="noua">Noi</option>
                            <option value="ignorata">Ignorate</option>
                            <option value="confirmata">Confirmate</option>
                            <option value="toate">Toate</option>
                        </Select>
                    </div>

                    {lista.isLoading ? <p className="text-sm text-slate-400">Se încarcă...</p> : vizibile.length === 0 ? (
                        <EmptyState title="Niciun credit în această stare" description="Încarcă un extras BT pentru a vedea încasările." />
                    ) : (
                        <ResponsiveTable
                            columns={columns}
                            data={vizibile}
                            renderMobileItem={r => (
                                <div className="p-4 space-y-2">
                                    <div className="flex justify-between gap-2">
                                        <span className="font-semibold text-[var(--t-text)]">{lei(r.suma)}</span>
                                        <span className="text-xs text-slate-400">{r.data_tranzactie}</span>
                                    </div>
                                    <p className="text-sm text-[var(--t-text)]">{r.platitor_nume ?? '—'}</p>
                                    <p className="text-xs text-slate-400 line-clamp-2">{r.detalii}</p>
                                    <div className="flex items-center gap-2">
                                        <BadgeTip tb={r} />
                                        {(r.stare === 'noua' || r.stare === 'potrivita') && <span className="text-xs text-slate-400">{nrCandidati.get(r.id) ?? 0} candidați</span>}
                                    </div>
                                    <Actiuni r={r} />
                                </div>
                            )}
                        />
                    )}
                </>
            )}

            {deschis && (
                <ModalPotrivire
                    tb={deschis}
                    sportivi={sportiviClub}
                    familii={familiiClub}
                    plati={platiClub}
                    tranzactii={filteredData.tranzactii || []}
                    memorie={memorieData}
                    onClose={() => setDeschis(null)}
                    onIgnora={(motiv) => ignora(deschis, motiv)}
                    onConfirmat={async (txId, plataIds) => {
                        // sincronizează DataContext ca Jurnal Încasări (tranzacția nouă + facturile alocate)
                        const { data: tx } = await supabase.from('tranzactii').select(SELECT_TRANZACTIE_CU_ALOCARI).eq('id', txId).maybeSingle();
                        if (tx) setTranzactii(prev => [normalizeazaTranzactie(tx), ...prev.filter(t => t.id !== txId)]);
                        if (plataIds.length > 0) {
                            const { data: upd } = await supabase.from('plati').select('*').in('id', plataIds);
                            if (upd) {
                                const m = new Map(upd.map((p: any) => [p.id, p]));
                                setPlati(prev => prev.map(p => (m.has(p.id) ? (m.get(p.id) as Plata) : p)));
                            }
                        }
                        queryClient.invalidateQueries({ queryKey: ['plati'] });
                        queryClient.invalidateQueries({ queryKey: ['memorie-iban', clubId] });
                        refetchLista();
                        showSuccess('Încasare confirmată', 'Tranzacția a fost înregistrată.');
                        setDeschis(null);
                    }}
                    onEroare={(msg, refetchPlati) => {
                        showError('Confirmare eșuată', traduEroare(msg));
                        if (refetchPlati) queryClient.invalidateQueries({ queryKey: ['plati'] });
                    }}
                />
            )}
        </div>
    );
};

// ─── Modal potrivire ─────────────────────────────────────────────────────────

interface ModalPotrivireProps {
    tb: TranzactieBancara;
    sportivi: any[];
    familii: any[];
    plati: Plata[];
    tranzactii: any[];
    memorie: any[];
    onClose: () => void;
    onIgnora: (motiv: string | null) => void;
    onConfirmat: (txId: string, plataIds: string[]) => Promise<void>;
    onEroare: (msg: string, refetchPlati: boolean) => void;
}

const ModalPotrivire: React.FC<ModalPotrivireProps> = ({ tb, sportivi, familii, plati, tranzactii, memorie, onClose, onIgnora, onConfirmat, onEroare }) => {
    const [tinta, setTinta] = useState<{ tip: 'sportiv' | 'familie'; id: string } | null>(null);
    const [alocari, setAlocari] = useState<Record<string, string>>({});
    const [motiv, setMotiv] = useState('');
    const [busy, setBusy] = useState(false);

    const candidati = useMemo(() => gasesteCandidati(tb, { sportivi, familii, plati, memorie }), [tb, sportivi, familii, plati, memorie]);
    const numeSportiv = useMemo(() => new Map(sportivi.map((s: any) => [s.id, `${s.nume} ${s.prenume}`])), [sportivi]);
    const facturi = useMemo(() => (tinta ? facturiDeschisePentru(tinta.tip, tinta.id, sportivi, plati) : []), [tinta, sportivi, plati]);
    const etichetaTinta = tinta
        ? (tinta.tip === 'sportiv' ? numeSportiv.get(tinta.id) : `Familia ${familii.find((f: any) => f.id === tinta.id)?.nume ?? ''}`)
        : '';

    const alege = (tip: 'sportiv' | 'familie', id: string) => {
        setTinta({ tip, id });
        // propunere inițială: cele mai vechi facturi întâi (adminul poate redistribui manual)
        const f = facturiDeschisePentru(tip, id, sportivi, plati);
        const init: Record<string, string> = {};
        for (const a of distribuieSumaPeFacturi(f, tb.suma)) init[a.plata_id] = a.suma_alocata.toFixed(2);
        setAlocari(init);
    };

    const valori = facturi.map(f => ({ f, v: alocari[f.id] === undefined || alocari[f.id] === '' ? 0 : Number(alocari[f.id]) }));
    const total = valori.reduce((s, x) => s + (Number.isFinite(x.v) ? x.v : 0), 0);
    const nealocat = tb.suma - total;
    let eroareValidare: string | null = null;
    if (valori.some(x => !Number.isFinite(x.v) || x.v < 0)) eroareValidare = 'Fiecare alocare trebuie să fie un număr ≥ 0.';
    else if (valori.some(x => x.v > restDePlata(x.f) + 0.005)) eroareValidare = 'O alocare depășește restul facturii.';
    else if (total > tb.suma + 0.005) eroareValidare = 'Totalul alocat depășește suma din extras.';

    const soldTinta = tinta
        ? calculeazaSold(plati, tranzactii, tinta.tip === 'sportiv' ? { sportivIds: [tinta.id] } : { familieId: tinta.id })
        : 0;

    const confirma = async () => {
        if (!tinta || eroareValidare || busy) return;
        const lista = valori.filter(x => x.v > 0.0049).map(x => ({ plata_id: x.f.id, suma_alocata: Math.round(x.v * 100) / 100 }));
        setBusy(true);
        const { data, error } = await confirmaTranzactieBancara(tb.id, tinta.tip === 'sportiv' ? { sportiv_id: tinta.id } : { familie_id: tinta.id }, lista);
        if (error || !data) {
            setBusy(false);
            onEroare(error ?? 'Eroare necunoscută.', !!error && error.includes('alocare_depaseste_rest_factura'));
            return;
        }
        await onConfirmat(data, lista.map(x => x.plata_id));
        setBusy(false);
    };

    return (
        <Modal isOpen onClose={onClose} title="Potrivește încasarea">
            <div className="p-4 space-y-4 overflow-y-auto">
                <div className="text-sm text-[var(--t-text)] space-y-1">
                    <p><strong>{lei(tb.suma)}</strong> · {tb.data_tranzactie}</p>
                    <p>{tb.platitor_nume ?? 'Plătitor necunoscut'}</p>
                    <p className="text-xs text-slate-400">{tb.detalii}</p>
                </div>

                <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-300">Candidați</h3>
                    {candidati.length === 0 && <p className="text-sm text-slate-400">Niciun candidat sugerat. Alege manual mai jos.</p>}
                    {candidati.map(c => (
                        <button
                            type="button" key={`${c.tip}:${c.id}`}
                            onClick={() => alege(c.tip, c.id)}
                            className={`w-full text-left rounded-xl border p-3 min-h-10 touch-manipulation ${tinta?.id === c.id && tinta.tip === c.tip ? 'border-[var(--t-input-focus-ring)] bg-[var(--t-surface-2)]' : 'border-[var(--t-border)] bg-[var(--t-surface)]'}`}
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-[var(--t-text)]">{c.eticheta}</span>
                                <Badge variant="blue">{c.tip === 'familie' ? 'Familie' : 'Sportiv'}</Badge>
                                {c.sumaEgala && <Badge variant="green">sumă egală</Badge>}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {c.motive.map(m => <Badge key={m} variant="slate">{MOTIVE_RO[m] ?? m}</Badge>)}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                                {c.facturiDeschise.length} facturi deschise · rest {lei(c.restTotal)}
                            </p>
                        </button>
                    ))}
                    <Select
                        label="Alt sportiv / familie"
                        value={tinta ? `${tinta.tip}:${tinta.id}` : ''}
                        onChange={e => { const [t, id] = e.target.value.split(':'); if (id) alege(t as 'sportiv' | 'familie', id); }}
                    >
                        <option value="">Alege manual...</option>
                        <optgroup label="Sportivi">
                            {sportivi.map((s: any) => <option key={s.id} value={`sportiv:${s.id}`}>{s.nume} {s.prenume}</option>)}
                        </optgroup>
                        <optgroup label="Familii">
                            {familii.map((f: any) => <option key={f.id} value={`familie:${f.id}`}>Familia {f.nume}</option>)}
                        </optgroup>
                    </Select>
                </div>

                {tinta && (
                    <div className="space-y-2 border-t border-[var(--t-border)] pt-3">
                        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-300">Alocare pe facturi — {etichetaTinta}</h3>
                        <p className="text-xs text-slate-400">Sold curent: {lei(soldTinta)}</p>
                        {facturi.length === 0 && <p className="text-sm text-slate-400">Nicio factură deschisă: toată suma rămâne avans.</p>}
                        {facturi.map(f => (
                            <div key={f.id} className="flex flex-col sm:flex-row sm:items-end gap-2 rounded-xl border border-[var(--t-border)] p-3">
                                <div className="flex-1 text-sm text-[var(--t-text)]">
                                    <p>{(f as any).descriere ?? 'Factură'}</p>
                                    <p className="text-xs text-slate-400">
                                        {String(f.data ?? '').slice(0, 10)}{f.sportiv_id && tinta.tip === 'familie' ? ` · ${numeSportiv.get(f.sportiv_id) ?? ''}` : ''} · rest {lei(restDePlata(f))}
                                    </p>
                                </div>
                                <div className="w-full sm:w-36">
                                    <Input
                                        label="Alocă (RON)" type="number" inputMode="decimal" min={0} step="0.01"
                                        value={alocari[f.id] ?? ''}
                                        onChange={e => setAlocari(prev => ({ ...prev, [f.id]: e.target.value }))}
                                    />
                                </div>
                            </div>
                        ))}
                        <p className="text-sm text-[var(--t-text)]">
                            Total alocat {lei(total)}
                            {nealocat > 0.005 && <> · Rest nealocat {lei(nealocat)} → rămâne avans (credit) pe {etichetaTinta}</>}
                        </p>
                        {eroareValidare && <p className="text-sm text-rose-400">{eroareValidare}</p>}
                        <Button variant="success" className="min-h-10" disabled={!!eroareValidare || busy} isLoading={busy} onClick={confirma}>Confirmă încasarea</Button>
                    </div>
                )}

                <div className="border-t border-[var(--t-border)] pt-3 space-y-2">
                    <Input label="Motiv (opțional)" value={motiv} onChange={e => setMotiv(e.target.value)} placeholder="ex. chirie, sponsorizare" />
                    <Button variant="secondary" className="min-h-10" disabled={busy} onClick={() => onIgnora(motiv.trim() || null)}>Ignoră cu motiv</Button>
                </div>
            </div>
        </Modal>
    );
};
