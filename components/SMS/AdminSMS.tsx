import React, { useState } from 'react';
import { SMSConfigurare } from './SMSConfigurare';
import { SMSIncasari } from './SMSIncasari';
import { SMSTemplates } from './SMSTemplates';
import { SMSLog } from './SMSLog';
import { SMSStatistici } from './SMSStatistici';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'configurare' | 'incasari' | 'template' | 'log' | 'statistici';

interface TabDef {
    id: Tab;
    label: string;
}

const TABURI: TabDef[] = [
    { id: 'configurare', label: 'Configurare' },
    { id: 'incasari', label: 'Încasări' },
    { id: 'template', label: 'Template-uri' },
    { id: 'log', label: 'Log SMS' },
    { id: 'statistici', label: 'Statistici' },
];

export interface AdminSMSProps {
    activeClubId: string;
    activeRoleContext: any | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AdminSMS: React.FC<AdminSMSProps> = ({ activeClubId, activeRoleContext }) => {
    const [activeTab, setActiveTab] = useState<Tab>('configurare');
    const [unmatchedCount, setUnmatchedCount] = useState(0);

    return (
        <div className="space-y-0 animate-fade-in-down">
            {/* Page Header */}
            <div className="mb-4">
                <h1 className="text-2xl font-bold text-white">Notificări SMS</h1>
                <p className="text-slate-400 text-sm mt-1">
                    Gestionează gateway-ul SMS, template-urile, încasările detectate automat și log-urile.
                </p>
            </div>

            {/* Tab Bar — scrollable on mobile */}
            <div className="flex border-b border-slate-700 overflow-x-auto">
                {TABURI.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px whitespace-nowrap ${
                            activeTab === tab.id
                                ? 'border-brand-primary text-brand-secondary'
                                : 'border-transparent text-slate-400 hover:text-white'
                        }`}
                    >
                        {tab.label}

                        {/* Badge pe tab Încasări */}
                        {tab.id === 'incasari' && unmatchedCount > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-[10px] font-bold leading-none bg-rose-600 text-white">
                                {unmatchedCount > 99 ? '99+' : unmatchedCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="pt-6">
                {activeTab === 'configurare' && (
                    <SMSConfigurare
                        clubId={activeClubId}
                        activeRoleContext={activeRoleContext}
                    />
                )}

                {activeTab === 'incasari' && (
                    <SMSIncasari
                        clubId={activeClubId}
                        onUnmatchedCountChange={setUnmatchedCount}
                    />
                )}

                {activeTab === 'template' && (
                    <SMSTemplates clubId={activeClubId} />
                )}

                {activeTab === 'log' && (
                    <SMSLog clubId={activeClubId} />
                )}

                {activeTab === 'statistici' && (
                    <SMSStatistici clubId={activeClubId} />
                )}
            </div>
        </div>
    );
};
