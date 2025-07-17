// =============================================
// STUDENTS CONTROLLER - apps/backend/src/controllers/studentsController.ts
// =============================================

import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { generateRegistrationNumber } from '../utils/studentUtils';
import { validateInput } from '../utils/validation';

const createStudentSchema = z.object({
  email: z.string().email('Email inválido'),
  firstName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  lastName: z.string().min(2, 'Sobrenome deve ter pelo menos 2 caracteres'),
  phone: z.string().optional(),
  birthDate: z.string().datetime().optional(),
  cpf: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  medicalConditions: z.string().optional(),
  monthlyFee: z.number().positive('Mensalidade deve ser positiva'),
  paymentDueDay: z.number().min(1).max(28),
});

const updateStudentSchema = createStudentSchema.partial();

const listStudentsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).default('all'),
  belt: z.string().optional(),
  sortBy: z.enum(['name', 'registration', 'enrollment', 'belt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const studentsController = {
  // Listar alunos
  list: async (req: AuthRequest, res: Response) => {
    try {
      const {
        page,
        limit,
        search,
        status,
        belt,
        sortBy,
        sortOrder,
      } = validateInput(listStudentsSchema, {
        ...req.query,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      });

      const offset = (page - 1) * limit;

      // Construir filtros
      const where: any = {};

      if (status !== 'all') {
        where.active = status === 'active';
      }

      if (belt) {
        where.currentBelt = belt;
      }

      if (search) {
        where.OR = [
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { registrationNumber: { contains: search, mode: 'insensitive' } },
          { cpf: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Construir ordenação
      let orderBy: any = {};
      switch (sortBy) {
        case 'name':
          orderBy = { user: { firstName: sortOrder } };
          break;
        case 'registration':
          orderBy = { registrationNumber: sortOrder };
          break;
        case 'enrollment':
          orderBy = { enrollmentDate: sortOrder };
          break;
        case 'belt':
          orderBy = { currentBelt: sortOrder };
          break;
      }

      // Buscar alunos
      const [students, total] = await Promise.all([
        req.prisma.studentProfile.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                status: true,
              },
            },
          },
          orderBy,
          skip: offset,
          take: limit,
        }),
        req.prisma.studentProfile.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: students,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });

    } catch (error) {
      req.logger.error('Erro ao listar alunos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  },

  // Buscar aluno por ID
  getById: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const student = await req.prisma.studentProfile.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              status: true,
              createdAt: true,
            },
          },
          enrollments: {
            include: {
              program: true,
            },
          },
          graduations: {
            include: {
              instructor: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: {
              graduationDate: 'desc',
            },
          },
          monthlyFees: {
            orderBy: {
              referenceMonth: 'desc',
            },
            take: 12, // Últimos 12 meses
          },
        },
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          error: 'Aluno não encontrado',
        });
      }

      res.json({
        success: true,
        data: student,
      });

    } catch (error) {
      req.logger.error('Erro ao buscar aluno:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  },

  // Criar novo aluno
  create: async (req: AuthRequest, res: Response) => {
    try {
      const data = validateInput(createStudentSchema, req.body);

      // Verificar se email já existe
      const existingUser = await req.prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Email já está em uso',
        });
      }

      // Verificar CPF se fornecido
      if (data.cpf) {
        const existingCPF = await req.prisma.studentProfile.findUnique({
          where: { cpf: data.cpf },
        });

        if (existingCPF) {
          return res.status(409).json({
            success: false,
            error: 'CPF já está em uso',
          });
        }
      }

      // Gerar número de matrícula
      const registrationNumber = await generateRegistrationNumber(req.prisma);

      // Senha temporária
      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      // Criar usuário e perfil do aluno
      const result = await req.prisma.$transaction(async (prisma) => {
        // Criar usuário
        const user = await prisma.user.create({
          data: {
            email: data.email.toLowerCase(),
            passwordHash: hashedPassword,
            role: 'student',
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            createdBy: req.user!.id,
          },
        });

        // Criar perfil do aluno
        const studentProfile = await prisma.studentProfile.create({
          data: {
            userId: user.id,
            registrationNumber,
            birthDate: data.birthDate ? new Date(data.birthDate) : null,
            cpf: data.cpf,
            emergencyContactName: data.emergencyContactName,
            emergencyContactPhone: data.emergencyContactPhone,
            medicalConditions: data.medicalConditions,
            monthlyFee: data.monthlyFee,
            paymentDueDay: data.paymentDueDay,
          },
        });

        return { user, studentProfile };
      });

      // Log de auditoria
      req.logger.info('Aluno criado', {
        studentId: result.studentProfile.id,
        createdBy: req.user!.id,
        registrationNumber,
      });

      // Enviar email com credenciais (implementar)
      // await emailService.sendWelcomeStudent(data.email, tempPassword);

      res.status(201).json({
        success: true,
        data: {
          ...result.studentProfile,
          user: {
            id: result.user.id,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            email: result.user.email,
            phone: result.user.phone,
          },
        },
        message: 'Aluno criado com sucesso',
      });

    } catch (error) {
      req.logger.error('Erro ao criar aluno:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  },

  // Atualizar aluno
  update: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = validateInput(updateStudentSchema, req.body);

      // Verificar se aluno existe
      const existingStudent = await req.prisma.studentProfile.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!existingStudent) {
        return res.status(404).json({
          success: false,
          error: 'Aluno não encontrado',
        });
      }

      // Verificar email único se fornecido
      if (data.email && data.email !== existingStudent.user.email) {
        const emailExists = await req.prisma.user.findUnique({
          where: { email: data.email.toLowerCase() },
        });

        if (emailExists) {
          return res.status(409).json({
            success: false,
            error: 'Email já está em uso',
          });
        }
      }

      // Verificar CPF único se fornecido
      if (data.cpf && data.cpf !== existingStudent.cpf) {
        const cpfExists = await req.prisma.studentProfile.findUnique({
          where: { cpf: data.cpf },
        });

        if (cpfExists) {
          return res.status(409).json({
            success: false,
            error: 'CPF já está em uso',
          });
        }
      }

      // Atualizar dados
      const result = await req.prisma.$transaction(async (prisma) => {
        // Atualizar usuário se necessário
        if (data.email || data.firstName || data.lastName || data.phone) {
          await prisma.user.update({
            where: { id: existingStudent.userId },
            data: {
              ...(data.email && { email: data.email.toLowerCase() }),
              ...(data.firstName && { firstName: data.firstName }),
              ...(data.lastName && { lastName: data.lastName }),
              ...(data.phone && { phone: data.phone }),
            },
          });
        }

        // Atualizar perfil do aluno
        const studentProfile = await prisma.studentProfile.update({
          where: { id },
          data: {
            ...(data.birthDate && { birthDate: new Date(data.birthDate) }),
            ...(data.cpf && { cpf: data.cpf }),
            ...(data.emergencyContactName && { emergencyContactName: data.emergencyContactName }),
            ...(data.emergencyContactPhone && { emergencyContactPhone: data.emergencyContactPhone }),
            ...(data.medicalConditions !== undefined && { medicalConditions: data.medicalConditions }),
            ...(data.monthlyFee && { monthlyFee: data.monthlyFee }),
            ...(data.paymentDueDay && { paymentDueDay: data.paymentDueDay }),
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        });

        return studentProfile;
      });

      req.logger.info('Aluno atualizado', {
        studentId: id,
        updatedBy: req.user!.id,
      });

      res.json({
        success: true,
        data: result,
        message: 'Aluno atualizado com sucesso',
      });

    } catch (error) {
      req.logger.error('Erro ao atualizar aluno:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  },

  // Deletar aluno (soft delete)
  delete: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const student = await req.prisma.studentProfile.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          error: 'Aluno não encontrado',
        });
      }

      // Soft delete - desativar aluno
      await req.prisma.$transaction(async (prisma) => {
        await prisma.user.update({
          where: { id: student.userId },
          data: { status: 'inactive' },
        });

        await prisma.studentProfile.update({
          where: { id },
          data: { active: false },
        });
      });

      req.logger.info('Aluno desativado', {
        studentId: id,
        deletedBy: req.user!.id,
      });

      res.json({
        success: true,
        message: 'Aluno desativado com sucesso',
      });

    } catch (error) {
      req.logger.error('Erro ao deletar aluno:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  },
};