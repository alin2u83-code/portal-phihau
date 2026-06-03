import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Grad } from '../../types';
import { useInlantuiriGrade } from '../../hooks/useInlantuiriGrade';
import { useError } from '../ErrorProvider';

const TIP_PROBE: { cod: string; label: string }[] = [
  { cod: 'thao_quyen_individual', label: 'Thao Quyen' },
  { cod: 'sincron',               label: 'Sincron' },
  { cod: 'song_luyen',            label: 'Song Luyen' },
  { cod: 'thao_lo_individual',    label: 'Thao Lo' },
  { cod: 'giao_dau',              label: 'Giao Dau' },
];

interface Props {
  inlantuireId: string;
}

export const InlantuireGradePanel: React.FC<Props> = ({ inlantuireId }) => {
  const { showError } = useError();
  const { isActive, toggle, loading } = useInlantuiriGrade(inlantuireId);
  const [grade, setGrade] = useState<Grad[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('grade')
      .select('id, nume, ordine')
      .order('ordine')
      .then(({ data, error }) => {
        if (!error) setGrade((data ?? []) as Grad[]);
      });
  }, []);

  const handleToggle = async (grade_id: string, tip_proba: string) => {
    const key = `${grade_id}:${tip_proba}`;
    setToggling(key);
    const error = await toggle(grade_id, tip_proba);
    if (error) showError('Eroare', error.message);
    setToggling(null);
  };

  if (loading) {
    return <div className="text-slate-400 text-xs py-2">Se încarcă asocierile...</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left py-1.5 px-2 text-slate-400 font-medium">Grad</th>
            {TIP_PROBE.map(tp => (
              <th key={tp.cod} className="py-1.5 px-2 text-slate-400 font-medium text-center whitespace-nowrap">
                {tp.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grade.map(g => (
            <tr key={g.id} className="border-t border-slate-700/50 hover:bg-slate-700/20">
              <td className="py-1.5 px-2 text-slate-300">{g.nume}</td>
              {TIP_PROBE.map(tp => {
                const key = `${g.id}:${tp.cod}`;
                const active = isActive(g.id, tp.cod);
                const busy = toggling === key;
                return (
                  <td key={tp.cod} className="py-1.5 px-2 text-center">
                    <button
                      onClick={() => handleToggle(g.id, tp.cod)}
                      disabled={busy}
                      title={active ? 'Dezactivează' : 'Activează'}
                      className={`w-5 h-5 rounded border transition-colors ${
                        busy
                          ? 'opacity-40 cursor-wait border-slate-500'
                          : active
                          ? 'bg-emerald-600 border-emerald-500 hover:bg-emerald-700'
                          : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
                      }`}
                    >
                      {active && !busy && (
                        <svg className="w-3 h-3 mx-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

