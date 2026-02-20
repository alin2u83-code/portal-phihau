import React from 'react';
import { GiMartialArts, GiBlackBelt, GiPunch } from 'react-icons/gi';
import { ArrowRightOnRectangleIcon } from './icons'; // Assuming a logout/switch icon exists
import IconErrorBoundary from './IconErrorBoundary';
import { supabase } from '../supabaseClient'; // Assuming supabase client is exported here

// --- Types --- //
interface NavItemProps {
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

interface BottomNavBarProps {
  activeView: 'sportivi' | 'management' | 'antrenamente';
  onNavigate: (view: 'sportivi' | 'management' | 'antrenamente') => void;
  onSwitchRole: () => void; // Function to trigger the role selection UI
}

// --- Sub-components --- //
const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, isActive, onClick }) => {
  const activeClasses = isActive ? 'text-amber-400' : 'text-white';
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full transition-colors duration-300 hover:text-amber-300 ${activeClasses}`}>
      <IconErrorBoundary fallback={<span className="text-2xl">🥋</span>}>
        <Icon className="w-7 h-7" />
      </IconErrorBoundary>
      <span className="text-xs mt-1">{label}</span>
    </button>
  );
};

// --- Main Component --- //
export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeView, onNavigate, onSwitchRole }) => {

  const handleSwitchRoleClick = async () => {
    // This function should ideally open the Role Selection Page.
    // For this example, we'll log a message and call the passed-in function.
    console.log('Attempting to switch role...');
    onSwitchRole();
    // Example of calling the RPC directly if you had a target role ID.
    // This should be handled in your role selection logic.
    /*
    const { error } = await supabase.rpc('set_active_role', { p_rol_id: 'your_target_role_id' });
    if (error) {
      console.error('Error switching role:', error);
    } else {
      console.log('Role switched successfully');
      // You would typically refresh user data here
    }
    */
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-indigo-900 shadow-lg z-50">
      <div className="flex justify-around items-center h-full max-w-md mx-auto">
        <NavItem 
          icon={GiMartialArts} 
          label="Sportivi" 
          isActive={activeView === 'sportivi'}
          onClick={() => onNavigate('sportivi')}
        />
        <NavItem 
          icon={GiBlackBelt} 
          label="Management" 
          isActive={activeView === 'management'}
          onClick={() => onNavigate('management')}
        />
        <NavItem 
          icon={GiPunch} 
          label="Antrenamente"
          isActive={activeView === 'antrenamente'}
          onClick={() => onNavigate('antrenamente')}
        />
        <NavItem 
          icon={ArrowRightOnRectangleIcon} 
          label="Schimbă Rol"
          onClick={handleSwitchRoleClick}
        />
      </div>
    </div>
  );
};
