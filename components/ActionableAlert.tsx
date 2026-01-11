import React from 'react';
import { AlertTriangleIcon } from './icons';
import { Button } from './ui';

interface ActionableAlertProps {
  message: string;
  action: {
    label: string;
    onClick: () => void;
  };
}

export const ActionableAlert: React.FC<ActionableAlertProps> = ({ message, action }) => {
  return (
    <div className="bg-amber-900/50 border border-amber-700/50 text-amber-300 px-4 py-3 rounded-lg relative flex items-center justify-between gap-4 animate-fade-in-down">
      <div className="flex items-center">
        <AlertTriangleIcon className="w-5 h-5 mr-3" />
        <span className="block sm:inline text-sm font-medium">{message}</span>
      </div>
      <Button onClick={action.onClick} variant="secondary" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shadow-md">
        {action.label}
      </Button>
    </div>
  );
};
