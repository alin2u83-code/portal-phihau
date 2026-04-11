/**
 * ImportSportiviExamen.tsx
 *
 * Wizard 2 pași pentru adăugarea sportivilor în sesiunea de examen:
 *
 * PAS 1 — Import sportivi din CSV
 *   • Parsare CSV cu Nume, Prenume, Data nașterii (DD/MM/YYYY), Telefon (opțional)
 *   • Verificare duplicate (nume+prenume+data nașterii, case-insensitive, fără diacritice)
 *   • Sportivii noi → creați cu grad Debutant, clubul utilizatorului curent, fără grupă
 *   • Sportivii existenți → ignorați
 *   • Raport: creați / ignorați / erori
 *
 * PAS 2 — Adăugare în sesiunea de examen
 *   • Selectare grad susținut per sportiv
 *   • Verificare: sportivul nu are deja gradul (din istoricGrade)
 *   • Verificare: sportivul nu este deja înscris în sesiune
 *   • Raport final: adăugați / ignorați (motiv) / erori
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Modal, Button, Select } from '../ui';
import {
    UploadCloudIcon, CheckCircleIcon, XCircleIcon, UserPlusIcon,
    ChevronRightIcon, ArrowLeftIcon, DownloadIcon,
} from '../icons';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import { generateEmail } from '../../utils/csv';
import { Sportiv, Grad, SesiuneExamen, InscriereExamen, IstoricGrade, User } from '../../types';
import { getPretProdus } from '../../utils/pricing';
import { sendBulkNotifications } from '../../utils/notifications';

// ─── Utilitare ────────────────────────────────────────────────────────────────

const normalizeStr = (s: string) =>
    (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

const parseDate = (raw: string): string | null => {
    if (!raw) return null;
    const trimmed = raw.trim();
    // DD/MM/YYYY sau DD-MM-YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (dmyMatch) {
        const [, d, m, y] = dmyMatch;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // YYYY-MM-DD direct
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    return null;
};

// ─── Tipuri interne ───────────────────────────────────────────────────────────

type RowStatus = 'pending' | 'exists' | 'created' | 'error';

interface ParsedRow {
    idx: number;
    numeRaw: string;
    prenumeRaw: string;
    dataRaw: string;
    telefon: string;
    // după verificare
    status: RowStatus;
    message: string;
    // după creare / identificare
    sportivId?: string;
    // pentru pasul 2
    gradSustinutId: string;
    // motive ignorare pas 2
    skipReason?: string;
}

type Step2Status = 'adaugat' | 'ignorat' | 'eroare' | 'pending';

interface Step2Row extends ParsedRow {
    step2Status: Step2Status;
    step2Message: string;
}

// ─── Template CSV ─────────────────────────────────────────────────────────────

const CSV_TEMPLATE =
    'Nume*,Prenume*,Data nasterii* (ZZ/LL/AAAA),Telefon\n' +
    'Ionescu,Alexandru,15/03/2015,\n' +
    'Popescu,Maria Elena,22/07/2018,\n' +
    'Constantin,Andrei Mihai,08/11/2012,0722123456\n';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ImportSportiviExamenProps {
    isOpen: boolean;
    onClose: () => void;
    sesiune: SesiuneExamen;
    sportivi: Sportiv[];
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    grade: Grad[];
    allInscrieri: InscriereExamen[];
    setInscrieri: React.Dispatch<React.SetStateAction<InscriereExamen[]>>;
    istoricGrade: IstoricGrade[];
    currentUser: User;
}

// ─── Sub-componente UI ────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: RowStatus | Step2Status }> = ({ status }) => {
    const map: Record<string, string> = {
        created:  'bg-emerald-900/40 border-emerald-700/60 text-emerald-300',
        adaugat:  'bg-emerald-900/40 border-emerald-700/60 text-emerald-300',
        exists:   'bg-sky-900/40 border-sky-700/60 text-sky-300',
        ignorat:  'bg-amber-900/40 border-amber-700/60 text-amber-300',
        error:    'bg-rose-900/40 border-rose-700/60 text-rose-300',
        eroare:   'bg-rose-900/40 border-rose-700/60 text-rose-300',
        pending:  'bg-slate-700/60 border-slate-600 text-slate-300',
    };
    const label: Record<string, string> = {
        created: 'Creat', adaugat: 'Adăugat', exists: 'Existent',
        ignorat: 'Ignorat', error: 'Eroare', eroare: 'Eroare', pending: '—',
    };
    return (
        <span className={`inline-block px-2 py-0.5 rounded-full border text-xs font-bold ${map[status] ?? map.pending}`}>
            {label[status] ?? status}
        </span>
    );
};

// ─── Componenta principală ─────────────────────────────────────────────────────

export const ImportSportiviExamen: React.FC<ImportSportiviExamenProps> = ({
    isOpen, onClose, sesiune, sportivi, setSportivi, grade,
    allInscrieri, setInscrieri, istoricGrade, currentUser,
}) => {
    const { showError, showSuccess } = useError();

    const [step, setStep] = useState<1 | 2>(1);
    const [rows, setRows] = useState<ParsedRow[]>([]);
    const [step2Rows, setStep2Rows] = useState<Step2Row[]>([]);

    // Pas 1 state
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [step1Done, setStep1Done] = useState(false);

    // Pas 2 state
    const [isSaving, setIsSaving] = useState(false);
    const [step2Done, setStep2Done] = useState(false);

    const debutantGrad = useMemo(
        () => grade.find(g => g.ordine === 0 || g.nume.toLowerCase() === 'debutant') || grade[0],
        [grade]
    );

    const sortedGrade = useMemo(() => [...grade].sort((a, b) => a.ordine - b.ordine), [grade]);

    const inscrisiInSesiune = useMemo(
        () => new Set(allInscrieri.filter(i => i.sesiune_id === sesiune.id).map(i => i.sportiv_id)),
        [allInscrieri, sesiune.id]
    );

    // ── Reset la închidere ──────────────────────────────────────────────────

    const handleClose = useCallback(() => {
        setStep(1);
        setRows([]);
        setStep2Rows([]);
        setStep1Done(false);
        setStep2Done(false);
        setIsProcessing(false);
        setIsSaving(false);
        onClose();
    }, [onClose]);

    // ── Download template ───────────────────────────────────────────────────

    const downloadTemplate = () => {
        const blob = new Blob(['\uFEFF' + CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sablon_import_sportivi_examen.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Parsare CSV ─────────────────────────────────────────────────────────

    const parseCSV = (text: string): Array<{ nume: string; prenume: string; data: string; telefon: string }> => {
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) return [];

        // Detectare separator (, sau ;)
        const sep = lines[0].includes(';') ? ';' : ',';
        const header = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ''));
        const numeIdx    = header.findIndex(h => h.startsWith('num'));
        const prenumeIdx = header.findIndex(h => h.startsWith('pren'));
        const dataIdx    = header.findIndex(h => h.startsWith('data') || h.startsWith('dat'));
        const telIdx     = header.findIndex(h => h.includes('tel') || h.includes('fon'));

        if (numeIdx === -1 || prenumeIdx === -1 || dataIdx === -1) return [];

        return lines.slice(1).map(line => {
            const cols = line.split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
            return {
                nume:     cols[numeIdx] || '',
                prenume:  cols[prenumeIdx] || '',
                data:     cols[dataIdx] || '',
                telefon:  telIdx >= 0 ? (cols[telIdx] || '') : '',
            };
        }).filter(r => r.nume || r.prenume);
    };

    // ── Procesare Pas 1 ─────────────────────────────────────────────────────

    const processCsv = async (text: string) => {
        setIsProcessing(true);
        const parsed = parseCSV(text);

        if (parsed.length === 0) {
            showError('Format invalid', 'CSV-ul nu conține date valide sau headerele lipsesc (Nume, Prenume, Data nasterii).');
            setIsProcessing(false);
            return;
        }

        const result: ParsedRow[] = [];

        for (let idx = 0; idx < parsed.length; idx++) {
            const { nume, prenume, data, telefon } = parsed[idx];

            // Validare câmpuri obligatorii
            if (!nume || !prenume) {
                result.push({
                    idx, numeRaw: nume, prenumeRaw: prenume,
                    dataRaw: data, telefon,
                    status: 'error',
                    message: 'Nume sau prenume lipsă',
                    gradSustinutId: debutantGrad?.id || '',
                });
                continue;
            }

            const dataParsed = parseDate(data);
            if (!dataParsed) {
                result.push({
                    idx, numeRaw: nume, prenumeRaw: prenume,
                    dataRaw: data, telefon,
                    status: 'error',
                    message: `Data nașterii invalidă: "${data}" (format acceptat: ZZ/LL/AAAA)`,
                    gradSustinutId: debutantGrad?.id || '',
                });
                continue;
            }

            // Verificare duplicat în DB
            const numeNorm    = normalizeStr(nume);
            const prenumeNorm = normalizeStr(prenume);
            const existing = sportivi.find(s =>
                normalizeStr(s.nume) === numeNorm &&
                normalizeStr(s.prenume) === prenumeNorm &&
                s.data_nasterii === dataParsed
            );

            if (existing) {
                result.push({
                    idx, numeRaw: nume, prenumeRaw: prenume,
                    dataRaw: data, telefon,
                    status: 'exists',
                    message: 'Există deja în baza de date',
                    sportivId: existing.id,
                    gradSustinutId: debutantGrad?.id || '',
                });
                continue;
            }

            // Creare sportiv nou
            try {
                const sportivData = {
                    nume: nume.trim(),
                    prenume: prenume.trim(),
                    data_nasterii: dataParsed,
                    data_inscrierii: new Date().toISOString().slice(0, 10),
                    email: generateEmail(prenume, nume),
                    telefon: telefon || undefined,
                    club_id: currentUser.club_id || undefined,
                    grad_actual_id: debutantGrad?.id || undefined,
                    grupa_id: null,
                    status: 'Activ',
                };

                // Eliminare undefined
                const cleanData = Object.fromEntries(
                    Object.entries(sportivData).filter(([, v]) => v !== undefined && v !== null && v !== '')
                );

                const { data: newSportiv, error } = await supabase
                    .from('sportivi')
                    .insert(cleanData)
                    .select('*')
                    .maybeSingle();

                if (error) throw error;
                if (!newSportiv) throw new Error('Nu s-a returnat sportivul creat.');

                // Creare intrare în istoric_grade pentru debutant
                if (debutantGrad?.id) {
                    await supabase.from('istoric_grade').insert({
                        sportiv_id: newSportiv.id,
                        grad_id: debutantGrad.id,
                        data_obtinere: new Date().toISOString().slice(0, 10),
                        observatii: 'Import inițial — sesiune examen',
                    });
                }

                setSportivi(prev => [...prev, newSportiv as Sportiv]);

                result.push({
                    idx, numeRaw: nume, prenumeRaw: prenume,
                    dataRaw: data, telefon,
                    status: 'created',
                    message: `Creat cu grad ${debutantGrad?.nume || 'Debutant'}`,
                    sportivId: newSportiv.id,
                    gradSustinutId: debutantGrad?.id || '',
                });
            } catch (err: any) {
                result.push({
                    idx, numeRaw: nume, prenumeRaw: prenume,
                    dataRaw: data, telefon,
                    status: 'error',
                    message: err.message || 'Eroare necunoscută la creare',
                    gradSustinutId: debutantGrad?.id || '',
                });
            }
        }

        setRows(result);
        setStep1Done(true);
        setIsProcessing(false);
    };

    // ── Fișier upload ───────────────────────────────────────────────────────

    const handleFile = (file: File) => {
        if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && !file.type.includes('text')) {
            showError('Format nepermis', 'Acceptăm doar fișiere CSV (.csv).');
            return;
        }
        const reader = new FileReader();
        reader.onload = e => processCsv(e.target?.result as string);
        reader.readAsText(file, 'UTF-8');
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        e.target.value = '';
    };

    // ── Pregătire Pas 2 ─────────────────────────────────────────────────────

    const goToStep2 = () => {
        // Pregătim rândurile pentru pasul 2:
        // - doar sportivii cu status 'created' sau 'exists' (care au sportivId)
        const eligible = rows.filter(r => (r.status === 'created' || r.status === 'exists') && r.sportivId);

        // Sugestie grad: gradul următor față de cel actual
        const withGrade: Step2Row[] = eligible.map(r => {
            const sportiv = sportivi.find(s => s.id === r.sportivId);
            let suggestedGradId = r.gradSustinutId;

            if (sportiv) {
                const currentGrade = grade.find(g => g.id === sportiv.grad_actual_id);
                const currentOrder = currentGrade ? currentGrade.ordine : -1;
                const nextGrade = sortedGrade.find(g => g.ordine > currentOrder);
                if (nextGrade) suggestedGradId = nextGrade.id;
            }

            return {
                ...r,
                gradSustinutId: suggestedGradId,
                step2Status: 'pending',
                step2Message: '',
            };
        });

        setStep2Rows(withGrade);
        setStep(2);
    };

    // ── Actualizare grad selectat în Pas 2 ─────────────────────────────────

    const updateGrad = (idx: number, gradId: string) => {
        setStep2Rows(prev => prev.map((r, i) => i === idx ? { ...r, gradSustinutId: gradId } : r));
    };

    // ── Salvare Pas 2 ───────────────────────────────────────────────────────

    const handleSaveStep2 = async () => {
        setIsSaving(true);
        const updatedRows: Step2Row[] = [...step2Rows];
        const newInscrieri: InscriereExamen[] = [];

        for (let i = 0; i < updatedRows.length; i++) {
            await new Promise(r => setTimeout(r, 0)); // yield to browser
            const row = updatedRows[i];

            if (!row.sportivId || !row.gradSustinutId) {
                updatedRows[i] = { ...row, step2Status: 'ignorat', step2Message: 'Lipsă sportiv sau grad' };
                continue;
            }

            // Verificare: deja înscris în sesiune
            if (inscrisiInSesiune.has(row.sportivId)) {
                updatedRows[i] = { ...row, step2Status: 'ignorat', step2Message: 'Deja înscris în această sesiune' };
                continue;
            }

            // Verificare: are deja gradul
            const areGradul = istoricGrade.some(
                ig => ig.sportiv_id === row.sportivId && ig.grad_id === row.gradSustinutId
            );
            if (areGradul) {
                const gradNume = grade.find(g => g.id === row.gradSustinutId)?.nume || 'grad';
                updatedRows[i] = { ...row, step2Status: 'ignorat', step2Message: `Are deja gradul "${gradNume}"` };
                continue;
            }

            const sportiv = sportivi.find(s => s.id === row.sportivId);
            const grad    = grade.find(g => g.id === row.gradSustinutId);

            if (!sportiv || !grad) {
                updatedRows[i] = { ...row, step2Status: 'eroare', step2Message: 'Sportiv sau grad negăsit' };
                continue;
            }

            try {
                // Calcul taxă via RPC — fallback la 0 dacă funcția nu e disponibilă
                let taxaSuma = 0;
                try {
                    const { data: regDetails, error: regError } = await supabase.rpc('get_registration_details', {
                        p_sportiv_id: sportiv.id,
                    });
                    if (!regError && regDetails?.[0]) taxaSuma = regDetails[0].taxa_suma || 0;
                } catch {
                    console.warn(`[ImportSportiviExamen] get_registration_details indisponibil, continuăm fără taxă.`);
                }

                let plataId: string | null = null;
                if (taxaSuma > 0) {
                    // upsert cu sesiune_id — la import, duplicate silențioase (ignoreDuplicates: true)
                    const { data: pData, error: pError } = await supabase
                        .from('plati')
                        .upsert({
                            sportiv_id: sportiv.id,
                            familie_id: sportiv.familie_id,
                            sesiune_id: sesiune.id,
                            suma: taxaSuma,
                            data: sesiune.data,
                            status: 'Neachitat',
                            descriere: `Taxa examen ${grad.nume}`,
                            tip: 'Taxa Examen',
                            observatii: 'Generat automat — import sesiune examen',
                        }, { onConflict: 'sportiv_id,sesiune_id', ignoreDuplicates: true })
                        .select()
                        .maybeSingle();
                    if (pError) throw new Error(`Factură: ${pError.message}`);
                    // Dacă plata exista deja (ignoreDuplicates), caută ID-ul existent
                    if (pData?.id) {
                        plataId = pData.id;
                    } else {
                        const { data: existing } = await supabase
                            .from('plati')
                            .select('id')
                            .eq('sportiv_id', sportiv.id)
                            .eq('sesiune_id', sesiune.id)
                            .eq('tip', 'Taxa Examen')
                            .maybeSingle();
                        plataId = existing?.id || null;
                    }
                }

                const getAge = (birth: string, ref: string) => {
                    if (!birth || !ref) return 0;
                    const b = new Date(birth), r = new Date(ref);
                    let a = r.getFullYear() - b.getFullYear();
                    if (r.getMonth() < b.getMonth() || (r.getMonth() === b.getMonth() && r.getDate() < b.getDate())) a--;
                    return a;
                };

                const { data: iData, error: iError } = await supabase.from('inscrieri_examene').insert({
                    sportiv_id: sportiv.id,
                    sesiune_id: sesiune.id,
                    plata_id: plataId,
                    grad_actual_id: sportiv.grad_actual_id || null,
                    grad_sustinut_id: row.gradSustinutId,
                    club_id: sportiv.club_id,
                    varsta_la_examen: getAge(sportiv.data_nasterii || '', sesiune.data || ''),
                    rezultat: 'Neprezentat',
                }).select().maybeSingle();

                if (iError) throw iError;
                if (!iData) throw new Error('Înscrierea nu a returnat date.');

                // Citim din vedere pentru date complete
                const { data: viewData } = await supabase
                    .from('vedere_detalii_examen')
                    .select('*')
                    .eq('inscriere_id', iData.id)
                    .maybeSingle();

                if (viewData) newInscrieri.push(viewData as InscriereExamen);

                updatedRows[i] = { ...row, step2Status: 'adaugat', step2Message: `Înscris pentru gradul "${grad.nume}"` };
            } catch (err: any) {
                updatedRows[i] = { ...row, step2Status: 'eroare', step2Message: err.message || 'Eroare necunoscută' };
            }
        }

        // Notificări sportivi
        const notifications = newInscrieri.map(ins => {
            const sp = sportivi.find(s => s.id === ins.sportiv_id);
            const gr = grade.find(g => g.id === ins.grad_sustinut_id);
            if (!sp?.user_id) return null;
            return {
                recipient_user_id: sp.user_id,
                title: 'Înscriere Examen',
                body: `Ai fost înscris la examenul din ${new Date(sesiune.data || '').toLocaleDateString('ro-RO')} pentru gradul ${gr?.nume || 'necunoscut'}.`,
                type: 'examen',
            };
        }).filter((n): n is NonNullable<typeof n> => n !== null);
        if (notifications.length > 0) await sendBulkNotifications(notifications);

        setInscrieri(prev => [...prev, ...newInscrieri]);
        setStep2Rows(updatedRows);
        setStep2Done(true);
        setIsSaving(false);

        const added   = updatedRows.filter(r => r.step2Status === 'adaugat').length;
        const skipped = updatedRows.filter(r => r.step2Status === 'ignorat').length;
        const errors  = updatedRows.filter(r => r.step2Status === 'eroare').length;

        if (added > 0) showSuccess('Import finalizat', `${added} sportivi adăugați în sesiune.`);
        if (errors > 0) showError('Erori import', `${errors} sportivi nu au putut fi adăugați.`);
    };

    // ── Statistici ──────────────────────────────────────────────────────────

    const step1Stats = useMemo(() => ({
        created: rows.filter(r => r.status === 'created').length,
        exists:  rows.filter(r => r.status === 'exists').length,
        errors:  rows.filter(r => r.status === 'error').length,
        total:   rows.length,
    }), [rows]);

    const step2Stats = useMemo(() => ({
        adaugat: step2Rows.filter(r => r.step2Status === 'adaugat').length,
        ignorat: step2Rows.filter(r => r.step2Status === 'ignorat').length,
        eroare:  step2Rows.filter(r => r.step2Status === 'eroare').length,
        total:   step2Rows.length,
    }), [step2Rows]);

    const eligibleForStep2 = useMemo(
        () => rows.filter(r => (r.status === 'created' || r.status === 'exists') && r.sportivId).length,
        [rows]
    );

    // ─── Randare ─────────────────────────────────────────────────────────────

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={`Import Sportivi în Sesiune — Pas ${step} din 2`}
        >
            {/* ── Indicator pași ─────────────────────────────────────── */}
            <div className="flex gap-2 mb-6">
                {([1, 2] as const).map(s => (
                    <div
                        key={s}
                        className={`flex-1 h-1.5 rounded-full transition-colors ${
                            step >= s ? 'bg-brand-secondary' : 'bg-slate-700'
                        }`}
                    />
                ))}
            </div>

            {/* ═══════════════════════════════════════════════════════════
                PAS 1: Upload + procesare CSV
            ═══════════════════════════════════════════════════════════ */}
            {step === 1 && (
                <div className="space-y-5">

                    {/* Header + download template */}
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <h3 className="text-white font-semibold">Pasul 1 — Adaugă sportivi în sistem</h3>
                            <p className="text-slate-400 text-sm mt-1">
                                Importă un fișier CSV cu sportivii care susțin examenul.
                                Sportivii noi vor fi creați automat cu grad <strong className="text-white">{debutantGrad?.nume || 'Debutant'}</strong>,
                                clubul tău și fără grupă. Cei existenți sunt ignorați.
                            </p>
                        </div>
                        <Button variant="secondary" onClick={downloadTemplate} title="Descarcă șablon CSV fictiv">
                            <DownloadIcon className="w-4 h-4 mr-2" /> Șablon CSV
                        </Button>
                    </div>

                    {/* Info șablon */}
                    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-sm">
                        <p className="text-slate-300 font-semibold mb-2">Format CSV acceptat:</p>
                        <div className="overflow-x-auto">
                            <table className="text-xs w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-700">
                                        <th className="text-left py-1.5 px-2 text-slate-400">Coloană</th>
                                        <th className="text-left py-1.5 px-2 text-slate-400">Obligatoriu</th>
                                        <th className="text-left py-1.5 px-2 text-slate-400">Format</th>
                                        <th className="text-left py-1.5 px-2 text-slate-400">Exemplu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { col: 'Nume', req: true,  fmt: 'Text',          ex: 'Ionescu' },
                                        { col: 'Prenume', req: true,  fmt: 'Text',        ex: 'Alexandru' },
                                        { col: 'Data nasterii', req: true,  fmt: 'ZZ/LL/AAAA', ex: '15/03/2015' },
                                        { col: 'Telefon', req: false, fmt: 'Număr',        ex: '0722123456' },
                                    ].map(({ col, req, fmt, ex }) => (
                                        <tr key={col} className="border-b border-slate-800 last:border-0">
                                            <td className="py-1.5 px-2 text-white font-medium">{col}</td>
                                            <td className="py-1.5 px-2">
                                                {req
                                                    ? <span className="text-rose-400 font-bold">DA</span>
                                                    : <span className="text-slate-500">opțional</span>
                                                }
                                            </td>
                                            <td className="py-1.5 px-2 font-mono text-slate-300 text-xs">{fmt}</td>
                                            <td className="py-1.5 px-2 text-slate-400 italic">{ex}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-slate-500 text-xs mt-3">
                            Nu include coloane cu ID-uri sau date din baza de date — sistemul le ignoră oricum.
                        </p>
                    </div>

                    {/* Zona upload */}
                    {!step1Done && (
                        <div
                            className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
                                isDragging
                                    ? 'border-brand-secondary bg-brand-secondary/10'
                                    : 'border-slate-600 hover:border-slate-500 bg-slate-800/30'
                            }`}
                            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => !isProcessing && document.getElementById('csv-upload-input')?.click()}
                        >
                            <input
                                id="csv-upload-input"
                                type="file"
                                accept=".csv,text/csv"
                                className="hidden"
                                onChange={handleFileInput}
                            />
                            {isProcessing ? (
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="w-8 h-8 text-brand-secondary animate-spin" />
                                    <p className="text-slate-300 font-medium">Se procesează fișierul...</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <UploadCloudIcon className="w-10 h-10 text-slate-500" />
                                    <div>
                                        <p className="text-white font-medium">Trage fișierul CSV aici</p>
                                        <p className="text-slate-400 text-sm">sau click pentru a selecta</p>
                                    </div>
                                    <p className="text-slate-500 text-xs">Acceptat: .csv</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Raport Pas 1 ──────────────────────────────────── */}
                    {step1Done && (
                        <div className="space-y-4">

                            {/* Summary cards */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-emerald-400">{step1Stats.created}</p>
                                    <p className="text-xs text-emerald-300 mt-1">Creați</p>
                                </div>
                                <div className="bg-sky-900/20 border border-sky-700/40 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-sky-400">{step1Stats.exists}</p>
                                    <p className="text-xs text-sky-300 mt-1">Existenți (ignorați)</p>
                                </div>
                                <div className="bg-rose-900/20 border border-rose-700/40 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-rose-400">{step1Stats.errors}</p>
                                    <p className="text-xs text-rose-300 mt-1">Erori</p>
                                </div>
                            </div>

                            {/* Tabel detalii */}
                            <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-700">
                                <table className="text-xs w-full border-collapse">
                                    <thead className="sticky top-0 bg-slate-800">
                                        <tr className="border-b border-slate-700">
                                            <th className="text-left py-2 px-3 text-slate-400">Sportiv</th>
                                            <th className="text-left py-2 px-3 text-slate-400">Data nașterii</th>
                                            <th className="text-left py-2 px-3 text-slate-400">Status</th>
                                            <th className="text-left py-2 px-3 text-slate-400">Detalii</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((r, i) => (
                                            <tr key={i} className="border-b border-slate-800 last:border-0">
                                                <td className="py-2 px-3 text-white font-medium">
                                                    {r.numeRaw} {r.prenumeRaw}
                                                </td>
                                                <td className="py-2 px-3 text-slate-300 font-mono">{r.dataRaw}</td>
                                                <td className="py-2 px-3">
                                                    <StatusBadge status={r.status} />
                                                </td>
                                                <td className="py-2 px-3 text-slate-400">{r.message}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Opțiune re-upload */}
                            <button
                                className="text-xs text-slate-500 hover:text-slate-300 underline"
                                onClick={() => { setStep1Done(false); setRows([]); }}
                            >
                                Încarcă alt fișier
                            </button>
                        </div>
                    )}

                    {/* Footer Pas 1 */}
                    <div className="flex justify-between items-center pt-4 border-t border-slate-700">
                        <Button variant="secondary" onClick={handleClose}>Anulează</Button>
                        <Button
                            variant="primary"
                            onClick={goToStep2}
                            disabled={!step1Done || eligibleForStep2 === 0}
                        >
                            Continuă la Pasul 2
                            <ChevronRightIcon className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                PAS 2: Selectare grad + adăugare în sesiune
            ═══════════════════════════════════════════════════════════ */}
            {step === 2 && (
                <div className="space-y-5">

                    <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                            <h3 className="text-white font-semibold">Pasul 2 — Adaugă sportivii în sesiunea de examen</h3>
                            <p className="text-slate-400 text-sm mt-1">
                                Selectează gradul susținut pentru fiecare sportiv. Sunt excluși automat sportivii
                                care au deja gradul respectiv sau care sunt deja înscriși în sesiune.
                            </p>
                        </div>
                    </div>

                    {/* Avertisment sportivi cu erori la pas 1 */}
                    {step1Stats.errors > 0 && (
                        <div className="flex items-center gap-2 p-3 bg-amber-900/20 border border-amber-700/40 rounded-lg text-amber-300 text-xs">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            {step1Stats.errors} sportivi cu erori la import nu apar în lista de mai jos.
                        </div>
                    )}

                    {/* Lista sportivi pentru pasul 2 */}
                    {!step2Done ? (
                        <div className="max-h-96 overflow-y-auto space-y-2 p-1">
                            {step2Rows.length === 0 && (
                                <p className="text-center text-slate-500 py-8">Niciun sportiv eligibil pentru sesiune.</p>
                            )}
                            {step2Rows.map((r, i) => {
                                const sp = sportivi.find(s => s.id === r.sportivId);
                                const gradActualNume = grade.find(g => g.id === sp?.grad_actual_id)?.nume || 'Debutant';
                                return (
                                    <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-slate-800/60 rounded-lg border border-slate-700">
                                        <div className="flex-grow">
                                            <p className="text-white font-medium text-sm">
                                                {r.numeRaw} {r.prenumeRaw}
                                            </p>
                                            <p className="text-slate-400 text-xs">
                                                Grad actual: <span className="text-slate-300">{gradActualNume}</span>
                                                {r.status === 'created' && (
                                                    <span className="ml-2 text-emerald-400 font-bold">NOU</span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="w-full sm:w-52">
                                            <Select
                                                label=""
                                                value={r.gradSustinutId}
                                                onChange={e => updateGrad(i, e.target.value)}
                                                className="!py-1.5 text-sm"
                                                disabled={isSaving}
                                            >
                                                <option value="">Alege grad susținut...</option>
                                                {sortedGrade.map(g => (
                                                    <option key={g.id} value={g.id}>{g.nume}</option>
                                                ))}
                                            </Select>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* ── Raport Pas 2 ──────────────────────────────── */
                        <div className="space-y-4">
                            {/* Summary cards */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-emerald-400">{step2Stats.adaugat}</p>
                                    <p className="text-xs text-emerald-300 mt-1">Adăugați în sesiune</p>
                                </div>
                                <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-amber-400">{step2Stats.ignorat}</p>
                                    <p className="text-xs text-amber-300 mt-1">Ignorați</p>
                                </div>
                                <div className="bg-rose-900/20 border border-rose-700/40 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-rose-400">{step2Stats.eroare}</p>
                                    <p className="text-xs text-rose-300 mt-1">Erori</p>
                                </div>
                            </div>

                            {/* Tabel detalii */}
                            <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-700">
                                <table className="text-xs w-full border-collapse">
                                    <thead className="sticky top-0 bg-slate-800">
                                        <tr className="border-b border-slate-700">
                                            <th className="text-left py-2 px-3 text-slate-400">Sportiv</th>
                                            <th className="text-left py-2 px-3 text-slate-400">Grad susținut</th>
                                            <th className="text-left py-2 px-3 text-slate-400">Status</th>
                                            <th className="text-left py-2 px-3 text-slate-400">Motiv</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {step2Rows.map((r, i) => (
                                            <tr key={i} className="border-b border-slate-800 last:border-0">
                                                <td className="py-2 px-3 text-white font-medium">
                                                    {r.numeRaw} {r.prenumeRaw}
                                                </td>
                                                <td className="py-2 px-3 text-slate-300">
                                                    {grade.find(g => g.id === r.gradSustinutId)?.nume || '—'}
                                                </td>
                                                <td className="py-2 px-3">
                                                    <StatusBadge status={r.step2Status} />
                                                </td>
                                                <td className="py-2 px-3 text-slate-400">{r.step2Message}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Footer Pas 2 */}
                    <div className="flex justify-between items-center pt-4 border-t border-slate-700">
                        {!step2Done ? (
                            <>
                                <Button variant="secondary" onClick={() => setStep(1)} disabled={isSaving}>
                                    <ArrowLeftIcon className="w-4 h-4 mr-1" /> Înapoi
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleSaveStep2}
                                    isLoading={isSaving}
                                    disabled={step2Rows.length === 0 || step2Rows.some(r => !r.gradSustinutId)}
                                >
                                    <CheckCircleIcon className="w-4 h-4 mr-2" />
                                    Adaugă {step2Rows.length} sportivi în sesiune
                                </Button>
                            </>
                        ) : (
                            <>
                                <div />
                                <Button variant="primary" onClick={handleClose}>
                                    <CheckCircleIcon className="w-4 h-4 mr-2" />
                                    Finalizat — Închide
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
};
