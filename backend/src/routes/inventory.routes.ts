import { Router } from 'express';
import {
  getInventoryItems,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getLowStockItems,
  restockItem,
  decreaseStock
} from '../controllers/inventory.controller';
import { authMiddleware } from '../utils/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getInventoryItems);
router.get('/low-stock', getLowStockItems);
router.get('/:id', getInventoryItem);
router.post('/', createInventoryItem);
router.put('/:id', updateInventoryItem);
router.delete('/:id', deleteInventoryItem);
router.put('/:id/restock', restockItem);
router.put('/:id/decrease', decreaseStock);

export default router;
