import React, { useState } from 'react';
import type { ProbaCompetitie, Grad } from '../../types';
import type { CompetitieFiltre } from '../../hooks/useCompetitieFilters';
import { SearchableSelect, Button, Badge } from '../ui';

export interface CompetitieFilterBarProps {
  filtre: CompetitieFiltre;
  toggleGen: (gen: string) => void;
  setFiltre: (partial: Partial<CompetitieFiltre>) => void;
  resetFiltre: () => void;
  nrFiltreActive: number;
  probe: ProbaCompetitie[];
  grade: Grad[];
}

const LABEL = 'text-xs font-semibold text-[var(--t-text-muted)]';
const INPUT = 'w-20 bg-[var(--t-input-bg)] border border-[var(--t-border)] text-[var(--t-text)] placeholder:text-[var(--t-text-muted)] rounded-lg h-11 lg:h-10 px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--t-input-focus-ring)]';

export const CompetitieFilterBar: React.FC<CompetitieFilterBarProps> = ({
  filtre, toggleGen, setFiltre, resetFiltre, nrFiltreActive, probe, grade
}) => {
  const [filtreVisible, setFiltreVisible] = useState(false);

  return (
    <div>
      {/* Rând buton toggle + link reset */}
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setFiltreVisible(v => !v)}
          style={{ touchAction: 'manipulation' }}
          className="min-h-11 lg:min-h-10"
          leftIcon={
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
          }
        >
          Filtrează
          {nrFiltreActive > 0 && <Badge variant="blue" className="ml-2">{nrFiltreActive}</Badge>}
        </Button>
        {nrFiltreActive > 0 && (
          <Button variant="secondary" ghost size="sm" onClick={resetFiltre} className="min-h-11 lg:min-h-10">
            Reset
          </Button>
        )}
      </div>

      {/* Rând inline de filtre */}
      {filtreVisible && (
        <div className="flex flex-wrap items-end gap-2">

          {/* Gen — checkbox pills */}
          <div className="space-y-1">
            <div className={LABEL}>Gen</div>
            <div className="flex flex-wrap gap-2">
              {['Feminin', 'Masculin', 'Mixt'].map(gen => (
                <label
                  key={gen}
                  className={`flex items-center gap-2 text-sm px-3 h-11 lg:h-10 rounded-lg cursor-pointer border transition-colors ${
                    filtre.gen.has(gen)
                      ? 'border-[var(--t-primary)] text-[var(--t-primary)] bg-[var(--t-input-bg)]'
                      : 'border-[var(--t-border)] text-[var(--t-text)] bg-[var(--t-input-bg)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={filtre.gen.has(gen)}
                    onChange={() => toggleGen(gen)}
                    className="w-3 h-3 accent-[var(--t-primary)]"
                  />
                  {gen}
                </label>
              ))}
            </div>
          </div>

          {/* Probă — searchable select */}
          <div className="space-y-1 min-w-[10rem]">
            <div className={LABEL}>Probă</div>
            <SearchableSelect
              value={filtre.probaId}
              onChange={val => setFiltre({ probaId: val })}
              options={probe.map(p => ({ value: p.id, label: p.denumire }))}
              emptyLabel="Toate probele"
              placeholder="Toate probele"
            />
          </div>

          {/* Vârstă — două inputs numerice */}
          <div className="space-y-1">
            <div className={LABEL}>Vârstă (ani)</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                placeholder="Min"
                value={filtre.varstaMin}
                onChange={e => setFiltre({ varstaMin: e.target.value })}
                className={INPUT}
              />
              <span className="text-[var(--t-text-muted)] text-xs">–</span>
              <input
                type="number"
                min={0}
                placeholder="Max"
                value={filtre.varstaMax}
                onChange={e => setFiltre({ varstaMax: e.target.value })}
                className={INPUT}
              />
            </div>
          </div>

          {/* Grad — două searchable selects, value = ordine (nu id) */}
          <div className="space-y-1">
            <div className={LABEL}>Grad</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-[9rem]">
                <SearchableSelect
                  value={filtre.gradMin}
                  onChange={val => setFiltre({ gradMin: val })}
                  options={[...grade].sort((a, b) => a.ordine - b.ordine).map(g => ({ value: g.ordine.toString(), label: g.nume }))}
                  emptyLabel="Orice grad"
                  placeholder="Orice grad"
                />
              </div>
              <span className="text-[var(--t-text-muted)] text-xs">–</span>
              <div className="flex-1 min-w-[9rem]">
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
      )}
    </div>
  );
};
