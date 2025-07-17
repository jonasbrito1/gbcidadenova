// =============================================
// TYPES - apps/frontend/src/types/student.ts
// =============================================

export interface Student {
  id: string;
  userId: string;
  registrationNumber: string;
  birthDate?: string;
  cpf?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalConditions?: string;
  currentBelt: string;
  stripeCount: number;
  monthlyFee: number;
  paymentDueDay: number;
  enrollmentDate: string;
  active: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

export interface CreateStudentRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  birthDate?: string;
  cpf?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalConditions?: string;
  monthlyFee: number;
  paymentDueDay: number;
}