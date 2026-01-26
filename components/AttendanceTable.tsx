import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Grupa, Grad, User } from '../types';
import { Card, Select, Switch, Button } from './ui';
import { ArrowLeftIcon } from './icons';
import { useError } from './ErrorProvider';

interface AttendanceRecord {
    sportiv_id: string;
    nume: string;
    prenume: string;
    grad_nume: string | null;
    grupa_id: string;
    grupa_nume: string;
    antrenament_id: string;
    is_prezent: boolean;
}

interface AttendanceTableProps {
    grupe: Grupa[];
    grade: Grad[];
    currentUser: User;
    onBack: () => void;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({ grupe, grade, currentUser, onBack }) => {
    const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedGrupaId, setSelectedGrupaId] = useState('');
    const { showError, showSuccess } = useError();

    const fetchData = useCallback(async () => {
        setLoading(true);
        if (!supabase) {
            showError("Eroare Conexiune", "Clientul Supabase nu este initializat.");
            setLoading(false);
            return;
        }

        const { data, error } = await supabase.from('sumar_prezenta_astazi').select('*');

        if (error) {
            showError("Eroare la încărcarea datelor", "View-ul `sumar_prezenta_astazi` nu a putut fi accesat. Asigurați-vă că există în baza de date și că permisiunile RLS sunt corecte.");
            setAttendanceData([]);
        } else {
            const formattedData = (data || []).map(item => ({...item, is_prezent: item.is_prezent ?? false}));
            setAttendanceData(formattedData);
        }
        setLoading(false);
    }, [showError]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleTogglePresence = async (record: AttendanceRecord, newStatus: boolean) => {
        setAttendanceData(prev =>
            prev.map(item =>
                item.sportiv_id === record.sportiv_id && item.antrenament_id === record.antrenament_id
                    ? { ...item, is_prezent: newStatus }
                    : item
            )
        );

        if (newStatus) {
            const { error } = await supabase.from('prezenta_antrenament').upsert(
                { antrenament_id: record.antrenament_id, sportiv_id: record.sportiv_id },
                { onConflict: 'antrenament_id, sportiv_id' }
            );
            if (error) {
                showError("Eroare la salvare", error.message);
                setAttendanceData(prev => prev.map(item => item.sportiv_id === record.sportiv_id ? { ...item, is_prezent: !newStatus } : item));
            }
        } else {
            const { error } = await supabase.from('prezenta_antrenament').delete().match({
                antrenament_id: record.antrenament_id,
                sportiv_id: record.sportiv_id,
            });
            if (error) {
                showError("Eroare la salvare", error.message);
                setAttendanceData(prev => prev.map(item => item.sportiv_id === record.sportiv_id ? { ...item, is_prezent: !newStatus } : item));
            }
        }
    };

    const filteredData = useMemo(() => {
        const sorted = [...attendanceData].sort((a,b) => `${a.nume} ${a.prenume}`.localeCompare(`${b.nume} ${b.prenume}`));
        if (!selectedGrupaId) {
            return sorted;
        }
        return sorted.filter(item => item.grupa_id === selectedGrupaId);
    }, [attendanceData, selectedGrupaId]);
    
    const relevantGrupe = useMemo(() => {
        const groupIdsInData = new Set(attendanceData.map(item => item.grupa_id));
        return grupe.filter(g => groupIdsInData.has(g.id));
    }, [attendanceData, grupe]);

    if (loading) {
        return <div className="text-center p-8">Se încarcă datele de prezență...</div>
    }

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi</Button>
            <h1 className="text-3xl font-bold text-white">Pontaj Prezență Astăzi</h1>

            <Card>
                <Select
                    label="Filtrează după grupă"
                    value={selectedGrupaId}
                    onChange={e => setSelectedGrupaId(e.target.value)}
                >
                    <option value="">Toate Grupele de Azi</option>
                    {relevantGrupe.map(g => (
                        <option key={g.id} value={g.id}>{g.denumire}</option>
                    ))}
                </Select>
            </Card>

            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-700/50">
                            <tr>
                                <th className="p-4 font-semibold">Nume</th>
                                <th className="p-4 font-semibold hidden md:table-cell">Prenume</th>
                                <th className="p-4 font-semibold">Grad</th>
                                <th className="p-4 font-semibold text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredData.map(record => (
                                <tr key={record.sportiv_id + record.antrenament_id}>
                                    <td className="p-4 font-medium">{record.nume}</td>
                                    <td className="p-4 hidden md:table-cell">{record.prenume}</td>
                                    <td className="p-4 text-sm text-slate-300">{record.grad_nume || 'Începător'}</td>
                                    <td className="p-4 text-right">
                                        <Switch
                                            label={record.is_prezent ? "Prezent" : "Absent"}
                                            name={`presence-${record.sportiv_id}`}
                                            checked={record.is_prezent}
                                            onChange={(e) => handleTogglePresence(record, e.target.checked)}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredData.length === 0 && (
                        <p className="p-8 text-center text-slate-500 italic">
                            Niciun antrenament programat astăzi pentru grupele selectate sau niciun sportiv înscris.
                        </p>
                    )}
                </div>
            </Card>
        </div>
    );
};