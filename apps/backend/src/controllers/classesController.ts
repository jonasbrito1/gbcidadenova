
import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { validateInput } from '../utils/validation';

const listClassesSchema = z.object({
  date: z.string().optional(),
  instructor: z.string().uuid().optional(),
  program: z.string().uuid().optional(),
  status: z.enum(['scheduled', 'ongoing', 'completed', 'cancelled']).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

const createAttendanceSchema = z.object({
  studentId: z.string().uuid('ID do aluno é obrigatório'),
  checkInTime: z.string().datetime().optional(),
  checkOutTime: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const classesController = {
  // Listar aulas
  list: async (req: AuthRequest, res: Response) => {
    try {
      const {
        date,
        instructor,
        program,
        status,
        page,
        limit,
      } = validateInput(listClassesSchema, {
        ...req.query,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      });

      const offset = (page - 1) * limit;

      // Construir filtros
      const where: any = {};

      if (date) {
        const targetDate = new Date(date);
        const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
        where.date = {
          gte: targetDate,
          lt: nextDay,
        };
      }

      if (instructor) {
        where.OR = [
          { instructorId: instructor },
          { substituteInstructorId: instructor },
        ];
      }

      if (program) {
        where.schedule = {
          programId: program,
        };
      }

      if (status) {
        where.status = status;
      }

      // Buscar aulas
      const [classes, total] = await Promise.all([
        req.prisma.class.findMany({
          where,
          include: {
            schedule: {
              include: {
                program: true,
              },
            },
            instructor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            substituteInstructor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            attendances: {
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
              },
            },
          },
          orderBy: [
            { date: 'asc' },
            { schedule: { startTime: 'asc' } },
          ],
          skip: offset,
          take: limit,
        }),
        req.prisma.class.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: classes,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });

    } catch (error) {
      req.logger.error('Erro ao listar aulas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  },

  // Buscar aula por ID
  getById: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const classData = await req.prisma.class.findUnique({
        where: { id },
        include: {
          schedule: {
            include: {
              program: true,
            },
          },
          instructor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          substituteInstructor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          attendances: {
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
            },
            orderBy: {
              checkInTime: 'asc',
            },
          },
        },
      });

      if (!classData) {
        return res.status(404).json({
          success: false,
          error: 'Aula não encontrada',
        });
      }

      res.json({
        success: true,
        data: classData,
      });

    } catch (error) {
      req.logger.error('Erro ao buscar aula:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  },

  // Registrar presença
  addAttendance: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { studentId, checkInTime, checkOutTime, notes } = validateInput(
        createAttendanceSchema,
        req.body
      );

      // Verificar se aula existe
      const classData = await req.prisma.class.findUnique({
        where: { id },
      });

      if (!classData) {
        return res.status(404).json({
          success: false,
          error: 'Aula não encontrada',
        });
      }

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

      // Verificar se já existe presença registrada
      const existingAttendance = await req.prisma.attendance.findUnique({
        where: {
          classId_studentId: {
            classId: id,
            studentId,
          },
        },
      });

      if (existingAttendance) {
        return res.status(409).json({
          success: false,
          error: 'Presença já registrada para este aluno',
        });
      }

      // Criar registro de presença
      const attendance = await req.prisma.attendance.create({
        data: {
          classId: id,
          studentId,
          checkInTime: checkInTime ? new Date(checkInTime) : new Date(),
          checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
          notes,
          createdBy: req.user!.id,
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
        },
      });

      // Atualizar contador de presença na aula
      await req.prisma.class.update({
        where: { id },
        data: {
          attendanceCount: {
            increment: 1,
          },
        },
      });

      req.logger.info('Presença registrada', {
        classId: id,
        studentId,
        createdBy: req.user!.id,
      });

      res.status(201).json({
        success: true,
        data: attendance,
        message: 'Presença registrada com sucesso',
      });

    } catch (error) {
      req.logger.error('Erro ao registrar presença:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  },

  // Aulas de hoje
  getToday: async (req: AuthRequest, res: Response) => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const classes = await req.prisma.class.findMany({
        where: {
          date: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
        include: {
          schedule: {
            include: {
              program: true,
            },
          },
          instructor: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          attendances: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          schedule: {
            startTime: 'asc',
          },
        },
      });

      res.json({
        success: true,
        data: classes,
      });

    } catch (error) {
      req.logger.error('Erro ao buscar aulas de hoje:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  },
};