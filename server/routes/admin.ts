import { Router } from 'express';
import { SaasController } from '../controllers/saasController';
import { requireSuperAdmin } from '../middleware/tenant';

const router = Router();

// All routes require super admin access
router.use(requireSuperAdmin);

// Dashboard and statistics
router.get('/dashboard', SaasController.getDashboardStats);
router.get('/clients', SaasController.getAllClients);
router.put('/clients/:clientId/status', SaasController.updateClientStatus);

// Add additional super admin routes here
router.get('/revenue', async (req, res) => {
  // Implementation for revenue tracking
  res.json({ message: 'Revenue data endpoint' });
});

router.get('/usage-stats', async (req, res) => {
  // Implementation for usage statistics
  res.json({ message: 'Usage statistics endpoint' });
});

export default router;