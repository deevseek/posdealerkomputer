import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { db } from "./db";
import { 
  financialRecords,
  serviceTickets,
  serviceTicketParts, 
  transactions,
  transactionItems,
  products,
  categories,
  customers,
  suppliers,
  stockMovements,
  employees,
  payrollRecords,
  attendanceRecords,
  storeConfig
} from "@shared/schema";
import { eq } from "drizzle-orm";
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
  insertStoreConfigSchema,
  insertRoleSchema,
  generateSKU,
  generateBarcode
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

  // Reports API endpoints
  app.get('/api/reports/sales', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      const report = await storage.getSalesReport(start, end);
      res.json(report);
    } catch (error) {
      console.error("Error fetching sales report:", error);
      res.status(500).json({ message: "Failed to fetch sales report" });
    }
  });

  app.get('/api/reports/services', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      const report = await storage.getServiceReport(start, end);
      res.json(report);
    } catch (error) {
      console.error("Error fetching service report:", error);
      res.status(500).json({ message: "Failed to fetch service report" });
    }
  });

  app.get('/api/reports/financial', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      const report = await storage.getFinancialReport(start, end);
      res.json(report);
    } catch (error) {
      console.error("Error fetching financial report:", error);
      res.status(500).json({ message: "Failed to fetch financial report" });
    }
  });

  app.get('/api/reports/inventory', isAuthenticated, async (req, res) => {
    try {
      const report = await storage.getInventoryReport();
      res.json(report);
    } catch (error) {
      console.error("Error fetching inventory report:", error);
      res.status(500).json({ message: "Failed to fetch inventory report" });
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
      const productWithCodes = {
        ...productData,
        sku: generateSKU(),
        barcode: generateBarcode(),
      };
      const product = await storage.createProduct(productWithCodes);
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
      console.log("Raw request body:", JSON.stringify(req.body, null, 2));
      
      // Manual validation and transformation
      const { customerId, deviceType, deviceBrand, deviceModel, problem, diagnosis, solution, status, technicianId, estimatedCost, laborCost } = req.body;
      
      const ticketData = {
        customerId: customerId || "",
        deviceType: deviceType || "",
        deviceBrand: deviceBrand || null,
        deviceModel: deviceModel || null,
        problem: problem || "",
        diagnosis: diagnosis || null,
        solution: solution || null,
        status: status || 'pending',
        technicianId: technicianId || null,
        estimatedCost: estimatedCost ? String(estimatedCost) : null,
        laborCost: laborCost ? String(laborCost) : null,
        actualCost: null,
        partsCost: null,
        estimatedCompletion: null,
        completedAt: null,
      };
      
      console.log("Processed ticket data:", JSON.stringify(ticketData, null, 2));
      
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
      console.log("Raw update body:", JSON.stringify(req.body, null, 2));
      
      // Manual validation and transformation for update
      const { customerId, deviceType, deviceBrand, deviceModel, problem, diagnosis, solution, status, technicianId, estimatedCost, laborCost, parts } = req.body;
      
      const ticketData: any = {};
      
      if (customerId !== undefined) ticketData.customerId = customerId;
      if (deviceType !== undefined) ticketData.deviceType = deviceType;
      if (deviceBrand !== undefined) ticketData.deviceBrand = deviceBrand || null;
      if (deviceModel !== undefined) ticketData.deviceModel = deviceModel || null;
      if (problem !== undefined) ticketData.problem = problem;
      if (diagnosis !== undefined) ticketData.diagnosis = diagnosis || null;
      if (solution !== undefined) ticketData.solution = solution || null;
      if (status !== undefined) ticketData.status = status;
      if (technicianId !== undefined) ticketData.technicianId = technicianId || null;
      if (estimatedCost !== undefined) ticketData.estimatedCost = estimatedCost ? String(estimatedCost) : null;
      if (laborCost !== undefined) ticketData.laborCost = laborCost ? String(laborCost) : null;
      
      console.log("Processed update data:", JSON.stringify(ticketData, null, 2));
      
      const ticket = await storage.updateServiceTicket(req.params.id, ticketData, parts);
      res.json(ticket);
    } catch (error) {
      console.error("Error updating service ticket:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update service ticket" });
    }
  });

  // Get parts for a service ticket
  app.get('/api/service-tickets/:id/parts', isAuthenticated, async (req, res) => {
    try {
      const parts = await storage.getServiceTicketParts(req.params.id);
      res.json(parts);
    } catch (error) {
      console.error("Error fetching service ticket parts:", error);
      res.status(500).json({ message: "Failed to fetch service ticket parts" });
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


  // User Management routes
  app.get('/api/users', isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userData = req.body;
      const user = await storage.updateUser(id, userData);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Role Management routes
  app.get('/api/roles', isAuthenticated, async (req, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  app.post('/api/roles', isAuthenticated, async (req, res) => {
    try {
      const roleData = insertRoleSchema.parse(req.body);
      const role = await storage.createRole(roleData);
      res.json(role);
    } catch (error) {
      console.error("Error creating role:", error);
      res.status(500).json({ message: "Failed to create role" });
    }
  });

  app.put('/api/roles/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const roleData = req.body;
      const role = await storage.updateRole(id, roleData);
      res.json(role);
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  app.delete('/api/roles/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteRole(id);
      res.json({ message: "Role deleted successfully" });
    } catch (error) {
      console.error("Error deleting role:", error);
      res.status(500).json({ message: "Failed to delete role" });
    }
  });

  // New Finance Management Routes
  const { financeManager } = await import('./financeManager');

  // Financial Transactions
  app.get('/api/finance/transactions', isAuthenticated, async (req, res) => {
    try {
      const { type, category, startDate, endDate, referenceType } = req.query;
      const filters = {
        type: type as string,
        category: category as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        referenceType: referenceType as string
      };
      const transactions = await financeManager.getTransactions(filters);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post('/api/finance/transactions', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub || '46332812';
      const transaction = await financeManager.createTransaction({
        ...req.body,
        userId
      });
      res.json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  app.get('/api/finance/summary', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const summary = await financeManager.getSummary(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(summary);
    } catch (error) {
      console.error("Error fetching summary:", error);
      res.status(500).json({ message: "Failed to fetch summary" });
    }
  });

  app.delete('/api/finance/service-records/:serviceId', isAuthenticated, async (req, res) => {
    try {
      const { serviceId } = req.params;
      
      // Delete all financial records related to this service
      await db.delete(financialRecords).where(eq(financialRecords.reference, serviceId));
      
      res.json({ message: "Service financial records cleared" });
    } catch (error) {
      console.error("Error clearing service financial records:", error);
      res.status(500).json({ message: "Failed to clear records" });
    }
  });

  // Reset database (keep only users and roles)
  app.post('/api/admin/reset-database', isAuthenticated, async (req, res) => {
    try {
      await db.transaction(async (tx) => {
        // Delete in correct order to handle foreign keys
        await tx.delete(attendanceRecords);
        await tx.delete(payrollRecords);
        await tx.delete(employees);
        await tx.delete(financialRecords);
        await tx.delete(stockMovements);
        await tx.delete(serviceTicketParts);
        await tx.delete(serviceTickets);
        await tx.delete(transactionItems);
        await tx.delete(transactions);
        await tx.delete(products);
        await tx.delete(categories);
        await tx.delete(customers);
        await tx.delete(suppliers);
        await tx.delete(storeConfig);
      });
      
      res.json({ message: "Database reset completed. Users and roles preserved." });
    } catch (error) {
      console.error("Error resetting database:", error);
      res.status(500).json({ message: "Failed to reset database" });
    }
  });

  // Employee Management
  app.get('/api/employees', isAuthenticated, async (req, res) => {
    try {
      const { includeInactive } = req.query;
      const employees = await financeManager.getEmployees(includeInactive === 'true');
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.post('/api/employees', isAuthenticated, async (req, res) => {
    try {
      const employee = await financeManager.createEmployee(req.body);
      res.json(employee);
    } catch (error) {
      console.error("Error creating employee:", error);
      res.status(500).json({ message: "Failed to create employee" });
    }
  });

  app.put('/api/employees/:id', isAuthenticated, async (req, res) => {
    try {
      const employee = await financeManager.updateEmployee(req.params.id, req.body);
      res.json(employee);
    } catch (error) {
      console.error("Error updating employee:", error);
      res.status(500).json({ message: "Failed to update employee" });
    }
  });

  // Payroll Management
  app.get('/api/payroll', isAuthenticated, async (req, res) => {
    try {
      const { employeeId } = req.query;
      const payrolls = await financeManager.getPayrollRecords(employeeId as string);
      res.json(payrolls);
    } catch (error) {
      console.error("Error fetching payroll records:", error);
      res.status(500).json({ message: "Failed to fetch payroll records" });
    }
  });

  app.post('/api/payroll', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub || '46332812';
      const payroll = await financeManager.createPayroll({
        ...req.body,
        userId
      });
      res.json(payroll);
    } catch (error) {
      console.error("Error creating payroll:", error);
      res.status(500).json({ message: "Failed to create payroll" });
    }
  });

  app.put('/api/payroll/:id/status', isAuthenticated, async (req, res) => {
    try {
      const { status } = req.body;
      const payroll = await financeManager.updatePayrollStatus(req.params.id, status);
      res.json(payroll);
    } catch (error) {
      console.error("Error updating payroll status:", error);
      res.status(500).json({ message: "Failed to update payroll status" });
    }
  });

  // Object storage routes
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  app.put("/api/logos", isAuthenticated, async (req, res) => {
    if (!req.body.logoURL) {
      return res.status(400).json({ error: "logoURL is required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(
        req.body.logoURL,
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting logo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
