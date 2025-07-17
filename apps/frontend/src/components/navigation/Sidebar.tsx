// =============================================
// SIDEBAR - apps/frontend/src/components/navigation/Sidebar.tsx
// =============================================

import {
    AcademicCapIcon,
    CalendarIcon,
    ChartBarIcon,
    CogIcon,
    CreditCardIcon,
    HomeIcon,
    UserIcon,
    UsersIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: ['admin', 'manager', 'instructor', 'front_desk'] },
  { name: 'Alunos', href: '/students', icon: UsersIcon, roles: ['admin', 'manager', 'instructor', 'front_desk'] },
  { name: 'Instrutores', href: '/instructors', icon: AcademicCapIcon, roles: ['admin', 'manager'] },
  { name: 'Aulas', href: '/classes', icon: CalendarIcon, roles: ['admin', 'manager', 'instructor'] },
  { name: 'Pagamentos', href: '/payments', icon: CreditCardIcon, roles: ['admin', 'manager', 'front_desk'] },
  { name: 'Relatórios', href: '/reports', icon: ChartBarIcon, roles: ['admin', 'manager'] },
  { name: 'Configurações', href: '/settings', icon: CogIcon, roles: ['admin'] },
];

interface SidebarProps {
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { user } = useAuth();

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role || 'student')
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <img
            className="h-8 w-auto"
            src="/assets/images/gb_logo.png"
            alt="Gracie Barra"
          />
          <span className="ml-2 text-lg font-semibold text-gray-900 dark:text-white">
            GB Sistema
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            onClick={onClose}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {filteredNavigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-red-50 border-r-2 border-red-500 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
              }`
            }
          >
            <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
        <NavLink
          to="/profile"
          className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white transition-colors"
        >
          <UserIcon className="mr-3 h-5 w-5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user?.email}
            </p>
          </div>
        </NavLink>
      </div>
    </div>
  );
};