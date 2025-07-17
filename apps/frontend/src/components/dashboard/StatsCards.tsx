
import {
    CalendarIcon,
    CreditCardIcon,
    ExclamationTriangleIcon,
    UsersIcon,
} from '@heroicons/react/24/outline';
import React from 'react';
import { formatCurrency } from '../../utils/formatUtils';

interface StatsData {
  totalStudents: number;
  activeStudents: number;
  monthlyRevenue: number;
  overduePayments: number;
  classesToday: number;
  attendanceToday: number;
  newStudentsThisMonth: number;
  churnRate: number;
}

interface StatsCardsProps {
  data?: StatsData;
  loading?: boolean;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ data, loading }) => {
  const stats = [
    {
      name: 'Alunos Ativos',
      value: data?.activeStudents || 0,
      total: data?.totalStudents || 0,
      icon: UsersIcon,
      color: 'bg-blue-500',
      change: data?.newStudentsThisMonth || 0,
      changeType: 'increase' as const,
      changeLabel: 'novos este mês',
    },
    {
      name: 'Faturamento Mensal',
      value: formatCurrency(data?.monthlyRevenue || 0),
      icon: CreditCardIcon,
      color: 'bg-green-500',
      change: 12.5,
      changeType: 'increase' as const,
      changeLabel: 'vs mês anterior',
    },
    {
      name: 'Pagamentos em Atraso',
      value: data?.overduePayments || 0,
      icon: ExclamationTriangleIcon,
      color: 'bg-red-500',
      change: -2,
      changeType: 'decrease' as const,
      changeLabel: 'vs semana anterior',
    },
    {
      name: 'Aulas Hoje',
      value: data?.classesToday || 0,
      total: data?.attendanceToday || 0,
      icon: CalendarIcon,
      color: 'bg-purple-500',
      changeLabel: 'presenças',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow animate-pulse">
            <div className="flex items-center">
              <div className="p-2 rounded-md bg-gray-200 dark:bg-gray-700">
                <div className="h-6 w-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
              </div>
              <div className="ml-4 flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div key={stat.name} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className={`p-2 rounded-md ${stat.color}`}>
              <stat.icon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {stat.name}
              </p>
              <div className="flex items-baseline">
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
                {stat.total && (
                  <p className="ml-2 text-sm text-gray-500">
                    de {stat.total}
                  </p>
                )}
              </div>
              {stat.change !== undefined && (
                <div className="flex items-center mt-1">
                  <span
                    className={`text-sm font-medium ${
                      stat.changeType === 'increase'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {stat.changeType === 'increase' ? '+' : ''}{stat.change}
                    {typeof stat.change === 'number' && stat.change % 1 !== 0 ? '%' : ''}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">
                    {stat.changeLabel}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};