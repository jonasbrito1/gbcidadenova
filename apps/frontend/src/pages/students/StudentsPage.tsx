
import { PlusIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { CreateStudentModal } from '../../components/students/CreateStudentModal';
import { DeleteStudentModal } from '../../components/students/DeleteStudentModal';
import { EditStudentModal } from '../../components/students/EditStudentModal';
import { StudentsFilters } from '../../components/students/StudentsFilters';
import { StudentsTable } from '../../components/students/StudentsTable';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import { studentsApi } from '../../services/api/studentsApi';
import { Student } from '../../types/student';

interface StudentsFilters {
  page: number;
  limit: number;
  search: string;
  status: 'all' | 'active' | 'inactive';
  belt: string;
  sortBy: 'name' | 'registration' | 'enrollment' | 'belt';
  sortOrder: 'asc' | 'desc';
}

export const StudentsPage: React.FC = () => {
  const [filters, setFilters] = useState<StudentsFilters>({
    page: 1,
    limit: 20,
    search: '',
    status: 'all',
    belt: '',
    sortBy: 'name',
    sortOrder: 'asc',
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['students', filters],
    queryFn: () => studentsApi.list(filters),
    keepPreviousData: true,
  });

  const handleFilterChange = (newFilters: Partial<StudentsFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: newFilters.page || 1, // Reset page when other filters change
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
  };

  const handleDelete = (student: Student) => {
    setDeletingStudent(student);
  };

  const handleSuccess = () => {
    refetch();
    setShowCreateModal(false);
    setEditingStudent(null);
    setDeletingStudent(null);
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Erro ao carregar alunos</p>
        <Button onClick={() => refetch()} className="mt-4">
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
            Alunos
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gerencie os alunos da academia
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Novo Aluno
          </Button>
        </div>
      </div>

      {/* Filters */}
      <StudentsFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        totalStudents={data?.pagination?.total || 0}
      />

      {/* Table */}
      <StudentsTable
        students={data?.data || []}
        loading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Pagination */}
      {data?.pagination && (
        <Pagination
          currentPage={data.pagination.page}
          totalPages={data.pagination.totalPages}
          totalItems={data.pagination.total}
          itemsPerPage={data.pagination.limit}
          onPageChange={handlePageChange}
        />
      )}

      {/* Modals */}
      <CreateStudentModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleSuccess}
      />

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          open={!!editingStudent}
          onClose={() => setEditingStudent(null)}
          onSuccess={handleSuccess}
        />
      )}

      {deletingStudent && (
        <DeleteStudentModal
          student={deletingStudent}
          open={!!deletingStudent}
          onClose={() => setDeletingStudent(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};