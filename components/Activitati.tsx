import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Antrenament, Orar, Prezenta, Sportiv, Grupa, Examen, Participare, Grad, PretConfig, Plata, Eveniment, Rezultat, View } from '../types';
import { Button, Card, Input, Select, ConfirmationModal, Modal } from './ui';
import { PlusIcon, ArrowLeftIcon, TrashIcon, UsersIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ExameneManagement } from './Examene';
import { StagiiCompetitiiManagement } from './StagiiCompetitii';
import { PrezentaManagement } from './Prezenta';

type Tab = 'antrenamente' | 'examene' | 'evenimente';

interface ActivitatiManagementProps {
    onBack: () => void;
    initialTab?: Tab;
    sportivi: Sportiv[];
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    examene: Examen[];
    setExamene: React.Dispatch<React.SetStateAction<Examen[]>>;
    grade: Grad[];
    setGrade: React.Dispatch<React.SetStateAction<Grad[]>>;
    participari: Participare[];
    setParticipari: React.Dispatch<React.SetStateAction<Participare[]>>;
    grupe: Grupa[];
    setGrupe: React.Dispatch<React.SetStateAction<Grupa[]>>;
    plati: Plata[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    evenimente: Eveniment[];
    setEvenimente: React.Dispatch<React.SetStateAction<Eveniment[]>>;
    rezultate: Rezultat[];
    setRezultate: React.Dispatch<React.SetStateAction<Rezultat[]>>;
    preturiConfig: PretConfig[];
    setPreturiConfig: React.Dispatch<React.SetStateAction<PretConfig[]>>;
    onNavigate?: (view: View, state?: any) => void;
    navigationState?: any;
    antrenamente: Antrenament[];
    setAntrenamente: React.Dispatch<React.SetStateAction<Antrenament[]>>;
    prezenta: Prezenta[];
    setPrezenta: React.Dispatch<React.SetStateAction<Prezenta[]>>;
    orar: Orar[];
    setOrar: React.Dispatch<React.SetStateAction<Orar[]>>;
}

const TabButton: React.FC<{ activeTab: Tab, tabName: Tab, label: string, onClick: (tab: Tab) => void }> = ({ activeTab, tabName, label, onClick }) => (
    <button
        onClick={() => onClick(tabName)}
        className={`px-4 py-2 text-sm md:text-base font-bold transition-colors duration-200 border-b-2 ${
            activeTab === tabName
                ? 'text-brand-secondary border-brand-secondary'
                : 'text-slate-400 border-transparent hover:text-white hover:border-slate-500'
        }`}
    >
        {label}
    </button>
);


export const ActivitatiManagement: React.FC<ActivitatiManagementProps> = (props) => {
    const { onBack, initialTab = 'antrenamente' } = props;
    const [activeTab, setActiveTab] = useState<Tab>(initialTab);

    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
            <h1 className="text-3xl font-bold text-white mb-6">Activități & Evaluări</h1>
            
            <div className="border-b border-slate-700 mb-6">
                <TabButton activeTab={activeTab} tabName="antrenamente" label="Antrenamente & Prezență" onClick={setActiveTab} />
                <TabButton activeTab={activeTab} tabName="examene" label="Examene & Grade" onClick={setActiveTab} />
                <TabButton activeTab={activeTab} tabName="evenimente" label="Stagii & Competiții" onClick={setActiveTab} />
            </div>

            <div>
                {activeTab === 'antrenamente' && <PrezentaManagement {...props} />}
                {activeTab === 'examene' && <ExameneManagement {...props} onBack={() => {}} />}
                {activeTab === 'evenimente' && (
                    <div className="space-y-8">
                        <StagiiCompetitiiManagement {...props} type="Stagiu" onBack={()=>{}}/>
                        <StagiiCompetitiiManagement {...props} type="Competitie" onBack={()=>{}}/>
                    </div>
                )}
            </div>
        </div>
    );
};