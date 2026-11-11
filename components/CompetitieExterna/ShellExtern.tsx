import React from 'react';
import { Button, Select } from '../ui';
import type { ContextAccesExtern } from '../../types';

const ROL_LABEL: Record<string, string> = {
    ADMIN_CLUB: 'Administrator club',
    INSTRUCTOR: 'Instructor',
    REPREZENTANT_COMPETITIE: 'Reprezentant',
};

interface ShellExternProps {
    email: string;
    contexte: ContextAccesExtern[];
    contextActiv: ContextAccesExtern;
    competitieDenumire?: string;
    onSchimbaContext: (ctx: ContextAccesExtern) => void;
    onDeconecteaza: () => void;
    onInapoiLaLista?: () => void;
    children: React.ReactNode;
}

/** Antet minimal (D-10): fără sidebar, meniu sau link spre alte module / competiții. */
export const ShellExtern: React.FC<ShellExternProps> = ({ email, contexte, contextActiv, competitieDenumire, onSchimbaContext, onDeconecteaza, onInapoiLaLista, children }) => (
    <div className="min-h-screen bg-[var(--t-bg)] text-[var(--t-text)]">
        <header className="border-b border-[var(--t-border)] bg-[var(--t-surface)]">
            <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide opacity-70">Acces competiție</p>
                    <p className="font-bold truncate">{competitieDenumire ?? 'Competiții'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div className="text-right">
                        <p className="font-semibold">{contextActiv.clubNume} · {ROL_LABEL[contextActiv.rol] ?? contextActiv.rol}</p>
                        <p className="text-xs opacity-70">{email}</p>
                    </div>
                    {contexte.length > 1 && (
                        <div className="w-56">
                            <Select
                                aria-label="Schimbă contextul"
                                value={contextActiv.roleRowId}
                                onChange={e => { const c = contexte.find(x => x.roleRowId === e.target.value); if (c) onSchimbaContext(c); }}
                            >
                                {contexte.map(c => (
                                    <option key={c.roleRowId} value={c.roleRowId}>{c.clubNume} · {ROL_LABEL[c.rol] ?? c.rol}</option>
                                ))}
                            </Select>
                        </div>
                    )}
                    {onInapoiLaLista && <Button variant="secondary" size="sm" onClick={onInapoiLaLista}>Toate competițiile</Button>}
                    <Button variant="secondary" size="sm" onClick={onDeconecteaza}>Deconectare</Button>
                </div>
            </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
);
