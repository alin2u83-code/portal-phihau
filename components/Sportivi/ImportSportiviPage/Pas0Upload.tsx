import React from 'react';
import { Card, Button } from '../../ui';
import { downloadTemplate } from './utils';

interface Props {
    file: File | null;
    importing: boolean;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAnalyze: () => void;
    onBack: () => void;
}

export const Pas0Upload: React.FC<Props> = ({ file, importing, onFileChange, onAnalyze, onBack }) => (
    <Card className="p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-bold mb-6 text-zinc-100">Import Sportivi</h2>
        <div className="space-y-6">
            <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg">
                <h3 className="text-blue-400 font-semibold mb-2 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Instructiuni Import
                </h3>
                <ul className="text-sm text-slate-300 space-y-2 list-disc ml-5">
                    <li>Utilizati butonul de mai jos pentru a descarca template-ul corect.</li>
                    <li>
                        <strong className="text-white">Format Data Nastere:</strong> Sunt acceptate formatele
                        <code className="mx-1 bg-slate-800 px-1 rounded text-blue-300">DD/MM/YYYY</code>,
                        <code className="mx-1 bg-slate-800 px-1 rounded text-blue-300">DD.MM.YYYY</code> sau
                        <code className="mx-1 bg-slate-800 px-1 rounded text-blue-300">YYYY-MM-DD</code>.
                    </li>
                    <li>Asigurati-va ca numele si prenumele sunt completate pentru fiecare rand.</li>
                    <li>Campul <code className="mx-1 bg-slate-800 px-1 rounded text-blue-300">DATA NASTERII</code> este obligatoriu pentru inregistrarea sportivilor noi.</li>
                    <li>Coloane optionale acceptate: <code className="mx-1 bg-slate-800 px-1 rounded text-blue-300">TELEFON</code> si <code className="mx-1 bg-slate-800 px-1 rounded text-blue-300">GEN</code> (valori acceptate: <code className="mx-1 bg-slate-800 px-1 rounded text-blue-300">Masculin</code> / <code className="mx-1 bg-slate-800 px-1 rounded text-blue-300">Feminin</code>).</li>
                </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={downloadTemplate} variant="secondary" className="w-full sm:flex-1 touch-manipulation">
                    Descarca Template CSV
                </Button>
                <div className="flex-1 relative min-h-[44px]">
                    <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={onFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 touch-manipulation"
                    />
                    <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-400 flex items-center justify-between h-full min-h-[44px]">
                        <span className="truncate mr-2">{file ? file.name : 'Selecteaza fisier CSV sau Excel...'}</span>
                        <Button size="sm" variant="secondary" type="button" className="shrink-0 touch-manipulation">Cauta</Button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-700">
                <Button onClick={onAnalyze} isLoading={importing} className="w-full sm:flex-1 touch-manipulation" disabled={!file}>
                    {importing ? 'Se analizeaza...' : 'Analizeaza Fisier'}
                </Button>
                <Button variant="secondary" onClick={onBack} className="w-full sm:w-auto touch-manipulation">Inapoi</Button>
            </div>
        </div>
    </Card>
);
