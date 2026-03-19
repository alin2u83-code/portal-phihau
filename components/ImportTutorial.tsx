import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';
import { Grad } from '../types';
import {
    ArrowLeftIcon,
    DocumentArrowDownIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XCircleIcon,
    BookOpenIcon,
} from './icons';
import { Button, Card } from './ui';
import { useError } from './ErrorProvider';

interface ImportTutorialProps {
    onBack: () => void;
}

interface StepProps {
    number: number;
    title: string;
    children: React.ReactNode;
}

const Step: React.FC<StepProps> = ({ number, title, children }) => (
    <div className="flex gap-4">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold text-sm">
            {number}
        </div>
        <div className="flex-1 pb-8 border-b border-slate-700 last:border-b-0 last:pb-0">
            <h3 className="text-lg font-bold text-white mb-3">{title}</h3>
            <div className="text-slate-300 space-y-2 text-sm leading-relaxed">{children}</div>
        </div>
    </div>
);

interface CollapsibleSectionProps {
    title: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, defaultOpen = false, children }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border border-slate-700 rounded-lg overflow-hidden">
            <button
                onClick={() => setIsOpen(v => !v)}
                className="w-full flex justify-between items-center p-4 bg-slate-800 hover:bg-slate-700 transition-colors text-left"
            >
                <span className="font-semibold text-white">{title}</span>
                {isOpen ? <ChevronUpIcon className="w-5 h-5 text-slate-400" /> : <ChevronDownIcon className="w-5 h-5 text-slate-400" />}
            </button>
            {isOpen && <div className="p-4 bg-slate-900">{children}</div>}
        </div>
    );
};

const downloadCsv = (filename: string, rows: object[]) => {
    const csv = Papa.unparse(rows);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const ImportTutorial: React.FC<ImportTutorialProps> = ({ onBack }) => {
    const [grades, setGrades] = useState<Grad[]>([]);
    const [loadingGrades, setLoadingGrades] = useState(true);
    const { showError } = useError();

    useEffect(() => {
        const fetchGrades = async () => {
            setLoadingGrades(true);
            const { data, error } = await supabase.from('grade').select('*').order('ordine');
            if (error) {
                showError('Eroare la preluare grade', error.message);
            } else {
                setGrades(data || []);
            }
            setLoadingGrades(false);
        };
        fetchGrades();
    }, [showError]);

    const exampleExamRows = [
        { Nume: 'Popescu', Prenume: 'Ion', CNP: '1800101123456', Grad_Nou_Ordine: '2', Rezultat: 'Admis', Contributie: '100', Data_Examen: '2026-02-15', Sesiune_Denumire: 'Examen Iarna 2026', Localitate: 'Iași' },
        { Nume: 'Ionescu', Prenume: 'Maria', CNP: '', Grad_Nou_Ordine: '1', Rezultat: 'Admis', Contributie: '100', Data_Examen: '2026-02-15', Sesiune_Denumire: 'Examen Iarna 2026', Localitate: 'Iași' },
        { Nume: 'Georgescu', Prenume: 'Andrei', CNP: '1900505654321', Grad_Nou_Ordine: '3', Rezultat: 'Respins', Contributie: '100', Data_Examen: '2026-02-15', Sesiune_Denumire: 'Examen Iarna 2026', Localitate: 'Iași' },
    ];

    const exampleBirthdateRows = [
        { Nume: 'Popescu', Prenume: 'Ion', Data_Nasterii: '2010-05-20' },
        { Nume: 'Ionescu', Prenume: 'Maria', Data_Nasterii: '2012-11-03' },
        { Nume: 'Georgescu', Prenume: 'Andrei', Data_Nasterii: '2009-08-17' },
    ];

    const examColumns: { col: string; tip: string; obligatoriu: boolean; exemple: string; descriere: string }[] = [
        { col: 'Nume', tip: 'Text', obligatoriu: true, exemple: 'Popescu', descriere: 'Numele de familie al sportivului (fără diacritice sau cu diacritice).' },
        { col: 'Prenume', tip: 'Text', obligatoriu: true, exemple: 'Ion', descriere: 'Prenumele sportivului.' },
        { col: 'CNP', tip: 'Text (13 cifre)', obligatoriu: false, exemple: '1800101123456', descriere: 'CNP-ul pentru identificare exactă. Dacă este completat, sistemul îl va folosi în locul căutării după nume. Recomandat dar nu obligatoriu.' },
        { col: 'Grad_Nou_Ordine', tip: 'Număr întreg', obligatoriu: true, exemple: '2', descriere: 'Numărul de ordine al gradului nou obținut. Vezi tabelul de referință grade de mai jos.' },
        { col: 'Rezultat', tip: 'Enum fix', obligatoriu: true, exemple: 'Admis', descriere: 'Rezultatul examenului. Valori acceptate: "Admis", "Respins" sau "Neprezentat" (exact, cu majusculă).' },
        { col: 'Contributie', tip: 'Număr', obligatoriu: true, exemple: '100', descriere: 'Suma contribuției achitate în lei. Poate fi 0 dacă nu s-a achitat nimic.' },
        { col: 'Data_Examen', tip: 'Data YYYY-MM-DD', obligatoriu: true, exemple: '2026-02-15', descriere: 'Data la care a avut loc examenul, în format ISO (an-lună-zi).' },
        { col: 'Sesiune_Denumire', tip: 'Text', obligatoriu: true, exemple: 'Examen Iarna 2026', descriere: 'Denumirea sesiunii de examen. Dacă nu există, va fi creată automat.' },
        { col: 'Localitate', tip: 'Text', obligatoriu: true, exemple: 'Iași', descriere: 'Orașul sau locația unde s-a desfășurat examenul. Dacă nu există în baza de date, va fi creată automat.' },
    ];

    const birthdateColumns: { col: string; tip: string; obligatoriu: boolean; exemple: string }[] = [
        { col: 'Nume', tip: 'Text', obligatoriu: true, exemple: 'Popescu' },
        { col: 'Prenume', tip: 'Text', obligatoriu: true, exemple: 'Ion' },
        { col: 'Data_Nasterii', tip: 'Data YYYY-MM-DD', obligatoriu: true, exemple: '2010-05-20' },
    ];

    const commonErrors: { eroare: string; cauza: string; solutie: string }[] = [
        {
            eroare: 'Rând incomplet',
            cauza: 'Lipsesc una sau mai multe coloane obligatorii (Nume, Prenume, Grad_Nou_Ordine, Sesiune_Denumire, Data_Examen, Localitate).',
            solutie: 'Verificați că toate coloanele obligatorii au valori completate pentru fiecare rând.',
        },
        {
            eroare: 'Cod Grad invalid',
            cauza: 'Valoarea din coloana Grad_Nou_Ordine nu corespunde niciunui grad din sistem.',
            solutie: 'Consultați tabelul de referință grade de mai jos și folosiți numărul corect de ordine.',
        },
        {
            eroare: 'Rezultat invalid',
            cauza: 'Valoarea din coloana Rezultat nu este una dintre cele trei valori acceptate.',
            solutie: 'Folosiți exact "Admis", "Respins" sau "Neprezentat" (cu majusculă, fără spații suplimentare).',
        },
        {
            eroare: 'Data în format greșit',
            cauza: 'Data_Examen sau Data_Nasterii nu este în formatul YYYY-MM-DD.',
            solutie: 'Formatați datele ca an-lună-zi (ex: 2026-02-15). Dacă folosiți Excel, setați celula ca Text înainte de a introduce data.',
        },
        {
            eroare: 'Conflict: Potriviri nume găsite',
            cauza: 'Sistemul a găsit unul sau mai mulți sportivi cu nume similare dar nu a putut determina cu certitudine cine este.',
            solutie: 'Completați coloana CNP în fișierul CSV sau rezolvați conflictul manual în ecranul de previzualizare alegând sportivul corect din listă.',
        },
        {
            eroare: 'Sportiv apare de mai multe ori ca nou',
            cauza: 'Sportivul nu există în baza de date și nu are CNP completat.',
            solutie: 'Dacă sportivul există deja, completați CNP-ul. Altfel, va fi creat ca sportiv nou.',
        },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button onClick={onBack} variant="secondary">
                    <ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi
                </Button>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                        <BookOpenIcon className="w-8 h-8 text-brand-secondary" />
                        Ghid Import Bulk Examen
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Instrucțiuni pas cu pas pentru importul rezultatelor de examen din fișiere CSV.
                    </p>
                </div>
            </div>

            {/* Download templates */}
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-white">Descarcă modelele CSV</h2>
                        <p className="text-sm text-slate-400 mt-1">
                            Folosește aceste fișiere ca punct de pornire. Completează-le și importă-le în sistem.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => downloadCsv('model_import_bulk_examen.csv', exampleExamRows)}
                        >
                            <DocumentArrowDownIcon size={16} className="mr-2" />
                            Model Examen CSV
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => downloadCsv('model_date_nastere.csv', exampleBirthdateRows)}
                        >
                            <DocumentArrowDownIcon size={16} className="mr-2" />
                            Model Date Naștere CSV
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Step by step guide */}
            <Card>
                <h2 className="text-lg font-bold text-white mb-6">Pași de urmat</h2>
                <div className="space-y-6">
                    <Step number={1} title="Pregătește fișierul principal de examen">
                        <p>
                            Descarcă modelul CSV de mai sus sau creează un fișier nou cu exact aceste coloane în prima linie:
                        </p>
                        <div className="bg-slate-800 rounded p-3 font-mono text-xs text-green-300 overflow-x-auto mt-2">
                            Nume,Prenume,CNP,Grad_Nou_Ordine,Rezultat,Contributie,Data_Examen,Sesiune_Denumire,Localitate
                        </div>
                        <p className="text-slate-400 mt-2">
                            Fiecare rând de sub antet reprezintă un sportiv. Salvează fișierul în format <strong className="text-white">.csv</strong> cu encoding UTF-8.
                        </p>
                        <div className="flex items-start gap-2 mt-3 p-3 bg-amber-900/20 border border-amber-800 rounded-lg">
                            <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            <p className="text-amber-200 text-xs">
                                <strong>Atenție Excel:</strong> Dacă editezi fișierul în Excel, asigură-te că coloanele cu date (Data_Examen) sunt formatate ca <strong>Text</strong> înainte de a introduce valori, altfel Excel poate schimba formatul datei.
                            </p>
                        </div>
                    </Step>

                    <Step number={2} title="(Opțional) Pregătește fișierul cu date de naștere">
                        <p>
                            Dacă dorești o potrivire mai precisă a sportivilor (în special pentru cei fără CNP), pregătește un fișier separat cu datele de naștere:
                        </p>
                        <div className="bg-slate-800 rounded p-3 font-mono text-xs text-green-300 overflow-x-auto mt-2">
                            Nume,Prenume,Data_Nasterii
                        </div>
                        <p className="text-slate-400 mt-2">
                            Sistemul va folosi data nașterii împreună cu numele pentru a potrivi sportivii din baza de date, reducând conflictele.
                        </p>
                    </Step>

                    <Step number={3} title="Încarcă fișierele în modalul de import">
                        <p>
                            Din ecranul <strong className="text-white">Gestiune Sesiuni Examen</strong>, apasă butonul{' '}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-700 rounded text-xs text-white font-semibold">
                                Import Bulk Examen
                            </span>.
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-300">
                            <li>La <strong>Pasul 2a</strong>: încarcă fișierul principal de examen (obligatoriu).</li>
                            <li>La <strong>Pasul 2b</strong>: încarcă fișierul cu date de naștere (opțional, dar recomandat).</li>
                            <li>Apasă <strong>Procesează Fișierele</strong> și așteaptă finalizarea analizei.</li>
                        </ul>
                    </Step>

                    <Step number={4} title="Revizuiește previzualizarea și rezolvă conflictele">
                        <p>
                            Sistemul afișează un sumar cu numărul de rânduri găsite, noi sau cu conflicte. Revizuiește fiecare categorie:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                            <div className="flex items-start gap-2 p-2 bg-green-900/20 border border-green-800 rounded">
                                <CheckCircleIcon className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-green-300 text-xs font-bold">Găsiți (CNP/Exact)</p>
                                    <p className="text-xs text-slate-400">Sportivi identificați cu certitudine. Nicio acțiune necesară.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 p-2 bg-amber-900/20 border border-amber-800 rounded">
                                <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-amber-300 text-xs font-bold">Conflicte de Rezolvat</p>
                                    <p className="text-xs text-slate-400">Apasă "Rezolvă" și alege sportivul corect sau creează unul nou.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 p-2 bg-blue-900/20 border border-blue-800 rounded">
                                <CheckCircleIcon className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-blue-300 text-xs font-bold">Sportivi Noi</p>
                                    <p className="text-xs text-slate-400">Va fi creat un profil nou în baza de date.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 p-2 bg-red-900/20 border border-red-800 rounded">
                                <XCircleIcon className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-red-300 text-xs font-bold">Erori CSV</p>
                                    <p className="text-xs text-slate-400">Rânduri cu date invalide. Corectează fișierul și reimportă.</p>
                                </div>
                            </div>
                        </div>
                        <p className="text-slate-400 mt-3 text-xs">
                            <strong className="text-white">Important:</strong> Toate conflictele trebuie rezolvate înainte de a putea confirma importul.
                        </p>
                    </Step>

                    <Step number={5} title="Confirmă importul">
                        <p>
                            Odată ce nu mai există conflicte nerezolvate, butonul{' '}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-700 rounded text-xs text-white font-semibold">
                                Importă N Înregistrări
                            </span>{' '}
                            devine activ. Apasă-l pentru a trimite datele în baza de date.
                        </p>
                        <p className="text-slate-400 mt-2">
                            Sistemul va crea automat sesiunile și localitățile lipsă, va adăuga sportivii noi și va înregistra rezultatele examenului.
                        </p>
                        <div className="flex items-start gap-2 mt-3 p-3 bg-amber-900/20 border border-amber-800 rounded-lg">
                            <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            <p className="text-amber-200 text-xs">
                                Pagina se va reîmprospăta automat după import pentru a reflecta toate modificările. Nu închide fereastra în timpul procesării.
                            </p>
                        </div>
                    </Step>
                </div>
            </Card>

            {/* CSV Column Reference */}
            <CollapsibleSection title="Referință coloane fișier Examen (model_import_bulk_examen.csv)" defaultOpen={true}>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-slate-700">
                                <th className="text-left py-2 px-3 text-slate-400 font-semibold">Coloana</th>
                                <th className="text-left py-2 px-3 text-slate-400 font-semibold">Tip</th>
                                <th className="text-left py-2 px-3 text-slate-400 font-semibold">Obligatoriu</th>
                                <th className="text-left py-2 px-3 text-slate-400 font-semibold">Exemple</th>
                                <th className="text-left py-2 px-3 text-slate-400 font-semibold">Descriere</th>
                            </tr>
                        </thead>
                        <tbody>
                            {examColumns.map(col => (
                                <tr key={col.col} className="border-b border-slate-800 hover:bg-slate-800/50">
                                    <td className="py-2 px-3 font-mono text-brand-secondary font-bold">{col.col}</td>
                                    <td className="py-2 px-3 text-slate-300">{col.tip}</td>
                                    <td className="py-2 px-3">
                                        {col.obligatoriu ? (
                                            <span className="px-1.5 py-0.5 bg-red-900/40 border border-red-700 rounded text-red-300 text-xs">DA</span>
                                        ) : (
                                            <span className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400 text-xs">Recomandat</span>
                                        )}
                                    </td>
                                    <td className="py-2 px-3 font-mono text-green-300">{col.exemple}</td>
                                    <td className="py-2 px-3 text-slate-400">{col.descriere}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CollapsibleSection>

            {/* Birthdates CSV Reference */}
            <CollapsibleSection title="Referință coloane fișier Date Naștere (model_date_nastere.csv)">
                <p className="text-sm text-slate-400 mb-3">
                    Fișier opțional care îmbunătățește potrivirea sportivilor existenți în baza de date atunci când CNP-ul lipsește.
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-slate-700">
                                <th className="text-left py-2 px-3 text-slate-400 font-semibold">Coloana</th>
                                <th className="text-left py-2 px-3 text-slate-400 font-semibold">Tip</th>
                                <th className="text-left py-2 px-3 text-slate-400 font-semibold">Obligatoriu</th>
                                <th className="text-left py-2 px-3 text-slate-400 font-semibold">Exemple</th>
                            </tr>
                        </thead>
                        <tbody>
                            {birthdateColumns.map(col => (
                                <tr key={col.col} className="border-b border-slate-800 hover:bg-slate-800/50">
                                    <td className="py-2 px-3 font-mono text-brand-secondary font-bold">{col.col}</td>
                                    <td className="py-2 px-3 text-slate-300">{col.tip}</td>
                                    <td className="py-2 px-3">
                                        <span className="px-1.5 py-0.5 bg-red-900/40 border border-red-700 rounded text-red-300 text-xs">DA</span>
                                    </td>
                                    <td className="py-2 px-3 font-mono text-green-300">{col.exemple}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CollapsibleSection>

            {/* Grade Reference */}
            <CollapsibleSection title="Referință Grad_Nou_Ordine — ce număr corespunde cărei centuri">
                <p className="text-sm text-slate-400 mb-3">
                    Completează în coloana <code className="font-mono text-brand-secondary bg-slate-800 px-1 rounded">Grad_Nou_Ordine</code> numărul de ordine al gradului nou obținut la examen.
                </p>
                {loadingGrades ? (
                    <p className="text-slate-400 text-sm">Se încarcă lista de grade...</p>
                ) : grades.length === 0 ? (
                    <p className="text-red-400 text-sm">Nu s-au putut încărca gradele. Verificați conexiunea la baza de date.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left py-2 px-3 text-slate-400 font-semibold">Ordine (valoare CSV)</th>
                                    <th className="text-left py-2 px-3 text-slate-400 font-semibold">Denumire Grad</th>
                                    <th className="text-left py-2 px-3 text-slate-400 font-semibold">Culoare Centură</th>
                                </tr>
                            </thead>
                            <tbody>
                                {grades.map(g => (
                                    <tr key={g.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                        <td className="py-2 px-3 font-mono text-green-300 font-bold text-base">{g.ordine}</td>
                                        <td className="py-2 px-3 text-white font-semibold">{g.nume || g.name || '—'}</td>
                                        <td className="py-2 px-3 text-slate-300">{(g as any).culoare || (g as any).color || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CollapsibleSection>

            {/* Common Errors */}
            <CollapsibleSection title="Erori frecvente și cum să le rezolvi">
                <div className="space-y-4">
                    {commonErrors.map((item, i) => (
                        <div key={i} className="border border-slate-700 rounded-lg p-4">
                            <div className="flex items-start gap-2 mb-2">
                                <XCircleIcon className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-red-300 font-semibold text-sm">{item.eroare}</p>
                            </div>
                            <p className="text-xs text-slate-400 mb-2 pl-6">
                                <strong className="text-slate-300">Cauza:</strong> {item.cauza}
                            </p>
                            <div className="flex items-start gap-2 pl-6">
                                <CheckCircleIcon className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-green-200">
                                    <strong>Soluție:</strong> {item.solutie}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </CollapsibleSection>

            {/* Tips */}
            <Card>
                <h2 className="text-lg font-bold text-white mb-3">Sfaturi pentru un import reușit</h2>
                <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-start gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Completează întotdeauna CNP-ul atunci când îl cunoști — reduce semnificativ conflictele.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Folosește fișierul de date naștere pentru sportivii fără CNP — ajută la potrivirea corectă.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Asigură-te că toate rândurile din același fișier au aceeași <code className="font-mono text-xs bg-slate-800 px-1 rounded">Sesiune_Denumire</code> și <code className="font-mono text-xs bg-slate-800 px-1 rounded">Data_Examen</code> dacă aparțin aceleiași sesiuni.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Verificați numărul total de rânduri din panoul de sumar — dacă nu corespunde cu fișierul vostru, este posibil că unele rânduri au erori.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Dacă importul eșuează parțial, consultați <strong>Jurnalul de Erori</strong> din modalul de import — afișează numărul rândului și motivul erorii.</span>
                    </li>
                </ul>
            </Card>

            <div className="pb-8 text-center">
                <Button onClick={onBack} variant="secondary">
                    <ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Gestiune Examene
                </Button>
            </div>
        </div>
    );
};
