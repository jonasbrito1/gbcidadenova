
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { Fragment } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { studentsApi } from '../../services/api/studentsApi';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

const createStudentSchema = z.object({
  firstName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  lastName: z.string().min(2, 'Sobrenome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  cpf: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  medicalConditions: z.string().optional(),
  monthlyFee: z.number().positive('Mensalidade deve ser positiva'),
  paymentDueDay: z.number().min(1).max(28, 'Dia deve estar entre 1 e 28'),
});

type CreateStudentFormData = z.infer<typeof createStudentSchema>;

interface CreateStudentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateStudentModal: React.FC<CreateStudentModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateStudentFormData>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      monthlyFee: 180,
      paymentDueDay: 5,
    },
  });

  const createMutation = useMutation({
    mutationFn: studentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Aluno criado com sucesso!');
      reset();
      onSuccess();
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Erro ao criar aluno';
      toast.error(message);
    },
  });

  const onSubmit = (data: CreateStudentFormData) => {
    createMutation.mutate({
      ...data,
      birthDate: data.birthDate ? new Date(data.birthDate).toISOString() : undefined,
    });
  };

  const handleClose = () => {
    if (!createMutation.isPending) {
      reset();
      onClose();
    }
  };

  // Máscara para CPF
  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    setValue('cpf', value);
  };

  // Máscara para telefone
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{2})(\d)/, '($1) $2');
    value = value.replace(/(\d{4,5})(\d{4})$/, '$1-$2');
    setValue('phone', value);
    setValue('emergencyContactPhone', value); // Para contato de emergência também
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                  >
                    Novo Aluno
                  </Dialog.Title>
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                    onClick={handleClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Dados Pessoais */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                      Dados Pessoais
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        {...register('firstName')}
                        label="Nome"
                        placeholder="Nome do aluno"
                        error={errors.firstName?.message}
                      />

                      <Input
                        {...register('lastName')}
                        label="Sobrenome"
                        placeholder="Sobrenome do aluno"
                        error={errors.lastName?.message}
                      />

                      <Input
                        {...register('email')}
                        type="email"
                        label="Email"
                        placeholder="email@exemplo.com"
                        error={errors.email?.message}
                      />

                      <Input
                        {...register('phone')}
                        label="Telefone"
                        placeholder="(99) 99999-9999"
                        onChange={handlePhoneChange}
                        error={errors.phone?.message}
                      />

                      <Input
                        {...register('birthDate')}
                        type="date"
                        label="Data de Nascimento"
                        error={errors.birthDate?.message}
                      />

                      <Input
                        {...register('cpf')}
                        label="CPF"
                        placeholder="000.000.000-00"
                        onChange={handleCPFChange}
                        maxLength={14}
                        error={errors.cpf?.message}
                      />
                    </div>
                  </div>

                  {/* Contato de Emergência */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                      Contato de Emergência
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        {...register('emergencyContactName')}
                        label="Nome do Contato"
                        placeholder="Nome completo"
                        error={errors.emergencyContactName?.message}
                      />

                      <Input
                        {...register('emergencyContactPhone')}
                        label="Telefone do Contato"
                        placeholder="(99) 99999-9999"
                        onChange={handlePhoneChange}
                        error={errors.emergencyContactPhone?.message}
                      />
                    </div>
                  </div>

                  {/* Informações Médicas */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                      Informações Médicas
                    </h4>
                    <Input
                      {...register('medicalConditions')}
                      label="Condições Médicas"
                      placeholder="Alergias, restrições médicas, etc."
                      multiline
                      rows={3}
                      error={errors.medicalConditions?.message}
                    />
                  </div>

                  {/* Informações Financeiras */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                      Informações Financeiras
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        {...register('monthlyFee', { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        min="0"
                        label="Mensalidade"
                        placeholder="180.00"
                        error={errors.monthlyFee?.message}
                      />

                      <Select
                        {...register('paymentDueDay', { valueAsNumber: true })}
                        label="Dia de Vencimento"
                        error={errors.paymentDueDay?.message}
                      >
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                          <option key={day} value={day}>
                            Dia {day}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  {/* Botões */}
                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      disabled={createMutation.isPending}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      loading={createMutation.isPending}
                      disabled={createMutation.isPending}
                    >
                      Criar Aluno
                    </Button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};