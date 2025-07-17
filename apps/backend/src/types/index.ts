export interface User {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'instructor' | 'front_desk' | 'student';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentProfile {
  id: string;
  userId: string;
  registrationNumber: string;
  birthDate?: Date;
  cpf?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalConditions?: string;
  currentBelt: BeltColor;
  stripeCount: number;
  monthlyFee: number;
  paymentDueDay: number;
  enrollmentDate: Date;
  active: boolean;
  user: User;
}

export interface InstructorProfile {
  id: string;
  userId: string;
  employeeId?: string;
  beltLevel: BeltColor;
  certificationLevel?: string;
  hireDate: Date;
  salary?: number;
  commissionRate: number;
  bio?: string;
  specializations: string[];
  active: boolean;
  user: User;
}

export type BeltColor = 
  | 'white' | 'grey' | 'yellow' | 'orange' | 'green' 
  | 'blue' | 'purple' | 'brown' | 'black' | 'red';

export type PaymentStatus = 
  | 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded';

export type PaymentMethod = 
  | 'money' | 'pix' | 'card' | 'transfer' | 'check';

export interface AuthRequest extends Request {
  user?: User;
  prisma: PrismaClient;
  redis: any;
  logger: winston.Logger;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}