/**
 * ImportTutorial.tsx
 *
 * Ghid pas cu pas pentru importul XLS în sesiunile de examen.
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
    ChevronRightIcon,
} from './icons';
import { Button, Modal } from './ui';

// ─── Props ───────────────────────────────────────────────────────────────────

interface ImportTutorialProps {
    /** Mod pagină întreagă */
    onBack?: () => void;
    /** Mod modal */
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

// Badge-uri vizuale pentru statusuri
const Badge: React.FC<{ color: 'emerald' | 'amber' | 'rose' | 'slate'; children: React.ReactNode }> = ({ color, children }) => {
    const map = {
        emerald: 'bg-emerald-900/40 border-emerald-700/60 text-emerald-300',
        amber:   'bg-amber-900/40 border-amber-700/60 text-amber-300',
        rose:    'bg-rose-900/40 border-rose-700/60 text-rose-300',
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
                Importul XLS îți permite să încarci direct <strong className="text-white">fișierele oficiale de examen</strong> trimise federației,
                fără a re-introduce manual datele. Sistemul recunoaște automat formatul și potrivește sportivii din baza de date.
            </p>
        </div>

        {/* Fișiere suportate */}
        <CollapsibleSection title="Fișiere acceptate — 2 formate" defaultOpen>
            <div className="space-y-4">
                <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/10 p-4">
                    <p className="font-bold text-emerald-300 mb-2">Format 1 · Ex. Local (1 sheet)</p>
                    <p className="text-slate-400 mb-2">
                        Fișierul trimis federației după examene locale: <code className="font-mono text-xs bg-slate-800 px-1 rounded">Phi Hau - Ex. Local - YYYY.MM.DD.xls</code>
                    </p>
                    <div className="overflow-x-auto">
                        <table className="text-xs w-full border-collapse">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left py-1.5 px-2 text-slate-400">Nr.</th>
                                    <th className="text-left py-1.5 px-2 text-slate-400">Nume complet</th>
                                    <th className="text-left py-1.5 px-2 text-slate-400">...</th>
                                    <th className="text-left py-1.5 px-2 text-slate-400">Grad</th>
                                    <th className="text-left py-1.5 px-2 text-slate-400">Admis/Respins</th>
                                    <th className="text-left py-1.5 px-2 text-slate-400">Contribuție</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-slate-800">
                                    <td className="py-1 px-2 text-slate-300 font-mono">1</td>
                                    <td className="py-1 px-2 text-white">Popescu Ion</td>
                                    <td className="py-1 px-2 text-slate-500">...</td>
                                    <td className="py-1 px-2 text-slate-300">2 Câp Roșu</td>
                                    <td className="py-1 px-2 text-emerald-300 font-bold">Admis</td>
                                    <td className="py-1 px-2 text-slate-300">100</td>
                                </tr>
                                <tr>
                                    <td className="py-1 px-2 text-slate-300 font-mono">2</td>
                                    <td className="py-1 px-2 text-white">Ionescu Maria</td>
                                    <td className="py-1 px-2 text-slate-500">...</td>
                                    <td className="py-1 px-2 text-slate-300">1 Câp Roșu</td>
                                    <td className="py-1 px-2 text-rose-300 font-bold">Respins</td>
                                    <td className="py-1 px-2 text-slate-300">100</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="text-slate-500 text-xs mt-2">Importă: înscrierea la sesiune + rezultat (Admis/Respins) + contribuție</p>
                </div>

                <div className="rounded-lg border border-blue-700/40 bg-blue-900/10 p-4">
                    <p className="font-bold text-blue-300 mb-2">Format 2 · Examen de Grad (mai multe sheet-uri)</p>
                    <p className="text-slate-400 mb-2">
                        Fișierul cu note individuale: <code className="font-mono text-xs bg-slate-800 px-1 rounded">examen de grad YYYY.MM.DD.xls</code>
                    </p>
                    <p className="text-slate-400 text-xs">
                        Fiecare sheet = un grad (ex: "1 CR", "2 CR", "C.V 1 CA").<br />
                        Coloane: Nr. · Nume · Prenume · ... · Grad · Tehnică · Doc Luyện · Song Đôi · Thảo Quyền · Notă Generală
                    </p>
                    <p className="text-slate-500 text-xs mt-2">Importă: înscrierea + notele detaliate per disciplină</p>
                </div>

                <div className="flex items-start gap-2 p-3 bg-amber-900/20 border border-amber-700/40 rounded-lg">
                    <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-200 text-xs">
                        Sistemul detectează automat formatul după numărul de sheet-uri. Nu trebuie să faci nicio selecție manuală.
                    </p>
                </div>
            </div>
        </CollapsibleSection>

        {/* Pași */}
        <div className="space-y-6">
            <h2 className="text-base font-bold text-white">Cum funcționează — 3 pași</h2>

            <Step number={1} title="Deschide wizardul și încarcă fișierul">
                <p>
                    Din ecranul detalii sesiune, apasă butonul{' '}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700 border border-slate-600 rounded text-xs text-white font-semibold">
                        <UploadCloudIcon className="w-3 h-3" /> Import XLS
                    </span>.
                </p>
                <p>Trage fișierul <code className="font-mono text-xs bg-slate-800 px-1 rounded">.xls</code> sau <code className="font-mono text-xs bg-slate-800 px-1 rounded">.xlsx</code> în zona de upload sau apasă pentru a-l selecta.</p>
                <p className="text-slate-400 text-xs">Sistemul citește fișierul complet în browser — nu se trimite nicăieri până la confirmare.</p>
            </Step>

            <Step number={2} title="Verifică sportivii — rezolvă potrivirile nesigure">
                <p>
                    Fiecare rând din fișier primește automat un status de potrivire cu baza de date:
                </p>
                <div className="space-y-2 mt-3">
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-900/20 border border-emerald-700/40">
                        <CheckCircleIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <div>
                            <Badge color="emerald">Găsit exact</Badge>
                            <span className="text-slate-300 text-xs ml-2">Sportivul a fost identificat cu certitudine (similaritate ≥95%). Nicio acțiune.</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-900/20 border border-amber-700/40">
                        <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <div>
                            <Badge color="amber">Potrivire nesigură</Badge>
                            <span className="text-slate-300 text-xs ml-2">Probabil același sportiv, dar cu mici diferențe de scriere. <strong className="text-amber-200">Trebuie confirmat manual.</strong></span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-rose-900/20 border border-rose-700/40">
                        <XCircleIcon className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        <div>
                            <Badge color="rose">Inexistent</Badge>
                            <span className="text-slate-300 text-xs ml-2">Sportivul nu există în bază. Completează Nume/Prenume/Data nașterii pentru a-l crea.</span>
                        </div>
                    </div>
                </div>
                <div className="mt-3 p-3 bg-slate-800/60 rounded-lg border border-slate-700">
                    <p className="text-slate-300 text-xs font-bold mb-1">Pentru potriviri nesigure (portocaliu):</p>
                    <ol className="list-decimal pl-4 space-y-1 text-xs text-slate-400">
                        <li>Sistemul afișează câțiva candidați — apasă pe cel corect pentru a-l selecta</li>
                        <li>Dacă niciunul nu e potrivit, apasă <strong className="text-rose-300">→ Creează ca nou</strong></li>
                        <li>Butonul „Continuă" rămâne blocat cât există potriviri nesoluționate</li>
                    </ol>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                    Poți oricând <strong className="text-slate-400">Exclude</strong> un rând dacă nu vrei să fie importat (ex: sportiv prezent accidental în fișier).
                </p>
            </Step>

            <Step number={3} title="Confirmă importul">
                <p>Ecranul de confirmare arată un rezumat:</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                        { label: 'Sportivi de înscris', color: 'text-white' },
                        { label: 'Sportivi noi de creat', color: 'text-rose-400' },
                        { label: 'Admiși', color: 'text-emerald-400' },
                        { label: 'Excluși manual', color: 'text-slate-400' },
                    ].map(({ label, color }) => (
                        <div key={label} className="bg-slate-800 rounded-lg p-2.5">
                            <p className="text-xs text-slate-400">{label}</p>
                            <p className={`text-lg font-bold ${color}`}>—</p>
                        </div>
                    ))}
                </div>
                <p className="mt-3">
                    Apasă <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-700 rounded text-xs text-white font-semibold">Importă N sportivi</span> pentru a finaliza.
                </p>
                <div className="flex items-start gap-2 mt-3 p-3 bg-amber-900/20 border border-amber-700/40 rounded-lg">
                    <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-200 text-xs">
                        Sportivii marcați <strong>Admis</strong> vor fi înregistrați automat în istoricul de grade și gradul lor actual va fi actualizat.
                        Cei marcați <strong>Respins</strong> sunt înscriși la sesiune dar gradul nu se modifică.
                    </p>
                </div>
            </Step>
        </div>

        {/* FAQ */}
        <CollapsibleSection title="Întrebări frecvente">
            <div className="space-y-4 text-sm">
                {[
                    {
                        q: 'Ce se întâmplă dacă un sportiv e deja înscris la această sesiune?',
                        a: 'Importul face upsert (insert sau update). Dacă sportivul există deja în sesiune, datele lui se actualizează cu ce e în fișier (rezultat, contribuție, note). Nu se creează duplicate.',
                    },
                    {
                        q: 'Pot importa același fișier de două ori?',
                        a: 'Da, e sigur. Datorită upsert-ului, a doua rulare suprascrie datele existente — nu dublează înregistrările.',
                    },
                    {
                        q: 'Sistemul nu a găsit niciun sportiv deși există în bază. De ce?',
                        a: 'Probabil diferență mare de scriere (diacritice lipsă, ordine Prenume/Nume inversată, greșeli de tipar). Caută-l manual în lista de candidați la potriviri nesigure sau verifică cum e scris în baza de date.',
                    },
                    {
                        q: 'Ce înseamnă "potrivire nesigură" concret?',
                        a: 'Algoritmul de comparare (Levenshtein) calculează o similaritate între 70% și 94%. Suficient de apropiat pentru a fi probabil același om, dar nu destul de cert pentru potrivire automată.',
                    },
                    {
                        q: 'Pot importa note (Examen de Grad) și rezultate (Ex. Local) pentru aceeași sesiune?',
                        a: 'Da, rulezi importul de două ori: o dată cu fișierul Ex. Local, o dată cu fișierul Examen de Grad. Datele se completează reciproc (upsert).',
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
    // Mod modal
    if (asModal && onClose !== undefined) {
        return (
            <Modal isOpen={isOpen} title="Ghid Import XLS" onClose={onClose}>
                <TutorialContent />
            </Modal>
        );
    }

    // Mod pagină întreagă
    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button onClick={onBack} variant="secondary">
                    <ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi
                </Button>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                        <BookOpenIcon className="w-7 h-7 text-brand-secondary" />
                        Ghid Import XLS
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Import fișiere federație direct în sesiunile de examen.
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
