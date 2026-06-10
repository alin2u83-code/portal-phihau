import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, ConfirmModal } from '../ui';
import { EditIcon, UploadCloudIcon, BookOpenIcon, UserPlusIcon } from '../icons';
import { ManagementInscrieri } from './ManagementInscrieri';
import { SesiuneExamen, InscriereExamen, Sportiv, Grad, Locatie, Plata, PretConfig, User, DecontFederatie, IstoricGrade } from '../../types';
import { ImportExcelExamen } from './ImportExcelExamen';
import { ImportTutorial } from './ImportTutorial';
import { ImportSportiviExamen } from './ImportSportiviExamen';
import { ExportExamenModal } from './ExportExamenModal';

export interface DetaliiSesiuneProps {
    sesiune: SesiuneExamen;
    inscrieri: InscriereExamen[];
    setInscrieri: React.Dispatch<React.SetStateAction<InscriereExamen[]>>;
    sportivi: Sportiv[];
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    grade: Grad[];
    istoricGrade: IstoricGrade[];
    allInscrieri: InscriereExamen[];
    locatii: Locatie[];
    plati: Plata[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    preturiConfig: PretConfig[];
    setSesiuni: React.Dispatch<React.SetStateAction<SesiuneExamen[]>>;
    setDeconturiFederatie: React.Dispatch<React.SetStateAction<DecontFederatie[]>>;
    setIstoricGrade: React.Dispatch<React.SetStateAction<IstoricGrade[]>>;
    onViewSportiv: (sportiv: Sportiv) => void;
    onEdit: () => void;
    currentUser: User;
    onFinalize: (id: string, inscrieri: InscriereExamen[], sesiune: SesiuneExamen, grade: Grad[]) => Promise<boolean | undefined>;
    isFinalizing: boolean;
    isReadOnly?: boolean;
}

export const DetaliiSesiune: React.FC<DetaliiSesiuneProps> = (props) => {
    const detailsRef = useRef<HTMLDivElement>(null);
    const [detailsHeight, setDetailsHeight] = useState(0);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);
    const [isImportSportiviOpen, setIsImportSportiviOpen] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [confirmFinalize, setConfirmFinalize] = useState<{ message: string; variant: 'danger' | 'warning' } | null>(null);

    useEffect(() => {
        if (detailsRef.current) {
            const observer = new ResizeObserver(entries => {
                for (let entry of entries) {
                    setDetailsHeight(entry.contentRect.height);
                }
            });
            observer.observe(detailsRef.current);
            return () => observer.disconnect();
        }
    }, []);

    const handleFinalizeExam = () => {
        const admisiCount = props.inscrieri.filter(i => i.rezultat === 'Admis').length;
        if (admisiCount === 0) {
            setConfirmFinalize({
                message: "Atenție: Niciun sportiv nu este marcat ca 'Admis'. Dacă nu ați salvat rezultatele, vă rugăm să o faceți înainte de a finaliza examenul. Doriți să continuați finalizarea oricum?",
                variant: 'warning',
            });
        } else {
            setConfirmFinalize({
                message: "Această acțiune este ireversibilă. Se va marca examenul ca finalizat și se vor actualiza gradele sportivilor admiși. Doriți să continuați?",
                variant: 'danger',
            });
        }
    };

    const handleConfirmFinalize = async () => {
        setConfirmFinalize(null);
        await props.onFinalize(props.sesiune.id, props.inscrieri, props.sesiune, props.grade);
    };

    return (
        <div style={{ '--details-height': `${detailsHeight}px` } as React.CSSProperties}>
            <div ref={detailsRef} className="sticky top-0 z-20 bg-slate-800 p-4 rounded-t-xl border-b border-slate-700 mb-6 flex justify-between items-start">
                <div>
                    <h3 className="text-2xl font-bold text-white">
                        {props.sesiune.locatie_nume || (props.locatii || []).find(l => l.id === props.sesiune.locatie_id)?.nume} -{' '}
                        {new Date((props.sesiune.data || props.sesiune.data_examen || '').toString().slice(0, 10) + 'T00:00:00').toLocaleDateString('ro-RO')}
                    </h3>
                    <p className="text-slate-400 mb-2">
                        Comisia: {Array.isArray(props.sesiune.comisia) ? props.sesiune.comisia.join(', ') : props.sesiune.comisia}
                    </p>
                    {props.sesiune.status === 'Finalizat' ? (
                        <span className="px-3 py-1 text-sm font-bold text-green-300 bg-green-900/50 border border-green-700/50 rounded-full">Finalizat</span>
                    ) : (
                        <span className="px-3 py-1 text-sm font-bold text-sky-300 bg-sky-900/50 border border-sky-700/50 rounded-full">Programat</span>
                    )}
                </div>

                {!props.isReadOnly && (
                    <div className="flex flex-wrap gap-2 justify-end">
                        <Button variant="secondary" onClick={() => setIsTutorialOpen(true)} title="Ghid import XLS">
                            <BookOpenIcon className="w-4 h-4" />
                        </Button>
                        <Button variant="info" onClick={() => setIsImportSportiviOpen(true)} title="Import sportivi noi și adaugă-i în sesiune">
                            <UserPlusIcon className="w-4 h-4 mr-2" /> Import Sportivi
                        </Button>
                        <Button variant="info" onClick={() => setIsImportOpen(true)} title="Import din fișier XLS (Ex. Local sau Examen de Grad)">
                            <UploadCloudIcon className="w-4 h-4 mr-2" /> Import XLS
                        </Button>
                        <Button variant="secondary" onClick={() => setIsExportOpen(true)} title="Export fișe examen (Notare + Validare)">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Export Fișe
                        </Button>
                        <Button variant="warning" onClick={props.onEdit}>
                            <EditIcon className="w-4 h-4 mr-2" /> Editează
                        </Button>
                        {props.sesiune.status !== 'Finalizat' && (
                            <Button variant="success" onClick={handleFinalizeExam} isLoading={props.isFinalizing}>
                                Finalizează Examen
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <ManagementInscrieri {...props} detailsHeight={detailsHeight} />

            <ImportTutorial asModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />

            <ImportSportiviExamen
                isOpen={isImportSportiviOpen}
                onClose={() => setIsImportSportiviOpen(false)}
                sesiune={props.sesiune}
                sportivi={props.sportivi}
                setSportivi={props.setSportivi}
                grade={props.grade}
                allInscrieri={props.inscrieri}
                setInscrieri={props.setInscrieri}
                istoricGrade={props.istoricGrade}
                currentUser={props.currentUser}
            />

            <ImportExcelExamen
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                sesiune={props.sesiune}
                sportivi={props.sportivi}
                grade={props.grade}
                setSportivi={props.setSportivi}
                setInscrieri={props.setInscrieri}
                setIstoricGrade={props.setIstoricGrade}
            />

            <ExportExamenModal
                isOpen={isExportOpen}
                onClose={() => setIsExportOpen(false)}
                sesiune={props.sesiune}
                inscrieri={props.allInscrieri}
                grade={props.grade}
            />

            {confirmFinalize && (
                <ConfirmModal
                    isOpen
                    title="Finalizare Examen"
                    message={confirmFinalize.message}
                    confirmLabel="Finalizează"
                    cancelLabel="Anulează"
                    variant={confirmFinalize.variant}
                    onClose={() => setConfirmFinalize(null)}
                    onConfirm={handleConfirmFinalize}
                />
            )}
        </div>
    );
};

