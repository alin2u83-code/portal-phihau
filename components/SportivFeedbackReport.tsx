import React, { useMemo } from 'react';
// FIX: Replaced deprecated type 'Participare' with 'InscriereExamen'.
import { Sportiv, Antrenament, Grupa, Grad, InscriereExamen, Examen } from '../types';
import { Modal, Button } from './ui';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

// --- Helper Functions ---
const parseDurationToMonths = (durationStr: string): number => { if (!durationStr) return 0; const parts = durationStr.split(' '); if (parts.length < 2) return 0; const value = parseInt(parts[0], 10); const unit = parts[1].toLowerCase(); if (unit.startsWith('lun')) return value; if (unit.startsWith('an')) return value * 12; return 0; };

// --- Icon Components (self-contained for this component) ---
const BadgeIcon: React.FC<{ icon: 'dragon' | 'will' | 'target' | 'chart' }> = ({ icon }) => {
    const icons = {
        dragon: <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.362-3.362A8.287 8.287 0 0012 3c1.232 0 2.417.29 3.5.814m.214 2.228a8.25 8.25 0 00-3.362-3.362M12 3a8.25 8.25 0 00-3.362 3.362" />,
        will: <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.82m5.84-2.56a14.95 14.95 0 00-5.84-2.56m0 0a14.95 14.95 0 00-5.84 2.56m5.84-2.56V4.77a6 6 0 015.84-7.38v4.82" />,
        target: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
        chart: <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    };
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">{icons[icon]}</svg>;
};

// --- Sub-components ---
const StatCard: React.FC<{ title: string, value: string, icon: 'chart' | 'target' }> = ({ title, value, icon }) => (
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 flex items-center gap-4">
        <div className="p-2 bg-blue-100 text-[var(--accent)] rounded-full"><BadgeIcon icon={icon} /></div>
        <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">{title}</p>
            <p className="text-2xl font-bold text-[var(--accent)]">{value}</p>
        </div>
    </div>
);

const Badge: React.FC<{ title: string, description: string, icon: 'dragon' | 'will', earned: boolean }> = ({ title, description, icon, earned }) => (
    <div className={`p-4 rounded-lg border flex items-center gap-4 transition-all ${earned ? 'bg-amber-50 border-amber-300' : 'bg-slate-100 border-slate-200 opacity-50'}`}>
        <div className={`p-3 rounded-full ${earned ? 'bg-amber-400 text-white' : 'bg-slate-200 text-slate-500'}`}><BadgeIcon icon={icon} /></div>
        <div>
            <p className={`font-bold ${earned ? 'text-amber-900' : 'text-slate-600'}`}>{title}</p>
            <p className="text-xs text-slate-500">{description}</p>
        </div>
    </div>
);

interface SportivFeedbackReportProps {
    isOpen: boolean;
    onClose: () => void;
    sportiv: Sportiv;
    antrenamente: Antrenament[];
    grupe: Grupa[];
    grade: Grad[];
    participari: InscriereExamen[];
    examene: Examen[];
}

export const SportivFeedbackReport: React.FC<SportivFeedbackReportProps> = ({ isOpen, onClose, sportiv, antrenamente, grupe, grade, participari, examene }) => {
    
    // --- Data Calculation ---
    const reportData = useMemo(() => {
        // Trainings for the sportiv's group in the last 90 days
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const relevantTrainings = antrenamente.filter(a => a.grupa_id === sportiv.grupa_id && new Date(a.data) >= ninetyDaysAgo);

        // 1. Attendance Rate (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const lastMonthTrainings = relevantTrainings.filter(a => new Date(a.data) >= thirtyDaysAgo);
        const attendedLastMonth = lastMonthTrainings.filter(a => a.sportivi_prezenti_ids.includes(sportiv.id)).length;
        const attendanceRate = lastMonthTrainings.length > 0 ? Math.round((attendedLastMonth / lastMonthTrainings.length) * 100) : 0;

        // 2. Consistency Sparkline (last 8 weeks)
        const weeklyAttendance = Array(8).fill(0).map((_, i) => {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - (7 - i) * 7);
            weekStart.setHours(0,0,0,0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);
            
            const count = relevantTrainings.filter(a => {
                const trainDate = new Date(a.data);
                return trainDate >= weekStart && trainDate < weekEnd && a.sportivi_prezenti_ids.includes(sportiv.id);
            }).length;
            return { name: `S${i+1}`, prezente: count };
        });

        // 3. Badge Calculations
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const trainingsThisMonth = antrenamente.filter(a => a.grupa_id === sportiv.grupa_id && new Date(a.data) >= firstDayOfMonth);
        const attendedThisMonth = trainingsThisMonth.filter(a => a.sportivi_prezenti_ids.includes(sportiv.id)).length;
        const dragonPerseverent = trainingsThisMonth.length > 0 && attendedThisMonth === trainingsThisMonth.length;
        
        const weeklyPresenceFlags = weeklyAttendance.map(w => w.prezente > 0);
        const vointaDeFier = weeklyPresenceFlags.slice(0, -1).join('').includes('false,false,true');

        // 4. Eligibility Message
        const admitted = participari.filter(p => p.sportiv_id === sportiv.id && p.rezultat === 'Admis').sort((a,b) => new Date(examene.find(e=>e.id===b.sesiune_id)!.data).getTime() - new Date(examene.find(e=>e.id===a.sesiune_id)!.data).getTime());
        const currentGrad = grade.find(g => g.id === admitted[0]?.grad_vizat_id);
        const sortedGrades = [...grade].sort((a, b) => a.ordine - b.ordine);
        const nextGrad = currentGrad ? sortedGrades.find(g => g.ordine === currentGrad.ordine + 1) : sortedGrades[0];
        let eligibilityMsg = "Felicitări pentru progresul de până acum!";
        if (nextGrad) {
            const lastExamDate = admitted[0] ? new Date(examene.find(e=>e.id===admitted[0].sesiune_id)!.data) : new Date(sportiv.data_inscrierii);
            const monthsToWait = parseDurationToMonths(nextGrad.timp_asteptare);
            const eligibilityDate = new Date(lastExamDate);
            eligibilityDate.setMonth(eligibilityDate.getMonth() + monthsToWait);

            if (now < eligibilityDate) {
                const monthsRemaining = (eligibilityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
                const trainingsRemaining = Math.ceil(monthsRemaining * 8); // Assuming 8 trainings/month
                eligibilityMsg = `Continuă tot așa! Mai ai nevoie de aproximativ ${trainingsRemaining} antrenamente pentru a fi eligibil pentru ${nextGrad.nume}.`;
            } else {
                eligibilityMsg = `Ești eligibil pentru a susține examenul pentru ${nextGrad.nume}! Perseverența ta dă roade.`;
            }
        }

        return { attendanceRate, weeklyAttendance, dragonPerseverent, vointaDeFier, eligibilityMsg, nextGrad };
    }, [sportiv, antrenamente, grupe, grade, participari, examene]);

    const handlePrint = () => { window.print(); };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="">
            <div id="raport-content" className="bg-white text-gray-800 p-6 rounded-lg font-sans" style={{ fontSize: '13px' }}>
                <style>{`
                    @media print {
                        body * { visibility: hidden; }
                        #raport-print-area, #raport-print-area * { visibility: visible; }
                        #raport-print-area { position: absolute; left: 0; top: 0; width: 100%; height: 100%; padding: 20px; }
                        .no-print { display: none !important; }
                        @page { size: A5 landscape; margin: 0; }
                    }
                `}</style>
                <div id="raport-print-area">
                    <header className="flex justify-between items-start pb-4 border-b-2 border-slate-200">
                        <div>
                            <h2 className="text-2xl font-bold text-[var(--accent)]">Raport de Activitate</h2>
                            <p className="text-lg font-semibold text-slate-700">{sportiv.nume} {sportiv.prenume}</p>
                            <p className="text-xs text-slate-500">Generat la: {new Date().toLocaleDateString('ro-RO')}</p>
                        </div>
                    </header>

                    <main className="mt-6 grid grid-cols-3 gap-6">
                        <section className="col-span-3 lg:col-span-2 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <StatCard title="Rata Frecvență (Ultimele 30 zile)" value={`${reportData.attendanceRate}%`} icon="chart" />
                                <StatCard title="Următorul Obiectiv" value={reportData.nextGrad?.nume || "Maxim"} icon="target"/>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-700 mb-2">Constanța (Ultimele 8 Săptămâni)</h3>
                                <div className="h-24 w-full bg-slate-50 p-2 rounded-lg border border-slate-200">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={reportData.weeklyAttendance} margin={{ top: 5, right: 5, left: -30, bottom: -10 }}>
                                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                            <Bar dataKey="prezente" radius={[4, 4, 0, 0]}>
                                                {reportData.weeklyAttendance.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.prezente > 0 ? '#1d4ed8' : '#a0aec0'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="bg-blue-50 border-t-4 border-blue-300 p-4 rounded-b-lg">
                                <p className="font-semibold text-[var(--accent)] text-center">{reportData.eligibilityMsg}</p>
                            </div>
                        </section>

                        <aside className="col-span-3 lg:col-span-1 space-y-4">
                             <h3 className="font-bold text-slate-700 text-center">Insigne Câștigate</h3>
                            <Badge title="Dragon Perseverent" description="Prezență 100% în luna curentă." icon="dragon" earned={reportData.dragonPerseverent} />
                            <Badge title="Voință de Fier" description="Revenire după o pauză." icon="will" earned={reportData.vointaDeFier} />
                        </aside>
                    </main>
                </div>
                <div className="flex justify-end mt-6 pt-4 border-t border-slate-200 no-print">
                    <Button variant="secondary" onClick={onClose}>Închide</Button>
                    <Button onClick={handlePrint} className="ml-2">Printează / Salvează PDF</Button>
                </div>
            </div>
        </Modal>
    );
};