import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User, AnuntPrezenta, Sportiv } from '../types';
import { Permissions } from '../hooks/usePermissions';
// FIX: Correctly import ExclamationTriangleIcon as AlertTriangleIcon, which is the exported name in components/icons.tsx.
import { ExclamationTriangleIcon as AlertTriangleIcon, ClockIcon, CheckCircleIcon, XIcon } from './icons';

interface EnrichedNotification extends AnuntPrezenta {
  id: string; // Ensure id is always a string
  sportiv_nume: string;
}

const NOTIFICATION_TIMEOUT = 30000; // 30 seconds

const NotificationCard: React.FC<{
  notification: EnrichedNotification;
  onDismiss: (id: string) => void;
}> = ({ notification, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  const config = {
    Absent: {
      Icon: AlertTriangleIcon,
      borderColor: 'border-red-500',
      iconColor: 'text-red-400',
      title: 'Absență Anunțată',
    },
    Intarziat: {
      Icon: ClockIcon,
      borderColor: 'border-amber-500',
      iconColor: 'text-amber-400',
      title: 'Întârziere Anunțată',
    },
    Confirm: {
      Icon: CheckCircleIcon,
      borderColor: 'border-green-500',
      iconColor: 'text-green-400',
      title: 'Prezență Confirmată',
    },
  }[notification.status];

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(notification.id), 300); // Wait for animation
  };

  useEffect(() => {
    const timer = setTimeout(handleDismiss, NOTIFICATION_TIMEOUT);
    return () => clearTimeout(timer);
  }, []);

  if (!config) return null;

  const { Icon, borderColor, iconColor, title } = config;

  return (
    <div
      className={`relative w-80 max-w-sm bg-[var(--bg-card)] rounded-lg shadow-2xl border-l-4 ${borderColor} overflow-hidden ${isExiting ? 'animate-fade-out-right' : 'animate-fade-in-right'}`}
    >
      <div className="p-4 flex gap-4">
        <div className={`flex-shrink-0 ${iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-grow">
          <p className="font-bold text-white">{notification.sportiv_nume}</p>
          <p className="text-sm text-slate-300">{title}</p>
          {notification.detalii && (
            <p className="text-xs text-slate-400 mt-1 italic">"{notification.detalii}"</p>
          )}
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="p-1 text-slate-500 hover:text-white transition-colors rounded-full hover:bg-slate-700"
            aria-label="Ignoră"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface LiveAttendanceRadarProps {
  currentUser: User;
  sportivi: Sportiv[];
  permissions: Permissions;
}

export const LiveAttendanceRadar: React.FC<LiveAttendanceRadarProps> = ({ currentUser, sportivi, permissions }) => {
  const [notifications, setNotifications] = useState<EnrichedNotification[]>([]);

  useEffect(() => {
    if (!permissions.hasAdminAccess || !supabase) {
      return;
    }

    const channel = supabase
      .channel('live-attendance-radar')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'anunturi_prezenta' },
        (payload) => {
          const newAnunt = payload.new as AnuntPrezenta;
          // Only show notifications for the admin's own club
          const sportiv = sportivi.find(s => s.id === newAnunt.sportiv_id);
          if (sportiv && (permissions.isFederationAdmin || sportiv.club_id === currentUser.club_id)) {
            const newNotification: EnrichedNotification = {
              ...newAnunt,
              id: newAnunt.id || `${Date.now()}`, // Fallback ID
              sportiv_nume: `${sportiv.nume} ${sportiv.prenume}`,
            };
            setNotifications(prev => [newNotification, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [permissions.hasAdminAccess, currentUser.club_id, sportivi, permissions.isFederationAdmin]);

  const handleDismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (!permissions.hasAdminAccess) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-[1000] space-y-3">
      {notifications.map(notification => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  );
};