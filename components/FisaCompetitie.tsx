import React, { useMemo } from 'react';
import { User, Grad, InscriereExamen, Examen } from '../types';
import { Button, Card } from './ui';
import { ArrowLeftIcon, FileTextIcon, DocumentArrowDownIcon } from './icons';

// Helper to get age in full years
const getAge = (dateString: string): number => {
    if (!dateString) return 0;
    const today = new Date();
    const birthDate = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
    if (isNaN(birthDate.getTime())) return 0;
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

const DataField: React.FC<{ label: string; value: string | number; isPlaceholder?: boolean }> = ({ label, value, isPlaceholder }) => (
    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
        <dt className="text-sm font-medium text-slate-400">{label}</dt>
        <dd className={`mt-1 text-2xl font-bold ${isPlaceholder ? 'text-slate-500 italic' : 'text-white'}`}>{value}</dd>
    </div>
);

interface FisaCompetitieProps {
    currentUser: User;
    grade: Grad[];
    participari: InscriereExamen[];
    examene: Examen[];
    onBack: () => void;
}

export const FisaCompetitie: React.FC<FisaCompetitieProps> = ({ currentUser, grade, participari, examene, onBack }) => {

    const competitionData = useMemo(() => {
        const admittedParticipations = participari
            .filter(p => p.sportiv_id === currentUser.id && p.rezultat === 'Admis')
            .sort((a, b) => {
                const dateA = examene.find(e => e.id === a.sesiune_id)?.data || '1970-01-01';
                const dateB = examene.find(e => e.id === b.sesiune_id)?.data || '1970-01-01';
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            });

        const lastParticipation = admittedParticipations[0];
        const lastExam = lastParticipation ? examene.find(e => e.id === lastParticipation.sesiune_id) : null;
        
        const currentGrad = currentUser.grad_actual_id
            ? grade.find(g => g.id === currentUser.grad_actual_id)
            : lastParticipation ? grade.find(g => g.id === lastParticipation.grad_vizat_id) : null;

        const age = getAge(currentUser.data_nasterii);
        
        let category = 'Categorie Indisponibilă';
        if (age <= 12) category = 'Copii';
        else if (age <= 17) category = 'Juniori';
        else category = 'Seniori';
        
        return {
            nume: currentUser.nume.toUpperCase(),
            prenume: currentUser.prenume.toUpperCase(),
            varsta_exacta: age,
            categorie_concurs: category,
            grad: currentGrad?.nume || 'Începător',
            data_ultima_promovare: lastExam?.data || currentUser.data_inscrierii,
        };
    }, [currentUser, grade, participari, examene]);

    const handleDownloadJson = () => {
        const jsonData = JSON.stringify(competitionData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const sanitizedName = `${competitionData.nume}_${competitionData.prenume}`.toLowerCase();
        a.download = `fisa_competitie_${sanitizedName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6 animate-fade-in-down">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Portal</Button>
            
            <Card className="border-l-4 border-brand-secondary">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <FileTextIcon className="w-8 h-8 text-brand-secondary" />
                            Fișă de Competiție
                        </h1>
                        <p className="text-slate-400 mt-1">Aceste date sunt formatate pentru înscrierea la competițiile FRQK.</p>
                    </div>
                    <Button onClick={handleDownloadJson} variant="primary" className="bg-green-600 hover:bg-green-700">
                        <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                        Descarcă JSON
                    </Button>
                </div>
            </Card>

            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DataField label="Nume" value={competitionData.nume} />
                <DataField label="Prenume" value={competitionData.prenume} />
                <DataField label="Vârsta Exactă" value={competitionData.varsta_exacta} />
                <DataField label="Categoria de Concurs (Exemplu)" value={competitionData.categorie_concurs} isPlaceholder />
                <DataField label="Grad Actual" value={competitionData.grad} />
                <DataField label="Data Ultimei Promovări" value={new Date(competitionData.data_ultima_promovare).toLocaleDateString('ro-RO')} />
            </dl>
        </div>
    );
};
