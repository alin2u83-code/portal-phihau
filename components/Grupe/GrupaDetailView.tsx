import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Grupa as GrupaType, ProgramItem } from '../../types';
import { Button, Card, Input } from '../ui';
import { ArrowLeftIcon, PlusIcon, TrashIcon, CheckCircleIcon, CogIcon } from '../icons';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import { clearCache } from '../../utils/cache';

interface GrupaWithDetails extends GrupaType {
    sportivi: { count: number }[];
    program: ProgramItem[];
}

type TabId = 'antrenamente' | 'orar' | 'sportivi';

interface GrupaDetailViewProps {
    grupa: GrupaWithDetails;
    onBack: () => void;
    onOpenAdaugaSportivi: (g: GrupaWithDetails) => void;
}

// Tab Antrenamente — placeholder (D-10, pregătit pentru calendarul din Phase 3)
const TabAntrenamente: React.FC = () => (
    <div className="flex items-center justify-center py-12">
        <div className="border-dashed border-2 border-slate-700 rounded-xl py-12 px-8 text-center max-w-md">
            <h3 className="text-base font-bold text-white mb-2">
                Calendar antrenamente — disponibil în curând
            </h3>
            <p className="text-sm text-slate-400">
                Gestionarea completă a antrenamentelor va fi disponibilă în faza următoare.
                Folosește tab-ul Orar pentru a configura programul recurent.
            </p>
        </div>
    </div>
);

// Tab Orar — stub temporar, completat în Task 2
const TabOrar: React.FC<{ grupa: GrupaWithDetails }> = (_props) => (
    <div />
);

// Tab Sportivi — stub temporar, completat în Task 3
const TabSportivi: React.FC<{ grupa: GrupaWithDetails; onOpenAdaugaSportivi: (g: GrupaWithDetails) => void }> = (_props) => (
    <div />
);

export const GrupaDetailView: React.FC<GrupaDetailViewProps> = ({ grupa, onBack, onOpenAdaugaSportivi }) => {
    const [activeTab, setActiveTab] = useState<TabId>('antrenamente');

    const sportiviCount = grupa.sportivi?.[0]?.count ?? 0;

    return (
        <div>
            {/* Header row */}
            <div className="flex items-center justify-between py-4 border-b border-slate-700 flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={onBack}>
                    <ArrowLeftIcon className="w-4 h-4 mr-1.5" />
                    Înapoi la Grupe
                </Button>
                <div className="text-right">
                    <h1 className="text-xl font-bold text-white">{grupa.denumire}</h1>
                    <p className="text-sm text-slate-400">Sala: {grupa.sala || 'Nespecificată'} · {sportiviCount} sportivi activi</p>
                </div>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-slate-700 gap-1">
                {(['antrenamente', 'orar', 'sportivi'] as TabId[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`h-10 px-4 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                            activeTab === tab
                                ? 'border-indigo-500 text-white'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        {tab === 'antrenamente' ? 'Antrenamente' : tab === 'orar' ? 'Orar' : 'Sportivi'}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="py-6 overflow-y-auto">
                {activeTab === 'antrenamente' && <TabAntrenamente />}
                {activeTab === 'orar' && <TabOrar grupa={grupa} />}
                {activeTab === 'sportivi' && <TabSportivi grupa={grupa} onOpenAdaugaSportivi={onOpenAdaugaSportivi} />}
            </div>
        </div>
    );
};
