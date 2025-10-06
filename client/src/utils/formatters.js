// Utilitários de formatação para padrão brasileiro

// Configurar locale padrão
const LOCALE_PT_BR = 'pt-BR';

/**
 * Formatar moeda em Real brasileiro
 * @param {number} value - Valor numérico
 * @param {boolean} showSymbol - Mostrar símbolo R$
 * @returns {string} Valor formatado
 */
export const formatCurrency = (value, showSymbol = true) => {
  if (value === null || value === undefined || isNaN(value)) {
    return showSymbol ? 'R$ 0,00' : '0,00';
  }

  const options = {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  };

  return new Intl.NumberFormat(LOCALE_PT_BR, options).format(Number(value));
};

/**
 * Formatar número com padrão brasileiro
 * @param {number} value - Valor numérico
 * @param {number} decimals - Casas decimais
 * @returns {string} Número formatado
 */
export const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }

  const options = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  };

  return new Intl.NumberFormat(LOCALE_PT_BR, options).format(Number(value));
};

/**
 * Formatar data para padrão brasileiro
 * @param {string|Date} date - Data
 * @param {string} format - Formato (date, datetime, time)
 * @returns {string} Data formatada
 */
export const formatDate = (date, format = 'date') => {
  if (!date) return '';

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';

  let options = {};

  switch (format) {
    case 'date':
      options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      };
      break;
    case 'datetime':
      options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      };
      break;
    case 'time':
      options = {
        hour: '2-digit',
        minute: '2-digit'
      };
      break;
    case 'long':
      options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      break;
    case 'short':
      options = {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit'
      };
      break;
    default:
      options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      };
  }

  return new Intl.DateTimeFormat(LOCALE_PT_BR, options).format(dateObj);
};

/**
 * Formatar telefone brasileiro
 * @param {string} phone - Número de telefone
 * @returns {string} Telefone formatado
 */
export const formatPhone = (phone) => {
  if (!phone) return '';

  // Remove tudo que não é número
  const numbers = phone.replace(/\D/g, '');

  if (numbers.length === 11) {
    // Celular: (11) 99999-9999
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (numbers.length === 10) {
    // Fixo: (11) 9999-9999
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (numbers.length === 9) {
    // Celular sem DDD: 99999-9999
    return numbers.replace(/(\d{5})(\d{4})/, '$1-$2');
  } else if (numbers.length === 8) {
    // Fixo sem DDD: 9999-9999
    return numbers.replace(/(\d{4})(\d{4})/, '$1-$2');
  }

  return phone;
};

/**
 * Formatar CPF
 * @param {string} cpf - CPF
 * @returns {string} CPF formatado
 */
export const formatCPF = (cpf) => {
  if (!cpf) return '';

  const numbers = cpf.replace(/\D/g, '');

  if (numbers.length === 11) {
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  return cpf;
};

/**
 * Formatar CEP
 * @param {string} cep - CEP
 * @returns {string} CEP formatado
 */
export const formatCEP = (cep) => {
  if (!cep) return '';

  const numbers = cep.replace(/\D/g, '');

  if (numbers.length === 8) {
    return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
  }

  return cep;
};

/**
 * Formatar porcentagem
 * @param {number} value - Valor entre 0 e 1 ou 0 e 100
 * @param {number} decimals - Casas decimais
 * @param {boolean} isDecimal - Se o valor está em decimal (0-1) ou percentual (0-100)
 * @returns {string} Porcentagem formatada
 */
export const formatPercent = (value, decimals = 2, isDecimal = false) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }

  const numValue = isDecimal ? Number(value) : Number(value) / 100;

  const options = {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  };

  return new Intl.NumberFormat(LOCALE_PT_BR, options).format(numValue);
};

/**
 * Formatar texto com capitalização adequada
 * @param {string} text - Texto
 * @param {string} type - Tipo de capitalização (title, sentence, upper, lower)
 * @returns {string} Texto formatado
 */
export const formatText = (text, type = 'title') => {
  if (!text) return '';

  switch (type) {
    case 'title':
      // Primeira letra de cada palavra maiúscula, exceto preposições
      const smallWords = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'com', 'por', 'para'];
      return text.toLowerCase().split(' ').map((word, index) => {
        if (index === 0 || !smallWords.includes(word)) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
        return word;
      }).join(' ');

    case 'sentence':
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

    case 'upper':
      return text.toUpperCase();

    case 'lower':
      return text.toLowerCase();

    default:
      return text;
  }
};

/**
 * Remover acentos de texto
 * @param {string} text - Texto com acentos
 * @returns {string} Texto sem acentos
 */
export const removeAccents = (text) => {
  if (!text) return '';

  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

/**
 * Validar email
 * @param {string} email - Email
 * @returns {boolean} É válido
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validar CPF
 * @param {string} cpf - CPF
 * @returns {boolean} É válido
 */
export const isValidCPF = (cpf) => {
  if (!cpf) return false;

  const numbers = cpf.replace(/\D/g, '');

  if (numbers.length !== 11) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(numbers)) return false;

  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers.charAt(10))) return false;

  return true;
};

/**
 * Converter data para input date
 * @param {string|Date} date - Data
 * @returns {string} Data no formato YYYY-MM-DD
 */
export const toInputDate = (date) => {
  if (!date) return '';

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export default {
  formatCurrency,
  formatNumber,
  formatDate,
  formatPhone,
  formatCPF,
  formatCEP,
  formatPercent,
  formatText,
  removeAccents,
  isValidEmail,
  isValidCPF,
  toInputDate
};