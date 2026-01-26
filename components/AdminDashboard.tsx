import React from 'react';
import { User } from '../types';
import { WelcomeHero } from './WelcomeHero';

interface AdminDashboardProps {
  currentUser: User | null;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  // If currentUser is not available yet, show a loading state.
  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center p-4">
        <svg className="animate-spin h-8 w-8 text-brand-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <h1 className="text-xl font-bold text-white">Se încarcă panoul de control...</h1>
      </div>
    );
  }
  
  // Render the new WelcomeHero component with the user's profile.
  return <WelcomeHero profile={currentUser} />;
};

export default AdminDashboard;
