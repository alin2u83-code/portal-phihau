/**
 * ImportExcelExamen.tsx
 *
 * Wizard 3 pași pentru import XLS/XLSX în sesiunea de examen:
 *  Step 1 – Upload + preview metadata
 *  Step 2 – Pre-check sportivi (verde/galben/roșu) + rezolvare manuală
 *  Step 3 – Confirmare + import efectiv
 */

import React, { useState, useCallback, useRef } from 'react';
import { Sportiv, Grad, SesiuneExamen, InscriereExamen, IstoricGrade } from '../../types';
import { Button, Modal, Input } from '../ui';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, UploadCloudIcon, ChevronRightIcon } from '../icons';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import {
    parseExcelExamen,
    normalizeStr,
    matchSportiv,
    RandImport,
    MetadataExcel,
    StatusMatch,
} from '../../services/importExcelExamenService';
import { DEBUTANT_GRAD_ID } from '../../constants';

// ─── Props ───────────────────────────────────────────────────────────────────

interface ImportExcelExamenProps {
    isOpen: boolean;
    onClose: () => void;
    sesiune: SesiuneExamen;
    sportivi: Sportiv[];
    grade: Grad[];
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    setInscrieri: React.Dispatch<React.SetStateAction<InscriereExamen[]>>;
    setIstoricGrade: React.Dispatch<React.SetStateAction<IstoricGrade[]>>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusColor: Record<StatusMatch, string> = {
    exact: 'bg-emerald-900/30 border-emerald-700/50',
    fuzzy: 'bg-amber-900/20 border-amber-700/50',
    nou:   'bg-rose-900/20 border-rose-700/50',
};
const statusIcon = (s: StatusMatch) => {
    if (s === 'exact') return <CheckCircleIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
    if (s === 'fuzzy') return <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 flex-shrink-0" />;
    return <XCircleIcon className="w-4 h-4 text-rose-400 flex-shrink-0" />;
};

// ─── Componenta ───────────────────────────────────────────────────────────────

export const ImportExcelExamen: React.FC<ImportExcelExamenProps> = ({
    isOpen, onClose, sesiune, sportivi, grade,
    setSportivi, setInscrieri, setIstoricGrade,
}) => {
    const { showError, showSuccess } = useError();
    const fileRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState('');
    const [metadata, setMetadata] = useState<MetadataExcel | null>(null);
    const [randuri, setRanduri] = useState<RandImport[]>([]);
    const [eroriParsare, setEroriParsare] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [filtruActiv, setFiltruActiv] = useState<'toti' | 'fuzzy' | 'nou'>('toti');

    // Stare pentru rezolvare manuală (fuzzy + nou)
    const [overrides, setOverrides] = useState<Record<number, {
        sportivId?: string;    // ales manual
        skip?: boolean;        // exclude din import
        numeNou?: string;      // pentru creare sportiv nou
        prenumeNou?: string;
        dataNasteriiNou?: string;
    }>>({});

    // ─── Upload ────────────────────────────────────────────────────────────

    const processFile = useCallback(async (file: File) => {
        setIsLoading(true);
        setFileName(file.name);
        try {
            const buffer = await file.arrayBuffer();
            const result = parseExcelExamen(buffer, sportivi, grade);
            setMetadata(result.metadata);
            setRanduri(result.randuri);
            setEroriParsare(result.erori);
            setOverrides({});
            setFiltruActiv('toti');
            setStep(2);
        } catch (err: any) {
            showError('Eroare parsare', err.message || 'Nu s-a putut citi fișierul Excel.');
        } finally {
            setIsLoading(false);
        }
    }, [sportivi, grade, showError]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    }, [processFile]);

    // ─── Override handlers ─────────────────────────────────────────────────

    const setOverride = (idx: number, patch: Partial<typeof overrides[number]>) =>
        setOverrides(prev => ({ ...prev, [idx]: { ...prev[idx], ...patch } }));

    const getSportivFinal = (rand: RandImport, idx: number): string | null | 'nou' => {
        const ov = overrides[idx];
        if (ov?.skip) return null;
        if (ov?.sportivId) return ov.sportivId;
        if (rand.status === 'exact') return rand.sportivId!;
        if (rand.status === 'fuzzy' && !ov?.sportivId) return null; // nerezolvat
        return 'nou';
    };

    // ─── Stats ─────────────────────────────────────────────────────────────

    const stats = {
        total: randuri.length,
        exact: randuri.filter((r, i) => r.status === 'exact' && !overrides[i]?.skip).length,
        fuzzy: randuri.filter((r, i) => r.status === 'fuzzy').length,
        nou: randuri.filter((r, i) => r.status === 'nou').length,
        skip: Object.values(overrides).filter(o => o.skip).length,
        nerezolvat: randuri.filter((r, i) => {
            const ov = overrides[i];
            if (ov?.skip) return false;
            if (r.status === 'fuzzy' && !ov?.sportivId) return true;
            return false;
        }).length,
    };

    // ─── Import efectiv ────────────────────────────────────────────────────

    const handleImport = async () => {
        if (!supabase) return;
        setIsImporting(true);

        const newSportivi: Sportiv[] = [];
        const newInscrieri: InscriereExamen[] = [];
        const newIstoricGrade: IstoricGrade[] = [];
        let importErrors = 0;
        let primaEroare = '';

        for (let i = 0; i < randuri.length; i++) {
            const rand = randuri[i];
            const ov = overrides[i] || {};
            if (ov.skip) continue;

            try {
                let sportivId = ov.sportivId || rand.sportivId;

                // ── Creare sportiv nou ──
                if (!sportivId && rand.status === 'nou') {
                    const numeNou = ov.numeNou || rand.nume;
                    const prenumeNou = ov.prenumeNou || rand.prenume;
                    if (!numeNou || !prenumeNou) { importErrors++; continue; }

                    const { data: newS, error: errS } = await supabase
                        .from('sportivi')
                        .insert({
                            nume: numeNou.trim(),
                            prenume: prenumeNou.trim(),
                            data_nasterii: ov.dataNasteriiNou || '2000-01-01',
                            status: 'Activ',
                            data_inscrierii: new Date().toISOString().split('T')[0],
                            grad_actual_id: rand.gradId || DEBUTANT_GRAD_ID,
                            club_id: sesiune.club_id || null,
                            roluri: [],
                            familie_id: null,
                            tip_abonament_id: null,
                            participa_vacanta: false,
                            email: null,
                            cnp: null,
                        })
                        .select()
                        .maybeSingle();

                    if (errS || !newS) { importErrors++; continue; }
                    sportivId = newS.id;
                    newSportivi.push(newS as Sportiv);
                }

                if (!sportivId) {
                    if (!primaEroare) primaEroare = `${rand.numeRaw}: sportivId lipsă (status: ${rand.status})`;
                    importErrors++; continue;
                }

                const gradId = rand.gradId;
                if (!gradId) {
                    if (!primaEroare) primaEroare = `${rand.numeRaw}: gradId lipsă (grad: ${rand.gradNume})`;
                    importErrors++; continue;
                }

                // ── Înregistrare la examen ──
                const varsta = sesiune.data && (sportivi.find(s => s.id === sportivId) || newSportivi.find(s => s.id === sportivId))?.data_nasterii
                    ? Math.floor((new Date(sesiune.data).getTime() - new Date(
                        (sportivi.find(s => s.id === sportivId) || newSportivi.find(s => s.id === sportivId))!.data_nasterii
                      ).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
                    : 0;

                // Găsim grad_actual_id al sportivului (înainte de examen)
                const sportivRef = sportivi.find(s => s.id === sportivId) || newSportivi.find(s => s.id === sportivId);

                const inscrierePayload: Record<string, unknown> = {
                    sportiv_id: sportivId,
                    sesiune_id: sesiune.id,
                    grad_sustinut_id: gradId,
                    grad_actual_id: sportivRef?.grad_actual_id || null,
                    club_id: sportivRef?.club_id || sesiune.club_id || null,
                    varsta_la_examen: varsta,
                    rezultat: rand.rezultat || 'Neprezentat',
                    status_inscriere: 'Validat',
                    note_detaliate: rand.note || null,
                };

                const { data: inscr, error: errI } = await supabase
                    .from('inscrieri_examene')
                    .upsert(inscrierePayload, { onConflict: 'sportiv_id,sesiune_id' })
                    .select()
                    .maybeSingle();

                if (errI) {
                    console.error(`[ImportExcel] Eroare înscriere ${rand.numeRaw}:`, errI);
                    if (!primaEroare) primaEroare = `${rand.numeRaw}: [${errI.code}] ${errI.message}`;
                    importErrors++;
                    continue;
                }
                if (!inscr) {
                    if (!primaEroare) primaEroare = `${rand.numeRaw}: upsert fără date returnate (sportiv_id=${sportivId}, sesiune_id=${sesiune.id}, grad_id=${gradId})`;
                    importErrors++; continue;
                }
                newInscrieri.push(inscr as InscriereExamen);

                // ── Dacă Admis → înregistrează în istoric_grade ──
                if (rand.rezultat === 'Admis') {
                    const { data: ig, error: errIG } = await supabase
                        .from('istoric_grade')
                        .upsert({
                            sportiv_id: sportivId,
                            grad_id: gradId,
                            data_obtinere: sesiune.data,
                            sesiune_examen_id: sesiune.id,
                            observatii: 'Import din XLS',
                        }, { onConflict: 'sportiv_id,grad_id', ignoreDuplicates: true })
                        .select()
                        .maybeSingle();
                    if (ig) newIstoricGrade.push(ig as IstoricGrade);
                }

            } catch (err) {
                importErrors++;
            }
        }

        // Actualizare stare locală
        if (newSportivi.length) setSportivi(prev => [...prev, ...newSportivi]);
        if (newInscrieri.length) setInscrieri(prev => {
            const ids = new Set(newInscrieri.map(i => i.id));
            return [...prev.filter(i => !ids.has(i.id)), ...newInscrieri];
        });
        if (newIstoricGrade.length) setIstoricGrade(prev => [...prev, ...newIstoricGrade]);

        setIsImporting(false);

        if (importErrors === 0) {
            showSuccess('Import reușit', `${newInscrieri.length} sportivi înscriși${newSportivi.length ? `, ${newSportivi.length} creați` : ''}.`);
            handleClose();
        } else if (newInscrieri.length === 0) {
            showError('Import eșuat', `Niciun sportiv nu a putut fi înscris. ${importErrors} erori.${primaEroare ? `\n\nPrima eroare: ${primaEroare}` : ''}`);
            // Nu închidem modalul — utilizatorul poate vedea ce s-a întâmplat
        } else {
            showError('Import parțial', `${newInscrieri.length} înscriși cu succes, ${importErrors} erori.`);
            handleClose();
        }
    };

    // ─── Reset la închidere ────────────────────────────────────────────────

    const handleClose = () => {
        setStep(1);
        setFileName('');
        setMetadata(null);
        setRanduri([]);
        setEroriParsare([]);
        setOverrides({});
        onClose();
    };

    // ─── Render ────────────────────────────────────────────────────────────

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Import XLS — Sesiune Examen">
            {/* Progress bar */}
            <div className="flex items-center gap-2 mb-6">
                {[1, 2, 3].map(s => (
                    <React.Fragment key={s}>
                        <div className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${step >= s ? 'text-brand-primary' : 'text-slate-500'}`}>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                                ${step > s ? 'bg-brand-primary border-brand-primary text-white'
                                : step === s ? 'border-brand-primary text-brand-primary'
                                : 'border-slate-600 text-slate-500'}`}>
                                {step > s ? '✓' : s}
                            </span>
                            {s === 1 ? 'Upload' : s === 2 ? 'Verificare' : 'Confirmare'}
                        </div>
                        {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-brand-primary' : 'bg-slate-700'}`} />}
                    </React.Fragment>
                ))}
            </div>

            {/* ── STEP 1: Upload ── */}
            {step === 1 && (
                <div className="space-y-4">
                    <div
                        className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
                            ${isDragging ? 'border-brand-primary bg-brand-primary/10' : 'border-slate-600 hover:border-slate-400'}`}
                        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => fileRef.current?.click()}
                    >
                        <input ref={fileRef} type="file" accept=".xls,.xlsx" className="hidden" onChange={handleFileChange} />
                        <UploadCloudIcon className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                        <p className="text-white font-medium mb-1">Trage fișierul XLS/XLSX aici</p>
                        <p className="text-slate-400 text-sm">sau click pentru a alege</p>
                        <p className="text-slate-500 text-xs mt-3">Format acceptat: <strong>Tabel examene locale</strong> (1 sheet) sau <strong>Examen de grad</strong> (multiple sheet-uri)</p>
                        {isLoading && <p className="text-brand-primary text-sm mt-3 animate-pulse">Se procesează fișierul...</p>}
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 text-sm text-slate-400 space-y-3">
                        <div>
                            <p className="font-medium text-slate-300 mb-1">Fișiere suportate:</p>
                            <p>• <strong className="text-slate-200">Phi Hau - Ex. Local - YYYY.MM.DD.xls</strong> → înscrie sportivi + rezultate</p>
                            <p>• <strong className="text-slate-200">examen de grad YYYY.MM.DD.xls</strong> → importă note per sportiv</p>
                        </div>
                        <div>
                            <p className="font-medium text-slate-300 mb-1">Coloana Grad — formate acceptate:</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                                <p><strong className="text-slate-200">1</strong> sau <strong className="text-slate-200">1 Câp Alb</strong></p>
                                <p><strong className="text-slate-200">2</strong> sau <strong className="text-slate-200">2 Câp Roșu</strong></p>
                                <p><strong className="text-slate-200">3</strong> sau <strong className="text-slate-200">3 Câp Roșu</strong></p>
                                <p><strong className="text-slate-200">4</strong> sau <strong className="text-slate-200">4 Câp Roșu</strong></p>
                                <p><strong className="text-slate-200">5</strong> sau <strong className="text-slate-200">5 Câp Albastru</strong></p>
                                <p><strong className="text-slate-200">6</strong> sau <strong className="text-slate-200">6 Câp Albastru</strong></p>
                            </div>
                            <p className="mt-1 text-slate-500 text-xs">Numărul singur (1, 2, 3...) sau numele complet — ambele sunt recunoscute automat.</p>
                        </div>
                        <div>
                            <p className="font-medium text-slate-300 mb-1">Coloana Rezultat:</p>
                            <p><strong className="text-slate-200">Admis</strong> sau <strong className="text-slate-200">Respins</strong> (dacă lipsește → se marchează automat <em>Neprezentat</em>)</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── STEP 2: Pre-check ── */}
            {step === 2 && metadata && (
                <div className="space-y-4">
                    {/* Metadata preview */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Data', value: metadata.data ? new Date(metadata.data + 'T00:00:00').toLocaleDateString('ro-RO') : '—' },
                            { label: 'Localitate', value: metadata.localitate || '—' },
                            { label: 'Club', value: metadata.club || '—' },
                            { label: 'Format', value: metadata.format === 'ex_local' ? 'Ex. Local' : 'Examen Grad' },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-slate-800 rounded-lg p-3">
                                <p className="text-xs text-slate-400 uppercase font-bold">{label}</p>
                                <p className="text-white text-sm font-medium mt-0.5 truncate">{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Statistici / Filtre */}
                    <div className="flex gap-3 flex-wrap">
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-900/30 border border-emerald-700/50 text-emerald-400 text-sm font-bold">
                            <CheckCircleIcon className="w-4 h-4" /> {stats.exact} găsiți exact
                        </span>
                        <button
                            onClick={() => setFiltruActiv(filtruActiv === 'fuzzy' ? 'toti' : 'fuzzy')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-bold transition-all
                                ${filtruActiv === 'fuzzy'
                                    ? 'bg-amber-500 border-amber-400 text-slate-900'
                                    : 'bg-amber-900/30 border-amber-700/50 text-amber-400 hover:border-amber-400'}`}
                        >
                            <ExclamationTriangleIcon className="w-4 h-4" /> {stats.fuzzy} nesiguri
                        </button>
                        <button
                            onClick={() => setFiltruActiv(filtruActiv === 'nou' ? 'toti' : 'nou')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-bold transition-all
                                ${filtruActiv === 'nou'
                                    ? 'bg-rose-500 border-rose-400 text-white'
                                    : 'bg-rose-900/30 border-rose-700/50 text-rose-400 hover:border-rose-400'}`}
                        >
                            <XCircleIcon className="w-4 h-4" /> {stats.nou} inexistenți
                        </button>
                        {stats.skip > 0 && (
                            <span className="px-3 py-1.5 rounded-full bg-slate-700 text-slate-400 text-sm font-bold">
                                {stats.skip} excluși
                            </span>
                        )}
                    </div>

                    {stats.nerezolvat > 0 && (
                        <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3 text-amber-300 text-sm">
                            ⚠ {stats.nerezolvat} sportivi nesiguri necesită confirmare manuală mai jos.
                        </div>
                    )}

                    {eroriParsare.length > 0 && (
                        <div className="bg-rose-900/20 border border-rose-700/50 rounded-lg p-3 text-rose-300 text-sm space-y-1">
                            {eroriParsare.map((e, i) => <p key={i}>{e}</p>)}
                        </div>
                    )}

                    {/* Tabel sportivi */}
                    <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                        {randuri.map((rand, i) => {
                            if (filtruActiv === 'fuzzy' && rand.status !== 'fuzzy') return null;
                            if (filtruActiv === 'nou' && rand.status !== 'nou') return null;
                            const ov = overrides[i] || {};
                            const isSkipped = ov.skip;
                            return (
                                <div key={i} className={`rounded-lg border p-3 transition-opacity ${isSkipped ? 'opacity-40' : ''} ${statusColor[rand.status]}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {statusIcon(rand.status)}
                                            <div className="min-w-0">
                                                <p className="text-white font-medium text-sm truncate">{rand.numeRaw}</p>
                                                <p className="text-xs text-slate-400">{rand.gradNume}
                                                    {rand.rezultat && <span className={`ml-2 font-bold ${rand.rezultat === 'Admis' ? 'text-emerald-400' : 'text-rose-400'}`}>{rand.rezultat}</span>}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {rand.status === 'exact' && rand.sportivGasit && (
                                                <span className="text-xs text-emerald-400">{rand.sportivGasit.nume} {rand.sportivGasit.prenume}</span>
                                            )}
                                            <button
                                                onClick={() => setOverride(i, { skip: !ov.skip })}
                                                className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded hover:bg-slate-700"
                                            >
                                                {isSkipped ? 'Include' : 'Exclude'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Fuzzy: selectare manuală */}
                                    {rand.status === 'fuzzy' && !isSkipped && (
                                        <div className="mt-2 pt-2 border-t border-amber-700/30 space-y-2">
                                            <p className="text-xs text-amber-300">Potrivire nesigură ({Math.round(rand.matchScore * 100)}%). Alege sportivul corect:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {[rand.sportivGasit, ...(rand.alternativeMatches || [])].filter(Boolean).map(s => s && (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => setOverride(i, { sportivId: ov.sportivId === s.id ? undefined : s.id })}
                                                        className={`px-2 py-1 rounded text-xs font-medium transition-colors border
                                                            ${ov.sportivId === s.id
                                                                ? 'bg-amber-500 text-slate-900 border-amber-500'
                                                                : 'border-slate-600 text-slate-300 hover:border-amber-400'}`}
                                                    >
                                                        {s.nume} {s.prenume}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => setOverride(i, { sportivId: undefined })}
                                                    className="px-2 py-1 rounded text-xs text-slate-500 hover:text-slate-300 border border-dashed border-slate-600 hover:border-rose-400"
                                                >
                                                    → Creează ca nou
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Nou: formular creare rapidă */}
                                    {(rand.status === 'nou' || (rand.status === 'fuzzy' && !ov.sportivId && !isSkipped)) && !isSkipped && (
                                        <div className="mt-2 pt-2 border-t border-rose-700/30 space-y-2">
                                            <p className="text-xs text-rose-300">Sportiv inexistent. Completează pentru creare:</p>
                                            <div className="grid grid-cols-3 gap-2">
                                                <Input
                                                    label="Nume"
                                                    value={ov.numeNou ?? rand.nume}
                                                    onChange={e => setOverride(i, { numeNou: e.target.value })}
                                                    className="text-xs"
                                                />
                                                <Input
                                                    label="Prenume"
                                                    value={ov.prenumeNou ?? rand.prenume}
                                                    onChange={e => setOverride(i, { prenumeNou: e.target.value })}
                                                    className="text-xs"
                                                />
                                                <Input
                                                    label="Data nașterii"
                                                    type="date"
                                                    value={ov.dataNasteriiNou ?? ''}
                                                    onChange={e => setOverride(i, { dataNasteriiNou: e.target.value })}
                                                    className="text-xs"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-between pt-2">
                        <Button variant="secondary" onClick={() => setStep(1)}>← Înapoi</Button>
                        <Button
                            variant="primary"
                            onClick={() => setStep(3)}
                            disabled={stats.nerezolvat > 0}
                            title={stats.nerezolvat > 0 ? 'Rezolvă mai întâi sportivii nesiguri' : ''}
                        >
                            Continuă <ChevronRightIcon className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}

            {/* ── STEP 3: Confirmare ── */}
            {step === 3 && metadata && (
                <div className="space-y-4">
                    <div className="bg-slate-800 rounded-xl p-5 space-y-3">
                        <h3 className="text-white font-bold">Rezumat import</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-slate-900/50 rounded-lg p-3">
                                <p className="text-slate-400">Sportivi de înscris</p>
                                <p className="text-2xl font-bold text-white">{stats.total - stats.skip}</p>
                            </div>
                            <div className="bg-slate-900/50 rounded-lg p-3">
                                <p className="text-slate-400">Sportivi noi de creat</p>
                                <p className="text-2xl font-bold text-rose-400">
                                    {randuri.filter((r, i) => {
                                        const ov = overrides[i] || {};
                                        return !ov.skip && !ov.sportivId && !r.sportivId;
                                    }).length}
                                </p>
                            </div>
                            <div className="bg-slate-900/50 rounded-lg p-3">
                                <p className="text-slate-400">Rezultate importate</p>
                                <p className="text-2xl font-bold text-emerald-400">
                                    {randuri.filter(r => r.rezultat === 'Admis').length} Admiși
                                </p>
                            </div>
                            <div className="bg-slate-900/50 rounded-lg p-3">
                                <p className="text-slate-400">Excluși manual</p>
                                <p className="text-2xl font-bold text-slate-400">{stats.skip}</p>
                            </div>
                        </div>
                        {metadata.format === 'examen_grad' && (
                            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 text-blue-300 text-sm">
                                Format <strong>Examen de Grad</strong>: se vor importa notele individuale pentru sportivii deja înscriși.
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between">
                        <Button variant="secondary" onClick={() => setStep(2)}>← Înapoi</Button>
                        <Button variant="success" onClick={handleImport} isLoading={isImporting}>
                            Importă {stats.total - stats.skip} sportivi
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
};
