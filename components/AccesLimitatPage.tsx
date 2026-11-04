import React from 'react';
import { Card, Button } from './ui';
import { Shield } from 'lucide-react';

interface AccesLimitatPageProps {
    onLogout: () => void;
}

export const AccesLimitatPage: React.FC<AccesLimitatPageProps> = ({ onLogout }) => (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
        <div className="w-full max-w-md space-y-6">
            <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
                    <Shield className="w-8 h-8 text-amber-500" />
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Acces limitat</h1>
            </div>
            <Card>
                <p className="text-slate-300 text-sm text-center">
                    Contul tău are acces doar la zona competiției. Deschide linkul competiției primit de la federație.
                </p>
            </Card>
            <div className="flex justify-center">
                <Button onClick={onLogout}>Deconectare</Button>
            </div>
        </div>
    </div>
);
