import React from 'react';
import { Card, Button } from '../ui';
import { EditIcon } from '../icons';
import { ManagementInscrieri } from '../ManagementInscrieri';
import { SesiuneExamen, InscriereExamen, Sportiv, Grad, Locatie, Plata, PretConfig, User, DecontFederatie, IstoricGrade } from '../../types';

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
    onViewSportiv: (sportiv: Sportiv) => void;
    onEdit: () => void;
    currentUser: User;
    onFinalize: (id: string) => Promise<boolean | undefined>;
    isFinalizing: boolean;
    isReadOnly?: boolean;
}

export const DetaliiSesiune: React.FC<DetaliiSesiuneProps> = (props) => {
    const handleFinalizeExam = async () => {
        if (!window.confirm("Această acțiune este ireversibilă. Se va marca examenul ca finalizat și se va genera decontul pentru federație. Doriți să continuați?")) {
            return;
        }
        await props.onFinalize(props.sesiune.id);
    };
    
    return (
        <Card>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-2xl font-bold text-white">{props.sesiune.locatie_nume || (props.locatii || []).find(l => l.id === props.sesiune.locatie_id)?.nume} - {new Date((props.sesiune.data || props.sesiune.data_examen || '').toString().slice(0, 10) + 'T00:00:00').toLocaleDateString('ro-RO')}</h3>
                    <p className="text-slate-400 mb-2">Comisia: {Array.isArray(props.sesiune.comisia) ? props.sesiune.comisia.join(', ') : props.sesiune.comisia}</p>
                     {props.sesiune.status === 'Finalizat' ? (
                        <span className="px-3 py-1 text-sm font-bold text-green-300 bg-green-900/50 border border-green-700/50 rounded-full">Finalizat</span>
                    ) : (
                        <span className="px-3 py-1 text-sm font-bold text-sky-300 bg-sky-900/50 border border-sky-700/50 rounded-full">Programat</span>
                    )}
                </div>
                 {props.sesiune.status !== 'Finalizat' && !props.isReadOnly && (
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button variant="secondary" onClick={props.onEdit}>
                            <EditIcon className="w-4 h-4 mr-2" /> Editează
                        </Button>
                        <Button variant="success" onClick={handleFinalizeExam} isLoading={props.isFinalizing}>
                            Finalizează & Generează Decont
                        </Button>
                    </div>
                )}
            </div>
            
            <ManagementInscrieri {...props} />
        </Card>
    );
};
