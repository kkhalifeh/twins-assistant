import { Router } from 'express';
import {
  getPaymentLogs,
  createPaymentLog,
  updatePaymentLog,
  deletePaymentLog,
  getPaymentSummary
} from '../controllers/payment.controller';
import { authMiddleware } from '../utils/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getPaymentLogs);
router.post('/', createPaymentLog);
router.put('/:id', updatePaymentLog);
router.delete('/:id', deletePaymentLog);
router.get('/summary', getPaymentSummary);

export default router;
