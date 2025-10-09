import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../utils/auth';
import { parseFloatSafe, parseIntSafe } from '../utils/validation';

export const getInventoryItems = async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.query;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const where: any = { userId };
    if (category) where.category = category as string;

    const items = await prisma.inventory.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(items);
  } catch (error) {
    console.error('Get inventory items error:', error);
    res.status(500).json({
      error: 'Failed to fetch inventory items'
    });
  }
};

export const getInventoryItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const item = await prisma.inventory.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    res.json(item);
  } catch (error) {
    console.error('Get inventory item error:', error);
    res.status(500).json({
      error: 'Failed to fetch inventory item'
    });
  }
};

export const createInventoryItem = async (req: AuthRequest, res: Response) => {
  try {
    const {
      category,
      brand,
      itemName,
      unitSize,
      currentStock,
      minimumStock,
      consumptionRate,
      notes
    } = req.body;

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!category || !itemName || currentStock === undefined || minimumStock === undefined) {
      return res.status(400).json({
        error: 'Category, item name, current stock, and minimum stock are required'
      });
    }

    // Calculate next reorder date if consumption rate is provided
    let nextReorderDate = null;
    if (consumptionRate && consumptionRate > 0) {
      const daysUntilReorder = (currentStock - minimumStock) / consumptionRate;
      if (daysUntilReorder > 0) {
        nextReorderDate = new Date();
        nextReorderDate.setDate(nextReorderDate.getDate() + Math.floor(daysUntilReorder));
      }
    }

    const item = await prisma.inventory.create({
      data: {
        userId,
        category,
        brand,
        itemName,
        unitSize: unitSize || '',
        currentStock: parseFloatSafe(currentStock) || 0,
        minimumStock: parseFloatSafe(minimumStock) || 0,
        consumptionRate: parseFloatSafe(consumptionRate),
        lastRestocked: new Date(),
        nextReorderDate,
        notes
      }
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Create inventory item error:', error);
    res.status(500).json({
      error: 'Failed to create inventory item'
    });
  }
};

export const updateInventoryItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const {
      category,
      brand,
      itemName,
      unitSize,
      currentStock,
      minimumStock,
      consumptionRate,
      notes
    } = req.body;

    // Build update data object
    const updateData: any = {};
    if (category !== undefined) updateData.category = category;
    if (brand !== undefined) updateData.brand = brand;
    if (itemName !== undefined) updateData.itemName = itemName;
    if (unitSize !== undefined) updateData.unitSize = unitSize;
    if (currentStock !== undefined) updateData.currentStock = parseFloatSafe(currentStock);
    if (minimumStock !== undefined) updateData.minimumStock = parseFloatSafe(minimumStock);
    if (consumptionRate !== undefined) updateData.consumptionRate = parseFloatSafe(consumptionRate);
    if (notes !== undefined) updateData.notes = notes;

    // Recalculate next reorder date if relevant fields changed
    if (currentStock !== undefined || minimumStock !== undefined || consumptionRate !== undefined) {
      const item = await prisma.inventory.findFirst({ where: { id, userId } });
      if (item) {
        const newStock = currentStock !== undefined ? parseFloatSafe(currentStock) || 0 : item.currentStock;
        const newMinStock = minimumStock !== undefined ? parseFloatSafe(minimumStock) || 0 : item.minimumStock;
        const newConsumption = consumptionRate !== undefined ? parseFloatSafe(consumptionRate) : item.consumptionRate;

        if (newConsumption && newConsumption > 0 && newStock > newMinStock) {
          const daysUntilReorder = (newStock - newMinStock) / newConsumption;
          const nextReorderDate = new Date();
          nextReorderDate.setDate(nextReorderDate.getDate() + Math.floor(daysUntilReorder));
          updateData.nextReorderDate = nextReorderDate;
        }
      }
    }

    const item = await prisma.inventory.update({
      where: {
        id,
        userId
      },
      data: updateData
    });

    res.json(item);
  } catch (error) {
    console.error('Update inventory item error:', error);
    res.status(500).json({
      error: 'Failed to update inventory item'
    });
  }
};

export const deleteInventoryItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    await prisma.inventory.delete({
      where: {
        id,
        userId
      }
    });

    res.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Delete inventory item error:', error);
    res.status(500).json({
      error: 'Failed to delete inventory item'
    });
  }
};

// Get low stock items
export const getLowStockItems = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Find items where current stock is at or below minimum stock
    const items = await prisma.inventory.findMany({
      where: {
        userId,
        currentStock: {
          lte: prisma.inventory.fields.minimumStock
        }
      },
      orderBy: { currentStock: 'asc' }
    });

    res.json(items);
  } catch (error) {
    console.error('Get low stock items error:', error);
    res.status(500).json({
      error: 'Failed to fetch low stock items'
    });
  }
};

// Restock an item
export const restockItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (quantity === undefined || quantity <= 0) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }

    // Get current item
    const currentItem = await prisma.inventory.findFirst({
      where: { id, userId }
    });

    if (!currentItem) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const newStock = currentItem.currentStock + (parseFloatSafe(quantity) || 0);

    // Calculate new reorder date
    let nextReorderDate = null;
    if (currentItem.consumptionRate && currentItem.consumptionRate > 0) {
      const daysUntilReorder = (newStock - currentItem.minimumStock) / currentItem.consumptionRate;
      if (daysUntilReorder > 0) {
        nextReorderDate = new Date();
        nextReorderDate.setDate(nextReorderDate.getDate() + Math.floor(daysUntilReorder));
      }
    }

    const item = await prisma.inventory.update({
      where: { id, userId },
      data: {
        currentStock: newStock,
        lastRestocked: new Date(),
        nextReorderDate
      }
    });

    res.json(item);
  } catch (error) {
    console.error('Restock item error:', error);
    res.status(500).json({
      error: 'Failed to restock item'
    });
  }
};

// Decrease stock (when item is used)
export const decreaseStock = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (quantity === undefined || quantity <= 0) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }

    // Get current item
    const currentItem = await prisma.inventory.findFirst({
      where: { id, userId }
    });

    if (!currentItem) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const newStock = Math.max(0, currentItem.currentStock - (parseFloatSafe(quantity) || 0));

    // Calculate new reorder date
    let nextReorderDate = null;
    if (currentItem.consumptionRate && currentItem.consumptionRate > 0 && newStock > currentItem.minimumStock) {
      const daysUntilReorder = (newStock - currentItem.minimumStock) / currentItem.consumptionRate;
      nextReorderDate = new Date();
      nextReorderDate.setDate(nextReorderDate.getDate() + Math.floor(daysUntilReorder));
    }

    const item = await prisma.inventory.update({
      where: { id, userId },
      data: {
        currentStock: newStock,
        nextReorderDate
      }
    });

    res.json(item);
  } catch (error) {
    console.error('Decrease stock error:', error);
    res.status(500).json({
      error: 'Failed to decrease stock'
    });
  }
};
