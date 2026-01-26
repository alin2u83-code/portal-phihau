import React from 'react';
import { User, Grad, Grupa, Club, View } from '../types';
import { Card, Button } from './ui';
import { MailIcon, LockIcon, ShieldCheckIcon, CalendarDaysIcon, UsersIcon, MapPinIcon, PhoneIcon, UploadCloudIcon, ArrowLeftIcon, FileTextIcon } from './icons';

interface PersonalProfileProps {
    currentUser: User;
    grade: Grad[];
    grupe: Grupa[];
    clubs: Club[];
    onNavigate: (view: View) => void;
    onBack: () => void;
}

const DataField: React.FC<{ label: string; value: React.ReactNode; icon: React.ElementType; }> = ({ label, value, icon: Icon }) => (
    <div className="flex items-start gap-4">
        <Icon className="w-5 h-5 text-slate-400 mt-1 flex-shrink-0" />
        <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
            <p className="font-semibold text-white">{value || <span className="italic text-slate-500">Nespecificat</span>}</p>
        </div>
    </div>
);

export const PersonalProfile: React.FC<PersonalProfileProps> = ({ currentUser, grade, grupe, clubs, onNavigate, onBack }) => {

    const currentGrad = grade.find(g => g.id === currentUser.grad_actual_id);
    const initial = `${currentUser.nume?.[0] || ''}${currentUser.prenume?.[0] || ''}`;

    return (
        <div className="space-y-6 animate-fade-in-down">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi</Button>

            {/* Header */}
            <Card className="!bg-transparent border-0 p-0">
                <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-black p-6 rounded-xl shadow-2xl border border-slate-700 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                     <div className="w-28 h-28 rounded-full bg-amber-400/10 border-2 border-amber-400 flex items-center justify-center text-amber-300 text-5xl font-black">
                        {initial}
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold text-white">{currentUser.nume} {currentUser.prenume}</h1>
                        {currentGrad && (
                             <div className="mt-2 inline-flex items-center gap-2 px-4 py-1 bg-amber-400 text-slate-900 rounded-full font-bold text-sm shadow-lg">
                                <ShieldCheckIcon className="w-5 h-5" />
                                {currentGrad.nume}
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <h3 className="text-xl font-bold text-white mb-4">Informații Generale</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <DataField label="Email" value={currentUser.email} icon={MailIcon} />
                            <DataField label="Telefon" value={currentUser.telefon} icon={PhoneIcon} />
                            <DataField label="Data Nașterii" value={currentUser.data_nasterii ? new Date(currentUser.data_nasterii + 'T00:00:00').toLocaleDateString('ro-RO') : 'N/A'} icon={CalendarDaysIcon} />
                            <DataField label="Adresă" value={currentUser.adresa} icon={MapPinIcon} />
                        </div>
                    </Card>

                     <Card>
                        <h3 className="text-xl font-bold text-white mb-4">Status Tehnic (Qwan Ki Do)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <DataField label="Club" value={currentUser.cluburi?.nume || 'N/A'} icon={UsersIcon} />
                            <DataField label="Data Înscrierii" value={new Date(currentUser.data_inscrierii).toLocaleDateString('ro-RO')} icon={CalendarDaysIcon} />
                            <DataField label="Grad Actual" value={currentGrad?.nume || 'Începător'} icon={ShieldCheckIcon} />
                            <DataField label="Expirare Viză Medicală" value={currentUser.viza_medicala_expirare ? new Date(currentUser.viza_medicala_expirare + 'T00:00:00').toLocaleDateString('ro-RO') : 'N/A'} icon={CalendarDaysIcon} />
                        </div>
                    </Card>
                </div>

                {/* Side Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                         <h3 className="text-xl font-bold text-white mb-4">Securitate Cont</h3>
                         <div className="space-y-3">
                            <Button onClick={() => onNavigate('account-settings')} className="w-full justify-start !p-4 gap-3 bg-slate-700/50 hover:bg-slate-700">
                                <LockIcon className="w-5 h-5 text-slate-300" />
                                <span>Schimbă Parola</span>
                            </Button>
                             <Button onClick={() => onNavigate('account-settings')} className="w-full justify-start !p-4 gap-3 bg-slate-700/50 hover:bg-slate-700">
                                <MailIcon className="w-5 h-5 text-slate-300" />
                                <span>Schimbă Email</span>
                            </Button>
                         </div>
                    </Card>
                    <Card>
                        <h3 className="text-xl font-bold text-white mb-4">Documente Personale</h3>
                         <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <FileTextIcon className="w-5 h-5 text-slate-300" />
                                    <span className="font-semibold text-sm">Certificat Grad</span>
                                </div>
                                <Button size="sm" variant="secondary" disabled>Vezi</Button>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <FileTextIcon className="w-5 h-5 text-slate-300" />
                                    <span className="font-semibold text-sm">Viză Medicală</span>
                                </div>
                                <Button size="sm" variant="secondary" disabled>Vezi</Button>
                            </div>
                            <Button className="w-full mt-2" disabled>
                                <UploadCloudIcon className="w-5 h-5 mr-2" /> Încarcă Document Nou
                            </Button>
                         </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};