// =============================================
// UTILS - apps/backend/src/utils/studentUtils.ts
// =============================================

export const generateRegistrationNumber = async (prisma: any): Promise<string> => {
  const year = new Date().getFullYear().toString().slice(-2);
  
  // Buscar último número do ano
  const lastStudent = await prisma.studentProfile.findFirst({
    where: {
      registrationNumber: {
        startsWith: year,
      },
    },
    orderBy: {
      registrationNumber: 'desc',
    },
  });

  let nextNumber = 1;
  if (lastStudent) {
    const lastNumber = parseInt(lastStudent.registrationNumber.slice(-4));
    nextNumber = lastNumber + 1;
  }

  // Formato: YY0001 (ex: 250001)
  return `${year}${nextNumber.toString().padStart(4, '0')}`;
};