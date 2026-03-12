import React from 'react';
import { Modal, Button } from '../ui';

export const HistoryModal: React.FC<{ isOpen: boolean; onClose: () => void; istoric: any[] }> = ({ isOpen, onClose, istoric }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Istoric Complet Prezențe">
            <div className="max-h-[60vh] overflow-y-auto pr-2">
                {istoric.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">Nu există date.</p>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-800 text-slate-400 sticky top-0">
                            <tr>
                                <th className="p-3">Data</th>
                                <th className="p-3">Ora</th>
                                <th className="p-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {istoric.map((row) => (
                                <tr key={row.id || `${(row.data || '').toString().slice(0, 10)}-${row.ora_start}`} className="hover:bg-slate-700/50">
                                    <td className="p-3 text-white">{new Date((row.data || '').toString().slice(0, 10)).toLocaleDateString('ro-RO')}</td>
                                    <td className="p-3 text-slate-300">{row.ora_start}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${row.status?.toLowerCase() === 'prezent' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {row.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <div className="mt-4 flex justify-end">
                <Button onClick={onClose} variant="secondary">Închide</Button>
            </div>
        </Modal>
    );
};
