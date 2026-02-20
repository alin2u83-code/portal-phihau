import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { RoleSwitcher } from './RoleSwitcher';
import { UserRole } from '../types';
import {
  User, 
  Book, 
  CreditCard, 
  Users, 
  FileText, 
  BarChart, 
  Menu, 
  X 
} from 'lucide-react';

const navItems = {
  user: [
    { href: '#', label: 'Profil', icon: User },
    { href: '#', label: 'Note Tehnice', icon: Book },
    { href: '#', label: 'Plățile Mele', icon: CreditCard },
  ],
  admin: [
    { href: '#', label: 'Gestiune Sportivi', icon: Users },
    { href: '#', label: 'Documente Federație', icon: FileText },
    { href: '#', label: 'Rapoarte Stagii', icon: BarChart },
  ],
};

const adminRoles = [UserRole.INSTRUCTOR, UserRole.ADMIN_CLUB, UserRole.SUPER_ADMIN_FEDERATIE];

export function Sidebar() {
  const { profile, activeRole, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const canViewAdmin = activeRole && adminRoles.includes(activeRole);

  const renderNavLinks = (items: typeof navItems.user) => {
    return (
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.label}>
            <a href={item.href} className="flex items-center p-2 text-base font-normal text-gray-300 rounded-lg hover:bg-gray-700 group">
              <item.icon className="w-6 h-6 text-gray-400 transition duration-75 group-hover:text-white" />
              <span className="ml-3">{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
    );
  };

  const sidebarContent = (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-center p-4 bg-gray-900 border-b border-gray-700">
        <img src={profile?.avatar_url || `https://api.dicebear.com/6.x/initials/svg?seed=${profile?.full_name || 'User'}`} alt="Avatar" className="w-12 h-12 rounded-full mr-3" />
        <div className="text-white">
          <p className="font-semibold">{profile?.full_name}</p>
          <p className="text-sm text-gray-400">{activeRole?.replace(/_/g, ' ')}</p>
        </div>
      </div>
      
      <RoleSwitcher />

      <div className="flex-1 overflow-y-auto py-4 px-3 bg-gray-800">
        {renderNavLinks(navItems.user)}
        {canViewAdmin && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Administrare</h3>
            {renderNavLinks(navItems.admin)}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="fixed top-4 left-4 z-40 p-2 text-gray-400 bg-gray-800 rounded-md md:hidden"
        aria-controls="default-sidebar"
        aria-expanded={isOpen}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        id="default-sidebar"
        className={`fixed top-0 left-0 z-30 w-64 h-screen transition-transform md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Sidebar"
      >
        {loading ? (
          <div className="h-full flex items-center justify-center bg-gray-800">
            <p className="text-white">Loading...</p>
          </div>
        ) : sidebarContent}
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="fixed inset-0 z-20 bg-black opacity-50 md:hidden"
        ></div>
      )}
    </>
  );
}
