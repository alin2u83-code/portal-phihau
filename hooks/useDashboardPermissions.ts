import { useMemo } from 'react';
import { User, Permissions } from '../types';

export const useDashboardPermissions = (currentUser: User, viewedUser: User, permissions: Permissions) => {
    const isViewingOwnProfile = useMemo(() => {
        return currentUser.id === viewedUser.id;
    }, [currentUser.id, viewedUser.id]);

    const canViewWallet = useMemo(() => {
        return isViewingOwnProfile;
    }, [isViewingOwnProfile]);

    const canMarkAttendance = useMemo(() => {
        return isViewingOwnProfile;
    }, [isViewingOwnProfile]);

    const canEditProfile = useMemo(() => {
        return isViewingOwnProfile || permissions.hasAdminAccess;
    }, [isViewingOwnProfile, permissions.hasAdminAccess]);

    return {
        isViewingOwnProfile,
        canViewWallet,
        canMarkAttendance,
        canEditProfile
    };
};
