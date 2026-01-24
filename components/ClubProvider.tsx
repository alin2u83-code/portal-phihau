import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { User, Club } from '../types';

interface ClubContextType {
  clubId: string | null; // The currently selected club_id for filtering, or null for "All"
  setClubId: (clubId: string | null) => void;
  userClubId: string | null; // The user's own assigned club, doesn't change
  isSuperAdmin: boolean;
  isClubAdmin: boolean;
  availableClubs: Club[];
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);

export const useClub = () => {
  const context = useContext(ClubContext);
  if (!context) {
    throw new Error('useClub must be used within a ClubProvider');
  }
  return context;
};

interface ClubProviderProps {
  children: ReactNode;
  currentUser: User | null;
  allClubs: Club[];
}

export const ClubProvider: React.FC<ClubProviderProps> = ({ children, currentUser, allClubs }) => {
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);

  const { isSuperAdmin, isClubAdmin, userClubId } = useMemo(() => {
    if (!currentUser) {
      return { isSuperAdmin: false, isClubAdmin: false, userClubId: null };
    }
    const roles = new Set(currentUser.roluri.map(r => r.nume));
    const superAdmin = roles.has('Super Admin') || roles.has('Admin');
    const clubAdmin = roles.has('Admin Club');
    return {
      isSuperAdmin: superAdmin,
      isClubAdmin: clubAdmin,
      userClubId: currentUser.club_id || null,
    };
  }, [currentUser]);

  useEffect(() => {
    if (isSuperAdmin) {
      const storedClubId = localStorage.getItem('phi-hau-selected-club-id');
      setSelectedClubId(storedClubId ? JSON.parse(storedClubId) : null);
    } else {
      setSelectedClubId(userClubId);
    }
  }, [isSuperAdmin, userClubId]);
  
  const handleSetClubId = (clubId: string | null) => {
      setSelectedClubId(clubId);
      if(isSuperAdmin) {
        localStorage.setItem('phi-hau-selected-club-id', JSON.stringify(clubId));
      }
  };
  
  const activeClubId = isSuperAdmin ? selectedClubId : userClubId;
  
  const value = {
    clubId: activeClubId,
    setClubId: handleSetClubId,
    userClubId,
    isSuperAdmin,
    isClubAdmin,
    availableClubs: allClubs,
  };

  return (
    <ClubContext.Provider value={value}>
      {children}
    </ClubContext.Provider>
  );
};