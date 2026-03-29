import React, { useState, useEffect, useRef } from 'react';
import { Card, Button } from '../ui';
import { EditIcon, UploadCloudIcon, BookOpenIcon } from '../icons';
import { ManagementInscrieri } from '../ManagementInscrieri';
import { SesiuneExamen, InscriereExamen, Sportiv, Grad, Locatie, Plata, PretConfig, User, DecontFederatie, IstoricGrade } from '../../types';
import { ImportExcelExamen } from './ImportExcelExamen';
import { ImportTutorial } from '../ImportTutorial';

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

    const handleFinalizeExam = async () => {
        const admisiCount = props.inscrieri.filter(i => i.rezultat === 'Admis').length;
        if (admisiCount === 0) {
            if (!confirm("Atenție: Niciun sportiv nu este marcat ca 'Admis'. Dacă nu ați salvat rezultatele, vă rugăm să o faceți înainte de a finaliza examenul. Doriți să continuați finalizarea oricum?")) {
                return;
            }
        } else {
            if (!confirm("Această acțiune este ireversibilă. Se va marca examenul ca finalizat și se vor actualiza gradele sportivilor admiși. Doriți să continuați?")) {
                return;
            }
        }
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
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button variant="secondary" onClick={() => setIsTutorialOpen(true)} title="Ghid import XLS">
                            <BookOpenIcon className="w-4 h-4" />
                        </Button>
                        <Button variant="secondary" onClick={() => setIsImportOpen(true)} title="Import din fișier XLS (Ex. Local sau Examen de Grad)">
                            <UploadCloudIcon className="w-4 h-4 mr-2" /> Import XLS
                        </Button>
                        <Button variant="secondary" onClick={props.onEdit}>
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
        </div>
    );
};
