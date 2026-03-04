import React from 'react';
import { Sportiv, Grupa, Antrenament } from '../../types';
import { Card, Button, Input } from '../ui';
import { ShieldCheckIcon, UserPlusIcon, ChartBarIcon, ClipboardListIcon, EditIcon } from '../icons';
import { AttendanceIndicator } from './AttendanceIndicator';
import { TrainingHistory } from './TrainingHistory';

interface ProfilTabProps {
    sportiv: Sportiv;
    grupe: Grupa[];
    antrenamente: Antrenament[];
    canViewSensitiveInfo: boolean;
    lastThreeAttendances: { date: string; present: boolean }[];
    isEditingFeedback: boolean;
    setIsEditingFeedback: (val: boolean) => void;
    feedbackData: { puncte_forte: string; puncte_slabe: string; obiective: string };
    setFeedbackData: React.Dispatch<React.SetStateAction<{ puncte_forte: string; puncte_slabe: string; obiective: string }>>;
    handleSaveFeedback: () => void;
    isSavingFeedback: boolean;
    setIsCreateAccountModalOpen: (val: boolean) => void;
    setIsReportModalOpen: (val: boolean) => void;
    getAge: (dateString: string) => number;
}

export const ProfilTab: React.FC<ProfilTabProps> = ({
    sportiv,
    grupe,
    antrenamente,
    canViewSensitiveInfo,
    lastThreeAttendances,
    isEditingFeedback,
    setIsEditingFeedback,
    feedbackData,
    setFeedbackData,
    handleSaveFeedback,
    isSavingFeedback,
    setIsCreateAccountModalOpen,
    setIsReportModalOpen,
    getAge
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Stats & Quick Info */}
            <div className="space-y-6">
                {!sportiv.user_id && (
                    <Card className="bg-amber-900/20 border-l-4 border-amber-500">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2 text-amber-400 font-bold">
                                <ShieldCheckIcon className="w-5 h-5" />
                                <h3>Cont Inactiv</h3>
                            </div>
                            <p className="text-sm text-amber-200/80">Acest sportiv nu are acces la aplicație.</p>
                            <Button 
                                size="sm" 
                                className="w-full bg-amber-600 hover:bg-amber-500 text-white border-none"
                                onClick={() => setIsCreateAccountModalOpen(true)}
                                disabled={!sportiv.email}
                            >
                                <UserPlusIcon className="w-4 h-4 mr-2" /> Generează Cont
                            </Button>
                        </div>
                    </Card>
                )}

                <Card>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <ChartBarIcon className="w-5 h-5 text-slate-400" />
                        Statistici
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-800/50 p-3 rounded-lg text-center">
                            <p className="text-xs text-slate-400 uppercase">Vârstă</p>
                            <p className="text-xl font-bold text-white">{getAge(sportiv.data_nasterii)} ani</p>
                        </div>
                        <div className="bg-slate-800/50 p-3 rounded-lg text-center">
                            <p className="text-xs text-slate-400 uppercase">Vechime</p>
                            <p className="text-xl font-bold text-white">{getAge(sportiv.data_inscrierii)} ani</p>
                        </div>
                    </div>
                </Card>

                {canViewSensitiveInfo && (
                    <Card>
                        <AttendanceIndicator attendances={lastThreeAttendances} />
                    </Card>
                )}
            </div>

            {/* Right Column: Training & Feedback */}
            <div className="lg:col-span-2 space-y-6">
                {canViewSensitiveInfo && <TrainingHistory sportivId={sportiv.id} antrenamente={antrenamente} grupe={grupe} />}
                
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <ClipboardListIcon className="w-5 h-5 text-slate-400" />
                            Feedback & Obiective
                        </h3>
                        {!isEditingFeedback && (
                            <Button size="sm" variant="secondary" onClick={() => setIsEditingFeedback(true)}>
                                <EditIcon className="w-4 h-4 mr-1"/> Editează
                            </Button>
                        )}
                    </div>
                    
                    {isEditingFeedback ? (
                        <div className="space-y-4 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                            <Input label="Puncte Forte" value={feedbackData.puncte_forte} onChange={(e) => setFeedbackData(p=>({...p, puncte_forte: e.target.value}))}/>
                            <Input label="Puncte Slabe" value={feedbackData.puncte_slabe} onChange={(e) => setFeedbackData(p=>({...p, puncte_slabe: e.target.value}))}/>
                            <Input label="Obiective" value={feedbackData.obiective} onChange={(e) => setFeedbackData(p=>({...p, obiective: e.target.value}))}/>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button size="sm" variant="secondary" onClick={()=>setIsEditingFeedback(false)}>Anulează</Button>
                                <Button size="sm" variant="success" onClick={handleSaveFeedback} isLoading={isSavingFeedback}>Salvează Modificări</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-emerald-900/20 p-4 rounded-lg border border-emerald-500/20">
                                <h4 className="text-sm font-bold text-emerald-400 mb-2 uppercase tracking-wider">Puncte Forte</h4>
                                <p className="text-slate-300 text-sm whitespace-pre-wrap">{sportiv.puncte_forte || 'Nespecificat'}</p>
                            </div>
                            <div className="bg-red-900/20 p-4 rounded-lg border border-red-500/20">
                                <h4 className="text-sm font-bold text-red-400 mb-2 uppercase tracking-wider">Puncte Slabe</h4>
                                <p className="text-slate-300 text-sm whitespace-pre-wrap">{sportiv.puncte_slabe || 'Nespecificat'}</p>
                            </div>
                            <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/20">
                                <h4 className="text-sm font-bold text-blue-400 mb-2 uppercase tracking-wider">Obiective</h4>
                                <p className="text-slate-300 text-sm whitespace-pre-wrap">{sportiv.obiective || 'Nespecificat'}</p>
                            </div>
                        </div>
                    )}
                    {canViewSensitiveInfo && (
                        <div className="mt-4 pt-4 border-t border-slate-700">
                            <Button onClick={() => setIsReportModalOpen(true)} variant="secondary" size="sm" className="w-full md:w-auto">
                                <ChartBarIcon className="w-4 h-4 mr-2" /> Generează Raport Detaliat
                            </Button>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};
