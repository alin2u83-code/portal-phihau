import React, { useState } from 'react';
import type { ProbaCompetitie, Grad } from '../../types';
import type { CompetitieFiltre } from '../../hooks/useCompetitieFilters';
import { SearchableSelect } from '../ui';

export interface CompetitieFilterBarProps {
  filtre: CompetitieFiltre;
  toggleGen: (gen: string) => void;
  setFiltre: (partial: Partial<CompetitieFiltre>) => void;
  resetFiltre: () => void;
  nrFiltreActive: number;
  probe: ProbaCompetitie[];
  grade: Grad[];
}

export const CompetitieFilterBar: React.FC<CompetitieFilterBarProps> = ({
  filtre, toggleGen, setFiltre, resetFiltre, nrFiltreActive, probe, grade
}) => {
  const [filtreVisible, setFiltreVisible] = useState(false);

  return (
    <div>
      {/* Rând buton toggle + link reset */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setFiltreVisible(v => !v)}
          style={{ touchAction: 'manipulation' }}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            nrFiltreActive > 0
              ? 'bg-brand-primary/20 border-brand-primary/50 text-brand-primary'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          {`Filtrează${nrFiltreActive > 0 ? ` (${nrFiltreActive})` : ''}`}
          <svg
            className={`w-3 h-3 transition-transform ${filtreVisible ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {nrFiltreActive > 0 && (
          <button onClick={resetFiltre} className="text-xs text-slate-400 hover:text-white underline">
            Reset
          </button>
        )}
      </div>

      {/* Panou colapsibil */}
      {filtreVisible && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

            {/* Gen — checkbox pills */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Gen</div>
              <div className="flex flex-wrap gap-1.5">
                {['Feminin', 'Masculin', 'Mixt'].map(gen => (
                  <label
                    key={gen}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg cursor-pointer border transition-colors ${
                      filtre.gen.has(gen)
                        ? 'bg-brand-primary/20 border-brand-primary/50 text-brand-primary'
                        : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={filtre.gen.has(gen)}
                      onChange={() => toggleGen(gen)}
                      className="w-3 h-3 accent-brand-primary"
                    />
                    {gen}
                  </label>
                ))}
              </div>
            </div>

            {/* Probă — searchable select */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Probă</div>
              <SearchableSelect
                value={filtre.probaId}
                onChange={val => setFiltre({ probaId: val })}
                options={probe.map(p => ({ value: p.id, label: p.denumire }))}
                emptyLabel="Toate probele"
                placeholder="Toate probele"
              />
            </div>

            {/* Vârstă — două inputs numerice */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Vârstă (ani)</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder="Min"
                  value={filtre.varstaMin}
                  onChange={e => setFiltre({ varstaMin: e.target.value })}
                  className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary/60"
                />
                <span className="text-slate-500 text-xs">–</span>
                <input
                  type="number"
                  min={0}
                  placeholder="Max"
                  value={filtre.varstaMax}
                  onChange={e => setFiltre({ varstaMax: e.target.value })}
                  className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary/60"
                />
              </div>
            </div>

            {/* Grad — două searchable selects, value = ordine (nu id) */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Grad</div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <SearchableSelect
                    value={filtre.gradMin}
                    onChange={val => setFiltre({ gradMin: val })}
                    options={[...grade].sort((a, b) => a.ordine - b.ordine).map(g => ({ value: g.ordine.toString(), label: g.nume }))}
                    emptyLabel="Orice grad"
                    placeholder="Orice grad"
                  />
                </div>
                <span className="text-slate-500 text-xs">–</span>
                <div className="flex-1">
                  <SearchableSelect
                    value={filtre.gradMax}
                    onChange={val => setFiltre({ gradMax: val })}
                    options={[...grade].sort((a, b) => a.ordine - b.ordine).map(g => ({ value: g.ordine.toString(), label: g.nume }))}
                    emptyLabel="Orice grad"
                    placeholder="Orice grad"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
