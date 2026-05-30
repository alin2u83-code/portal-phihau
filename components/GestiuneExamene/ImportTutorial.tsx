/**
 * ImportTutorial.tsx
 *
 * Ghid complet pentru adÄƒugarea sportivilor Ã®n sesiunile de examen.
 * AcoperÄƒ 2 fluxuri:
 *   A) Import Sportivi (buton â€žImport Sportivi") â€” wizard CSV 2 paÈ™i
 *   B) Import XLS (buton â€žImport XLS") â€” fiÈ™iere oficiale federaÈ›ie
 *
 * Poate fi afiÈ™at ca paginÄƒ Ã®ntreagÄƒ (onBack prezent) sau ca modal (asModal + onClose).
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
} from '../icons';
import { Button, Modal } from '../ui';

// â”€â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ImportTutorialProps {
    onBack?: () => void;
    asModal?: boolean;
    isOpen?: boolean;
    onClose?: () => void;
}

// â”€â”€â”€ Sub-componente â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ ConÈ›inut tutorial â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TutorialContent: React.FC = () => (
    <div className="space-y-6">

        {/* Introducere */}
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
            <p className="text-slate-300 text-sm leading-relaxed">
                ExistÄƒ <strong className="text-white">douÄƒ moduri</strong> de a adÄƒuga sportivi la o sesiune de examen,
                Ã®n funcÈ›ie de situaÈ›ie: importul de sportivi noi din CSV sau importul fiÈ™ierelor oficiale XLS de la federaÈ›ie.
            </p>
        </div>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {/* FLUX A â€” Import Sportivi (CSV)                          */}
        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <CollapsibleSection title={'Flux A \u2014 Import Sportivi din CSV (buton \u201eImport Sportivi\u201d)'} defaultOpen>
            <div className="space-y-5">

                <div className="p-3 rounded-lg border border-sky-700/40 bg-sky-900/10 text-sky-200 text-xs">
                    FoloseÈ™te acest flux cÃ¢nd ai o listÄƒ de sportivi care nu sunt Ã®ncÄƒ Ã®n sistem
                    sau cÃ¢nd vrei sÄƒ-i adaugi rapid la o sesiune cu datele minime (Nume, Prenume, Data naÈ™terii).
                </div>

                {/* Pas 1 */}
                <Step number={1} title="ImportÄƒ sportivii din fiÈ™ierul CSV">
                    <p>
                        ApasÄƒ butonul{' '}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700 border border-slate-600 rounded text-xs text-white font-semibold">
                            <UserPlusIcon className="w-3 h-3" /> Import Sportivi
                        </span>{' '}
                        din ecranul detalii sesiune.
                    </p>
                    <p>
                        DescarcÄƒ <strong className="text-white">È™ablonul CSV</strong> (butonul â€žÈ˜ablon CSV") È™i completeazÄƒ-l
                        cu datele sportivilor. È˜ablonul aratÄƒ exact ce cÃ¢mpuri sunt necesare:
                    </p>

                    {/* Tabel format */}
                    <div className="overflow-x-auto mt-2 rounded-lg border border-slate-700">
                        <table className="text-xs w-full border-collapse">
                            <thead className="bg-slate-800">
                                <tr className="border-b border-slate-700">
                                    <th className="text-left py-2 px-3 text-slate-400">ColoanÄƒ</th>
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
                                    <td className="py-1.5 px-3 text-slate-500">opÈ›ional</td>
                                    <td className="py-1.5 px-3 text-slate-300 font-mono">NumÄƒr</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Exemple fictive */}
                    <p className="font-semibold text-white mt-3">Exemplu conÈ›inut CSV (date fictive):</p>
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
                                    <td className="py-1.5 px-3 text-slate-500 italic">â€”</td>
                                </tr>
                                <tr className="border-b border-slate-800">
                                    <td className="py-1.5 px-3 text-white">Popescu</td>
                                    <td className="py-1.5 px-3 text-white">Maria Elena</td>
                                    <td className="py-1.5 px-3 text-slate-300 font-mono">22/07/2018</td>
                                    <td className="py-1.5 px-3 text-slate-500 italic">â€”</td>
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
                        Nu include coloane cu ID-uri sau alte date din sistem â€” acestea sunt generate automat.
                    </p>

                    <p className="mt-3">Sistemul verificÄƒ automat fiecare rÃ¢nd:</p>
                    <div className="space-y-2 mt-2">
                        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-900/20 border border-emerald-700/40">
                            <CheckCircleIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <div>
                                <Badge color="emerald">Creat</Badge>
                                <span className="text-slate-300 text-xs ml-2">Sportiv nou â€” adÄƒugat cu grad Debutant, clubul tÄƒu, fÄƒrÄƒ grupÄƒ.</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-sky-900/20 border border-sky-700/40">
                            <CheckCircleIcon className="w-4 h-4 text-sky-400 flex-shrink-0" />
                            <div>
                                <Badge color="sky">Existent</Badge>
                                <span className="text-slate-300 text-xs ml-2">Sportivul existÄƒ deja (acelaÈ™i Nume+Prenume+Data naÈ™terii) â€” ignorat, nu se duplicÄƒ.</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-rose-900/20 border border-rose-700/40">
                            <XCircleIcon className="w-4 h-4 text-rose-400 flex-shrink-0" />
                            <div>
                                <Badge color="rose">Eroare</Badge>
                                <span className="text-slate-300 text-xs ml-2">Date invalide (cÃ¢mp lipsÄƒ, datÄƒ greÈ™itÄƒ). Nu este adÄƒugat.</span>
                            </div>
                        </div>
                    </div>
                </Step>

                {/* Pas 2 */}
                <Step number={2} title="AdaugÄƒ sportivii Ã®n sesiunea de examen">
                    <p>
                        DupÄƒ import, sistemul afiÈ™eazÄƒ automat lista sportivilor (atÃ¢t cei creaÈ›i cÃ¢t È™i cei existenÈ›i).
                        SelecteazÄƒ <strong className="text-white">gradul susÈ›inut</strong> pentru fiecare.
                    </p>
                    <div className="mt-3 p-3 bg-slate-800/60 rounded-lg border border-slate-700 space-y-2">
                        <p className="text-slate-300 text-xs font-bold">Sistemul verificÄƒ automat È™i ignorÄƒ:</p>
                        <ul className="list-disc pl-4 space-y-1 text-xs text-slate-400">
                            <li>Sportivii care <strong className="text-amber-300">au deja gradul</strong> respectiv (din istoricul de grade)</li>
                            <li>Sportivii care sunt <strong className="text-amber-300">deja Ã®nscriÈ™i</strong> Ã®n aceastÄƒ sesiune</li>
                        </ul>
                    </div>
                    <p className="mt-3">
                        ApasÄƒ <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-700 rounded text-xs text-white font-semibold">AdaugÄƒ N sportivi Ã®n sesiune</span>.
                        Sistemul va genera automat È™i factura de taxÄƒ examen pentru fiecare.
                    </p>
                </Step>

                {/* Raport */}
                <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700">
                    <p className="text-slate-300 text-sm font-bold mb-2">Raport dupÄƒ import:</p>
                    <p className="text-slate-400 text-xs">
                        La finalul fiecÄƒrui pas, sistemul afiÈ™eazÄƒ un raport complet cu:
                        cine a fost adÄƒugat, cine a fost ignorat È™i din ce motiv, È™i cine a avut erori.
                        Nu se creeazÄƒ duplicate indiferent de cÃ¢te ori rulezi importul.
                    </p>
                </div>
            </div>
        </CollapsibleSection>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {/* FLUX B â€” Import XLS (fiÈ™iere federaÈ›ie)                */}
        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <CollapsibleSection title={'Flux B \u2014 Import XLS fi\u0219iere federa\u021bie (buton \u201eImport XLS\u201d)'}>
            <div className="space-y-4">

                <div className="p-3 rounded-lg border border-amber-700/40 bg-amber-900/10 text-amber-200 text-xs">
                    FoloseÈ™te acest flux pentru a importa fiÈ™ierele oficiale trimise federaÈ›iei dupÄƒ examene.
                    Sistemul recunoaÈ™te automat formatul È™i potriveÈ™te sportivii existenÈ›i din baza de date.
                </div>

                <div className="space-y-3">
                    <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/10 p-4">
                        <p className="font-bold text-emerald-300 mb-1">Format 1 Â· Ex. Local (1 sheet)</p>
                        <p className="text-slate-400 text-xs">
                            FiÈ™ierul trimis federaÈ›iei dupÄƒ examene locale:{' '}
                            <code className="font-mono text-xs bg-slate-800 px-1 rounded">Phi Hau - Ex. Local - YYYY.MM.DD.xls</code>
                        </p>
                        <p className="text-slate-500 text-xs mt-1">ImportÄƒ: Ã®nscrierea + rezultat (Admis/Respins) + contribuÈ›ie</p>
                    </div>
                    <div className="rounded-lg border border-blue-700/40 bg-blue-900/10 p-4">
                        <p className="font-bold text-blue-300 mb-1">Format 2 Â· Examen de Grad (mai multe sheet-uri)</p>
                        <p className="text-slate-400 text-xs">
                            FiÈ™ierul cu note individuale:{' '}
                            <code className="font-mono text-xs bg-slate-800 px-1 rounded">examen de grad YYYY.MM.DD.xls</code>
                        </p>
                        <p className="text-slate-400 text-xs mt-1">Fiecare sheet = un grad. Coloane: Nr. Â· Nume Â· Prenume Â· Grad Â· TehnicÄƒ Â· Doc Luyá»‡n Â· Song ÄÃ´i Â· Tháº£o Quyá»n Â· NotÄƒ GeneralÄƒ</p>
                        <p className="text-slate-500 text-xs mt-1">ImportÄƒ: Ã®nscrierea + notele detaliate per disciplinÄƒ</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-sm font-bold text-white">Cum funcÈ›ioneazÄƒ â€” 3 paÈ™i</h2>

                    <Step number={1} title="ÃŽncarcÄƒ fiÈ™ierul XLS">
                        <p>
                            ApasÄƒ{' '}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700 border border-slate-600 rounded text-xs text-white font-semibold">
                                <UploadCloudIcon className="w-3 h-3" /> Import XLS
                            </span>.
                            Trage fiÈ™ierul <code className="font-mono text-xs bg-slate-800 px-1 rounded">.xls</code> sau{' '}
                            <code className="font-mono text-xs bg-slate-800 px-1 rounded">.xlsx</code> Ã®n zona de upload.
                        </p>
                        <p className="text-slate-400 text-xs">Sistemul detecteazÄƒ automat formatul dupÄƒ numÄƒrul de sheet-uri.</p>
                    </Step>

                    <Step number={2} title="VerificÄƒ potrivirile â€” rezolvÄƒ cazurile nesigure">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-900/20 border border-emerald-700/40">
                                <CheckCircleIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                <div>
                                    <Badge color="emerald">GÄƒsit exact</Badge>
                                    <span className="text-slate-300 text-xs ml-2">Identificat cu certitudine (â‰¥95%). Nicio acÈ›iune.</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-900/20 border border-amber-700/40">
                                <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                <div>
                                    <Badge color="amber">Potrivire nesigurÄƒ</Badge>
                                    <span className="text-slate-300 text-xs ml-2">Probabil acelaÈ™i sportiv, diferenÈ›e de scriere. <strong className="text-amber-200">Confirmare manualÄƒ.</strong></span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-rose-900/20 border border-rose-700/40">
                                <XCircleIcon className="w-4 h-4 text-rose-400 flex-shrink-0" />
                                <div>
                                    <Badge color="rose">Inexistent</Badge>
                                    <span className="text-slate-300 text-xs ml-2">Nu existÄƒ Ã®n bazÄƒ. CompleteazÄƒ Nume/Prenume/Data naÈ™terii pentru creare.</span>
                                </div>
                            </div>
                        </div>
                    </Step>

                    <Step number={3} title="ConfirmÄƒ importul">
                        <p>Ecranul de confirmare aratÄƒ rezumatul È™i numÄƒrul de sportivi de importat.</p>
                        <div className="flex items-start gap-2 mt-3 p-3 bg-amber-900/20 border border-amber-700/40 rounded-lg">
                            <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            <p className="text-amber-200 text-xs">
                                Sportivii marcaÈ›i <strong>Admis</strong> vor fi Ã®nregistraÈ›i automat Ã®n istoricul de grade.
                                Importul face upsert â€” rularea de douÄƒ ori nu creeazÄƒ duplicate.
                            </p>
                        </div>
                    </Step>
                </div>
            </div>
        </CollapsibleSection>

        {/* FAQ */}
        <CollapsibleSection title="ÃŽntrebÄƒri frecvente">
            <div className="space-y-4 text-sm">
                {[
                    {
                        q: 'Ce grad primesc sportivii importaÈ›i prin CSV?',
                        a: 'Gradul Debutant (cel cu ordinea 0 Ã®n nomenclator). Clubul este setat automat la clubul utilizatorului care face importul. Nu se atribuie nicio grupÄƒ.',
                    },
                    {
                        q: 'Cum detecteazÄƒ sistemul cÄƒ un sportiv existÄƒ deja?',
                        a: 'ComparÄƒ Nume + Prenume + Data naÈ™terii (fÄƒrÄƒ diacritice, case-insensitive). DacÄƒ toate trei se potrivesc exact, sportivul este considerat existent È™i nu se creeazÄƒ duplicat.',
                    },
                    {
                        q: 'Pot importa un sportiv care are deja un grad mai mare decÃ¢t Debutant?',
                        a: 'DacÄƒ sportivul existÄƒ deja Ã®n sistem, va fi identificat ca â€žExistent" È™i nu se modificÄƒ nimic din profilul lui. La Pasul 2 poÈ›i selecta orice grad susÈ›inut.',
                    },
                    {
                        q: 'Ce se Ã®ntÃ¢mplÄƒ dacÄƒ sportivul are deja gradul pe care vreau sÄƒ-l testez?',
                        a: 'La Pasul 2, sistemul verificÄƒ istoricul de grade. DacÄƒ sportivul are deja gradul respectiv, este trecut automat la â€žIgnorat â€” are deja gradul X" È™i nu este Ã®nscris Ã®n sesiune.',
                    },
                    {
                        q: 'Pot rula importul de mai multe ori cu acelaÈ™i fiÈ™ier?',
                        a: 'Da. La Pasul 1, sportivii existenÈ›i sunt ignoraÈ›i (nu se dubleazÄƒ). La Pasul 2, sportivii deja Ã®nscriÈ™i Ã®n sesiune sunt ignoraÈ›i. Este sigur sÄƒ rulezi de mai ori.',
                    },
                    {
                        q: 'Care e diferenÈ›a Ã®ntre â€žImport Sportivi" È™i â€žImport XLS"?',
                        a: 'â€žImport Sportivi" (CSV) este pentru adÄƒugarea sportivilor noi Ã®n sistem + Ã®nscrierea lor Ã®n sesiune, cu date minime. â€žImport XLS" este pentru fiÈ™ierele oficiale ale federaÈ›iei care conÈ›in deja rezultatele (Admis/Respins) È™i notele.',
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

// â”€â”€â”€ Componenta principalÄƒ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const ImportTutorial: React.FC<ImportTutorialProps> = ({ onBack, asModal, isOpen = false, onClose }) => {
    if (asModal && onClose !== undefined) {
        return (
            <Modal isOpen={isOpen} title="Ghid Import â€” Sesiuni Examene" onClose={onClose}>
                <TutorialContent />
            </Modal>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button onClick={onBack} variant="secondary">
                    <ArrowLeftIcon className="w-5 h-5 mr-2" /> ÃŽnapoi
                </Button>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                        <BookOpenIcon className="w-7 h-7 text-brand-secondary" />
                        Ghid Import â€” Sesiuni Examene
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        AdaugÄƒ sportivi Ã®n sesiune prin CSV sau fiÈ™iere XLS federaÈ›ie.
                    </p>
                </div>
            </div>

            <TutorialContent />

            <div className="pb-8 text-center">
                <Button onClick={onBack} variant="secondary">
                    <ArrowLeftIcon className="w-5 h-5 mr-2" /> ÃŽnapoi la Gestiune Examene
                </Button>
            </div>
        </div>
    );
};

