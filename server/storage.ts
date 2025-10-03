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
  warrantyClaims,
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
  type WarrantyClaim,
  type InsertWarrantyClaim,
} from "@shared/schema";
import { db, getCurrentTenantContext } from "./db";
import { eq, desc, asc, and, or, gte, lte, like, ilike, count, sum, sql, isNotNull, isNull, gt, ne } from "drizzle-orm";
import {
  getCurrentJakartaTime,
  toJakartaTime,
  formatDateForDatabase,
  parseWithTimezone,
  getStartOfDayJakarta,
  getEndOfDayJakarta,
  createJakartaTimestamp,
  createDatabaseTimestamp
} from "@shared/utils/timezone";
import { FinanceManager } from "./financeManager";

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
  getAllOutstandingItems(): Promise<(PurchaseOrderItem & { productName: string; productSku: string; poNumber: string })[]>;
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
  cancelServiceTicket(id: string, data: {
    cancellationFee: string;
    cancellationReason: string;
    cancellationType: 'before_completed' | 'after_completed' | 'warranty_refund';
    userId: string;
  }): Promise<{ success: boolean; message?: string }>;
  
  // Stock Movements
  getStockMovements(productId?: string): Promise<StockMovement[]>;
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;
  
  // Financial Records
  getFinancialRecords(startDate?: Date, endDate?: Date): Promise<FinancialRecord[]>;
  createFinancialRecord(record: InsertFinancialRecord): Promise<FinancialRecord>;
  
  // Reports
  getSalesReport(startDate: Date, endDate: Date): Promise<{ totalSales: string; transactions: any[] }>;
  getServiceReport(startDate: Date, endDate: Date): Promise<{ totalServices: number; tickets: any[] }>;
  getFinancialReport(startDate: Date, endDate: Date): Promise<{
    totalIncome: string;
    totalExpense: string;
    profit: string;
    netProfit: string;
    totalSalesRevenue: string;
    totalCOGS: string;
    records: any[];
  }>;
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
  
  // Warranty Claims
  getWarrantyClaims(status?: string): Promise<WarrantyClaim[]>;
  getWarrantyClaimById(id: string): Promise<WarrantyClaim | undefined>;
  createWarrantyClaim(claim: InsertWarrantyClaim): Promise<WarrantyClaim>;
  updateWarrantyClaimStatus(id: string, status: string, processedBy?: string): Promise<WarrantyClaim>;
  processWarrantyClaim(id: string, status: string, processedBy: string, returnCondition?: string): Promise<WarrantyClaim>;
  validateWarrantyEligibility(originalTransactionId?: string, originalServiceTicketId?: string): Promise<{ isValid: boolean; message: string }>;
}

export class DatabaseStorage implements IStorage {
  protected readonly db = db;

  private resolveClientId(explicitClientId?: string | null) {
    if (typeof explicitClientId !== 'undefined') {
      return explicitClientId;
    }

    const tenantContext = getCurrentTenantContext();
    return tenantContext?.clientId ?? null;
  }

  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const clientId = this.resolveClientId();
    const conditions = clientId ? and(eq(users.id, id), eq(users.clientId, clientId)) : eq(users.id, id);
    const [user] = await db.select().from(users).where(conditions);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const clientId = this.resolveClientId();
    const [user] = await db
      .select()
      .from(users)
      .where(clientId ? and(eq(users.username, username), eq(users.clientId, clientId)) : eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser, clientId?: string): Promise<User> {
    const resolvedClientId = this.resolveClientId(clientId);
    const userDataWithClient = {
      ...userData,
      clientId: resolvedClientId
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
    const clientId = this.resolveClientId();
    if (clientId) {
      return await db
        .select()
        .from(users)
        .where(eq(users.clientId, clientId))
        .orderBy(desc(users.createdAt));
    }
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserCount(clientId?: string): Promise<number> {
    const resolvedClientId = this.resolveClientId(clientId);
    if (resolvedClientId) {
      // Multi-tenant mode: count users for specific client
      const result = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.clientId, resolvedClientId));
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
    const clientId = this.resolveClientId();
    const [user] = await db
      .select()
      .from(users)
      .where(clientId ? and(eq(users.email, email), eq(users.clientId, clientId)) : eq(users.email, email));
    return user;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User> {
    const clientId = this.resolveClientId();
    const conditions = clientId ? and(eq(users.id, id), eq(users.clientId, clientId)) : eq(users.id, id);
    const updateData: Partial<InsertUser> = { ...userData, updatedAt: new Date() };
    if (clientId) {
      updateData.clientId = clientId;
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(conditions)
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    const clientId = this.resolveClientId();
    const conditions = clientId ? and(eq(users.id, id), eq(users.clientId, clientId)) : eq(users.id, id);
    await db.delete(users).where(conditions);
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
    const [product] = await db.insert(products).values(productData as any).returning();
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
  async getPurchaseOrders(): Promise<(PurchaseOrder & { supplierName: string; itemCount?: number; outstandingCount?: number })[]> {
    // Get base purchase orders first
    const purchaseOrdersWithSupplier = await db
      .select({
        id: purchaseOrders.id,
        clientId: purchaseOrders.clientId,
        createdAt: purchaseOrders.createdAt,
        updatedAt: purchaseOrders.updatedAt,
        status: purchaseOrders.status,
        notes: purchaseOrders.notes,
        paymentTerms: purchaseOrders.paymentTerms,
        supplierId: purchaseOrders.supplierId,
        subtotal: purchaseOrders.subtotal,
        taxAmount: purchaseOrders.taxAmount,
        discountAmount: purchaseOrders.discountAmount,
        totalAmount: purchaseOrders.totalAmount,
        poNumber: purchaseOrders.poNumber,
        orderDate: purchaseOrders.orderDate,
        expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
        actualDeliveryDate: purchaseOrders.actualDeliveryDate,
        approvedBy: purchaseOrders.approvedBy,
        approvedDate: purchaseOrders.approvedDate,
        requestedBy: purchaseOrders.requestedBy,
        deliveryAddress: purchaseOrders.deliveryAddress,
        shippingMethod: purchaseOrders.shippingMethod,
        trackingNumber: purchaseOrders.trackingNumber,
        shippingCost: purchaseOrders.shippingCost,
        internalNotes: purchaseOrders.internalNotes,
        supplierName: suppliers.name,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .orderBy(desc(purchaseOrders.orderDate));

    // Add item counts separately to avoid complex SQL
    const result = await Promise.all(
      purchaseOrdersWithSupplier.map(async (po) => {
        const itemCountResult = await db
          .select({ count: count() })
          .from(purchaseOrderItems)
          .where(eq(purchaseOrderItems.purchaseOrderId, po.id));

        const outstandingResult = await db
          .select({ count: count() })
          .from(purchaseOrderItems)
          .where(
            and(
              eq(purchaseOrderItems.purchaseOrderId, po.id),
              or(
                isNotNull(purchaseOrderItems.outstandingQuantity),
                eq(purchaseOrderItems.outstandingStatus, 'pending')
              )
            )
          );

        return {
          ...po,
          supplierName: po.supplierName || 'Unknown Supplier',
          itemCount: itemCountResult[0]?.count || 0,
          outstandingCount: outstandingResult[0]?.count || 0,
        };
      })
    );

    return result;
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
    const items = await db
      .select({
        id: purchaseOrderItems.id,
        clientId: purchaseOrderItems.clientId,
        createdAt: purchaseOrderItems.createdAt,
        updatedAt: purchaseOrderItems.updatedAt,
        notes: purchaseOrderItems.notes,
        productId: purchaseOrderItems.productId,
        quantity: purchaseOrderItems.quantity,
        unitPrice: purchaseOrderItems.unitPrice,
        unitCost: purchaseOrderItems.unitCost,
        receivedQuantity: purchaseOrderItems.receivedQuantity,
        outstandingQuantity: purchaseOrderItems.outstandingQuantity,
        outstandingStatus: purchaseOrderItems.outstandingStatus,
        purchaseOrderId: purchaseOrderItems.purchaseOrderId,
        orderedQuantity: purchaseOrderItems.orderedQuantity,
        outstandingReason: purchaseOrderItems.outstandingReason,
        outstandingUpdatedBy: purchaseOrderItems.outstandingUpdatedBy,
        outstandingUpdatedAt: purchaseOrderItems.outstandingUpdatedAt,
        totalCost: purchaseOrderItems.totalCost,
        totalPrice: purchaseOrderItems.totalPrice,
        productName: products.name,
        productSku: products.sku,
      })
      .from(purchaseOrderItems)
      .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
      .where(eq(purchaseOrderItems.purchaseOrderId, poId));
    
    return items.map(item => ({
      ...item,
      productName: item.productName || 'Unknown Product',
      productSku: item.productSku || 'N/A'
    }));
  }

  // Get ALL outstanding items from ALL purchase orders (for reports)
  async getAllOutstandingItems(): Promise<(PurchaseOrderItem & { productName: string; productSku: string; poNumber: string })[]> {
    const items = await db
      .select({
        id: purchaseOrderItems.id,
        clientId: purchaseOrderItems.clientId,
        createdAt: purchaseOrderItems.createdAt,
        updatedAt: purchaseOrderItems.updatedAt,
        notes: purchaseOrderItems.notes,
        productId: purchaseOrderItems.productId,
        quantity: purchaseOrderItems.quantity,
        unitPrice: purchaseOrderItems.unitPrice,
        unitCost: purchaseOrderItems.unitCost,
        receivedQuantity: purchaseOrderItems.receivedQuantity,
        outstandingQuantity: purchaseOrderItems.outstandingQuantity,
        outstandingStatus: purchaseOrderItems.outstandingStatus,
        purchaseOrderId: purchaseOrderItems.purchaseOrderId,
        orderedQuantity: purchaseOrderItems.orderedQuantity,
        outstandingReason: purchaseOrderItems.outstandingReason,
        outstandingUpdatedBy: purchaseOrderItems.outstandingUpdatedBy,
        outstandingUpdatedAt: purchaseOrderItems.outstandingUpdatedAt,
        totalCost: purchaseOrderItems.totalCost,
        totalPrice: purchaseOrderItems.totalPrice,
        productName: products.name,
        productSku: products.sku,
        poNumber: purchaseOrders.poNumber,
      })
      .from(purchaseOrderItems)
      .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
      .leftJoin(purchaseOrders, eq(purchaseOrderItems.purchaseOrderId, purchaseOrders.id))
      .where(and(
        isNotNull(purchaseOrderItems.outstandingQuantity),
        gt(purchaseOrderItems.outstandingQuantity, 0)
      ))
      .orderBy(desc(purchaseOrders.orderDate));
    
    return items.map(item => ({
      ...item,
      productName: item.productName || 'Unknown Product',
      productSku: item.productSku || 'N/A',
      poNumber: item.poNumber || 'N/A'
    }));
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
    // Get item details with select all - no complex field selection
    const [item] = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.id, itemId));

    if (!item) throw new Error("Purchase order item not found");

    const resolvedClientId = this.resolveClientId(item.clientId);

    const newReceivedQuantity = (item.receivedQuantity || 0) + receivedQuantity;
    const newOutstandingQuantity = item.quantity - newReceivedQuantity;
    
    // Update received quantity and outstanding tracking
    await db
      .update(purchaseOrderItems)
      .set({ 
        receivedQuantity: newReceivedQuantity,
        outstandingQuantity: newOutstandingQuantity,
        // Clear outstanding status when fully received or keep as completed for refunded items
        outstandingStatus: newOutstandingQuantity > 0 ? (item.outstandingStatus || 'pending') : 'completed',
        updatedAt: new Date()
      })
      .where(eq(purchaseOrderItems.id, itemId));

    // Record stock movement with actual purchase price - different for refunded items
    const movementNotes = item.outstandingStatus === 'refunded' 
      ? `Refunded goods received from PO` 
      : `Received from PO`;
      
    await db.insert(stockMovements).values({
      clientId: resolvedClientId,
      productId: item.productId,
      movementType: 'in',
      quantity: receivedQuantity,
      unitCost: item.unitCost || item.unitPrice, // Try both field names for HPP calculation
      referenceId: item.purchaseOrderId,
      referenceType: item.outstandingStatus === 'refunded' ? 'purchase_refund' : 'purchase',
      notes: movementNotes,
      userId: userId,
    });

    // CREATE PROPER JOURNAL ENTRY for purchase (inventory in, cash/accounts payable out)
    const totalCost = parseFloat(item.unitCost || item.unitPrice || '0') * receivedQuantity;
    if (totalCost > 0) {
      try {
        const { FinanceManager } = await import('./financeManager');
        const financeManager = new FinanceManager();
        
        // Create different journal entries for refunded vs normal items
        if (item.outstandingStatus === 'refunded') {
          // For refunded items: Debit Inventory, Credit Refund Recovery
          await financeManager.createJournalEntry({
            description: `Refund recovery - ${receivedQuantity} units received`,
            reference: item.purchaseOrderId,
            referenceType: 'purchase_refund',
            lines: [
              {
                accountCode: '1300', // Inventory asset account
                description: `Inventory increase - Refund Recovery`,
                debitAmount: totalCost.toString()
              },
              {
                accountCode: '1200', // Accounts Receivable or Refund Recovery
                description: `Refund recovery - Supplier returned goods`,
                creditAmount: totalCost.toString()
              }
            ],
            userId: userId
          });
        } else {
          // Normal purchase: Debit Inventory, Credit Accounts Payable
          await financeManager.createJournalEntry({
            description: `Inventory purchase - ${receivedQuantity} units received`,
            reference: item.purchaseOrderId,
            referenceType: 'purchase_order',
            lines: [
              {
                accountCode: '1300', // Inventory asset account
                description: `Inventory increase - Purchase`,
                debitAmount: totalCost.toString()
              },
              {
                accountCode: '2000', // Accounts Payable (or could be cash if paid immediately)
                description: `Purchase liability - PO payment due`,
                creditAmount: totalCost.toString()
              }
            ],
            userId: userId
          });
        }

        // Also create the simple financial record for backward compatibility
        // IMPORTANT: Refunds should NOT be counted as income for accounting accuracy
        const recordType = item.outstandingStatus === 'refunded' ? 'refund_recovery' : 'expense';
        const recordDescription = item.outstandingStatus === 'refunded' 
          ? `Refund Recovery: ${receivedQuantity} units received`
          : `Purchase: ${receivedQuantity} units received`;
        const recordCategory = item.outstandingStatus === 'refunded' 
          ? 'Returns and Allowances'
          : 'Inventory Purchase';
          
        await db.insert(financialRecords).values({
          clientId: resolvedClientId,
          type: recordType,
          amount: totalCost.toString(),
          description: recordDescription,
          category: recordCategory,
          reference: item.purchaseOrderId,
          referenceType: item.outstandingStatus === 'refunded' ? 'refund_recovery' : 'purchase_order',
          userId: userId,
        });
      } catch (error) {
        console.error("Error creating journal entry for purchase:", error);
        // Fallback to simple financial record
        await db.insert(financialRecords).values({
          clientId: resolvedClientId,
          type: 'expense',
          amount: totalCost.toString(),
          description: `Purchase: ${receivedQuantity} units received`,
          category: 'Inventory Purchase',
          reference: item.purchaseOrderId,
          referenceType: 'purchase_order',
          userId: userId,
        });
      }
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
    const newAverageCost = await this.getAveragePurchasePrice(item.productId, resolvedClientId);
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
    const resolvedClientId = this.resolveClientId(movementData.clientId);
    const [movement] = await db.insert(stockMovements).values({
      ...movementData,
      clientId: resolvedClientId,
    }).returning();
    
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
        clientId: resolvedClientId,
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

  async getAveragePurchasePrice(productId: string, explicitClientId?: string | null): Promise<number> {
    const resolvedClientId = this.resolveClientId(explicitClientId);

    const movementClientFilter = resolvedClientId
      ? eq(stockMovements.clientId, resolvedClientId)
      : isNull(stockMovements.clientId);

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
        isNotNull(stockMovements.unitCost),
        movementClientFilter
      ));

    if (movements.length === 0) {
      // If no stock movements with price found, fallback to product's purchase price
      const productClientFilter = resolvedClientId
        ? eq(products.clientId, resolvedClientId)
        : isNull(products.clientId);

      const [product] = await db.select({ purchasePrice: products.lastPurchasePrice })
        .from(products)
        .where(and(
          eq(products.id, productId),
          productClientFilter
        ));
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
      const [transaction] = await tx.insert(transactions).values(transactionData as any).returning();
      
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
            userId: transaction.userId,
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
            userId: transaction.userId
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
              userId: transaction.userId
            });
          }
        } catch (error) {
          console.error("Error creating financial records via finance manager:", error);
        }
      }
      
      // Fetch complete transaction with items for receipt
      const completeTransaction = await this.getTransactionById(transaction.id);
      return completeTransaction || transaction;
    });
  }

  // Service Tickets
  async getServiceTickets(): Promise<ServiceTicket[]> {
    const tickets = await db
      .select({
        id: serviceTickets.id,
        clientId: serviceTickets.clientId,
        createdAt: serviceTickets.createdAt,
        updatedAt: serviceTickets.updatedAt,
        status: serviceTickets.status,
        customerId: serviceTickets.customerId,
        deviceType: serviceTickets.deviceType,
        deviceBrand: serviceTickets.deviceBrand,
        deviceModel: serviceTickets.deviceModel,
        serialNumber: serviceTickets.serialNumber,
        completeness: serviceTickets.completeness,
        problem: serviceTickets.problem,
        diagnosis: serviceTickets.diagnosis,
        solution: serviceTickets.solution,
        estimatedCost: serviceTickets.estimatedCost,
        actualCost: serviceTickets.actualCost,
        laborCost: serviceTickets.laborCost,
        partsCost: serviceTickets.partsCost,
        estimatedCompletion: serviceTickets.estimatedCompletion,
        technicianId: serviceTickets.technicianId,
        warrantyDuration: serviceTickets.warrantyDuration,
        warrantyStartDate: serviceTickets.warrantyStartDate,
        warrantyEndDate: serviceTickets.warrantyEndDate,
        // Cancellation fields
        cancellationFee: serviceTickets.cancellationFee,
        cancellationReason: serviceTickets.cancellationReason,
        cancelledAt: serviceTickets.cancelledAt,
        cancelledBy: serviceTickets.cancelledBy,
        cancellationType: serviceTickets.cancellationType,

        ticketNumber: serviceTickets.ticketNumber,
        completedAt: serviceTickets.completedAt,
        customerName: customers.name
      })
      .from(serviceTickets)
      .leftJoin(customers, eq(serviceTickets.customerId, customers.id))
      .orderBy(desc(serviceTickets.createdAt));
    
    return tickets.map(ticket => ({
      ...ticket,
      customerName: ticket.customerName || null, // Keep string field for backward compatibility
      customer: ticket.customerName ? { name: ticket.customerName } : null // Object field for new usage
    })) as ServiceTicket[];
  }

  async getServiceTicketById(id: string): Promise<ServiceTicket | undefined> {
    const [ticket] = await db.select().from(serviceTickets).where(eq(serviceTickets.id, id));
    return ticket;
  }

  async getActiveServiceTickets(): Promise<ServiceTicket[]> {
    const tickets = await db
      .select({
        id: serviceTickets.id,
        clientId: serviceTickets.clientId,
        createdAt: serviceTickets.createdAt,
        updatedAt: serviceTickets.updatedAt,
        status: serviceTickets.status,
        customerId: serviceTickets.customerId,
        deviceType: serviceTickets.deviceType,
        deviceBrand: serviceTickets.deviceBrand,
        deviceModel: serviceTickets.deviceModel,
        serialNumber: serviceTickets.serialNumber,
        completeness: serviceTickets.completeness,
        problem: serviceTickets.problem,
        diagnosis: serviceTickets.diagnosis,
        solution: serviceTickets.solution,
        estimatedCost: serviceTickets.estimatedCost,
        actualCost: serviceTickets.actualCost,
        laborCost: serviceTickets.laborCost,
        partsCost: serviceTickets.partsCost,
        estimatedCompletion: serviceTickets.estimatedCompletion,
        technicianId: serviceTickets.technicianId,
        warrantyDuration: serviceTickets.warrantyDuration,
        warrantyStartDate: serviceTickets.warrantyStartDate,
        warrantyEndDate: serviceTickets.warrantyEndDate,
        // Cancellation fields
        cancellationFee: serviceTickets.cancellationFee,
        cancellationReason: serviceTickets.cancellationReason,
        cancelledAt: serviceTickets.cancelledAt,
        cancelledBy: serviceTickets.cancelledBy,
        cancellationType: serviceTickets.cancellationType,

        ticketNumber: serviceTickets.ticketNumber,
        completedAt: serviceTickets.completedAt,
        customerName: customers.name
      })
      .from(serviceTickets)
      .leftJoin(customers, eq(serviceTickets.customerId, customers.id))
      .where(sql`${serviceTickets.status} != 'completed' AND ${serviceTickets.status} != 'cancelled'`)
      .orderBy(desc(serviceTickets.createdAt));
    
    return tickets.map(ticket => ({
      ...ticket,
      customerName: ticket.customerName || null, // Keep string field for backward compatibility
      customer: ticket.customerName ? { name: ticket.customerName } : null // Object field for new usage
    })) as ServiceTicket[];
  }

  async createServiceTicket(ticketData: InsertServiceTicket): Promise<ServiceTicket> {
    const [ticket] = await db.insert(serviceTickets).values(ticketData as any).returning();
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

  async cancelServiceTicket(id: string, data: {
    cancellationFee: string;
    cancellationReason: string;
    cancellationType: 'before_completed' | 'after_completed' | 'warranty_refund';
    userId: string;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      return await db.transaction(async (tx) => {
        // Get the service ticket
        const [ticket] = await tx.select().from(serviceTickets).where(eq(serviceTickets.id, id));
        
        if (!ticket) {
          return { success: false, message: 'Service ticket not found' };
        }

        if (ticket.status === 'cancelled') {
          return { success: false, message: 'Service ticket is already cancelled' };
        }

        // Get service ticket parts for stock operations
        const serviceParts = await tx.select({
          id: serviceTicketParts.id,
          productId: serviceTicketParts.productId,
          quantity: serviceTicketParts.quantity,
          unitPrice: serviceTicketParts.unitPrice,
          productName: products.name
        })
        .from(serviceTicketParts)
        .innerJoin(products, eq(serviceTicketParts.productId, products.id))
        .where(eq(serviceTicketParts.serviceTicketId, id));

        const now = getCurrentJakartaTime();
        
        // Validasi biaya cancel harus lebih dari 0
        if (!data.cancellationFee || isNaN(Number(data.cancellationFee)) || Number(data.cancellationFee) <= 0) {
          return { success: false, message: 'Biaya cancel harus diisi dan lebih dari 0' };
        }

        // Update service ticket dengan data pembatalan
        await tx.update(serviceTickets).set({
          status: 'cancelled',
          cancellationFee: data.cancellationFee,
          cancellationReason: data.cancellationReason,
          cancellationType: data.cancellationType,
          cancelledAt: now,
          cancelledBy: data.userId,
          updatedAt: now
        }).where(eq(serviceTickets.id, id));

        // Import finance manager for accounting
        const { financeManager } = await import('./financeManager');

        // Handle different cancellation scenarios
        switch (data.cancellationType) {
          case 'before_completed':
            // Scenario 1: Cancel Before Completed
            const beforeResult = await financeManager.recordServiceCancellationBeforeCompleted(
              id,
              data.cancellationFee,
              data.cancellationReason,
              data.userId,
              tx
            );
            
            if (!beforeResult.success) {
              return { success: false, message: beforeResult.error };
            }
            break;

          case 'after_completed':
            // Scenario 2: Cancel After Completed
            // Return parts to stock and reverse stock movements
            for (const part of serviceParts) {
              // Get current product stock
              const [product] = await tx.select().from(products).where(eq(products.id, part.productId));
              if (product) {
                // Return parts to stock
                const newStock = (product.stock || 0) + part.quantity;
                await tx.update(products).set({
                  stock: newStock,
                  updatedAt: now
                }).where(eq(products.id, part.productId));

                // Get cost basis for proper stock movement tracking
                const avgCost = await this.getAveragePurchasePrice(part.productId);
                
                // Record stock movement for return with cost
                await tx.insert(stockMovements).values({
                  productId: part.productId,
                  movementType: 'in',
                  quantity: part.quantity,
                  unitCost: avgCost.toString(),
                  referenceId: id,
                  referenceType: 'service',
                  notes: `Dikembalikan dari pembatalan servis ${ticket.ticketNumber}`,
                  userId: data.userId
                });
              }
            }

            // Record financial transactions with cost basis
            const partsForFinance = [];
            for (const part of serviceParts) {
              const avgCost = await this.getAveragePurchasePrice(part.productId);
              partsForFinance.push({
                name: part.productName,
                quantity: part.quantity,
                sellingPrice: part.unitPrice,
                costPrice: avgCost.toString()
              });
            }

            const afterResult = await financeManager.recordServiceCancellationAfterCompleted(
              id,
              data.cancellationFee,
              data.cancellationReason,
              partsForFinance,
              data.userId,
              tx
            );
            
            if (!afterResult.success) {
              return { success: false, message: afterResult.error };
            }
            break;

          case 'warranty_refund':
            // Scenario 3: Cancel Warranty Service (Full Refund)
            for (const part of serviceParts) {
              const [product] = await tx.select().from(products).where(eq(products.id, part.productId));
              if (product) {
                // Jika barang garansi kondisi normal, masuk ke stok normal
                const newStock = (product.stock || 0) + part.quantity;
                await tx.update(products).set({
                  stock: newStock,
                  updatedAt: now
                }).where(eq(products.id, part.productId));

                // Catat pergerakan stok masuk (warranty_return)
                const avgCost = await this.getAveragePurchasePrice(part.productId);
                await tx.insert(stockMovements).values({
                  productId: part.productId,
                  movementType: 'in',
                  quantity: part.quantity,
                  unitCost: avgCost.toString(),
                  referenceId: id,
                  referenceType: 'warranty_return',
                  notes: `Retur garansi - kondisi barang normal, dapat dijual kembali. ${ticket.ticketNumber}`,
                  userId: data.userId
                });

                // Setelah barang diambil/tukar untuk klaim, kurangi stok normal
                const afterExchangeStock = newStock - part.quantity;
                await tx.update(products).set({
                  stock: afterExchangeStock,
                  updatedAt: now
                }).where(eq(products.id, part.productId));

                // Catat pergerakan stok keluar (warranty_exchange)
                await tx.insert(stockMovements).values({
                  productId: part.productId,
                  movementType: 'out',
                  quantity: part.quantity,
                  unitCost: avgCost.toString(),
                  referenceId: id,
                  referenceType: 'warranty_exchange',
                  notes: `Barang diambil/tukar untuk klaim garansi. ${ticket.ticketNumber}`,
                  userId: data.userId
                });
              }
            }

            // Siapkan data parts untuk finance
            const partsForWarrantyFinance: Array<{ name: string; quantity: number; sellingPrice: string; costPrice: string }> = [];
            for (const part of serviceParts as Array<{ productName: string; quantity: number; unitPrice: string; productId: string }>) {
              const avgCost = await this.getAveragePurchasePrice(part.productId);
              partsForWarrantyFinance.push({
                name: part.productName,
                quantity: part.quantity,
                sellingPrice: part.unitPrice,
                costPrice: avgCost.toString()
              });
            }

            // Kirim laborCost dan partsCost yang benar
            const laborCost = ticket.laborCost || '0';
            const partsCost = ticket.partsCost || '0';

            // Panggil financeManager untuk catat refund dan reversal
            const warrantyResult = await financeManager.recordServiceCancellationWarrantyRefund(
              id,
              data.cancellationFee,
              laborCost,
              partsCost,
              data.cancellationReason,
              partsForWarrantyFinance,
              data.userId,
              tx
            );
            if (!warrantyResult.success) {
              return { success: false, message: warrantyResult.error };
            }
            break;

          default:
            return { success: false, message: 'Invalid cancellation type' };
        }

        return { 
          success: true, 
          message: `Service ticket cancelled successfully with ${data.cancellationType} scenario` 
        };
      });
    } catch (error) {
      console.error('Error cancelling service ticket:', error);
      return { 
        success: false, 
        message: `Failed to cancel service ticket: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // Service Ticket Parts
  async getServiceTicketParts(serviceTicketId: string): Promise<(ServiceTicketPart & { productName: string })[]> {
    const parts = await db
      .select({
        id: serviceTicketParts.id,
        clientId: serviceTicketParts.clientId,
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
    netProfit: string;
    totalSalesRevenue: string;
    totalCOGS: string;
    records: any[];
  }> {
    const clientId = this.resolveClientId();

    let totalSalesRevenueValue = 0;
    let totalCOGSValue = 0;

    try {
      const salesWhere = clientId
        ? and(
            eq(transactions.type, 'sale'),
            gte(transactions.createdAt, startDate),
            lte(transactions.createdAt, endDate),
            eq(transactions.clientId, clientId)
          )
        : and(
            eq(transactions.type, 'sale'),
            gte(transactions.createdAt, startDate),
            lte(transactions.createdAt, endDate)
          );

      const [posSummary] = await db
        .select({
          totalSales: sql<string>`COALESCE(SUM(${transactionItems.totalPrice}), 0)`,
          totalCOGS: sql<string>`COALESCE(SUM(${transactionItems.quantity}::numeric * COALESCE(${products.averageCost}, 0)::numeric), 0)`
        })
        .from(transactionItems)
        .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
        .innerJoin(products, eq(transactionItems.productId, products.id))
        .where(salesWhere);

      if (posSummary) {
        totalSalesRevenueValue = Number(posSummary.totalSales ?? 0);
        totalCOGSValue = Number(posSummary.totalCOGS ?? 0);
      }
    } catch (error) {
      console.error("Error calculating POS gross profit from transactions:", error);
    }

    const grossProfitValue = Number((totalSalesRevenueValue - totalCOGSValue).toFixed(2));
    const totalSalesRevenue = totalSalesRevenueValue.toString();
    const totalCOGS = totalCOGSValue.toString();
    const grossProfit = grossProfitValue.toString();

    try {
      const { financeManager } = await import('./financeManager');

      const summary = await financeManager.getSummary(startDate, endDate);
      const records = await financeManager.getTransactions({
        startDate,
        endDate
      });

      return {
        totalIncome: String(summary.totalIncome ?? '0'),
        totalExpense: String(summary.totalExpense ?? '0'),
        profit: String(summary.grossProfit ?? grossProfit),
        netProfit: String(
          summary.netProfit ?? summary.grossProfit ?? grossProfit
        ),
        totalSalesRevenue: String(
          summary.totalSalesRevenue ?? totalSalesRevenue
        ),
        totalCOGS: String(summary.totalCOGS ?? totalCOGS),
        records
      };
    } catch (error) {
      console.error("Error getting financial report from finance manager:", error);
      // Fallback to financial records aggregation
      const incomeWhere = clientId
        ? and(
            eq(financialRecords.type, 'income'),
            gte(financialRecords.createdAt, startDate),
            lte(financialRecords.createdAt, endDate),
            eq(financialRecords.clientId, clientId)
          )
        : and(
            eq(financialRecords.type, 'income'),
            gte(financialRecords.createdAt, startDate),
            lte(financialRecords.createdAt, endDate)
          );

      const expenseWhere = clientId
        ? and(
            eq(financialRecords.type, 'expense'),
            gte(financialRecords.createdAt, startDate),
            lte(financialRecords.createdAt, endDate),
            eq(financialRecords.clientId, clientId)
          )
        : and(
            eq(financialRecords.type, 'expense'),
            gte(financialRecords.createdAt, startDate),
            lte(financialRecords.createdAt, endDate)
          );

      const recordsWhere = clientId
        ? and(
            gte(financialRecords.createdAt, startDate),
            lte(financialRecords.createdAt, endDate),
            eq(financialRecords.clientId, clientId)
          )
        : and(
            gte(financialRecords.createdAt, startDate),
            lte(financialRecords.createdAt, endDate)
          );

      const [incomeResult] = await db
        .select({ total: sum(financialRecords.amount) })
        .from(financialRecords)
        .where(incomeWhere);

      const [expenseResult] = await db
        .select({ total: sum(financialRecords.amount) })
        .from(financialRecords)
        .where(expenseWhere);

      const [cogsResult] = await db
        .select({ total: sum(financialRecords.amount) })
        .from(financialRecords)
        .where(
          and(
            eq(financialRecords.type, 'expense'),
            sql`LOWER(${financialRecords.category}) = 'cost of goods sold'`,
            gte(financialRecords.createdAt, startDate),
            lte(financialRecords.createdAt, endDate)
          )
        );

      const [salesRevenueResult] = await db
        .select({ total: sum(financialRecords.amount) })
        .from(financialRecords)
        .where(
          and(
            eq(financialRecords.type, 'income'),
            sql`LOWER(${financialRecords.category}) = 'sales revenue'`,
            gte(financialRecords.createdAt, startDate),
            lte(financialRecords.createdAt, endDate)
          )
        );

      const records = await db
        .select()
        .from(financialRecords)
        .where(recordsWhere)
        .orderBy(desc(financialRecords.createdAt));

      const totalIncome = Number(incomeResult.total || 0);
      const totalExpense = Number(expenseResult.total || 0);
      const totalCOGSNumber = Number(cogsResult.total || 0);
      const totalSalesRevenueNumber = Number(salesRevenueResult.total || 0);
      const netProfitValue = totalIncome - totalExpense;
      const fallbackGrossProfit = Number(
        (totalSalesRevenueNumber - totalCOGSNumber).toFixed(2)
      );

      return {
        totalIncome: totalIncome.toString(),
        totalExpense: totalExpense.toString(),
        profit: fallbackGrossProfit.toString(),
        netProfit: netProfitValue.toString(),
        totalSalesRevenue: totalSalesRevenueNumber.toString(),
        totalCOGS: totalCOGSNumber.toString(),
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
    const clientId = this.resolveClientId();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const now = new Date();

    // Today's product sales (POS transactions only)
    const todaySalesWhere = clientId
      ? and(
          eq(transactions.type, 'sale'),
          gte(transactions.createdAt, today),
          eq(transactions.clientId, clientId)
        )
      : and(
          eq(transactions.type, 'sale'),
          gte(transactions.createdAt, today)
        );

    const [todayProductSalesResult] = await db
      .select({ total: sum(transactions.total) })
      .from(transactions)
      .where(todaySalesWhere);

    // Today's total revenue (all income including services)
    const todayRevenueWhere = clientId
      ? and(
          eq(financialRecords.type, 'income'),
          gte(financialRecords.createdAt, today),
          eq(financialRecords.clientId, clientId)
        )
      : and(
          eq(financialRecords.type, 'income'),
          gte(financialRecords.createdAt, today)
        );

    const [todayRevenueResult] = await db
      .select({ total: sum(financialRecords.amount) })
      .from(financialRecords)
      .where(todayRevenueWhere);

    // Active services
    const activeServicesWhere = clientId
      ? and(
          ne(serviceTickets.status, 'completed'),
          ne(serviceTickets.status, 'cancelled'),
          eq(serviceTickets.clientId, clientId)
        )
      : and(
          ne(serviceTickets.status, 'completed'),
          ne(serviceTickets.status, 'cancelled')
        );

    const [activeServicesResult] = await db
      .select({ count: count() })
      .from(serviceTickets)
      .where(activeServicesWhere);

    // Low stock count
    const lowStockWhere = clientId
      ? and(
          eq(products.isActive, true),
          sql`${products.stock} <= ${products.minStock}`,
          eq(products.clientId, clientId)
        )
      : and(
          eq(products.isActive, true),
          sql`${products.stock} <= ${products.minStock}`
        );

    const [lowStockResult] = await db
      .select({ count: count() })
      .from(products)
      .where(lowStockWhere);

    // Monthly profit calculated from POS transactions (harga jual - HPP)
    let monthlyProfit = 0;
    let monthlyProfitFromSales = false;

    try {
      const monthlySalesWhere = clientId
        ? and(
            eq(transactions.type, 'sale'),
            gte(transactions.createdAt, startOfMonth),
            lte(transactions.createdAt, now),
            eq(transactions.clientId, clientId)
          )
        : and(
            eq(transactions.type, 'sale'),
            gte(transactions.createdAt, startOfMonth),
            lte(transactions.createdAt, now)
          );

      const [monthlyPosSummary] = await db
        .select({
          totalSales: sql<string>`COALESCE(SUM(${transactionItems.totalPrice}), 0)`,
          totalCOGS: sql<string>`COALESCE(SUM(${transactionItems.quantity}::numeric * COALESCE(${products.averageCost}, 0)::numeric), 0)`
        })
        .from(transactionItems)
        .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
        .innerJoin(products, eq(transactionItems.productId, products.id))
        .where(monthlySalesWhere);

      if (monthlyPosSummary) {
        const monthlySalesValue = Number(monthlyPosSummary.totalSales ?? 0);
        const monthlyCOGSValue = Number(monthlyPosSummary.totalCOGS ?? 0);
        monthlyProfit = Number((monthlySalesValue - monthlyCOGSValue).toFixed(2));
        monthlyProfitFromSales = true;
      }
      const { financeManager } = await import('./financeManager');
      const summary = await financeManager.getSummary(startOfMonth, new Date());
      monthlyProfit = Number(summary.grossProfit || 0);
    } catch (error) {
      console.error("Error calculating monthly POS profit from transactions:", error);
    }

    if (!monthlyProfitFromSales) {
      try {
        const { financeManager } = await import('./financeManager');
        const summary = await financeManager.getSummary(startOfMonth, now);
        monthlyProfit = Number(summary.grossProfit || 0);
      } catch (error) {
        console.error("Error getting monthly profit from finance manager:", error);
        // Fallback to simplified financial record calculation (harga jual - HPP)
        const confirmedCondition = eq(financialRecords.status, 'confirmed');
        const monthlyIncomeWhere = clientId
          ? and(
              eq(financialRecords.type, 'income'),
              gte(financialRecords.createdAt, startOfMonth),
              confirmedCondition,
              eq(financialRecords.clientId, clientId)
            )
          : and(
              eq(financialRecords.type, 'income'),
              gte(financialRecords.createdAt, startOfMonth),
              confirmedCondition
            );

        const monthlyCogsWhere = clientId
          ? and(
              eq(financialRecords.type, 'expense'),
              sql`LOWER(${financialRecords.category}) = 'cost of goods sold'`,
              gte(financialRecords.createdAt, startOfMonth),
              confirmedCondition,
              eq(financialRecords.clientId, clientId)
            )
          : and(
              eq(financialRecords.type, 'expense'),
              sql`LOWER(${financialRecords.category}) = 'cost of goods sold'`,
              gte(financialRecords.createdAt, startOfMonth),
              confirmedCondition
            );

        const [monthlyIncomeResult] = await db
          .select({ total: sum(financialRecords.amount) })
          .from(financialRecords)
          .where(monthlyIncomeWhere);

        const [monthlyCogsResult] = await db
          .select({ total: sum(financialRecords.amount) })
          .from(financialRecords)
          .where(monthlyCogsWhere);

        const monthlyIncome = Number(monthlyIncomeResult.total || 0);
        const monthlyCOGS = Number(monthlyCogsResult.total || 0);
        monthlyProfit = monthlyIncome - monthlyCOGS;
      }
    }

    // Get WhatsApp connection status from store config
    const storeConfig = await this.getStoreConfig();
    const whatsappConnected = storeConfig?.whatsappConnected || false;

    return {
      todaySales: todayProductSalesResult?.total || '0',
      todayRevenue: todayRevenueResult?.total || '0',
      activeServices: activeServicesResult?.count || 0,
      lowStockCount: lowStockResult?.count || 0,
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

  // Warranty Claims
  async getWarrantyClaims(status?: string): Promise<any[]> {
    // Join with transactions and service tickets to get reference numbers
    const query = db
      .select({
        // Warranty claim fields
        id: warrantyClaims.id,
        claimNumber: warrantyClaims.claimNumber,
        claimType: warrantyClaims.claimType,
        status: warrantyClaims.status,
        claimReason: warrantyClaims.claimReason,
        claimDate: warrantyClaims.claimDate,
        processedDate: warrantyClaims.processedDate,
        returnCondition: warrantyClaims.returnCondition,
        notes: warrantyClaims.notes,
        createdAt: warrantyClaims.createdAt,
        updatedAt: warrantyClaims.updatedAt,
        
        // Reference information
        originalTransactionId: warrantyClaims.originalTransactionId,
        originalServiceTicketId: warrantyClaims.originalServiceTicketId,
        
        // Customer info
        customerId: warrantyClaims.customerId,
        customerName: customers.name,
        
        // Transaction reference (if applicable)
        transactionNumber: transactions.transactionNumber,
        
        // Service ticket reference (if applicable)
        serviceTicketNumber: serviceTickets.ticketNumber,
      })
      .from(warrantyClaims)
      .leftJoin(customers, eq(warrantyClaims.customerId, customers.id))
      .leftJoin(transactions, eq(warrantyClaims.originalTransactionId, transactions.id))
      .leftJoin(serviceTickets, eq(warrantyClaims.originalServiceTicketId, serviceTickets.id));
    
    if (status) {
      query.where(eq(warrantyClaims.status, status as any));
    }
    
    return await query.orderBy(desc(warrantyClaims.claimDate));
  }

  async getWarrantyClaimById(id: string): Promise<WarrantyClaim | undefined> {
    const [claim] = await db.select().from(warrantyClaims).where(eq(warrantyClaims.id, id));
    return claim;
  }

  async createWarrantyClaim(claimData: InsertWarrantyClaim): Promise<WarrantyClaim> {
    // Generate unique claim number
    const claimNumber = `WC-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    const [claim] = await db
      .insert(warrantyClaims)
      .values({
        ...claimData,
        claimNumber,
        // Let database use default timestamps
      })
      .returning();

    // For service warranty claims, auto-approve and create new service ticket
    if (claimData.claimType === 'service' && claimData.originalServiceTicketId) {
      await this.processServiceWarrantyClaim(claim.id, claimData.originalServiceTicketId, claimData.customerId);
    }

    return claim;
  }

  async updateWarrantyClaimStatus(id: string, status: string, processedBy?: string): Promise<WarrantyClaim> {
    const updateData: any = {
      status,
      // Let database handle updatedAt timestamp
    };

    if (processedBy) {
      updateData.processedBy = processedBy;
      updateData.processedDate = new Date(); // Use Date object for timestamp
    }

    const [claim] = await db
      .update(warrantyClaims)
      .set(updateData)
      .where(eq(warrantyClaims.id, id))
      .returning();

    return claim;
  }

  async processWarrantyClaim(id: string, status: string, processedBy: string, returnCondition?: string): Promise<WarrantyClaim> {
    const updateData: any = {
      status,
      processedBy,
      processedDate: new Date(), // Use Date object for timestamp
      // Let database handle updatedAt timestamp
    };

    if (returnCondition) {
      updateData.returnCondition = returnCondition;
    }

    const [claim] = await db
      .update(warrantyClaims)
      .set(updateData)
      .where(eq(warrantyClaims.id, id))
      .returning();

    return claim;
  }

  async validateWarrantyEligibility(originalTransactionId?: string, originalServiceTicketId?: string): Promise<{ isValid: boolean; message: string }> {
    try {
      if (originalTransactionId) {
        // Validate sales warranty
        const [transaction] = await db
          .select()
          .from(transactions)
          .where(eq(transactions.id, originalTransactionId));

        if (!transaction) {
          return { isValid: false, message: 'Original transaction not found' };
        }

        if (!transaction.warrantyEndDate) {
          return { isValid: false, message: 'No warranty information found for this transaction' };
        }

        const now = getCurrentJakartaTime();
        if (now > transaction.warrantyEndDate) {
          return { isValid: false, message: 'Warranty has expired' };
        }

        // Check for existing warranty claims
        const [existingClaim] = await db
          .select()
          .from(warrantyClaims)
          .where(eq(warrantyClaims.originalTransactionId, originalTransactionId));

        if (existingClaim && existingClaim.status !== 'rejected') {
          return { isValid: false, message: 'A warranty claim already exists for this transaction' };
        }

        return { isValid: true, message: 'Transaction is eligible for warranty claim' };
      }

      if (originalServiceTicketId) {
        // Validate service warranty
        const [serviceTicket] = await db
          .select()
          .from(serviceTickets)
          .where(eq(serviceTickets.id, originalServiceTicketId));

        if (!serviceTicket) {
          return { isValid: false, message: 'Original service ticket not found' };
        }

        if (!serviceTicket.warrantyEndDate) {
          return { isValid: false, message: 'No warranty information found for this service' };
        }

        const now = getCurrentJakartaTime();
        if (now > serviceTicket.warrantyEndDate) {
          return { isValid: false, message: 'Service warranty has expired' };
        }

        // Check for existing warranty claims
        const [existingClaim] = await db
          .select()
          .from(warrantyClaims)
          .where(eq(warrantyClaims.originalServiceTicketId, originalServiceTicketId));

        if (existingClaim && existingClaim.status !== 'rejected') {
          return { isValid: false, message: 'A warranty claim already exists for this service' };
        }

        return { isValid: true, message: 'Service ticket is eligible for warranty claim' };
      }

      return { isValid: false, message: 'No original transaction or service ticket specified' };
    } catch (error) {
      console.error('Error validating warranty eligibility:', error);
      return { isValid: false, message: 'Error validating warranty eligibility' };
    }
  }

  // Private helper method for processing service warranty claims
  private async processServiceWarrantyClaim(claimId: string, originalServiceTicketId: string, customerId: string): Promise<void> {
    try {
      // Get the original service ticket details
      const [originalTicket] = await db
        .select()
        .from(serviceTickets)
        .where(eq(serviceTickets.id, originalServiceTicketId));

      if (!originalTicket) {
        throw new Error('Original service ticket not found');
      }

      // Create new service ticket for warranty service
      const warrantyServiceData: InsertServiceTicket = {
        ticketNumber: `WS-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        customerId: customerId,
        deviceType: originalTicket.deviceType,
        deviceBrand: originalTicket.deviceBrand,
        deviceModel: originalTicket.deviceModel,
        serialNumber: originalTicket.serialNumber,
        problem: `Warranty Service - Follow up for ticket: ${originalTicket.ticketNumber}`,
        status: 'pending',
        laborCost: '0.00', // Free labor for warranty service
        estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        warrantyDuration: originalTicket.warrantyDuration || 90, // Default 90 days
        warrantyStartDate: new Date(),
        warrantyEndDate: new Date(Date.now() + (originalTicket.warrantyDuration || 90) * 24 * 60 * 60 * 1000),
      };

      await db.insert(serviceTickets).values(warrantyServiceData as any);

      // Update original service ticket status to indicate warranty claim
      await db
        .update(serviceTickets)
        .set({ 
          status: 'warranty_claim' as any,
          updatedAt: new Date(),
        })
        .where(eq(serviceTickets.id, originalServiceTicketId));

      // Auto-approve the warranty claim since it's for internal service
      await this.updateWarrantyClaimStatus(claimId, 'approved');

    } catch (error) {
      console.error('Error processing service warranty claim:', error);
      throw error;
    }
  }

  // Process sales return warranty - handle inventory and finance integration
  async processSalesReturnWarranty(
    originalTransactionId: string, 
    returnCondition: 'normal_stock' | 'damaged_stock',
    userId: string
  ): Promise<void> {
    try {
      // Get original transaction details
      const [originalTransaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, originalTransactionId));

      if (!originalTransaction) {
        throw new Error('Original transaction not found');
      }

      // Get transaction items that were sold
      const soldItems = await db
        .select()
        .from(transactionItems)
        .where(eq(transactionItems.transactionId, originalTransactionId));

      // Process each item return
      for (const item of soldItems) {
        const productId = item.productId;
        const quantity = item.quantity;
        
        if (returnCondition === 'normal_stock') {
          // Add back to normal inventory
          await db
            .update(products)
            .set({ 
              stock: sql`${products.stock} + ${quantity}`,
              updatedAt: new Date()
            })
            .where(eq(products.id, productId));

          // Create stock movement record
          await db.insert(stockMovements).values({
            productId: productId,
            movementType: 'adjustment',
            referenceType: 'warranty_return',
            quantity: quantity,
            referenceId: originalTransactionId,
            notes: `Retur garansi - kondisi barang normal, dapat dijual kembali`,
            userId: userId
          });

          // Create proper journal entries for normal stock return
          const financeManager = new FinanceManager();
          const itemValue = parseFloat(item.unitPrice) * quantity;
          
          // Journal Entry: Restore inventory value
          // Debit: Persediaan (Inventory), Credit: Beban Garansi (Warranty Expense)
          const journalResult = await financeManager.createJournalEntry({
            description: `Retur garansi - penambahan stok normal (${quantity} unit)`,
            reference: originalTransactionId,
            referenceType: 'warranty_return',
            lines: [
              {
                accountCode: '1130', // INVENTORY - Persediaan Barang
                description: `Penambahan persediaan dari retur garansi - Produk ID ${productId}`,
                debitAmount: itemValue.toString()
              },
              {
                accountCode: '5120', // WARRANTY_EXPENSE - Beban Garansi
                description: `Pemulihan beban garansi dari retur normal - Produk ID ${productId}`,
                creditAmount: itemValue.toString()
              }
            ],
            userId: userId
          });
          
          if (!journalResult.success) {
            console.warn(`Failed to create journal entry for normal warranty return: ${journalResult.error}`);
            
            // For normal stock returns, we should NOT create any financial record
            // as it should be financially neutral - only restore inventory
            // The warranty return does not generate new revenue/income
            console.log(`Normal warranty return processed without financial impact - only inventory restored`);
          }
        
        } else if (returnCondition === 'damaged_stock') {
          // Handle damaged stock with proper accounting principles
          
          // Create stock movement record for damaged goods tracking
          await db.insert(stockMovements).values({
            productId: productId,
            movementType: 'adjustment',
            referenceType: 'warranty_return_damaged',
            quantity: quantity,
            referenceId: originalTransactionId,
            notes: `Retur garansi - barang rusak tidak dapat dijual kembali`,
            userId: userId
          });

          // Create proper journal entries for damaged goods
          const financeManager = new FinanceManager();
          const itemValue = parseFloat(item.unitPrice) * quantity;
          
          // Journal Entry: Record damaged goods inventory and write-off
          // Debit: Kerugian Barang Rusak (Loss), Credit: Persediaan (Inventory)
          const journalResult = await financeManager.createJournalEntry({
            description: `Retur garansi - kerugian barang rusak (${quantity} unit)`,
            reference: originalTransactionId,
            referenceType: 'warranty_return_damaged',
            lines: [
              {
                accountCode: '5130', // DAMAGED_GOODS_LOSS - Kerugian Barang Rusak
                description: `Kerugian barang rusak dari retur garansi - Produk ID ${productId}`,
                debitAmount: itemValue.toString()
              },
              {
                accountCode: '1130', // INVENTORY - Persediaan Barang
                description: `Pengurangan persediaan akibat barang rusak - Produk ID ${productId}`,
                creditAmount: itemValue.toString()
              }
            ],
            userId: userId
          });
          
          if (!journalResult.success) {
            console.warn(`Failed to create journal entry for damaged goods: ${journalResult.error}`);
            
            // Fallback: Create financial record entry if journal entry fails
            await db.insert(financialRecords).values({
              type: 'expense',
              category: 'Kerugian Barang Rusak',
              subcategory: 'Retur Garansi',
              description: `Retur garansi - kerugian barang rusak (${quantity} unit, Produk ID ${productId})`,
              amount: itemValue.toString(),
              reference: originalTransactionId,
              referenceType: 'warranty_return_damaged',
              userId: userId
            });
          }
        }
      }

    } catch (error) {
      console.error('Error processing sales return warranty:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
