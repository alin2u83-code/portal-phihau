import React, { useState, useEffect } from 'react';
import { Card, Button } from './ui';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

// Funcție helper pentru conversia cheii publice VAPID
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const sendSubscriptionToBackend = async (subscription: PushSubscription) => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Folosim `upsert` pentru a insera sau actualiza abonamentul pentru un utilizator
    await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        subscription: subscription.toJSON()
    }, { onConflict: 'user_id' }); // Presupunând o constrângere unică pe `user_id`
};

export const NotificationPermissionWidget: React.FC = () => {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const { showError, showSuccess } = useError();

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.ready.then(reg => {
                reg.pushManager.getSubscription().then(sub => {
                    if (sub) {
                        setIsSubscribed(true);
                    }
                });
            });
        }
    }, []);

    const subscribeUser = () => {
        const vapidPublicKey = (import.meta as any).env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
            showError("Configurare Incompletă", "Cheia publică VAPID pentru notificări push lipsește. Contactați administratorul.");
            return;
        }

        navigator.serviceWorker.ready.then(registration => {
            const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
            registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
            }).then(subscription => {
                showSuccess("Abonare Reușită", "Vei primi notificări despre anunțuri importante.");
                sendSubscriptionToBackend(subscription);
                setIsSubscribed(true);
            }).catch(err => {
                showError("Abonare Eșuată", err.message);
            });
        });
    };

    const handleRequestPermission = () => {
        if (!('Notification' in window)) {
            alert('Acest browser nu suportă notificări.');
            return;
        }
        Notification.requestPermission().then(newPermission => {
            setPermission(newPermission);
            if (newPermission === 'granted') {
                subscribeUser();
            }
        });
    };

    if (!('Notification' in window) || !('PushManager' in window)) {
        return null;
    }

    let content;
    if (permission === 'granted') {
        if (isSubscribed) {
            content = <p className="text-sm text-green-400 font-semibold">Sunteți abonat la notificări.</p>;
        } else {
            content = <Button onClick={subscribeUser} variant="info" size="sm">Abonează-te la Notificări Push</Button>;
        }
    } else if (permission === 'denied') {
        content = <p className="text-sm text-red-400">Ați blocat notificările. Trebuie să le activați din setările browser-ului.</p>;
    } else {
        content = <Button onClick={handleRequestPermission} variant="info" size="sm">Activează Notificări</Button>;
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