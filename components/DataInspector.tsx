import React from 'react';
import { Antrenament, PretConfig, Grad } from '../types';
import { Card, Button } from './ui';
import { ArrowLeftIcon } from './icons';

interface DataInspectorProps {
    antrenamente: Antrenament[];
    preturiConfig: PretConfig[]; // The final merged array
    rawGradePrices: any[]; // The raw data from grade_preturi_config
    grade: Grad[];
    onBack: () => void;
}

const DataCard: React.FC<{ title: string; description: string; data: any }> = ({ title, description, data }) => (
    <Card>
        <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
        <p className="text-sm text-slate-400 mb-4">{description}</p>
        <pre className="bg-slate-900 p-4 rounded max-h-96 overflow-auto text-xs font-mono">
            <code>
                {JSON.stringify(data, null, 2)}
            </code>
        </pre>
    </Card>
);

export const DataInspector: React.FC<DataInspectorProps> = ({ antrenamente, preturiConfig, rawGradePrices, grade, onBack }) => {
    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi</Button>
            <h1 className="text-3xl font-bold text-white">Inspector Date (Debug)</h1>

            <DataCard
                title="Date Brute din `grade_preturi_config`"
                description="Acesta este conținutul exact preluat din tabelul `grade_preturi_config`. Dacă acest tabel este gol, problema este cel mai probabil o politică de securitate (RLS) sau datele lipsesc din baza de date."
                data={rawGradePrices}
            />
            
            <DataCard
                title="Date Brute din `grade` (Nomenclator)"
                description="Acestea sunt toate gradele definite. Folosit pentru a corela `grad_id` cu `denumire_serviciu`."
                data={grade}
            />

            <DataCard
                title="Date Finale Combinate (`preturiConfig`)"
                description="Acesta este array-ul final folosit în aplicație, după ce prețurile examenelor au fost transformate și combinate cu celelalte prețuri. Aici ar trebui să apară taxele de examen cu categoria și denumirea corectă."
                data={preturiConfig}
            />
            
            <DataCard
                title="Date Brute Antrenamente (JSON Final)"
                description="Acestea sunt datele despre antrenamente așa cum ajung în componentele aplicației. Verificați dacă `sportivi_prezenti_ids` este populat."
                data={antrenamente}
            />
        </div>
    );
};
