
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { AttendanceChart } from '../../components/dashboard/AttendanceChart';
import { OverduePayments } from '../../components/dashboard/OverduePayments';
import { RecentActivities } from '../../components/dashboard/RecentActivities';
import { RevenueChart } from '../../components/dashboard/RevenueChart';
import { StatsCards } from '../../components/dashboard/StatsCards';
import { TodayClasses } from '../../components/dashboard/TodayClasses';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { dashboardApi } from '../../services/api/dashboardApi';

export const DashboardPage: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardApi.getStats,
  });

  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['dashboard', 'revenue'],
    queryFn: () => dashboardApi.getRevenueChart('month'),
  });

  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ['dashboard', 'attendance'],
    queryFn: dashboardApi.getAttendanceChart,
  });

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Visão geral da academia - {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards data={stats} loading={statsLoading} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Faturamento Mensal
          </h3>
          <RevenueChart data={revenueData} loading={revenueLoading} />
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Frequência Semanal
          </h3>
          <AttendanceChart data={attendanceData} loading={attendanceLoading} />
        </div>
      </div>

      {/* Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivities />
        </div>
        <div className="space-y-6">
          <TodayClasses />
          <OverduePayments />
        </div>
      </div>
    </div>
  );
};