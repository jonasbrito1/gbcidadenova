
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  twoFactorToken: z.string().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      toast.success('Login realizado com sucesso!');
      navigate(from, { replace: true });
    } catch (error: any) {
      if (error.response?.data?.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        toast.info('Digite o código do seu aplicativo autenticador');
      } else {
        const message = error.response?.data?.error || 'Erro no login';
        toast.error(message);
        setError('root', { message });
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-auto flex justify-center">
            <img
              className="h-12 w-auto"
              src="/assets/images/gb_logo.png"
              alt="Gracie Barra"
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Entre na sua conta
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Sistema de Gestão Gracie Barra Cidade Nova
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <Input
                {...register('email')}
                type="email"
                placeholder="Email"
                autoComplete="email"
                error={errors.email?.message}
              />
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Senha
              </label>
              <div className="relative">
                <Input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Senha"
                  autoComplete="current-password"
                  error={errors.password?.message}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {requiresTwoFactor && (
              <div>
                <label htmlFor="twoFactorToken" className="sr-only">
                  Código de verificação
                </label>
                <Input
                  {...register('twoFactorToken')}
                  type="text"
                  placeholder="Código de 6 dígitos"
                  maxLength={6}
                  error={errors.twoFactorToken?.message}
                />
              </div>
            )}
          </div>

          {errors.root && (
            <div className="text-red-600 text-sm text-center">
              {errors.root.message}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <a
                href="/auth/forgot-password"
                className="font-medium text-red-600 hover:text-red-500"
              >
                Esqueceu sua senha?
              </a>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              className="w-full"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </div>
        </form>

        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          © 2025 Gracie Barra Cidade Nova. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
};