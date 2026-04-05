/**
 * ImportTutorial.tsx
 *
 * Ghid complet pentru adăugarea sportivilor în sesiunile de examen.
 * Acoperă 2 fluxuri:
 *   A) Import Sportivi (buton „Import Sportivi") — wizard CSV 2 pași
 *   B) Import XLS (buton „Import XLS") — fișiere oficiale federație
 *
 * Poate fi afișat ca pagină întreagă (onBack prezent) sau ca modal (asModal + onClose).
 */

import React, { useState } from 'react';
import {
    ArrowLeftIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XCircleIcon,
    BookOpenIcon,
    UploadCloudIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    UserPlusIcon,
} from './icons';
import { Button, Modal } from './ui';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ImportTutorialProps {
    onBack?: () => void;
    asModal?: boolean;
    isOpen?: boolean;
    onClose?: () => void;
}

// ─── Sub-componente ───────────────────────────────────────────────────────────

const Step: React.FC<{ number: number; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
    <div className="flex gap-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold text-sm">
            {number}
        </div>
        <div className="flex-1 pb-6 border-b border-slate-700 last:border-b-0 last:pb-0">
            <h3 className="text-base font-bold text-white mb-2">{title}</h3>
            <div className="text-slate-300 text-sm leading-relaxed space-y-2">{children}</div>
        </div>
    </div>
);

const CollapsibleSection: React.FC<{ title: string; defaultOpen?: boolean; children: React.ReactNode }> = ({
    title, defaultOpen = false, children,
}) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-slate-700 rounded-lg overflow-hidden">
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex justify-between items-center p-4 bg-slate-800 hover:bg-slate-700 transition-colors text-left"
            >
                <span className="font-semibold text-white text-sm">{title}</span>
                {open ? <ChevronUpIcon className="w-4 h-4 text-slate-400" /> : <ChevronDownIcon className="w-4 h-4 text-slate-400" />}
            </button>
            {open && <div className="p-4 bg-slate-900 text-sm">{children}</div>}
        </div>
    );
};

const Badge: React.FC<{ color: 'emerald' | 'amber' | 'rose' | 'sky' | 'slate'; children: React.ReactNode }> = ({ color, children }) => {
    const map = {
        emerald: 'bg-emerald-900/40 border-emerald-700/60 text-emerald-300',
        amber:   'bg-amber-900/40 border-amber-700/60 text-amber-300',
        rose:    'bg-rose-900/40 border-rose-700/60 text-rose-300',
        sky:     'bg-sky-900/40 border-sky-700/60 text-sky-300',
        slate:   'bg-slate-700/60 border-slate-600 text-slate-300',
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${map[color]}`}>
            {children}
        </span>
    );
};

// ─── Conținut tutorial ────────────────────────────────────────────────────────

const TutorialContent: React.FC = () => (
    <div className="space-y-6">

        {/* Introducere */}
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
            <p className="text-slate-300 text-sm leading-relaxed">
                Există <strong className="text-white">două moduri</strong> de a adăuga sportivi la o sesiune de examen,
                în funcție de situație: importul de sportivi noi din CSV sau importul fișierelor oficiale XLS de la federație.
            </p>
        </div>

        {/* ════════════════════════════════════════════════════════ */}
        {/* FLUX A — Import Sportivi (CSV)                          */}
        {/* ════════════════════════════════════════════════════════ */}
        <CollapsibleSection title={'Flux A \u2014 Import Sportivi din CSV (buton \u201eImport Sportivi\u201d)'} defaultOpen>
            <div className="space-y-5">

                <div className="p-3 rounded-lg border border-sky-700/40 bg-sky-900/10 text-sky-200 text-xs">
                    Folosește acest flux când ai o listă de sportivi care nu sunt încă în sistem
                    sau când vrei să-i adaugi rapid la o sesiune cu datele minime (Nume, Prenume, Data nașterii).
                </div>

                {/* Pas 1 */}
                <Step number={1} title="Importă sportivii din fișierul CSV">
                    <p>
                        Apasă butonul{' '}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700 border border-slate-600 rounded text-xs text-white font-semibold">
                            <UserPlusIcon className="w-3 h-3" /> Import Sportivi
                        </span>{' '}
                        din ecranul detalii sesiune.
                    </p>
                    <p>
                        Descarcă <strong className="text-white">șablonul CSV</strong> (butonul „Șablon CSV") și completează-l
                        cu datele sportivilor. Șablonul arată exact ce câmpuri sunt necesare:
                    </p>

                    {/* Tabel format */}
                    <div className="overflow-x-auto mt-2 rounded-lg border border-slate-700">
                        <table className="text-xs w-full border-collapse">
                            <thead className="bg-slate-800">
                                <tr className="border-b border-slate-700">
                                    <th className="text-left py-2 px-3 text-slate-400">Coloană</th>
                                    <th className="text-left py-2 px-3 text-slate-400">Obligatoriu</th>
                                    <th className="text-left py-2 px-3 text-slate-400">Format</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-slate-800">
                                    <td className="py-1.5 px-3 text-white font-medium">Nume</td>
                                    <td className="py-1.5 px-3 text-rose-400 font-bold">DA</td>
                                    <td className="py-1.5 px-3 text-slate-300 font-mono">Text</td>
                                </tr>
                                <tr className="border-b border-slate-800">
                                    <td className="py-1.5 px-3 text-white font-medium">Prenume</td>
                                    <td className="py-1.5 px-3 text-rose-400 font-bold">DA</td>
                                    <td className="py-1.5 px-3 text-slate-300 font-mono">Text</td>
                                </tr>
                                <tr className="border-b border-slate-800">
                                    <td className="py-1.5 px-3 text-white font-medium">Data nasterii</td>
                                    <td className="py-1.5 px-3 text-rose-400 font-bold">DA</td>
                                    <td className="py-1.5 px-3 text-slate-300 font-mono">ZZ/LL/AAAA</td>
                                </tr>
                                <tr>
                                    <td className="py-1.5 px-3 text-white font-medium">Telefon</td>
                                    <td className="py-1.5 px-3 text-slate-500">opțional</td>
                                    <td className="py-1.5 px-3 text-slate-300 font-mono">Număr</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Exemple fictive */}
                    <p className="font-semibold text-white mt-3">Exemplu conținut CSV (date fictive):</p>
                    <div className="overflow-x-auto rounded-lg border border-slate-700">
                        <table className="text-xs w-full border-collapse">
                            <thead className="bg-slate-800">
                                <tr className="border-b border-slate-700">
                                    <th className="text-left py-2 px-3 text-slate-400">Nume</th>
                                    <th className="text-left py-2 px-3 text-slate-400">Prenume</th>
                                    <th className="text-left py-2 px-3 text-slate-400">Data nasterii</th>
                                    <th className="text-left py-2 px-3 text-slate-400">Telefon</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-slate-800">
                                    <td className="py-1.5 px-3 text-white">Ionescu</td>
                                    <td className="py-1.5 px-3 text-white">Alexandru</td>
                                    <td className="py-1.5 px-3 text-slate-300 font-mono">15/03/2015</td>
                                    <td className="py-1.5 px-3 text-slate-500 italic">—</td>
                                </tr>
                                <tr className="border-b border-slate-800">
                                    <td className="py-1.5 px-3 text-white">Popescu</td>
                                    <td className="py-1.5 px-3 text-white">Maria Elena</td>
                                    <td className="py-1.5 px-3 text-slate-300 font-mono">22/07/2018</td>
                                    <td className="py-1.5 px-3 text-slate-500 italic">—</td>
                                </tr>
                                <tr>
                                    <td className="py-1.5 px-3 text-white">Constantin</td>
                                    <td className="py-1.5 px-3 text-white">Andrei Mihai</td>
                                    <td className="py-1.5 px-3 text-slate-300 font-mono">08/11/2012</td>
                                    <td className="py-1.5 px-3 text-slate-300 font-mono">0722123456</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="text-slate-500 text-xs mt-2">
                        Nu include coloane cu ID-uri sau alte date din sistem — acestea sunt generate automat.
                    </p>

                    <p className="mt-3">Sistemul verifică automat fiecare rând:</p>
                    <div className="space-y-2 mt-2">
                        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-900/20 border border-emerald-700/40">
                            <CheckCircleIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <div>
                                <Badge color="emerald">Creat</Badge>
                                <span className="text-slate-300 text-xs ml-2">Sportiv nou — adăugat cu grad Debutant, clubul tău, fără grupă.</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-sky-900/20 border border-sky-700/40">
                            <CheckCircleIcon className="w-4 h-4 text-sky-400 flex-shrink-0" />
                            <div>
                                <Badge color="sky">Existent</Badge>
                                <span className="text-slate-300 text-xs ml-2">Sportivul există deja (același Nume+Prenume+Data nașterii) — ignorat, nu se duplică.</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-rose-900/20 border border-rose-700/40">
                            <XCircleIcon className="w-4 h-4 text-rose-400 flex-shrink-0" />
                            <div>
                                <Badge color="rose">Eroare</Badge>
                                <span className="text-slate-300 text-xs ml-2">Date invalide (câmp lipsă, dată greșită). Nu este adăugat.</span>
                            </div>
                        </div>
                    </div>
                </Step>

                {/* Pas 2 */}
                <Step number={2} title="Adaugă sportivii în sesiunea de examen">
                    <p>
                        După import, sistemul afișează automat lista sportivilor (atât cei creați cât și cei existenți).
                        Selectează <strong className="text-white">gradul susținut</strong> pentru fiecare.
                    </p>
                    <div className="mt-3 p-3 bg-slate-800/60 rounded-lg border border-slate-700 space-y-2">
                        <p className="text-slate-300 text-xs font-bold">Sistemul verifică automat și ignoră:</p>
                        <ul className="list-disc pl-4 space-y-1 text-xs text-slate-400">
                            <li>Sportivii care <strong className="text-amber-300">au deja gradul</strong> respectiv (din istoricul de grade)</li>
                            <li>Sportivii care sunt <strong className="text-amber-300">deja înscriși</strong> în această sesiune</li>
                        </ul>
                    </div>
                    <p className="mt-3">
                        Apasă <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-700 rounded text-xs text-white font-semibold">Adaugă N sportivi în sesiune</span>.
                        Sistemul va genera automat și factura de taxă examen pentru fiecare.
                    </p>
                </Step>

                {/* Raport */}
                <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700">
                    <p className="text-slate-300 text-sm font-bold mb-2">Raport după import:</p>
                    <p className="text-slate-400 text-xs">
                        La finalul fiecărui pas, sistemul afișează un raport complet cu:
                        cine a fost adăugat, cine a fost ignorat și din ce motiv, și cine a avut erori.
                        Nu se creează duplicate indiferent de câte ori rulezi importul.
                    </p>
                </div>
            </div>
        </CollapsibleSection>

        {/* ════════════════════════════════════════════════════════ */}
        {/* FLUX B — Import XLS (fișiere federație)                */}
        {/* ════════════════════════════════════════════════════════ */}
        <CollapsibleSection title={'Flux B \u2014 Import XLS fi\u0219iere federa\u021bie (buton \u201eImport XLS\u201d)'}>
            <div className="space-y-4">

                <div className="p-3 rounded-lg border border-amber-700/40 bg-amber-900/10 text-amber-200 text-xs">
                    Folosește acest flux pentru a importa fișierele oficiale trimise federației după examene.
                    Sistemul recunoaște automat formatul și potrivește sportivii existenți din baza de date.
                </div>

                <div className="space-y-3">
                    <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/10 p-4">
                        <p className="font-bold text-emerald-300 mb-1">Format 1 · Ex. Local (1 sheet)</p>
                        <p className="text-slate-400 text-xs">
                            Fișierul trimis federației după examene locale:{' '}
                            <code className="font-mono text-xs bg-slate-800 px-1 rounded">Phi Hau - Ex. Local - YYYY.MM.DD.xls</code>
                        </p>
                        <p className="text-slate-500 text-xs mt-1">Importă: înscrierea + rezultat (Admis/Respins) + contribuție</p>
                    </div>
                    <div className="rounded-lg border border-blue-700/40 bg-blue-900/10 p-4">
                        <p className="font-bold text-blue-300 mb-1">Format 2 · Examen de Grad (mai multe sheet-uri)</p>
                        <p className="text-slate-400 text-xs">
                            Fișierul cu note individuale:{' '}
                            <code className="font-mono text-xs bg-slate-800 px-1 rounded">examen de grad YYYY.MM.DD.xls</code>
                        </p>
                        <p className="text-slate-400 text-xs mt-1">Fiecare sheet = un grad. Coloane: Nr. · Nume · Prenume · Grad · Tehnică · Doc Luyện · Song Đôi · Thảo Quyền · Notă Generală</p>
                        <p className="text-slate-500 text-xs mt-1">Importă: înscrierea + notele detaliate per disciplină</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-sm font-bold text-white">Cum funcționează — 3 pași</h2>

                    <Step number={1} title="Încarcă fișierul XLS">
                        <p>
                            Apasă{' '}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700 border border-slate-600 rounded text-xs text-white font-semibold">
                                <UploadCloudIcon className="w-3 h-3" /> Import XLS
                            </span>.
                            Trage fișierul <code className="font-mono text-xs bg-slate-800 px-1 rounded">.xls</code> sau{' '}
                            <code className="font-mono text-xs bg-slate-800 px-1 rounded">.xlsx</code> în zona de upload.
                        </p>
                        <p className="text-slate-400 text-xs">Sistemul detectează automat formatul după numărul de sheet-uri.</p>
                    </Step>

                    <Step number={2} title="Verifică potrivirile — rezolvă cazurile nesigure">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-900/20 border border-emerald-700/40">
                                <CheckCircleIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                <div>
                                    <Badge color="emerald">Găsit exact</Badge>
                                    <span className="text-slate-300 text-xs ml-2">Identificat cu certitudine (≥95%). Nicio acțiune.</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-900/20 border border-amber-700/40">
                                <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                <div>
                                    <Badge color="amber">Potrivire nesigură</Badge>
                                    <span className="text-slate-300 text-xs ml-2">Probabil același sportiv, diferențe de scriere. <strong className="text-amber-200">Confirmare manuală.</strong></span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-rose-900/20 border border-rose-700/40">
                                <XCircleIcon className="w-4 h-4 text-rose-400 flex-shrink-0" />
                                <div>
                                    <Badge color="rose">Inexistent</Badge>
                                    <span className="text-slate-300 text-xs ml-2">Nu există în bază. Completează Nume/Prenume/Data nașterii pentru creare.</span>
                                </div>
                            </div>
                        </div>
                    </Step>

                    <Step number={3} title="Confirmă importul">
                        <p>Ecranul de confirmare arată rezumatul și numărul de sportivi de importat.</p>
                        <div className="flex items-start gap-2 mt-3 p-3 bg-amber-900/20 border border-amber-700/40 rounded-lg">
                            <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            <p className="text-amber-200 text-xs">
                                Sportivii marcați <strong>Admis</strong> vor fi înregistrați automat în istoricul de grade.
                                Importul face upsert — rularea de două ori nu creează duplicate.
                            </p>
                        </div>
                    </Step>
                </div>
            </div>
        </CollapsibleSection>

        {/* FAQ */}
        <CollapsibleSection title="Întrebări frecvente">
            <div className="space-y-4 text-sm">
                {[
                    {
                        q: 'Ce grad primesc sportivii importați prin CSV?',
                        a: 'Gradul Debutant (cel cu ordinea 0 în nomenclator). Clubul este setat automat la clubul utilizatorului care face importul. Nu se atribuie nicio grupă.',
                    },
                    {
                        q: 'Cum detectează sistemul că un sportiv există deja?',
                        a: 'Compară Nume + Prenume + Data nașterii (fără diacritice, case-insensitive). Dacă toate trei se potrivesc exact, sportivul este considerat existent și nu se creează duplicat.',
                    },
                    {
                        q: 'Pot importa un sportiv care are deja un grad mai mare decât Debutant?',
                        a: 'Dacă sportivul există deja în sistem, va fi identificat ca „Existent" și nu se modifică nimic din profilul lui. La Pasul 2 poți selecta orice grad susținut.',
                    },
                    {
                        q: 'Ce se întâmplă dacă sportivul are deja gradul pe care vreau să-l testez?',
                        a: 'La Pasul 2, sistemul verifică istoricul de grade. Dacă sportivul are deja gradul respectiv, este trecut automat la „Ignorat — are deja gradul X" și nu este înscris în sesiune.',
                    },
                    {
                        q: 'Pot rula importul de mai multe ori cu același fișier?',
                        a: 'Da. La Pasul 1, sportivii existenți sunt ignorați (nu se dublează). La Pasul 2, sportivii deja înscriși în sesiune sunt ignorați. Este sigur să rulezi de mai ori.',
                    },
                    {
                        q: 'Care e diferența între „Import Sportivi" și „Import XLS"?',
                        a: '„Import Sportivi" (CSV) este pentru adăugarea sportivilor noi în sistem + înscrierea lor în sesiune, cu date minime. „Import XLS" este pentru fișierele oficiale ale federației care conțin deja rezultatele (Admis/Respins) și notele.',
                    },
                ].map(({ q, a }, i) => (
                    <div key={i}>
                        <p className="font-semibold text-white">{q}</p>
                        <p className="text-slate-400 mt-1">{a}</p>
                    </div>
                ))}
            </div>
        </CollapsibleSection>
    </div>
);

// ─── Componenta principală ─────────────────────────────────────────────────────

export const ImportTutorial: React.FC<ImportTutorialProps> = ({ onBack, asModal, isOpen = false, onClose }) => {
    if (asModal && onClose !== undefined) {
        return (
            <Modal isOpen={isOpen} title="Ghid Import — Sesiuni Examene" onClose={onClose}>
                <TutorialContent />
            </Modal>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button onClick={onBack} variant="secondary">
                    <ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi
                </Button>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                        <BookOpenIcon className="w-7 h-7 text-brand-secondary" />
                        Ghid Import — Sesiuni Examene
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Adaugă sportivi în sesiune prin CSV sau fișiere XLS federație.
                    </p>
                </div>
            </div>

            <TutorialContent />

            <div className="pb-8 text-center">
                <Button onClick={onBack} variant="secondary">
                    <ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Gestiune Examene
                </Button>
            </div>
        </div>
    );
};
