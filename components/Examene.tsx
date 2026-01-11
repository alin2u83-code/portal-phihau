import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Examen, Participare, Sportiv, Grad, PretConfig, Plata } from '../types';
import { Button, Modal, Input, Select, Card, ConfirmationModal } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon, UsersIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

interface ParsedRow { id: number; fullName: string; gradName: string; nota_tehnica: number | null; nota_doc_luyen: number | null; nota_song_doi: number | null; nota_thao_quyen: number | null; sportiv_id: string | null; grad_sustinut_id: string | null; status: 'ok' | 'sportiv_not_found' | 'grad_not_found' | 'invalid_row'; selected: boolean; media: number | null; }
const ImportModal: React.FC<{ isOpen: boolean; onClose: () => void; onImportConfirm: (dataToImport: Omit<Participare, 'id'>[]) => Promise<void>; sportivi: Sportiv[]; grade: Grad[]; examenId: string; sportiviNeinscrisi: Sportiv[]; }> = ({ isOpen, onClose, onImportConfirm, sportivi, grade, examenId, sportiviNeinscrisi }) => {
    const [step, setStep] = useState<'paste' | 'preview'>('paste');
    const [pastedText, setPastedText] = useState('');
    const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
    const [loading, setLoading] = useState(false);
    const normalizeString = (str: string) => str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const handleProcessData = () => {
        const rows = pastedText.trim().split('\n').filter(Boolean);
        const processedRows: ParsedRow[] = rows.map((row, index) => {
            const columns = row.split('\t').map(c => c.trim());
            if (columns.length < 2) return { id: index, status: 'invalid_row', selected: false } as ParsedRow;
            const [fullName, gradName, nota1, nota2, nota3, nota4] = columns;
            const normalizedFullName = normalizeString(fullName);
            const foundSportiv = sportivi.find(s => normalizeString(`${s.nume} ${s.prenume}`) === normalizedFullName || normalizeString(`${s.prenume} ${s.nume}`) === normalizedFullName);
            const normalizedGradName = normalizeString(gradName);
            const foundGrad = grade.find(g => normalizeString(g.nume) === normalizedGradName);
            let status: ParsedRow['status'] = 'ok';
            if (!foundSportiv) status = 'sportiv_not_found';
            else if (!foundGrad) status = 'grad_not_found';
            const p: Partial<Participare> = { nota_tehnica: nota1 ? parseFloat(nota1.replace(',', '.')) : null, nota_doc_luyen: nota2 ? parseFloat(nota2.replace(',', '.')) : null, nota_song_doi: nota3 ? parseFloat(nota3.replace(',', '.')) : null, nota_thao_quyen: nota4 ? parseFloat(nota4.replace(',', '.')) : null };
            return { id: index, fullName, gradName, ...p, sportiv_id: foundSportiv?.id || null, grad_sustinut_id: foundGrad?.id || null, status, selected: status === 'ok', media: calculateMedia(p) } as ParsedRow;
        });
        setParsedData(processedRows); setStep('preview');
    };
    const handleManualSelect = (rowIndex: number, newSportivId: string) => { setParsedData(prev => prev.map(row => { if (row.id === rowIndex) { const sportiv = sportivi.find(s => s.id === newSportivId); return { ...row, sportiv_id: newSportivId, status: row.grad_sustinut_id ? 'ok' : 'grad_not_found', selected: !!row.grad_sustinut_id, fullName: sportiv ? `${sportiv.nume} ${sportiv.prenume}` : row.fullName }; } return row; })); };
    const handleSelectRow = (rowIndex: number, isSelected: boolean) => { setParsedData(prev => prev.map(row => row.id === rowIndex ? { ...row, selected: isSelected } : row)); };
    const handleConfirm = async () => {
        const dataToImport: Omit<Participare, 'id'>[] = parsedData.filter(row => row.selected && row.status === 'ok' && row.sportiv_id && row.grad_sustinut_id).map(row => ({ examen_id: examenId, sportiv_id: row.sportiv_id!, grad_sustinut_id: row.grad_sustinut_id!, nota_tehnica: row.nota_tehnica, nota_doc_luyen: row.nota_doc_luyen, nota_song_doi: row.nota_song_doi, nota_thao_quyen: row.nota_thao_quyen, media: row.media, rezultat: 'Neprezentat', observatii: 'Importat automat' }));
        setLoading(true); await onImportConfirm(dataToImport); setLoading(false); handleClose();
    };
    const handleClose = () => { setStep('paste'); setPastedText(''); setParsedData([]); onClose(); };
    const validRowCount = parsedData.filter(r => r.selected && r.status === 'ok').length;
    return ( <Modal isOpen={isOpen} onClose={handleClose} title="Importă Participanți & Note" persistent> {step === 'paste' ? ( <div className="space-y-4"> <h3 className="text-lg font-semibold text-white">Lipește datele</h3> <p className="text-sm text-slate-400">Asigură-te că datele respectă ordinea: Nume Prenume | Grad Susținut | Note...</p> <textarea className="w-full h-48 bg-slate-900/50 border border-slate-600 rounded-md p-2" value={pastedText} onChange={e => setPastedText(e.target.value)} placeholder="Lipește aici..."/> <div className="flex justify-end pt-4 space-x-2"> <Button variant="secondary" onClick={handleClose}>Anulează</Button> <Button variant="info" onClick={handleProcessData} disabled={!pastedText.trim()}>Procesează</Button> </div> </div> ) : ( <div className="space-y-4"> <h3 className="text-lg font-semibold text-white">Previzualizare și Validare</h3> <div className="max-h-[50vh] overflow-y-auto border border-slate-700 rounded-md"> <table className="w-full text-left text-sm"> <thead className="bg-slate-700/50 sticky top-0"><tr>{['', 'Nume', 'Grad', 'Note', 'Status'].map(h => <th key={h} className="p-2 font-semibold">{h}</th>)}</tr></thead> <tbody className="divide-y divide-slate-700"> {parsedData.map(row => ( <tr key={row.id} className={`${row.status !== 'ok' ? 'bg-red-900/40' : ''} ${!row.selected ? 'opacity-50' : ''}`}> <td className="p-2"><input type="checkbox" checked={row.selected} onChange={e => handleSelectRow(row.id, e.target.checked)} disabled={row.status !== 'ok'} /></td> <td className="p-2"> {row.status === 'sportiv_not_found' ? ( <Select label="" value="" onChange={e => handleManualSelect(row.id, e.target.value)} className="text-xs"> <option value="">{row.fullName} (Negăsit)</option> {sportiviNeinscrisi.map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>)} </Select> ) : row.fullName} </td> <td className={`p-2 ${row.status === 'grad_not_found' ? 'text-red-400' : ''}`}>{row.gradName}</td> <td className="p-2 text-xs">{[row.nota_tehnica, row.nota_doc_luyen, row.nota_song_doi, row.nota_thao_quyen].filter(n => n !== null).join(' / ')}</td> <td className="p-2"><span className={`px-2 py-0.5 text-[10px] rounded-full ${row.status === 'ok' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{row.status}</span></td> </tr> ))} </tbody> </table> </div> <div className="flex justify-between items-center pt-4 space-x-2"> <Button variant="secondary" onClick={() => setStep('paste')}>Înapoi</Button> <Button variant="success" onClick={handleConfirm} disabled={validRowCount === 0 || loading}> {loading ? 'Se importă...' : `Confirmă (${validRowCount} rânduri)`} </Button> </div> </div> )} </Modal> );
};
const ExamenFormModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (examen: Omit<Examen, 'id'>) => Promise<void>; examenToEdit: Examen | null; }> = ({ isOpen, onClose, onSave, examenToEdit }) => {
    const [formState, setFormState] = useState({ sesiune: 'Vara' as 'Vara' | 'Iarna', data: new Date().toISOString().split('T')[0], locatia: '' });
    const [loading, setLoading] = useState(false);
    React.useEffect(() => { if (isOpen) { if (examenToEdit) { setFormState({ sesiune: examenToEdit.sesiune, data: examenToEdit.data, locatia: examenToEdit.locatia }); } else { setFormState({ sesiune: 'Vara', data: new Date().toISOString().split('T')[0], locatia: '' }); } } }, [examenToEdit, isOpen]);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormState(p => ({ ...p, [e.target.name]: e.target.value as any }));
    const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); await onSave({ ...formState }); setLoading(false); onClose(); };
    return ( <Modal isOpen={isOpen} onClose={onClose} title={examenToEdit ? "Editează Sesiune" : "Creează Sesiune"}> <form onSubmit={handleSubmit} className="space-y-4"> <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <Select label="Sesiune" name="sesiune" value={formState.sesiune} onChange={handleChange}><option value="Vara">Vara</option><option value="Iarna">Iarna</option></Select> <Input label="Data" name="data" type="date" value={formState.data} onChange={handleChange} required /> <Input label="Locația" name="locatia" value={formState.locatia} onChange={handleChange} required /> </div> <div className="flex justify-end pt-4 space-x-2"><Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button><Button variant="success" type="submit" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button></div> </form> </Modal> );
};
const calculateMedia = (participare: Partial<Participare>): number | null => { const note = [participare.nota_tehnica, participare.nota_doc_luyen, participare.nota_song_doi, participare.nota_thao_quyen].filter(n => typeof n === 'number' && !isNaN(n)) as number[]; if (note.length === 0) return null; return parseFloat((note.reduce((acc, n) => acc + n, 0) / note.length).toFixed(2)); };
const getAge = (dateString?: string) => { if (!dateString) return 0; const today = new Date(); const birthDate = new Date(dateString); let age = today.getFullYear() - birthDate.getFullYear(); const m = today.getMonth() - birthDate.getMonth(); if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; } return age; };
const parseDurationToMonths = (durationStr: string): number => { const parts = durationStr.split(' '); if (parts.length < 2) return 0; const value = parseInt(parts[0], 10); const unit = parts[1].toLowerCase(); if (unit.startsWith('lun')) return value; if (unit.startsWith('an')) return value * 12; return 0; };

const ExamenDetail: React.FC<{ examen: Examen; participari: Participare[]; setParticipari: React.Dispatch<React.SetStateAction<Participare[]>>; sportivi: Sportiv[]; grade: Grad[]; onBack: () => void; preturiConfig: PretConfig[]; plati: Plata[]; setPlati: React.Dispatch<React.SetStateAction<Plata[]>>; examene: Examen[] }> = ({ examen, participari: toateParticiparile, setParticipari, sportivi, grade, onBack, preturiConfig, plati, setPlati, examene }) => {
    const [viewMode, setViewMode] = useState<'note' | 'admin'>('note');
    const [addParticipantForm, setAddParticipantForm] = useState({ sportivId: '', gradId: '', eligibilityMessage: '', isEligible: false });
    const [participantToDelete, setParticipantToDelete] = useState<Participare | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const { showError } = useError();
    const getPretGrad = (gradNume: string, dataReferinta: string = new Date().toISOString()): number | null => { const data = new Date(dataReferinta); const preturiValabile = preturiConfig.filter(p => p.categorie === 'Taxa Examen' && p.denumire_servisciu === gradNume && new Date(p.valabil_de_la_data) <= data).sort((a, b) => new Date(b.valabil_de_la_data).getTime() - new Date(a.valabil_de_la_data).getTime()); return preturiValabile.length > 0 ? preturiValabile[0].suma : null; };

    const participari = useMemo(() => toateParticiparile.filter(p => p.examen_id === examen.id), [toateParticiparile, examen.id]);

    useEffect(() => {
        const handleAutoSuggestGrad = () => {
            if (!addParticipantForm.sportivId) { setAddParticipantForm(prev => ({ ...prev, gradId: '', eligibilityMessage: '', isEligible: false })); return; }
            const sportiv = sportivi.find(s => s.id === addParticipantForm.sportivId);
            if (!sportiv) return;
            const admittedParticipations = toateParticiparile.filter(p => p.sportiv_id === sportiv.id && p.rezultat === 'Admis').map(p => ({...p, examen: examene.find(e => e.id === p.examen_id)})).filter(p => p.examen).sort((a, b) => new Date(b.examen!.data).getTime() - new Date(a.examen!.data).getTime());
            const lastAdmitted = admittedParticipations[0];
            const lastGrad = lastAdmitted ? grade.find(g => g.id === lastAdmitted.grad_sustinut_id) : null;
            const lastExamDate = lastAdmitted ? new Date(lastAdmitted.examen!.data) : new Date(sportiv.data_inscrierii);
            const currentOrder = lastGrad ? lastGrad.ordine : 0;
            const sortedGrades = [...grade].sort((a, b) => a.ordine - b.ordine);
            const nextGrad = sortedGrades.find(g => g.ordine > currentOrder);
            if (!nextGrad) { setAddParticipantForm(prev => ({ ...prev, gradId: '', eligibilityMessage: 'Grad maxim atins.', isEligible: false })); return; }
            let isEligible = true;
            let messages = [];
            const age = getAge(sportiv.data_nasterii);
            if (age < nextGrad.varsta_minima) { isEligible = false; messages.push(`Vârstă minimă (${nextGrad.varsta_minima} ani) neîndeplinită (are ${age}).`); }
            const monthsToWait = parseDurationToMonths(nextGrad.timp_asteptare);
            const eligibilityDate = new Date(lastExamDate);
            eligibilityDate.setMonth(eligibilityDate.getMonth() + monthsToWait);
            if (new Date() < eligibilityDate) { isEligible = false; messages.push(`Timp de așteptare insuficient (eligibil după ${eligibilityDate.toLocaleDateString('ro-RO')}).`); }
            const eligibilityMessage = messages.length > 0 ? messages.join(' ') : 'Sportiv eligibil pentru gradul următor.';
            setAddParticipantForm(prev => ({ ...prev, gradId: nextGrad.id, eligibilityMessage, isEligible }));
        };
        handleAutoSuggestGrad();
    }, [addParticipantForm.sportivId, sportivi, toateParticiparile, grade, examene]);
    
    const handleInscriereExamen = async () => {
        const { sportivId, gradId } = addParticipantForm;
        if (!sportivId || !gradId || !supabase) return;
        const sportiv = sportivi.find(s => s.id === sportivId);
        const gradSustinut = grade.find(g => g.id === gradId);
        if (!sportiv || !gradSustinut) { showError("Eroare", "Sportivul sau gradul selectat este invalid."); return; }
        const { data, error } = await supabase.from('participari').insert({ examen_id: examen.id, sportiv_id: sportivId, grad_sustinut_id: gradId, rezultat: 'Neprezentat' }).select().single();
        if (error) { showError("Eroare la adăugarea participării", error); return; }
        setParticipari(prev => [...prev, data as Participare]);
        const pret = getPretGrad(gradSustinut.nume, examen.data);
        if (pret !== null) { 
            const descrierePlata = `Taxa Examen ${gradSustinut.nume} - ${examen.sesiune} ${new Date(examen.data).getFullYear()}`;
            const newPlata: Omit<Plata, 'id'> = { sportiv_id: sportiv.id, familie_id: sportiv.familie_id, suma: pret, data: new Date().toISOString().split('T')[0], status: 'Neachitat', descriere: descrierePlata, tip: 'Taxa Examen', observatii: `Generat automat la înscriere examen.` }; 
            const { data: plataData, error: plataError } = await supabase.from('plati').insert(newPlata).select().single(); 
            if (plataError) { showError("Avertisment Plată", `Participant adăugat, dar eroare la generare taxă: ${plataError.message}`); } 
            else if (plataData) { setPlati(prev => [...prev, plataData as Plata]); } 
        } else {
            showError("Avertisment Plată", `Participant adăugat, dar nu s-a găsit un preț configurat pentru gradul ${gradSustinut.nume}. Taxa nu a fost generată.`);
        }
        setAddParticipantForm({ sportivId: '', gradId: '', eligibilityMessage: '', isEligible: false });
    };

    const handleUpdateParticipare = async (id: string, updates: Partial<Participare>) => { if (!supabase) return; let finalUpdates = { ...updates }; const original = toateParticiparile.find(p => p.id === id); if(!original) return; if (Object.keys(updates).some(k => k.startsWith('nota_'))) { finalUpdates.media = calculateMedia({ ...original, ...updates }); } setParticipari(prev => prev.map(p => p.id === id ? { ...p, ...finalUpdates } : p)); const { error } = await supabase.from('participari').update(finalUpdates).eq('id', id); if (error) { showError("Eroare la salvare", error); setParticipari(prev => prev.map(p => p.id === id ? original : p)); } };
    
    const handleGradeChange = async (participareId: string, newGradId: string) => {
        const participare = toateParticiparile.find(p => p.id === participareId);
        const sportiv = sportivi.find(s => s.id === participare?.sportiv_id);
        const oldGrad = grade.find(g => g.id === participare?.grad_sustinut_id);
        const newGrad = grade.find(g => g.id === newGradId);
        if (!participare || !sportiv || !oldGrad || !newGrad) return;
        
        handleUpdateParticipare(participareId, { grad_sustinut_id: newGradId });

        const descrierePlataVeche = `Taxa Examen ${oldGrad.nume} - ${examen.sesiune} ${new Date(examen.data).getFullYear()}`;
        const plataExistenta = plati.find(p => p.sportiv_id === sportiv.id && p.descriere === descrierePlataVeche);
        const pretNou = getPretGrad(newGrad.nume, examen.data);

        if (plataExistenta) {
            if (plataExistenta.status === 'Neachitat') {
                const updates = { suma: pretNou ?? 0, descriere: `Taxa Examen ${newGrad.nume} - ${examen.sesiune} ${new Date(examen.data).getFullYear()}` };
                const { data, error } = await supabase.from('plati').update(updates).eq('id', plataExistenta.id).select().single();
                if (error) { showError("Eroare la actualizarea taxei", error); } 
                else if (data) { setPlati(prev => prev.map(p => p.id === plataExistenta.id ? data as Plata : p)); }
            } else {
                showError("Avertisment", "Taxa pentru gradul anterior a fost deja achitată/parțial achitată și nu a fost modificată automat.");
            }
        } else if (pretNou !== null) {
            const newPlata: Omit<Plata, 'id'> = { sportiv_id: sportiv.id, familie_id: sportiv.familie_id, suma: pretNou, data: new Date().toISOString().split('T')[0], status: 'Neachitat', descriere: `Taxa Examen ${newGrad.nume} - ${examen.sesiune} ${new Date(examen.data).getFullYear()}`, tip: 'Taxa Examen', observatii: 'Generat automat la schimbare grad.' };
            const { data, error } = await supabase.from('plati').insert(newPlata).select().single();
            if (error) { showError("Eroare la crearea noii taxe", error); } 
            else if (data) { setPlati(prev => [...prev, data as Plata]); }
        }
    };

    const handleBulkImport = async (dataToImport: Omit<Participare, 'id'>[]) => {
        if (!supabase) return;
        const { data: insertedParticipari, error } = await supabase.from('participari').upsert(dataToImport, { onConflict: 'examen_id, sportiv_id' }).select();
        if (error) { showError("Eroare la importul masiv", error); return; } 
        if (!insertedParticipari) return;

        const importedSportivIds = new Set(insertedParticipari.map(d => d.sportiv_id));
        const updatedParticipari = toateParticiparile.filter(p => !importedSportivIds.has(p.sportiv_id));
        setParticipari([...updatedParticipari, ...insertedParticipari as Participare[]]);

        const platiToInsert: Omit<Plata, 'id'>[] = [];
        for (const p of insertedParticipari) {
            const sportiv = sportivi.find(s => s.id === p.sportiv_id); const grad = grade.find(g => g.id === p.grad_sustinut_id); if (!sportiv || !grad) continue;
            const pret = getPretGrad(grad.nume, examen.data);
            if (pret !== null) { platiToInsert.push({ sportiv_id: sportiv.id, familie_id: sportiv.familie_id, suma: pret, data: new Date().toISOString().split('T')[0], status: 'Neachitat', descriere: `Taxa Examen ${grad.nume} - ${examen.sesiune} ${new Date(examen.data).getFullYear()}`, tip: 'Taxa Examen', observatii: `Generat automat la import masiv.` }); }
        }
        if (platiToInsert.length > 0) {
            const { data: newPlati, error: platiError } = await supabase.from('plati').insert(platiToInsert).select();
            if (platiError) { showError("Avertisment Import", `Participanți importați, dar eroare la generarea taxelor: ${platiError.message}`); } 
            else if (newPlati) { setPlati(prev => [...prev, ...newPlati as Plata[]]); }
        }
    };
    
    const handleDeleteParticipant = async () => {
        if (!participantToDelete || !supabase) return;
        const sportiv = sportivi.find(s => s.id === participantToDelete.sportiv_id);
        const grad = grade.find(g => g.id === participantToDelete.grad_sustinut_id);
        if (!sportiv || !grad) { showError("Eroare", "Date participant invalide."); return; }

        const descrierePlata = `Taxa Examen ${grad.nume} - ${examen.sesiune} ${new Date(examen.data).getFullYear()}`;
        const plataAsociata = plati.find(p => p.sportiv_id === sportiv.id && p.descriere === descrierePlata);

        setDeleteLoading(true);
        if (plataAsociata && plataAsociata.status === 'Neachitat') {
            const { error: plataError } = await supabase.from('plati').delete().eq('id', plataAsociata.id);
            if (plataError) { showError("Avertisment", `Taxa asociată nu a putut fi ștearsă: ${plataError.message}. Ștergeți manual.`); } 
            else { setPlati(prev => prev.filter(p => p.id !== plataAsociata.id)); }
        }
        
        const { error } = await supabase.from('participari').delete().eq('id', participantToDelete.id);
        if (error) { showError("Eroare la ștergerea participării", error); } 
        else { setParticipari(prev => prev.filter(pa => pa.id !== participantToDelete.id)); }
        
        setDeleteLoading(false);
        setParticipantToDelete(null);
    };

    const sportiviNeinscrisi = sportivi.filter(s => s.status === 'Activ' && !participari.some(p => p.sportiv_id === s.id));

    return ( <div> <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Sesiuni</Button> <Card> <h2 className="text-3xl font-bold text-white">{`Sesiune ${examen.sesiune} ${new Date(examen.data).getFullYear()}`}</h2> <p className="text-slate-400">{new Date(examen.data).toLocaleDateString('ro-RO')} - {examen.locatia}</p> <div className="my-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700"> <h3 className="text-lg font-semibold mb-2">Adaugă Participant</h3> <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"> <Select label="Sportiv" value={addParticipantForm.sportivId} onChange={e => setAddParticipantForm(p => ({...p, sportivId: e.target.value}))}><option value="">Selectează...</option>{sportiviNeinscrisi.map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>)}</Select> <Select label="Grad Propus" value={addParticipantForm.gradId} onChange={e => setAddParticipantForm(p => ({...p, gradId: e.target.value}))} disabled={!addParticipantForm.sportivId}><option value="">Alege grad...</option>{grade.sort((a,b) => a.ordine - b.ordine).map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}</Select> <Button onClick={handleInscriereExamen} disabled={!addParticipantForm.sportivId || !addParticipantForm.gradId}><PlusIcon className="w-5 h-5 mr-2"/>Adaugă</Button> </div> {addParticipantForm.eligibilityMessage && (<p className={`text-xs mt-2 ${addParticipantForm.isEligible ? 'text-green-400' : 'text-amber-400'}`}>{addParticipantForm.eligibilityMessage}</p>)} <div className="flex justify-end mt-2"><Button variant="secondary" onClick={() => setIsImportModalOpen(true)} className="hidden md:inline-flex">Importă Date</Button></div></div> <div className="flex items-center justify-between mb-4"> <h3 className="text-xl font-bold text-white flex items-center gap-2"><UsersIcon className="w-6 h-6"/> Participanți ({participari.length})</h3> <div className="flex items-center p-1 bg-slate-700 rounded-lg"> <Button size="sm" variant={viewMode === 'note' ? 'primary' : 'secondary'} onClick={() => setViewMode('note')} className={viewMode === 'note' ? 'shadow-lg' : 'bg-transparent shadow-none'}>Note</Button> <Button size="sm" variant={viewMode === 'admin' ? 'primary' : 'secondary'} onClick={() => setViewMode('admin')} className={viewMode === 'admin' ? 'shadow-lg' : 'bg-transparent shadow-none'}>Admin</Button> </div> </div> <div className="hidden md:block overflow-x-auto"> {viewMode === 'note' ? ( <table className="w-full text-left min-w-[900px]"> <thead className="bg-slate-700/50 text-xs uppercase"><tr>{['#', 'Nume', 'Grad Susținut', 'Tehnică', 'Doc Luyen', 'Song Doi', 'Thao Quyen', 'Media'].map(h => <th key={h} className="p-3 font-semibold">{h}</th>)}</tr></thead> <tbody className="divide-y divide-slate-700">{participari.map((p, idx) => { const sportiv = sportivi.find(s => s.id === p.sportiv_id); return (<tr key={p.id} className="hover:bg-slate-700/30"> <td className="p-2">{idx+1}</td> <td className="p-2 font-bold">{sportiv?.nume} {sportiv?.prenume}</td> <td className="p-2 w-48"><Select label="" value={p.grad_sustinut_id} className="text-sm" onChange={e => handleGradeChange(p.id, e.target.value)}>{grade.map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}</Select></td> {['nota_tehnica', 'nota_doc_luyen', 'nota_song_doi', 'nota_thao_quyen'].map(notaKey => (<td key={notaKey} className="p-2 w-24"><Input label="" type="number" step="0.01" min="0" max="10" defaultValue={p[notaKey as keyof Participare] as number || ''} onBlur={e => handleUpdateParticipare(p.id, { [notaKey]: e.target.value ? parseFloat(e.target.value) : null })} className="text-center"/></td>))} <td className="p-2 font-bold text-brand-secondary text-center">{p.media?.toFixed(2)}</td> </tr>);})}</tbody></table> ) : ( <table className="w-full text-left min-w-[800px]"> <thead className="bg-slate-700/50 text-xs uppercase"><tr>{['#', 'Nume', 'Grad Susținut', 'Rezultat', 'Status Plată', 'Observații', ''].map(h => <th key={h} className="p-3 font-semibold">{h}</th>)}</tr></thead> <tbody className="divide-y divide-slate-700">{participari.map((p, idx) => { const sportiv = sportivi.find(s => s.id === p.sportiv_id); const grad = grade.find(g => g.id === p.grad_sustinut_id); const descrierePlata = `Taxa Examen ${grad?.nume} - ${examen.sesiune} ${new Date(examen.data).getFullYear()}`; const plata = plati.find(pl => pl.sportiv_id === sportiv?.id && pl.descriere === descrierePlata); const status = plata?.status || 'Neachitat'; const statusColor = status === 'Achitat' ? 'text-green-400' : status === 'Achitat Parțial' ? 'text-yellow-400' : 'text-red-400'; return (<tr key={p.id} className="hover:bg-slate-700/30"> <td className="p-2">{idx+1}</td> <td className="p-2 font-bold">{sportiv?.nume} {sportiv?.prenume}</td> <td className="p-2 text-sm"><Select label="" value={p.grad_sustinut_id} className="text-sm bg-transparent border-slate-700" onChange={e => handleGradeChange(p.id, e.target.value)}>{grade.map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}</Select></td> <td className="p-2 w-40"><Select label="" value={p.rezultat} onChange={e => handleUpdateParticipare(p.id, { rezultat: e.target.value as any })}><option>Admis</option><option>Respins</option><option>Neprezentat</option></Select></td> <td className="p-2"><span className={`font-bold ${statusColor}`}>{status}</span></td> <td className="p-2"><Input label="" defaultValue={p.observatii || ''} onBlur={e => handleUpdateParticipare(p.id, { observatii: e.target.value })} /></td> <td className="p-2 text-right"><Button variant="danger" size="sm" onClick={() => setParticipantToDelete(p)}><TrashIcon /></Button></td> </tr>);})}</tbody></table> )} </div> <div className="md:hidden grid grid-cols-1 gap-4"> {participari.map(p => { const sportiv = sportivi.find(s => s.id === p.sportiv_id); const grad = grade.find(g => g.id === p.grad_sustinut_id); const descrierePlata = `Taxa Examen ${grad?.nume} - ${examen.sesiune} ${new Date(examen.data).getFullYear()}`; const plata = plati.find(pl => pl.sportiv_id === sportiv?.id && pl.descriere === descrierePlata); const status = plata?.status || 'Neachitat'; const statusColor = status === 'Achitat' ? 'text-green-400' : status === 'Achitat Parțial' ? 'text-yellow-400' : 'text-red-400'; return ( <Card key={p.id} className="p-4"> <div className="flex justify-between items-start"> <h4 className="font-bold text-lg">{sportiv?.nume} {sportiv?.prenume}</h4> <Button variant="danger" size="sm" onClick={() => setParticipantToDelete(p)}><TrashIcon /></Button> </div> {viewMode === 'note' ? ( <div className="grid grid-cols-2 gap-4 mt-4"> <Select label="Grad" value={p.grad_sustinut_id} onChange={e => handleGradeChange(p.id, e.target.value)}>{grade.map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}</Select> <div></div> {['nota_tehnica', 'nota_doc_luyen', 'nota_song_doi', 'nota_thao_quyen'].map(notaKey => ( <Input key={notaKey} label={notaKey.replace('nota_', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} type="number" step="0.01" min="0" max="10" defaultValue={p[notaKey as keyof Participare] as number || ''} onBlur={e => handleUpdateParticipare(p.id, { [notaKey]: e.target.value ? parseFloat(e.target.value) : null })} /> ))} <div className="col-span-2 text-center pt-2"> <p className="text-sm text-slate-400">Media</p> <p className="font-bold text-brand-secondary text-2xl">{p.media?.toFixed(2) ?? 'N/A'}</p> </div> </div> ) : ( <div className="space-y-4 mt-4"> <Select label="Grad Susținut" value={p.grad_sustinut_id} onChange={e => handleGradeChange(p.id, e.target.value)}>{grade.map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}</Select> <Select label="Rezultat" value={p.rezultat} onChange={e => handleUpdateParticipare(p.id, { rezultat: e.target.value as any })}><option>Admis</option><option>Respins</option><option>Neprezentat</option></Select> <div><label className="block text-sm font-medium text-slate-300 mb-1">Status Plată</label><p className={`font-bold text-lg ${statusColor}`}>{status}</p></div> <Input label="Observații" defaultValue={p.observatii || ''} onBlur={e => handleUpdateParticipare(p.id, { observatii: e.target.value })} /> </div> )} </Card> ) })} </div> </Card> <ConfirmationModal isOpen={!!participantToDelete} onClose={() => setParticipantToDelete(null)} onConfirm={handleDeleteParticipant} title="Confirmare Ștergere" message="Sunteți sigur că doriți să ștergeți această înregistrare și taxa asociată (dacă este neachitată)?" loading={deleteLoading}/> <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImportConfirm={handleBulkImport} sportivi={sportivi} grade={grade} examenId={examen.id} sportiviNeinscrisi={sportiviNeinscrisi}/> </div> );
};

export const ExameneManagement: React.FC<{ onBack: () => void; examene: Examen[]; setExamene: React.Dispatch<React.SetStateAction<Examen[]>>; participari: Participare[]; setParticipari: React.Dispatch<React.SetStateAction<Participare[]>>; sportivi: Sportiv[]; grade: Grad[]; preturiConfig: PretConfig[]; plati: Plata[]; setPlati: React.Dispatch<React.SetStateAction<Plata[]>>; }> = ({ onBack, examene, setExamene, participari, setParticipari, sportivi, grade, preturiConfig, plati, setPlati }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [examenToEdit, setExamenToEdit] = useState<Examen | null>(null);
  const [selectedExamen, setSelectedExamen] = useState<Examen | null>(null);
  const [examenToDelete, setExamenToDelete] = useState<Examen | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { showError } = useError();
  const handleSaveExamen = async (examenData: Omit<Examen, 'id'>) => { if (!supabase) return; if (examenToEdit) { const { data, error } = await supabase.from('examene').update(examenData).eq('id', examenToEdit.id).select().single(); if (error) { showError("Eroare", error); } else if (data) { setExamene(prev => prev.map(e => e.id === examenToEdit.id ? data as Examen : e)); } } else { const { data, error } = await supabase.from('examene').insert(examenData).select().single(); if (error) { showError("Eroare", error); } else if (data) { setExamene(prev => [...prev, data as Examen]); } } };
  const handleDelete = async () => { if (!supabase || !examenToDelete) return; setDeleteLoading(true); const examenId = examenToDelete.id; const { error: pError } = await supabase.from('participari').delete().eq('examen_id', examenId); if(pError) { showError("Eroare", pError); setDeleteLoading(false); return; } const { error: eError } = await supabase.from('examene').delete().eq('id', examenId); if(eError) { showError("Eroare", eError); setDeleteLoading(false); return; } setParticipari(prev => prev.filter(p => p.examen_id !== examenId)); setExamene(prev => prev.filter(e => e.id !== examenId)); if (selectedExamen?.id === examenId) setSelectedExamen(null); setDeleteLoading(false); setExamenToDelete(null); };
  if(selectedExamen) { return <ExamenDetail examen={selectedExamen} participari={participari} setParticipari={setParticipari} sportivi={sportivi} grade={grade} onBack={() => setSelectedExamen(null)} preturiConfig={preturiConfig} plati={plati} setPlati={setPlati} examene={examene} />; }
  const sortedExamene = [...examene].sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  return ( <div> {onBack && <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>} <div className="flex justify-between items-center mb-6"> <h1 className="text-3xl font-bold text-white">Sesiuni Examen</h1> <Button onClick={() => { setExamenToEdit(null); setIsFormOpen(true); }} variant="info"><PlusIcon className="w-5 h-5 mr-2" />Sesiune Nouă</Button> </div> <div className="hidden md:block bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden"> <table className="w-full text-left"> <thead className="bg-slate-700/50"><tr>{['Sesiune', 'Data', 'Locația', 'Participanți', 'Acțiuni'].map(h => <th key={h} className="p-4 font-semibold">{h}</th>)}</tr></thead> <tbody className="divide-y divide-slate-700"> {sortedExamene.map(ex => ( <tr key={ex.id} className="hover:bg-slate-700/30 transition-colors"> <td className="p-4 font-bold cursor-pointer" onClick={() => setSelectedExamen(ex)}>{ex.sesiune} {new Date(ex.data).getFullYear()}</td> <td className="p-4 cursor-pointer" onClick={() => setSelectedExamen(ex)}>{new Date(ex.data).toLocaleDateString('ro-RO')}</td> <td className="p-4 text-slate-300 cursor-pointer" onClick={() => setSelectedExamen(ex)}>{ex.locatia}</td> <td className="p-4 font-semibold text-brand-secondary">{participari.filter(p => p.examen_id === ex.id).length}</td> <td className="p-4 text-right w-32"><div className="flex justify-end gap-2"><Button onClick={() => {setExamenToEdit(ex); setIsFormOpen(true);}} variant="primary" size="sm"><EditIcon /></Button><Button onClick={() => setExamenToDelete(ex)} variant="danger" size="sm"><TrashIcon /></Button></div></td> </tr> ))} </tbody> </table> {sortedExamene.length === 0 && <p className="p-8 text-center text-slate-400">Nicio sesiune.</p>} </div> <div className="md:hidden grid grid-cols-1 gap-4"> {sortedExamene.map(ex => ( <Card key={ex.id} className="p-0 overflow-hidden" onClick={() => setSelectedExamen(ex)}> <div className="p-4"> <h3 className="font-bold text-lg">{ex.sesiune} {new Date(ex.data).getFullYear()}</h3> <p className="text-sm text-slate-400">{new Date(ex.data).toLocaleDateString('ro-RO')} - {ex.locatia}</p> <p className="text-sm mt-2">Participanți: <span className="font-bold text-brand-secondary">{participari.filter(p => p.examen_id === ex.id).length}</span></p> </div> <div className="bg-slate-900/50 p-2 flex justify-end gap-2"> <Button onClick={(e) => { e.stopPropagation(); setExamenToEdit(ex); setIsFormOpen(true);}} variant="primary" size="sm"><EditIcon /></Button> 
{/* FIX: Corrected typo from setEventToDelete to setExamenToDelete */}
<Button onClick={(e) => { e.stopPropagation(); setExamenToDelete(ex);}} variant="danger" size="sm"><TrashIcon /></Button> </div> </Card> ))} </div> <ExamenFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSaveExamen} examenToEdit={examenToEdit} /> <ConfirmationModal isOpen={!!examenToDelete} onClose={() => setExamenToDelete(null)} onConfirm={handleDelete} title="Confirmare Ștergere" message="Atenție! Veți șterge sesiunea și TOATE rezultatele asociate." loading={deleteLoading}/> </div> );
};