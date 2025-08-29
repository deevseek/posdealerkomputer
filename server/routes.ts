import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertProductSchema,
  insertCustomerSchema,
  insertSupplierSchema,
  insertTransactionSchema,
  insertTransactionItemSchema,
  insertServiceTicketSchema,
  insertStockMovementSchema,
  insertFinancialRecordSchema,
  insertCategorySchema,
  insertStoreConfigSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Store configuration routes
  app.get('/api/store-config', isAuthenticated, async (req, res) => {
    try {
      const config = await storage.getStoreConfig();
      res.json(config);
    } catch (error) {
      console.error("Error fetching store config:", error);
      res.status(500).json({ message: "Failed to fetch store config" });
    }
  });

  app.post('/api/store-config', isAuthenticated, async (req, res) => {
    try {
      const configData = insertStoreConfigSchema.parse(req.body);
      const config = await storage.upsertStoreConfig(configData);
      res.json(config);
    } catch (error) {
      console.error("Error updating store config:", error);
      res.status(500).json({ message: "Failed to update store config" });
    }
  });

  // Category routes
  app.get('/api/categories', isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post('/api/categories', isAuthenticated, async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Product routes
  app.get('/api/products', isAuthenticated, async (req, res) => {
    try {
      const { search } = req.query;
      let products;
      
      if (search) {
        products = await storage.searchProducts(search as string);
      } else {
        products = await storage.getProducts();
      }
      
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/products/low-stock', isAuthenticated, async (req, res) => {
    try {
      const products = await storage.getLowStockProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching low stock products:", error);
      res.status(500).json({ message: "Failed to fetch low stock products" });
    }
  });

  app.get('/api/products/:id', isAuthenticated, async (req, res) => {
    try {
      const product = await storage.getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post('/api/products', isAuthenticated, async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put('/api/products/:id', isAuthenticated, async (req, res) => {
    try {
      const productData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, productData);
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete('/api/products/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Customer routes
  app.get('/api/customers', isAuthenticated, async (req, res) => {
    try {
      const { search } = req.query;
      let customers;
      
      if (search) {
        customers = await storage.searchCustomers(search as string);
      } else {
        customers = await storage.getCustomers();
      }
      
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get('/api/customers/:id', isAuthenticated, async (req, res) => {
    try {
      const customer = await storage.getCustomerById(req.params.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.post('/api/customers', isAuthenticated, async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(customerData);
      res.json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.put('/api/customers/:id', isAuthenticated, async (req, res) => {
    try {
      const customerData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(req.params.id, customerData);
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  // Supplier routes
  app.get('/api/suppliers', isAuthenticated, async (req, res) => {
    try {
      const suppliers = await storage.getSuppliers();
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.post('/api/suppliers', isAuthenticated, async (req, res) => {
    try {
      const supplierData = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(supplierData);
      res.json(supplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      res.status(500).json({ message: "Failed to create supplier" });
    }
  });

  // Transaction routes
  app.get('/api/transactions', isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const transactions = await storage.getTransactions(limit);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get('/api/transactions/:id', isAuthenticated, async (req, res) => {
    try {
      const transaction = await storage.getTransactionById(req.params.id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      console.error("Error fetching transaction:", error);
      res.status(500).json({ message: "Failed to fetch transaction" });
    }
  });

  const createTransactionSchema = z.object({
    transaction: insertTransactionSchema,
    items: z.array(insertTransactionItemSchema),
  });

  app.post('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const { transaction: transactionData, items } = createTransactionSchema.parse(req.body);
      
      // Generate transaction number
      const transactionNumber = `TRX-${Date.now()}`;
      
      const transaction = await storage.createTransaction(
        { ...transactionData, transactionNumber, userId: req.user.claims.sub },
        items
      );
      
      res.json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  // Service Ticket routes
  app.get('/api/service-tickets', isAuthenticated, async (req, res) => {
    try {
      const { active } = req.query;
      let tickets;
      
      if (active === 'true') {
        tickets = await storage.getActiveServiceTickets();
      } else {
        tickets = await storage.getServiceTickets();
      }
      
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching service tickets:", error);
      res.status(500).json({ message: "Failed to fetch service tickets" });
    }
  });

  app.get('/api/service-tickets/:id', isAuthenticated, async (req, res) => {
    try {
      const ticket = await storage.getServiceTicketById(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: "Service ticket not found" });
      }
      res.json(ticket);
    } catch (error) {
      console.error("Error fetching service ticket:", error);
      res.status(500).json({ message: "Failed to fetch service ticket" });
    }
  });

  app.post('/api/service-tickets', isAuthenticated, async (req, res) => {
    try {
      const ticketData = insertServiceTicketSchema.parse(req.body);
      
      // Generate ticket number
      const ticketNumber = `SVC-${Date.now()}`;
      
      const ticket = await storage.createServiceTicket({
        ...ticketData,
        ticketNumber,
      });
      
      res.json(ticket);
    } catch (error) {
      console.error("Error creating service ticket:", error);
      res.status(500).json({ message: "Failed to create service ticket" });
    }
  });

  app.put('/api/service-tickets/:id', isAuthenticated, async (req, res) => {
    try {
      const ticketData = insertServiceTicketSchema.partial().parse(req.body);
      const ticket = await storage.updateServiceTicket(req.params.id, ticketData);
      res.json(ticket);
    } catch (error) {
      console.error("Error updating service ticket:", error);
      res.status(500).json({ message: "Failed to update service ticket" });
    }
  });

  // Stock Movement routes
  app.get('/api/stock-movements', isAuthenticated, async (req, res) => {
    try {
      const { productId } = req.query;
      const movements = await storage.getStockMovements(productId as string);
      res.json(movements);
    } catch (error) {
      console.error("Error fetching stock movements:", error);
      res.status(500).json({ message: "Failed to fetch stock movements" });
    }
  });

  app.post('/api/stock-movements', isAuthenticated, async (req: any, res) => {
    try {
      const movementData = insertStockMovementSchema.parse(req.body);
      const movement = await storage.createStockMovement({
        ...movementData,
        userId: req.user.claims.sub,
      });
      res.json(movement);
    } catch (error) {
      console.error("Error creating stock movement:", error);
      res.status(500).json({ message: "Failed to create stock movement" });
    }
  });

  // Financial Record routes
  app.get('/api/financial-records', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const records = await storage.getFinancialRecords(start, end);
      res.json(records);
    } catch (error) {
      console.error("Error fetching financial records:", error);
      res.status(500).json({ message: "Failed to fetch financial records" });
    }
  });

  app.post('/api/financial-records', isAuthenticated, async (req: any, res) => {
    try {
      const recordData = insertFinancialRecordSchema.parse(req.body);
      const record = await storage.createFinancialRecord({
        ...recordData,
        userId: req.user.claims.sub,
      });
      res.json(record);
    } catch (error) {
      console.error("Error creating financial record:", error);
      res.status(500).json({ message: "Failed to create financial record" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
