import React, { useState, useEffect } from 'react';
import { Card, Button } from './ui';

export const NotificationPermissionWidget: React.FC = () => {
    const [permission, setPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const handleRequestPermission = () => {
        if (!('Notification' in window)) {
            alert('Acest browser nu suportă notificări.');
            return;
        }
        Notification.requestPermission().then(newPermission => {
            setPermission(newPermission);
        });
    };

    if (!('Notification' in window)) {
        return null;
    }

    let content;
    switch (permission) {
        case 'granted':
            content = <p className="text-sm text-green-400 font-semibold">Notificările sunt activate.</p>;
            break;
        case 'denied':
            content = <p className="text-sm text-red-400">Ați blocat notificările. Trebuie să le activați din setările browser-ului.</p>;
            break;
        default:
            content = <Button onClick={handleRequestPermission} variant="info" size="sm">Activează Notificări</Button>;
            break;
    }

    return (
        <Card className="bg-slate-700/30 border-slate-600">
            <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-sm">Notificări Anunțuri</h4>
                {content}
            </div>
        </Card>
    );
};