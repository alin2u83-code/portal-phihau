import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '../types';
import { UsersIcon, WalletIcon, CalendarDaysIcon } from './icons';

interface DashboardProps {
  currentUser: User;
}

export const QwanKiDoDashboard: React.FC<DashboardProps> = ({ currentUser }) => {
  const [stats, setStats] = useState({
    totalSportivi: 0,
    totalPlati: 0,
    antrenamenteViitoare: 0
  });
  const [loading, setLoading] = useState(true);

  const isInstructorOrAdmin = currentUser.roluri?.some(r => 
    ['INSTRUCTOR', 'ADMIN', 'ADMIN_CLUB', 'SUPER_ADMIN_FEDERATIE'].includes(r.nume)
  );

  useEffect(() => {
    const fetchStats = async () => {
      try {
        let sportiviCount = 0;
        let totalPlati = 0;
        let antrenamenteCount = 0;

        const clubId = currentUser.club_id;

        if (isInstructorOrAdmin) {
            if (clubId) {
                // 1. Total Sportivi (Activi)
                const { count: sCount } = await supabase
                    .from('sportivi')
                    .select('*', { count: 'exact', head: true })
                    .eq('club_id', clubId)
                    .eq('status', 'Activ');
                sportiviCount = sCount || 0;

                // 2. Total Plati (Incasate)
                // Folosim vizualizare_plati pentru a avea datele agregate corect
                const { data: pData } = await supabase
                    .from('vizualizare_plati')
                    .select('suma_incasata')
                    .eq('club_id', clubId);
                
                totalPlati = pData?.reduce((acc, curr) => acc + (curr.suma_incasata || 0), 0) || 0;

                // 3. Antrenamente Programate (Viitoare)
                const now = new Date().toISOString();
                const { count: aCount } = await supabase
                    .from('antrenamente')
                    .select('*', { count: 'exact', head: true })
                    .eq('club_id', clubId)
                    .gte('data', now);
                antrenamenteCount = aCount || 0;
            }
        } else {
            // Sportiv
            sportiviCount = 1;

            // Plati proprii
            const { data: pData } = await supabase
                .from('vizualizare_plati')
                .select('suma_incasata')
                .eq('sportiv_id', currentUser.id);
            totalPlati = pData?.reduce((acc, curr) => acc + (curr.suma_incasata || 0), 0) || 0;

            // Antrenamente club
            if (clubId) {
                const now = new Date().toISOString();
                const { count: aCount } = await supabase
                    .from('antrenamente')
                    .select('*', { count: 'exact', head: true })
                    .eq('club_id', clubId)
                    .gte('data', now);
                antrenamenteCount = aCount || 0;
            }
        }

        setStats({
          totalSportivi: sportiviCount,
          totalPlati: totalPlati,
          antrenamenteViitoare: antrenamenteCount
        });

      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [currentUser, isInstructorOrAdmin]);

  const cards = [
    {
      title: 'Total Sportivi',
      value: stats.totalSportivi,
      icon: UsersIcon,
      label: 'Sportivi Activi',
      bgColor: 'bg-[#0f172a]' // Navy foarte inchis
    },
    {
      title: 'Total Plăți',
      value: `${stats.totalPlati} RON`,
      icon: WalletIcon,
      label: 'Încasări Totale',
      bgColor: 'bg-[#0f172a]'
    },
    {
      title: 'Antrenamente',
      value: stats.antrenamenteViitoare,
      icon: CalendarDaysIcon,
      label: 'Programate',
      bgColor: 'bg-[#0f172a]'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full animate-fade-in-down">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-xl shadow-lg p-6 flex items-center border-l-4 border-[#0f172a] transition-transform hover:scale-[1.02]">
            <div className={`p-4 rounded-full ${card.bgColor} text-white shadow-md`}>
                <card.icon className="w-8 h-8" />
            </div>
            <div className="ml-5">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{card.label}</p>
                <p className="text-2xl font-extrabold text-[#0f172a] mt-1">{loading ? '...' : card.value}</p>
            </div>
        </div>
      ))}
    </div>
  );
};
