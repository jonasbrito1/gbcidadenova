// =============================================
// ROUTES - apps/backend/src/routes/students.ts
// =============================================

import { Router } from 'express';
import { studentsController } from '../controllers/studentsController';
import { requireRole } from '../middleware/auth';

const router = Router();

// Todas as rotas requerem autenticação (já aplicado no app.use)
router.get('/', studentsController.list);
router.get('/:id', studentsController.getById);

// Apenas admin, manager e front_desk podem criar/editar alunos
router.post('/', requireRole(['admin', 'manager', 'front_desk']), studentsController.create);
router.put('/:id', requireRole(['admin', 'manager', 'front_desk']), studentsController.update);

// Apenas admin e manager podem deletar
router.delete('/:id', requireRole(['admin', 'manager']), studentsController.delete);

export default router;