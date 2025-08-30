import {
  users,
  roles,
  storeConfig,
  categories,
  products,
  customers,
  suppliers,
  transactions,
  transactionItems,
  serviceTickets,
  serviceTicketParts,
  stockMovements,
  financialRecords,
  type User,
  type UpsertUser,
  type Role,
  type InsertRole,
  type StoreConfig,
  type InsertStoreConfig,
  type Category,
  type InsertCategory,
  type Product,
  type InsertProduct,
  type Customer,
  type InsertCustomer,
  type Supplier,
  type InsertSupplier,
  type Transaction,
  type InsertTransaction,
  type TransactionItem,
  type InsertTransactionItem,
  type ServiceTicket,
  type InsertServiceTicket,
  type ServiceTicketPart,
  type InsertServiceTicketPart,
  type StockMovement,
  type InsertStockMovement,
  type FinancialRecord,
  type InsertFinancialRecord,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, gte, lte, like, count, sum, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // User management
  getUsers(): Promise<User[]>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUser(id: string, user: Partial<UpsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  
  // Role management
  getRoles(): Promise<Role[]>;
  getRoleById(id: string): Promise<Role | undefined>;
  getRoleByName(name: string): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: string, role: Partial<InsertRole>): Promise<Role>;
  deleteRole(id: string): Promise<void>;
  
  // Store configuration
  getStoreConfig(): Promise<StoreConfig | undefined>;
  upsertStoreConfig(config: InsertStoreConfig): Promise<StoreConfig>;
  
  // Categories
  getCategories(): Promise<Category[]>;
  getCategoryById(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  
  // Products
  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  getProductByBarcode(barcode: string): Promise<Product | undefined>;
  searchProducts(query: string): Promise<Product[]>;
  getLowStockProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  
  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomerById(id: string): Promise<Customer | undefined>;
  searchCustomers(query: string): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(id: string): Promise<void>;
  
  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplierById(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier>;
  deleteSupplier(id: string): Promise<void>;
  
  // Transactions
  getTransactions(limit?: number): Promise<Transaction[]>;
  getTransactionById(id: string): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction, items: InsertTransactionItem[]): Promise<Transaction>;
  
  // Service Tickets
  getServiceTickets(): Promise<ServiceTicket[]>;
  getServiceTicketById(id: string): Promise<ServiceTicket | undefined>;
  getActiveServiceTickets(): Promise<ServiceTicket[]>;
  createServiceTicket(ticket: InsertServiceTicket): Promise<ServiceTicket>;
  updateServiceTicket(id: string, ticket: Partial<InsertServiceTicket>): Promise<ServiceTicket>;
  deleteServiceTicket(id: string): Promise<void>;
  
  // Stock Movements
  getStockMovements(productId?: string): Promise<StockMovement[]>;
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;
  
  // Financial Records
  getFinancialRecords(startDate?: Date, endDate?: Date): Promise<FinancialRecord[]>;
  createFinancialRecord(record: InsertFinancialRecord): Promise<FinancialRecord>;
  
  // Reports
  getSalesReport(startDate: Date, endDate: Date): Promise<{ totalSales: string; transactions: any[] }>;
  getServiceReport(startDate: Date, endDate: Date): Promise<{ totalServices: number; tickets: any[] }>;
  getFinancialReport(startDate: Date, endDate: Date): Promise<{ totalIncome: string; totalExpense: string; profit: string; records: any[] }>;
  getInventoryReport(): Promise<{ lowStockCount: number; lowStockProducts: any[]; totalProducts: number }>;
  
  // Dashboard Statistics
  getDashboardStats(): Promise<{
    todaySales: string;
    activeServices: number;
    lowStockCount: number;
    monthlyProfit: string;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // User management
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Role management
  async getRoles(): Promise<Role[]> {
    return await db.select().from(roles).where(eq(roles.isActive, true)).orderBy(asc(roles.displayName));
  }

  async getRoleById(id: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role;
  }

  async getRoleByName(name: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.name, name));
    return role;
  }

  async createRole(roleData: InsertRole): Promise<Role> {
    const [role] = await db.insert(roles).values(roleData).returning();
    return role;
  }

  async updateRole(id: string, roleData: Partial<InsertRole>): Promise<Role> {
    const [role] = await db
      .update(roles)
      .set({ ...roleData, updatedAt: new Date() })
      .where(eq(roles.id, id))
      .returning();
    return role;
  }

  async deleteRole(id: string): Promise<void> {
    await db.update(roles).set({ isActive: false }).where(eq(roles.id, id));
  }

  // Store configuration
  async getStoreConfig(): Promise<StoreConfig | undefined> {
    const [config] = await db.select().from(storeConfig).limit(1);
    return config;
  }

  async upsertStoreConfig(configData: InsertStoreConfig): Promise<StoreConfig> {
    const existing = await this.getStoreConfig();
    
    if (existing) {
      const [config] = await db
        .update(storeConfig)
        .set({ ...configData, updatedAt: new Date() })
        .where(eq(storeConfig.id, existing.id))
        .returning();
      return config;
    } else {
      const [config] = await db
        .insert(storeConfig)
        .values(configData)
        .returning();
      return config;
    }
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(asc(categories.name));
  }

  async getCategoryById(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(categoryData: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(categoryData).returning();
    return category;
  }

  async updateCategory(id: string, categoryData: Partial<InsertCategory>): Promise<Category> {
    const [category] = await db
      .update(categories)
      .set(categoryData)
      .where(eq(categories.id, id))
      .returning();
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.isActive, true)).orderBy(asc(products.name));
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductByBarcode(barcode: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.barcode, barcode));
    return product;
  }

  async searchProducts(query: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.isActive, true),
          like(products.name, `%${query}%`)
        )
      )
      .orderBy(asc(products.name));
  }

  async getLowStockProducts(): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.isActive, true),
          sql`${products.stock} <= ${products.minStock}`
        )
      )
      .orderBy(asc(products.name));
  }

  async createProduct(productData: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(productData).returning();
    return product;
  }

  async updateProduct(id: string, productData: Partial<InsertProduct>): Promise<Product> {
    const [product] = await db
      .update(products)
      .set({ ...productData, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.update(products).set({ isActive: false }).where(eq(products.id, id));
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(asc(customers.name));
  }

  async getCustomerById(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    return await db
      .select()
      .from(customers)
      .where(like(customers.name, `%${query}%`))
      .orderBy(asc(customers.name));
  }

  async createCustomer(customerData: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(customerData).returning();
    return customer;
  }

  async updateCustomer(id: string, customerData: Partial<InsertCustomer>): Promise<Customer> {
    const [customer] = await db
      .update(customers)
      .set({ ...customerData, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return customer;
  }

  async deleteCustomer(id: string): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers).orderBy(asc(suppliers.name));
  }

  async getSupplierById(id: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier;
  }

  async createSupplier(supplierData: InsertSupplier): Promise<Supplier> {
    const [supplier] = await db.insert(suppliers).values(supplierData).returning();
    return supplier;
  }

  async updateSupplier(id: string, supplierData: Partial<InsertSupplier>): Promise<Supplier> {
    const [supplier] = await db
      .update(suppliers)
      .set({ ...supplierData, updatedAt: new Date() })
      .where(eq(suppliers.id, id))
      .returning();
    return supplier;
  }

  async deleteSupplier(id: string): Promise<void> {
    await db.delete(suppliers).where(eq(suppliers.id, id));
  }

  // Transactions
  async getTransactions(limit: number = 50): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  async getTransactionById(id: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction;
  }

  async createTransaction(transactionData: InsertTransaction, items: InsertTransactionItem[]): Promise<Transaction> {
    return await db.transaction(async (tx) => {
      // Create transaction
      const [transaction] = await tx.insert(transactions).values(transactionData).returning();
      
      // Create transaction items
      const itemsWithTransactionId = items.map(item => ({
        ...item,
        transactionId: transaction.id,
      }));
      await tx.insert(transactionItems).values(itemsWithTransactionId);
      
      // Update stock for sales
      if (transactionData.type === 'sale') {
        for (const item of items) {
          await tx
            .update(products)
            .set({ 
              stock: sql`${products.stock} - ${item.quantity}`,
              updatedAt: new Date()
            })
            .where(eq(products.id, item.productId));
          
          // Create stock movement record
          await tx.insert(stockMovements).values({
            productId: item.productId,
            type: 'out',
            quantity: item.quantity,
            reference: transaction.id,
            notes: 'Sale transaction',
            userId: transactionData.userId,
          });
        }

        // Create financial record via new finance manager
        try {
          const { financeManager } = await import('./financeManager');
          await financeManager.createTransaction({
            type: 'income',
            category: 'Sales Revenue',
            subcategory: 'Product Sales',
            amount: transaction.total,
            description: `Penjualan ${transaction.transactionNumber}`,
            referenceType: 'sale',
            reference: transaction.id,
            paymentMethod: transaction.paymentMethod?.toLowerCase() || 'cash',
            userId: transactionData.userId
          });
        } catch (error) {
          console.error("Error creating financial record via finance manager:", error);
        }
      }
      
      return transaction;
    });
  }

  // Service Tickets
  async getServiceTickets(): Promise<ServiceTicket[]> {
    return await db.select().from(serviceTickets).orderBy(desc(serviceTickets.createdAt));
  }

  async getServiceTicketById(id: string): Promise<ServiceTicket | undefined> {
    const [ticket] = await db.select().from(serviceTickets).where(eq(serviceTickets.id, id));
    return ticket;
  }

  async getActiveServiceTickets(): Promise<ServiceTicket[]> {
    return await db
      .select()
      .from(serviceTickets)
      .where(sql`${serviceTickets.status} != 'completed' AND ${serviceTickets.status} != 'cancelled'`)
      .orderBy(desc(serviceTickets.createdAt));
  }

  async createServiceTicket(ticketData: InsertServiceTicket): Promise<ServiceTicket> {
    const [ticket] = await db.insert(serviceTickets).values(ticketData).returning();
    return ticket;
  }

  async updateServiceTicket(id: string, ticketData: Partial<InsertServiceTicket>, parts?: InsertServiceTicketPart[]): Promise<ServiceTicket> {
    return await db.transaction(async (tx) => {
      const [ticket] = await tx
        .update(serviceTickets)
        .set({ ...ticketData, updatedAt: new Date() })
        .where(eq(serviceTickets.id, id))
        .returning();
      
      // Handle parts if provided
      if (parts && parts.length > 0) {
        // Clear existing parts
        await tx.delete(serviceTicketParts).where(eq(serviceTicketParts.serviceTicketId, id));
        
        let totalPartsCost = 0;
        
        // Add new parts and update stock
        for (const part of parts) {
          // Check if product has enough stock
          const [product] = await tx.select().from(products).where(eq(products.id, part.productId));
          
          if (!product) {
            throw new Error(`Product dengan ID ${part.productId} tidak ditemukan`);
          }
          
          const currentStock = product.stock || 0;
          if (currentStock < part.quantity) {
            throw new Error(`Stock ${product.name} tidak cukup. Tersedia: ${currentStock}, Diperlukan: ${part.quantity}`);
          }
          
          // Use product selling price as default
          const unitPrice = part.unitPrice || product.sellingPrice || '0';
          const totalPrice = (parseFloat(unitPrice) * part.quantity).toString();
          
          // Insert service ticket part
          await tx.insert(serviceTicketParts).values({
            serviceTicketId: id,
            productId: part.productId,
            quantity: part.quantity,
            unitPrice: unitPrice,
            totalPrice: totalPrice
          });
          
          // Update product stock
          await tx.update(products)
            .set({ 
              stock: currentStock - part.quantity,
              updatedAt: new Date()
            })
            .where(eq(products.id, part.productId));
          
          // Record stock movement
          await tx.insert(stockMovements).values({
            productId: part.productId,
            type: 'out',
            quantity: part.quantity,
            reference: id,
            notes: `Digunakan untuk servis ${ticket.ticketNumber}`,
            userId: '46332812'
          });
          
          totalPartsCost += parseFloat(totalPrice);
        }
        
        // Update ticket with parts cost
        const currentLaborCost = parseFloat(ticket.laborCost || '0');
        const newActualCost = (currentLaborCost + totalPartsCost).toString();
        
        await tx.update(serviceTickets)
          .set({ 
            partsCost: totalPartsCost.toString(),
            actualCost: newActualCost,
            updatedAt: new Date()
          })
          .where(eq(serviceTickets.id, id));
          
        ticket.partsCost = totalPartsCost.toString();
        ticket.actualCost = newActualCost;
      }
      
      // Auto-record financial transactions for completed services
      if (ticket && (ticket.status === 'completed' || ticket.status === 'delivered')) {
        try {
          const { financeManager } = await import('./financeManager');
          
          // Record labor cost as income if exists
          if (ticket.laborCost && parseFloat(ticket.laborCost) > 0) {
            await financeManager.recordLaborCost(
              ticket.id,
              ticket.laborCost,
              `${ticket.ticketNumber}: ${ticket.problem}`,
              '46332812'
            );
          }
          
          // Record parts costs and revenue for each part used
          if (parts && parts.length > 0) {
            for (const part of parts) {
              // Get product details to get modal price
              const [product] = await tx.select().from(products).where(eq(products.id, part.productId));
              if (product) {
                await financeManager.recordPartsCost(
                  ticket.id,
                  product.name,
                  part.quantity,
                  product.purchasePrice || '0', // modal price
                  part.unitPrice, // selling price
                  '46332812'
                );
              }
            }
          }
        } catch (error) {
          console.error("Error recording service financial transactions:", error);
        }
      }
      
      return ticket;
    });
  }

  async deleteServiceTicket(id: string): Promise<void> {
    return await db.transaction(async (tx) => {
      // First get the ticket to check if it has financial records
      const [ticket] = await tx.select().from(serviceTickets).where(eq(serviceTickets.id, id));
      
      if (ticket) {
        // Delete related service ticket parts
        await tx.delete(serviceTicketParts).where(eq(serviceTicketParts.serviceTicketId, id));
        
        // Delete related financial records if any
        await tx.delete(financialRecords).where(eq(financialRecords.reference, id));
      }
      
      // Delete the service ticket
      await tx.delete(serviceTickets).where(eq(serviceTickets.id, id));
    });
  }

  // Service Ticket Parts
  async getServiceTicketParts(serviceTicketId: string): Promise<(ServiceTicketPart & { productName: string })[]> {
    const parts = await db
      .select({
        id: serviceTicketParts.id,
        serviceTicketId: serviceTicketParts.serviceTicketId,
        productId: serviceTicketParts.productId,
        quantity: serviceTicketParts.quantity,
        unitPrice: serviceTicketParts.unitPrice,
        totalPrice: serviceTicketParts.totalPrice,
        createdAt: serviceTicketParts.createdAt,
        productName: products.name
      })
      .from(serviceTicketParts)
      .innerJoin(products, eq(serviceTicketParts.productId, products.id))
      .where(eq(serviceTicketParts.serviceTicketId, serviceTicketId))
      .orderBy(desc(serviceTicketParts.createdAt));
    
    return parts;
  }

  // Stock Movements
  async getStockMovements(productId?: string): Promise<StockMovement[]> {
    const query = db.select().from(stockMovements);
    
    if (productId) {
      return await query.where(eq(stockMovements.productId, productId)).orderBy(desc(stockMovements.createdAt));
    }
    
    return await query.orderBy(desc(stockMovements.createdAt));
  }

  async createStockMovement(movementData: InsertStockMovement): Promise<StockMovement> {
    const [movement] = await db.insert(stockMovements).values(movementData).returning();
    return movement;
  }

  // Financial Records (delegated to FinanceManager but interface still needed)
  async getFinancialRecords(startDate?: Date, endDate?: Date): Promise<FinancialRecord[]> {
    const { financeManager } = await import('./financeManager');
    return await financeManager.getTransactions({
      startDate,
      endDate
    });
  }

  async createFinancialRecord(record: InsertFinancialRecord): Promise<FinancialRecord> {
    const { financeManager } = await import('./financeManager');
    return await financeManager.createTransaction({
      type: record.type as 'income' | 'expense' | 'transfer',
      category: record.category,
      subcategory: record.subcategory || undefined,
      amount: record.amount,
      description: record.description,
      referenceType: record.referenceType || undefined,
      reference: record.reference || undefined,
      paymentMethod: record.paymentMethod || undefined,
      tags: record.tags || undefined,
      userId: record.userId
    });
  }

  // Dashboard Statistics
  // Reports
  async getSalesReport(startDate: Date, endDate: Date): Promise<{
    totalSales: string;
    transactions: any[];
  }> {
    const [totalResult] = await db
      .select({ total: sum(transactions.total) })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'sale'),
          gte(transactions.createdAt, startDate),
          lte(transactions.createdAt, endDate)
        )
      );

    const transactionList = await db
      .select()
      .from(transactions)
      .leftJoin(customers, eq(transactions.customerId, customers.id))
      .where(
        and(
          eq(transactions.type, 'sale'),
          gte(transactions.createdAt, startDate),
          lte(transactions.createdAt, endDate)
        )
      )
      .orderBy(desc(transactions.createdAt));

    return {
      totalSales: totalResult.total || '0',
      transactions: transactionList.map(t => ({
        ...t.transactions,
        customer: t.customers
      }))
    };
  }

  async getServiceReport(startDate: Date, endDate: Date): Promise<{
    totalServices: number;
    totalRevenue: string;
    totalCost: string;
    totalProfit: string;
    revenueBreakdown: {
      laborRevenue: string;
      partsRevenue: string;
    };
    tickets: any[];
  }> {
    // Use same method as financeManager for consistency
    try {
      const { financeManager } = await import('./financeManager');
      const summary = await financeManager.getSummary(startDate, endDate);
      
      // Get service-specific financial data
      const [serviceIncomeResult] = await db
        .select({ total: sum(financialRecords.amount) })
        .from(financialRecords)
        .where(
          and(
            eq(financialRecords.type, 'income'),
            or(
              eq(financialRecords.referenceType, 'service_labor'),
              eq(financialRecords.referenceType, 'service_parts_revenue')
            ),
            gte(financialRecords.createdAt, startDate),
            lte(financialRecords.createdAt, endDate)
          )
        );

      const [serviceCostResult] = await db
        .select({ total: sum(financialRecords.amount) })
        .from(financialRecords)
        .where(
          and(
            eq(financialRecords.type, 'expense'),
            eq(financialRecords.referenceType, 'service_parts_cost'),
            gte(financialRecords.createdAt, startDate),
            lte(financialRecords.createdAt, endDate)
          )
        );

      // Get labor revenue
      const [laborRevenueResult] = await db
        .select({ total: sum(financialRecords.amount) })
        .from(financialRecords)
        .where(
          and(
            eq(financialRecords.type, 'income'),
            eq(financialRecords.referenceType, 'service_labor'),
            gte(financialRecords.createdAt, startDate),
            lte(financialRecords.createdAt, endDate)
          )
        );

      // Get parts revenue
      const [partsRevenueResult] = await db
        .select({ total: sum(financialRecords.amount) })
        .from(financialRecords)
        .where(
          and(
            eq(financialRecords.type, 'income'),
            eq(financialRecords.referenceType, 'service_parts_revenue'),
            gte(financialRecords.createdAt, startDate),
            lte(financialRecords.createdAt, endDate)
          )
        );

      const [totalResult] = await db
        .select({ count: count() })
        .from(serviceTickets)
        .where(
          and(
            gte(serviceTickets.createdAt, startDate),
            lte(serviceTickets.createdAt, endDate)
          )
        );

      const ticketList = await db
        .select()
        .from(serviceTickets)
        .leftJoin(customers, eq(serviceTickets.customerId, customers.id))
        .where(
          and(
            gte(serviceTickets.createdAt, startDate),
            lte(serviceTickets.createdAt, endDate)
          )
        )
        .orderBy(desc(serviceTickets.createdAt));

      const totalRevenue = Number(serviceIncomeResult.total || 0);
      const totalCost = Number(serviceCostResult.total || 0);
      const totalProfit = totalRevenue - totalCost;

      return {
        totalServices: totalResult.count,
        totalRevenue: totalRevenue.toString(),
        totalCost: totalCost.toString(),
        totalProfit: totalProfit.toString(),
        revenueBreakdown: {
          laborRevenue: (Number(laborRevenueResult.total || 0)).toString(),
          partsRevenue: (Number(partsRevenueResult.total || 0)).toString(),
        },
        tickets: ticketList.map(t => ({
          ...t.service_tickets,
          customer: t.customers
        }))
      };
    } catch (error) {
      console.error("Error getting service report:", error);
      // Fallback to simple count
      const [totalResult] = await db
        .select({ count: count() })
        .from(serviceTickets)
        .where(
          and(
            gte(serviceTickets.createdAt, startDate),
            lte(serviceTickets.createdAt, endDate)
          )
        );

      return {
        totalServices: totalResult.count,
        totalRevenue: "0",
        totalCost: "0", 
        totalProfit: "0",
        revenueBreakdown: {
          laborRevenue: "0",
          partsRevenue: "0",
        },
        tickets: []
      };
    }
  }

  async getFinancialReport(startDate: Date, endDate: Date): Promise<{
    totalIncome: string;
    totalExpense: string;
    profit: string;
    records: any[];
  }> {
    try {
      const { financeManager } = await import('./financeManager');
      
      const summary = await financeManager.getSummary(startDate, endDate);
      const records = await financeManager.getTransactions({
        startDate,
        endDate
      });

      return {
        totalIncome: summary.totalIncome,
        totalExpense: summary.totalExpense,
        profit: summary.netProfit,
        records
      };
    } catch (error) {
      console.error("Error getting financial report from finance manager:", error);
      // Fallback to old method
      const [incomeResult] = await db
        .select({ total: sum(financialRecords.amount) })
        .from(financialRecords)
        .where(
          and(
            eq(financialRecords.type, 'income'),
            gte(financialRecords.createdAt, startDate),
            lte(financialRecords.createdAt, endDate)
          )
        );

      const [expenseResult] = await db
        .select({ total: sum(financialRecords.amount) })
        .from(financialRecords)
        .where(
          and(
            eq(financialRecords.type, 'expense'),
            gte(financialRecords.createdAt, startDate),
            lte(financialRecords.createdAt, endDate)
          )
        );

      const records = await db
        .select()
        .from(financialRecords)
        .where(
          and(
            gte(financialRecords.createdAt, startDate),
            lte(financialRecords.createdAt, endDate)
          )
        )
        .orderBy(desc(financialRecords.createdAt));

      const totalIncome = Number(incomeResult.total || 0);
      const totalExpense = Number(expenseResult.total || 0);

      return {
        totalIncome: totalIncome.toString(),
        totalExpense: totalExpense.toString(),
        profit: (totalIncome - totalExpense).toString(),
        records
      };
    }
  }

  async getInventoryReport(): Promise<{
    lowStockCount: number;
    lowStockProducts: any[];
    totalProducts: number;
    totalAssetValue: string;
    totalStockQuantity: number;
  }> {
    const [lowStockResult] = await db
      .select({ count: count() })
      .from(products)
      .where(
        and(
          eq(products.isActive, true),
          sql`${products.stock} <= ${products.minStock}`
        )
      );

    const lowStockProducts = await db
      .select()
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          eq(products.isActive, true),
          sql`${products.stock} <= ${products.minStock}`
        )
      )
      .orderBy(products.stock);

    const [totalResult] = await db
      .select({ count: count() })
      .from(products)
      .where(eq(products.isActive, true));

    // Calculate total asset value (stock × purchase price)
    const assetValueResult = await db
      .select({
        totalValue: sql<number>`SUM(${products.stock} * COALESCE(${products.purchasePrice}, 0))`,
        totalQuantity: sql<number>`SUM(${products.stock})`
      })
      .from(products)
      .where(and(eq(products.isActive, true), gte(products.stock, 0)));

    const totalAssetValue = Number(assetValueResult[0]?.totalValue || 0);
    const totalStockQuantity = Number(assetValueResult[0]?.totalQuantity || 0);

    return {
      lowStockCount: lowStockResult.count,
      lowStockProducts: lowStockProducts.map(p => ({
        ...p.products,
        category: p.categories
      })),
      totalProducts: totalResult.count,
      totalAssetValue: totalAssetValue.toString(),
      totalStockQuantity: totalStockQuantity
    };
  }

  async getDashboardStats(): Promise<{
    todaySales: string;
    activeServices: number;
    lowStockCount: number;
    monthlyProfit: string;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Today's sales
    const [todaySalesResult] = await db
      .select({ total: sum(transactions.total) })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'sale'),
          gte(transactions.createdAt, today)
        )
      );
    
    // Active services
    const [activeServicesResult] = await db
      .select({ count: count() })
      .from(serviceTickets)
      .where(sql`${serviceTickets.status} != 'completed' AND ${serviceTickets.status} != 'cancelled'`);
    
    // Low stock count
    const [lowStockResult] = await db
      .select({ count: count() })
      .from(products)
      .where(
        and(
          eq(products.isActive, true),
          sql`${products.stock} <= ${products.minStock}`
        )
      );
    
    // Monthly profit from finance manager
    let monthlyProfit = 0;
    try {
      const { financeManager } = await import('./financeManager');
      const summary = await financeManager.getSummary(startOfMonth, new Date());
      monthlyProfit = Number(summary.netProfit || 0);
    } catch (error) {
      console.error("Error getting monthly profit from finance manager:", error);
      // Fallback to transaction-based calculation
      const [monthlySalesResult] = await db
        .select({ total: sum(transactions.total) })
        .from(transactions)
        .where(
          and(
            eq(transactions.type, 'sale'),
            gte(transactions.createdAt, startOfMonth)
          )
        );
      
      const [monthlyPurchasesResult] = await db
        .select({ total: sum(transactions.total) })
        .from(transactions)
        .where(
          and(
            eq(transactions.type, 'purchase'),
            gte(transactions.createdAt, startOfMonth)
          )
        );
      
      const monthlySales = Number(monthlySalesResult.total || 0);
      const monthlyPurchases = Number(monthlyPurchasesResult.total || 0);
      monthlyProfit = monthlySales - monthlyPurchases;
    }
    
    return {
      todaySales: todaySalesResult.total || '0',
      activeServices: activeServicesResult.count,
      lowStockCount: lowStockResult.count,
      monthlyProfit: monthlyProfit.toString(),
    };
  }
}

export const storage = new DatabaseStorage();
