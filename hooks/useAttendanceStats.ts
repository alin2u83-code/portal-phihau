import { useMemo } from 'react';
import { IstoricGrade, Grad } from '../types';

export const useAttendanceStats = (
    istoricPrezenta: any[],
    istoricGrade: IstoricGrade[],
    grade: Grad[]
) => {
    const totalAttended = useMemo(() => {
        return (istoricPrezenta || []).filter(p => p.status?.toLowerCase() === 'prezent').length;
    }, [istoricPrezenta]);

    const attendanceStats = useMemo(() => {
        if (!istoricPrezenta) return { total: 0, recent: [], loading: true };
        
        const last5Months = Array.from({ length: 5 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            return d.toLocaleString('ro-RO', { month: 'short' });
        }).reverse();

        const recent = last5Months.map(month => ({
            month: month,
            count: (istoricPrezenta || []).filter(p => 
                p.status?.toLowerCase() === 'prezent' && 
                new Date(p.data).toLocaleString('ro-RO', { month: 'short' }) === month
            ).length
        }));

        return { total: totalAttended, recent, loading: false };
    }, [istoricPrezenta, totalAttended]);

    const examStats = useMemo(() => {
        if (!istoricPrezenta || !istoricGrade || !grade) return [];

        const sortedGrades = [...istoricGrade].sort((a, b) => new Date(a.data_obtinere).getTime() - new Date(b.data_obtinere).getTime());
        const stats = [];

        // 1. Start -> First Exam
        if (sortedGrades.length > 0) {
            const firstExamDate = new Date(sortedGrades[0].data_obtinere);
            const count = istoricPrezenta.filter(p => 
                p.status?.toLowerCase() === 'prezent' && 
                new Date(p.data) < firstExamDate
            ).length;
            
            const gradName = grade.find(g => g.id === sortedGrades[0].grad_id)?.nume || 'Primul Examen';
            stats.push({
                period: `Început -> ${gradName}`,
                count,
                date: sortedGrades[0].data_obtinere
            });
        }

        // 2. Between Exams
        for (let i = 0; i < sortedGrades.length - 1; i++) {
            const currentExamDate = new Date(sortedGrades[i].data_obtinere);
            const nextExamDate = new Date(sortedGrades[i+1].data_obtinere);
            
            const count = istoricPrezenta.filter(p => {
                const d = new Date(p.data);
                return p.status?.toLowerCase() === 'prezent' && d >= currentExamDate && d < nextExamDate;
            }).length;

            const currentGradName = grade.find(g => g.id === sortedGrades[i].grad_id)?.nume || 'Examen';
            const nextGradName = grade.find(g => g.id === sortedGrades[i+1].grad_id)?.nume || 'Examen';

            stats.push({
                period: `${currentGradName} -> ${nextGradName}`,
                count,
                date: sortedGrades[i+1].data_obtinere
            });
        }

        // 3. Last Exam -> Now
        if (sortedGrades.length > 0) {
            const lastExamDate = new Date(sortedGrades[sortedGrades.length - 1].data_obtinere);
            const count = istoricPrezenta.filter(p => {
                const d = new Date(p.data);
                return p.status?.toLowerCase() === 'prezent' && d >= lastExamDate;
            }).length;

            const lastGradName = grade.find(g => g.id === sortedGrades[sortedGrades.length - 1].grad_id)?.nume || 'Ultimul Examen';
            stats.push({
                period: `${lastGradName} -> Prezent`,
                count,
                date: new Date().toISOString()
            });
        } else {
            // No exams yet
             stats.push({
                period: `Început -> Prezent`,
                count: totalAttended,
                date: new Date().toISOString()
            });
        }

        return stats.reverse(); // Show most recent first
    }, [istoricPrezenta, istoricGrade, grade, totalAttended]);

    return {
        totalAttended,
        attendanceStats,
        examStats
    };
};
