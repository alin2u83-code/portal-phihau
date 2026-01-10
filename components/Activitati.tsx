import React, { useState, useEffect } from 'react';
import { Sportiv, Examen, Grad, Participare, Prezenta, Grupa, Plata, Eveniment, Rezultat, PretConfig } from '../types';
import { PrezentaManagement } from './Prezenta';
import { ExameneManagement } from './Examene';
import { GradeManagement } from './Grade';

const EvenimenteList: React.FC<{ evenimente: Eveniment[], rezultate: Rezultat[] }> = ({ evenimente, rezultate }) => {
    const sortedEvenimente = [...evenimente].sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    return (
        <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-700">
                    <tr>
                        <th className="p-4 font-semibold">Eveniment</th>
                        <th className="p-4 font-semibold">Tip</th>
                        <th className="p-4 font-semibold">Data</th>
                        <th className="p-4 font-semibold">Participanți</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {sortedEvenimente.map(ev => (
                        <tr key={ev.id} className="hover:bg-slate-700/50">
                            <td className="p-4 font-medium">{ev.denumire}</td>
                            <td className="p-4">{ev.tip}</td>
                            <td className="p-4">{new Date(ev.data).toLocaleDateString('ro-RO')}</td>
                            <td className="p-4">{rezultate.filter(p => p.eveniment_id === ev.id).length}</td>
                        </tr>
                    ))}
                    {sortedEvenimente.length === 0 && <tr><td colSpan={4}><p className="p-4 text-center text-slate-400">Niciun eveniment înregistrat.</p></td></tr>}
                </tbody>
            </table>
        </div>
    );
};


interface ActivitatiProps {
    onBack: () => void;
    initialTab: string | null;
    // Props for children
    sportivi: Sportiv[];
    prezente: Prezenta[];
    setPrezente: React.Dispatch<React.SetStateAction<Prezenta[]>>;
    grupe: Grupa[];
    examene: Examen[];
    setExamene: React.Dispatch<React.SetStateAction<Examen[]>>;
    participari: Participare[];
    setParticipari: React.Dispatch<React.SetStateAction<Participare[]>>;
    grade: Grad[];
    setGrade: React.Dispatch<React.SetStateAction<Grad[]>>;
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    preturiConfig: PretConfig[];
    evenimente: Eveniment[];
    rezultate: Rezultat[];
}

type ActivitatiTab = 'antrenamente' | 'examene' | 'evenimente' | 'grade';

export const Activitati: React.FC<ActivitatiProps> = (props) => {
    const [activeTab, setActiveTab] = useState<ActivitatiTab>((props.initialTab as ActivitatiTab) || 'antrenamente');

    useEffect(() => {
        if (props.initialTab && (['antrenamente', 'examene', 'evenimente', 'grade'].includes(props.initialTab))) {
            setActiveTab(props.initialTab as ActivitatiTab);
        }
    }, [props.initialTab]);
    
    const TabButton: React.FC<{ tab: ActivitatiTab; label: string }> = ({ tab, label }) => {
        const isActive = activeTab === tab;
        return (
            <button
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-4 border-b-2 text-sm font-semibold transition-colors duration-200 ${
                    isActive
                        ? 'border-brand-secondary text-white'
                        : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'
                }`}
            >
                {label}
            </button>
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'antrenamente':
                return <PrezentaManagement 
                    sportivi={props.sportivi} 
                    prezente={props.prezente} 
                    setPrezente={props.setPrezente} 
                    grupe={props.grupe}
                    onBack={() => {}} // onBack is no longer needed here
                    isEmbedded
                />;
            case 'examene':
                return <ExameneManagement 
                    examene={props.examene} 
                    setExamene={props.setExamene} 
                    participari={props.participari} 
                    setParticipari={props.setParticipari} 
                    sportivi={props.sportivi} 
                    grade={props.grade} 
                    setPlati={props.setPlati} 
                    preturi={props.preturiConfig}
                    onBack={() => {}} // onBack is no longer needed here
                    isEmbedded
                />;
            case 'evenimente':
                return <EvenimenteList evenimente={props.evenimente} rezultate={props.rezultate} />;
            case 'grade':
                return <GradeManagement 
                    grade={props.grade} 
                    setGrade={props.setGrade} 
                    onBack={() => {}} // onBack is no longer needed here
                    isEmbedded
                />;
            default:
                return null;
        }
    };

    return (
        <div>
            <div className="border-b border-slate-700 mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <TabButton tab="antrenamente" label="Antrenamente & Prezență" />
                    <TabButton tab="examene" label="Examene" />
                    <TabButton tab="evenimente" label="Stagii & Competiții" />
                    <TabButton tab="grade" label="Grade Qwan Ki Do" />
                </nav>
            </div>
            
            <div className="mt-6">
                {renderTabContent()}
            </div>
        </div>
    );
};