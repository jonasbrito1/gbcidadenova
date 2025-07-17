
import { apiClient } from './client';

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  monthlyRevenue: number;
  overduePayments: number;
  classesToday: number;
  attendanceToday: number;
  newStudentsThisMonth: number;
  churnRate: number;
}

interface RevenueChartData {
  month: string;
  revenue: number;
  target: number;
}

interface AttendanceChartData {
  day: string;
  attendance: number;
  capacity: number;
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get('/dashboard/stats');
    return response.data;
  },

  getRevenueChart: async (period: 'week' | 'month' | 'quarter' | 'year'): Promise<RevenueChartData[]> => {
    const response = await apiClient.get('/dashboard/revenue-chart', {
      params: { period },
    });
    return response.data;
  },

  getAttendanceChart: async (): Promise<AttendanceChartData[]> => {
    const response = await apiClient.get('/dashboard/attendance-chart');
    return response.data;
  },
};