
import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { validateInput } from '../utils/validation';

const revenueChartSchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
});

export const dashboardController = {
  // Estatísticas gerais
  getStats: async (req: AuthRequest, res: Response) => {
    try {
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const startOfToday = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

      // Executar queries em paralelo para melhor performance
      const [
        totalStudents,
        activeStudents,
        monthlyPayments,
        overduePayments,
        classesToday,
        attendanceToday,
        newStudentsThisMonth,
        lastMonthStudents,
      ] = await Promise.all([
        // Total de alunos
        req.prisma.studentProfile.count(),

        // Alunos ativos
        req.prisma.studentProfile.count({
          where: { active: true },
        }),

        // Pagamentos do mês atual
        req.prisma.payment.aggregate({
          where: {
            paymentDate: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          _sum: {
            amount: true,
          },
        }),

        // Pagamentos em atraso
        req.prisma.monthlyFee.count({
          where: {
            status: 'overdue',
            student: { active: true },
          },
        }),

        // Aulas de hoje
        req.prisma.class.count({
          where: {
            date: {
              gte: startOfToday,
              lt: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000),
            },
            status: { in: ['scheduled', 'ongoing'] },
          },
        }),

        // Presenças de hoje
        req.prisma.attendance.count({
          where: {
            checkInTime: {
              gte: startOfToday,
              lt: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000),
            },
          },
        }),

        // Novos alunos este mês
        req.prisma.studentProfile.count({
          where: {
            enrollmentDate: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        }),

        // Alunos do mês passado para calcular churn
        req.prisma.studentProfile.count({
          where: {
            enrollmentDate: {
              lt: startOfMonth,
            },
            active: true,
          },
        }),
      ]);

      // Calcular taxa de churn (simplificado)
      const churnRate = lastMonthStudents > 0 
        ? ((lastMonthStudents - (activeStudents - newStudentsThisMonth)) / lastMonthStudents) * 100
        : 0;

      const stats = {
        totalStudents,
        activeStudents,
        monthlyRevenue: monthlyPayments._sum.amount || 0,
        overduePayments,
        classesToday,
        attendanceToday,
        newStudentsThisMonth,
        churnRate: Math.max(0, churnRate),
      };

      res.json({
        success: true,
        data: stats,
      });

    } catch (error) {
      req.logger.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  },

  // Dados para gráfico de faturamento
  getRevenueChart: async (req: AuthRequest, res: Response) => {
    try {
      const { period } = validateInput(revenueChartSchema, req.query);

      let groupBy: string;
      let dateFormat: string;
      let startDate: Date;

      const now = new Date();

      switch (period) {
        case 'week':
          groupBy = 'DATE(payment_date)';
          dateFormat = 'DD/MM';
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          groupBy = 'EXTRACT(MONTH FROM payment_date)';
          dateFormat = 'MMMM';
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        case 'year':
          groupBy = 'EXTRACT(MONTH FROM payment_date)';
          dateFormat = 'MMMM';
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default: // month
          groupBy = 'DATE(payment_date)';
          dateFormat = 'DD/MM';
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const revenueData = await req.prisma.$queryRaw`
        SELECT 
          ${groupBy} as period,
          SUM(amount) as revenue,
          COUNT(*) as transactions
        FROM payments 
        WHERE payment_date >= ${startDate}
        GROUP BY ${groupBy}
        ORDER BY period ASC
      `;

      // Calcular meta (baseado na média dos últimos meses)
      const avgRevenue = await req.prisma.payment.aggregate({
        where: {
          paymentDate: {
            gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), // últimos 3 meses
          },
        },
        _avg: {
          amount: true,
        },
      });

      const target = (avgRevenue._avg.amount || 0) * 1.1; // Meta 10% acima da média

      const formattedData = (revenueData as any[]).map(item => ({
        period: item.period,
        revenue: Number(item.revenue),
        target,
        transactions: Number(item.transactions),
      }));

      res.json({
        success: true,
        data: formattedData,
      });

    } catch (error) {
      req.logger.error('Erro ao buscar dados de faturamento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  },

  // Dados para gráfico de frequência
  getAttendanceChart: async (req: AuthRequest, res: Response) => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Últimos 7 dias

      const attendanceData = await req.prisma.$queryRaw`
        SELECT 
          DATE(check_in_time) as day,
          COUNT(*) as attendance
        FROM attendances 
        WHERE check_in_time >= ${startDate}
        GROUP BY DATE(check_in_time)
        ORDER BY day ASC
      `;

      // Buscar capacidade média das aulas
      const avgCapacity = await req.prisma.classSchedule.aggregate({
        _avg: {
          maxCapacity: true,
        },
      });

      const capacity = avgCapacity._avg.maxCapacity || 30;

      const formattedData = (attendanceData as any[]).map(item => ({
        day: item.day,
        attendance: Number(item.attendance),
        capacity,
      }));

      res.json({
        success: true,
        data: formattedData,
      });

    } catch (error) {
      req.logger.error('Erro ao buscar dados de frequência:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  },
};
