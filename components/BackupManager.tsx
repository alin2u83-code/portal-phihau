import React, { useState } from 'react';
import { Button, Card } from './ui';
import { ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

// Lista tabelelor pentru backup/restaurare, în ordine dependency-urilor pentru a asigura o restaurare corectă
const TABLES_TO_MANAGE = [
    // Tabele independente/de bază
    'roluri', 'grade', 'familii', 'grupe', 'tipuri_abonament', 'examene',
    // Tabele dependente
    'sportivi', 
    // Tabele de legătură sau cu dependențe multiple
    'sportivi_roluri', 'program_antrenamente', 'plati', 'participari'
];

interface BackupManagerProps {
    onBack: () => void;
    onDataRestored: () => void; // Callback pentru a reîncărca datele în App.tsx
}

export const BackupManager: React.FC<BackupManagerProps> = ({ onBack, onDataRestored }) => {
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const { showError } = useError();

    const showFeedback = (type: 'success' | 'error', message: string) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 6000);
    };

    const handleGenerateBackup = async () => {
        if (!supabase) {
            showError("Eroare Configurare", "Clientul Supabase nu este configurat.");
            return;
        }
        setIsBackingUp(true);
        setProgressMessage('Se colectează datele...');
        
        try {
            const backupData: { [key: string]: any[] } = {};
            
            const promises = TABLES_TO_MANAGE.map(table => supabase.from(table).select('*'));
            const results = await Promise.all(promises);

            results.forEach((result, index) => {
                const tableName = TABLES_TO_MANAGE[index];
                if (result.error) {
                    throw new Error(`Eroare la extragerea datelor din '${tableName}': ${result.error.message}`);
                }
                backupData[tableName] = result.data;
            });
            
            setProgressMessage('Se generează fișierul...');
            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-');
            a.download = `Backup_PhiHau_${timestamp}.json`;
            a.href = url;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showFeedback('success', 'Backup-ul a fost generat și descărcat cu succes!');
        } catch (err: any) {
            showError("Eroare la generare Backup", err);
        } finally {
            setIsBackingUp(false);
            setProgressMessage('');
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result;
                if (typeof content !== 'string') throw new Error("Fișierul este invalid sau corupt.");
                
                const backupData = JSON.parse(content);

                const confirmation = window.prompt(
                    "ATENȚIE!\n\nSunteți pe cale să suprascrieți datele existente cu cele din fișierul de backup. Înregistrările noi vor fi adăugate, iar cele existente vor fi actualizate. Această acțiune nu poate fi anulată.\n\nPentru a confirma, scrieți 'RESTAUREAZA' în câmpul de mai jos și apăsați OK."
                );

                if (confirmation !== 'RESTAUREAZA') {
                    showFeedback('error', 'Restaurarea a fost anulată.');
                    return;
                }
                await processRestore(backupData);
            } catch (err: any) {
                showError("Eroare la procesare fișier", "Fișierul nu este un JSON valid sau este corupt.");
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Resetează input-ul pentru a permite re-selectarea aceluiași fișier
    };

    const processRestore = async (backupData: { [key: string]: any[] }) => {
        if (!supabase) {
            showError("Eroare Configurare", "Clientul Supabase nu este configurat.");
            return;
        }

        setIsRestoring(true);
        try {
            // Inserează/Actualizează datele în ordinea corectă a dependențelor
            for (const tableName of TABLES_TO_MANAGE) {
                if (backupData[tableName] && backupData[tableName].length > 0) {
                    setProgressMessage(`Se actualizează '${tableName}' (${backupData[tableName].length} înregistrări)...`);
                    
                    let dataToUpsert = backupData[tableName];

                    // Mapare specială pentru 'sportivi'
                    if (tableName === 'sportivi') {
                        dataToUpsert = dataToUpsert.map((sportiv: any) => {
                            const newSportiv = { ...sportiv };
                            if ('auth_user_id' in newSportiv) {
                                newSportiv.user_id = newSportiv.auth_user_id;
                                delete newSportiv.auth_user_id;
                            }
                            return newSportiv;
                        });
                    }

                    // Împarte în bucăți pentru a evita limitele Supabase
                    const CHUNK_SIZE = 500;
                    for (let i = 0; i < dataToUpsert.length; i += CHUNK_SIZE) {
                        const chunk = dataToUpsert.slice(i, i + CHUNK_SIZE);
                        const { error } = await supabase.from(tableName).upsert(chunk);
                        if (error) {
                             if (tableName === 'sportivi' && error.message.includes("violates foreign key constraint") && error.message.includes("user_id")) {
                                throw new Error(`Eroare la upsert pentru '${tableName}': ${error.message}. Asigurați-vă că user_id (mappat din auth_user_id) există în tabelul auth.users.`);
                            }
                            throw new Error(`Eroare la upsert pentru '${tableName}': ${error.message}`);
                        }
                    }
                }
            }
            
            showFeedback('success', 'Restaurarea s-a finalizat cu succes! Datele vor fi reîncărcate.');
            onDataRestored(); // Reîncarcă datele în componenta App
        } catch (err: any) {
             showError("Eroare la Restaurare", err);
        } finally {
            setIsRestoring(false);
            setProgressMessage('');
        }
    };


    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Configurări</Button>
            
            <header className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white">Club Sportiv Phi Hau Iasi - Administrare Sistem</h1>
                <p className="text-slate-400">Modul de Mentenanță a Datelor</p>
            </header>

            {feedback && (
                <div className={`p-3 rounded-md mb-6 text-center font-semibold text-white ${feedback.type === 'success' ? 'bg-green-600/50' : 'bg-red-600/50'}`}>
                    {feedback.message}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <Card className="border-brand-primary border-l-4">
                    <h2 className="text-2xl font-bold text-white mb-4">Backup Date</h2>
                    <p className="text-slate-400 mb-6">Generează un fișier JSON cu o copie a datelor principale ale clubului. Păstrați acest fișier într-un loc sigur.</p>
                    <Button 
                        variant="primary" 
                        size="md" 
                        className="w-full !py-3 text-lg"
                        onClick={handleGenerateBackup}
                        isLoading={isBackingUp}
                    >
                        {isBackingUp ? progressMessage : 'Generare Backup Complet'}
                    </Button>
                </Card>

                <Card className="border-red-600 border-l-4">
                    <h2 className="text-2xl font-bold text-white mb-4">Restaurare din Backup</h2>
                    <p className="text-slate-400 mb-6">
                        <strong className="text-amber-400">Atenție:</strong> Acțiunea va actualiza datele existente și va adăuga datele noi din fișier. Este ireversibilă.
                    </p>
                    <div className="relative">
                        <Button 
                            as="label" 
                            htmlFor="restore-file-input"
                            variant="danger" 
                            size="md" 
                            className="w-full !py-3 text-lg cursor-pointer"
                            isLoading={isRestoring}
                        >
                             {isRestoring ? progressMessage : 'Încarcă Fișier de Restaurare'}
                        </Button>
                         <input 
                            id="restore-file-input"
                            type="file" 
                            className="hidden"
                            accept=".json"
                            onChange={handleFileChange}
                            disabled={isRestoring || isBackingUp}
                         />
                    </div>
                </Card>
            </div>
        </div>
    );
};