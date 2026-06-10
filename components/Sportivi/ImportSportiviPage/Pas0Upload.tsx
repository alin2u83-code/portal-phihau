import React, { useState } from 'react';
import { Card, Button } from '../../ui';
import { ChevronDownIcon } from '../../icons';
import { downloadTemplate } from './utils';

interface Props {
    file: File | null;
    importing: boolean;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAnalyze: () => void;
    onBack: () => void;
}

const COLOANE = [
    { col: 'NUME SPORTIV',    obligatorie: true,  exemplu: 'Popescu',           nota: '' },
    { col: 'PRENUME SPORTIV', obligatorie: true,  exemplu: 'Horatiu Casian',    nota: 'Scrie TOATE prenumele, separate prin spațiu' },
    { col: 'DATA NASTERII',   obligatorie: true,  exemplu: '15/03/2005',        nota: 'Format: ZZ/LL/AAAA sau ZZ.LL.AAAA sau AAAA-LL-ZZ' },
    { col: 'CNP',             obligatorie: false, exemplu: '5050315...',        nota: 'Recomandat — cel mai precis criteriu pentru evitarea duplicatelor' },
    { col: 'EMAIL',           obligatorie: false, exemplu: 'horatiu@email.com', nota: 'Dacă lipsește, se generează automat' },
    { col: 'TELEFON',         obligatorie: false, exemplu: '0722123456',        nota: '' },
    { col: 'GEN',             obligatorie: false, exemplu: 'Masculin',          nota: 'Valori acceptate: Masculin / Feminin' },
    { col: 'ADRESA',          obligatorie: false, exemplu: 'Str. Exemplu 1',    nota: '' },
    { col: 'LOCUL NASTERII',  obligatorie: false, exemplu: 'Cluj-Napoca',       nota: '' },
];

const GRESELI = [
    {
        titlu: 'Prenume cu mai multe cuvinte — cel mai frecvent',
        gresit: 'PRENUME: "Casian" (lipsește "Horatiu")',
        corect: 'PRENUME: "Horatiu Casian" — ambele prenume, spațiu între ele',
        detaliu: 'Dacă sportivul are două sau mai multe prenume (ex: Horatiu Casian, Maria Elena), scrie-le pe TOATE în aceeași celulă, separate prin spațiu. Dacă scrii doar unul, sistemul poate să nu recunoască sportivul și să îl importe ca persoană nouă, creând un duplicat.',
    },
    {
        titlu: 'Prenumele și numele inversate',
        gresit: 'NUME: "Casian", PRENUME: "Horatiu" — invers',
        corect: 'NUME: "Popescu" (familia), PRENUME: "Horatiu Casian" (prenumele)',
        detaliu: 'NUME = numele de familie (Popescu, Ionescu, Casian). PRENUME = prenumele propriu (Horatiu, Maria Elena). Dacă le inversezi, sportivul poate apărea duplicat în sistem.',
    },
    {
        titlu: 'Data nașterii în format greșit',
        gresit: '"5 Martie 2005" sau "05-03-2005"',
        corect: '"05/03/2005" sau "05.03.2005" sau "2005-03-05"',
        detaliu: 'Sistemul acceptă doar formatele de mai sus. Nu scrie luna cu litere și nu folosi cratime.',
    },
    {
        titlu: 'Diacritice lipsă',
        gresit: '"Stefan Ionescu" fără ș, ț, ă',
        corect: '"Ștefan Ionescu" cu diacritice corecte',
        detaliu: 'Sistemul recunoaște variante cu și fără diacritice, dar pentru o bază de date curată folosește diacriticele corecte (ș, ț, ă, â, î).',
    },
];

export const Pas0Upload: React.FC<Props> = ({ file, importing, onFileChange, onAnalyze, onBack }) => {
    const [ghidDeschis, setGhidDeschis] = useState(false);
    const [greseliDeschise, setGreseliDeschise] = useState(false);

    return (
        <Card className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-1 text-zinc-100">Import Sportivi</h2>
            <p className="text-sm text-slate-400 mb-6">
                Adaugă mai mulți sportivi simultan dintr-un fișier Excel sau CSV.
            </p>

            {/* Pași rapizi */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                {[
                    { nr: '1', text: 'Descarcă template-ul de mai jos' },
                    { nr: '2', text: 'Completează datele sportivilor în fișier' },
                    { nr: '3', text: 'Încarcă fișierul și verifică înainte de import' },
                ].map(p => (
                    <div key={p.nr} className="flex items-start gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs font-bold flex items-center justify-center">
                            {p.nr}
                        </span>
                        <p className="text-sm text-slate-300">{p.text}</p>
                    </div>
                ))}
            </div>

            {/* Coloane acceptate — accordion */}
            <div className="mb-4 border border-slate-700/60 rounded-xl overflow-hidden">
                <button
                    type="button"
                    onClick={() => setGhidDeschis(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/40 hover:bg-slate-800/70 transition-colors text-sm font-medium text-slate-300"
                >
                    <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Ce coloane acceptă fișierul?
                    </span>
                    <ChevronDownIcon className={`h-4 w-4 text-slate-400 transition-transform ${ghidDeschis ? 'rotate-180' : ''}`} />
                </button>

                {ghidDeschis && (
                    <div className="px-4 pb-4 pt-2 bg-slate-800/20">
                        <div className="overflow-x-auto rounded-lg border border-slate-700/50">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-slate-800/60 text-slate-400 uppercase tracking-wide">
                                        <th className="px-3 py-2 text-left">Coloana (exact)</th>
                                        <th className="px-3 py-2 text-center">Obligatorie</th>
                                        <th className="px-3 py-2 text-left">Exemplu</th>
                                        <th className="px-3 py-2 text-left hidden sm:table-cell">Observații</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/40">
                                    {COLOANE.map(c => (
                                        <tr key={c.col} className="hover:bg-slate-800/30">
                                            <td className="px-3 py-2">
                                                <code className="bg-slate-800 text-blue-300 px-1.5 py-0.5 rounded text-[11px] font-mono whitespace-nowrap">
                                                    {c.col}
                                                </code>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                {c.obligatorie
                                                    ? <span className="text-red-400 font-bold">DA</span>
                                                    : <span className="text-slate-500">opțional</span>
                                                }
                                            </td>
                                            <td className="px-3 py-2 text-slate-300 whitespace-nowrap">{c.exemplu}</td>
                                            <td className="px-3 py-2 text-slate-500 hidden sm:table-cell">{c.nota}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            Numele coloanelor trebuie să fie exact ca mai sus (majuscule). Descarcă template-ul — nu trebuie să scrii coloanele manual.
                        </p>
                    </div>
                )}
            </div>

            {/* Greșeli frecvente — accordion */}
            <div className="mb-6 border border-amber-500/20 rounded-xl overflow-hidden">
                <button
                    type="button"
                    onClick={() => setGreseliDeschise(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-sm font-medium text-amber-300"
                >
                    <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Greșeli frecvente de evitat
                    </span>
                    <ChevronDownIcon className={`h-4 w-4 text-amber-400/60 transition-transform ${greseliDeschise ? 'rotate-180' : ''}`} />
                </button>

                {greseliDeschise && (
                    <div className="px-4 pb-4 pt-1 bg-amber-500/5 space-y-3">
                        {GRESELI.map((g, i) => (
                            <div key={i} className="border border-amber-500/20 rounded-xl p-3 bg-slate-800/40">
                                <p className="text-xs font-bold text-amber-300 mb-2">{g.titlu}</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
                                        <p className="text-[10px] text-red-400 font-semibold uppercase mb-0.5">Greșit</p>
                                        <p className="text-xs text-red-300">{g.gresit}</p>
                                    </div>
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
                                        <p className="text-[10px] text-emerald-400 font-semibold uppercase mb-0.5">Corect</p>
                                        <p className="text-xs text-emerald-300">{g.corect}</p>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400">{g.detaliu}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Butoane acțiune */}
            <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={downloadTemplate} variant="secondary" className="w-full sm:flex-1 touch-manipulation">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Descarcă Template CSV
                </Button>
                <div className="flex-1 relative min-h-[44px]">
                    <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={onFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 touch-manipulation"
                    />
                    <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-400 flex items-center justify-between h-full min-h-[44px]">
                        <span className="truncate mr-2">{file ? file.name : 'Selectează fișier CSV sau Excel...'}</span>
                        <Button size="sm" variant="secondary" type="button" className="shrink-0 touch-manipulation">Caută</Button>
                    </div>
                </div>
            </div>

            {file && (
                <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Fișier selectat: <span className="font-medium text-emerald-300">{file.name}</span>
                    <span className="text-slate-500">({(file.size / 1024).toFixed(0)} KB)</span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-700 mt-6">
                <Button onClick={onAnalyze} isLoading={importing} className="w-full sm:flex-1 touch-manipulation" disabled={!file}>
                    {importing ? 'Se analizează...' : 'Analizează Fișier'}
                </Button>
                <Button variant="secondary" onClick={onBack} className="w-full sm:w-auto touch-manipulation">Înapoi</Button>
            </div>
        </Card>
    );
};
