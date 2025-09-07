import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { users, storeConfig } from '../../shared/schema';
import { clients } from '../../shared/saas-schema';
import { eq } from 'drizzle-orm';
import { requireTenant } from '../middleware/tenant';
import bcrypt from 'bcryptjs';

const router = Router();

// All client routes require valid tenant context
router.use(requireTenant);

// Client onboarding status
router.get('/onboarding/status', async (req: any, res) => {
  try {
    const clientId = req.tenant?.id;
    
    if (!clientId) {
      return res.status(400).json({ message: 'No client context found' });
    }

    // Get client info
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check if store config exists
    const [config] = await db
      .select()
      .from(storeConfig)
      .where(eq(storeConfig.clientId, clientId))
      .limit(1);

    // Check if admin user exists
    const [adminUser] = await db
      .select()
      .from(users)
      .where(eq(users.clientId, clientId))
      .limit(1);

    const completed = Boolean(config && adminUser && config.setupCompleted);

    res.json({
      completed,
      currentStep: completed ? 3 : (config ? (adminUser ? 3 : 2) : 1),
      clientInfo: {
        name: client.name,
        subdomain: client.subdomain,
        planName: client.settings ? JSON.parse(client.settings).planName : 'Trial',
        trialEndsAt: client.trialEndsAt
      }
    });
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    res.status(500).json({ message: 'Failed to check onboarding status' });
  }
});

// Store setup for client onboarding
const storeSetupSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal(''))
});

router.post('/onboarding/store', async (req: any, res) => {
  try {
    const clientId = req.tenant?.id;
    
    if (!clientId) {
      return res.status(400).json({ message: 'No client context found' });
    }

    const { name, address, phone, email } = storeSetupSchema.parse(req.body);

    // Check if store config already exists
    const [existingConfig] = await db
      .select()
      .from(storeConfig)
      .where(eq(storeConfig.clientId, clientId))
      .limit(1);

    if (existingConfig) {
      // Update existing config
      const [updatedConfig] = await db
        .update(storeConfig)
        .set({
          name,
          address: address || '',
          phone: phone || '',
          email: email || '',
          updatedAt: new Date()
        })
        .where(eq(storeConfig.id, existingConfig.id))
        .returning();

      res.json({
        success: true,
        message: 'Store configuration updated successfully',
        config: updatedConfig
      });
    } else {
      // Create new config
      const [newConfig] = await db
        .insert(storeConfig)
        .values({
          clientId,
          name,
          address: address || '',
          phone: phone || '',
          email: email || '',
          taxRate: '11.00',
          setupCompleted: false
        })
        .returning();

      res.json({
        success: true,
        message: 'Store configuration created successfully',
        config: newConfig
      });
    }
  } catch (error) {
    console.error('Error setting up store:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: error.errors 
      });
    }
    res.status(500).json({ message: 'Failed to setup store configuration' });
  }
});

// Admin user creation for client onboarding
const adminSetupSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  email: z.string().email('Valid email is required'),
  firstName: z.string().optional(),
  lastName: z.string().optional()
});

router.post('/onboarding/admin', async (req: any, res) => {
  try {
    const clientId = req.tenant?.id;
    
    if (!clientId) {
      return res.status(400).json({ message: 'No client context found' });
    }

    const { username, password, email, firstName, lastName } = adminSetupSchema.parse(req.body);

    // Check if admin user already exists for this client
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.clientId, clientId))
      .limit(1);

    if (existingUser) {
      return res.status(400).json({ message: 'Admin user already exists for this client' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const [newUser] = await db
      .insert(users)
      .values({
        clientId,
        username,
        password: hashedPassword,
        email,
        firstName: firstName || 'Admin',
        lastName: lastName || 'User',
        role: 'admin',
        isActive: true
      })
      .returning();

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;

    res.json({
      success: true,
      message: 'Admin user created successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: error.errors 
      });
    }
    res.status(500).json({ message: 'Failed to create admin user' });
  }
});

// Complete onboarding
router.post('/onboarding/complete', async (req: any, res) => {
  try {
    const clientId = req.tenant?.id;
    
    if (!clientId) {
      return res.status(400).json({ message: 'No client context found' });
    }

    // Update store config to mark setup as completed
    const [updatedConfig] = await db
      .update(storeConfig)
      .set({
        setupCompleted: true,
        updatedAt: new Date()
      })
      .where(eq(storeConfig.clientId, clientId))
      .returning();

    if (!updatedConfig) {
      return res.status(400).json({ message: 'Store configuration not found' });
    }

    res.json({
      success: true,
      message: 'Onboarding completed successfully! Welcome to LaptopPOS!'
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    res.status(500).json({ message: 'Failed to complete onboarding' });
  }
});

export default router;