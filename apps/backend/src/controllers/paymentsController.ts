
import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { validateInput } from '../utils/validation';

const listPaymentsSchema = z.object({
  student: z.string().uuid().optional(),
  method: z.enum(['money', 'pix', 'card', 'transfer', 'check']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

const createPaymentSchema = z.object({
  studentId: z.string().uuid('ID do aluno é obrigatório'),
  monthlyFeeId: z.string().uuid().optional(),
  amount: z.number().positive('Valor deve ser positivo'),
  paymentMethod: z.enum(['money', 'pix', 'card', 'transfer', 'check']),
  paymentDate: z.string().datetime().optional(),
  referenceId: z.string().optional(),
  description: z.string().optional(),
});

export const paymentsController = {
  // Listar pagamentos
  list: async (req: AuthRequest, res: Response) => {
    try {
      const {
        student,
        method,
        dateFrom,
        dateTo,
        page,
        limit,
      } = validateInput(listPaymentsSchema, {
        ...req.query,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      });

      const offset = (page - 1) * limit;

      // Construir filtros
      const where: any = {};

      if (student) {
        where.studentId = student;
      }

      if (method) {
        where.paymentMethod = method;
      }

      if (dateFrom || dateTo) {
        where.paymentDate = {};
        if (dateFrom) {
          where.paymentDate.gte = new Date(dateFrom);
        }
        if (dateTo) {
          where.paymentDate.lte = new Date(dateTo);
        }
      }

      // Buscar pagamentos
      const [payments, total] = await Promise.all([
        req.prisma.payment.findMany({
          where,
          include: {
            student: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
            monthlyFee: {
              select: {
                id: true,
                referenceMonth: true,
                amount: true,
                status: true,
              },
            },
            processedBy: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            paymentDate: 'desc',
          },
          skip: offset,
          take: limit,
        }),
        req.prisma.payment.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: payments,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });

    } catch (error) {
      req.logger.error('Erro ao listar pagamentos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  },

  // Criar pagamento
  create: async (req: AuthRequest, res: Response) => {
    try {
      const {
        studentId,
        monthlyFeeId,
        amount,
        paymentMethod,
        paymentDate,
        referenceId,
        description,
      } = validateInput(createPaymentSchema, req.body);

      // Verificar se aluno existe
      const student = await req.prisma.studentProfile.findUnique({
        where: { id: studentId },
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          error: 'Aluno não encontrado',
        });
      }

      // Verificar mensalidade se fornecida
      let monthlyFee = null;
      if (monthlyFeeId) {
        monthlyFee = await req.prisma.monthlyFee.findFirst({
          where: {
            id: monthlyFeeId,
            studentId,
          },
        });

        if (!monthlyFee) {
          return res.status(404).json({
            success: false,
            error: 'Mensalidade não encontrada',
          });
        }
      }

      // Criar pagamento
      const payment = await req.prisma.$transaction(async (prisma) => {
        // Criar registro de pagamento
        const newPayment = await prisma.payment.create({
          data: {
            studentId,
            monthlyFeeId,
            amount,
            paymentMethod,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            referenceId,
            description,
            processedBy: req.user!.id,
          },
          include: {
            student: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            monthlyFee: true,
          },
        });

        // Atualizar status da mensalidade se aplicável
        if (monthlyFee && monthlyFee.finalAmount <= amount) {
          await prisma.monthlyFee.update({
            where: { id: monthlyFeeId! },
            data: { status: 'paid' },
          });
        }

        return newPayment;
      });

      req.logger.info('Pagamento registrado', {
        paymentId: payment.id,
        studentId,
        amount,
        processedBy: req.user!.id,
      });

      res.status(201).json({
        success: true,
        data: payment,
        message: 'Pagamento registrado com sucesso',
      });

    } catch (error) {
      req.logger.error('Erro ao criar pagamento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  },

  // Pagamentos em atraso
  getOverdue: async (req: AuthRequest, res: Response) => {
    try {
      const overduePayments = await req.prisma.monthlyFee.findMany({
        where: {
          status: 'overdue',
          student: {
            active: true,
          },
        },
        include: {
          student: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          dueDate: 'asc',
        },
        take: 50, // Limitar a 50 para performance
      });

      res.json({
        success: true,
        data: overduePayments,
      });

    } catch (error) {
      req.logger.error('Erro ao buscar pagamentos em atraso:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  },
};