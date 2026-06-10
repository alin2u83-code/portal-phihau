import React, { useState, useEffect } from 'react';
import { Button, Modal } from '../ui';
import { ComisieEditor } from './ComisieEditor';
import { SesiuneExamen, InscriereExamen, Grad } from '../../types';
import { generateNotare, generateValidare } from '../../services/exportExamenService';

export const ExportExamenModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    sesiune: SesiuneExamen;
    inscrieri: InscriereExamen[];
    grade: Grad[];
}> = ({ isOpen, onClose, sesiune, inscrieri, grade }) => {
    const [comisie, setComisie] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            setComisie(Array.isArray(sesiune.comisia) ? [...sesiune.comisia] : []);
        }
    }, [isOpen, sesiune.comisia]);

    const participanti = inscrieri.filter(i => i.sesiune_id === sesiune.id && i.grad_sustinut_id != null);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Export Fișe Examen">
            <div className="space-y-5">
                <div className="p-3 rounded-xl bg-slate-700/40 border border-slate-600/40 text-xs text-slate-400">
                    {participanti.length === 0 ? (
                        <span className="text-amber-400">Niciun participant înscris în această sesiune.</span>
                    ) : (
                        <span>
                            Se va genera fișa pentru{' '}
                            <span className="text-white font-semibold">{participanti.length}</span>{' '}
                            participant{participanti.length !== 1 ? 'i' : ''} înscris{participanti.length !== 1 ? 'i' : ''}.
                        </span>
                    )}
                </div>

                <ComisieEditor membri={comisie} setMembri={setComisie} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-700">
                    <div className="flex flex-col gap-1">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Fișă Notare</p>
                        <p className="text-xs text-slate-500 mb-2">
                            Format federație — coloane note individuale (Tehnica, Doc, Song, Thao, Nota generala)
                        </p>
                        <Button
                            variant="secondary"
                            onClick={() => generateNotare(sesiune, participanti, grade, comisie)}
                            disabled={participanti.length === 0}
                            className="w-full justify-center"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Descarcă Fișă Notare
                        </Button>
                    </div>

                    <div className="flex flex-col gap-1">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Fișă Validare</p>
                        <p className="text-xs text-slate-500 mb-2">
                            Format local — Admis/Respins, Contributia, Observații
                        </p>
                        <Button
                            variant="secondary"
                            onClick={() => generateValidare(sesiune, participanti, grade, comisie)}
                            disabled={participanti.length === 0}
                            className="w-full justify-center"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Descarcă Fișă Validare
                        </Button>
                    </div>
                </div>

                <div className="flex justify-end pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="py-2 px-5 rounded-xl border border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white transition-colors text-sm font-medium"
                    >
                        Închide
                    </button>
                </div>
            </div>
        </Modal>
    );
};
