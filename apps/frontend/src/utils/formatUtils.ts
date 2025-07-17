
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatCPF = (cpf: string): string => {
  const cleaned = cpf.replace(/\D/g, '');
  const match = cleaned.match(/(\d{3})(\d{3})(\d{3})(\d{2})/);
  if (match) {
    return `${match[1]}.${match[2]}.${match[3]}-${match[4]}`;
  }
  return cpf;
};

export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/(\d{2})(\d{4,5})(\d{4})/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
};

export const formatRegistrationNumber = (number: string): string => {
  const cleaned = number.replace(/\D/g, '');
  const match = cleaned.match(/(\d{4})(\d{4})/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  return number;
};