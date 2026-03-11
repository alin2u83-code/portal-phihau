import React, { useState, useEffect } from 'react';
import { Sportiv } from '../../types';
import { supabase } from '../../supabaseClient';
import { Modal, Button } from '../ui';
import { ShieldCheckIcon, TrashIcon } from '../icons';

interface DeleteAuditModalProps {
    isOpen: boolean;
    onClose: () => void;
    sportiv: Sportiv;
    onDeactivate: (sportiv: Sportiv) => void;
    onDelete: (sportiv: Sportiv) => void;
}

interface ActivityReport {
    plati: number;
    examene: number;
    prezente: number;
    competitii: number;
}

export const DeleteAuditModal: React.FC<DeleteAuditModalProps> = ({ isOpen, onClose, sportiv, onDeactivate, onDelete }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [report, setReport] = useState<ActivityReport | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && sportiv) {
            const checkSportivActivity = async (sportivId: string) => {
                setIsLoading(true);
                setError(null);
                setReport(null);

                if (!supabase) {
                    setError("Client Supabase neconfigurat.");
                    setIsLoading(false);
                    return;
                }

                try {
                    const [platiRes, participariRes, prezenteRes, rezultateRes] = await Promise.all([
                        supabase.from('plati').select('id', { count: 'exact', head: true }).eq('sportiv_id', sportivId),
                        supabase.from('inscrieri_examene').select('id', { count: 'exact', head: true }).eq('sportiv_id', sportivId),
                        supabase.from('prezenta_antrenament').select('sportiv_id', { count: 'exact', head: true }).eq('sportiv_id', sportivId),
                        supabase.from('rezultate').select('id', { count: 'exact', head: true }).eq('sportiv_id', sportivId)
                    ]);

                    if (platiRes.error) throw platiRes.error;
                    if (participariRes.error) throw participariRes.error;
                    if (prezenteRes.error) throw prezenteRes.error;
                    if (rezultateRes.error) throw rezultateRes.error;

                    setReport({
                        plati: platiRes.count || 0,
                        examene: participariRes.count || 0,
                        prezente: prezenteRes.count || 0,
                        competitii: rezultateRes.count || 0,
                    });
                } catch (err: any) {
                    setError(`Eroare la auditare: ${err.message}`);
                } finally {
                    setIsLoading(false);
                }
            };
            checkSportivActivity(sportiv.id);
        }
    }, [isOpen, sportiv]);
    
    const handleDeactivate = () => {
        onDeactivate(sportiv);
        onClose();
    };

    const handleDelete = () => {
        onDelete(sportiv);
        onClose();
    }

    const totalActivity = report ? report.plati + report.examene + report.prezente + report.competitii : 0;
    const hasActivity = totalActivity > 0;

    const renderContent = () => {
        if (isLoading) {
            return <div className="text-center p-8">Se auditează activitatea sportivului...</div>;
        }
        if (error) {
            return <div className="text-center p-8 text-red-400">{error}</div>;
        }
        if (report) {
            if (hasActivity) {
                return (
                    <div>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-status-warning/20 border border-status-warning/50">
                            <ShieldCheckIcon className="h-6 w-6 text-status-warning" />
                        </div>
                        <div className="mt-3 text-center sm:mt-5">
                            <h3 className="text-lg font-semibold leading-6 text-white" style={{color: '#f59e0b'}}>Ștergere Blocată</h3>
                            <div className="mt-2">
                                <p className="text-sm text-slate-300" style={{ fontSize: '13px' }}>
                                    Sportivul <strong>{sportiv.nume} {sportiv.prenume}</strong> nu poate fi șters definitiv deoarece are un istoric de activitate. Ștergerea ar corupe rapoartele.
                                </p>
                                <div className="my-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700 text-left text-sm">
                                    <h4 className="font-bold mb-2">Raport Activitate:</h4>
                                    <table className="w-full" style={{ fontSize: '13px' }}>
                                        <tbody>
                                            {Object.entries(report).map(([key, value]) => (value as number) > 0 && (
                                                <tr key={key} className="border-b border-slate-700/50 last:border-none">
                                                    <td className="py-1 pr-2 capitalize text-slate-400">{key === 'examene' ? 'Examene' : key === 'competitii' ? 'Competiții' : key}:</td>
                                                    <td className="py-1 font-bold text-right text-white">{value as number} înregistrări</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-sm text-slate-300" style={{ fontSize: '13px' }}>
                                    Opțiunea sigură este să schimbați statusul în <strong>'Inactiv'</strong>. Sportivul nu va mai apărea în liste, dar istoricul său va fi păstrat.
                                </p>
                            </div>
                        </div>
                        <div className="mt-5 sm:mt-6 flex justify-center gap-3">
                            <Button variant="secondary" onClick={onClose}>Anulează</Button>
                            <Button variant="warning" onClick={handleDeactivate}>Dezactivează Sportivul</Button>
                        </div>
                    </div>
                );
            } else {
                return (
                    <div>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-status-danger/20 border border-status-danger/50">
                            <TrashIcon className="h-6 w-6 text-status-danger" />
                        </div>
                        <div className="mt-3 text-center sm:mt-5">
                             <h3 className="text-lg font-semibold leading-6 text-white" style={{color: '#dc2626'}}>Confirmare Ștergere Definitivă</h3>
                             <div className="mt-2">
                                <p className="text-sm text-green-400 font-semibold" style={{ fontSize: '13px' }}>
                                    Acest sportiv nu are nicio activitate înregistrată.
                                </p>
                                <p className="text-sm text-slate-300 mt-2" style={{ fontSize: '13px' }}>
                                    Poate fi șters definitiv din baza de date. Acțiunea este ireversibilă.
                                </p>
                             </div>
                        </div>
                         <div className="mt-5 sm:mt-6 flex justify-center gap-3">
                            <Button variant="secondary" onClick={onClose}>Anulează</Button>
                            <Button variant="danger" onClick={handleDelete}>Da, Șterge Definitiv</Button>
                        </div>
                    </div>
                );
            }
        }
        return null;
    };
    
    // Custom title logic
    let title = "Audit Activitate Sportiv";
    let titleColor = "#3D3D99"; // Default blue
    if (report) {
        if (hasActivity) {
            title = "Audit Activitate Sportiv";
            titleColor = '#f59e0b'; // Yellow
        } else {
            title = "Confirmare Ștergere Definitivă";
            titleColor = '#dc2626'; // Red
        }
    }
    
    // The Modal component doesn't allow dynamic title styling easily,
    // so we override it with an internal header if needed, or just use the title prop.
    // For this implementation, I will just change the text title for simplicity.

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={report ? (hasActivity ? "Audit Activitate Sportiv" : "Confirmare Ștergere Definitivă") : "Audit Activitate Sportiv"}
        >
           {renderContent()}
        </Modal>
    );
};