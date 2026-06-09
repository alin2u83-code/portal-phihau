import React, { useState } from 'react';
import { Button, ConfirmButton } from './ui';

export const ButtonCatalog: React.FC = () => {
  const [lastAction, setLastAction] = useState<string>('—');

  const variants = ['primary', 'secondary', 'danger', 'success', 'info', 'warning'] as const;
  const sizes = ['xs', 'sm', 'md', 'lg'] as const;

  return (
    <div className="bg-slate-900 text-slate-100 p-8 min-h-screen">
      <h1 className="text-2xl font-bold mb-1">Button Catalog — Design System PhiHau</h1>
      <p className="text-slate-400 mb-6">Toate variantele × dimensiunile × stările disponibile</p>

      {/* Sectiune 2 — Tabela variante × size */}
      <h2 className="text-lg font-semibold text-slate-300 mb-3 mt-8">Variante × Dimensiuni</h2>
      <div className="overflow-x-auto">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="text-slate-500 text-sm pr-4 pb-2 text-left">variant \ size</th>
              {sizes.map(s => (
                <th key={s} className="text-slate-400 text-sm px-3 pb-2 text-center">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {variants.map(v => (
              <tr key={v}>
                <td className="text-slate-500 text-sm pr-4 py-2">{v}</td>
                {sizes.map(s => (
                  <td key={s} className="px-3 py-2">
                    <Button variant={v} size={s}>{v} {s}</Button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <hr className="border-slate-700 my-6" />

      {/* Sectiune 3 — Ghost variants */}
      <h2 className="text-lg font-semibold text-slate-300 mb-3 mt-8">Ghost Variants</h2>
      <div className="flex flex-wrap gap-3">
        {variants.map(v => (
          <React.Fragment key={v}>
            <Button variant={v} ghost>ghost {v}</Button>
            <Button variant={v} ghost pill>ghost pill {v}</Button>
          </React.Fragment>
        ))}
      </div>

      <hr className="border-slate-700 my-6" />

      {/* Sectiune 4 — Outline variants */}
      <h2 className="text-lg font-semibold text-slate-300 mb-3 mt-8">Outline Variants</h2>
      <div className="flex flex-wrap gap-3">
        {variants.map(v => (
          <React.Fragment key={v}>
            <Button variant={v} outline>outline {v}</Button>
            <Button variant={v} outline pill>outline pill {v}</Button>
          </React.Fragment>
        ))}
      </div>

      <hr className="border-slate-700 my-6" />

      {/* Sectiune 5 — Cu icoane */}
      <h2 className="text-lg font-semibold text-slate-300 mb-3 mt-8">Cu Icoane</h2>
      <div className="flex flex-wrap gap-3">
        <Button leftIcon={<span>+</span>}>Adauga</Button>
        <Button variant="secondary" rightIcon={<span>→</span>}>Continua</Button>
        <Button variant="danger" leftIcon={<span>×</span>} ghost>Sterge</Button>
        <Button variant="success" leftIcon={<span>✓</span>} size="sm">Salveaza</Button>
        <Button variant="info" rightIcon={<span>↗</span>} outline>Detalii</Button>
      </div>

      <hr className="border-slate-700 my-6" />

      {/* Sectiune 6 — Stari speciale */}
      <h2 className="text-lg font-semibold text-slate-300 mb-3 mt-8">Stari</h2>
      <div className="flex flex-wrap gap-3">
        <Button isLoading>Loading...</Button>
        <Button disabled>Disabled</Button>
        <Button isLoading variant="success">Success loading</Button>
        <Button disabled variant="danger">Danger disabled</Button>
        <Button isLoading variant="secondary" size="sm">Loading sm</Button>
        <Button disabled variant="info" outline>Info disabled outline</Button>
      </div>

      <hr className="border-slate-700 my-6" />

      {/* Sectiune 7 — Pill */}
      <h2 className="text-lg font-semibold text-slate-300 mb-3 mt-8">Pill (rounded-full)</h2>
      <div className="flex flex-wrap gap-3">
        <Button pill>Primary pill</Button>
        <Button variant="secondary" pill>Secondary pill</Button>
        <Button variant="danger" pill size="sm">Danger sm pill</Button>
        <Button variant="success" pill size="xs">Success xs pill</Button>
        <Button variant="warning" pill size="lg">Warning lg pill</Button>
      </div>

      <hr className="border-slate-700 my-6" />

      {/* Sectiune 8 — ConfirmButton demo interactiv */}
      <h2 className="text-lg font-semibold text-slate-300 mb-3 mt-8">ConfirmButton — Confirmare inline</h2>
      <div className="flex flex-wrap gap-3 items-center">
        <ConfirmButton onConfirm={() => setLastAction('Sterge confirmat!')}>
          Sterge
        </ConfirmButton>
        <ConfirmButton
          variant="warning"
          confirmText="Sigur vrei sa resetezi?"
          confirmLabel="Da, reseteaza"
          cancelLabel="Renunta"
          onConfirm={() => setLastAction('Reset confirmat!')}
        >
          Reset
        </ConfirmButton>
        <span className="text-slate-400 text-sm ml-4">
          Ultima actiune: <span className="text-slate-200 font-medium">{lastAction}</span>
        </span>
      </div>
    </div>
  );
};
