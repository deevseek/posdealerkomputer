import { Router } from 'express';
import { SaasController } from '../controllers/saasController';
import { tenantMiddleware, requireTenant, requireSuperAdmin, checkSubscriptionLimits } from '../middleware/tenant';

const router = Router();

// Public routes (no authentication required)
router.post('/register', SaasController.registerClient);
router.get('/plans', SaasController.getPlans);
router.post('/payment', SaasController.processPayment);

// Tenant-specific routes (require valid tenant)
router.get('/client/info', tenantMiddleware, requireTenant, SaasController.getClientInfo);
router.post('/subscription', tenantMiddleware, requireTenant, SaasController.createSubscription);

// Super Admin routes (require super admin privileges)
router.get('/admin/clients', requireSuperAdmin, SaasController.getAllClients);
router.put('/admin/clients/:clientId/status', requireSuperAdmin, SaasController.updateClientStatus);
router.get('/admin/dashboard', requireSuperAdmin, SaasController.getDashboardStats);

// Feature-limited routes examples
router.post('/whatsapp/send', requireTenant, checkSubscriptionLimits('whatsapp'), (req, res) => {
  res.json({ message: 'WhatsApp message sent (requires Pro plan or higher)' });
});

router.post('/api/export', requireTenant, checkSubscriptionLimits('export'), (req, res) => {
  res.json({ message: 'Data exported (requires Premium plan)' });
});

export default router;