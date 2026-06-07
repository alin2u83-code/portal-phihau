/**
 * ImportExcelExamen.tsx
 *
 * Wizard 4 pași pentru import XLS/XLSX în sesiunea de examen:
 *  Step 1 â€“ Upload + preview metadata
 *  Step 2 â€“ Pre-check sportivi (verde/galben/roșu) + rezolvare manuală
 *  Step 3 â€“ Confirmare + import efectiv
 *  Step 4 â€“ Raport detaliat import (cu descărcare CSV)
 */

import React, { useState, useCallback, useRef } from 'react';
import { Sportiv, Grad, SesiuneExamen, InscriereExamen, IstoricGrade } from '../../types';
import { Button, Modal, Input } from '../ui';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, UploadCloudIcon, ChevronRightIcon, DownloadIcon } from '../icons';
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

// â”€â”€â”€ Tipuri raport â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type RaportStatus = 'success' | 'error' | 'skip';

interface RaportRand {
    numeRaw: string;
    gradNume: string;
    rezultat?: string;
    status: RaportStatus;
    motiv: string;
    sportivNou?: boolean;
}

interface RaportImport {
    totalProcesati: number;
    salvati: number;
    erori: number;
    sarite: number;
    sportiviNoi: number;
    randuri: RaportRand[];
    sesiuneId: string;
    dataImport: string;
}

// â”€â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Componenta â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const ImportExcelExamen: React.FC<ImportExcelExamenProps> = ({
    isOpen, onClose, sesiune, sportivi, grade,
    setSportivi, setInscrieri, setIstoricGrade,
}) => {
    const { showError, showSuccess } = useError();
    const fileRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState('');
    const [metadata, setMetadata] = useState<MetadataExcel | null>(null);
    const [randuri, setRanduri] = useState<RandImport[]>([]);
    const [eroriParsare, setEroriParsare] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [filtruActiv, setFiltruActiv] = useState<'toti' | 'fuzzy' | 'nou'>('toti');
    const [raport, setRaport] = useState<RaportImport | null>(null);
    const [filtruRaport, setFiltruRaport] = useState<'toti' | 'success' | 'error' | 'skip'>('toti');

    // Stare pentru rezolvare manuală (fuzzy + nou)
    const [overrides, setOverrides] = useState<Record<number, {
        sportivId?: string;    // ales manual
        skip?: boolean;        // exclude din import
        numeNou?: string;      // pentru creare sportiv nou
        prenumeNou?: string;
        dataNasteriiNou?: string;
    }>>({});

    // â”€â”€â”€ Upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    // â”€â”€â”€ Override handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    // â”€â”€â”€ Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    // â”€â”€â”€ Import efectiv â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const handleImport = async () => {
        if (!supabase) return;
        setIsImporting(true);

        const newSportivi: Sportiv[] = [];
        const newInscrieri: InscriereExamen[] = [];
        const newIstoricGrade: IstoricGrade[] = [];
        const raportRanduri: RaportRand[] = [];

        for (let i = 0; i < randuri.length; i++) {
            const rand = randuri[i];
            const ov = overrides[i] || {};

            // â”€â”€ Skip explicit â”€â”€
            if (ov.skip) {
                raportRanduri.push({
                    numeRaw: rand.numeRaw,
                    gradNume: rand.gradNume,
                    rezultat: rand.rezultat,
                    status: 'skip',
                    motiv: 'Exclus manual de utilizator',
                });
                continue;
            }

            try {
                let sportivId = ov.sportivId || rand.sportivId;
                let esteNou = false;

                // â”€â”€ Creare sportiv nou â”€â”€
                if (!sportivId && rand.status === 'nou') {
                    const numeNou = ov.numeNou || rand.nume;
                    const prenumeNou = ov.prenumeNou || rand.prenume;
                    if (!numeNou || !prenumeNou) {
                        raportRanduri.push({
                            numeRaw: rand.numeRaw,
                            gradNume: rand.gradNume,
                            rezultat: rand.rezultat,
                            status: 'error',
                            motiv: 'Lipsă Nume sau Prenume pentru sportiv nou',
                        });
                        continue;
                    }

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

                    if (errS || !newS) {
                        raportRanduri.push({
                            numeRaw: rand.numeRaw,
                            gradNume: rand.gradNume,
                            rezultat: rand.rezultat,
                            status: 'error',
                            motiv: errS ? `[${errS.code}] ${errS.message}` : 'Creare sportiv nou eșuată â€” fără date returnate',
                        });
                        continue;
                    }
                    sportivId = newS.id;
                    newSportivi.push(newS as Sportiv);
                    esteNou = true;
                }

                if (!sportivId) {
                    raportRanduri.push({
                        numeRaw: rand.numeRaw,
                        gradNume: rand.gradNume,
                        rezultat: rand.rezultat,
                        status: 'error',
                        motiv: `ID sportiv nedeterminat (status match: ${rand.status})`,
                    });
                    continue;
                }

                const gradId = rand.gradId;
                if (!gradId) {
                    raportRanduri.push({
                        numeRaw: rand.numeRaw,
                        gradNume: rand.gradNume,
                        rezultat: rand.rezultat,
                        status: 'error',
                        motiv: `Gradul "${rand.gradNume}" nu a fost identificat în baza de date`,
                    });
                    continue;
                }

                // â”€â”€ Înregistrare la examen â”€â”€
                const sportivRef = sportivi.find(s => s.id === sportivId) || newSportivi.find(s => s.id === sportivId);
                const varsta = sesiune.data && sportivRef?.data_nasterii
                    ? Math.floor((new Date(sesiune.data).getTime() - new Date(sportivRef.data_nasterii).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
                    : 0;

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
                    raportRanduri.push({
                        numeRaw: rand.numeRaw,
                        gradNume: rand.gradNume,
                        rezultat: rand.rezultat,
                        status: 'error',
                        motiv: `Eroare înregistrare examen: [${errI.code}] ${errI.message}`,
                        sportivNou: esteNou,
                    });
                    continue;
                }
                if (!inscr) {
                    raportRanduri.push({
                        numeRaw: rand.numeRaw,
                        gradNume: rand.gradNume,
                        rezultat: rand.rezultat,
                        status: 'error',
                        motiv: `Înregistrare fără date returnate (sportiv_id=${sportivId}, grad_id=${gradId})`,
                        sportivNou: esteNou,
                    });
                    continue;
                }
                newInscrieri.push(inscr as InscriereExamen);

                // â”€â”€ Dacă Admis â†’ înregistrează în istoric_grade â”€â”€
                if (rand.rezultat === 'Admis') {
                    const { data: ig } = await supabase
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

                raportRanduri.push({
                    numeRaw: rand.numeRaw,
                    gradNume: rand.gradNume,
                    rezultat: rand.rezultat,
                    status: 'success',
                    motiv: esteNou ? 'Sportiv creat și înscris' : 'Înscris cu succes',
                    sportivNou: esteNou,
                });

            } catch (err: any) {
                raportRanduri.push({
                    numeRaw: rand.numeRaw,
                    gradNume: rand.gradNume,
                    rezultat: rand.rezultat,
                    status: 'error',
                    motiv: err?.message || 'Eroare necunoscută',
                });
            }
        }

        // Actualizare stare locală
        if (newSportivi.length) setSportivi(prev => [...prev, ...newSportivi]);
        if (newInscrieri.length) setInscrieri(prev => {
            const ids = new Set(newInscrieri.map(i => i.id));
            return [...prev.filter(i => !ids.has(i.id)), ...newInscrieri];
        });
        if (newIstoricGrade.length) setIstoricGrade(prev => [...prev, ...newIstoricGrade]);

        // Construire raport
        const raportFinal: RaportImport = {
            totalProcesati: raportRanduri.length,
            salvati: raportRanduri.filter(r => r.status === 'success').length,
            erori: raportRanduri.filter(r => r.status === 'error').length,
            sarite: raportRanduri.filter(r => r.status === 'skip').length,
            sportiviNoi: newSportivi.length,
            randuri: raportRanduri,
            sesiuneId: sesiune.id,
            dataImport: new Date().toISOString(),
        };
        setRaport(raportFinal);
        setFiltruRaport('toti');
        setIsImporting(false);
        setStep(4);
    };

    // â”€â”€â”€ Descărcare raport CSV â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const handleDescarcaRaport = () => {
        if (!raport) return;
        const rows = [
            ['Sportiv', 'Grad', 'Rezultat Examen', 'Status Import', 'Motiv', 'Sportiv Nou'],
            ...raport.randuri.map(r => [
                r.numeRaw,
                r.gradNume,
                r.rezultat || 'Neprezentat',
                r.status === 'success' ? 'Salvat' : r.status === 'error' ? 'Eroare' : 'Ignorat',
                r.motiv,
                r.sportivNou ? 'DA' : 'NU',
            ]),
        ];
        const csv = rows.map(row =>
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\r\n');

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dataSesiune = sesiune.data ? sesiune.data.replace(/-/g, '') : 'necunoscut';
        a.download = `raport_import_examen_${dataSesiune}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // â”€â”€â”€ Reset la închidere â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const handleClose = () => {
        setStep(1);
        setFileName('');
        setMetadata(null);
        setRanduri([]);
        setEroriParsare([]);
        setOverrides({});
        setRaport(null);
        setFiltruRaport('toti');
        onClose();
    };

    // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Import XLS â€” Sesiune Examen">
            {/* Progress bar */}
            <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
                {([1, 2, 3, 4] as const).map(s => (
                    <React.Fragment key={s}>
                        <div className={`flex items-center gap-1 text-xs sm:text-sm font-medium transition-colors flex-shrink-0 ${step >= s ? 'text-brand-primary' : 'text-slate-500'}`}>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors flex-shrink-0
                                ${step > s ? 'bg-brand-primary border-brand-primary text-white'
                                : step === s ? 'border-brand-primary text-brand-primary'
                                : 'border-slate-600 text-slate-500'}`}>
                                {step > s ? 'âœ“' : s}
                            </span>
                            <span className="hidden sm:inline">
                                {s === 1 ? 'Upload' : s === 2 ? 'Verificare' : s === 3 ? 'Confirmare' : 'Raport'}
                            </span>
                        </div>
                        {s < 4 && <div className={`flex-1 h-0.5 min-w-4 ${step > s ? 'bg-brand-primary' : 'bg-slate-700'}`} />}
                    </React.Fragment>
                ))}
            </div>

            {/* â”€â”€ STEP 1: Upload â”€â”€ */}
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
                    <div className="bg-[var(--t-surface-2)] rounded-lg p-4 text-sm text-[var(--t-text-muted)] space-y-3">
                        <div>
                            <p className="font-medium text-slate-300 mb-1">Fișiere suportate:</p>
                            <p>â€¢ <strong className="text-slate-200">Phi Hau - Ex. Local - YYYY.MM.DD.xls</strong> â†’ înscrie sportivi + rezultate</p>
                            <p>â€¢ <strong className="text-slate-200">examen de grad YYYY.MM.DD.xls</strong> â†’ importă note per sportiv</p>
                        </div>
                        <div>
                            <p className="font-medium text-slate-300 mb-1">Coloana Grad â€” formate acceptate:</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                                <p><strong className="text-slate-200">1</strong> sau <strong className="text-slate-200">1 Câp Alb</strong></p>
                                <p><strong className="text-slate-200">2</strong> sau <strong className="text-slate-200">2 Câp Roșu</strong></p>
                                <p><strong className="text-slate-200">3</strong> sau <strong className="text-slate-200">3 Câp Roșu</strong></p>
                                <p><strong className="text-slate-200">4</strong> sau <strong className="text-slate-200">4 Câp Roșu</strong></p>
                                <p><strong className="text-slate-200">5</strong> sau <strong className="text-slate-200">5 Câp Albastru</strong></p>
                                <p><strong className="text-slate-200">6</strong> sau <strong className="text-slate-200">6 Câp Albastru</strong></p>
                            </div>
                            <p className="mt-1 text-slate-500 text-xs">Numărul singur (1, 2, 3...) sau numele complet â€” ambele sunt recunoscute automat.</p>
                        </div>
                        <div>
                            <p className="font-medium text-slate-300 mb-1">Coloana Rezultat:</p>
                            <p><strong className="text-slate-200">Admis</strong> sau <strong className="text-slate-200">Respins</strong> (dacă lipsește â†’ se marchează automat <em>Neprezentat</em>)</p>
                        </div>
                    </div>
                </div>
            )}

            {/* â”€â”€ STEP 2: Pre-check â”€â”€ */}
            {step === 2 && metadata && (
                <div className="space-y-4">
                    {/* Metadata preview */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Data', value: metadata.data ? new Date(metadata.data + 'T00:00:00').toLocaleDateString('ro-RO') : 'â€”' },
                            { label: 'Localitate', value: metadata.localitate || 'â€”' },
                            { label: 'Club', value: metadata.club || 'â€”' },
                            { label: 'Format', value: metadata.format === 'ex_local' ? 'Ex. Local' : 'Examen Grad' },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-[var(--t-surface)] rounded-lg p-3">
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
                            âš  {stats.nerezolvat} sportivi nesiguri necesită confirmare manuală mai jos.
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
                                                    â†’ Creează ca nou
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
                        <Button variant="secondary" onClick={() => setStep(1)}>â† Înapoi</Button>
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

            {/* â”€â”€ STEP 3: Confirmare â”€â”€ */}
            {step === 3 && metadata && (
                <div className="space-y-4">
                    <div className="bg-[var(--t-surface)] rounded-xl p-5 space-y-3">
                        <h3 className="text-white font-bold">Rezumat import</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-[var(--t-surface-2)] rounded-lg p-3">
                                <p className="text-slate-400">Sportivi de înscris</p>
                                <p className="text-2xl font-bold text-white">{stats.total - stats.skip}</p>
                            </div>
                            <div className="bg-[var(--t-surface-2)] rounded-lg p-3">
                                <p className="text-slate-400">Sportivi noi de creat</p>
                                <p className="text-2xl font-bold text-rose-400">
                                    {randuri.filter((r, i) => {
                                        const ov = overrides[i] || {};
                                        return !ov.skip && !ov.sportivId && !r.sportivId;
                                    }).length}
                                </p>
                            </div>
                            <div className="bg-[var(--t-surface-2)] rounded-lg p-3">
                                <p className="text-slate-400">Rezultate importate</p>
                                <p className="text-2xl font-bold text-emerald-400">
                                    {randuri.filter(r => r.rezultat === 'Admis').length} Admiși
                                </p>
                            </div>
                            <div className="bg-[var(--t-surface-2)] rounded-lg p-3">
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
                        <Button variant="secondary" onClick={() => setStep(2)}>â† Înapoi</Button>
                        <Button variant="success" onClick={handleImport} isLoading={isImporting}>
                            Importă {stats.total - stats.skip} sportivi
                        </Button>
                    </div>
                </div>
            )}
            {/* â”€â”€ STEP 4: Raport Import â”€â”€ */}
            {step === 4 && raport && (
                <div className="space-y-4">

                    {/* Sumar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-emerald-400">{raport.salvati}</p>
                            <p className="text-xs text-emerald-300 mt-1">Salvați cu succes</p>
                        </div>
                        <div className="bg-rose-900/20 border border-rose-700/40 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-rose-400">{raport.erori}</p>
                            <p className="text-xs text-rose-300 mt-1">Erori</p>
                        </div>
                        <div className="bg-slate-700/40 border border-slate-600/40 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-slate-300">{raport.sarite}</p>
                            <p className="text-xs text-slate-400 mt-1">Ignorate</p>
                        </div>
                        <div className="bg-blue-900/20 border border-blue-700/40 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-blue-400">{raport.sportiviNoi}</p>
                            <p className="text-xs text-blue-300 mt-1">Sportivi noi creați</p>
                        </div>
                    </div>

                    {/* Banner status general */}
                    {raport.erori === 0 ? (
                        <div className="flex items-center gap-2 p-3 bg-emerald-900/20 border border-emerald-700/40 rounded-lg text-emerald-300 text-sm">
                            <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
                            Import finalizat fără erori. {raport.salvati} sportivi înscriși în sesiune.
                        </div>
                    ) : raport.salvati === 0 ? (
                        <div className="flex items-center gap-2 p-3 bg-rose-900/20 border border-rose-700/40 rounded-lg text-rose-300 text-sm">
                            <XCircleIcon className="w-5 h-5 flex-shrink-0" />
                            Import eșuat complet. Niciun sportiv nu a putut fi salvat. Verificați detaliile de mai jos.
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 p-3 bg-amber-900/20 border border-amber-700/40 rounded-lg text-amber-300 text-sm">
                            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                            Import parțial: {raport.salvati} salvați, {raport.erori} erori.
                        </div>
                    )}

                    {/* Filtre tabel */}
                    <div className="flex gap-2 flex-wrap">
                        {([
                            { key: 'toti',    label: `Toți (${raport.totalProcesati})`,             cls: 'bg-slate-700 text-slate-200' },
                            { key: 'success', label: `Salvați (${raport.salvati})`,                  cls: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50' },
                            { key: 'error',   label: `Erori (${raport.erori})`,                      cls: 'bg-rose-900/40 text-rose-300 border border-rose-700/50' },
                            { key: 'skip',    label: `Ignorate (${raport.sarite})`,                  cls: 'bg-slate-700/50 text-slate-400 border border-slate-600/50' },
                        ] as const).map(({ key, label, cls }) => (
                            <button
                                key={key}
                                onClick={() => setFiltruRaport(key)}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${cls} ${filtruRaport === key ? 'ring-2 ring-white/30' : 'opacity-70 hover:opacity-100'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Tabel detalii */}
                    <div className="max-h-72 overflow-y-auto rounded-lg border border-[var(--t-border)]">
                        <table className="text-xs w-full border-collapse">
                            <thead className="sticky top-0 z-10" style={{ background: 'var(--t-table-header-bg)', color: 'var(--t-table-header-text)' }}>
                                <tr className="border-b border-[var(--t-border)]">
                                    <th className="text-left py-2 px-3 min-w-32">Sportiv</th>
                                    <th className="text-left py-2 px-3 hidden sm:table-cell">Grad</th>
                                    <th className="text-left py-2 px-3 hidden sm:table-cell">Rezultat</th>
                                    <th className="text-left py-2 px-3">Status</th>
                                    <th className="text-left py-2 px-3">Motiv</th>
                                </tr>
                            </thead>
                            <tbody>
                                {raport.randuri
                                    .filter(r => filtruRaport === 'toti' || r.status === filtruRaport)
                                    .map((r, i) => (
                                        <tr
                                            key={i}
                                            className={`border-b border-[var(--t-border)] last:border-0 ${
                                                r.status === 'success' ? 'bg-emerald-900/10'
                                                : r.status === 'error' ? 'bg-rose-900/10'
                                                : ''
                                            }`}
                                        >
                                            <td className="py-2 px-3 text-white font-medium">
                                                {r.numeRaw}
                                                {r.sportivNou && (
                                                    <span className="ml-1 text-blue-400 text-xs font-bold">NOU</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-3 text-slate-300 hidden sm:table-cell">{r.gradNume || 'â€”'}</td>
                                            <td className="py-2 px-3 hidden sm:table-cell">
                                                {r.rezultat ? (
                                                    <span className={`font-bold ${r.rezultat === 'Admis' ? 'text-emerald-400' : r.rezultat === 'Respins' ? 'text-rose-400' : 'text-slate-400'}`}>
                                                        {r.rezultat}
                                                    </span>
                                                ) : <span className="text-slate-500">â€”</span>}
                                            </td>
                                            <td className="py-2 px-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold ${
                                                    r.status === 'success' ? 'bg-emerald-900/40 border-emerald-700/60 text-emerald-300'
                                                    : r.status === 'error' ? 'bg-rose-900/40 border-rose-700/60 text-rose-300'
                                                    : 'bg-slate-700/60 border-slate-600 text-slate-300'
                                                }`}>
                                                    {r.status === 'success' ? (
                                                        <><CheckCircleIcon className="w-3 h-3" /> Salvat</>
                                                    ) : r.status === 'error' ? (
                                                        <><XCircleIcon className="w-3 h-3" /> Eroare</>
                                                    ) : (
                                                        <>Ignorat</>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 text-slate-400 text-xs max-w-xs truncate" title={r.motiv}>
                                                {r.motiv}
                                            </td>
                                        </tr>
                                    ))
                                }
                                {raport.randuri.filter(r => filtruRaport === 'toti' || r.status === filtruRaport).length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-6 text-center text-slate-500">
                                            Nicio înregistrare pentru filtrul selectat.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Acțiuni */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
                        <Button
                            variant="secondary"
                            onClick={handleDescarcaRaport}
                            size="sm"
                        >
                            <DownloadIcon className="w-4 h-4 mr-2" />
                            Descarcă raport CSV
                        </Button>
                        <Button variant="primary" onClick={handleClose}>
                            <CheckCircleIcon className="w-4 h-4 mr-2" />
                            Finalizat â€” Închide
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

