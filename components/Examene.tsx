import React, { useState, useMemo } from 'react';
import { Examen, Participare, Sportiv, Grad } from '../types';
import { Button, Modal, Input, Select, Card, ConfirmationModal } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon, UsersIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

// --- Import Modal Logic ---
interface ParsedRow {
    id: number;
    originalData: string[];
    fullName: string;
    gradName: string;
    nota_tehnica: number | null;
    nota_doc_luyen: number | null;
    nota_song_doi: number | null;
    nota_thao_quyen: number | null;
    contributie: number | null;
    sportiv_id: string | null;
    grad_sustinut_id: string | null;
    status: 'ok' | 'sportiv_not_found' | 'grad_not_found' | 'invalid_row';
    selected: boolean;
    media: number | null;
}

const ImportModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onImportConfirm: (dataToImport: Omit<Participare, 'id'>[]) => Promise<void>;
    sportivi: Sportiv[];
    grade: Grad[];
    examenId: string;
    sportiviNeinscrisi: Sportiv[];
}> = ({ isOpen, onClose, onImportConfirm, sportivi, grade, examenId, sportiviNeinscrisi }) => {
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

            const [fullName, gradName, nota1, nota2, nota3, nota4, contributieStr] = columns;
            
            // Match sportiv
            const normalizedFullName = normalizeString(fullName);
            const foundSportiv = sportivi.find(s => normalizeString(`${s.nume} ${s.prenume}`) === normalizedFullName || normalizeString(`${s.prenume} ${s.nume}`) === normalizedFullName);
            
            // Match grad
            const normalizedGradName = normalizeString(gradName);
            const foundGrad = grade.find(g => normalizeString(g.nume) === normalizedGradName);

            let status: ParsedRow['status'] = 'ok';
            if (!foundSportiv) status = 'sportiv_not_found';
            else if (!foundGrad) status = 'grad_not_found';
            
            const p: Partial<Participare> = {
                nota_tehnica: nota1 ? parseFloat(nota1.replace(',', '.')) : null,
                nota_doc_luyen: nota2 ? parseFloat(nota2.replace(',', '.')) : null,
                nota_song_doi: nota3 ? parseFloat(nota3.replace(',', '.')) : null,
                nota_thao_quyen: nota4 ? parseFloat(nota4.replace(',', '.')) : null,
            };

            return {
                id: index,
                originalData: columns,
                fullName,
                gradName,
                nota_tehnica: p.nota_tehnica,
                nota_doc_luyen: p.nota_doc_luyen,
                nota_song_doi: p.nota_song_doi,
                nota_thao_quyen: p.nota_thao_quyen,
                contributie: contributieStr ? parseInt(contributieStr, 10) : null,
                sportiv_id: foundSportiv?.id || null,
                grad_sustinut_id: foundGrad?.id || null,
                status,
                selected: status === 'ok',
                media: calculateMedia(p),
            };
        });
        setParsedData(processedRows);
        setStep('preview');
    };

    const handleManualSelect = (rowIndex: number, newSportivId: string) => {
        setParsedData(prev => prev.map(row => {
            if (row.id === rowIndex) {
                const sportiv = sportivi.find(s => s.id === newSportivId);
                return { ...row, sportiv_id: newSportivId, status: row.grad_sustinut_id ? 'ok' : 'grad_not_found', selected: !!row.grad_sustinut_id, fullName: sportiv ? `${sportiv.nume} ${sportiv.prenume}` : row.fullName };
            }
            return row;
        }));
    };

    const handleSelectRow = (rowIndex: number, isSelected: boolean) => {
        setParsedData(prev => prev.map(row => row.id === rowIndex ? { ...row, selected: isSelected } : row));
    };

    const handleConfirm = async () => {
        const dataToImport: Omit<Participare, 'id'>[] = parsedData
            .filter(row => row.selected && row.status === 'ok' && row.sportiv_id && row.grad_sustinut_id)
            .map(row => ({
                examen_id: examenId,
                sportiv_id: row.sportiv_id!,
                grad_sustinut_id: row.grad_sustinut_id!,
                nota_tehnica: row.nota_tehnica,
                nota_doc_luyen: row.nota_doc_luyen,
                nota_song_doi: row.nota_song_doi,
                nota_thao_quyen: row.nota_thao_quyen,
                media: row.media,
                contributie: row.contributie,
                rezultat: 'Neprezentat',
                observatii: 'Importat automat',
            }));
        
        setLoading(true);
        await onImportConfirm(dataToImport);
        setLoading(false);
        handleClose();
    };

    const handleClose = () => {
        setStep('paste');
        setPastedText('');
        setParsedData([]);
        onClose();
    };

    const validRowCount = parsedData.filter(r => r.selected && r.status === 'ok').length;
    
    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Importă Participanți & Note" persistent>
            {step === 'paste' ? (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Lipește datele din Excel/CSV</h3>
                    <p className="text-sm text-slate-400">Asigură-te că datele respectă ordinea coloanelor de mai jos. Lipește tabelul (Ctrl+V) în căsuța de text.</p>
                    <div className="p-3 bg-slate-900/50 rounded-md text-xs text-slate-300 border border-slate-700">
                        Nume Prenume | Grad Susținut | Notă Tehnică | Notă Doc Luyen | Notă Song Doi | Notă Thao Quyen | Contribuție
                    </div>
                    <textarea 
                        className="w-full h-48 bg-slate-900/50 border border-slate-600 rounded-md p-2 text-white placeholder-slate-500 focus:ring-brand-secondary focus:border-brand-secondary" 
                        value={pastedText}
                        onChange={e => setPastedText(e.target.value)}
                        placeholder="Lipește aici datele copiate..."
                    />
                    <div className="flex justify-end pt-4 space-x-2">
                        <Button variant="secondary" onClick={handleClose}>Anulează</Button>
                        <Button variant="info" onClick={handleProcessData} disabled={!pastedText.trim()}>Procesează Date</Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Previzualizare și Validare</h3>
                    <p className="text-sm text-slate-400">Verifică datele de mai jos. Rândurile marcate cu roșu necesită corectarea manuală a sportivului. Bifează rândurile pe care dorești să le imporți.</p>
                     <div className="max-h-[50vh] overflow-y-auto border border-slate-700 rounded-md">
                        <table className="w-full text-left text-sm">
                           <thead className="bg-slate-700/50 sticky top-0"><tr>{['', 'Nume', 'Grad', 'Note', 'Status'].map(h => <th key={h} className="p-2 font-semibold">{h}</th>)}</tr></thead>
                           <tbody className="divide-y divide-slate-700">
                               {parsedData.map(row => (
                                   <tr key={row.id} className={`${row.status !== 'ok' ? 'bg-red-900/40' : ''} ${!row.selected ? 'opacity-50' : ''}`}>
                                       <td className="p-2"><input type="checkbox" checked={row.selected} onChange={e => handleSelectRow(row.id, e.target.checked)} disabled={row.status !== 'ok'} /></td>
                                       <td className="p-2">
                                           {row.status === 'sportiv_not_found' ? (
                                               <Select label="" value="" onChange={e => handleManualSelect(row.id, e.target.value)} className="text-xs">
                                                   <option value="">{row.fullName} (Negăsit)</option>
                                                   {sportiviNeinscrisi.map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>)}
                                               </Select>
                                           ) : row.fullName}
                                       </td>
                                       <td className={`p-2 ${row.status === 'grad_not_found' ? 'text-red-400 font-bold' : ''}`}>{row.gradName}</td>
                                       <td className="p-2 text-xs">{[row.nota_tehnica, row.nota_doc_luyen, row.nota_song_doi, row.nota_thao_quyen].filter(n => n !== null).join(' / ')}</td>
                                       <td className="p-2"><span className={`px-2 py-0.5 text-[10px] rounded-full ${row.status === 'ok' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{row.status}</span></td>
                                   </tr>
                               ))}
                           </tbody>
                        </table>
                     </div>
                     <div className="flex justify-between items-center pt-4 space-x-2">
                        <Button variant="secondary" onClick={() => setStep('paste')}>Înapoi</Button>
                        <Button variant="success" onClick={handleConfirm} disabled={validRowCount === 0 || loading}>
                            {loading ? 'Se importă...' : `Confirmă și Importă (${validRowCount} rânduri)`}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
};
// --- End Import Modal Logic ---

const ExamenFormModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (examen: Omit<Examen, 'id'>) => Promise<void>; examenToEdit: Examen | null; }> = ({ isOpen, onClose, onSave, examenToEdit }) => {
    const [formState, setFormState] = useState({ sesiune: 'Vara' as 'Vara' | 'Iarna', data: new Date().toISOString().split('T')[0], locatia: '' });
    const [loading, setLoading] = useState(false);
    
    React.useEffect(() => {
        if (isOpen) {
            if (examenToEdit) {
                setFormState({ sesiune: examenToEdit.sesiune, data: examenToEdit.data, locatia: examenToEdit.locatia });
            } else {
                setFormState({ sesiune: 'Vara', data: new Date().toISOString().split('T')[0], locatia: '' });
            }
        }
    }, [examenToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormState(p => ({ ...p, [e.target.name]: e.target.value as any }));
    const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); await onSave({ ...formState }); setLoading(false); onClose(); };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={examenToEdit ? "Editează Sesiune Examen" : "Creează Sesiune Examen"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select label="Sesiune" name="sesiune" value={formState.sesiune} onChange={handleChange}><option value="Vara">Vara</option><option value="Iarna">Iarna</option></Select>
                    <Input label="Data" name="data" type="date" value={formState.data} onChange={handleChange} required />
                    <Input label="Locația" name="locatia" value={formState.locatia} onChange={handleChange} required />
                </div>
                <div className="flex justify-end pt-4 space-x-2"><Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button><Button variant="success" type="submit" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button></div>
            </form>
        </Modal>
    );
};

const calculateMedia = (participare: Partial<Participare>): number | null => {
    const note = [participare.nota_tehnica, participare.nota_doc_luyen, participare.nota_song_doi, participare.nota_thao_quyen].filter(n => typeof n === 'number' && !isNaN(n)) as number[];
    if (note.length === 0) return null;
    const suma = note.reduce((acc, n) => acc + n, 0);
    return parseFloat((suma / note.length).toFixed(2));
};

const ExamenDetail: React.FC<{ examen: Examen; participari: Participare[]; setParticipari: React.Dispatch<React.SetStateAction<Participare[]>>; sportivi: Sportiv[]; grade: Grad[]; onBack: () => void; }> = ({ examen, participari, setParticipari, sportivi, grade, onBack }) => {
    const [viewMode, setViewMode] = useState<'note' | 'admin'>('note');
    const [sportivIdToAdd, setSportivIdToAdd] = useState('');
    const [participantToDelete, setParticipantToDelete] = useState<Participare | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const { showError } = useError();

    const handleAddParticipant = async () => {
        if (!sportivIdToAdd || !supabase) return;
        const sportiv = sportivi.find(s => s.id === sportivIdToAdd);
        if(!sportiv) return;

        const { data, error } = await supabase.from('participari').insert({ examen_id: examen.id, sportiv_id: sportivIdToAdd, grad_sustinut_id: grade[0].id, rezultat: 'Neprezentat' }).select().single();
        if (error) { showError("Eroare la adăugare", error); } 
        else if (data) { setParticipari(prev => [...prev, data as Participare]); setSportivIdToAdd(''); }
    };
    
    const handleUpdateParticipare = async (id: string, updates: Partial<Participare>) => {
        if (!supabase) return;
        let finalUpdates = { ...updates };
        const original = participari.find(p => p.id === id);
        if(!original) return;

        if (Object.keys(updates).some(k => k.startsWith('nota_'))) {
            const potentialNew = { ...original, ...updates };
            finalUpdates.media = calculateMedia(potentialNew);
        }
        
        setParticipari(prev => prev.map(p => p.id === id ? { ...p, ...finalUpdates } : p));
        
        const { error } = await supabase.from('participari').update(finalUpdates).eq('id', id);
        if (error) { showError("Eroare la salvare", error); setParticipari(prev => prev.map(p => p.id === id ? original : p));}
    };
    
    const handleBulkImport = async (dataToImport: Omit<Participare, 'id'>[]) => {
        if (!supabase) return;
        const { data, error } = await supabase.from('participari').upsert(dataToImport, { onConflict: 'examen_id, sportiv_id' }).select();
        
        if (error) {
            showError("Eroare la importul masiv", error);
        } else if (data) {
            const importedIds = new Set(data.map(d => d.sportiv_id));
            const updatedParticipari = participari.filter(p => !importedIds.has(p.sportiv_id));
            setParticipari([...updatedParticipari, ...data as Participare[]]);
        }
    };

    const handleDeleteParticipant = async () => {
        if (!participantToDelete || !supabase) return;
        setDeleteLoading(true);
        const { error } = await supabase.from('participari').delete().eq('id', participantToDelete.id);
        if (error) showError("Eroare la ștergere", error);
        else setParticipari(prev => prev.filter(pa => pa.id !== participantToDelete.id));
        setDeleteLoading(false);
        setParticipantToDelete(null);
    };

    const sportiviNeinscrisi = sportivi.filter(s => s.status === 'Activ' && !participari.some(p => p.sportiv_id === s.id));

    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Sesiuni</Button>
            <Card>
                <h2 className="text-3xl font-bold text-white">Sesiune Examen {examen.sesiune} {new Date(examen.data).getFullYear()}</h2>
                <p className="text-slate-400">{new Date(examen.data).toLocaleDateString('ro-RO')} - {examen.locatia}</p>

                <div className="my-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                    <h3 className="text-lg font-semibold mb-2">Adaugă Participanți</h3>
                    <div className="flex gap-2 items-end">
                        <div className="flex-grow"><Select label="" value={sportivIdToAdd} onChange={e => setSportivIdToAdd(e.target.value)}><option value="">Selectează...</option>{sportiviNeinscrisi.map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>)}</Select></div>
                        <Button onClick={handleAddParticipant} disabled={!sportivIdToAdd}><PlusIcon className="w-5 h-5 mr-2"/>Adaugă</Button>
                         <Button variant="secondary" onClick={() => setIsImportModalOpen(true)}>Importă Date</Button>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><UsersIcon className="w-6 h-6"/> Participanți ({participari.length})</h3>
                    <div className="flex items-center p-1 bg-slate-700 rounded-lg">
                        <Button size="sm" variant={viewMode === 'note' ? 'primary' : 'secondary'} onClick={() => setViewMode('note')} className={viewMode === 'note' ? 'shadow-lg' : 'bg-transparent shadow-none'}>Vedere Note</Button>
                        <Button size="sm" variant={viewMode === 'admin' ? 'primary' : 'secondary'} onClick={() => setViewMode('admin')} className={viewMode === 'admin' ? 'shadow-lg' : 'bg-transparent shadow-none'}>Vedere Admin</Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {viewMode === 'note' ? (
                        <table className="w-full text-left min-w-[900px]">
                           <thead className="bg-slate-700/50 text-xs uppercase">
                                <tr>
                                    {['#', 'Nume Sportiv', 'Club', 'Grad Susținut', 'Tehnică', 'Doc Luyen', 'Song Doi', 'Thao Quyen', 'Media'].map(h => <th key={h} className="p-3 font-semibold">{h}</th>)}
                                </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-700">
                               {participari.map((p, idx) => {
                                   const sportiv = sportivi.find(s => s.id === p.sportiv_id);
                                   return (
                                   <tr key={p.id} className="hover:bg-slate-700/30">
                                       <td className="p-2">{idx+1}</td>
                                       <td className="p-2 font-bold">{sportiv?.nume} {sportiv?.prenume}</td>
                                       <td className="p-2 text-sm">{sportiv?.club_provenienta}</td>
                                       <td className="p-2 w-48"><Select label="" value={p.grad_sustinut_id} className="text-sm" onBlur={e => handleUpdateParticipare(p.id, { grad_sustinut_id: e.target.value })} onChange={e => setParticipari(prev => prev.map(pa => pa.id === p.id ? {...pa, grad_sustinut_id: e.target.value} : pa))}>{grade.map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}</Select></td>
                                       {['nota_tehnica', 'nota_doc_luyen', 'nota_song_doi', 'nota_thao_quyen'].map(notaKey => (
                                           <td key={notaKey} className="p-2 w-24"><Input label="" type="number" step="0.01" min="0" max="10" defaultValue={p[notaKey as keyof Participare] as number || ''} onBlur={e => handleUpdateParticipare(p.id, { [notaKey]: e.target.value ? parseFloat(e.target.value) : null })} className="text-center"/></td>
                                       ))}
                                       <td className="p-2 font-bold text-brand-secondary text-center">{p.media?.toFixed(2)}</td>
                                   </tr>
                                   );
                               })}
                           </tbody>
                        </table>
                    ) : (
                         <table className="w-full text-left min-w-[800px]">
                           <thead className="bg-slate-700/50 text-xs uppercase">
                                <tr>
                                    {['#', 'Nume Sportiv', 'Grad Susținut', 'Rezultat', 'Contribuție (RON)', 'Observații', ''].map(h => <th key={h} className="p-3 font-semibold">{h}</th>)}
                                </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-700">
                               {participari.map((p, idx) => {
                                   const sportiv = sportivi.find(s => s.id === p.sportiv_id);
                                   return (
                                   <tr key={p.id} className="hover:bg-slate-700/30">
                                       <td className="p-2">{idx+1}</td>
                                       <td className="p-2 font-bold">{sportiv?.nume} {sportiv?.prenume}</td>
                                       <td className="p-2 text-sm">{grade.find(g => g.id === p.grad_sustinut_id)?.nume}</td>
                                       <td className="p-2 w-40"><Select label="" value={p.rezultat} onBlur={e => handleUpdateParticipare(p.id, { rezultat: e.target.value as any })} onChange={e => setParticipari(prev => prev.map(pa => pa.id === p.id ? {...pa, rezultat: e.target.value as any} : pa))}><option>Admis</option><option>Respins</option><option>Neprezentat</option></Select></td>
                                       <td className="p-2 w-32"><Input label="" type="number" step="1" min="0" defaultValue={p.contributie || ''} onBlur={e => handleUpdateParticipare(p.id, { contributie: e.target.value ? parseInt(e.target.value) : null })} /></td>
                                       <td className="p-2"><Input label="" defaultValue={p.observatii || ''} onBlur={e => handleUpdateParticipare(p.id, { observatii: e.target.value })} /></td>
                                       <td className="p-2 text-right"><Button variant="danger" size="sm" onClick={() => setParticipantToDelete(p)}><TrashIcon /></Button></td>
                                   </tr>
                                   );
                               })}
                           </tbody>
                        </table>
                    )}
                </div>
            </Card>
             <ConfirmationModal
                isOpen={!!participantToDelete}
                onClose={() => setParticipantToDelete(null)}
                onConfirm={handleDeleteParticipant}
                title="Confirmare Ștergere Participant"
                message="Sunteți sigur că doriți să ștergeți această înregistrare? Această acțiune este ireversibilă."
                loading={deleteLoading}
            />
             <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImportConfirm={handleBulkImport}
                sportivi={sportivi}
                grade={grade}
                examenId={examen.id}
                sportiviNeinscrisi={sportiviNeinscrisi}
            />
        </div>
    );
};

export const ExameneManagement: React.FC<{ onBack: () => void; examene: Examen[]; setExamene: React.Dispatch<React.SetStateAction<Examen[]>>; participari: Participare[]; setParticipari: React.Dispatch<React.SetStateAction<Participare[]>>; sportivi: Sportiv[]; grade: Grad[]; }> = ({ onBack, examene, setExamene, participari, setParticipari, sportivi, grade }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [examenToEdit, setExamenToEdit] = useState<Examen | null>(null);
  const [selectedExamen, setSelectedExamen] = useState<Examen | null>(null);
  const [examenToDelete, setExamenToDelete] = useState<Examen | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { showError } = useError();
  
  const handleSaveExamen = async (examenData: Omit<Examen, 'id'>) => {
    if (!supabase) return;
    if (examenToEdit) {
        const { data, error } = await supabase.from('examene').update(examenData).eq('id', examenToEdit.id).select().single();
        if (error) { showError("Eroare la actualizare", error); }
        else if (data) { setExamene(prev => prev.map(e => e.id === examenToEdit.id ? data as Examen : e)); }
    } else {
        const { data, error } = await supabase.from('examene').insert(examenData).select().single();
        if (error) { showError("Eroare la adăugare", error); }
        else if (data) { setExamene(prev => [...prev, data as Examen]); }
    }
  };

  const handleDelete = async () => {
    if (!supabase || !examenToDelete) return;

    setDeleteLoading(true);
    const examenId = examenToDelete.id;
    
    const { error: participariError } = await supabase.from('participari').delete().eq('examen_id', examenId);
    if(participariError) { showError("Eroare la ștergerea participarilor", participariError); setDeleteLoading(false); return; }
    
    const { error: examenError } = await supabase.from('examene').delete().eq('id', examenId);
    if(examenError) { showError("Eroare la ștergerea examenului", examenError); setDeleteLoading(false); return; }
    
    setParticipari(prev => prev.filter(p => p.examen_id !== examenId));
    setExamene(prev => prev.filter(e => e.id !== examenId));
    if (selectedExamen?.id === examenId) setSelectedExamen(null);
    setDeleteLoading(false);
    setExamenToDelete(null);
  };

  if(selectedExamen) { return <ExamenDetail examen={selectedExamen} participari={participari.filter(p => p.examen_id === selectedExamen.id)} setParticipari={setParticipari} sportivi={sportivi} grade={grade} onBack={() => setSelectedExamen(null)} />; }
  
  const sortedExamene = [...examene].sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return ( 
    <div>
      <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Management Sesiuni Examen</h1>
        <Button onClick={() => { setExamenToEdit(null); setIsFormOpen(true); }} style={{backgroundColor: '#3D3D99'}} className="hover:bg-blue-800"><PlusIcon className="w-5 h-5 mr-2" />Sesiune Nouă</Button>
      </div>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-700/50"><tr><th className="p-4 font-semibold">Sesiune</th><th className="p-4 font-semibold">Data</th><th className="p-4 font-semibold">Locația</th><th className="p-4 font-semibold">Participanți</th><th className="p-4 font-semibold text-right">Acțiuni</th></tr></thead>
            <tbody className="divide-y divide-slate-700">
              {sortedExamene.map(examen => ( 
                <tr key={examen.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="p-4 font-bold cursor-pointer" onClick={() => setSelectedExamen(examen)}>{examen.sesiune} {new Date(examen.data).getFullYear()}</td>
                  <td className="p-4 cursor-pointer" onClick={() => setSelectedExamen(examen)}>{new Date(examen.data).toLocaleDateString('ro-RO')}</td>
                  <td className="p-4 text-slate-300 cursor-pointer" onClick={() => setSelectedExamen(examen)}>{examen.locatia}</td>
                  <td className="p-4 font-semibold text-brand-secondary">{participari.filter(p => p.examen_id === examen.id).length}</td>
                  <td className="p-4 text-right w-32"><div className="flex justify-end gap-2"><Button onClick={() => {setExamenToEdit(examen); setIsFormOpen(true);}} variant="primary" size="sm"><EditIcon /></Button><Button onClick={() => setExamenToDelete(examen)} variant="danger" size="sm"><TrashIcon /></Button></div></td>
                </tr> 
              ))}
            </tbody>
          </table>
          {sortedExamene.length === 0 && <p className="p-8 text-center text-slate-400">Nicio sesiune de examen creată.</p>}
        </div>
      </Card>
      <ExamenFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSaveExamen} examenToEdit={examenToEdit} />
      <ConfirmationModal
        isOpen={!!examenToDelete}
        onClose={() => setExamenToDelete(null)}
        onConfirm={handleDelete}
        title="Confirmare Ștergere Sesiune"
        message="Atenție! Veți șterge sesiunea și TOATE rezultatele asociate. Sunteți sigur că doriți să continuați? Această acțiune este ireversibilă."
        loading={deleteLoading}
      />
    </div> 
  );
};