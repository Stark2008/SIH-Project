import { Router } from 'express';
import { prisma } from '../prismaClient';
import { authenticate, authorize } from '../middleware/auth';
import { isValidUUID } from '../utils/validation';

const router = Router();

// GET /api/requirements
// Returns all active requirements. Authenticated users can view this (e.g. farmers looking for demand)
router.get('/', authenticate, async (req, res) => {
  try {
    const requirements = await prisma.requirement.findMany({
      where: { status: 'OPEN' },
      include: {
        buyer: {
          select: { id: true, name: true, location: true },
        },
      },
    });
    res.json({ success: true, data: { requirements } });
  } catch (error) {
    console.error('Get requirements error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/requirements/mine
// Return only the authenticated buyer's requirements
router.get('/mine', authenticate, authorize(['BUYER']), async (req, res) => {
  try {
    const requirements = await prisma.requirement.findMany({
      where: { buyerId: req.user!.id },
    });
    res.json({ success: true, data: { requirements } });
  } catch (error) {
    console.error('Get my requirements error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/requirements/:id
// View specific requirement
router.get('/:id', authenticate, async (req, res) => {
  try {
    const reqId = req.params.id as string;
    if (!isValidUUID(reqId)) {
      return res.status(400).json({ success: false, message: 'Invalid requirement ID format' });
    }

    const requirement = await prisma.requirement.findUnique({
      where: { id: reqId },
      include: {
        buyer: {
          select: { id: true, name: true, location: true },
        },
      },
    });

    if (!requirement) {
      return res.status(404).json({ success: false, message: 'Requirement not found' });
    }

    res.json({ success: true, data: { requirement } });
  } catch (error) {
    console.error('Get requirement by id error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/requirements
// Create new requirement. Permit only BUYER.
router.post('/', authenticate, authorize(['BUYER']), async (req, res) => {
  try {
    const { crop, quantity, qualityGrade, deliveryLocation } = req.body;

    // Validation
    if (!crop || !quantity || !qualityGrade || !deliveryLocation) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be positive' });
    }

    const requirement = await prisma.requirement.create({
      data: {
        buyerId: req.user!.id, // Set from authenticated user, never request body
        crop,
        quantity,
        qualityGrade,
        deliveryLocation,
        status: 'OPEN',
      },
    });

    res.status(201).json({ success: true, message: 'Requirement created successfully', data: { requirement } });
  } catch (error) {
    console.error('Create requirement error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PATCH /api/requirements/:id
// Update requirement. Permit only owner or admin.
router.patch('/:id', authenticate, authorize(['BUYER', 'ADMIN']), async (req, res) => {
  try {
    const reqId = req.params.id as string;
    if (!isValidUUID(reqId)) {
      return res.status(400).json({ success: false, message: 'Invalid requirement ID format' });
    }
    const { crop, quantity, qualityGrade, deliveryLocation, status } = req.body;

    const existingReq = await prisma.requirement.findUnique({ where: { id: reqId } });
    if (!existingReq) {
      return res.status(404).json({ success: false, message: 'Requirement not found' });
    }

    // Check ownership
    if (existingReq.buyerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions to modify this record' });
    }

    const updateData: any = {};
    if (crop !== undefined) updateData.crop = crop;
    if (quantity !== undefined) {
      if (quantity <= 0) return res.status(400).json({ success: false, message: 'Quantity must be positive' });
      updateData.quantity = quantity;
    }
    if (qualityGrade !== undefined) updateData.qualityGrade = qualityGrade;
    if (deliveryLocation !== undefined) updateData.deliveryLocation = deliveryLocation;
    if (status !== undefined) {
      if (!['OPEN', 'FULFILLED', 'CANCELLED'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }
      updateData.status = status;
    }

    const updatedReq = await prisma.requirement.update({
      where: { id: reqId },
      data: updateData,
    });

    res.json({ success: true, message: 'Requirement updated successfully', data: { requirement: updatedReq } });
  } catch (error) {
    console.error('Update requirement error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE /api/requirements/:id
// Delete requirement. Permit only owner or admin.
router.delete('/:id', authenticate, authorize(['BUYER', 'ADMIN']), async (req, res) => {
  try {
    const reqId = req.params.id as string;
    if (!isValidUUID(reqId)) {
      return res.status(400).json({ success: false, message: 'Invalid requirement ID format' });
    }

    const existingReq = await prisma.requirement.findUnique({ where: { id: reqId } });
    if (!existingReq) {
      return res.status(404).json({ success: false, message: 'Requirement not found' });
    }

    // Check ownership
    if (existingReq.buyerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions to delete this record' });
    }

    // Check if requirement has linked orders
    const orderCount = await prisma.order.count({ where: { requirementId: reqId } });
    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete requirement with existing orders.'
      });
    }

    // Delete requirement
    await prisma.requirement.delete({
      where: { id: reqId },
    });

    res.json({ success: true, message: 'Requirement deleted successfully' });
  } catch (error) {
    console.error('Delete requirement error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
