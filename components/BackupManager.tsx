import React, { useState, useMemo } from 'react';
import { Button, Card, Modal, Input } from './ui';
import { ArrowLeftIcon, ShieldCheckIcon, CogIcon, EditIcon, DocumentArrowDownIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { Sportiv, Grad, PretConfig, InscriereExamen, Examen, Plata, View, Familie, User } from '../types';
import { BirthDateInput } from './BirthDateInput';
import { getPretProdus } from '../utils/pricing';
import { DataIntegrityCheck } from './DataIntegrityCheck';

const TABLES_TO_MANAGE = ['roluri', 'grade', 'familii', 'grupe', 'tipuri_abonament', 'examene', 'evenimente', 'preturi_config', 'grade_preturi_config', 'reduceri', 'sportivi', 'program_antrenamente', 'sportivi_roluri', 'inscrieri_examene', 'rezultate', 'plati', 'prezenta_antrenament', 'anunturi_prezenta', 'tranzactii', 'notificari'];

// --- Sub-componente ---
const QuickEditModal: React.FC<{
    sportiv: Sportiv | null;
    onClose: () => void;
    onSave: (id: string, updates: Partial<Sportiv>) => Promise<void>;
}> = ({ sportiv, onClose, onSave }) => {
    const [formData, setFormData] = useState({ data_nasterii: sportiv?.data_nasterii || '', cnp: sportiv?.cnp || '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sportiv) return;
        setLoading(true);
        await onSave(sportiv.id, { data_nasterii: formData.data_nasterii, cnp: formData.cnp });
        setLoading(false);
        onClose();
    };

    if (!sportiv) return null;

    return (
        <Modal isOpen={!!sportiv} onClose={onClose} title={`Editare Rapidă: ${sportiv.nume} ${sportiv.prenume}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <BirthDateInput label="Data Nașterii" value={formData.data_nasterii} onChange={(v) => setFormData(p => ({ ...p, data_nasterii: v }))} required />
                <Input label="CNP" name="cnp" value={formData.cnp} onChange={e => setFormData(p => ({ ...p, cnp: e.target.value }))} required maxLength={13} />
                <div className="flex justify-end pt-4 space-x-2 border-t border-slate-700">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button type="submit" variant="success" isLoading={loading}>Salvează</Button>
                </div>
            </form>
        </Modal>
    );
};


// --- Componenta Principală ---
interface DataMaintenanceProps {
    onBack: () => void;
    onDataRestored: () => void;
    sportivi: Sportiv[];
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    grade: Grad[];
    preturiConfig: PretConfig[];
    participari: InscriereExamen[];
    examene: Examen[];
    plati: Plata[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    familii: Familie[];
    onNavigate: (view: View) => void;
    currentUser: User;
}

export const DataMaintenancePage: React.FC<DataMaintenanceProps> = ({ onBack, onDataRestored, sportivi, setSportivi, grade, preturiConfig, participari, examene, plati, setPlati, familii, onNavigate, currentUser }) => {
    const { showError, showSuccess } = useError();
    const [progressMessage, setProgressMessage] = useState('');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    
    // --- State & Memo pentru Audit ---
    const [editingSportiv, setEditingSportiv] = useState<Sportiv | null>(null);

    // --- Handlers ---
    const handleQuickSave = async (id: string, updates: Partial<Sportiv>) => {
        const { data, error } = await supabase.from('sportivi').update(updates).eq('id', id).select().single();
        if (error) showError("Eroare la salvare", error);
        else if (data) { setSportivi(p => p.map(s => s.id === id ? { ...s, ...data } : s)); showSuccess("Succes", "Datele au fost actualizate."); }
    };

    // --- Export, Backup & Restore Logic ---
     const handleExportData = async () => {
        if (!supabase) { showError("Eroare Configurare", "Clientul Supabase nu este inițializat."); return; }

        const tablesToExport = ['sportivi', 'plati', 'inscrieri_examene', 'examene', 'grade', 'grupe', 'familii'];
        
        setLoading(p => ({ ...p, exporting: true }));
        setProgressMessage('Se exportă datele...');
        
        try {
            const exportData: { [key: string]: any[] } = {};
            const promises = tablesToExport.map(async (table) => {
                setProgressMessage(`Se extrage: ${table}...`);
                const { data, error } = await supabase.from(table).select('*');
                if (error) throw new Error(`Eroare la '${table}': ${error.message}`);
                exportData[table] = data || [];
            });

            await Promise.all(promises);

            setProgressMessage('Se generează fișierul...');
            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            a.href = url;
            a.download = `export-phihau-${timestamp}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showSuccess("Export Finalizat", "Fișierul JSON a fost descărcat.");

        } catch (err: any) {
            showError("Eroare la Export", err.message);
        } finally {
            setLoading(p => ({ ...p, exporting: false }));
            setProgressMessage('');
        }
    };

    const handleGenerateBackup = async () => {
        if (!supabase) {
            showError("Eroare Configurare", "Clientul Supabase nu este inițializat.");
            return;
        }
        setLoading(p => ({ ...p, backingUp: true }));
        setProgressMessage('Se colectează datele...');

        try {
            const backupData: { [key: string]: any[] } = {};
            
            for (const table of TABLES_TO_MANAGE) {
                setProgressMessage(`Se extrage tabelul: ${table}...`);
                const { data, error } = await supabase.from(table).select('*');
                if (error) {
                    throw new Error(`Eroare la extragerea datelor din '${table}': ${error.message}`);
                }
                backupData[table] = data || [];
            }
            
            setProgressMessage('Se generează fișierul...');
            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            a.href = url;
            a.download = `backup-phihau-complet-${timestamp}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showSuccess("Backup Generat", "Fișierul de backup complet a fost descărcat cu succes.");

        } catch (err: any) {
            showError("Eroare la Generare Backup", err.message);
        } finally {
            setLoading(p => ({ ...p, backingUp: false }));
            setProgressMessage('');
        }
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!window.confirm(`ATENȚIE!\n\nSunteți pe cale să restaurați datele din fișierul "${file.name}".\n\nAceastă acțiune este IREVERSIBILĂ și va ȘTERGE TOATE datele curente din tabelele manageriate, înlocuindu-le cu cele din fișierul de backup.\n\nSunteți absolut sigur că doriți să continuați?`)) {
            event.target.value = ''; // Reset file input
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("Fișierul nu a putut fi citit.");
                const backupData = JSON.parse(text);
                await processRestore(backupData);
            } catch (err: any) {
                showError("Eroare la Restaurare", `Fișierul de backup este invalid sau corupt. ${err.message}`);
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };
    
    const processRestore = async (backupData: { [key: string]: any[] }) => {
        if (!supabase) return;
        setLoading(p => ({ ...p, restoring: true }));
        setProgressMessage('Se pregătește restaurarea...');

        const deletionOrder = ['tranzactii', 'anunturi_prezenta', 'prezenta_antrenament', 'rezultate', 'inscrieri_examene', 'plati', 'sportivi_roluri', 'program_antrenamente', 'sportivi', 'grade_preturi_config', 'preturi_config', 'examene', 'evenimente', 'grupe', 'familii', 'tipuri_abonament', 'reduceri', 'grade', 'roluri', 'notificari'];
        const insertionOrder = [...deletionOrder].reverse();

        try {
            const backupTables = Object.keys(backupData);
            
            for (const table of deletionOrder) {
                if (backupTables.includes(table)) {
                    setProgressMessage(`Se șterg datele vechi din: ${table}...`);
                    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Workaround to delete all
                    if (error) throw new Error(`Eroare la ștergerea datelor din '${table}': ${error.message}`);
                }
            }

            for (const table of insertionOrder) {
                const dataToInsert = backupData[table];
                if (dataToInsert && dataToInsert.length > 0) {
                    setProgressMessage(`Se inserează date noi în: ${table}...`);
                    const { error } = await supabase.from(table).insert(dataToInsert);
                    if (error) throw new Error(`Eroare la inserarea datelor în '${table}': ${error.message}`);
                }
            }

            showSuccess("Restaurare Completă", "Datele au fost restaurate. Aplicația se va reîncărca.");
            setTimeout(() => onDataRestored(), 2000);

        } catch (err: any) {
            showError("Restaurare Eșuată", err.message);
        } finally {
            setLoading(p => ({ ...p, restoring: false }));
            setProgressMessage('');
        }
    };

    return (
        <div className="space-y-8">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            <h1 className="text-3xl font-bold text-white">Mentenanță & Administrare Sistem</h1>
            {feedback && <div className={`p-3 rounded-md text-center font-semibold text-white ${feedback.type === 'success' ? 'bg-green-600/50' : 'bg-red-600/50'}`}>{feedback.message}</div>}

            <DataIntegrityCheck sportivi={sportivi} currentUser={currentUser} onEditSportiv={setEditingSportiv} />
            
            <Card className="border-l-4 border-brand-primary">
                <h2 className="text-2xl font-bold text-white mb-4">Backup, Export & Restaurare Date</h2>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <h3 className="font-semibold text-white">Export Date Principale</h3>
                        <p className="text-slate-400 mb-4 text-sm">Descarcă un fișier JSON cu datele esențiale: sportivi, plăți, examene etc. Util pentru analize externe.</p>
                        <Button variant="info" className="w-full" onClick={handleExportData} isLoading={loading['exporting']}>
                            <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                            {loading['exporting'] ? progressMessage : 'Exportă Date (.json)'}
                        </Button>
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Backup Complet Sistem</h3>
                        <p className="text-slate-400 mb-4 text-sm">Generează o copie completă a tuturor tabelelor din sistem. Folosit pentru restaurare completă.</p>
                        <Button variant="primary" className="w-full" onClick={handleGenerateBackup} isLoading={loading['backingUp']}>
                            {loading['backingUp'] ? progressMessage : 'Generare Backup Complet'}
                        </Button>
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Restaurare din Backup</h3>
                        <p className="text-slate-400 mb-4 text-sm"><strong className="text-amber-400">Atenție:</strong> Acțiune ireversibilă ce suprascrie TOATE datele.</p>
                        <div className="relative">
                            <Button as="label" htmlFor="restore-file-input" variant="danger" className="w-full cursor-pointer" isLoading={loading['restoring']}>
                                {loading['restoring'] ? progressMessage : 'Încarcă Fișier de Backup'}
                            </Button>
                            <input id="restore-file-input" type="file" className="hidden" accept=".json" onChange={handleFileChange} disabled={loading['restoring'] || loading['backingUp']} />
                        </div>
                    </div>
                </div>
            </Card>

            <QuickEditModal sportiv={editingSportiv} onClose={() => setEditingSportiv(null)} onSave={handleQuickSave} />
        </div>
    );
};

export { DataMaintenancePage as BackupManager };