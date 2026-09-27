import { Router } from 'express';
import { prisma } from '../prismaClient';
import { authenticate, authorize } from '../middleware/auth';
import { isValidUUID } from '../utils/validation';

const router = Router();

// GET /api/produce
// Returns all available produce. Authenticated users can view this (e.g. buyers looking for produce)
router.get('/', authenticate, async (req, res) => {
  try {
    const produce = await prisma.produce.findMany({
      where: { status: 'AVAILABLE' },
      include: {
        supplier: {
          select: { id: true, name: true, location: true },
        },
      },
    });
    res.json({ success: true, data: { produce } });
  } catch (error) {
    console.error('Get produce error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/produce/mine
// Return only the authenticated user's produce
router.get('/mine', authenticate, authorize(['FARMER', 'FPO']), async (req, res) => {
  try {
    const produce = await prisma.produce.findMany({
      where: { supplierId: req.user!.id },
    });
    res.json({ success: true, data: { produce } });
  } catch (error) {
    console.error('Get my produce error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/produce/:id
// View specific produce
router.get('/:id', authenticate, async (req, res) => {
  try {
    const produceId = req.params.id as string;
    if (!isValidUUID(produceId)) {
      return res.status(400).json({ success: false, message: 'Invalid produce ID format' });
    }

    const produce = await prisma.produce.findUnique({
      where: { id: produceId },
      include: {
        supplier: {
          select: { id: true, name: true, location: true },
        },
      },
    });

    if (!produce) {
      return res.status(404).json({ success: false, message: 'Produce not found' });
    }

    res.json({ success: true, data: { produce } });
  } catch (error) {
    console.error('Get produce by id error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/produce
// Create new produce. Permit only FARMER and FPO.
router.post('/', authenticate, authorize(['FARMER', 'FPO']), async (req, res) => {
  try {
    const { crop, quantity, harvestDate, location, qualityGrade, expectedPrice } = req.body;

    // Validation
    if (!crop || !quantity || !harvestDate || !location || !qualityGrade || !expectedPrice) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be positive' });
    }

    if (expectedPrice <= 0) {
      return res.status(400).json({ success: false, message: 'Expected price must be positive' });
    }

    const parsedDate = new Date(harvestDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid harvest date' });
    }

    const produce = await prisma.produce.create({
      data: {
        supplierId: req.user!.id, // Set from authenticated user, never request body
        crop,
        quantity,
        harvestDate: parsedDate,
        location,
        qualityGrade,
        expectedPrice,
        status: 'AVAILABLE',
      },
    });

    res.status(201).json({ success: true, message: 'Produce created successfully', data: { produce } });
  } catch (error) {
    console.error('Create produce error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PATCH /api/produce/:id
// Update produce. Permit only owner or admin.
router.patch('/:id', authenticate, authorize(['FARMER', 'FPO', 'ADMIN']), async (req, res) => {
  try {
    const produceId = req.params.id as string;
    if (!isValidUUID(produceId)) {
      return res.status(400).json({ success: false, message: 'Invalid produce ID format' });
    }
    const { crop, quantity, harvestDate, location, qualityGrade, expectedPrice, status } = req.body;

    const existingProduce = await prisma.produce.findUnique({ where: { id: produceId } });
    if (!existingProduce) {
      return res.status(404).json({ success: false, message: 'Produce not found' });
    }

    // Check ownership
    if (existingProduce.supplierId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions to modify this record' });
    }

    const updateData: any = {};
    if (crop !== undefined) updateData.crop = crop;
    if (quantity !== undefined) {
      if (quantity <= 0) return res.status(400).json({ success: false, message: 'Quantity must be positive' });
      updateData.quantity = quantity;
    }
    if (harvestDate !== undefined) {
      const parsedDate = new Date(harvestDate);
      if (isNaN(parsedDate.getTime())) return res.status(400).json({ success: false, message: 'Invalid harvest date' });
      updateData.harvestDate = parsedDate;
    }
    if (location !== undefined) updateData.location = location;
    if (qualityGrade !== undefined) updateData.qualityGrade = qualityGrade;
    if (expectedPrice !== undefined) {
      if (expectedPrice <= 0) return res.status(400).json({ success: false, message: 'Expected price must be positive' });
      updateData.expectedPrice = expectedPrice;
    }
    if (status !== undefined) {
      if (!['AVAILABLE', 'COMMITTED', 'SOLD'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }
      updateData.status = status;
    }

    const updatedProduce = await prisma.produce.update({
      where: { id: produceId },
      data: updateData,
    });

    res.json({ success: true, message: 'Produce updated successfully', data: { produce: updatedProduce } });
  } catch (error) {
    console.error('Update produce error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE /api/produce/:id
// Delete produce. Permit only owner or admin.
router.delete('/:id', authenticate, authorize(['FARMER', 'FPO', 'ADMIN']), async (req, res) => {
  try {
    const produceId = req.params.id as string;
    if (!isValidUUID(produceId)) {
      return res.status(400).json({ success: false, message: 'Invalid produce ID format' });
    }

    const existingProduce = await prisma.produce.findUnique({ where: { id: produceId } });
    if (!existingProduce) {
      return res.status(404).json({ success: false, message: 'Produce not found' });
    }

    // Check ownership
    if (existingProduce.supplierId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions to delete this record' });
    }

    // Check if produce has linked orders
    const orderCount = await prisma.order.count({ where: { produceId } });
    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete produce with existing orders. You may update its status to SOLD or adjust quantity instead.'
      });
    }

    // Delete produce
    await prisma.produce.delete({
      where: { id: produceId },
    });

    res.json({ success: true, message: 'Produce deleted successfully' });
  } catch (error) {
    console.error('Delete produce error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
