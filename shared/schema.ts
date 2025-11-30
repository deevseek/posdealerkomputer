import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  date,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";


// Import SaaS-specific tables and types
export * from './saas-schema';

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire", { withTimezone: true }).notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enums
export const userRoleEnum = pgEnum('user_role', ['super_admin', 'admin', 'kasir', 'teknisi', 'purchasing', 'finance', 'owner']);
export const transactionTypeEnum = pgEnum('transaction_type', ['sale', 'service', 'purchase', 'return']);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'transfer', 'qris', 'installment']);
export const serviceStatusEnum = pgEnum('service_status', [
  'pending',
  'checking',
  'in-progress',
  'waiting-technician',
  'testing',
  'waiting-confirmation',
  'waiting-parts',
  'completed',
  'delivered',
  'cancelled'
]);
export const stockMovementTypeEnum = pgEnum('stock_movement_type', ['in', 'out', 'adjustment']);
export const stockReferenceTypeEnum = pgEnum('stock_reference_type', ['sale', 'service', 'purchase', 'adjustment', 'return']);
export const warrantyClaimTypeEnum = pgEnum('warranty_claim_type', ['service', 'sales_return']);
export const warrantyClaimStatusEnum = pgEnum('warranty_claim_status', ['pending', 'approved', 'rejected', 'processed']);
export const returnConditionEnum = pgEnum('return_condition', ['normal_stock', 'damaged_stock']);
export const cancellationTypeEnum = pgEnum('cancellation_type', ['before_completed', 'after_completed', 'warranty_refund']);

// User storage table (multi-tenant aware)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"), // Add tenant ID for SaaS multi-tenancy
  username: varchar("username"),
  password: varchar("password"),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default('kasir'),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

// Roles table for role management
export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").unique().notNull(),
  displayName: varchar("display_name").notNull(),
  description: text("description"),
  permissions: text("permissions").array(), // JSON array of permissions
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

// Store configuration
export const storeConfig = pgTable("store_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"), // Add tenant ID for SaaS multi-tenancy
  name: varchar("name").notNull(),
  address: text("address"),
  phone: varchar("phone"),
  email: varchar("email"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default('11.00'),
  defaultDiscount: decimal("default_discount", { precision: 5, scale: 2 }).default('0.00'),
  logo: varchar("logo"),
  // Setup wizard status
  setupCompleted: boolean("setup_completed").default(false),
  setupSteps: text("setup_steps"), // JSON: store, database, admin completed steps
  // Database configuration (if needed for self-hosted)
  databaseUrl: text("database_url"),
  databaseHost: varchar("database_host"),
  databasePort: integer("database_port"),
  databaseName: varchar("database_name"),
  databaseUser: varchar("database_user"),
  databasePassword: varchar("database_password"),
  // WhatsApp settings
  whatsappEnabled: boolean("whatsapp_enabled").default(false),
  whatsappSessionData: text("whatsapp_session_data"), // Store session data
  whatsappQR: text("whatsapp_qr"), // Store QR code
  whatsappConnected: boolean("whatsapp_connected").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

// Categories
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"), // Add tenant ID for SaaS multi-tenancy
  name: varchar("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

// Products - Enhanced inventory system
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"), // Add tenant ID for SaaS multi-tenancy
  name: varchar("name").notNull(),
  description: text("description"),
  categoryId: varchar("category_id").references(() => categories.id),
  sku: varchar("sku").unique().notNull(),
  barcode: varchar("barcode"),
  brand: varchar("brand"),
  model: varchar("model"),
  unit: varchar("unit").default("pcs"), // unit of measurement
  specifications: text("specifications"), // JSON string for detailed specs
  
  // Pricing
  lastPurchasePrice: decimal("last_purchase_price", { precision: 12, scale: 2 }),
  averageCost: decimal("average_cost", { precision: 12, scale: 2 }), // calculated COGS
  sellingPrice: decimal("selling_price", { precision: 12, scale: 2 }),
  marginPercent: decimal("margin_percent", { precision: 5, scale: 2 }),
  
  // Stock management
  stock: integer("stock").default(0), // Main stock field for purchasing integration
  totalStock: integer("total_stock").default(0),
  availableStock: integer("available_stock").default(0), // total - reserved
  reservedStock: integer("reserved_stock").default(0),
  minStock: integer("min_stock").default(0),
  maxStock: integer("max_stock"),
  reorderPoint: integer("reorder_point"),
  reorderQuantity: integer("reorder_quantity"),
  
  // Tracking
  trackBatches: boolean("track_batches").default(false),
  trackSerial: boolean("track_serial").default(false),
  trackExpiry: boolean("track_expiry").default(false),
  
  // Status
  isActive: boolean("is_active").default(true),
  isDiscontinued: boolean("is_discontinued").default(false),
  
  // Metadata
  weight: decimal("weight", { precision: 8, scale: 3 }),
  dimensions: varchar("dimensions"), // LxWxH format
  supplierProductCode: varchar("supplier_product_code"),
  notes: text("notes"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

// Customers
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"), // Add tenant ID for SaaS multi-tenancy
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  address: text("address"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

// Suppliers - Enhanced supplier management
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"), // Add tenant ID for SaaS multi-tenancy
  code: varchar("code").unique().notNull(), // supplier code
  name: varchar("name").notNull(),
  companyName: varchar("company_name"),
  
  // Contact information
  email: varchar("email"),
  phone: varchar("phone"),
  altPhone: varchar("alt_phone"),
  website: varchar("website"),
  
  // Address
  address: text("address"),
  city: varchar("city"),
  province: varchar("province"),
  postalCode: varchar("postal_code"),
  country: varchar("country").default("Indonesia"),
  
  // Contact persons
  contactPerson: varchar("contact_person"),
  contactTitle: varchar("contact_title"),
  contactEmail: varchar("contact_email"),
  contactPhone: varchar("contact_phone"),
  
  // Business details
  taxNumber: varchar("tax_number"), // NPWP
  businessLicense: varchar("business_license"),
  
  // Terms
  paymentTerms: integer("payment_terms").default(30), // days
  creditLimit: decimal("credit_limit", { precision: 15, scale: 2 }),
  
  // Status and ratings
  isActive: boolean("is_active").default(true),
  rating: integer("rating").default(5), // 1-5 stars
  
  // Banking
  bankName: varchar("bank_name"),
  bankAccount: varchar("bank_account"),
  bankAccountName: varchar("bank_account_name"),
  
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

// Transactions
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"), // Add tenant ID for SaaS multi-tenancy
  transactionNumber: varchar("transaction_number").notNull().unique(),
  type: transactionTypeEnum("type").notNull(),
  customerId: varchar("customer_id").references(() => customers.id),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  userId: varchar("user_id").references(() => users.id).notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).notNull().default('0.00'),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default('0.00'),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull().default('0.00'),
  paymentMethod: paymentMethodEnum("payment_method"),
  notes: text("notes"),
  // Warranty fields
  warrantyDuration: integer("warranty_duration"), // Duration in days
  warrantyStartDate: timestamp("warranty_start_date", { withTimezone: true }).default(sql`now()`),
  warrantyEndDate: timestamp("warranty_end_date", { withTimezone: true }).default(sql`now()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// Transaction Items
export const transactionItems = pgTable("transaction_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"), // Add tenant ID for SaaS multi-tenancy
  transactionId: varchar("transaction_id").references(() => transactions.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
});

// Service Tickets
export const serviceTickets = pgTable("service_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"), // Add tenant ID for SaaS multi-tenancy
  ticketNumber: varchar("ticket_number").notNull().unique(),
  customerId: varchar("customer_id").references(() => customers.id).notNull(),
  deviceType: varchar("device_type").notNull(),
  deviceBrand: varchar("device_brand"),
  deviceModel: varchar("device_model"),
  serialNumber: varchar("serial_number"),
  completeness: text("completeness"),
  problem: text("problem").notNull(),
  diagnosis: text("diagnosis"),
  solution: text("solution"),
  estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 12, scale: 2 }),
  laborCost: decimal("labor_cost", { precision: 12, scale: 2 }),
  partsCost: decimal("parts_cost", { precision: 12, scale: 2 }),
  status: serviceStatusEnum("status").default('pending'),
  technicianId: varchar("technician_id").references(() => users.id),
  estimatedCompletion: timestamp("estimated_completion", { withTimezone: true }).default(sql`now()`),
  completedAt: timestamp("completed_at", { withTimezone: true }).default(sql`now()`),
  // Warranty fields
  warrantyDuration: integer("warranty_duration"), // Duration in days
  warrantyStartDate: timestamp("warranty_start_date", { withTimezone: true }).default(sql`now()`),
  warrantyEndDate: timestamp("warranty_end_date", { withTimezone: true }).default(sql`now()`),
  
  // Cancellation fields
  cancellationFee: decimal("cancellation_fee", { precision: 12, scale: 2 }),
  cancellationReason: text("cancellation_reason"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancelledBy: varchar("cancelled_by").references(() => users.id),
  cancellationType: cancellationTypeEnum("cancellation_type"),

  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

// Service Ticket Parts - Track parts used in service repairs
export const serviceTicketParts = pgTable("service_ticket_parts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"), // Add tenant ID for SaaS multi-tenancy
  serviceTicketId: varchar("service_ticket_id").references(() => serviceTickets.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

// Warranty Claims - Track warranty claims for both sales and service
export const warrantyClaims = pgTable("warranty_claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"), // Add tenant ID for SaaS multi-tenancy
  claimNumber: varchar("claim_number").notNull().unique(),

  // Reference to original transaction/service
  originalTransactionId: varchar("original_transaction_id").references(() => transactions.id),
  originalServiceTicketId: varchar("original_service_ticket_id").references(() => serviceTickets.id),
  warrantyServiceTicketId: varchar("warranty_service_ticket_id").references(() => serviceTickets.id),

  // Claim details
  claimType: warrantyClaimTypeEnum("claim_type").notNull(), // 'service' | 'sales_return'
  status: warrantyClaimStatusEnum("status").default('pending'), // 'pending' | 'approved' | 'rejected' | 'processed'
  customerId: varchar("customer_id").references(() => customers.id).notNull(),
  claimReason: text("claim_reason").notNull(),

  // Dates and processing
  claimDate: timestamp("claim_date", { withTimezone: true }).default(sql`now()`),
  processedDate: timestamp("processed_date", { withTimezone: true }),
  processedBy: varchar("processed_by").references(() => users.id),

  // Return condition (for sales returns)
  returnCondition: returnConditionEnum("return_condition"), // 'normal_stock' | 'damaged_stock'

  // Additional information
  notes: text("notes"),
  adminNotes: text("admin_notes"),
  claimedItems: jsonb("claimed_items"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

// Product Locations - Warehouse/Location management
export const locations = pgTable("locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"), // Add tenant ID for SaaS multi-tenancy
  code: varchar("code").unique().notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  locationType: varchar("location_type").default("warehouse"), // warehouse, store, etc
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

// Product Batches/Lots - For batch tracking
export const productBatches = pgTable("product_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"), // Add tenant ID for SaaS multi-tenancy
  productId: varchar("product_id").references(() => products.id).notNull(),
  batchNumber: varchar("batch_number").notNull(),
  serialNumbers: text("serial_numbers").array(), // for serial tracking
  
  // Pricing for this batch
  unitCost: decimal("unit_cost", { precision: 12, scale: 2 }).notNull(),
  
  // Quantities
  receivedQuantity: integer("received_quantity").notNull(),
  currentQuantity: integer("current_quantity").notNull(),
  reservedQuantity: integer("reserved_quantity").default(0),
  
  // Dates
  manufactureDate: date("manufacture_date"),
  expiryDate: date("expiry_date"),
  receivedDate: timestamp("received_date", { withTimezone: true }).default(sql`now()`),
  
  // References
  purchaseOrderId: varchar("purchase_order_id"),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  locationId: varchar("location_id").references(() => locations.id),
  
  // Status
  status: varchar("status").default("active"), // active, expired, recalled, sold_out
  
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

// Purchase Orders - Comprehensive purchasing system
export const purchaseOrders = pgTable("purchase_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"), // Add tenant ID for SaaS multi-tenancy
  poNumber: varchar("po_number").unique().notNull(),
  supplierId: varchar("supplier_id").references(() => suppliers.id).notNull(),
  
  // Dates
  orderDate: date("order_date").default(sql`((now() at time zone 'Asia/Jakarta')::date)`),
  expectedDeliveryDate: date("expected_delivery_date"),
  actualDeliveryDate: date("actual_delivery_date"),
  
  // Status workflow
  status: varchar("status").default("draft"), // draft, sent, confirmed, partial_received, received, cancelled
  
  // Financial
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0"),
  discountAmount: decimal("discount_amount", { precision: 15, scale: 2 }).default("0"),
  shippingCost: decimal("shipping_cost", { precision: 15, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  
  // Approval workflow
  requestedBy: varchar("requested_by").references(() => users.id).notNull(),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedDate: timestamp("approved_date", { withTimezone: true }).default(sql`now()`),
  
  // Delivery
  deliveryAddress: text("delivery_address"),
  shippingMethod: varchar("shipping_method"),
  trackingNumber: varchar("tracking_number"),
  
  // Terms
  paymentTerms: integer("payment_terms").default(30),
  
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

// Purchase Order Items
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"), // Add tenant ID for SaaS multi-tenancy
  purchaseOrderId: varchar("purchase_order_id").references(() => purchaseOrders.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  
  // Quantities - both fields exist in database
  quantity: integer("quantity").notNull(),
  orderedQuantity: integer("ordered_quantity"),
  receivedQuantity: integer("received_quantity").default(0),
  
  // Outstanding quantity tracking - NEW FIELDS
  outstandingQuantity: integer("outstanding_quantity").default(0), // quantity - receivedQuantity
  outstandingStatus: varchar("outstanding_status").default('pending'), // 'pending', 'cancelled', 'refunded', 'backordered', 'partial_delivered'
  outstandingReason: text("outstanding_reason"), // reason for status change
  outstandingUpdatedBy: varchar("outstanding_updated_by").references(() => users.id),
  outstandingUpdatedAt: timestamp("outstanding_updated_at", { withTimezone: true }).default(sql`now()`),
  
  // Pricing - both naming conventions exist
  unitCost: varchar("unit_cost").notNull(),
  totalCost: varchar("total_cost"),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }),
  
  // Product info at time of order (for historical tracking)
  productName: varchar("product_name"),
  productSku: varchar("product_sku"),
  
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

// Stock Movements - Enhanced tracking system
export const stockMovements = pgTable("stock_movements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"), // Add tenant ID for SaaS multi-tenancy
  
  // Product tracking
  productId: varchar("product_id").references(() => products.id).notNull(),
  batchId: varchar("batch_id").references(() => productBatches.id),
  locationId: varchar("location_id").references(() => locations.id),
  
  // Movement details
  movementType: varchar("movement_type").notNull(), // in, out, transfer, adjustment
  quantity: integer("quantity").notNull(),
  unitCost: decimal("unit_cost", { precision: 12, scale: 2 }),
  
  // References
  referenceId: varchar("reference_id"), // PO ID, Sale ID, Adjustment ID, etc
  referenceType: varchar("reference_type").notNull(), // purchase, sale, adjustment, transfer, service
  
  // Additional tracking
  fromLocationId: varchar("from_location_id").references(() => locations.id),
  toLocationId: varchar("to_location_id").references(() => locations.id),
  
  // Metadata
  notes: text("notes"),
  reason: varchar("reason"), // damaged, expired, sold, etc
  userId: varchar("user_id").references(() => users.id).notNull(),
  
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

// Inventory Adjustments - For manual stock corrections
export const inventoryAdjustments = pgTable("inventory_adjustments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"), // Add tenant ID for SaaS multi-tenancy
  adjustmentNumber: varchar("adjustment_number").unique().notNull(),
  
  // Adjustment details
  type: varchar("type").notNull(), // increase, decrease, recount
  reason: varchar("reason").notNull(), // damage, theft, expiry, recount, etc
  
  // Approval
  status: varchar("status").default("pending"), // pending, approved, rejected
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedDate: timestamp("approved_date", { withTimezone: true }).default(sql`now()`),
  
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

// Inventory Adjustment Items
export const inventoryAdjustmentItems = pgTable("inventory_adjustment_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"), // Add tenant ID for SaaS multi-tenancy
  adjustmentId: varchar("adjustment_id").references(() => inventoryAdjustments.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  batchId: varchar("batch_id").references(() => productBatches.id),
  locationId: varchar("location_id").references(() => locations.id),
  
  // Quantities
  systemQuantity: integer("system_quantity").notNull(), // what system shows
  actualQuantity: integer("actual_quantity").notNull(), // what was counted
  adjustmentQuantity: integer("adjustment_quantity").notNull(), // difference
  
  // Cost impact
  unitCost: decimal("unit_cost", { precision: 12, scale: 2 }),
  totalCostImpact: decimal("total_cost_impact", { precision: 12, scale: 2 }),
  
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

// Financial Records - Complete rebuild
// Financial Records - Legacy compatibility (keep for migration)
export const financialRecords = pgTable("financial_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"), // Add tenant ID for SaaS multi-tenancy
  type: varchar("type", { length: 20 }).notNull(), // income, expense, transfer
  category: varchar("category", { length: 100 }).notNull(),
  subcategory: varchar("subcategory", { length: 100 }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull(),
  reference: varchar("reference"), // Reference to transaction, service ticket, payroll, etc.
  referenceType: varchar("reference_type", { length: 50 }), // sale, service, payroll, expense, etc.
  accountId: varchar("account_id").references(() => accounts.id),
  journalEntryId: varchar("journal_entry_id").references(() => journalEntries.id), // Link to journal entry
  paymentMethod: varchar("payment_method", { length: 50 }), // cash, bank_transfer, credit_card, etc.
  status: varchar("status", { length: 20 }).default("confirmed"), // pending, confirmed, cancelled
  tags: text("tags").array(), // For better categorization
  userId: varchar("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

// Chart of Accounts
export const accounts: any = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"), // Add tenant ID for SaaS multi-tenancy
  code: varchar("code", { length: 20 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 30 }).notNull(), // asset, liability, equity, revenue, expense
  subtype: varchar("subtype", { length: 50 }), // current_asset, fixed_asset, operating_revenue, etc.
  parentId: varchar("parent_id").references((): any => accounts.id),
  normalBalance: varchar("normal_balance", { length: 10 }).notNull(), // debit or credit
  balance: decimal("balance", { precision: 15, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

// Journal Entries for Double-Entry Bookkeeping
export const journalEntries = pgTable("journal_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"), // Add tenant ID for SaaS multi-tenancy
  journalNumber: varchar("journal_number", { length: 50 }).unique().notNull(),
  date: timestamp("date", { withTimezone: true }).notNull().default(sql`now()`),
  description: text("description").notNull(),
  reference: varchar("reference"), // Reference to source transaction
  referenceType: varchar("reference_type", { length: 50 }), // sale, purchase, service, payroll, etc.
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default("posted"), // draft, posted, reversed
  userId: varchar("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

// Journal Entry Lines (Debit/Credit entries)
export const journalEntryLines = pgTable("journal_entry_lines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"), // Add tenant ID for SaaS multi-tenancy
  journalEntryId: varchar("journal_entry_id").references(() => journalEntries.id).notNull(),
  accountId: varchar("account_id").references(() => accounts.id).notNull(),
  description: text("description").notNull(),
  debitAmount: decimal("debit_amount", { precision: 15, scale: 2 }).default("0"),
  creditAmount: decimal("credit_amount", { precision: 15, scale: 2 }).default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

// Employees for Payroll
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"), // Add tenant ID for SaaS multi-tenancy
  employeeNumber: varchar("employee_number", { length: 50 }).unique().notNull(),
  userId: varchar("user_id").references(() => users.id),
  name: varchar("name", { length: 100 }).notNull(),
  position: varchar("position", { length: 100 }).notNull(),
  department: varchar("department", { length: 100 }),
  salary: decimal("salary", { precision: 12, scale: 2 }).notNull(),
  salaryType: varchar("salary_type", { length: 20 }).default("monthly"), // monthly, weekly, daily, hourly
  joinDate: timestamp("join_date", { withTimezone: true }).notNull().default(sql`now()`),
  endDate: timestamp("end_date", { withTimezone: true }).default(sql`now()`),
  status: varchar("status", { length: 20 }).default("active"), // active, inactive, terminated
  bankAccount: varchar("bank_account", { length: 50 }),
  taxId: varchar("tax_id", { length: 50 }),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  emergencyContact: jsonb("emergency_contact"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

// Payroll Records
export const payrollRecords = pgTable("payroll_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"), // Add tenant ID for SaaS multi-tenancy
  employeeId: varchar("employee_id").references(() => employees.id).notNull(),
  payrollNumber: varchar("payroll_number", { length: 50 }).unique().notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull().default(sql`now()`),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull().default(sql`now()`),
  baseSalary: decimal("base_salary", { precision: 12, scale: 2 }).notNull(),
  overtime: decimal("overtime", { precision: 12, scale: 2 }).default("0"),
  bonus: decimal("bonus", { precision: 12, scale: 2 }).default("0"),
  allowances: decimal("allowances", { precision: 12, scale: 2 }).default("0"),
  grossPay: decimal("gross_pay", { precision: 12, scale: 2 }).notNull(),
  taxDeduction: decimal("tax_deduction", { precision: 12, scale: 2 }).default("0"),
  socialSecurity: decimal("social_security", { precision: 12, scale: 2 }).default("0"),
  healthInsurance: decimal("health_insurance", { precision: 12, scale: 2 }).default("0"),
  otherDeductions: decimal("other_deductions", { precision: 12, scale: 2 }).default("0"),
  netPay: decimal("net_pay", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default("draft"), // draft, approved, paid
  paidDate: timestamp("paid_date", { withTimezone: true }).default(sql`now()`),
  notes: text("notes"),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

// Attendance Records
export const attendanceRecords = pgTable("attendance_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"), // Add tenant ID for SaaS multi-tenancy
  employeeId: varchar("employee_id").references(() => employees.id).notNull(),
  date: timestamp("date", { withTimezone: true }).notNull().default(sql`now()`),
  clockIn: timestamp("clock_in", { withTimezone: true }).default(sql`now()`),
  clockOut: timestamp("clock_out", { withTimezone: true }).default(sql`now()`),
  breakStart: timestamp("break_start", { withTimezone: true }).default(sql`now()`),
  breakEnd: timestamp("break_end", { withTimezone: true }).default(sql`now()`),
  hoursWorked: decimal("hours_worked", { precision: 4, scale: 2 }).default("0"),
  overtimeHours: decimal("overtime_hours", { precision: 4, scale: 2 }).default("0"),
  status: varchar("status", { length: 20 }).default("present"), // present, absent, late, half_day
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

// Relations  
export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  serviceTickets: many(serviceTickets),
  stockMovements: many(stockMovements),
  financialRecords: many(financialRecords),
  employees: many(employees),
  payrollRecords: many(payrollRecords),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  parent: one(accounts, {
    fields: [accounts.parentId],
    references: [accounts.id],
  }),
  children: many(accounts),
  financialRecords: many(financialRecords),
  journalEntryLines: many(journalEntryLines),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
  user: one(users, {
    fields: [journalEntries.userId],
    references: [users.id],
  }),
  lines: many(journalEntryLines),
  financialRecords: many(financialRecords),
}));

export const journalEntryLinesRelations = relations(journalEntryLines, ({ one }) => ({
  journalEntry: one(journalEntries, {
    fields: [journalEntryLines.journalEntryId],
    references: [journalEntries.id],
  }),
  account: one(accounts, {
    fields: [journalEntryLines.accountId],
    references: [accounts.id],
  }),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  user: one(users, {
    fields: [employees.userId],
    references: [users.id],
  }),
  payrollRecords: many(payrollRecords),
  attendanceRecords: many(attendanceRecords),
}));

export const payrollRecordsRelations = relations(payrollRecords, ({ one }) => ({
  employee: one(employees, {
    fields: [payrollRecords.employeeId],
    references: [employees.id],
  }),
  user: one(users, {
    fields: [payrollRecords.userId],
    references: [users.id],
  }),
}));

export const attendanceRecordsRelations = relations(attendanceRecords, ({ one }) => ({
  employee: one(employees, {
    fields: [attendanceRecords.employeeId],
    references: [employees.id],
  }),
}));

export const financialRecordsRelations = relations(financialRecords, ({ one }) => ({
  account: one(accounts, {
    fields: [financialRecords.accountId],
    references: [accounts.id],
  }),
  user: one(users, {
    fields: [financialRecords.userId],
    references: [users.id],
  }),
  journalEntry: one(journalEntries, {
    fields: [financialRecords.journalEntryId],
    references: [journalEntries.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  transactionItems: many(transactionItems),
  stockMovements: many(stockMovements),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  transactions: many(transactions),
  serviceTickets: many(serviceTickets),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  customer: one(customers, {
    fields: [transactions.customerId],
    references: [customers.id],
  }),
  supplier: one(suppliers, {
    fields: [transactions.supplierId],
    references: [suppliers.id],
  }),
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  items: many(transactionItems),
}));

export const transactionItemsRelations = relations(transactionItems, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionItems.transactionId],
    references: [transactions.id],
  }),
  product: one(products, {
    fields: [transactionItems.productId],
    references: [products.id],
  }),
}));

export const serviceTicketsRelations = relations(serviceTickets, ({ one }) => ({
  customer: one(customers, {
    fields: [serviceTickets.customerId],
    references: [customers.id],
  }),
  technician: one(users, {
    fields: [serviceTickets.technicianId],
    references: [users.id],
  }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [stockMovements.userId],
    references: [users.id],
  }),
}));


// Helper function to transform empty strings to default values for numeric fields
const transformNumericField = (defaultValue: string = "0") =>
  z.string().transform((val) => val === "" || val === undefined || val === null ? defaultValue : val);

const transformNullableDecimalField = () =>
  z.union([z.string(), z.number(), z.null()]).transform((val) => {
    if (val === null || val === "") return null;
    return typeof val === "number" ? val.toString() : val;
  });

const transformIntegerField = (defaultValue: number = 0) => 
  z.union([z.string(), z.number()]).transform((val) => {
    if (val === "" || val === undefined || val === null) return defaultValue;
    return typeof val === "string" ? (val === "" ? defaultValue : parseInt(val) || defaultValue) : val;
  });

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStoreConfigSchema = createInsertSchema(storeConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  taxRate: transformNumericField("11.00"),
  defaultDiscount: transformNumericField("0.00").optional(),
  databasePort: transformIntegerField(5432).optional(),
}).partial().extend({
  // Keep essential fields required
  name: z.string().min(1, "Store name is required"),
  taxRate: transformNumericField("11.00"),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  sku: true,      // Auto-generated
  barcode: true,  // Auto-generated
  createdAt: true,
  updatedAt: true,
}).extend({
  lastPurchasePrice: transformNumericField("0.00").optional(),
  averageCost: transformNumericField("0.00").optional(),
  sellingPrice: transformNumericField("0.00"),
  marginPercent: transformNumericField("0.00").optional(),
  stock: transformIntegerField(0),
  totalStock: transformIntegerField(0),
  availableStock: transformIntegerField(0),
  reservedStock: transformIntegerField(0),
  minStock: transformIntegerField(0),
  maxStock: transformIntegerField().optional(),
  reorderPoint: transformIntegerField().optional(),
  reorderQuantity: transformIntegerField().optional(),
  weight: transformNumericField().optional(),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  paymentTerms: transformIntegerField(30),
  creditLimit: transformNumericField("0.00").optional(),
  rating: transformIntegerField(5),
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  paymentTerms: transformIntegerField(30),
  creditLimit: transformNumericField("0.00").optional(),
  rating: transformIntegerField(5),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  transactionNumber: true, // Auto-generated by server
  userId: true,            // Set by server from auth
  createdAt: true,
}).extend({
  subtotal: transformNumericField("0.00"),
  taxAmount: transformNumericField("0.00"),
  discountAmount: transformNumericField("0.00"),
  total: transformNumericField("0.00"),
  // Warranty fields
  warrantyDuration: transformIntegerField().optional(),
  warrantyStartDate: z.coerce.date().nullable().optional(),
  warrantyEndDate: z.coerce.date().nullable().optional(),
});

export const insertTransactionItemSchema = createInsertSchema(transactionItems).omit({
  id: true,
  transactionId: true, // This will be set by the server
}).extend({
  quantity: transformIntegerField(1),
  unitPrice: transformNumericField("0.00"),
  totalPrice: transformNumericField("0.00"),
});

export const insertServiceTicketSchema = createInsertSchema(serviceTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  ticketNumber: z.string().optional(), // Auto-generated by server, but needed for storage method
  estimatedCost: transformNullableDecimalField().optional(),
  actualCost: transformNullableDecimalField().optional(),
  laborCost: transformNullableDecimalField().optional(),
  partsCost: transformNullableDecimalField().optional(),
  // Warranty fields
  warrantyDuration: transformIntegerField().optional(),
  warrantyStartDate: z.coerce.date().nullable().optional(),
  warrantyEndDate: z.coerce.date().nullable().optional(),
});

export const insertStockMovementSchema = createInsertSchema(stockMovements).omit({
  id: true,
  createdAt: true,
}).extend({
  quantity: transformIntegerField(1),
  unitCost: transformNumericField("0.00").optional(),
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  createdAt: true,
});

export const insertProductBatchSchema = createInsertSchema(productBatches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  unitCost: transformNumericField("0.00"),
  receivedQuantity: transformIntegerField(0),
  currentQuantity: transformIntegerField(0),
  reservedQuantity: transformIntegerField(0),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  subtotal: transformNumericField("0.00"),
  taxAmount: transformNumericField("0.00"),
  discountAmount: transformNumericField("0.00"),
  shippingCost: transformNumericField("0.00"),
  totalAmount: transformNumericField("0.00"),
  paymentTerms: transformIntegerField(30),
});

export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({
  id: true,
  createdAt: true,
}).extend({
  quantity: transformIntegerField(1),
  orderedQuantity: transformIntegerField().optional(),
  receivedQuantity: transformIntegerField(0),
  outstandingQuantity: transformIntegerField(0),
  unitPrice: transformNumericField("0.00").optional(),
  totalPrice: transformNumericField("0.00").optional(),
});

export const insertInventoryAdjustmentSchema = createInsertSchema(inventoryAdjustments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventoryAdjustmentItemSchema = createInsertSchema(inventoryAdjustmentItems).omit({
  id: true,
  createdAt: true,
}).extend({
  quantity: transformIntegerField(0),
  systemQuantity: transformIntegerField(0),
  actualQuantity: transformIntegerField(0),
  adjustmentQuantity: transformIntegerField(0),
  unitCost: transformNumericField("0.00").optional(),
  totalCostImpact: transformNumericField("0.00").optional(),
});

export const insertServiceTicketPartSchema = createInsertSchema(serviceTicketParts).omit({
  id: true,
  createdAt: true,
}).extend({
  quantity: transformIntegerField(1),
  unitPrice: transformNumericField("0.00"),
  totalPrice: transformNumericField("0.00"),
});

export const insertWarrantyClaimSchema = createInsertSchema(warrantyClaims).omit({
  id: true,
  claimNumber: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  claimedItems: z
    .array(z.object({
      transactionItemId: z.string(),
      productId: z.string(),
      quantity: z.number().int().positive(),
      unitPrice: transformNumericField("0.00"),
    }))
    .optional(),
});

export const insertFinancialRecordSchema = createInsertSchema(financialRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: transformNumericField("0.00"),
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  balance: transformNumericField("0.00"),
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  salary: transformNumericField("0.00"),
});

export const insertPayrollRecordSchema = createInsertSchema(payrollRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  baseSalary: transformNumericField("0.00"),
  overtime: transformNumericField("0.00"),
  bonus: transformNumericField("0.00"),
});

export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({
  id: true,
  journalNumber: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  totalAmount: transformNumericField("0.00"),
});

export const insertJournalEntryLineSchema = createInsertSchema(journalEntryLines).omit({
  id: true,
  createdAt: true,
}).extend({
  debitAmount: transformNumericField("0.00"),
  creditAmount: transformNumericField("0.00"),
});

export const insertAccountSchema2 = createInsertSchema(accounts).omit({
  id: true,
  balance: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type LoginUser = {
  username: string;
  password: string;
};
export type InsertStoreConfig = z.infer<typeof insertStoreConfigSchema>;
export type StoreConfig = typeof storeConfig.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Auto-generation utilities
export function generateSKU(): string {
  const date = new Date();
  const dateString = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `SKU-${dateString}-${randomNum}`;
}

export function generateBarcode(): string {
  // Generate 13-digit EAN barcode format: Country(2) + Manufacturer(5) + Product(5) + Check(1)
  const country = '62'; // Indonesia country code for barcodes
  const manufacturer = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  const product = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  
  // Simple check digit calculation (modulo 10)
  const digits = (country + manufacturer + product).split('').map(Number);
  let checkSum = 0;
  for (let i = 0; i < digits.length; i++) {
    checkSum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (checkSum % 10)) % 10;
  
  return country + manufacturer + product + checkDigit;
}
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransactionItem = z.infer<typeof insertTransactionItemSchema>;
export type TransactionItem = typeof transactionItems.$inferSelect;
export type InsertServiceTicket = z.infer<typeof insertServiceTicketSchema>;
export type ServiceTicket = typeof serviceTickets.$inferSelect;
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;
export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertServiceTicketPart = z.infer<typeof insertServiceTicketPartSchema>;
export type ServiceTicketPart = typeof serviceTicketParts.$inferSelect;
export type InsertWarrantyClaim = z.infer<typeof insertWarrantyClaimSchema>;
export type WarrantyClaim = typeof warrantyClaims.$inferSelect;
export type InsertFinancialRecord = z.infer<typeof insertFinancialRecordSchema>;
export type FinancialRecord = typeof financialRecords.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertPayrollRecord = z.infer<typeof insertPayrollRecordSchema>;
export type PayrollRecord = typeof payrollRecords.$inferSelect;
export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntryLine = z.infer<typeof insertJournalEntryLineSchema>;
export type JournalEntryLine = typeof journalEntryLines.$inferSelect;
export type InsertAccount2 = z.infer<typeof insertAccountSchema2>;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

// New inventory system types
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locations.$inferSelect;
export type InsertProductBatch = z.infer<typeof insertProductBatchSchema>;
export type ProductBatch = typeof productBatches.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertInventoryAdjustment = z.infer<typeof insertInventoryAdjustmentSchema>;
export type InventoryAdjustment = typeof inventoryAdjustments.$inferSelect;
export type InsertInventoryAdjustmentItem = z.infer<typeof insertInventoryAdjustmentItemSchema>;
export type InventoryAdjustmentItem = typeof inventoryAdjustmentItems.$inferSelect;
