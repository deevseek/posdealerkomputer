import {
  users,
  roles,
  storeConfig,
  categories,
  products,
  customers,
  suppliers,
  locations,
  productBatches,
  purchaseOrders,
  purchaseOrderItems,
  inventoryAdjustments,
  inventoryAdjustmentItems,
  transactions,
  transactionItems,
  serviceTickets,
  serviceTicketParts,
  stockMovements,
  financialRecords,
  type User,
  type InsertUser,
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
  type Location,
  type InsertLocation,
  type ProductBatch,
  type InsertProductBatch,
  type PurchaseOrder,
  type InsertPurchaseOrder,
  type PurchaseOrderItem,
  type InsertPurchaseOrderItem,
  type InventoryAdjustment,
  type InsertInventoryAdjustment,
  type InventoryAdjustmentItem,
  type InsertInventoryAdjustmentItem,
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
import { eq, desc, asc, and, or, gte, lte, like, ilike, count, sum, sql, isNotNull } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser, clientId?: string): Promise<User>;
  upsertUser(user: Partial<InsertUser> & { id: string }): Promise<User>;
  
  // User management
  getUsers(): Promise<User[]>;
  getUserCount(clientId?: string): Promise<number>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  
  // Role management
  getRoles(): Promise<Role[]>;
  getRoleById(id: string): Promise<Role | undefined>;
  getRoleByName(name: string): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: string, role: Partial<InsertRole>): Promise<Role>;
  deleteRole(id: string): Promise<void>;
  
  // Store configuration
  getStoreConfig(clientId?: string): Promise<StoreConfig | undefined>;
  upsertStoreConfig(config: InsertStoreConfig, clientId?: string): Promise<StoreConfig>;
  
  // Categories
  getCategories(): Promise<Category[]>;
  getCategoryById(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  
  // Products
  getProducts(search?: string): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  getProductByBarcode(barcode: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  
  // Locations
  getLocations(): Promise<Location[]>;
  getLocationById(id: string): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: string, location: Partial<InsertLocation>): Promise<Location>;
  deleteLocation(id: string): Promise<void>;
  
  // Product Batches
  getProductBatches(productId?: string): Promise<ProductBatch[]>;
  getProductBatchById(id: string): Promise<ProductBatch | undefined>;
  createProductBatch(batch: InsertProductBatch): Promise<ProductBatch>;
  updateProductBatch(id: string, batch: Partial<InsertProductBatch>): Promise<ProductBatch>;
  
  // Purchase Orders
  getPurchaseOrders(): Promise<PurchaseOrder[]>;
  getPurchaseOrderById(id: string): Promise<PurchaseOrder | undefined>;
  createPurchaseOrder(po: InsertPurchaseOrder): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: string, po: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder>;
  deletePurchaseOrder(id: string): Promise<void>;
  approvePurchaseOrder(id: string, approvedBy: string): Promise<PurchaseOrder>;
  
  // Purchase Order Items
  getPurchaseOrderItems(poId: string): Promise<(PurchaseOrderItem & { productName: string; productSku: string })[]>;
  createPurchaseOrderItem(item: InsertPurchaseOrderItem): Promise<PurchaseOrderItem>;
  updatePurchaseOrderItem(id: string, item: Partial<InsertPurchaseOrderItem>): Promise<PurchaseOrderItem>;
  deletePurchaseOrderItem(id: string): Promise<void>;
  recalculatePurchaseOrderTotal(poId: string): Promise<void>;
  receivePurchaseOrderItem(itemId: string, receivedQuantity: number, userId: string): Promise<void>;
  
  // Inventory Adjustments
  getInventoryAdjustments(): Promise<InventoryAdjustment[]>;
  getInventoryAdjustmentById(id: string): Promise<InventoryAdjustment | undefined>;
  createInventoryAdjustment(adjustment: InsertInventoryAdjustment): Promise<InventoryAdjustment>;
  approveInventoryAdjustment(id: string, approvedBy: string): Promise<InventoryAdjustment>;
  
  // Inventory Adjustment Items
  getInventoryAdjustmentItems(adjustmentId: string): Promise<InventoryAdjustmentItem[]>;
  createInventoryAdjustmentItem(item: InsertInventoryAdjustmentItem): Promise<InventoryAdjustmentItem>;
  
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
  updateServiceTicket(id: string, ticket: Partial<InsertServiceTicket>, parts?: InsertServiceTicketPart[], userId?: string): Promise<ServiceTicket>;
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
  
  // Enhanced Accounting Reports
  getBalanceSheet(asOfDate?: Date): Promise<any>;
  getIncomeStatement(startDate?: Date, endDate?: Date): Promise<any>;
  getChartOfAccounts(): Promise<any[]>;
  createJournalEntry(data: any): Promise<{ success: boolean; journalEntry?: any; error?: string }>;
  
  // Dashboard Statistics
  getDashboardStats(): Promise<{
    todaySales: string;
    todayRevenue: string;
    activeServices: number;
    lowStockCount: number;
    monthlyProfit: string;
    whatsappConnected: boolean;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser, clientId?: string): Promise<User> {
    const userDataWithClient = {
      ...userData,
      clientId: clientId || null
    };
    const [user] = await db
      .insert(users)
      .values(userDataWithClient)
      .returning();
    return user;
  }

  async upsertUser(userData: Partial<InsertUser> & { id: string }): Promise<User> {
    // Try to find existing user
    const existingUser = await this.getUser(userData.id);
    
    if (existingUser) {
      // User exists, update them
      const [user] = await db
        .update(users)
        .set({ ...userData, updatedAt: new Date() })
        .where(eq(users.id, userData.id))
        .returning();
      return user;
    } else {
      // User doesn't exist, create them with defaults
      const newUserData: InsertUser = {
        id: userData.id,
        username: userData.email || `user_${userData.id}`,
        email: userData.email || null,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        password: '', // No password for Replit Auth users
        role: 'admin', // Default to admin for first user, or could be 'kasir'
        isActive: true,
        profileImageUrl: userData.profileImageUrl || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...userData
      };
      
      const [user] = await db
        .insert(users)
        .values(newUserData)
        .returning();
      return user;
    }
  }

  // User management
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserCount(clientId?: string): Promise<number> {
    if (clientId) {
      // Multi-tenant mode: count users for specific client
      const result = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.clientId, clientId));
      return result[0]?.count || 0;
    } else {
      // Single-tenant mode: count all users (legacy behavior)
      const result = await db
        .select({ count: count() })
        .from(users);
      return result[0]?.count || 0;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User> {
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

  // Store configuration (tenant-aware)
  async getStoreConfig(clientId?: string): Promise<StoreConfig | undefined> {
    if (clientId) {
      // Multi-tenant mode: get config for specific client
      const [config] = await db
        .select()
        .from(storeConfig)
        .where(eq(storeConfig.clientId, clientId))
        .limit(1);
      return config;
    } else {
      // Single-tenant mode: get first config (legacy behavior)
      const [config] = await db.select().from(storeConfig).limit(1);
      return config;
    }
  }

  async upsertStoreConfig(configData: InsertStoreConfig, clientId?: string): Promise<StoreConfig> {
    const existing = await this.getStoreConfig(clientId);
    
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
        .values({
          ...configData,
          clientId: clientId || null
        })
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

  async getProductBySku(sku: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.sku, sku));
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
          ilike(products.name, `%${query}%`)
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

  // Locations
  async getLocations(): Promise<Location[]> {
    return await db.select().from(locations).where(eq(locations.isActive, true)).orderBy(asc(locations.name));
  }

  async getLocationById(id: string): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    return location;
  }

  async createLocation(locationData: InsertLocation): Promise<Location> {
    const [location] = await db.insert(locations).values(locationData).returning();
    return location;
  }

  async updateLocation(id: string, locationData: Partial<InsertLocation>): Promise<Location> {
    const [location] = await db
      .update(locations)
      .set(locationData)
      .where(eq(locations.id, id))
      .returning();
    return location;
  }

  async deleteLocation(id: string): Promise<void> {
    await db.update(locations).set({ isActive: false }).where(eq(locations.id, id));
  }

  // Product Batches
  async getProductBatches(productId?: string): Promise<ProductBatch[]> {
    if (productId) {
      return await db.select().from(productBatches).where(eq(productBatches.productId, productId)).orderBy(desc(productBatches.receivedDate));
    }
    return await db.select().from(productBatches).orderBy(desc(productBatches.receivedDate));
  }

  async getProductBatchById(id: string): Promise<ProductBatch | undefined> {
    const [batch] = await db.select().from(productBatches).where(eq(productBatches.id, id));
    return batch;
  }

  async createProductBatch(batchData: InsertProductBatch): Promise<ProductBatch> {
    const [batch] = await db.insert(productBatches).values(batchData).returning();
    return batch;
  }

  async updateProductBatch(id: string, batchData: Partial<InsertProductBatch>): Promise<ProductBatch> {
    const [batch] = await db
      .update(productBatches)
      .set({ ...batchData, updatedAt: new Date() })
      .where(eq(productBatches.id, id))
      .returning();
    return batch;
  }

  // Purchase Orders
  async getPurchaseOrders(): Promise<(PurchaseOrder & { supplierName: string })[]> {
    return await db
      .select({
        ...purchaseOrders,
        supplierName: suppliers.name,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .orderBy(desc(purchaseOrders.orderDate));
  }

  async getPurchaseOrderById(id: string): Promise<PurchaseOrder | undefined> {
    const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
    return po;
  }

  async createPurchaseOrder(poData: InsertPurchaseOrder): Promise<PurchaseOrder> {
    // Generate PO number
    const countResult = await db.select({ count: count() }).from(purchaseOrders);
    const poNumber = `PO-${String(countResult[0].count + 1).padStart(5, '0')}`;
    
    const [po] = await db.insert(purchaseOrders).values({
      ...poData,
      poNumber,
    }).returning();
    return po;
  }

  async updatePurchaseOrder(id: string, poData: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder> {
    const [po] = await db
      .update(purchaseOrders)
      .set({ ...poData, updatedAt: new Date() })
      .where(eq(purchaseOrders.id, id))
      .returning();
    return po;
  }

  async deletePurchaseOrder(id: string): Promise<void> {
    await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
  }

  async approvePurchaseOrder(id: string, approvedBy: string): Promise<PurchaseOrder> {
    const [po] = await db
      .update(purchaseOrders)
      .set({ 
        status: 'confirmed',
        approvedBy: approvedBy,
        approvedDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(purchaseOrders.id, id))
      .returning();
    return po;
  }

  // Purchase Order Items
  async getPurchaseOrderItems(poId: string): Promise<(PurchaseOrderItem & { productName: string; productSku: string })[]> {
    return await db
      .select({
        ...purchaseOrderItems,
        productName: products.name,
        productSku: products.sku,
      })
      .from(purchaseOrderItems)
      .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
      .where(eq(purchaseOrderItems.purchaseOrderId, poId));
  }

  async createPurchaseOrderItem(itemData: InsertPurchaseOrderItem): Promise<PurchaseOrderItem> {
    const [item] = await db.insert(purchaseOrderItems).values(itemData).returning();
    
    // Auto recalculate PO total and update status
    await this.recalculatePurchaseOrderTotal(itemData.purchaseOrderId);
    
    return item;
  }

  async recalculatePurchaseOrderTotal(poId: string): Promise<void> {
    // Calculate total from all items
    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(${purchaseOrderItems.quantity} * CAST(${purchaseOrderItems.unitCost} AS NUMERIC)), 0)`,
        count: sql<number>`COUNT(${purchaseOrderItems.id})`
      })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, poId));
    
    const calculatedTotal = result[0]?.total || 0;
    const itemCount = result[0]?.count || 0;
    
    // Update PO with new total and status
    const updateData: any = {
      totalAmount: calculatedTotal.toString(),
      updatedAt: new Date()
    };
    
    // Change status from draft to pending if there are items
    if (itemCount > 0) {
      updateData.status = 'pending';
    }
    
    await db
      .update(purchaseOrders)
      .set(updateData)
      .where(eq(purchaseOrders.id, poId));
  }

  async updatePurchaseOrderItem(id: string, itemData: Partial<InsertPurchaseOrderItem>): Promise<PurchaseOrderItem> {
    // Get PO ID for recalculation
    const [existingItem] = await db.select({ purchaseOrderId: purchaseOrderItems.purchaseOrderId })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.id, id));
    
    const [item] = await db
      .update(purchaseOrderItems)
      .set(itemData)
      .where(eq(purchaseOrderItems.id, id))
      .returning();
    
    // Recalculate total after update
    if (existingItem) {
      await this.recalculatePurchaseOrderTotal(existingItem.purchaseOrderId);
    }
    
    return item;
  }

  async deletePurchaseOrderItem(id: string): Promise<void> {
    // Get PO ID before deleting item
    const [item] = await db.select({ purchaseOrderId: purchaseOrderItems.purchaseOrderId })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.id, id));
    
    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.id, id));
    
    // Recalculate total after deletion
    if (item) {
      await this.recalculatePurchaseOrderTotal(item.purchaseOrderId);
    }
  }

  // Update outstanding status for purchase order item
  async updateOutstandingItemStatus(itemId: string, status: string, reason?: string, userId?: string): Promise<void> {
    const [item] = await db
      .select({ outstandingQuantity: purchaseOrderItems.outstandingQuantity })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.id, itemId));

    if (!item) throw new Error("Purchase order item not found");
    if (!item.outstandingQuantity || item.outstandingQuantity <= 0) {
      throw new Error("No outstanding quantity to update");
    }

    await db
      .update(purchaseOrderItems)
      .set({
        outstandingStatus: status,
        outstandingReason: reason,
        outstandingUpdatedBy: userId,
        outstandingUpdatedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(purchaseOrderItems.id, itemId));
  }

  async receivePurchaseOrderItem(itemId: string, receivedQuantity: number, userId: string): Promise<void> {
    // SIMPLIFIED: Get item details with select all - no complex field selection
    const [item] = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.id, itemId));

    if (!item) throw new Error("Purchase order item not found");

    const newReceivedQuantity = (item.receivedQuantity || 0) + receivedQuantity;
    const newOutstandingQuantity = item.quantity - newReceivedQuantity;
    
    // Update received quantity and outstanding tracking
    await db
      .update(purchaseOrderItems)
      .set({ 
        receivedQuantity: newReceivedQuantity,
        outstandingQuantity: newOutstandingQuantity,
        // Keep outstanding status as pending if there's still remaining quantity
        outstandingStatus: newOutstandingQuantity > 0 ? 'pending' : 'completed',
        updatedAt: new Date()
      })
      .where(eq(purchaseOrderItems.id, itemId));

    // Record stock movement with actual purchase price
    await db.insert(stockMovements).values({
      productId: item.productId,
      movementType: 'in',
      quantity: receivedQuantity,
      unitCost: item.unitCost || item.unitPrice, // Try both field names for HPP calculation
      referenceId: item.purchaseOrderId,
      referenceType: 'purchase',
      notes: `Received from PO`,
      userId: userId,
    });

    // CREATE FINANCE RECORD for purchase expense
    const totalCost = parseFloat(item.unitCost || item.unitPrice || '0') * receivedQuantity;
    if (totalCost > 0) {
      await db.insert(financialRecords).values({
        type: 'expense',
        amount: totalCost.toString(),
        description: `Purchase: ${receivedQuantity} units received`,
        category: 'Inventory Purchase',
        reference: item.purchaseOrderId,
        referenceType: 'purchase_order',
        userId: userId,
      });
    }

    // DIRECT UPDATE: Use SQL arithmetic to ensure stock update works
    await db
      .update(products)
      .set({ 
        stock: sql`${products.stock} + ${receivedQuantity}`,
        lastPurchasePrice: item.unitCost || item.unitPrice, // Update last purchase price - use available field
        updatedAt: new Date()
      })
      .where(eq(products.id, item.productId));

    // CALCULATE AND UPDATE HPP (Average Cost) after receiving new stock
    const newAverageCost = await this.getAveragePurchasePrice(item.productId);
    await db
      .update(products)
      .set({ 
        averageCost: newAverageCost.toString(),
        updatedAt: new Date()
      })
      .where(eq(products.id, item.productId));

    // Check if PO should be updated to received status
    await this.updatePurchaseOrderStatus(item.purchaseOrderId);
  }

  async updatePurchaseOrderStatus(poId: string): Promise<void> {
    // Get all items for this PO
    const items = await db
      .select({
        quantity: purchaseOrderItems.quantity,
        receivedQuantity: purchaseOrderItems.receivedQuantity
      })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, poId));

    if (items.length === 0) return;

    const totalOrdered = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalReceived = items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);

    let newStatus = 'confirmed';
    if (totalReceived === totalOrdered) {
      newStatus = 'received';
    } else if (totalReceived > 0) {
      newStatus = 'partial_received';
    }

    await db
      .update(purchaseOrders)
      .set({ 
        status: newStatus as any,
        updatedAt: new Date()
      })
      .where(eq(purchaseOrders.id, poId));
  }

  // Inventory Adjustments
  async getInventoryAdjustments(): Promise<InventoryAdjustment[]> {
    return await db.select().from(inventoryAdjustments).orderBy(desc(inventoryAdjustments.createdAt));
  }

  async getInventoryAdjustmentById(id: string): Promise<InventoryAdjustment | undefined> {
    const [adjustment] = await db.select().from(inventoryAdjustments).where(eq(inventoryAdjustments.id, id));
    return adjustment;
  }

  async createInventoryAdjustment(adjustmentData: InsertInventoryAdjustment): Promise<InventoryAdjustment> {
    // Generate adjustment number
    const countResult = await db.select({ count: count() }).from(inventoryAdjustments);
    const adjustmentNumber = `ADJ-${String(countResult[0].count + 1).padStart(5, '0')}`;
    
    const [adjustment] = await db.insert(inventoryAdjustments).values({
      ...adjustmentData,
      adjustmentNumber,
    }).returning();
    return adjustment;
  }

  async approveInventoryAdjustment(id: string, approvedBy: string): Promise<InventoryAdjustment> {
    return await db.transaction(async (tx) => {
      // Get adjustment and items
      const [adjustment] = await tx.select().from(inventoryAdjustments).where(eq(inventoryAdjustments.id, id));
      if (!adjustment) {
        throw new Error('Adjustment not found');
      }

      const items = await tx.select().from(inventoryAdjustmentItems).where(eq(inventoryAdjustmentItems.adjustmentId, id));

      // Update product stocks based on adjustment
      for (const item of items) {
        await tx
          .update(products)
          .set({ 
            stock: sql`${products.stock} + ${item.adjustmentQuantity}`,
            updatedAt: new Date()
          })
          .where(eq(products.id, item.productId));

        // Create stock movement
        await tx.insert(stockMovements).values({
          productId: item.productId,
          batchId: item.batchId,
          locationId: item.locationId,
          movementType: item.adjustmentQuantity > 0 ? 'in' : 'out',
          quantity: Math.abs(item.adjustmentQuantity),
          unitCost: item.unitCost,
          referenceId: id,
          referenceType: 'adjustment',
          notes: `Inventory adjustment: ${adjustment.reason}`,
          userId: approvedBy,
        });
      }

      // Update adjustment status
      const [updatedAdjustment] = await tx
        .update(inventoryAdjustments)
        .set({ 
          status: 'approved',
          approvedBy: approvedBy,
          approvedDate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(inventoryAdjustments.id, id))
        .returning();

      return updatedAdjustment;
    });
  }

  // Inventory Adjustment Items
  async getInventoryAdjustmentItems(adjustmentId: string): Promise<InventoryAdjustmentItem[]> {
    return await db.select().from(inventoryAdjustmentItems).where(eq(inventoryAdjustmentItems.adjustmentId, adjustmentId));
  }

  async createInventoryAdjustmentItem(itemData: InsertInventoryAdjustmentItem): Promise<InventoryAdjustmentItem> {
    const [item] = await db.insert(inventoryAdjustmentItems).values(itemData).returning();
    return item;
  }

  // Enhanced stock movement with new system
  async createStockMovement(movementData: InsertStockMovement): Promise<StockMovement> {
    const [movement] = await db.insert(stockMovements).values(movementData).returning();
    
    // CREATE FINANCE TRANSACTION for stock movements that have cost impact
    if (movement.unitCost && parseFloat(movement.unitCost) > 0) {
      const totalCost = parseFloat(movement.unitCost) * movement.quantity;
      let transactionType: 'income' | 'expense' = 'expense';
      let description = `Stock movement: ${movement.movementType}`;
      
      if (movement.movementType === 'out') {
        // When stock goes out, it's usually a sale (income) or expense (cost of goods sold)
        transactionType = movement.referenceType === 'sale' ? 'income' : 'expense';
        description = movement.referenceType === 'sale' ? 
          `Sale: ${movement.quantity} units` : 
          `Stock out: ${movement.quantity} units`;
      } else {
        // When stock comes in, it's usually a purchase (expense)
        transactionType = 'expense';
        description = `Stock in: ${movement.quantity} units`;
      }
      
      await db.insert(financialRecords).values({
        type: transactionType,
        amount: totalCost.toString(),
        description,
        category: movement.referenceType === 'sale' ? 'Sales Revenue' : 'Inventory',
        reference: movement.referenceId,
        referenceType: movement.referenceType,
        userId: movement.userId,
      });
    }
    
    return movement;
  }

  async getAveragePurchasePrice(productId: string): Promise<number> {
    // Get all stock movements where stock came in (type: 'in') for this product
    const movements = await db
      .select({
        quantity: stockMovements.quantity,
        unitCost: stockMovements.unitCost
      })
      .from(stockMovements)
      .where(and(
        eq(stockMovements.productId, productId),
        eq(stockMovements.movementType, 'in'),
        isNotNull(stockMovements.unitCost)
      ));

    if (movements.length === 0) {
      // If no stock movements with price found, fallback to product's purchase price
      const [product] = await db.select({ purchasePrice: products.lastPurchasePrice })
        .from(products)
        .where(eq(products.id, productId));
      return parseFloat(product?.purchasePrice || '0');
    }

    // Calculate weighted average: sum(quantity * price) / sum(quantity)
    let totalWeightedCost = 0;
    let totalQuantity = 0;
    
    for (const movement of movements) {
      const price = parseFloat(movement.unitCost || '0');
      const quantity = movement.quantity;
      totalWeightedCost += price * quantity;
      totalQuantity += quantity;
    }

    return totalQuantity > 0 ? totalWeightedCost / totalQuantity : 0;
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
      .where(ilike(customers.name, `%${query}%`))
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
    const transactionList = await db
      .select()
      .from(transactions)
      .leftJoin(customers, eq(transactions.customerId, customers.id))
      .leftJoin(users, eq(transactions.userId, users.id))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
    
    // For each transaction, get its items with product details
    const transactionsWithItems = await Promise.all(
      transactionList.map(async (row) => {
        const transaction = row.transactions;
        
        const items = await db
          .select({
            id: transactionItems.id,
            quantity: transactionItems.quantity,
            unitPrice: transactionItems.unitPrice,
            totalPrice: transactionItems.totalPrice,
            product: {
              id: products.id,
              name: products.name,
              sku: products.sku,
            }
          })
          .from(transactionItems)
          .leftJoin(products, eq(transactionItems.productId, products.id))
          .where(eq(transactionItems.transactionId, transaction.id));
        
        const { password: _, ...userWithoutPassword } = row.users || {};
        
        return {
          ...transaction,
          items,
          customer: row.customers,
          user: userWithoutPassword
        };
      })
    );
    
    return transactionsWithItems as any;
  }

  async getTransactionById(id: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    if (!transaction) return undefined;
    
    // Get transaction items with product details
    const items = await db
      .select({
        id: transactionItems.id,
        quantity: transactionItems.quantity,
        unitPrice: transactionItems.unitPrice,
        totalPrice: transactionItems.totalPrice,
        product: {
          id: products.id,
          name: products.name,
          sku: products.sku,
        }
      })
      .from(transactionItems)
      .leftJoin(products, eq(transactionItems.productId, products.id))
      .where(eq(transactionItems.transactionId, id));
    
    // Get customer details if exists
    let customer = null;
    if (transaction.customerId) {
      const [customerData] = await db.select().from(customers).where(eq(customers.id, transaction.customerId));
      customer = customerData;
    }
    
    // Get user details
    let user = null;
    if (transaction.userId) {
      const [userData] = await db.select().from(users).where(eq(users.id, transaction.userId));
      if (userData) {
        const { password, ...userWithoutPassword } = userData;
        user = userWithoutPassword;
      }
    }
    
    return {
      ...transaction,
      items,
      customer,
      user
    } as any;
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
            movementType: 'out',
            quantity: item.quantity,
            unitCost: item.unitPrice, // Record sale price for profit tracking
            referenceId: transaction.id,
            referenceType: 'sale',
            notes: `Penjualan - ${transaction.transactionNumber}`,
            userId: transactionData.userId,
          });
        }

        // Create financial records via new finance manager
        try {
          const { financeManager } = await import('./financeManager');
          
          // Record revenue (income)
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

          // Calculate and record COGS (Cost of Goods Sold) using average purchase price
          let totalCOGS = 0;
          for (const item of items) {
            // Use weighted average purchase price instead of current product price
            const averagePrice = await this.getAveragePurchasePrice(item.productId);
            const itemCOGS = averagePrice * item.quantity;
            totalCOGS += itemCOGS;
          }

          // Record COGS as expense
          if (totalCOGS > 0) {
            await financeManager.createTransaction({
              type: 'expense',
              category: 'Cost of Goods Sold',
              subcategory: 'Product Cost',
              amount: totalCOGS.toString(),
              description: `COGS - ${transaction.transactionNumber}`,
              referenceType: 'sale',
              reference: transaction.id,
              paymentMethod: 'system',
              userId: transactionData.userId
            });
          }
        } catch (error) {
          console.error("Error creating financial records via finance manager:", error);
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

  async updateServiceTicket(id: string, ticketData: Partial<InsertServiceTicket>, parts?: InsertServiceTicketPart[], userId?: string): Promise<ServiceTicket> {
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
        
        // Add new parts and handle stock based on status
        for (const part of parts) {
          // Check if product exists
          const [product] = await tx.select().from(products).where(eq(products.id, part.productId));
          
          if (!product) {
            throw new Error(`Product dengan ID ${part.productId} tidak ditemukan`);
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
          
          // Only update stock and record movement for completed/delivered status
          if (ticket.status === 'completed' || ticket.status === 'delivered') {
            const currentStock = product.stock || 0;
            
            // Check stock for completed services - allow negative stock but warn
            if (currentStock < part.quantity) {
              console.warn(`WARNING: Stock ${product.name} tidak cukup. Tersedia: ${currentStock}, Diperlukan: ${part.quantity}. Melanjutkan dengan stock negatif.`);
              // Don't throw error, just proceed with negative stock
            }
            
            // Update product stock
            const newStock = currentStock - part.quantity;
            await tx.update(products)
              .set({ 
                stock: newStock,
                updatedAt: new Date()
              })
              .where(eq(products.id, part.productId));
            
            // Record stock movement
            await tx.insert(stockMovements).values({
              productId: part.productId,
              movementType: 'out',
              quantity: part.quantity,
              referenceId: id,
              referenceType: 'service',
              notes: `Digunakan untuk servis ${ticket.ticketNumber}`,
              userId: userId || 'a4fb9372-ec01-4825-b035-81de75a18053'
            });
          } else {
            // For non-completed status, just reserve stock (optional - estimate only)
            const currentReserved = product.reservedStock || 0;
            // Note: Reserved stock - for now we'll keep it simple and just track main stock
            // await tx.update(products)
            //   .set({ 
            //     reservedStock: currentReserved + part.quantity,
            //     updatedAt: new Date()
            //   })
            //   .where(eq(products.id, part.productId));
          }
          
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
              userId || 'a4fb9372-ec01-4825-b035-81de75a18053'
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
                  product.lastPurchasePrice || '0', // modal price
                  part.unitPrice, // selling price
                  userId || 'a4fb9372-ec01-4825-b035-81de75a18053'
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
        totalValue: sql<number>`SUM(${products.stock} * COALESCE(${products.lastPurchasePrice}, 0))`,
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
    todayRevenue: string;
    activeServices: number;
    lowStockCount: number;
    monthlyProfit: string;
    whatsappConnected: boolean;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Today's product sales (POS transactions only)
    const [todayProductSalesResult] = await db
      .select({ total: sum(transactions.total) })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'sale'),
          gte(transactions.createdAt, today)
        )
      );
    
    // Today's total revenue (all income including services)
    const [todayRevenueResult] = await db
      .select({ total: sum(financialRecords.amount) })
      .from(financialRecords)
      .where(
        and(
          eq(financialRecords.type, 'income'),
          gte(financialRecords.createdAt, today)
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
    
    // Get WhatsApp connection status from store config
    const storeConfig = await this.getStoreConfig();
    const whatsappConnected = storeConfig?.whatsappConnected || false;
    
    return {
      todaySales: todayProductSalesResult.total || '0',
      todayRevenue: todayRevenueResult.total || '0',
      activeServices: activeServicesResult.count,
      lowStockCount: lowStockResult.count,
      monthlyProfit: monthlyProfit.toString(),
      whatsappConnected,
    };
  }
  
  // Enhanced Accounting Methods Implementation
  async getBalanceSheet(asOfDate?: Date): Promise<any> {
    // Import and use FinanceManager to implement double-entry bookkeeping
    const { FinanceManager } = await import('./financeManager');
    const financeManager = new FinanceManager();
    return await financeManager.getBalanceSheet(asOfDate);
  }
  
  async getIncomeStatement(startDate?: Date, endDate?: Date): Promise<any> {
    const { FinanceManager } = await import('./financeManager');
    const financeManager = new FinanceManager();
    return await financeManager.getIncomeStatement(startDate, endDate);
  }
  
  async getChartOfAccounts(): Promise<any[]> {
    const { FinanceManager } = await import('./financeManager');
    const financeManager = new FinanceManager();
    return await financeManager.getChartOfAccounts();
  }
  
  async createJournalEntry(data: any): Promise<{ success: boolean; journalEntry?: any; error?: string }> {
    const { FinanceManager } = await import('./financeManager');
    const financeManager = new FinanceManager();
    return await financeManager.createJournalEntry(data);
  }
}

export const storage = new DatabaseStorage();
