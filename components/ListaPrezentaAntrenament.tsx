import React, { useMemo } from 'react';
import { Antrenament, AnuntPrezenta, Sportiv, Grad } from '../types';
import { Card, Button } from './ui';
import { ArrowLeftIcon, DocumentArrowDownIcon } from './icons';
import { GradBadge } from '../utils/grades';

interface AttendanceData {
    sportiv: Sportiv;
    anunt: AnuntPrezenta;
    grad: Grad | null;
}

interface ListaPrezentaProps {
    antrenament: Antrenament;
    onBack: () => void;
    allAnunturi: AnuntPrezenta[];
    allSportivi: Sportiv[];
    grade: Grad[];
}

const AttendanceGroup: React.FC<{ title: string; data: AttendanceData[]; colorClass: string }> = ({ title, data, colorClass }) => {
    if (data.length === 0) return null;
    return (
        <div>
            <h3 className={`text-xl font-bold mb-3 p-2 rounded-md ${colorClass}`}>
                {title} ({data.length})
            </h3>
            <div className="space-y-2">
                {data.map(({ sportiv, grad, anunt }) => (
                    <div key={sportiv.id} className="bg-slate-700/50 p-3 rounded-md flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-white">{sportiv.nume} {sportiv.prenume}</p>
                            {anunt.detalii && <p className="text-xs text-slate-400">"{anunt.detalii}"</p>}
                        </div>
                        <GradBadge grad={grad} className="text-[10px]" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export const ListaPrezentaAntrenament: React.FC<ListaPrezentaProps> = ({ antrenament, onBack, allAnunturi, allSportivi, grade }) => {
    
    const attendanceData = useMemo((): AttendanceData[] => {
        return allAnunturi
            .filter(a => a.antrenament_id === antrenament.id)
            .map(anunt => {
                const sportiv = allSportivi.find(s => s.id === anunt.sportiv_id);
                if (!sportiv) return null;
                const grad = grade.find(g => g.id === sportiv.grad_actual_id) || null;
                return { sportiv, anunt, grad };
            })
            .filter((item): item is AttendanceData => item !== null)
            .sort((a, b) => a.sportiv.nume.localeCompare(b.sportiv.nume));
    }, [allAnunturi, allSportivi, grade, antrenament.id]);

    const groupedData = useMemo(() => {
        const confirmati = attendanceData.filter(d => d.anunt.status === 'Confirm');
        const intarziati = attendanceData.filter(d => d.anunt.status === 'Intarziat');
        const absenti = attendanceData.filter(d => d.anunt.status === 'Absent');
        return { confirmati, intarziati, absenti, all: [...confirmati, ...intarziati, ...absenti] };
    }, [attendanceData]);

    const handleExport = () => {
        window.print();
    };

    return (
        <div>
            {/* On-screen view */}
            <div className="no-print">
                <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi</Button>
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Anunțuri Prezență</h2>
                            <p className="text-slate-400">Antrenament {antrenament.grupe?.denumire} - {new Date(antrenament.data + 'T00:00:00').toLocaleDateString('ro-RO')}</p>
                        </div>
                        <Button onClick={handleExport} variant="primary">
                            <DocumentArrowDownIcon className="w-5 h-5 mr-2" /> Export PDF
                        </Button>
                    </div>
                    <div className="space-y-6">
                        <AttendanceGroup title="Prezență Confirmată" data={groupedData.confirmati} colorClass="bg-green-600/20 text-green-300" />
                        <AttendanceGroup title="Întârzieri Anunțate" data={groupedData.intarziati} colorClass="bg-yellow-600/20 text-yellow-300" />
                        <AttendanceGroup title="Absențe Anunțate" data={groupedData.absenti} colorClass="bg-red-600/20 text-red-300" />
                        {attendanceData.length === 0 && (
                            <p className="text-center italic text-slate-400 p-8">Niciun sportiv nu și-a anunțat prezența pentru acest antrenament.</p>
                        )}
                    </div>
                </Card>
            </div>

            {/* Hidden printable view */}
            <div id="lista-prezenta-print-area" className="hidden">
                <h1>Clubul Sportiv QWAN KI DO PHI HAU IAȘI</h1>
                <div className="details">
                    <h2>LISTĂ DE PREZENȚĂ</h2>
                    <p><strong>Grupa:</strong> {antrenament.grupe?.denumire || 'Antrenament Liber'}</p>
                    <p><strong>Data:</strong> {new Date(antrenament.data + 'T00:00:00').toLocaleDateString('ro-RO')}</p>
                    <p><strong>Ora:</strong> {antrenament.ora_start} - {antrenament.ora_sfarsit}</p>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style={{width: '5%'}}>Nr.</th>
                            <th>Nume și Prenume</th>
                            <th>Grad</th>
                            <th>Status Anunțat</th>
                            <th className="signature-col">Semnătură</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedData.all.length > 0 ? (
                            <>
                                {groupedData.confirmati.length > 0 && <tr className="group-header"><td colSpan={5}>PREZENȚI</td></tr>}
                                {groupedData.confirmati.map((item, index) => (
                                    <tr key={item.sportiv.id}>
                                        <td style={{textAlign: 'center'}}>{index + 1}</td>
                                        <td>{item.sportiv.nume} {item.sportiv.prenume}</td>
                                        <td>{item.grad?.nume || 'Începător'}</td>
                                        <td>{item.anunt.status}</td>
                                        <td></td>
                                    </tr>
                                ))}
                                {groupedData.intarziati.length > 0 && <tr className="group-header"><td colSpan={5}>ÎNTÂRZIERI</td></tr>}
                                {groupedData.intarziati.map((item, index) => (
                                    <tr key={item.sportiv.id}>
                                        <td style={{textAlign: 'center'}}>{groupedData.confirmati.length + index + 1}</td>
                                        <td>{item.sportiv.nume} {item.sportiv.prenume}</td>
                                        <td>{item.grad?.nume || 'Începător'}</td>
                                        <td>{item.anunt.status} ({item.anunt.detalii})</td>
                                        <td></td>
                                    </tr>
                                ))}
                                {groupedData.absenti.length > 0 && <tr className="group-header"><td colSpan={5}>ABSENȚI</td></tr>}
                                {groupedData.absenti.map((item, index) => (
                                     <tr key={item.sportiv.id}>
                                        <td style={{textAlign: 'center'}}>{groupedData.confirmati.length + groupedData.intarziati.length + index + 1}</td>
                                        <td>{item.sportiv.nume} {item.sportiv.prenume}</td>
                                        <td>{item.grad?.nume || 'Începător'}</td>
                                        <td>{item.anunt.status}</td>
                                        <td style={{textAlign: 'center', fontStyle: 'italic'}}>(absent)</td>
                                    </tr>
                                ))}
                            </>
                        ) : (
                            <tr>
                                <td colSpan={5} style={{textAlign: 'center', padding: '2rem'}}>Niciun anunț înregistrat pentru acest antrenament.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <div className="signature-area">
                    <span>Instructor,</span>
                    <span>...........................</span>
                </div>
            </div>
        </div>
    );
};
