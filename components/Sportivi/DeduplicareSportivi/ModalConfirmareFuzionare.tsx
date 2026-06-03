import React from 'react';
import { Button, Modal } from '../../ui';
import { ExclamationTriangleIcon, UserCheckIcon, UserXIcon, TransferIcon } from '../../icons';
import { PereacheDuplicat } from './types';

export const ModalConfirmareFuzionare: React.FC<{
    isOpen: boolean;
    pereche: PereacheDuplicat | null;
    primarId: string;
    gradeMap: Record<string, string>;
    onConfirma: () => void;
    onAnuleaza: () => void;
    inProgres: boolean;
}> = ({ isOpen, pereche, primarId, gradeMap, onConfirma, onAnuleaza, inProgres }) => {
    if (!pereche) return null;

    const primar   = pereche.sportiv_a.id === primarId ? pereche.sportiv_a : pereche.sportiv_b;
    const secundar = pereche.sportiv_a.id === primarId ? pereche.sportiv_b : pereche.sportiv_a;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onAnuleaza}
            title="Confirmare fuzionare conturi"
            persistent={inProgres}
        >
            <div className="space-y-5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-amber-300">Actiune ireversibila</p>
                        <p className="text-xs text-amber-400/80 mt-1">
                            Toate relatiile (plati, examene, prezente, grade etc.) vor fi transferate
                            la contul primar. Contul secundar va fi dezactivat.
                        </p>
                    </div>
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <UserCheckIcon className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                            Contul primar (se pastreaza)
                        </span>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                        <p className="text-sm font-bold text-white">{primar.prenume} {primar.nume}</p>
                        <p className="text-xs text-slate-400 mt-1">
                            {primar.data_nasterii || 'fara data nastere'} · {primar.email || 'fara email'}
                        </p>
                        {primar.grad_actual_id && (
                            <p className="text-xs text-sky-400 mt-1">
                                Grad: {gradeMap[primar.grad_actual_id] || '—'}
                            </p>
                        )}
                        {primar.user_id && (
                            <p className="text-xs text-emerald-400 mt-1">Are cont de autentificare activ</p>
                        )}
                    </div>
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <UserXIcon className="h-4 w-4 text-rose-400" />
                        <span className="text-xs font-bold text-rose-400 uppercase tracking-wide">
                            Contul secundar (se dezactiveaza)
                        </span>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                        <p className="text-sm font-bold text-white">{secundar.prenume} {secundar.nume}</p>
                        <p className="text-xs text-slate-400 mt-1">
                            {secundar.data_nasterii || 'fara data nastere'} · {secundar.email || 'fara email'}
                        </p>
                        {secundar.grad_actual_id && (
                            <p className="text-xs text-sky-400 mt-1">
                                Grad: {gradeMap[secundar.grad_actual_id] || '—'}
                            </p>
                        )}
                    </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-700/40 border border-slate-600/40 text-xs text-slate-400">
                    Datele lipsa din contul primar (CNP, email, data nasterii, telefon, grad etc.)
                    vor fi completate automat din contul secundar.
                </div>

                <div className="flex gap-3 pt-1">
                    <button
                        type="button"
                        onClick={onAnuleaza}
                        disabled={inProgres}
                        className="
                            flex-1 py-2.5 px-4 rounded-xl border border-slate-600 text-slate-300
                            hover:border-slate-500 hover:text-white transition-colors text-sm font-medium
                            disabled:opacity-50 disabled:cursor-not-allowed
                        "
                    >
                        Anuleaza
                    </button>
                    <Button
                        variant="warning"
                        onClick={onConfirma}
                        isLoading={inProgres}
                        disabled={inProgres}
                        className="flex-1"
                    >
                        <TransferIcon className="h-4 w-4 mr-2" />
                        Confirma fuzionarea
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
