import { Router } from 'express';
import { prisma } from '../prismaClient';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// GET /api/matches
// Deterministic matching:
// - BUYER: matches open requirements with available produce
// - FARMER/FPO: matches available produce listings with open buyer requirements
// - ADMIN: matches all open requirements with available produce
router.get('/', authenticate, authorize(['BUYER', 'FARMER', 'FPO', 'ADMIN']), async (req, res) => {
  try {
    const userRole = req.user!.role;
    const userId = req.user!.id;

    if (userRole === 'FARMER' || userRole === 'FPO') {
      // Find supplier's available produce
      const supplierProduce = await prisma.produce.findMany({
        where: {
          supplierId: userId,
          status: 'AVAILABLE',
          quantity: { gt: 0 }
        }
      });

      if (supplierProduce.length === 0) {
        return res.json({ success: true, data: { matches: [] }, message: 'No available produce to match.' });
      }

      const supplierCrops = [...new Set(supplierProduce.map(p => p.crop))];

      // Find open requirements matching these crops
      const openRequirements = await prisma.requirement.findMany({
        where: {
          crop: { in: supplierCrops },
          status: 'OPEN',
          quantity: { gt: 0 }
        },
        include: {
          buyer: { select: { id: true, name: true, location: true } }
        }
      });

      const matches = supplierProduce.map(produce => {
        const potentialReqs = openRequirements.filter(req =>
          req.crop.toLowerCase() === produce.crop.toLowerCase() &&
          req.qualityGrade === produce.qualityGrade
        );

        return {
          produceId: produce.id,
          crop: produce.crop,
          availableQuantity: produce.quantity,
          price: produce.expectedPrice,
          matchedRequirements: potentialReqs.map(req => ({
            requirementId: req.id,
            buyerName: req.buyer.name,
            deliveryLocation: req.deliveryLocation,
            requestedQuantity: req.quantity
          }))
        };
      });

      return res.json({ success: true, data: { matches }, message: 'Simulated deterministic matching (Prototype)' });
    }

    // Default to BUYER or ADMIN behavior
    const requirementWhere: any = { status: 'OPEN' };
    if (userRole !== 'ADMIN') {
      requirementWhere.buyerId = userId;
    }

    const openRequirements = await prisma.requirement.findMany({
      where: requirementWhere,
      include: {
        buyer: { select: { id: true, name: true, location: true } }
      }
    });

    if (openRequirements.length === 0) {
      return res.json({ success: true, data: { matches: [] }, message: 'No open requirements to match.' });
    }

    const targetCrops = [...new Set(openRequirements.map(req => req.crop))];

    // Find available produce that matches the required crops
    const matchingProduce = await prisma.produce.findMany({
      where: {
        crop: { in: targetCrops },
        status: 'AVAILABLE',
        quantity: { gt: 0 }
      },
      include: {
        supplier: { select: { id: true, name: true, location: true } }
      }
    });

    // Construct matches map for each requirement
    const matches = openRequirements.map(req => {
      const potentialProduce = matchingProduce.filter(p =>
        p.crop.toLowerCase() === req.crop.toLowerCase() &&
        p.qualityGrade === req.qualityGrade
      );

      return {
        requirementId: req.id,
        crop: req.crop,
        requestedQuantity: req.quantity,
        matchedProduce: potentialProduce.map(p => ({
          produceId: p.id,
          supplierName: p.supplier.name,
          location: p.location,
          availableQuantity: p.quantity,
          price: p.expectedPrice
        }))
      };
    });

    res.json({ success: true, data: { matches }, message: 'Simulated deterministic matching (Prototype)' });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
