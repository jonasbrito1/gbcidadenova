// =============================================
// STUDENTS TABLE - apps/frontend/src/components/students/StudentsTable.tsx
// =============================================

import {
    EyeIcon,
    PencilIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Student } from '../../types/student';
import { formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/formatUtils';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface StudentsTableProps {
  students: Student[];
  loading?: boolean;
  onEdit?: (student: Student) => void;
  onDelete?: (student: Student) => void;
}

const beltColors: Record<string, string> = {
  white: 'bg-gray-100 text-gray-800',
  grey: 'bg-gray-300 text-gray-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  orange: 'bg-orange-100 text-orange-800',
  green: 'bg-green-100 text-green-800',
  blue: 'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
  brown: 'bg-amber-100 text-amber-800',
  black: 'bg-gray-900 text-white',
  red: 'bg-red-100 text-red-800',
};

export const StudentsTable: React.FC<StudentsTableProps> = ({
  students,
  loading = false,
  onEdit,
  onDelete,
}) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Aluno
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Registro
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Faixa
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Mensalidade
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Matrícula
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {student.user.firstName.charAt(0)}{student.user.lastName.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {student.user.firstName} {student.user.lastName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {student.user.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {student.registrationNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge
                    variant="custom"
                    className={beltColors[student.currentBelt] || beltColors.white}
                  >
                    {student.currentBelt}
                    {student.stripeCount > 0 && (
                      <span className="ml-1">
                        {'★'.repeat(student.stripeCount)}
                      </span>
                    )}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {formatCurrency(student.monthlyFee)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant={student.active ? 'success' : 'secondary'}>
                    {student.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(student.enrollmentDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/students/${student.id}`)}
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(student)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(student)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};