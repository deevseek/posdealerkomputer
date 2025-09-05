import express, { type Request, Response } from "express";
import { storage } from "./storage";
import { 
  insertDiscountConfigSchema,
  insertTrackingConfigSchema,
  insertWhatsappConfigSchema,
  insertPrintLayoutSchema,
  insertExpenseCategorySchema,
  insertDailyExpenseSchema
} from "@shared/schema";

const router = express.Router();

// Installation steps routes
router.get("/api/installation/steps", async (req: Request, res: Response) => {
  try {
    const steps = await storage.getInstallationSteps();
    res.json(steps);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch installation steps" });
  }
});

router.patch("/api/installation/steps/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const step = await storage.updateInstallationStep(id, updates);
    res.json(step);
  } catch (error) {
    res.status(404).json({ error: "Installation step not found" });
  }
});

// Discount configuration routes
router.get("/api/discounts/config", async (req: Request, res: Response) => {
  try {
    const configs = await storage.getDiscountConfigs();
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch discount configurations" });
  }
});

router.post("/api/discounts/config", async (req: Request, res: Response) => {
  try {
    const validatedData = insertDiscountConfigSchema.parse(req.body);
    const config = await storage.createDiscountConfig(validatedData);
    res.status(201).json(config);
  } catch (error) {
    res.status(400).json({ error: "Invalid discount configuration data" });
  }
});

router.patch("/api/discounts/config/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const config = await storage.updateDiscountConfig(id, req.body);
    res.json(config);
  } catch (error) {
    res.status(404).json({ error: "Discount configuration not found" });
  }
});

// Tracking configuration routes
router.get("/api/tracking/config", async (req: Request, res: Response) => {
  try {
    const config = await storage.getTrackingConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tracking configuration" });
  }
});

router.post("/api/tracking/config", async (req: Request, res: Response) => {
  try {
    const validatedData = insertTrackingConfigSchema.parse(req.body);
    const config = await storage.createTrackingConfig(validatedData);
    res.status(201).json(config);
  } catch (error) {
    res.status(400).json({ error: "Invalid tracking configuration data" });
  }
});

router.patch("/api/tracking/config/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const config = await storage.updateTrackingConfig(id, req.body);
    res.json(config);
  } catch (error) {
    res.status(404).json({ error: "Tracking configuration not found" });
  }
});

// WhatsApp configuration routes
router.get("/api/whatsapp/config", async (req: Request, res: Response) => {
  try {
    const config = await storage.getWhatsappConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch WhatsApp configuration" });
  }
});

router.post("/api/whatsapp/config", async (req: Request, res: Response) => {
  try {
    const validatedData = insertWhatsappConfigSchema.parse(req.body);
    const config = await storage.createWhatsappConfig(validatedData);
    res.status(201).json(config);
  } catch (error) {
    res.status(400).json({ error: "Invalid WhatsApp configuration data" });
  }
});

router.patch("/api/whatsapp/config/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const config = await storage.updateWhatsappConfig(id, req.body);
    res.json(config);
  } catch (error) {
    res.status(404).json({ error: "WhatsApp configuration not found" });
  }
});

// WhatsApp testing endpoints
router.post("/api/whatsapp/test", async (req: Request, res: Response) => {
  try {
    const config = await storage.getWhatsappConfig();
    if (!config) {
      return res.status(404).json({ error: "WhatsApp configuration not found" });
    }

    // Simulate API test
    const testResult = {
      success: true,
      message: "WhatsApp API connection successful",
      timestamp: new Date(),
    };

    // Update message count
    await storage.updateWhatsappConfig(config.id, {
      messagesSentToday: config.messagesSentToday + 1,
      lastMessageSent: new Date(),
    });

    res.json(testResult);
  } catch (error) {
    res.status(500).json({ error: "WhatsApp API test failed" });
  }
});

router.post("/api/whatsapp/retry-failed", async (req: Request, res: Response) => {
  try {
    const config = await storage.getWhatsappConfig();
    if (!config) {
      return res.status(404).json({ error: "WhatsApp configuration not found" });
    }

    // Simulate retry failed messages
    await storage.updateWhatsappConfig(config.id, {
      failedMessages: 0,
      pendingMessages: config.pendingMessages + config.failedMessages,
    });

    res.json({ message: "Retrying failed messages", retriedCount: config.failedMessages });
  } catch (error) {
    res.status(500).json({ error: "Failed to retry messages" });
  }
});

// Print layout routes
router.get("/api/print/layouts", async (req: Request, res: Response) => {
  try {
    const layouts = await storage.getPrintLayouts();
    res.json(layouts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch print layouts" });
  }
});

router.post("/api/print/layouts", async (req: Request, res: Response) => {
  try {
    const validatedData = insertPrintLayoutSchema.parse(req.body);
    const layout = await storage.createPrintLayout(validatedData);
    res.status(201).json(layout);
  } catch (error) {
    res.status(400).json({ error: "Invalid print layout data" });
  }
});

router.patch("/api/print/layouts/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const layout = await storage.updatePrintLayout(id, req.body);
    res.json(layout);
  } catch (error) {
    res.status(404).json({ error: "Print layout not found" });
  }
});

// Expense category routes
router.get("/api/expenses/categories", async (req: Request, res: Response) => {
  try {
    const categories = await storage.getExpenseCategories();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch expense categories" });
  }
});

router.post("/api/expenses/categories", async (req: Request, res: Response) => {
  try {
    const validatedData = insertExpenseCategorySchema.parse(req.body);
    const category = await storage.createExpenseCategory(validatedData);
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: "Invalid expense category data" });
  }
});

// Daily expense routes
router.get("/api/expenses/daily", async (req: Request, res: Response) => {
  try {
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const expenses = await storage.getDailyExpenses(date);
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch daily expenses" });
  }
});

router.post("/api/expenses/daily", async (req: Request, res: Response) => {
  try {
    const validatedData = insertDailyExpenseSchema.parse(req.body);
    const expense = await storage.createDailyExpense(validatedData);
    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ error: "Invalid daily expense data" });
  }
});

router.patch("/api/expenses/daily/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const expense = await storage.updateDailyExpense(id, req.body);
    res.json(expense);
  } catch (error) {
    res.status(404).json({ error: "Daily expense not found" });
  }
});

router.delete("/api/expenses/daily/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await storage.deleteDailyExpense(id);
    res.status(204).send();
  } catch (error) {
    res.status(404).json({ error: "Daily expense not found" });
  }
});

export default router;
