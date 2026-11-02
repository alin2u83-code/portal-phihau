import React from 'react';
import { Modal, Button, Badge } from '../ui';
import { formatTime } from '../../utils/date';

export const HistoryModal: React.FC<{ isOpen: boolean; onClose: () => void; istoric: any[] }> = ({ isOpen, onClose, istoric }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Istoric Complet Prezențe">
            <div className="max-h-[60vh] overflow-y-auto pr-2">
                {istoric.length === 0 ? (
                    <p className="text-sm text-[var(--t-text-muted)] text-center py-8">Nu există date.</p>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[var(--t-surface-2)] text-[var(--t-text-muted)] sticky top-0">
                            <tr>
                                <th className="p-3 font-semibold">Data</th>
                                <th className="p-3 font-semibold">Ora</th>
                                <th className="p-3 font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--t-border)]">
                            {istoric.map((row) => {
                                const st = row.status?.toLowerCase();
                                return (
                                    <tr key={row.id || `${(row.data || '').toString().slice(0, 10)}-${row.ora_start}`}>
                                        <td className="p-3 text-[var(--t-text)]">{new Date((row.data || '').toString().slice(0, 10)).toLocaleDateString('ro-RO')}</td>
                                        <td className="p-3 text-[var(--t-text-muted)]">{formatTime(row.ora_start)}</td>
                                        <td className="p-3">
                                            <Badge variant={st === 'prezent' ? 'green' : st === 'absent' ? 'red' : 'slate'}>{row.status}</Badge>
                                        </td>
                                    </tr>
                                );
                            })}
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
